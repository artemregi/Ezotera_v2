const { Pool } = require('pg');
const { comparePassword } = require('../../lib/password');
const { generateToken, setCookie } = require('../../lib/auth');
const { validateEmail } = require('../../lib/validation');
const { checkRateLimit } = require('../../lib/rateLimit');

const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }, // Supabase requires SSL
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
        const { email, password, remember } = req.body;

        // Rate limiting (5 attempts per 15 minutes per IP)
        const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
        if (!checkRateLimit(clientIp, 5, 15)) {
            return res.status(429).json({
                success: false,
                message: 'Слишком много попыток. Попробуйте через 15 минут.'
            });
        }

        // Validate email
        const emailValidation = validateEmail(email);
        if (!emailValidation.valid) {
            return res.status(400).json({
                success: false,
                message: emailValidation.error
            });
        }

        // Find user in database
        const result = await pool.query(
            'SELECT id, email, name, password_hash FROM public.users WHERE email = $1',
            [emailValidation.normalized]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Неверный email или пароль'
            });
        }

        const user = result.rows[0];

        // Verify password
        const isValid = await comparePassword(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({
                success: false,
                message: 'Неверный email или пароль'
            });
        }

        // Update last login timestamp
        await pool.query(
            'UPDATE public.users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );

        // Generate token (longer expiry if "remember me" checked)
        const expiresIn = remember ? '7d' : '24h';
        const token = generateToken(user.id, user.email, expiresIn);

        // Set cookie (7 days or 24 hours)
        const maxAge = remember ? 7 * 24 * 60 * 60 : 24 * 60 * 60;
        setCookie(res, token, maxAge);

        // Success response
        res.status(200).json({
            success: true,
            message: 'Вход выполнен успешно',
            user: {
                id: user.id,
                email: user.email,
                name: user.name
            },
            redirectUrl: '../dashboard.html'
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Произошла ошибка сервера. Попробуйте позже.'
        });
    }
};
