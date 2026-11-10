/* ============================================================
   Sicherheitstests: Berichte als PDF im Archiv (Backup-Bereich)
   – Aufbewahrung 365 Tage, danach automatische Löschung
   – Bericht wird als Inhaltsstruktur übergeben (Einstellung „_sectest_pending“
     oder Upload durch den Admin) und hier im KFL-Design als PDF erzeugt
   ============================================================ */

const SECTEST_DAYS = 365;

// Bericht → PDF (A4, mehrseitig, mit Kopf, Fußzeile und Seitenzahlen)
// rep = { title, subtitle, date, ref, kpis: [[Wert, Beschriftung]], sections: [{ h, blocks: [{ p } | { ul: [] } | { h3 } | { note, tone } | { table: { cols, widths, rows } } | { kv: [[k, v]] }] }] }
function renderSecurityTestPdf(rep) {
  const doc = new PdfDoc();
  const L = mm(20), R = doc.W - mm(20), W = R - L, BOTTOM = doc.H - mm(20);
  let y = 0;
  const head = (first) => {
    doc.rect(0, 0, doc.W, mm(3), { fill: PDF_C.orange });
    if (!first) { doc.text(L, mm(8), 'KFL · ' + (rep.short || rep.title), { size: 7, color: PDF_C.grey }); doc.text(R, mm(8), 'Vertraulich – nur für den internen Gebrauch', { size: 7, color: PDF_C.grey, align: 'right' }); doc.line(L, mm(12), R, mm(12), { color: PDF_C.line, w: 0.5 }); y = mm(18); }
  };
  const need = (h) => { if (y + h > BOTTOM) { doc.newPage(); head(false); } };
  const para = (t, o = {}) => {
    const size = o.size || 9.2, lh = size * 1.42, x = L + (o.indent || 0), w = W - (o.indent || 0);
    for (const line of doc.wrap(String(t ?? ''), w, size, !!o.bold)) { need(lh); doc.text(x, y, line, { size, bold: o.bold, color: o.color || PDF_C.ink }); y += lh; }
  };
  // Titelseite
  head(true);
  pdfLogo(doc, L, mm(14), mm(22));
  doc.text(L + mm(28), mm(16), rep.kicker || 'SICHERHEITSTEST', { size: 7.5, bold: true, color: PDF_C.orange, spacing: 0.6 });
  y = mm(21);
  for (const line of doc.wrap(rep.title, W - mm(28), 19, true)) { doc.text(L + mm(28), y, line, { size: 19, bold: true }); y += 23; }
  for (const line of doc.wrap(rep.subtitle || '', W - mm(28), 9.5)) { doc.text(L + mm(28), y, line, { size: 9.5, color: PDF_C.grey }); y += 13; }
  y = Math.max(y, mm(40)) + 8;
  const meta = [['Datum', rep.date || ''], ['Kennung', rep.ref || ''], ['Aufbewahrung', `${SECTEST_DAYS} Tage im Backup-Archiv`], ['Einstufung', 'Vertraulich']];
  doc.rrect(L, y, W, 34, 4, { fill: PDF_C.wash });
  const cw = W / meta.length;
  meta.forEach(([k, v], i) => { caps(doc, L + 10 + i * cw, y + 8, k); doc.text(L + 10 + i * cw, y + 17, v, { size: 8.6, bold: true }); });
  y += 48;
  if (rep.kpis && rep.kpis.length) {
    const kw = (W - (rep.kpis.length - 1) * 8) / rep.kpis.length;
    rep.kpis.forEach(([val, label, tone], i) => {
      const x = L + i * (kw + 8);
      doc.rrect(x, y, kw, 52, 4, { fill: tone === 'bad' ? '#fdecec' : tone === 'warn' ? PDF_C.owash : tone === 'ok' ? '#e9f7ef' : PDF_C.wash });
      doc.text(x + 10, y + 9, String(val), { size: 20, bold: true, color: tone === 'bad' ? '#b42318' : tone === 'warn' ? '#b54708' : tone === 'ok' ? '#067647' : PDF_C.ink });
      let ly = y + 34; for (const l of doc.wrap(label, kw - 20, 7.4).slice(0, 2)) { doc.text(x + 10, ly, l, { size: 7.4, color: PDF_C.grey }); ly += 9; }
    });
    y += 66;
  }
  for (const sec of rep.sections || []) {
    if (sec.pageBreak) { doc.newPage(); head(false); }
    need(40); y += 6;
    doc.text(L, y, sec.h, { size: 13, bold: true }); y += 17;
    doc.line(L, y - 4, L + 28, y - 4, { color: PDF_C.orange, w: 1.6 }); y += 4;
    for (const b of sec.blocks || []) {
      if (b.h3) { need(28); y += 4; doc.text(L, y, b.h3, { size: 10.2, bold: true }); y += 15; }
      else if (b.p) { para(b.p); y += 5; }
      else if (b.ul) { for (const it of b.ul) { const lines = doc.wrap(String(it), W - 12, 9.2); need(13); doc.rect(L + 2, y + 4.2, 3, 3, { fill: PDF_C.orange }); lines.forEach((l) => { need(13); doc.text(L + 12, y, l, { size: 9.2 }); y += 13; }); y += 1.5; } y += 4; }
      else if (b.note) {
        const lines = doc.wrap(b.note, W - 24, 9); const h = lines.length * 12.8 + 14; need(h);
        const fill = b.tone === 'bad' ? '#fdecec' : b.tone === 'ok' ? '#e9f7ef' : PDF_C.owash, bar = b.tone === 'bad' ? '#d92d20' : b.tone === 'ok' ? '#17b26a' : PDF_C.orange;
        doc.rect(L, y, W, h, { fill }); doc.rect(L, y, 3, h, { fill: bar });
        let ny = y + 7; for (const l of lines) { doc.text(L + 12, ny, l, { size: 9, color: PDF_C.ink }); ny += 12.8; }
        y += h + 8;
      } else if (b.kv) {
        for (const [k, v] of b.kv) { const lines = doc.wrap(String(v ?? ''), W * 0.66 - 6, 9); need(lines.length * 12.6 + 4); doc.text(L, y, k, { size: 9, bold: true, color: PDF_C.grey }); lines.forEach((l, i) => doc.text(L + W * 0.34, y + i * 12.6, l, { size: 9 })); y += lines.length * 12.6 + 4; doc.line(L, y - 2, R, y - 2, { color: PDF_C.line, w: 0.4 }); }
        y += 6;
      } else if (b.table) {
        const { cols, rows } = b.table, widths = (b.table.widths || cols.map(() => 1 / cols.length)).map((f) => f * W);
        const xs = widths.reduce((a, w, i) => { a.push(i ? a[i - 1] + widths[i - 1] : L); return a; }, []);
        const header = () => { need(20); doc.rect(L, y, W, 16, { fill: PDF_C.ink }); cols.forEach((c, i) => doc.text(xs[i] + 5, y + 4.5, c, { size: 7.8, bold: true, color: '#ffffff' })); y += 16; };
        header();
        rows.forEach((row, ri) => {
          const cells = row.map((c, i) => doc.wrap(String(c ?? ''), widths[i] - 10, 8.2));
          const h = Math.max(...cells.map((c) => c.length)) * 11 + 9;
          if (y + h > BOTTOM) { doc.newPage(); head(false); header(); }
          if (ri % 2) doc.rect(L, y, W, h, { fill: PDF_C.wash });
          cells.forEach((lines, i) => {
            const v = String(row[i] ?? ''), col = /^(Abgewehrt|Behoben|OK|Erfüllt|Aktiv|Ja)\b/.test(v) ? '#067647' : /^(Lücke|Offen|Hoch|Kritisch|Nein)\b/.test(v) ? '#b42318' : /^(Mittel|Teilweise|Empfehlung|Hinweis|Niedrig)\b/.test(v) ? '#b54708' : PDF_C.ink;
            lines.forEach((l, li) => doc.text(xs[i] + 5, y + 5 + li * 11, l, { size: 8.2, color: col, bold: col !== PDF_C.ink && li === 0 }));
          });
          y += h;
        });
        y += 10;
      }
    }
  }
  // Fußzeile und Seitenzahlen
  const n = doc.pages.length;
  doc.pages.forEach((_, i) => { doc.page(i); doc.line(L, doc.H - mm(14), R, doc.H - mm(14), { color: PDF_C.line, w: 0.5 }); doc.text(L, doc.H - mm(11), `KFL GbR · ${rep.ref || ''} · ${rep.date || ''}`, { size: 6.8, color: PDF_C.light }); doc.text(R, doc.H - mm(11), `Seite ${i + 1} von ${n}`, { size: 6.8, color: PDF_C.light, align: 'right' }); });
  doc.page(n - 1);
  return doc.finish();
}

// Bericht (PDF) ins Archiv legen – 365 Tage aufbewahren
async function archiveSecurityTest(ctx, { title, pdf, summary, ref, source }) {
  const name = `KFL-Sicherheitstest-${(ref || berlinDate(nowMs())).replace(/[^\w.-]+/g, '_')}.pdf`;
  const fileId = await putFile(ctx, { name, mime: 'application/pdf', bytes: pdf, ownerType: 'sicherheitstest' });
  const id = await DB.insert(ctx.db, 'archive', { kind: 'sicherheitstest', ref_id: fileId, title: str(title, 200) || 'Sicherheitstest',
    data: JSON.stringify({ file_id: fileId, file_name: name, size: pdf.length, ref: ref || null, summary: summary || null, source: source || 'system', created_at: nowIso() }),
    archived_at: nowIso(), expires_at: isoOf(nowMs() + SECTEST_DAYS * 86400e3) });
  await audit(ctx, 'sicherheitstest_archiviert', 'archiv', id, { ref, groesse: pdf.length, aufbewahrung_tage: SECTEST_DAYS });
  await notifyStaff(ctx, { roles: ['admin'] }, { kind: 'sicherheit', title: 'Neuer Sicherheitstest im Archiv', body: `${title} – unter Backup → Archiv → Sicherheitstests (${SECTEST_DAYS} Tage aufbewahrt).`, link: '#/backup' });
  return id;
}

// Vorbereiteter Bericht (Einstellung „_sectest_pending“, JSON) → PDF → Archiv. Läuft im leichten Cron-Durchlauf.
async function runSecurityTestImport(ctx) {
  const raw = await rawSetting(ctx.db, '_sectest_pending');
  if (!raw) return 0;
  const rep = jparse(raw, null);
  await DB.run(ctx.db, "DELETE FROM settings WHERE key = '_sectest_pending'");
  if (!rep || !rep.title || !Array.isArray(rep.sections)) { await audit(ctx, 'sicherheitstest_ungueltig', 'archiv', null, null); return 0; }
  if (rep.ref && await DB.one(ctx.db, "SELECT id FROM archive WHERE kind = 'sicherheitstest' AND data LIKE ?", `%"ref":"${String(rep.ref).replace(/[%_"]/g, '')}"%`)) return 0;
  const pdf = renderSecurityTestPdf(rep);
  await archiveSecurityTest(ctx, { title: rep.title, pdf, summary: rep.summary || null, ref: rep.ref, source: 'Sicherheitstest' });
  return 1;
}

// Abgelaufene Archiv-Einträge mit Datei: Datei mitlöschen
async function purgeExpiredArchiveFiles(ctx) {
  for (const a of await DB.all(ctx.db, "SELECT id, data FROM archive WHERE kind = 'sicherheitstest' AND expires_at IS NOT NULL AND expires_at < ? LIMIT 5", nowIso())) {
    const d = jparse(a.data, {}); if (d.file_id) await deleteFile(ctx, d.file_id);
    await DB.run(ctx.db, 'DELETE FROM archive WHERE id = ?', a.id);
  }
}
