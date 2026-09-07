const fs = require('fs');
const path = require('path');
const { requireAdmin } = require('../../lib/admin-auth');
const { pool } = require('../../lib/db');

const HOROSCOPE_FILE = path.join(__dirname, '../../ezotera-frontend/horoscope-data.json');

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
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.statusCode = 200;
        res.end();
        return;
    }

    if (req.method === 'GET') {
        // Public read - no admin required. DB first, static file as fallback.
        try {
            const result = await pool.query('SELECT data FROM public.horoscopes ORDER BY created_at DESC LIMIT 1');
            if (result.rows.length > 0) {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(result.rows[0].data));
                return;
            }
        } catch (dbError) {
            console.error('Horoscope DB read error:', dbError.message);
        }
        try {
            const data = fs.readFileSync(HOROSCOPE_FILE, 'utf8');
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(data);
        } catch (error) {
            console.error('Horoscope read error:', error);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, message: 'Ошибка чтения данных гороскопа' }));
        }
        return;
    }

    if (req.method === 'PUT') {
        // Admin only - update horoscope data
        const admin = await requireAdmin(req, res);
        if (!admin) return;

        try {
            const newData = req.body;
            if (!newData || !newData.signs || !newData.weekRange) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, message: 'Некорректные данные гороскопа' }));
                return;
            }
            // Primary storage: DB (Vercel serverless FS is ephemeral/read-only)
            await pool.query('INSERT INTO public.horoscopes (data) VALUES ($1)', [JSON.stringify(newData)]);
            // Best-effort: also refresh the static fallback file (works locally)
            try {
                fs.writeFileSync(HOROSCOPE_FILE, JSON.stringify(newData, null, 2), 'utf8');
            } catch (fsErr) {
                console.warn('Horoscope file write skipped (read-only FS):', fsErr.message);
            }
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, message: 'Гороскоп обновлён' }));
        } catch (error) {
            console.error('Horoscope update error:', error);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, message: 'Ошибка обновления гороскопа' }));
        }
        return;
    }

    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, message: 'Метод не поддерживается' }));
};
