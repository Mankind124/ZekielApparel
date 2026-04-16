/* =========================================
   ZEKIEL APPAREL — CONTENT LOADER
   Fetches content from backend API and renders dynamic sections.
   ========================================= */

'use strict';

const API_BASE = window.ZEKIEL_API_URL || '';

/* ── Helpers ─────────────────────────────────── */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

// Resolve image URLs — uploaded images live on the API server, not the static frontend
function resolveImg(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads/')) return API_BASE + url;
  return url;
}

/* ── Fetch & dispatch ────────────────────────── */
async function loadAndRender() {
  let content;
  try {
    const res = await fetch(API_BASE + '/api/content');
    if (!res.ok) throw new Error('Could not load content');
    content = await res.json();
    window.siteContent = content;
  } catch (e) {
    console.warn('[Zekiel] Content API unreachable — using static fallback. Reason:', e.message);
    return;
  }

  renderBindings(content);
  renderHero(content.hero);
  renderAbout(content.about);
  renderValues(content.values);
  renderTeam(content.team);
  renderServices(content.services);
  renderGallery(content.gallery);
  renderHomeGalleryPreview(content.gallery);
  renderTestimonials(content.testimonials);
  renderFAQ(content.faq);
  renderDiscountBanner(content.discounts);
  renderContact(content.settings);
  renderFooter(content.settings);
  renderSocialLinks(content.settings);
}

/* ── data-bind: replace text content of any element with [data-bind="path.to.field"] ─ */
function renderBindings(content) {
  $$('[data-bind]').forEach(el => {
    const path = el.dataset.bind.split('.');
    let v = content;
    for (const p of path) { v = v?.[p]; if (v == null) break; }
    if (v != null) el.textContent = v;
  });
}

/* ── HERO (home only) ────────────────────────── */
function renderHero(h) {
  if (!h) return;
  const eyebrow = $('.hero-eyebrow');
  if (eyebrow) eyebrow.textContent = h.eyebrow;
  const tagline = $('.hero-tagline');
  if (tagline) tagline.textContent = h.tagline;
  const desc = $('.hero-desc');
  if (desc) desc.innerHTML = esc(h.description).replace(/\n/g, '<br>');
  const actions = $('.hero-actions');
  if (actions && (h.ctaPrimaryText || h.ctaSecondaryText)) {
    actions.innerHTML = `
      <a href="${esc(h.ctaPrimaryLink || '#')}" class="btn btn-primary">${esc(h.ctaPrimaryText || '')}</a>
      <a href="${esc(h.ctaSecondaryLink || '#')}" class="btn btn-outline">${esc(h.ctaSecondaryText || '')}</a>`;
  }
}

/* ── ABOUT ───────────────────────────────────── */
function renderAbout(a) {
  if (!a) return;
  // About content (on about page or home teaser)
  const eyebrow = $('.about-content .section-eyebrow');
  if (eyebrow) eyebrow.textContent = a.eyebrow;
  const title = $('.about-content .section-title');
  if (title && a.title) title.innerHTML = a.title.replace(/,/g, ',<br/><em>') + (a.title.includes(',') ? '</em>' : '');
  const aboutContent = $('.about-content');
  if (aboutContent && a.paragraphs?.length) {
    // Replace existing about-text paragraphs
    aboutContent.querySelectorAll('.about-text').forEach(p => p.remove());
    const stats = aboutContent.querySelector('.about-stats');
    a.paragraphs.forEach(text => {
      const p = document.createElement('p');
      p.className = 'about-text';
      p.textContent = text;
      if (stats) aboutContent.insertBefore(p, stats);
      else aboutContent.appendChild(p);
    });
  }
  // Stats
  const statNums = $$('.about-stats .stat-num');
  if (statNums.length >= 3) {
    statNums[0].textContent = a.happyClients || statNums[0].textContent;
    statNums[1].textContent = a.piecesCreated || statNums[1].textContent;
    statNums[2].textContent = a.bespokePercent || statNums[2].textContent;
  }
  // Years badge
  const badgeNum = $('.badge-num');
  if (badgeNum && a.yearsExperience) badgeNum.textContent = a.yearsExperience;
}

/* ── VALUES ──────────────────────────────────── */
function renderValues(values) {
  const grid = $('.values-grid');
  if (!grid || !values?.length) return;
  grid.innerHTML = values.map(v => `
    <div class="value-card">
      <div class="value-icon"><i class="fa ${esc(v.icon)}"></i></div>
      <h3>${esc(v.title)}</h3>
      <p>${esc(v.description)}</p>
    </div>`).join('');
}

/* ── TEAM ────────────────────────────────────── */
function renderTeam(team) {
  const grid = $('#teamGrid');
  if (!grid || !team) return;
  if (!team.length) { grid.innerHTML = '<p style="color:var(--text-light)">Team info coming soon.</p>'; return; }
  grid.innerHTML = team.map(m => {
    const hasPhoto = m.photo && m.photo.trim();
    return `
      <div class="team-card">
        <div class="team-photo ${hasPhoto ? 'has-img' : ''}">
          ${hasPhoto ? `<img src="${esc(resolveImg(m.photo))}" alt="${esc(m.name)}" loading="lazy" />` : `<i class="fa fa-user"></i>`}
        </div>
        <div class="team-name">${esc(m.name)}</div>
        <div class="team-role">${esc(m.role)}</div>
        <p class="team-bio">${esc(m.bio)}</p>
      </div>`;
  }).join('');
}

/* ── SERVICES ────────────────────────────────── */
function renderServices(services) {
  if (!services?.length) return;
  const allGrid = $('#servicesGrid') || $('.services-grid');
  if (!allGrid) return;

  // Detect if we're on the home page (3 featured) vs services page (all)
  const isHome = location.pathname.endsWith('/') || location.pathname.endsWith('index.html');
  const list = isHome
    ? services.filter(s => s.featured).slice(0, 3)
    : services;

  allGrid.innerHTML = list.map((s, i) => `
    <div class="service-card visible" data-delay="${i * 100}">
      <div class="service-icon"><i class="fa ${esc(s.icon)}"></i></div>
      <h3>${esc(s.title)}</h3>
      <p>${esc(s.description)}</p>
      ${s.price ? `<p style="font-size:0.85rem;color:var(--teal);font-weight:700;margin:8px 0 14px;letter-spacing:0.03em">${esc(s.price)}</p>` : ''}
      <a href="contact.html" class="service-link">Get Started <i class="fa fa-arrow-right"></i></a>
    </div>`).join('');
}

/* ── GALLERY (full page) ─────────────────────── */
function renderGallery(items) {
  const grid = $('#galleryGrid');
  if (!grid || !items) return;
  if (!items.length) { grid.innerHTML = '<p style="text-align:center;padding:40px;color:var(--text-light)">Gallery coming soon.</p>'; return; }

  const placeholderClasses = ['g1','g2','g3','g4','g5','g6'];
  const layoutPattern = ['large','','','wide','','large','','','wide','','',''];

  grid.innerHTML = items.map((item, i) => {
    const url = resolveImg(item.image);
    const hasImg = !!url;
    const cls = placeholderClasses[i % placeholderClasses.length];
    const layout = layoutPattern[i % layoutPattern.length];
    return `
      <div class="gallery-item ${layout}" data-category="${esc(item.category)}">
        <div class="gallery-placeholder ${hasImg ? 'has-img' : cls}">
          ${hasImg ? `<img src="${esc(url)}" alt="${esc(item.title)}" loading="lazy" />` : ''}
          <div class="gallery-overlay">
            <span>${esc(item.title)}</span>
            <i class="fa fa-search-plus"></i>
          </div>
        </div>
      </div>`;
  }).join('');

  // Re-attach filter logic
  const filterBtns = $$('.filter-btn');
  const galleryItems = $$('.gallery-item');
  filterBtns.forEach(btn => {
    btn.onclick = () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      galleryItems.forEach(it => {
        const show = filter === 'all' || it.dataset.category === filter;
        if (show) {
          it.style.display = '';
          requestAnimationFrame(() => { it.style.opacity='1'; it.style.transform='scale(1)'; });
        } else {
          it.style.opacity = '0';
          it.style.transform = 'scale(0.95)';
          setTimeout(() => { it.style.display = 'none'; }, 300);
        }
      });
    };
  });
}

/* ── HOME GALLERY PREVIEW ────────────────────── */
function renderHomeGalleryPreview(items) {
  const grid = $('#homeGalleryGrid');
  if (!grid || !items) return;
  const sample = items.slice(0, 6);
  const placeholders = ['g1','g2','g3','g4','g5','g6'];
  const layouts = ['','large','','','','large'];
  grid.innerHTML = sample.map((item, i) => {
    const url = resolveImg(item.image);
    const hasImg = !!url;
    return `
      <div class="gallery-item ${layouts[i]}" data-category="${esc(item.category)}">
        <div class="gallery-placeholder ${hasImg ? 'has-img' : placeholders[i]}">
          ${hasImg ? `<img src="${esc(url)}" alt="${esc(item.title)}" loading="lazy" />` : ''}
          <div class="gallery-overlay"><span>${esc(item.title)}</span><i class="fa fa-search-plus"></i></div>
        </div>
      </div>`;
  }).join('');
}

/* ── TESTIMONIALS ────────────────────────────── */
function renderTestimonials(items) {
  if (!items?.length) return;

  // Slider on home page
  const track = $('#testimonialsTrack');
  if (track) {
    track.innerHTML = items.map(t => testimonialCardHTML(t)).join('');
    // Re-init slider behaviour (script.js owns the slider; trigger a rebuild)
    if (window.initTestimonialsSlider) window.initTestimonialsSlider();
  }

  // Grid on testimonials page
  const grid = $('.testimonials-grid');
  if (grid) {
    grid.innerHTML = items.map(t => testimonialCardHTML(t)).join('');
  }
}
function testimonialCardHTML(t) {
  const stars = '★'.repeat(t.rating || 5);
  return `
    <div class="testimonial-card">
      <div class="testi-stars">
        ${Array(5).fill(0).map((_, i) =>
          `<i class="fa fa-star" style="${i < (t.rating || 5) ? '' : 'color:#ddd'}"></i>`).join('')}
      </div>
      <p class="testi-text">${esc(t.text)}</p>
      <div class="testi-author">
        <div class="testi-avatar">${esc((t.name || '?').charAt(0).toUpperCase())}</div>
        <div>
          <span class="testi-name">${esc(t.name)}</span>
          <span class="testi-role">${esc(t.role)}</span>
        </div>
      </div>
    </div>`;
}

/* ── FAQ ─────────────────────────────────────── */
function renderFAQ(items) {
  const list = $('.faq-list');
  if (!list || !items?.length) return;
  list.innerHTML = items.map(q => `
    <div class="faq-item">
      <button class="faq-question">${esc(q.question)} <i class="fa fa-plus"></i></button>
      <div class="faq-answer"><p>${esc(q.answer)}</p></div>
    </div>`).join('');
  // Re-attach FAQ accordion
  list.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const isOpen = item.classList.contains('open');
      list.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });
}

/* ── DISCOUNT BANNER ─────────────────────────── */
function renderDiscountBanner(discounts) {
  if (!discounts?.length) return;
  const active = discounts.find(d => d.active);
  if (!active) return;
  // Create a slim banner above the navbar
  if (document.getElementById('promoBanner')) return;
  const banner = document.createElement('div');
  banner.id = 'promoBanner';
  banner.style.cssText = 'background:#c9a84c;color:#111;text-align:center;padding:8px 16px;font-size:0.82rem;font-weight:600;letter-spacing:0.04em;position:relative;z-index:1100';
  banner.innerHTML = `
    🎉 <strong>${esc(active.title)}</strong> — ${esc(active.description)}
    ${active.code ? `<span style="margin-left:10px;padding:2px 10px;background:rgba(0,0,0,0.15);border-radius:4px">Code: ${esc(active.code)}</span>` : ''}`;
  document.body.insertBefore(banner, document.body.firstChild);
  // Push navbar down
  const nav = document.getElementById('navbar');
  if (nav) nav.style.top = banner.offsetHeight + 'px';
}

/* ── CONTACT PAGE ────────────────────────────── */
function renderContact(s) {
  if (!s) return;
  // Address
  $$('[data-contact="address"]').forEach(el => el.innerHTML = esc(s.address).replace(',', ',<br/>'));
  // Phone
  $$('[data-contact="phone"]').forEach(el => {
    const both = [s.phone1, s.phone2].filter(Boolean).join('<br/>');
    el.innerHTML = both;
  });
  // Email
  $$('[data-contact="email"]').forEach(el => el.textContent = s.email || '');
  // Hours
  $$('[data-contact="hours"]').forEach(el => {
    el.innerHTML = `${esc(s.weekdayHours)}<br/>${esc(s.saturdayHours)}`;
  });
  // Bank
  $$('[data-contact="bank"]').forEach(el => {
    if (!s.accountNumber) { el.style.display = 'none'; return; }
    el.innerHTML = `<strong>${esc(s.bankName || 'Bank')}</strong><br/>${esc(s.accountName)} · ${esc(s.accountNumber)}`;
  });
}

/* ── FOOTER ──────────────────────────────────── */
function renderFooter(s) {
  if (!s) return;
  const fc = $('.footer-contact');
  if (!fc) return;
  const phones = [s.phone1, s.phone2].filter(Boolean).join(' / ');
  fc.innerHTML = `
    <li><i class="fa fa-map-marker-alt"></i> ${esc(s.address)}</li>
    <li><i class="fa fa-phone"></i> ${esc(phones)}</li>
    <li><i class="fa fa-envelope"></i> ${esc(s.email)}</li>
    <li><i class="fa fa-clock"></i> ${esc(s.weekdayHours)} · ${esc(s.saturdayHours)}</li>`;
}

/* ── SOCIAL LINKS ────────────────────────────── */
function renderSocialLinks(s) {
  if (!s) return;
  const map = {
    instagram: s.instagram,
    facebook: s.facebook,
    tiktok: s.tiktok,
    pinterest: s.pinterest,
    whatsapp: s.whatsapp ? 'https://wa.me/' + s.whatsapp.replace(/[^0-9]/g, '') : ''
  };
  $$('.footer-socials a, .contact-socials a').forEach(a => {
    const label = (a.getAttribute('aria-label') || '').toLowerCase();
    if (map[label]) {
      a.href = map[label];
      a.target = '_blank';
      a.rel = 'noopener';
    }
  });
}

/* ── Run ─────────────────────────────────────── */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadAndRender);
} else {
  loadAndRender();
}
