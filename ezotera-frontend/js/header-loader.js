/**
 * Header Loader - Dynamically injects consistent navigation header
 * Optimized version with proper error handling and caching
 */

(function() {
    'use strict';

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

            // Check if there's already a header element and replace it
            const existingHeader = document.querySelector('header.header');
            if (existingHeader) {
                existingHeader.replaceWith(header);
            } else {
                // Insert before first main element or at beginning of body
                const main = document.querySelector('main');
                if (main) {
                    main.parentNode.insertBefore(header, main);
                } else {
                    document.body.insertBefore(header, document.body.firstChild);
                }
            }

            // Reinitialize navigation scripts after header is loaded
            if (typeof initializeNavigation === 'function') {
                initializeNavigation();
            }

        } catch (error) {
            console.error('Error loading header:', error);
        }
    };

    // Wait for DOM to be interactive before loading
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadHeader);
    } else {
        loadHeader();
    }
})();
