const crypto = require('crypto');

/**
 * POST /api/payment/create
 * Generates a Robokassa payment URL with SHA256 signature.
 *
 * Body: { amount, description, invoiceId?, isTest? }
 * Returns: { paymentUrl }
 */
module.exports = async (req, res) => {
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Метод не разрешён' });
    }

    try {
        const { amount, description, invoiceId, isTest } = req.body;

        if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            return res.status(400).json({ success: false, message: 'Некорректная сумма' });
        }
        if (!description || typeof description !== 'string') {
            return res.status(400).json({ success: false, message: 'Описание обязательно' });
        }

        const login = process.env.ROBOKASSA_LOGIN;
        const password1 = isTest
            ? process.env.ROBOKASSA_TEST_PASSWORD1
            : process.env.ROBOKASSA_PASSWORD1;

        if (!login || !password1) {
            console.error('Robokassa env vars missing');
            return res.status(500).json({ success: false, message: 'Ошибка конфигурации оплаты' });
        }

        const outSum = parseFloat(amount).toFixed(2);
        // Use provided invoiceId or generate from timestamp
        const invId = invoiceId ? parseInt(invoiceId, 10) : Math.floor(Date.now() / 1000) % 2147483647;

        // Алгоритм хеширования берётся из env (по умолчанию MD5 — текущая настройка Robokassa)
        // После сохранения SHA256 в Robokassa Dashboard → поменять ROBOKASSA_HASH_ALGO=sha256
        const hashAlgo = (process.env.ROBOKASSA_HASH_ALGO || 'md5').toLowerCase();
        const signatureValue = crypto
            .createHash(hashAlgo)
            .update(`${login}:${outSum}:${invId}:${password1}`)
            .digest('hex');

        const siteUrl = process.env.APP_URL || 'https://esoterra.online';
        const params = new URLSearchParams({
            MerchantLogin: login,
            OutSum: outSum,
            InvId: String(invId),
            Description: description,
            SignatureValue: signatureValue,
            SuccessURL: `${siteUrl}/payment-success.html`,
            FailURL: `${siteUrl}/payment-fail.html`,
            Encoding: 'utf-8',
        });

        if (isTest) {
            params.append('IsTest', '1');
        }

        const paymentUrl = `https://auth.robokassa.ru/Merchant/Index.aspx?${params.toString()}`;

        return res.status(200).json({ success: true, paymentUrl, invId });
    } catch (error) {
        console.error('Payment create error:', error);
        return res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
    }
};
