/**
 * Header Loader - Dynamically injects consistent navigation header
 * Optimized version with proper error handling and caching
 */

(function() {
    'use strict';

    // Add a style to prevent flash of unstyled header area
    const style = document.createElement('style');
    style.textContent = `
        body > header.header {
            display: block !important;
        }
        body > div:first-child:not(.dashboard):not(.auth) {
            position: relative;
        }
        /* Styles for authenticated user header */
        .header__user-greeting {
            color: white;
            font-weight: 500;
            margin-right: 15px;
        }
        .header__user-name {
            color: white;
            font-weight: 500;
        }
        .header__dashboard-link {
            color: white !important;
            text-decoration: none;
            margin-right: 15px;
            transition: opacity 0.2s;
        }
        .header__dashboard-link:hover {
            opacity: 0.8;
        }
        .header__logout-btn {
            background: none;
            border: 1px solid white;
            color: white;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
        }
        .header__logout-btn:hover {
            background: rgba(255, 255, 255, 0.1);
        }
        /* Mobile authenticated user header */
        .header__mobile-user-greeting {
            color: white;
            font-weight: 500;
            margin-bottom: 10px;
        }
        .header__mobile-user-name {
            color: white;
            font-weight: 500;
        }
    `;
    document.head.appendChild(style);

    const CACHE_KEY = 'ezotera_header_cache';
    const CACHE_EXPIRY = 3600000; // 1 hour in ms

    // Detect current page location and determine relative path prefixes
    const detectPageLocation = () => {
        const pathname = window.location.pathname;

        // Determine which page we're on
        if (pathname.includes('/zodiac/')) {
            return {
                depth: 2,
                section: 'zodiac',
                indexHref: '../index.html',
                logoSrc: '../assets/icons/logo.jpg',
                zodiacBase: './',
                aboutHref: '../about.html',
                palmistryHref: '../palmistry.html',
                loginHref: '../auth/login.html',
                onboardingHref: '../onboarding/step-1-name.html'
            };
        } else if (pathname.includes('/auth/')) {
            return {
                depth: 2,
                section: 'auth',
                indexHref: '../index.html',
                logoSrc: '../assets/icons/logo.jpg',
                zodiacBase: '../zodiac/',
                palmistryHref: '../palmistry.html',
                aboutHref: '../about.html',
                loginHref: '#',
                onboardingHref: '../onboarding/step-1-name.html'
            };
        } else if (pathname.includes('/onboarding/')) {
            return {
                depth: 2,
                section: 'onboarding',
                indexHref: '../index.html',
                logoSrc: '../assets/icons/logo.jpg',
                zodiacBase: '../zodiac/',
                palmistryHref: '../palmistry.html',
                aboutHref: '../about.html',
                loginHref: '../auth/login.html',
                onboardingHref: '#'
            };
        } else if (pathname.includes('dashboard.html')) {
            return {
                depth: 1,
                section: 'dashboard',
                indexHref: 'index.html',
                logoSrc: 'assets/icons/logo.jpg',
                zodiacBase: 'zodiac/',
                palmistryHref: 'palmistry.html',
                aboutHref: 'about.html',
                loginHref: 'auth/login.html',
                onboardingHref: 'onboarding/step-1-name.html'
            };
        } else {
            return {
                depth: 1,
                section: 'root',
                indexHref: 'index.html',
                logoSrc: 'assets/icons/logo.jpg',
                zodiacBase: 'zodiac/',
                palmistryHref: 'palmistry.html',
                aboutHref: 'about.html',
                loginHref: 'auth/login.html',
                onboardingHref: 'onboarding/step-1-name.html'
            };
        }
    };

    // Get cached header or fetch new one
    const getHeaderHTML = async (componentPath) => {
        const cache = getCachedHeader();
        if (cache) {
            return cache;
        }

        try {
            const response = await fetch(componentPath, {
                method: 'GET',
                headers: { 'Content-Type': 'text/html' }
            });

            if (!response.ok) {
                console.warn('Failed to load header, using fallback');
                return null;
            }

            const html = await response.text();
            cacheHeader(html);
            return html;
        } catch (error) {
            console.warn('Header fetch error:', error);
            return null;
        }
    };

    const getCachedHeader = () => {
        try {
            const cached = sessionStorage.getItem(CACHE_KEY);
            if (!cached) return null;

            const { html, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp > CACHE_EXPIRY) {
                sessionStorage.removeItem(CACHE_KEY);
                return null;
            }

            return html;
        } catch {
            return null;
        }
    };

    const cacheHeader = (html) => {
        try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify({
                html,
                timestamp: Date.now()
            }));
        } catch {
            // Storage quota exceeded or private browsing
        }
    };

    // Load header template
    const loadHeader = async () => {
        try {
            const paths = detectPageLocation();

            // Determine path to components folder from current location
            let componentPath = 'components/header.html';
            if (paths.depth === 2) {
                componentPath = '../components/header.html';
            }

            let headerHTML = await getHeaderHTML(componentPath);

            // If fetch failed, try inline fallback or skip
            if (!headerHTML) {
                console.warn('No header loaded - page may have inline header');
                return;
            }

            // Replace path placeholders with correct relative paths
            headerHTML = headerHTML
                .replace(/INDEX_HREF/g, paths.indexHref)
                .replace(/LOGO_SRC/g, paths.logoSrc)
                .replace(/ZODIAC_BASE/g, paths.zodiacBase)
                .replace(/ABOUT_HREF/g, paths.aboutHref)
                .replace(/PALMISTRY_HREF/g, paths.palmistryHref)
                .replace(/LOGIN_HREF/g, paths.loginHref)
                .replace(/ONBOARDING_HREF/g, paths.onboardingHref);

            // Insert header at the beginning of body or before first main element
            const headerContainer = document.createElement('div');
            headerContainer.innerHTML = headerHTML;
            const header = headerContainer.firstElementChild;

            if (!header) {
                console.warn('No valid header element found');
                return;
            }

            // Remove any existing headers (including partial/broken ones)
            const existingHeaders = document.querySelectorAll('header.header, header[id="header"]');
            existingHeaders.forEach(h => h.remove());

            // Insert new header before main element or at beginning of body
            const main = document.querySelector('main');
            if (main) {
                main.parentNode.insertBefore(header, main);
            } else {
                document.body.insertBefore(header, document.body.firstChild);
            }

            // Reinitialize navigation scripts after header is loaded
            // Use setTimeout to ensure navigation.js is fully loaded
            setTimeout(() => {
                if (typeof window.initializeNavigation === 'function') {
                    window.initializeNavigation();
                } else {
                    console.warn('Navigation initialization not available yet');
                }
            }, 50);

            // Check auth status now that header is fully in DOM
            updateHeaderForAuthenticatedUser();

        } catch (error) {
            console.error('Error loading header:', error);
        }
    };

    /**
     * Check authentication status and update header if user is logged in
     * This runs after header is injected and replaces login/register buttons
     * with dashboard/logout buttons if user has valid session
     */
    const updateHeaderForAuthenticatedUser = () => {
        // Check if user is authenticated via /api/auth/verify
        fetch('/api/auth/verify', {
            method: 'GET',
            credentials: 'include' // Send auth cookie
        })
        .then(response => response.json())
        .then(data => {
            if (data.authenticated && data.user) {
                // User is logged in - update header actions
                updateHeaderActions(data.user);
            }
        })
        .catch(error => {
            // Silently fail - user is not authenticated
            console.debug('Auth check: user not authenticated');
        });
    };

    /**
     * Replace header action buttons with authenticated user options
     */
    const updateHeaderActions = (user) => {
        // Get paths based on current page
        const paths = detectPageLocation();
        const dashboardHref = paths.depth === 2 ? '../dashboard.html' : 'dashboard.html';

        // Create new authenticated header HTML
        const userName = user.name || user.email;
        const authenticatedHTML = `
            <div class="header__user-greeting">
                <span class="header__user-name">👤 ${escapeHtml(userName)}</span>
            </div>
            <a href="${dashboardHref}" class="header__dashboard-link" title="Личный кабинет">
                Личный кабинет
            </a>
            <button class="header__logout-btn" title="Выйти из аккаунта">
                Выйти
            </button>
        `;

        // Update desktop header actions
        const headerActions = document.querySelector('.header__actions');
        if (headerActions) {
            headerActions.innerHTML = authenticatedHTML;
            // Attach logout handler to desktop logout button
            const logoutBtn = headerActions.querySelector('.header__logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', handleLogout);
            }
        }

        // Update mobile header actions
        const mobileActions = document.querySelector('.header__mobile-actions');
        if (mobileActions) {
            const mobileAuthHTML = `
                <div class="header__mobile-user-greeting">
                    <span class="header__mobile-user-name">👤 ${escapeHtml(userName)}</span>
                </div>
                <a href="${dashboardHref}" class="button button--outline-white button--full-width">
                    Личный кабинет
                </a>
                <button class="button button--primary button--full-width" title="Выйти из аккаунта">
                    Выйти
                </button>
            `;
            mobileActions.innerHTML = mobileAuthHTML;
            // Attach logout handler to mobile logout button
            const mobileLogoutBtn = mobileActions.querySelector('button.button--primary');
            if (mobileLogoutBtn) {
                mobileLogoutBtn.addEventListener('click', handleLogout);
            }
        }
    };

    /**
     * Handle logout button click
     */
    const handleLogout = (e) => {
        e.preventDefault();
        console.log('🔓 User clicked logout');

        // Call logout endpoint
        fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('✅ Logout successful');
                // Redirect to home page
                window.location.href = '/';
            }
        })
        .catch(error => {
            console.error('Logout error:', error);
            // Still redirect even if logout fails
            window.location.href = '/';
        });
    };

    /**
     * Escape HTML special characters to prevent XSS
     */
    const escapeHtml = (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    // Load header as soon as possible
    // If DOM is still loading, wait for it; otherwise load immediately
    const initializeHeader = () => {
        loadHeader();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeHeader);
    } else {
        // DOM is already loaded, init immediately
        initializeHeader();
    }
})();
