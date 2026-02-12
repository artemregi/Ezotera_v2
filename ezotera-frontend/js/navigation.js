/* ============================================
   NAVIGATION JAVASCRIPT — Ezotera Frontend
   Header scroll behavior, mobile menu,
   mobile dropdowns, active link tracking
   ============================================ */

(function () {
    'use strict';

    /* ----- DOM Element References ----- */
    var headerElement = document.getElementById('header');
    var burgerButton = document.getElementById('burgerMenu');
    var mobileNavigation = document.getElementById('mobileNav');

    /* ----- Header Scroll Effect ----- */
    function initializeHeaderScroll() {
        if (!headerElement) {
            return;
        }

        var scrollThreshold = 50;

        function handleHeaderScroll() {
            if (window.scrollY > scrollThreshold) {
                headerElement.classList.add('header--scrolled');
            } else {
                headerElement.classList.remove('header--scrolled');
            }
        }

        window.addEventListener('scroll', handleHeaderScroll, { passive: true });
        handleHeaderScroll();
    }


    /* ----- Mobile Menu Toggle ----- */
    function initializeMobileMenu() {
        if (!burgerButton || !mobileNavigation) {
            return;
        }

        burgerButton.addEventListener('click', function () {
            var isOpen = mobileNavigation.classList.contains('header__mobile-nav--open');

            if (isOpen) {
                closeMobileMenu();
            } else {
                openMobileMenu();
            }
        });

        /* Close menu when clicking outside */
        document.addEventListener('click', function (event) {
            var isInsideMenu = mobileNavigation.contains(event.target);
            var isInsideBurger = burgerButton.contains(event.target);

            if (!isInsideMenu && !isInsideBurger) {
                closeMobileMenu();
            }
        });

        /* Close menu on escape key */
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
                closeMobileMenu();
            }
        });
    }

    function openMobileMenu() {
        if (!mobileNavigation || !burgerButton) {
            return;
        }
        mobileNavigation.classList.add('header__mobile-nav--open');
        burgerButton.classList.add('header__burger--active');
        burgerButton.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
    }

    function closeMobileMenu() {
        if (!mobileNavigation || !burgerButton) {
            return;
        }
        mobileNavigation.classList.remove('header__mobile-nav--open');
        burgerButton.classList.remove('header__burger--active');
        burgerButton.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
    }


    /* ----- Mobile Dropdown Toggles ----- */
    function initializeMobileDropdowns() {
        var dropdownTriggers = document.querySelectorAll('[data-dropdown]');

        dropdownTriggers.forEach(function (trigger) {
            trigger.addEventListener('click', function (event) {
                event.preventDefault();
                var dropdownId = trigger.getAttribute('data-dropdown');
                var dropdownElement = document.getElementById(dropdownId);

                if (!dropdownElement) {
                    return;
                }

                var isOpen = dropdownElement.classList.contains('header__mobile-dropdown--open');

                /* Close all other dropdowns first */
                var allDropdowns = document.querySelectorAll('.header__mobile-dropdown');
                allDropdowns.forEach(function (dropdown) {
                    dropdown.classList.remove('header__mobile-dropdown--open');
                });

                /* Toggle current dropdown */
                if (!isOpen) {
                    dropdownElement.classList.add('header__mobile-dropdown--open');
                }
            });
        });
    }


    /* ----- Smooth Scroll for Anchor Links ----- */
    function initializeSmoothScroll() {
        var anchorLinks = document.querySelectorAll('a[href^="#"]');

        anchorLinks.forEach(function (link) {
            link.addEventListener('click', function (event) {
                var targetId = link.getAttribute('href');

                if (targetId === '#') {
                    return;
                }

                var targetElement = document.querySelector(targetId);

                if (targetElement) {
                    event.preventDefault();
                    closeMobileMenu();

                    var headerHeight = headerElement ? headerElement.offsetHeight : 0;
                    var targetPosition = targetElement.getBoundingClientRect().top + window.scrollY - headerHeight;

                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }


    /* ----- Initialize All Navigation Features ----- */
    function initializeNavigation() {
        initializeHeaderScroll();
        initializeMobileMenu();
        initializeMobileDropdowns();
        initializeSmoothScroll();
    }

    /* Run when DOM is ready */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeNavigation);
    } else {
        initializeNavigation();
    }

})();
