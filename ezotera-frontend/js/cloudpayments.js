/**
 * CloudPayments Widget Integration
 * Replaces Robokassa payment flow.
 *
 * Requires CloudPayments widget script on page:
 * <script src="https://widget.cloudpayments.ru/bundles/cloudpayments.js"></script>
 *
 * Usage: buttons with data-pay-amount and data-pay-desc attributes
 * Set CP_PUBLIC_ID via window.CP_CONFIG or replace directly.
 */

(function () {
    'use strict';

    // ── Config ──────────────────────────────────────────────────────────────
    // CP_PUBLIC_ID is injected server-side or set via meta tag.
    // For production: replace 'test_XXXXXXXX' with real Public ID from CloudPayments.
    var PUBLIC_ID = (window.CP_CONFIG && window.CP_CONFIG.publicId) || 'test_XXXXXXXXXXXXXXXXXXXXXXXX';
    var IS_TEST   = PUBLIC_ID.indexOf('test_') === 0;

    // ── Init on DOM ready ────────────────────────────────────────────────────
    function init() {
        var buttons = document.querySelectorAll('[data-pay-amount]');
        buttons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var amount  = parseFloat(btn.getAttribute('data-pay-amount'));
                var desc    = btn.getAttribute('data-pay-desc') || 'Консультация Ezotera';
                var consentBox = document.getElementById('payConsent');

                if (consentBox && !consentBox.checked) {
                    consentBox.style.outline = '2px solid #e74c3c';
                    consentBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    return;
                }
                if (consentBox) consentBox.style.outline = '';

                openWidget(amount, desc);
            });
        });
    }

    // ── Open CloudPayments widget ────────────────────────────────────────────
    function openWidget(amount, description) {
        if (typeof cp === 'undefined' || typeof cp.CloudPayments === 'undefined') {
            console.error('CloudPayments widget not loaded.');
            alert('Ошибка загрузки платёжной формы. Пожалуйста, обновите страницу.');
            return;
        }

        var widget = new cp.CloudPayments({ language: 'ru-RU' });

        // Get email from user profile if available
        var userEmail = (window.USER_DATA && window.USER_DATA.email) || '';

        var orderId = 'EZO-' + Date.now();

        widget.charge(
            {
                publicId:    PUBLIC_ID,
                description: description,
                amount:      amount,
                currency:    'RUB',
                accountId:   userEmail,
                invoiceId:   orderId,
                skin:        'mini',
                email:       userEmail,
                // 54-ФЗ: кассовый чек
                data: {
                    CloudPayments: {
                        CustomerReceipt: {
                            Items: [
                                {
                                    label:    description,
                                    price:    amount,
                                    quantity: 1.0,
                                    amount:   amount,
                                    vat:      null,
                                    method:   0,   // full_prepayment
                                    object:   4,   // service
                                }
                            ],
                            taxationSystem: 1,  // УСН доходы
                            email:          userEmail,
                            phone:          '',
                        }
                    }
                }
            },
            function onSuccess(options) {
                // Успешная оплата
                var params = new URLSearchParams({
                    TransactionId: options.TransactionId || '',
                    Amount:        amount,
                    Currency:      'RUB',
                    invoiceId:     orderId,
                    email:         userEmail,
                });
                window.location.href = 'payment-success.html?' + params.toString();
            },
            function onFail(reason, options) {
                // Неуспешная оплата
                var params = new URLSearchParams({
                    reason:    reason || 'declined',
                    invoiceId: orderId,
                });
                window.location.href = 'payment-fail.html?' + params.toString();
            },
            function onComplete(paymentResult, options) {
                // Вызывается при закрытии виджета (успех или неудача)
            }
        );
    }

    // ── Bootstrap ────────────────────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
