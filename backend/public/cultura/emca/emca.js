document.addEventListener('DOMContentLoaded', () => {
    
    // --- Mobile Menu Toggle ---
    const mobileBtn = document.querySelector('.mobile-menu-btn');
    const navList = document.querySelector('.nav-list');
    
    if(mobileBtn && navList) {
        mobileBtn.addEventListener('click', () => {
            navList.classList.toggle('active');
            const icon = mobileBtn.querySelector('i');
            if(navList.classList.contains('active')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-xmark');
            } else {
                icon.classList.remove('fa-xmark');
                icon.classList.add('fa-bars');
            }
        });
    }

    // --- Mobile Dropdown Toggle ---
    const dropdownToggle = document.querySelector('.dropdown-toggle');
    if(dropdownToggle && window.innerWidth <= 768) {
        dropdownToggle.addEventListener('click', (e) => {
            e.preventDefault();
            dropdownToggle.parentElement.classList.toggle('active');
        });
    }

    // --- Smooth Scrolling for anchor links ---
    document.querySelectorAll('a.nav-link[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if(targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if(targetElement) {
                e.preventDefault();
                // Close mobile menu if open
                if(navList.classList.contains('active')) {
                    navList.classList.remove('active');
                    mobileBtn.querySelector('i').classList.replace('fa-xmark', 'fa-bars');
                }
                
                window.scrollTo({
                    top: targetElement.offsetTop - 70, // offset for sticky header
                    behavior: 'smooth'
                });
            }
        });
    });



    // --- Generic Carousel Function ---
    const initCarousel = (trackId, prevBtnClass, nextBtnClass, itemsPerViewDesktop = 3, autoSlide = false) => {
        const track = document.getElementById(trackId);
        if (!track) return;

        const slides = Array.from(track.children);
        const nextButton = document.querySelector(nextBtnClass);
        const prevButton = document.querySelector(prevBtnClass);
        
        let currentIndex = 0;
        const calculateItemsPerView = () => {
            if (itemsPerViewDesktop === 1) return 1;
            if (window.innerWidth >= 1200) return itemsPerViewDesktop; // 3 items
            if (window.innerWidth >= 768) return 2; // Tablet: 2 items
            return 1; // Mobile: 1 item
        };
        let itemsPerView = calculateItemsPerView();

        const updateCarousel = () => {
            if (slides.length === 0) return;
            const slideWidth = slides[0].getBoundingClientRect().width;
            track.style.transform = `translateX(-${currentIndex * slideWidth}px)`;
        };

        const moveToNext = () => {
            if (currentIndex >= slides.length - itemsPerView) {
                currentIndex = 0;
            } else {
                currentIndex++;
            }
            updateCarousel();
        };

        const moveToPrev = () => {
            if (currentIndex <= 0) {
                currentIndex = slides.length - itemsPerView;
            } else {
                currentIndex--;
            }
            updateCarousel();
        };

        let slideInterval;
        const resetTimer = () => {
            if (!autoSlide) return;
            clearInterval(slideInterval);
            slideInterval = setInterval(moveToNext, 5000); // Elegant 5-second interval
        };

        if (nextButton) {
            nextButton.addEventListener('click', () => {
                moveToNext();
                resetTimer();
            });
        }
        if (prevButton) {
            prevButton.addEventListener('click', () => {
                moveToPrev();
                resetTimer();
            });
        }

        window.addEventListener('resize', () => {
            itemsPerView = calculateItemsPerView();
            updateCarousel();
        });

        if (autoSlide) {
            resetTimer();
            track.addEventListener('mouseenter', () => clearInterval(slideInterval));
            track.addEventListener('mouseleave', () => resetTimer());
        }

        updateCarousel();
    };
    window.initCarousel = initCarousel;

    // --- Scroll Reveal Animation ---
    const revealElements = document.querySelectorAll('.reveal');
    const observerOptions = {
        threshold: 0.15
    };

    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    revealElements.forEach(el => revealObserver.observe(el));

    // Initialize carousels
    initCarousel('mainCarousel', '.prev-btn', '.next-btn', 1, true);
    initCarousel('cursosCarousel', '.prev-btn-cursos', '.next-btn-cursos', 3, false);
    initCarousel('galeriaCarousel', '.prev-btn-galeria', '.next-btn-galeria', 4, false);

    // --- Lightbox ---
    const lightbox     = document.getElementById('lightbox');
    const lightboxImg  = document.getElementById('lightboxImg');
    const lightboxClose= document.getElementById('lightboxClose');
    const lightboxPrev = document.getElementById('lightboxPrev');
    const lightboxNext = document.getElementById('lightboxNext');
    const lightboxCtr  = document.getElementById('lightboxCounter');

    const galleryItems = Array.from(document.querySelectorAll('.gallery-trigger[data-img]'));
    let currentLightboxIndex = 0;

    const openLightbox = (index) => {
        currentLightboxIndex = index;
        const src = galleryItems[index].dataset.img;
        lightboxImg.src = src;
        lightboxCtr.textContent = `${index + 1} / ${galleryItems.length}`;
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    const closeLightbox = () => {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
        lightboxImg.src = '';
    };

    const showNext = () => {
        currentLightboxIndex = (currentLightboxIndex + 1) % galleryItems.length;
        openLightbox(currentLightboxIndex);
    };

    const showPrev = () => {
        currentLightboxIndex = (currentLightboxIndex - 1 + galleryItems.length) % galleryItems.length;
        openLightbox(currentLightboxIndex);
    };

    galleryItems.forEach((item, index) => {
        item.addEventListener('click', () => openLightbox(index));
    });

    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    if (lightboxNext)  lightboxNext.addEventListener('click', showNext);
    if (lightboxPrev)  lightboxPrev.addEventListener('click', showPrev);

    // Close clicking outside image
    if (lightbox) {
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) closeLightbox();
        });
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (lightbox && lightbox.classList.contains('active')) {
            if (e.key === 'Escape')      closeLightbox();
            if (e.key === 'ArrowRight')  showNext();
            if (e.key === 'ArrowLeft')   showPrev();
        }
    });

    /* =========================================
       New Gallery Lightbox Logic (For Danca Gallery)
    ========================================= */
    const dancaGalleryImages = document.querySelectorAll('.gallery-item img');
    if (dancaGalleryImages.length > 0 && !document.getElementById('gallery-lightbox')) {
        
        const closeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
        const prevIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>`;
        const nextIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>`;

        const lightboxHTML = `
            <div id="gallery-lightbox" class="lightbox-overlay">
                <div class="lightbox-content">
                    <span class="lightbox-close">${closeIcon}</span>
                    <button class="lightbox-prev">${prevIcon}</button>
                    <img id="lightbox-img" src="" alt="Gallery Image">
                    <button class="lightbox-next">${nextIcon}</button>
                    <div class="lightbox-counter"><span id="lightbox-current">1</span> / <span id="lightbox-total">${dancaGalleryImages.length}</span></div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', lightboxHTML);

        const newLightbox = document.getElementById('gallery-lightbox');
        const newLightboxImg = document.getElementById('lightbox-img');
        const newCloseBtn = document.querySelector('#gallery-lightbox .lightbox-close');
        const newPrevBtn = document.querySelector('#gallery-lightbox .lightbox-prev');
        const newNextBtn = document.querySelector('#gallery-lightbox .lightbox-next');
        const newCurrentCounter = document.getElementById('lightbox-current');
        
        let newCurrentIndex = 0;

        function openNewLightbox(index) {
            newCurrentIndex = index;
            updateNewLightboxImage();
            newLightbox.classList.add('active');
            document.body.style.overflow = 'hidden'; 
        }

        function closeNewLightbox() {
            newLightbox.classList.remove('active');
            document.body.style.overflow = '';
        }

        function updateNewLightboxImage() {
            const thumbSrc = dancaGalleryImages[newCurrentIndex].getAttribute('src');
            const highResSrc = thumbSrc.replace('/thumbnails', '');
            
            newLightboxImg.style.opacity = 0.4;
            setTimeout(() => {
                newLightboxImg.src = highResSrc;
                newLightboxImg.onload = () => { newLightboxImg.style.opacity = 1; };
            }, 100);
            
            newCurrentCounter.innerText = newCurrentIndex + 1;
        }

        function nextNewImage(e) {
            if(e) e.stopPropagation();
            newCurrentIndex = (newCurrentIndex + 1) % dancaGalleryImages.length;
            updateNewLightboxImage();
        }

        function prevNewImage(e) {
            if(e) e.stopPropagation();
            newCurrentIndex = (newCurrentIndex - 1 + dancaGalleryImages.length) % dancaGalleryImages.length;
            updateNewLightboxImage();
        }

        dancaGalleryImages.forEach((img, index) => {
            img.style.cursor = 'zoom-in';
            img.style.transition = 'transform 0.3s, box-shadow 0.3s';
            img.addEventListener('mouseenter', () => { img.style.transform = 'scale(1.02)'; img.style.boxShadow = '0 10px 25px rgba(0,0,0,0.15)'; });
            img.addEventListener('mouseleave', () => { img.style.transform = 'scale(1)'; img.style.boxShadow = 'none'; });
            img.addEventListener('click', () => openNewLightbox(index));
        });

        newCloseBtn.addEventListener('click', closeNewLightbox);
        newNextBtn.addEventListener('click', nextNewImage);
        newPrevBtn.addEventListener('click', prevNewImage);
        
        newLightbox.addEventListener('click', (e) => {
            if (e.target === newLightbox || e.target.classList.contains('lightbox-content')) {
                closeNewLightbox();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (!newLightbox.classList.contains('active')) return;
            if (e.key === 'Escape') closeNewLightbox();
            if (e.key === 'ArrowRight') nextNewImage();
            if (e.key === 'ArrowLeft') prevNewImage();
        });
    }
});

// Preloader Logic
window.addEventListener('load', () => {
    const preloader = document.getElementById('preloader');
    if (preloader) {
        setTimeout(() => {
            preloader.classList.add('hide');
        }, 800);
    }
});




    /* =========================================
       Number Counter Animation
    ========================================= */
    const counters = document.querySelectorAll('.count-up');
    const speed = 200; // The lower the slower

    const counterObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const counter = entry.target;
                const updateCount = () => {
                    const target = +counter.getAttribute('data-target');
                    const count = +counter.innerText;
                    
                    // Lower inc to slow and higher to fast
                    const inc = target / speed;

                    // Check if target is reached and increment
                    if (count < target) {
                        // Add inc to count and output in counter
                        counter.innerText = Math.ceil(count + inc);
                        // Call function every ms
                        setTimeout(updateCount, 15);
                    } else {
                        counter.innerText = target;
                    }
                };
                
                updateCount();
                observer.unobserve(counter); // Only run once
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(counter => {
        counterObserver.observe(counter);
    });
