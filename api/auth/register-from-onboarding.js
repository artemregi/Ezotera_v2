const { Pool } = require('pg');
const { hashPassword } = require('../../lib/password');
const { generateToken, setCookie } = require('../../lib/auth');
const { validateEmail, validatePassword, validateName } = require('../../lib/validation');
const { handleDatabaseError } = require('../../lib/errors');

const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

module.exports = async (req, res) => {
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Метод не разрешен' });
    }

    try {
        // Extract all onboarding data including password
        const {
            user_name,
            user_email,
            user_password,
            user_gender,
            user_birth_date,
            user_birth_time,
            user_birth_place,
            relationship_status,
            focus_areas
        } = req.body;

        // Validate name
        const nameValidation = validateName(user_name);
        if (!nameValidation.valid) {
            return res.status(400).json({
                success: false,
                message: 'Ошибка валидации',
                errors: { name: nameValidation.error }
            });
        }

        // Validate email
        const emailValidation = validateEmail(user_email);
        if (!emailValidation.valid) {
            return res.status(400).json({
                success: false,
                message: 'Ошибка валидации',
                errors: { email: emailValidation.error }
            });
        }

        // Validate password
        const passwordValidation = validatePassword(user_password);
        if (!passwordValidation.valid) {
            return res.status(400).json({
                success: false,
                message: 'Ошибка валидации',
                errors: { password: passwordValidation.error }
            });
        }

        // Hash password
        const passwordHash = await hashPassword(user_password);

        // Insert user with ALL onboarding data in one query
        const result = await pool.query(
            `INSERT INTO users (
                name, email, password_hash,
                gender, birth_date, birth_time, birth_place,
                relationship_status, focus_area
            )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING id, email, name, created_at`,
            [
                nameValidation.sanitized,
                emailValidation.normalized,
                passwordHash,
                user_gender,
                user_birth_date,
                user_birth_time,
                user_birth_place,
                relationship_status,
                focus_areas // Note: frontend sends as array, we save as string
            ]
        );

        const user = result.rows[0];

        // Generate JWT token and set cookie for automatic login
        const token = generateToken(user.id, user.email, '24h');
        setCookie(res, token);

        // Success response - user is now registered AND logged in
        res.status(201).json({
            success: true,
            message: 'Регистрация успешна! Добро пожаловать!',
            user: {
                id: user.id,
                email: user.email,
                name: user.name
            },
            redirectUrl: '../dashboard.html'
        });

    } catch (error) {
        const errorResponse = handleDatabaseError(error);
        res.status(errorResponse.status).json({
            success: false,
            message: errorResponse.message
        });
    }
};
