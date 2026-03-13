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
            user_gender: gender,
            user_birth_date: birth_date,
            user_birth_time: birth_time,
            user_birth_place: birth_place,
            relationship_status,
            focus_areas: focus_area,  // frontend sends as array focus_areas
            zodiac_sign
        } = req.body;

        // Update user record with onboarding data
        await pool.query(
            `UPDATE public.users
             SET gender = $1,
                 birth_date = $2,
                 birth_time = $3,
                 birth_place = $4,
                 relationship_status = $5,
                 focus_area = $6,
                 zodiac_sign = $7,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $8`,
            [
                gender,
                birth_date,
                birth_time,
                birth_place,
                relationship_status,
                focus_area,
                zodiac_sign,
                decoded.userId
            ]
        );

        res.status(200).json({
            success: true,
            message: 'Данные сохранены успешно',
            redirectUrl: '../index.html'
        });

    } catch (error) {
        console.error('Onboarding completion error:', error);
        res.status(500).json({
            success: false,
            message: 'Произошла ошибка при сохранении данных'
        });
    }
};
