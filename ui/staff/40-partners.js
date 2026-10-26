/* ===== Geschäftspartner ===== */
const PROLE = (k) => ((S.config.partnerRoles || {})[k] || {}).label || k;
async function pagePartners() {
  const P = page('partner');
  if (!can('partner_view')) return P.show(noAccess());
  const d = await GET('/orgs'); if (!P.alive()) return;
  S.orgs = d.orgs;
  const q = (hashQuery().q || '').toLowerCase();
  const list = d.orgs.filter((o) => !q || [o.name, o.city, o.zip, o.email, ...(o.brands || [])].join(' ').toLowerCase().includes(q));
  P.show(html`${head('Geschäftspartner', `${plural(d.orgs.length, 'Partner', 'Partner')} · Autohäuser und Händler, die Anfragen erhalten`, can('partner_manage') ? html`<button class="btn btn-primary" data-act="orgNew">${icon('plus')}Partner anlegen</button>` : '')}
    <section class="panel"><form class="toolbar" data-submit="orgSearch"><label class="search">${icon('search')}<input name="q" value="${hashQuery().q || ''}" placeholder="Name, Ort, PLZ, Marke …" data-input="orgSearchLive" aria-label="Suche"></label></form>
    ${list.length ? html`<div class="table-wrap"><table class="table"><thead><tr><th>Partner</th><th>Art</th><th>Ort</th><th>Marken</th><th>Abrechnung</th><th class="r">Konten</th><th class="r">Offene Anfragen</th><th>Status</th></tr></thead><tbody>
      ${list.map((o) => html`<tr class="clickable" data-act="go" data-href="#/partner/${o.id}"><td><b>${o.name}</b><span class="cell-sub">${o.email || ''}</span></td><td>${o.kind === 'einzel' ? 'Einzelpartner' : 'Organisation'}</td>
        <td>${o.zip || ''} ${o.city || ''}${o.max_radius_km ? html`<span class="cell-sub">max. ${o.max_radius_km} km</span>` : ''}</td><td>${(o.brands || []).includes('*') ? 'Alle Marken' : (o.brands || []).join(', ') || html`<span class="badge t-warn">keine</span>`}</td>
        <td>${o.billing_mode === 'monatlich' ? 'Monatlich' : 'Je Fall'}</td><td class="r">${o.users}</td><td class="r">${o.open_asg}</td><td>${o.active ? badge('Aktiv', 'ok') : badge('Inaktiv', 'muted')}${o.training_done ? html`<span class="cell-sub">Schulung ✓</span>` : ''}</td></tr>`)}</tbody></table></div>`
      : html`<div class="panel-body">${empty(q ? 'Kein Partner passt zur Suche' : 'Noch keine Geschäftspartner', q ? '' : 'Lege den ersten Partner an und lade seine Mitarbeiter ein.')}</div>`}</section>`);
}
INPUT.orgSearchLive = (el) => { history.replaceState(null, '', '#/partner' + qs({ q: el.value })); const pos = el.selectionStart; pagePartners().then(() => { const i = $('input[name=q]'); if (i) { i.focus(); i.setSelectionRange(pos, pos); } }); };
SUBMIT.orgSearch = (d) => setHashQuery({ q: d.q }, '#/partner');

function brandPicker(sel) {
  const all = sel.includes('*'); const extra = sel.filter((b) => b !== '*' && !S.config.brands.includes(b));
  return html`<div class="stack-s">${chk('brand_all', all, 'Alle Marken (Mehrmarkenhändler)')}<div class="checks">${S.config.brands.map((b) => chk('brands[]', sel.includes(b), b, b))}</div>${field('Weitere Marken (kommagetrennt)', inp('brands_extra', extra.join(', ')))}</div>`;
}
function openingEditor(op) {
  return html`<table class="table"><tbody>${S.config.weekdays.map((d) => { const v = op[d]; return html`<tr><td class="strong">${S.config.weekdayLabels[d]}</td><td>${chk('open_' + d, !!v, 'geöffnet')}</td><td><input type="time" name="from_${d}" value="${v ? v[0] : '08:00'}" aria-label="${S.config.weekdayLabels[d]} von"></td><td><input type="time" name="to_${d}" value="${v ? v[1] : '18:00'}" aria-label="${S.config.weekdayLabels[d]} bis"></td></tr>`; })}</tbody></table>
    <p class="small muted panel-body">Ist samstags geöffnet, zählt der Samstag bei Angebots- und Kontaktfristen mit. Sonntage zählen nie.</p>`;
}
function orgPayload(d) {
  const brands = d.brand_all ? ['*'] : [...(d.brands || []), ...String(d.brands_extra || '').split(',').map((x) => x.trim()).filter(Boolean)];
  const opening = {}; for (const w of S.config.weekdays) opening[w] = d['open_' + w] ? [d['from_' + w], d['to_' + w]] : null;
  const contacts = (d.c_name || []).map((n, i) => ({ name: n, role: d.c_role[i], email: d.c_email[i], phone: d.c_phone[i] })).filter((c) => c.name || c.email);
  const o = { name: d.name, kind: d.kind, street: d.street, zip: d.zip, city: d.city, phone: d.phone, email: d.email, website: d.website,
    billing_name: d.billing_name, billing_street: d.billing_street, billing_zip: d.billing_zip, billing_city: d.billing_city, billing_email: d.billing_email, vat_id: d.vat_id, tax_no: d.tax_no,
    brands, accepts: d.accepts || [], max_radius_km: d.max_radius_km, opening, contacts, active: d.active };
  if (can('partner_terms') && d.billing_mode !== undefined) Object.assign(o, { billing_mode: d.billing_mode, lead_price: d.lead_price, ...Object.fromEntries(ORG_TERM_KEYS.filter((k) => d[k] !== undefined).map((k) => [k, d[k]])) });
  return o;
}
/* Zahlungsziel und Mahnwesen je Geschäftspartner (Startwert = Standard aus den Einstellungen) */
const ORG_TERM_KEYS = ['payment_terms_days', 'reminder_due_days', 'dunning_fee_1', 'dunning_due_days', 'dunning_fee_2', 'dunning_due_days_2'];
const feeTxt = (v) => (v === null || v === undefined || v === '' ? '' : (+v).toFixed(2).replace('.', ','));
function termsFields(o, terms) {
  const dis = terms ? '' : 'disabled', days = (k, l, h) => field(l, inp(k, o[k] ?? '', { type: 'number', ph: 'Standard', attrs: `min="0" max="365" inputmode="numeric" ${dis}` }), h);
  const fee = (k, l, h) => field(l, inp(k, feeTxt(o[k]), { ph: 'Standard', attrs: `inputmode="decimal" ${dis}` }), h);
  const t = (k) => o[k] ?? '–', f = (k) => (o[k] != null ? feeTxt(o[k]) + ' €' : '–');
  return html`${days('payment_terms_days', 'Zahlungsziel (Tage)', 'ab Rechnungsdatum')}${days('reminder_due_days', 'Frist Zahlungserinnerung (Tage)', 'Erinnerung ist kostenlos')}
    ${fee('dunning_fee_1', 'Mahngebühr 1. Mahnung (Stufe 1, €)')}${days('dunning_due_days', 'Frist 1. Mahnung (Tage)')}
    ${fee('dunning_fee_2', 'Mahngebühr 2. Mahnung (Stufe 2, €)')}${days('dunning_due_days_2', 'Frist 2. Mahnung (Tage)', 'letzte Mahnung')}
    <p class="small muted span-2">Ablauf: Rechnung → nach ${t('payment_terms_days')} Tagen fällig → kostenlose Zahlungserinnerung (Frist ${t('reminder_due_days')} Tage) → 1. Mahnung + ${f('dunning_fee_1')} (Frist ${t('dunning_due_days')} Tage) → 2. Mahnung + ${f('dunning_fee_2')} (Frist ${t('dunning_due_days_2')} Tage) → Inkasso / gerichtliches Mahnverfahren.</p>`;
}
ACT.orgNew = async () => {
  modal({ title: 'Geschäftspartner anlegen', wide: true, body: html`<form class="stack" data-submit="orgCreate" id="orgNewForm">
    <div class="seg" role="radiogroup" aria-label="Art"><label><input type="radio" name="kind" value="organisation" checked><span>Organisation (mehrere Konten)</span></label><label><input type="radio" name="kind" value="einzel"><span>Einzelpartner</span></label></div>
    <div class="grid-2">${field('Firmenname', inp('name', '', { req: true }))}${field('E-Mail', inp('email', '', { type: 'email', req: true }))}${field('Straße', inp('street'))}<div class="grid-2">${field('PLZ', inp('zip', '', { req: true, attrs: 'pattern="[0-9]{5}"' }))}${field('Ort', inp('city'))}</div>
      ${field('Telefon', inp('phone'))}${field('Rechnungs-E-Mail', inp('billing_email', '', { type: 'email' }), 'Leer = allgemeine E-Mail')}${field('USt-IdNr.', inp('vat_id'))}
      ${can('partner_terms') ? field('Abrechnung', sel('billing_mode', [['einzel', 'Jeder Fall einzeln'], ['monatlich', 'Monatliche Sammelrechnung']], 'einzel')) : ''}</div>
    <fieldset><legend>Marken</legend>${brandPicker([])}</fieldset>
    <div class="checks">${chk('accepts[]', true, 'Traumwagen-DEAL (Kauf, Leasing, Finanzierung)', 'deal')}${chk('accepts[]', true, 'Fahrzeugankauf', 'sell')}</div>
    <fieldset><legend>Zugang zum Partner-Dashboard</legend><p class="small muted">Optional: Lege gleich das erste Konto an. Die Person bekommt den Einladungslink per E-Mail und legt ihr Passwort selbst fest. Weitere Konten (bei Organisationen) legst du danach beim Partner an.</p>
      <div class="grid-2 mt">${field('Name der Person', inp('u_name', '', { ph: 'z. B. Max Händler' }))}${field('E-Mail für den Zugang', inp('u_email', '', { type: 'email', ph: 'leer = kein Konto anlegen' }))}
      ${field('Rolle', sel('u_role', Object.entries(S.config.partnerRoles).map(([k, r]) => [k, r.label]), 'gf'))}${field('Telefon', inp('u_phone'))}</div>
      ${chk('u_invite', true, 'Einladungslink sofort per E-Mail senden')}</fieldset></form>`,
    foot: html`<button class="btn btn-ghost" data-close>Abbrechen</button><button class="btn btn-primary" type="submit" form="orgNewForm">Anlegen</button>` });
};
SUBMIT.orgCreate = async (d) => {
  const brands = d.brand_all ? ['*'] : [...(d.brands || []), ...String(d.brands_extra || '').split(',').map((x) => x.trim()).filter(Boolean)];
  const r = await POST('/orgs', { name: d.name, kind: d.kind, email: d.email, street: d.street, zip: d.zip, city: d.city, phone: d.phone, billing_email: d.billing_email, vat_id: d.vat_id, brands, accepts: d.accepts, ...(can('partner_terms') ? { billing_mode: d.billing_mode } : {}) });
  closeModal();
  if (d.u_email) {
    const pu = await POST(`/orgs/${r.id}/users`, { name: d.u_name || d.u_email.split('@')[0], email: d.u_email, role: d.u_role, phone: d.u_phone });
    if (d.u_invite) {
      const inv = await POST(`/orgs/${r.id}/users/${pu.id}/invite`);
      if (inv.mail === 'gesendet') toast(`Partner angelegt – Einladung an ${d.u_email} versendet.`);
      else { toast('Partner und Konto angelegt, die Einladung ging aber nicht per E-Mail raus.', 'err'); showLink('Einladung nicht versendet', inv.link, mailWhy(inv)); }
    } else toast('Partner und Konto angelegt. Die Einladung kannst du beim Konto senden.');
  } else toast('Partner angelegt. Lege jetzt die Konten an und verschicke die Einladungen.');
  location.hash = '#/partner/' + r.id;
};

let ORG = null;
async function pagePartner(id) {
  const P = page('partner');
  if (!can('partner_view')) return P.show(noAccess());
  const d = await GET('/orgs/' + id); if (!P.alive()) return;
  ORG = d;
  const o = d.org, mng = can('partner_manage'), terms = can('partner_terms'), dis = mng ? '' : 'disabled';
  const st = d.stats;
  P.show(html`${head(o.name, html`${o.kind === 'einzel' ? 'Einzelpartner' : 'Organisation'} · Kundennummer P-${String(o.id).padStart(5, '0')} · seit ${fDate(o.created_at)}`,
      html`${o.active ? badge('Aktiv', 'ok') : badge('Inaktiv', 'muted')}${can('news_partner') ? html`<button class="btn btn-sm" data-act="orgMessage">${icon('send')}Nachricht senden</button>` : ''}`, ['#/partner', 'Alle Partner'])}
    ${st ? html`<div class="kpis"><div class="kpi"><b>${fNum(st.received)}</b><span>Anfragen erhalten (12 Mon.)</span></div><div class="kpi"><b>${fPct(st.offer_rate)}</b><span>Angebotsquote</span></div>
      <div class="kpi"><b>${fNum(st.won)}</b><span>Zusagen</span></div><div class="kpi"><b>${fNum(st.lost + st.closed)}</b><span>Absagen / verloren</span></div><div class="kpi"><b>${st.avg_hours != null ? fNum(st.avg_hours, 1) + ' h' : '–'}</b><span>Ø Zeit bis Angebot</span></div>
      <div class="kpi"><b>${st.rating != null ? fNum(st.rating, 1) + ' ★' : '–'}</b><span>Kundenumfrage (${st.ratings})</span></div><div class="kpi"><b>${st.users_active}/${st.users_active + st.users_inactive}</b><span>aktive Konten</span></div><div class="kpi"><b>${st.support_reply_h != null ? fNum(st.support_reply_h, 1) + ' h' : '–'}</b><span>Reaktion auf Support</span></div></div>` : ''}
    <div class="detail-grid mt"><form class="stack" data-submit="orgSave">
      <section class="panel"><div class="panel-head"><h2>Stammdaten</h2>${mng ? html`<button class="btn btn-sm btn-dark" type="submit">Speichern</button>` : ''}</div><div class="panel-body stack">
        <div class="grid-2">${field('Firmenname', inp('name', o.name, { req: true, attrs: dis }))}${field('Art', sel('kind', [['organisation', 'Organisation'], ['einzel', 'Einzelpartner']], o.kind, { attrs: dis }))}
          ${field('Straße', inp('street', o.street, { attrs: dis }))}<div class="grid-2">${field('PLZ', inp('zip', o.zip, { attrs: dis }))}${field('Ort', inp('city', o.city, { attrs: dis }))}</div>
          ${field('E-Mail', inp('email', o.email, { type: 'email', attrs: dis }))}${field('Telefon', inp('phone', o.phone, { attrs: dis }))}${field('Webseite', inp('website', o.website, { attrs: dis }))}</div>
        ${chk('active', !!o.active, 'Aktiv – erhält Anfragen und kann sich anmelden')}</div></section>
      <section class="panel"><div class="panel-head"><h2>Rechnung</h2></div><div class="panel-body grid-2">
        ${field('Rechnungsempfänger', inp('billing_name', o.billing_name, { ph: o.name, attrs: dis }))}${field('Rechnungs-E-Mail', inp('billing_email', o.billing_email, { type: 'email', ph: o.email, attrs: dis }))}
        ${field('Straße', inp('billing_street', o.billing_street, { ph: o.street, attrs: dis }))}<div class="grid-2">${field('PLZ', inp('billing_zip', o.billing_zip, { ph: o.zip, attrs: dis }))}${field('Ort', inp('billing_city', o.billing_city, { ph: o.city, attrs: dis }))}</div>
        ${field('USt-IdNr.', inp('vat_id', o.vat_id, { attrs: dis }))}${field('Steuernummer', inp('tax_no', o.tax_no, { attrs: dis }))}</div></section>
      <section class="panel"><div class="panel-head"><h2>Konditionen</h2>${terms ? '' : html`<span class="small muted">${icon('lock')} nur Geschäftsführung und Admin</span>`}</div><div class="panel-body grid-2">
        ${field('Abrechnung', sel('billing_mode', [['einzel', 'Jeder Fall einzeln'], ['monatlich', 'Monatliche Sammelrechnung']], o.billing_mode, { attrs: terms ? '' : 'disabled' }))}
        ${field('Preis je Vermittlung (netto)', inp('lead_price', o.lead_price ?? '', { ph: 'Standard laut Einstellungen', attrs: terms ? '' : 'disabled' }))}
        ${termsFields(o, terms)}</div></section>
      <section class="panel"><div class="panel-head"><h2>Anfragen</h2></div><div class="panel-body stack">
        <div class="checks">${chk('accepts[]', o.accepts.includes('deal'), 'Traumwagen-DEAL', 'deal')}${chk('accepts[]', o.accepts.includes('sell'), 'Fahrzeugankauf', 'sell')}</div>
        ${field('Maximaler Umkreis (km)', inp('max_radius_km', o.max_radius_km ?? '', { type: 'number', ph: 'ohne Begrenzung', attrs: dis }), 'Der Kunde wählt seinen Umkreis selbst; hier kann der Partner zusätzlich begrenzt werden.')}
        <h3>Marken</h3>${brandPicker(o.brands)}</div></section>
      <section class="panel"><div class="panel-head"><h2>Öffnungszeiten</h2></div><div class="panel-body tight">${openingEditor(o.opening)}</div></section>
      <section class="panel"><div class="panel-head"><h2>Ansprechpartner ohne Konto</h2>${mng ? html`<button class="btn btn-sm" type="button" data-act="addContact">${icon('plus')}Hinzufügen</button>` : ''}</div><div class="panel-body tight">
        <table class="table lines-table"><thead><tr><th>Funktion</th><th>Name</th><th>E-Mail</th><th>Telefon</th></tr></thead><tbody id="contacts">${(o.contacts.length ? o.contacts : [{}]).map(contactRow)}</tbody></table></div></section>
      ${mng ? html`<div class="row"><button class="btn btn-primary" type="submit">Alle Änderungen speichern</button></div>` : ''}
    </form>
    <div class="stack">
      <section class="panel"><div class="panel-head"><h2>Konten <span class="count">${d.users.length}</span></h2>${mng ? html`<button class="btn btn-sm btn-dark" data-act="puNew">${icon('plus')}Konto anlegen</button>` : ''}</div>
        ${d.users.length ? d.users.map(puRow) : html`<div class="panel-body">${empty('Noch keine Konten', 'Lege für jeden Mitarbeiter des Partners ein Konto an.')}</div>`}</section>
      <section class="panel"><div class="panel-body row-between"><div><b>Erstschulung</b><div class="small muted">${o.training_done ? `teilgenommen am ${fDate(o.training_at)}` : 'noch nicht teilgenommen'}</div></div>
        ${mng ? html`<label class="check"><input type="checkbox" data-change="orgTraining" ${o.training_done ? raw('checked') : ''}><span>Teilgenommen</span></label>` : ''}</div></section>
      ${d.invoices.length ? html`<section class="panel"><div class="panel-head"><h2>Rechnungen</h2></div><div class="table-wrap"><table class="table"><tbody>${d.invoices.map((i) => html`<tr class="clickable" data-act="openInvoice" data-id="${i.id}"><td class="num strong">${i.number}<span class="cell-sub">${fDate(i.issue_date)}</span></td><td class="r num">${fEur(i.gross + i.fees)}</td><td>${st2(i)}</td></tr>`)}</tbody></table></div></section>` : ''}
      <section class="panel"><div class="panel-head"><h2>Letzte Anfragen</h2></div>${d.assignments.length ? html`<div class="table-wrap"><table class="table"><tbody>${d.assignments.map((a) => html`<tr class="clickable" data-act="go" data-href="#/anfragen/${a.number}"><td class="num strong">#${a.number}<span class="cell-sub">${fDate(a.created_at)}</span></td><td>${a.vehicle || ''}</td><td>${statusBadge(AS(), a.status)}</td></tr>`)}</tbody></table></div>` : html`<div class="panel-body">${empty('Noch keine Anfragen')}</div>`}</section>
      ${isAdmin() ? html`<section class="panel"><div class="panel-head"><h2>Admin-Notizen</h2><span class="small muted">nur für Admins sichtbar</span></div><div class="panel-body stack">
        <form class="stack-s" data-submit="orgNote">${area('text', '', { rows: 2, req: true })}<button class="btn btn-sm" type="submit">Notiz speichern</button></form>
        <ul class="timeline">${d.notes.map((n) => html`<li><div><div class="tl-meta">${n.author || 'System'} · ${fDT(n.created_at)}</div><div class="pre">${n.text}</div></div></li>`)}</ul></div></section>` : ''}
      ${can('partner_delete') ? html`<section class="panel"><div class="panel-body row-between"><span class="small muted">Organisation mit allen Konten löschen.</span><button class="btn btn-sm btn-danger" data-act="orgDelete">${icon('trash')}Löschen</button></div></section>` : ''}
    </div></div>`);
}
const st2 = (i) => { const live = ['offen', 'teilbezahlt'].includes(i.status); return html`${st(INV_STATUS, i.status)}${live && i.due_date < todayISO() ? html` ${badge('überfällig', 'err')}` : ''}`; };
const contactRow = (c = {}) => html`<tr><td><input name="c_role[]" value="${c.role || ''}" placeholder="z. B. Buchhaltung"></td><td><input name="c_name[]" value="${c.name || ''}"></td><td><input name="c_email[]" value="${c.email || ''}" type="email"></td><td><input name="c_phone[]" value="${c.phone || ''}"></td></tr>`;
ACT.addContact = () => $('#contacts').insertAdjacentHTML('beforeend', part(contactRow()));
function puRow(u) {
  const locked = u.locked_until && u.locked_until > '9000';
  const state = !u.active ? badge('Deaktiviert', 'muted') : locked ? badge('Gesperrt', 'err') : u.pending ? badge('Einladung offen', 'warn') : badge('Aktiv', 'ok');
  return html`<div class="asg"><div class="asg-head"><div><b>${u.name}</b> <span class="tag">${PROLE(u.role)}</span><div class="asg-meta">${u.email}${u.phone ? ' · ' + u.phone : ''}</div>
      <div class="asg-meta">AGB ${u.agb_at ? '✓ ' + fDate(u.agb_at) : '✗'} · Datenschutz ${u.privacy_at ? '✓ ' + fDate(u.privacy_at) : '✗'} · ${u.last_login ? 'zuletzt angemeldet ' + fDT(u.last_login) : 'noch nie angemeldet'}</div></div>${state}</div>
    ${can('partner_manage') ? html`<div class="row">${u.pending ? html`<button class="btn btn-sm" data-act="puInvite" data-id="${u.id}">${icon('mail')}Einladung senden</button>` : ''}
      ${can('partner_pw') && !u.pending ? html`<button class="btn btn-sm" data-act="puReset" data-id="${u.id}">${icon('key')}Passwort zurücksetzen</button>` : ''}
      <button class="btn btn-sm btn-ghost" data-act="puEdit" data-id="${u.id}">Bearbeiten</button>
      ${can('partner_delete') ? html`<button class="btn btn-sm btn-ghost" data-act="puLock" data-id="${u.id}" data-locked="${locked ? 1 : 0}">${locked ? 'Entsperren' : 'Sperren'}</button><button class="btn btn-sm btn-ghost" data-act="puDelete" data-id="${u.id}">Löschen</button>` : ''}</div>` : ''}</div>`;
}
const oid = () => ORG.org.id;
SUBMIT.orgSave = async (d) => { await PATCH('/orgs/' + oid(), orgPayload(d)); toast('Partner gespeichert.'); reload(); };
CHANGE.orgTraining = async (el) => { await POST(`/orgs/${oid()}/training`, { done: el.checked }); toast(el.checked ? 'Schulung als erledigt markiert.' : 'Schulung zurückgesetzt.'); reload(); };
SUBMIT.orgNote = async (d) => { await POST(`/orgs/${oid()}/notes`, d); reload(); };
ACT.orgDelete = async () => { if (!(await ask({ title: `${ORG.org.name} löschen?`, text: 'Alle Konten werden deaktiviert und abgemeldet. Bisherige Rechnungen bleiben erhalten.', ok: 'Endgültig löschen', danger: true }))) return; await DEL('/orgs/' + oid()); toast('Partner gelöscht.'); location.hash = '#/partner'; };
ACT.orgMessage = async () => {
  const d = await ask({ title: `Nachricht an ${ORG.org.name}`, text: 'Erscheint bei allen Konten dieser Organisation in den News.', ok: 'Senden', fields: html`${field('Titel', inp('title', '', { req: true }))}${field('Nachricht', area('body', '', { rows: 5 }))}${chk('mail', true, 'Zusätzlich per E-Mail senden')}` });
  if (!d) return; await POST('/news', { scope: 'partner', title: d.title, body: d.body, mail: d.mail, audience: { type: 'orgs', values: [oid()] } }); toast('Nachricht gesendet.');
};
ACT.puNew = async () => {
  const d = await ask({ title: 'Konto anlegen', text: 'Danach kannst du die Einladung senden. Der Partner legt sein Passwort selbst fest und bestätigt AGB und Datenschutz.', ok: 'Anlegen und Einladung senden',
    fields: html`${field('Name', inp('name', '', { req: true }))}${field('E-Mail', inp('email', '', { type: 'email', req: true }))}${field('Telefon', inp('phone'))}${field('Rolle', sel('role', Object.entries(S.config.partnerRoles).map(([k, r]) => [k, r.label]), ORG.org.kind === 'einzel' ? 'gf' : 'vt'))}` });
  if (!d) return; delete d._form;
  const r = await POST(`/orgs/${oid()}/users`, d);
  const inv = await POST(`/orgs/${oid()}/users/${r.id}/invite`);
  toast(inv.mail === 'gesendet' ? 'Konto angelegt, Einladung versendet.' : 'Konto angelegt. E-Mail-Dienst nicht eingerichtet – Link kopieren.', inv.mail === 'gesendet' ? 'ok' : 'err');
  if (inv.mail !== 'gesendet') showLink('Einladungslink', inv.link);
  reload();
};
// Grund, warum eine Einladung nicht per E-Mail rausging
const mailWhy = (r) => (r && r.mail === 'nicht_konfiguriert') || !S.mailReady ? 'Der E-Mail-Versand ist noch nicht eingerichtet: Im Worker fehlt der Postfach-Zugang (Secrets SMTP_USER und SMTP_PASS für noreplay@kfl-group.com).' : r && r.mail === 'fehler' ? 'Der Mailserver hat den Versand abgelehnt – Details unter Verwaltung → Postausgang.' : 'Die E-Mail konnte nicht versendet werden.';
function showLink(title, link, why) { modal({ title, body: html`${why ? html`<div class="err-box">${icon('alert')}<span>${why}${can('settings_all') ? html` <a class="link" href="#/verwaltung/einstellungen" data-close>Zur Einrichtung</a>` : ''}</span></div>` : ''}<p class="small muted mt">Bis dahin kannst du den Link persönlich weitergeben. Er ist 7 Tage gültig. Nach der Einrichtung einfach erneut „Einladung senden“ klicken.</p><div class="row mt"><input value="${link}" readonly aria-label="Link"><button class="btn" data-act="copy" data-text="${link}">Kopieren</button></div>` }); }
ACT.puInvite = async (b) => { const u = ORG.users.find((x) => x.id === +b.dataset.id); const r = await POST(`/orgs/${oid()}/users/${b.dataset.id}/invite`); if (r.mail === 'gesendet') return toast(`Einladung an ${u ? u.email : 'den Partner'} versendet.`); toast('Einladung erstellt, aber nicht per E-Mail versendet.', 'err'); showLink('Einladung nicht versendet', r.link, mailWhy(r)); };
ACT.puReset = async (b) => {
  const u = ORG.users.find((x) => x.id === +b.dataset.id);
  const d = await ask({ title: `Passwort von ${u.name} zurücksetzen`, ok: 'Senden', fields: html`<div class="stack-s">
      <label class="check"><input type="radio" name="mode" value="link" checked><span><b>Link senden</b> – der Partner legt selbst ein neues Passwort fest.</span></label>
      <label class="check"><input type="radio" name="mode" value="temp"><span><b>Standardpasswort</b> – du legst ein vorläufiges Passwort fest, das per E-Mail verschickt wird. Der Partner muss es bei der Anmeldung ändern.</span></label></div>
    ${field('Vorläufiges Passwort (nur bei Standardpasswort)', inp('password', '', { attrs: 'minlength="10" autocomplete="off"' }), PW_HINT)}` });
  if (!d) return;
  if (d.mode === 'temp' && !d.password) throw new Error('Bitte lege das vorläufige Passwort fest.');
  const r = await POST(`/orgs/${oid()}/users/${u.id}/reset`, { mode: d.mode, password: d.password });
  toast(r.mail === 'gesendet' ? 'Per E-Mail versendet.' : 'Gespeichert, aber E-Mail nicht versendet.', r.mail === 'gesendet' ? 'ok' : 'err');
};
ACT.puEdit = async (b) => {
  const u = ORG.users.find((x) => x.id === +b.dataset.id);
  const d = await ask({ title: 'Konto bearbeiten', ok: 'Speichern', fields: html`${field('Name', inp('name', u.name, { req: true }))}${field('Telefon', inp('phone', u.phone))}${field('Rolle', sel('role', Object.entries(S.config.partnerRoles).map(([k, r]) => [k, r.label]), u.role))}${chk('active', !!u.active, 'Konto aktiv')}` });
  if (!d) return; delete d._form; await PATCH(`/orgs/${oid()}/users/${u.id}`, d); toast('Gespeichert.'); reload();
};
ACT.puLock = async (b) => { const lock = b.dataset.locked !== '1'; if (lock && !(await confirmBox('Konto sperren?', 'Der Partner wird sofort abgemeldet und kann sich nicht mehr anmelden.', 'Sperren', true))) return; await PATCH(`/orgs/${oid()}/users/${b.dataset.id}`, { locked: lock }); reload(); };
ACT.puDelete = async (b) => { if (!(await confirmBox('Konto löschen?', 'Das Konto wird dauerhaft deaktiviert.', 'Löschen', true))) return; await DEL(`/orgs/${oid()}/users/${b.dataset.id}`); reload(); };
