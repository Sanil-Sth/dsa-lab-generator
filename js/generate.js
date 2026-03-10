/**
 * js/generate.js
 * DSA Lab Report Generator — St. Xavier's College
 * PDF generation (jsPDF) and DOCX (print-ready HTML) logic.
 * Produces: Page 1 = cover page, Pages 2+ = output pages.
 *
 * Dependencies: data.js (STUDENTS, STATIC_FIELDS, BANNER_B64, LOGO_B64, getToday),
 *               output.js (getOutputPages)
 * No exports — attaches event listeners to download buttons on DOMContentLoaded.
 *
 * ALL MEASUREMENTS DERIVED EXACTLY FROM WORD TEMPLATE XML:
 * ─────────────────────────────────────────────────────────
 * Page:        A4 210×297mm, all margins 1 inch = 25.4mm (1440 DXA)
 * Logo:        45.473mm × 51.206mm (1637030 × 1843405 EMU), centered
 *              Top = margin(25.4mm) + offset(11.924mm = 429260 EMU) = 37.324mm
 * DEPT:        18pt bold, spaceBefore=240twp, lineH=360twp, spaceAfter=240twp
 * SUBJECT:     16pt bold, same spacing
 * LABNO:       16pt bold, same spacing
 * TITLE:       14pt normal, spaceBefore=255twp, lineH=600twp, spaceAfter=240twp
 * Table:       179.299mm wide (10165 DXA), centered → X = (210-179.299)/2 = 15.350mm
 *              Col1=69.762mm (3955 DXA), Col2=71.438mm (4050 DXA), Col3=38.100mm (2160 DXA)
 *              Header row: 10.936mm (620 DXA), 16pt bold, vertically centered
 *              Data row: 29.633mm (240+4×360=1680 twips), 14pt, lineH=360twp
 * Date line:   14pt bold label + 14pt normal value, centered, 1 twip before (flush)
 */

/* ── HELPERS ─────────────────────────────────────────────────────────────── */

function showStatus(msg, isError = false) {
  const el = document.getElementById('statusMsg');
  el.textContent = msg;
  el.style.color = isError ? '#dc2626' : 'var(--success)';
  el.classList.remove('hidden');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.classList.add('hidden'); el.textContent = ''; }, 3000);
}

function getFormValues() {
  const roll    = document.getElementById('studentSelect').value;
  const labNo   = document.getElementById('labNoSelect').value;
  const title   = document.getElementById('labTitleInput').value.trim();
  const student = STUDENTS.find(s => s.roll === roll) || null;
  return { student, labNo, title };
}

/* ── PDF GENERATION ──────────────────────────────────────────────────────── */

async function generatePDF() {
  const { student, labNo, title } = getFormValues();
  if (!student || !labNo || !title) {
    showStatus('Please fill in all fields before downloading.', true);
    return;
  }
  showStatus('Generating PDF…');

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  /* ── Constants ─────────────────────────────────────────────────────────── */
  const W   = 210;    // mm
  const H   = 297;
  const mg  = 25.4;   // 1 inch margin
  const cW  = 159.2;  // content width mm
  const TWP = 25.4 / 1440;  // 1 twip in mm

  /* ── Helper: bold label + normal value inline ─────────────────────────── */
  const bw = (text) => doc.getTextWidth(text);
  const drawLV = (label, value, x, y) => {
    doc.setFont('times', 'bold');   doc.text(label, x, y);
    doc.setFont('times', 'normal'); doc.text(value, x + bw(label), y);
  };

  doc.setTextColor(0, 0, 0);

  /* ══════════════════════════════════════════════════════════════════════════
     PAGE 1 — COVER PAGE
  ══════════════════════════════════════════════════════════════════════════ */

  /* ── BANNER ───────────────────────────────────────────────────────────────
   * Inline image in para[0], spans full content width = 159.2mm
   * Positioned at the top margin. Banner height = auto from image aspect ratio.
   * We draw it starting at X=mg, Y=mg (top of content area).
   */
  doc.addImage('data:image/png;base64,' + BANNER_B64, 'PNG',
    mg-5, mg, cW + 10, 0);   // width=cW, height=0 → jsPDF auto-computes from aspect ratio, -5 and +10 being respective correction factors

  /* ── LOGO ─────────────────────────────────────────────────────────────────
   * Floating, centered horizontally.
   * Top = 25.4mm (margin) + 11.924mm (429260 EMU offset) = 37.324mm from page top., 30 is the correction factor to align with the template screenshot (since banner height is not exactly as in Word).
   * Size: 45.473mm × 51.206mm (1637030 × 1843405 EMU).
   */
  const logoW   = 45.473;
  const logoH   = 51.206;
  const logoTop = 37.324+30;   // mm from page top
  doc.addImage('data:image/jpeg;base64,' + LOGO_B64, 'JPEG',
    W / 2 - logoW / 2, logoTop, logoW, logoH);

  /* ── TEXT BLOCK ───────────────────────────────────────────────────────────
   * Paragraph model: track paragraph TOP (not baseline).
   * Para height = spaceBefore + lineHeight + spaceAfter.
   * jsPDF draws at BASELINE = paraTop + spaceBefore + capHeight.
   * Cap height ≈ 72% of em size (standard for Times).
   *
   * Logo bottom = 37.324 + 51.206 = 88.530mm → this is paraTop for DEPT.
   *
   * Paragraph advances (twips → mm, 1 twip = 25.4/1440 mm):
   *   DEPT/SUB/LABNO:  240+360+240 = 840 twips = 14.817mm per para
   *   TITLE:           255+600+240 = 1095 twips = 19.315mm per para
   *   Sum (3×14.817 + 19.315) = 63.766mm
   *   Table top = 88.530 + 63.766 = 152.296mm ← matches template screenshot
   */
  const logoBottom = logoTop + logoH + 17;   // 88.530mm + 17mm correction factor to align with template screenshot

  const cap = (pt) => pt * 25.4 / 72 * 0.72;  // cap height in mm for a given pt size

  /* DEPARTMENT OF COMPUTER SCIENCE — 18pt bold (sz=36 half-points) */
  let pTop = logoBottom;
  doc.setFont('times', 'bold');
  doc.setFontSize(18);
  doc.text('DEPARTMENT OF COMPUTER SCIENCE', W / 2,
    pTop + TWP * 240 + cap(18), { align: 'center' });
  pTop += TWP * 840;  // advance to next para top

  /* DATA STRUCTURE AND ALGORITHMS — 16pt bold (sz=32 half-points) */
  doc.setFontSize(16);
  doc.text('DATA STRUCTURE AND ALGORITHMS', W / 2,
    pTop + TWP * 240 + cap(16), { align: 'center' });
  pTop += TWP * 840;

  /* LAB ASSIGNMENT N — 16pt bold */
  doc.text(`LAB ASSIGNMENT ${labNo}`, W / 2,
    pTop + TWP * 240 + cap(16), { align: 'center' });
  pTop += TWP * 840;

  /* TITLE — 14pt normal (sz=28), spaceBefore=255twp, line=600twp, spAfter=240twp */
  doc.setFont('times', 'normal');
  doc.setFontSize(14);
  const titleUpper = title.toUpperCase();
  const titleLines = doc.splitTextToSize(titleUpper, cW - 10);
  doc.text(titleLines, W / 2, pTop + TWP * 255 + cap(14), { align: 'center' });
  // BUG FIX: advance by all title lines (each extra line = 600twp lineHeight), not just one
  pTop += TWP * 1095 + (titleLines.length - 1) * TWP * 600;

  /* ── SUBMISSION TABLE ─────────────────────────────────────────────────────
   * Total width: 179.299mm (10165 DXA), centered → X = (210 - 179.299) / 2 = 15.350mm
   * Columns: 69.762mm | 71.438mm | 38.100mm
   * Header row: 10.936mm (620 DXA), 16pt bold, vertically centered
   * Data row: 29.633mm (240+4×360 twips), 14pt, lineH=360twp=6.350mm
   */
  const tW    = 179.299;
  const tX    = (W - tW) / 2;        // 15.350mm
  const col1W = 69.762;
  const col2W = 71.438;
  const col3W = 38.100;
  const col1X = tX;
  const col2X = tX + col1W;
  const col3X = tX + col1W + col2W;
  const hdrH  = 10.936;              // 620 DXA
  const rowH  = TWP * (240 + 4*360); // 29.633mm — exact Word content row height

  /* tableY flows directly from pTop — no hardcoded floor */
  const tableY = pTop;

  doc.setLineWidth(0.25);

  /* Header row */
  doc.rect(col1X, tableY, col1W, hdrH);
  doc.rect(col2X, tableY, col2W, hdrH);
  doc.rect(col3X, tableY, col3W, hdrH);
  doc.setFont('times', 'bold');
  doc.setFontSize(16);
  const hdrBaseline = tableY + hdrH / 2 + cap(16) / 2;
  doc.text('Submitted By:', col1X + 3, hdrBaseline);
  doc.text('Submitted To:', col2X + 3, hdrBaseline);
  doc.text('Signature:',    col3X + 3, hdrBaseline);

  /* Data row */
  const dataY = tableY + hdrH;
  doc.rect(col1X, dataY, col1W, rowH);
  doc.rect(col2X, dataY, col2W, rowH);
  doc.rect(col3X, dataY, col3W, rowH);

  doc.setFontSize(14);
  const lineAdv = TWP * 360;                    // 6.350mm per line
  let ty = dataY + TWP * 240 + cap(14);         // first line baseline

  /* Col 1 — Submitted By */
  drawLV('Name:  ',     student.name,               col1X + 3, ty); ty += lineAdv;
  drawLV('CRN:  ',      `024bscit${student.roll}`,  col1X + 3, ty); ty += lineAdv;
  drawLV('Semester:  ', '3rd',                       col1X + 3, ty); ty += lineAdv;
  drawLV('Section:  ',  student.section,             col1X + 3, ty);

  /* Col 2 — Submitted To */
  doc.setFont('times', 'normal');
  let ty2 = dataY + TWP * 240 + cap(14);
  doc.text(STATIC_FIELDS.teacher,    col2X + 3, ty2); ty2 += lineAdv;
  doc.text(STATIC_FIELDS.department, col2X + 3, ty2); ty2 += lineAdv;
  doc.text(STATIC_FIELDS.college,    col2X + 3, ty2);

  /* ── DATE OF SUBMISSION ───────────────────────────────────────────────────
   * 14pt bold label + 14pt normal value.
   * Alignment: centered (jc=center). SpacingBefore = 1 twip ≈ 0mm (flush).
   */
  const dateY   = dataY + rowH + TWP * 1 + 20;   // 10mm is correction factor to align with template screenshot
  const dateStr = getToday();
  const dlabel  = 'Date of Submission: ';
  doc.setFontSize(14);
  doc.setFont('times', 'bold');   const lw = bw(dlabel);
  doc.setFont('times', 'normal'); const vw = bw(dateStr);
  const dateStartX = W / 2 - (lw + vw) / 2;
  doc.setFont('times', 'bold');   doc.text(dlabel,  dateStartX,      dateY);
  doc.setFont('times', 'normal'); doc.text(dateStr, dateStartX + lw, dateY);

  /* ══════════════════════════════════════════════════════════════════════════
     PAGES 2+ — OUTPUT PAGES
     Each page: full content-area bordered box, "OUTPUT:" label, embedded images.
  ══════════════════════════════════════════════════════════════════════════ */
  const pages = getOutputPages();
  pages.forEach(page => {
    doc.addPage();

    const boxX = mg, boxY = mg, boxW = cW, boxH = H - 2 * mg;
    doc.setLineWidth(0.4);
    doc.rect(boxX, boxY, boxW, boxH);

    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text('OUTPUT:', boxX + 3, boxY + 7);

    /* Embed user-placed images */
    page.images.forEach(imgData => {
      /* imgData.x/y/w/h are in the 794×1123px preview coordinate space.
         Convert: 1px = 25.4/96 mm. The .op-box origin is at (90, 55)px
         inside the inner page, which maps to (mg, mg) in PDF. */
      const S = 25.4 / 96;
      const imgX = boxX + imgData.x * S;
      const imgY = boxY + (imgData.y - 28) * S;  // 28px = OUTPUT: label area
      const imgW = imgData.w * S;
      const imgH = imgData.h * S;
      const cx = Math.max(boxX, imgX);
      const cy = Math.max(boxY + 5, imgY);
      const cw = Math.min(imgW, boxX + boxW - cx);
      const ch = Math.min(imgH, boxY + boxH - cy);
      if (cw > 0 && ch > 0) {
        try {
          const fmt = (imgData.src.includes('data:image/jpeg') ||
                       imgData.src.includes('data:image/jpg')) ? 'JPEG' : 'PNG';
          doc.addImage(imgData.src, fmt, cx, cy, cw, ch);
        } catch (e) { console.warn('Image embed failed:', e); }
      }
    });
  });

  /* ── Save ── */
  const safeName = student.name.replace(/[^A-Z0-9]/gi, '_');
  const filename  = `DSA_Lab${labNo}_${student.roll}_${safeName}.pdf`;
  doc.save(filename);
  showStatus(`✓ Downloaded: ${filename}`);
}

/* ── DOCX (PRINT-READY HTML IN NEW TAB) ─────────────────────────────────── */

function generateDOCX() {
  const { student, labNo, title } = getFormValues();
  if (!student || !labNo || !title) {
    showStatus('Please fill in all fields before downloading.', true);
    return;
  }

  const titleUpper = title.toUpperCase();
  const today = getToday();
  const pages = getOutputPages();

  let outputPagesHTML = '';
  pages.forEach(page => {
    let imgsHTML = '';
    page.images.forEach(img => {
      const S = 100 / 614;  // box is 614px wide in preview → percent
      const SH = 100 / 984; // box height (1123-55-84=984) in preview
      const l = (img.x * S).toFixed(2);
      const t = ((img.y - 28) * SH).toFixed(2);
      const w = (img.w * S).toFixed(2);
      const h = (img.h * SH).toFixed(2);
      imgsHTML += `<img src="${img.src}" style="position:absolute;left:${l}%;top:${t}%;width:${w}%;height:${h}%;object-fit:fill;" alt="">`;
    });
    outputPagesHTML += `
    <div class="op-page">
      <div class="op-box"><span class="op-lbl">OUTPUT:</span>${imgsHTML}</div>
    </div>`;
  });

  /* ── Inline HTML — exact Word measurements in CSS ── */
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>DSA Lab ${labNo} — ${student.name}</title>
<style>
  /*
   * Print styles matching Word template XML exactly.
   * Measurements:
   *   @page margin: 1in all sides
   *   Banner: full content width, auto height
   *   Logo: 45.473mm × 51.206mm, centered, margin-top=11.924mm (offset from page top)
   *   DEPT:    18pt bold, margin-top=4.233mm (240twp), line-height=6.350mm (360twp), margin-bottom=4.233mm
   *   SUB/LAB: 16pt bold, same spacing
   *   TITLE:   14pt, margin-top=4.498mm (255twp), line-height=10.583mm (600twp), margin-bottom=4.233mm
   *   Table:   179.299mm wide, centered; col1=69.762mm, col2=71.438mm, col3=38.1mm
   *   Header:  height=10.936mm, 16pt bold, vertical-align middle
   *   Data row:height=29.633mm, 14pt, line-height=6.350mm
   *   Date:    14pt bold+normal, centered, margin-top≈0
   */
  @page { size: A4 portrait; margin: 1in; }
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Times New Roman', Times, serif; color: #000; background: #fff; }

  /* ── Cover page ── */
  .cover { page-break-after: always; }

  /* Banner: full content width */
  .banner { display: block; width: 100%; height: auto; }

  /* Logo: centered, exact size, exact top offset from page top
     (margin-top below banner = offset - banner_height, but since banner has auto height
      and we can't know it exactly in CSS, we use the EMU offset as margin from banner bottom) */
  .logo {
    display: block;
    width: 45.473mm;
    height: 51.206mm;
    object-fit: contain;
    margin: 11.924mm auto 0;
  }

  /* DEPT: 18pt bold, spBefore=4.233mm (240twp), lH=6.350mm (360twp), spAfter=4.233mm */
  .dept {
    text-align: center;
    font-size: 18pt;
    font-weight: bold;
    margin-top: 4.233mm;
    line-height: 6.350mm;
    margin-bottom: 4.233mm;
  }
  /* SUBJECT & LABNO: 16pt bold, same spacing */
  .sub, .labno {
    text-align: center;
    font-size: 16pt;
    font-weight: bold;
    margin-top: 4.233mm;
    line-height: 6.350mm;
    margin-bottom: 4.233mm;
  }
  /* TITLE: 14pt normal, spBefore=4.498mm (255twp), lH=10.583mm (600twp), spAfter=4.233mm */
  .title {
    text-align: center;
    font-size: 14pt;
    font-weight: normal;
    margin-top: 4.498mm;
    line-height: 10.583mm;
    margin-bottom: 4.233mm;
  }

  /* Table wrapper: center the 179.299mm table on the content area */
  .table-wrap {
    display: flex;
    justify-content: center;
    width: 100%;
  }
  table {
    width: 179.299mm;
    border-collapse: collapse;
    table-layout: fixed;
  }
  colgroup col:nth-child(1) { width: 69.762mm; }
  colgroup col:nth-child(2) { width: 71.438mm; }
  colgroup col:nth-child(3) { width: 38.100mm; }

  /* Header row: 10.936mm tall, 16pt bold, vertically centered */
  .th {
    border: 0.5pt solid #000;
    height: 10.936mm;
    font-size: 16pt;
    font-weight: bold;
    vertical-align: middle;
    padding: 0 3mm;
  }
  /* Data row: min 29.633mm, 14pt, line-height 6.350mm (360 twips), spBefore 4.233mm */
  .td {
    border: 0.5pt solid #000;
    min-height: 29.633mm;
    font-size: 14pt;
    font-weight: normal;
    vertical-align: top;
    padding: 4.233mm 3mm 2mm;
    line-height: 6.350mm;
  }
  .lbl { font-weight: bold; }

  /* Date: 14pt, centered, margin-top≈0 (1 twip before = flush) */
  .date { font-size: 14pt; text-align: center; margin-top: 2mm; }

  /* ── Output pages ── */
  .op-page { page-break-after: always; }
  .op-box  {
    border: 0.5pt solid #000;
    width: 100%;
    height: calc(297mm - 2in - 2pt);
    position: relative;
    padding: 5mm;
  }
  .op-lbl  { font-size: 11pt; font-weight: bold; display: block; margin-bottom: 4pt; }
  .op-box img { position: absolute; }
  @media print { .no-print { display: none !important; } }
</style>
</head>
<body>

<div class="cover">
  <img class="banner" src="data:image/png;base64,${BANNER_B64}" alt="SXC Header Banner">
  <img class="logo"   src="data:image/jpeg;base64,${LOGO_B64}"  alt="SXC College Crest">
  <div class="dept">DEPARTMENT OF COMPUTER SCIENCE</div>
  <div class="sub">DATA STRUCTURE AND ALGORITHMS</div>
  <div class="labno">LAB ASSIGNMENT ${labNo}</div>
  <div class="title">${titleUpper}</div>
  <div class="table-wrap">
    <table>
      <colgroup><col><col><col></colgroup>
      <thead>
        <tr>
          <td class="th">Submitted By:</td>
          <td class="th">Submitted To:</td>
          <td class="th">Signature:</td>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="td">
            <span class="lbl">Name: </span>${student.name}<br>
            <span class="lbl">CRN: </span>024bscit${student.roll}<br>
            <span class="lbl">Semester: </span>3rd<br>
            <span class="lbl">Section: </span>${student.section}
          </td>
          <td class="td">
            ${STATIC_FIELDS.teacher}<br>
            ${STATIC_FIELDS.department}<br>
            ${STATIC_FIELDS.college}
          </td>
          <td class="td"></td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="date"><strong>Date of Submission: </strong>${today}</div>
</div>

${outputPagesHTML}

<div class="no-print" style="padding:1.5rem;text-align:center;font-family:system-ui,sans-serif;border-top:1px solid #ddd;margin-top:1rem;">
  <p style="font-size:13px;color:#555;margin-bottom:12px;">
    To print or save as PDF, click the button below (or press Ctrl+P).
  </p>
  <button onclick="window.print()"
    style="padding:10px 28px;font-size:14px;background:#0f1f3d;color:#fff;border:none;border-radius:6px;cursor:pointer;">
    🖨 Print / Save as PDF
  </button>
</div>

</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) { showStatus('Pop-up blocked — please allow pop-ups and try again.', true); return; }
  win.document.write(html);
  win.document.close();
  showStatus('✓ Print window opened!');
}

/* ── BIND BUTTONS ────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('dlPdfBtn').addEventListener('click',  generatePDF);
});
