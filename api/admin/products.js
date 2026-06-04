const { pool } = require('../../lib/db');
const { requireAdmin } = require('../../lib/admin-auth');

module.exports = async (req, res) => {
    // CORS
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'https://esoterraplus.online').split(',').map(o => o.trim());
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (allowedOrigins.length) {
        res.setHeader('Access-Control-Allow-Origin', allowedOrigins[0]);
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.statusCode = 200;
        res.end();
        return;
    }

    // Public GET - no admin required for listing products
    if (req.method === 'GET') {
        try {
            const result = await pool.query(
                'SELECT * FROM public.products ORDER BY sort_order ASC, created_at DESC'
            );
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, products: result.rows }));
        } catch (error) {
            console.error('Products list error:', error);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, message: 'Ошибка сервера' }));
        }
        return;
    }

    // All other methods require admin
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    if (req.method === 'POST') {
        // Create product
        const { name, description, price, image_url, category, in_stock, sort_order } = req.body;
        if (!name) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, message: 'Название обязательно' }));
            return;
        }
        try {
            const result = await pool.query(
                `INSERT INTO public.products (name, description, price, image_url, category, in_stock, sort_order)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING *`,
                [name, description || '', parseFloat(price) || 0, image_url || '', category || 'bracelet', in_stock !== false, parseInt(sort_order) || 0]
            );
            res.statusCode = 201;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, product: result.rows[0] }));
        } catch (error) {
            console.error('Product create error:', error);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, message: 'Ошибка создания товара' }));
        }
    } else if (req.method === 'PUT') {
        // Update product
        const { id, name, description, price, image_url, category, in_stock, sort_order } = req.body;
        if (!id) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, message: 'ID обязателен' }));
            return;
        }
        try {
            const result = await pool.query(
                `UPDATE public.products SET name=$1, description=$2, price=$3, image_url=$4, category=$5, in_stock=$6, sort_order=$7, updated_at=NOW()
                 WHERE id=$8 RETURNING *`,
                [name, description || '', parseFloat(price) || 0, image_url || '', category || 'bracelet', in_stock !== false, parseInt(sort_order) || 0, id]
            );
            if (!result.rows.length) {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, message: 'Товар не найден' }));
                return;
            }
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, product: result.rows[0] }));
        } catch (error) {
            console.error('Product update error:', error);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, message: 'Ошибка обновления товара' }));
        }
    } else if (req.method === 'DELETE') {
        const { id } = req.body;
        if (!id) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, message: 'ID обязателен' }));
            return;
        }
        try {
            await pool.query('DELETE FROM public.products WHERE id=$1', [id]);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, message: 'Товар удалён' }));
        } catch (error) {
            console.error('Product delete error:', error);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, message: 'Ошибка удаления товара' }));
        }
    } else {
        res.statusCode = 405;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, message: 'Метод не поддерживается' }));
    }
};
