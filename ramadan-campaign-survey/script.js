// ========================================
// 🎮 WORKSHOP PRESENTATION SCRIPT
// صناع الحياة - ورشة قادة الحملة
// ========================================

(function() {
    'use strict';

    // ===== GLOBAL VARIABLES =====
    let currentSlide = 1;
    let totalSlides = 0;
    let slides = [];
    let isAnimating = false;

    // ===== DOM ELEMENTS =====
    const presentationContainer = document.getElementById('presentationContainer');
    const progressFill = document.getElementById('progressFill');
    const currentSlideSpan = document.getElementById('currentSlide');
    const totalSlidesSpan = document.getElementById('totalSlides');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    // ===== INITIALIZATION =====
    function init() {
        // Get all slides
        slides = Array.from(document.querySelectorAll('.slide'));
        totalSlides = slides.length;

        // Update total slides counter
        if (totalSlidesSpan) {
            totalSlidesSpan.textContent = totalSlides;
        }

        // Show first slide
        showSlide(1);

        // Add event listeners
        addEventListeners();

        // Log initialization
        console.log(`✅ Presentation initialized: ${totalSlides} slides`);
    }

    // ===== EVENT LISTENERS =====
    function addEventListeners() {
        // Navigation buttons
        if (prevBtn) {
            prevBtn.addEventListener('click', previousSlide);
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', nextSlide);
        }

        // Keyboard navigation
        document.addEventListener('keydown', handleKeyPress);

        // Prevent accidental page reload
        window.addEventListener('beforeunload', function(e) {
            if (currentSlide > 1) {
                e.preventDefault();
                e.returnValue = '';
            }
        });

        // Handle window resize
        window.addEventListener('resize', debounce(handleResize, 250));
    }

    // ===== KEYBOARD CONTROLS =====
    function handleKeyPress(e) {
    if (isAnimating) return;

    // Get current slide element
    const currentSlideElement = slides[currentSlide - 1];
    const isAtTop = currentSlideElement.scrollTop === 0;
    const isAtBottom = currentSlideElement.scrollHeight - currentSlideElement.scrollTop === currentSlideElement.clientHeight;

    switch(e.key) {
        case 'ArrowRight':
        case 'PageDown':
            e.preventDefault();
            nextSlide();
            break;

        case 'ArrowDown':
            // Only navigate if at bottom of scroll
            if (isAtBottom) {
                e.preventDefault();
                nextSlide();
            }
            break;

        case ' ': // Space
            // Only navigate if at bottom of scroll
            if (isAtBottom) {
                e.preventDefault();
                nextSlide();
            } else {
                // Scroll down
                e.preventDefault();
                currentSlideElement.scrollBy({
                    top: currentSlideElement.clientHeight * 0.8,
                    behavior: 'smooth'
                });
            }
            break;

        case 'ArrowLeft':
        case 'PageUp':
            e.preventDefault();
            previousSlide();
            break;

        case 'ArrowUp':
            // Only navigate if at top of scroll
            if (isAtTop) {
                e.preventDefault();
                previousSlide();
            }
            break;
        }
    }

    // ===== NAVIGATION FUNCTIONS =====
    function nextSlide() {
        if (currentSlide < totalSlides) {
            goToSlide(currentSlide + 1);
        }
    }

    function previousSlide() {
        if (currentSlide > 1) {
            goToSlide(currentSlide - 1);
        }
    }

    function goToSlide(slideNumber) {
        if (isAnimating || slideNumber < 1 || slideNumber > totalSlides) {
            return;
        }

        isAnimating = true;

        // Hide current slide
        slides[currentSlide - 1].classList.remove('active');

        // Update current slide number
        currentSlide = slideNumber;

        // Show new slide
        slides[currentSlide - 1].classList.add('active');
        // Reset scroll position to top
        slides[currentSlide - 1].scrollTop = 0;

        // Update UI
        updateUI();

        // Reset animation lock after transition
        setTimeout(() => {
            isAnimating = false;
        }, 600);
    }

    function showSlide(slideNumber) {
        if (slideNumber < 1 || slideNumber > totalSlides) {
            return;
        }

        // Hide all slides
        slides.forEach(slide => {
            slide.classList.remove('active');
        });

        // Show target slide
        slides[slideNumber - 1].classList.add('active');

        // Update current slide
        currentSlide = slideNumber;

        // Update UI
        updateUI();
    }

    // ===== UI UPDATES =====
    function updateUI() {
        // Update slide counter
        if (currentSlideSpan) {
            currentSlideSpan.textContent = currentSlide;
        }

        // Update progress bar
        if (progressFill) {
            const progress = ((currentSlide - 1) / (totalSlides - 1)) * 100;
            progressFill.style.width = `${progress}%`;
        }

        // Update button states
        updateButtonStates();

        // Log current slide
        console.log(`📍 Current slide: ${currentSlide}/${totalSlides}`);
    }

    function updateButtonStates() {
        if (prevBtn) {
            prevBtn.disabled = currentSlide === 1;
            prevBtn.style.opacity = currentSlide === 1 ? '0.3' : '1';
        }

        if (nextBtn) {
            nextBtn.disabled = currentSlide === totalSlides;
            nextBtn.style.opacity = currentSlide === totalSlides ? '0.3' : '1';
        }
    }

    // ===== FULLSCREEN FUNCTIONALITY =====
    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            enterFullscreen();
        } else {
            exitFullscreen();
        }
    }

    function enterFullscreen() {
        const element = document.documentElement;

        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.webkitRequestFullscreen) { // Safari
            element.webkitRequestFullscreen();
        } else if (element.msRequestFullscreen) { // IE11
            element.msRequestFullscreen();
        }

        console.log('🖥️ Entered fullscreen mode');
    }

    function exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) { // Safari
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { // IE11
            document.msExitFullscreen();
        }

        console.log('🖥️ Exited fullscreen mode');
    }

    // ===== UTILITY FUNCTIONS =====
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    function handleResize() {
        // Re-calculate any dynamic elements if needed
        console.log('🔄 Window resized');
    }

    // ===== TOUCH/SWIPE SUPPORT =====
    let touchStartX = 0;
    let touchEndX = 0;

    function handleTouchStart(e) {
        touchStartX = e.changedTouches[0].screenX;
    }

    function handleTouchEnd(e) {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }

    function handleSwipe() {
        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;

        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                // Swiped left (next slide)
                nextSlide();
            } else {
                // Swiped right (previous slide)
                previousSlide();
            }
        }
    }

    // Add touch listeners
    if (presentationContainer) {
        presentationContainer.addEventListener('touchstart', handleTouchStart, false);
        presentationContainer.addEventListener('touchend', handleTouchEnd, false);
    }

    // ===== URL HASH NAVIGATION =====
    function updateURL() {
        if (history.pushState) {
            history.pushState(null, null, `#slide-${currentSlide}`);
        } else {
            window.location.hash = `slide-${currentSlide}`;
        }
    }

    function checkURLHash() {
        const hash = window.location.hash;
        if (hash) {
            const match = hash.match(/slide-(\d+)/);
            if (match) {
                const slideNum = parseInt(match[1], 10);
                if (slideNum >= 1 && slideNum <= totalSlides) {
                    goToSlide(slideNum);
                    return;
                }
            }
        }
        // Default to slide 1
        goToSlide(1);
    }

    // Listen for hash changes
    window.addEventListener('hashchange', function() {
        const hash = window.location.hash;
        if (hash) {
            const match = hash.match(/slide-(\d+)/);
            if (match) {
                const slideNum = parseInt(match[1], 10);
                if (slideNum >= 1 && slideNum <= totalSlides && slideNum !== currentSlide) {
                    goToSlide(slideNum);
                }
            }
        }
    });

    // Update URL when slide changes
    const originalGoToSlide = goToSlide;
    goToSlide = function(slideNumber) {
        originalGoToSlide(slideNumber);
        updateURL();
    };

    // ===== PRESENTATION TIMER =====
    let presentationStartTime = null;
    let timerInterval = null;

    function startTimer() {
        if (!presentationStartTime) {
            presentationStartTime = Date.now();
            console.log('⏱️ Presentation timer started');
        }
    }

    function getElapsedTime() {
        if (!presentationStartTime) return 0;
        return Math.floor((Date.now() - presentationStartTime) / 1000);
    }

    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // Start timer on first slide advance
    const originalNextSlide = nextSlide;
    nextSlide = function() {
        startTimer();
        originalNextSlide();
    };

    // ===== SLIDE NOTES (for presenter view - future enhancement) =====
    const slideNotes = {};

    function addSlideNote(slideNumber, note) {
        slideNotes[slideNumber] = note;
    }

    function getSlideNote(slideNumber) {
        return slideNotes[slideNumber] || '';
    }

    // ===== EXPORT FUNCTIONS TO WINDOW (for debugging) =====
    window.presentationControls = {
        next: nextSlide,
        previous: previousSlide,
        goTo: goToSlide,
        getCurrentSlide: () => currentSlide,
        getTotalSlides: () => totalSlides,
        toggleFullscreen: toggleFullscreen,
        getElapsedTime: getElapsedTime,
        formatTime: formatTime
    };

    // ===== PRELOAD IMAGES (if any) =====
    function preloadImages() {
        const images = document.querySelectorAll('img');
        let loadedImages = 0;
        const totalImages = images.length;

        if (totalImages === 0) {
            console.log('📷 No images to preload');
            return;
        }

        images.forEach(img => {
            if (img.complete) {
                loadedImages++;
            } else {
                img.addEventListener('load', () => {
                    loadedImages++;
                    if (loadedImages === totalImages) {
                        console.log(`📷 All ${totalImages} images preloaded`);
                    }
                });
                img.addEventListener('error', () => {
                    console.warn(`⚠️ Failed to load image: ${img.src}`);
                    loadedImages++;
                });
            }
        });
    }

    // ===== ACCESSIBILITY ENHANCEMENTS =====
    function setupAccessibility() {
        // Add ARIA labels to navigation buttons
        if (prevBtn) {
            prevBtn.setAttribute('aria-label', 'Previous slide');
        }
        if (nextBtn) {
            nextBtn.setAttribute('aria-label', 'Next slide');
        }

        // Add role to presentation container
        if (presentationContainer) {
            presentationContainer.setAttribute('role', 'region');
            presentationContainer.setAttribute('aria-label', 'Presentation slides');
        }

        // Add aria-current to active slide
        slides.forEach((slide, index) => {
            slide.setAttribute('role', 'article');
            slide.setAttribute('aria-label', `Slide ${index + 1} of ${totalSlides}`);
        });
    }

    // ===== PERFORMANCE MONITORING =====
    function logPerformance() {
        if (window.performance && window.performance.timing) {
            const perfData = window.performance.timing;
            const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
            console.log(`⚡ Page load time: ${pageLoadTime}ms`);
        }
    }

    // ===== PRINT SUPPORT =====
    function setupPrintStyles() {
        const mediaQuery = window.matchMedia('print');
        
        function handlePrint(mq) {
            if (mq.matches) {
                // Show all slides for printing
                slides.forEach(slide => {
                    slide.style.display = 'block';
                    slide.style.pageBreakAfter = 'always';
                });
            }
        }

        mediaQuery.addListener(handlePrint);
    }

    // ===== AUTO-SAVE PROGRESS =====
    function saveProgress() {
        try {
            localStorage.setItem('workshop_current_slide', currentSlide);
            console.log(`💾 Progress saved: Slide ${currentSlide}`);
        } catch (e) {
            console.warn('⚠️ Unable to save progress:', e);
        }
    }

    function loadProgress() {
        try {
            const savedSlide = localStorage.getItem('workshop_current_slide');
            if (savedSlide) {
                const slideNum = parseInt(savedSlide, 10);
                if (slideNum >= 1 && slideNum <= totalSlides) {
                    console.log(`📂 Loaded progress: Slide ${slideNum}`);
                    return slideNum;
                }
            }
        } catch (e) {
            console.warn('⚠️ Unable to load progress:', e);
        }
        return 1;
    }

    // Auto-save on slide change
    const originalGoToSlideWithSave = goToSlide;
    goToSlide = function(slideNumber) {
        originalGoToSlideWithSave(slideNumber);
        saveProgress();
    };

    // ===== EASTER EGG: KONAMI CODE =====
    let konamiCode = [];
    const konamiSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

    document.addEventListener('keydown', function(e) {
        konamiCode.push(e.key);
        konamiCode = konamiCode.slice(-10);

        if (konamiCode.join(',') === konamiSequence.join(',')) {
            activateEasterEgg();
        }
    });

    function activateEasterEgg() {
        console.log('🎉 KONAMI CODE ACTIVATED! 🎉');
        document.body.style.animation = 'rainbow 2s linear infinite';
        
        setTimeout(() => {
            document.body.style.animation = '';
        }, 5000);
    }

    // Add rainbow animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes rainbow {
            0% { filter: hue-rotate(0deg); }
            100% { filter: hue-rotate(360deg); }
        }
    `;
    document.head.appendChild(style);

    // ===== START PRESENTATION =====
    function startPresentation() {
        console.log('🎬 Starting presentation...');
        
        // Initialize
        init();
        
        // Setup accessibility
        setupAccessibility();
        
        // Setup print styles
        setupPrintStyles();
        
        // Preload images
        preloadImages();
        
        // Log performance
        logPerformance();
        
        // Check if there's saved progress
        const savedSlide = loadProgress();
        
        // Check URL hash or load saved progress
        if (window.location.hash) {
            checkURLHash();
        } else if (savedSlide > 1) {
            // Ask user if they want to resume
            const resume = confirm(`هل تريد المتابعة من الشريحة ${savedSlide}؟`);
            if (resume) {
                goToSlide(savedSlide);
            }
        }
        
        console.log('✅ Presentation ready!');
        console.log('💡 Use arrow keys, space, or navigation buttons to navigate');
        console.log('💡 Press "F" for fullscreen mode');
        console.log('💡 Access controls via: window.presentationControls');
    }

    // ===== WAIT FOR DOM TO LOAD =====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startPresentation);
    } else {
        startPresentation();
    }

})();

// ========================================
// 🎯 END OF SCRIPT
// ========================================
