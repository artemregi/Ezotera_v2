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

    // Public GET - returns active cards ordered by sort_order; admin GET returns all
    if (req.method === 'GET') {
        try {
            // Check if request is from admin (non-blocking)
            let isAdmin = false;
            try {
                const admin = await requireAdmin(req, res, true);
                if (admin) isAdmin = true;
            } catch (e) { /* not admin */ }

            let result;
            if (isAdmin) {
                result = await pool.query(
                    'SELECT * FROM public.content_cards ORDER BY sort_order ASC, created_at DESC'
                );
            } else {
                result = await pool.query(
                    'SELECT * FROM public.content_cards WHERE is_active = true ORDER BY sort_order ASC, created_at DESC'
                );
            }
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, cards: result.rows }));
        } catch (error) {
            console.error('Content cards list error:', error);
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
        const { title, description, icon, category, link_url, link_text, sort_order, is_active } = req.body;
        if (!title) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, message: 'Название обязательно' }));
            return;
        }
        try {
            const result = await pool.query(
                `INSERT INTO public.content_cards (title, description, icon, category, link_url, link_text, sort_order, is_active)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING *`,
                [title, description || '', icon || '✨', category || '', link_url || '', link_text || 'Подробнее', parseInt(sort_order) || 0, is_active !== false]
            );
            res.statusCode = 201;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, card: result.rows[0] }));
        } catch (error) {
            console.error('Content card create error:', error);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, message: 'Ошибка создания карточки' }));
        }
    } else if (req.method === 'PUT') {
        const { id, title, description, icon, category, link_url, link_text, sort_order, is_active } = req.body;
        if (!id) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, message: 'ID обязателен' }));
            return;
        }
        try {
            const result = await pool.query(
                `UPDATE public.content_cards SET title=$1, description=$2, icon=$3, category=$4, link_url=$5, link_text=$6, sort_order=$7, is_active=$8, updated_at=NOW()
                 WHERE id=$9 RETURNING *`,
                [title, description || '', icon || '✨', category || '', link_url || '', link_text || 'Подробнее', parseInt(sort_order) || 0, is_active !== false, id]
            );
            if (!result.rows.length) {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, message: 'Карточка не найдена' }));
                return;
            }
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, card: result.rows[0] }));
        } catch (error) {
            console.error('Content card update error:', error);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, message: 'Ошибка обновления карточки' }));
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
            await pool.query('DELETE FROM public.content_cards WHERE id=$1', [id]);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, message: 'Карточка удалена' }));
        } catch (error) {
            console.error('Content card delete error:', error);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, message: 'Ошибка удаления карточки' }));
        }
    } else {
        res.statusCode = 405;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, message: 'Метод не поддерживается' }));
    }
};
