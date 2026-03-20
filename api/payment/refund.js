const crypto = require('crypto');
const { pool } = require('../../lib/db');

/**
 * Verifies CloudPayments HMAC-SHA256 webhook signature.
 */
function verifyHmac(rawBody, hmacHeader) {
    const secretKey = process.env.CP_SECRET_KEY;
    if (!secretKey) return true;
    const expected = crypto
        .createHmac('sha256', secretKey)
        .update(rawBody)
        .digest('base64');
    return expected === hmacHeader;
}

/**
 * POST /api/payment/refund  (CloudPayments Refund webhook)
 * Called by CloudPayments when a refund is processed.
 * Must return { "code": 0 } to acknowledge.
 */
module.exports = async (req, res) => {
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    if (req.method !== 'POST') {
        return res.status(405).end();
    }

    try {
        const rawBody = req.body ? JSON.stringify(req.body) : '';
        const hmacHeader = req.headers['x-content-hmac'] || '';

        if (!verifyHmac(rawBody, hmacHeader)) {
            return res.status(200).json({ code: 10, message: 'Invalid signature' });
        }

        const { TransactionId, InvoiceId, Amount } = req.body;
        console.log(`CloudPayments Refund: TransactionId=${TransactionId}, InvoiceId=${InvoiceId}, Amount=${Amount}`);

        await pool.query(
            `UPDATE public.payments
             SET status = 'refunded', updated_at = NOW()
             WHERE order_id = $1 OR cp_transaction_id = $2`,
            [String(InvoiceId || ''), String(TransactionId || '')]
        ).catch(e => console.error('Refund DB update error:', e.message));

        return res.status(200).json({ code: 0 });
    } catch (error) {
        console.error('Payment refund webhook error:', error);
        return res.status(200).json({ code: 0 });
    }
};
