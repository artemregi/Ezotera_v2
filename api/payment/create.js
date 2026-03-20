const crypto = require('crypto');
const { pool } = require('../../lib/db');
const { extractTokenFromCookies, verifyToken } = require('../../lib/auth');

/**
 * POST /api/payment/create
 * Initiates a CloudPayments transaction.
 * The frontend widget (cp.CloudPayments) handles the actual payment UI,
 * so this endpoint is used for server-side order registration before charging.
 *
 * Body: { amount, description, email? }
 * Returns: { success, orderId, publicId }
 */
module.exports = async (req, res) => {
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Метод не разрешён' });
    }

    try {
        const { amount, description, email } = req.body;

        if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            return res.status(400).json({ success: false, message: 'Некорректная сумма' });
        }
        if (!description || typeof description !== 'string') {
            return res.status(400).json({ success: false, message: 'Описание обязательно' });
        }

        const publicId = process.env.CP_PUBLIC_ID;
        if (!publicId) {
            console.error('CP_PUBLIC_ID env var missing');
            return res.status(500).json({ success: false, message: 'Ошибка конфигурации оплаты' });
        }

        const orderId = 'EZO-' + Date.now();
        const outSum = parseFloat(amount).toFixed(2);

        // Resolve user from JWT if present
        let userId = null;
        let userEmail = email || null;
        try {
            const token = extractTokenFromCookies(req);
            if (token) {
                const decoded = verifyToken(token);
                if (decoded) {
                    userId = decoded.userId;
                    userEmail = userEmail || decoded.email;
                }
            }
        } catch (_) { /* non-critical */ }

        // Persist pending order to DB (non-blocking)
        try {
            await pool.query(
                `INSERT INTO public.payments
                    (user_id, user_email, order_id, amount, currency, status, description)
                 VALUES ($1, $2, $3, $4, 'RUB', 'pending', $5)
                 ON CONFLICT DO NOTHING`,
                [userId, userEmail, orderId, parseFloat(outSum), description]
            );
        } catch (dbErr) {
            console.error('Failed to save pending payment:', dbErr.message);
        }

        return res.status(200).json({
            success: true,
            orderId,
            publicId,
            amount: outSum,
            description,
            email: userEmail || '',
        });
    } catch (error) {
        console.error('Payment create error:', error);
        return res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
    }
};
