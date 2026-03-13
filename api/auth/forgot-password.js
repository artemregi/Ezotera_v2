const { pool } = require('../../lib/db');
const { validateEmail } = require('../../lib/validation');
const { checkRateLimit } = require('../../lib/rateLimit');
const { generateOTP, hashOTP, calculateOTPExpiration } = require('../../lib/otp');
const { sendPasswordResetOTP } = require('../../lib/mail');

/**
 * POST /api/auth/forgot-password
 *
 * Request body: { "email": "user@example.com" }
 *
 * Behavior:
 * - Always returns success (enumeration protection)
 * - If user exists: generates OTP, saves hash, sends email
 * - If not exists: silently succeeds (prevents email enumeration)
 * - Rate limited: 5 requests per 15 minutes per IP
 */
module.exports = async (req, res) => {
    console.log('🔑 Forgot password handler called');

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
        const { email } = req.body;

        // Rate limiting (5 attempts per 15 minutes per IP)
        const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
        if (!checkRateLimit(clientIp, 5, 15)) {
            console.log('⚠️ Rate limit exceeded for IP:', clientIp);
            return res.status(429).json({
                success: false,
                message: 'Слишком много попыток. Попробуйте через 15 минут.'
            });
        }

        // Validate email format
        const emailValidation = validateEmail(email);
        if (!emailValidation.valid) {
            // Still return success to prevent enumeration
            return res.status(200).json({
                success: true,
                message: 'Если эта учетная запись существует, вы получите код подтверждения'
            });
        }

        const normalizedEmail = emailValidation.normalized;
        console.log('📧 Processing forgot password for:', normalizedEmail);

        // Check if user exists
        const userResult = await pool.query(
            'SELECT id, email FROM public.users WHERE email = $1',
            [normalizedEmail]
        );

        if (userResult.rows.length === 0) {
            // User doesn't exist, but return success (enumeration protection)
            console.log('ℹ️ User not found:', normalizedEmail, '(enumeration protection)');
            return res.status(200).json({
                success: true,
                message: 'Если эта учетная запись существует, вы получите код подтверждения'
            });
        }

        const user = userResult.rows[0];
        console.log('✅ User found:', user.id);

        // Generate OTP
        const plainOTP = generateOTP();
        const otpHash = hashOTP(plainOTP);
        const expiresAt = calculateOTPExpiration(
            parseInt(process.env.RESET_OTP_EXPIRATION_MINUTES || 10, 10)
        );

        console.log('🔐 Generated OTP for user:', user.id, '(hash stored, plain discarded)');

        // Save OTP to database
        await pool.query(
            `UPDATE public.users
             SET reset_otp_hash = $1, reset_otp_expires_at = $2, reset_otp_used = false
             WHERE id = $3`,
            [otpHash, expiresAt, user.id]
        );

        console.log('💾 OTP hash saved to database for user:', user.id);

        // Send email with OTP
        try {
            await sendPasswordResetOTP(normalizedEmail, plainOTP, {
                expirationMinutes: parseInt(
                    process.env.RESET_OTP_EXPIRATION_MINUTES || 10,
                    10
                )
            });
            console.log('📨 Password reset email sent successfully to:', normalizedEmail);
        } catch (emailError) {
            console.error('❌ Failed to send email:', emailError.message);
            // Still return success if user was found and OTP saved
            // Email will be retried if user requests again
            return res.status(200).json({
                success: true,
                message: 'Если эта учетная запись существует, вы получите код подтверждения'
            });
        }

        // Success response (always the same to prevent enumeration)
        res.status(200).json({
            success: true,
            message: 'Если эта учетная запись существует, вы получите код подтверждения'
        });

    } catch (error) {
        console.error('❌ Forgot password error:', error);
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

        // Return generic error but still return 200 to prevent enumeration
        // (In production, log this for monitoring)
        res.status(200).json({
            success: true,
            message: 'Если эта учетная запись существует, вы получите код подтверждения'
        });
    }
};
