/* ============================================
   FORGOT PASSWORD JAVASCRIPT — Ezotera
   Multi-step password reset with OTP
   ============================================ */

(function () {
    'use strict';

    // State management
    var state = {
        currentStep: 1,
        email: '',
        otp: '',
        newPassword: ''
    };

    /* =============================================
       UTILITY FUNCTIONS
       ============================================= */

    function showFieldError(fieldElement, errorElementId, message) {
        var errorElement = document.getElementById(errorElementId);
        if (errorElement) {
            errorElement.textContent = message;
        }
        if (fieldElement) {
            fieldElement.classList.add('auth__input--invalid');
        }
    }

    function clearFieldError(fieldElement, errorElementId) {
        var errorElement = document.getElementById(errorElementId);
        if (errorElement) {
            errorElement.textContent = '';
        }
        if (fieldElement) {
            fieldElement.classList.remove('auth__input--invalid');
        }
    }

    function validateEmailFormat(email) {
        var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailPattern.test(email);
    }

    function validateOTPFormat(otp) {
        return /^\d{6}$/.test(otp);
    }

    function validatePasswordStrength(password) {
        return {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            isValid: password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password)
        };
    }

    function updateProgressIndicator(step) {
        for (var i = 1; i <= 3; i++) {
            var indicator = document.getElementById('step' + i + 'Indicator');
            if (indicator) {
                if (i <= step) {
                    indicator.classList.add('reset-progress__item--active');
                } else {
                    indicator.classList.remove('reset-progress__item--active');
                }
            }
        }
    }

    function showStep(stepNumber) {
        // Hide all steps
        for (var i = 1; i <= 3; i++) {
            var step = document.getElementById('step' + i);
            if (step) {
                step.classList.remove('reset-step--active');
            }
        }

        // Show requested step
        var activeStep = document.getElementById('step' + stepNumber);
        if (activeStep) {
            activeStep.classList.add('reset-step--active');
        }

        // Update progress indicator
        updateProgressIndicator(stepNumber);

        state.currentStep = stepNumber;

        // Auto-focus first input
        setTimeout(function() {
            var inputs = activeStep.querySelectorAll('input');
            if (inputs.length > 0) {
                inputs[0].focus();
            }
        }, 100);
    }

    function showSuccess() {
        var successStep = document.getElementById('successStep');
        if (successStep) {
            // Hide progress indicator
            var progress = document.getElementById('resetProgress');
            if (progress) {
                progress.style.display = 'none';
            }
            successStep.classList.add('reset-step--active');
        }
    }

    /* =============================================
       STEP 1: REQUEST OTP (FORGOT PASSWORD)
       ============================================= */

    function initializeStep1() {
        var form = document.getElementById('forgotPasswordForm');
        if (!form) {
            return;
        }

        var emailField = document.getElementById('forgotEmail');

        if (emailField) {
            emailField.addEventListener('input', function() {
                clearFieldError(emailField, 'forgotEmailError');
            });
        }

        form.addEventListener('submit', function(event) {
            event.preventDefault();

            var isValid = true;

            if (!emailField || !emailField.value.trim()) {
                showFieldError(emailField, 'forgotEmailError', 'Пожалуйста, введите email.');
                isValid = false;
            } else if (!validateEmailFormat(emailField.value.trim())) {
                showFieldError(emailField, 'forgotEmailError', 'Пожалуйста, введите корректный email адрес.');
                isValid = false;
            }

            if (!isValid) {
                return;
            }

            state.email = emailField.value.trim();
            submitForgotPassword(state.email);
        });
    }

    function submitForgotPassword(email) {
        var submitBtn = document.querySelector('#forgotPasswordForm .auth__submit');
        var originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Отправка...';

        fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
        })
        .then(function(response) {
            return response.json();
        })
        .then(function(result) {
            if (result.success) {
                // Show email in next step
                var displayEmail = document.getElementById('displayEmail');
                if (displayEmail) {
                    displayEmail.textContent = email;
                }
                // Move to step 2
                showStep(2);
            } else {
                var emailField = document.getElementById('forgotEmail');
                showFieldError(emailField, 'forgotEmailError', result.message || 'Ошибка при отправке кода.');
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        })
        .catch(function(error) {
            console.error('Error:', error);
            var emailField = document.getElementById('forgotEmail');
            showFieldError(emailField, 'forgotEmailError', 'Ошибка при отправке кода. Попробуйте позже.');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        });
    }

    /* =============================================
       STEP 2: VERIFY OTP
       ============================================= */

    function initializeStep2() {
        var form = document.getElementById('verifyOTPForm');
        if (!form) {
            return;
        }

        var otpField = document.getElementById('otpCode');

        if (otpField) {
            otpField.addEventListener('input', function() {
                clearFieldError(otpField, 'otpCodeError');
                // Auto-submit when 6 digits entered
                if (this.value.length === 6) {
                    form.dispatchEvent(new Event('submit'));
                }
            });

            otpField.addEventListener('keypress', function(e) {
                if (!/[0-9]/.test(e.key)) {
                    e.preventDefault();
                }
            });
        }

        form.addEventListener('submit', function(event) {
            event.preventDefault();

            var isValid = true;

            if (!otpField || !otpField.value.trim()) {
                showFieldError(otpField, 'otpCodeError', 'Пожалуйста, введите код подтверждения.');
                isValid = false;
            } else if (!validateOTPFormat(otpField.value.trim())) {
                showFieldError(otpField, 'otpCodeError', 'Код должен содержать 6 цифр.');
                isValid = false;
            }

            if (!isValid) {
                return;
            }

            state.otp = otpField.value.trim();
            submitVerifyOTP(state.email, state.otp);
        });

        // Resend OTP link
        var resendLink = document.getElementById('resendOtpLink');
        if (resendLink) {
            resendLink.addEventListener('click', function(e) {
                e.preventDefault();
                submitForgotPassword(state.email);
            });
        }
    }

    function submitVerifyOTP(email, otp) {
        var submitBtn = document.querySelector('#verifyOTPForm .auth__submit');
        var originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Проверка...';

        fetch('/api/auth/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, otp: otp })
        })
        .then(function(response) {
            return response.json();
        })
        .then(function(result) {
            if (result.success && result.verified) {
                // Move to step 3
                showStep(3);
            } else {
                var otpField = document.getElementById('otpCode');
                showFieldError(otpField, 'otpCodeError', result.message || 'Неверный код подтверждения.');
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        })
        .catch(function(error) {
            console.error('Error:', error);
            var otpField = document.getElementById('otpCode');
            showFieldError(otpField, 'otpCodeError', 'Ошибка при проверке кода. Попробуйте позже.');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        });
    }

    /* =============================================
       STEP 3: RESET PASSWORD
       ============================================= */

    function initializeStep3() {
        var form = document.getElementById('resetPasswordForm');
        if (!form) {
            return;
        }

        var passwordField = document.getElementById('newPassword');

        if (passwordField) {
            passwordField.addEventListener('input', function() {
                clearFieldError(passwordField, 'newPasswordError');
                updatePasswordStrength(this.value);
            });
        }

        form.addEventListener('submit', function(event) {
            event.preventDefault();

            var isValid = true;

            if (!passwordField || !passwordField.value) {
                showFieldError(passwordField, 'newPasswordError', 'Пожалуйста, введите новый пароль.');
                isValid = false;
            } else {
                var strength = validatePasswordStrength(passwordField.value);
                if (!strength.isValid) {
                    var errors = [];
                    if (!strength.length) errors.push('минимум 8 символов');
                    if (!strength.uppercase) errors.push('заглавная буква');
                    if (!strength.lowercase) errors.push('строчная буква');
                    if (!strength.number) errors.push('цифра');

                    showFieldError(
                        passwordField,
                        'newPasswordError',
                        'Пароль должен содержать: ' + errors.join(', ')
                    );
                    isValid = false;
                }
            }

            if (!isValid) {
                return;
            }

            state.newPassword = passwordField.value;
            submitResetPassword(state.email, state.otp, state.newPassword);
        });
    }

    function updatePasswordStrength(password) {
        var strength = validatePasswordStrength(password);
        var fill = document.getElementById('passwordStrengthFill');
        var text = document.getElementById('passwordStrengthText');

        if (!fill || !text) return;

        var score = 0;
        if (strength.length) score++;
        if (strength.uppercase) score++;
        if (strength.lowercase) score++;
        if (strength.number) score++;

        var percentage = (score / 4) * 100;
        fill.style.width = percentage + '%';

        if (password.length === 0) {
            text.textContent = 'Введите пароль';
            fill.style.backgroundColor = '#cbd5e1';
        } else if (score === 1 || score === 2) {
            text.textContent = '❌ Слабый пароль';
            fill.style.backgroundColor = '#f87171';
        } else if (score === 3) {
            text.textContent = '⚠️ Средний пароль';
            fill.style.backgroundColor = '#fbbf24';
        } else {
            text.textContent = '✅ Надежный пароль';
            fill.style.backgroundColor = '#34d399';
        }
    }

    function submitResetPassword(email, otp, newPassword) {
        var submitBtn = document.querySelector('#resetPasswordForm .auth__submit');
        var originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Сохранение...';

        fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: email,
                otp: otp,
                new_password: newPassword
            })
        })
        .then(function(response) {
            return response.json();
        })
        .then(function(result) {
            if (result.success) {
                // Show success message
                showSuccess();
            } else {
                var passwordField = document.getElementById('newPassword');
                showFieldError(passwordField, 'newPasswordError', result.message || 'Ошибка при сохранении пароля.');
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        })
        .catch(function(error) {
            console.error('Error:', error);
            var passwordField = document.getElementById('newPassword');
            showFieldError(passwordField, 'newPasswordError', 'Ошибка при сохранении пароля. Попробуйте позже.');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        });
    }

    /* =============================================
       INITIALIZATION
       ============================================= */

    function initialize() {
        initializeStep1();
        initializeStep2();
        initializeStep3();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})();
