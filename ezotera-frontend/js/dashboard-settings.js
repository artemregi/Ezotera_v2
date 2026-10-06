/* ============================================
   DASHBOARD SETTINGS — Esoterra Frontend
   Вкладка «Настройки»: редактирование профиля и смена пароля.
   ============================================ */

(function () {
    'use strict';

    var profileForm = document.getElementById('settingsProfileForm');
    var passwordForm = document.getElementById('settingsPasswordForm');
    if (!profileForm || !passwordForm) return;

    var fields = {
        name: document.getElementById('setName'),
        email: document.getElementById('setEmail'),
        birthDate: document.getElementById('setBirthDate'),
        birthTime: document.getElementById('setBirthTime'),
        birthPlace: document.getElementById('setBirthPlace'),
        gender: document.getElementById('setGender')
    };

    function showMessage(el, text, isError) {
        el.textContent = text;
        el.className = 'settings-form__message' +
            (text ? (isError ? ' settings-form__message--error' : ' settings-form__message--ok') : '');
    }

    function fillProfile(user) {
        fields.name.value = user.name || '';
        fields.email.value = user.email || '';
        fields.birthDate.value = user.birthDate || '';
        var time = String(user.birthTime || '').match(/^(\d{2}:\d{2})/);
        fields.birthTime.value = time ? time[1] : '';
        fields.birthPlace.value = user.birthPlace || '';
        fields.gender.value = user.gender || '';
    }

    /* Сегодняшняя дата — верхняя граница для даты рождения */
    try { fields.birthDate.max = new Date().toISOString().slice(0, 10); } catch (e) {}

    fetch('/api/user/profile', { method: 'GET', credentials: 'include' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (result) {
            if (result && result.user) fillProfile(result.user);
        })
        .catch(function () {});

    /* Сообщение об успехе после перезагрузки страницы */
    try {
        if (sessionStorage.getItem('ezo_settings_saved')) {
            sessionStorage.removeItem('ezo_settings_saved');
            showMessage(document.getElementById('setProfileMessage'), 'Изменения сохранены. Разбор и знак зодиака обновлены.', false);
        }
    } catch (e) {}

    /* ----- Профиль ----- */
    profileForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var msg = document.getElementById('setProfileMessage');
        var btn = document.getElementById('setProfileSubmit');

        var name = fields.name.value.trim();
        if (name.length < 2) { showMessage(msg, 'Введите имя — минимум 2 символа.', true); fields.name.focus(); return; }
        if (!fields.birthDate.value) { showMessage(msg, 'Укажите дату рождения.', true); fields.birthDate.focus(); return; }

        showMessage(msg, '', false);
        btn.disabled = true;
        btn.textContent = 'Сохранение…';

        fetch('/api/user/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                name: name,
                birthDate: fields.birthDate.value,
                birthTime: fields.birthTime.value,
                birthPlace: fields.birthPlace.value.trim(),
                gender: fields.gender.value
            })
        })
        .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
        .then(function (res) {
            if (!res.ok || !res.data.success) {
                throw new Error((res.data && res.data.message) || 'Не удалось сохранить изменения.');
            }
            /* Знак зодиака и разбор зависят от даты рождения — перезагружаем кабинет */
            try { sessionStorage.setItem('ezo_settings_saved', '1'); } catch (err) {}
            window.location.hash = 'settings';
            window.location.reload();
        })
        .catch(function (err) {
            btn.disabled = false;
            btn.textContent = 'Сохранить изменения';
            showMessage(msg, err.message === 'Failed to fetch'
                ? 'Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.'
                : err.message, true);
        });
    });

    /* ----- Пароль ----- */
    var currentField = document.getElementById('setCurrentPassword');
    var newField = document.getElementById('setNewPassword');

    document.getElementById('setShowPasswords').addEventListener('change', function () {
        var type = this.checked ? 'text' : 'password';
        currentField.type = type;
        newField.type = type;
    });

    passwordForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var msg = document.getElementById('setPasswordMessage');
        var btn = document.getElementById('setPasswordSubmit');

        if (!currentField.value) { showMessage(msg, 'Введите текущий пароль.', true); currentField.focus(); return; }
        if (newField.value.length < 8) { showMessage(msg, 'Новый пароль должен содержать минимум 8 символов.', true); newField.focus(); return; }

        showMessage(msg, '', false);
        btn.disabled = true;
        btn.textContent = 'Сохранение…';

        fetch('/api/user/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ currentPassword: currentField.value, newPassword: newField.value })
        })
        .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
        .then(function (res) {
            btn.disabled = false;
            btn.textContent = 'Изменить пароль';
            if (!res.ok || !res.data.success) {
                showMessage(msg, (res.data && res.data.message) || 'Не удалось изменить пароль.', true);
                if (res.data && res.data.field === 'currentPassword') currentField.focus();
                return;
            }
            currentField.value = '';
            newField.value = '';
            showMessage(msg, 'Пароль изменён.', false);
        })
        .catch(function () {
            btn.disabled = false;
            btn.textContent = 'Изменить пароль';
            showMessage(msg, 'Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.', true);
        });
    });
})();
