/* =========================================
   ZEKIEL APPAREL — ADMIN SPA
   ========================================= */

'use strict';

const API = ''; // same origin
const TOKEN_KEY = 'zkl_admin_token';

let state = {
  token: localStorage.getItem(TOKEN_KEY) || null,
  content: null,
  dirty: false,
  currentTab: 'dashboard',
  currentPicker: null,  // { onPick: (url) => void }
};

/* ── DOM helpers ─────────────────────────────── */
const $  = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v === true) node.setAttribute(k, '');
    else if (v !== false && v != null) node.setAttribute(k, v);
  }
  for (const child of children.flat()) {
    if (child == null) continue;
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
};
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

/* ── API ─────────────────────────────────────── */
async function api(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (!(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (state.token) headers['Authorization'] = 'Bearer ' + state.token;
  const res = await fetch(API + path, { ...opts, headers });
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) throw new Error(data?.error || 'Request failed');
  return data;
}

/* ── Toast ───────────────────────────────────── */
let toastTimer;
function toast(msg, type = '') {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

/* ── Status ──────────────────────────────────── */
function setStatus(text, cls = '') {
  $('#statusText').textContent = text;
  $('#statusDot').className = 'status-dot ' + cls;
}

/* ── Auth ────────────────────────────────────── */
async function login(email, password) {
  const data = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  state.token = data.token;
  localStorage.setItem(TOKEN_KEY, data.token);
}

function logout() {
  state.token = null;
  localStorage.removeItem(TOKEN_KEY);
  location.reload();
}

/* ── Load content ────────────────────────────── */
async function loadContent() {
  try {
    setStatus('Loading…', 'saving');
    state.content = await api('/api/content');
    state.dirty = false;
    setStatus('Up to date', '');
    $('#saveAllBtn').hidden = true;
  } catch (e) {
    setStatus('Load failed', 'error');
    toast(e.message, 'error');
  }
}

/* ── Save content ────────────────────────────── */
async function saveContent() {
  try {
    setStatus('Saving…', 'saving');
    await api('/api/content', { method: 'PUT', body: JSON.stringify(state.content) });
    state.dirty = false;
    $('#saveAllBtn').hidden = true;
    setStatus('Saved', '');
    toast('Changes saved successfully', 'success');
  } catch (e) {
    setStatus('Save failed', 'error');
    toast(e.message, 'error');
  }
}

function markDirty() {
  state.dirty = true;
  $('#saveAllBtn').hidden = false;
  setStatus('Unsaved changes', 'saving');
}

/* ── Image picker modal ─────────────────────── */
function openPicker(onPick) {
  state.currentPicker = { onPick };
  $('#imageModal').hidden = false;
  loadUploads();
}
function closePicker() {
  state.currentPicker = null;
  $('#imageModal').hidden = true;
}
async function loadUploads() {
  try {
    const data = await api('/api/uploads');
    const grid = $('#imageGrid');
    grid.innerHTML = '';
    if (!data.items.length) {
      grid.innerHTML = '<div class="empty-state">No uploads yet</div>';
      return;
    }
    data.items.sort((a, b) => b.filename.localeCompare(a.filename));
    data.items.forEach(item => {
      const card = el('div', { class: 'image-grid-item', onClick: () => pickImage(item.url) },
        el('img', { src: item.url, alt: '' }),
        el('button', { class: 'delete-btn', title: 'Delete', onClick: (ev) => { ev.stopPropagation(); deleteUpload(item.filename); } },
          el('i', { class: 'fa fa-trash' })));
      grid.appendChild(card);
    });
  } catch (e) {
    toast(e.message, 'error');
  }
}
function pickImage(url) {
  if (state.currentPicker?.onPick) state.currentPicker.onPick(url);
  closePicker();
}
async function uploadFile(file) {
  if (!file) return;
  try {
    setStatus('Uploading…', 'saving');
    const fd = new FormData();
    fd.append('file', file);
    const data = await api('/api/upload', { method: 'POST', body: fd });
    setStatus('Uploaded', '');
    toast('Image uploaded', 'success');
    pickImage(data.url);
  } catch (e) {
    setStatus('Upload failed', 'error');
    toast(e.message, 'error');
  }
}
async function deleteUpload(filename) {
  if (!confirm('Delete this image? This cannot be undone.')) return;
  try {
    await api('/api/upload/' + encodeURIComponent(filename), { method: 'DELETE' });
    toast('Image deleted', 'success');
    loadUploads();
  } catch (e) {
    toast(e.message, 'error');
  }
}

/* ── Image picker widget ───────────────────── */
function imagePicker(currentUrl, onChange) {
  const wrap = el('div', { class: 'image-picker' + (currentUrl ? ' has-image' : '') });
  const render = (url) => {
    wrap.innerHTML = '';
    wrap.className = 'image-picker' + (url ? ' has-image' : '');
    if (url) {
      const img = el('img', { src: url, alt: '' });
      const removeBtn = el('button', { class: 'remove-img', title: 'Remove',
        onClick: (ev) => { ev.stopPropagation(); render(''); onChange(''); }
      }, el('i', { class: 'fa fa-times' }));
      wrap.appendChild(img);
      wrap.appendChild(removeBtn);
    } else {
      wrap.appendChild(el('i', { class: 'fa fa-cloud-arrow-up' }));
      wrap.appendChild(el('span', {}, 'Click to select or upload an image'));
    }
  };
  render(currentUrl);
  wrap.addEventListener('click', (ev) => {
    if (ev.target.closest('.remove-img')) return;
    openPicker((url) => { render(url); onChange(url); });
  });
  return wrap;
}

/* ── Field builders ─────────────────────────── */
function textField(label, value, onChange, opts = {}) {
  const input = el('input', { type: opts.type || 'text', value: value || '', placeholder: opts.placeholder || '',
    onInput: (e) => { onChange(e.target.value); markDirty(); } });
  return el('div', { class: 'field' },
    el('label', {}, label),
    input,
    opts.hint ? el('p', { class: 'field-hint' }, opts.hint) : null);
}
function textareaField(label, value, onChange, opts = {}) {
  const ta = el('textarea', { rows: opts.rows || 4, placeholder: opts.placeholder || '',
    onInput: (e) => { onChange(e.target.value); markDirty(); } });
  ta.value = value || '';
  return el('div', { class: 'field' },
    el('label', {}, label),
    ta,
    opts.hint ? el('p', { class: 'field-hint' }, opts.hint) : null);
}
function selectField(label, value, options, onChange) {
  const sel = el('select', { onChange: (e) => { onChange(e.target.value); markDirty(); } });
  options.forEach(opt => {
    const o = el('option', { value: opt.value }, opt.label);
    if (opt.value === value) o.selected = true;
    sel.appendChild(o);
  });
  return el('div', { class: 'field' }, el('label', {}, label), sel);
}
function toggleField(label, value, onChange) {
  const wrap = el('label', { class: 'toggle' });
  const input = el('input', { type: 'checkbox',
    onChange: (e) => { onChange(e.target.checked); markDirty(); } });
  input.checked = !!value;
  wrap.appendChild(input);
  wrap.appendChild(el('span', { class: 'toggle-track' }));
  return el('div', { style: 'display:flex;align-items:center;gap:12px;padding:10px 0' },
    wrap,
    el('span', { style: 'font-size:0.85rem;font-weight:500' }, label));
}
function row(...fields) {
  return el('div', { class: 'field-row' }, ...fields);
}

/* ── Panel renderers ─────────────────────────── */
const PANELS = {
  dashboard: renderDashboard,
  settings: renderSettings,
  hero: renderHero,
  about: renderAbout,
  values: renderValues,
  team: renderTeam,
  services: renderServices,
  gallery: renderGallery,
  testimonials: renderTestimonials,
  discounts: renderDiscounts,
  faq: renderFAQ,
  account: renderAccount,
};

function showTab(tab) {
  state.currentTab = tab;
  $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  const titles = {
    dashboard: 'Dashboard', settings: 'Business Info', hero: 'Hero / Home',
    about: 'About & Story', values: 'Core Values', team: 'Team',
    services: 'Services & Prices', gallery: 'Gallery', testimonials: 'Testimonials',
    discounts: 'Discounts & Promotions', faq: 'FAQ', account: 'Admin Account'
  };
  $('#pageTitle').textContent = titles[tab] || 'Admin';
  const c = $('#content');
  c.innerHTML = '';
  if (PANELS[tab]) c.appendChild(PANELS[tab]());
  $('.sidebar').classList.remove('open');
  $('.backdrop')?.remove();
}

/* =========================================
   DASHBOARD
   ========================================= */
function renderDashboard() {
  const c = state.content;
  const stats = [
    { label: 'Gallery Items', num: c.gallery?.length || 0, icon: 'fa-images' },
    { label: 'Team Members', num: c.team?.length || 0, icon: 'fa-users' },
    { label: 'Services', num: c.services?.length || 0, icon: 'fa-scissors' },
    { label: 'Testimonials', num: c.testimonials?.length || 0, icon: 'fa-comment-dots' },
  ];
  const grid = el('div', { class: 'dash-grid' },
    ...stats.map(s => el('div', { class: 'dash-card' },
      el('div', { class: 'dash-card-icon' }, el('i', { class: 'fa ' + s.icon })),
      el('div', { class: 'dash-card-label' }, s.label),
      el('div', { class: 'dash-card-num' }, String(s.num)))));

  const quick = el('div', { class: 'panel' },
    el('div', { class: 'panel-head' }, el('h2', {}, 'Quick Actions')),
    el('div', { class: 'quick-actions' },
      el('button', { class: 'quick-action', onClick: () => showTab('gallery') },
        el('i', { class: 'fa fa-images' }),
        el('strong', {}, 'Manage Gallery'),
        el('span', {}, 'Upload and organise photos')),
      el('button', { class: 'quick-action', onClick: () => showTab('services') },
        el('i', { class: 'fa fa-scissors' }),
        el('strong', {}, 'Update Prices'),
        el('span', {}, 'Edit service descriptions and prices')),
      el('button', { class: 'quick-action', onClick: () => showTab('discounts') },
        el('i', { class: 'fa fa-tag' }),
        el('strong', {}, 'Run a Discount'),
        el('span', {}, 'Create or toggle promotions')),
      el('button', { class: 'quick-action', onClick: () => showTab('testimonials') },
        el('i', { class: 'fa fa-comment-dots' }),
        el('strong', {}, 'Add Testimonial'),
        el('span', {}, 'Share new client reviews')),
      el('button', { class: 'quick-action', onClick: () => showTab('settings') },
        el('i', { class: 'fa fa-cog' }),
        el('strong', {}, 'Business Info'),
        el('span', {}, 'Update contact & bank details')),
      el('button', { class: 'quick-action', onClick: () => showTab('team') },
        el('i', { class: 'fa fa-users' }),
        el('strong', {}, 'Team Members'),
        el('span', {}, 'Add/edit your staff profiles'))));

  const wrap = el('div');
  wrap.appendChild(grid);
  wrap.appendChild(quick);
  return wrap;
}

/* =========================================
   SETTINGS (business info)
   ========================================= */
function renderSettings() {
  const s = state.content.settings;
  const set = (k, v) => { s[k] = v; };

  const contact = el('div', { class: 'panel' },
    el('div', { class: 'panel-head' },
      el('div', {}, el('h2', {}, 'Contact Information'), el('p', {}, 'Shown across your website'))),
    el('div', { class: 'panel-body' },
      textField('Brand Name', s.brandName, (v) => set('brandName', v)),
      textareaField('Address', s.address, (v) => set('address', v), { rows: 2 }),
      row(
        textField('Phone 1 (primary)', s.phone1, (v) => set('phone1', v)),
        textField('Phone 2 (optional)', s.phone2, (v) => set('phone2', v))),
      textField('Email', s.email, (v) => set('email', v), { type: 'email' }),
      row(
        textField('Mon–Fri Hours', s.weekdayHours, (v) => set('weekdayHours', v)),
        textField('Saturday Hours', s.saturdayHours, (v) => set('saturdayHours', v)))));

  const social = el('div', { class: 'panel' },
    el('div', { class: 'panel-head' },
      el('div', {}, el('h2', {}, 'Social Media'), el('p', {}, 'Links shown in the footer and contact page'))),
    el('div', { class: 'panel-body' },
      row(
        textField('Instagram URL', s.instagram, (v) => set('instagram', v), { placeholder: 'https://instagram.com/...' }),
        textField('Facebook URL', s.facebook, (v) => set('facebook', v), { placeholder: 'https://facebook.com/...' })),
      row(
        textField('TikTok URL', s.tiktok, (v) => set('tiktok', v), { placeholder: 'https://tiktok.com/@...' }),
        textField('Pinterest URL', s.pinterest, (v) => set('pinterest', v), { placeholder: 'https://pinterest.com/...' })),
      textField('WhatsApp Number (with country code)', s.whatsapp, (v) => set('whatsapp', v), { placeholder: '+2348104355199' })));

  const bank = el('div', { class: 'panel' },
    el('div', { class: 'panel-head' },
      el('div', {}, el('h2', {}, 'Payment / Bank Details'), el('p', {}, 'For displaying on invoices or the contact page'))),
    el('div', { class: 'panel-body' },
      textField('Bank Name', s.bankName, (v) => set('bankName', v)),
      row(
        textField('Account Name', s.accountName, (v) => set('accountName', v)),
        textField('Account Number', s.accountNumber, (v) => set('accountNumber', v)))));

  const wrap = el('div');
  [contact, social, bank].forEach(p => wrap.appendChild(p));
  return wrap;
}

/* =========================================
   HERO / HOME
   ========================================= */
function renderHero() {
  const h = state.content.hero;
  const set = (k, v) => { h[k] = v; };

  const p = el('div', { class: 'panel' },
    el('div', { class: 'panel-head' },
      el('div', {}, el('h2', {}, 'Homepage Hero'), el('p', {}, 'The large banner at the top of your home page'))),
    el('div', { class: 'panel-body' },
      row(
        textField('Eyebrow (small line above brand)', h.eyebrow, (v) => set('eyebrow', v)),
        textField('Tagline', h.tagline, (v) => set('tagline', v))),
      textareaField('Description', h.description, (v) => set('description', v), { rows: 3 }),
      row(
        textField('Primary Button Text', h.ctaPrimaryText, (v) => set('ctaPrimaryText', v)),
        textField('Primary Button Link', h.ctaPrimaryLink, (v) => set('ctaPrimaryLink', v))),
      row(
        textField('Secondary Button Text', h.ctaSecondaryText, (v) => set('ctaSecondaryText', v)),
        textField('Secondary Button Link', h.ctaSecondaryLink, (v) => set('ctaSecondaryLink', v)))));

  const wrap = el('div');
  wrap.appendChild(p);
  return wrap;
}

/* =========================================
   ABOUT
   ========================================= */
function renderAbout() {
  const a = state.content.about;
  const set = (k, v) => { a[k] = v; };

  const story = el('div', { class: 'panel' },
    el('div', { class: 'panel-head' },
      el('div', {}, el('h2', {}, 'About / Story'), el('p', {}, 'Used on the About page and home page teaser'))),
    el('div', { class: 'panel-body' },
      row(
        textField('Eyebrow', a.eyebrow, (v) => set('eyebrow', v)),
        textField('Main Title', a.title, (v) => set('title', v)))));

  const paras = el('div', { class: 'panel-body' });
  const refreshParas = () => {
    paras.innerHTML = '';
    (a.paragraphs || []).forEach((para, i) => {
      const wrap = el('div', { class: 'list-item' },
        el('div', { class: 'list-item-head' },
          el('strong', {}, `Paragraph ${i + 1}`),
          el('div', { class: 'list-item-actions' },
            el('button', { class: 'btn btn-danger btn-sm',
              onClick: () => { a.paragraphs.splice(i, 1); markDirty(); refreshParas(); } },
              el('i', { class: 'fa fa-trash' }), ' Remove'))),
        textareaField('Text', para, (v) => { a.paragraphs[i] = v; }, { rows: 3 }));
      paras.appendChild(wrap);
    });
    paras.appendChild(el('button', { class: 'add-btn',
      onClick: () => { a.paragraphs.push(''); markDirty(); refreshParas(); } },
      el('i', { class: 'fa fa-plus' }), ' Add Paragraph'));
  };
  refreshParas();

  const storyParas = el('div', { class: 'panel' },
    el('div', { class: 'panel-head' }, el('h2', {}, 'Story Paragraphs')),
    paras);

  const stats = el('div', { class: 'panel' },
    el('div', { class: 'panel-head' },
      el('div', {}, el('h2', {}, 'Statistics'), el('p', {}, 'Numbers that appear on About and Home pages'))),
    el('div', { class: 'panel-body' },
      row(
        textField('Years of Experience', a.yearsExperience, (v) => set('yearsExperience', v), { placeholder: '10+' }),
        textField('Happy Clients', a.happyClients, (v) => set('happyClients', v), { placeholder: '500+' })),
      row(
        textField('Pieces Created', a.piecesCreated, (v) => set('piecesCreated', v), { placeholder: '1200+' }),
        textField('Bespoke Percent', a.bespokePercent, (v) => set('bespokePercent', v), { placeholder: '100%' }))));

  const wrap = el('div');
  [story, storyParas, stats].forEach(p => wrap.appendChild(p));
  return wrap;
}

/* =========================================
   GENERIC LIST EDITOR
   ========================================= */
function listEditor(label, array, renderItem, createDefault, getTitle) {
  const wrap = el('div');
  const refresh = () => {
    wrap.innerHTML = '';
    if (!array.length) {
      wrap.appendChild(el('div', { class: 'empty-state' }, 'None yet — add your first ' + label.toLowerCase()));
    }
    array.forEach((item, i) => {
      const body = renderItem(item, i, () => { markDirty(); });
      const listItem = el('div', { class: 'list-item' },
        el('div', { class: 'list-item-head' },
          el('strong', {}, getTitle(item, i) || `${label} ${i + 1}`),
          el('div', { class: 'list-item-actions' },
            i > 0 ? el('button', { class: 'btn btn-secondary btn-sm', title: 'Move up',
              onClick: () => { [array[i-1], array[i]] = [array[i], array[i-1]]; markDirty(); refresh(); } },
              el('i', { class: 'fa fa-arrow-up' })) : null,
            i < array.length - 1 ? el('button', { class: 'btn btn-secondary btn-sm', title: 'Move down',
              onClick: () => { [array[i+1], array[i]] = [array[i], array[i+1]]; markDirty(); refresh(); } },
              el('i', { class: 'fa fa-arrow-down' })) : null,
            el('button', { class: 'btn btn-danger btn-sm',
              onClick: () => { if (confirm('Delete this item?')) { array.splice(i, 1); markDirty(); refresh(); } } },
              el('i', { class: 'fa fa-trash' })))),
        body);
      wrap.appendChild(listItem);
    });
    wrap.appendChild(el('button', { class: 'add-btn',
      onClick: () => { array.push(createDefault()); markDirty(); refresh(); } },
      el('i', { class: 'fa fa-plus' }), ' Add ' + label));
  };
  refresh();
  return wrap;
}

/* =========================================
   VALUES
   ========================================= */
function renderValues() {
  const list = state.content.values;
  const body = listEditor('Value', list,
    (v) => el('div', {},
      row(
        selectField('Icon', v.icon, [
          { value: 'fa-gem', label: '💎 Gem (Quality)' },
          { value: 'fa-fingerprint', label: '🧬 Fingerprint (Individuality)' },
          { value: 'fa-handshake', label: '🤝 Handshake (Integrity)' },
          { value: 'fa-lightbulb', label: '💡 Lightbulb (Innovation)' },
          { value: 'fa-heart', label: '❤️ Heart (Passion)' },
          { value: 'fa-star', label: '⭐ Star (Excellence)' },
          { value: 'fa-shield', label: '🛡️ Shield (Trust)' },
          { value: 'fa-leaf', label: '🌿 Leaf (Sustainability)' },
        ], (val) => { v.icon = val; }),
        textField('Title', v.title, (val) => { v.title = val; })),
      textareaField('Description', v.description, (val) => { v.description = val; }, { rows: 3 })),
    () => ({ icon: 'fa-gem', title: 'New Value', description: '' }),
    (v) => v.title);

  return el('div', { class: 'panel' },
    el('div', { class: 'panel-head' },
      el('div', {}, el('h2', {}, 'Core Values'), el('p', {}, 'Up to 4 values shown on the About page'))),
    body);
}

/* =========================================
   TEAM
   ========================================= */
function renderTeam() {
  const list = state.content.team;
  const body = listEditor('Team Member', list,
    (m) => {
      const wrap = el('div');
      wrap.appendChild(el('div', { class: 'field' },
        el('label', {}, 'Photo'),
        imagePicker(m.photo, (url) => { m.photo = url; markDirty(); })));
      wrap.appendChild(row(
        textField('Full Name', m.name, (v) => { m.name = v; }),
        textField('Role / Title', m.role, (v) => { m.role = v; })));
      wrap.appendChild(textareaField('Bio', m.bio, (v) => { m.bio = v; }, { rows: 3 }));
      return wrap;
    },
    () => ({ name: 'New Member', role: 'Role', bio: '', photo: '' }),
    (m) => m.name);

  return el('div', { class: 'panel' },
    el('div', { class: 'panel-head' },
      el('div', {}, el('h2', {}, 'Team Members'), el('p', {}, 'Everyone shown on the About page'))),
    body);
}

/* =========================================
   SERVICES
   ========================================= */
function renderServices() {
  const list = state.content.services;
  const body = listEditor('Service', list,
    (s) => {
      const wrap = el('div');
      wrap.appendChild(row(
        selectField('Icon', s.icon, [
          { value: 'fa-cut', label: '✂️ Cut' },
          { value: 'fa-ruler', label: '📏 Ruler' },
          { value: 'fa-magic', label: '✨ Magic' },
          { value: 'fa-heart', label: '❤️ Heart' },
          { value: 'fa-briefcase', label: '💼 Briefcase' },
          { value: 'fa-star', label: '⭐ Star' },
          { value: 'fa-tshirt', label: '👕 T-Shirt' },
          { value: 'fa-gem', label: '💎 Gem' },
        ], (v) => { s.icon = v; }),
        textField('Title', s.title, (v) => { s.title = v; })));
      wrap.appendChild(textareaField('Description', s.description, (v) => { s.description = v; }, { rows: 3 }));
      wrap.appendChild(row(
        textField('Price / Starting Price', s.price, (v) => { s.price = v; }, { placeholder: 'From ₦50,000' }),
        el('div', {}, toggleField('Featured on home page', s.featured, (v) => { s.featured = v; }))));
      return wrap;
    },
    () => ({ icon: 'fa-cut', title: 'New Service', description: '', price: '', featured: false }),
    (s) => s.title);

  return el('div', { class: 'panel' },
    el('div', { class: 'panel-head' },
      el('div', {}, el('h2', {}, 'Services & Prices'), el('p', {}, 'Manage your service offerings'))),
    body);
}

/* =========================================
   GALLERY
   ========================================= */
function renderGallery() {
  const list = state.content.gallery;
  const grid = el('div', { class: 'gallery-admin-grid' });

  const refresh = () => {
    grid.innerHTML = '';
    list.forEach((item, i) => {
      const preview = el('div', { class: 'gallery-admin-preview' });
      if (item.image) preview.appendChild(el('img', { src: item.image, alt: item.title }));
      else preview.appendChild(el('i', { class: 'fa fa-image' }));

      const card = el('div', { class: 'gallery-admin-item' },
        preview,
        el('div', { class: 'gallery-admin-body' },
          el('input', { placeholder: 'Title', value: item.title || '',
            onInput: (e) => { item.title = e.target.value; markDirty(); } }),
          el('select', { onChange: (e) => { item.category = e.target.value; markDirty(); } },
            ...['bridal','casual','corporate','occasion','traditional'].map(c =>
              el('option', { value: c, selected: item.category === c }, c.charAt(0).toUpperCase() + c.slice(1))))),
        el('div', { class: 'gallery-admin-actions' },
          el('button', { class: 'btn btn-primary btn-sm', style: 'flex:1',
            onClick: () => openPicker(url => { item.image = url; markDirty(); refresh(); }) },
            el('i', { class: 'fa fa-image' }), ' Photo'),
          el('button', { class: 'btn btn-danger btn-sm',
            onClick: () => { if (confirm('Remove this gallery item?')) { list.splice(i, 1); markDirty(); refresh(); } } },
            el('i', { class: 'fa fa-trash' }))));
      grid.appendChild(card);
    });
  };
  refresh();

  const addBtn = el('button', { class: 'add-btn',
    onClick: () => { list.push({ title: 'New Item', category: 'bridal', image: '', description: '' }); markDirty(); refresh(); } },
    el('i', { class: 'fa fa-plus' }), ' Add Gallery Item');

  return el('div', { class: 'panel' },
    el('div', { class: 'panel-head' },
      el('div', {}, el('h2', {}, 'Gallery Photos'), el('p', {}, 'Click each card to upload or change photos'))),
    grid, addBtn);
}

/* =========================================
   TESTIMONIALS
   ========================================= */
function renderTestimonials() {
  const list = state.content.testimonials;
  const body = listEditor('Testimonial', list,
    (t) => {
      const wrap = el('div');
      wrap.appendChild(row(
        textField('Client Name', t.name, (v) => { t.name = v; }),
        textField('Role / Location', t.role, (v) => { t.role = v; }, { placeholder: 'e.g. Bride — Lagos' })));
      wrap.appendChild(textareaField('Testimonial Text', t.text, (v) => { t.text = v; }, { rows: 4 }));

      // Rating
      const starsWrap = el('div', { class: 'field' }, el('label', {}, 'Rating'));
      const stars = el('div', { class: 'rating-stars' });
      for (let i = 1; i <= 5; i++) {
        const star = el('button', { type: 'button', class: i <= (t.rating || 5) ? 'filled' : '',
          onClick: () => { t.rating = i; markDirty(); starsWrap.replaceWith(renderStars()); } },
          el('i', { class: 'fa fa-star' }));
        stars.appendChild(star);
      }
      const renderStars = () => {
        const sw = el('div', { class: 'field' }, el('label', {}, 'Rating'));
        const s = el('div', { class: 'rating-stars' });
        for (let i = 1; i <= 5; i++) {
          s.appendChild(el('button', { type: 'button', class: i <= (t.rating || 5) ? 'filled' : '',
            onClick: () => { t.rating = i; markDirty(); sw.replaceWith(renderStars()); } },
            el('i', { class: 'fa fa-star' })));
        }
        sw.appendChild(s);
        return sw;
      };
      starsWrap.appendChild(stars);
      wrap.appendChild(starsWrap);
      return wrap;
    },
    () => ({ name: 'New Client', role: '', text: '', rating: 5 }),
    (t) => t.name);

  return el('div', { class: 'panel' },
    el('div', { class: 'panel-head' },
      el('div', {}, el('h2', {}, 'Client Testimonials'), el('p', {}, 'Reviews shown across your website'))),
    body);
}

/* =========================================
   DISCOUNTS
   ========================================= */
function renderDiscounts() {
  const list = state.content.discounts = state.content.discounts || [];
  const body = listEditor('Discount', list,
    (d) => {
      const wrap = el('div');
      wrap.appendChild(row(
        textField('Title', d.title, (v) => { d.title = v; }, { placeholder: 'e.g. Black Friday Special' }),
        textField('Code', d.code, (v) => { d.code = v.toUpperCase(); }, { placeholder: 'BF25' })));
      wrap.appendChild(textareaField('Description', d.description, (v) => { d.description = v; }, { rows: 2 }));
      wrap.appendChild(row(
        textField('Percentage Off', d.percent, (v) => { d.percent = Number(v) || 0; }, { type: 'number', placeholder: '15' }),
        textField('Expires (optional)', d.expiresAt, (v) => { d.expiresAt = v; }, { type: 'date' })));
      wrap.appendChild(toggleField('Active (show on website)', d.active, (v) => { d.active = v; }));
      return wrap;
    },
    () => ({ title: 'New Discount', description: '', code: '', percent: 10, active: false, expiresAt: '' }),
    (d) => d.title + (d.active ? ' · ACTIVE' : ' · paused'));

  return el('div', { class: 'panel' },
    el('div', { class: 'panel-head' },
      el('div', {}, el('h2', {}, 'Discounts & Promotions'), el('p', {}, 'Toggle on/off to show or hide offers on your site'))),
    body);
}

/* =========================================
   FAQ
   ========================================= */
function renderFAQ() {
  const list = state.content.faq = state.content.faq || [];
  const body = listEditor('Question', list,
    (q) => el('div', {},
      textField('Question', q.question, (v) => { q.question = v; }),
      textareaField('Answer', q.answer, (v) => { q.answer = v; }, { rows: 3 })),
    () => ({ question: 'New question?', answer: '' }),
    (q) => q.question);

  return el('div', { class: 'panel' },
    el('div', { class: 'panel-head' },
      el('div', {}, el('h2', {}, 'Frequently Asked Questions'), el('p', {}, 'Shown on the Services page'))),
    body);
}

/* =========================================
   ACCOUNT
   ========================================= */
function renderAccount() {
  const panel = el('div', { class: 'panel' },
    el('div', { class: 'panel-head' },
      el('div', {}, el('h2', {}, 'Change Password'), el('p', {}, 'Keep your admin account secure'))));

  const body = el('div', { class: 'panel-body' });
  const current = el('input', { type: 'password', placeholder: 'Current password' });
  const nw = el('input', { type: 'password', placeholder: 'New password (min 8 chars)' });
  const nw2 = el('input', { type: 'password', placeholder: 'Confirm new password' });
  const btn = el('button', { class: 'btn btn-primary',
    onClick: async () => {
      if (!current.value || !nw.value) return toast('All fields required', 'error');
      if (nw.value !== nw2.value) return toast('Passwords do not match', 'error');
      if (nw.value.length < 8) return toast('Password must be at least 8 characters', 'error');
      btn.disabled = true; btn.textContent = 'Saving…';
      try {
        await api('/api/auth/change-password', { method: 'POST',
          body: JSON.stringify({ currentPassword: current.value, newPassword: nw.value }) });
        current.value = nw.value = nw2.value = '';
        toast('Password changed successfully', 'success');
      } catch (e) { toast(e.message, 'error'); }
      finally { btn.disabled = false; btn.textContent = 'Change Password'; }
    }
  }, 'Change Password');

  [
    el('div', { class: 'field' }, el('label', {}, 'Current Password'), current),
    el('div', { class: 'field' }, el('label', {}, 'New Password'), nw),
    el('div', { class: 'field' }, el('label', {}, 'Confirm New Password'), nw2),
    btn,
  ].forEach(x => body.appendChild(x));
  panel.appendChild(body);
  return panel;
}

/* =========================================
   INIT
   ========================================= */
async function initApp() {
  $('#loginScreen').hidden = true;
  $('#adminApp').hidden = false;
  await loadContent();
  if (state.content) showTab('dashboard');
}

// Login form
$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('#loginBtn');
  btn.disabled = true;
  $('#loginError').textContent = '';
  try {
    await login($('#loginEmail').value, $('#loginPassword').value);
    await initApp();
  } catch (err) {
    $('#loginError').textContent = err.message || 'Login failed';
  } finally {
    btn.disabled = false;
  }
});

// Wire up persistent UI
$('#logoutBtn').addEventListener('click', () => {
  if (state.dirty && !confirm('You have unsaved changes. Sign out anyway?')) return;
  logout();
});
$('#saveAllBtn').addEventListener('click', saveContent);
$$('.nav-item[data-tab]').forEach(b => b.addEventListener('click', () => {
  if (state.dirty && !confirm('Switch tab? Unsaved changes will remain in memory but not saved.')) return;
  showTab(b.dataset.tab);
}));

// Sidebar toggle on mobile
$('#sidebarToggle').addEventListener('click', () => {
  $('.sidebar').classList.add('open');
  const bd = el('div', { class: 'backdrop', onClick: () => {
    $('.sidebar').classList.remove('open');
    bd.remove();
  } });
  document.body.appendChild(bd);
});

// Modal handlers
$('#closeImageModal').addEventListener('click', closePicker);
$('#uploadZone').addEventListener('click', () => $('#fileInput').click());
$('#fileInput').addEventListener('change', (e) => uploadFile(e.target.files[0]));
['dragover', 'dragleave', 'drop'].forEach(ev => {
  $('#uploadZone').addEventListener(ev, (e) => {
    e.preventDefault(); e.stopPropagation();
    if (ev === 'dragover') $('#uploadZone').classList.add('dragover');
    if (ev === 'dragleave') $('#uploadZone').classList.remove('dragover');
    if (ev === 'drop') {
      $('#uploadZone').classList.remove('dragover');
      uploadFile(e.dataTransfer.files[0]);
    }
  });
});

// Warn on unload if dirty
window.addEventListener('beforeunload', (e) => {
  if (state.dirty) { e.preventDefault(); e.returnValue = ''; }
});

// Check existing token on load
if (state.token) {
  // Try to load content; if 401, clear and show login
  loadContent().then(() => {
    if (state.content) initApp();
    else logout();
  }).catch(() => logout());
}
