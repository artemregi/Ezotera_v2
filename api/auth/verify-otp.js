const { pool } = require('../../lib/db');
const { validateEmail } = require('../../lib/validation');
const { checkRateLimit } = require('../../lib/rateLimit');
const { compareOTP, isOTPExpired } = require('../../lib/otp');

/**
 * POST /api/auth/verify-otp
 *
 * Request body: { "email": "user@example.com", "otp": "123456" }
 *
 * Behavior:
 * - Validates OTP:
 *   * User exists
 *   * OTP not expired
 *   * OTP not used
 *   * OTP hash matches
 * - Rate limited: 10 attempts per 15 minutes per email
 * - Returns success with flag (frontend uses for next step)
 */
module.exports = async (req, res) => {
    console.log('✅ Verify OTP handler called');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        console.log('❌ Method not allowed:', req.method);
        return res.status(405).json({
            success: false,
            message: 'Метод не разрешен'
        });
    }

    try {
        const { email, otp } = req.body;

        // Validate email format
        const emailValidation = validateEmail(email);
        if (!emailValidation.valid) {
            return res.status(400).json({
                success: false,
                message: emailValidation.error
            });
        }

        const normalizedEmail = emailValidation.normalized;

        // Validate OTP format (must be 6 digits)
        if (!otp || typeof otp !== 'string' || !/^\d{6}$/.test(otp)) {
            return res.status(400).json({
                success: false,
                message: 'Код подтверждения должен содержать 6 цифр'
            });
        }

        // Rate limiting (10 attempts per 15 minutes per email)
        if (!checkRateLimit(normalizedEmail, 10, 15)) {
            console.log('⚠️ Rate limit exceeded for email:', normalizedEmail);
            return res.status(429).json({
                success: false,
                message: 'Слишком много попыток. Попробуйте через 15 минут.'
            });
        }

        console.log('🔍 Verifying OTP for:', normalizedEmail);

        // Fetch user and their OTP data
        const userResult = await pool.query(
            `SELECT id, email, reset_otp_hash, reset_otp_expires_at, reset_otp_used
             FROM public.users
             WHERE email = $1`,
            [normalizedEmail]
        );

        if (userResult.rows.length === 0) {
            console.log('❌ User not found:', normalizedEmail);
            return res.status(401).json({
                success: false,
                message: 'Неверный email или код подтверждения'
            });
        }

        const user = userResult.rows[0];

        // Check if OTP exists
        if (!user.reset_otp_hash) {
            console.log('❌ No OTP found for user:', user.id);
            return res.status(401).json({
                success: false,
                message: 'Код подтверждения не был запрошен. Запросите новый.'
            });
        }

        // Check if OTP has been used
        if (user.reset_otp_used) {
            console.log('⚠️ OTP already used for user:', user.id);
            return res.status(401).json({
                success: false,
                message: 'Этот код подтверждения уже был использован'
            });
        }

        // Check if OTP has expired
        if (isOTPExpired(user.reset_otp_expires_at)) {
            console.log('⏰ OTP expired for user:', user.id);
            return res.status(401).json({
                success: false,
                message: 'Код подтверждения истек. Запросите новый.'
            });
        }

        // Compare OTP using timing-safe comparison
        const otpMatches = compareOTP(otp, user.reset_otp_hash);

        if (!otpMatches) {
            console.log('❌ OTP mismatch for user:', user.id);
            return res.status(401).json({
                success: false,
                message: 'Неверный код подтверждения'
            });
        }

        console.log('✅ OTP verified for user:', user.id);

        // OTP is valid! Return success
        // Frontend will use this to allow user to reset password
        res.status(200).json({
            success: true,
            verified: true,
            message: 'Код подтверждения верен',
            user: {
                id: user.id,
                email: user.email
            }
        });

    } catch (error) {
        console.error('❌ Verify OTP error:', error);
        console.error('   Error code:', error.code);
        console.error('   Error message:', error.message);

        // Check for database connection errors
        if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
            console.error('   ⚠️ DATABASE CONNECTION ERROR!');
            return res.status(503).json({
                success: false,
                message: 'Не удалось подключиться к базе данных. Попробуйте позже.'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Произошла ошибка сервера. Попробуйте позже.'
        });
    }
};
