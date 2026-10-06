const { pool } = require('../../lib/db');
const { verifyToken, extractTokenFromCookies } = require('../../lib/auth');
const { calculateZodiacSign } = require('../../lib/zodiac');
const { validateName } = require('../../lib/validation');

/**
 * Проверяет данные профиля из кабинета.
 * Возвращает { values } или { error } с текстом для пользователя.
 */
function validateProfileUpdate(body) {
    const nameValidation = validateName(body.name);
    if (!nameValidation.valid) return { error: nameValidation.error };

    const birthDate = String(body.birthDate || '').trim();
    const m = birthDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const parsed = m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
    if (!m || parsed.getUTCMonth() !== +m[2] - 1 || +m[1] < 1900 || parsed.getTime() > Date.now()) {
        return { error: 'Укажите корректную дату рождения' };
    }

    const birthTime = String(body.birthTime || '').trim();
    if (birthTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(birthTime)) {
        return { error: 'Укажите время рождения в формате ЧЧ:ММ или оставьте поле пустым' };
    }

    const birthPlace = String(body.birthPlace || '').trim();
    if (birthPlace.length > 255) return { error: 'Слишком длинное название места рождения' };

    const gender = String(body.gender || '').trim();
    if (gender && ['male', 'female', 'other'].indexOf(gender) === -1) {
        return { error: 'Некорректное значение пола' };
    }

    return {
        values: [
            nameValidation.sanitized,
            birthDate,
            birthTime || null,
            birthPlace || null,
            gender || null
        ]
    };
}

module.exports = async (req, res) => {
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Метод не разрешен' });
    }

    try {
        const rawCookie = req.headers.cookie || '';
        console.log('[Profile] Cookie header present:', rawCookie.length > 0 ? `YES (${rawCookie.length} chars)` : 'NO — browser did not send the cookie');

        const token = extractTokenFromCookies(req);
        console.log('[Profile] auth_token extracted:', token ? 'YES' : 'NO — cookie missing or misnamed');

        if (!token) {
            console.warn('[Profile] → 401: no auth_token cookie received');
            return res.status(401).json({
                success: false,
                message: 'Необходима авторизация'
            });
        }

        const decoded = verifyToken(token);
        console.log('[Profile] Token verified:', decoded ? `YES (userId=${decoded.userId})` : 'NO — signature invalid or expired');
        if (!decoded) {
            console.warn('[Profile] → 401: token verification failed (bad secret or expired)');
            return res.status(401).json({
                success: false,
                message: 'Недействительный токен'
            });
        }

        // POST — сохранить изменения профиля из кабинета, затем вернуть свежие данные
        if (req.method === 'POST') {
            const update = validateProfileUpdate(req.body || {});
            if (update.error) {
                return res.status(400).json({ success: false, message: update.error });
            }
            await pool.query(
                `UPDATE public.users
                 SET name = $1, birth_date = $2, birth_time = $3, birth_place = $4, gender = $5,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $6`,
                update.values.concat([decoded.userId])
            );
        }

        // Fetch user data from database
        const result = await pool.query(
            `SELECT id, name, email, to_char(birth_date, 'YYYY-MM-DD') AS birth_date, gender, birth_time, birth_place,
                    relationship_status, focus_area, created_at, last_login_at
             FROM public.users
             WHERE id = $1`,
            [decoded.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Пользователь не найден'
            });
        }

        const user = result.rows[0];

        // Calculate zodiac sign dynamically (NOT stored in database)
        let zodiacSign = null;
        if (user.birth_date) {
            zodiacSign = calculateZodiacSign(user.birth_date);
        }

        // Format response
        res.status(200).json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                birthDate: user.birth_date,
                zodiacSign: zodiacSign, // Calculated dynamically
                gender: user.gender,
                birthTime: user.birth_time,
                birthPlace: user.birth_place,
                relationshipStatus: user.relationship_status,
                focusArea: user.focus_area,
                createdAt: user.created_at,
                lastLoginAt: user.last_login_at
            }
        });

    } catch (error) {
        console.error('Profile fetch error:', error.message);
        console.error('Profile fetch stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Произошла ошибка при загрузке профиля',
            detail: process.env.NODE_ENV !== 'production' ? error.message : undefined
        });
    }
};
