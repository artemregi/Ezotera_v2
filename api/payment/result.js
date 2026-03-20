const crypto = require('crypto');
const { pool } = require('../../lib/db');

/**
 * Verifies CloudPayments HMAC-SHA256 webhook signature.
 * CloudPayments signs the raw POST body with CP_SECRET_KEY.
 * The signature is passed in the X-Content-HMAC header as Base64.
 */
function verifyHmac(rawBody, hmacHeader) {
    const secretKey = process.env.CP_SECRET_KEY;
    if (!secretKey) {
        console.warn('CP_SECRET_KEY not set — skipping HMAC verification (dev mode)');
        return true;
    }
    const expected = crypto
        .createHmac('sha256', secretKey)
        .update(rawBody)
        .digest('base64');
    return expected === hmacHeader;
}

/**
 * POST /api/payment/result  (CloudPayments Pay webhook)
 * Called by CloudPayments when a payment is completed.
 * Must return { "code": 0 } to acknowledge.
 *
 * CloudPayments sends (application/x-www-form-urlencoded):
 *   TransactionId, Amount, Currency, InvoiceId, AccountId,
 *   Status (Completed), Email, ...
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
            console.warn('CloudPayments Pay webhook: invalid HMAC signature');
            return res.status(200).json({ code: 10, message: 'Invalid signature' });
        }

        const {
            TransactionId,
            Amount,
            Currency,
            InvoiceId,
            AccountId,
            Status,
            Email,
        } = req.body;

        console.log(`CloudPayments Pay: TransactionId=${TransactionId}, InvoiceId=${InvoiceId}, Amount=${Amount}, Status=${Status}`);

        if (Status !== 'Completed') {
            // Treat non-completed as failed; return code 0 to acknowledge
            await pool.query(
                `UPDATE public.payments
                 SET status = 'failed', cp_transaction_id = $1, updated_at = NOW()
                 WHERE order_id = $2`,
                [String(TransactionId), String(InvoiceId)]
            ).catch(e => console.error('DB update failed:', e.message));
            return res.status(200).json({ code: 0 });
        }

        // Mark as successful
        await pool.query(
            `UPDATE public.payments
             SET status = 'success',
                 cp_transaction_id = $1,
                 user_email = COALESCE(user_email, $2),
                 updated_at = NOW()
             WHERE order_id = $3`,
            [String(TransactionId), Email || AccountId || null, String(InvoiceId)]
        ).catch(e => console.error('DB update failed:', e.message));

        console.log(`✅ Payment confirmed: TransactionId=${TransactionId}, InvoiceId=${InvoiceId}`);

        // CloudPayments expects { "code": 0 } to confirm receipt
        return res.status(200).json({ code: 0 });
    } catch (error) {
        console.error('Payment result error:', error);
        // Return code 0 anyway to prevent CloudPayments retry loop
        return res.status(200).json({ code: 0 });
    }
};
