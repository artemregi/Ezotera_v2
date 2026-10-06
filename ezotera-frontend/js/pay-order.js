/* ============================================
   CONSULTATION ORDER — Esoterra Frontend
   Кнопки [data-pay-amount] на pay.html открывают окно заказа
   (имя, email, согласие), затем — оплата через Robokassa.
   ============================================ */

(function () {
    'use strict';

    var modal = document.getElementById('payOrderModal');
    var form = document.getElementById('payOrderForm');
    if (!modal || !form) return;

    var nameField = document.getElementById('payOrdName');
    var emailField = document.getElementById('payOrdEmail');
    var consentBox = document.getElementById('payOrdConsent');
    var errorEl = document.getElementById('payOrdError');
    var submitBtn = document.getElementById('payOrdSubmit');
    var productEl = document.getElementById('payOrdProduct');

    var selected = null;   // { amount, desc }
    var lastTrigger = null;

    /* Вошедшему пользователю подставляем имя и email из аккаунта */
    fetch('/api/user/profile', { method: 'GET', credentials: 'include' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (result) {
            if (!result || !result.user) return;
            if (result.user.name && !nameField.value) nameField.value = result.user.name;
            if (result.user.email && !emailField.value) emailField.value = result.user.email;
        })
        .catch(function () {});

    function getReferralCode() {
        var match = document.cookie.match(/ezo_ref=([^;]+)/);
        return match ? decodeURIComponent(match[1]) : '';
    }

    function showError(message) {
        errorEl.textContent = message;
        errorEl.style.display = message ? 'block' : 'none';
    }

    function openModal(btn) {
        var amount = btn.getAttribute('data-pay-amount');
        var desc = btn.getAttribute('data-pay-desc') || 'Консультация Esoterra';
        selected = { amount: amount, desc: desc };
        lastTrigger = btn;
        productEl.textContent = desc.replace(/\s*—\s*Esoterra$/, '') + ' — ' +
            Number(amount).toLocaleString('ru-RU') + ' ₽';
        showError('');
        modal.classList.add('pay-modal-bg--active');
        (nameField.value ? (emailField.value ? consentBox : emailField) : nameField).focus();
    }

    function closeModal() {
        modal.classList.remove('pay-modal-bg--active');
        if (lastTrigger) lastTrigger.focus();
    }

    document.querySelectorAll('[data-pay-amount]').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            openModal(btn);
        });
    });

    document.getElementById('payOrdCancel').addEventListener('click', closeModal);
    modal.addEventListener('click', function (e) {
        if (e.target === modal) closeModal();
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modal.classList.contains('pay-modal-bg--active')) closeModal();
    });

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!selected) return;

        var name = nameField.value.trim();
        var email = emailField.value.trim();

        if (!name) { showError('Пожалуйста, введите Ваше имя.'); nameField.focus(); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showError('Пожалуйста, введите корректный email — на него придёт чек.');
            emailField.focus();
            return;
        }
        if (!consentBox.checked) {
            showError('Чтобы перейти к оплате, отметьте согласие с условиями.');
            consentBox.focus();
            return;
        }

        showError('');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Создание заказа…';

        function fail(message) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Перейти к оплате';
            showError(message);
        }

        fetch('/api/payment/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                amount: selected.amount,
                description: selected.desc,
                customerName: name,
                customerEmail: email,
                referralCode: getReferralCode(),
                isTest: false
            })
        })
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (data && data.success && data.paymentUrl) {
                /* shop.html (куда возвращает Robokassa) по этой записи
                   отправит на страницу результата оплаты консультации */
                try {
                    localStorage.setItem('ezo_last_purchase', JSON.stringify({
                        type: 'consultation',
                        name: selected.desc,
                        amount: selected.amount,
                        customerName: name,
                        email: email,
                        orderId: data.orderId || ''
                    }));
                } catch (err) {}
                window.location.href = data.paymentUrl;
            } else {
                fail((data && data.message) || 'Не удалось создать заказ. Попробуйте ещё раз.');
            }
        })
        .catch(function () {
            fail('Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.');
        });
    });
})();
