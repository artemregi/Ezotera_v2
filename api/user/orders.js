'use strict';

const { pool } = require('../../lib/db');
const { extractTokenFromCookies, verifyToken } = require('../../lib/auth');

/**
 * GET /api/user/orders
 * Returns the authenticated user's order/payment history.
 */
module.exports = async (req, res) => {
    if (req.method === 'OPTIONS') {
        res.statusCode = 200;
        return res.end();
    }

    if (req.method !== 'GET') {
        res.statusCode = 405;
        return res.end(JSON.stringify({ success: false, message: 'Method not allowed' }));
    }

    // Verify authentication
    const token = extractTokenFromCookies(req);
    if (!token) {
        res.statusCode = 401;
        return res.end(JSON.stringify({ success: false, message: 'Unauthorized' }));
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
        res.statusCode = 401;
        return res.end(JSON.stringify({ success: false, message: 'Invalid token' }));
    }

    try {
        const result = await pool.query(
            `SELECT p.order_id, p.amount, p.currency, p.status, p.description,
                    p.customer_name, p.created_at, p.updated_at,
                    pr.name AS product_name, pr.image_url AS product_image
             FROM public.payments p
             LEFT JOIN public.products pr ON pr.id = p.product_id
             WHERE p.user_id = $1
             ORDER BY p.created_at DESC
             LIMIT 50`,
            [decoded.userId]
        );

        const orders = result.rows.map(row => ({
            orderId: row.order_id,
            amount: parseFloat(row.amount),
            currency: row.currency,
            status: row.status,
            description: row.description,
            productName: row.product_name || row.description,
            productImage: row.product_image || null,
            customerName: row.customer_name,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }));

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, orders }));
    } catch (error) {
        console.error('[Orders] Error:', error.message);
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, message: 'Server error' }));
    }
};
