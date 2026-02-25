const { pool } = require('../../lib/db');
const { hashPassword } = require('../../lib/password');
const { validateEmail, validatePasswordStrength } = require('../../lib/validation');
const { checkRateLimit } = require('../../lib/rateLimit');
const { compareOTP, isOTPExpired } = require('../../lib/otp');

/**
 * POST /api/auth/reset-password
 *
 * Request body: {
 *   "email": "user@example.com",
 *   "otp": "123456",
 *   "new_password": "StrongPass123"
 * }
 *
 * Behavior:
 * - Validates password strength
 * - Validates OTP again (do not trust client state)
 * - Updates password_hash in database
 * - Marks OTP as used
 * - Clears OTP fields
 * - Rate limited: 5 attempts per 15 minutes per email
 */
module.exports = async (req, res) => {
    console.log('🔑 Reset password handler called');

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
        const { email, otp, new_password } = req.body;

        // Validate email format
        const emailValidation = validateEmail(email);
        if (!emailValidation.valid) {
            return res.status(400).json({
                success: false,
                message: emailValidation.error
            });
        }

        const normalizedEmail = emailValidation.normalized;

        // Rate limiting (5 attempts per 15 minutes per email)
        if (!checkRateLimit(normalizedEmail, 5, 15)) {
            console.log('⚠️ Rate limit exceeded for email:', normalizedEmail);
            return res.status(429).json({
                success: false,
                message: 'Слишком много попыток. Попробуйте через 15 минут.'
            });
        }

        // Validate new password strength
        const passwordValidation = validatePasswordStrength(new_password);
        if (!passwordValidation.valid) {
            return res.status(400).json({
                success: false,
                message: 'Ошибка валидации',
                errors: { new_password: passwordValidation.error }
            });
        }

        // Validate OTP format
        if (!otp || typeof otp !== 'string' || !/^\d{6}$/.test(otp)) {
            return res.status(400).json({
                success: false,
                message: 'Код подтверждения должен содержать 6 цифр'
            });
        }

        console.log('🔄 Processing password reset for:', normalizedEmail);

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
                message: 'Код подтверждения не был запрошен'
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
        const { compareOTP: compareOTPUtil } = require('../../lib/otp');
        const otpMatches = compareOTP(otp, user.reset_otp_hash);

        if (!otpMatches) {
            console.log('❌ OTP mismatch for user:', user.id);
            return res.status(401).json({
                success: false,
                message: 'Неверный код подтверждения'
            });
        }

        console.log('✅ OTP verified for user:', user.id);

        // Hash new password
        const newPasswordHash = await hashPassword(new_password);
        console.log('🔐 New password hashed for user:', user.id);

        // Update password and mark OTP as used, then clear OTP fields
        const updateResult = await pool.query(
            `UPDATE public.users
             SET password_hash = $1,
                 reset_otp_hash = NULL,
                 reset_otp_expires_at = NULL,
                 reset_otp_used = false,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2
             RETURNING id, email, name`,
            [newPasswordHash, user.id]
        );

        if (updateResult.rows.length === 0) {
            console.error('❌ Failed to update password for user:', user.id);
            return res.status(500).json({
                success: false,
                message: 'Не удалось обновить пароль. Попробуйте позже.'
            });
        }

        console.log('✅ Password reset successful for user:', user.id);

        // Success response
        res.status(200).json({
            success: true,
            message: 'Пароль успешно изменен',
            redirectUrl: '../auth/login.html'
        });

    } catch (error) {
        console.error('❌ Reset password error:', error);
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
