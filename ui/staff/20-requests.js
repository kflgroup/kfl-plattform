/* ===== Anfragen: Liste und Detail ===== */
ACT.go = (el) => { location.hash = el.dataset.href; };
const REQ_VIEWS = [['aktiv', 'Aktiv'], ['alle', 'Alle'], ['archiv', 'Abgeschlossen'], ['kopien', 'In Rechnung gestellt'], ['spam', 'Spam']];

async function pageRequests() {
  const P = page('anfragen');
  if (!can('req_view')) return P.show(noAccess());
  const q = hashQuery(); q.view = q.view || 'aktiv';
  let users = [];
  const [d] = await Promise.all([GET('/requests', q), can('req_assign') ? GET('/directory').then((r) => { users = r.users; }).catch(() => {}) : null]);
  if (!P.alive()) return;
  const sortBtn = (key, label) => html`<button data-act="reqSort" data-key="${key}" class="${q.sort === key ? 'sort-on' : ''}">${label}${q.sort === key ? (q.dir === 'asc' ? ' ↑' : ' ↓') : ''}</button>`;
  const flt = (k, v, label) => html`<a class="btn btn-sm ${q[k] === v ? 'btn-dark' : 'btn-ghost'}" href="#/anfragen${qs({ ...q, [k]: q[k] === v ? '' : v, page: '' })}">${label}</a>`;
  P.show(html`${head('Anfragen', `${plural(d.total, 'Anfrage', 'Anfragen')} · Traumwagen-DEAL und Fahrzeugverkauf`, html`<button class="btn" data-act="reqExport">${icon('download')}Liste exportieren</button>`)}
    ${tabsBar(REQ_VIEWS.filter(([k]) => k !== 'spam' || canAny('req_spam_confirm', 'req_spam_report')).map(([k, l]) => [k, l, '#/anfragen' + qs({ view: k })]), q.view)}
    <section class="panel mt"><form class="toolbar" data-submit="reqFilter">
      <label class="search">${icon('search')}<input name="q" value="${q.q || ''}" placeholder="Nummer, Name, E-Mail, Marke, PLZ …" aria-label="Suche"></label>
      ${sel('type', [['deal', 'Traumwagen-DEAL'], ['sell', 'Fahrzeugverkauf']], q.type, { empty: 'Alle Arten', attrs: 'aria-label="Art" data-change="reqFilterChange"' })}
      ${sel('status', RS().map((s) => [s.key, s.label]), q.status, { empty: 'Alle Status', attrs: 'aria-label="Status" data-change="reqFilterChange"' })}
      ${sel('brand', d.brands, q.brand, { empty: 'Alle Marken', attrs: 'aria-label="Marke" data-change="reqFilterChange"' })}
      <input name="model" value="${q.model || ''}" placeholder="Modell" aria-label="Modell" size="9">
      <input type="date" name="from" value="${q.from || ''}" aria-label="Von" data-change="reqFilterChange"><input type="date" name="to" value="${q.to || ''}" aria-label="Bis" data-change="reqFilterChange">
      ${users.length ? sel('assignee', users.map((u) => [u.id, u.name]), q.assignee, { empty: 'Alle Zuständigen', attrs: 'aria-label="Zuständig" data-change="reqFilterChange"' }) : ''}
      <button class="btn btn-sm btn-dark" type="submit">Filtern</button>${Object.keys(q).some((k) => !['view', 'page', 'sort', 'dir'].includes(k) && q[k]) ? html`<a class="btn btn-sm btn-ghost" href="#/anfragen?view=${q.view}">Zurücksetzen</a>` : ''}
    </form>
    <div class="toolbar">${flt('mine', '1', 'Mir zugewiesen')}${flt('unassigned', '1', 'Ohne Zuständigen')}${flt('notes', '1', 'Neue Kundennotizen')}</div>
    ${d.items.length ? html`<div class="table-wrap"><table class="table"><thead><tr>
        <th>${sortBtn('number', 'Nr.')}</th><th>${sortBtn('created_at', 'Datum')}</th><th>${sortBtn('status', 'Status')}</th><th>Anliegen</th><th>${sortBtn('customer', 'Kunde')}</th>
        <th>${sortBtn('brand', 'Marke')}</th><th>${sortBtn('model', 'Modell')}</th><th class="r">${sortBtn('budget', 'Budget')}</th><th>${sortBtn('assignee', 'Zuständig')}</th><th>Rückmeldung Partner</th><th>Angebote</th></tr></thead>
      <tbody>${d.items.map((r) => html`<tr class="clickable ${r.customer_note_unread ? 'is-unread' : ''}" data-act="go" data-href="#/anfragen/${r.number}">
        <td class="num strong">#${r.number}${r.priority !== 'normal' ? html` <span class="tag">${r.priority}</span>` : ''}</td>
        <td class="nowrap">${fDate(r.created_at)}<span class="cell-sub">${fTime(r.created_at)} Uhr</span></td>
        <td>${statusBadge(RS(), r.status)}${r.spam_state === 'gemeldet' ? html`<span class="cell-sub">Spam gemeldet</span>` : ''}${r.billed ? html`<span class="cell-sub">Kopie · in Rechnung gestellt</span>` : ''}</td>
        <td>${r.summary || typeLabel(r.type)}<span class="cell-sub">${typeLabel(r.type)}</span>${r.customer_note_unread ? html`<span class="cell-sub strong">Neue Notiz vom Kunden</span>` : ''}</td>
        <td>${r.customer || '–'}<span class="cell-sub">${r.email || ''}</span></td><td>${r.brand || '–'}</td><td>${r.model || '–'}</td><td class="r num">${r.budget || '–'}</td>
        <td>${r.assignee_name || html`<span class="muted">offen</span>`}</td>
        <td class="nowrap">${r.partners ? html`${r.partners_reacted}/${r.partners} reagiert` : html`<span class="muted">nicht verteilt</span>`}${r.deadline_at && ['versendet', 'angebot_liegt_vor'].includes(r.status) ? html`<span class="cell-sub">${fLeft(r.deadline_at)}</span>` : ''}</td>
        <td class="nowrap">${r.offers ? html`<b>${r.offers}</b>${r.last_offer_at ? html`<span class="cell-sub">zuletzt ${fDT(r.last_offer_at)}</span>` : ''}` : html`<span class="muted">–</span>`}</td></tr>`)}</tbody></table></div>
      <div class="pager"><span>Seite ${d.page} von ${d.pages}</span><span class="row">${d.page > 1 ? html`<a class="btn btn-sm" href="#/anfragen${qs({ ...q, page: d.page - 1 })}">Zurück</a>` : ''}${d.page < d.pages ? html`<a class="btn btn-sm" href="#/anfragen${qs({ ...q, page: d.page + 1 })}">Weiter</a>` : ''}</span></div>`
      : empty('Keine Anfragen gefunden', 'Passe die Filter an oder setze sie zurück.')}</section>`);
}
SUBMIT.reqFilter = (d) => { const q = hashQuery(); setHashQuery({ view: q.view, mine: q.mine, unassigned: q.unassigned, notes: q.notes, sort: q.sort, dir: q.dir, ...d }); };
CHANGE.reqFilterChange = (el) => SUBMIT.reqFilter(formData(el.form));
ACT.reqSort = (b) => { const q = hashQuery(); const k = b.dataset.key; setHashQuery({ ...q, sort: k, dir: q.sort === k && q.dir !== 'asc' ? 'asc' : 'desc', page: '' }); };
ACT.reqExport = async () => {
  const q = hashQuery(); const rows = []; let page = 1, pages = 1;
  do { const d = await GET('/requests', { ...q, page }); rows.push(...d.items); pages = d.pages; page++; } while (page <= pages && page <= 40);
  const head = ['Nr', 'Datum', 'Status', 'Art', 'Anliegen', 'Kunde', 'E-Mail', 'Marke', 'Modell', 'Budget', 'PLZ', 'Zuständig', 'Partner', 'reagiert', 'Angebote', 'Quelle'];
  const csv = [head, ...rows.map((r) => [r.number, fDT(r.created_at), statusOf(RS(), r.status).label, typeShort(r.type), r.summary, r.customer, r.email, r.brand, r.model, r.budget, r.plz, r.assignee_name, r.partners, r.partners_reacted, r.offers, r.source])]
    .map((l) => l.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })); a.download = `kfl-anfragen-${todayISO()}.csv`; a.click();
};

/* ---------- Detail ---------- */
const TRACK = [['Eingang', ['eingang', 'in_bearbeitung', 'fehler', 'stoerung']], ['An Partner versendet', ['versendet', 'kein_angebot']], ['Angebot liegt vor', ['angebot_liegt_vor', 'angebot_in_bearbeitung']], ['Beim Kunden', ['angebot_beim_kunden', 'angebot_abgelehnt']], ['Kontaktdaten versendet', ['angebot_akzeptiert', 'kontaktdaten_versendet']]];
function trackHtml(r) {
  const idx = Math.max(0, TRACK.findIndex(([, s]) => s.includes(r.status)));
  const bad = ['fehler', 'stoerung', 'kein_angebot', 'angebot_abgelehnt', 'spam'].includes(r.status);
  const dates = [r.created_at, r.dispatched_at, r.evaluated_at, r.presented_at, r.decided_at];
  return html`<div class="track" aria-label="Fortschritt der Anfrage">${TRACK.map(([l], i) => html`<div class="track-step ${i < idx ? 'done' : i === idx ? (bad ? 'bad now' : r.status === 'kontaktdaten_versendet' ? 'done' : 'now') : ''}"><i></i>${l}${i === idx && bad ? html`<small>${statusOf(RS(), r.status).label}</small>` : dates[i] && i <= idx ? html`<small>${fDT(dates[i])}</small>` : ''}</div>`)}</div>`;
}
const EVENT_LABEL = { abrechnung_storniert: 'Abrechnung storniert', abrechnung_reaktiviert: 'Storno der Abrechnung aufgehoben', eingang: 'Eingang', versendet: 'Verteilt', kein_partner: 'Kein passender Partner', partner_zugeordnet: 'Partner zugeordnet', partner_uebernommen: 'Vom Partner übernommen', angebot: 'Angebot eingegangen', auswertung: 'Ausgewertet', vorgestellt: 'Dem Kunden vorgestellt',
  angebot_akzeptiert: 'Kunde interessiert sich', angebot_abgelehnt: 'Kunde hat abgelehnt', partnerstatus: 'Partnerstatus', kunde_nachgefragt: 'Rückfrage an den Kunden', kunde_feedback: 'Rückmeldung des Kunden', kundennotiz: 'Notiz vom Kunden', notiz: 'Interne Notiz', status: 'Status', prioritaet: 'Priorität', zuweisung: 'Zuständig',
  nachricht_kunde: 'Nachricht an den Kunden', nachricht_partner: 'Nachricht an Partner', erneut_gesendet: 'Erneut gesendet', neutrale_pdf: 'Neutrale PDF', buchhaltung: 'An die Buchhaltung', in_rechnung_gestellt: 'In Rechnung gestellt', rechnung_gesammelt: 'Für Sammelrechnung vorgemerkt',
  spam_gemeldet: 'Als Spam gemeldet', spam_bestaetigt: 'Spam bestätigt', spam_abgelehnt: 'Kein Spam', fehler: 'Fehler', stoerung: 'Störung', bewertung: 'Kundenbewertung' };
const FIELD_LABEL = { name: 'Nachname', email: 'E-Mail', phone: 'Telefon', body: 'Sonstiges' };
const CONTACT_KEYS = ['Vorname', 'name', 'email', 'phone', 'Straße', 'Kontaktweg', 'Kundennummer', 'Kundenkonto-ID'];
const FIELD_ORDER = ['Formular', 'Zustand', 'Marke', 'Modell', 'Modellvariante', 'Bezahlart', 'Kilometer pro Jahr', 'Laufzeit', 'Anzahlung', 'Budget', 'Umkreis'];
function fieldsGrid(fields, hideContact) {
  const keys = Object.keys(fields).filter((k) => fields[k] !== '' && fields[k] != null && !(hideContact && CONTACT_KEYS.includes(k))).sort((a, b) => { const ia = FIELD_ORDER.indexOf(a), ib = FIELD_ORDER.indexOf(b); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); });
  return html`<dl class="fields">${keys.map((k) => html`<div class="${String(fields[k]).length > 60 || /body|Sonstiges|Nachricht/i.test(k) ? 'wide' : ''}"><dt>${FIELD_LABEL[k] || k}</dt><dd class="pre">${fields[k]}</dd></div>`)}</dl>`;
}
let REQ = null;
async function pageRequest(no) {
  const P = page('anfragen');
  if (!can('req_view')) return P.show(noAccess());
  const d = await GET('/requests/' + no); if (!P.alive()) return;
  REQ = d;
  const r = d.request;
  let users = [];
  if (can('req_assign')) users = (await GET('/directory').catch(() => ({ users: [] }))).users;
  const statusChoices = RS().filter((s) => s.key !== 'spam' && (can('req_status_force') || ['eingang', 'in_bearbeitung', 'fehler', 'stoerung', r.status].includes(s.key)));
  const timeline = [...d.events.map((e) => { const m = String(e.detail || '').match(/^\[([^\]]+)\]\s*(.*)$/s); return { at: e.created_at, who: e.author || (m ? m[1] : 'System'), text: `${EVENT_LABEL[e.action] || e.action.replace(/_/g, ' ')}${(m ? m[2] : e.detail) ? ': ' + (m ? m[2] : e.detail) : ''}`, cls: e.user_id ? 'kfl' : '' }; }),
    ...d.partnerEvents.filter((e) => e.confidential || !['uebernommen', 'angebot', 'zugeordnet'].includes(e.action)).map((e) => ({ at: e.created_at, who: e.actor_name || 'Partner', text: e.text || e.action.replace(/_/g, ' '), cls: e.confidential ? 'conf' : '', conf: !!e.confidential }))].sort((a, b) => (a.at < b.at ? 1 : -1));
  const canMsg = can('req_message');
  P.show(html`${head(html`#${r.number} · ${r.vehicle || r.summary || typeLabel(r.type)}`, html`${typeLabel(r.type)} · eingegangen ${fDT(r.created_at)} · Quelle: ${r.source || 'Webseite'}${r.radius_km != null ? html` · Umkreis ${r.radius_km ? r.radius_km + ' km' : 'bundesweit'}` : ''}`,
      html`${statusBadge(RS(), r.status)}${r.billed ? badge('Kopie · in Rechnung gestellt', 'ok') : ''}${r.deleted ? badge('Deaktiviert', 'err') : ''}`, ['#/anfragen', 'Alle Anfragen'])}
    ${r.status_note ? html`<div class="note-box">${icon('alert')}<span>${r.status_note}</span></div>` : ''}
    ${r.linked ? html`<div class="info-box mt">${icon('refresh')}<span>${r.type === 'deal' ? html`<b>Mit Inzahlungnahme:</b> Der Kunde gibt sein jetziges Auto in Zahlung. Ankauf-Anfrage` : html`<b>Inzahlungnahme:</b> Gehört zum Traumwagen-DEAL`} <a href="#/anfragen/${r.linked.number}">#${r.linked.number}${r.linked.vehicle ? ' · ' + r.linked.vehicle : ''}</a> (${(RS().find((x) => x.key === r.linked.status) || {}).label || r.linked.status}). Partner der Traumwagen-Anfrage können den Ankauf zusätzlich übernehmen.</span></div>` : ''}
    ${r.customer_note_unread ? html`<div class="info-box mt">${icon('note')}<span>Der Kunde hat eine neue Notiz unter „Sonstiges“ hinterlassen. Bitte berücksichtigen und ggf. an die Partner weitergeben.</span></div>` : ''}
    <section class="panel mt">${trackHtml(r)}</section>
    <div class="detail-grid mt">
      <div class="stack">
        <section class="panel"><div class="panel-head"><h2>Anfrage</h2>${r.deadline_at && ['versendet', 'angebot_liegt_vor'].includes(r.status) ? html`<span class="badge t-accent">${icon('clock')}Angebotsfrist ${fDT(r.deadline_at)} · ${fLeft(r.deadline_at)}</span>` : ''}</div>
          <div class="panel-body tight">${fieldsGrid(r.fields, !!r.contact)}</div></section>
        ${r.contact ? html`<section class="panel"><div class="panel-head"><h2>Kunde</h2>${canMsg ? html`<button class="btn btn-sm" data-act="msgCustomer">${icon('mail')}Nachricht an Kunden</button>` : ''}</div><div class="panel-body">
          ${kv([['Name', r.contact.name], ['E-Mail', r.contact.email ? html`<a class="link" href="mailto:${r.contact.email}">${r.contact.email}</a>` : ''], ['Telefon', r.contact.phone ? html`<a class="link" href="tel:${r.contact.phone}">${r.contact.phone}</a>` : ''],
            ['Anschrift', [r.contact.street, [r.contact.zip, r.contact.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')], ['Kundenart', r.fields.Kundenart], ['Kontaktweg', r.contact.contactWay],
            ['Kundenkonto', r.customer_account ? 'Shopify-Kunde ' + r.customer_account : 'ohne Konto'], ['Rückmeldung Kontakt', r.feedback_state ? (r.feedback_state === 'ja' ? 'Partner hat sich gemeldet' : 'Partner hat sich NICHT gemeldet') : '']])}</div></section>`
          : html`<section class="panel"><div class="panel-body muted small">${icon('lock')} Kontaktdaten sind für deine Rolle ausgeblendet.</div></section>`}
        <section class="panel"><div class="panel-head"><h2>Geschäftspartner <span class="count">${d.assignments.length}</span></h2>
          <div class="row">${can('req_partner') ? html`<button class="btn btn-sm" data-act="assignPartner">${icon('plus')}Manuell zuordnen</button>${!d.assignments.length || ['eingang', 'in_bearbeitung', 'fehler', 'stoerung', 'kein_angebot'].includes(r.status) ? html`<button class="btn btn-sm" data-act="redispatch">${icon('refresh')}Automatisch verteilen</button>` : ''}` : ''}</div></div>
          ${d.assignments.length ? d.assignments.map((a) => asgHtml(a, d.offers.find((o) => o.assignment_id === a.id))) : html`<div class="panel-body">${empty('Noch an keinen Partner verteilt', 'Kein passender Partner im Umkreis? Ordne manuell zu.')}</div>`}
          ${canMsg && d.assignments.length ? html`<form class="composer" data-submit="msgPartners"><h3>Nachricht an Partner</h3>
            <div class="row">${sel('kind', [['notiz', 'Notiz'], ['ergaenzung', 'Ergänzung zur Anfrage'], ['info', 'Sonstige Information'], ['mahnung', 'Anmahnen'], ['probefahrt', 'Kunde möchte Probefahrt']], 'notiz')}
              ${sel('to', [['all', 'An alle Partner dieser Anfrage'], ...d.assignments.map((a) => [a.id, a.org_name])], 'all')}</div>
            ${area('text', '', { rows: 3, ph: 'Text, den der Partner bei der Anfrage und per E-Mail sieht …' })}
            <div class="row"><button class="btn btn-dark" type="submit">${icon('send')}Senden</button><button class="btn" type="button" data-act="testDrive">${icon('car')}Probefahrt-Info an alle</button></div></form>` : ''}
        </section>
        <section class="panel"><div class="panel-head"><h2>Angebote <span class="count">${d.offers.length}</span></h2>
          <div class="row">${can('req_partner') && !r.evaluated_at && d.offers.length ? html`<button class="btn btn-sm" data-act="evaluate">Jetzt auswerten</button>` : ''}${r.status === 'angebot_in_bearbeitung' && can('req_edit') ? html`<button class="btn btn-sm btn-primary" data-act="present">Dem Kunden vorstellen</button>` : ''}</div></div>
          <div class="panel-body">${d.offers.length ? d.offers.map(offerHtml) : empty('Noch keine Angebote', 'Sobald Partner Angebote abgeben, erscheinen sie hier mit Bewertung.')}</div></section>
      </div>
      <div class="stack">
        ${can('req_edit') ? html`<section class="panel"><div class="panel-head"><h2>Bearbeitung</h2></div><form class="panel-body stack" data-submit="reqUpdate">
          ${field('Status', sel('status', statusChoices.map((s) => [s.key, s.label]), r.status))}
          ${field('Begründung (optional)', inp('note', '', { ph: 'z. B. Fehler in der Anfrage' }))}
          <div class="grid-2">${field('Priorität', sel('priority', [['normal', 'Normal'], ['hoch', 'Hoch'], ['dringend', 'Dringend']], r.priority))}
          ${field('Zuständig', can('req_assign') ? sel('assignee_id', users.map((u) => [u.id, u.name]), r.assignee_id, { empty: 'Niemand' }) : html`<div class="row"><span>${r.assignee_name || 'Niemand'}</span>${r.assignee_id !== S.user.id ? html`<button class="btn btn-sm" type="button" data-act="takeReq">Übernehmen</button>` : ''}</div>`)}</div>
          <button class="btn btn-dark" type="submit">Speichern</button></form></section>` : ''}
        <section class="panel"><div class="panel-head"><h2>Interne Notizen</h2></div><div class="panel-body stack">
          ${can('req_edit') ? html`<form class="stack-s" data-submit="reqNote">${area('text', '', { rows: 3, ph: 'Nur intern sichtbar …', req: true })}<div class="row-between">${chk('acc_relevant', false, 'Für die Buchhaltung relevant – dauerhaft am Abrechnungsfall anheften')}<button class="btn btn-sm" type="submit">Notiz speichern</button></div></form>` : ''}
          ${d.notes.length ? html`<ul class="timeline">${d.notes.map((n) => html`<li class="${n.author_type === 'customer' ? 'kfl' : ''}"><div><div class="tl-meta">${n.author_type === 'customer' ? 'Kunde (Sonstiges)' : n.author || 'System'} · ${fDT(n.created_at)}${n.acc_relevant ? html`<span class="acc-flag" title="Markiert von ${n.acc_marked_by || '–'} am ${fDT(n.acc_marked_at)}">${icon('pin')}Buchhaltung</span>` : ''}</div><div class="pre">${n.text}</div>
            ${!n.acc_relevant && n.author_type !== 'customer' && can('req_edit') ? html`<button class="link small" data-act="noteAcc" data-id="${n.id}">Für die Buchhaltung markieren</button>` : ''}${n.acc_relevant && S.user.role === 'admin' ? html`<button class="link small" data-act="noteAccOff" data-id="${n.id}">Markierung aufheben</button>` : ''}</div></li>`)}</ul>` : html`<p class="muted small">Noch keine Notizen.</p>`}</div></section>
        ${d.billing.length ? html`<section class="panel"><div class="panel-head"><h2>Abrechnung</h2></div><div class="panel-body">${d.billing.map((b) => kv([['Betrag netto', fEur(b.amount_net)], ['Status', b.status === 'storniert' ? 'Storniert' : b.status], ['Rechnung', b.invoice_number || (b.status === 'storniert' ? '–' : 'noch nicht erstellt')], b.status === 'storniert' && ['Storno-Grund', `${b.cancel_reason || '–'} (${b.cancelled_by || ''}, ${fDT(b.cancelled_at)})`]]))}${can('acc_view') ? html`<a class="link small" href="#/buchhaltung/faelle">Zur Buchhaltung</a>` : ''}</div></section>` : ''}
        ${d.tickets.length ? html`<section class="panel"><div class="panel-head"><h2>Support-Fälle</h2></div><div class="panel-body stack-s">${d.tickets.map((t) => html`<a class="link" href="#/support/${t.id}">#${t.id} ${t.subject}</a>`)}</div></section>` : ''}
        <section class="panel"><div class="panel-head"><h2>Verlauf</h2></div><div class="panel-body"><ul class="timeline">${timeline.map((e) => html`<li class="${e.cls}"><div><div class="tl-meta">${e.who} · ${fDT(e.at)}${e.conf ? ' · Vertrauliche Information' : ''}</div><div>${e.text}</div></div></li>`)}</ul></div></section>
        ${spamPanel(r)}
        ${can('req_delete') && !r.deleted ? html`<section class="panel"><div class="panel-body row-between"><span class="small muted">Anfrage endgültig deaktivieren und personenbezogene Daten entfernen.</span><button class="btn btn-sm btn-danger" data-act="reqDelete">${icon('trash')}Löschen</button></div></section>` : ''}
      </div></div>`);
}
function asgHtml(a, offer) {
  const live = ['neu', 'in_bearbeitung'].includes(a.status);
  return html`<div class="asg"><div class="asg-head"><div><b>${a.org_name}</b>${a.org_city ? html` <span class="muted small">${a.org_city}</span>` : ''}
      <div class="asg-meta">${a.distance_km != null ? `${fNum(a.distance_km)} km Luftlinie · ` : ''}${a.source === 'manuell' ? 'manuell zugeordnet' : a.source === 'verknuepft' ? 'vom Partner zusätzlich übernommen (Inzahlungnahme)' : 'automatisch'} · ${a.mailed_at ? 'versendet ' + fDT(a.mailed_at) : 'noch nicht versendet'}${a.reminders ? ` · ${a.reminders}× angemahnt` : ''}</div>
      <div class="asg-meta">${a.taker_name ? `In Bearbeitung von ${a.taker_name}${a.taken_at ? ' seit ' + fDT(a.taken_at) : ''}` : ''}${live && a.deadline_at ? ` · Frist ${fDT(a.deadline_at)} (${fLeft(a.deadline_at)})` : ''}${a.contact_due_at && ['gewonnen', 'nicht_erreicht'].includes(a.status) ? ` · Kontaktfrist ${fDT(a.contact_due_at)}` : ''}</div>
      ${a.closed_reason ? html`<div class="asg-meta">${a.closed_reason}</div>` : ''}</div>
    ${statusBadge(AS(), a.status)}</div>
    ${can('req_message') ? html`<div class="row">${live ? html`<button class="btn btn-sm" data-act="asgResend" data-id="${a.id}">${icon('send')}Erneut senden</button><button class="btn btn-sm" data-act="asgRemind" data-id="${a.id}">${icon('bell')}Anmahnen</button>` : ''}
      ${a.status === 'in_bearbeitung' && can('req_partner') ? html`<button class="btn btn-sm" data-act="asgRelease" data-id="${a.id}">Für Organisation freigeben</button>` : ''}
      ${['gewonnen', 'nicht_erreicht', 'kontaktiert', 'verloren', 'gescheitert', 'vorgestellt'].includes(a.status) || offer ? html`<button class="btn btn-sm" data-act="asgStatus" data-id="${a.id}">Status setzen</button>` : ''}</div>` : ''}</div>`;
}
const SCORE_SHORT = { distance: 'Nähe', response: 'Antwortzeit', equipment: 'Ausstattung', price: 'Rate / Preis', model: 'Modell', term: 'Laufzeit', addons: 'Zusatzprodukte' };
function scoreDetail(o) {
  const sd = typeof o.score_detail === 'string' ? jparse0(o.score_detail) : o.score_detail; if (!sd || !sd.points) return '';
  return html`<div class="score-detail" title="Punkte je Faktor (0–100) · Gewichtung in Klammern">${Object.entries(sd.points).map(([k, p]) => html`<div><span>${SCORE_SHORT[k] || k} <span class="muted">(${sd.weights[k]} %)</span></span><b>${p == null ? 'entfällt' : fNum(p, 0)}</b></div>`)}${sd.hours != null ? html`<div><span class="muted">Antwort nach</span><b>${fNum(sd.hours, 1)} Std.</b></div>` : ''}</div>`;
}
const jparse0 = (s) => { try { return JSON.parse(s); } catch (e) { return null; } };
function offerHtml(o) {
  const d = o.data || {};
  return html`<article class="offer-card ${o.rank === 1 ? 'top' : ''}"><div class="row-between"><div><b>${o.org_name}</b> <span class="muted small">${o.user_name || ''} · ${fDT(o.created_at)}</span></div>
      <div class="row">${o.rank ? html`<span class="tag">Platz ${o.rank}</span>` : ''}${o.score != null ? html`<span class="tag">Score ${fNum(o.score, 1)}</span>` : ''}${offerStatus(o.status)}</div></div>
    <div class="row-between mt"><div class="offer-price num">${offerHeadline(d)}</div><span class="muted small">${OFFER_KIND[o.kind] || o.kind}</span></div>
    <div class="mt">${kv(offerRows(d))}</div>
    ${scoreDetail(o)}
    <div class="row mt">${o.pdf_file_id ? html`<a class="btn btn-sm" target="_blank" rel="noopener" href="${fileUrl(`/requests/${REQ.request.number}/offers/${o.id}/file`, { which: 'pdf' })}">${icon('file')}Angebot (PDF)</a>` : ''}
      ${o.expose_file_id ? html`<a class="btn btn-sm" target="_blank" rel="noopener" href="${fileUrl(`/requests/${REQ.request.number}/offers/${o.id}/file`, { which: 'expose' })}">${icon('file')}Exposé</a>` : ''}
      ${o.public_file_id ? html`<a class="btn btn-sm" target="_blank" rel="noopener" href="${fileUrl(`/requests/${REQ.request.number}/offers/${o.id}/file`, { which: 'public' })}">${icon('eye')}Neutrale PDF</a>` : ''}
      ${can('req_edit') && (o.pdf_file_id || o.expose_file_id) ? html`<button class="btn btn-sm btn-ghost" data-act="offerPublic" data-id="${o.id}">${icon('upload')}Neutrale PDF für Kunden hochladen</button>` : ''}</div></article>`;
}
function spamPanel(r) {
  if (r.spam_state === 'gemeldet') return html`<section class="panel"><div class="panel-head"><h2>Spam-Meldung</h2>${badge('Zur Prüfung', 'warn')}</div><div class="panel-body stack">
    <p class="small">${r.spam_reason ? `Grund: ${r.spam_reason}` : 'Ohne Begründung gemeldet.'}</p>
    ${can('req_spam_confirm') ? html`<div class="row"><button class="btn btn-danger btn-sm" data-act="spamDecide" data-confirm="1">Als Spam bestätigen</button><button class="btn btn-sm" data-act="spamDecide" data-confirm="0">Kein Spam</button></div>` : html`<p class="muted small">Die Teamleitung prüft die Meldung.</p>`}</div></section>`;
  if (can('req_spam_report') && !r.deleted && r.spam_state !== 'bestaetigt') return html`<section class="panel"><div class="panel-body row-between"><span class="small muted">Fantasiedaten oder Werbung?</span><button class="btn btn-sm" data-act="spamReport">${icon('flag')}Als Spam melden</button></div></section>`;
  return '';
}
const rno = () => REQ.request.number;
SUBMIT.reqUpdate = async (d) => { await PATCH('/requests/' + rno(), { status: d.status, note: d.note, priority: d.priority, ...(d.assignee_id !== undefined ? { assignee_id: d.assignee_id || null } : {}) }); toast('Gespeichert.'); reload(); };
ACT.takeReq = async () => { await PATCH('/requests/' + rno(), { assignee_id: S.user.id }); toast('Du bist jetzt zuständig.'); reload(); };
SUBMIT.reqNote = async (d) => { await POST(`/requests/${rno()}/notes`, d); toast(d.acc_relevant ? 'Notiz gespeichert und für die Buchhaltung angeheftet.' : 'Notiz gespeichert.'); reload(); };
ACT.noteAcc = async (b) => { if (!(await confirmBox('Für die Buchhaltung markieren?', 'Die Notiz wird dauerhaft am Abrechnungsfall und an der Rechnung angeheftet und ist für Buchhaltung, Geschäftsführung und Admin sichtbar. Die Markierung kann nur ein Admin wieder aufheben.', 'Markieren'))) return; await POST(`/requests/${rno()}/notes/${b.dataset.id}/acc`, { relevant: true }); toast('Für die Buchhaltung angeheftet.'); reload(); };
ACT.noteAccOff = async (b) => { if (!(await confirmBox('Markierung aufheben?', 'Die Notiz bleibt an der Anfrage, erscheint aber nicht mehr bei der Buchhaltung.', 'Aufheben'))) return; await POST(`/requests/${rno()}/notes/${b.dataset.id}/acc`, { relevant: false }); toast('Markierung aufgehoben.'); reload(); };
ACT.msgCustomer = async () => {
  const d = await ask({ title: 'Nachricht an den Kunden', text: `Geht per E-Mail an ${REQ.request.contact.email} (Absender vermittlung@). Antworten landen im Postfach der Vermittlung.`, ok: 'Senden', fields: field('Nachricht', area('text', '', { rows: 7, req: true })) });
  if (!d) return; const r = await POST(`/requests/${rno()}/message`, { to: 'customer', text: d.text }); toast(r.mail === 'gesendet' ? 'Nachricht gesendet.' : 'Nachricht gespeichert (E-Mail-Dienst nicht eingerichtet).'); reload();
};
SUBMIT.msgPartners = async (d, f) => { if (d.kind !== 'probefahrt' && !d.text.trim()) throw new Error('Bitte gib eine Nachricht ein.'); await POST(`/requests/${rno()}/message`, { kind: d.kind, text: d.text, assignment_ids: d.to === 'all' ? [] : [+d.to] }); f.reset(); toast('An die Partner gesendet.'); reload(); };
ACT.testDrive = async () => { if (!(await confirmBox('Probefahrt-Info senden?', 'Alle Partner dieser Anfrage erfahren, dass der Kunde an einer Probefahrt interessiert ist.', 'Info senden'))) return; await POST(`/requests/${rno()}/message`, { kind: 'probefahrt', text: '' }); toast('Probefahrt-Info gesendet.'); reload(); };
ACT.asgResend = async (b) => { const r = await POST(`/requests/${rno()}/assignments/${b.dataset.id}/resend`); toast(r.mailErrors ? 'E-Mail konnte nicht zugestellt werden.' : `Erneut gesendet${r.mails ? ` (${r.mails} Empfänger)` : ''}.`, r.mailErrors ? 'err' : 'ok'); reload(); };
ACT.asgRemind = async (b) => { const d = await ask({ title: 'Partner anmahnen', text: 'Der Partner bekommt eine Erinnerung per E-Mail und im Dashboard.', ok: 'Anmahnen', fields: field('Zusatz (optional)', area('text', '', { rows: 3 })) }); if (!d) return; await POST(`/requests/${rno()}/message`, { kind: 'mahnung', text: d.text || 'Bitte bearbeite diese Anfrage zeitnah.', assignment_ids: [+b.dataset.id] }); toast('Partner angemahnt.'); reload(); };
ACT.asgRelease = async (b) => { if (!(await confirmBox('Wieder für die Organisation freigeben?', 'Der aktuelle Bearbeiter verliert die Anfrage; alle Vertriebler der Organisation sehen sie wieder.'))) return; await POST(`/requests/${rno()}/assignments/${b.dataset.id}/release`); reload(); };
ACT.asgStatus = async (b) => {
  const d = await ask({ title: 'Status beim Partner setzen', text: 'Die Begründung ist auch für den Partner sichtbar. „Gewonnen“ erzeugt einmalig einen Abrechnungsfall.', ok: 'Status setzen',
    fields: html`${field('Neuer Status', sel('status', [['gewonnen', 'Gewonnen'], ['kontaktiert', 'Kunde erfolgreich kontaktiert'], ['verloren', 'Verloren'], ['gescheitert', 'Verhandlung gescheitert']], 'gewonnen'))}${field('Begründung / Notiz', area('note', '', { rows: 4, req: true, ph: 'Was hat der Kunde gesagt?' }))}` });
  if (!d) return; await POST(`/requests/${rno()}/assignments/${b.dataset.id}/status`, d); toast('Status gesetzt.'); reload();
};
ACT.assignPartner = async () => {
  const c = await GET(`/requests/${rno()}/candidates`);
  const list = c.orgs.filter((o) => !o.assigned && o.active).sort((a, b) => (b.brandMatch - a.brandMatch) || ((a.distance ?? 1e9) - (b.distance ?? 1e9)));
  const d = await ask({ title: 'Partner manuell zuordnen', wide: true, ok: 'Zuordnen und senden',
    fields: html`${field('Geschäftspartner', raw(`<select name="org_id" required size="8">${list.map((o) => `<option value="${o.id}">${esc(o.name)} · ${esc(o.city || '')}${o.distance != null ? ' · ' + fNum(o.distance) + ' km' : ''}${o.brandMatch ? '' : ' · andere Marke'}</option>`).join('')}</select>`), 'Passende Marke zuerst, dann nach Entfernung sortiert.')}
      ${field('Notiz an den Partner (optional)', area('note', '', { rows: 3 }))}` });
  if (!d) return; await POST(`/requests/${rno()}/assign`, d); toast('Partner zugeordnet und benachrichtigt.'); reload();
};
ACT.redispatch = async () => { const r = await POST(`/requests/${rno()}/dispatch`); toast(r.assigned ? `An ${r.assigned} Partner verteilt.` : (r.error || 'Kein neuer passender Partner gefunden – bitte manuell zuordnen.'), r.assigned ? 'ok' : 'err'); reload(); };
ACT.evaluate = async () => { if (!(await confirmBox('Jetzt auswerten?', 'Die Angebotsfrist wird nicht abgewartet. Das beste Angebot wird ermittelt und – je nach Einstellung – dem Kunden vorgestellt.', 'Auswerten'))) return; await POST(`/requests/${rno()}/evaluate`); reload(); };
ACT.present = async () => { await POST(`/requests/${rno()}/present`); toast('Das Angebot wurde dem Kunden vorgestellt.'); reload(); };
ACT.offerPublic = async (b) => {
  const d = await ask({ title: 'Neutrale PDF für den Kunden', text: 'Lade eine Fassung ohne Hinweise auf den Partner (Anschrift, Ansprechpartner, Logo) hoch. Der Kunde sieht dann nur diese Datei.', ok: 'Hochladen',
    fields: html`${field('Datei', raw('<input type="file" name="file" accept="application/pdf" required>'))}${field('Ersetzt', sel('which', [['pdf', 'Angebot'], ['expose', 'Exposé']], 'pdf'))}` });
  if (!d) return; const file = await fileField(d._form.elements.file, { max: 8 }); await POST(`/requests/${rno()}/offers/${b.dataset.id}/public`, { file, which: d.which }); toast('Neutrale PDF gespeichert.'); reload();
};
ACT.spamReport = async () => { const d = await ask({ title: 'Als Spam melden', text: 'Die Teamleitung prüft die Meldung. Bei Bestätigung wird die Anfrage deaktiviert.', ok: 'Melden', fields: field('Grund', inp('reason', '', { req: true, ph: 'z. B. Fantasiename, Werbung' })) }); if (!d) return; await POST(`/requests/${rno()}/spam`, d); toast('An die Teamleitung gemeldet.'); reload(); };
ACT.spamDecide = async (b) => { const yes = b.dataset.confirm === '1'; if (yes && !(await confirmBox('Spam bestätigen?', 'Die Anfrage wird deaktiviert, die Partner-Zuordnungen geschlossen und der Fall läuft beim Admin im Support zur Nachprüfung auf.', 'Spam bestätigen', true))) return; await POST(`/requests/${rno()}/spam/decide`, { confirm: yes }); toast(yes ? 'Als Spam bestätigt.' : 'Meldung abgelehnt.'); reload(); };
ACT.reqDelete = async () => { const d = await ask({ title: `Anfrage #${rno()} löschen?`, text: 'Kundendaten werden entfernt, offene Partner-Zuordnungen geschlossen. Das kann nicht rückgängig gemacht werden.', ok: 'Endgültig löschen', danger: true, fields: field('Grund', inp('reason', '', { req: true })) }); if (!d) return; await DEL('/requests/' + rno(), d); toast('Anfrage gelöscht.'); location.hash = '#/anfragen'; };
