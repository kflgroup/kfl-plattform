// Ende-zu-Ende-Test der KFL Plattform 2.0
import { makeD1, makeR2, installFetch, mails, SECRET, sig, nowSec, setNow, advance, client, check, cron } from './harness.mjs';
const worker = (await import('./wk.mjs')).default;
installFetch();
const env = { DB: makeD1(), FILES: makeR2(), FORM_SECRET: SECRET, SETUP_TOKEN: 'setup-123', BREVO_API_KEY: 'test-brevo', AREA_PASSWORD: 'Test-Bereich-2026' };
const sq = env.DB._sq;
const c = client(worker, env);
const q1 = (sql, ...a) => sq.prepare(sql).get(...a);
const qa = (sql, ...a) => sq.prepare(sql).all(...a);
const lastMailTo = (email) => [...mails].reverse().find((m) => m.to.some((t) => t.email === email));
const tokenFrom = (link) => (link || '').split('/').pop();
setNow('2026-11-03T09:00:00Z'); // Dienstag 10:00 Uhr Berlin
// Sitzungen laufen nach 12 h ab – nach Zeitsprüngen alle neu anmelden
async function relogin() {
  for (const who of Object.keys(c.jar)) {
    if (who === 'admin') await c.post('/api/login', { email: 'admin@kfl.de', password: 'AdminPass123' }, { who });
    else if (/^(a_|b_|c_)/.test(who)) await c.post('/papi/login', { email: who + '@partner.de', password: 'Partner12345' }, { who });
    else await c.post('/api/login', { email: who + '@kfl.de', password: 'Passwort1234' }, { who });
  }
}

console.log('1) Einrichtung, Mitarbeiter, Rollen');
let r = await c.get('/api/session');
check(r.needsSetup === true, 'Ersteinrichtung nötig');
r = await c.post('/api/setup', { token: 'setup-123', email: 'admin@kfl.de', name: 'Tobias Admin', password: 'AdminPass123' }, { who: 'admin' });
check(r.ok, 'Admin angelegt', r);
const staff = {};
for (const [key, role, by] of [['gf', 'gf', 'admin'], ['tl', 'teamleitung', 'admin'], ['vt', 'vertrieb', 'admin'], ['bh', 'buchhaltung', 'admin']]) {
  r = await c.post('/api/users', { email: key + '@kfl.de', name: key.toUpperCase() + ' Mitarbeiter', role_key: role }, { who: by });
  check(r.ok && r.invite, `Mitarbeiter ${role} angelegt`, r);
  const acc = await c.post('/api/invite/accept', { token: tokenFrom(r.invite), password: 'Passwort1234' }, { who: key });
  check(acc.ok, `${role}: Passwort gesetzt`, acc);
  staff[key] = r.id;
}
r = await c.post('/api/users', { email: 'x@kfl.de', name: 'X', role_key: 'admin' }, { who: 'gf' });
check(r.status === 403, 'GF darf keinen Admin anlegen');
r = await c.post('/api/users', { email: 'x2@kfl.de', name: 'X2', role_key: 'gf' }, { who: 'gf' });
check(r.status === 403, 'GF darf keine Geschäftsführung anlegen');
r = await c.post('/api/users', { email: 'vt2@kfl.de', name: 'VT Zwei', role_key: 'vertrieb' }, { who: 'tl' });
check(r.ok, 'Teamleitung legt Vertrieb an'); staff.vt2 = r.id;
await c.post('/api/invite/accept', { token: tokenFrom(r.invite), password: 'Passwort1234' }, { who: 'vt2' });
r = await c.post('/api/users', { email: 'bh2@kfl.de', name: 'BH Zwei', role_key: 'buchhaltung' }, { who: 'tl' });
check(r.status === 403, 'Teamleitung darf keine Buchhaltung anlegen');
r = await c.patch('/api/users/' + staff.vt2, { locked: true }, { who: 'gf' });
check(r.status === 403, 'GF darf keine Konten sperren');
r = await c.patch('/api/users/' + staff.vt2, { extra_perms: ['stats_view'] }, { who: 'gf' });
check(r.status === 403, 'GF darf keine Sonderrechte vergeben');
r = await c.patch('/api/users/' + staff.vt, { extra_perms: ['team_stats'] }, { who: 'admin' });
check(r.ok, 'Admin vergibt Sonderrecht');
r = await c.get('/api/session', { who: 'vt' });
check(r.user.perms.includes('team_stats') && !r.user.perms.includes('acc_view'), 'Vertrieb hat Sonderrecht, aber keine Buchhaltung');
r = await c.get('/api/acc/overview', { who: 'vt' }); check(r.status === 403, 'Vertrieb: Buchhaltung gesperrt');
r = await c.get('/api/requests', { who: 'bh' }); check(r.status === 403, 'Buchhaltung: Anfragen gesperrt');
r = await c.get('/api/stats/overview', { who: 'tl' }); check(r.status === 403, 'Teamleitung: Gesamtstatistik gesperrt');
r = await c.get('/api/stats/staff', { who: 'tl' }); check(r.ok, 'Teamleitung: Team-Auswertung erlaubt');
r = await c.patch('/api/settings', { lead_price_deal: 49, lead_price_sell: 39, company_iban: 'DE02120300000000202051', company_tax_no: '64/123/45678', company_owners: 'T. Krusch, A. Beispiel' }, { who: 'admin' });
check(r.ok, 'Admin: Einstellungen gespeichert', r);
r = await c.patch('/api/settings', { company_iban: 'DE00' }, { who: 'gf' });
check(r.ok && q1("SELECT value FROM settings WHERE key = 'company_iban'").value.includes('DE02'), 'GF kann Firmen-IBAN nicht ändern (Feld ignoriert)');

console.log('2) Geschäftspartner und Partnerkonten');
const org = {};
for (const [k, o] of [['A', { name: 'Autohaus Alpha GmbH', kind: 'organisation', street: 'Hauptstr. 1', zip: '49074', city: 'Osnabrück', email: 'info@alpha.de', billing_email: 'rechnung@alpha.de', brands: ['Audi', 'Volkswagen'], billing_mode: 'monatlich', vat_id: 'DE123456789' }],
  ['B', { name: 'Bremer Autos', kind: 'einzel', street: 'Weserstr. 2', zip: '28195', city: 'Bremen', email: 'b@bremen.de', billing_email: 'buch@bremen.de', brands: ['Audi'], billing_mode: 'einzel', opening: { mo: ['08:00', '18:00'], di: ['08:00', '18:00'], mi: ['08:00', '18:00'], do: ['08:00', '18:00'], fr: ['08:00', '18:00'], sa: ['09:00', '14:00'], so: null } }],
  ['C', { name: 'München Motors', kind: 'organisation', street: 'Isarweg 3', zip: '80331', city: 'München', email: 'm@m.de', brands: ['BMW', 'Audi'] }]]) {
  r = await c.post('/api/orgs', o, { who: k === 'A' ? 'gf' : 'admin' }); check(r.ok, 'Partner angelegt: ' + o.name, r); org[k] = r.id;
}
r = await c.post('/api/orgs', { name: 'Test', billing_mode: 'monatlich' }, { who: 'vt' }); check(r.status === 403, 'Vertrieb darf keine Partner anlegen');
const pu = {};
for (const [k, o, role] of [['a_gf', 'A', 'gf'], ['a_vl', 'A', 'vl'], ['a_vt1', 'A', 'vt'], ['a_vt2', 'A', 'vt'], ['b_gf', 'B', 'gf'], ['c_vt', 'C', 'vt']]) {
  r = await c.post(`/api/orgs/${org[o]}/users`, { email: k + '@partner.de', name: 'Partner ' + k, role }, { who: 'gf' }); check(r.ok, `Partnerkonto ${k}`, r); pu[k] = r.id;
  r = await c.post(`/api/orgs/${org[o]}/users/${pu[k]}/invite`, {}, { who: 'gf' }); check(r.ok && r.mail === 'gesendet', `Einladung ${k} versendet`, r);
  const acc = await c.post('/papi/invite/accept', { token: tokenFrom(r.link), password: 'Partner12345', agb: true, privacy: true }, { who: k });
  check(acc.ok, `${k}: Passwort + Zustimmungen`, acc);
}
r = await c.post(`/api/orgs/${org.A}/users/${pu.a_vt1}/reset`, { mode: 'link' }, { who: 'gf' }); check(r.status === 403, 'Nur Admin setzt Partner-Passwörter zurück');
r = await c.get('/papi/session', { who: 'a_vt1' }); check(r.user && r.user.role === 'vt' && r.user.consentsOk, 'Partner angemeldet mit Zustimmungen');
const orgRow = q1('SELECT lat, lon FROM orgs WHERE id = ?', org.A); check(orgRow.lat > 52 && orgRow.lat < 53, 'Partner-Koordinaten aus PLZ');

console.log('3) Kundenanfrage: Eingang und automatische Verteilung');
const kid = '11134009573715';
const form = (extra = {}) => { const ts = nowSec(); return { _form: 'deal', _kid: kid, _ts: ts, _sig: sig(`${kid}.${ts}.deal`), _page: 'https://kfl-group.com/pages/traumwagen-deal', Formular: 'TRAUMWAGEN-DEAL', Kundennummer: kid,
  Zustand: 'Neuwagen', Marke: 'Audi', Modell: 'A4', Modellvariante: 'Avant 40 TDI', Bezahlart: 'leasen', 'Kilometer pro Jahr': '15.000 km', Laufzeit: '3 Jahre (36 Monate)', Anzahlung: 'Nein', Umkreis: '100 km',
  'Servicepaket Wartung & Inspektion': 'Ja', Kundenart: 'Privat', Vorname: 'Max', name: 'Mustermann', email: 'max@kunde.de', phone: '0171 1234567', 'Straße': 'Am Markt 5', PLZ: '49451', Ort: 'Holdorf', Kontaktweg: 'Telefon', body: 'Bitte in Schwarz.', 'AGB akzeptiert': 'Ja (Version 2026-10)', ...extra }; };
r = await c.post('/', form());
check(r.ok && r.number === 1001, 'Anfrage #1001 eingegangen', r);
const req1 = q1('SELECT * FROM requests WHERE id = 1');
check(req1.status === 'versendet' && req1.radius_km === 100 && req1.brand === 'Audi' && req1.vehicle === 'Audi A4 Avant 40 TDI', 'Status versendet, Umkreis 100 km, Fahrzeug erkannt', req1);
const asg = qa('SELECT a.*, o.name FROM assignments a JOIN orgs o ON o.id = a.org_id WHERE request_id = 1 ORDER BY distance_km');
check(asg.length === 2 && asg[0].org_id === org.A && asg[1].org_id === org.B, 'An Alpha (Osnabrück) und Bremen verteilt, nicht München', asg.map((a) => [a.name, a.distance_km]));
check(asg[0].deadline_at === '2026-11-04T09:00:00.000Z', 'Frist 24 Werktags-Stunden: Mittwoch 10:00', asg[0].deadline_at);
const partnerMail = lastMailTo('a_vt1@partner.de');
check(partnerMail && partnerMail.sender.email === 'vermittlung@kfl-group.com' && !JSON.stringify(partnerMail).includes('max@kunde.de') && !JSON.stringify(partnerMail).includes('Mustermann'), 'Partner-Mail von vermittlung@ ohne Kundendaten');
check(lastMailTo('max@kunde.de').sender.email === 'noreplay@kfl-group.com', 'Eingangsbestätigung an Kunden von noreply@');

console.log('4) Partner: Sichtbarkeit, Übernahme, Sperre für Kollegen');
const aidA = asg[0].id, aidB = asg[1].id;
r = await c.get('/papi/requests?tab=neu', { who: 'a_vt2' });
check(r.items.length === 1 && r.items[0].level === 'teaser' && !r.items[0].request.fields && r.items[0].request.zustand === 'Neuwagen' && r.items[0].request.plz === '49451', 'Vertriebler sieht vor Übernahme nur Neu/Gebraucht, PLZ, Entfernung', r.items[0]);
r = await c.get(`/papi/requests/${aidA}`, { who: 'a_vt2' });
check(r.item && r.item.level === 'teaser', 'Detail vor Übernahme nur Eckdaten');
r = await c.post(`/papi/requests/${aidA}/take`, {}, { who: 'a_vt1' }); check(r.ok, 'vt1 übernimmt');
r = await c.post(`/papi/requests/${aidA}/take`, {}, { who: 'a_vt2' }); check(r.status === 409, 'vt2 kann nicht mehr übernehmen');
r = await c.get(`/papi/requests/${aidA}`, { who: 'a_vt2' }); check(r.status === 403, 'vt2 sieht die Anfrage nicht mehr');
r = await c.get(`/papi/requests/${aidA}`, { who: 'a_vl' }); check(r.item && r.item.level === 'summary' && r.item.taker === 'Partner a_vt1' && !r.item.request.fields, 'Verkaufsleitung sieht nur, wer bearbeitet');
r = await c.get(`/papi/requests/${aidA}`, { who: 'a_vt1' });
const fullJson = JSON.stringify(r.item);
check(r.item.level === 'full' && r.item.request.fields.Modell === 'A4' && !fullJson.includes('max@kunde.de') && !fullJson.includes('0171') && !fullJson.includes('Mustermann') && !fullJson.includes('Am Markt') && fullJson.includes('49451'), 'Bearbeiter sieht alles außer persönlichen Daten (nur PLZ)');

console.log('5) Angebote abgeben');
r = await c.post(`/papi/requests/${aidA}/offer`, { config: 'gleich', monthly_rate: '399', km_per_year: 15000, term_months: 36 }, { who: 'a_vt1' });
check(r.status === 400 && /Ausstattung/.test(r.error) && /Servicepaket/.test(r.error), 'Pflichtangaben werden geprüft', r.error);
const pdfB64 = Buffer.from('%PDF-1.4\n1 0 obj<<>>stream\nBT (Monatliche Rate 389,00 EUR) Tj (Laufzeit 36 Monate) Tj ET\nendstream\nendobj\n%%EOF').toString('base64');
r = await c.post(`/papi/requests/${aidA}/parse-pdf`, { base64: pdfB64 }, { who: 'a_vt1' });
check(r.ok && r.suggestions.monthly_rate === 389 && r.suggestions.term_months === 36, 'PDF-Eckdaten werden vorgeschlagen', r);
r = await c.post(`/papi/requests/${aidA}/offer`, { config: 'gleich', equipment_match: 'ja', monthly_rate: '389,00', km_per_year: 15000, term_months: 36, transfer_cost: '990', service_cost: '29', delivery: '8 Wochen', notes: 'Sofort verfügbar', pdf: { name: 'angebot.pdf', type: 'application/pdf', base64: pdfB64 } }, { who: 'a_vt1' });
check(r.ok, 'Alpha: Angebot abgegeben', r);
check(q1('SELECT status FROM requests WHERE id = 1').status === 'angebot_liegt_vor', 'Status: Angebot liegt vor');
r = await c.post(`/papi/requests/${aidB}/take`, {}, { who: 'b_gf' });
r = await c.post(`/papi/requests/${aidB}/offer`, { config: 'alternativ', herstellercode: 'AUDI-XYZ', equipment_match: 'nein', monthly_rate: '459', km_per_year: 15000, term_months: 36, transfer_cost: '1200', service_cost: '35' }, { who: 'b_gf' });
check(r.ok, 'Bremen: Angebot abgegeben', r);
const rq = q1('SELECT * FROM requests WHERE id = 1');
check(rq.status === 'angebot_beim_kunden' && rq.evaluated_at, 'Alle haben geantwortet → sofort ausgewertet und dem Kunden vorgestellt', rq.status);
const offers = qa('SELECT id, org_id, status, score, rank FROM offers WHERE request_id = 1 ORDER BY rank');
check(offers[0].org_id === org.A && offers[0].status === 'vorgestellt' && offers[0].rank === 1 && offers[1].status === 'vorgestellt' && offers[0].score > offers[1].score, 'Beide Angebote vorgestellt (bis zu 3), Alpha auf Platz 1', offers);
check(q1('SELECT status FROM assignments WHERE id = ?', aidB).status === 'vorgestellt' && q1('SELECT status FROM assignments WHERE id = ?', aidA).status === 'vorgestellt', 'Partnerstatus: beide vorgestellt');
check(JSON.parse(q1('SELECT score_detail FROM offers WHERE id = ?', offers[0].id).score_detail).points.price === 100, 'Punkte je Faktor gespeichert (günstigste Rate = 100)');
check(/Angebot zu Anfrage #1001 ist da/.test(lastMailTo('max@kunde.de').subject), 'Kunde per Mail informiert');
r = await c.get('/papi/offers', { who: 'a_vt1' }); check(r.status === 403, 'Vertriebler: Seite Angebote gesperrt');
r = await c.get('/papi/offers', { who: 'a_vl' }); check(r.ok && r.offers.length === 1, 'Verkaufsleitung sieht Angebote der Organisation');
r = await c.get('/papi/offers/' + offers[0].id, { who: 'a_vl' }); check(r.ok && r.offer.data.monthly_rate === 389, 'Verkaufsleitung öffnet Angebot');
check(q1("SELECT text FROM partner_events WHERE action = 'angebot_eingesehen' AND confidential = 1").text.startsWith('Vertrauliche Information'), 'Öffnen wird vertraulich protokolliert');

console.log('6) Kunde: „Meine Anfragen“ und „Interessiert mich“');
const myTok = () => { const ts = nowSec(); return { _kid: kid, _ts: ts, _sig: sig(`${kid}.${ts}.my`) }; };
r = await c.post('/my/requests', myTok());
const mine = r.requests[0];
check(mine.status_label === 'Angebot liegt vor' && mine.offers.length === 2 && mine.offers[0].partner.name === 'Geprüfter KFL-Partner' && mine.offers[0].data.monthly_rate === 389 && mine.offers[0].rank === 1 && !mine.editable, 'Kunde sieht anonymisiertes Angebot, nicht mehr änderbar', mine.offers[0]);
r = await c.post('/my/requests/1001/accept', { ...myTok(), offer_id: mine.offers[0].id });
check(r.ok, 'Kunde klickt „Interessiert mich“', r);
const rq2 = q1('SELECT * FROM requests WHERE id = 1');
check(rq2.status === 'kontaktdaten_versendet', 'Status: Kontaktdaten versendet', rq2.status);
const won = lastMailTo('a_vt1@partner.de');
check(won && /Gewonnen/.test(won.subject) && won.htmlContent.includes('max@kunde.de') && won.htmlContent.includes('0171 1234567') && won.sender.email === 'vermittlung@kfl-group.com', 'Partner bekommt Kontaktdaten per Mail von vermittlung@');
check(/Alpha/.test(lastMailTo('max@kunde.de').subject), 'Kunde erhält Partnerdaten');
r = await c.get(`/papi/requests/${aidA}`, { who: 'a_vt1' });
check(r.item.status === 'gewonnen' && r.item.contact.email === 'max@kunde.de' && r.item.contact_due_at === '2026-11-04T09:00:00.000Z', 'Partner sieht Kontaktdaten, Kontaktfrist läuft (24 Werktags-Stunden)', r.item.contact_due_at);
const bi = q1('SELECT * FROM billing_items WHERE request_id = 1');
check(bi && bi.amount_net === 49 && bi.org_id === org.A, 'Abrechnungsfall in der Buchhaltung (49 € netto)', bi);
r = await c.post('/my/requests', myTok());
check(r.requests[0].offers[0].partner.name === 'Autohaus Alpha GmbH' && r.requests[0].offers[0].partner.person === 'Partner a_vt1', 'Nach Zusage sieht der Kunde den Partner mit Ansprechpartner');

console.log('7) Kontakt: nicht erreicht → Rückfrage beim Kunden');
r = await c.post(`/papi/requests/${aidA}/contact`, { status: 'nicht_erreicht', note: '3x angerufen' }, { who: 'a_vt1' }); check(r.ok, 'Partner meldet „Kunde nicht erreicht“');
const fb = lastMailTo('max@kunde.de');
check(/Kurze Frage/.test(fb.subject) && /\/c\/feedback\?r=1001/.test(fb.htmlContent), 'Kunde bekommt Ja/Nein-Rückfrage');
const neinLink = fb.htmlContent.match(/href="(https:\/\/w\.test\/c\/feedback[^"]+a=nein)"/)[1].replace(/&amp;/g, '&');
let res = await worker.fetch(new Request(neinLink), env);
check(res.status === 200 && (await res.text()).includes('Danke'), 'Kunde klickt „Nein“');
check(q1('SELECT feedback_state FROM requests WHERE id = 1').feedback_state === 'nein', 'Rückmeldung gespeichert');
r = await c.get('/api/news', { who: 'vt' }); check(r.notifications.some((n) => /Nein, nicht gemeldet/.test(n.title)), 'Vertrieb wird informiert');
r = await c.post(`/api/requests/1001/assignments/${aidA}/status`, { status: 'gewonnen' }, { who: 'vt' }); check(r.status === 400, 'Status nur mit Begründung');
r = await c.post(`/api/requests/1001/assignments/${aidA}/status`, { status: 'gewonnen', note: 'Kunde wartet weiter auf Rückruf, bitte heute anrufen.' }, { who: 'vt' }); check(r.ok, 'Vertrieb setzt wieder „Gewonnen“ mit Notiz');
check(qa('SELECT * FROM billing_items WHERE request_id = 1').length === 1, 'Kein doppelter Abrechnungsfall');
r = await c.get(`/papi/requests/${aidA}`, { who: 'a_vt1' }); check(r.item.events.some((e) => /KFL: Kunde wartet/.test(e.text)), 'Partner sieht die Notiz von KFL');
r = await c.post(`/papi/requests/${aidA}/contact`, { status: 'kontaktiert' }, { who: 'a_vt1' }); check(r.ok, 'Partner meldet „Kunde erfolgreich kontaktiert“');

console.log('8) Buchhaltung: Monatsrechnung, Zahlung, Mahnung');
r = await c.get('/api/acc/items', { who: 'bh' }); check(r.items.length === 1 && r.items[0].customer_email === 'max@kunde.de', 'Buchhaltung sieht Fall mit Kundendaten');
r = await c.post(`/api/acc/items/${bi.id}/bill`, {}, { who: 'bh' }); check(r.ok && r.mode === 'monatlich', 'Monatszahler: Fall in die Sammelablage');
r = await c.post('/api/jobs/run', { job: 'monat' }, { who: 'admin' });
const inv = q1('SELECT * FROM invoices ORDER BY id DESC LIMIT 1');
check(inv && inv.kind === 'sammel' && inv.net === 49 && inv.vat === 9.31 && inv.gross === 58.31 && inv.due_date === '2026-11-17' && /^RE-2026-00001$/.test(inv.number), 'Sammelrechnung RE-2026-00001 erstellt, 14 Tage Ziel', inv);
const invMail = lastMailTo('rechnung@alpha.de');
check(invMail && invMail.sender.email === 'noreplay@kfl-group.com' && invMail.replyTo && invMail.replyTo.email === 'info@kfl-group.com' && invMail.attachment && invMail.attachment[0].name === 'RE-2026-00001.pdf', 'Rechnung per Mail von noreplay@ (Antwort an info@) mit PDF');
import('node:fs').then(() => {});
const fs = await import('node:fs');
fs.writeFileSync('/tmp/kfl-invoice.pdf', Buffer.from(invMail.attachment[0].content, 'base64'));
const { execSync } = await import('node:child_process');
const txt = execSync('pdftotext -layout /tmp/kfl-invoice.pdf -').toString();
check(/Rechnung RE-2026-00001/.test(txt) && /Anfrage #1001/.test(txt) && /58,31 €/.test(txt) && /Umsatzsteuer/.test(txt) && /64\/123\/45678/.test(txt) && /Autohaus Alpha/.test(txt), 'PDF enthält Pflichtangaben, Anfragenummer und Beträge');
check(q1('SELECT billed FROM requests WHERE id = 1').billed === 1, 'Anfrage als „in Rechnung gestellt“ markiert');
r = await c.post(`/api/acc/invoices/${inv.id}/dunning`, {}, { who: 'bh' }); check(r.ok && r.level === 1 && r.fee === 0, 'Zahlungserinnerung (ohne Gebühr)');
r = await c.get('/papi/news', { who: 'a_gf' }); check(r.notifications.some((n) => /Zahlungserinnerung/.test(n.title)), 'Erinnerung erscheint in den News des Partners');
r = await c.post(`/api/acc/invoices/${inv.id}/dunning`, {}, { who: 'bh' }); check(r.ok && r.level === 2 && r.fee === 4.9, '1. Mahnung mit 4,90 € Gebühr');
r = await c.post(`/api/acc/invoices/${inv.id}/payment`, { amount: '30' }, { who: 'bh' }); check(r.status === 'teilbezahlt', 'Teilzahlung erfasst');
r = await c.post(`/api/acc/invoices/${inv.id}/payment`, { amount: '33,21' }, { who: 'bh' }); check(r.status === 'bezahlt', 'Rest inkl. Mahngebühr → bezahlt', r);
r = await c.get('/api/acc/invoices?q=RE-2026', { who: 'bh' }); check(r.invoices.length === 1, 'Rechnungssuche nach Nummer');

console.log('9) Bearbeitungssperre 4 h und Fristablauf');
r = await c.post('/', form({ Modell: 'Q5', Modellvariante: '', Umkreis: '50 km' })); check(r.number === 1002, 'Anfrage #1002 (Umkreis 50 km)');
const a2 = qa('SELECT * FROM assignments WHERE request_id = 2');
check(a2.length === 1 && a2[0].org_id === org.A, 'Nur Alpha im 50-km-Umkreis', a2.map((x) => x.distance_km));
await c.post(`/papi/requests/${a2[0].id}/take`, {}, { who: 'a_vt2' });
advance(4.5); await cron(worker, env);
check(q1('SELECT status, taken_by FROM assignments WHERE id = ?', a2[0].id).status === 'neu', 'Nach 4 h ohne Angebot wieder für die Organisation frei');
check(q1("SELECT text FROM partner_events WHERE assignment_id = ? AND action = 'wieder_geoeffnet'", a2[0].id).text.startsWith('Vertrauliche Information'), 'Vermerk „Vertrauliche Information“');
advance(20); await cron(worker, env);
check(q1('SELECT status FROM assignments WHERE id = ?', a2[0].id).status === 'verloren' && q1('SELECT status FROM requests WHERE id = 2').status === 'kein_angebot', 'Frist abgelaufen → Verloren, Anfrage „Kein Angebot“');

console.log('10) Geschäftszeit über das Wochenende');
setNow('2026-11-06T14:00:00Z'); // Freitag 15:00
r = await c.post('/', form({ Modell: 'A6', Umkreis: '200 km' }));
const a3 = qa('SELECT a.*, o.name FROM assignments a JOIN orgs o ON o.id = a.org_id WHERE request_id = 3 ORDER BY org_id');
const dA = a3.find((x) => x.org_id === org.A).deadline_at, dB = a3.find((x) => x.org_id === org.B).deadline_at;
check(dA === '2026-11-09T14:00:00.000Z', 'Ohne Samstag: Frist Montag 15:00', dA);
check(dB === '2026-11-07T14:00:00.000Z', 'Partner mit Samstagsöffnung: Frist Samstag 15:00', dB);

await relogin();
console.log('11) Kunde ändert Anfrage und schreibt Notiz');
r = await c.post('/my/requests/1003/note', { ...myTok(), text: 'Gerne auch in Grau.' }); check(r.ok && /Notiz vom Kunden/.test(r.body), 'Kundennotiz unter „Sonstiges“');
check(q1('SELECT customer_note_unread FROM requests WHERE id = 3').customer_note_unread === 1, 'Ungelesen-Markierung für den Vertrieb');
const upd = { ...form({ Modell: 'A6', Modellvariante: 'Avant', Umkreis: '200 km' }), ...myTok(), _form: 'deal' };
r = await c.post('/my/requests/1003/update', upd); check(r.ok, 'Kunde ändert die Anfrage (noch kein Angebot)', r);
r = await c.get('/papi/news', { who: 'a_vt1' }); check(r.notifications.some((n) => /wurde aktualisiert/.test(n.title)), 'Partner werden über die Änderung informiert');

console.log('12) Support');
const tsS = nowSec();
r = await c.post('/', { _form: 'support', _kid: '0', _ts: tsS, _sig: sig(`0.${tsS}.support`), name: 'Erika', email: 'erika@web.de', Thema: 'Frage zum Ratgeber', Nachricht: 'Wo finde ich meinen Download?' });
check(r.ok && r.ticket, 'Webseiten-Support → Ticket', r);
const tk = q1('SELECT * FROM tickets ORDER BY id DESC LIMIT 1');
check(tk.tag === 'Webseite' && /Wir haben deine Anfrage erhalten/.test(lastMailTo('erika@web.de').subject) && lastMailTo('erika@web.de').sender.email === 'noreplay@kfl-group.com', 'Tag Webseite, Eingangsbestätigung von noreply@');
advance(25); await cron(worker, env); await relogin();
check(q1('SELECT priority FROM tickets WHERE id = ?', tk.id).priority === 'hoch', 'Nach 24 h automatisch Priorität „Hoch“');
r = await c.post(`/api/tickets/${tk.id}/reply`, { text: 'Den Link findest du in deiner Bestellmail.' }, { who: 'vt' }); check(r.ok, 'Vertrieb antwortet');
check(lastMailTo('erika@web.de').sender.email === 'support@kfl-group.com', 'Antwort von support@');
r = await c.post('/papi/tickets', { subject: 'Rechnungsfrage', text: 'Bitte Rechnung erklären' }, { who: 'a_gf' });
check(q1('SELECT priority, tag FROM tickets WHERE id = ?', r.id).priority === 'hoch', 'Ticket der Partner-GF ist automatisch „Hoch“');
await c.post(`/api/tickets/${r.id}/reply`, { text: 'Gern, rufen Sie uns an.' }, { who: 'vt' });
r2 = await c.get('/papi/news', { who: 'a_gf' }); check(r2.notifications.some((n) => /Antwort vom KFL-Support/.test(n.title)), 'Support-Antwort erscheint in den Partner-News');
var r2;
r = await c.post('/papi/settings/users/request', { action: 'role', user_id: pu.a_vt2, role: 'vl' }, { who: 'a_gf' }); check(r.ok, 'Partner-GF beantragt Rollenänderung');
check(q1('SELECT role FROM partner_users WHERE id = ?', pu.a_vt2).role === 'vt', 'Änderung noch nicht aktiv');
r = await c.post(`/api/tickets/${r.ticket}/change`, { approve: true }, { who: 'gf' }); check(r.ok, 'KFL bestätigt die Änderung');
check(q1('SELECT role FROM partner_users WHERE id = ?', pu.a_vt2).role === 'vl' && lastMailTo('a_gf@partner.de').sender.email === 'support@kfl-group.com', 'Rolle geändert, GF per Mail von support@ informiert');
r = await c.post('/api/support', { name: 'Neue Kollegin', email: 'neu@kfl.de', topic: 'Zugang beantragen', message: 'Ich brauche einen Zugang.' });
check(r.ok && q1('SELECT tag FROM tickets WHERE id = ?', r.number).tag === 'Intern', 'Support von der Dashboard-Anmeldung → Tag „Intern“');

console.log('13) Spam');
r = await c.post('/', form({ Vorname: 'asdf', name: 'qwer', Modell: 'A3' }));
const spamNo = r.number;
r = await c.post(`/api/requests/${spamNo}/spam`, { reason: 'Fantasiename' }, { who: 'vt' }); check(r.ok, 'Vertrieb meldet Spam');
r = await c.post(`/api/requests/${spamNo}/spam/decide`, { confirm: true }, { who: 'vt' }); check(r.status === 403, 'Vertrieb darf nicht bestätigen');
r = await c.post(`/api/requests/${spamNo}/spam/decide`, { confirm: true }, { who: 'tl' }); check(r.ok, 'Teamleitung bestätigt');
check(q1('SELECT deleted, status FROM requests WHERE id = ?', spamNo - 1000).deleted === 1, 'Anfrage deaktiviert');
check(q1("SELECT COUNT(*) AS n FROM tickets WHERE kind = 'spam'").n === 1 && q1("SELECT COUNT(*) AS n FROM notifications WHERE recipient_type='staff' AND recipient_id = 1 AND kind = 'support'").n >= 1, 'Fall läuft beim Admin im Support auf');

console.log('14) Protokoll und Backup (Bereichspasswort)');
r = await c.get('/api/audit', { who: 'admin' }); check(r.status === 423, 'Protokoll ohne Bereichspasswort gesperrt');
r = await c.get('/api/audit', { who: 'gf' }); check(r.status === 403, 'Geschäftsführung hat keinen Zugriff aufs Protokoll');
r = await c.post('/api/area/unlock', { password: 'falsch' }, { who: 'admin' }); check(r.status === 403, 'Falsches Bereichspasswort abgelehnt');
r = await c.post('/api/area/unlock', { password: 'Test-Bereich-2026' }, { who: 'admin' }); check(r.ok, 'Bereichspasswort funktioniert');
r = await c.get('/api/audit?q=angebot', { who: 'admin' }); check(r.ok && r.total > 0, 'Protokoll durchsuchbar', r.total);
r = await c.post('/api/backups/password', { password: 'BackupGeheim2026' }, { who: 'admin' }); check(r.ok, 'Backup-Passwort festgelegt');
r = await c.post('/api/backups', {}, { who: 'admin' }); check(r.ok, 'Backup erstellt');
res = await c.call('GET', `/api/backups/${r.id}/download`, null, { who: 'admin', raw: true });
const boxTxt = await res.text(); const box = JSON.parse(boxTxt);
const { webcrypto } = await import('node:crypto'); const subtle = webcrypto.subtle;
const ub = (s) => Uint8Array.from(Buffer.from(s, 'base64'));
const base = await subtle.importKey('raw', new TextEncoder().encode('BackupGeheim2026'), 'PBKDF2', false, ['deriveKey']);
check(box.alg === 'AES-256-GCM/PBKDF2-SHA256-100000', 'Backup-Verschlüsselung mit 100.000 Runden (Cloudflare-Grenze)');
const key = await subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: ub(box.salt), iterations: +box.alg.split('-').pop() }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
const plain = new Uint8Array(await subtle.decrypt({ name: 'AES-GCM', iv: ub(box.iv) }, key, ub(box.data)));
const json = JSON.parse((await import('node:zlib')).gunzipSync(plain).toString());
check(json.tables.requests.length >= 4 && json.tables.users.every((u) => u.pass_hash === '[geschützt]' || u.pass_hash === null) && json.security_report, 'Backup entschlüsselbar, Passwörter geschützt, Sicherheitsbericht enthalten');
r = await c.post('/api/settings/area-password', { current: 'Test-Bereich-2026', next: 'NeuesBereich2026' }, { who: 'admin' }); check(r.ok, 'Admin ändert Bereichspasswort');

console.log('15) News, Chat, Vertretung');
r = await c.post('/api/news', { title: 'Neue Abläufe ab Montag', body: 'Bitte lesen.', audience: { type: 'roles', values: ['vertrieb'] } }, { who: 'gf' }); check(r.ok, 'GF veröffentlicht News für den Vertrieb');
r = await c.get('/api/news', { who: 'vt' }); check(r.posts.some((p) => p.title === 'Neue Abläufe ab Montag'), 'Vertrieb sieht die News');
r = await c.get('/api/news', { who: 'bh' }); check(!r.posts.some((p) => p.title === 'Neue Abläufe ab Montag'), 'Buchhaltung sieht sie nicht');
r = await c.post('/api/news', { title: 'x', audience: { type: 'all' } }, { who: 'vt' }); check(r.status === 403, 'Vertrieb kann keine Mitteilungen veröffentlichen');
r = await c.post('/api/news', { scope: 'partner', title: 'Audi-Aktion', body: 'Neue Konditionen', audience: { type: 'brands', values: ['Audi'] } }, { who: 'gf' }); check(r.ok, 'GF schreibt an alle Audi-Partner');
r = await c.get('/papi/news', { who: 'c_vt' }); check(r.posts.some((p) => p.title === 'Audi-Aktion'), 'Audi-Partner sieht die Nachricht');
r = await c.post('/api/chats', { userIds: [staff.vt2] }, { who: 'vt' }); const chat = r.id; check(r.ok, 'Direktchat erstellt');
await c.post(`/api/chats/${chat}`, { text: 'Hallo, übernimmst du #1003?' }, { who: 'vt' });
r = await c.get('/api/chats', { who: 'vt2' }); check(r.chats[0].unread === 1, 'Empfänger hat eine ungelesene Nachricht');
r = await c.post('/api/chats', { userIds: [staff.vt2, staff.bh] }, { who: 'vt' }); check(r.status === 403, 'Gruppenchat nur mit gleicher Rolle');
r = await c.post('/api/absences', { from: '2026-11-10', to: '2026-11-12', substitute_id: staff.bh }, { who: 'vt' }); check(r.status === 400, 'Vertretung muss gleiche oder höhere Rolle haben');
r = await c.post('/api/absences', { from: '2026-11-06', to: '2026-11-12', substitute_id: staff.tl }, { who: 'vt' }); check(r.ok, 'Urlaub mit Vertretung beantragt');
r = await c.post(`/api/absences/${r.id}/decide`, { accept: true }, { who: 'tl' }); check(r.ok, 'Vertretung bestätigt');
r = await c.get('/api/session', { who: 'tl' }); check(r.user.subs.includes(staff.vt), 'Teamleitung sieht die Vertretung');

console.log('16) Lieferanten, Eingangsrechnung, Tagesabschluss, SEPA');
r = await c.post('/api/acc/suppliers', { name: 'Werbeagentur Nord', iban: 'DE89 3704 0044 0532 0130 00' }, { who: 'bh' }); check(r.ok, 'Lieferant mit IBAN');
const sup = r.id;
r = await c.post('/api/acc/suppliers', { name: 'Kaputt', iban: 'DE00123' }, { who: 'bh' }); check(r.status === 400, 'Ungültige IBAN abgelehnt');
r = await c.post('/api/acc/purchase', { supplier_id: sup, number: 'WA-77', date: '2026-11-01', net: '1000', due_date: '2026-11-15' }, { who: 'bh' }); check(r.ok, 'Eingangsrechnung erfasst');
const pid = r.id;
r = await c.post(`/api/acc/purchase/${pid}/schedule`, { pay_date: '2026-11-07' }, { who: 'bh' }); check(r.ok, 'Zur Zahlung vorgemerkt');
r = await c.post('/api/acc/payruns/close', {}, { who: 'bh' }); check(r.ok && r.id, 'Tagesabschluss erzeugt Zahlungsliste');
r = await c.post(`/api/acc/payruns/${r.id}/release`, {}, { who: 'bh' }); check(r.status === 403, 'Buchhaltung kann nicht freigeben');
const prId = q1('SELECT id FROM payruns ORDER BY id DESC').id;
r = await c.post(`/api/acc/payruns/${prId}/release`, { exec_date: '2026-11-09' }, { who: 'gf' }); check(r.ok, 'Geschäftsführung gibt frei');
res = await c.call('GET', `/api/acc/payruns/${prId}/file`, null, { who: 'gf', raw: true });
const xml = await res.text();
check(/pain\.001\.001\.09/.test(xml) && /<InstdAmt Ccy="EUR">1190\.00<\/InstdAmt>/.test(xml) && /DE89370400440532013000/.test(xml) && /DE02120300000000202051/.test(xml), 'SEPA-XML korrekt (1.190,00 €)');

console.log('17) Statistik');
r = await c.get('/api/stats/overview?from=2026-10-01&to=2026-11-30', { who: 'gf' });
check(r.ok && r.cur.requests >= 4 && r.cur.revenue_net === 49 && r.cur.expenses_net === 1000 && r.cur.profit_net === -951, 'Kennzahlen: Anfragen, Umsatz, Ausgaben, Gewinn', r.cur);
r = await c.get('/api/stats/partners?from=2026-10-01&to=2026-11-30', { who: 'gf' }); const pA = r.partners.find((x) => x.id === org.A);
check(pA && pA.won === 1 && pA.offers >= 1, 'Partner-Performance', pA);
r = await c.get('/papi/stats?from=2026-10-01&to=2026-11-30', { who: 'a_gf' }); check(r.ok && r.team && r.totals.received >= 3, 'Partner-GF sieht Team-Statistik');
r = await c.get('/papi/stats', { who: 'a_vl' }); check(r.ok && r.team === null, 'Verkaufsleitung: eingeschränkte Statistik');
r = await c.get('/papi/stats', { who: 'a_vt1' }); check(r.status === 403, 'Vertriebler: keine Statistik');
res = await c.call('GET', '/papi/report?days=30', null, { who: 'a_gf', raw: true }); check(res.status === 200 && res.headers.get('Content-Type') === 'application/pdf', 'Bericht 30 Tage als PDF');

console.log('18) Zeitgesteuerte Abläufe');
setNow('2026-11-30T22:30:00Z'); // 30.11. 23:30 Berlin (Monatsende)
await relogin();
await c.post('/', form({ Modell: 'A1', Umkreis: '100 km' }));
await cron(worker, env);
const nB = q1("SELECT COUNT(*) AS n FROM backups WHERE kind = 'auto'").n;
check(nB >= 1, 'Tagesbackup wird nachgeholt, falls ein Tag ausgelassen wurde');
advance(0.6); await cron(worker, env); await cron(worker, env);
check(q1("SELECT COUNT(*) AS n FROM backups WHERE kind = 'auto'").n === nB + 1, 'Tägliches Backup gelaufen');
check(q1("SELECT last_run FROM jobs WHERE key = 'monatsrechnung'").last_run === '2026-11', 'Monatslauf am Monatsende');
console.log(check.fails ? `\n${check.fails} FEHLER` : '\nALLE TESTS BESTANDEN');
