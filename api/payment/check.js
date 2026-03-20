const crypto = require('crypto');
const { pool } = require('../../lib/db');

/**
 * Verifies CloudPayments HMAC-SHA256 webhook signature.
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
 * POST /api/payment/check  (CloudPayments Check webhook)
 * Called by CloudPayments BEFORE charging to verify the order is valid.
 * Must return { "code": 0 } to approve, or { "code": 10 } to reject.
 *
 * CloudPayments sends:
 *   TransactionId, Amount, Currency, InvoiceId, AccountId, ...
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
            console.warn('CloudPayments Check webhook: invalid HMAC signature');
            return res.status(200).json({ code: 10, message: 'Invalid signature' });
        }

        const { TransactionId, Amount, InvoiceId } = req.body;

        console.log(`CloudPayments Check: TransactionId=${TransactionId}, InvoiceId=${InvoiceId}, Amount=${Amount}`);

        // Verify order exists and is in pending state
        let orderOk = true;
        try {
            const result = await pool.query(
                `SELECT id, status FROM public.payments WHERE order_id = $1`,
                [String(InvoiceId)]
            );
            if (result.rows.length === 0) {
                console.warn(`Check: order not found: ${InvoiceId} — auto-creating`);
                // Create order on-the-fly if widget was used without prior /create call
                await pool.query(
                    `INSERT INTO public.payments (order_id, amount, currency, status, description)
                     VALUES ($1, $2, 'RUB', 'pending', 'Консультация Ezotera')
                     ON CONFLICT DO NOTHING`,
                    [String(InvoiceId), parseFloat(Amount)]
                );
            } else if (result.rows[0].status === 'success') {
                console.warn(`Check: order ${InvoiceId} already paid — rejecting`);
                orderOk = false;
            }
        } catch (dbErr) {
            console.error('Check DB error:', dbErr.message);
            // Allow payment to proceed even if DB check fails
        }

        return res.status(200).json({ code: orderOk ? 0 : 13 });
    } catch (error) {
        console.error('Payment check error:', error);
        return res.status(200).json({ code: 0 });
    }
};
