/* ============================================
   ROBOKASSA PAYMENT HANDLER — Esoterra Frontend
   Handles payment button clicks, calls API
   to get a signed payment URL, then redirects.
   ============================================ */

(function () {
    'use strict';

    // false = боевые платежи, true = тестовый режим Robokassa
    var IS_TEST = false;

    // Capture ?ref= parameter into cookie on any page that loads this script
    (function() {
        var p = new URLSearchParams(window.location.search);
        var r = p.get('ref');
        if (r) document.cookie = 'ezo_ref=' + encodeURIComponent(r) + ';path=/;max-age=2592000';
    })();

    function getReferralCode() {
        var match = document.cookie.match(/ezo_ref=([^;]+)/);
        return match ? decodeURIComponent(match[1]) : '';
    }

    /**
     * Initiates a Robokassa payment.
     * @param {number|string} amount  - Payment amount in RUB
     * @param {string}        desc    - Service description (shown to user on Robokassa)
     * @param {HTMLElement}   btn     - The button element (for loading state)
     */
    async function initiatePayment(amount, desc, btn) {
        var originalText = btn ? btn.textContent : '';
        var originalDisabled = btn ? btn.disabled : false;

        if (btn) {
            btn.textContent = 'Загрузка…';
            btn.disabled = true;
        }

        try {
            var payload = {
                amount: amount,
                description: desc,
                isTest: IS_TEST
            };
            var refCode = getReferralCode();
            if (refCode) payload.referralCode = refCode;

            var response = await fetch('/api/payment/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });

            var data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Ошибка создания платежа');
            }

            // Redirect to Robokassa payment page
            window.location.href = data.paymentUrl;
        } catch (err) {
            console.error('Payment error:', err);
            alert('Не удалось создать платёж: ' + err.message + '\n\nПожалуйста, попробуйте ещё раз или свяжитесь с нами.');
            if (btn) {
                btn.textContent = originalText;
                btn.disabled = originalDisabled;
            }
        }
    }

    /**
     * Attaches click handlers to all elements with [data-pay-amount].
     */
    function initPayButtons() {
        var buttons = document.querySelectorAll('[data-pay-amount]');
        buttons.forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                var amount = btn.getAttribute('data-pay-amount');
                var desc = btn.getAttribute('data-pay-desc') || 'Услуга EsoTerra';
                initiatePayment(amount, desc, btn);
            });
        });
    }

    /**
     * Syncs pricing CTA button amounts with the monthly/yearly toggle.
     * Reads data-monthly-amount / data-yearly-amount attributes.
     */
    function syncPricingButtons(period) {
        var ctaButtons = document.querySelectorAll('.pricing-card__cta[data-monthly-amount]');
        ctaButtons.forEach(function (btn) {
            var amount = btn.getAttribute('data-' + period + '-amount');
            var desc = btn.getAttribute('data-' + period + '-desc');
            if (amount) btn.setAttribute('data-pay-amount', amount);
            if (desc) btn.setAttribute('data-pay-desc', desc);
        });
    }

    function initPricingToggleSync() {
        var toggleSwitch = document.querySelector('.pricing-toggle__switch');
        if (!toggleSwitch) return;

        toggleSwitch.addEventListener('click', function () {
            // aria-checked is updated by animations.js before this fires,
            // so we read the updated value
            var isYearly = toggleSwitch.getAttribute('aria-checked') === 'true';
            syncPricingButtons(isYearly ? 'yearly' : 'monthly');
        });
    }

    function init() {
        initPayButtons();
        initPricingToggleSync();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
