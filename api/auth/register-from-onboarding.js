const { pool } = require('../../lib/db');
const { hashPassword } = require('../../lib/password');
const { generateToken, setCookie } = require('../../lib/auth');
const { validateEmail, validatePassword, validateName } = require('../../lib/validation');
const { handleDatabaseError } = require('../../lib/errors');

module.exports = async (req, res) => {
    console.log('📝 Register-from-onboarding handler called');
    console.log('   Method:', req.method);
    console.log('   Body:', req.body);

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        console.log('❌ Method not allowed:', req.method);
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
        console.log('🔐 Hashing password...');
        const passwordHash = await hashPassword(user_password);
        console.log('✅ Password hashed');

        // Insert user with ALL onboarding data in one query
        console.log('💾 Inserting user into database...');
        const result = await pool.query(
            `INSERT INTO public.users (
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
                user_gender || null,
                user_birth_date || null,
                user_birth_time || null,
                user_birth_place || null,
                relationship_status || null,
                Array.isArray(focus_areas) ? focus_areas.join(',') : (focus_areas || null)
            ]
        );

        console.log('✅ User inserted successfully:', result.rows[0]);
        const user = result.rows[0];

        // Generate JWT token and set cookie for automatic login
        console.log('🎫 Generating JWT token...');
        const token = generateToken(user.id, user.email, '24h');
        setCookie(res, token);
        console.log('✅ Token generated and cookie set');

        // Success response - user is now registered AND logged in
        console.log('📤 Sending success response');
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
        console.error('❌ Registration error caught:', error);
        console.error('   Error message:', error.message);
        console.error('   Error code:', error.code);
        console.error('   Error stack:', error.stack);

        const errorResponse = handleDatabaseError(error);
        console.log('   Sending error response:', errorResponse);

        res.status(errorResponse.status).json({
            success: false,
            message: errorResponse.message
        });
    }
};
