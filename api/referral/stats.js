const { pool } = require('../../lib/db');

/**
 * GET /api/referral/stats?token=SECRET_TOKEN
 * Public endpoint — no auth required, accessed by referral partners via secret link
 */
module.exports = async (req, res) => {
    // CORS
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'https://esoterraplus.online').split(',').map(o => o.trim());
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.statusCode = 200;
        res.end();
        return;
    }

    if (req.method !== 'GET') {
        res.statusCode = 405;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, message: 'Method not allowed' }));
        return;
    }

    // Get token from query string
    const urlObj = require('url').parse(req.url, true);
    const token = urlObj.query.token;

    if (!token) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, message: 'Token required' }));
        return;
    }

    try {
        // Find referral link by secret token
        const refResult = await pool.query(
            'SELECT id, name, code, created_at FROM public.referral_links WHERE secret_token = $1',
            [token]
        );

        if (refResult.rows.length === 0) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, message: 'Ссылка не найдена' }));
            return;
        }

        const ref = refResult.rows[0];

        // Get summary stats
        const statsResult = await pool.query(`
            SELECT
                COUNT(*) FILTER (WHERE status = 'success') AS paid_count,
                COALESCE(SUM(amount) FILTER (WHERE status = 'success'), 0) AS total_amount
            FROM public.payments
            WHERE referral_code = $1
        `, [ref.code]);

        const stats = statsResult.rows[0];

        // Get individual orders (full info)
        const ordersResult = await pool.query(`
            SELECT description, amount, customer_name, user_email, status, created_at
            FROM public.payments
            WHERE referral_code = $1 AND status = 'success'
            ORDER BY created_at DESC
            LIMIT 100
        `, [ref.code]);

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            success: true,
            referral: {
                name: ref.name,
                code: ref.code,
                created_at: ref.created_at
            },
            stats: {
                paid_count: parseInt(stats.paid_count) || 0,
                total_amount: parseFloat(stats.total_amount) || 0
            },
            orders: ordersResult.rows
        }));

    } catch (error) {
        console.error('Referral stats error:', error);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, message: 'Ошибка сервера' }));
    }
};
