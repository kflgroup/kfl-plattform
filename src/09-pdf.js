/* ============================================================
   Schlanker PDF-Generator (ohne Fremdbibliothek) für Rechnungen,
   Mahnungen und Berichte. Schrift: Helvetica (WinAnsi), A4.
   ============================================================ */

const HELV = { 32: 278, 33: 278, 34: 355, 35: 556, 36: 556, 37: 889, 38: 667, 39: 191, 40: 333, 41: 333, 42: 389, 43: 584, 44: 278, 45: 333, 46: 278, 47: 278,
  48: 556, 49: 556, 50: 556, 51: 556, 52: 556, 53: 556, 54: 556, 55: 556, 56: 556, 57: 556, 58: 278, 59: 278, 60: 584, 61: 584, 62: 584, 63: 556, 64: 1015,
  65: 667, 66: 667, 67: 722, 68: 722, 69: 667, 70: 611, 71: 778, 72: 722, 73: 278, 74: 500, 75: 667, 76: 556, 77: 833, 78: 722, 79: 778, 80: 667, 81: 778, 82: 722, 83: 667, 84: 611, 85: 722, 86: 667, 87: 944, 88: 667, 89: 667, 90: 611,
  91: 278, 92: 278, 93: 278, 94: 469, 95: 556, 96: 333, 97: 556, 98: 556, 99: 500, 100: 556, 101: 556, 102: 278, 103: 556, 104: 556, 105: 222, 106: 222, 107: 500, 108: 222, 109: 833, 110: 556, 111: 556, 112: 556, 113: 556, 114: 333, 115: 500, 116: 278, 117: 556, 118: 500, 119: 722, 120: 500, 121: 500, 122: 500, 123: 334, 124: 260, 125: 334, 126: 584 };
const HELVB = { 32: 278, 33: 333, 34: 474, 35: 556, 36: 556, 37: 889, 38: 722, 39: 238, 40: 333, 41: 333, 42: 389, 43: 584, 44: 278, 45: 333, 46: 278, 47: 278,
  48: 556, 49: 556, 50: 556, 51: 556, 52: 556, 53: 556, 54: 556, 55: 556, 56: 556, 57: 556, 58: 333, 59: 333, 60: 584, 61: 584, 62: 584, 63: 611, 64: 975,
  65: 722, 66: 722, 67: 722, 68: 722, 69: 667, 70: 611, 71: 778, 72: 722, 73: 278, 74: 556, 75: 722, 76: 611, 77: 833, 78: 722, 79: 778, 80: 667, 81: 778, 82: 722, 83: 667, 84: 611, 85: 722, 86: 667, 87: 944, 88: 667, 89: 667, 90: 611,
  91: 333, 92: 278, 93: 333, 94: 584, 95: 556, 96: 333, 97: 556, 98: 611, 99: 556, 100: 611, 101: 556, 102: 333, 103: 611, 104: 611, 105: 278, 106: 278, 107: 556, 108: 278, 109: 889, 110: 611, 111: 611, 112: 611, 113: 611, 114: 389, 115: 556, 116: 333, 117: 611, 118: 556, 119: 778, 120: 556, 121: 556, 122: 500, 123: 389, 124: 280, 125: 389, 126: 584 };
// Unicode → WinAnsi (CP1252)
const WINANSI = { 0x20ac: 0x80, 0x201a: 0x82, 0x201e: 0x84, 0x2026: 0x85, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97 };
const WIDTH_ALIAS = { 0xc4: 65, 0xd6: 79, 0xdc: 85, 0xe4: 97, 0xf6: 111, 0xfc: 117, 0xe9: 101, 0xe8: 101, 0xe0: 97, 0xe1: 97, 0xc9: 69, 0xe7: 99, 0xf1: 110 };
function pdfBytesOf(s) {
  const out = [];
  for (const ch of String(s)) {
    const c = ch.codePointAt(0);
    if (c < 128) out.push(c); else if (WINANSI[c]) out.push(WINANSI[c]); else if (c < 256) out.push(c); else out.push(63);
  }
  return out;
}
function charWidth(code, bold) {
  const t = bold ? HELVB : HELV;
  if (t[code]) return t[code];
  if (WIDTH_ALIAS[code]) return t[WIDTH_ALIAS[code]];
  if (code === 0xdf) return 611; if (code === 0x80) return 556; if (code === 0x96) return 556; if (code === 0x97) return 1000;
  if (code === 0x84 || code === 0x93 || code === 0x94) return bold ? 500 : 333; if (code === 0xb7) return 278; if (code === 0x95) return 350;
  return 556;
}
function textWidth(s, size, bold) { return pdfBytesOf(s).reduce((a, c) => a + charWidth(c, bold), 0) * size / 1000; }
function pdfEscape(bytes) { return bytes.map((c) => (c === 40 || c === 41 || c === 92) ? '\\' + String.fromCharCode(c) : (c < 32 || c > 126) ? '\\' + c.toString(8).padStart(3, '0') : String.fromCharCode(c)).join(''); }
const rgb = (hex) => { const h = hex.replace('#', ''); return [0, 2, 4].map((i) => (parseInt(h.slice(i, i + 2), 16) / 255).toFixed(3)).join(' '); };

class PdfDoc {
  constructor() { this.pages = []; this.W = 595.28; this.H = 841.89; this.newPage(); }
  newPage() { this.cur = []; this.pages.push(this.cur); return this; }
  // y wird von oben gemessen (mm-ähnlich bequemer): top in pt
  text(x, top, s, o = {}) {
    const size = o.size || 10, bold = !!o.bold || !!o.italic; let tx = x;
    if (o.spacing) { let cx = o.align === 'right' ? x - (textWidth(s, size, bold) + o.spacing * (String(s).length - 1)) : x; for (const ch of String(s)) { this.text(cx, top, ch, { ...o, spacing: 0, align: 'left' }); cx += textWidth(ch, size, bold) + o.spacing; } return cx - x; }
    const w = textWidth(s, size, bold);
    if (o.align === 'right') tx = x - w; else if (o.align === 'center') tx = x - w / 2;
    this.cur.push(`BT /${o.italic ? 'F3' : bold ? 'F2' : 'F1'} ${size} Tf ${rgb(o.color || '#1a1a1a')} rg ${tx.toFixed(2)} ${(this.H - top - size).toFixed(2)} Td (${pdfEscape(pdfBytesOf(s))}) Tj ET`);
    return w;
  }
  line(x1, t1, x2, t2, o = {}) { this.cur.push(`${rgb(o.color || '#dadada')} RG ${o.w || 0.6} w ${x1.toFixed(2)} ${(this.H - t1).toFixed(2)} m ${x2.toFixed(2)} ${(this.H - t2).toFixed(2)} l S`); }
  // Fläche mit abgerundeten Ecken
  rrect(x, top, w, h, r, o = {}) {
    const k = 0.5523 * r, y0 = this.H - top - h, f = (n) => n.toFixed(2);
    this.cur.push(`${rgb(o.fill || '#f4f4f4')} rg ${f(x + r)} ${f(y0)} m ${f(x + w - r)} ${f(y0)} l ${f(x + w - r + k)} ${f(y0)} ${f(x + w)} ${f(y0 + r - k)} ${f(x + w)} ${f(y0 + r)} c ${f(x + w)} ${f(y0 + h - r)} l ${f(x + w)} ${f(y0 + h - r + k)} ${f(x + w - r + k)} ${f(y0 + h)} ${f(x + w - r)} ${f(y0 + h)} c ${f(x + r)} ${f(y0 + h)} l ${f(x + r - k)} ${f(y0 + h)} ${f(x)} ${f(y0 + h - r + k)} ${f(x)} ${f(y0 + h - r)} c ${f(x)} ${f(y0 + r)} l ${f(x)} ${f(y0 + r - k)} ${f(x + r - k)} ${f(y0)} ${f(x + r)} ${f(y0)} c f`);
  }
  // Parallelogramm (Tempo-Strich des Logos)
  skew(x, top, w, h, slant, o = {}) { const y0 = this.H - top - h, f = (n) => n.toFixed(2); this.cur.push(`${rgb(o.fill || '#ffffff')} rg ${f(x)} ${f(y0)} m ${f(x + w)} ${f(y0)} l ${f(x + w + slant)} ${f(y0 + h)} l ${f(x + slant)} ${f(y0 + h)} l h f`); }
  page(i) { this.cur = this.pages[i]; return this; }
  rect(x, top, w, h, o = {}) { this.cur.push(`${rgb(o.fill || '#f4f4f4')} rg ${x.toFixed(2)} ${(this.H - top - h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`); }
  wrap(s, width, size = 10, bold = false) {
    const lines = [];
    for (const para of String(s ?? '').split('\n')) {
      let line = '';
      for (const word of para.split(/\s+/)) {
        if (!word) continue;
        const test = line ? line + ' ' + word : word;
        if (textWidth(test, size, bold) <= width) line = test;
        else { if (line) lines.push(line); line = word; while (textWidth(line, size, bold) > width && line.length > 1) { let cut = line.length - 1; while (cut > 1 && textWidth(line.slice(0, cut), size, bold) > width) cut--; lines.push(line.slice(0, cut)); line = line.slice(cut); } }
      }
      lines.push(line);
    }
    return lines;
  }
  finish() {
    const objs = []; const add = (s) => { objs.push(s); return objs.length; };
    const catalog = add(null), pagesId = add(null);
    const f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    const f2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    const f3 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-BoldOblique /Encoding /WinAnsiEncoding >>');
    const kids = [];
    for (const p of this.pages) {
      const content = p.join('\n');
      const cId = add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
      kids.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${this.W} ${this.H}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R /F3 ${f3} 0 R >> >> /Contents ${cId} 0 R >>`));
    }
    objs[catalog - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
    objs[pagesId - 1] = `<< /Type /Pages /Kids [${kids.map((k) => k + ' 0 R').join(' ')}] /Count ${kids.length} >>`;
    let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'; const offsets = [];
    objs.forEach((o, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
    const xref = pdf.length;
    pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offsets.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('');
    pdf += `trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;
    const u8 = new Uint8Array(pdf.length); for (let i = 0; i < pdf.length; i++) u8[i] = pdf.charCodeAt(i) & 255; return u8;
  }
}
const mm = (v) => v * 2.8346;

/* ---------- Geschäftsbrief im KFL-Design (DIN 5008 Form B, Infospalte rechts) ---------- */
const PDF_C = { orange: '#ff6c01', ink: '#16171a', grey: '#6b6e74', light: '#9a9da3', line: '#e3e4e7', wash: '#f5f6f7', owash: '#fff3ea' };
// KFL-Logo als Vektor: orange Kachel, „KFL“ kursiv mit Tempo-Strich, KAUFEN / FINANZIEREN / LEASEN
function pdfLogo(doc, x, top, size) {
  const u = size / 100;
  doc.rrect(x, top, size, size, 6 * u, { fill: PDF_C.orange });
  doc.text(x + 9 * u, top + 10 * u, 'KFL', { size: 36 * u, italic: true, color: '#ffffff' });
  doc.skew(x + 68 * u, top + 30 * u, 20 * u, 4.2 * u, 2.4 * u, { fill: '#ffffff' });
  doc.text(x + 10 * u, top + 52 * u, 'KAUFEN', { size: 13.2 * u, bold: true, color: '#ffffff', spacing: 0.25 * u });
  doc.text(x + 10.4 * u, top + 67 * u, 'FINANZIEREN', { size: 8.6 * u, bold: true, color: '#ffd9bd', spacing: 0.35 * u });
  doc.text(x + 10 * u, top + 77 * u, 'LEASEN', { size: 13.2 * u, bold: true, color: '#ffffff', spacing: 0.25 * u });
}
const caps = (doc, x, top, t, o = {}) => doc.text(x, top, String(t).toUpperCase(), { size: 5.8, bold: true, color: PDF_C.light, spacing: 0.45, ...o });
// Infospalte rechts: Firma, Kontakt, Steuer, Bank – liefert die Unterkante
function pdfSidebar(doc, s, x, top, w) {
  let y = top;
  doc.text(x, y, s.company_name, { size: 11.5, bold: true, color: PDF_C.ink }); y += 14;
  caps(doc, x, y, 'Kaufen · Finanzieren · Leasen'); y += 12;
  for (const l of [s.company_street, `${s.company_zip} ${s.company_city}`]) { doc.text(x, y, l, { size: 8.2, color: PDF_C.ink }); y += 10.5; }
  y += 6;
  const block = (label, lines) => { lines = lines.filter(Boolean); if (!lines.length) return; caps(doc, x, y, label); y += 8.5; for (const l of lines) for (const wl of doc.wrap(l, w, 8.2)) { doc.text(x, y, wl, { size: 8.2, color: PDF_C.ink }); y += 10.5; } y += 6; };
  block('Telefon', [s.company_phone]);
  block('E-Mail', [s.company_email]);
  block('Web', [s.company_web]);
  block('USt-IdNr.', [s.company_vat_id]);
  block('Steuernummer', [s.company_tax_no]);
  block('Bankverbindung', [s.company_bank, s.company_iban ? fmtIban(s.company_iban) : '', s.company_bic ? 'BIC ' + s.company_bic : '']);
  return y;
}
const fmtIban = (v) => String(v || '').replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim();
function pdfLetterBase(doc, s, recipient, meta, title, o = {}) {
  const L = mm(22), R = doc.W - mm(16), SX = doc.W - mm(58), SW = R - SX;
  doc.rect(0, 0, mm(3), doc.H, { fill: PDF_C.orange });
  pdfLogo(doc, SX, mm(14), mm(24));
  const sideEnd = pdfSidebar(doc, s, SX, mm(44), SW);
  // Absenderzeile + Anschriftfeld (Fensterposition DIN 5008 Form B)
  doc.text(L, mm(46), `${s.company_name} · ${s.company_street} · ${s.company_zip} ${s.company_city}`, { size: 6.8, color: PDF_C.grey });
  doc.line(L, mm(49.2), L + mm(85), mm(49.2), { color: PDF_C.line, w: 0.5 });
  let y = mm(52);
  for (const l of [recipient.name, recipient.extra, recipient.street, `${recipient.zip || ''} ${recipient.city || ''}`.trim(), recipient.country && recipient.country !== 'Deutschland' ? recipient.country : ''].filter(Boolean)) { doc.text(L, y, l, { size: 10.5, color: PDF_C.ink, bold: l === recipient.name }); y += 14; }
  // Titel
  let ty = Math.max(mm(98), sideEnd + mm(4));
  if (o.kicker) caps(doc, L, ty, o.kicker, { color: o.kickerColor || PDF_C.orange, size: 6.8 });
  doc.text(L, ty + 10, title, { size: 22, bold: true, color: PDF_C.ink });
  if (o.number) doc.text(L + textWidth(title, 22, true) + 8, ty + 18.5, o.number, { size: 11, bold: true, color: PDF_C.orange });
  // Kennzahlen-Leiste (Nummer, Datum, Fälligkeit …)
  const cells = meta.filter(([, v]) => v);
  const by = ty + 44, bh = 32;
  const nat = cells.map(([k, v]) => Math.max(textWidth(String(k).toUpperCase(), 5.8, true) + String(k).length * 0.45, textWidth(v, 9.2, true)) + 24);
  const extra = Math.max(0, (R - L) - nat.reduce((a, b) => a + b, 0)) / Math.max(1, cells.length);
  const xs = nat.reduce((a, w, i) => { a.push(i ? a[i - 1] + nat[i - 1] + extra : L); return a; }, []);
  doc.rrect(L, by, R - L, bh, 5, { fill: PDF_C.wash });
  cells.forEach(([k, v, hl], i) => {
    const cx = xs[i] + 12;
    caps(doc, cx, by + 7, k, { color: hl ? PDF_C.orange : PDF_C.light });
    doc.text(cx, by + 16, v, { size: 9.2, bold: true, color: hl ? PDF_C.orange : PDF_C.ink });
    if (i) doc.line(cx - 12, by + 7, cx - 12, by + bh - 7, { color: '#dcdde0', w: 0.5 });
  });
  return { L, R, y: by + bh + 22 };
}
function pdfFooter(doc, s) {
  const L = mm(22), R = doc.W - mm(16), top = doc.H - mm(22);
  doc.line(L, top - 8, R, top - 8, { color: PDF_C.line, w: 0.5 });
  const cols = [
    ['Anschrift', [s.company_name, s.company_street, `${s.company_zip} ${s.company_city}`, s.company_owners ? 'Gesellschafter: ' + s.company_owners : '']],
    ['Kontakt', [s.company_email, s.company_phone ? 'Tel. ' + s.company_phone : '', s.company_web]],
    ['Steuer', [s.company_vat_id ? 'USt-IdNr. ' + s.company_vat_id : '', s.company_tax_no ? 'St.-Nr. ' + s.company_tax_no : '', s.company_register]],
    ['Bankverbindung', [s.company_bank, s.company_iban ? 'IBAN ' + fmtIban(s.company_iban) : '', s.company_bic ? 'BIC ' + s.company_bic : '']]
  ].filter(([, l]) => l.some(Boolean));
  const cw = (R - L) / cols.length;
  cols.forEach(([h, lines], i) => { const x = L + i * cw; caps(doc, x, top, h, { size: 5.4 }); let y = top + 8.5; for (const l of lines.filter(Boolean)) { doc.text(x, y, l, { size: 6.6, color: PDF_C.grey }); y += 8.4; } });
}
// Seitenzahlen nachträglich auf alle Seiten setzen
function pdfPageNumbers(doc) { const n = doc.pages.length; if (n < 2) return; doc.pages.forEach((_, i) => { doc.page(i); doc.text(doc.W - mm(16), doc.H - mm(9), `Seite ${i + 1} von ${n}`, { size: 6.6, align: 'right', color: PDF_C.light }); }); doc.page(n - 1); }

function renderInvoicePdf(s, inv) {
  const doc = new PdfDoc();
  const rc = jparse(inv.recipient, {}), lines = jparse(inv.lines, []);
  const isCredit = inv.kind === 'storno';
  const period = inv.service_from && inv.service_to && inv.service_from !== inv.service_to;
  const meta = [['Rechnungsnummer', inv.number], ['Rechnungsdatum', fmtDateDE(inv.issue_date)],
    [period ? 'Leistungszeitraum' : 'Leistungsdatum', period ? `${fmtDateDE(inv.service_from)} – ${fmtDateDE(inv.service_to)}` : inv.service_from ? fmtDateDE(inv.service_from) : ''],
    ['Kundennummer', rc.customer_no], ['Ihre USt-IdNr.', rc.vat_id], isCredit ? ['Bezug', String(inv.note || '').replace(/^Storno zu /, '')] : ['Fällig am', fmtDateDE(inv.due_date), true]];
  let { L, R, y } = pdfLetterBase(doc, s, rc, meta, isCredit ? 'Stornorechnung' : 'Rechnung', { kicker: isCredit ? 'Gutschrift / Storno' : '', kickerColor: '#c4291c', number: inv.number });
  doc.text(L, y, rc.salutation || 'Sehr geehrte Damen und Herren,', { size: 10, color: PDF_C.ink }); y += 18;
  const ref = isCredit ? String(inv.note || '').replace(/^Storno zu /, '') : '';
  for (const l of doc.wrap(inv.intro || (isCredit ? `hiermit stornieren wir die Rechnung ${ref}. Die folgenden Positionen werden gutgeschrieben:` : s.invoice_intro), R - L, 10)) { doc.text(L, y, l, { size: 10, color: PDF_C.ink }); y += 13.5; }
  y += 12;
  const cx = { pos: L + 8, desc: L + mm(12), qty: R - mm(58), unit: R - mm(30), total: R - 8 };
  const head = () => {
    doc.rrect(L, y - 5, R - L, 20, 4, { fill: PDF_C.ink });
    const h = (x, t, al) => caps(doc, x, y + 1.5, t, { color: '#ffffff', size: 6.2, align: al });
    h(cx.pos, 'Pos.'); h(cx.desc, 'Beschreibung'); h(cx.qty, 'Menge', 'right'); h(cx.unit, 'Einzelpreis', 'right'); h(cx.total, 'Gesamt netto', 'right');
    y += 26;
  };
  head();
  lines.forEach((ln, i) => {
    const descLines = doc.wrap(ln.description, cx.qty - cx.desc - mm(14), 9.5);
    if (y + descLines.length * 12.5 > doc.H - mm(36)) { pdfFooter(doc, s); doc.newPage(); doc.rect(0, 0, mm(3), doc.H, { fill: PDF_C.orange }); y = mm(22); head(); }
    if (i % 2 === 1) doc.rect(L, y - 6, R - L, descLines.length * 12.5 + 10, { fill: '#fafafb' });
    doc.text(cx.pos, y, String(i + 1).padStart(2, '0'), { size: 9.5, color: PDF_C.light, bold: true });
    descLines.forEach((dl, k) => doc.text(cx.desc, y + k * 12.5, dl, { size: 9.5, color: PDF_C.ink, bold: k === 0 && descLines.length > 1 }));
    doc.text(cx.qty, y, String(ln.qty ?? 1).replace('.', ','), { size: 9.5, align: 'right', color: PDF_C.ink });
    doc.text(cx.unit, y, money(ln.unit), { size: 9.5, align: 'right', color: PDF_C.ink });
    doc.text(cx.total, y, money(ln.total), { size: 9.5, align: 'right', bold: true, color: PDF_C.ink });
    y += Math.max(1, descLines.length) * 12.5 + 8;
    doc.line(L, y - 4, R, y - 4, { color: PDF_C.line, w: 0.5 });
  });
  y += 10;
  // Summen rechts, Gesamtbetrag als orange Fläche
  const TX = R - mm(78);
  const tot = [['Zwischensumme netto', money(inv.net)], [inv.vat_rate ? `zzgl. ${String(inv.vat_rate).replace('.', ',')} % Umsatzsteuer` : 'Umsatzsteuer', money(inv.vat)]];
  if (y > doc.H - mm(95)) { pdfFooter(doc, s); doc.newPage(); doc.rect(0, 0, mm(3), doc.H, { fill: PDF_C.orange }); y = mm(22); }
  for (const [k, v] of tot) { doc.text(TX + 10, y, k, { size: 9.2, color: PDF_C.grey }); doc.text(R - 10, y, v, { size: 9.2, align: 'right', color: PDF_C.ink }); y += 15; }
  y += 4;
  doc.rrect(TX, y - 7, R - TX, 30, 5, { fill: isCredit ? '#c4291c' : PDF_C.orange });
  caps(doc, TX + 10, y + 5, isCredit ? 'Gutschriftsbetrag' : 'Rechnungsbetrag', { color: '#ffffff', size: 6.8 });
  doc.text(R - 10, y - 0.5, money(inv.gross), { size: 15, bold: true, align: 'right', color: '#ffffff' });
  y += 44;
  if (!inv.vat_rate && !s.vat_enabled) { doc.text(L, y, 'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.', { size: 8.8, color: PDF_C.grey }); y += 16; }
  // Zahlungshinweis
  if (!isCredit) {
    const rows = [['Zahlbar bis', `${fmtDateDE(inv.due_date)} ohne Abzug`], ['Verwendungszweck', inv.number], s.company_iban ? ['IBAN', fmtIban(s.company_iban)] : null, s.company_bank ? ['Bank', [s.company_bank, s.company_bic ? 'BIC ' + s.company_bic : ''].filter(Boolean).join(' · ')] : null].filter(Boolean);
    const bh = 22 + rows.length * 13;
    doc.rrect(L, y, R - L, bh, 6, { fill: PDF_C.owash });
    doc.rect(L + 7, y + 8, 2.2, bh - 16, { fill: PDF_C.orange });
    caps(doc, L + 16, y + 9, 'Zahlungsinformationen', { color: PDF_C.orange });
    rows.forEach(([k, v], i) => { doc.text(L + 16, y + 21 + i * 13, k, { size: 8.8, color: PDF_C.grey }); doc.text(L + mm(40), y + 21 + i * 13, v, { size: 8.8, bold: true, color: PDF_C.ink }); });
    y += bh + 16;
    for (const l of doc.wrap(s.invoice_footer || '', R - L, 8.8)) { doc.text(L, y, l, { size: 8.8, color: PDF_C.grey }); y += 12; }
  } else { for (const l of doc.wrap('Der Betrag wird mit der ursprünglichen Rechnung verrechnet. Sollte diese bereits bezahlt sein, erstatten wir Ihnen den Betrag.', R - L, 8.8)) { doc.text(L, y, l, { size: 8.8, color: PDF_C.grey }); y += 12; } }
  y += 14;
  if (y < doc.H - mm(40)) {
    doc.text(L, y, 'Vielen Dank für die gute Zusammenarbeit.', { size: 10, color: PDF_C.ink }); y += 22;
    doc.text(L, y, 'Ihr ', { size: 10, color: PDF_C.ink }); doc.text(L + textWidth('Ihr ', 10, false), y, 'KFL', { size: 10, italic: true, color: PDF_C.orange }); doc.text(L + textWidth('Ihr ', 10, false) + textWidth('KFL', 10, true) + 3, y, 'Team', { size: 10, color: PDF_C.ink });
  }
  pdfFooter(doc, s);
  pdfPageNumbers(doc);
  return doc.finish();
}

function renderDunningPdf(s, inv, level, fee, dueDate, openAmount) {
  const doc = new PdfDoc();
  const rc = jparse(inv.recipient, {});
  const title = DUNNING_LEVELS[level] || 'Mahnung';
  let { L, R, y } = pdfLetterBase(doc, s, rc, [['Datum', fmtDateDE(nowIso())], ['Rechnungsnummer', inv.number], ['Kundennummer', rc.customer_no], ['Zahlbar bis', fmtDateDE(dueDate), true]], title, { kicker: level === 1 ? 'Zahlungserinnerung' : 'Mahnung', kickerColor: level >= 2 ? '#c4291c' : PDF_C.orange, number: inv.number });
  const text = level === 1
    ? `Sehr geehrte Damen und Herren,\n\nsicher ist es Ihrer Aufmerksamkeit entgangen: Zu unserer Rechnung ${inv.number} vom ${fmtDateDE(inv.issue_date)} konnten wir bis heute keinen vollständigen Zahlungseingang feststellen. Wir bitten Sie freundlich, den offenen Betrag bis zum ${fmtDateDE(dueDate)} zu überweisen. Sollten Sie die Zahlung bereits veranlasst haben, betrachten Sie dieses Schreiben bitte als gegenstandslos.`
    : `Sehr geehrte Damen und Herren,\n\ntrotz unserer bisherigen Erinnerung ist die Rechnung ${inv.number} vom ${fmtDateDE(inv.issue_date)} weiterhin nicht vollständig beglichen. Wir fordern Sie auf, den Gesamtbetrag einschließlich der Mahngebühr bis zum ${fmtDateDE(dueDate)} zu überweisen.`;
  for (const l of doc.wrap(text, R - L, 10)) { doc.text(L, y, l, { size: 10 }); y += 13.5; }
  y += 12;
  const rows = [['Rechnungsbetrag', money(inv.gross)], ['Bereits bezahlt', money(inv.paid)], ['Bisherige Mahngebühren', money(inv.fees)], level >= 2 && fee ? ['Mahngebühr dieser Mahnung', money(fee)] : null].filter(Boolean);
  for (const [k, v] of rows) { doc.text(R - mm(60), y, k, { size: 10, color: '#6b6b70' }); doc.text(R, y, v, { size: 10, align: 'right' }); y += 15; }
  doc.line(R - mm(60), y, R, y, { color: '#1a1a1a', w: 0.8 }); y += 6;
  doc.text(R - mm(60), y, 'Offener Betrag', { size: 11, bold: true }); doc.text(R, y, money(openAmount), { size: 11, bold: true, align: 'right' }); y += 28;
  if (s.company_iban) { doc.text(L, y, `Bankverbindung: ${[s.company_bank, 'IBAN ' + s.company_iban, s.company_bic ? 'BIC ' + s.company_bic : ''].filter(Boolean).join(' · ')}`, { size: 9.5 }); y += 13; doc.text(L, y, `Verwendungszweck: ${inv.number}`, { size: 9.5, bold: true }); y += 20; }
  doc.text(L, y, 'Mit freundlichen Grüßen', { size: 10 }); doc.text(L, y + 14, `${s.company_name} – Buchhaltung`, { size: 10 });
  pdfFooter(doc, s);
  pdfPageNumbers(doc);
  return doc.finish();
}

// Einfacher Tabellen-Bericht (z. B. Partner-Bericht 30/60 Tage)
function renderReportPdf(s, title, subtitle, sections) {
  const doc = new PdfDoc();
  const L = mm(20), R = doc.W - mm(20);
  doc.rect(0, 0, doc.W, mm(4), { fill: '#ff6c01' });
  doc.text(L, mm(12), title, { size: 18, bold: true }); doc.text(L, mm(20), subtitle, { size: 9.5, color: '#6b6b70' });
  let y = mm(30);
  for (const sec of sections) {
    if (y > doc.H - mm(40)) { doc.newPage(); y = mm(20); }
    doc.text(L, y, sec.title, { size: 12, bold: true }); y += 18;
    const cols = sec.columns, widths = sec.widths || cols.map(() => (R - L) / cols.length);
    const xs = widths.reduce((a, w, i) => { a.push(i ? a[i - 1] + widths[i - 1] : L); return a; }, []);
    doc.rect(L - 3, y - 3, R - L + 6, 16, { fill: '#f4f4f4' });
    cols.forEach((c, i) => doc.text(xs[i], y, c, { size: 8.5, bold: true })); y += 18;
    for (const row of sec.rows) {
      if (y > doc.H - mm(20)) { doc.newPage(); y = mm(20); }
      row.forEach((c, i) => doc.text(xs[i], y, doc.wrap(String(c ?? ''), widths[i] - 4, 8.5)[0] || '', { size: 8.5 })); y += 13;
    }
    y += 14;
  }
  return doc.finish();
}
