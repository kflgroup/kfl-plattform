/* ===== Rechnungs-Postfach: E-Mails mit PDF-Rechnung (IMAP) → Eingangsrechnungen „zu prüfen“ =====
   Abruf per IMAP (TLS 993, Standard IONOS). Das Postfach wird nur gelesen (BODY.PEEK), nichts wird verschoben oder gelöscht.
   Auslesen: Workers AI (Markdown-Umwandlung der PDF + strukturierte Auswertung), sonst Textmuster. Jede Rechnung wird von einem Menschen geprüft. */
const INBOX_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const INBOX_MAX_BYTES = 15 * 1024 * 1024;
function inboxCred(env, s) {
  const user = String(s.invoice_inbox || '').trim().toLowerCase();
  if (!user || !s.invoice_inbox_active) return null;
  const local = user.split('@')[0].replace(/[^a-z0-9]/gi, '_').toUpperCase();
  const pass = env.INBOX_PASS || env['SMTP_PASS_' + local];
  return { user, pass: pass || '', passKey: env.INBOX_PASS ? 'INBOX_PASS' : 'SMTP_PASS_' + local, host: env.INBOX_HOST || 'imap.ionos.de', port: toInt(env.INBOX_PORT, 993) || 993 };
}
/* ---------- IMAP (minimal: LOGIN, SELECT, UID SEARCH, UID FETCH BODY.PEEK[], LOGOUT) ---------- */
async function imapSession(cred, fn) {
  const socket = SMTP_CONNECT({ hostname: cred.host, port: cred.port }, { secureTransport: 'on', allowHalfOpen: false });
  const writer = socket.writable.getWriter(), reader = socket.readable.getReader(), enc = new TextEncoder();
  let buf = new Uint8Array(65536), start = 0, end = 0, tagN = 0;
  const more = async () => {
    const { value, done } = await reader.read(); if (done) throw new Error('IMAP-Verbindung wurde getrennt.');
    if (end + value.length > buf.length) { const n = new Uint8Array(Math.max(buf.length * 2, end - start + value.length + 65536)); n.set(buf.subarray(start, end)); end -= start; start = 0; buf = n; }
    buf.set(value, end); end += value.length;
  };
  const latin = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192)); return s; };
  const line = async () => { for (;;) { for (let i = start; i < end - 1; i++) if (buf[i] === 13 && buf[i + 1] === 10) { const l = latin(buf.subarray(start, i)); start = i + 2; return l; } await more(); } };
  const bytes = async (n) => { while (end - start < n) await more(); const b = buf.slice(start, start + n); start += n; return b; };
  const quote = (v) => '"' + String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  const cmd = async (text) => {
    const tag = 'K' + (++tagN), out = [];
    await writer.write(enc.encode(`${tag} ${text}\r\n`));
    for (;;) {
      let l = await line();
      if (l.startsWith(tag + ' ')) { if (!/^\S+ OK/i.test(l)) { const e = new Error('IMAP: ' + l.slice(tag.length + 1, 240)); e.imap = true; throw e; } return out; }
      const item = { line: l, literals: [] };
      let m;
      while ((m = l.match(/\{(\d+)\}$/))) { item.literals.push(await bytes(+m[1])); l = await line(); item.line += '\n' + l; }
      out.push(item);
    }
  };
  const timeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('IMAP-Zeitüberschreitung')), ms))]);
  try {
    const greet = await timeout(line(), 15000);
    if (!/^\* (OK|PREAUTH)/i.test(greet)) throw new Error('IMAP-Server antwortet nicht wie erwartet.');
    await timeout(cmd(`LOGIN ${quote(cred.user)} ${quote(cred.pass)}`), 15000).catch((e) => { throw new Error(e.imap ? 'Anmeldung am Rechnungs-Postfach fehlgeschlagen (Benutzer oder Passwort falsch).' : e.message); });
    return await timeout(fn({ cmd, quote }), 40000);
  } finally {
    try { await writer.write(enc.encode('Z LOGOUT\r\n')); } catch (e) { /* egal */ }
    try { socket.close(); } catch (e) { /* egal */ }
  }
}
/* ---------- MIME ---------- */
const latin1Bytes = (s) => { const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 255; return u; };
function decodeWords(v) {
  const dec = (cs, u8) => { try { return new TextDecoder(cs || 'utf-8').decode(u8); } catch (e) { return new TextDecoder('utf-8').decode(u8); } };
  let out = String(v || '').replace(/\?=\s+=\?/g, '?==?').replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (_, cs, k, t) => {
    if (k.toUpperCase() === 'B') { try { return dec(cs, latin1Bytes(atob(t.replace(/\s+/g, '')))); } catch (e) { return t; } }
    return dec(cs, latin1Bytes(t.replace(/_/g, ' ').replace(/=([0-9A-F]{2})/gi, (x, h) => String.fromCharCode(parseInt(h, 16)))));
  });
  if (/[\x80-\xff]/.test(out)) { try { out = new TextDecoder('utf-8', { fatal: true }).decode(latin1Bytes(out)); } catch (e) { /* bleibt latin1 */ } }
  return out.trim();
}
function mimeParams(v) {
  const o = {}, ext = {}; const parts = String(v || '').split(/;(?=(?:[^"]*"[^"]*")*[^"]*$)/).slice(1);
  for (const p of parts) {
    const i = p.indexOf('='); if (i < 0) continue;
    const k = p.slice(0, i).trim().toLowerCase(); let val = p.slice(i + 1).trim().replace(/^"(.*)"$/s, '$1');
    // RFC 2231: filename*=utf-8''Rechnung%20Oktober.pdf, auch in Teilen (filename*0*=…; filename*1*=…)
    if (k.includes('*')) { const base = k.split('*')[0]; if (k.endsWith('*')) { const m = val.match(/^([^']*)'[^']*'(.*)$/); if (m) val = m[2]; try { val = decodeURIComponent(val); } catch (e) { /* roh */ } } ext[base] = (ext[base] || '') + val; continue; }
    o[k] = decodeWords(val);
  }
  return Object.assign(o, ext);
}
function mimeParse(raw, depth = 0) {
  const sep = raw.search(/\r?\n\r?\n/);
  const head = sep < 0 ? raw : raw.slice(0, sep), body = sep < 0 ? '' : raw.slice(sep).replace(/^\r?\n\r?\n/, '');
  const headers = {};
  for (const l of head.replace(/\r?\n[ \t]+/g, ' ').split(/\r?\n/)) { const k = l.indexOf(':'); if (k > 0) { const n = l.slice(0, k).trim().toLowerCase(); if (!(n in headers)) headers[n] = l.slice(k + 1).trim(); } }
  const ct = headers['content-type'] || 'text/plain';
  const part = { headers, type: ct.split(';')[0].trim().toLowerCase(), params: mimeParams(ct), disp: mimeParams(headers['content-disposition'] || ''), body, parts: [] };
  if (depth > 6) return part;
  if (part.type.startsWith('multipart/') && part.params.boundary) {
    const segs = body.split('--' + part.params.boundary);
    for (let k = 1; k < segs.length; k++) { if (segs[k].startsWith('--')) break; part.parts.push(mimeParse(segs[k].replace(/^[ \t]*\r?\n/, '').replace(/\r?\n$/, ''), depth + 1)); }
  } else if (part.type === 'message/rfc822') part.parts.push(mimeParse(body, depth + 1));
  return part;
}
function mimePartBytes(p) {
  const cte = String(p.headers['content-transfer-encoding'] || '').toLowerCase();
  if (cte === 'base64') return latin1Bytes(atob(p.body.replace(/[^A-Za-z0-9+/=]/g, '')));
  if (cte === 'quoted-printable') return latin1Bytes(p.body.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/gi, (x, h) => String.fromCharCode(parseInt(h, 16))));
  return latin1Bytes(p.body);
}
function mimePdfs(part, out = []) {
  const name = part.disp.filename || part.params.name || '';
  const isPdf = part.type === 'application/pdf' || ((part.type === 'application/octet-stream' || part.type === 'application/x-pdf') && /\.pdf$/i.test(name)) || (/\.pdf$/i.test(name) && !part.type.startsWith('multipart/'));
  if (isPdf) { const bytes = mimePartBytes(part); if (bytes.length > 4 && bytes[0] === 0x25 && bytes[1] === 0x50) out.push({ name: name || 'rechnung.pdf', bytes }); }
  for (const c of part.parts) mimePdfs(c, out);
  return out;
}
function mailAddress(v) { const s = decodeWords(v); const m = s.match(/<([^>]+)>/) || s.match(/([^\s<>"]+@[^\s<>"]+)/); const email = m ? m[1].trim().toLowerCase() : ''; const name = s.replace(/<[^>]*>/, '').replace(/"/g, '').trim(); return { email, name: name && name !== email ? name : '' }; }
/* ---------- Auslesen der Rechnung ---------- */
const INVOICE_SCHEMA = { type: 'object', properties: {
  supplier_name: { type: 'string' }, invoice_number: { type: 'string' }, invoice_date: { type: 'string', description: 'YYYY-MM-DD' }, due_date: { type: 'string', description: 'YYYY-MM-DD' },
  net: { type: 'number' }, vat: { type: 'number' }, gross: { type: 'number' }, vat_rate: { type: 'number' }, currency: { type: 'string' },
  iban: { type: 'string' }, vat_id: { type: 'string' }, supplier_email: { type: 'string' }, description: { type: 'string' }, reverse_charge: { type: 'boolean' } }, required: ['supplier_name', 'invoice_number', 'gross'] };
const inNum = (s) => { if (s === null || s === undefined) return null; let t = String(s).replace(/[€\sEUR]/g, ''); if (/,\d{1,2}$/.test(t)) t = t.replace(/\./g, '').replace(',', '.'); else t = t.replace(/,/g, ''); const n = parseFloat(t); return isFinite(n) ? n : null; };
const inDate = (s) => { const m = String(s || '').match(/(\d{1,2})\.\s?(\d{1,2})\.\s?(\d{2,4})/); if (!m) return /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) ? String(s) : null; const y = m[3].length === 2 ? '20' + m[3] : m[3]; return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; };
function invoiceFromText(text, own) {
  const t = String(text || ''), r = {};
  const AMT = '(-?\\d{1,3}(?:[.\\s]\\d{3})*,\\d{2}|-?\\d+[.,]\\d{2})';
  const num = t.match(/(?:Rechnungs?\s*-?\s*(?:nummer|nr\.?)|Rechnung\s*Nr\.?|Beleg\s*-?\s*Nr\.?|Invoice\s*(?:No\.?|number|#))\s*[:#.]?\s*([A-Z0-9][A-Z0-9\-\/._]{1,30})/i);
  if (num) r.invoice_number = num[1].replace(/[.]$/, '');
  const dt = t.match(/(?:Rechnungsdatum|Belegdatum|Datum der Rechnung|Invoice date|Datum)\s*[:.]?\s*(\d{1,2}\.\s?\d{1,2}\.\s?\d{2,4})/i); if (dt) r.invoice_date = inDate(dt[1]);
  const due = t.match(/(?:fällig(?:\s+am|\s+bis)?|zahlbar\s+(?:bis|am)|Zahlungsziel|Due date)\s*[:.]?\s*(\d{1,2}\.\s?\d{1,2}\.\s?\d{2,4})/i); if (due) r.due_date = inDate(due[1]);
  const grossAll = [...t.matchAll(new RegExp('(?:Gesamtbetrag|Rechnungsbetrag|Gesamtsumme|Endbetrag|Zu zahlen(?:der Betrag)?|Zahlbetrag|Bruttobetrag|Summe brutto|Total)[^\\d\\-\\n]{0,40}' + AMT, 'gi'))].map((m) => inNum(m[1])).filter((x) => x !== null);
  if (grossAll.length) r.gross = Math.max(...grossAll);
  const net = t.match(new RegExp('(?:Nettobetrag|Summe netto|Netto(?:summe)?|Zwischensumme)[^\\d\\-\\n]{0,40}' + AMT, 'i')); if (net) r.net = inNum(net[1]);
  const rate = t.match(/(\d{1,2})(?:[,.]0+)?\s*%\s*(?:MwSt|Mehrwertsteuer|USt|Umsatzsteuer|VAT)/i) || t.match(/(?:MwSt|Mehrwertsteuer|USt|Umsatzsteuer)[^%\n]{0,25}?(\d{1,2})(?:[,.]0+)?\s*%/i); if (rate) r.vat_rate = +rate[1];
  if (/Reverse[- ]?Charge|Steuerschuldnerschaft des Leistungsempfängers|§\s*13b/i.test(t)) { r.reverse_charge = true; r.vat_rate = 0; }
  const ownIban = String((own && own.iban) || '').replace(/\s/g, '').toUpperCase(), ownVat = String((own && own.vat) || '').replace(/\s/g, '').toUpperCase();
  const iban = [...t.matchAll(/\b([A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){3,7}(?:\s?[A-Z0-9]{1,3})?)\b/g)].map((m) => m[1].replace(/\s/g, '').toUpperCase()).find((x) => x !== ownIban && ibanValid(x)); if (iban) r.iban = iban;
  const vid = [...t.matchAll(/\b(DE\s?\d{9}|ATU\d{8}|[A-Z]{2}[A-Z0-9]{8,12})\b/g)].map((m) => m[1].replace(/\s/g, '').toUpperCase()).find((x) => x !== ownVat && /^(DE\d{9}|ATU\d{8})$/.test(x)); if (vid) r.vat_id = vid;
  return r;
}
async function extractInvoice(ctx, pdf, own) {
  const env = ctx.env; let text = '', method = 'keine', ai = null, error = null;
  if (env.AI) {
    try {
      const res = await env.AI.toMarkdown({ name: pdf.name.replace(/[^\w.\-]/g, '_') || 'rechnung.pdf', blob: new Blob([pdf.bytes], { type: 'application/pdf' }) }, { conversionOptions: { output: { format: 'text' } } });
      const one = Array.isArray(res) ? res[0] : res; if (one && one.format !== 'error') text = String(one.data || ''); else if (one) error = String(one.data || 'Umwandlung fehlgeschlagen').slice(0, 200);
    } catch (e) { error = e.message; }
    if (text.trim()) {
      try {
        const res = await env.AI.run(INBOX_MODEL, { max_tokens: 700, response_format: { type: 'json_schema', json_schema: INVOICE_SCHEMA }, messages: [
          { role: 'system', content: 'Du liest Eingangsrechnungen für die Buchhaltung der KFL GbR (Rechnungsempfänger). Antworte nur mit JSON nach Schema. supplier_name ist der Rechnungssteller, nicht KFL. Datumsangaben als YYYY-MM-DD, Beträge als Zahl in Euro. Fehlende Werte weglassen.' },
          { role: 'user', content: String(text).slice(0, 12000) }] });
        ai = typeof res.response === 'string' ? JSON.parse(res.response) : res.response;
        if (ai && typeof ai === 'object') method = 'ki'; else ai = null;
      } catch (e) { error = error || e.message; }
    }
  }
  const rx = invoiceFromText(text, own);
  if (method !== 'ki' && text.trim()) method = 'text';
  const pick = (k) => { const a = ai && ai[k]; return a !== undefined && a !== null && a !== '' ? a : rx[k]; };
  const f = {};
  for (const k of Object.keys(INVOICE_SCHEMA.properties)) { const v = pick(k); if (v !== undefined && v !== null && v !== '') f[k] = v; }
  for (const k of ['net', 'vat', 'gross', 'vat_rate']) if (f[k] !== undefined) { const n = typeof f[k] === 'number' ? f[k] : inNum(f[k]); if (n === null) delete f[k]; else f[k] = round2(n); }
  for (const k of ['invoice_date', 'due_date']) if (f[k]) { f[k] = inDate(f[k]); if (!f[k]) delete f[k]; }
  if (f.iban) { f.iban = ibanClean(f.iban); if (!ibanValid(f.iban) || f.iban === String((own && own.iban) || '').replace(/\s/g, '').toUpperCase()) delete f.iban; }
  if (f.vat_id) f.vat_id = String(f.vat_id).replace(/\s/g, '').toUpperCase();
  if (f.reverse_charge) f.vat_rate = 0;
  if (f.vat_rate !== undefined && ![0, 7, 19].includes(f.vat_rate)) delete f.vat_rate;
  return { fields: f, method, error, text: text.slice(0, 20000) };
}
/* ---------- Lieferant finden oder anlegen ---------- */
async function inboxSupplier(ctx, f, sender) {
  const db = ctx.db, ownDomain = /@kfl-group\.com$/i.test(sender.email);
  let s = null;
  if (f.vat_id) s = await DB.one(db, "SELECT id FROM suppliers WHERE replace(upper(vat_id), ' ', '') = ? ORDER BY active DESC, id LIMIT 1", f.vat_id);
  if (!s && f.iban) s = await DB.one(db, 'SELECT id FROM suppliers WHERE iban = ? ORDER BY active DESC, id LIMIT 1', f.iban);
  if (!s && sender.email && !ownDomain) s = await DB.one(db, 'SELECT id FROM suppliers WHERE lower(email) = ? ORDER BY active DESC, id LIMIT 1', sender.email);
  const name = str(f.supplier_name || (!ownDomain && (sender.name || sender.email.split('@')[1])) || '', 160);
  if (!s && name) s = await DB.one(db, 'SELECT id FROM suppliers WHERE lower(trim(name)) = lower(trim(?)) ORDER BY active DESC, id LIMIT 1', name);
  if (s) return { id: s.id, created: false };
  const id = await DB.insert(db, 'suppliers', { name: name || 'Unbekannter Lieferant', email: (!ownDomain && sender.email) || str(f.supplier_email, 160) || null, iban: f.iban || null, vat_id: f.vat_id || null,
    note: 'Automatisch aus dem Rechnungs-Postfach angelegt – bitte Stammdaten prüfen.', active: 1, created_at: nowIso() });
  await audit(ctx, 'lieferant_angelegt', 'lieferant', id, { name, automatisch: 'Rechnungs-Postfach' });
  return { id, created: true };
}
/* ---------- Abruf ---------- */
const INBOX_STATE = '_inbox_state';
async function inboxSaveState(ctx, st) { await ctx.db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at, updated_by) VALUES (?, ?, ?, 'system')").bind(INBOX_STATE, JSON.stringify(st), nowIso()).run(); }
async function inboxState(ctx) { return jparse(await rawSetting(ctx.db, INBOX_STATE), {}) || {}; }
// Holt höchstens `max` neue E-Mails (Standard 1 je Cron-Lauf, wegen der Abfragegrenze je Aufruf)
async function runInbox(ctx, s, { max = 1, force = false } = {}) {
  const cred = inboxCred(ctx.env, s); if (!cred) return 'aus';
  if (!cred.pass) return `Passwort fehlt: In Cloudflare die geheime Variable ${cred.passKey} anlegen.`;
  const st = await inboxState(ctx);
  if (!force && st.at && nowMs() - msOf(st.at) < 9 * 60e3) return 'wartet';
  st.at = nowIso();
  let imported = 0, skipped = 0;
  try {
    const mails = await imapSession(cred, async ({ cmd }) => {
      const sel = await cmd('SELECT INBOX');
      const uv = toInt(((sel.map((x) => x.line).join('\n').match(/UIDVALIDITY (\d+)/i)) || [])[1], 0);
      if (st.uidvalidity !== uv) { st.uidvalidity = uv; st.last = null; }
      let uids;
      if (!st.last) {
        // Erster Abruf: nur E-Mails der letzten Tage übernehmen, ältere bleiben unberührt
        const d = new Date(nowMs() - toInt(s.invoice_inbox_days, 14) * 86400e3), MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const r = await cmd(`UID SEARCH SINCE ${d.getUTCDate()}-${MON[d.getUTCMonth()]}-${d.getUTCFullYear()}`);
        uids = ((r.find((x) => /^\* SEARCH/i.test(x.line)) || { line: '' }).line.replace(/^\* SEARCH/i, '').trim().split(/\s+/).filter(Boolean).map(Number));
        st.last = uids.length ? Math.min(...uids) - 1 : toInt(((await cmd('UID SEARCH ALL')).find((x) => /^\* SEARCH/i.test(x.line)) || { line: '' }).line.replace(/^\* SEARCH/i, '').trim().split(/\s+/).filter(Boolean).map(Number).pop(), 0);
      } else {
        const r = await cmd(`UID SEARCH UID ${st.last + 1}:*`);
        uids = ((r.find((x) => /^\* SEARCH/i.test(x.line)) || { line: '' }).line.replace(/^\* SEARCH/i, '').trim().split(/\s+/).filter(Boolean).map(Number));
      }
      uids = uids.filter((u) => u > st.last).sort((a, b) => a - b);
      st.pending = Math.max(0, uids.length - max);
      const out = [];
      for (const uid of uids.slice(0, max)) {
        const sz = await cmd(`UID FETCH ${uid} (RFC822.SIZE)`);
        const size = toInt(((sz.map((x) => x.line).join(' ').match(/RFC822\.SIZE (\d+)/i)) || [])[1], 0);
        if (size > INBOX_MAX_BYTES) { out.push({ uid, tooBig: size }); continue; }
        const r = await cmd(`UID FETCH ${uid} (BODY.PEEK[])`);
        const lit = r.find((x) => x.literals.length);
        out.push({ uid, raw: lit ? lit.literals[0] : null });
      }
      return out;
    });
    for (const m of mails) {
      if (m.tooBig || !m.raw) { skipped++; st.last = m.uid; continue; }
      const res = await importInvoiceMail(ctx, s, m.raw, `${st.uidvalidity}:${m.uid}`);
      imported += res.imported; skipped += res.skipped;
      st.last = m.uid;
    }
    st.ok = true; st.error = null; st.imported = (st.imported || 0) + imported; if (imported) st.last_import = nowIso();
  } catch (e) { st.ok = false; st.error = String(e.message || e).slice(0, 300); }
  await inboxSaveState(ctx, st);
  if (!st.ok) {
    // Störung höchstens einmal täglich melden
    if (!st.warned || nowMs() - msOf(st.warned) > 86400e3) { st.warned = nowIso(); await inboxSaveState(ctx, st); await notifyStaff(ctx, { perm: 'acc_manage' }, { kind: 'fehler', title: 'Rechnungs-Postfach nicht erreichbar', body: st.error, link: '#/buchhaltung/eingang' }); }
    return 'Fehler: ' + st.error;
  }
  return `${imported} importiert${skipped ? `, ${skipped} übersprungen` : ''}${st.pending ? `, ${st.pending} wartend` : ''}`;
}
async function importInvoiceMail(ctx, s, rawBytes, ref) {
  let raw = ''; for (let i = 0; i < rawBytes.length; i += 8192) raw += String.fromCharCode.apply(null, rawBytes.subarray(i, i + 8192));
  const mail = mimeParse(raw);
  const sender = mailAddress(mail.headers.from || ''), subject = decodeWords(mail.headers.subject || '').slice(0, 200);
  const pdfs = mimePdfs(mail).slice(0, 3);
  let imported = 0, skipped = 0;
  if (!pdfs.length) return { imported, skipped: 1 };
  const own = { iban: s.company_iban, vat: s.company_vat_id };
  for (const [i, pdf] of pdfs.entries()) {
    const sha = await sha256Hex(pdf.bytes);
    if (await DB.one(ctx.db, 'SELECT id FROM purchase_invoices WHERE pdf_sha = ?', sha)) { skipped++; continue; }
    const ex = await extractInvoice(ctx, pdf, own), f = ex.fields;
    const sup = await inboxSupplier(ctx, f, sender);
    const rate = f.vat_rate !== undefined ? f.vat_rate : null;
    let gross = f.gross !== undefined ? f.gross : null, net = f.net !== undefined ? f.net : null, vat = f.vat !== undefined ? f.vat : null;
    if (gross !== null && net === null && rate !== null) net = round2(gross / (1 + rate / 100));
    if (gross === null && net !== null && rate !== null) gross = round2(net * (1 + rate / 100));
    if (gross !== null && net !== null && vat === null) vat = round2(gross - net);
    const fileId = await putFile(ctx, { name: pdf.name, mime: 'application/pdf', bytes: pdf.bytes, ownerType: 'purchase' });
    const id = await DB.insert(ctx.db, 'purchase_invoices', { supplier_id: sup.id, number: str(f.invoice_number, 80) || null, date: f.invoice_date || null, due_date: f.due_date || null,
      net: net || 0, vat: vat || 0, gross: gross || 0, vat_rate: rate, status: 'pruefen', file_id: fileId, text: str(f.description, 300) || null,
      note: `Aus dem Rechnungs-Postfach: E-Mail von ${sender.name ? sender.name + ' ' : ''}<${sender.email || 'unbekannt'}>, Betreff „${subject}“`,
      source: 'postfach', mail_ref: `${ref}:${i}`, pdf_sha: sha, extract: JSON.stringify({ method: ex.method, error: ex.error, fields: f, supplier_created: sup.created, sender, subject }), created_at: nowIso(), updated_at: nowIso() });
    await audit(ctx, 'eingangsrechnung_postfach', 'eingangsrechnung', id, { lieferant: f.supplier_name || sender.email, brutto: gross, verfahren: ex.method });
    imported++;
  }
  if (imported) await notifyStaff(ctx, { perm: 'acc_manage' }, { kind: 'info', title: imported > 1 ? `${imported} neue Eingangsrechnungen zu prüfen` : 'Neue Eingangsrechnung zu prüfen', body: `Von ${sender.name || sender.email || 'unbekannt'}: ${subject}`.slice(0, 200), link: '#/buchhaltung/eingang?status=pruefen' });
  return { imported, skipped };
}
async function inboxInfo(ctx, s) {
  const cred = inboxCred(ctx.env, s), st = await inboxState(ctx);
  return { address: s.invoice_inbox || '', active: !!s.invoice_inbox_active, password: !!(cred && cred.pass), passKey: cred ? cred.passKey : null, ai: !!ctx.env.AI,
    at: st.at || null, ok: st.ok === undefined ? null : st.ok, error: st.error || null, imported: st.imported || 0, last_import: st.last_import || null, pending: st.pending || 0 };
}
