const { pool } = require('../../lib/db');
const { verifyToken, extractTokenFromCookies } = require('../../lib/auth');
const { calculateZodiacSign } = require('../../lib/zodiac');

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
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

        // Fetch user data from database
        const result = await pool.query(
            `SELECT id, name, email, birth_date, gender, birth_time, birth_place,
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
        console.error('Profile fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Произошла ошибка при загрузке профиля'
        });
    }
};
