const { pool } = require('../../lib/db');
const { verifyToken, extractTokenFromCookies } = require('../../lib/auth');

module.exports = async (req, res) => {
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Метод не разрешен' });
    }

    try {
        const token = extractTokenFromCookies(req);

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Необходима авторизация'
            });
        }

        const decoded = verifyToken(token);
        if (!decoded) {
            return res.status(401).json({
                success: false,
                message: 'Недействительный токен'
            });
        }

        // Extract onboarding data from request (frontend sends with user_ prefix)
        const {
            user_name: name,
            user_gender: gender,
            user_birth_date: birth_date,
            user_birth_time: birth_time,
            user_birth_place: birth_place,
            relationship_status,
            focus_areas: focus_area,  // frontend sends as array focus_areas
            zodiac_sign
        } = req.body;

        // Update user record with onboarding data.
        // Пустые строки → NULL (иначе '' в TIME/DATE-колонку роняет запрос).
        // name обновляется только если передан (COALESCE).
        await pool.query(
            `UPDATE public.users
             SET name = COALESCE($1, name),
                 gender = $2,
                 birth_date = $3,
                 birth_time = $4,
                 birth_place = $5,
                 relationship_status = $6,
                 focus_area = $7,
                 zodiac_sign = $8,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $9`,
            [
                (typeof name === 'string' && name.trim()) ? name.trim() : null,
                gender || null,
                birth_date || null,
                birth_time || null,
                birth_place || null,
                relationship_status || null,
                // Единый формат с register-from-onboarding: CSV-строка, не PG-массив
                Array.isArray(focus_area) ? focus_area.join(',') : (focus_area || null),
                zodiac_sign || null,
                decoded.userId
            ]
        );

        res.status(200).json({
            success: true,
            message: 'Данные сохранены успешно',
            redirectUrl: '../dashboard.html'
        });

    } catch (error) {
        console.error('Onboarding completion error:', error);
        res.status(500).json({
            success: false,
            message: 'Произошла ошибка при сохранении данных'
        });
    }
};
