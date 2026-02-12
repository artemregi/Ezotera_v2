/* ============================================
   ANIMATIONS JAVASCRIPT — Ezotera Frontend
   Scroll-based fade-in animations,
   FAQ accordion, pricing toggle,
   counter animations
   ============================================ */

(function () {
    'use strict';

    /* =============================================
       SCROLL-BASED FADE-IN ANIMATIONS
       Uses IntersectionObserver for performance
       ============================================= */
    function initializeScrollAnimations() {
        var animatedElements = document.querySelectorAll('.fade-in');

        if (animatedElements.length === 0) {
            return;
        }

        /* Check for IntersectionObserver support */
        if (!('IntersectionObserver' in window)) {
            /* Fallback: show all elements immediately */
            animatedElements.forEach(function (element) {
                element.classList.add('fade-in--visible');
            });
            return;
        }

        var observerOptions = {
            root: null,
            rootMargin: '0px 0px -60px 0px',
            threshold: 0.1
        };

        var scrollObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in--visible');
                    scrollObserver.unobserve(entry.target);
                }
            });
        }, observerOptions);

        animatedElements.forEach(function (element, index) {
            /* Add staggered delay based on position */
            element.style.transitionDelay = (index % 4) * 0.1 + 's';
            scrollObserver.observe(element);
        });
    }


    /* =============================================
       FAQ ACCORDION
       ============================================= */
    function initializeFaqAccordion() {
        var faqItems = document.querySelectorAll('.faq__item');

        if (faqItems.length === 0) {
            return;
        }

        faqItems.forEach(function (item) {
            var questionButton = item.querySelector('.faq__question');

            if (!questionButton) {
                return;
            }

            questionButton.addEventListener('click', function () {
                var isOpen = item.classList.contains('faq__item--open');

                /* Close all FAQ items first */
                faqItems.forEach(function (otherItem) {
                    otherItem.classList.remove('faq__item--open');
                    var otherButton = otherItem.querySelector('.faq__question');
                    if (otherButton) {
                        otherButton.setAttribute('aria-expanded', 'false');
                    }
                });

                /* Toggle current item */
                if (!isOpen) {
                    item.classList.add('faq__item--open');
                    questionButton.setAttribute('aria-expanded', 'true');
                }
            });
        });
    }


    /* =============================================
       PRICING TOGGLE (Monthly / Yearly)
       ============================================= */
    function initializePricingToggle() {
        var toggleContainer = document.getElementById('pricingToggle');

        if (!toggleContainer) {
            return;
        }

        var toggleSwitch = toggleContainer.querySelector('.pricing-toggle__switch');
        var monthlyLabel = toggleContainer.querySelector('[data-period="monthly"]');
        var yearlyLabel = toggleContainer.querySelector('[data-period="yearly"]');
        var priceAmounts = document.querySelectorAll('.pricing-card__amount');

        if (!toggleSwitch) {
            return;
        }

        toggleSwitch.addEventListener('click', function () {
            var isYearly = toggleSwitch.getAttribute('aria-checked') === 'true';

            if (isYearly) {
                /* Switch to monthly */
                toggleSwitch.setAttribute('aria-checked', 'false');
                if (monthlyLabel) {
                    monthlyLabel.classList.add('pricing-toggle__label--active');
                }
                if (yearlyLabel) {
                    yearlyLabel.classList.remove('pricing-toggle__label--active');
                }
                updatePriceDisplay(priceAmounts, 'monthly');
            } else {
                /* Switch to yearly */
                toggleSwitch.setAttribute('aria-checked', 'true');
                if (monthlyLabel) {
                    monthlyLabel.classList.remove('pricing-toggle__label--active');
                }
                if (yearlyLabel) {
                    yearlyLabel.classList.add('pricing-toggle__label--active');
                }
                updatePriceDisplay(priceAmounts, 'yearly');
            }
        });

        /* Allow clicking labels to toggle */
        if (monthlyLabel) {
            monthlyLabel.addEventListener('click', function () {
                if (toggleSwitch.getAttribute('aria-checked') === 'true') {
                    toggleSwitch.click();
                }
            });
        }
        if (yearlyLabel) {
            yearlyLabel.addEventListener('click', function () {
                if (toggleSwitch.getAttribute('aria-checked') === 'false') {
                    toggleSwitch.click();
                }
            });
        }
    }

    function updatePriceDisplay(priceElements, period) {
        priceElements.forEach(function (element) {
            var price = element.getAttribute('data-' + period);
            if (price) {
                element.textContent = price;
            }
        });
    }


    /* =============================================
       COUNTER ANIMATION (About Page Stats)
       ============================================= */
    function initializeCounterAnimations() {
        var counterElements = document.querySelectorAll('[data-count]');

        if (counterElements.length === 0) {
            return;
        }

        if (!('IntersectionObserver' in window)) {
            return;
        }

        var counterObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    animateCounter(entry.target);
                    counterObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        counterElements.forEach(function (element) {
            counterObserver.observe(element);
        });
    }

    function animateCounter(element) {
        var targetValue = parseInt(element.getAttribute('data-count'), 10);
        var displayText = element.textContent;
        var suffix = displayText.replace(/[\d,]/g, '');
        var duration = 1500;
        var startTime = null;

        function updateCounter(timestamp) {
            if (!startTime) {
                startTime = timestamp;
            }

            var elapsed = timestamp - startTime;
            var progress = Math.min(elapsed / duration, 1);

            /* Ease-out cubic */
            var easedProgress = 1 - Math.pow(1 - progress, 3);
            var currentValue = Math.floor(easedProgress * targetValue);

            element.textContent = currentValue.toLocaleString('ru-RU') + suffix;

            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            }
        }

        requestAnimationFrame(updateCounter);
    }


    /* =============================================
       INITIALIZATION
       ============================================= */
    function initializeAnimations() {
        initializeScrollAnimations();
        initializeFaqAccordion();
        initializePricingToggle();
        initializeCounterAnimations();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeAnimations);
    } else {
        initializeAnimations();
    }

})();
