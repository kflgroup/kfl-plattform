// Geschäftspartner werden automatisch Lieferanten (abwählbar), Stammdaten-Abgleich und Übernahme bestehender Partner
import { makeD1, makeR2, installFetch, SECRET, setNow, client, check } from './harness.mjs';
installFetch();
setNow('2026-11-08T09:00:00Z');
const worker = (await import('./wk.mjs')).default;
const env = { DB: makeD1(), FILES: makeR2(), FORM_SECRET: SECRET, SETUP_TOKEN: 'setup-123', BREVO_API_KEY: 'test-brevo' };
const sq = env.DB._sq, c = client(worker, env), q1 = (sql, ...a) => sq.prepare(sql).get(...a), qa = (sql, ...a) => sq.prepare(sql).all(...a);
await c.post('/api/setup', { token: 'setup-123', email: 'admin@kfl.de', name: 'Tobias Admin', password: 'AdminPass123' }, { who: 'admin' });
for (const [key, role, name] of [['bh', 'buchhaltung', 'Berta BH'], ['tl', 'teamleitung', 'Theo TL']]) {
  const r = await c.post('/api/users', { email: key + '@kfl.de', name, role_key: role }, { who: 'admin' });
  await c.post('/api/invite/accept', { token: r.invite.split('/').pop(), password: 'Passwort1234' }, { who: key });
}
const sup = (orgId) => q1('SELECT * FROM suppliers WHERE org_id = ?', orgId);

console.log('Neuer Geschäftspartner wird automatisch Lieferant');
let r = await c.post('/api/orgs', { name: 'Autohaus Nord', kind: 'einzel', zip: '49451', city: 'Holdorf', street: 'Hauptstr. 1', email: 'info@nord.de', phone: '05494 123', vat_id: 'DE123456789', brands: ['Audi'] }, { who: 'admin' });
check(r.ok && r.supplier_id, 'Partner angelegt, Lieferant mitgeliefert', r);
const nord = r.id;
let s = sup(nord);
check(s && s.name === 'Autohaus Nord' && s.city === 'Holdorf' && s.email === 'info@nord.de' && s.vat_id === 'DE123456789' && s.active === 1, 'Lieferant mit Name, Anschrift, E-Mail und USt-IdNr.');
check(q1("SELECT COUNT(*) AS n FROM audit WHERE action = 'lieferant_angelegt' AND entity_id = ?", String(s.id)).n === 1, 'Anlage im Protokoll');

console.log('Lieferantenstatus bei der Anlage abwählbar');
r = await c.post('/api/orgs', { name: 'Händler Süd', kind: 'einzel', zip: '49451', email: 'info@sued.de', brands: ['BMW'], supplier: false }, { who: 'admin' });
const sued = r.id;
check(r.ok && !r.supplier_id && !sup(sued) && q1('SELECT supplier FROM orgs WHERE id = ?', sued).supplier === 0, 'Ohne Haken kein Lieferant');

console.log('Stammdaten-Abgleich: Rechnungsanschrift hat Vorrang');
r = await c.patch('/api/orgs/' + nord, { billing_name: 'Autohaus Nord GmbH', billing_street: 'Rechnungsweg 5', billing_zip: '49377', billing_city: 'Vechta', billing_email: 'rechnung@nord.de' }, { who: 'admin' });
s = sup(nord);
check(r.ok && s.name === 'Autohaus Nord GmbH' && s.street === 'Rechnungsweg 5' && s.zip === '49377' && s.city === 'Vechta' && s.email === 'rechnung@nord.de', 'Lieferant übernimmt die Rechnungsdaten', s);

console.log('Buchhaltung pflegt Bankdaten, Stammdaten bleiben beim Partner');
r = await c.patch('/api/acc/suppliers/' + s.id, { name: 'Anders', city: 'Anderswo', iban: 'DE89 3704 0044 0532 0130 00', customer_no: 'K-77' }, { who: 'bh' });
s = sup(nord);
check(r.ok && s.iban === 'DE89370400440532013000' && s.customer_no === 'K-77' && s.name === 'Autohaus Nord GmbH' && s.city === 'Vechta', 'IBAN gespeichert, Name/Ort nicht überschrieben');
r = await c.patch('/api/orgs/' + nord, { phone: '05494 999' }, { who: 'admin' });
s = sup(nord); check(s.phone === '05494 999' && s.iban === 'DE89370400440532013000', 'Partneränderung behält die IBAN');
let list = await c.get('/api/acc/suppliers', { who: 'bh' });
check(list.suppliers.find((x) => x.id === s.id).org_name === 'Autohaus Nord', 'Lieferantenliste zeigt den Partner');
let det = await c.get('/api/orgs/' + nord, { who: 'admin' });
check(det.supplier && det.supplier.id === s.id && det.supplier.active && det.supplier.iban === true, 'Partnerdetail zeigt Lieferantenstatus (ohne IBAN im Klartext)');

console.log('Lieferantenstatus nachträglich ab- und anwählen');
r = await c.post('/api/acc/purchase', { supplier_id: s.id, number: 'RE-1', date: '2026-11-01', due_date: '2026-11-15', net: '100', vat_rate: 19 }, { who: 'bh' }); check(r.ok, 'Eingangsrechnung erfasst', r);
r = await c.patch('/api/orgs/' + nord, { supplier: false }, { who: 'admin' });
s = sup(nord);
check(r.ok && s && s.active === 0 && q1('SELECT COUNT(*) AS n FROM purchase_invoices WHERE supplier_id = ?', s.id).n === 1, 'Abgewählt: Lieferant inaktiv, nicht gelöscht (Rechnungen bleiben)');
check(q1("SELECT COUNT(*) AS n FROM org_notes WHERE org_id = ? AND text LIKE 'Lieferantenstatus deaktiviert%'", nord).n === 1, 'Änderung als Notiz beim Partner');
r = await c.patch('/api/orgs/' + nord, { supplier: true }, { who: 'admin' });
check(sup(nord).active === 1 && qa('SELECT id FROM suppliers WHERE org_id = ?', nord).length === 1, 'Wieder angewählt: derselbe Lieferant ist aktiv');
r = await c.patch('/api/orgs/' + sued, { supplier: true }, { who: 'admin' });
check(r.ok && sup(sued) && sup(sued).active === 1, 'Späteres Anwählen legt den Lieferanten an');
r = await c.patch('/api/acc/suppliers/' + sup(sued).id, { active: false }, { who: 'bh' });
check(r.ok && q1('SELECT supplier FROM orgs WHERE id = ?', sued).supplier === 0 && sup(sued).active === 0, 'Deaktivieren in der Buchhaltung setzt den Status beim Partner');

console.log('Bestehender gleichnamiger Lieferant wird verknüpft statt doppelt angelegt');
r = await c.post('/api/acc/suppliers', { name: 'Autohaus West', iban: 'DE89 3704 0044 0532 0130 00' }, { who: 'bh' });
const west0 = r.id;
r = await c.post('/api/orgs', { name: 'Autohaus West', kind: 'einzel', zip: '49451', email: 'info@west.de', brands: ['VW'] }, { who: 'admin' });
check(r.supplier_id === west0 && qa("SELECT id FROM suppliers WHERE lower(name) = 'autohaus west'").length === 1 && sup(r.id).iban === 'DE89370400440532013000', 'Verknüpft, IBAN bleibt erhalten');

console.log('Partner gelöscht → Lieferant inaktiv');
r = await c.del('/api/orgs/' + r.id, null, { who: 'admin' });
check(r.ok && q1('SELECT active FROM suppliers WHERE id = ?', west0).active === 0, 'Lieferant des gelöschten Partners inaktiv');
r = await c.patch('/api/acc/suppliers/' + west0, { active: true }, { who: 'bh' });
check(r.status === 409, 'Lieferant eines gelöschten Partners nicht reaktivierbar');

console.log('Rechte');
r = await c.patch('/api/orgs/' + nord, { supplier: false }, { who: 'bh' });
check(r.status === 403 && sup(nord).active === 1, 'Ohne Partnerrechte keine Änderung am Lieferantenstatus');

console.log('Übernahme bestehender Partner (Migration)');
const now = new Date().toISOString();
sq.prepare("INSERT INTO orgs (name, kind, zip, city, email, created_at, updated_at) VALUES ('Altpartner Ost', 'einzel', '49451', 'Holdorf', 'ost@alt.de', ?, ?)").run(now, now);
sq.prepare("INSERT INTO orgs (name, kind, zip, email, billing_name, created_at, updated_at) VALUES ('Altpartner Mitte', 'einzel', '49451', 'mitte@alt.de', 'Mitte Autos GmbH', ?, ?)").run(now, now);
sq.prepare("INSERT INTO orgs (name, kind, zip, email, deleted, created_at, updated_at) VALUES ('Altpartner Weg', 'einzel', '49451', 'weg@alt.de', 1, ?, ?)").run(now, now);
sq.prepare("INSERT INTO suppliers (name, iban, active, created_at) VALUES ('altpartner ost ', 'DE89370400440532013000', 1, ?)").run(now);
sq.prepare("INSERT INTO suppliers (name, active, created_at) VALUES ('Altpartner Ost', 1, ?)").run(now);
const ostOrg = q1("SELECT id FROM orgs WHERE name = 'Altpartner Ost'").id, mitteOrg = q1("SELECT id FROM orgs WHERE name = 'Altpartner Mitte'").id, wegOrg = q1("SELECT id FROM orgs WHERE name = 'Altpartner Weg'").id;
sq.prepare("UPDATE suppliers SET org_id = NULL WHERE org_id IN (?, ?)").run(ostOrg, mitteOrg);
sq.prepare("DELETE FROM settings WHERE key IN ('_org_suppliers_v1', '_schema_v')").run();
const worker2 = (await import('./wk.mjs?neu')).default, c2 = client(worker2, env);
await c2.post('/api/login', { email: 'bh@kfl.de', password: 'Passwort1234' }, { who: 'bh' });
list = await c2.get('/api/acc/suppliers', { who: 'bh' });
const ost = qa('SELECT * FROM suppliers WHERE org_id = ?', ostOrg);
check(list.ok && ost.length === 1 && ost[0].iban === 'DE89370400440532013000', 'Altpartner mit gleichnamigem Lieferanten verknüpft (ältester, mit IBAN)');
check(qa("SELECT id FROM suppliers WHERE lower(trim(name)) = 'altpartner ost' AND org_id IS NULL").length === 1, 'Zweiter Namensvetter bleibt unverknüpft (keine Dopplung der Verknüpfung)');
const mitte = sup(mitteOrg);
check(mitte && mitte.name === 'Mitte Autos GmbH' && mitte.email === 'mitte@alt.de' && mitte.active === 1, 'Altpartner ohne Lieferant neu angelegt (Rechnungsname)');
check(!sup(wegOrg), 'Gelöschter Altpartner wird nicht übernommen');
const before = q1('SELECT COUNT(*) AS n FROM suppliers').n;
sq.prepare("DELETE FROM settings WHERE key = '_schema_v'").run();
const worker3 = (await import('./wk.mjs?neu2')).default, c3 = client(worker3, env);
await c3.post('/api/login', { email: 'bh@kfl.de', password: 'Passwort1234' }, { who: 'bh' });
await c3.get('/api/acc/suppliers', { who: 'bh' });
check(q1('SELECT COUNT(*) AS n FROM suppliers').n === before, 'Übernahme läuft nur einmal');
