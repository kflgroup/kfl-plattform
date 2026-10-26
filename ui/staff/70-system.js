/* ===== Backup, Protokoll, Verwaltung ===== */
const fBytes = (n) => (n == null ? '–' : n < 1024 ? n + ' B' : n < 1048576 ? fNum(n / 1024, 1) + ' KB' : fNum(n / 1048576, 1) + ' MB');
const LEVEL = { hoch: ['Hoch', 'err'], mittel: ['Mittel', 'warn'], info: ['Info', 'info'] };
const areaBar = () => html`<div class="row"><span class="small muted">${icon('lock')} entsperrt</span><button class="btn btn-sm btn-ghost" data-act="areaLock">Sperren</button></div>`;

async function pageBackup() {
  const P = page('backup');
  if (!can('backup_view')) return P.show(noAccess());
  if (!S.user.areaUnlocked) return P.show(lockScreen('Backup', 'Hier liegen die verschlüsselten Datensicherungen und das Archiv.'));
  const d = await guarded(() => GET('/backups'), 'Backup', 'Hier liegen die verschlüsselten Datensicherungen und das Archiv.'); if (!d || !P.alive()) return;
  const r = d.report;
  P.show(html`${head('Backup', 'Täglich um 0:01 Uhr wird eine verschlüsselte Sicherung aller Daten, des Protokolls und des Systemstands erstellt.', html`${areaBar()}<button class="btn btn-primary" data-act="backupNow">${icon('shield')}Backup jetzt erstellen</button>`)}
    ${!d.passwordSet ? html`<div class="err-box">${icon('alert')}<span>Es ist noch kein eigenes Backup-Passwort festgelegt. Ohne Passwort sind Backups nur mit dem Server-Schlüssel lesbar.</span>${isAdmin() ? html`<button class="btn btn-sm" data-act="backupPw">Jetzt festlegen</button>` : ''}</div>` : ''}
    <div class="detail-grid mt"><section class="panel"><div class="panel-head"><h2>Sicherungen</h2>${isAdmin() && d.passwordSet ? html`<button class="btn btn-sm btn-ghost" data-act="backupPw">${icon('key')}Backup-Passwort ändern</button>` : ''}</div>
      ${d.backups.length ? html`<div class="table-wrap"><table class="table"><thead><tr><th>Zeitpunkt</th><th>Art</th><th class="r">Größe</th><th>Prüfsumme</th><th>Cloud</th><th></th></tr></thead><tbody>${d.backups.map((b) => html`<tr><td>${fDT(b.created_at)}</td><td>${b.kind === 'auto' ? 'Automatisch' : 'Manuell'}</td><td class="r num">${fBytes(b.size)}</td>
        <td class="num tiny" title="${b.sha256 || ''}">${(b.sha256 || '').slice(0, 12)}…</td><td>${b.uploaded ? badge(b.uploaded, b.uploaded === 'hochgeladen' ? 'ok' : 'warn') : html`<span class="muted small">–</span>`}</td>
        <td class="r"><a class="btn btn-sm" href="${fileUrl(`/backups/${b.id}/download`)}">${icon('download')}Herunterladen</a></td></tr>`)}</tbody></table></div>` : html`<div class="panel-body">${empty('Noch keine Sicherungen')}</div>`}
      <div class="panel-body small muted">Die Datei ist mit AES-256-GCM verschlüsselt (Schlüssel aus dem Backup-Passwort, PBKDF2 mit 150.000 Runden) und enthält alle Tabellen als Text (JSON). Passwörter von Konten sind nicht enthalten.</div></section>
      <section class="panel"><div class="panel-head"><h2>Sicherheitsbericht</h2>${r.ok ? badge('Keine kritischen Punkte', 'ok') : badge('Handlungsbedarf', 'err')}</div><div class="panel-body">
        ${r.issues.length ? r.issues.map((i) => html`<div class="sec-issue"><span class="level">${badge(...(LEVEL[i.level] || [i.level]))}</span><span>${i.text}</span></div>`) : html`<p class="muted">Keine Auffälligkeiten.</p>`}
        <p class="tiny muted mt">Stand ${fDT(r.created_at)} · Version ${r.version}</p></div></section></div>
    <section class="panel mt"><div class="panel-head"><h2>Archiv</h2><div class="row">${[['', 'Alle'], ['ticket', 'Support'], ['sysissue', 'Systemfehler']].map(([k, l]) => html`<button class="btn btn-sm btn-ghost" data-act="archList" data-kind="${k}">${l}</button>`)}</div></div><div id="arch" class="panel-body">${loading()}</div></section>`);
  ACT.archList({ dataset: { kind: '' } });
}
ACT.archList = async (b) => {
  const d = await GET('/archive', { kind: b.dataset.kind });
  render('#arch', d.items.length ? html`<table class="table"><thead><tr><th>Art</th><th>Titel</th><th>Archiviert</th><th>Aufbewahrt bis</th><th></th></tr></thead><tbody>${d.items.map((a) => html`<tr><td>${a.kind}</td><td>${a.title}</td><td>${fDate(a.archived_at)}</td><td>${fDate(a.expires_at)}</td><td class="r"><button class="btn btn-sm btn-ghost" data-act="archOpen" data-id="${a.id}">Ansehen</button></td></tr>`)}</tbody></table>` : empty('Das Archiv ist leer'));
};
ACT.archOpen = async (b) => { const d = await GET('/archive/' + b.dataset.id); modal({ title: d.item.title, wide: true, body: html`<pre class="pre small">${JSON.stringify(d.item.data, null, 2)}</pre>` }); };
ACT.backupNow = async () => { await POST('/backups'); toast('Backup erstellt.'); reload(); };
ACT.backupPw = async () => {
  const d = await ask({ title: 'Backup-Passwort festlegen', text: 'Mit diesem Passwort werden alle künftigen Backups verschlüsselt. Bewahre es sicher auf – ohne Passwort lassen sich Backups nicht öffnen.', ok: 'Speichern',
    fields: html`${field('Passwort', inp('password', '', { type: 'password', req: true, attrs: 'minlength="10" autocomplete="new-password"' }), PW_HINT)}${field('Wiederholen', inp('password2', '', { type: 'password', req: true }))}` });
  if (!d) return; if (d.password !== d.password2) throw new Error('Die Passwörter stimmen nicht überein.');
  await POST('/backups/password', { password: d.password }); toast('Backup-Passwort gespeichert.'); reload();
};

async function pageAudit() {
  const P = page('protokoll');
  if (!can('audit_view')) return P.show(noAccess());
  const what = 'Das Protokoll zeigt, wer wann was im System geändert hat (30 Tage).';
  if (!S.user.areaUnlocked) return P.show(lockScreen('Protokoll', what));
  const q = hashQuery();
  const d = await guarded(() => GET('/audit', q), 'Protokoll', what); if (!d || !P.alive()) return;
  P.show(html`${head('Protokoll', `${plural(d.total, 'Eintrag', 'Einträge')} · jede Änderung im System, 30 Tage aufbewahrt, danach im Backup`, html`${areaBar()}<a class="btn" href="${fileUrl('/audit', { ...q, export: 1 })}">${icon('download')}Als Textdatei</a>`)}
    <section class="panel"><form class="toolbar" data-submit="auditFilter"><label class="search">${icon('search')}<input name="q" value="${q.q || ''}" placeholder="Aktion, Person, Objekt, Details …" aria-label="Suche"></label>
      ${sel('actor_type', [['staff', 'Mitarbeiter'], ['partner', 'Partner'], ['customer', 'Kunde'], ['web', 'Webseite'], ['system', 'System']], q.actor_type, { empty: 'Alle', attrs: 'aria-label="Wer"' })}
      <input type="date" name="from" value="${q.from || ''}" aria-label="Von"><input type="date" name="to" value="${q.to || ''}" aria-label="Bis"><button class="btn btn-sm btn-dark" type="submit">Filtern</button></form>
    <div class="table-wrap"><table class="table"><thead><tr><th>Zeit</th><th>Wer</th><th>Aktion</th><th>Objekt</th><th>Details</th><th>IP-Kennung</th></tr></thead><tbody>${d.items.map((a) => html`<tr><td class="nowrap">${fDT(a.at)}</td><td>${a.actor_name || '–'}<span class="cell-sub">${a.actor_type}</span></td><td class="strong">${String(a.action).replace(/_/g, ' ')}</td>
      <td>${a.entity || ''} ${a.entity_id || ''}</td><td class="small"><span class="pre">${String(a.detail || '').slice(0, 220)}</span></td><td class="tiny muted num">${(a.ip || '').slice(0, 10)}</td></tr>`)}</tbody></table></div>
    <div class="pager"><span>Seite ${d.page} von ${d.pages}</span><span class="row">${d.page > 1 ? html`<a class="btn btn-sm" href="#/protokoll${qs({ ...q, page: d.page - 1 })}">Zurück</a>` : ''}${d.page < d.pages ? html`<a class="btn btn-sm" href="#/protokoll${qs({ ...q, page: d.page + 1 })}">Weiter</a>` : ''}</span></div></section>`);
}
SUBMIT.auditFilter = (d) => setHashQuery(d, '#/protokoll');

/* ---------- Verwaltung ---------- */
const ADM_TABS = () => [canAny('users_view', 'users_create', 'users_create_vt', 'users_admin') && ['mitarbeiter', 'Mitarbeiter', '#/verwaltung'], canAny('users_view', 'users_admin', 'users_create') && ['rollen', 'Rollen & Rechte', '#/verwaltung/rollen'],
  canAny('settings_all', 'acc_settings', 'acc_manage') && ['einstellungen', 'Einstellungen', '#/verwaltung/einstellungen'], ['links', 'Links', '#/verwaltung/links'], S.user.role === 'admin' && ['auswahl', 'Angebotsauswahl', '#/verwaltung/auswahl'], can('settings_all') && ['postausgang', 'Postausgang', '#/verwaltung/postausgang'], can('settings_all') && ['system', 'System', '#/verwaltung/system']];
const admHead = (tab) => html`${head('Verwaltung', 'Mitarbeiterkonten, Rollen, Einstellungen und Links.')}${tabsBar(ADM_TABS(), tab)}`;
async function pageAdmin(tab) {
  const P = page('verwaltung');
  const tabs = ADM_TABS().filter(Boolean);
  if (!tab) tab = tabs[0][0];
  if (!tabs.some((t) => t[0] === tab)) return P.show(noAccess());
  await ({ mitarbeiter: admUsers, rollen: admRoles, einstellungen: admSettings, links: admLinks, postausgang: admOutbox, system: admSystem, auswahl: admScoring }[tab])(P, tab);
}
const creatableRoles = () => can('users_admin') ? Object.keys(S.config.roles) : can('users_create') ? ['teamleitung', 'vertrieb', 'buchhaltung'] : can('users_create_vt') ? ['vertrieb'] : [];
async function admUsers(P, tab) {
  const d = await GET('/users'); if (!P.alive()) return;
  S.users = d.users;
  const manageable = (u) => can('users_admin') || (can('users_create') && (S.config.roles[u.role_key] || {}).rank < 80) || (can('users_create_vt') && u.role_key === 'vertrieb');
  P.show(html`${admHead(tab)}<section class="panel mt"><div class="toolbar"><span class="small muted">${plural(d.users.filter((u) => u.active).length, 'aktives Konto', 'aktive Konten')}</span><span class="spacer"></span>${creatableRoles().length ? html`<button class="btn btn-sm btn-primary" data-act="userNew">${icon('plus')}Mitarbeiter anlegen</button>` : ''}</div>
    <div class="table-wrap"><table class="table"><thead><tr><th>Name</th><th>Rolle</th><th>Abteilung</th><th>Sonderrechte</th><th>Letzte Anmeldung</th><th>Status</th><th></th></tr></thead><tbody>
      ${d.users.map((u) => html`<tr class="${u.active ? '' : 'muted'}"><td><b>${u.name}</b><span class="cell-sub">${u.email}</span></td><td>${roleLabel(u.role_key)}</td><td>${u.department || '–'}</td>
        <td class="small">${u.extra_perms.length ? html`+ ${u.extra_perms.length}` : ''}${u.revoked_perms.length ? html` − ${u.revoked_perms.length}` : ''}${!u.extra_perms.length && !u.revoked_perms.length ? html`<span class="muted">–</span>` : ''}</td>
        <td>${u.last_login ? fDT(u.last_login) : html`<span class="muted">nie</span>`}</td><td>${!u.active ? badge('Deaktiviert', 'muted') : u.locked ? badge('Gesperrt', 'err') : u.pending ? badge('Einladung offen', 'warn') : badge('Aktiv', 'ok')}</td>
        <td class="r nowrap">${manageable(u) ? html`<button class="btn btn-sm btn-ghost" data-act="userEdit" data-id="${u.id}">Bearbeiten</button>` : ''}${u.pending && manageable(u) ? html`<button class="btn btn-sm btn-ghost" data-act="userInvite" data-id="${u.id}">Einladung</button>` : ''}</td></tr>`)}</tbody></table></div></section>`);
}
ACT.userNew = async () => {
  const d = await ask({ title: 'Mitarbeiter anlegen', text: 'Der Mitarbeiter erhält eine Einladung per E-Mail (noreplay@) und legt sein Passwort selbst fest. Die Freigabe erfolgt automatisch.', ok: 'Anlegen und einladen',
    fields: html`${field('Name', inp('name', '', { req: true }))}${field('E-Mail', inp('email', '', { type: 'email', req: true }))}${field('Rolle', sel('role_key', creatableRoles().map((k) => [k, roleLabel(k)]), creatableRoles().slice(-1)[0] === 'buchhaltung' ? 'vertrieb' : creatableRoles()[0]))}
      <div class="grid-2">${field('Abteilung', inp('department'))}${field('Telefon', inp('phone'))}</div>` });
  if (!d) return; delete d._form;
  const r = await POST('/users', d);
  toast(r.mail === 'gesendet' ? 'Mitarbeiter angelegt, Einladung versendet.' : 'Angelegt. E-Mail-Dienst nicht eingerichtet – Link kopieren.', r.mail === 'gesendet' ? 'ok' : 'err');
  if (r.mail !== 'gesendet') showLink('Einladungslink', r.invite);
  reload();
};
ACT.userInvite = async (b) => { const r = await POST(`/users/${b.dataset.id}/invite`); toast(r.mail === 'gesendet' ? 'Einladung erneut versendet.' : 'E-Mail nicht versendet.'); if (r.mail !== 'gesendet') showLink('Einladungslink', r.invite); };
function permChecks(name, selected, disabled = false) {
  const groups = {}; for (const p of S.config.permissions) (groups[p.group] = groups[p.group] || []).push(p);
  return html`${Object.entries(groups).map(([g, ps]) => html`<div class="perm-group"><h4>${g}</h4><div class="perm-grid">${ps.map((p) => html`<label class="check"><input type="checkbox" name="${name}[]" value="${p.key}" ${selected.includes(p.key) ? raw('checked') : ''} ${disabled ? raw('disabled') : ''}><span>${p.label}</span></label>`)}</div></div>`)}`;
}
ACT.userEdit = async (b) => {
  const u = S.users.find((x) => x.id === +b.dataset.id);
  const self = u.id === S.user.id;
  const roles = can('users_admin') ? Object.keys(S.config.roles) : can('users_create') ? ['teamleitung', 'vertrieb', 'buchhaltung'] : ['vertrieb'];
  modal({ title: u.name, wide: true, body: html`<form class="stack" data-submit="userSave" id="userForm"><input type="hidden" name="id" value="${u.id}">
    <div class="grid-2">${field('Name', inp('name', u.name, { req: true }))}${field('Rolle', sel('role_key', roles.map((k) => [k, roleLabel(k)]), u.role_key))}${field('Abteilung', inp('department', u.department))}${field('Telefon', inp('phone', u.phone))}</div>
    ${can('users_perms') ? html`<fieldset><legend>Sonderrechte zusätzlich zur Rolle</legend><p class="small muted">Nur der Admin kann einzelnen Mitarbeitern Rechte geben oder entziehen.</p>${permChecks('extra', u.extra_perms)}</fieldset>
      <fieldset><legend>Rechte entziehen</legend>${permChecks('revoked', u.revoked_perms)}</fieldset>` : ''}</form>
    ${can('users_admin') && !self ? html`<hr class="sep"><div class="row"><button class="btn btn-sm" data-act="userReset" data-id="${u.id}">${icon('key')}Passwort zurücksetzen</button>
      <button class="btn btn-sm" data-act="userLock" data-id="${u.id}" data-locked="${u.locked ? 1 : 0}">${u.locked ? 'Entsperren' : 'Sperren'}</button><button class="btn btn-sm" data-act="userActive" data-id="${u.id}" data-active="${u.active ? 1 : 0}">${u.active ? 'Deaktivieren' : 'Aktivieren'}</button>
      <span class="spacer"></span><button class="btn btn-sm btn-danger" data-act="userDelete" data-id="${u.id}">${icon('trash')}Konto löschen</button></div>` : ''}`,
    foot: html`<button class="btn btn-ghost" data-close>Abbrechen</button><button class="btn btn-primary" type="submit" form="userForm">Speichern</button>` });
};
SUBMIT.userSave = async (d) => {
  const u = S.users.find((x) => x.id === +d.id);
  const body = { name: d.name, department: d.department, phone: d.phone };
  if (d.role_key !== u.role_key) body.role_key = d.role_key;
  if (can('users_perms')) { body.extra_perms = d.extra || []; body.revoked_perms = d.revoked || []; }
  await PATCH('/users/' + d.id, body); closeModal(); toast('Gespeichert.'); reload();
};
ACT.userReset = async (b) => {
  const d = await ask({ title: 'Passwort zurücksetzen', ok: 'Senden', fields: html`<div class="stack-s"><label class="check"><input type="radio" name="mode" value="link" checked><span><b>Link senden</b> – neues Passwort selbst festlegen</span></label>
    <label class="check"><input type="radio" name="mode" value="temp"><span><b>Vorläufiges Passwort</b> – muss bei der Anmeldung geändert werden</span></label></div>${field('Vorläufiges Passwort', inp('password', '', { attrs: 'minlength="10" autocomplete="off"' }), PW_HINT)}` });
  if (!d) return; if (d.mode === 'temp' && !d.password) throw new Error('Bitte lege das vorläufige Passwort fest.');
  const r = await POST(`/users/${b.dataset.id}/reset`, { mode: d.mode, password: d.password });
  toast(r.mail === 'gesendet' ? 'Per E-Mail versendet.' : 'Gespeichert, E-Mail nicht versendet.', r.mail === 'gesendet' ? 'ok' : 'err');
  if (r.invite && r.mail !== 'gesendet') showLink('Link zum neuen Passwort', r.invite);
};
ACT.userLock = async (b) => { const lock = b.dataset.locked !== '1'; if (lock && !(await confirmBox('Konto sperren?', 'Der Mitarbeiter wird sofort abgemeldet.', 'Sperren', true))) return; await PATCH('/users/' + b.dataset.id, { locked: lock }); closeModal(); reload(); };
ACT.userActive = async (b) => { await PATCH('/users/' + b.dataset.id, { active: b.dataset.active !== '1' }); closeModal(); reload(); };
ACT.userDelete = async (b) => { if (!(await confirmBox('Konto löschen?', 'Das Konto wird dauerhaft deaktiviert, die E-Mail-Adresse wird frei.', 'Löschen', true))) return; await DEL('/users/' + b.dataset.id); closeModal(); toast('Konto gelöscht.'); reload(); };

async function admRoles(P, tab) {
  const d = await GET('/roles'); if (!P.alive()) return;
  const keys = Object.keys(S.config.roles);
  const roles = Object.fromEntries(d.roles.map((r) => [r.key, r.perms]));
  const edit = can('users_perms');
  P.show(html`${admHead(tab)}<section class="panel mt"><div class="panel-head"><h2>Rechte je Rolle</h2>${edit ? html`<button class="btn btn-sm btn-primary" type="submit" form="rolesForm">Speichern</button>` : html`<span class="small muted">${icon('lock')} Änderungen nur durch den Admin</span>`}</div>
    <form id="rolesForm" data-submit="rolesSave"><div class="table-wrap"><table class="table matrix"><thead><tr><th>Recht</th>${keys.map((k) => html`<th>${roleLabel(k)}</th>`)}</tr></thead><tbody>
      ${S.config.permissions.map((p, i) => html`${i === 0 || S.config.permissions[i - 1].group !== p.group ? html`<tr><td colspan="${keys.length + 1}" class="strong">${p.group}</td></tr>` : ''}<tr><td class="small">${p.label}</td>${keys.map((k) => html`<td><input type="checkbox" name="${k}[]" value="${p.key}" aria-label="${roleLabel(k)}: ${p.label}" ${k === 'admin' || (roles[k] || []).includes(p.key) ? raw('checked') : ''} ${!edit || k === 'admin' ? raw('disabled') : ''}></td>`)}</tr>`)}</tbody></table></div></form>
    <div class="panel-body small muted">Übergeordnete Rollen enthalten die Rechte der untergeordneten. Der Admin hat immer alle Rechte. Einzelne Sonderrechte vergibst du beim jeweiligen Mitarbeiter.</div></section>`);
}
SUBMIT.rolesSave = async (d) => { for (const k of Object.keys(S.config.roles)) if (k !== 'admin') await PATCH('/roles/' + k, { perms: d[k] || [] }); toast('Rollen gespeichert.'); await loadSession(); reload(); };

const SET_GROUPS = [
  ['Firma (Rechnungssteller)', 'company_', { company_name: 'Firmenname', company_street: 'Straße', company_zip: 'PLZ', company_city: 'Ort', company_country: 'Land', company_email: 'E-Mail', company_phone: 'Telefon', company_web: 'Webseite', company_tax_no: 'Steuernummer', company_vat_id: 'USt-IdNr.', company_owners: 'Gesellschafter / Inhaber', company_register: 'Register', company_bank: 'Bank', company_iban: 'IBAN', company_bic: 'BIC' }],
  ['E-Mail-Absender', 'mail_', { mail_from_invoice: 'Rechnungen, Mahnungen (Buchhaltung)', mail_from_system: 'System, Einladungen, Konten', mail_from_partner: 'Anfragetool an Partner', mail_from_support: 'Support an Partner und Kunden', mail_from_customer: 'Nachrichten zu Anfragen an Kunden', mail_sender_name: 'Absendername', mail_internal_inbox: 'Postfach Vermittlung (Antworten)', mail_support_inbox: 'Postfach Support' }],
  ['Anfragen und Fristen', '', { offer_window_hours: 'Angebotsfrist (Werktags-Stunden)', lock_hours: 'Bearbeitungssperre ohne Angebot (Stunden)', contact_window_hours: 'Kontaktfrist nach Zusage (Werktags-Stunden)', presented_count: 'Anzahl vorgestellter Angebote', show_partner_identity: 'Kunde sieht Firmendaten des Partners schon vor der Zusage', review_before_present: 'Angebote vor dem Vorstellen intern prüfen', radius_options: 'Umkreis-Auswahl für Kunden (km, 0 = bundesweit)', radius_default: 'Standard-Umkreis (km)', score_weight_price: 'Gewichtung Preis bei der Auswertung (%)', feedback_delay_hours: 'Rückfrage beim Kunden nach (Stunden)', survey_delay_days: 'Kundenumfrage nach (Tagen)' }],
  ['Buchhaltung', '', { lead_price_deal: 'Preis je Vermittlung Traumwagen-DEAL (netto)', lead_price_sell: 'Preis je Vermittlung Fahrzeugankauf (netto)', vat_enabled: 'Umsatzsteuer ausweisen', vat_rate: 'USt-Satz (%)', payment_terms_days: 'Zahlungsziel (Tage) – Standard für neue Partner', reminder_due_days: 'Frist in der Zahlungserinnerung (Tage, kostenlos)', dunning_fee_1: 'Mahngebühr 1. Mahnung / Stufe 1 (€)', dunning_due_days: 'Frist in der 1. Mahnung (Tage)', dunning_fee_2: 'Mahngebühr 2. Mahnung / Stufe 2 (€)', dunning_due_days_2: 'Frist in der 2. Mahnung (Tage)', dunning_auto: 'Mahnungen automatisch versenden', dunning_days_1: 'Zahlungserinnerung … Tage nach Fälligkeit', dunning_days_2: '1. Mahnung … Tage nach Ablauf der Erinnerungsfrist', dunning_days_3: '2. Mahnung … Tage nach Ablauf der Frist der 1. Mahnung', invoice_prefix: 'Präfix Rechnungsnummer', invoice_next: 'Nächste Rechnungsnummer', invoice_intro: 'Einleitung auf Rechnungen', invoice_footer: 'Hinweis unter Rechnungen', monthly_run_day: 'Sammelrechnungen am (last = Monatsletzter)', monthly_run_hour: 'Sammelrechnungen um (Uhr)', day_close_time: 'Tagesabschluss um (HH:MM)' }],
  ['Support', '', { support_escalate_hours: 'Priorität „Hoch“ nach (Stunden)', support_archive_days: 'Erledigte Tickets ins Backup-Archiv nach (Tagen)', syslist_retention_days: 'System-Fehlerliste aufbewahren (Tage)', support_ack_subject: 'Betreff Eingangsbestätigung', support_ack_text: 'Text Eingangsbestätigung' }],
  ['System und Backup', '', { audit_retention_days: 'Protokoll im System (Tage)', backup_keep: 'Anzahl aufbewahrter Backups', backup_hour: 'Backup um (Stunde)', backup_minute: 'Backup um (Minute)', backup_webhook_url: 'Cloud-Upload (Webhook-URL, optional)' }],
  ['Links', 'link_', { link_public: 'Öffentliche Adresse des Systems', link_staff: 'Startseite internes Dashboard', link_partner: 'Startseite Partner-Dashboard', link_shopify_admin: 'Shopify-Admin', link_shop: 'Webshop', link_instagram: 'Instagram', link_agb_partner: 'AGB für Partner', link_privacy: 'Datenschutzerklärung', link_my_requests: 'Seite „Meine Anfragen“ im Shop' }]
];
async function admSettings(P, tab) {
  const d = await GET('/settings'); if (!P.alive()) return;
  const keys = d.editable, s = d.settings;
  const input = (k, label) => { const v = s[k]; const long = /intro|footer|ack_text/.test(k);
    if (typeof v === 'boolean') return html`<div class="field">${chk(k, v, label)}</div>`;
    if (Array.isArray(v)) return field(label, inp(k, v.join(', ')));
    if (long) return html`<div class="span-2">${field(label, area(k, v, { rows: 3 }))}</div>`;
    return field(label, inp(k, v, { type: typeof v === 'number' ? 'text' : /^mail_from|_email|_inbox$/.test(k) ? 'email' : 'text', attrs: typeof v === 'number' ? 'inputmode="decimal"' : '' })); };
  const groups = SET_GROUPS.map(([title, , labels]) => [title, Object.entries(labels).filter(([k]) => keys.includes(k))]).filter(([, l]) => l.length);
  P.show(html`${admHead(tab)}${d.env ? html`<section class="panel mt"><div class="panel-head"><h2>E-Mail-Versand</h2>${d.env.mail ? badge(d.env.mail === 'smtp' ? `aktiv über Postfach ${d.env.smtpUser}` : 'aktiv über Brevo', 'ok') : badge('nicht eingerichtet', 'err')}</div>
      <div class="panel-body stack">${d.env.mail ? html`<div class="row-between"><p class="small muted">Einladungen, Rechnungen, Mahnungen, Anfragen und Support-Mails werden automatisch versendet${d.env.smtpSource === 'dashboard' ? ' – Postfach-Zugang hier im Dashboard hinterlegt (verschlüsselt gespeichert)' : d.env.smtpSource === 'cloudflare' ? ' – Postfach-Zugang aus den Cloudflare-Secrets' : ''}. Jede E-Mail steht zusätzlich im Postausgang.</p>
          <div class="row"><button class="btn btn-sm" type="button" data-act="mailCredEdit" data-user="${d.env.smtpUser || ''}">${icon('key')}Zugang ändern</button>${d.env.smtpSource === 'dashboard' ? html`<button class="btn btn-sm btn-ghost" type="button" data-act="mailCredDel">Entfernen</button>` : ''}</div></div>`
        : mailCredForm()}
        <form class="inline-form" data-submit="mailTest">${field('Test-E-Mail senden an', inp('to', S.user.email, { type: 'email', req: true }))}${field('Absender', sel('category', Object.entries(S.config.mailCategories).filter(([k]) => k !== 'internal').map(([k, v]) => [k, v.label]), 'system'))}<button class="btn btn-dark" type="submit">${icon('send')}Test senden</button></form></div></section>
    <section class="panel mt"><div class="panel-head"><h2>Verbindungen</h2></div><div class="panel-body row">${[['r2', 'Dateispeicher (R2)'], ['shopify', 'Shopify-Statistik'], ['oldDb', 'Alte Datenbank (Import)']].map(([k, l]) => badge(`${l}: ${d.env[k] ? 'verbunden' : 'nicht eingerichtet'}`, d.env[k] ? 'ok' : 'muted'))}</div></section>` : ''}
    <form class="stack mt" data-submit="settingsSave">${groups.map(([title, list]) => html`<section class="panel"><div class="panel-head"><h2>${title}</h2><button class="btn btn-sm btn-dark" type="submit">Speichern</button></div><div class="panel-body grid-2">${list.map(([k, l]) => input(k, l))}</div></section>`)}</form>
    ${isAdmin() ? html`<section class="panel mt"><div class="panel-head"><h2>Bereichspasswort (Protokoll und Backup)</h2></div><form class="panel-body inline-form" data-submit="areaPw">
      ${field('Aktuelles Bereichspasswort', inp('current', '', { type: 'password', req: true, attrs: 'autocomplete="off"' }))}${field('Neues Bereichspasswort', inp('next', '', { type: 'password', req: true, attrs: 'minlength="10" autocomplete="new-password"' }))}<button class="btn btn-dark" type="submit">Ändern</button></form></section>` : ''}`);
  S.settingsTypes = s;
}
SUBMIT.mailTest = async (d) => { const r = await POST('/mail/test', d); if (r.status === 'gesendet') toast(`Test-E-Mail an ${d.to} gesendet.`); else toast(r.error ? `Nicht gesendet: ${r.error}` : 'Kein E-Mail-Versand eingerichtet – die E-Mail liegt nur im Postausgang.', 'err'); };
SUBMIT.settingsSave = async (d) => {
  const out = {}; for (const [k, v] of Object.entries(d)) { if (!(k in S.settingsTypes)) continue; const t = S.settingsTypes[k]; out[k] = typeof t === 'number' ? String(v).replace(',', '.') : v; }
  await PATCH('/settings', out); toast('Einstellungen gespeichert.'); reload();
};
SUBMIT.areaPw = async (d, f) => { await POST('/settings/area-password', d); f.reset(); toast('Bereichspasswort geändert.'); };

async function admLinks(P, tab) {
  const d = await GET('/links'); if (!P.alive()) return;
  const canSend = canAny('users_create', 'users_create_vt', 'partner_manage');
  const row = (label, link, which, text) => html`<div class="asg"><div class="asg-head"><div><b>${label}</b><div class="asg-meta">${text}</div></div></div><div class="row"><input value="${link}" readonly aria-label="${label}"><button class="btn btn-sm" data-act="copy" data-text="${link}">Kopieren</button><a class="btn btn-sm btn-ghost" href="${link}" target="_blank" rel="noopener">${icon('external')}Öffnen</a></div>
    ${canSend && which ? html`<form class="inline-form mt" data-submit="linkSend"><input type="hidden" name="which" value="${which}">${field('Link senden an', inp('email', '', { type: 'email', req: true, ph: 'name@beispiel.de' }))}<button class="btn btn-sm btn-dark" type="submit">${icon('send')}Senden</button></form>` : ''}</div>`;
  P.show(html`${admHead(tab)}<section class="panel mt">${row('Internes Dashboard', d.staff, 'staff', 'Für neue Mitarbeiter der KFL GbR.')}${row('Partner-Dashboard', d.partner, 'partner', 'Für Geschäftspartner – Anmeldung mit E-Mail und Passwort.')}
    ${d.shopify ? row('Shopify-Admin', d.shopify, null, 'Nur für Admin und Geschäftsführung sichtbar.') : ''}</section>`);
}
SUBMIT.linkSend = async (d, f) => { const r = await POST('/links/send', d); f.reset(); toast(r.mail === 'gesendet' ? 'Link versendet.' : 'Im Postausgang gespeichert (E-Mail-Dienst fehlt).'); };

// Postfach-Zugang direkt im Dashboard hinterlegen (wird bei IONOS geprüft, verschlüsselt gespeichert)
function mailCredForm(user = 'noreplay@kfl-group.com') {
  return html`<div class="err-box">${icon('alert')}<span><b>E-Mail-Versand ist noch nicht eingerichtet.</b> Trage hier einmal den Zugang zum IONOS-Postfach ein. Das System prüft die Anmeldung bei IONOS sofort und speichert das Passwort verschlüsselt – danach gehen Rechnungen, Einladungen und alle Benachrichtigungen automatisch raus.</span></div>
    <form class="inline-form" data-submit="mailCred" autocomplete="off">${field('Postfach (E-Mail-Adresse)', inp('user', user, { type: 'email', req: true, attrs: 'autocomplete="off"' }))}${field('Passwort des Postfachs', inp('pass', '', { type: 'password', req: true, attrs: 'autocomplete="new-password"' }))}<button class="btn btn-primary" type="submit">${icon('check')}Prüfen und speichern</button></form>`;
}
SUBMIT.mailCred = async (d, f) => { const r = await POST('/mail/credentials', { user: d.user, pass: d.pass }); f.reset(); closeModal(); S.mailReady = true; toast(`Verbunden: E-Mails werden ab sofort über ${r.user} versendet.`); reload(); };
ACT.mailCredEdit = (b) => modal({ title: 'Postfach-Zugang ändern', body: html`<p class="small muted">Neue Zugangsdaten werden zuerst bei IONOS geprüft. Erst wenn die Anmeldung klappt, werden sie gespeichert.</p><form class="stack mt" data-submit="mailCred" autocomplete="off">${field('Postfach (E-Mail-Adresse)', inp('user', b.dataset.user || 'noreplay@kfl-group.com', { type: 'email', req: true }))}${field('Passwort des Postfachs', inp('pass', '', { type: 'password', req: true, attrs: 'autocomplete="new-password"' }))}<button class="btn btn-primary" type="submit">${icon('check')}Prüfen und speichern</button></form>` });
ACT.mailCredDel = async () => { if (!(await confirmBox('Postfach-Zugang entfernen?', 'Danach werden keine E-Mails mehr versendet, bis ein neuer Zugang hinterlegt ist.', 'Entfernen', true))) return; await DEL('/mail/credentials'); toast('Zugang entfernt.'); reload(); };
// Prüfliste: was dem Worker für den E-Mail-Versand fehlt (nur Namen, keine Werte)
function mailSetupHelp(c) {
  const row = (ok, name, hint) => html`<li class="row">${badge(ok ? 'gefunden' : 'fehlt', ok ? 'ok' : 'err')}<code>${name}</code><span class="small muted">${hint}</span></li>`;
  return html`<div class="err-box">${icon('alert')}<span><b>Der Worker findet keinen Postfach-Zugang.</b> Ohne diese zwei Secrets kann das System keine E-Mails versenden (Rechnungen, Einladungen, Benachrichtigungen).</span></div>
    <ul class="stack-s checklist">${row(c.user, 'SMTP_USER', 'Wert: noreplay@kfl-group.com')}${row(c.pass, 'SMTP_PASS', 'Wert: Passwort des IONOS-Postfachs noreplay@kfl-group.com')}</ul>
    ${c.similar && c.similar.length ? html`<div class="note-box">${icon('alert')}<span>Gefunden, aber falsch benannt: <b>${c.similar.join(', ')}</b>. Die Namen müssen exakt <code>SMTP_USER</code> und <code>SMTP_PASS</code> lauten (Großbuchstaben, Unterstrich, keine Leerzeichen).</span></div>` : ''}
    <div class="info-box">${icon('key')}<span><b>So richtest du es ein:</b> Cloudflare → Workers &amp; Pages → <b>tiny-lab-d971kfl-forms</b> → <b>Einstellungen</b> → <b>Variablen und Secrets</b> (nicht unter „Build“) → <b>Hinzufügen</b> → Typ <b>Secret</b> → Name und Wert eintragen → <b>Bereitstellen</b>. Danach diese Seite neu laden: Beide Einträge stehen dann auf „gefunden“. Server: ${c.host}, Port ${c.port} (STARTTLS).</span></div>`;
}
/* ---------- Angebotsauswahl: Gewichtung der Faktoren (nur Admin, Freigabepasswort) ---------- */
async function admScoring(P, tab) {
  const d = await GET('/scoring'); if (!P.alive()) return;
  const sum = Object.values(d.weights).reduce((a, b) => a + (+b || 0), 0);
  P.show(html`${admHead(tab)}<div class="detail-grid mt"><form class="panel" data-submit="scoringSave" id="scoringForm" autocomplete="off">
      <div class="panel-head"><h2>Nach welchen Faktoren werden Angebote ausgewählt?</h2><span class="sum-pill ${sum === 100 ? 'ok' : 'bad'}" id="scoreSum">Summe ${sum} %</span></div>
      <div class="panel-body stack">
        <p class="small muted">Jedes Angebot erhält je Faktor 0–100 Punkte. Die Gewichtung bestimmt, wie stark der Faktor zählt. Faktoren, die bei einer Anfrage nicht zutreffen (z. B. Laufzeit beim Kauf oder Zusatzprodukte, die der Kunde nicht wollte), werden automatisch herausgerechnet.</p>
        ${d.factors.map((f, i) => html`<div class="score-row"><div class="score-l"><b><i class="dot sc-${i}"></i> ${f.label}</b><span class="small muted">${f.hint}</span></div>
          <input type="range" min="0" max="100" step="1" value="${d.weights[f.key]}" data-score="${f.key}" aria-label="${f.label}">
          <label class="score-v"><input type="number" min="0" max="100" step="1" name="w_${f.key}" value="${d.weights[f.key]}" data-score-num="${f.key}" inputmode="numeric" aria-label="${f.label} in Prozent"><span>%</span></label></div>`)}
        <div class="score-bar" id="scoreBar">${d.factors.map((f, i) => html`<i class="sc-${i}" data-w="${d.weights[f.key]}" title="${f.label}: ${d.weights[f.key]} %"></i>`)}</div>
        <div class="grid-2">${field('Anzahl Angebote, die der Kunde sieht', sel('presented_count', [['3', 'Die 3 besten Angebote'], ['2', 'Die 2 besten Angebote'], ['1', 'Nur das beste Angebot']], String(d.presented_count)), 'Sind weniger Angebote eingegangen, sieht der Kunde alle.')}
          ${field('Freigabepasswort', inp('password', '', { type: 'password', req: true, attrs: 'autocomplete="off"' }), 'Zum Speichern erforderlich')}</div>
        <div class="row"><button class="btn btn-primary" type="submit" id="scoreSave" ${sum === 100 ? '' : raw('disabled')}>${icon('check')}Gewichtung speichern</button><button class="btn btn-ghost" type="button" data-act="scoringEven">Gleichmäßig verteilen</button><span class="small muted" id="scoreHint">${sum === 100 ? '' : 'Die Faktoren müssen zusammen genau 100 % ergeben.'}</span></div></div></form>
    <div class="stack"><section class="panel"><div class="panel-head"><h2>So funktioniert die Auswahl</h2></div><div class="panel-body stack-s small">
      <p>1. Nach Ablauf der Angebotsfrist bewertet das System alle eingegangenen Angebote.</p><p>2. Die ${d.presented_count} besten Angebote werden dem Kunden unter „Meine Anfragen“ vorgestellt – sortiert nach Punkten, das beste zuerst.</p>
      <p>3. Der Kunde wählt eines mit „Interessiert mich“; die anderen Partner werden informiert.</p>${d.review_before_present ? html`<p class="note-box">${icon('eye')}<span>Angebote werden vor dem Vorstellen intern geprüft (Einstellung „Angebote vor dem Vorstellen intern prüfen“).</span></p>` : ''}
      <p class="muted">Die Punkte je Faktor siehst du bei jeder Anfrage am Angebot.</p></div></section>
      <section class="panel"><div class="panel-head"><h2>Letzte Änderungen</h2></div><div class="panel-body">${d.history.length ? html`<ul class="timeline">${d.history.map((h) => html`<li><div><div class="tl-meta">${h.author || 'Admin'} · ${fDT(h.at)}</div><div class="small">${d.factors.map((f) => `${f.label.split(' ')[0]} ${h.detail['score_w_' + f.key]} %`).join(' · ')} · ${h.detail.presented_count} Angebot(e)</div></div></li>`)}</ul>` : html`<p class="small muted">Noch keine Änderungen – es gelten die Startwerte.</p>`}</div></section></div></div>`);
}
function scoringSync(key, val) {
  const f = $('#scoringForm'); if (!f) return;
  val = Math.max(0, Math.min(100, Math.round(+val || 0)));
  const r = f.querySelector(`[data-score="${key}"]`), n = f.querySelector(`[data-score-num="${key}"]`);
  if (r && +r.value !== val) r.value = val; if (n && +n.value !== val) n.value = val;
  const vals = $$('[data-score-num]', f).map((x) => Math.max(0, Math.round(+x.value || 0))), sum = vals.reduce((a, b) => a + b, 0);
  const pill = $('#scoreSum'); pill.textContent = `Summe ${sum} %`; pill.className = 'sum-pill ' + (sum === 100 ? 'ok' : 'bad');
  $('#scoreSave').disabled = sum !== 100; $('#scoreHint').textContent = sum === 100 ? '' : sum > 100 ? `${sum - 100} % zu viel – bitte reduzieren.` : `Noch ${100 - sum} % verteilen.`;
  $$('#scoreBar i').forEach((el, i) => { el.style.width = (sum ? (vals[i] / Math.max(100, sum)) * 100 : 0) + '%'; });
}
document.addEventListener('input', (e) => { const t = e.target; if (t.dataset && (t.dataset.score || t.dataset.scoreNum)) scoringSync(t.dataset.score || t.dataset.scoreNum, t.value); });
ACT.scoringEven = () => { const keys = $$('[data-score-num]').map((x) => x.dataset.scoreNum); const base = Math.floor(100 / keys.length); keys.forEach((k, i) => scoringSync(k, base + (i < 100 - base * keys.length ? 1 : 0))); };
SUBMIT.scoringSave = async (d, f) => {
  const weights = {}; for (const k of Object.keys(d)) if (k.startsWith('w_')) weights[k.slice(2)] = +d[k];
  await POST('/scoring', { weights, presented_count: +d.presented_count, password: d.password });
  f.elements.password.value = ''; toast('Gewichtung gespeichert – gilt für alle neuen Auswertungen.'); reload();
};
async function admOutbox(P, tab) {
  const d = await GET('/outbox'); if (!P.alive()) return;
  const ST = { gesendet: 'ok', fehler: 'err', nicht_konfiguriert: 'warn' };
  P.show(html`${admHead(tab)}<section class="panel mt"><div class="panel-head"><h2>Letzte 200 E-Mails</h2><span class="small muted">Jede E-Mail wird hier protokolliert – auch wenn der Versand fehlschlägt.</span></div>
    ${d.mails.length ? html`<div class="table-wrap"><table class="table"><thead><tr><th>Zeit</th><th>Absender</th><th>Empfänger</th><th>Betreff</th><th>Status</th><th></th></tr></thead><tbody>${d.mails.map((m) => html`<tr><td class="nowrap">${fDT(m.created_at)}</td><td class="small">${m.sender}</td><td class="small">${m.recipient}</td><td>${m.subject}</td><td>${badge(m.status, ST[m.status] || 'neutral')}${m.error ? html`<span class="cell-sub">${m.error}</span>` : ''}${m.server_reply ? html`<span class="cell-sub" title="Antwort des Mailservers">Server: ${m.server_reply}</span>` : ''}</td><td class="r"><a class="btn btn-sm btn-ghost" target="_blank" rel="noopener" href="${fileUrl('/outbox/' + m.id)}">Ansehen</a></td></tr>`)}</tbody></table></div>` : html`<div class="panel-body">${empty('Noch keine E-Mails')}</div>`}</section>`);
}
async function admSystem(P, tab) {
  P.show(html`${admHead(tab)}<div class="grid-2 mt">
    <section class="panel"><div class="panel-head"><h2>Zeitgesteuerte Abläufe</h2></div><div class="panel-body stack-s"><p class="small muted">Laufen automatisch alle 5 Minuten. Hier kannst du einzelne Abläufe sofort starten.</p>
      ${[['anfragen', 'Fristen und Auswertung der Anfragen'], ['support', 'Support: Eskalation und Archiv'], ['mahnung', 'Automatische Mahnungen'], ['tagesabschluss', 'Tagesabschluss (Zahlungsliste)'], ['monat', 'Sammelrechnungen'], ['backup', 'Backup']].map(([k, l]) => html`<div class="row-between"><span>${l}</span><button class="btn btn-sm" data-act="jobRun" data-job="${k}">Jetzt ausführen</button></div>`)}</div></section>
    <section class="panel"><div class="panel-head"><h2>Postleitzahlen importieren</h2></div><form class="panel-body stack" data-submit="geoImport"><p class="small muted">Optional: eigene Geodaten im Format <code>PLZ;Breite;Länge;Ort</code> je Zeile. Sonst werden Koordinaten automatisch ermittelt und zwischengespeichert.</p>${area('csv', '', { rows: 5, ph: '49451;52.5833;8.1167;Holdorf' })}<button class="btn" type="submit">Importieren</button></form></section>
    <section class="panel"><div class="panel-head"><h2>Daten aus dem alten Dashboard</h2></div><div class="panel-body stack-s"><p class="small muted">Übernimmt Anfragen, Notizen und Support-Fälle aus der bisherigen Datenbank (Binding OLD_DB). Bereits übernommene Datensätze werden übersprungen.</p><button class="btn" data-act="importOld">Import starten</button></div></section></div>`);
}
ACT.jobRun = async (b) => { const r = await POST('/jobs/run', { job: b.dataset.job }); toast('Ausgeführt.'); console.log(r.result); };
SUBMIT.geoImport = async (d) => { const r = await POST('/geo/import', d); toast(`${r.imported} Postleitzahlen importiert.`); };
ACT.importOld = async () => { if (!(await confirmBox('Altdaten importieren?', 'Der Import kann einige Sekunden dauern.', 'Import starten'))) return; const r = await POST('/import-old'); toast(`Importiert: ${Object.entries(r).filter(([k]) => k !== 'ok').map(([k, v]) => `${v} ${k}`).join(', ')}.`); };
