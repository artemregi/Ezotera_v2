const crypto = require('crypto');
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
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.statusCode = 200;
        res.end();
        return;
    }

    // All methods require admin
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    if (req.method === 'GET') {
        // List all referral links with stats
        try {
            const result = await pool.query(`
                SELECT
                    r.id, r.name, r.code, r.created_at,
                    COUNT(p.id) FILTER (WHERE p.status = 'success') AS paid_count,
                    COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'success'), 0) AS total_amount
                FROM public.referral_links r
                LEFT JOIN public.payments p ON p.referral_code = r.code
                GROUP BY r.id, r.name, r.code, r.created_at
                ORDER BY r.created_at DESC
            `);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, referrals: result.rows }));
        } catch (error) {
            console.error('Referrals list error:', error);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, message: 'Ошибка сервера' }));
        }
        return;
    }

    if (req.method === 'POST') {
        // Create new referral link
        const { name } = req.body;
        if (!name || !name.trim()) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, message: 'Название обязательно' }));
            return;
        }

        // Generate unique code from name (transliterate + random suffix)
        const code = name.trim().toLowerCase()
            .replace(/[а-яё]/g, function(c) {
                var map = {'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh','з':'z','и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'h','ц':'ts','ч':'ch','ш':'sh','щ':'sch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya'};
                return map[c] || c;
            })
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            + '-' + crypto.randomBytes(3).toString('hex');

        try {
            const result = await pool.query(
                'INSERT INTO public.referral_links (name, code) VALUES ($1, $2) RETURNING *',
                [name.trim(), code]
            );
            res.statusCode = 201;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, referral: result.rows[0] }));
        } catch (error) {
            console.error('Referral create error:', error);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, message: 'Ошибка создания ссылки' }));
        }
        return;
    }

    if (req.method === 'DELETE') {
        const { id } = req.body;
        if (!id) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, message: 'ID обязателен' }));
            return;
        }
        try {
            await pool.query('DELETE FROM public.referral_links WHERE id = $1', [id]);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, message: 'Ссылка удалена' }));
        } catch (error) {
            console.error('Referral delete error:', error);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, message: 'Ошибка удаления' }));
        }
        return;
    }

    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, message: 'Метод не поддерживается' }));
};
