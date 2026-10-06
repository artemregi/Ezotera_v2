const crypto = require('crypto');
const { pool } = require('../../lib/db');
const { extractTokenFromCookies, verifyToken } = require('../../lib/auth');
const { notifyNewLead } = require('../../lib/telegram');

// Цены услуг (должны совпадать с pay.html, pricing.html и palmistry-upload.js)
const FIXED_PRICES = {
    'Источник сил — Esoterra': 2250,
    'Тепло близости — Esoterra': 3600,
    'Притяжение изобилия — Esoterra': 3150,
    'Системный перезапуск — Esoterra': 6500,
    'Анализ личности — полный разбор': 490,
    'Тариф Базовый — Esoterra (ежемесячно)': 490,
    'Тариф Базовый — Esoterra (ежегодно)': 343,
    'Тариф Премиум — Esoterra (ежемесячно)': 1290,
    'Тариф Премиум — Esoterra (ежегодно)': 903,
    'Тариф VIP — Esoterra (ежемесячно)': 2990,
    'Тариф VIP — Esoterra (ежегодно)': 2093,
};

module.exports = async (req, res) => {
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Метод не разрешён' });
    }

    try {
        const { amount, description, isTest, customerName, customerEmail: bodyEmail, productId, referralCode } = req.body;
        const customerPhone = String(req.body.customerPhone || '').trim().slice(0, 32) || null;
        const deliveryAddress = String(req.body.deliveryAddress || '').trim().slice(0, 500) || null;

        if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            return res.status(400).json({ success: false, message: 'Некорректная сумма' });
        }
        if (!description || typeof description !== 'string') {
            return res.status(400).json({ success: false, message: 'Описание обязательно' });
        }

        // Цену определяет сервер: сумма из браузера может быть подменена.
        // Товары — из таблицы products, услуги — из списка FIXED_PRICES.
        let serverAmount;
        if (productId) {
            const productResult = await pool.query(
                'SELECT price FROM public.products WHERE id = $1 AND in_stock = true',
                [parseInt(productId, 10) || 0]
            );
            if (!productResult.rows.length) {
                return res.status(400).json({ success: false, message: 'Товар не найден или закончился' });
            }
            serverAmount = parseFloat(productResult.rows[0].price);
            // Физический товар нельзя отправить без телефона и адреса
            if (!customerPhone || !deliveryAddress) {
                return res.status(400).json({ success: false, message: 'Укажите телефон и адрес доставки' });
            }
        } else if (Object.prototype.hasOwnProperty.call(FIXED_PRICES, description)) {
            serverAmount = FIXED_PRICES[description];
        }
        if (!serverAmount || serverAmount <= 0) {
            console.warn('[Payment] Rejected unknown service/amount:', description, amount);
            return res.status(400).json({ success: false, message: 'Услуга не найдена. Обновите страницу и попробуйте снова.' });
        }

        const login = process.env.ROBOKASSA_LOGIN;
        const useTest = isTest === true || isTest === 'true';
        const password1 = useTest
            ? process.env.ROBOKASSA_TEST_PASSWORD1
            : process.env.ROBOKASSA_PASSWORD1;
        const hashAlgo = (process.env.ROBOKASSA_HASH_ALGO || 'sha256').toLowerCase();

        if (!login || !password1) {
            console.error('Robokassa env vars missing');
            return res.status(500).json({ success: false, message: 'Ошибка конфигурации оплаты' });
        }

        const invId = Date.now() % 2147483647; // Robokassa InvId — целое число
        const outSum = serverAmount.toFixed(2);

        // 54-ФЗ: формируем Receipt для фискализации
        const { paymentObject } = req.body;
        const receipt = {
            sno: 'usn_income',
            items: [
                {
                    name: description.substring(0, 128),
                    quantity: 1,
                    sum: parseFloat(outSum),
                    payment_method: 'full_payment',
                    payment_object: paymentObject || 'service',
                    tax: 'none',
                },
            ],
        };
        const receiptJson = JSON.stringify(receipt);
        const receiptUrlEncoded = encodeURIComponent(receiptJson);

        // Подпись: login:outSum:invId:receipt:password1
        const signatureStr = `${login}:${outSum}:${invId}:${receiptUrlEncoded}:${password1}`;
        const signature = crypto.createHash(hashAlgo).update(signatureStr).digest('hex');

        const baseUrl = 'https://auth.robokassa.ru/Merchant/Index.aspx';

        const params = new URLSearchParams({
            MerchantLogin: login,
            OutSum: outSum,
            InvId: invId,
            Description: description,
            SignatureValue: signature,
            Encoding: 'utf-8',
        });
        // Only add IsTest param when in test mode; omitting it entirely for production
        if (useTest) {
            params.set('IsTest', '1');
        }

        // Receipt добавляем вручную — URLSearchParams кодирует иначе, чем encodeURIComponent,
        // а подпись считается именно через encodeURIComponent
        const paymentUrl = `${baseUrl}?${params.toString()}&Receipt=${receiptUrlEncoded}`;

        // Resolve user from JWT if present
        let userId = null;
        let userEmail = null;
        try {
            const token = extractTokenFromCookies(req);
            if (token) {
                const decoded = verifyToken(token);
                if (decoded) {
                    userId = decoded.userId;
                    userEmail = decoded.email;
                }
            }
        } catch (_) { /* non-critical */ }

        // Save pending order to DB
        const email = bodyEmail || userEmail;
        const baseValues = [userId, email, String(invId), parseFloat(outSum), description, customerName || null, productId || null, referralCode || null];
        try {
            await pool.query(
                `INSERT INTO public.payments
                    (user_id, user_email, order_id, amount, currency, status, description, customer_name, product_id, referral_code, customer_phone, delivery_address)
                 VALUES ($1, $2, $3, $4, 'RUB', 'pending', $5, $6, $7, $8, $9, $10)
                 ON CONFLICT DO NOTHING`,
                baseValues.concat([customerPhone, deliveryAddress])
            );
        } catch (dbErr) {
            console.error('Failed to save pending payment:', dbErr.message);
            // Миграция 012 ещё не применена — сохраняем заказ без телефона и адреса
            // (они в любом случае уходят менеджерам в Telegram)
            try {
                await pool.query(
                    `INSERT INTO public.payments
                        (user_id, user_email, order_id, amount, currency, status, description, customer_name, product_id, referral_code)
                     VALUES ($1, $2, $3, $4, 'RUB', 'pending', $5, $6, $7, $8)
                     ON CONFLICT DO NOTHING`,
                    baseValues
                );
            } catch (dbErr2) {
                console.error('Failed to save pending payment (fallback):', dbErr2.message);
            }
        }

        // Send Telegram notification about new lead
        try {
            await notifyNewLead({
                productName: description,
                amount: outSum,
                customerName: customerName || null,
                customerEmail: email,
                customerPhone: customerPhone,
                deliveryAddress: deliveryAddress,
                orderId: String(invId)
            });
        } catch (tgErr) {
            console.error('[Telegram] Lead notification error:', tgErr.message);
        }

        return res.status(200).json({ success: true, paymentUrl, orderId: String(invId) });
    } catch (error) {
        console.error('Payment create error:', error);
        return res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
    }
};
