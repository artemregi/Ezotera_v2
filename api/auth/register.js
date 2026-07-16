const { pool } = require('../../lib/db');
const { hashPassword } = require('../../lib/password');
const { generateToken, setCookie } = require('../../lib/auth');
const { validateEmail, validatePassword, validateName } = require('../../lib/validation');
const { handleDatabaseError } = require('../../lib/errors');
const { checkRateLimit } = require('../../lib/rateLimit');

module.exports = async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Метод не разрешен' });
    }

    // Rate limit: max 3 registrations per IP per 60 minutes
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
    if (!checkRateLimit('register:' + clientIp, 3, 7200)) {
        return res.status(429).json({
            success: false,
            message: 'Слишком много регистраций с этого адреса. Попробуйте позже.'
        });
    }

    try {
        const { name, email, password } = req.body;

        // Validate name
        const nameValidation = validateName(name);
        if (!nameValidation.valid) {
            return res.status(400).json({
                success: false,
                message: 'Ошибка валидации',
                errors: { name: nameValidation.error }
            });
        }

        // Validate email
        const emailValidation = validateEmail(email);
        if (!emailValidation.valid) {
            return res.status(400).json({
                success: false,
                message: 'Ошибка валидации',
                errors: { email: emailValidation.error }
            });
        }

        // Validate password
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
            return res.status(400).json({
                success: false,
                message: 'Ошибка валидации',
                errors: { password: passwordValidation.error }
            });
        }

        // Hash password
        const passwordHash = await hashPassword(password);

        // Insert user into database
        const result = await pool.query(
            `INSERT INTO public.users (name, email, password_hash)
             VALUES ($1, $2, $3)
             RETURNING id, email, name, created_at`,
            [nameValidation.sanitized, emailValidation.normalized, passwordHash]
        );

        const user = result.rows[0];

        // Generate JWT token (24 hour expiry)
        const token = generateToken(user.id, user.email, '24h');

        // Set httpOnly cookie
        setCookie(res, token, undefined, req);

        // Success response with redirect to index page (preview will be shown there)
        res.status(201).json({
            success: true,
            message: 'Регистрация успешна',
            user: {
                id: user.id,
                email: user.email,
                name: user.name
            },
            redirectUrl: '../index.html?newUser=true'
        });

    } catch (error) {
        const errorResponse = handleDatabaseError(error);
        res.status(errorResponse.status).json({
            success: false,
            message: errorResponse.message
        });
    }
};
