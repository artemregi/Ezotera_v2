/* ============================================
   ONBOARDING JAVASCRIPT — Ezotera Frontend
   Handles step navigation, validation,
   localStorage persistence, summary rendering
   ============================================ */

(function () {
    'use strict';

    /* ----- Constants ----- */
    var STORAGE_KEY = 'ezotera_onboarding';

    /* ----- Utility: Get stored onboarding data ----- */
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

    /* ----- Utility: Save onboarding data ----- */
    function saveOnboardingData(data) {
        var existing = getOnboardingData();
        var merged = Object.assign({}, existing, data);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    }

    /* ----- Utility: Clear onboarding data ----- */
    function clearOnboardingData() {
        localStorage.removeItem(STORAGE_KEY);
    }

    /* ----- Utility: Show field error ----- */
    function showFieldError(fieldElement, errorElementId, message) {
        var errorElement = document.getElementById(errorElementId);
        if (errorElement) {
            errorElement.textContent = message;
        }
        if (fieldElement) {
            fieldElement.classList.add('onboarding__input--invalid');
        }
    }

    /* ----- Utility: Clear field error ----- */
    function clearFieldError(fieldElement, errorElementId) {
        var errorElement = document.getElementById(errorElementId);
        if (errorElement) {
            errorElement.textContent = '';
        }
        if (fieldElement) {
            fieldElement.classList.remove('onboarding__input--invalid');
        }
    }

    /* ----- Utility: Validate email format ----- */
    function validateEmailFormat(email) {
        var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailPattern.test(email);
    }


    /* =============================================
       STEP 1: Personal Information
       ============================================= */
    function initializeStep1() {
        var form = document.getElementById('onboardingStep1');
        if (!form) {
            return;
        }

        /* Pre-fill form from localStorage */
        var savedData = getOnboardingData();
        var nameField = document.getElementById('userName');
        var emailField = document.getElementById('userEmail');
        var birthDateField = document.getElementById('userBirthDate');
        var birthTimeField = document.getElementById('userBirthTime');
        var birthPlaceField = document.getElementById('userBirthPlace');

        if (savedData.user_name && nameField) {
            nameField.value = savedData.user_name;
        }
        if (savedData.user_email && emailField) {
            emailField.value = savedData.user_email;
        }
        if (savedData.user_birth_date && birthDateField) {
            birthDateField.value = savedData.user_birth_date;
        }
        if (savedData.user_birth_time && birthTimeField) {
            birthTimeField.value = savedData.user_birth_time;
        }
        if (savedData.user_birth_place && birthPlaceField) {
            birthPlaceField.value = savedData.user_birth_place;
        }
        if (savedData.user_gender) {
            var genderRadio = form.querySelector('input[name="user_gender"][value="' + savedData.user_gender + '"]');
            if (genderRadio) {
                genderRadio.checked = true;
            }
        }

        /* Clear errors on input */
        nameField.addEventListener('input', function () {
            clearFieldError(nameField, 'userNameError');
        });
        emailField.addEventListener('input', function () {
            clearFieldError(emailField, 'userEmailError');
        });
        birthDateField.addEventListener('input', function () {
            clearFieldError(birthDateField, 'userBirthDateError');
        });
        birthPlaceField.addEventListener('input', function () {
            clearFieldError(birthPlaceField, 'userBirthPlaceError');
        });

        /* Handle form submission */
        form.addEventListener('submit', function (event) {
            event.preventDefault();
            var isValid = validateStep1Form(nameField, emailField, birthDateField, birthPlaceField);

            if (isValid) {
                var genderInput = form.querySelector('input[name="user_gender"]:checked');
                var formData = {
                    user_name: nameField.value.trim(),
                    user_email: emailField.value.trim(),
                    user_birth_date: birthDateField.value,
                    user_birth_time: birthTimeField.value || '',
                    user_birth_place: birthPlaceField.value.trim(),
                    user_gender: genderInput ? genderInput.value : ''
                };
                saveOnboardingData(formData);
                window.location.href = 'step-2.html';
            }
        });
    }

    function validateStep1Form(nameField, emailField, birthDateField, birthPlaceField) {
        var isValid = true;

        if (!nameField.value.trim()) {
            showFieldError(nameField, 'userNameError', 'Пожалуйста, введите ваше имя.');
            isValid = false;
        }

        if (!emailField.value.trim()) {
            showFieldError(emailField, 'userEmailError', 'Пожалуйста, введите email.');
            isValid = false;
        } else if (!validateEmailFormat(emailField.value.trim())) {
            showFieldError(emailField, 'userEmailError', 'Пожалуйста, введите корректный email.');
            isValid = false;
        }

        if (!birthDateField.value) {
            showFieldError(birthDateField, 'userBirthDateError', 'Пожалуйста, укажите дату рождения.');
            isValid = false;
        }

        if (!birthPlaceField.value.trim()) {
            showFieldError(birthPlaceField, 'userBirthPlaceError', 'Пожалуйста, укажите место рождения.');
            isValid = false;
        }

        return isValid;
    }


    /* =============================================
       STEP 2: Astrology Quiz
       ============================================= */
    function initializeStep2() {
        var form = document.getElementById('onboardingStep2');
        if (!form) {
            return;
        }

        /* Check if Step 1 is completed */
        var savedData = getOnboardingData();
        if (!savedData.user_name || !savedData.user_email) {
            window.location.href = 'step-1.html';
            return;
        }

        /* Pre-fill form from localStorage */
        if (savedData.relationship_status) {
            var relRadio = form.querySelector('input[name="relationship_status"][value="' + savedData.relationship_status + '"]');
            if (relRadio) {
                relRadio.checked = true;
            }
        }
        if (savedData.life_goals && Array.isArray(savedData.life_goals)) {
            savedData.life_goals.forEach(function (goal) {
                var checkbox = form.querySelector('input[name="life_goals"][value="' + goal + '"]');
                if (checkbox) {
                    checkbox.checked = true;
                }
            });
        }
        if (savedData.astrology_experience) {
            var experienceSelect = document.getElementById('astrologyExperience');
            if (experienceSelect) {
                experienceSelect.value = savedData.astrology_experience;
            }
        }

        /* Handle form submission */
        form.addEventListener('submit', function (event) {
            event.preventDefault();
            var isValid = validateStep2Form(form);

            if (isValid) {
                var relationshipInput = form.querySelector('input[name="relationship_status"]:checked');
                var goalsCheckboxes = form.querySelectorAll('input[name="life_goals"]:checked');
                var experienceSelect = document.getElementById('astrologyExperience');

                var selectedGoals = [];
                goalsCheckboxes.forEach(function (checkbox) {
                    selectedGoals.push(checkbox.value);
                });

                var formData = {
                    relationship_status: relationshipInput ? relationshipInput.value : '',
                    life_goals: selectedGoals,
                    astrology_experience: experienceSelect ? experienceSelect.value : ''
                };
                saveOnboardingData(formData);
                window.location.href = 'step-3.html';
            }
        });
    }

    function validateStep2Form(form) {
        var isValid = true;

        var relationshipInput = form.querySelector('input[name="relationship_status"]:checked');
        if (!relationshipInput) {
            var errorElement = document.getElementById('relationshipStatusError');
            if (errorElement) {
                errorElement.textContent = 'Пожалуйста, выберите ваш статус.';
            }
            isValid = false;
        }

        var goalsCheckboxes = form.querySelectorAll('input[name="life_goals"]:checked');
        if (goalsCheckboxes.length === 0) {
            var goalsError = document.getElementById('lifeGoalsError');
            if (goalsError) {
                goalsError.textContent = 'Пожалуйста, выберите хотя бы одну область интересов.';
            }
            isValid = false;
        }

        return isValid;
    }


    /* =============================================
       STEP 3: Profile Summary & Plan Selection
       ============================================= */
    function initializeStep3() {
        var form = document.getElementById('onboardingStep3');
        if (!form) {
            return;
        }

        /* Check if previous steps are completed */
        var savedData = getOnboardingData();
        if (!savedData.user_name || !savedData.user_email) {
            window.location.href = 'step-1.html';
            return;
        }
        if (!savedData.relationship_status) {
            window.location.href = 'step-2.html';
            return;
        }

        /* Populate summary */
        populateOnboardingSummary(savedData);

        /* Handle form submission */
        form.addEventListener('submit', function (event) {
            event.preventDefault();
            var isValid = validateStep3Form(form);

            if (isValid) {
                var planInput = form.querySelector('input[name="selected_plan"]:checked');
                var formData = {
                    selected_plan: planInput ? planInput.value : ''
                };
                saveOnboardingData(formData);

                /* Prepare data for API submission */
                var completeData = getOnboardingData();
                submitOnboardingData(completeData);
            }
        });
    }

    function populateOnboardingSummary(data) {
        var summaryName = document.getElementById('summaryName');
        var summaryEmail = document.getElementById('summaryEmail');
        var summaryBirthDate = document.getElementById('summaryBirthDate');
        var summaryBirthPlace = document.getElementById('summaryBirthPlace');

        if (summaryName) {
            summaryName.textContent = data.user_name || '—';
        }
        if (summaryEmail) {
            summaryEmail.textContent = data.user_email || '—';
        }
        if (summaryBirthDate && data.user_birth_date) {
            var dateObject = new Date(data.user_birth_date);
            var options = { day: 'numeric', month: 'long', year: 'numeric' };
            summaryBirthDate.textContent = dateObject.toLocaleDateString('ru-RU', options);
        }
        if (summaryBirthPlace) {
            summaryBirthPlace.textContent = data.user_birth_place || '—';
        }
    }

    function validateStep3Form(form) {
        var isValid = true;

        var planInput = form.querySelector('input[name="selected_plan"]:checked');
        if (!planInput) {
            var planError = document.getElementById('selectedPlanError');
            if (planError) {
                planError.textContent = 'Пожалуйста, выберите тарифный план.';
            }
            isValid = false;
        }

        var termsCheckbox = document.getElementById('termsAgreed');
        if (termsCheckbox && !termsCheckbox.checked) {
            var termsError = document.getElementById('termsAgreedError');
            if (termsError) {
                termsError.textContent = 'Необходимо согласиться с условиями.';
            }
            isValid = false;
        }

        return isValid;
    }

    /* ----- Submit complete onboarding data to API ----- */
    function submitOnboardingData(data) {
        /*
         * BACKEND INTEGRATION POINT
         * Replace this placeholder with actual API call:
         *
         * fetch('/api/onboarding/complete', {
         *     method: 'POST',
         *     headers: { 'Content-Type': 'application/json' },
         *     body: JSON.stringify(data)
         * })
         * .then(function(response) { return response.json(); })
         * .then(function(result) {
         *     clearOnboardingData();
         *     window.location.href = result.redirectUrl;
         * })
         * .catch(function(error) {
         *     console.error('Onboarding submission error:', error);
         * });
         */

        /* Temporary: log data and show alert */
        console.log('Onboarding data ready for API:', data);
        alert('Регистрация завершена! Данные готовы для отправки на сервер.');
        clearOnboardingData();
    }


    /* =============================================
       INITIALIZATION
       ============================================= */
    function initializeOnboarding() {
        initializeStep1();
        initializeStep2();
        initializeStep3();
    }

    /* Run when DOM is ready */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeOnboarding);
    } else {
        initializeOnboarding();
    }

})();
