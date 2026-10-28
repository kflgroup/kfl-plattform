/* ============================================================
   Anfragen-Engine: Eingang → Verteilung → Angebote → Auswertung →
   Vorstellung beim Kunden → „Interessiert mich“ → Kontakt → Abrechnung
   ============================================================ */

const PERSONAL_KEY = /^(vorname|nachname|name|email|e-mail|phone|telefon|mobil|handy|straße|strasse|hausnummer|adresse|anschrift|ort|wohnort|stadt|kundennummer|kundenkonto-id|firma|firmenname)$/i;
const HIDDEN_KEY = /^(_|form$|form_type$|utf8$|Firma2$|Formular$|Eingang \(Server\)$|Geändert \(Server\)$|Einwilligung|AGB akzeptiert|Datenschutz akzeptiert|Weitergabe an Partner)/;
const PAY_LABEL = { kaufen: 'Kaufen', finanzieren: 'Finanzieren', leasen: 'Leasen' };

/* ---------- Spalten aus den Formulardaten ---------- */
function requestColumns(type, d) {
  const name = [d.Vorname, d.name].filter(Boolean).join(' ').trim();
  const brandRaw = d['Marke (Freitext)'] || (d.Marke === 'Andere' ? '' : d.Marke) || '';
  const modelRaw = d['Modell (Freitext)'] || (d.Modell === 'Anderes Modell' || d.Modell === 'Noch offen' ? '' : d.Modell) || '';
  let brand = clean(brandRaw), model = clean(modelRaw);
  if (!brand && d['Marke und Modell']) { const v = clean(d['Marke und Modell']); brand = v.split(/\s+/)[0] || ''; model = v.slice(brand.length).trim(); }
  const vehicle = [brand === 'Noch offen' ? 'Fahrzeug noch offen' : brand, model, clean(d.Modellvariante)].filter(Boolean).join(' ');
  const zustand = type === 'sell' ? 'Gebrauchtwagen' : (d.Zustand || '');
  const pay = type === 'sell' ? 'verkaufen' : String(d.Bezahlart || '').toLowerCase();
  const budget = type === 'sell' ? (d.Preisvorstellung || '') : (d.Budget || d.Wunschrate || '');
  const summary = type === 'sell'
    ? ['Verkauf', d.Verkaufszeitpunkt].filter(Boolean).join(' · ')
    : [PAY_LABEL[pay] || d.Bezahlart, d.Zustand, d['Servicepaket Wartung & Inspektion'] ? 'Service Plus' : '', d['Servicepaket Versicherung / Kasko'] ? 'Versicherung/Kasko' : ''].filter(Boolean).join(' · ');
  return { customer_name: name, email: clean(d.email).toLowerCase(), phone: clean(d.phone), brand, model, vehicle, summary, zustand, pay_kind: pay, budget: str(budget, 40), plz: str(d.PLZ, 5), city: str(d.Ort, 80) };
}
function parseRadius(v, s) {
  if (v === undefined || v === null || v === '') return s.radius_default;
  if (/bundesweit|deutschland|ganz|alle|egal/i.test(String(v))) return 0;
  const n = toInt(String(v).replace(/[^0-9]/g, ''), s.radius_default); return n;
}

/* ---------- Eingang einer neuen Anfrage (Webseite) ---------- */
async function createRequest(ctx, type, data, { customerAccount, source }) {
  const s = await settingsOf(ctx);
  const stored = {};
  for (const [k, v] of Object.entries(data)) if (!/^(_sig|_ts|Firma2)$/.test(k)) stored[k] = typeof v === 'string' ? v.slice(0, k === 'body' ? 20000 : 4000) : String(v ?? '');
  const c = requestColumns(type, stored);
  const t = nowIso();
  const id = await DB.insert(ctx.db, 'requests', { type, status: 'eingang', priority: 'normal', customer_name: c.customer_name, email: c.email, phone: c.phone,
    brand: c.brand, model: c.model, vehicle: c.vehicle, summary: c.summary, customer_account: customerAccount || null, page: str(stored._page, 300),
    data: JSON.stringify(stored), created_at: t, updated_at: t, plz: c.plz, city: c.city, radius_km: parseRadius(stored.Umkreis, s), zustand: c.zustand,
    pay_kind: c.pay_kind, budget: c.budget, source: str(source || stored._src || 'Webseite', 120), deleted: 0, billed: 0, customer_note_unread: 0 });
  await reqEvent(ctx, id, 'eingang', REQUEST_TYPES[type].label);
  await audit(ctx, 'anfrage_eingang', 'anfrage', toNumber(id), { type, plz: c.plz, marke: c.brand });
  await notifyStaff(ctx, { perm: 'req_edit' }, { kind: 'anfrage', title: `Neue Anfrage #${toNumber(id)} · ${c.vehicle || REQUEST_TYPES[type].label}`, body: `${c.summary} · PLZ ${c.plz}`, link: `#/anfragen/${toNumber(id)}` });
  return id;
}

/* ---------- Automatische Verteilung an Geschäftspartner ---------- */
async function matchingOrgs(ctx, req) {
  const orgs = await DB.all(ctx.db, "SELECT * FROM orgs WHERE active = 1 AND deleted = 0");
  const loc = req.lat != null ? { lat: req.lat, lon: req.lon } : null;
  const b = normBrand(req.brand);
  const out = [];
  for (const o of orgs) {
    if (!jparse(o.accepts, ['deal', 'sell']).includes(req.type)) continue;
    const brands = jparse(o.brands, []);
    const brandOk = brands.includes('*') || !b || req.brand === 'Noch offen' || brands.some((x) => normBrand(x) === b);
    if (!brandOk) continue;
    const users = await DB.val(ctx.db, 'SELECT COUNT(*) FROM partner_users WHERE org_id = ? AND active = 1', o.id);
    if (!users) continue;
    const dist = loc && o.lat != null ? distanceKm(loc, { lat: o.lat, lon: o.lon }) : null;
    const radius = req.radius_km || 0;
    if (radius > 0 && (dist === null || dist > radius)) continue;
    if (o.max_radius_km && dist !== null && dist > o.max_radius_km) continue;
    out.push({ org: o, dist });
  }
  return out.sort((a, b2) => (a.dist ?? 9999) - (b2.dist ?? 9999));
}

async function dispatchRequest(ctx, id) {
  const s = await settingsOf(ctx);
  const req = await DB.one(ctx.db, 'SELECT * FROM requests WHERE id = ?', id);
  if (!req || req.deleted) return { ok: false };
  const problems = [];
  if (!plzOk(req.plz)) problems.push('Postleitzahl fehlt oder ist ungültig');
  if (!req.brand) problems.push('Marke fehlt');
  if (problems.length && !(req.brand === 'Noch offen' && plzOk(req.plz))) {
    await DB.update(ctx.db, 'requests', id, { status: 'fehler', status_note: problems.join(', '), updated_at: nowIso() });
    await reqEvent(ctx, id, 'fehler', problems.join(', '));
    await notifyStaff(ctx, { perm: 'req_partner' }, { kind: 'fehler', title: `Fehlerhafte Anfrage #${toNumber(id)}`, body: problems.join(', '), link: `#/anfragen/${toNumber(id)}` });
    return { ok: false, error: problems.join(', ') };
  }
  const geo = await geocodePlz(ctx, req.plz);
  if (geo) { await DB.update(ctx.db, 'requests', id, { lat: geo.lat, lon: geo.lon, city: req.city || geo.city || null }); req.lat = geo.lat; req.lon = geo.lon; }
  const matches = await matchingOrgs(ctx, req);
  const existing = new Set((await DB.all(ctx.db, 'SELECT org_id FROM assignments WHERE request_id = ?', id)).map((r) => r.org_id));
  let created = 0, mailErrors = 0, mails = 0;
  for (const m of matches) {
    if (existing.has(m.org.id)) continue;
    const r = await createAssignment(ctx, req, m.org, { source: 'auto', distance: m.dist });
    created++; mails += r.mails; mailErrors += r.mailErrors;
  }
  const t = nowIso();
  if (!created && !existing.size) {
    await DB.update(ctx.db, 'requests', id, { status: 'in_bearbeitung', status_note: 'Kein passender Geschäftspartner (Marke/Umkreis) – bitte manuell zuordnen', updated_at: t });
    await reqEvent(ctx, id, 'kein_partner', `Kein Partner für ${req.brand || 'Marke'} im Umkreis ${req.radius_km ? req.radius_km + ' km' : 'bundesweit'}`);
    await notifyStaff(ctx, { perm: 'req_partner' }, { kind: 'anfrage', title: `#${toNumber(id)}: kein passender Partner`, body: `${req.vehicle} · PLZ ${req.plz} · Umkreis ${req.radius_km || 'bundesweit'} km`, link: `#/anfragen/${toNumber(id)}` });
    return { ok: true, assigned: 0 };
  }
  const deadline = await DB.val(ctx.db, "SELECT MAX(deadline_at) FROM assignments WHERE request_id = ? AND status IN ('neu','in_bearbeitung')", id);
  const status = mailErrors && mailErrors >= mails && mails > 0 ? 'stoerung' : 'versendet';
  await DB.update(ctx.db, 'requests', id, { status: ['eingang', 'in_bearbeitung', 'fehler'].includes(req.status) ? status : req.status, dispatched_at: req.dispatched_at || t, deadline_at: deadline, status_note: status === 'stoerung' ? 'Versand an Partner fehlgeschlagen' : null, updated_at: t });
  await reqEvent(ctx, id, 'versendet', `An ${created} Geschäftspartner verteilt`);
  if (status === 'stoerung') await notifyStaff(ctx, { perm: 'req_partner' }, { kind: 'fehler', title: `Störung bei #${toNumber(id)}`, body: 'Die E-Mails an die Partner konnten nicht zugestellt werden.', link: `#/anfragen/${toNumber(id)}` });
  return { ok: true, assigned: created };
}

async function createAssignment(ctx, req, org, { source = 'auto', distance = null, targetUserId = null, note = null } = {}) {
  const s = await settingsOf(ctx);
  const t = nowIso();
  if (distance === null && req.lat != null && org.lat != null) distance = distanceKm({ lat: req.lat, lon: req.lon }, { lat: org.lat, lon: org.lon });
  const deadline = isoOf(addBusinessHours(nowMs(), s.offer_window_hours, { saturday: saturdayOpen(org.opening) }));
  const aid = await DB.insert(ctx.db, 'assignments', { request_id: req.id, org_id: org.id, status: 'neu', source, target_user_id: targetUserId, distance_km: distance,
    deadline_at: deadline, archived: 0, reminders: 0, created_at: t, updated_at: t });
  await partnerEvent(ctx, { assignmentId: aid, requestId: req.id, orgId: org.id, action: 'zugeordnet', text: source === 'auto' ? 'Automatisch zugeordnet (Marke/Umkreis)' : 'Manuell durch KFL zugeordnet' });
  if (note) await partnerEvent(ctx, { assignmentId: aid, requestId: req.id, orgId: org.id, action: 'notiz', text: note, visiblePartner: true });
  const r = await mailAssignment(ctx, req, org, aid, { targetUserId, deadline });
  await DB.update(ctx.db, 'assignments', aid, { mailed_at: r.mails ? nowIso() : null });
  return { id: aid, ...r };
}
function teaserLine(req, distance) {
  return [req.type === 'sell' ? 'Ankauf' : (req.zustand || 'Fahrzeug'), req.brand && req.brand !== 'Noch offen' ? req.brand : null, req.plz ? `PLZ ${req.plz}` : null, distance != null ? `${String(distance).replace('.', ',')} km entfernt` : null].filter(Boolean).join(' · ');
}
async function mailAssignment(ctx, req, org, aid, { targetUserId, deadline, reminder = false, extra = '' } = {}) {
  const s = await settingsOf(ctx);
  const users = await DB.all(ctx.db, 'SELECT id, email, name, role FROM partner_users WHERE org_id = ? AND active = 1', org.id);
  const targets = targetUserId ? users.filter((u) => u.id === targetUserId || u.role !== 'vt') : users;
  const asg = await DB.one(ctx.db, 'SELECT * FROM assignments WHERE id = ?', aid);
  const line = teaserLine(req, asg ? asg.distance_km : null);
  const title = reminder ? `Erinnerung: Anfrage #${toNumber(req.id)} wartet auf dein Angebot` : `Neue Anfrage #${toNumber(req.id)} in deiner Nähe`;
  const link = partnerUrl(ctx, s, `#/anfragen/${aid}`);
  let mails = 0, mailErrors = 0;
  for (const u of targets) {
    await notify(ctx, 'partner', u.id, { kind: reminder ? 'mahnung' : 'anfrage', title, body: line + (extra ? '\n' + extra : ''), link: `#/anfragen/${aid}` });
    const body = `<p>Hallo ${esc(u.name)},</p><p>${reminder ? 'zu dieser Anfrage liegt uns noch kein Angebot von dir vor:' : 'für dich ist eine neue Anfrage eingegangen:'}</p>
      <p style="font-size:18px;font-weight:700;margin:14px 0">${esc(line)}</p>${extra ? `<p>${esc(extra).replace(/\n/g, '<br>')}</p>` : ''}
      <p>Angebotsfrist: <strong>${esc(fmtDE(deadline || (asg && asg.deadline_at)))}</strong> (gezählt werden Werktage${saturdayOpen(org.opening) ? ' inkl. Samstag' : ''}).</p>
      ${link ? mailBtn(link, 'Anfrage im Partner-Dashboard öffnen') : ''}<p style="color:#6b6b70;font-size:13px">Die Kontaktdaten des Kunden erhältst du, sobald er dein Angebot annimmt.</p>`;
    const r = await sendMail(ctx, { category: 'partner', to: u.email, toName: u.name, subject: title, title, body });
    mails++; if (r.status === 'fehler') mailErrors++;
  }
  return { mails, mailErrors };
}

/* ---------- Ansicht für Partner (ohne persönliche Kundendaten) ---------- */
function partnerRequestData(req, level) {
  const d = jparse(req.data, {});
  const base = { number: toNumber(req.id), type: req.type, typeLabel: REQUEST_TYPES[req.type] ? REQUEST_TYPES[req.type].label : req.type, zustand: req.zustand, plz: req.plz,
    brand: req.brand === 'Noch offen' ? '' : req.brand, created_at: req.created_at };
  if (level === 'teaser') return base;
  const fields = {};
  for (const [k, v] of Object.entries(d)) { if (HIDDEN_KEY.test(k) || PERSONAL_KEY.test(k) || String(v).trim() === '') continue; fields[k] = k === 'Bezahlart' ? (PAY_LABEL[v] || v) : v; }
  return { ...base, model: req.model, vehicle: req.vehicle, pay_kind: req.pay_kind, summary: req.summary, budget: req.budget, fields };
}
function customerContact(req) {
  const d = jparse(req.data, {});
  return { name: [d.Vorname, d.name].filter(Boolean).join(' '), email: d.email || req.email, phone: d.phone || req.phone, street: d['Straße'] || '', zip: d.PLZ || req.plz, city: d.Ort || req.city || '', contactWay: d.Kontaktweg || '' };
}

/* ---------- Partner übernimmt / gibt frei ---------- */
async function takeAssignment(ctx, p, aid) {
  const s = await settingsOf(ctx);
  const a = await DB.one(ctx.db, 'SELECT * FROM assignments WHERE id = ? AND org_id = ?', aid, p.orgId);
  need(a, 404, 'Anfrage nicht gefunden.');
  need(a.status === 'neu', 409, a.status === 'in_bearbeitung' ? 'Diese Anfrage wird bereits von jemandem aus deinem Team bearbeitet.' : 'Diese Anfrage kann nicht mehr übernommen werden.');
  need(!a.target_user_id || a.target_user_id === p.id || p.rank >= 2, 403, 'Diese Anfrage ist einer anderen Person zugeordnet.');
  need(!a.deadline_at || a.deadline_at > nowIso(), 409, 'Die Frist für diese Anfrage ist abgelaufen.');
  const t = nowIso();
  const res = await ctx.db.prepare("UPDATE assignments SET status = 'in_bearbeitung', taken_by = ?, taken_at = ?, lock_until = ?, updated_at = ? WHERE id = ? AND status = 'neu'")
    .bind(p.id, t, isoOf(nowMs() + s.lock_hours * 3600e3), t, aid).run();
  need(!res.meta || res.meta.changes !== 0, 409, 'Diese Anfrage wurde gerade von jemand anderem übernommen.');
  await partnerEvent(ctx, { assignmentId: aid, requestId: a.request_id, orgId: a.org_id, action: 'uebernommen', text: `Übernommen von ${p.name}` });
  await reqEvent(ctx, a.request_id, 'partner_uebernommen', `${p.org.name}: in Bearbeitung`);
  await audit(ctx, 'partner_uebernahme', 'zuordnung', aid, { anfrage: toNumber(a.request_id) });
  const req = await DB.one(ctx.db, 'SELECT first_action_at FROM requests WHERE id = ?', a.request_id);
  if (req && !req.first_action_at) await DB.update(ctx.db, 'requests', a.request_id, { first_action_at: t });
  return { ok: true };
}
async function releaseAssignment(ctx, aid, { byPartner, reason }) {
  const a = await DB.one(ctx.db, 'SELECT a.*, u.name AS taker FROM assignments a LEFT JOIN partner_users u ON u.id = a.taken_by WHERE a.id = ?', aid);
  if (!a || a.status !== 'in_bearbeitung') return false;
  await DB.run(ctx.db, "UPDATE assignments SET status = 'neu', taken_by = NULL, taken_at = NULL, lock_until = NULL, updated_at = ? WHERE id = ?", nowIso(), aid);
  await partnerEvent(ctx, { assignmentId: aid, requestId: a.request_id, orgId: a.org_id, action: 'wieder_geoeffnet', confidential: true,
    text: `Vertrauliche Information: ${reason || (byPartner ? `${a.taker || 'Ein Nutzer'} hat die Anfrage wieder für die Organisation geöffnet.` : `Bearbeitung durch ${a.taker || 'Nutzer'} ohne Angebot – nach Ablauf der Bearbeitungszeit automatisch wieder freigegeben.`)}` });
  await notifyPartner(ctx, { orgId: a.org_id }, { kind: 'anfrage', title: `Anfrage #${toNumber(a.request_id)} ist wieder frei`, body: 'Die Anfrage kann von deinem Team übernommen werden.', link: `#/anfragen/${aid}` });
  return true;
}

/* ---------- Angebot ---------- */
const OFFER_FIELDS = ['config', 'herstellercode', 'price', 'monthly_rate', 'km_per_year', 'km_confirmed', 'term_months', 'term_confirmed', 'down_payment', 'final_rate',
  'transfer_cost', 'service_cost', 'insurance_cost', 'vat_mode', 'delivery', 'first_registration', 'mileage', 'upe', 'accident_free', 'owners', 'equipment_match',
  'buy_price', 'pickup', 'valid_until', 'notes'];
function normalizeOffer(req, b) {
  const kind = req.type === 'sell' ? 'ankauf' : ({ kaufen: 'kauf', finanzieren: 'finanzierung', leasen: 'leasing' }[req.pay_kind] || str(b.kind, 20) || 'kauf');
  const d = {};
  for (const k of OFFER_FIELDS) if (b[k] !== undefined && b[k] !== null && b[k] !== '') d[k] = typeof b[k] === 'string' ? b[k].trim().slice(0, k === 'notes' ? 3000 : 200) : b[k];
  for (const k of ['price', 'monthly_rate', 'down_payment', 'final_rate', 'transfer_cost', 'service_cost', 'insurance_cost', 'upe', 'buy_price']) if (d[k] !== undefined) d[k] = toNum(d[k]);
  for (const k of ['km_per_year', 'term_months', 'mileage', 'owners']) if (d[k] !== undefined) d[k] = toInt(String(d[k]).replace(/[^0-9]/g, ''), null);
  const isB2B = /gewerb|selbst/i.test(jparse(req.data, {}).Kundenart || '');
  d.vat_mode = kind === 'finanzierung' ? 'brutto' : (isB2B ? 'netto' : 'brutto');
  const errors = [];
  if (kind === 'kauf' && !(d.price > 0)) errors.push('Bitte gib den Kaufpreis an.');
  if (kind === 'leasing') { if (!(d.monthly_rate > 0)) errors.push('Bitte gib die monatliche Rate an.'); if (!d.km_per_year) errors.push('Bitte bestätige die Kilometerleistung oder gib eine Alternative an.'); if (!d.term_months) errors.push('Bitte bestätige die Laufzeit oder gib eine Alternative an.'); }
  if (kind === 'finanzierung') { if (!(d.price > 0)) errors.push('Bitte gib den Kaufpreis an.'); if (!(d.monthly_rate > 0)) errors.push('Bitte gib die monatliche Rate an.'); if (d.final_rate === undefined || d.final_rate === null) errors.push('Bitte gib die Schlussrate an (0, falls keine).'); if (!d.term_months) errors.push('Bitte gib die Laufzeit an.'); }
  if (kind === 'ankauf' && !(d.buy_price > 0)) errors.push('Bitte gib deinen Ankaufpreis an.');
  if (kind !== 'ankauf' && !['gleich', 'alternativ'].includes(d.config)) errors.push('Bitte wähle, ob das Angebot der angefragten Konfiguration entspricht.');
  if (!['ja', 'nein'].includes(String(d.equipment_match || '').toLowerCase())) errors.push('Bitte beantworte, ob die Ausstattung der Anfrage entspricht (Ja/Nein).');
  if (d.equipment_match) d.equipment_match = String(d.equipment_match).toLowerCase();
  const data = jparse(req.data, {});
  if (kind !== 'ankauf' && data['Servicepaket Wartung & Inspektion'] && d.service_cost === undefined) errors.push('Der Kunde wünscht das Servicepaket Wartung & Inspektion – bitte gib die Kosten an.');
  if (kind !== 'ankauf' && data['Servicepaket Versicherung / Kasko'] && d.insurance_cost === undefined) errors.push('Der Kunde wünscht Versicherung/Kasko – bitte gib die Kosten an.');
  return { kind, d, errors };
}
function compareValue(kind, d) {
  const term = d.term_months || 36, one = (d.transfer_cost || 0);
  if (kind === 'kauf') return (d.price || 0) + one;
  if (kind === 'leasing') return (d.monthly_rate || 0) * term + (d.down_payment || 0) + one;
  if (kind === 'finanzierung') return (d.monthly_rate || 0) * term + (d.down_payment || 0) + (d.final_rate || 0) + one;
  if (kind === 'ankauf') return d.buy_price || 0;
  return 0;
}
async function submitOffer(ctx, p, aid, body) {
  const a = await DB.one(ctx.db, 'SELECT * FROM assignments WHERE id = ? AND org_id = ?', aid, p.orgId);
  need(a, 404, 'Anfrage nicht gefunden.');
  need(a.status === 'in_bearbeitung' && a.taken_by === p.id, 409, 'Bitte übernimm die Anfrage zuerst.');
  need(!a.deadline_at || a.deadline_at > nowIso(), 409, 'Die Angebotsfrist ist leider abgelaufen.');
  const req = await DB.one(ctx.db, 'SELECT * FROM requests WHERE id = ?', a.request_id);
  const { kind, d, errors } = normalizeOffer(req, body);
  need(!errors.length, 400, errors.join(' '));
  const t = nowIso();
  const files = {};
  for (const [field, col] of [['pdf', 'pdf_file_id'], ['expose', 'expose_file_id']]) {
    const f = body[field];
    if (f && f.base64) {
      need(/pdf/i.test(f.type || '') || /\.pdf$/i.test(f.name || ''), 400, 'Bitte lade nur PDF-Dateien hoch.');
      const bytes = unb64(f.base64); need(bytes.length <= 8 * 1024 * 1024, 413, 'Die PDF-Datei ist zu groß (max. 8 MB).');
      files[col] = await putFile(ctx, { name: f.name || field + '.pdf', mime: 'application/pdf', bytes, ownerType: 'offer', ownerId: aid });
    }
  }
  const oid = await DB.insert(ctx.db, 'offers', { request_id: a.request_id, assignment_id: aid, org_id: p.orgId, user_id: p.id, kind, data: JSON.stringify(d),
    compare_value: compareValue(kind, d), status: 'eingereicht', ...files, created_at: t, updated_at: t });
  await DB.update(ctx.db, 'assignments', aid, { status: 'versendet', sent_at: t, offer_id: oid, lock_until: null, updated_at: t });
  if (['versendet', 'eingang', 'in_bearbeitung', 'stoerung'].includes(req.status)) await DB.update(ctx.db, 'requests', req.id, { status: 'angebot_liegt_vor', updated_at: t });
  await partnerEvent(ctx, { assignmentId: aid, requestId: req.id, orgId: p.orgId, action: 'angebot', text: `Angebot abgegeben von ${p.name}` });
  await reqEvent(ctx, req.id, 'angebot', `Angebot von ${p.org.name} eingegangen`);
  await audit(ctx, 'angebot_abgegeben', 'angebot', oid, { anfrage: toNumber(req.id), org: p.orgId });
  await notifyStaff(ctx, { perm: 'req_edit' }, { kind: 'angebot', title: `Angebot zu #${toNumber(req.id)} eingegangen`, body: `${p.org.name} · ${req.vehicle || ''}`, link: `#/anfragen/${toNumber(req.id)}` });
  await maybeEvaluate(ctx, req.id);
  return { ok: true, id: oid };
}

/* ---------- Auswertung und Vorstellung beim Kunden ---------- */
async function maybeEvaluate(ctx, rid, { force = false } = {}) {
  const req = await DB.one(ctx.db, 'SELECT * FROM requests WHERE id = ?', rid);
  if (!req || req.deleted || req.evaluated_at) return false;
  const open = await DB.val(ctx.db, "SELECT COUNT(*) FROM assignments WHERE request_id = ? AND status IN ('neu','in_bearbeitung')", rid);
  const total = await DB.val(ctx.db, 'SELECT COUNT(*) FROM assignments WHERE request_id = ?', rid);
  if (!total) return false;
  if (open && !force) return false;
  await evaluateRequest(ctx, rid);
  return true;
}
async function partnerRating(ctx, orgId) {
  const r = await DB.one(ctx.db, 'SELECT AVG(rating) AS avg, COUNT(*) AS n FROM surveys WHERE org_id = ? AND rating IS NOT NULL', orgId);
  return r && r.n ? r.avg : null;
}
/* Bewertung nach 7 Faktoren (je 0–100 Punkte), gewichtet laut Einstellung (Summe 100 %).
   Faktoren, die für eine Anfrage nicht zutreffen (z. B. Laufzeit beim Kauf), werden herausgerechnet. */
const lastNum = (v) => { const m = String(v || '').replace(/\./g, '').match(/\d+/g); return m ? +m[m.length - 1] : null; };
function scoreWeights(s) { const w = {}; for (const f of SCORE_FACTORS) w[f.key] = Math.max(0, toNum(s['score_w_' + f.key], 0) || 0); return w; }
async function scoreOffers(ctx, req, offers, s) {
  const sell = req.type === 'sell', f = jparse(req.data, {}), w = scoreWeights(s);
  const vals = offers.map((o) => o.compare_value).filter((v) => v > 0);
  const best = vals.length ? (sell ? Math.max(...vals) : Math.min(...vals)) : 0;
  const maxKm = req.radius_km > 0 ? req.radius_km : 200;
  const winH = Math.max(1, toNum(s.offer_window_hours, 24) || 24);
  const wantTerm = lastNum(f.Laufzeit);
  const wantService = !!f['Servicepaket Wartung & Inspektion'], wantKasko = !!f['Servicepaket Versicherung / Kasko'];
  for (const o of offers) {
    const d = jparse(o.data, {});
    const a = await DB.one(ctx.db, 'SELECT created_at, taken_at FROM assignments WHERE id = ?', o.assignment_id);
    const hours = a ? Math.max(0, (msOf(o.created_at) - msOf(a.created_at)) / 3600e3) : null;
    const pts = {
      distance: o.distance_km == null ? 50 : Math.max(0, 100 * (1 - o.distance_km / maxKm)),
      response: hours == null ? 50 : Math.max(0, 100 * (1 - hours / winH)),
      equipment: d.equipment_match === 'ja' ? 100 : d.equipment_match === 'nein' ? 0 : 50,
      price: best && o.compare_value > 0 ? (sell ? o.compare_value / best : best / o.compare_value) * 100 : 0,
      model: sell ? null : d.config === 'alternativ' ? 0 : 100,
      term: wantTerm && d.term_months ? (+lastNum(d.term_months) === wantTerm ? 100 : Math.max(0, 100 - Math.abs(+lastNum(d.term_months) - wantTerm) * 5)) : null,
      addons: wantService || wantKasko ? ((wantService ? (toNum(d.service_cost) > 0 ? 1 : 0) : 0) + (wantKasko ? (toNum(d.insurance_cost) > 0 ? 1 : 0) : 0)) / ((wantService ? 1 : 0) + (wantKasko ? 1 : 0)) * 100 : null
    };
    let sum = 0, wsum = 0; const detail = {};
    for (const k of Object.keys(pts)) { if (pts[k] === null) { detail[k] = null; continue; } const p = Math.round(Math.min(100, pts[k]) * 10) / 10; detail[k] = p; sum += p * w[k]; wsum += w[k]; }
    o.score = wsum ? Math.round((sum / wsum) * 10) / 10 : 0;
    o.scoreDetail = { points: detail, weights: w, hours: hours == null ? null : Math.round(hours * 10) / 10 };
  }
  return offers;
}
async function evaluateRequest(ctx, rid) {
  const s = await settingsOf(ctx);
  const req = await DB.one(ctx.db, 'SELECT * FROM requests WHERE id = ?', rid);
  const offers = await DB.all(ctx.db, "SELECT o.*, a.distance_km FROM offers o JOIN assignments a ON a.id = o.assignment_id WHERE o.request_id = ? AND o.status = 'eingereicht'", rid);
  const t = nowIso();
  if (!offers.length) {
    await DB.update(ctx.db, 'requests', rid, { status: 'kein_angebot', evaluated_at: t, updated_at: t });
    await reqEvent(ctx, rid, 'auswertung', 'Kein Angebot innerhalb der Frist');
    await notifyStaff(ctx, { perm: 'req_edit' }, { kind: 'anfrage', title: `#${toNumber(rid)}: kein Angebot erhalten`, body: 'Bitte den Kunden persönlich kontaktieren oder weitere Partner zuordnen.', link: `#/anfragen/${toNumber(rid)}` });
    return;
  }
  await scoreOffers(ctx, req, offers, s);
  offers.sort((a, b) => b.score - a.score);
  // die besten (Standard: 3) Angebote werden dem Kunden vorgestellt – auch wenn mehr eingegangen sind
  const n = Math.max(1, Math.min(3, toInt(s.presented_count, 3)));
  const review = !!s.review_before_present;
  for (const [i, o] of offers.entries()) {
    const chosen = i < n;
    await DB.update(ctx.db, 'offers', o.id, { score: o.score, score_detail: JSON.stringify(o.scoreDetail || {}), rank: i + 1, status: chosen ? (review ? 'ausgewaehlt' : 'vorgestellt') : 'nicht_ausgewaehlt', updated_at: t });
    if (!chosen) await closeAssignmentNotChosen(ctx, o.assignment_id, 'Ein anderes Angebot hat beim Preis-Leistungs-Vergleich besser abgeschnitten.');
  }
  await DB.update(ctx.db, 'requests', rid, { evaluated_at: t, status: review ? 'angebot_in_bearbeitung' : 'angebot_beim_kunden', updated_at: t });
  await reqEvent(ctx, rid, 'auswertung', `${offers.length} Angebot(e) ausgewertet, ${Math.min(n, offers.length)} ausgewählt`);
  if (review) {
    await notifyStaff(ctx, { perm: 'req_edit' }, { kind: 'angebot', title: `#${toNumber(rid)}: Angebot zur Freigabe`, body: 'Bitte prüfen und dem Kunden vorstellen.', link: `#/anfragen/${toNumber(rid)}` });
    return;
  }
  await presentOffers(ctx, rid);
}
async function closeAssignmentNotChosen(ctx, aid, reason) {
  const a = await DB.one(ctx.db, 'SELECT * FROM assignments WHERE id = ?', aid);
  if (!a) return;
  await DB.update(ctx.db, 'assignments', aid, { status: 'geschlossen', closed_reason: reason, updated_at: nowIso() });
  await partnerEvent(ctx, { assignmentId: aid, requestId: a.request_id, orgId: a.org_id, action: 'geschlossen', text: reason, visiblePartner: true });
  const who = a.taken_by ? { userIds: [a.taken_by] } : { orgId: a.org_id, roles: ['gf', 'vl'] };
  await notifyPartner(ctx, who, { kind: 'info', title: `Anfrage #${toNumber(a.request_id)} geschlossen`, body: reason + ' Danke für dein Angebot – beim nächsten Mal klappt es!', link: `#/anfragen/${aid}` });
}
async function presentOffers(ctx, rid) {
  const s = await settingsOf(ctx);
  const t = nowIso();
  await DB.run(ctx.db, "UPDATE offers SET status = 'vorgestellt', updated_at = ? WHERE request_id = ? AND status = 'ausgewaehlt'", t, rid);
  const chosen = await DB.all(ctx.db, "SELECT * FROM offers WHERE request_id = ? AND status = 'vorgestellt'", rid);
  for (const o of chosen) {
    const a = await DB.one(ctx.db, 'SELECT * FROM assignments WHERE id = ?', o.assignment_id);
    await DB.update(ctx.db, 'assignments', a.id, { status: 'vorgestellt', updated_at: t });
    await partnerEvent(ctx, { assignmentId: a.id, requestId: rid, orgId: a.org_id, action: 'vorgestellt', text: 'Dein Angebot wurde dem Kunden vorgestellt.', visiblePartner: true });
    await notifyPartner(ctx, a.taken_by ? { userIds: [a.taken_by] } : { orgId: a.org_id }, { kind: 'erfolg', title: `Stark! Dein Angebot zu #${toNumber(rid)} wurde dem Kunden vorgestellt`, body: 'Es gehört zu den besten Angeboten. Jetzt entscheidet der Kunde.', link: `#/anfragen/${a.id}` });
  }
  const req = await DB.one(ctx.db, 'SELECT * FROM requests WHERE id = ?', rid);
  await DB.update(ctx.db, 'requests', rid, { status: 'angebot_beim_kunden', presented_at: t, updated_at: t });
  await reqEvent(ctx, rid, 'vorgestellt', `${chosen.length} Angebot(e) dem Kunden vorgestellt`);
  const d = jparse(req.data, {});
  const link = s.link_my_requests + '#anfrage-' + toNumber(rid);
  const r = await sendMail(ctx, { category: 'system', to: req.email, toName: d.Vorname, subject: `Dein Angebot zu Anfrage #${toNumber(rid)} ist da`, title: 'Dein Angebot ist da.',
    body: `<p>Hallo ${esc(d.Vorname || '')},</p><p>wir haben die Angebote unserer geprüften Partner für deine Anfrage <strong>#${toNumber(rid)}</strong> (${esc(req.vehicle || REQUEST_TYPES[req.type].label)}) verglichen und das beste für dich ausgewählt.</p>
      <p>Schau es dir in deinem Kundenkonto an. Gefällt es dir, klickst du einfach auf <strong>„Interessiert mich“</strong> – dann meldet sich der Partner direkt bei dir.</p>${mailBtn(link, 'Angebot ansehen')}<p style="color:#6b6b70;font-size:13px">Bis zu deiner Zusage bleiben deine Kontaktdaten bei uns.</p>` });
  if (r.status === 'fehler') { await DB.update(ctx.db, 'requests', rid, { status_note: 'E-Mail an Kunden fehlgeschlagen' }); await reqEvent(ctx, rid, 'stoerung', 'Mail an Kunden fehlgeschlagen'); }
}

// Anonymisierte Angebotsdaten für den Kunden
async function customerOffers(ctx, req) {
  const s = await settingsOf(ctx);
  const offers = await DB.all(ctx.db, "SELECT o.*, a.distance_km, a.status AS a_status, g.name AS org_name, g.city AS org_city, g.street AS org_street, g.zip AS org_zip, g.phone AS org_phone, g.email AS org_email, g.website AS org_web FROM offers o JOIN assignments a ON a.id = o.assignment_id JOIN orgs g ON g.id = o.org_id WHERE o.request_id = ? AND o.status IN ('vorgestellt','angenommen','abgelehnt_kunde') ORDER BY o.rank", req.id);
  const out = [];
  for (const o of offers) {
    const d = jparse(o.data, {});
    const accepted = o.status === 'angenommen';
    const identity = accepted || s.show_partner_identity;
    let contact = null;
    if (accepted) {
      const u = await DB.one(ctx.db, 'SELECT name, email, phone FROM partner_users WHERE id = (SELECT taken_by FROM assignments WHERE id = ?)', o.assignment_id);
      contact = { person: u ? u.name : '', email: (u && u.email) || o.org_email, phone: (u && u.phone) || o.org_phone };
    }
    out.push({ id: o.id, kind: o.kind, status: o.status, rank: o.rank, data: pick(d, OFFER_FIELDS.filter((k) => k !== 'herstellercode' || !!d.herstellercode)),
      partner: identity ? { name: o.org_name, city: o.org_city, street: accepted ? o.org_street : undefined, zip: accepted ? o.org_zip : undefined, web: o.org_web, ...(contact || {}) } : { name: 'Geprüfter KFL-Partner', city: '' },
      distance_km: o.distance_km, has_pdf: !!o.public_file_id, has_expose: !!o.public_expose_id });
  }
  return out;
}

/* ---------- Kunde: „Interessiert mich“ / ablehnen ---------- */
async function acceptOffer(ctx, req, offerId) {
  const s = await settingsOf(ctx);
  const o = await DB.one(ctx.db, "SELECT * FROM offers WHERE id = ? AND request_id = ?", offerId, req.id);
  need(o, 404, 'Angebot nicht gefunden.');
  need(o.status === 'vorgestellt', 409, 'Dieses Angebot ist nicht mehr verfügbar.');
  const t = nowIso();
  await DB.update(ctx.db, 'offers', o.id, { status: 'angenommen', updated_at: t });
  for (const other of await DB.all(ctx.db, "SELECT * FROM offers WHERE request_id = ? AND status = 'vorgestellt' AND id != ?", req.id, o.id)) {
    await DB.update(ctx.db, 'offers', other.id, { status: 'nicht_ausgewaehlt', updated_at: t });
    await closeAssignmentNotChosen(ctx, other.assignment_id, 'Der Kunde hat sich für ein anderes Angebot entschieden.');
  }
  await DB.update(ctx.db, 'requests', req.id, { status: 'angebot_akzeptiert', decided_at: t, won_assignment_id: o.assignment_id, updated_at: t });
  await reqEvent(ctx, req.id, 'angebot_akzeptiert', 'Kunde: „Interessiert mich“');
  await audit(ctx, 'angebot_angenommen', 'angebot', o.id, { anfrage: toNumber(req.id) });
  await markWon(ctx, o.assignment_id, { initial: true });
  return { ok: true };
}
async function markWon(ctx, aid, { initial = false, note = null } = {}) {
  const s = await settingsOf(ctx);
  const a = await DB.one(ctx.db, 'SELECT a.*, g.name AS org_name, g.opening, g.lead_price FROM assignments a JOIN orgs g ON g.id = a.org_id WHERE a.id = ?', aid);
  const req = await DB.one(ctx.db, 'SELECT * FROM requests WHERE id = ?', a.request_id);
  const t = nowIso();
  const due = isoOf(addBusinessHours(nowMs(), s.contact_window_hours, { saturday: saturdayOpen(a.opening) }));
  await DB.update(ctx.db, 'assignments', aid, { status: 'gewonnen', won_at: a.won_at || t, contact_due_at: due, updated_at: t });
  await partnerEvent(ctx, { assignmentId: aid, requestId: req.id, orgId: a.org_id, action: 'gewonnen', text: note || 'Der Kunde ist interessiert – Kontaktdaten freigegeben.', visiblePartner: true });
  // Kontaktdaten an den Partner
  const c = customerContact(req);
  const taker = a.taken_by ? await DB.one(ctx.db, 'SELECT * FROM partner_users WHERE id = ?', a.taken_by) : null;
  const recipients = taker ? [taker] : await DB.all(ctx.db, "SELECT * FROM partner_users WHERE org_id = ? AND active = 1 AND role IN ('gf','vl')", a.org_id);
  let mailFail = false;
  for (const u of recipients) {
    await notify(ctx, 'partner', u.id, { kind: 'gewonnen', title: `Gewonnen! Anfrage #${toNumber(req.id)}`, body: `Der Kunde wartet auf deinen Anruf oder deine E-Mail. Bitte melde dich innerhalb der Frist (bis ${fmtDE(due)}).`, link: `#/anfragen/${aid}` });
    const plink = partnerUrl(ctx, s, `#/anfragen/${aid}?kontakt`);
    const r = await sendMail(ctx, { category: 'partner', to: u.email, toName: u.name, subject: `Gewonnen: Kunde zu Anfrage #${toNumber(req.id)} wartet auf dich`, title: 'Glückwunsch, du hast das Angebot gewonnen!',
      body: `<p>Hallo ${esc(u.name)},</p><p>der Kunde hat sich für dein Angebot zu <strong>#${toNumber(req.id)} · ${esc(req.vehicle || '')}</strong> entschieden und wartet auf deinen Anruf oder deine E-Mail.</p>
        ${plink ? mailBtn(plink, 'Anfrage & Kontaktdaten im Dashboard öffnen') : ''}
        ${mailTable([['Name', c.name], ['Telefon', c.phone], ['E-Mail', c.email], ['Anschrift', [c.street, [c.zip, c.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')], ['Bevorzugter Kontaktweg', c.contactWay]])}
        <p>Bitte kontaktiere den Kunden bis <strong>${esc(fmtDE(due))}</strong> und setze den Status im Partner-Dashboard auf „Kunde erfolgreich kontaktiert“.</p>${plink ? `<p style="color:#6b6b70;font-size:13px">Im Dashboard kannst du den Kunden direkt anrufen, ihm schreiben, den Status setzen und die Vertragsunterlagen vorbereiten.</p>` : ''}` });
    if (r.status === 'fehler') mailFail = true;
  }
  await DB.update(ctx.db, 'requests', req.id, { status: mailFail ? 'stoerung' : 'kontaktdaten_versendet', status_note: mailFail ? 'Kontaktdaten konnten nicht per Mail an den Partner gesendet werden' : null, updated_at: t });
  await reqEvent(ctx, req.id, mailFail ? 'stoerung' : 'kontaktdaten_versendet', `${a.org_name}: Kontaktdaten ${mailFail ? 'NICHT ' : ''}versendet`);
  // Kunde informieren (Partnerdaten)
  if (initial) {
    const org = await DB.one(ctx.db, 'SELECT * FROM orgs WHERE id = ?', a.org_id);
    const d = jparse(req.data, {});
    await sendMail(ctx, { category: 'system', to: req.email, toName: d.Vorname, subject: `Super, ${org.name} meldet sich bei dir`, title: 'Dein Partner meldet sich bei dir.',
      body: `<p>Hallo ${esc(d.Vorname || '')},</p><p>danke für deine Rückmeldung zu Anfrage <strong>#${toNumber(req.id)}</strong>. Wir haben deine Kontaktdaten an unseren Partner weitergegeben. Er meldet sich in Kürze bei dir:</p>
        ${mailTable([['Partner', org.name], ['Ansprechpartner', taker ? taker.name : ''], ['Telefon', (taker && taker.phone) || org.phone], ['E-Mail', (taker && taker.email) || org.email], ['Anschrift', [org.street, [org.zip, org.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')]])}
        <p>Falls sich niemand meldet, sag uns einfach Bescheid – wir kümmern uns.</p>` });
  }
  // Abrechnung (nur einmal je Zuordnung)
  const exists = await DB.val(ctx.db, 'SELECT COUNT(*) FROM billing_items WHERE assignment_id = ?', aid);
  if (!exists) {
    const price = a.lead_price != null ? a.lead_price : (req.type === 'sell' ? s.lead_price_sell : s.lead_price_deal);
    await DB.insert(ctx.db, 'billing_items', { org_id: a.org_id, request_id: req.id, assignment_id: aid, description: `Vermittlung Anfrage #${toNumber(req.id)} – ${req.vehicle || REQUEST_TYPES[req.type].label}${req.plz ? ' (PLZ ' + req.plz + ')' : ''}`,
      amount_net: round2(price), status: 'offen', created_at: t, updated_at: t });
    await reqEvent(ctx, req.id, 'buchhaltung', 'An die Buchhaltung übergeben');
    await notifyStaff(ctx, { perm: 'acc_manage' }, { kind: 'buchhaltung', title: `Neuer Abrechnungsfall #${toNumber(req.id)}`, body: `${a.org_name} · ${money(price)} netto`, link: '#/buchhaltung/faelle' });
  }
}
async function declineOffers(ctx, req, reason) {
  const t = nowIso();
  for (const o of await DB.all(ctx.db, "SELECT * FROM offers WHERE request_id = ? AND status = 'vorgestellt'", req.id)) {
    await DB.update(ctx.db, 'offers', o.id, { status: 'abgelehnt_kunde', updated_at: t });
    await closeAssignmentNotChosen(ctx, o.assignment_id, 'Der Kunde hat sich gegen das Angebot entschieden.');
  }
  await DB.update(ctx.db, 'requests', req.id, { status: 'angebot_abgelehnt', decided_at: t, updated_at: t });
  await reqEvent(ctx, req.id, 'angebot_abgelehnt', reason ? 'Kunde: ' + reason : 'Kunde hat abgelehnt');
  await notifyStaff(ctx, { perm: 'req_edit' }, { kind: 'anfrage', title: `#${toNumber(req.id)}: Kunde hat das Angebot abgelehnt`, body: reason || 'Bitte nachfassen.', link: `#/anfragen/${toNumber(req.id)}` });
}

/* ---------- Kontakt-Nachverfolgung nach „Gewonnen“ ---------- */
async function partnerContactStatus(ctx, p, aid, status, note) {
  const a = await DB.one(ctx.db, 'SELECT * FROM assignments WHERE id = ? AND org_id = ?', aid, p.orgId);
  need(a, 404, 'Anfrage nicht gefunden.');
  need(['gewonnen', 'nicht_erreicht'].includes(a.status), 409, 'Der Status kann gerade nicht geändert werden.');
  need(a.taken_by === p.id || p.rank >= 2, 403, 'Nur die bearbeitende Person kann den Status setzen.');
  need(['kontaktiert', 'nicht_erreicht'].includes(status), 400, 'Unbekannter Status.');
  const t = nowIso();
  await DB.update(ctx.db, 'assignments', aid, { status, contact_at: t, updated_at: t });
  await partnerEvent(ctx, { assignmentId: aid, requestId: a.request_id, orgId: a.org_id, action: status, text: (status === 'kontaktiert' ? 'Kunde erfolgreich kontaktiert' : 'Kunde nicht erreicht') + (note ? ': ' + note : '') });
  await reqEvent(ctx, a.request_id, 'partner_' + status, (status === 'kontaktiert' ? 'Partner: Kunde kontaktiert' : 'Partner: Kunde nicht erreicht') + (note ? ' – ' + note : ''));
  if (status === 'kontaktiert') await scheduleSurvey(ctx, a);
  else await customerFollowUp(ctx, a, 'Der Partner konnte dich leider nicht erreichen.');
  return { ok: true };
}
async function customerFollowUp(ctx, a, intro) {
  const s = await settingsOf(ctx);
  const req = await DB.one(ctx.db, 'SELECT * FROM requests WHERE id = ?', a.request_id);
  if (req.feedback_state === 'gefragt') return;
  const d = jparse(req.data, {});
  const base = (ctx.origin || '') + `/c/feedback?r=${toNumber(req.id)}&t=${await linkToken(ctx.env, 'fb', req.id)}`;
  await DB.update(ctx.db, 'requests', req.id, { feedback_state: 'gefragt', updated_at: nowIso() });
  await sendMail(ctx, { category: 'system', to: req.email, toName: d.Vorname, subject: `Kurze Frage zu deiner Anfrage #${toNumber(req.id)}`, title: 'Hat sich unser Partner bei dir gemeldet?',
    body: `<p>Hallo ${esc(d.Vorname || '')},</p><p>${esc(intro)} Hat sich unser Partner zu deiner Anfrage <strong>#${toNumber(req.id)}</strong> schon bei dir gemeldet?</p>
      <p style="margin:22px 0"><a href="${esc(base + '&a=ja')}" style="display:inline-block;background:#0a7d3b;color:#fff;font-weight:700;padding:12px 26px;border-radius:999px;text-decoration:none;margin-right:10px">Ja</a>
      <a href="${esc(base + '&a=nein')}" style="display:inline-block;background:#1a1a1a;color:#fff;font-weight:700;padding:12px 26px;border-radius:999px;text-decoration:none">Nein</a></p>` });
  await reqEvent(ctx, req.id, 'kunde_nachgefragt', 'Kunde per Mail gefragt, ob der Partner sich gemeldet hat');
}
async function customerFeedback(ctx, rid, answer) {
  const req = await DB.one(ctx.db, 'SELECT * FROM requests WHERE id = ?', rid);
  if (!req) return false;
  await DB.update(ctx.db, 'requests', rid, { feedback_state: answer, updated_at: nowIso() });
  await reqEvent(ctx, rid, 'kunde_feedback', answer === 'ja' ? 'Kunde: Partner hat sich gemeldet' : 'Kunde: Partner hat sich NICHT gemeldet');
  await DB.insert(ctx.db, 'surveys', { request_id: rid, org_id: null, kind: 'kontakt', answer, answered_at: nowIso(), created_at: nowIso() });
  await notifyStaff(ctx, { perm: 'req_edit' }, { kind: answer === 'ja' ? 'info' : 'anfrage', title: `#${toNumber(rid)}: Kunde sagt „${answer === 'ja' ? 'Ja, gemeldet' : 'Nein, nicht gemeldet'}“`, body: answer === 'ja' ? 'Bitte den Partner informieren und den Status ggf. auf „Gewonnen“ setzen.' : 'Bitte den Partner kontaktieren und nachfassen.', link: `#/anfragen/${toNumber(rid)}` });
  return true;
}
async function scheduleSurvey(ctx, a) {
  const exists = await DB.val(ctx.db, "SELECT COUNT(*) FROM surveys WHERE request_id = ? AND kind = 'bewertung'", a.request_id);
  if (!exists) await DB.insert(ctx.db, 'surveys', { request_id: a.request_id, org_id: a.org_id, kind: 'bewertung', created_at: nowIso() });
}
// KFL-Vertrieb setzt den Partner-Status manuell (immer mit Begründung, für Partner sichtbar)
async function staffSetAssignmentStatus(ctx, aid, status, note) {
  need(['gewonnen', 'verloren', 'gescheitert', 'kontaktiert'].includes(status), 400, 'Unbekannter Status.');
  need(str(note, 2000).length >= 3, 400, 'Bitte gib eine Begründung an – sie ist auch für den Partner sichtbar.');
  const a = await DB.one(ctx.db, 'SELECT * FROM assignments WHERE id = ?', aid);
  need(a, 404, 'Zuordnung nicht gefunden.');
  if (status === 'gewonnen') { await markWon(ctx, aid, { note: 'KFL: ' + note }); }
  else {
    await DB.update(ctx.db, 'assignments', aid, { status, updated_at: nowIso() });
    await partnerEvent(ctx, { assignmentId: aid, requestId: a.request_id, orgId: a.org_id, action: status, text: 'KFL: ' + note, visiblePartner: true });
  }
  await reqEvent(ctx, a.request_id, 'partnerstatus', `${statusLabel(ASSIGN_STATUSES, status)} – ${note}`);
  await notifyPartner(ctx, a.taken_by ? { userIds: [a.taken_by] } : { orgId: a.org_id }, { kind: 'info', title: `Anfrage #${toNumber(a.request_id)}: ${statusLabel(ASSIGN_STATUSES, status)}`, body: note, link: `#/anfragen/${aid}` });
}

/* ---------- Spam ---------- */
async function reportSpam(ctx, rid, reason) {
  const u = ctx._staff;
  await DB.update(ctx.db, 'requests', rid, { spam_state: 'gemeldet', spam_by: u.id, spam_reason: str(reason, 500), updated_at: nowIso() });
  await reqEvent(ctx, rid, 'spam_gemeldet', reason || '');
  await notifyStaff(ctx, { perm: 'req_spam_confirm' }, { kind: 'spam', title: `Spam-Verdacht #${toNumber(rid)} – bitte prüfen`, body: `${u.name}: ${reason || 'ohne Begründung'}`, link: `#/anfragen/${toNumber(rid)}` });
}
async function decideSpam(ctx, rid, confirm, note) {
  const req = await DB.one(ctx.db, 'SELECT * FROM requests WHERE id = ?', rid);
  need(req && req.spam_state === 'gemeldet', 409, 'Für diese Anfrage liegt keine offene Spam-Meldung vor.');
  if (!confirm) {
    await DB.update(ctx.db, 'requests', rid, { spam_state: 'abgelehnt', updated_at: nowIso() });
    await reqEvent(ctx, rid, 'spam_abgelehnt', note || 'Kein Spam');
    return;
  }
  const t = nowIso();
  await DB.update(ctx.db, 'requests', rid, { spam_state: 'bestaetigt', status: 'spam', deleted: 1, updated_at: t });
  for (const a of await DB.all(ctx.db, "SELECT * FROM assignments WHERE request_id = ? AND status IN ('neu','in_bearbeitung','versendet','vorgestellt')", rid)) {
    await DB.update(ctx.db, 'assignments', a.id, { status: 'geschlossen', archived: 1, closed_reason: 'Anfrage wurde als Spam erkannt und deaktiviert.', updated_at: t });
  }
  await reqEvent(ctx, rid, 'spam_bestaetigt', note || '');
  await createTicket(ctx, { tag: 'Intern', kind: 'spam', category: 'Spam-Prüfung', subject: `Spam bestätigt: Anfrage #${toNumber(rid)}`, priority: 'normal',
    requester: { type: 'staff', id: ctx._staff.id, name: ctx._staff.name, email: ctx._staff.email }, requestId: rid,
    text: `Die Anfrage #${toNumber(rid)} wurde als Spam gemeldet (${req.spam_reason || 'ohne Begründung'}) und von ${ctx._staff.name} bestätigt. Sie ist deaktiviert. Bitte den Fall abschließend prüfen.${note ? '\nNotiz: ' + note : ''}`, notifyAdmin: true });
}

/* ---------- Zeitgesteuerte Abläufe (Cron, alle 5 Minuten) ---------- */
async function runRequestJobs(ctx) {
  const t = nowIso(), res = { released: 0, expired: 0, evaluated: 0, followups: 0, surveys: 0 };
  // 1) Bearbeitungssperre (4 h) abgelaufen ohne Angebot → wieder für die Organisation frei
  for (const a of await DB.all(ctx.db, "SELECT id FROM assignments WHERE status = 'in_bearbeitung' AND lock_until IS NOT NULL AND lock_until < ?", t)) {
    if (await releaseAssignment(ctx, a.id, { byPartner: false })) res.released++;
  }
  // 2) Angebotsfrist abgelaufen → Verloren
  for (const a of await DB.all(ctx.db, "SELECT * FROM assignments WHERE status IN ('neu','in_bearbeitung') AND deadline_at < ?", t)) {
    await DB.update(ctx.db, 'assignments', a.id, { status: 'verloren', closed_reason: 'Die Angebotsfrist ist abgelaufen.', updated_at: t });
    await partnerEvent(ctx, { assignmentId: a.id, requestId: a.request_id, orgId: a.org_id, action: 'verloren', text: 'Frist abgelaufen – kein Angebot abgegeben.', visiblePartner: true });
    res.expired++;
  }
  // 3) Auswertung, sobald keine Zuordnung mehr offen ist
  for (const r of await DB.all(ctx.db, "SELECT id FROM requests WHERE deleted = 0 AND evaluated_at IS NULL AND status IN ('versendet','angebot_liegt_vor','stoerung') AND (SELECT COUNT(*) FROM assignments WHERE request_id = requests.id) > 0 AND (SELECT COUNT(*) FROM assignments WHERE request_id = requests.id AND status IN ('neu','in_bearbeitung')) = 0")) {
    await evaluateRequest(ctx, r.id); res.evaluated++;
  }
  // 4) Kontaktfrist nach „Gewonnen“ abgelaufen ohne Rückmeldung → Kunde fragen, Vertrieb informieren
  for (const a of await DB.all(ctx.db, "SELECT * FROM assignments WHERE status = 'gewonnen' AND contact_due_at < ? AND contact_at IS NULL", t)) {
    await DB.update(ctx.db, 'assignments', a.id, { contact_at: t });
    await partnerEvent(ctx, { assignmentId: a.id, requestId: a.request_id, orgId: a.org_id, action: 'kontaktfrist', text: 'Kontaktfrist abgelaufen – KFL fragt beim Kunden nach.', visiblePartner: true });
    await customerFollowUp(ctx, a, 'Wir möchten sichergehen, dass alles geklappt hat.');
    await notifyStaff(ctx, { perm: 'req_edit' }, { kind: 'anfrage', title: `#${toNumber(a.request_id)}: Kontaktfrist abgelaufen`, body: 'Der Partner hat noch keinen Kontakt gemeldet.', link: `#/anfragen/${toNumber(a.request_id)}` });
    res.followups++;
  }
  // 5) Bewertungsumfrage an Kunden
  const s = await settingsOf(ctx);
  const cutoff = isoOf(nowMs() - (s.survey_delay_days || 3) * 86400e3);
  for (const sv of await DB.all(ctx.db, "SELECT s.*, a.contact_at FROM surveys s JOIN assignments a ON a.request_id = s.request_id AND a.org_id = s.org_id WHERE s.kind = 'bewertung' AND s.sent_at IS NULL AND a.contact_at < ?", cutoff)) {
    const req = await DB.one(ctx.db, 'SELECT * FROM requests WHERE id = ?', sv.request_id);
    const tok = await linkToken(ctx.env, 'sv', sv.id);
    const stars = [1, 2, 3, 4, 5].map((n) => `<a href="${esc((ctx.origin || '') + `/c/survey?s=${sv.id}&t=${tok}&r=${n}`)}" style="display:inline-block;width:44px;height:44px;line-height:44px;text-align:center;border-radius:50%;background:${n >= 4 ? '#ff6c01' : '#f4f4f4'};color:#000;font-weight:700;text-decoration:none;margin-right:6px">${n}</a>`).join('');
    await sendMail(ctx, { category: 'system', to: req.email, subject: 'Wie zufrieden warst du mit unserem Partner?', title: 'Wie war deine Erfahrung?',
      body: `<p>Hallo ${esc(jparse(req.data, {}).Vorname || '')},</p><p>wie zufrieden warst du mit dem Partner zu deiner Anfrage <strong>#${toNumber(req.id)}</strong>? 1 = gar nicht, 5 = sehr zufrieden.</p><p style="margin:20px 0">${stars}</p>` });
    await DB.update(ctx.db, 'surveys', sv.id, { sent_at: t }); res.surveys++;
  }
  return res;
}
