/* ============================================
   ONBOARDING JAVASCRIPT — Ezotera Frontend
   Handles all 9 steps with navigation, validation,
   localStorage persistence, and progress tracking
   ============================================ */

(function () {
    'use strict';

    console.log('===== ONBOARDING.JS LOADED =====');

    /* ----- Constants ----- */
    var STORAGE_KEY = 'ezotera_onboarding';

    /* Step configuration */
    var STEP_CONFIG = {
        1: { next: 'step-2-gender.html', prev: '../index.html' },
        2: { next: 'step-3-birth-date.html', prev: 'step-1-name.html' },
        3: { next: 'step-4-birth-time.html', prev: 'step-2-gender.html' },
        4: { next: 'step-5-birth-place.html', prev: 'step-3-birth-date.html' },
        5: { next: 'step-6-relationship-status.html', prev: 'step-4-birth-time.html' },
        6: { next: 'step-7-focus-area.html', prev: 'step-5-birth-place.html' },
        7: { next: 'step-8-email.html', prev: 'step-6-relationship-status.html' },
        8: { next: 'step-9-results-preview.html', prev: 'step-7-focus-area.html' },
        9: { next: '../index.html', prev: 'step-8-email.html' }
    };


    /* =============================================
       UTILITY FUNCTIONS
       ============================================= */

    /* Get stored onboarding data */
    function getOnboardingData() {
        var stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (error) {
                return {};
            }
        }
        return {};
    }

    /* Save onboarding data */
    function saveOnboardingData(data) {
        var existing = getOnboardingData();
        var merged = Object.assign({}, existing, data);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    }

    /* Clear onboarding data */
    function clearOnboardingData() {
        localStorage.removeItem(STORAGE_KEY);
    }

    /* Show field error */
    function showFieldError(fieldElement, errorElementId, message) {
        var errorElement = document.getElementById(errorElementId);
        if (errorElement) {
            errorElement.textContent = message;
        }
        if (fieldElement) {
            fieldElement.classList.add('onboarding__input--invalid');
        }
    }

    /* Clear field error */
    function clearFieldError(fieldElement, errorElementId) {
        var errorElement = document.getElementById(errorElementId);
        if (errorElement) {
            errorElement.textContent = '';
        }
        if (fieldElement) {
            fieldElement.classList.remove('onboarding__input--invalid');
        }
    }

    /* Clear all errors on the page */
    function clearErrors() {
        var errorElements = document.querySelectorAll('.onboarding__error, .auth__error');
        errorElements.forEach(function(el) {
            el.textContent = '';
        });
        var invalidFields = document.querySelectorAll('.onboarding__input--invalid');
        invalidFields.forEach(function(field) {
            field.classList.remove('onboarding__input--invalid');
        });
    }

    /* Validate email format */
    function validateEmailFormat(email) {
        var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailPattern.test(email);
    }

    /* Navigate to next step */
    function navigateToStep(stepNumber) {
        if (STEP_CONFIG[stepNumber] && STEP_CONFIG[stepNumber].next) {
            console.log('Navigating to step ' + (stepNumber + 1) + ': ' + STEP_CONFIG[stepNumber].next);
            window.location.href = STEP_CONFIG[stepNumber].next;
        } else {
            console.error('Invalid step number or missing next URL for step: ' + stepNumber);
        }
    }

    /* Navigate to previous step */
    function navigateToPrevious(stepNumber) {
        if (STEP_CONFIG[stepNumber] && STEP_CONFIG[stepNumber].prev) {
            window.location.href = STEP_CONFIG[stepNumber].prev;
        }
    }


    /* =============================================
       STEP 1: NAME
       ============================================= */
    function initializeStep1() {
        var form = document.getElementById('onboardingStep');
        if (!form) {
            console.error('Step 1: Form not found with ID onboardingStep');
            return;
        }

        var nameField = document.getElementById('userName');
        if (!nameField) {
            console.error('Step 1: Name field not found with ID userName');
            return;
        }

        console.log('Step 1: Initialized successfully');

        /* Pre-fill from localStorage */
        var savedData = getOnboardingData();
        if (savedData.user_name) {
            nameField.value = savedData.user_name;
        }

        /* Clear error on input */
        nameField.addEventListener('input', function () {
            clearFieldError(nameField, 'userNameError');
        });

        /* Handle form submission */
        form.addEventListener('submit', function (event) {
            event.preventDefault();
            console.log('Step 1: Form submitted!');

            var name = nameField.value.trim();
            console.log('Step 1: Name value is: "' + name + '"');

            if (!name) {
                console.log('Step 1: Name is empty, showing error');
                showFieldError(nameField, 'userNameError', 'Пожалуйста, введите ваше имя.');
                return;
            }

            console.log('Step 1: Saving data to localStorage');
            saveOnboardingData({ user_name: name });
            console.log('Step 1: Data saved, about to navigate');
            navigateToStep(1);
        });
    }


    /* =============================================
       STEP 2: GENDER
       ============================================= */
    function initializeStep2() {
        var form = document.getElementById('onboardingStep');
        if (!form) {
            return;
        }

        /* Pre-fill from localStorage */
        var savedData = getOnboardingData();
        if (savedData.user_gender) {
            var genderRadio = form.querySelector('input[name="user_gender"][value="' + savedData.user_gender + '"]');
            if (genderRadio) {
                genderRadio.checked = true;
            }
        }

        /* Handle form submission */
        form.addEventListener('submit', function (event) {
            event.preventDefault();

            var genderInput = form.querySelector('input[name="user_gender"]:checked');
            if (!genderInput) {
                var errorElement = document.getElementById('userGenderError');
                if (errorElement) {
                    errorElement.textContent = 'Пожалуйста, выберите ваш пол.';
                }
                return;
            }

            saveOnboardingData({ user_gender: genderInput.value });
            navigateToStep(2);
        });

        /* Clear error when selection changes */
        var genderInputs = form.querySelectorAll('input[name="user_gender"]');
        genderInputs.forEach(function (input) {
            input.addEventListener('change', function () {
                var errorElement = document.getElementById('userGenderError');
                if (errorElement) {
                    errorElement.textContent = '';
                }
            });
        });
    }


    /* =============================================
       STEP 3: BIRTH DATE
       ============================================= */
    function initializeStep3() {
        var form = document.getElementById('onboardingStep');
        if (!form) {
            return;
        }

        var birthDateField = document.getElementById('userBirthDate');
        if (!birthDateField) {
            return;
        }

        /* Pre-fill from localStorage */
        var savedData = getOnboardingData();
        if (savedData.user_birth_date) {
            birthDateField.value = savedData.user_birth_date;
        }

        /* Clear error on input */
        birthDateField.addEventListener('input', function () {
            clearFieldError(birthDateField, 'userBirthDateError');
        });

        /* Handle form submission */
        form.addEventListener('submit', function (event) {
            event.preventDefault();

            var birthDate = birthDateField.value;
            if (!birthDate) {
                showFieldError(birthDateField, 'userBirthDateError', 'Пожалуйста, укажите дату рождения.');
                return;
            }

            saveOnboardingData({ user_birth_date: birthDate });
            navigateToStep(3);
        });
    }


    /* =============================================
       STEP 4: BIRTH TIME
       ============================================= */
    function initializeStep4() {
        var form = document.getElementById('onboardingStep');
        if (!form) {
            return;
        }

        var birthTimeField = document.getElementById('userBirthTime');
        var skipCheckbox = document.getElementById('skipBirthTime');

        /* Pre-fill from localStorage */
        var savedData = getOnboardingData();
        if (savedData.user_birth_time) {
            if (birthTimeField) {
                birthTimeField.value = savedData.user_birth_time;
            }
        }
        if (savedData.skip_birth_time && skipCheckbox) {
            skipCheckbox.checked = true;
            if (birthTimeField) {
                birthTimeField.disabled = true;
            }
        }

        /* Handle skip checkbox */
        if (skipCheckbox && birthTimeField) {
            skipCheckbox.addEventListener('change', function () {
                if (skipCheckbox.checked) {
                    birthTimeField.disabled = true;
                    birthTimeField.value = '';
                    clearFieldError(birthTimeField, 'userBirthTimeError');
                } else {
                    birthTimeField.disabled = false;
                }
            });
        }

        /* Handle form submission */
        form.addEventListener('submit', function (event) {
            event.preventDefault();

            var formData = {};

            if (skipCheckbox && skipCheckbox.checked) {
                formData.user_birth_time = '';
                formData.skip_birth_time = true;
            } else if (birthTimeField) {
                var birthTime = birthTimeField.value;
                if (!birthTime) {
                    showFieldError(birthTimeField, 'userBirthTimeError', 'Пожалуйста, укажите время рождения или пропустите шаг.');
                    return;
                }
                formData.user_birth_time = birthTime;
                formData.skip_birth_time = false;
            }

            saveOnboardingData(formData);
            navigateToStep(4);
        });
    }


    /* =============================================
       STEP 5: BIRTH PLACE
       ============================================= */
    function initializeStep5() {
        var form = document.getElementById('onboardingStep');
        if (!form) {
            return;
        }

        var birthPlaceField = document.getElementById('userBirthPlace');
        if (!birthPlaceField) {
            return;
        }

        /* Pre-fill from localStorage */
        var savedData = getOnboardingData();
        if (savedData.user_birth_place) {
            birthPlaceField.value = savedData.user_birth_place;
        }

        /* Clear error on input */
        birthPlaceField.addEventListener('input', function () {
            clearFieldError(birthPlaceField, 'userBirthPlaceError');
        });

        /* Handle form submission */
        form.addEventListener('submit', function (event) {
            event.preventDefault();

            var birthPlace = birthPlaceField.value.trim();
            if (!birthPlace) {
                showFieldError(birthPlaceField, 'userBirthPlaceError', 'Пожалуйста, укажите место рождения.');
                return;
            }

            saveOnboardingData({ user_birth_place: birthPlace });
            navigateToStep(5);
        });
    }


    /* =============================================
       STEP 6: RELATIONSHIP STATUS
       ============================================= */
    function initializeStep6() {
        var form = document.getElementById('onboardingStep');
        if (!form) {
            return;
        }

        /* Pre-fill from localStorage */
        var savedData = getOnboardingData();
        if (savedData.relationship_status) {
            var statusRadio = form.querySelector('input[name="relationship_status"][value="' + savedData.relationship_status + '"]');
            if (statusRadio) {
                statusRadio.checked = true;
            }
        }

        /* Handle form submission */
        form.addEventListener('submit', function (event) {
            event.preventDefault();

            var statusInput = form.querySelector('input[name="relationship_status"]:checked');
            if (!statusInput) {
                var errorElement = document.getElementById('relationshipStatusError');
                if (errorElement) {
                    errorElement.textContent = 'Пожалуйста, выберите ваш статус отношений.';
                }
                return;
            }

            saveOnboardingData({ relationship_status: statusInput.value });
            navigateToStep(6);
        });

        /* Clear error when selection changes */
        var statusInputs = form.querySelectorAll('input[name="relationship_status"]');
        statusInputs.forEach(function (input) {
            input.addEventListener('change', function () {
                var errorElement = document.getElementById('relationshipStatusError');
                if (errorElement) {
                    errorElement.textContent = '';
                }
            });
        });
    }


    /* =============================================
       STEP 7: FOCUS AREA
       ============================================= */
    function initializeStep7() {
        var form = document.getElementById('onboardingStep');
        if (!form) {
            console.error('Step 7: Form not found');
            return;
        }
        console.log('Step 7: Initialized successfully');

        /* Pre-fill from localStorage */
        var savedData = getOnboardingData();
        if (savedData.focus_areas && Array.isArray(savedData.focus_areas)) {
            savedData.focus_areas.forEach(function (area) {
                var checkbox = form.querySelector('input[name="focus_areas"][value="' + area + '"]');
                if (checkbox) {
                    checkbox.checked = true;
                }
            });
        }

        /* Handle form submission */
        form.addEventListener('submit', function (event) {
            event.preventDefault();

            var checkedBoxes = form.querySelectorAll('input[name="focus_areas"]:checked');
            if (checkedBoxes.length === 0) {
                var errorElement = document.getElementById('focusAreasError');
                if (errorElement) {
                    errorElement.textContent = 'Пожалуйста, выберите хотя бы одну область интересов.';
                }
                return;
            }

            var selectedAreas = [];
            checkedBoxes.forEach(function (checkbox) {
                selectedAreas.push(checkbox.value);
            });

            saveOnboardingData({ focus_areas: selectedAreas });
            console.log('Step 7: Saved ' + selectedAreas.length + ' focus areas, navigating to step 8');
            navigateToStep(7);
        });

        /* Clear error when any checkbox changes */
        var areaCheckboxes = form.querySelectorAll('input[name="focus_areas"]');
        areaCheckboxes.forEach(function (checkbox) {
            checkbox.addEventListener('change', function () {
                var errorElement = document.getElementById('focusAreasError');
                if (errorElement) {
                    errorElement.textContent = '';
                }
            });
        });
    }


    /* =============================================
       STEP 8: EMAIL
       ============================================= */
    function initializeStep8() {
        var form = document.getElementById('onboardingStep');
        if (!form) {
            return;
        }

        var emailField = document.getElementById('userEmail');
        if (!emailField) {
            return;
        }

        /* Pre-fill from localStorage */
        var savedData = getOnboardingData();
        if (savedData.user_email) {
            emailField.value = savedData.user_email;
        }

        /* Clear error on input */
        emailField.addEventListener('input', function () {
            clearFieldError(emailField, 'userEmailError');
        });

        /* Handle form submission */
        form.addEventListener('submit', function (event) {
            event.preventDefault();

            var email = emailField.value.trim();
            if (!email) {
                showFieldError(emailField, 'userEmailError', 'Пожалуйста, введите ваш email.');
                return;
            }
            if (!validateEmailFormat(email)) {
                showFieldError(emailField, 'userEmailError', 'Пожалуйста, введите корректный email адрес.');
                return;
            }

            saveOnboardingData({ user_email: email });
            navigateToStep(8);
        });
    }


    /* =============================================
       STEP 9: RESULTS PREVIEW
       ============================================= */
    function initializeStep9() {
        var form = document.getElementById('onboardingStep');
        if (!form) {
            return;
        }

        /* Check if all previous steps are completed */
        var savedData = getOnboardingData();
        if (!savedData.user_name || !savedData.user_birth_date || !savedData.user_email) {
            window.location.href = 'step-1-name.html';
            return;
        }

        /* Populate summary */
        populateSummary(savedData);

        /* Handle form submission - navigate to step 10 (password) */
        form.addEventListener('submit', function (event) {
            event.preventDefault();

            /* Navigate to password creation step */
            window.location.href = 'step-10-password.html';
        });
    }

    /* Populate summary data in Step 9 */
    function populateSummary(data) {
        var summaryName = document.getElementById('summaryName');
        var summaryGender = document.getElementById('summaryGender');
        var summaryBirthDate = document.getElementById('summaryBirthDate');
        var summaryBirthPlace = document.getElementById('summaryBirthPlace');
        var summaryEmail = document.getElementById('summaryEmail');

        if (summaryName) {
            summaryName.textContent = data.user_name || '—';
        }
        if (summaryGender) {
            var genderMap = {
                'male': 'Мужской',
                'female': 'Женский',
                'other': 'Другое'
            };
            summaryGender.textContent = genderMap[data.user_gender] || '—';
        }
        if (summaryBirthDate && data.user_birth_date) {
            var dateObject = new Date(data.user_birth_date);
            var options = { day: 'numeric', month: 'long', year: 'numeric' };
            summaryBirthDate.textContent = dateObject.toLocaleDateString('ru-RU', options);
        }
        if (summaryBirthPlace) {
            summaryBirthPlace.textContent = data.user_birth_place || '—';
        }
        if (summaryEmail) {
            summaryEmail.textContent = data.user_email || '—';
        }
    }

    /* =============================================
       STEP 10: PASSWORD CREATION
       ============================================= */
    function initializeStep10() {
        var form = document.getElementById('onboardingStep');
        if (!form) {
            return;
        }

        /* Check if all previous steps are completed */
        var savedData = getOnboardingData();
        if (!savedData.user_name || !savedData.user_birth_date || !savedData.user_email) {
            window.location.href = 'step-1-name.html';
            return;
        }

        /* Handle previous button */
        var prevBtn = document.getElementById('prevBtn');
        if (prevBtn) {
            prevBtn.addEventListener('click', function() {
                window.location.href = 'step-9-results-preview.html';
            });
        }

        /* Handle form submission */
        form.addEventListener('submit', function (event) {
            event.preventDefault();
            clearErrors();

            var passwordField = document.getElementById('userPassword');
            var confirmField = document.getElementById('userPasswordConfirm');
            var termsCheckbox = document.getElementById('acceptTerms');

            var password = passwordField.value.trim();
            var passwordConfirm = confirmField.value.trim();
            var termsAccepted = termsCheckbox.checked;

            var isValid = true;

            /* Validate password */
            if (!password) {
                showFieldError(passwordField, 'userPasswordError', 'Пожалуйста, введите пароль.');
                isValid = false;
            } else if (password.length < 8) {
                showFieldError(passwordField, 'userPasswordError', 'Пароль должен содержать минимум 8 символов.');
                isValid = false;
            }

            /* Validate password confirmation */
            if (!passwordConfirm) {
                showFieldError(confirmField, 'userPasswordConfirmError', 'Пожалуйста, подтвердите пароль.');
                isValid = false;
            } else if (password !== passwordConfirm) {
                showFieldError(confirmField, 'userPasswordConfirmError', 'Пароли не совпадают.');
                isValid = false;
            }

            /* Validate terms */
            if (!termsAccepted) {
                var termsError = document.getElementById('acceptTermsError');
                if (termsError) {
                    termsError.textContent = 'Необходимо принять условия использования.';
                }
                isValid = false;
            }

            if (!isValid) {
                return;
            }

            /* Save password to data */
            saveOnboardingData({ user_password: password });

            /* Submit complete data with registration */
            var completeData = getOnboardingData();
            submitOnboardingDataWithRegistration(completeData);
        });
    }

    /* Submit complete onboarding data with automatic registration */
    function submitOnboardingDataWithRegistration(data) {
        console.log('🚀 Submitting registration data:', data);
        console.log('   URL: /api/auth/register-from-onboarding');
        console.log('   Method: POST');

        fetch('/api/auth/register-from-onboarding', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        })
        .then(function(response) {
            console.log('📨 Got response:', response.status, response.statusText);
            console.log('   Content-Type:', response.headers.get('content-type'));

            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                console.error('❌ Response is not JSON!');
                throw new Error('Сервер вернул некорректный ответ. Проверьте консоль для деталей.');
            }

            if (!response.ok) {
                console.log('⚠️ Response not OK, status:', response.status);
                return response.json().then(function(err) {
                    console.error('❌ Error from server:', err);
                    throw new Error(err.message || 'Registration failed');
                }).catch(function(parseError) {
                    console.error('❌ Failed to parse error response:', parseError);
                    throw new Error('Ошибка сервера: не удалось получить ответ');
                });
            }
            return response.json();
        })
        .then(function(result) {
            console.log('✅ Registration successful!', result);
            clearOnboardingData();
            alert('Регистрация завершена! Добро пожаловать в Ezoterra!');
            window.location.href = result.redirectUrl || '../dashboard.html';
        })
        .catch(function(error) {
            console.error('❌ Registration error:', error);
            console.error('   Error message:', error.message);
            console.error('   Error stack:', error.stack);
            alert(error.message || 'Произошла ошибка при создании аккаунта. Попробуйте снова.');
        });
    }

    /* Submit complete onboarding data to API (for already registered users) */
    function submitOnboardingData(data) {
        fetch('/api/onboarding/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // Send auth cookie
            body: JSON.stringify(data)
        })
        .then(function(response) {
            if (!response.ok) {
                throw new Error('Onboarding submission failed');
            }
            return response.json();
        })
        .then(function(result) {
            clearOnboardingData();
            alert('Регистрация завершена! Спасибо за уделенное время.');
            window.location.href = result.redirectUrl || '../index.html';
        })
        .catch(function(error) {
            console.error('Onboarding error:', error);
            alert('Произошла ошибка при отправке данных. Попробуйте снова.');
        });
    }


    /* =============================================
       INITIALIZATION
       ============================================= */
    function initializeOnboarding() {
        /* Detect current step from URL */
        var currentPath = window.location.pathname;
        console.log('Onboarding: Current path is ' + currentPath);
        console.log('Onboarding: Checking if path contains step-1-name:', currentPath.indexOf('step-1-name'));

        if (currentPath.indexOf('step-1-name') !== -1) {
            console.log('Onboarding: Detected Step 1');
            console.log('Onboarding: About to call initializeStep1()');
            initializeStep1();
            console.log('Onboarding: initializeStep1() completed');
        } else if (currentPath.indexOf('step-2-gender') !== -1) {
            console.log('Onboarding: Detected Step 2');
            initializeStep2();
        } else if (currentPath.indexOf('step-3-birth-date') !== -1) {
            console.log('Onboarding: Detected Step 3');
            initializeStep3();
        } else if (currentPath.indexOf('step-4-birth-time') !== -1) {
            console.log('Onboarding: Detected Step 4');
            initializeStep4();
        } else if (currentPath.indexOf('step-5-birth-place') !== -1) {
            console.log('Onboarding: Detected Step 5');
            initializeStep5();
        } else if (currentPath.indexOf('step-6-relationship-status') !== -1) {
            console.log('Onboarding: Detected Step 6');
            initializeStep6();
        } else if (currentPath.indexOf('step-7-focus-area') !== -1) {
            console.log('Onboarding: Detected Step 7');
            initializeStep7();
        } else if (currentPath.indexOf('step-8-email') !== -1) {
            console.log('Onboarding: Detected Step 8');
            initializeStep8();
        } else if (currentPath.indexOf('step-9-results-preview') !== -1) {
            console.log('Onboarding: Detected Step 9');
            initializeStep9();
        } else if (currentPath.indexOf('step-10-password') !== -1) {
            console.log('Onboarding: Detected Step 10');
            initializeStep10();
        } else {
            console.error('Onboarding: Could not detect step from path: ' + currentPath);
        }
    }

    /* Run when DOM is ready */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeOnboarding);
    } else {
        initializeOnboarding();
    }

})();
