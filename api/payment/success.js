/**
 * GET /api/payment/success  (Robokassa SuccessURL)
 * User is redirected here after successful payment.
 * Note: ResultURL (result.js) handles the actual payment confirmation.
 * This just shows the user a success page.
 */
module.exports = async (req, res) => {
    if (req.method === 'OPTIONS') {
        res.statusCode = 200;
        res.end();
        return;
    }

    // Use the request's own origin to avoid cookie domain mismatch
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const origin = host ? `${proto}://${host}` : (process.env.PRODUCTION_URL || '');
    const redirectUrl = origin + '/shop.html?payment=success';
    res.writeHead(302, { 'Location': redirectUrl });
    res.end();
};
