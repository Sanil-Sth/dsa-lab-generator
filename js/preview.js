/**
 * js/preview.js
 * DSA Lab Report Generator — St. Xavier's College
 * Live A4 cover page preview: populates DOM, scales inner pages to fit viewport,
 * and updates in real-time as the user changes form fields.
 *
 * Dependencies: data.js (STUDENTS, DSA_LABS, BANNER_B64, LOGO_B64, getToday)
 * Exports: initPreview(), updateCoverPreview()
 */

/* ── SCALE ALL A4 INNERS TO FIT THEIR VIEWPORTS ─────────────────────────── */
/**
 * Reads each .a4-viewport width and sets a CSS transform scale on its
 * child .a4-inner (or .op-inner) so the 794px-wide inner fits exactly.
 * Called on load and on every resize event.
 */
function scaleAllPages() {
  document.querySelectorAll('.a4-viewport').forEach(viewport => {
    const inner = viewport.querySelector('.a4-inner, .op-inner');
    if (!inner) return;
    const scale = viewport.offsetWidth / 794;
    inner.style.transform = `scale(${scale})`;
  });
}

/* ── POPULATE STUDENT DROPDOWN ───────────────────────────────────────────── */
function populateStudentDropdown() {
  const sel = document.getElementById('studentSelect');
  STUDENTS.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.roll;
    opt.textContent = `${s.roll} · ${s.name}`;
    sel.appendChild(opt);
  });
}

/* ── SET IMAGES ──────────────────────────────────────────────────────────── */
function setImages() {
  document.getElementById('cvBanner').src = 'data:image/png;base64,' + BANNER_B64;
  document.getElementById('cvLogo').src   = 'data:image/jpeg;base64,' + LOGO_B64;
}

/* ── UPDATE COVER PREVIEW ────────────────────────────────────────────────── */
/**
 * Reads current form values and updates all preview DOM elements.
 * Also enables/disables download buttons based on completeness.
 */
function updateCoverPreview() {
  const rollVal  = document.getElementById('studentSelect').value;
  const labNo    = document.getElementById('labNoSelect').value;
  const title    = document.getElementById('labTitleInput').value.trim();

  const student  = STUDENTS.find(s => s.roll === rollVal) || null;

  /* ── Lab Number ── */
  const labNoEl  = document.getElementById('cvLabNo');
  labNoEl.textContent = labNo
    ? `LAB ASSIGNMENT ${labNo}`
    : 'LAB ASSIGNMENT ___';

  /* ── Title ── */
  const titleEl  = document.getElementById('cvTitle');
  if (title) {
    titleEl.textContent  = title.toUpperCase();
    titleEl.style.color  = '#111';
  } else {
    titleEl.textContent  = '[ lab title ]';
    titleEl.style.color  = '#bbb';
  }

  /* ── Student info ── */
  const nameEl    = document.getElementById('cvName');
  const rollEl    = document.getElementById('cvRoll');
  const sectionEl = document.getElementById('cvSection');

  if (student) {
    nameEl.textContent    = student.name;
    rollEl.textContent    = student.roll;
    sectionEl.textContent = student.section;
    [nameEl, rollEl, sectionEl].forEach(el => el.classList.remove('cv-ph'));
  } else {
    nameEl.textContent    = '___';
    rollEl.textContent    = '___';
    sectionEl.textContent = '___';
    [nameEl, rollEl, sectionEl].forEach(el => el.classList.add('cv-ph'));
  }

  /* ── Enable/disable download buttons ── */
  const ready = !!(student && labNo && title);
  document.getElementById('dlPdfBtn').disabled  = !ready;
}

/* ── LAB NUMBER → AUTO-FILL TITLE ───────────────────────────────────────── */
function handleLabNoChange() {
  const labNo    = document.getElementById('labNoSelect').value;
  const titleInput = document.getElementById('labTitleInput');

  if (labNo && DSA_LABS[parseInt(labNo)] !== undefined) {
    const predefined = DSA_LABS[parseInt(labNo)];
    titleInput.value = predefined; // may be empty string for labs 10–13
    if (predefined) {
      titleInput.style.borderColor = 'var(--gold)';
      // Reset border after 1.5s
      setTimeout(() => { titleInput.style.borderColor = ''; }, 1500);
    }
  }
  updateCoverPreview();
}

/* ── INIT ────────────────────────────────────────────────────────────────── */
function initPreview() {
  /* Set images */
  setImages();

  /* Set today's date */
  document.getElementById('cvDate').textContent = getToday();

  /* Populate dropdowns */
  populateStudentDropdown();

  /* Event listeners */
  document.getElementById('studentSelect').addEventListener('change', updateCoverPreview);
  document.getElementById('labNoSelect').addEventListener('change', handleLabNoChange);
  document.getElementById('labTitleInput').addEventListener('input', updateCoverPreview);

  /* Initial preview state */
  updateCoverPreview();

  /* Scale on load + resize */
  scaleAllPages();
  window.addEventListener('resize', scaleAllPages);
}

/* Boot when DOM is ready */
document.addEventListener('DOMContentLoaded', initPreview);
