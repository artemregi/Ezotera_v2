const crypto = require('crypto');
const { pool } = require('../../lib/db');
const { extractTokenFromCookies, verifyToken } = require('../../lib/auth');

module.exports = async (req, res) => {
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Метод не разрешён' });
    }

    try {
        const { amount, description, isTest, customerName, customerEmail: bodyEmail, productId, referralCode } = req.body;

        if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            return res.status(400).json({ success: false, message: 'Некорректная сумма' });
        }
        if (!description || typeof description !== 'string') {
            return res.status(400).json({ success: false, message: 'Описание обязательно' });
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
        const outSum = parseFloat(amount).toFixed(2);

        // Подпись: login:outSum:invId:password1
        const signatureStr = `${login}:${outSum}:${invId}:${password1}`;
        const signature = crypto.createHash(hashAlgo).update(signatureStr).digest('hex');

        const baseUrl = useTest
            ? 'https://auth.robokassa.ru/Merchant/Index.aspx'
            : 'https://auth.robokassa.ru/Merchant/Index.aspx';

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

        const paymentUrl = `${baseUrl}?${params.toString()}`;

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
        try {
            await pool.query(
                `INSERT INTO public.payments
                    (user_id, user_email, order_id, amount, currency, status, description, customer_name, product_id, referral_code)
                 VALUES ($1, $2, $3, $4, 'RUB', 'pending', $5, $6, $7, $8)
                 ON CONFLICT DO NOTHING`,
                [userId, email, String(invId), parseFloat(outSum), description, customerName || null, productId || null, referralCode || null]
            );
        } catch (dbErr) {
            console.error('Failed to save pending payment:', dbErr.message);
        }

        return res.status(200).json({ success: true, paymentUrl });
    } catch (error) {
        console.error('Payment create error:', error);
        return res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
    }
};
