/* ============================================================
   Finanzbuchhaltung: Konten, doppelte Buchführung (Soll/Haben), Umsatzsteuer,
   Belegarchiv (nummeriert, mit SHA-256), Monats- und Jahresabschlüsse,
   automatische Buchungen aus Rechnungen, Zahlungen und Eingangsrechnungen,
   Anfangsbestände und Import alter Buchführung (PDF/CSV)
   Grundsatz (GoBD): Buchungen werden nie gelöscht, nur storniert (Gegenbuchung).
   ============================================================ */

const fibuPeriod = (date) => String(date).slice(0, 7);
const fibuMonthEnd = (period) => { const [y, m] = period.split('-').map(Number); return `${period}-${String(lastDayOfMonth(y, m)).padStart(2, '0')}`; };
const prevPeriod = (period) => { let [y, m] = period.split('-').map(Number); m--; if (!m) { m = 12; y--; } return `${y}-${String(m).padStart(2, '0')}`; };
const nextPeriod = (period) => { let [y, m] = period.split('-').map(Number); m++; if (m > 12) { m = 1; y++; } return `${y}-${String(m).padStart(2, '0')}`; };
const fibuWho = (ctx) => (ctx._staff ? ctx._staff.name : ctx.actor && ctx.actor.name) || 'System';
const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ''));
// Normalseite: Aktiv- und Aufwandskonten nehmen im Soll zu, Passiv- und Ertragskonten im Haben
const debitNormal = (type) => type === 'aktiv' || type === 'aufwand';
const saldoOf = (type, debit, credit) => round2(debitNormal(type) ? debit - credit : credit - debit);

async function fibuNextNo(ctx, key, prefix, date) {
  const year = String(date || berlinDate(nowMs())).slice(0, 4);
  for (let guard = 0; guard < 50; guard++) {
    const k = `_fibu_no_${key}_${year}`;
    // Zähler in einer Abfrage erhöhen und lesen
    const r = await ctx.db.prepare("INSERT INTO settings (key, value, updated_at, updated_by) VALUES (?, '2', ?, 'system') ON CONFLICT(key) DO UPDATE SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT), updated_at = excluded.updated_at RETURNING value").bind(k, nowIso()).first();
    const n = toInt(r && r.value, 2) - 1;
    const number = `${prefix}-${year}-${String(n).padStart(5, '0')}`;
    const table = key === 'beleg' ? 'fibu_docs' : 'fibu_entries';
    if (!(await DB.one(ctx.db, `SELECT id FROM ${table} WHERE number = ?`, number))) return number;
  }
  throw new HttpError(500, 'Nummer konnte nicht vergeben werden.');
}
// Kontenrahmen je Aufruf einmal laden (spart Abfragen); nach Änderungen an Konten zurücksetzen
async function fibuAccs(ctx) { if (!ctx._fibuAccs) ctx._fibuAccs = await DB.all(ctx.db, 'SELECT * FROM fibu_accounts'); return ctx._fibuAccs; }
const fibuAccReset = (ctx) => { ctx._fibuAccs = null; };
async function fibuAccountBySys(ctx, sys) {
  const a = (await fibuAccs(ctx)).find((x) => x.sys === sys);
  need(a, 500, `Systemkonto „${sys}“ fehlt im Kontenrahmen.`);
  return a;
}
// Konto über Datensatz, interne ID (Zahl) oder Systemrolle/Kontonummer (Text)
async function fibuAccount(ctx, ref) {
  if (ref && typeof ref === 'object') return ref;
  const list = await fibuAccs(ctx);
  const a = typeof ref === 'number' ? list.find((x) => x.id === ref) : (list.find((x) => x.sys === String(ref)) || list.find((x) => x.number === String(ref)));
  need(a, 400, `Konto ${ref} nicht gefunden.`);
  return a;
}
// Periode gesperrt? (Monat abgeschlossen oder ganzes Jahr abgeschlossen)
async function fibuClosed(ctx, period) {
  if (!ctx._fibuClosed) ctx._fibuClosed = new Set((await DB.all(ctx.db, "SELECT period FROM fibu_periods WHERE status = 'abgeschlossen'")).map((r) => r.period));
  return ctx._fibuClosed.has(period) || ctx._fibuClosed.has(period.slice(0, 4));
}
// Automatische Buchungen in gesperrte Perioden landen am ersten Tag der nächsten offenen Periode
async function fibuOpenDate(ctx, date) {
  let d = date, guard = 0;
  while (await fibuClosed(ctx, fibuPeriod(d)) && guard++ < 36) d = nextPeriod(fibuPeriod(d)) + '-01';
  return d;
}

/* ---------- Buchen ---------- */
async function fibuPost(ctx, { date, text, lines, docId = null, source = 'manuell', sourceId = null, auto = false, reverses = null }) {
  need(isDate(date), 400, 'Bitte ein gültiges Buchungsdatum angeben.');
  text = str(text, 300); need(text, 400, 'Bitte einen Buchungstext angeben.');
  if (await fibuClosed(ctx, fibuPeriod(date))) {
    need(auto, 409, `Der Zeitraum ${fibuPeriod(date).split('-').reverse().join('/')} ist abgeschlossen. Buchungen sind dort nicht mehr möglich – bitte ein Datum im offenen Zeitraum wählen (oder der Admin öffnet den Zeitraum wieder).`);
    date = await fibuOpenDate(ctx, date);
  }
  const rows = [];
  for (const l of lines) {
    const debit = round2(toNum(l.debit, 0) || 0), credit = round2(toNum(l.credit, 0) || 0);
    if (!debit && !credit) continue;
    need(debit >= 0 && credit >= 0, 400, 'Beträge müssen positiv sein (Soll oder Haben).');
    const a = await fibuAccount(ctx, l.account);
    need(a.status === 'offen', 409, `Das Konto ${a.number} ${a.name} ist geschlossen. Darauf kann nicht mehr gebucht werden.`);
    rows.push({ account_id: a.id, debit, credit });
  }
  need(rows.length >= 2, 400, 'Eine Buchung braucht mindestens ein Soll- und ein Habenkonto.');
  const sd = round2(rows.reduce((s, r) => s + r.debit, 0)), sc = round2(rows.reduce((s, r) => s + r.credit, 0));
  need(Math.abs(sd - sc) < 0.005 && sd > 0, 400, `Soll (${money(sd)}) und Haben (${money(sc)}) müssen gleich sein.`);
  const number = await fibuNextNo(ctx, 'buchung', 'BU', date);
  const id = await DB.insert(ctx.db, 'fibu_entries', { number, date, period: fibuPeriod(date), text, doc_id: docId, source, source_id: sourceId == null ? null : String(sourceId), reverses, created_by: fibuWho(ctx), created_at: nowIso() });
  await ctx.db.batch(rows.map((r) => ctx.db.prepare('INSERT INTO fibu_lines (entry_id, account_id, debit, credit) VALUES (?, ?, ?, ?)').bind(id, r.account_id, r.debit, r.credit)));
  return id;
}
// Einfache Buchung „Soll an Haben“ mit optionaler Umsatzsteuer-Aufteilung (Betrag = brutto)
async function fibuSimple(ctx, { date, text, debit, credit, amount, vatRate = 0, docId = null, source = 'manuell', sourceId = null, auto = false }) {
  const gross = round2(toNum(amount, 0) || 0); need(gross > 0, 400, 'Bitte einen Betrag größer 0 angeben.');
  const da = await fibuAccount(ctx, debit), ca = await fibuAccount(ctx, credit);
  need(da.id !== ca.id, 400, 'Soll- und Habenkonto müssen verschieden sein.');
  const rate = toNum(vatRate, 0) || 0;
  if (!rate) return fibuPost(ctx, { date, text, docId, source, sourceId, auto, lines: [{ account: da, debit: gross }, { account: ca, credit: gross }] });
  need([7, 19].includes(rate), 400, 'Umsatzsteuer: 0, 7 oder 19 %.');
  const net = round2(gross / (1 + rate / 100)), vat = round2(gross - net);
  if (da.type === 'aufwand' || (da.type === 'aktiv' && ca.type !== 'ertrag' && !['bank', 'kasse'].includes(da.sys))) {
    const vst = await fibuAccountBySys(ctx, rate === 7 ? 'vorsteuer7' : 'vorsteuer');
    return fibuPost(ctx, { date, text, docId, source, sourceId, auto, lines: [{ account: da, debit: net }, { account: vst, debit: vat }, { account: ca, credit: gross }] });
  }
  need(ca.type === 'ertrag', 400, 'Umsatzsteuer kann nur bei Aufwands- (Vorsteuer) oder Ertragskonten (Umsatzsteuer) aufgeteilt werden.');
  const ust = await fibuAccountBySys(ctx, rate === 7 ? 'umsatzsteuer7' : 'umsatzsteuer');
  return fibuPost(ctx, { date, text, docId, source, sourceId, auto, lines: [{ account: da, debit: gross }, { account: ca, credit: net }, { account: ust, credit: vat }] });
}
// Storno einer Buchung: Gegenbuchung mit vertauschten Seiten (Original bleibt sichtbar)
async function fibuReverse(ctx, id, reason) {
  const e = await DB.one(ctx.db, 'SELECT * FROM fibu_entries WHERE id = ?', id);
  need(e, 404, 'Buchung nicht gefunden.');
  need(!e.reversed_by && !e.reverses, 409, e.reverses ? 'Eine Stornobuchung kann nicht erneut storniert werden.' : 'Diese Buchung wurde bereits storniert.');
  reason = str(reason, 200); need(reason.length >= 3, 400, 'Bitte einen Grund für das Storno angeben.');
  const lines = await DB.all(ctx.db, 'SELECT * FROM fibu_lines WHERE entry_id = ?', id);
  const today = berlinDate(nowMs());
  const date = (await fibuClosed(ctx, e.period)) ? today : (e.date > today ? e.date : today);
  for (const l of lines) { const a = await fibuAccount(ctx, l.account_id); need(a.status === 'offen', 409, 'Ein beteiligtes Konto ist geschlossen. Bitte zuerst wieder öffnen (Admin).'); }
  const sid = await fibuPost(ctx, { date, text: `Storno ${e.number}: ${reason}`, docId: e.doc_id, source: 'storno', sourceId: e.id, reverses: e.id, lines: lines.map((l) => ({ account: l.account_id, debit: l.credit, credit: l.debit })) });
  await DB.update(ctx.db, 'fibu_entries', id, { reversed_by: sid });
  await audit(ctx, 'buchung_storniert', 'buchung', e.number, { grund: reason });
  return sid;
}

/* ---------- Belegarchiv ---------- */
async function fibuArchive(ctx, { kind = 'sonstiges', title, date, amount = null, counterparty = null, ref = null, file = null, fileId = null, note = null }) {
  need(FIBU_DOC_KINDS[kind], 400, 'Unbekannte Belegart.');
  let bytes = null, size = null;
  if (file && file.base64) {
    bytes = unb64(String(file.base64).replace(/\s+/g, ''));
    need(bytes.length <= 10 * 1024 * 1024, 400, 'Der Beleg ist zu groß (max. 10 MB).');
    need(/pdf/i.test(file.type || 'application/pdf') || /\.pdf$/i.test(file.name || ''), 400, 'Bitte den Beleg als PDF hochladen.');
    fileId = await putFile(ctx, { name: file.name || 'beleg.pdf', mime: 'application/pdf', bytes, ownerType: 'beleg', ownerId: null });
  } else if (fileId) { const f = await getFile(ctx, fileId); bytes = f ? f.bytes : null; }
  need(fileId, 400, 'Bitte den Beleg als PDF hochladen.');
  size = bytes ? bytes.length : null;
  const d = isDate(date) ? date : berlinDate(nowMs());
  const number = await fibuNextNo(ctx, 'beleg', 'BE', d);
  const id = await DB.insert(ctx.db, 'fibu_docs', { number, date: d, kind, title: str(title, 200) || FIBU_DOC_KINDS[kind], amount: amount == null || amount === '' ? null : round2(toNum(amount, 0)), counterparty: str(counterparty, 200) || null,
    ref: str(ref, 100) || null, file_id: fileId, sha256: bytes ? await sha256Hex(bytes) : null, size, note: str(note, 1000) || null, created_by: fibuWho(ctx), created_at: nowIso() });
  await DB.run(ctx.db, "UPDATE files SET owner_type = 'beleg', owner_id = ? WHERE id = ? AND (owner_type IS NULL OR owner_type = 'beleg')", id, fileId);
  await audit(ctx, 'beleg_archiviert', 'beleg', number, { art: kind, titel: title });
  return id;
}

/* ---------- Kontostände und Berichte ---------- */
async function fibuBalances(ctx, { from = null, to = null } = {}) {
  const accts = await DB.all(ctx.db, 'SELECT * FROM fibu_accounts ORDER BY number');
  const sums = async (cond, args) => Object.fromEntries((await DB.all(ctx.db, `SELECT l.account_id, COALESCE(SUM(l.debit),0) AS d, COALESCE(SUM(l.credit),0) AS c FROM fibu_lines l JOIN fibu_entries e ON e.id = l.entry_id WHERE ${cond} GROUP BY l.account_id`, ...args)).map((r) => [r.account_id, r]));
  const before = from ? await sums('e.date < ?', [from]) : {};
  const within = await sums(from && to ? 'e.date >= ? AND e.date <= ?' : to ? 'e.date <= ?' : '1=1', from && to ? [from, to] : to ? [to] : []);
  return accts.map((a) => {
    const b = before[a.id] || { d: 0, c: 0 }, w = within[a.id] || { d: 0, c: 0 };
    const opening = from ? saldoOf(a.type, b.d, b.c) : 0;
    return { ...a, opening, debit: round2(w.d), credit: round2(w.c), saldo: round2(opening + saldoOf(a.type, w.d, w.c)) };
  });
}
async function fibuReport(ctx, period) {
  const year = period.slice(0, 4), isYear = period.length === 4;
  const from = isYear ? `${year}-01-01` : `${period}-01`, to = isYear ? `${year}-12-31` : fibuMonthEnd(period);
  const rows = await fibuBalances(ctx, { from, to });
  // GuV: Erfolgskonten im Zeitraum (ohne Vortrag), Ergebnis seit Jahresbeginn
  const guv = rows.filter((a) => a.type === 'ertrag' || a.type === 'aufwand').map((a) => ({ number: a.number, name: a.name, type: a.type, amount: saldoOf(a.type, a.debit, a.credit) }));
  const income = round2(guv.filter((g) => g.type === 'ertrag').reduce((s, g) => s + g.amount, 0)), expense = round2(guv.filter((g) => g.type === 'aufwand').reduce((s, g) => s + g.amount, 0));
  const ytd = isYear ? null : await fibuBalances(ctx, { from: `${year}-01-01`, to });
  const ytdResult = ytd ? round2(ytd.filter((a) => a.type === 'ertrag').reduce((s, a) => s + saldoOf(a.type, a.debit, a.credit), 0) - ytd.filter((a) => a.type === 'aufwand').reduce((s, a) => s + saldoOf(a.type, a.debit, a.credit), 0)) : null;
  // Bestandskonten (Vermögen/Schulden) zum Stichtag – alle Buchungen bis Periodenende
  const stock = (await fibuBalances(ctx, { to })).filter((a) => a.type === 'aktiv' || a.type === 'passiv').map((a) => ({ number: a.number, name: a.name, type: a.type, saldo: a.saldo }));
  const entries = await DB.val(ctx.db, 'SELECT COUNT(*) FROM fibu_entries WHERE date >= ? AND date <= ?', from, to);
  const docs = await DB.val(ctx.db, 'SELECT COUNT(*) FROM fibu_docs WHERE date >= ? AND date <= ?', from, to);
  const openRec = await DB.one(ctx.db, "SELECT COUNT(*) AS n, COALESCE(SUM(gross + fees - paid),0) AS sum FROM invoices WHERE status IN ('offen','teilbezahlt') AND kind != 'storno' AND issue_date <= ?", to);
  const openPay = await DB.one(ctx.db, "SELECT COUNT(*) AS n, COALESCE(SUM(gross),0) AS sum FROM purchase_invoices WHERE status != 'bezahlt' AND date <= ?", to);
  return { period, kind: isYear ? 'jahr' : 'monat', from, to, created_at: nowIso(),
    accounts: rows.filter((a) => a.opening || a.debit || a.credit || a.saldo).map((a) => ({ number: a.number, name: a.name, type: a.type, opening: a.opening, debit: a.debit, credit: a.credit, saldo: a.saldo })),
    guv, income, expense, result: round2(income - expense), ytdResult, stock, entries, docs,
    openReceivables: { n: openRec.n, sum: round2(openRec.sum) }, openPayables: { n: openPay.n, sum: round2(openPay.sum) } };
}
const periodLabel = (p) => (p.length === 4 ? `Jahr ${p}` : `${['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'][+p.slice(5) - 1]} ${p.slice(0, 4)}`);
function renderFibuReportPdf(s, r) {
  const title = r.kind === 'jahr' ? `Jahresabschluss ${r.period}` : `Monatsabschluss ${periodLabel(r.period)}`;
  const sub = `${s.company_name} · Zeitraum ${fmtDateDE(r.from)} – ${fmtDateDE(r.to)} · erstellt ${fmtDE(msOf(r.created_at))} · ${r.entries} Buchungen, ${r.docs} Belege`;
  return renderReportPdf(s, title, sub, [
    { title: 'Ergebnis', columns: ['', 'Betrag'], widths: [mm(120), mm(50)], rows: [['Erträge', money(r.income)], ['Aufwendungen', money(r.expense)], [r.result >= 0 ? 'Gewinn im Zeitraum' : 'Verlust im Zeitraum', money(r.result)], ...(r.ytdResult != null ? [['Ergebnis seit Jahresbeginn', money(r.ytdResult)]] : []),
      ['Offene Forderungen (Ausgangsrechnungen)', `${money(r.openReceivables.sum)} (${r.openReceivables.n})`], ['Offene Verbindlichkeiten (Eingangsrechnungen)', `${money(r.openPayables.sum)} (${r.openPayables.n})`]] },
    { title: 'Gewinn- und Verlustrechnung', columns: ['Konto', 'Bezeichnung', 'Art', 'Betrag'], widths: [mm(20), mm(90), mm(25), mm(35)], rows: r.guv.filter((g) => g.amount).map((g) => [g.number, g.name, g.type === 'ertrag' ? 'Ertrag' : 'Aufwand', money(g.amount)]) },
    { title: 'Summen- und Saldenliste', columns: ['Konto', 'Bezeichnung', 'Vortrag', 'Soll', 'Haben', 'Saldo'], widths: [mm(16), mm(62), mm(23), mm(23), mm(23), mm(23)], rows: r.accounts.map((a) => [a.number, a.name, money(a.opening), money(a.debit), money(a.credit), money(a.saldo)]) },
    { title: `Bestandskonten zum ${fmtDateDE(r.to)}`, columns: ['Konto', 'Bezeichnung', 'Art', 'Saldo'], widths: [mm(20), mm(90), mm(25), mm(35)], rows: r.stock.filter((a) => a.saldo).map((a) => [a.number, a.name, a.type === 'aktiv' ? 'Aktiva' : 'Passiva', money(a.saldo)]) }
  ]);
}
async function fibuClosePeriod(ctx, period, { auto = false, silent = false } = {}) {
  need(/^\d{4}(-\d{2})?$/.test(period), 400, 'Ungültiger Zeitraum.');
  const isYear = period.length === 4;
  const today = berlinDate(nowMs());
  need((isYear ? `${period}-12-31` : fibuMonthEnd(period)) < today, 409, 'Ein Zeitraum kann erst nach seinem Ende abgeschlossen werden.');
  const ex = await DB.one(ctx.db, 'SELECT * FROM fibu_periods WHERE period = ?', period);
  need(!ex || ex.status !== 'abgeschlossen', 409, 'Dieser Zeitraum ist bereits abgeschlossen.');
  // Jahresabschluss: noch offene Monate seit Beginn der Finanzbuchhaltung vorher abschließen (das Jahr sperrt ohnehin alle Monate)
  if (isYear) {
    const start = jparse(await rawSetting(ctx.db, '_fibu_start'), `${period}-01`);
    const done = new Set((await DB.all(ctx.db, "SELECT period FROM fibu_periods WHERE period LIKE ? AND status = 'abgeschlossen'", `${period}-%`)).map((r) => r.period));
    for (let m = 1; m <= 12; m++) { const p = `${period}-${String(m).padStart(2, '0')}`; if (p >= start && !done.has(p) && fibuMonthEnd(p) < today) await fibuClosePeriod(ctx, p, { auto: true, silent: true }).catch(() => null); }
  }
  const s = await settingsOf(ctx);
  const report = await fibuReport(ctx, period);
  const pdf = renderFibuReportPdf(s, report);
  const label = isYear ? `Jahresabschluss ${period}` : `Monatsabschluss ${periodLabel(period)}`;
  const fileId = await putFile(ctx, { name: `${isYear ? 'Jahresabschluss' : 'Monatsabschluss'}-${period}.pdf`, mime: 'application/pdf', bytes: pdf, ownerType: 'abschluss', ownerId: null });
  const docId = await fibuArchive(ctx, { kind: 'abschluss', title: label, date: report.to, amount: report.result, fileId, note: auto ? 'Automatisch erstellt' : `Erstellt von ${fibuWho(ctx)}` });
  const row = { period, kind: isYear ? 'jahr' : 'monat', status: 'abgeschlossen', report: JSON.stringify(report), file_id: fileId, doc_id: docId, closed_by: auto ? 'System (automatisch)' : fibuWho(ctx), closed_at: nowIso() };
  if (ex) await DB.update(ctx.db, 'fibu_periods', ex.id, row); else await DB.insert(ctx.db, 'fibu_periods', row);
  ctx._fibuClosed = null;
  await audit(ctx, isYear ? 'jahresabschluss' : 'monatsabschluss', 'abschluss', period, { ergebnis: report.result, buchungen: report.entries });
  // Neue Nachricht an Geschäftsführung (und Admin)
  if (!silent) await notifyStaff(ctx, { perm: 'fibu_manage' }, { kind: 'buchhaltung', title: `${label} liegt vor`, body: `${report.result >= 0 ? 'Gewinn' : 'Verlust'} im Zeitraum: ${money(report.result)} · Erträge ${money(report.income)} · Aufwand ${money(report.expense)}${report.ytdResult != null ? ` · seit Jahresbeginn ${money(report.ytdResult)}` : ''}. Der Bericht liegt als PDF im Belegarchiv.`, link: '#/fibu/abschluesse' });
  return { period, result: report.result, docId };
}
async function fibuReopenPeriod(ctx, period) {
  const ex = await DB.one(ctx.db, "SELECT * FROM fibu_periods WHERE period = ? AND status = 'abgeschlossen'", period);
  need(ex, 404, 'Dieser Zeitraum ist nicht abgeschlossen.');
  if (period.length === 7) need(!(await fibuClosed(ctx, period.slice(0, 4))), 409, 'Das Jahr ist abgeschlossen. Bitte zuerst den Jahresabschluss wieder öffnen.');
  await DB.update(ctx.db, 'fibu_periods', ex.id, { status: 'wieder_geoeffnet', reopened_by: fibuWho(ctx), reopened_at: nowIso() });
  ctx._fibuClosed = null;
  await audit(ctx, 'abschluss_wieder_geoeffnet', 'abschluss', period, null);
  return { ok: true };
}
// Täglicher Ablauf: Vormonat am 1. (ab 1:00 Uhr) abschließen, Vorjahr am 1. Januar.
// Je Aufruf höchstens ein Abschluss (Abfragelimit je Aufruf) – fehlende Monate werden in den nächsten Durchläufen nachgeholt.
async function runFibuJobs(ctx, { force = false } = {}) {
  const p = berlinParts(nowMs()), today = berlinDate(nowMs());
  if (!force && p.h < 1) return { result: 'noch nicht fällig', pending: false };
  let start = jparse(await rawSetting(ctx.db, '_fibu_start'), null);
  if (!start) { start = today.slice(0, 7); await setRawSetting(ctx.db, '_fibu_start', JSON.stringify(start)); }
  const prev = prevPeriod(today.slice(0, 7));
  const have = new Set((await DB.all(ctx.db, 'SELECT period FROM fibu_periods WHERE period >= ?', start.slice(0, 4))).map((r) => r.period));
  const todo = [];
  for (let m = start; m <= prev; m = nextPeriod(m)) if (!have.has(m)) todo.push(m);
  for (let y = +start.slice(0, 4); y < p.y; y++) if (!have.has(String(y))) todo.push(String(y));
  // Monate eines Jahres vor dem Jahresabschluss
  todo.sort((a, b) => (a.slice(0, 4) === b.slice(0, 4) ? b.length - a.length : a < b ? -1 : 1));
  if (!todo.length) return { result: 'nichts fällig', pending: false };
  const r = await fibuClosePeriod(ctx, todo[0], { auto: true });
  return { result: r.period, pending: todo.length > 1 };
}

/* ---------- Automatische Buchungen aus Rechnungen und Zahlungen ---------- */
// Fehler in der Buchführung dürfen Rechnungen und Zahlungen nie blockieren – sie werden gemeldet
async function fibuSafe(ctx, what, fn) {
  try { return await fn(); }
  catch (e) {
    console.log('Fibu ' + what, e.message);
    await audit(ctx, 'fibu_fehler', 'buchung', null, { vorgang: what, fehler: e.message }).catch(() => null);
    await notifyStaff(ctx, { perm: 'fibu_book' }, { kind: 'fehler', title: `Buchung fehlgeschlagen: ${what}`, body: e.message + ' – bitte manuell buchen.', link: '#/fibu/buchungen' }).catch(() => null);
    return null;
  }
}
const already = async (ctx, source, sourceId) => !!(await DB.one(ctx.db, 'SELECT id FROM fibu_entries WHERE source = ? AND source_id = ? AND reverses IS NULL', source, String(sourceId)));
async function fibuBookInvoice(ctx, invId) {
  return fibuSafe(ctx, 'Ausgangsrechnung', async () => {
    if (await already(ctx, 'rechnung', invId)) return null;
    const inv = await DB.one(ctx.db, 'SELECT * FROM invoices WHERE id = ?', invId); if (!inv || !inv.gross) return null;
    const neg = inv.gross < 0, gross = Math.abs(inv.gross), net = Math.abs(inv.net), vat = Math.abs(inv.vat);
    const docId = inv.file_id ? await fibuArchive(ctx, { kind: 'ausgangsrechnung', title: `${inv.kind === 'storno' ? 'Stornorechnung' : 'Rechnung'} ${inv.number}`, date: inv.issue_date, amount: inv.gross, counterparty: jparse(inv.recipient, {}).name, ref: inv.number, fileId: inv.file_id }) : null;
    const fo = await fibuAccountBySys(ctx, 'forderungen'), er = await fibuAccountBySys(ctx, 'erloese'), ust = await fibuAccountBySys(ctx, 'umsatzsteuer');
    const lines = [{ account: fo, debit: gross }, { account: er, credit: net }, ...(vat ? [{ account: ust, credit: vat }] : [])];
    return fibuPost(ctx, { date: inv.issue_date, text: `${inv.kind === 'storno' ? 'Stornorechnung' : 'Rechnung'} ${inv.number} · ${jparse(inv.recipient, {}).name || ''}`.trim(), docId, source: 'rechnung', sourceId: invId, auto: true,
      lines: neg ? lines.map((l) => ({ account: l.account, debit: l.credit || 0, credit: l.debit || 0 })) : lines });
  });
}
async function fibuBookPayment(ctx, invId, amount, date, paymentId) {
  return fibuSafe(ctx, 'Zahlungseingang', async () => {
    const inv = await DB.one(ctx.db, 'SELECT number FROM invoices WHERE id = ?', invId);
    const a = round2(amount); if (!a) return null;
    const bank = await fibuAccountBySys(ctx, 'bank'), fo = await fibuAccountBySys(ctx, 'forderungen');
    return fibuPost(ctx, { date, text: `Zahlungseingang ${inv.number}`, source: 'zahlung', sourceId: paymentId, auto: true,
      lines: a > 0 ? [{ account: bank, debit: a }, { account: fo, credit: a }] : [{ account: fo, debit: -a }, { account: bank, credit: -a }] });
  });
}
async function fibuBookDunningFee(ctx, invId, fee, dunningId) {
  return fibuSafe(ctx, 'Mahngebühr', async () => {
    if (!fee) return null;
    const inv = await DB.one(ctx.db, 'SELECT number FROM invoices WHERE id = ?', invId);
    return fibuPost(ctx, { date: berlinDate(nowMs()), text: `Mahngebühr ${inv.number}`, source: 'mahngebuehr', sourceId: dunningId, auto: true,
      lines: [{ account: await fibuAccountBySys(ctx, 'forderungen'), debit: fee }, { account: await fibuAccountBySys(ctx, 'mahngebuehren'), credit: fee }] });
  });
}
// Eingangsrechnung: Aufwand (netto) + Vorsteuer an Verbindlichkeiten (brutto)
async function fibuBookPurchase(ctx, piId) {
  const pi = await DB.one(ctx.db, 'SELECT p.*, s.name AS supplier_name FROM purchase_invoices p JOIN suppliers s ON s.id = p.supplier_id WHERE p.id = ?', piId);
  need(pi, 404, 'Eingangsrechnung nicht gefunden.');
  if (pi.entry_id) return pi.entry_id;
  need(pi.account_id, 400, 'Bitte ein Aufwandskonto für die Eingangsrechnung wählen.');
  const acc = await fibuAccount(ctx, pi.account_id);
  const gross = round2(pi.gross || 0); need(gross > 0, 400, 'Bitte den Bruttobetrag der Eingangsrechnung angeben.');
  const vat = round2(pi.vat || 0), net = round2(gross - vat);
  const rate = toNum(pi.vat_rate, null) ?? (net ? Math.round((vat / net) * 100) : 0);
  let docId = pi.doc_id;
  if (!docId && pi.file_id) { docId = await fibuArchive(ctx, { kind: 'eingangsrechnung', title: `Eingangsrechnung ${pi.number || ''} · ${pi.supplier_name}`.trim(), date: pi.date, amount: gross, counterparty: pi.supplier_name, ref: pi.number, fileId: pi.file_id }); }
  const vst = vat ? await fibuAccountBySys(ctx, rate === 7 ? 'vorsteuer7' : 'vorsteuer') : null;
  const id = await fibuPost(ctx, { date: isDate(pi.date) ? pi.date : berlinDate(nowMs()), text: `ER ${pi.number || '–'} · ${pi.supplier_name}${pi.text ? ' · ' + pi.text : ''}`, docId, source: 'eingangsrechnung', sourceId: pi.id, auto: true,
    lines: [{ account: acc, debit: net }, ...(vat ? [{ account: vst, debit: vat }] : []), { account: await fibuAccountBySys(ctx, 'verbindlichkeiten'), credit: gross }] });
  await DB.update(ctx.db, 'purchase_invoices', pi.id, { entry_id: id, doc_id: docId, updated_at: nowIso() });
  return id;
}
async function fibuBookPurchasePaid(ctx, piId, date) {
  return fibuSafe(ctx, 'Zahlung Eingangsrechnung', async () => {
    const pi = await DB.one(ctx.db, 'SELECT p.*, s.name AS supplier_name FROM purchase_invoices p JOIN suppliers s ON s.id = p.supplier_id WHERE p.id = ?', piId);
    if (!pi || pi.pay_entry_id || !pi.entry_id) return null;
    const id = await fibuPost(ctx, { date: date || berlinDate(nowMs()), text: `Zahlung ER ${pi.number || '–'} · ${pi.supplier_name}`, docId: pi.doc_id, source: 'zahlung_er', sourceId: pi.id, auto: true,
      lines: [{ account: await fibuAccountBySys(ctx, 'verbindlichkeiten'), debit: pi.gross }, { account: await fibuAccountBySys(ctx, 'bank'), credit: pi.gross }] });
    await DB.update(ctx.db, 'purchase_invoices', pi.id, { pay_entry_id: id });
    return id;
  });
}

/* ---------- Anfangsbestände und Import ---------- */
// Kontoart aus der Kontonummer ableiten (angelehnt an SKR03)
function fibuGuessType(number) {
  const n = toInt(String(number).slice(0, 4), 0), l = String(number).length;
  const k = l <= 4 ? n : toInt(String(number).slice(0, 4), 0);
  if (k >= 8000 && k < 9000) return 'ertrag';
  if (k >= 2700 && k < 2800) return 'ertrag';
  if ((k >= 3000 && k < 8000) || (k >= 2000 && k < 2700)) return 'aufwand';
  if ((k >= 1600 && k < 2000) || (k >= 800 && k < 1000) || k >= 9000) return 'passiv';
  return 'aktiv';
}
async function fibuEnsureAccount(ctx, number, name) {
  number = String(number).trim(); need(/^\d{3,8}$/.test(number), 400, `Ungültige Kontonummer „${number}“.`);
  const ex = await DB.one(ctx.db, 'SELECT * FROM fibu_accounts WHERE number = ?', number);
  if (ex) return ex;
  fibuAccReset(ctx);
  const id = await DB.insert(ctx.db, 'fibu_accounts', { number, name: str(name, 120) || `Konto ${number}`, type: fibuGuessType(number), status: 'offen', note: 'Beim Import angelegt', created_by: fibuWho(ctx), created_at: nowIso() });
  return DB.one(ctx.db, 'SELECT * FROM fibu_accounts WHERE id = ?', id);
}
// Anfangsbestände: Betrag auf der Normalseite des Kontos (Aktiv = Soll, Passiv = Haben); negativ = Gegenseite
async function fibuOpening(ctx, { date, rows, docId = null, note = 'Anfangsbestand' }) {
  need(isDate(date), 400, 'Bitte einen Stichtag angeben.');
  const ev = await fibuAccountBySys(ctx, 'eroeffnung');
  const ids = [];
  for (const r of rows) {
    const a = r.account_id ? await fibuAccount(ctx, r.account_id) : await fibuEnsureAccount(ctx, r.number, r.name);
    need(a.type === 'aktiv' || a.type === 'passiv', 400, `Anfangsbestände gibt es nur für Bestandskonten (Konto ${a.number} ist ein ${a.type === 'ertrag' ? 'Ertrags' : 'Aufwands'}konto). Erfolgskonten starten bei 0.`);
    let amt = round2(toNum(r.amount, 0) || 0); if (!amt) continue;
    if (r.side === 'H' && debitNormal(a.type)) amt = -amt; if (r.side === 'S' && !debitNormal(a.type)) amt = -amt;
    const onDebit = debitNormal(a.type) ? amt > 0 : amt < 0, v = Math.abs(amt);
    ids.push(await fibuPost(ctx, { date, text: `${note} ${a.number} ${a.name}`, docId, source: 'eroeffnung', lines: onDebit ? [{ account: a, debit: v }, { account: ev, credit: v }] : [{ account: ev, debit: v }, { account: a, credit: v }] }));
  }
  await audit(ctx, 'anfangsbestaende', 'buchung', null, { stichtag: date, konten: ids.length });
  return ids;
}
// Text eines PDFs zeilenweise: Textstücke mit Position sammeln, nach Zeile (y) gruppieren und nach x sortieren
async function pdfLines(bytes) {
  const raw = new TextDecoder('latin1').decode(bytes);
  const pages = []; const re = /stream\r?\n/g; let mt;
  while ((mt = re.exec(raw))) {
    const start = mt.index + mt[0].length, end = raw.indexOf('endstream', start); if (end < 0) break;
    const dict = raw.slice(Math.max(0, mt.index - 300), mt.index), data = bytes.subarray(start, end);
    let txt = '';
    if (/FlateDecode/.test(dict)) { try { txt = new TextDecoder('latin1').decode(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer()); } catch (e) { txt = ''; } } else txt = new TextDecoder('latin1').decode(data);
    re.lastIndex = end;
    if (!/\bTj\b|\bTJ\b/.test(txt)) continue;
    const items = []; let lx = 0, ly = 0, lead = 0;
    for (const t of txt.matchAll(/BT|(-?[\d.]+)\s+(-?[\d.]+)\s+(T[dD])|(-?[\d.]+)\s+TL|(?:-?[\d.]+\s+){4}(-?[\d.]+)\s+(-?[\d.]+)\s+Tm|T\*|\((?:\\.|[^\\)])*\)\s*(?:Tj|'|")|\[(?:[^\]]*)\]\s*TJ/g)) {
      const s = t[0];
      if (s === 'BT') { lx = 0; ly = 0; continue; }
      if (t[3]) { lx += +t[1]; ly += +t[2]; if (t[3] === 'TD') lead = -+t[2]; continue; }
      if (t[4] !== undefined && /TL$/.test(s)) { lead = +t[4]; continue; }
      if (/Tm$/.test(s)) { lx = +t[5]; ly = +t[6]; continue; }
      if (s === 'T*') { ly -= lead || 12; continue; }
      const strs = [...s.matchAll(/\(((?:\\.|[^\\)])*)\)/g)].map((x) => x[1].replace(/\\(\d{3})/g, (_, o) => String.fromCharCode(parseInt(o, 8))).replace(/\\([()\\])/g, '$1'));
      const text = strs.join(''); if (text.trim()) items.push({ x: lx, y: ly, text });
    }
    pages.push(items);
  }
  const out = [];
  for (const items of pages) {
    const rows = [];
    for (const it of items.sort((a, b) => b.y - a.y || a.x - b.x)) { const r = rows.find((x) => Math.abs(x.y - it.y) < 2.5); if (r) r.items.push(it); else rows.push({ y: it.y, items: [it] }); }
    for (const r of rows.sort((a, b) => b.y - a.y)) out.push(r.items.sort((a, b) => a.x - b.x).map((i) => i.text).join(' ').replace(/\s+/g, ' ').trim());
  }
  return out.filter(Boolean);
}
const DE_AMOUNT = /-?\d{1,3}(?:\.\d{3})*,\d{2}|-?\d+,\d{2}/g;
// Zeilen alter Buchführung erkennen: Buchungsjournal (Datum, Beleg, Text, Soll, Haben, Betrag) oder Saldenliste (Konto, Name, Saldo, S/H)
function fibuParseLegacy(lines) {
  const rows = [];
  for (const raw of lines) {
    const line = raw.replace(/\s+/g, ' ').trim(); if (!line) continue;
    const parts = line.includes(';') ? line.split(';').map((x) => x.trim()) : null;
    if (parts && parts.length >= 6 && /^\d{1,2}\.\d{1,2}\.\d{2,4}$/.test(parts[0])) {
      const [d, ref, text, soll, haben, betrag] = parts;
      rows.push({ kind: 'buchung', date: deDate(d), ref, text, debit: soll, credit: haben, amount: toNum(betrag) }); continue;
    }
    const dm = line.match(/^(\d{1,2}\.\d{1,2}\.(?:\d{4}|\d{2}))\s+(.*)$/);
    if (dm) {
      const amounts = dm[2].match(DE_AMOUNT) || [], accts = (dm[2].replace(DE_AMOUNT, ' ').match(/\b\d{4,8}\b/g) || []);
      if (amounts.length && accts.length >= 2) {
        const ref = (dm[2].match(/^(\S+)\s/) || [])[1];
        const text = dm[2].replace(DE_AMOUNT, ' ').replace(/\b\d{4,8}\b/g, ' ').replace(ref && !/^\d{4,8}$/.test(ref) ? ref : '\u0000', ' ').replace(/\s+/g, ' ').trim();
        rows.push({ kind: 'buchung', date: deDate(dm[1]), ref: ref && !/^\d{4,8}$/.test(ref) ? ref : '', text: text || 'Übernahme', debit: accts[0], credit: accts[1], amount: Math.abs(toNum(amounts[amounts.length - 1])) });
        continue;
      }
    }
    const sm = line.match(/^(\d{3,8})\s+(.+?)\s+((?:-?\d{1,3}(?:\.\d{3})*,\d{2}\s*)+)\s*(S|H|Soll|Haben)?$/i);
    if (sm) {
      const nums = sm[3].match(DE_AMOUNT) || []; const amount = toNum(nums[nums.length - 1]);
      if (amount !== null) rows.push({ kind: 'saldo', number: sm[1], name: sm[2].trim(), amount: Math.abs(amount), side: sm[4] ? sm[4][0].toUpperCase() : amount < 0 ? 'H' : 'S' });
    }
  }
  return rows;
}
function deDate(d) { const m = String(d).match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/); if (!m) return null; const y = m[3].length === 2 ? '20' + m[3] : m[3]; return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; }
async function fibuImportCommit(ctx, { mode, date, rows, docId }) {
  need(Array.isArray(rows) && rows.length, 400, 'Keine Zeilen zum Übernehmen ausgewählt.');
  need(rows.length <= 2000, 400, 'Bitte höchstens 2.000 Zeilen auf einmal übernehmen.');
  if (mode === 'eroeffnung') return { created: (await fibuOpening(ctx, { date, rows: rows.map((r) => ({ number: r.number, name: r.name, amount: r.amount, side: r.side })), docId, note: 'Übernahme Saldo' })).length };
  let n = 0;
  for (const r of rows) {
    const da = await fibuEnsureAccount(ctx, r.debit), ca = await fibuEnsureAccount(ctx, r.credit);
    const refDoc = r.ref ? await DB.one(ctx.db, 'SELECT id FROM fibu_docs WHERE ref = ? ORDER BY id DESC LIMIT 1', r.ref) : null;
    await fibuPost(ctx, { date: r.date, text: `${r.text || 'Übernahme'}${r.ref ? ' · Beleg ' + r.ref : ''}`, docId: refDoc ? refDoc.id : docId, source: 'import', lines: [{ account: da, debit: Math.abs(toNum(r.amount)) }, { account: ca, credit: Math.abs(toNum(r.amount)) }] });
    n++;
  }
  await audit(ctx, 'buchfuehrung_importiert', 'buchung', null, { buchungen: n });
  return { created: n };
}
