const crypto = require('crypto');
const { pool } = require('../../lib/db');
const { sendPaymentReceiptEmail } = require('../../lib/mail');

/**
 * Updates order status to 'paid' and sends a receipt email.
 * Errors are caught internally so Robokassa always gets "OK{InvId}".
 */
async function markOrderPaid(invId, outSum, isTest) {
    try {
        const result = await pool.query(
            `UPDATE public.orders
             SET status = 'paid',
                 paid_at = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP
             WHERE inv_id = $1
             RETURNING user_email, amount, description`,
            [parseInt(invId, 10)]
        );

        if (result.rows.length === 0) {
            console.warn(`markOrderPaid: no order found for inv_id=${invId}`);
            return;
        }

        const { user_email, amount, description } = result.rows[0];
        console.log(`Order #${invId} marked as paid. Email: ${user_email || 'n/a'}`);

        if (user_email) {
            await sendPaymentReceiptEmail(user_email, {
                invId,
                amount: amount || outSum,
                description: description || 'Услуга Ezotera',
                isTest
            }).catch(err => console.error('Receipt email error:', err.message));
        }
    } catch (err) {
        console.error('markOrderPaid error:', err.message);
    }
}

/**
 * POST /api/payment/result  (Robokassa Result URL)
 * Verifies that the payment notification is genuine using SHA256 and Password2.
 *
 * Robokassa sends: OutSum, InvId, SignatureValue, IsTest (optional)
 * We must respond with "OK{InvId}" to acknowledge success.
 */
module.exports = async (req, res) => {
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).end();
    }

    try {
        const params = req.method === 'POST' ? req.body : req.query;
        const { OutSum, InvId, SignatureValue, IsTest } = params;

        if (!OutSum || !InvId || !SignatureValue) {
            console.warn('Robokassa result: missing params', params);
            return res.status(400).send('bad request');
        }

        const isTest = IsTest === '1' || IsTest === 1;
        const password2 = isTest
            ? process.env.ROBOKASSA_TEST_PASSWORD2
            : process.env.ROBOKASSA_PASSWORD2;

        if (!password2) {
            console.error('ROBOKASSA_PASSWORD2 not set — accepting without verification (dev mode)');
            console.log(`Payment received: InvId=${InvId}, OutSum=${OutSum}`);
            await markOrderPaid(InvId, OutSum, isTest);
            return res.status(200).send(`OK${InvId}`);
        }

        const hashAlgo = (process.env.ROBOKASSA_HASH_ALGO || 'md5').toLowerCase();
        const expected = crypto
            .createHash(hashAlgo)
            .update(`${OutSum}:${InvId}:${password2}`)
            .digest('hex')
            .toLowerCase();

        const received = String(SignatureValue).toLowerCase();

        if (expected !== received) {
            console.warn(`Robokassa result: invalid signature. Expected ${expected}, got ${received}`);
            return res.status(400).send('bad sign');
        }

        // Signature is valid — payment confirmed
        console.log(`✅ Payment confirmed: InvId=${InvId}, OutSum=${OutSum}, isTest=${isTest}`);

        await markOrderPaid(InvId, OutSum, isTest);

        // Required response: "OK{InvId}"
        return res.status(200).send(`OK${InvId}`);
    } catch (error) {
        console.error('Payment result error:', error);
        return res.status(500).send('error');
    }
};
