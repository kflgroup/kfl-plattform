/* ============================================================
   Schnittstelle Finanzbuchhaltung (/api/fibu/…)
   Rechte: fibu_view (sehen), fibu_book (Konten anlegen, buchen, Belege),
           fibu_manage (Konten schließen, Anfangsbestände, Import, Abschlüsse),
           Admin: alles inkl. Wiederöffnen von Abschlüssen und Konten
   ============================================================ */

async function handleFibu(ctx, u, path, method, body, q) {
  const db = ctx.db; let m;
  requirePerm(u, 'fibu_view');
  const book = () => requirePerm(u, 'fibu_book');
  const manage = () => requirePerm(u, 'fibu_manage');
  const admin = () => need(u.role === 'admin', 403, 'Das kann nur der Admin.');
  const today = berlinDate(nowMs());
  const entryView = async (rows) => {
    if (!rows.length) return [];
    const ids = rows.map((r) => r.id);
    const lines = await DB.all(db, `SELECT l.*, a.number, a.name, a.type FROM fibu_lines l JOIN fibu_accounts a ON a.id = l.account_id WHERE l.entry_id IN (${ids.map(() => '?').join(',')}) ORDER BY l.id`, ...ids);
    return rows.map((e) => { const ls = lines.filter((l) => l.entry_id === e.id); return { ...e, lines: ls, amount: round2(ls.reduce((s, l) => s + l.debit, 0)), debit: ls.filter((l) => l.debit).map((l) => `${l.number} ${l.name}`), credit: ls.filter((l) => l.credit).map((l) => `${l.number} ${l.name}`) }; });
  };

  /* ---------- Übersicht ---------- */
  if (path === '/overview' && method === 'GET') {
    const bal = await fibuBalances(ctx, { to: today });
    const bySys = (sys) => (bal.find((a) => a.sys === sys) || { saldo: 0 }).saldo;
    const month = today.slice(0, 7), year = today.slice(0, 4);
    const res = async (from) => { const b = await fibuBalances(ctx, { from, to: today }); return round2(b.filter((a) => a.type === 'ertrag').reduce((s, a) => s + saldoOf(a.type, a.debit, a.credit), 0) - b.filter((a) => a.type === 'aufwand').reduce((s, a) => s + saldoOf(a.type, a.debit, a.credit), 0)); };
    const recent = await entryView(await DB.all(db, 'SELECT e.*, d.number AS doc_number FROM fibu_entries e LEFT JOIN fibu_docs d ON d.id = e.doc_id ORDER BY e.id DESC LIMIT 8'));
    const unbooked = await DB.val(db, 'SELECT COUNT(*) FROM purchase_invoices WHERE entry_id IS NULL');
    const lastClose = await DB.one(db, "SELECT period, closed_at FROM fibu_periods WHERE status = 'abgeschlossen' ORDER BY period DESC LIMIT 1");
    return out({ ok: true, kpis: { bank: bySys('bank'), kasse: bySys('kasse'), forderungen: bySys('forderungen'), verbindlichkeiten: bySys('verbindlichkeiten'),
      ust: round2(bySys('umsatzsteuer') + bySys('umsatzsteuer7') - bySys('vorsteuer') - bySys('vorsteuer7')), monthResult: await res(`${month}-01`), yearResult: await res(`${year}-01-01`) },
      recent, unbooked, lastClose, docs: await DB.val(db, 'SELECT COUNT(*) FROM fibu_docs'), entries: await DB.val(db, 'SELECT COUNT(*) FROM fibu_entries') });
  }

  /* ---------- Konten ---------- */
  if (path === '/accounts' && method === 'GET') {
    const bal = await fibuBalances(ctx, { to: q.to && isDate(q.to) ? q.to : '9999-12-31' });
    const cnt = Object.fromEntries((await DB.all(db, 'SELECT account_id, COUNT(*) AS n FROM fibu_lines GROUP BY account_id')).map((r) => [r.account_id, r.n]));
    return out({ ok: true, types: FIBU_TYPES, accounts: bal.map((a) => ({ ...a, lines: cnt[a.id] || 0 })) });
  }
  if (path === '/accounts' && method === 'POST') {
    book();
    const number = str(body.number, 8); need(/^\d{3,8}$/.test(number), 400, 'Die Kontonummer besteht aus 3 bis 8 Ziffern.');
    need(!(await DB.one(db, 'SELECT id FROM fibu_accounts WHERE number = ?', number)), 409, `Das Konto ${number} gibt es bereits.`);
    const name = str(body.name, 120); need(name, 400, 'Bitte eine Bezeichnung angeben.');
    const type = FIBU_TYPES[body.type] ? body.type : fibuGuessType(number);
    const id = await DB.insert(db, 'fibu_accounts', { number, name, type, status: 'offen', note: str(body.note, 500) || null, created_by: u.name, created_at: nowIso() });
    await audit(ctx, 'konto_angelegt', 'konto', number, { name, art: type });
    return out({ ok: true, id });
  }
  if ((m = path.match(/^\/accounts\/(\d+)(?:\/(close|reopen))?$/))) {
    const a = await DB.one(db, 'SELECT * FROM fibu_accounts WHERE id = ?', +m[1]); need(a, 404, 'Konto nicht gefunden.');
    if (!m[2] && method === 'GET') {
      const from = isDate(q.from) ? q.from : null, to = isDate(q.to) ? q.to : '9999-12-31';
      const before = from ? await DB.one(db, 'SELECT COALESCE(SUM(l.debit),0) AS d, COALESCE(SUM(l.credit),0) AS c FROM fibu_lines l JOIN fibu_entries e ON e.id = l.entry_id WHERE l.account_id = ? AND e.date < ?', a.id, from) : { d: 0, c: 0 };
      const rows = await DB.all(db, `SELECT l.debit, l.credit, e.id, e.number, e.date, e.text, e.source, e.reverses, e.reversed_by, d.number AS doc_number, d.id AS doc_id FROM fibu_lines l JOIN fibu_entries e ON e.id = l.entry_id LEFT JOIN fibu_docs d ON d.id = e.doc_id WHERE l.account_id = ? ${from ? 'AND e.date >= ?' : ''} AND e.date <= ? ORDER BY e.date, e.id`, ...[a.id, ...(from ? [from] : []), to]);
      let run = saldoOf(a.type, before.d, before.c);
      const opening = run;
      const items = rows.map((r) => { run = round2(run + saldoOf(a.type, r.debit, r.credit)); return { ...r, balance: run }; });
      return out({ ok: true, account: a, opening, items, saldo: run });
    }
    if (!m[2] && method === 'PATCH') {
      book(); const upd = {};
      if (body.name !== undefined) { upd.name = str(body.name, 120); need(upd.name, 400, 'Bitte eine Bezeichnung angeben.'); }
      if (body.note !== undefined) upd.note = str(body.note, 500) || null;
      if (body.type !== undefined) { need(FIBU_TYPES[body.type], 400, 'Ungültige Kontoart.'); need(!(await DB.val(db, 'SELECT COUNT(*) FROM fibu_lines WHERE account_id = ?', a.id)), 409, 'Die Kontoart kann nach der ersten Buchung nicht mehr geändert werden.'); upd.type = body.type; }
      await DB.update(db, 'fibu_accounts', a.id, upd); fibuAccReset(ctx); await audit(ctx, 'konto_geaendert', 'konto', a.number, upd); return out({ ok: true });
    }
    if (m[2] === 'close' && method === 'POST') {
      manage();
      need(a.status === 'offen', 409, 'Das Konto ist bereits geschlossen.');
      need(!a.sys, 409, 'Dieses Konto wird für automatische Buchungen (Rechnungen, Zahlungen, Steuern) benötigt und kann nicht geschlossen werden.');
      const b = (await fibuBalances(ctx, { to: '9999-12-31' })).find((x) => x.id === a.id);
      need(Math.abs(b.saldo) < 0.005, 409, `Das Konto hat noch einen Saldo von ${money(b.saldo)}. Bitte den Saldo zuerst auf ein anderes Konto umbuchen.`);
      await DB.update(db, 'fibu_accounts', a.id, { status: 'geschlossen', closed_at: nowIso(), closed_by: u.name, note: [a.note, body.reason ? 'Geschlossen: ' + str(body.reason, 300) : ''].filter(Boolean).join(' · ') || null });
      await audit(ctx, 'konto_geschlossen', 'konto', a.number, { grund: str(body.reason, 300) });
      return out({ ok: true });
    }
    if (m[2] === 'reopen' && method === 'POST') { admin(); need(a.status === 'geschlossen', 409, 'Das Konto ist nicht geschlossen.'); await DB.update(db, 'fibu_accounts', a.id, { status: 'offen', closed_at: null, closed_by: null }); await audit(ctx, 'konto_wieder_geoeffnet', 'konto', a.number, null); return out({ ok: true }); }
  }

  /* ---------- Buchungen ---------- */
  if (path === '/entries' && method === 'GET') {
    const where = ['1=1'], args = [];
    if (/^\d{4}(-\d{2})?$/.test(q.period || '')) { where.push('e.period LIKE ?'); args.push(q.period + '%'); }
    if (q.account) { where.push('e.id IN (SELECT entry_id FROM fibu_lines WHERE account_id = ?)'); args.push(toInt(q.account)); }
    if (q.source) { where.push('e.source = ?'); args.push(str(q.source, 30)); }
    if (q.q) { where.push('(e.text LIKE ? OR e.number LIKE ? OR d.number LIKE ?)'); const t = '%' + str(q.q, 80) + '%'; args.push(t, t, t); }
    const rows = await DB.all(db, `SELECT e.*, d.number AS doc_number FROM fibu_entries e LEFT JOIN fibu_docs d ON d.id = e.doc_id WHERE ${where.join(' AND ')} ORDER BY e.date DESC, e.id DESC LIMIT 500`, ...args);
    return out({ ok: true, entries: await entryView(rows) });
  }
  if (path === '/entries' && method === 'POST') {
    book();
    let docId = body.doc_id ? toInt(body.doc_id) : null;
    if (docId) need(await DB.one(db, 'SELECT id FROM fibu_docs WHERE id = ?', docId), 400, 'Beleg nicht gefunden.');
    if (body.file && body.file.base64) docId = await fibuArchive(ctx, { kind: FIBU_DOC_KINDS[body.doc_kind] ? body.doc_kind : 'sonstiges', title: str(body.doc_title, 200) || str(body.text, 200), date: body.date, amount: body.amount, ref: body.ref, file: body.file });
    let id;
    if (Array.isArray(body.lines) && body.lines.length) id = await fibuPost(ctx, { date: body.date, text: body.text, docId, lines: body.lines.map((l) => ({ account: toInt(l.account_id), debit: l.debit, credit: l.credit })) });
    else id = await fibuSimple(ctx, { date: body.date, text: body.text, debit: toInt(body.debit), credit: toInt(body.credit), amount: body.amount, vatRate: body.vat_rate, docId });
    const e = await DB.one(db, 'SELECT number FROM fibu_entries WHERE id = ?', id);
    await audit(ctx, 'buchung_erfasst', 'buchung', e.number, { text: str(body.text, 200), betrag: body.amount });
    return out({ ok: true, id, number: e.number, doc: docId ? await DB.val(db, 'SELECT number FROM fibu_docs WHERE id = ?', docId) : null });
  }
  if ((m = path.match(/^\/entries\/(\d+)(?:\/(reverse|doc))?$/))) {
    const e = await DB.one(db, 'SELECT * FROM fibu_entries WHERE id = ?', +m[1]); need(e, 404, 'Buchung nicht gefunden.');
    if (!m[2] && method === 'GET') { const [v] = await entryView([{ ...e, doc_number: e.doc_id ? await DB.val(db, 'SELECT number FROM fibu_docs WHERE id = ?', e.doc_id) : null }]); return out({ ok: true, entry: v }); }
    if (m[2] === 'reverse' && method === 'POST') { book(); const sid = await fibuReverse(ctx, e.id, body.reason); return out({ ok: true, id: sid, number: await DB.val(db, 'SELECT number FROM fibu_entries WHERE id = ?', sid) }); }
    if (m[2] === 'doc' && method === 'POST') {
      book(); need(!e.doc_id, 409, 'Diese Buchung hat bereits einen Beleg. Belege werden nie ausgetauscht – bitte Storno und neue Buchung.');
      let docId = body.doc_id ? toInt(body.doc_id) : null;
      if (body.file && body.file.base64) docId = await fibuArchive(ctx, { kind: FIBU_DOC_KINDS[body.doc_kind] ? body.doc_kind : 'sonstiges', title: e.text, date: e.date, ref: body.ref, file: body.file });
      need(docId && (await DB.one(db, 'SELECT id FROM fibu_docs WHERE id = ?', docId)), 400, 'Bitte einen Beleg wählen oder hochladen.');
      await DB.update(db, 'fibu_entries', e.id, { doc_id: docId }); await audit(ctx, 'beleg_zugeordnet', 'buchung', e.number, { beleg: docId });
      return out({ ok: true });
    }
  }

  /* ---------- Belegarchiv ---------- */
  if (path === '/docs' && method === 'GET') {
    const where = ['1=1'], args = [];
    if (FIBU_DOC_KINDS[q.kind]) { where.push('d.kind = ?'); args.push(q.kind); }
    if (/^\d{4}$/.test(q.year || '')) { where.push('d.date LIKE ?'); args.push(q.year + '%'); }
    if (q.q) { where.push('(d.number LIKE ? OR d.title LIKE ? OR d.counterparty LIKE ? OR d.ref LIKE ?)'); const t = '%' + str(q.q, 80) + '%'; args.push(t, t, t, t); }
    const docs = await DB.all(db, `SELECT d.*, (SELECT GROUP_CONCAT(e.number, ', ') FROM fibu_entries e WHERE e.doc_id = d.id) AS entries FROM fibu_docs d WHERE ${where.join(' AND ')} ORDER BY d.id DESC LIMIT 500`, ...args);
    return out({ ok: true, kinds: FIBU_DOC_KINDS, docs });
  }
  if (path === '/docs' && method === 'POST') {
    book();
    const id = await fibuArchive(ctx, { kind: FIBU_DOC_KINDS[body.kind] ? body.kind : 'sonstiges', title: body.title || (body.file && body.file.name) || '', date: body.date, amount: body.amount, counterparty: body.counterparty, ref: body.ref || (body.file && body.file.name ? String(body.file.name).replace(/\.pdf$/i, '') : null), file: body.file, note: body.note });
    return out({ ok: true, id, number: await DB.val(db, 'SELECT number FROM fibu_docs WHERE id = ?', id) });
  }
  if ((m = path.match(/^\/docs\/(\d+)\/file$/)) && method === 'GET') {
    const d = await DB.one(db, 'SELECT * FROM fibu_docs WHERE id = ?', +m[1]); need(d && d.file_id, 404, 'Beleg nicht gefunden.');
    await audit(ctx, 'beleg_angesehen', 'beleg', d.number, null);
    return fileResponse(await getFile(ctx, d.file_id), q.download === '1');
  }

  /* ---------- Abschlüsse ---------- */
  if (path === '/periods' && method === 'GET') {
    let start = jparse(await rawSetting(db, '_fibu_start'), null) || today.slice(0, 7);
    const first = await DB.val(db, 'SELECT MIN(period) FROM fibu_entries'); if (first && first < start) start = first;
    const rows = await DB.all(db, 'SELECT id, period, kind, status, file_id, doc_id, closed_by, closed_at, reopened_by, reopened_at, report FROM fibu_periods');
    const map = Object.fromEntries(rows.map((r) => [r.period, r]));
    const list = []; let p = today.slice(0, 7);
    for (let i = 0; i < 36 && p >= start; i++) { const r = map[p]; const rep = r && jparse(r.report, null); list.push({ period: p, kind: 'monat', status: r ? r.status : p === today.slice(0, 7) ? 'laufend' : 'offen', result: rep ? rep.result : null, closed_by: r && r.closed_by, closed_at: r && r.closed_at, has_pdf: !!(r && r.file_id) }); p = prevPeriod(p); }
    const years = []; for (let y = +today.slice(0, 4); y >= +start.slice(0, 4); y--) { const r = map[String(y)]; const rep = r && jparse(r.report, null); years.push({ period: String(y), kind: 'jahr', status: r ? r.status : y === +today.slice(0, 4) ? 'laufend' : 'offen', result: rep ? rep.result : null, closed_by: r && r.closed_by, closed_at: r && r.closed_at, has_pdf: !!(r && r.file_id) }); }
    return out({ ok: true, months: list, years });
  }
  if ((m = path.match(/^\/periods\/(\d{4}(?:-\d{2})?)(?:\/(close|reopen|pdf))?$/))) {
    const per = m[1], row = await DB.one(db, 'SELECT * FROM fibu_periods WHERE period = ?', per);
    if (!m[2] && method === 'GET') return out({ ok: true, report: row && row.status === 'abgeschlossen' ? jparse(row.report, null) : await fibuReport(ctx, per), status: row ? row.status : 'offen', closed_by: row && row.closed_by, closed_at: row && row.closed_at });
    if (m[2] === 'pdf' && method === 'GET') {
      if (row && row.file_id) return fileResponse(await getFile(ctx, row.file_id), q.download === '1');
      const s = await settingsOf(ctx); const r = await fibuReport(ctx, per);
      return new Response(renderFibuReportPdf(s, r), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="Vorschau-${per}.pdf"`, 'Cache-Control': 'no-store' } });
    }
    if (m[2] === 'close' && method === 'POST') { manage(); return out({ ok: true, ...(await fibuClosePeriod(ctx, per)) }); }
    if (m[2] === 'reopen' && method === 'POST') { admin(); return out(await fibuReopenPeriod(ctx, per)); }
  }

  /* ---------- Anfangsbestände und Import alter Buchführung ---------- */
  if (path === '/opening' && method === 'POST') {
    manage();
    const rows = (body.rows || []).filter((r) => toNum(r.amount, 0)).map((r) => ({ account_id: toInt(r.account_id), amount: r.amount }));
    need(rows.length, 400, 'Bitte mindestens einen Kontostand eintragen.');
    let docId = null; if (body.file && body.file.base64) docId = await fibuArchive(ctx, { kind: 'import', title: `Nachweis Anfangsbestände ${fmtDateDE(body.date)}`, date: body.date, file: body.file });
    const ids = await fibuOpening(ctx, { date: body.date, rows, docId });
    return out({ ok: true, created: ids.length });
  }
  if (path === '/import/parse' && method === 'POST') {
    manage();
    need(body.file && body.file.base64, 400, 'Bitte eine Datei (PDF oder CSV) hochladen.');
    const bytes = unb64(String(body.file.base64).replace(/\s+/g, ''));
    need(bytes.length <= 10 * 1024 * 1024, 400, 'Die Datei ist zu groß (max. 10 MB).');
    const isPdf = /pdf/i.test(body.file.type || '') || /\.pdf$/i.test(body.file.name || '') || new TextDecoder('latin1').decode(bytes.subarray(0, 5)) === '%PDF-';
    const lines = isPdf ? await pdfLines(bytes) : new TextDecoder(/[\xc3][\x80-\xbf]/.test(new TextDecoder('latin1').decode(bytes.subarray(0, 4000))) ? 'utf-8' : 'windows-1252').decode(bytes).split(/\r?\n/);
    const rows = fibuParseLegacy(lines);
    let docId = null;
    if (isPdf) docId = await fibuArchive(ctx, { kind: 'import', title: `Import alte Buchführung: ${str(body.file.name, 120) || 'Datei'}`, date: today, file: { ...body.file, type: 'application/pdf' } });
    await audit(ctx, 'import_gelesen', 'buchung', null, { datei: str(body.file.name, 120), zeilen: lines.length, erkannt: rows.length });
    return out({ ok: true, docId, lineCount: lines.length, textFound: lines.some((l) => l.trim()), rows, sample: lines.slice(0, 40) });
  }
  if (path === '/import/commit' && method === 'POST') { manage(); return out({ ok: true, ...(await fibuImportCommit(ctx, { mode: body.mode === 'eroeffnung' ? 'eroeffnung' : 'buchungen', date: body.date, rows: body.rows, docId: body.docId ? toInt(body.docId) : null })) }); }

  return fail(404, 'Nicht gefunden.');
}
