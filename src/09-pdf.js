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
    const size = o.size || 10, bold = !!o.bold; let tx = x;
    const w = textWidth(s, size, bold);
    if (o.align === 'right') tx = x - w; else if (o.align === 'center') tx = x - w / 2;
    this.cur.push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${rgb(o.color || '#1a1a1a')} rg ${tx.toFixed(2)} ${(this.H - top - size).toFixed(2)} Td (${pdfEscape(pdfBytesOf(s))}) Tj ET`);
    return w;
  }
  line(x1, t1, x2, t2, o = {}) { this.cur.push(`${rgb(o.color || '#dadada')} RG ${o.w || 0.6} w ${x1.toFixed(2)} ${(this.H - t1).toFixed(2)} m ${x2.toFixed(2)} ${(this.H - t2).toFixed(2)} l S`); }
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
    const kids = [];
    for (const p of this.pages) {
      const content = p.join('\n');
      const cId = add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
      kids.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${this.W} ${this.H}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${cId} 0 R >>`));
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

/* ---------- Geschäftsbrief (DIN 5008, vereinfacht) ---------- */
function pdfLetterBase(doc, s, recipient, meta, title) {
  const L = mm(25), R = doc.W - mm(20);
  doc.rect(0, 0, doc.W, mm(4), { fill: '#ff6c01' });
  doc.text(L, mm(14), s.company_name, { size: 20, bold: true });
  doc.text(L, mm(22), 'Kaufen · Finanzieren · Leasen', { size: 9, color: '#6b6b70' });
  doc.text(R, mm(14), [s.company_street, `${s.company_zip} ${s.company_city}`].join(', '), { size: 8.5, align: 'right', color: '#6b6b70' });
  doc.text(R, mm(18.5), [s.company_email, s.company_web].filter(Boolean).join(' · '), { size: 8.5, align: 'right', color: '#6b6b70' });
  // Absenderzeile + Empfänger
  doc.text(L, mm(45), `${s.company_name} · ${s.company_street} · ${s.company_zip} ${s.company_city}`, { size: 7, color: '#6b6b70' });
  doc.line(L, mm(49), L + mm(85), mm(49), { color: '#dadada', w: 0.4 });
  let y = mm(52);
  for (const l of [recipient.name, recipient.extra, recipient.street, `${recipient.zip || ''} ${recipient.city || ''}`.trim(), recipient.country && recipient.country !== 'Deutschland' ? recipient.country : ''].filter(Boolean)) { doc.text(L, y, l, { size: 10.5 }); y += 14; }
  // Infoblock rechts
  let iy = mm(52);
  for (const [k, v] of meta) { if (!v) continue; doc.text(R - mm(42), iy, k, { size: 8.5, color: '#6b6b70' }); doc.text(R, iy, v, { size: 8.5, align: 'right', bold: k === 'Fällig am' }); iy += 12.5; }
  doc.text(L, mm(100), title, { size: 16, bold: true });
  return { L, R, y: mm(112) };
}
function pdfFooter(doc, s) {
  const L = mm(25), top = doc.H - mm(24);
  doc.line(L, top - 6, doc.W - mm(20), top - 6, { color: '#dadada', w: 0.4 });
  const cols = [
    [s.company_name, s.company_street, `${s.company_zip} ${s.company_city}`, s.company_owners ? 'Gesellschafter: ' + s.company_owners : ''],
    [s.company_email, s.company_phone ? 'Tel. ' + s.company_phone : '', s.company_web, s.company_register],
    [s.company_tax_no ? 'Steuernummer: ' + s.company_tax_no : '', s.company_vat_id ? 'USt-IdNr.: ' + s.company_vat_id : '', '', ''],
    [s.company_bank, s.company_iban ? 'IBAN: ' + s.company_iban : '', s.company_bic ? 'BIC: ' + s.company_bic : '', '']
  ];
  cols.forEach((c, i) => { let y = top; for (const l of c.filter(Boolean)) { doc.text(L + i * mm(43), y, l, { size: 6.8, color: '#6b6b70' }); y += 8.5; } });
}

function renderInvoicePdf(s, inv) {
  const doc = new PdfDoc();
  const rc = jparse(inv.recipient, {}), lines = jparse(inv.lines, []);
  const isCredit = inv.kind === 'storno';
  const meta = [['Rechnungsnummer', inv.number], ['Rechnungsdatum', fmtDateDE(inv.issue_date)],
    ['Leistungszeitraum', inv.service_from && inv.service_to && inv.service_from !== inv.service_to ? `${fmtDateDE(inv.service_from)} – ${fmtDateDE(inv.service_to)}` : ''],
    ['Leistungsdatum', inv.service_from && (!inv.service_to || inv.service_from === inv.service_to) ? fmtDateDE(inv.service_from) : ''],
    ['Kundennummer', rc.customer_no], ['Ihre USt-IdNr.', rc.vat_id], ['Fällig am', isCredit ? '' : fmtDateDE(inv.due_date)]];
  let { L, R, y } = pdfLetterBase(doc, s, rc, meta, (isCredit ? 'Stornorechnung ' : 'Rechnung ') + inv.number);
  const intro = inv.intro || s.invoice_intro;
  for (const l of doc.wrap(rc.salutation ? rc.salutation + '\n' + intro : intro, R - L, 10)) { doc.text(L, y, l, { size: 10 }); y += 13; }
  y += 8;
  const cx = { pos: L, desc: L + mm(10), qty: R - mm(52), unit: R - mm(26), total: R };
  const head = () => { doc.rect(L - 4, y - 3, R - L + 8, 18, { fill: '#f4f4f4' }); doc.text(cx.pos, y + 1, 'Pos.', { size: 8.5, bold: true }); doc.text(cx.desc, y + 1, 'Beschreibung', { size: 8.5, bold: true }); doc.text(cx.qty, y + 1, 'Menge', { size: 8.5, bold: true, align: 'right' }); doc.text(cx.unit, y + 1, 'Einzelpreis', { size: 8.5, bold: true, align: 'right' }); doc.text(cx.total, y + 1, 'Gesamt (netto)', { size: 8.5, bold: true, align: 'right' }); y += 22; };
  head();
  lines.forEach((ln, i) => {
    const descLines = doc.wrap(ln.description, cx.qty - cx.desc - mm(16), 9.5);
    if (y + descLines.length * 12 > doc.H - mm(70)) { pdfFooter(doc, s); doc.newPage(); y = mm(25); head(); }
    doc.text(cx.pos, y, String(i + 1), { size: 9.5 });
    descLines.forEach((dl, k) => doc.text(cx.desc, y + k * 12, dl, { size: 9.5 }));
    doc.text(cx.qty, y, String(ln.qty ?? 1).replace('.', ','), { size: 9.5, align: 'right' });
    doc.text(cx.unit, y, money(ln.unit), { size: 9.5, align: 'right' });
    doc.text(cx.total, y, money(ln.total), { size: 9.5, align: 'right' });
    y += Math.max(1, descLines.length) * 12 + 6;
    doc.line(L, y - 3, R, y - 3, { color: '#eeeeee', w: 0.4 });
  });
  y += 6;
  const tot = [['Summe netto', money(inv.net)], [inv.vat_rate ? `zzgl. ${String(inv.vat_rate).replace('.', ',')} % USt.` : 'Umsatzsteuer', money(inv.vat)]];
  for (const [k, v] of tot) { doc.text(cx.unit, y, k, { size: 9.5, align: 'right', color: '#6b6b70' }); doc.text(cx.total, y, v, { size: 9.5, align: 'right' }); y += 14; }
  doc.line(cx.qty - mm(20), y, R, y, { color: '#1a1a1a', w: 0.8 }); y += 6;
  doc.text(cx.unit, y, 'Rechnungsbetrag', { size: 11, bold: true, align: 'right' }); doc.text(cx.total, y, money(inv.gross), { size: 11, bold: true, align: 'right' }); y += 26;
  if (!inv.vat_rate && !s.vat_enabled) { doc.text(L, y, 'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.', { size: 9, color: '#6b6b70' }); y += 14; }
  if (!isCredit) {
    const terms = `Zahlbar ohne Abzug bis zum ${fmtDateDE(inv.due_date)}. ${s.invoice_footer || ''}`;
    for (const l of doc.wrap(terms, R - L, 9.5)) { doc.text(L, y, l, { size: 9.5 }); y += 12.5; }
    if (s.company_iban) { y += 4; doc.text(L, y, `Bankverbindung: ${[s.company_bank, 'IBAN ' + s.company_iban, s.company_bic ? 'BIC ' + s.company_bic : ''].filter(Boolean).join(' · ')}`, { size: 9.5 }); y += 12.5; doc.text(L, y, `Verwendungszweck: ${inv.number}`, { size: 9.5, bold: true }); }
  }
  pdfFooter(doc, s);
  return doc.finish();
}

function renderDunningPdf(s, inv, level, fee, dueDate, openAmount) {
  const doc = new PdfDoc();
  const rc = jparse(inv.recipient, {});
  const title = DUNNING_LEVELS[level] || 'Mahnung';
  let { L, R, y } = pdfLetterBase(doc, s, rc, [['Datum', fmtDateDE(nowIso())], ['Rechnungsnummer', inv.number], ['Kundennummer', rc.customer_no], ['Fällig am', fmtDateDE(dueDate)]], `${title} zur Rechnung ${inv.number}`);
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
