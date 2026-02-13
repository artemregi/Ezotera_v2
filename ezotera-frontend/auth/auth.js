/* ============================================
   AUTH JAVASCRIPT — Ezotera Frontend
   Handles login and registration validation
   ============================================ */

(function () {
    'use strict';


    /* =============================================
       UTILITY FUNCTIONS
       ============================================= */

    /* Show field error */
    function showFieldError(fieldElement, errorElementId, message) {
        var errorElement = document.getElementById(errorElementId);
        if (errorElement) {
            errorElement.textContent = message;
        }
        if (fieldElement) {
            fieldElement.classList.add('auth__input--invalid');
        }
    }

    /* Clear field error */
    function clearFieldError(fieldElement, errorElementId) {
        var errorElement = document.getElementById(errorElementId);
        if (errorElement) {
            errorElement.textContent = '';
        }
        if (fieldElement) {
            fieldElement.classList.remove('auth__input--invalid');
        }
    }

    /* Validate email format */
    function validateEmailFormat(email) {
        var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailPattern.test(email);
    }

    /* Validate password strength */
    function validatePasswordStrength(password) {
        /* Minimum 8 characters */
        return password.length >= 8;
    }


    /* =============================================
       LOGIN PAGE
       ============================================= */
    function initializeLogin() {
        var loginForm = document.getElementById('loginForm');
        if (!loginForm) {
            return;
        }

        var emailField = document.getElementById('loginEmail');
        var passwordField = document.getElementById('loginPassword');

        /* Clear errors on input */
        if (emailField) {
            emailField.addEventListener('input', function () {
                clearFieldError(emailField, 'loginEmailError');
            });
        }
        if (passwordField) {
            passwordField.addEventListener('input', function () {
                clearFieldError(passwordField, 'loginPasswordError');
            });
        }

        /* Handle form submission */
        loginForm.addEventListener('submit', function (event) {
            event.preventDefault();

            var isValid = true;

            /* Validate email */
            if (!emailField || !emailField.value.trim()) {
                showFieldError(emailField, 'loginEmailError', 'Пожалуйста, введите email.');
                isValid = false;
            } else if (!validateEmailFormat(emailField.value.trim())) {
                showFieldError(emailField, 'loginEmailError', 'Пожалуйста, введите корректный email адрес.');
                isValid = false;
            }

            /* Validate password */
            if (!passwordField || !passwordField.value) {
                showFieldError(passwordField, 'loginPasswordError', 'Пожалуйста, введите пароль.');
                isValid = false;
            }

            if (!isValid) {
                return;
            }

            /* Prepare login data */
            var loginData = {
                email: emailField.value.trim(),
                password: passwordField.value,
                remember: document.getElementById('rememberMe') ? document.getElementById('rememberMe').checked : false
            };

            submitLogin(loginData);
        });
    }

    /* Submit login data to API */
    function submitLogin(data) {
        /*
         * BACKEND INTEGRATION POINT
         * Replace this placeholder with actual API call:
         *
         * fetch('/api/auth/login', {
         *     method: 'POST',
         *     headers: { 'Content-Type': 'application/json' },
         *     body: JSON.stringify(data)
         * })
         * .then(function(response) {
         *     if (!response.ok) {
         *         throw new Error('Login failed');
         *     }
         *     return response.json();
         * })
         * .then(function(result) {
         *     // Store token/session
         *     localStorage.setItem('auth_token', result.token);
         *     window.location.href = result.redirectUrl || '../index.html';
         * })
         * .catch(function(error) {
         *     console.error('Login error:', error);
         *     var emailField = document.getElementById('loginEmail');
         *     showFieldError(emailField, 'loginEmailError', 'Неверный email или пароль.');
         * });
         */

        /* Temporary: log data and show alert */
        console.log('Login data ready for API:', data);
        alert('Вход выполнен! (Демо режим - требуется подключение к бэкенду)');
        window.location.href = '../index.html';
    }


    /* =============================================
       REGISTRATION PAGE
       ============================================= */
    function initializeRegister() {
        var registerForm = document.getElementById('registerForm');
        if (!registerForm) {
            return;
        }

        var nameField = document.getElementById('registerName');
        var emailField = document.getElementById('registerEmail');
        var passwordField = document.getElementById('registerPassword');
        var confirmPasswordField = document.getElementById('registerConfirmPassword');

        /* Clear errors on input */
        if (nameField) {
            nameField.addEventListener('input', function () {
                clearFieldError(nameField, 'registerNameError');
            });
        }
        if (emailField) {
            emailField.addEventListener('input', function () {
                clearFieldError(emailField, 'registerEmailError');
            });
        }
        if (passwordField) {
            passwordField.addEventListener('input', function () {
                clearFieldError(passwordField, 'registerPasswordError');
            });
        }
        if (confirmPasswordField) {
            confirmPasswordField.addEventListener('input', function () {
                clearFieldError(confirmPasswordField, 'registerConfirmPasswordError');
            });
        }

        /* Handle form submission */
        registerForm.addEventListener('submit', function (event) {
            event.preventDefault();

            var isValid = true;

            /* Validate name */
            if (!nameField || !nameField.value.trim()) {
                showFieldError(nameField, 'registerNameError', 'Пожалуйста, введите ваше имя.');
                isValid = false;
            }

            /* Validate email */
            if (!emailField || !emailField.value.trim()) {
                showFieldError(emailField, 'registerEmailError', 'Пожалуйста, введите email.');
                isValid = false;
            } else if (!validateEmailFormat(emailField.value.trim())) {
                showFieldError(emailField, 'registerEmailError', 'Пожалуйста, введите корректный email адрес.');
                isValid = false;
            }

            /* Validate password */
            if (!passwordField || !passwordField.value) {
                showFieldError(passwordField, 'registerPasswordError', 'Пожалуйста, введите пароль.');
                isValid = false;
            } else if (!validatePasswordStrength(passwordField.value)) {
                showFieldError(passwordField, 'registerPasswordError', 'Пароль должен содержать минимум 8 символов.');
                isValid = false;
            }

            /* Validate password confirmation */
            if (!confirmPasswordField || !confirmPasswordField.value) {
                showFieldError(confirmPasswordField, 'registerConfirmPasswordError', 'Пожалуйста, подтвердите пароль.');
                isValid = false;
            } else if (passwordField && passwordField.value !== confirmPasswordField.value) {
                showFieldError(confirmPasswordField, 'registerConfirmPasswordError', 'Пароли не совпадают.');
                isValid = false;
            }

            /* Validate terms acceptance */
            var termsCheckbox = document.getElementById('acceptTerms');
            if (termsCheckbox && !termsCheckbox.checked) {
                var termsError = document.getElementById('acceptTermsError');
                if (termsError) {
                    termsError.textContent = 'Необходимо согласиться с условиями использования.';
                }
                isValid = false;
            }

            if (!isValid) {
                return;
            }

            /* Prepare registration data */
            var registerData = {
                name: nameField.value.trim(),
                email: emailField.value.trim(),
                password: passwordField.value
            };

            submitRegistration(registerData);
        });

        /* Clear terms error when checkbox changes */
        var termsCheckbox = document.getElementById('acceptTerms');
        if (termsCheckbox) {
            termsCheckbox.addEventListener('change', function () {
                var termsError = document.getElementById('acceptTermsError');
                if (termsError) {
                    termsError.textContent = '';
                }
            });
        }
    }

    /* Submit registration data to API */
    function submitRegistration(data) {
        /*
         * BACKEND INTEGRATION POINT
         * Replace this placeholder with actual API call:
         *
         * fetch('/api/auth/register', {
         *     method: 'POST',
         *     headers: { 'Content-Type': 'application/json' },
         *     body: JSON.stringify(data)
         * })
         * .then(function(response) {
         *     if (!response.ok) {
         *         throw new Error('Registration failed');
         *     }
         *     return response.json();
         * })
         * .then(function(result) {
         *     // Optionally auto-login or redirect to login
         *     window.location.href = 'login.html?registered=true';
         * })
         * .catch(function(error) {
         *     console.error('Registration error:', error);
         *     var emailField = document.getElementById('registerEmail');
         *     showFieldError(emailField, 'registerEmailError', 'Этот email уже зарегистрирован.');
         * });
         */

        /* Temporary: log data and show alert */
        console.log('Registration data ready for API:', data);
        alert('Регистрация успешна! (Демо режим - требуется подключение к бэкенду)');
        window.location.href = 'login.html';
    }


    /* =============================================
       INITIALIZATION
       ============================================= */
    function initializeAuth() {
        initializeLogin();
        initializeRegister();
    }

    /* Run when DOM is ready */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeAuth);
    } else {
        initializeAuth();
    }

})();
