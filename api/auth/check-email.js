const { pool } = require('../../lib/db');
const { validateEmail } = require('../../lib/validation');
const { checkRateLimit } = require('../../lib/rateLimit');

/**
 * POST /api/auth/check-email
 * Сообщает, занят ли email, чтобы онбординг предложил войти до шага с паролем.
 */
module.exports = async (req, res) => {
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Метод не разрешен' });
    }

    // Rate limit: max 20 checks per IP per 10 minutes
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
    if (!await checkRateLimit('check-email:' + clientIp, 20, 10)) {
        return res.status(429).json({ success: false, message: 'Слишком много запросов. Попробуйте позже.' });
    }

    try {
        const email = String((req.body && req.body.email) || '').trim().toLowerCase();
        const emailValidation = validateEmail(email);
        if (!emailValidation.valid) {
            return res.status(400).json({ success: false, message: emailValidation.error });
        }

        const result = await pool.query(
            'SELECT 1 FROM public.users WHERE LOWER(email) = $1 LIMIT 1',
            [email]
        );

        return res.status(200).json({ success: true, exists: result.rows.length > 0 });
    } catch (error) {
        console.error('Check email error:', error.message);
        return res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
    }
};
