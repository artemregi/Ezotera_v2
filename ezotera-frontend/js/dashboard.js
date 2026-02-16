(function() {
    'use strict';

    // DOM elements
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const userData = document.getElementById('userData');
    const errorMessage = document.getElementById('errorMessage');
    const retryBtn = document.getElementById('retryBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    // Initialize dashboard
    function initDashboard() {
        fetchUserProfile();
        setupEventListeners();
    }

    // Fetch user profile from API
    function fetchUserProfile() {
        showLoading();

        fetch('/api/user/profile', {
            method: 'GET',
            credentials: 'include' // Send auth cookie
        })
        .then(function(response) {
            if (!response.ok) {
                if (response.status === 401) {
                    // Not authenticated - redirect to login
                    window.location.href = '/ezotera-frontend/auth/login.html';
                    return;
                }
                throw new Error('Ошибка загрузки профиля');
            }
            return response.json();
        })
        .then(function(result) {
            if (result && result.success) {
                displayUserData(result.user);
            } else {
                showError('Не удалось загрузить данные профиля');
            }
        })
        .catch(function(err) {
            console.error('Profile fetch error:', err);
            showError(err.message || 'Произошла ошибка при загрузке данных');
        });
    }

    // Display user data in table
    function displayUserData(user) {
        // Main fields
        document.getElementById('userName').textContent = user.name || '—';
        document.getElementById('userEmail').textContent = user.email || '—';

        // Birth date - format as Russian date
        if (user.birthDate) {
            const date = new Date(user.birthDate);
            const formatted = date.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
            document.getElementById('userBirthDate').textContent = formatted;
        } else {
            document.getElementById('userBirthDate').textContent = '—';
        }

        // Zodiac sign (calculated dynamically)
        document.getElementById('userZodiacSign').textContent = user.zodiacSign || '—';

        // Created at - format as date
        if (user.createdAt) {
            const createdDate = new Date(user.createdAt);
            const formattedCreated = createdDate.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
            document.getElementById('userCreatedAt').textContent = formattedCreated;
        } else {
            document.getElementById('userCreatedAt').textContent = '—';
        }

        // Additional optional fields
        const additionalInfo = document.getElementById('additionalInfo');
        let hasAdditionalInfo = false;

        if (user.gender) {
            const genderMap = {
                'male': 'Мужской',
                'female': 'Женский',
                'other': 'Другое'
            };
            document.getElementById('userGender').textContent = genderMap[user.gender] || user.gender;
            document.getElementById('genderRow').style.display = '';
            hasAdditionalInfo = true;
        }

        if (user.birthTime) {
            document.getElementById('userBirthTime').textContent = user.birthTime;
            document.getElementById('birthTimeRow').style.display = '';
            hasAdditionalInfo = true;
        }

        if (user.birthPlace) {
            document.getElementById('userBirthPlace').textContent = user.birthPlace;
            document.getElementById('birthPlaceRow').style.display = '';
            hasAdditionalInfo = true;
        }

        if (user.relationshipStatus) {
            document.getElementById('userRelationship').textContent = user.relationshipStatus;
            document.getElementById('relationshipRow').style.display = '';
            hasAdditionalInfo = true;
        }

        if (user.focusArea) {
            document.getElementById('userFocusArea').textContent = user.focusArea;
            document.getElementById('focusAreaRow').style.display = '';
            hasAdditionalInfo = true;
        }

        // Show additional info section if there's data
        if (hasAdditionalInfo) {
            additionalInfo.style.display = 'block';
        }

        showUserData();
    }

    // Setup event listeners
    function setupEventListeners() {
        // Retry button
        if (retryBtn) {
            retryBtn.addEventListener('click', fetchUserProfile);
        }

        // Logout button
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }
    }

    // Handle logout
    function handleLogout() {
        fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        })
        .then(function(response) {
            return response.json();
        })
        .then(function(result) {
            // Redirect to login page
            window.location.href = '/ezotera-frontend/auth/login.html';
        })
        .catch(function(error) {
            console.error('Logout error:', error);
            // Redirect anyway
            window.location.href = '/ezotera-frontend/auth/login.html';
        });
    }

    // UI state management
    function showLoading() {
        loading.style.display = 'block';
        error.style.display = 'none';
        userData.style.display = 'none';
    }

    function showError(message) {
        loading.style.display = 'none';
        error.style.display = 'block';
        userData.style.display = 'none';
        errorMessage.textContent = message;
    }

    function showUserData() {
        loading.style.display = 'none';
        error.style.display = 'none';
        userData.style.display = 'block';
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDashboard);
    } else {
        initDashboard();
    }
})();
