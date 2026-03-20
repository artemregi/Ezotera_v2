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
 * POST /api/payment/fail  (CloudPayments Fail webhook)
 * Called by CloudPayments when a transaction fails or is declined.
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

        const { TransactionId, InvoiceId, ReasonCode, Reason } = req.body;
        console.log(`CloudPayments Fail: TransactionId=${TransactionId}, InvoiceId=${InvoiceId}, Reason=${Reason}`);

        await pool.query(
            `UPDATE public.payments
             SET status = 'failed', cp_transaction_id = $1, updated_at = NOW()
             WHERE order_id = $2`,
            [String(TransactionId || ''), String(InvoiceId || '')]
        ).catch(e => console.error('Fail DB update error:', e.message));

        return res.status(200).json({ code: 0 });
    } catch (error) {
        console.error('Payment fail webhook error:', error);
        return res.status(200).json({ code: 0 });
    }
};
