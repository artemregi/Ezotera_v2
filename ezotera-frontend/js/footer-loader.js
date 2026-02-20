/**
 * Footer Loader - Dynamically injects consistent footer
 * Simple loader for the footer component
 */

(function() {
    'use strict';

    const loadFooter = async () => {
        try {
            // Detect current page location
            const pathname = window.location.pathname;
            let componentPath = 'components/footer.html';

            if (pathname.includes('/zodiac/') || pathname.includes('/auth/') || pathname.includes('/onboarding/')) {
                componentPath = '../components/footer.html';
            }

            const response = await fetch(componentPath, {
                method: 'GET',
                headers: { 'Content-Type': 'text/html' }
            });

            if (!response.ok) {
                console.warn('Failed to load footer');
                return;
            }

            const footerHTML = await response.text();

            // Find the footer element
            const footer = document.querySelector('footer');
            if (footer) {
                footer.innerHTML = footerHTML;
            }

        } catch (error) {
            console.warn('Footer loading error:', error);
        }
    };

    // Load footer when DOM is ready
    const initFooter = () => {
        loadFooter();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFooter);
    } else {
        initFooter();
    }
})();
