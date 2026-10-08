// ============================================================
//  STUDENT PORTFOLIO — script.js
//  Admin/Viewer Mode | LocalStorage Persistence | Full CRUD
// ============================================================

'use strict';

/* ── Constants ── */
const ADMIN_PASSWORD = 'kurtdcit26';
const LS_PROFILE_KEY = 'portfolio_profile';
const LS_WORKS_KEY   = 'portfolio_works';
const LS_VERSION_KEY = 'portfolio_version';
const DATA_VERSION   = '1.2'; // bump this whenever defaults change

/* ── Default Data ── */
const DEFAULT_PROFILE = {
  name:    'Kurt Joshua Alcayde',
  degree:  'Bachelor of Science in Computer Science',
  bio:     'I am a 3rd-year Bachelor of Science in Computer Science student at Cavite State University - Silang Campus.',
  photo:   null,
  github:  '',
  linkedin:'',
  email:   '',
  phone:   '',
  school:  'Cavite State University - Silang Campus',
  year:    '3rd Year Student',
};

const DEFAULT_WORKS = [];

/* ── State ── */
let state = {
  isAdmin:          false,
  activeTab:        'profile',
  activeFilter:     'all',
  searchQuery:      '',
  editingWorkId:    null,
  previewingWorkId: null,
  profile:          null,
  works:            [],
};

/* ── LocalStorage Helpers ── */
function loadData() {
  try {
    // Reset to defaults if data version has changed
    const storedVersion = localStorage.getItem(LS_VERSION_KEY);
    if (storedVersion !== DATA_VERSION) {
      localStorage.removeItem(LS_PROFILE_KEY);
      localStorage.removeItem(LS_WORKS_KEY);
      localStorage.setItem(LS_VERSION_KEY, DATA_VERSION);
    }
    const p = localStorage.getItem(LS_PROFILE_KEY);
    const w = localStorage.getItem(LS_WORKS_KEY);
    state.profile = p ? JSON.parse(p) : { ...DEFAULT_PROFILE };
    state.works   = w ? JSON.parse(w) : DEFAULT_WORKS.map(x => ({ ...x }));
  } catch {
    state.profile = { ...DEFAULT_PROFILE };
    state.works   = DEFAULT_WORKS.map(x => ({ ...x }));
  }
}

function saveProfile() {
  localStorage.setItem(LS_PROFILE_KEY, JSON.stringify(state.profile));
}

function saveWorks() {
  localStorage.setItem(LS_WORKS_KEY, JSON.stringify(state.works));
}

function generateId() {
  return 'w' + Date.now() + Math.random().toString(36).slice(2, 6);
}

/* ── DOM Helpers ── */
const $ = id => document.getElementById(id);
const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls)  e.className = cls;
  if (html) e.innerHTML = html;
  return e;
};

/* ── Toast ── */
function showToast(msg, type = 'success') {
  const container = $('toast-container');
  const toast = el('div', `toast ${type}`);
  toast.innerHTML = `<span class="toast-dot"></span>${msg}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease both';
    setTimeout(() => toast.remove(), 320);
  }, 3000);
}

/* ── Format date ── */
function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

/* ── Nav Scroll Effect ── */
window.addEventListener('scroll', () => {
  document.querySelector('.navbar').classList.toggle('scrolled', window.scrollY > 10);
});

/* ── Tab Switching ── */
function switchTab(tab) {
  state.activeTab = tab;
  document.querySelectorAll('.nav-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tab);
  });
  document.querySelectorAll('.tab-panel').forEach(p => {
    p.classList.toggle('active', p.id === `panel-${tab}`);
  });
  // Update mobile drawer tabs too
  document.querySelectorAll('.drawer-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tab);
  });
}

/* ── Hamburger ── */
function toggleDrawer() {
  const drawer = $('nav-drawer');
  drawer.classList.toggle('open');
}

/* ── Admin Mode ── */
function openAdminModal() {
  if (state.isAdmin) {
    exitAdmin();
    return;
  }
  $('admin-pw-input').value = '';
  $('pw-error').classList.remove('visible');
  openModal('modal-admin');
  setTimeout(() => $('admin-pw-input').focus(), 100);
}

function submitAdminLogin() {
  const pw = $('admin-pw-input').value.trim();
  if (pw === ADMIN_PASSWORD) {
    closeModal('modal-admin');
    enterAdmin();
  } else {
    $('pw-error').classList.add('visible');
    $('admin-pw-input').value = '';
    $('admin-pw-input').focus();
    $('admin-pw-input').classList.add('shake');
    setTimeout(() => $('admin-pw-input').classList.remove('shake'), 400);
  }
}

function enterAdmin() {
  state.isAdmin = true;
  document.body.classList.add('admin-mode');
  $('btn-admin').classList.add('active');
  $('btn-admin').querySelector('span').textContent = 'Exit Admin';
  $('admin-badge').classList.add('visible');
  renderProfile();
  showToast('Admin mode activated. Full controls unlocked.', 'success');
}

function exitAdmin() {
  state.isAdmin = false;
  document.body.classList.remove('admin-mode');
  $('btn-admin').classList.remove('active');
  $('btn-admin').querySelector('span').textContent = 'Admin Access';
  $('admin-badge').classList.remove('visible');
  renderProfile();
  showToast('Exited admin mode.', 'success');
}

/* ── Modals ── */
function openModal(id) {
  const overlay = $(id);
  overlay.classList.add('open');
  overlay.querySelector('.modal').style.animation = 'none';
  requestAnimationFrame(() => {
    overlay.querySelector('.modal').style.animation = '';
  });
}

function closeModal(id) {
  $(id).classList.remove('open');
}

// Close modal on overlay click
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});

// ESC to close modals
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  }
  if (e.key === 'Enter' && $('modal-admin').classList.contains('open')) {
    submitAdminLogin();
  }
});

/* ── Password toggle ── */
function togglePwVisibility() {
  const input = $('admin-pw-input');
  const btn   = $('pw-toggle-btn');
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';
  } else {
    input.type = 'password';
    btn.textContent = '👁';
  }
}

/* ── Profile Rendering ── */
function renderProfile() {
  const p = state.profile;

  // Name & bio display
  $('profile-name-display').textContent = p.name || 'Your Name';
  $('profile-bio-display').textContent  = p.bio  || 'Your bio goes here.';
  $('profile-degree-tag').textContent   = p.degree || '';

  // Stats (derived from works)
  const exams      = state.works.filter(w => w.category === 'exam').length;
  const quizzes    = state.works.filter(w => w.category === 'quiz').length;
  const activities = state.works.filter(w => w.category === 'activity').length;
  $('stat-exams').textContent      = exams;
  $('stat-quizzes').textContent    = quizzes;
  $('stat-activities').textContent = activities;

  // Info cards
  $('info-school').textContent = p.school || '—';
  $('info-year').textContent   = p.year   || '—';
  $('info-degree').textContent = p.degree || '—';

  // Photo
  if (p.photo) {
    $('profile-photo').src = p.photo;
    $('profile-photo').classList.remove('hidden');
    $('photo-placeholder').classList.add('hidden');
  } else {
    $('profile-photo').classList.add('hidden');
    $('photo-placeholder').classList.remove('hidden');
  }

  // Contact pills
  renderContactPills(p);

  // Edit fields (pre-fill)
  if (state.isAdmin) {
    $('edit-name').value     = p.name     || '';
    $('edit-bio').value      = p.bio      || '';
    $('edit-degree').value   = p.degree   || '';
    $('edit-school').value   = p.school   || '';
    $('edit-year').value     = p.year     || '';
    $('edit-github').value   = p.github   || '';
    $('edit-linkedin').value = p.linkedin || '';
    $('edit-email').value    = p.email    || '';
    $('edit-phone').value    = p.phone    || '';
  }
}

function renderContactPills(p) {
  const container = $('profile-contacts');
  container.innerHTML = '';
  const links = [
    { label: p.email, href: `mailto:${p.email}`, icon: '✉️' },
    { label: p.phone, href: `tel:${p.phone}`, icon: '📞' },
    { label: 'GitHub',   href: p.github,   icon: '🐙', external: true },
    { label: 'LinkedIn', href: p.linkedin, icon: '💼', external: true },
  ];
  links.forEach(({ label, href, icon, external }) => {
    if (!label) return;
    const a = document.createElement('a');
    a.className = 'contact-pill';
    a.href = href || '#';
    if (external) a.target = '_blank';
    a.innerHTML = `${icon} ${label}`;
    container.appendChild(a);
  });
}

function saveProfileChanges() {
  if (!state.isAdmin) return;
  state.profile = {
    ...state.profile,
    name:     $('edit-name').value.trim(),
    bio:      $('edit-bio').value.trim(),
    degree:   $('edit-degree').value.trim(),
    school:   $('edit-school').value.trim(),
    year:     $('edit-year').value.trim(),
    github:   $('edit-github').value.trim(),
    linkedin: $('edit-linkedin').value.trim(),
    email:    $('edit-email').value.trim(),
    phone:    $('edit-phone').value.trim(),
  };
  saveProfile();
  renderProfile();
  showToast('Profile saved successfully!', 'success');
}

/* ── Photo Upload ── */
function triggerPhotoUpload() {
  $('photo-file-input').click();
}

$('photo-file-input').addEventListener('change', function () {
  const file = this.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    state.profile.photo = e.target.result;
    saveProfile();
    renderProfile();
    showToast('Profile photo updated!', 'success');
  };
  reader.readAsDataURL(file);
});

/* ── Works Rendering ── */
function getFilteredWorks() {
  return state.works.filter(w => {
    const matchCat    = state.activeFilter === 'all' || w.category === state.activeFilter;
    const q           = state.searchQuery.toLowerCase();
    const matchSearch = !q || w.title.toLowerCase().includes(q) || (w.description || '').toLowerCase().includes(q);
    return matchCat && matchSearch;
  });
}

function renderWorks() {
  const grid = $('works-grid');
  grid.innerHTML = '';

  // Update filter counts
  const counts = {
    all:      state.works.length,
    exam:     state.works.filter(w => w.category === 'exam').length,
    quiz:     state.works.filter(w => w.category === 'quiz').length,
    activity: state.works.filter(w => w.category === 'activity').length,
  };
  document.querySelectorAll('.filter-pill').forEach(btn => {
    const key = btn.dataset.filter;
    const countEl = btn.querySelector('.filter-count');
    if (countEl) countEl.textContent = counts[key] ?? '';
  });

  const filtered = getFilteredWorks();

  if (filtered.length === 0) {
    const empty = el('div', 'empty-state');
    empty.innerHTML = `
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
      <h3>No works found</h3>
      <p>${state.searchQuery ? 'Try a different search term.' : 'No items in this category yet.'}</p>
    `;
    grid.appendChild(empty);
    return;
  }

  filtered.forEach((work, idx) => {
    const card = buildWorkCard(work, idx);
    grid.appendChild(card);
  });
}

function buildWorkCard(work, idx) {
  const card = el('div', 'work-card');
  card.dataset.category = work.category;
  card.dataset.id = work.id;
  card.style.animationDelay = `${idx * 50}ms`;

  const badgeClass = `badge-${work.category}`;
  const categoryLabel = work.category.charAt(0).toUpperCase() + work.category.slice(1);

  card.innerHTML = `
    <div class="card-header">
      <span class="card-category-badge ${badgeClass}">${categoryLabel}</span>
      <div class="card-actions">
        <button class="card-action-btn edit" title="Edit" onclick="openEditWork('${work.id}')">✏️</button>
        <button class="card-action-btn delete" title="Delete" onclick="confirmDeleteWork('${work.id}')">🗑️</button>
      </div>
    </div>
    <div class="card-title">${escapeHtml(work.title)}</div>
    <div class="card-date">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      ${formatDate(work.date)}
    </div>
    <div class="card-description">${escapeHtml(work.description)}</div>
    <div class="card-footer">
      <button class="btn-preview" onclick="openPreview('${work.id}')">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        Preview
      </button>
      <button class="btn-download" onclick="downloadWork('${work.id}')">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Download
      </button>
    </div>
  `;
  return card;
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ── Download Work ── */
function downloadWork(id) {
  const work = state.works.find(w => w.id === id);
  if (!work) return;
  if (work.file) {
    const a = document.createElement('a');
    a.href     = work.file;
    a.download = work.fileName || 'file';
    a.click();
  } else {
    showToast(`"${work.fileName || 'This item'}" — No file attached yet.`, 'success');
  }
}

/* ── Download from inside Preview Modal ── */
function downloadWorkById() {
  if (state.previewingWorkId) downloadWork(state.previewingWorkId);
}

/* ── Preview Work ── */
function getFileType(fileName) {
  if (!fileName) return 'unknown';
  const ext = fileName.split('.').pop().toLowerCase();
  if (['jpg','jpeg','png','gif','webp','svg','bmp'].includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  if (['mp4','webm','ogg'].includes(ext)) return 'video';
  if (['mp3','wav','ogg','m4a'].includes(ext)) return 'audio';
  return 'other';
}

function getFileIcon(type) {
  return { image: '🖼️', pdf: '📕', video: '🎬', audio: '🎵', other: '📄' }[type] || '📄';
}

function openPreview(id) {
  const work = state.works.find(w => w.id === id);
  if (!work) return;

  state.previewingWorkId = id;

  const fileType = getFileType(work.fileName);
  const icon     = getFileIcon(fileType);
  const body     = $('preview-body');

  $('preview-modal-title').textContent    = work.title;
  $('preview-modal-subtitle').textContent = work.fileName || '';
  $('preview-file-icon').textContent      = icon;

  // Clear previous content
  body.innerHTML = '';

  if (!work.file) {
    body.innerHTML = `
      <div class="preview-unavailable">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
        <h3>No file attached</h3>
        <p>This item doesn't have a file uploaded yet.</p>
      </div>`;
  } else if (fileType === 'image') {
    const img = document.createElement('img');
    img.src = work.file;
    img.alt = work.title;
    img.className = 'preview-image';
    body.appendChild(img);
  } else if (fileType === 'pdf') {
    const iframe = document.createElement('iframe');
    iframe.src = work.file;
    iframe.className = 'preview-iframe';
    iframe.title = work.title;
    body.appendChild(iframe);
  } else if (fileType === 'video') {
    const video = document.createElement('video');
    video.src = work.file;
    video.controls = true;
    video.className = 'preview-video';
    body.appendChild(video);
  } else if (fileType === 'audio') {
    body.innerHTML = `
      <div class="preview-audio-wrap">
        <div class="preview-audio-icon">🎵</div>
        <p class="preview-audio-name">${escapeHtml(work.fileName)}</p>
        <audio controls src="${work.file}" class="preview-audio"></audio>
      </div>`;
  } else {
    body.innerHTML = `
      <div class="preview-unavailable">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <h3>Preview not available</h3>
        <p>This file type cannot be previewed in the browser.<br/>Use the Download button to open it.</p>
        <button class="btn btn-primary" style="margin-top:16px" onclick="downloadWorkById()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download File
        </button>
      </div>`;
  }

  openModal('modal-preview');
}

/* ── Filter ── */
function setFilter(filter) {
  state.activeFilter = filter;
  document.querySelectorAll('.filter-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });
  renderWorks();
}

/* ── Search ── */
$('works-search-input').addEventListener('input', function () {
  state.searchQuery = this.value;
  renderWorks();
});

/* ── Add / Edit Work Modal ── */
function openAddWork() {
  if (!state.isAdmin) return;
  state.editingWorkId = null;
  $('work-modal-title').textContent    = 'Add School Work';
  $('work-modal-subtitle').textContent = 'Fill in the details for the new item.';
  $('work-modal-icon').textContent     = '📄';
  $('work-form').reset();
  $('upload-file-name').textContent = '';
  $('selected-file-display').style.display = 'none';
  openModal('modal-work');
}

function openEditWork(id) {
  if (!state.isAdmin) return;
  const work = state.works.find(w => w.id === id);
  if (!work) return;
  state.editingWorkId = id;

  $('work-modal-title').textContent    = 'Edit School Work';
  $('work-modal-subtitle').textContent = 'Update the details below.';
  $('work-modal-icon').textContent     = '✏️';

  $('work-title').value       = work.title;
  $('work-category').value    = work.category;
  $('work-date').value        = work.date;
  $('work-description').value = work.description;

  if (work.fileName) {
    $('upload-file-name').textContent       = work.fileName;
    $('selected-file-display').style.display = 'block';
  } else {
    $('upload-file-name').textContent       = '';
    $('selected-file-display').style.display = 'none';
  }

  openModal('modal-work');
}

function submitWorkForm() {
  const title    = $('work-title').value.trim();
  const category = $('work-category').value;
  const date     = $('work-date').value;
  const desc     = $('work-description').value.trim();

  if (!title || !category || !date) {
    showToast('Please fill in all required fields.', 'error');
    return;
  }

  const fileInput = $('work-file-input');
  const file = fileInput.files[0];

  function finalize(fileData, fileName) {
    if (state.editingWorkId) {
      // Edit
      const idx = state.works.findIndex(w => w.id === state.editingWorkId);
      if (idx !== -1) {
        state.works[idx] = {
          ...state.works[idx],
          title, category, date,
          description: desc,
          ...(fileData !== undefined ? { file: fileData, fileName } : {}),
        };
      }
      showToast('Work updated successfully!', 'success');
    } else {
      // Add
      state.works.unshift({
        id: generateId(),
        title, category, date,
        description: desc,
        file: fileData || null,
        fileName: fileName || (title + '.pdf'),
      });
      showToast('Work added successfully!', 'success');
    }
    saveWorks();
    closeModal('modal-work');
    renderWorks();
    renderProfile(); // update stats
  }

  if (file) {
    const reader = new FileReader();
    reader.onload = e => finalize(e.target.result, file.name);
    reader.readAsDataURL(file);
  } else {
    finalize(undefined, undefined);
  }
}

/* ── File Upload UX ── */
const uploadZone = $('upload-zone');
const workFileInput = $('work-file-input');

uploadZone.addEventListener('click', () => workFileInput.click());

workFileInput.addEventListener('change', function () {
  if (this.files[0]) {
    $('upload-file-name').textContent        = this.files[0].name;
    $('selected-file-display').style.display = 'block';
  }
});

uploadZone.addEventListener('dragover', e => {
  e.preventDefault();
  uploadZone.classList.add('dragover');
});
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file) {
    const dt = new DataTransfer();
    dt.items.add(file);
    workFileInput.files = dt.files;
    $('upload-file-name').textContent        = file.name;
    $('selected-file-display').style.display = 'block';
  }
});

/* ── Delete Work ── */
let pendingDeleteId = null;

function confirmDeleteWork(id) {
  if (!state.isAdmin) return;
  pendingDeleteId = id;
  const work = state.works.find(w => w.id === id);
  $('delete-confirm-title').textContent = `"${work ? work.title : 'this item'}"`;
  openModal('modal-delete');
}

function executeDelete() {
  if (!pendingDeleteId) return;
  state.works = state.works.filter(w => w.id !== pendingDeleteId);
  pendingDeleteId = null;
  saveWorks();
  closeModal('modal-delete');
  renderWorks();
  renderProfile();
  showToast('Item deleted.', 'success');
}



/* ── Init ── */
function init() {
  loadData();
  renderProfile();
  renderWorks();

  // Attach tab listeners
  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
      $('nav-drawer').classList.remove('open');
    });
  });

  // Attach filter listeners
  document.querySelectorAll('.filter-pill').forEach(btn => {
    btn.addEventListener('click', () => setFilter(btn.dataset.filter));
  });
}

document.addEventListener('DOMContentLoaded', init);
