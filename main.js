// Main JavaScript for Digital Forensics Portfolio
document.addEventListener('DOMContentLoaded', function() {
    
    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', function() {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // Typed.js for mission statement
    const typedElement = document.getElementById('typed-mission');
    if (typedElement) {
        new Typed('#typed-mission', {
            strings: [
                'Digital Evidence Analysis',
                'Criminal Investigation Support',
                'Forensic Event Reconstruction',
                'Cybercrime Documentation'
            ],
            typeSpeed: 60,
            backSpeed: 40,
            backDelay: 2000,
            loop: true,
            showCursor: true,
            cursorChar: '|'
        });
    }

    // Animate elements on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe elements for animation
    document.querySelectorAll('.card-hover').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });

    // Case file filtering functionality
    const caseFilters = document.querySelectorAll('.case-filter');
    const caseCards = document.querySelectorAll('.case-card');

    caseFilters.forEach(filter => {
        filter.addEventListener('click', function() {
            const filterValue = this.getAttribute('data-filter');
            
            // Update active filter
            caseFilters.forEach(f => f.classList.remove('active'));
            this.classList.add('active');
            
            // Filter case cards
            caseCards.forEach(card => {
                if (filterValue === 'all' || card.getAttribute('data-category') === filterValue) {
                    card.style.display = 'block';
                    anime({
                        targets: card,
                        opacity: [0, 1],
                        translateY: [20, 0],
                        duration: 400,
                        easing: 'easeOutQuad'
                    });
                } else {
                    anime({
                        targets: card,
                        opacity: [1, 0],
                        translateY: [0, -20],
                        duration: 300,
                        easing: 'easeInQuad',
                        complete: function() {
                            card.style.display = 'none';
                        }
                    });
                }
            });
        });
    });

    // Search functionality for case files
    const searchInput = document.getElementById('case-search');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            
            caseCards.forEach(card => {
                const cardText = card.textContent.toLowerCase();
                const isVisible = cardText.includes(searchTerm);
                
                if (isVisible) {
                    card.style.display = 'block';
                    anime({
                        targets: card,
                        opacity: [0, 1],
                        duration: 300
                    });
                } else {
                    anime({
                        targets: card,
                        opacity: [1, 0],
                        duration: 200,
                        complete: function() {
                            card.style.display = 'none';
                        }
                    });
                }
            });
        });
    }

    // Timeline interaction for case files
    const timelineItems = document.querySelectorAll('.timeline-item');
    timelineItems.forEach(item => {
        item.addEventListener('click', function() {
            const details = this.querySelector('.timeline-details');
            const isExpanded = details.classList.contains('expanded');
            
            // Close all other timeline items
            timelineItems.forEach(otherItem => {
                if (otherItem !== this) {
                    const otherDetails = otherItem.querySelector('.timeline-details');
                    otherDetails.classList.remove('expanded');
                    otherDetails.style.maxHeight = '0';
                }
            });
            
            // Toggle current item
            if (isExpanded) {
                details.classList.remove('expanded');
                details.style.maxHeight = '0';
            } else {
                details.classList.add('expanded');
                details.style.maxHeight = details.scrollHeight + 'px';
            }
        });
    });

    // Skills matrix hover effects
    const skillItems = document.querySelectorAll('.skill-item');
    skillItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            const details = this.querySelector('.skill-details');
            if (details) {
                anime({
                    targets: details,
                    opacity: [0, 1],
                    translateY: [10, 0],
                    duration: 300,
                    easing: 'easeOutQuad'
                });
            }
        });
        
        item.addEventListener('mouseleave', function() {
            const details = this.querySelector('.skill-details');
            if (details) {
                anime({
                    targets: details,
                    opacity: [1, 0],
                    translateY: [0, 10],
                    duration: 200,
                    easing: 'easeInQuad'
                });
            }
        });
    });

    // Contact form handling
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(this);
            const data = Object.fromEntries(formData);
            
            // Basic validation
            const requiredFields = ['name', 'email', 'message'];
            const errors = [];
            
            requiredFields.forEach(field => {
                if (!data[field] || data[field].trim() === '') {
                    errors.push(field);
                }
            });
            
            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (data.email && !emailRegex.test(data.email)) {
                errors.push('email-format');
            }
            
            // Show validation results
            if (errors.length > 0) {
                showNotification('Please fill in all required fields correctly.', 'error');
            } else {
                // Simulate form submission
                showNotification('Thank you for your inquiry. I will respond within 24 hours.', 'success');
                this.reset();
            }
        });
    }

    // Notification system
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm ${
            type === 'success' ? 'bg-green-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
            'bg-blue-500 text-white'
        }`;
        notification.innerHTML = `
            <div class="flex items-center">
                <span class="flex-1">${message}</span>
                <button class="ml-4 text-white hover:text-gray-200" onclick="this.parentElement.parentElement.remove()">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                    </svg>
                </button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
        
        // Animate in
        anime({
            targets: notification,
            translateX: [300, 0],
            opacity: [0, 1],
            duration: 300,
            easing: 'easeOutQuad'
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

    // PDF download simulation
    const pdfButtons = document.querySelectorAll('.pdf-download');
    pdfButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            showNotification('PDF report download would be available in production environment.', 'info');
        });
    });

    // Initialize page-specific functionality
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    switch(currentPage) {
        case 'case-files.html':
            initCaseFilesPage();
            break;
        case 'skills.html':
            initSkillsPage();
            break;
        default:
            // Default page initialization
            break;
    }

    function initCaseFilesPage() {
        // Additional case files page specific functionality
        console.log('Case files page initialized');
    }

    function initSkillsPage() {
        // Additional skills page specific functionality
        console.log('Skills page initialized');
    }

    // Add loading animation for page transitions
    window.addEventListener('beforeunload', function() {
        document.body.style.opacity = '0.8';
    });

    // Console welcome message
    console.log('%cDigital Forensics Portfolio', 'color: #d97706; font-size: 18px; font-weight: bold;');
    console.log('%cProfessional investigative methodology and evidence-based analysis.', 'color: #6b7280; font-size: 12px;');
    console.log('%cAll case studies are simulated for educational purposes.', 'color: #6b7280; font-size: 10px;');
});
// Open external links in a new tab + secure rel.
// Keeps internal navigation in the same tab.
document.querySelectorAll('a[href]').forEach((a) => {
  const href = a.getAttribute('href');
  if (!href) return;

  // Skip anchors, mailto, tel, javascript
  if (
    href.startsWith('#') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:') ||
    href.startsWith('javascript:')
  ) return;

  // Skip if explicitly opted-out
  if (a.hasAttribute('data-same-tab')) return;

  // Treat http(s) as external; relative paths as internal
  const isExternal = /^https?:\/\//i.test(href);
  if (isExternal) {
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer');
  }
});
(function () {
  const buttons = document.querySelectorAll('.filter-btn');
  const cards = document.querySelectorAll('[data-category]');

  if (!buttons.length || !cards.length) return;

  function setActiveButton(activeBtn) {
    buttons.forEach((b) => {
      b.classList.remove('bg-gray-900', 'text-white');
      b.classList.add('text-gray-900');
    });
    activeBtn.classList.add('bg-gray-900', 'text-white');
    activeBtn.classList.remove('text-gray-900');
  }

  function applyFilter(filter) {
    cards.forEach((card) => {
      const cat = (card.getAttribute('data-category') || '').toLowerCase();
      const show = filter === 'all' || cat === filter;
      card.classList.toggle('hidden', !show);
    });
  }

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const filter = (btn.getAttribute('data-filter') || 'all').toLowerCase();
      setActiveButton(btn);
      applyFilter(filter);
    });
  });

  // default
  applyFilter('all');
})();

