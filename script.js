// ============================================================
//  STUDENT PORTFOLIO — script.js
//  Firebase Firestore Realtime Sync | Admin/Viewer Mode | Full CRUD
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  setDoc as setDocWork, 
  deleteDoc, 
  onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/* ── Firebase Configuration ── */
const firebaseConfig = {
  apiKey: "AIzaSyC-MuR4A-8nn9qAPuRO1hzR7uGSEMP18tI",
  authDomain: "alcaydekurt-portfolio.firebaseapp.com",
  projectId: "alcaydekurt-portfolio",
  storageBucket: "alcaydekurt-portfolio.firebasestorage.app",
  messagingSenderId: "257975218911",
  appId: "1:257975218911:web:d5a7e0dd3db65f4a49ef6a"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

const PROFILE_DOC_ID = 'main_profile';
const WORKS_COLLECTION = 'school_works';

/* ── Constants ── */
const ADMIN_PASSWORD = 'kurtdcit26';
const LS_PROFILE_KEY = 'portfolio_profile';
const LS_WORKS_KEY   = 'portfolio_works';

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
  profile:          { ...DEFAULT_PROFILE },
  works:            [],
};

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
  if (!container) return;
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
  const navbar = document.querySelector('.navbar');
  if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 10);
});

/* ── Tab Switching ── */
function switchTab(tab) {
  state.activeTab = tab;
  // Synchronize all tab buttons (desktop, drawer, mobile bottom bar)
  document.querySelectorAll('[data-tab]').forEach(t => {
    const isActive = t.dataset.tab === tab;
    t.classList.toggle('active', isActive);
    if (t.hasAttribute('aria-selected')) {
      t.setAttribute('aria-selected', isActive ? 'true' : 'false');
    }
  });
  // Switch tab panels
  document.querySelectorAll('.tab-panel').forEach(p => {
    p.classList.toggle('active', p.id === `panel-${tab}`);
  });
  // Smooth scroll to top on tab switch
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── Hamburger & Mobile Drawer ── */
function toggleDrawer(forceClose = false) {
  const drawer = $('nav-drawer');
  const hamburger = $('nav-hamburger');
  if (!drawer) return;
  if (forceClose) {
    drawer.classList.remove('open');
    if (hamburger) {
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    }
  } else {
    const isOpen = drawer.classList.toggle('open');
    if (hamburger) {
      hamburger.classList.toggle('open', isOpen);
      hamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }
  }
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
  const btn = $('btn-admin');
  if (btn) {
    btn.classList.add('active');
    const span = btn.querySelector('span');
    if (span) span.textContent = 'Exit Admin';
  }
  const drawerBtn = $('drawer-btn-admin');
  if (drawerBtn) {
    drawerBtn.classList.add('active');
    const drawerSpan = $('drawer-admin-text');
    if (drawerSpan) drawerSpan.textContent = 'Exit Admin';
  }
  const badge = $('admin-badge');
  if (badge) badge.classList.add('visible');
  renderProfile();
  showToast('Admin mode activated. Full controls unlocked.', 'success');
}

function exitAdmin() {
  state.isAdmin = false;
  document.body.classList.remove('admin-mode');
  const btn = $('btn-admin');
  if (btn) {
    btn.classList.remove('active');
    const span = btn.querySelector('span');
    if (span) span.textContent = 'Admin Access';
  }
  const drawerBtn = $('drawer-btn-admin');
  if (drawerBtn) {
    drawerBtn.classList.remove('active');
    const drawerSpan = $('drawer-admin-text');
    if (drawerSpan) drawerSpan.textContent = 'Admin Access';
  }
  const badge = $('admin-badge');
  if (badge) badge.classList.remove('visible');
  renderProfile();
  showToast('Exited admin mode.', 'success');
}

/* ── Modals ── */
function openModal(id) {
  const overlay = $(id);
  if (!overlay) return;
  overlay.classList.add('open');
  const modal = overlay.querySelector('.modal');
  if (modal) {
    modal.style.animation = 'none';
    requestAnimationFrame(() => {
      modal.style.animation = '';
    });
  }
}

function closeModal(id) {
  const overlay = $(id);
  if (overlay) overlay.classList.remove('open');
}

// Close modal on overlay click
document.addEventListener('click', e => {
  if (e.target && e.target.classList && e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});

// ESC to close modals
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  }
  if (e.key === 'Enter') {
    const adminModal = $('modal-admin');
    if (adminModal && adminModal.classList.contains('open')) {
      submitAdminLogin();
    }
  }
});

/* ── Password toggle ── */
function togglePwVisibility() {
  const input = $('admin-pw-input');
  const btn   = $('pw-toggle-btn');
  if (!input || !btn) return;
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
  if (!container) return;
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

/* ── Save Profile to Firestore & LocalStorage ── */
async function saveProfileChanges() {
  if (!state.isAdmin) return;
  const updatedProfile = {
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

  state.profile = updatedProfile;
  localStorage.setItem(LS_PROFILE_KEY, JSON.stringify(updatedProfile));
  renderProfile();

  try {
    const profileRef = doc(db, 'portfolio', PROFILE_DOC_ID);
    await setDoc(profileRef, updatedProfile, { merge: true });
    showToast('Profile saved & synced to cloud!', 'success');
  } catch (error) {
    console.error('Error saving profile to Firestore:', error);
    showToast('Saved locally (Firestore error: ' + error.message + ')', 'error');
  }
}

/* ── Photo Upload ── */
function triggerPhotoUpload() {
  $('photo-file-input').click();
}

$('photo-file-input').addEventListener('change', function () {
  const file = this.files[0];
  if (!file) return;

  // Compress / resize image if needed before saving base64 to avoid Firestore 1MB document limit
  const reader = new FileReader();
  reader.onload = async e => {
    const rawDataUrl = e.target.result;
    
    // Scale image down if high resolution
    resizeImage(rawDataUrl, 400, 400, async (compressedUrl) => {
      state.profile.photo = compressedUrl;
      localStorage.setItem(LS_PROFILE_KEY, JSON.stringify(state.profile));
      renderProfile();

      try {
        const profileRef = doc(db, 'portfolio', PROFILE_DOC_ID);
        await setDoc(profileRef, { photo: compressedUrl }, { merge: true });
        showToast('Profile photo updated & synced!', 'success');
      } catch (err) {
        console.error('Firestore photo save error:', err);
        showToast('Photo saved locally (Cloud sync failed)', 'error');
      }
    });
  };
  reader.readAsDataURL(file);
});

// Helper to keep profile image lightweight for instant cross-device sync
function resizeImage(dataUrl, maxWidth, maxHeight, callback) {
  const img = new Image();
  img.onload = () => {
    let width = img.width;
    let height = img.height;

    if (width > height) {
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
    } else {
      if (height > maxHeight) {
        width = Math.round((width * maxHeight) / height);
        height = maxHeight;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);
    callback(canvas.toDataURL('image/jpeg', 0.82));
  };
  img.src = dataUrl;
}

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
  if (!grid) return;
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
  $('work-description').value = work.description || '';

  if (work.fileName) {
    $('upload-file-name').textContent       = work.fileName;
    $('selected-file-display').style.display = 'block';
  } else {
    $('upload-file-name').textContent       = '';
    $('selected-file-display').style.display = 'none';
  }

  openModal('modal-work');
}

async function submitWorkForm() {
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

  async function finalize(fileData, fileName) {
    if (state.editingWorkId) {
      // Edit
      const workId = state.editingWorkId;
      const idx = state.works.findIndex(w => w.id === workId);
      const existing = idx !== -1 ? state.works[idx] : {};
      const updatedWork = {
        ...existing,
        id: workId,
        title,
        category,
        date,
        description: desc,
        ...(fileData !== undefined ? { file: fileData, fileName } : {})
      };

      if (idx !== -1) state.works[idx] = updatedWork;

      try {
        await setDocWork(doc(db, WORKS_COLLECTION, workId), updatedWork);
        showToast('Work updated & synced across devices!', 'success');
      } catch (err) {
        console.error('Error updating work in Firestore:', err);
        showToast('Saved locally (Sync error)', 'error');
      }
    } else {
      // Add
      const newId = 'w_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      const newWork = {
        id: newId,
        title,
        category,
        date,
        description: desc,
        file: fileData || null,
        fileName: fileName || (file ? file.name : (title + '.pdf')),
        createdAt: Date.now()
      };

      state.works.unshift(newWork);

      try {
        await setDocWork(doc(db, WORKS_COLLECTION, newId), newWork);
        showToast('Work added & synced across all devices!', 'success');
      } catch (err) {
        console.error('Error adding work to Firestore:', err);
        showToast('Saved locally (Sync error)', 'error');
      }
    }

    localStorage.setItem(LS_WORKS_KEY, JSON.stringify(state.works));
    closeModal('modal-work');
    renderWorks();
    renderProfile();
  }

  if (file) {
    // Check file size (Firestore documents have 1MB limit for inline base64)
    if (file.size > 850 * 1024) {
      showToast('Notice: For files over 850KB, consider smaller files or compressed PDFs for Firestore.', 'error');
    }
    const reader = new FileReader();
    reader.onload = e => finalize(e.target.result, file.name);
    reader.readAsDataURL(file);
  } else {
    finalize(undefined, undefined);
  }
}

/* ── Delete Work ── */
let pendingDeleteId = null;

function confirmDeleteWork(id) {
  if (!state.isAdmin) return;
  pendingDeleteId = id;
  const work = state.works.find(w => w.id === id);
  $('delete-confirm-title').textContent = `"${work ? work.title : 'this item'}"`;
  openModal('modal-delete');
}

async function executeDelete() {
  if (!pendingDeleteId) return;
  const idToDelete = pendingDeleteId;
  state.works = state.works.filter(w => w.id !== idToDelete);
  pendingDeleteId = null;

  localStorage.setItem(LS_WORKS_KEY, JSON.stringify(state.works));
  closeModal('modal-delete');
  renderWorks();
  renderProfile();

  try {
    await deleteDoc(doc(db, WORKS_COLLECTION, idToDelete));
    showToast('Item deleted across all devices.', 'success');
  } catch (err) {
    console.error('Error deleting from Firestore:', err);
    showToast('Deleted locally (Sync error)', 'error');
  }
}

/* ── Setup File Upload UX ── */
function setupUploadUX() {
  const uploadZone = $('upload-zone');
  const workFileInput = $('work-file-input');

  if (uploadZone && workFileInput) {
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
  }
}

/* ── Real-time Firestore Listeners ── */
function setupFirestoreListeners() {
  // 1. Profile real-time sync
  try {
    const profileRef = doc(db, 'portfolio', PROFILE_DOC_ID);
    onSnapshot(profileRef, snapshot => {
      if (snapshot.exists()) {
        state.profile = { ...DEFAULT_PROFILE, ...snapshot.data() };
        localStorage.setItem(LS_PROFILE_KEY, JSON.stringify(state.profile));
        renderProfile();
      } else {
        // Create initial profile in Firestore if not existing yet
        setDoc(profileRef, DEFAULT_PROFILE);
      }
    }, err => {
      console.warn('Firestore profile listener notice:', err);
    });
  } catch (err) {
    console.error('Profile listener init error:', err);
  }

  // 2. School works real-time sync
  try {
    const worksCollectionRef = collection(db, WORKS_COLLECTION);
    onSnapshot(worksCollectionRef, snapshot => {
      const worksList = [];
      snapshot.forEach(docSnap => {
        worksList.push({ id: docSnap.id, ...docSnap.data() });
      });
      // Sort newest first
      worksList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      
      if (worksList.length > 0 || snapshot.metadata.hasPendingWrites === false) {
        state.works = worksList;
        localStorage.setItem(LS_WORKS_KEY, JSON.stringify(worksList));
        renderWorks();
        renderProfile();
      }
    }, err => {
      console.warn('Firestore works listener notice:', err);
    });
  } catch (err) {
    console.error('Works listener init error:', err);
  }
}

/* ── Local Fallback Loader ── */
function loadLocalFallback() {
  try {
    const p = localStorage.getItem(LS_PROFILE_KEY);
    const w = localStorage.getItem(LS_WORKS_KEY);
    if (p) state.profile = JSON.parse(p);
    if (w) state.works   = JSON.parse(w);
  } catch (e) {
    console.warn('LocalStorage parse notice:', e);
  }
}

/* ── Expose functions to global window for HTML onclick handlers ── */
window.switchTab            = switchTab;
window.toggleDrawer         = toggleDrawer;
window.openAdminModal       = openAdminModal;
window.submitAdminLogin     = submitAdminLogin;
window.exitAdmin            = exitAdmin;
window.openModal            = openModal;
window.closeModal           = closeModal;
window.togglePwVisibility   = togglePwVisibility;
window.saveProfileChanges   = saveProfileChanges;
window.triggerPhotoUpload   = triggerPhotoUpload;
window.openAddWork          = openAddWork;
window.openEditWork         = openEditWork;
window.submitWorkForm       = submitWorkForm;
window.confirmDeleteWork    = confirmDeleteWork;
window.executeDelete        = executeDelete;
window.downloadWork         = downloadWork;
window.downloadWorkById     = downloadWorkById;
window.openPreview          = openPreview;
window.setFilter            = setFilter;

/* ── Init ── */
function init() {
  loadLocalFallback();
  renderProfile();
  renderWorks();
  setupUploadUX();

  // Search input
  const searchInput = $('works-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      state.searchQuery = this.value;
      renderWorks();
    });
  }

  // Attach tab listeners
  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
      toggleDrawer(true);
    });
  });

  // Close drawer when clicking outside
  document.addEventListener('click', e => {
    const drawer = $('nav-drawer');
    const hamburger = $('nav-hamburger');
    if (drawer && drawer.classList.contains('open')) {
      if (!drawer.contains(e.target) && !hamburger.contains(e.target)) {
        toggleDrawer(true);
      }
    }
  });

  // Attach filter listeners
  document.querySelectorAll('.filter-pill').forEach(btn => {
    btn.addEventListener('click', () => setFilter(btn.dataset.filter));
  });

  // Start real-time Firestore sync
  setupFirestoreListeners();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
