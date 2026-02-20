/* ============================================
   NAVIGATION JAVASCRIPT — Ezotera Frontend
   Header scroll behavior, desktop dropdowns
   with delayed close, mobile menu,
   mobile dropdowns, smooth scroll
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


    /* =============================================
       DESKTOP DROPDOWN — Delayed open/close
       Prevents flicker when crossing gaps.
       Uses mouseenter/mouseleave with 180ms delay.
       ============================================= */
    function initializeDesktopDropdowns() {
        var navItemsWithDropdown = document.querySelectorAll('.header__nav-item');

        navItemsWithDropdown.forEach(function (navItem) {
            var dropdownPanel = navItem.querySelector('.header__dropdown');

            /* Skip items without a dropdown */
            if (!dropdownPanel) {
                return;
            }

            var closeTimerId = null;
            var openTimerId = null;
            var CLOSE_DELAY = 250;
            var OPEN_DELAY = 100;

            function openDropdown() {
                /* Cancel any pending close */
                if (closeTimerId) {
                    clearTimeout(closeTimerId);
                    closeTimerId = null;
                }

                /* Close all other open dropdowns first */
                var allOpenItems = document.querySelectorAll('.header__nav-item--open');
                allOpenItems.forEach(function (openItem) {
                    if (openItem !== navItem) {
                        openItem.classList.remove('header__nav-item--open');
                    }
                });

                openTimerId = setTimeout(function () {
                    navItem.classList.add('header__nav-item--open');
                }, OPEN_DELAY);
            }

            function closeDropdown() {
                /* Cancel any pending open */
                if (openTimerId) {
                    clearTimeout(openTimerId);
                    openTimerId = null;
                }

                closeTimerId = setTimeout(function () {
                    navItem.classList.remove('header__nav-item--open');
                }, CLOSE_DELAY);
            }

            function cancelClose() {
                if (closeTimerId) {
                    clearTimeout(closeTimerId);
                    closeTimerId = null;
                }
            }

            /* Mouse events on the parent nav item (includes the link) */
            navItem.addEventListener('mouseenter', openDropdown);
            navItem.addEventListener('mouseleave', closeDropdown);

            /* When mouse enters the dropdown itself, cancel close */
            dropdownPanel.addEventListener('mouseenter', cancelClose);
            dropdownPanel.addEventListener('mouseleave', closeDropdown);

            /* Keyboard accessibility: toggle on Enter/Space */
            var navLink = navItem.querySelector('.header__nav-link');
            if (navLink) {
                navLink.addEventListener('click', function (event) {
                    /* Only intercept if this link has a dropdown */
                    if (navLink.getAttribute('href') === '#') {
                        event.preventDefault();
                    }
                    var isOpen = navItem.classList.contains('header__nav-item--open');
                    /* Close all */
                    var allOpenItems = document.querySelectorAll('.header__nav-item--open');
                    allOpenItems.forEach(function (openItem) {
                        openItem.classList.remove('header__nav-item--open');
                    });
                    if (!isOpen) {
                        navItem.classList.add('header__nav-item--open');
                    }
                });

                navLink.addEventListener('keydown', function (event) {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        navLink.click();
                    }
                });
            }
        });

        /* Close all dropdowns when clicking outside the nav */
        document.addEventListener('click', function (event) {
            var isInsideNav = event.target.closest('.header__nav');
            if (!isInsideNav) {
                var allOpenItems = document.querySelectorAll('.header__nav-item--open');
                allOpenItems.forEach(function (openItem) {
                    openItem.classList.remove('header__nav-item--open');
                });
            }
        });

        /* Close all dropdowns on Escape */
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
                var allOpenItems = document.querySelectorAll('.header__nav-item--open');
                allOpenItems.forEach(function (openItem) {
                    openItem.classList.remove('header__nav-item--open');
                });
            }
        });
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

                /* Rotate arrows back */
                var allArrows = document.querySelectorAll('.header__mobile-nav-link .header__nav-arrow');
                allArrows.forEach(function (arrow) {
                    arrow.style.transform = '';
                });

                /* Toggle current dropdown */
                if (!isOpen) {
                    dropdownElement.classList.add('header__mobile-dropdown--open');
                    var currentArrow = trigger.querySelector('.header__nav-arrow');
                    if (currentArrow) {
                        currentArrow.style.transform = 'rotate(180deg)';
                    }
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
        initializeDesktopDropdowns();
        initializeMobileMenu();
        initializeMobileDropdowns();
        initializeSmoothScroll();
    }

    /* Expose function to global scope for header-loader.js */
    window.initializeNavigation = initializeNavigation;

    /* Run when DOM is ready */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeNavigation);
    } else {
        initializeNavigation();
    }

})();
