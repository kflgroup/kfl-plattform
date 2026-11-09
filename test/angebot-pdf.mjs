// Angebots-PDF der Partner auslesen: Leasing/Finanzierung/Kauf/Ankauf, KI mit Schema, Netto/Brutto, Plausibilität, Ersatz ohne KI
import { makeD1, makeR2, installFetch, SECRET, sig, nowSec, setNow, client, check } from './harness.mjs';
const worker = (await import('./wk.mjs')).default;
installFetch();
setNow('2026-11-09T10:00:00Z');
// Workers AI: toMarkdown liefert den Text hinter „TEXT:“; das Modell antwortet mit dem JSON hinter „KI:“
const AI = { runs: 0, conv: 0, prompts: [] };
const ai = {
  async toMarkdown(doc) { AI.conv++; const s = Buffer.from(await doc.blob.arrayBuffer()).toString('latin1'); const t = (s.match(/TEXT:([\s\S]*?)\nendstream/) || [])[1]; return { name: doc.name, format: t ? 'text' : 'error', data: t || 'kaputt' }; },
  async run(model, inp) { AI.runs++; if (AI.next) { const n = AI.next; AI.next = null; return { response: n }; } AI.prompts.push(inp.messages[0].content); AI.schema = inp.response_format; const m = inp.messages[1].content.match(/KI:(\{.*\})/); if (!m) throw new Error('JSON Mode couldn\'t be met'); return { response: JSON.parse(m[1]) }; }
};
const env = { DB: makeD1(), FILES: makeR2(), FORM_SECRET: SECRET, SETUP_TOKEN: 'setup-123', BREVO_API_KEY: 'test-brevo', AI: ai };
const sq = env.DB._sq, c = client(worker, env), q1 = (sql, ...a) => sq.prepare(sql).get(...a);
const pdf = (text) => Buffer.from(`%PDF-1.4\n1 0 obj<<>>stream\nTEXT:${text}\nendstream\nendobj\n%%EOF`).toString('base64');

await c.post('/api/setup', { token: 'setup-123', email: 'admin@kfl.de', name: 'Tobias Admin', password: 'AdminPass123!' }, { who: 'admin' });
const org = (await c.post('/api/orgs', { name: 'Autohaus Alpha', kind: 'einzel', zip: '49074', email: 'a@a.de', brands: ['Audi', 'Opel'] }, { who: 'admin' })).id;
await c.patch(`/api/orgs/${org}`, { accepts: ['deal', 'sell'] }, { who: 'admin' });
const u = await c.post(`/api/orgs/${org}/users`, { email: 'p@alpha.de', name: 'Paul Partner', role: 'gf' }, { who: 'admin' });
const inv = await c.post(`/api/orgs/${org}/users/${u.id}/invite`, {}, { who: 'admin' });
await c.post('/papi/invite/accept', { token: inv.link.split('/').pop(), password: 'Partner12345!', agb: true, privacy: true }, { who: 'p' });
const kid = '777';
const send = async (extra) => { const ts = nowSec(); return c.post('/', { _form: 'deal', _kid: kid, _ts: ts, _sig: sig(`${kid}.${ts}.deal`), Zustand: 'Neuwagen', Marke: 'Audi', Modell: 'A3', Kundenart: 'Privat', Umkreis: '100 km', Vorname: 'Klara', name: 'Kunde', email: 'k@kunde.de', phone: '0171 1', PLZ: '49451', Ort: 'Holdorf', 'AGB akzeptiert': 'Ja', 'Datenschutz akzeptiert': 'Ja', 'Weitergabe an Partner und Kontaktaufnahme': 'Ja', ...extra }); };
const take = async (reqNo) => { const a = q1('SELECT id FROM assignments WHERE request_id = ? AND org_id = ?', reqNo - 1000, org).id; await c.post(`/papi/requests/${a}/take`, {}, { who: 'p' }); return a; };

console.log('Leasingangebot (KI)');
await send({ Bezahlart: 'leasen', Laufzeit: '36 Monate', 'Kilometer pro Jahr': '10000' });
let a = await take(1001);
const leasing = 'Leasingangebot Audi A3 Sportback 35 TFSI · Leasingrate 349,00 EUR mtl. inkl. MwSt. · Laufzeit 48 Monate · 15.000 km/Jahr · Sonderzahlung 2.500,00 EUR · Überführung 1.090 EUR · Lieferzeit ca. 10 Wochen · gültig bis 30.11.2026';
let r = await c.post(`/papi/requests/${a}/parse-pdf`, { base64: pdf(leasing + ' KI:' + JSON.stringify({ vehicle: 'Audi A3 Sportback 35 TFSI', price_basis: 'brutto', monthly_rate: 349, term_months: 48, km_per_year: 15000, down_payment: 2500, transfer_cost: 1090, delivery: 'ca. 10 Wochen', valid_until: '2026-11-30', price: 38990 })), vat: 'brutto' }, { who: 'p' });
const s = r.suggestions || {};
check(r.ok && r.kind === 'leasing' && r.method === 'ki' && AI.conv === 1 && AI.runs === 1, 'Leasing erkannt, Text per Workers AI, Eckdaten per KI', r);
check(s.monthly_rate === 349 && s.term_months === 48 && s.km_per_year === 15000 && s.down_payment === 2500 && s.transfer_cost === 1090 && s.delivery === 'ca. 10 Wochen' && s.valid_until === '2026-11-30', 'Rate, Laufzeit, km, Sonderzahlung, Überführung, Lieferzeit, Gültigkeit übernommen', s);
check(s.price === undefined && r.vehicle === 'Audi A3 Sportback 35 TFSI', 'Nur Felder der Angebotsart (kein Kaufpreis bei Leasing), Fahrzeug erkannt');
check(/Leasingangebot/.test(AI.prompts[0]) && AI.schema && AI.schema.type === 'json_schema', 'KI bekommt Angebotsart und festes Schema');
check(q1("SELECT COUNT(*) AS n FROM audit WHERE action = 'partner_angebot_pdf_gelesen'").n === 1, 'Auslesen steht im Protokoll');
AI.next = { monthly_rate: 249, term_months: 36, km_per_year: 20000 };
r = await c.post(`/papi/requests/${a}/parse-pdf`, { base64: pdf('Leasingrate 349,00 EUR · Laufzeit 48 Monate'), vat: 'brutto' }, { who: 'p' });
check(r.suggestions.monthly_rate === 349 && r.suggestions.term_months === 48 && r.suggestions.km_per_year === undefined, 'Von der KI erfundene Werte werden verworfen bzw. durch den Text ersetzt', r);

console.log('Netto/Brutto und Plausibilität');
r = await c.post(`/papi/requests/${a}/parse-pdf`, { base64: pdf('Angebot KI:' + JSON.stringify({ price_basis: 'netto', monthly_rate: 300, term_months: 400, km_per_year: 12, valid_until: '2025-01-01' })), vat: 'brutto' }, { who: 'p' });
check(r.suggestions.monthly_rate === 357 && r.converted && r.suggestions.term_months === undefined && r.suggestions.km_per_year === undefined && r.suggestions.valid_until === undefined, 'Netto-Rate in brutto umgerechnet; unplausible Laufzeit/km und abgelaufenes Datum verworfen', r);

console.log('Finanzierungsangebot (ohne KI-Antwort: Muster-Erkennung)');
await send({ Bezahlart: 'finanzieren', Laufzeit: '48 Monate' });
a = await take(1002);
r = await c.post(`/papi/requests/${a}/parse-pdf`, { base64: pdf('Finanzierungsangebot Kaufpreis 32.500,00 EUR Anzahlung 5.000,00 EUR Monatliche Rate 299,00 EUR Laufzeit 48 Monate Schlussrate 12.400,00 EUR'), vat: 'brutto' }, { who: 'p' });
check(r.ok && r.kind === 'finanzierung' && r.method === 'text' && r.suggestions.price === 32500 && r.suggestions.down_payment === 5000 && r.suggestions.monthly_rate === 299 && r.suggestions.term_months === 48 && r.suggestions.final_rate === 12400, 'Finanzierung: Kaufpreis, Anzahlung, Rate, Laufzeit, Schlussrate aus dem Text', r);

console.log('Kauf für Gewerbekunden (netto)');
await send({ Bezahlart: 'kaufen', Kundenart: 'Gewerblich' });
a = await take(1003);
r = await c.post(`/papi/requests/${a}/parse-pdf`, { base64: pdf('Kaufangebot KI:' + JSON.stringify({ price_basis: 'brutto', price: 35700, transfer_cost: 1190, monthly_rate: 400 })), vat: 'netto' }, { who: 'p' });
check(r.kind === 'kauf' && r.suggestions.price === 30000 && r.suggestions.transfer_cost === 1000 && r.suggestions.monthly_rate === undefined, 'Brutto-Preise für Gewerbekunden in netto umgerechnet, keine Rate beim Kauf', r);

console.log('Ohne Workers AI und bei Scans');
const env2 = { ...env, AI: undefined }, c2 = client(worker, env2);
await c2.post('/papi/login', { email: 'p@alpha.de', password: 'Partner12345!' }, { who: 'p2' });
const raw = Buffer.from('%PDF-1.4\n1 0 obj<<>>stream\nBT (Kaufpreis 28.900,00 EUR) Tj ET\nendstream\nendobj\n%%EOF').toString('base64');
r = await c2.post(`/papi/requests/${a}/parse-pdf`, { base64: raw, vat: 'brutto' }, { who: 'p2' });
check(r.ok && r.method === 'text' && r.suggestions.price === 28900, 'Ohne KI: eigener PDF-Textleser', r);
r = await c.post(`/papi/requests/${a}/parse-pdf`, { base64: Buffer.from('%PDF-1.4 kein Text').toString('base64'), vat: 'brutto' }, { who: 'p' });
check(r.ok && !r.textFound && !Object.keys(r.suggestions).length, 'Scan ohne Text: Hinweis statt Fehler', r);
console.log('fertig');
