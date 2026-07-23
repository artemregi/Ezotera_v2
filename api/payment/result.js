const crypto = require('crypto');
const { pool } = require('../../lib/db');
const { notifyOrderSuccess } = require('../../lib/telegram');

/**
 * POST /api/payment/result  (Robokassa ResultURL callback)
 *
 * Robokassa sends POST with: OutSum, InvId, SignatureValue
 * Signature = MD5(OutSum:InvId:Password2) or SHA256 depending on settings.
 *
 * Must return "OK{InvId}" to confirm receipt.
 */
module.exports = async (req, res) => {
    if (req.method === 'OPTIONS') {
        res.statusCode = 200;
        res.end();
        return;
    }

    try {
        // Robokassa can send as POST form or query params
        const data = req.body || {};
        const OutSum = data.OutSum || '';
        const InvId = data.InvId || '';
        const SignatureValue = (data.SignatureValue || '').toLowerCase();

        console.log(`[Robokassa ResultURL] InvId=${InvId}, OutSum=${OutSum}`);

        // Verify signature: OutSum:InvId:Password2
        const password2 = process.env.ROBOKASSA_PASSWORD2;
        const testPassword2 = process.env.ROBOKASSA_TEST_PASSWORD2;
        const hashAlgo = (process.env.ROBOKASSA_HASH_ALGO || 'sha256').toLowerCase();

        let signatureValid = false;

        // Check against production password2
        if (password2) {
            const expected = crypto
                .createHash(hashAlgo)
                .update(`${OutSum}:${InvId}:${password2}`)
                .digest('hex')
                .toLowerCase();
            if (expected === SignatureValue) signatureValid = true;
        }

        // Check against test password2 (for test mode)
        if (!signatureValid && testPassword2) {
            const expectedTest = crypto
                .createHash(hashAlgo)
                .update(`${OutSum}:${InvId}:${testPassword2}`)
                .digest('hex')
                .toLowerCase();
            if (expectedTest === SignatureValue) signatureValid = true;
        }

        if (!signatureValid) {
            console.error(`[Robokassa] Invalid signature for InvId=${InvId}`);
            res.statusCode = 400;
            res.setHeader('Content-Type', 'text/plain');
            res.end('bad sign');
            return;
        }

        // Mark payment as successful in DB
        let orderInfo = null;
        try {
            const result = await pool.query(
                `UPDATE public.payments
                 SET status = 'success', updated_at = NOW()
                 WHERE order_id = $1
                 RETURNING *`,
                [String(InvId)]
            );
            if (result.rows.length > 0) {
                orderInfo = result.rows[0];
            }
        } catch (dbErr) {
            console.error('[Robokassa] DB update error:', dbErr.message);
        }

        console.log(`✅ [Robokassa] Payment confirmed: InvId=${InvId}, OutSum=${OutSum}`);

        // Send Telegram notification to managers
        try {
            await notifyOrderSuccess({
                orderId: InvId,
                amount: OutSum,
                productName: orderInfo ? orderInfo.description : 'Товар',
                customerName: orderInfo ? orderInfo.customer_name : null,
                customerEmail: orderInfo ? orderInfo.user_email : null,
                referralCode: orderInfo ? orderInfo.referral_code : null
            });
        } catch (tgErr) {
            console.error('[Telegram] Notification error:', tgErr.message);
        }

        // Robokassa expects "OK{InvId}" response
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain');
        res.end(`OK${InvId}`);

    } catch (error) {
        console.error('[Robokassa] ResultURL error:', error);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/plain');
        res.end('error');
    }
};
