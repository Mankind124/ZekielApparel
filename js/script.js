/* =========================================
   ZEKIEL APPAREL — MAIN JAVASCRIPT
   ========================================= */

'use strict';

/* ---- Preloader ---- */
window.addEventListener('load', () => {
  const preloader = document.getElementById('preloader');
  if (preloader) {
    setTimeout(() => preloader.classList.add('hidden'), 1000);
  }
});

/* ---- Dynamic Year ---- */
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ---- Navbar Scroll ---- */
const navbar = document.getElementById('navbar');
const backToTop = document.getElementById('backToTop');

if (navbar) {
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    navbar.classList.toggle('scrolled', scrollY > 60);
    if (backToTop) backToTop.classList.toggle('show', scrollY > 400);
  });
}
if (backToTop) {
  backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

/* ---- Active Nav Link — page-based detection ---- */
(function setActiveNav() {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  const map = {
    'index.html':        'Home',
    '':                  'Home',
    'about.html':        'About',
    'services.html':     'Services',
    'gallery.html':      'Gallery',
    'testimonials.html': 'Testimonials',
    'contact.html':      'Contact',
  };
  const activeLabel = map[page] || 'Home';
  document.querySelectorAll('.nav-link, .mobile-link').forEach(link => {
    link.classList.remove('active');
    if (link.textContent.trim() === activeLabel) {
      link.classList.add('active');
    }
  });
})();

/* ---- Mobile Menu ---- */
const hamburger    = document.getElementById('hamburger');
const mobileMenu   = document.getElementById('mobileMenu');
const mobileClose  = document.getElementById('mobileClose');
const mobileOverlay = document.getElementById('mobileOverlay');

function openMobileMenu() {
  mobileMenu.classList.add('open');
  mobileOverlay.classList.add('show');
  hamburger.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeMobileMenu() {
  mobileMenu.classList.remove('open');
  mobileOverlay.classList.remove('show');
  hamburger.classList.remove('open');
  document.body.style.overflow = '';
}

if (hamburger) hamburger.addEventListener('click', () =>
  mobileMenu.classList.contains('open') ? closeMobileMenu() : openMobileMenu()
);
if (mobileClose)   mobileClose.addEventListener('click', closeMobileMenu);
if (mobileOverlay) mobileOverlay.addEventListener('click', closeMobileMenu);
document.querySelectorAll('.mobile-link, .mobile-cta').forEach(l => l.addEventListener('click', closeMobileMenu));

/* ---- Scroll Reveal ---- */
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); revealObs.unobserve(e.target); }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

[
  '.about-grid', '.about-visual', '.about-content',
  '.section-header', '.process-step', '.contact-info',
  '.contact-form', '.cta-content', '.footer-brand',
  '.footer-col', '.value-card', '.team-card',
  '.testi-stat-card', '.page-banner-content',
  '.services-intro'
].forEach(sel => {
  document.querySelectorAll(sel).forEach(el => {
    el.classList.add('reveal');
    revealObs.observe(el);
  });
});

/* ---- Service Cards Stagger ---- */
const serviceObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      const delay = parseInt(e.target.dataset.delay) || 0;
      setTimeout(() => e.target.classList.add('visible'), delay);
      serviceObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.08 });
document.querySelectorAll('.service-card').forEach(c => serviceObserver.observe(c));

/* ---- Gallery Filter ---- */
const filterBtns  = document.querySelectorAll('.filter-btn');
const galleryItems = document.querySelectorAll('.gallery-item');

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const filter = btn.dataset.filter;
    galleryItems.forEach(item => {
      const show = filter === 'all' || item.dataset.category === filter;
      if (show) {
        item.style.display = '';
        item.style.opacity = '0';
        item.style.transform = 'scale(0.95)';
        requestAnimationFrame(() => {
          item.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
          item.style.opacity = '1';
          item.style.transform = 'scale(1)';
        });
      } else {
        item.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        item.style.opacity = '0';
        item.style.transform = 'scale(0.95)';
        setTimeout(() => { item.style.display = 'none'; }, 300);
      }
    });
  });
});

/* ---- Testimonials Slider — exposed for content-loader to re-init ---- */
let testimonialsAutoplay;
function initTestimonialsSlider() {
  const track = document.getElementById('testimonialsTrack');
  if (!track) return;
  const cards    = track.querySelectorAll('.testimonial-card');
  const dotsWrap = document.getElementById('sliderDots');
  const prevBtn  = document.getElementById('prevBtn');
  const nextBtn  = document.getElementById('nextBtn');
  const total    = cards.length;
  if (!total) return;
  const maxIndex = total - 1;
  let current = 0;

  clearInterval(testimonialsAutoplay);
  cards.forEach(c => { c.style.minWidth = '100%'; c.style.boxSizing = 'border-box'; });

  function createDots() {
    if (!dotsWrap) return;
    dotsWrap.innerHTML = '';
    for (let i = 0; i < total; i++) {
      const dot = document.createElement('button');
      dot.className = 'slider-dot' + (i === current ? ' active' : '');
      dot.setAttribute('aria-label', 'Slide ' + (i + 1));
      dot.addEventListener('click', () => { goTo(i); resetAutoplay(); });
      dotsWrap.appendChild(dot);
    }
  }
  function updateDots() { document.querySelectorAll('.slider-dot').forEach((d, i) => d.classList.toggle('active', i === current)); }
  function goTo(idx) {
    current = Math.max(0, Math.min(idx, maxIndex));
    track.style.transform = 'translateX(-' + (current * 100) + '%)';
    updateDots();
  }
  function startAutoplay() { testimonialsAutoplay = setInterval(() => goTo(current >= maxIndex ? 0 : current + 1), 5000); }
  function resetAutoplay() { clearInterval(testimonialsAutoplay); startAutoplay(); }

  if (prevBtn) prevBtn.onclick = () => { goTo(current <= 0 ? maxIndex : current - 1); resetAutoplay(); };
  if (nextBtn) nextBtn.onclick = () => { goTo(current >= maxIndex ? 0 : current + 1); resetAutoplay(); };

  let tsX = 0;
  track.ontouchstart = e => { tsX = e.changedTouches[0].screenX; };
  track.ontouchend = e => {
    const diff = tsX - e.changedTouches[0].screenX;
    if (Math.abs(diff) > 40) { goTo(diff > 0 ? (current >= maxIndex ? 0 : current + 1) : (current <= 0 ? maxIndex : current - 1)); resetAutoplay(); }
  };

  createDots();
  startAutoplay();
}
window.initTestimonialsSlider = initTestimonialsSlider;
initTestimonialsSlider();

/* ---- FAQ Accordion ---- */
document.querySelectorAll('.faq-question').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item');
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
    if (!isOpen) item.classList.add('open');
  });
});

/* ---- Contact Form ---- */
const contactForm = document.getElementById('contactForm');
const formSuccess = document.getElementById('formSuccess');

if (contactForm) {
  contactForm.addEventListener('submit', function (e) {
    e.preventDefault();
    let valid = true;
    contactForm.querySelectorAll('[required]').forEach(field => {
      field.classList.remove('error');
      if (!field.value.trim()) { field.classList.add('error'); valid = false; }
      if (field.type === 'email' && field.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value)) {
        field.classList.add('error'); valid = false;
      }
    });
    if (!valid) { contactForm.querySelector('.error')?.focus(); return; }

    const btn = contactForm.querySelector('[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Sending…';
    setTimeout(() => {
      contactForm.reset();
      btn.disabled = false;
      btn.innerHTML = 'Send Message <i class="fa fa-paper-plane"></i>';
      if (formSuccess) { formSuccess.classList.add('show'); setTimeout(() => formSuccess.classList.remove('show'), 6000); }
    }, 1500);
  });
  contactForm.querySelectorAll('input, select, textarea').forEach(f => f.addEventListener('input', () => f.classList.remove('error')));
}

/* ---- Stats Counter ---- */
function animateCounter(el, target, duration = 1500) {
  const suffix = el.dataset.suffix || '';
  const steps  = Math.floor(duration / 16);
  const inc    = target / steps;
  let cur = 0;
  const timer = setInterval(() => {
    cur += inc;
    if (cur >= target) { cur = target; clearInterval(timer); }
    el.textContent = (target >= 100 ? Math.floor(cur).toLocaleString() : Math.floor(cur)) + suffix;
  }, 16);
}

const statsObs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.querySelectorAll('.stat-num, .testi-stat-num').forEach(numEl => {
        const raw    = numEl.textContent.replace(/[^0-9.]/g, '');
        const suffix = numEl.textContent.replace(/[0-9.,]/g, '');
        numEl.dataset.suffix = suffix;
        numEl.textContent = '0' + suffix;
        animateCounter(numEl, parseFloat(raw));
      });
      statsObs.unobserve(e.target);
    }
  });
}, { threshold: 0.4 });

document.querySelectorAll('.about-stats, .testi-stats').forEach(s => statsObs.observe(s));

/* ---- Logo Fallback ---- */
document.querySelectorAll('.logo-img').forEach(img => {
  const show = () => { img.style.display = 'none'; if (img.nextElementSibling) img.nextElementSibling.style.display = 'flex'; };
  img.addEventListener('error', show);
  if (img.complete && !img.naturalWidth) show();
});
