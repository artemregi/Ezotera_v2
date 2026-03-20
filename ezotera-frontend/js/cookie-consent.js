/**
 * Cookie Consent Banner
 * Показывает уведомление о cookie при первом визите.
 * Согласие сохраняется в localStorage.
 */
(function () {
    'use strict';

    const STORAGE_KEY = 'ezotera_cookie_consent';

    function createBanner() {
        const banner = document.createElement('div');
        banner.id = 'cookieConsentBanner';
        banner.setAttribute('role', 'dialog');
        banner.setAttribute('aria-label', 'Уведомление о cookie');
        banner.style.cssText = [
            'position:fixed',
            'bottom:0',
            'left:0',
            'right:0',
            'z-index:9999',
            'background:#1b3a5c',
            'color:#fff',
            'padding:16px 24px',
            'display:flex',
            'align-items:center',
            'justify-content:space-between',
            'gap:16px',
            'flex-wrap:wrap',
            'font-family:Inter,sans-serif',
            'font-size:0.875rem',
            'line-height:1.5',
            'box-shadow:0 -2px 12px rgba(0,0,0,0.15)',
        ].join(';');

        // Detect cookie policy page path (works from root and subdirs)
        const isSubdir = window.location.pathname.split('/').length > 2;
        const cookiePolicyPath = isSubdir ? '../legal/cookie.html' : 'legal/cookie.html';

        banner.innerHTML = `
            <p style="margin:0;max-width:700px;">
                Сайт использует cookie для обеспечения корректной работы сервиса и улучшения пользовательского опыта.
                Продолжая использование сайта, вы соглашаетесь с&nbsp;
                <a href="${cookiePolicyPath}" style="color:#a8c9f0;text-decoration:underline;">Политикой использования Cookie</a>.
            </p>
            <button id="cookieConsentAccept" style="
                background:#2980b9;
                color:#fff;
                border:none;
                border-radius:6px;
                padding:10px 24px;
                font-size:0.875rem;
                font-weight:600;
                cursor:pointer;
                white-space:nowrap;
                flex-shrink:0;
            ">Принять</button>
        `;

        return banner;
    }

    function init() {
        if (localStorage.getItem(STORAGE_KEY)) {
            return; // already accepted
        }

        const banner = createBanner();
        document.body.appendChild(banner);

        document.getElementById('cookieConsentAccept').addEventListener('click', function () {
            localStorage.setItem(STORAGE_KEY, '1');
            banner.remove();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
