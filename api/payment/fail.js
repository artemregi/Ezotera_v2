const { pool } = require('../../lib/db');

/**
 * GET/POST /api/payment/fail  (Robokassa FailURL)
 * User is redirected here when payment fails or is cancelled.
 * Robokassa sends InvId and OutSum as query/body params.
 */
module.exports = async (req, res) => {
    if (req.method === 'OPTIONS') {
        res.statusCode = 200;
        res.end();
        return;
    }

    try {
        const data = req.method === 'GET' ? (req.query || {}) : (req.body || {});
        const InvId = data.InvId || '';

        if (InvId) {
            await pool.query(
                `UPDATE public.payments SET status = 'failed', updated_at = NOW() WHERE order_id = $1 AND status = 'pending'`,
                [String(InvId)]
            ).catch(e => console.error('Fail DB update error:', e.message));
        }

        console.log(`[Robokassa] Payment failed/cancelled: InvId=${InvId}`);

        // Redirect user back to shop with error message
        const redirectUrl = (process.env.PRODUCTION_URL || '') + '/shop.html?payment=failed';
        res.writeHead(302, { 'Location': redirectUrl });
        res.end();
    } catch (error) {
        console.error('[Robokassa] Fail handler error:', error);
        res.statusCode = 302;
        res.setHeader('Location', '/shop.html?payment=error');
        res.end();
    }
};
