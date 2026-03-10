/**
 * js/output.js
 * DSA Lab Report Generator — St. Xavier's College
 * Output page builder: create/remove output pages, paste images (Ctrl+V),
 * upload images, drag to reposition, resize via corner handles.
 * All image state is tracked so generate.js can embed them into the PDF.
 *
 * Dependencies: data.js, preview.js (scaleAllPages)
 * Exports: getOutputPages() — returns array of page state for PDF generation
 */

/* ── STATE ───────────────────────────────────────────────────────────────── */
/** @type {Array<{id: number, images: Array<{src,x,y,w,h}>}>} */
const outputPages = [];
let pageCounter = 0;

/* ── PUBLIC API ──────────────────────────────────────────────────────────── */
/**
 * Returns current state of all output pages for PDF generation.
 * Each page: { id, images: [{src, x, y, w, h}] }
 * x, y, w, h are in the 794×1123 coordinate space of the inner page.
 */
function getOutputPages() {
  return outputPages.map(page => {
    const box = document.querySelector(`[data-page-id="${page.id}"] .op-box`);
    if (!box) return { id: page.id, images: [] };

    const images = Array.from(box.querySelectorAll('.op-img-wrap')).map(wrap => {
      const img = wrap.querySelector('img');
      return {
        src: img.src,
        x:   parseFloat(wrap.style.left)   || 0,
        y:   parseFloat(wrap.style.top)    || 28, // offset for OUTPUT: label
        w:   parseFloat(wrap.style.width)  || 200,
        h:   parseFloat(wrap.style.height) || 150,
      };
    });
    return { id: page.id, images };
  });
}

/* ── CREATE OUTPUT PAGE ──────────────────────────────────────────────────── */
function createOutputPage() {
  pageCounter++;
  const id = pageCounter;
  outputPages.push({ id, images: [] });

  const pageIndex = outputPages.length + 1; // 1 = cover, 2+ = output pages

  /* ── Build page-wrap ── */
  const wrap = document.createElement('div');
  wrap.className = 'page-wrap';
  wrap.setAttribute('data-page-id', id);
  wrap.style.position = 'relative';

  /* Remove button (only show if more than 1 output page) */
  const removeBtn = document.createElement('button');
  removeBtn.className = 'op-remove-btn';
  removeBtn.title = 'Remove this output page';
  removeBtn.textContent = '×';
  removeBtn.addEventListener('click', () => removeOutputPage(id, wrap));

  /* Label */
  const label = document.createElement('div');
  label.className = 'page-label';
  label.innerHTML = `<span class="page-label__dot"></span> Page ${pageIndex} — Output Page`;

  /* A4 shell */
  const shell = document.createElement('div');
  shell.className = 'a4-shell';

  /* Viewport */
  const viewport = document.createElement('div');
  viewport.className = 'a4-viewport';

  /* Inner (794×1123) */
  const inner = document.createElement('div');
  inner.className = 'op-inner';

  /* Output box */
  const box = document.createElement('div');
  box.className = 'op-box';
  box.addEventListener('paste', (e) => handlePaste(e, box));
  box.addEventListener('click', () => activatePage(box));

  /* OUTPUT: label */
  const opLabel = document.createElement('div');
  opLabel.className = 'op-label';
  opLabel.textContent = 'OUTPUT:';

  /* Upload hint */
  const hint = document.createElement('div');
  hint.className = 'op-upload-hint';
  hint.innerHTML = `
    <div class="op-upload-hint__icon">📋</div>
    <div class="op-upload-hint__text">
      Ctrl+V to paste screenshot<br>or click Upload below
    </div>`;

  /* Upload button */
  const uploadBtn = document.createElement('button');
  uploadBtn.className = 'op-upload-btn';
  uploadBtn.textContent = '⬆ Upload Image';
  uploadBtn.type = 'button';

  /* Hidden file input */
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/png,image/jpeg,image/jpg';
  fileInput.className = 'op-file-input';

  uploadBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files[0]) {
      readFileAndInsert(fileInput.files[0], box, hint);
      fileInput.value = ''; // reset so same file can be re-selected
    }
  });

  /* Assemble */
  box.appendChild(opLabel);
  box.appendChild(hint);
  box.appendChild(uploadBtn);
  box.appendChild(fileInput);
  inner.appendChild(box);
  viewport.appendChild(inner);
  shell.appendChild(viewport);
  wrap.appendChild(removeBtn);
  wrap.appendChild(label);
  wrap.appendChild(shell);

  /* Inject into DOM */
  document.getElementById('outputPagesContainer').appendChild(wrap);

  /* Scale the new page */
  requestAnimationFrame(() => {
    const scale = viewport.offsetWidth / 794;
    inner.style.transform = `scale(${scale})`;
  });

  /* Update chips in form panel */
  updatePageChips();

  /* Update page labels for all output pages */
  refreshPageLabels();

  /* Make box focusable for paste events */
  box.setAttribute('tabindex', '0');

  return { id, box, hint };
}

/* ── REMOVE OUTPUT PAGE ──────────────────────────────────────────────────── */
function removeOutputPage(id, wrapEl) {
  if (outputPages.length <= 1) {
    showStatus('At least one output page is required.', true);
    return;
  }
  const idx = outputPages.findIndex(p => p.id === id);
  if (idx !== -1) outputPages.splice(idx, 1);
  wrapEl.remove();
  updatePageChips();
  refreshPageLabels();
}

/* ── REFRESH PAGE LABELS ─────────────────────────────────────────────────── */
function refreshPageLabels() {
  const wraps = document.querySelectorAll('#outputPagesContainer .page-wrap');
  wraps.forEach((wrap, i) => {
    const label = wrap.querySelector('.page-label');
    if (label) {
      label.innerHTML = `<span class="page-label__dot"></span> Page ${i + 2} — Output Page`;
    }
  });
  // Show/hide remove buttons
  wraps.forEach(wrap => {
    const btn = wrap.querySelector('.op-remove-btn');
    if (btn) btn.style.display = wraps.length > 1 ? 'flex' : 'none';
  });
}

/* ── UPDATE FORM PANEL CHIPS ─────────────────────────────────────────────── */
function updatePageChips() {
  const list = document.getElementById('outputPagesList');
  list.innerHTML = '';
  outputPages.forEach((page, i) => {
    const chip = document.createElement('span');
    chip.className = 'output-page-chip';
    chip.textContent = `Output ${i + 1}`;
    list.appendChild(chip);
  });
}

/* ── PASTE HANDLER ───────────────────────────────────────────────────────── */
function handlePaste(e, box) {
  const items = (e.clipboardData || window.clipboardData).items;
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault();
      e.stopPropagation(); // BUG FIX: prevent event bubbling to document listener (was causing duplicate image insert)
      const file = item.getAsFile();
      const hint = box.querySelector('.op-upload-hint');
      readFileAndInsert(file, box, hint);
      return;
    }
  }
}

/* ── Global paste: route to focused/last output box ─────────────────────── */
document.addEventListener('paste', (e) => {
  // Only handle if not already handled by box-level listener
  // and if target is not an input/textarea
  const target = document.activeElement;
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) return;

  const boxes = document.querySelectorAll('.op-box');
  if (!boxes.length) return;

  // Use last active box, or just last box
  const activeBox = document.querySelector('.op-box.active') || boxes[boxes.length - 1];
  const items = (e.clipboardData || window.clipboardData).items;
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault();
      const file = item.getAsFile();
      const hint = activeBox.querySelector('.op-upload-hint');
      readFileAndInsert(file, activeBox, hint);
      return;
    }
  }
});

/* ── ACTIVATE PAGE (for paste routing) ──────────────────────────────────── */
function activatePage(box) {
  document.querySelectorAll('.op-box').forEach(b => b.classList.remove('active'));
  box.classList.add('active');
  box.focus();
}

/* ── READ FILE AND INSERT IMAGE ──────────────────────────────────────────── */
function readFileAndInsert(file, box, hintEl) {
  const reader = new FileReader();
  reader.onload = (e) => {
    insertImage(e.target.result, box, hintEl);
  };
  reader.readAsDataURL(file);
}

/* ── INSERT IMAGE INTO OUTPUT BOX ────────────────────────────────────────── */
function insertImage(src, box, hintEl) {
  /* Hide the upload hint once first image is added */
  if (hintEl) hintEl.classList.add('hidden');

  /* Create image wrapper */
  const wrap = document.createElement('div');
  wrap.className = 'op-img-wrap';

  /* Default size: natural image size capped to box bounds */
  const boxW = 614; // 794 - 2*90
  const boxH = 1013; // 1123 - 2*55
  const labelOffset = 28; // space for OUTPUT: label

  const img = new Image();
  img.onload = () => {
    let w = img.naturalWidth;
    let h = img.naturalHeight;
    // Cap to box with padding
    const maxW = boxW - 20;
    const maxH = boxH - labelOffset - 20;
    if (w > maxW) { h = h * (maxW / w); w = maxW; }
    if (h > maxH) { w = w * (maxH / h); h = maxH; }

    wrap.style.left   = '10px';
    wrap.style.top    = (labelOffset + 10) + 'px';
    wrap.style.width  = Math.round(w) + 'px';
    wrap.style.height = Math.round(h) + 'px';

    makeImageInteractive(wrap, box);
  };
  img.src = src;

  const imgEl = document.createElement('img');
  imgEl.src = src;
  imgEl.draggable = false;

  /* Resize handles */
  const handles = document.createElement('div');
  handles.className = 'op-img-handles';
  ['tl','tr','bl','br'].forEach(pos => {
    const h = document.createElement('div');
    h.className = `op-handle op-handle--${pos}`;
    h.setAttribute('data-handle', pos);
    handles.appendChild(h);
  });

  /* Delete button */
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'op-img-delete';
  deleteBtn.title = 'Delete image (or press Backspace/Delete)';
  deleteBtn.innerHTML = '×';
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    deleteSelectedImage(wrap, box);
  });

  wrap.appendChild(imgEl);
  wrap.appendChild(handles);
  wrap.appendChild(deleteBtn);
  box.appendChild(wrap);

  /* Select this image */
  selectImage(wrap);
}

/* ── SELECT IMAGE ────────────────────────────────────────────────────────── */
function selectImage(wrap) {
  document.querySelectorAll('.op-img-wrap').forEach(w => w.classList.remove('selected'));
  wrap.classList.add('selected');
}

/* ── DELETE SELECTED IMAGE ───────────────────────────────────────────────── */
function deleteSelectedImage(wrap, box) {
  wrap.remove();
  // Restore upload hint if box is now empty of images
  if (!box.querySelector('.op-img-wrap')) {
    const hint = box.querySelector('.op-upload-hint');
    if (hint) hint.classList.remove('hidden');
  }
}

/* ── KEYBOARD DELETE ─────────────────────────────────────────────────────── */
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Backspace' && e.key !== 'Delete') return;
  // Don't interfere with text inputs
  const tag = document.activeElement && document.activeElement.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

  const selected = document.querySelector('.op-img-wrap.selected');
  if (!selected) return;
  const box = selected.closest('.op-box');
  e.preventDefault();
  deleteSelectedImage(selected, box);
});

/* ── DESELECT ALL on click outside ──────────────────────────────────────── */
document.addEventListener('mousedown', (e) => {
  if (!e.target.closest('.op-img-wrap') && !e.target.closest('.op-handle')) {
    document.querySelectorAll('.op-img-wrap').forEach(w => w.classList.remove('selected'));
  }
});

/* ── MAKE IMAGE DRAGGABLE + RESIZABLE ────────────────────────────────────── */
function makeImageInteractive(wrap, box) {
  let isDragging = false;
  let isResizing = false;
  let handle     = null;
  let startX, startY, startL, startT, startW, startH;

  /* Box bounds (in 794px coordinate space) */
  const BOX_X = 90;  // left margin offset of .op-box inside .op-inner
  const BOX_Y = 55;  // top margin offset
  const BOX_W = 614; // 794 - 180
  const BOX_H = 1013; // 1123 - 110
  const LABEL_H = 28;

  function getScale() {
    /* The .op-inner is scaled; we need to divide mouse delta by that scale */
    const inner = box.closest('.op-inner');
    if (!inner) return 1;
    const m = inner.style.transform.match(/scale\(([^)]+)\)/);
    return m ? parseFloat(m[1]) : 1;
  }

  function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

  /* ── DRAG ── */
  wrap.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('op-handle')) return; // handled by resize
    e.preventDefault();
    selectImage(wrap);
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startL = parseFloat(wrap.style.left)  || 0;
    startT = parseFloat(wrap.style.top)   || LABEL_H + 10;
    document.body.style.userSelect = 'none';
  });

  /* ── RESIZE ── */
  wrap.querySelectorAll('.op-handle').forEach(h => {
    h.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      selectImage(wrap);
      isResizing = true;
      handle     = h.getAttribute('data-handle');
      startX     = e.clientX;
      startY     = e.clientY;
      startL     = parseFloat(wrap.style.left)   || 0;
      startT     = parseFloat(wrap.style.top)    || LABEL_H + 10;
      startW     = parseFloat(wrap.style.width)  || 200;
      startH     = parseFloat(wrap.style.height) || 150;
      document.body.style.userSelect = 'none';
    });
  });

  document.addEventListener('mousemove', (e) => {
    const scale = getScale();
    const dx = (e.clientX - startX) / scale;
    const dy = (e.clientY - startY) / scale;

    if (isDragging) {
      const newL = clamp(startL + dx, 0, BOX_W - parseFloat(wrap.style.width));
      const newT = clamp(startT + dy, LABEL_H, BOX_H - parseFloat(wrap.style.height));
      wrap.style.left = newL + 'px';
      wrap.style.top  = newT + 'px';
    }

    if (isResizing) {
      const MIN_SIZE = 30;
      let newL = startL, newT = startT, newW = startW, newH = startH;

      if (handle === 'br') {
        newW = Math.max(MIN_SIZE, startW + dx);
        newH = Math.max(MIN_SIZE, startH + dy);
      } else if (handle === 'bl') {
        newW = Math.max(MIN_SIZE, startW - dx);
        newH = Math.max(MIN_SIZE, startH + dy);
        newL = startL + (startW - newW);
      } else if (handle === 'tr') {
        newW = Math.max(MIN_SIZE, startW + dx);
        newH = Math.max(MIN_SIZE, startH - dy);
        newT = startT + (startH - newH);
      } else if (handle === 'tl') {
        newW = Math.max(MIN_SIZE, startW - dx);
        newH = Math.max(MIN_SIZE, startH - dy);
        newL = startL + (startW - newW);
        newT = startT + (startH - newH);
      }

      /* Constrain to box */
      newL = clamp(newL, 0, BOX_W - MIN_SIZE);
      newT = clamp(newT, LABEL_H, BOX_H - MIN_SIZE);
      newW = Math.min(newW, BOX_W - newL);
      newH = Math.min(newH, BOX_H - newT);

      wrap.style.left   = newL + 'px';
      wrap.style.top    = newT + 'px';
      wrap.style.width  = newW + 'px';
      wrap.style.height = newH + 'px';
    }
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
    isResizing = false;
    handle     = null;
    document.body.style.userSelect = '';
  });
}

/* ── INIT ────────────────────────────────────────────────────────────────── */
function initOutput() {
  /* Create first output page automatically */
  createOutputPage();

  /* Add page button */
  document.getElementById('addOutputPageBtn').addEventListener('click', () => {
    createOutputPage();
  });
}

/* Boot */
document.addEventListener('DOMContentLoaded', initOutput);
