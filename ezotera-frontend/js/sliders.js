/* ============================================
   SLIDERS JAVASCRIPT — Ezotera Frontend
   Testimonial carousel with touch support,
   auto-play, dot navigation
   ============================================ */

(function () {
    'use strict';

    /* =============================================
       TESTIMONIAL SLIDER
       ============================================= */
    function initializeTestimonialSlider() {
        var sliderContainer = document.getElementById('testimonialSlider');

        if (!sliderContainer) {
            return;
        }

        var track = sliderContainer.querySelector('.testimonials__track');
        var prevButton = sliderContainer.querySelector('.testimonials__arrow--prev');
        var nextButton = sliderContainer.querySelector('.testimonials__arrow--next');
        var dotsContainer = document.getElementById('testimonialDots');
        var cards = sliderContainer.querySelectorAll('.testimonial-card');

        if (!track || cards.length === 0) {
            return;
        }

        /* ----- Slider State ----- */
        var currentSlideIndex = 0;
        var cardsPerView = calculateCardsPerView();
        var totalSlides = Math.ceil(cards.length / cardsPerView);
        var autoPlayInterval = null;
        var autoPlayDelay = 5000;
        var touchStartX = 0;
        var touchDeltaX = 0;
        var isDragging = false;

        /* ----- Calculate cards visible per view ----- */
        function calculateCardsPerView() {
            var viewportWidth = window.innerWidth;
            if (viewportWidth <= 480) {
                return 1;
            }
            if (viewportWidth <= 768) {
                return 2;
            }
            return 3;
        }

        /* ----- Create dot indicators ----- */
        function createDotIndicators() {
            if (!dotsContainer) {
                return;
            }

            dotsContainer.innerHTML = '';
            for (var dotIndex = 0; dotIndex < totalSlides; dotIndex++) {
                var dotElement = document.createElement('button');
                dotElement.className = 'testimonials__dot';
                dotElement.setAttribute('aria-label', 'Перейти к слайду ' + (dotIndex + 1));
                dotElement.setAttribute('data-slide-index', dotIndex);

                if (dotIndex === 0) {
                    dotElement.classList.add('testimonials__dot--active');
                }

                dotElement.addEventListener('click', function () {
                    var targetIndex = parseInt(this.getAttribute('data-slide-index'), 10);
                    goToSlide(targetIndex);
                    resetAutoPlay();
                });

                dotsContainer.appendChild(dotElement);
            }
        }

        /* ----- Update active dot ----- */
        function updateActiveDot() {
            if (!dotsContainer) {
                return;
            }

            var allDots = dotsContainer.querySelectorAll('.testimonials__dot');
            allDots.forEach(function (dot, index) {
                if (index === currentSlideIndex) {
                    dot.classList.add('testimonials__dot--active');
                } else {
                    dot.classList.remove('testimonials__dot--active');
                }
            });
        }

        /* ----- Go to specific slide ----- */
        function goToSlide(slideIndex) {
            if (slideIndex < 0) {
                currentSlideIndex = totalSlides - 1;
            } else if (slideIndex >= totalSlides) {
                currentSlideIndex = 0;
            } else {
                currentSlideIndex = slideIndex;
            }

            var cardWidth = cards[0].offsetWidth;
            var gapValue = parseInt(getComputedStyle(track).gap, 10) || 24;
            var translateValue = currentSlideIndex * (cardWidth + gapValue) * cardsPerView;

            /* Prevent over-scrolling */
            var maxTranslate = track.scrollWidth - sliderContainer.offsetWidth;
            translateValue = Math.min(translateValue, maxTranslate);

            track.style.transform = 'translateX(-' + translateValue + 'px)';
            updateActiveDot();
        }

        /* ----- Next and Previous ----- */
        function goToNextSlide() {
            goToSlide(currentSlideIndex + 1);
        }

        function goToPreviousSlide() {
            goToSlide(currentSlideIndex - 1);
        }

        /* ----- Auto Play ----- */
        function startAutoPlay() {
            autoPlayInterval = setInterval(goToNextSlide, autoPlayDelay);
        }

        function stopAutoPlay() {
            if (autoPlayInterval) {
                clearInterval(autoPlayInterval);
                autoPlayInterval = null;
            }
        }

        function resetAutoPlay() {
            stopAutoPlay();
            startAutoPlay();
        }

        /* ----- Touch / Drag Support ----- */
        function handleTouchStart(event) {
            touchStartX = event.touches ? event.touches[0].clientX : event.clientX;
            isDragging = true;
            stopAutoPlay();
        }

        function handleTouchMove(event) {
            if (!isDragging) {
                return;
            }
            var currentX = event.touches ? event.touches[0].clientX : event.clientX;
            touchDeltaX = currentX - touchStartX;
        }

        function handleTouchEnd() {
            if (!isDragging) {
                return;
            }
            isDragging = false;

            var swipeThreshold = 50;

            if (touchDeltaX > swipeThreshold) {
                goToPreviousSlide();
            } else if (touchDeltaX < -swipeThreshold) {
                goToNextSlide();
            }

            touchDeltaX = 0;
            startAutoPlay();
        }

        /* ----- Event Listeners ----- */
        if (prevButton) {
            prevButton.addEventListener('click', function () {
                goToPreviousSlide();
                resetAutoPlay();
            });
        }

        if (nextButton) {
            nextButton.addEventListener('click', function () {
                goToNextSlide();
                resetAutoPlay();
            });
        }

        /* Touch events */
        track.addEventListener('touchstart', handleTouchStart, { passive: true });
        track.addEventListener('touchmove', handleTouchMove, { passive: true });
        track.addEventListener('touchend', handleTouchEnd);

        /* Mouse drag events */
        track.addEventListener('mousedown', handleTouchStart);
        track.addEventListener('mousemove', handleTouchMove);
        track.addEventListener('mouseup', handleTouchEnd);
        track.addEventListener('mouseleave', function () {
            if (isDragging) {
                handleTouchEnd();
            }
        });

        /* Pause on hover */
        sliderContainer.addEventListener('mouseenter', stopAutoPlay);
        sliderContainer.addEventListener('mouseleave', startAutoPlay);

        /* Handle window resize */
        var resizeTimeout = null;
        window.addEventListener('resize', function () {
            if (resizeTimeout) {
                clearTimeout(resizeTimeout);
            }
            resizeTimeout = setTimeout(function () {
                var newCardsPerView = calculateCardsPerView();
                if (newCardsPerView !== cardsPerView) {
                    cardsPerView = newCardsPerView;
                    totalSlides = Math.ceil(cards.length / cardsPerView);
                    currentSlideIndex = 0;
                    createDotIndicators();
                    goToSlide(0);
                }
            }, 200);
        });

        /* ----- Initialize ----- */
        createDotIndicators();
        goToSlide(0);
        startAutoPlay();
    }


    /* =============================================
       INITIALIZATION
       ============================================= */
    function initializeSliders() {
        initializeTestimonialSlider();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeSliders);
    } else {
        initializeSliders();
    }

})();
