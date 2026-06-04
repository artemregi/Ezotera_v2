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

    const redirectUrl = (process.env.PRODUCTION_URL || '') + '/shop.html?payment=success';
    res.writeHead(302, { 'Location': redirectUrl });
    res.end();
};
