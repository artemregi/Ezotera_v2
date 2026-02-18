/**
 * Header Loader - Dynamically injects consistent navigation header
 * This ensures all pages have the same nav structure with correct relative paths
 */

(function() {
    'use strict';

    // Detect current page location and determine relative path prefixes
    const detectPageLocation = () => {
        const pathname = window.location.pathname;

        // Determine which page we're on
        if (pathname.includes('/zodiac/')) {
            // zodiac/aries.html, zodiac/gemini.html, etc.
            return {
                depth: 2,
                section: 'zodiac',
                indexHref: '../index.html',
                logoSrc: '../assets/images/placeholder.jpg',
                zodiacBase: './',
                aboutHref: '../about.html',
                loginHref: '../auth/login.html',
                onboardingHref: '../onboarding/step-1-name.html'
            };
        } else if (pathname.includes('/auth/')) {
            // auth/login.html, auth/register.html
            return {
                depth: 2,
                section: 'auth',
                indexHref: '../index.html',
                logoSrc: '../assets/images/placeholder.jpg',
                zodiacBase: '../zodiac/',
                aboutHref: '../about.html',
                loginHref: '#',
                onboardingHref: '../onboarding/step-1-name.html'
            };
        } else if (pathname.includes('/onboarding/')) {
            // onboarding/step-1-name.html, onboarding/step-2-gender.html, etc.
            return {
                depth: 2,
                section: 'onboarding',
                indexHref: '../index.html',
                logoSrc: '../assets/images/placeholder.jpg',
                zodiacBase: '../zodiac/',
                aboutHref: '../about.html',
                loginHref: '../auth/login.html',
                onboardingHref: '#'
            };
        } else if (pathname.includes('dashboard.html')) {
            // dashboard.html
            return {
                depth: 1,
                section: 'dashboard',
                indexHref: 'index.html',
                logoSrc: 'assets/images/placeholder.jpg',
                zodiacBase: 'zodiac/',
                aboutHref: 'about.html',
                loginHref: 'auth/login.html',
                onboardingHref: 'onboarding/step-1-name.html'
            };
        } else {
            // index.html, about.html, pricing.html, contact.html (root level)
            return {
                depth: 1,
                section: 'root',
                indexHref: 'index.html',
                logoSrc: 'assets/images/placeholder.jpg',
                zodiacBase: 'zodiac/',
                aboutHref: 'about.html',
                loginHref: 'auth/login.html',
                onboardingHref: 'onboarding/step-1-name.html'
            };
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

            const response = await fetch(componentPath);
            if (!response.ok) throw new Error('Failed to load header template');

            let headerHTML = await response.text();

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
