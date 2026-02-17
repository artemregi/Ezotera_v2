const { createClient } = require('@supabase/supabase-js');
const { hashPassword } = require('../../lib/password');
const { generateToken, setCookie } = require('../../lib/auth');
const { validateEmail, validatePassword, validateName } = require('../../lib/validation');

// Initialize Supabase client with service role key (bypasses RLS)
const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

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

        // Check if email already exists
        const { data: existing } = await supabase
                .from('users')
                .select('id')
                .eq('email', emailValidation.normalized)
                .single();

        if (existing) {
                  return res.status(409).json({
                              success: false,
                              message: 'Этот email уже зарегистрирован'
                  });
        }

        // Insert user into database
        const { data: user, error } = await supabase
                .from('users')
                .insert({
                            name: nameValidation.sanitized,
                            email: emailValidation.normalized,
                            password_hash: passwordHash
                })
                .select('id, email, name, created_at')
                .single();

        if (error) {
                  // Handle unique constraint violation
                if (error.code === '23505') {
                            return res.status(409).json({
                                          success: false,
                                          message: 'Этот email уже зарегистрирован'
                            });
                }
                  console.error('Supabase insert error:', error);
                  return res.status(500).json({
                              success: false,
                              message: 'Произошла ошибка сервера. Попробуйте позже.'
                  });
        }

        // Generate JWT token (24 hour expiry)
        const token = generateToken(user.id, user.email, '24h');

        // Set httpOnly cookie
        setCookie(res, token);

        // Success response
        res.status(201).json({
                  success: true,
                  message: 'Регистрация успешна',
                  user: {
                              id: user.id,
                              email: user.email,
                              name: user.name
                  }
        });

      } catch (error) {
              console.error('Registration error:', error);
              res.status(500).json({
                        success: false,
                        message: 'Произошла ошибка сервера. Попробуйте позже.'
              });
      }
};
