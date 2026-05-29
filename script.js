document.addEventListener('DOMContentLoaded', () => {

    // 0. TikTok, Meta and Google Analytics ViewContent Event on Page Load
    if (typeof ttq !== 'undefined') {
        ttq.track('ViewContent', {
            content_type: 'product',
            contents: [{
                content_id: 'kit-copa-completo',
                content_name: 'Kit Copa Completo',
                price: 69.90,
                quantity: 1,
                currency: 'BRL'
            }]
        });
    }
    if (typeof fbq !== 'undefined') {
        fbq('track', 'ViewContent', {
            content_type: 'product',
            contents: [{
                id: 'kit-copa-completo',
                quantity: 1
            }],
            value: 69.90,
            currency: 'BRL'
        });
    }
    if (typeof gtag !== 'undefined') {
        gtag('event', 'view_item', {
            currency: 'BRL',
            value: 69.90,
            items: [{
                item_id: 'kit-copa-completo',
                item_name: 'Kit Copa Completo',
                price: 69.90,
                quantity: 1
            }]
        });
    }

    // 1. Intersection Observer for Scroll Animations
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15 // trigger when 15% visible
    };

    const animateOnScrollObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Optional: Unobserve if you only want the animation to happen once
                // observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const animatedElements = document.querySelectorAll('.animate-on-scroll, .animate-fade-up, .animate-slide-in-right');
    animatedElements.forEach(el => animateOnScrollObserver.observe(el));

    // Force trigger hero animations immediately for better UX
    setTimeout(() => {
        const heroElements = document.querySelectorAll('.hero .animate-fade-up, .hero .animate-slide-in-right');
        heroElements.forEach(el => el.classList.add('visible'));
    }, 100);

    // 2. Interactive Size Selector Logic
    const sizeBtns = document.querySelectorAll('.size-btn');
    const checkoutBtn = document.getElementById('checkout-btn');
    const sizeHelper = document.getElementById('size-helper');
    let selectedSize = null;

    sizeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent form submission if inside a form
            
            // Remove active class from all buttons
            sizeBtns.forEach(b => b.classList.remove('active'));
            
            // Add active class to the clicked button
            btn.classList.add('active');
            selectedSize = btn.textContent;
            
            // Update UI Helper Text
            sizeHelper.innerHTML = `Tamanho selecionado: <strong style="color: #FFD700; font-size: 1rem;">${selectedSize}</strong>`;
            
            // Enable Checkout Button
            checkoutBtn.classList.remove('disabled');
            checkoutBtn.textContent = 'FINALIZAR COMPRA AGORA';
            
            // Add click event to checkout that directs to the local checkout page with tracking
            checkoutBtn.onclick = (event) => {
                event.preventDefault();
                
                const nameValue = nameInput ? nameInput.value : '';
                
                // Trigger TikTok AddToCart event (Landing Page conversion event)
                if (typeof ttq !== 'undefined') {
                    ttq.track('AddToCart', {
                        content_type: 'product',
                        contents: [{
                            content_id: 'kit-copa-completo',
                            content_name: 'Kit Copa Completo',
                            price: 69.90,
                            quantity: 1,
                            currency: 'BRL',
                            size: selectedSize,
                            name_customization: nameValue
                        }],
                        value: 69.90,
                        currency: 'BRL'
                    });
                }
                
                // Trigger Meta AddToCart event
                if (typeof fbq !== 'undefined') {
                    fbq('track', 'AddToCart', {
                        content_type: 'product',
                        contents: [{
                            id: 'kit-copa-completo',
                            quantity: 1
                        }],
                        value: 69.90,
                        currency: 'BRL'
                    });
                }
                
                // Trigger Google Analytics AddToCart event
                if (typeof gtag !== 'undefined') {
                    gtag('event', 'add_to_cart', {
                        currency: 'BRL',
                        value: 69.90,
                        items: [{
                            item_id: 'kit-copa-completo',
                            item_name: 'Kit Copa Completo',
                            price: 69.90,
                            quantity: 1,
                            item_size: selectedSize,
                            item_customization: nameValue
                        }]
                    });
                }
                
                // Build checkout URL pointing to our own local checkout subdirectory route, preserving UTMs
                const urlParams = new URLSearchParams(window.location.search);
                const checkoutUrlParams = new URLSearchParams({
                    tamanho: selectedSize,
                    nome: nameValue
                });
                const utmParamsList = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'src'];
                utmParamsList.forEach(param => {
                    if (urlParams.has(param)) {
                        checkoutUrlParams.set(param, urlParams.get(param));
                    }
                });
                const checkoutUrl = `./checkout/index.html?${checkoutUrlParams.toString()}`;
                
                // Redirect after brief delay to let pixel fire successfully
                setTimeout(() => {
                    window.location.href = checkoutUrl;
                }, 400);
            };
        });
    });

    // 3. Name Input Character Logic
    const nameInput = document.getElementById('name-input');
    const nameCounter = document.getElementById('name-counter');
    
    if(nameInput) {
        nameInput.addEventListener('input', (e) => {
            const length = e.target.value.length;
            nameCounter.textContent = `${length}/20`;
            
            // Change color if approaching max limit
            if (length > 17) {
                nameCounter.style.color = '#ef4444'; // Red
            } else {
                nameCounter.style.color = 'rgba(255, 255, 255, 0.6)';
            }
        });
    }

    // 4. FAQ Accordion Logic
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    
    accordionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const content = header.nextElementSibling;
            const isActive = header.classList.contains('active');
            
            // Close all open accordions first
            document.querySelectorAll('.accordion-header').forEach(h => h.classList.remove('active'));
            document.querySelectorAll('.accordion-content').forEach(c => c.classList.remove('active'));
            
            // If the clicked one wasn't active, open it
            if (!isActive) {
                header.classList.add('active');
                content.classList.add('active');
            }
        });
    });

    // 5. Hero Confetti Effect
    const particlesContainer = document.getElementById('particles-container');
    const colors = ['#FFD700', '#004B23', '#007236', '#FFFFFF']; // Yellow, Dark Green, Brazil Green, White
    const particleCount = window.innerWidth < 768 ? 40 : 80; 
    
    if(particlesContainer) {
        for (let i = 0; i < particleCount; i++) {
            createConfetti(particlesContainer, colors);
        }
    }

    function createConfetti(container, colors) {
        const confetti = document.createElement('div');
        confetti.classList.add('particle');
        
        // Confetti shape (rectangular)
        const width = Math.random() * 8 + 6;
        const height = Math.random() * 5 + 10;
        confetti.style.width = `${width}px`;
        confetti.style.height = `${height}px`;
        
        // Random color from the brand palette
        const color = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.backgroundColor = color;
        
        // Random positioning starting from top
        confetti.style.left = `${Math.random() * 100}%`;
        confetti.style.top = `-20px`;
        
        // Brilliance (shadow)
        confetti.style.boxShadow = `0 0 10px ${color}`;
        
        // Random animation duration and delay
        confetti.style.animationName = 'floatParticle';
        confetti.style.animationDuration = `${Math.random() * 5 + 4}s`; // Faster fall
        confetti.style.animationDelay = `${Math.random() * 10}s`;
        confetti.style.animationIterationCount = 'infinite';
        confetti.style.animationTimingFunction = 'linear';
        
        container.appendChild(confetti);
    }

    // 6. Social Proof Swiper Initialization
    if (typeof Swiper !== 'undefined') {
        const socialSwiperElement = document.querySelector('.social-swiper');
        if (socialSwiperElement) {
            new Swiper('.social-swiper', {
                slidesPerView: 'auto',
                centeredSlides: true,
                spaceBetween: 20,
                loop: true,
                speed: 4000, // Duration of the slide transition
                autoplay: {
                    delay: 0, // No delay between transitions
                    disableOnInteraction: false,
                    pauseOnMouseEnter: true,
                },
                grabCursor: true,
                breakpoints: {
                    768: {
                        spaceBetween: 40,
                    }
                }
            });
        }
    }
});
