/* ============================================================
   Öffentliche Schnittstellen: Formular-Eingang der Webseite,
   Kundenbereich „Meine Anfragen“ (/my/…), Kunden-Links (/c/…)
   ============================================================ */

const FORM_ORIGINS = ['https://kfl-group.com', 'https://www.kfl-group.com', 'https://3r1qns-2d.myshopify.com'];
const MAX_FORM_AGE = 7 * 24 * 3600;
function formCors(origin) {
  const allowed = FORM_ORIGINS.includes(origin) ? origin : FORM_ORIGINS[0];
  return { 'Access-Control-Allow-Origin': allowed, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400', 'Vary': 'Origin' };
}
const cjson = (obj, status, origin) => out(obj, status, formCors(origin));

/* ---------- Formular-Eingang (POST /) ---------- */
async function handleForm(ctx) {
  const { request, env } = ctx;
  const origin = request.headers.get('Origin') || '';
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: formCors(origin) });
  if (!FORM_ORIGINS.includes(origin)) return cjson({ ok: false, error: 'Origin not allowed' }, 403, origin);
  const data = await readJson(request);
  const form = String(data._form || '');
  if (!REQUEST_TYPES[form] && !TICKET_FORMS[form]) return cjson({ ok: false, error: 'Unbekanntes Formular' }, 400, origin);
  if (data.Firma2) return cjson({ ok: true }, 200, origin);
  const kid = String(data._kid || '0'), ts = parseInt(data._ts || '0', 10);
  if (!env.FORM_SECRET) return cjson({ ok: false, error: 'Dienst nicht konfiguriert' }, 500, origin);
  const expected = await hmacHex(env.FORM_SECRET, `${kid}.${ts}.${form}`);
  if (typeof data._sig !== 'string' || !safeEqual(data._sig, expected)) return cjson({ ok: false, error: 'Signatur ungültig' }, 403, origin);
  if (Math.abs(nowMs() / 1000 - ts) > MAX_FORM_AGE) return cjson({ ok: false, error: 'Formular abgelaufen, bitte Seite neu laden' }, 403, origin);
  if ((REQUEST_TYPES[form] || form === 'partner' || form === 'partnerdesk') && kid === '0') return cjson({ ok: false, error: 'Bitte zuerst anmelden' }, 401, origin);
  const email = String(data.email || '').trim();
  if (!emailOk(email)) return cjson({ ok: false, error: 'E-Mail-Adresse ungültig' }, 400, origin);
  for (const k of Object.keys(data)) if (typeof data[k] !== 'string') data[k] = String(data[k] ?? '');
  data['Eingang (Server)'] = fmtDE(nowMs());
  data['Kundenkonto-ID'] = kid === '0' ? '–' : kid;
  ctx.actor = { type: 'customer', id: null, name: [data.Vorname, data.name].filter(Boolean).join(' ') || email };

  if (TICKET_FORMS[form]) {
    const def = TICKET_FORMS[form];
    const text = Object.entries(data).filter(([k, v]) => !/^_|^Firma2$|^Formular$|AGB|Datenschutz|Einwilligung/.test(k) && String(v).trim()).map(([k, v]) => `${k}: ${v}`).join('\n');
    const subject = form === 'widerruf' ? `Widerruf: ${data.Vertrag || data.Bestellnummer || ''}`.trim() : (data.Thema || data.Betreff || def.category);
    const id = await createTicket(ctx, { tag: def.tag, category: def.category, subject, priority: def.priority, requester: { type: kid !== '0' ? 'customer' : 'web', name: [data.Vorname, data.name].filter(Boolean).join(' '), email }, text, ack: form !== 'widerruf' });
    if (form === 'widerruf') {
      const s = await settingsOf(ctx);
      await sendMail(ctx, { category: 'system', to: email, subject: `Eingangsbestätigung deiner Widerrufserklärung (#${id})`, title: 'Eingangsbestätigung deiner Widerrufserklärung',
        body: `<p>Hallo ${esc(data.Vorname || data.name || '')},</p><p>deine Widerrufserklärung ist am <strong>${esc(data['Eingang (Server)'])}</strong> bei uns eingegangen (Vorgang #${id}). Mit dieser E-Mail bestätigen wir ausschließlich den Eingang. Die Wirksamkeit und den Umfang des Widerrufs prüfen wir gesondert und melden uns bei dir.</p>${mailTable(Object.entries(data).filter(([k]) => !/^_|Firma2|Formular/.test(k)))}` });
    }
    return cjson({ ok: true, number: id, ticket: true, receivedAt: data['Eingang (Server)'] }, 200, origin);
  }
  const id = await createRequest(ctx, form, data, { customerAccount: kid !== '0' ? kid : null });
  try { await dispatchRequest(ctx, id); } catch (e) { console.log('Verteilung', e.stack || e.message); await DB.update(ctx.db, 'requests', id, { status: 'stoerung', status_note: 'Verteilung fehlgeschlagen: ' + e.message }); }
  // Eingangsbestätigung an den Kunden
  const s = await settingsOf(ctx);
  const link = s.link_my_requests;
  await sendMail(ctx, { category: 'system', to: email, toName: data.Vorname, subject: `Deine Anfrage #${toNumber(id)} ist bei KFL eingegangen${form === 'deal' ? ' – plus 50 % auf unsere Ratgeber' : ''}`, title: form === 'deal' ? 'Danke, deine Anfrage ist bei uns.' : 'Danke, wir bewerten dein Auto.',
    body: `<p>Hallo ${esc(data.Vorname || '')},</p><p>wir haben deine Anfrage <strong>#${toNumber(id)}</strong> erhalten und an unsere passenden Partner weitergegeben. Innerhalb von 24 Stunden an Werktagen sammeln wir die Angebote und stellen dir das beste vor – <strong>deine Kontaktdaten bleiben bis zu deiner Zusage bei uns</strong>.</p>
      ${form === 'deal' ? `<p style="background:#000;color:#fff;border-radius:12px;padding:18px 20px">Dein Dankeschön: <strong style="color:#ff6c01;font-size:20px;letter-spacing:1px">TRAUMDEAL50</strong><br><span style="color:#c7c7cc">50 % Rabatt auf die KFL Ratgeber. <a href="https://kfl-group.com/discount/TRAUMDEAL50?redirect=/collections/ratgeber" style="color:#ff6c01">Jetzt einlösen</a></span></p>` : ''}
      <p>Unter <a href="${esc(link)}" style="color:#ff6c01">Meine Anfragen</a> siehst du den Stand, kannst deine Anfrage ändern und uns Notizen schicken.</p>${mailTable(Object.entries(data).filter(([k, v]) => !HIDDEN_KEY.test(k) && String(v).trim()))}` });
  return cjson({ ok: true, number: toNumber(id), receivedAt: data['Eingang (Server)'] }, 200, origin);
}

/* ---------- Kundenbereich „Meine Anfragen“ ---------- */
const MY_HIDDEN = /^(_|form$|form_type$|utf8$|Firma2$|Formular$|Kundennummer$|Eingang \(Server\)$|Kundenkonto-ID$|Geändert \(Server\)$|Einwilligung|AGB akzeptiert|Datenschutz akzeptiert|Weitergabe an Partner)/;
const MY_STATUS = {
  eingang: ['Eingegangen', 'open'], in_bearbeitung: ['In Bearbeitung', 'progress'], versendet: ['Angebote werden eingeholt', 'progress'], angebot_liegt_vor: ['Angebote werden eingeholt', 'progress'],
  angebot_in_bearbeitung: ['Angebote werden geprüft', 'progress'], angebot_beim_kunden: ['Angebot liegt vor', 'offer'], angebot_akzeptiert: ['Angebot angenommen', 'done'],
  kontaktdaten_versendet: ['Partner meldet sich bei dir', 'done'], angebot_abgelehnt: ['Abgeschlossen', 'done'], kein_angebot: ['Wir melden uns persönlich', 'progress'],
  fehler: ['In Bearbeitung', 'progress'], stoerung: ['In Bearbeitung', 'progress']
};
async function myView(ctx, r) {
  const d = jparse(r.data, {});
  const fields = {}; for (const [k, v] of Object.entries(d)) if (!MY_HIDDEN.test(k)) fields[k] = v;
  const st = MY_STATUS[r.status] || ['In Bearbeitung', 'progress'];
  const offers = await DB.val(ctx.db, "SELECT COUNT(*) FROM offers WHERE request_id = ?", r.id);
  return { id: toNumber(r.id), number: toNumber(r.id), form: r.type, created_at: r.created_at, updated_at: r.updated_at, status: r.status, status_label: st[0], tone: st[1],
    editable: CUSTOMER_EDITABLE.includes(r.status) && !offers, fields, offers: ['angebot_beim_kunden', 'angebot_akzeptiert', 'kontaktdaten_versendet', 'angebot_abgelehnt'].includes(r.status) ? await customerOffers(ctx, r) : [] };
}
async function handleMy(ctx, url) {
  const { request, env } = ctx;
  const origin = request.headers.get('Origin') || '';
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: formCors(origin) });
  if (!FORM_ORIGINS.includes(origin)) return cjson({ ok: false, error: 'Origin not allowed' }, 403, origin);
  if (request.method !== 'POST') return cjson({ ok: false, error: 'Nicht erlaubt' }, 405, origin);
  if (!env.FORM_SECRET) return cjson({ ok: false, error: 'Dienst nicht konfiguriert' }, 500, origin);
  const b = await readJson(request, 12_000_000);
  const v = await verifyCustomerToken(env, b, 'my');
  if (v.error) return cjson({ ok: false, error: v.error }, v.status, origin);
  const kid = v.kid;
  ctx.actor = { type: 'customer', id: null, name: 'Kunde ' + kid };
  const path = url.pathname.replace(/^\/my/, '').replace(/\/+$/, '');
  if (path === '/requests') {
    let sql = "SELECT * FROM requests WHERE customer_account = ? AND deleted = 0", args = [kid];
    if (b.id !== undefined && b.id !== null && b.id !== '') { const id = fromNumber(b.id); if (!(id > 0)) return cjson({ ok: true, requests: [] }, 200, origin); sql += ' AND id = ?'; args.push(id); }
    const rows = await DB.all(ctx.db, sql + ' ORDER BY id DESC LIMIT 100', ...args);
    const list = []; for (const r of rows) list.push(await myView(ctx, r));
    return cjson({ ok: true, requests: list }, 200, origin);
  }
  const m = path.match(/^\/requests\/(\d{1,12})\/(note|update|accept|decline|file)$/);
  if (!m) return cjson({ ok: false, error: 'Nicht gefunden' }, 404, origin);
  const id = fromNumber(m[1]);
  const r = id > 0 ? await DB.one(ctx.db, 'SELECT * FROM requests WHERE id = ? AND customer_account = ? AND deleted = 0', id, kid) : null;
  if (!r) return cjson({ ok: false, error: 'Anfrage nicht gefunden' }, 404, origin);
  const data = jparse(r.data, {});
  ctx.actor = { type: 'customer', id: null, name: [data.Vorname, data.name].filter(Boolean).join(' ') || 'Kunde' };

  if (m[2] === 'note') {
    const text = String(b.text ?? '').replace(/\r\n?/g, '\n').trim().slice(0, 2000);
    if (text.length < 2) return cjson({ ok: false, error: 'Bitte einen Text eingeben' }, 400, origin);
    const prev = String(data.body ?? '').trim();
    data.body = ((prev ? prev + '\n\n' : '') + `[${fmtDE(nowMs()).replace(' Uhr', '')} · Notiz vom Kunden]\n${text}`).slice(-20000);
    await DB.update(ctx.db, 'requests', id, { data: JSON.stringify(data), customer_note_at: nowIso(), customer_note_unread: 1, updated_at: nowIso() });
    await reqEvent(ctx, id, 'kundennotiz', text);
    await notifyStaff(ctx, r.assignee_id ? { userIds: [r.assignee_id] } : { perm: 'req_edit' }, { kind: 'kundennotiz', title: `Neue Notiz vom Kunden zu #${toNumber(id)}`, body: text.slice(0, 300), link: `#/anfragen/${toNumber(id)}` });
    for (const a of await DB.all(ctx.db, "SELECT * FROM assignments WHERE request_id = ? AND status IN ('in_bearbeitung','versendet','vorgestellt','gewonnen')", id)) {
      await partnerEvent(ctx, { assignmentId: a.id, requestId: id, orgId: a.org_id, action: 'kundennotiz', text: 'Ergänzung des Kunden: ' + text, visiblePartner: true });
      await notifyPartner(ctx, a.taken_by ? { userIds: [a.taken_by] } : { orgId: a.org_id }, { kind: 'info', title: `Ergänzung des Kunden zu #${toNumber(id)}`, body: text.slice(0, 300), link: `#/anfragen/${a.id}` });
    }
    return cjson({ ok: true, body: data.body }, 200, origin);
  }
  if (m[2] === 'update') {
    const offers = await DB.val(ctx.db, 'SELECT COUNT(*) FROM offers WHERE request_id = ?', id);
    if (!CUSTOMER_EDITABLE.includes(r.status) || offers) return cjson({ ok: false, error: 'Diese Anfrage kann nicht mehr geändert werden' }, 409, origin);
    if (String(b._form || '') !== r.type) return cjson({ ok: false, error: 'Falsches Formular' }, 400, origin);
    if (!emailOk(b.email)) return cjson({ ok: false, error: 'E-Mail-Adresse ungültig' }, 400, origin);
    const next = {};
    for (const [k, val] of Object.entries(b)) { if (/^(_sig|_ts|_edit|Firma2)$/.test(k) || k === 'Eingang (Server)' || k === 'Kundenkonto-ID') continue; next[k] = String(val ?? '').slice(0, k === 'body' ? 20000 : 4000); }
    next._kid = kid; next._form = r.type; next['Eingang (Server)'] = data['Eingang (Server)']; next['Kundenkonto-ID'] = kid; next['Geändert (Server)'] = fmtDE(nowMs());
    const changed = uniq([...Object.keys(data), ...Object.keys(next)]).filter((k) => !MY_HIDDEN.test(k) && String(data[k] ?? '') !== String(next[k] ?? ''));
    const s = await settingsOf(ctx);
    const c = requestColumns(r.type, next);
    await DB.update(ctx.db, 'requests', id, { customer_name: c.customer_name, email: c.email, phone: c.phone, brand: c.brand, model: c.model, vehicle: c.vehicle, summary: c.summary, zustand: c.zustand,
      pay_kind: c.pay_kind, budget: c.budget, plz: c.plz, city: c.city, radius_km: parseRadius(next.Umkreis, s), data: JSON.stringify(next), updated_at: nowIso() });
    await reqEvent(ctx, id, 'vom_kunden_geändert', changed.length ? 'Geändert: ' + changed.join(', ') : 'Ohne Änderung gespeichert');
    await audit(ctx, 'anfrage_kunde_geaendert', 'anfrage', toNumber(id), { felder: changed });
    for (const a of await DB.all(ctx.db, "SELECT * FROM assignments WHERE request_id = ? AND status IN ('neu','in_bearbeitung')", id)) {
      await partnerEvent(ctx, { assignmentId: a.id, requestId: id, orgId: a.org_id, action: 'aktualisiert', text: 'Der Kunde hat die Anfrage aktualisiert: ' + changed.join(', '), visiblePartner: true });
      await notifyPartner(ctx, a.taken_by ? { userIds: [a.taken_by] } : { orgId: a.org_id }, { kind: 'info', title: `Anfrage #${toNumber(id)} wurde aktualisiert`, body: 'Geändert: ' + changed.join(', '), link: `#/anfragen/${a.id}` });
    }
    // Bei geänderter Marke/PLZ/Umkreis: neu verteilen (nur zusätzliche Partner)
    if (changed.some((k) => ['Marke', 'Marke (Freitext)', 'PLZ', 'Umkreis'].includes(k))) await dispatchRequest(ctx, id);
    return cjson({ ok: true, number: toNumber(id) }, 200, origin);
  }
  if (m[2] === 'accept') { await acceptOffer(ctx, r, toInt(b.offer_id)); return cjson({ ok: true }, 200, origin); }
  if (m[2] === 'decline') { await declineOffers(ctx, r, str(b.reason, 500)); return cjson({ ok: true }, 200, origin); }
  if (m[2] === 'file') {
    const o = await DB.one(ctx.db, "SELECT * FROM offers WHERE id = ? AND request_id = ? AND status IN ('vorgestellt','angenommen')", toInt(b.offer_id), id);
    const fid = o && (b.which === 'expose' ? o.public_expose_id : o.public_file_id);
    if (!fid) return cjson({ ok: false, error: 'Keine Datei verfügbar' }, 404, origin);
    const f = await getFile(ctx, fid);
    return cjson({ ok: true, name: f.meta.name, base64: b64(f.bytes) }, 200, origin);
  }
  return cjson({ ok: false, error: 'Nicht gefunden' }, 404, origin);
}

/* ---------- Kunden-Links aus E-Mails ---------- */
function simplePage(title, text, ok = true) {
  return new Response(`<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title>
<style>body{margin:0;font:17px/1.55 "Helvetica Neue",Helvetica,Arial,sans-serif;background:#f4f4f4;color:#1a1a1a;display:grid;place-items:center;min-height:100vh;padding:20px;box-sizing:border-box}
.c{background:#fff;border-radius:24px;max-width:520px;width:100%;padding:36px;box-shadow:0 20px 60px rgba(0,0,0,.08)}.i{width:56px;height:56px;border-radius:50%;background:${ok ? '#ff6c01' : '#c4291c'};display:grid;place-items:center;color:#000;font-size:26px;font-weight:700}
h1{font-size:28px;letter-spacing:-.02em;margin:18px 0 8px}p{color:#6b6b70;margin:0 0 18px}a{display:inline-block;background:#000;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:999px}</style></head>
<body><div class="c"><div class="i">${ok ? '✓' : '!'}</div><h1>${esc(title)}</h1><p>${esc(text)}</p><a href="https://kfl-group.com">Zu kfl-group.com</a></div></body></html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', ...SEC_HEADERS } });
}
async function handleCustomerLinks(ctx, url) {
  if (url.pathname === '/c/feedback') {
    const rid = fromNumber(url.searchParams.get('r') || ''), a = url.searchParams.get('a');
    if (!(rid > 0) || !['ja', 'nein'].includes(a) || url.searchParams.get('t') !== await linkToken(ctx.env, 'fb', rid)) return simplePage('Link ungültig', 'Dieser Link ist leider nicht (mehr) gültig.', false);
    ctx.actor = { type: 'customer', name: 'Kunde' };
    await customerFeedback(ctx, rid, a);
    return simplePage('Danke für deine Rückmeldung!', a === 'ja' ? 'Schön, dass sich der Partner gemeldet hat. Wir wünschen dir viel Freude mit deinem Fahrzeug!' : 'Das tut uns leid. Unser Team kümmert sich sofort darum und meldet sich bei dir.');
  }
  if (url.pathname === '/c/survey') {
    const sid = toInt(url.searchParams.get('s')), rating = toInt(url.searchParams.get('r'));
    if (!sid || rating < 1 || rating > 5 || url.searchParams.get('t') !== await linkToken(ctx.env, 'sv', sid)) return simplePage('Link ungültig', 'Dieser Link ist leider nicht (mehr) gültig.', false);
    const sv = await DB.one(ctx.db, 'SELECT * FROM surveys WHERE id = ?', sid);
    if (!sv) return simplePage('Link ungültig', 'Diese Umfrage gibt es nicht mehr.', false);
    if (!sv.answered_at) {
      await DB.update(ctx.db, 'surveys', sid, { rating, answered_at: nowIso() });
      ctx.actor = { type: 'customer', name: 'Kunde' };
      await reqEvent(ctx, sv.request_id, 'bewertung', `Kunde bewertet den Partner mit ${rating} von 5`);
    }
    return simplePage('Vielen Dank!', `Du hast ${rating} von 5 Punkten vergeben. Dein Feedback hilft uns, dir immer die besten Partner zu vermitteln.`);
  }
  return new Response('Nicht gefunden', { status: 404 });
}
