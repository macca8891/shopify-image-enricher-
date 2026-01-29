// Mobile Navigation Toggle
document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function() {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });

        // Close menu when clicking on nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', function() {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Navbar scroll effect
    const navbar = document.querySelector('.navbar');
    let lastScrollY = window.scrollY;

    window.addEventListener('scroll', function() {
        if (window.scrollY > 100) {
            navbar.style.background = 'rgba(255, 255, 255, 0.98)';
            navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
        } else {
            navbar.style.background = 'rgba(255, 255, 255, 0.95)';
            navbar.style.boxShadow = 'none';
        }
        lastScrollY = window.scrollY;
    });

    // Demo functionality
    const demoBtn = document.querySelector('.demo-btn');
    const demoImage = document.getElementById('demoImage');
    const processingOverlay = document.getElementById('processingOverlay');
    const bgColorInput = document.getElementById('bgColor');
    const removeBgInput = document.getElementById('removeBg');
    const watermarkSelect = document.getElementById('watermark');

    if (demoBtn && demoImage && processingOverlay) {
        demoBtn.addEventListener('click', function() {
            // Show processing overlay
            processingOverlay.style.display = 'flex';
            
            // Simulate processing time
            setTimeout(() => {
                // Apply demo changes
                const bgColor = bgColorInput.value;
                const removeBg = removeBgInput.checked;
                const watermark = watermarkSelect.value;
                
                // Create a canvas to simulate image processing
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const img = new Image();
                
                img.onload = function() {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    
                    // Apply background color if not removing background
                    if (!removeBg) {
                        ctx.fillStyle = bgColor;
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                    }
                    
                    // Draw the image
                    ctx.drawImage(img, 0, 0);
                    
                    // Add watermark simulation
                    if (watermark !== 'none') {
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                        ctx.font = '24px Inter';
                        ctx.textAlign = 'right';
                        ctx.fillText(watermark === 'logo' ? '© BRAND' : 'ENRICHLY', canvas.width - 20, canvas.height - 20);
                    }
                    
                    // Update the demo image
                    demoImage.src = canvas.toDataURL();
                    
                    // Hide processing overlay
                    processingOverlay.style.display = 'none';
                };
                
                img.src = demoImage.src;
            }, 2000);
        });
    }

    // Contact form handling
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(contactForm);
            const data = {
                name: formData.get('name'),
                email: formData.get('email'),
                store: formData.get('store'),
                message: formData.get('message')
            };
            
            // Simulate form submission
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Sending...';
            submitBtn.disabled = true;
            
            setTimeout(() => {
                alert('Thank you for your interest! We\'ll be in touch soon.');
                contactForm.reset();
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }, 1500);
        });
    }

    // Intersection Observer for animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fade-in-up');
            }
        });
    }, observerOptions);

    // Observe elements for animation
    document.querySelectorAll('.feature-card, .pricing-card, .section-header').forEach(el => {
        observer.observe(el);
    });

    // Stats counter animation
    const statsSection = document.querySelector('.hero-stats');
    if (statsSection) {
        const statsObserver = new IntersectionObserver(function(entries) {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateCounters();
                    statsObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });
        
        statsObserver.observe(statsSection);
    }

    function animateCounters() {
        const counters = document.querySelectorAll('.stat-number');
        counters.forEach(counter => {
            const target = counter.textContent.replace(/[^\d]/g, '');
            const increment = target / 100;
            let current = 0;
            
            const timer = setInterval(() => {
                current += increment;
                if (current >= target) {
                    counter.textContent = counter.textContent.replace(/[\d,]+/, target.toLocaleString());
                    clearInterval(timer);
                } else {
                    counter.textContent = counter.textContent.replace(/[\d,]+/, Math.floor(current).toLocaleString());
                }
            }, 20);
        });
    }

    // Pricing card hover effects
    document.querySelectorAll('.pricing-card').forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            if (!this.classList.contains('featured')) {
                this.style.transform = 'translateY(0) scale(1)';
            } else {
                this.style.transform = 'translateY(0) scale(1.05)';
            }
        });
    });

    // Feature card interactive effects
    document.querySelectorAll('.feature-card').forEach(card => {
        const icon = card.querySelector('.feature-icon');
        
        card.addEventListener('mouseenter', function() {
            if (icon) {
                icon.style.transform = 'scale(1.1) rotate(5deg)';
            }
        });
        
        card.addEventListener('mouseleave', function() {
            if (icon) {
                icon.style.transform = 'scale(1) rotate(0deg)';
            }
        });
    });

    // Parallax effect for hero section
    const hero = document.querySelector('.hero');
    if (hero) {
        window.addEventListener('scroll', function() {
            const scrolled = window.pageYOffset;
            const parallaxSpeed = 0.5;
            hero.style.transform = `translateY(${scrolled * parallaxSpeed}px)`;
        });
    }

    // Dynamic background color preview
    if (bgColorInput) {
        bgColorInput.addEventListener('input', function() {
            const previewContainer = document.querySelector('.preview-container');
            if (previewContainer && !removeBgInput.checked) {
                previewContainer.style.backgroundColor = this.value;
            }
        });
    }

    if (removeBgInput) {
        removeBgInput.addEventListener('change', function() {
            const previewContainer = document.querySelector('.preview-container');
            if (previewContainer) {
                if (this.checked) {
                    previewContainer.style.backgroundColor = 'transparent';
                } else {
                    previewContainer.style.backgroundColor = bgColorInput.value;
                }
            }
        });
    }

    // Loading states for buttons
    document.querySelectorAll('.btn-primary').forEach(btn => {
        btn.addEventListener('click', function(e) {
            if (this.classList.contains('demo-btn') || this.type === 'submit') return;
            
            e.preventDefault();
            const originalText = this.innerHTML;
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
            this.disabled = true;
            
            setTimeout(() => {
                this.innerHTML = originalText;
                this.disabled = false;
                // Simulate redirect or action
                alert('Feature coming soon! Join our early access list.');
            }, 1500);
        });
    });

    // Enhanced demo image interaction
    if (demoImage) {
        let originalSrc = demoImage.src;
        
        // Reset demo
        const resetDemo = () => {
            demoImage.src = originalSrc;
            bgColorInput.value = '#ffffff';
            removeBgInput.checked = true;
            watermarkSelect.value = 'none';
            const previewContainer = document.querySelector('.preview-container');
            if (previewContainer) {
                previewContainer.style.backgroundColor = 'transparent';
            }
        };

        // Add reset button
        const demoControls = document.querySelector('.demo-controls');
        if (demoControls) {
            const resetBtn = document.createElement('button');
            resetBtn.textContent = 'Reset Demo';
            resetBtn.className = 'btn btn-secondary';
            resetBtn.style.marginTop = '1rem';
            resetBtn.addEventListener('click', resetDemo);
            demoControls.appendChild(resetBtn);
        }
    }

    // Testimonials rotation (if implemented)
    const testimonials = document.querySelectorAll('.testimonial');
    if (testimonials.length > 0) {
        let currentTestimonial = 0;
        
        setInterval(() => {
            testimonials[currentTestimonial].style.opacity = '0';
            currentTestimonial = (currentTestimonial + 1) % testimonials.length;
            testimonials[currentTestimonial].style.opacity = '1';
        }, 5000);
    }

    // Add visual feedback for form validation
    document.querySelectorAll('input[required], textarea[required]').forEach(field => {
        field.addEventListener('blur', function() {
            if (this.value.trim() === '') {
                this.style.borderColor = '#ef4444';
            } else {
                this.style.borderColor = '#10b981';
            }
        });
        
        field.addEventListener('focus', function() {
            this.style.borderColor = '#6366f1';
        });
    });

    // Email validation
    document.querySelectorAll('input[type="email"]').forEach(emailField => {
        emailField.addEventListener('blur', function() {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (this.value && !emailRegex.test(this.value)) {
                this.style.borderColor = '#ef4444';
                this.setCustomValidity('Please enter a valid email address');
            } else {
                this.style.borderColor = this.value ? '#10b981' : '#e5e7eb';
                this.setCustomValidity('');
            }
        });
    });

    // Progressive image loading
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                imageObserver.unobserve(img);
            }
        });
    });

    images.forEach(img => imageObserver.observe(img));
});

// Utility functions
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

const throttle = (func, limit) => {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};

// Performance optimized scroll listener
const optimizedScroll = throttle((e) => {
    // Handle scroll events here if needed
}, 16); // ~60fps

window.addEventListener('scroll', optimizedScroll);

// Error handling for missing elements
const safeQuerySelector = (selector) => {
    try {
        return document.querySelector(selector);
    } catch (error) {
        console.warn(`Element not found: ${selector}`);
        return null;
    }
};

// Analytics tracking (placeholder)
const trackEvent = (eventName, properties = {}) => {
    // Implement analytics tracking here
    console.log('Event tracked:', eventName, properties);
};

// Export functions for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        debounce,
        throttle,
        safeQuerySelector,
        trackEvent
    };
}



