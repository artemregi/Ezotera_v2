const { pool } = require('../../lib/db');
const { verifyToken, extractTokenFromCookies } = require('../../lib/auth');
const { hashPassword, comparePassword } = require('../../lib/password');
const { validatePassword } = require('../../lib/validation');
const { checkRateLimit } = require('../../lib/rateLimit');

/**
 * POST /api/user/change-password
 * Смена пароля из кабинета: нужен текущий пароль и новый (минимум 8 символов).
 */
module.exports = async (req, res) => {
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Метод не разрешен' });
    }

    try {
        const token = extractTokenFromCookies(req);
        const decoded = token ? verifyToken(token) : null;
        if (!decoded) {
            return res.status(401).json({ success: false, message: 'Необходима авторизация' });
        }

        // Rate limit: max 5 attempts per user per 10 minutes
        if (!await checkRateLimit('change-password:' + decoded.userId, 5, 10)) {
            return res.status(429).json({ success: false, message: 'Слишком много попыток. Попробуйте позже.' });
        }

        const { currentPassword, newPassword } = req.body || {};

        const passwordValidation = validatePassword(newPassword);
        if (!passwordValidation.valid) {
            return res.status(400).json({ success: false, field: 'newPassword', message: passwordValidation.error });
        }

        const result = await pool.query(
            'SELECT password_hash FROM public.users WHERE id = $1',
            [decoded.userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Пользователь не найден' });
        }

        const isValid = await comparePassword(String(currentPassword || ''), result.rows[0].password_hash);
        if (!isValid) {
            return res.status(400).json({ success: false, field: 'currentPassword', message: 'Текущий пароль введён неверно' });
        }

        const passwordHash = await hashPassword(newPassword);
        await pool.query(
            'UPDATE public.users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [passwordHash, decoded.userId]
        );

        return res.status(200).json({ success: true, message: 'Пароль изменён' });
    } catch (error) {
        console.error('Change password error:', error.message);
        return res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
    }
};
