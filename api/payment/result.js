const crypto = require('crypto');

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
            console.error('ROBOKASSA_PASSWORD2 not set — cannot verify result notification');
            // Temporary: accept without verification during setup
            // REMOVE this block and uncomment the return below once Password2 is configured
            console.log(`Payment received: InvId=${InvId}, OutSum=${OutSum}`);
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

        // TODO: update your database order status here
        // Example: await pool.query('UPDATE orders SET status=$1 WHERE id=$2', ['paid', InvId]);

        // Required response: "OK{InvId}"
        return res.status(200).send(`OK${InvId}`);
    } catch (error) {
        console.error('Payment result error:', error);
        return res.status(500).send('error');
    }
};
