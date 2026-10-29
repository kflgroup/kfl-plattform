/* ===== Internes Dashboard: Grundgerüst, Anmeldung, Navigation ===== */
App.base = '/api';
const S = { user: null, config: {}, kpis: {}, unread: 0, lastHash: null };
const can = (p) => !!S.user && S.user.perms.includes(p);
const canAny = (...ps) => ps.some(can);
const isAdmin = () => S.user && S.user.role === 'admin';
const RS = () => S.config.requestStatuses || [];
const AS = () => S.config.assignStatuses || [];
const roleLabel = (k) => ((S.config.roles || {})[k] || {}).label || k;
const typeLabel = (k) => ((S.config.requestTypes || {})[k] || {}).label || k;
const typeShort = (k) => ((S.config.requestTypes || {})[k] || {}).short || k;

const NAV = [
  { key: 'start', href: '#/', label: 'Cockpit', icon: 'home', group: 'Vertrieb' },
  { key: 'anfragen', href: '#/anfragen', label: 'Anfragen', icon: 'inbox', perm: ['req_view'], count: 'open', group: 'Vertrieb' },
  { key: 'partner', href: '#/partner', label: 'Geschäftspartner', icon: 'partner', perm: ['partner_view'], group: 'Vertrieb' },
  { key: 'statistik', href: '#/statistik', label: 'Statistik', icon: 'chart', perm: ['stats_view', 'team_stats', 'partner_stats'], group: 'Vertrieb' },
  { key: 'buchhaltung', href: '#/buchhaltung', label: 'Buchhaltung', icon: 'euro', perm: ['acc_view'], count: 'bill', group: 'Finanzen' },
  { key: 'fibu', href: '#/fibu', label: 'Finanzbuchhaltung', icon: 'file', perm: ['fibu_view'], group: 'Finanzen' },
  { key: 'support', href: '#/support', label: 'Support', icon: 'support', perm: ['support_view'], count: 'tickets', group: 'Kommunikation' },
  { key: 'news', href: '#/news', label: 'News & Chat', icon: 'news', count: 'unread', group: 'Kommunikation' },
  { key: 'verwaltung', href: '#/verwaltung', label: 'Verwaltung', icon: 'gear', perm: ['users_view', 'users_create', 'users_create_vt', 'users_admin', 'settings_all', 'acc_settings', 'links_view'], group: 'System' },
  { key: 'backup', href: '#/backup', label: 'Backup', icon: 'shield', perm: ['backup_view'], group: 'System' },
  { key: 'protokoll', href: '#/protokoll', label: 'Protokoll', icon: 'log', perm: ['audit_view'], group: 'System' }
];
const navVisible = (n) => !n.perm || n.perm.some(can);
const CRUMB = Object.fromEntries(NAV.map((n) => [n.key, n.label]));

function shell(active) {
  if (!$('#main')) {
    render('#root', html`<div class="shell">
      <aside class="side" id="side">
        <div class="side-brand"><a href="#/" class="logo-link" aria-label="Zum Cockpit">${LOGO}</a><span class="side-sub">Intern</span></div>
        <div id="scta"></div>
        <nav class="nav" id="nav" aria-label="Hauptnavigation"></nav>
        <div class="side-foot">${avatar(S.user.name, 'alt')}<div class="who"><b>${S.user.name}</b><span>${S.user.roleLabel}</span></div><div class="side-tools">
          <button class="icon-btn" data-act="myPassword" title="Passwort ändern" aria-label="Passwort ändern">${icon('key')}</button>
          <button class="icon-btn" data-act="newTicket" title="Support kontaktieren" aria-label="Support kontaktieren">${icon('support')}</button>
          <button class="icon-btn" data-act="logout" title="Abmelden" aria-label="Abmelden">${icon('logout')}</button></div></div>
      </aside>
      <div class="content">
        <header class="topbar" id="stop"><button class="icon-btn tb-menu" data-act="toggleNav" aria-label="Menü">${icon('menu')}</button><a href="#/" class="tb-logo" aria-label="Zum Cockpit">${LOGO}</a>
          <div class="tb-crumb" id="scrumb"></div>
          ${can('req_view') ? html`<form class="tb-search" data-submit="globalSearch" role="search"><label>${icon('search')}<input name="q" placeholder="Anfrage suchen: Nummer, Name, Marke, PLZ" aria-label="Anfragen durchsuchen" autocomplete="off"></label></form>` : html`<span class="spacer"></span>`}
          <span class="tb-chip">${icon('calendar')}${fDate(new Date())} · KW ${isoWeekOf().week}</span><span id="sbell"></span></header>
        <main class="main" id="main" tabindex="-1"></main></div></div>`);
  }
  S.active = active;
  renderNav();
  document.body.classList.remove('nav-open');
}
function renderNav() {
  const counts = { open: S.kpis.open, bill: S.kpis.bill, tickets: S.kpis.tickets, unread: S.unread };
  const hot = { open: S.kpis.notes > 0 || S.kpis.problems > 0, tickets: false, unread: S.unread > 0, bill: S.kpis.bill > 0 };
  let g = '';
  render('#nav', NAV.filter(navVisible).map((n) => { const h = n.group !== g ? html`<div class="nav-group">${n.group}</div>` : ''; g = n.group;
    return html`${h}<a href="${n.href}" class="${S.active === n.key ? 'on' : ''}" ${S.active === n.key ? raw('aria-current="page"') : ''}>${icon(n.icon)}<span>${n.label}</span>${n.count && counts[n.count] ? html`<span class="count ${hot[n.count] ? 'hot' : ''}">${counts[n.count] > 99 ? '99+' : counts[n.count]}</span>` : ''}</a>`; }));
  // Handlungsbedarf als klarer Einstieg oben in der Seitenleiste
  const todo = (S.kpis.problems || 0) + (S.kpis.notes || 0) + (S.kpis.spam || 0);
  render('#scta', can('req_view') && todo ? html`<a class="side-cta" href="#/">${icon('bolt')}<span>Jetzt handeln</span><span class="count">${todo}</span></a>` : '');
  render('#scrumb', html`<span>KFL</span><span class="sep">/</span><b>${CRUMB[S.active] || ''}</b>`);
  render('#sbell', html`<a class="tb-bell" href="#/news" aria-label="News${S.unread ? ` (${S.unread} ungelesen)` : ''}" title="News">${icon('bell')}${S.unread ? html`<span class="count">${S.unread > 99 ? '99+' : S.unread}</span>` : ''}</a>`);
}
SUBMIT.globalSearch = (d, f) => { const q = String(d.q || '').trim(); if (!q) return; f.reset(); const n = q.replace(/^#/, ''); location.hash = /^#\d{3,}$|^\d{4}$/.test(q) ? '#/anfragen/' + n : '#/anfragen' + qs({ view: 'alle', q }); };
window.addEventListener('scroll', () => { const t = $('#stop'); if (t) t.classList.toggle('scrolled', window.scrollY > 4); }, { passive: true });
ACT.toggleNav = () => document.body.classList.toggle('nav-open');

// Seitenwechsel: Ladezustand, Schutz gegen veraltete Antworten, Scrollposition bei Aktualisierung
let pageTok = 0;
function page(navKey) {
  shell(navKey);
  const soft = S.lastHash === location.hash;
  S.lastHash = location.hash;
  const t = ++pageTok, y = window.scrollY;
  if (!soft) { render('#main', loading()); window.scrollTo(0, 0); }
  return { alive: () => t === pageTok, show: (c) => { if (t !== pageTok) return; render('#main', c); if (soft) window.scrollTo(0, y); } };
}
const reload = () => Router.resolve();
const head = (title, sub, actions, crumb) => html`${crumb ? html`<a class="crumb" href="${crumb[0]}">${icon('back')}${crumb[1]}</a>` : ''}<div class="page-head"><div><h1>${title}</h1>${sub ? html`<p class="sub">${sub}</p>` : ''}</div>${actions ? html`<div class="actions">${actions}</div>` : ''}</div>`;
const tabsBar = (items, cur) => html`<div class="tabs" role="tablist">${items.filter(Boolean).map(([k, label, href, n]) => html`<a class="tab ${k === cur ? 'on' : ''}" href="${href}" role="tab" aria-selected="${k === cur}">${label}${n ? html`<span class="count">${n}</span>` : ''}</a>`)}</div>`;
const noAccess = () => html`${head('Kein Zugriff')}<div class="panel"><div class="panel-body">${empty('Dieser Bereich ist für deine Rolle nicht freigegeben.', 'Wende dich an die Administration, wenn du Zugriff brauchst.')}</div></div>`;
function setHashQuery(q, base) { const b = base || location.hash.split('?')[0]; const s = qs(q); if (b + s !== location.hash) location.hash = b + s; else reload(); }

/* ---------- Sitzung ---------- */
async function loadSession() {
  const s = await GET('/session');
  S.config = s.config; S.user = s.user; S.mailReady = s.mailReady !== false; App.config = s.config;
  return s;
}
async function refreshCounts() {
  if (!S.user) return;
  try {
    const d = await GET('/me/start');
    S.kpis = d.kpis || {};
    S.unread = (d.news.notifications || []).filter((n) => !n.read).length + (d.news.posts || []).filter((p) => !p.read).length + (d.chats || []).reduce((a, c) => a + (c.unread || 0), 0);
    S.start = d;
    if ($('#nav')) renderNav();
    return d;
  } catch (e) { return null; }
}
App.onAuth = () => { S.user = null; authScreen(); };
App.onPw = () => forcePasswordScreen();

/* ---------- Anmeldung ---------- */
function authFrame(inner) {
  render('#root', html`<div class="auth">
    <section class="auth-art"><div class="stripes" aria-hidden="true"><span></span><span></span><span></span></div>
      <div>${LOGO}</div>
      <div><h1>Jede Anfrage verdient den besten Deal.</h1><p>Das interne Dashboard der KFL GbR: Anfragen, Partner, Buchhaltung und Support an einem Ort.</p></div>
      <div class="foot">KFL GbR · Kaufen Finanzieren Leasen · ${new Date().getFullYear()}</div></section>
    <section class="auth-form">${inner}</section></div>`);
  const f = $('.auth-form input'); if (f) f.focus();
}
const supportHelp = () => html`<div class="auth-help">${icon('support')}<span>Probleme bei der Anmeldung?</span><span class="spacer"></span><button class="btn btn-sm" type="button" data-act="loginSupport">Support kontaktieren</button></div>`;
function authScreen(msg) {
  authFrame(html`<div><h2>Anmelden</h2><p class="muted">Mit deiner KFL-E-Mail-Adresse und deinem Passwort.</p></div>
    ${msg ? html`<div class="info-box">${icon('check')}<span>${msg}</span></div>` : ''}
    <form class="stack" data-submit="login">
      ${field('E-Mail', inp('email', '', { type: 'email', req: true, attrs: 'autocomplete="username"' }))}
      ${field('Passwort', inp('password', '', { type: 'password', req: true, attrs: 'autocomplete="current-password"' }))}
      <button class="btn btn-primary btn-block" type="submit">Anmelden</button></form>
    ${supportHelp()}
    <p class="tiny muted">Passwort vergessen? Die Administration schickt dir einen neuen Link. Nach 5 Fehlversuchen wird das Konto für 15 Minuten gesperrt.</p>`);
}
SUBMIT.login = async (d) => { const r = await POST('/login', d); if (r.mustChangePw) return forcePasswordScreen(); await boot(); };
function setupScreen(s) {
  authFrame(html`<div><h2>Ersteinrichtung</h2><p class="muted">Lege das erste Admin-Konto an. Den Einrichtungsschlüssel findest du in den Cloudflare-Secrets (SETUP_TOKEN).</p></div>
    ${!s.setupConfigured ? html`<div class="err-box">${icon('alert')}<span>Es ist noch kein SETUP_TOKEN hinterlegt. Bitte zuerst in Cloudflare als Secret anlegen.</span></div>` : ''}
    <form class="stack" data-submit="setup">
      ${field('Einrichtungsschlüssel', inp('token', '', { type: 'password', req: true }))}
      ${field('Dein Name', inp('name', '', { req: true }))}
      ${field('E-Mail', inp('email', '', { type: 'email', req: true }))}
      ${field('Passwort', inp('password', '', { type: 'password', req: true, attrs: 'minlength="10" autocomplete="new-password"' }), PW_HINT)}
      <button class="btn btn-primary btn-block" type="submit">Admin-Konto anlegen</button></form>`);
}
SUBMIT.setup = async (d) => { await POST('/setup', d); await boot(); };
async function inviteScreen(token) {
  let info;
  try { info = await GET('/invite/check', { token }); } catch (e) { return authFrame(html`<div><h2>Link nicht mehr gültig</h2></div><div class="err-box">${icon('alert')}<span>${e.message}</span></div><a class="btn" href="#/">Zur Anmeldung</a>${supportHelp()}`); }
  authFrame(html`<div><h2>Willkommen, ${info.name}</h2><p class="muted">Lege dein Passwort für ${info.email} fest.</p></div>
    <form class="stack" data-submit="invite"><input type="hidden" name="token" value="${token}">
      ${field('Neues Passwort', inp('password', '', { type: 'password', req: true, attrs: 'minlength="10" autocomplete="new-password"' }), PW_HINT)}
      ${field('Passwort wiederholen', inp('password2', '', { type: 'password', req: true, attrs: 'minlength="10" autocomplete="new-password"' }))}
      <button class="btn btn-primary btn-block" type="submit">Passwort speichern und starten</button></form>`);
}
SUBMIT.invite = async (d) => { if (d.password !== d.password2) throw new Error('Die Passwörter stimmen nicht überein.'); await POST('/invite/accept', d); history.replaceState(null, '', '#/'); await boot(); };
function forcePasswordScreen() {
  authFrame(html`<div><h2>Eigenes Passwort vergeben</h2><p class="muted">Du hast ein vorläufiges Passwort erhalten. Bitte lege jetzt dein eigenes fest.</p></div>
    <form class="stack" data-submit="forcePw">
      ${field('Vorläufiges Passwort', inp('current', '', { type: 'password', req: true }))}
      ${field('Neues Passwort', inp('next', '', { type: 'password', req: true, attrs: 'minlength="10" autocomplete="new-password"' }), PW_HINT)}
      ${field('Neues Passwort wiederholen', inp('next2', '', { type: 'password', req: true }))}
      <button class="btn btn-primary btn-block" type="submit">Passwort speichern</button></form>`);
}
SUBMIT.forcePw = async (d) => { if (d.next !== d.next2) throw new Error('Die Passwörter stimmen nicht überein.'); await POST('/password', d); await boot(); };
const SUPPORT_TOPICS = ['Anmeldung / Zugang', 'Passwort vergessen', 'Technisches Problem', 'Fehlermeldung im Dashboard', 'Sonstiges'];
ACT.loginSupport = async () => {
  const d = await ask({ title: 'Support kontaktieren', text: 'Beschreib kurz dein Anliegen. Das Support-Team meldet sich per E-Mail.', ok: 'Anfrage senden',
    fields: html`${field('Name', inp('name', '', { req: true }))}${field('E-Mail', inp('email', '', { type: 'email', req: true }))}
      ${field('Thema', sel('topic', SUPPORT_TOPICS, SUPPORT_TOPICS[0]))}${field('Nachricht', area('message', '', { rows: 5, req: true }))}
      <input class="sr" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">` });
  if (!d) return;
  const r = await POST('/support', d);
  toast(r.number ? `Danke! Deine Anfrage #${r.number} ist beim Support eingegangen.` : 'Danke! Deine Anfrage ist eingegangen.');
};
ACT.logout = async () => { await POST('/logout'); S.user = null; S.lastHash = null; authScreen('Du wurdest abgemeldet.'); };
ACT.myPassword = async () => {
  const d = await ask({ title: 'Passwort ändern', ok: 'Passwort speichern', fields: html`${field('Aktuelles Passwort', inp('current', '', { type: 'password', req: true }))}
    ${field('Neues Passwort', inp('next', '', { type: 'password', req: true, attrs: 'minlength="10"' }), PW_HINT)}${field('Neues Passwort wiederholen', inp('next2', '', { type: 'password', req: true }))}` });
  if (!d) return;
  if (d.next !== d.next2) throw new Error('Die Passwörter stimmen nicht überein.');
  await POST('/password', d); toast('Passwort geändert. Andere Sitzungen wurden abgemeldet.');
};
ACT.newTicket = async () => {
  const d = await ask({ title: 'Support kontaktieren', text: 'Technisches Problem oder Frage zum Dashboard? Das Ticket läuft mit dem Tag „Intern“ im Support ein.', ok: 'Ticket senden',
    fields: html`${field('Betreff', inp('subject', '', { req: true }))}${field('Kategorie', sel('category', ['Technisches Problem', 'Fehlermeldung im Dashboard', 'Zugang / Rechte', 'Frage', 'Sonstiges'], 'Technisches Problem'))}
      ${field('Priorität', sel('priority', [['normal', 'Normal'], ['hoch', 'Hoch'], ['dringend', 'Dringend']], 'normal'))}${field('Beschreibung', area('text', '', { rows: 5, req: true }))}` });
  if (!d) return;
  const r = await POST('/tickets', d); toast(`Ticket #${r.id} wurde angelegt. Antworten erscheinen in deinen News.`);
};

/* ---------- Geschützte Bereiche (Protokoll, Backup) ---------- */
function lockScreen(title, what) {
  return html`${head(title)}<div class="lockscreen"><div class="mark">${icon('lock')}</div><h2>${title} ist zusätzlich geschützt</h2>
    <p class="muted">${what} Gib das Bereichspasswort ein. Der Bereich bleibt danach 30 Minuten entsperrt.</p>
    <form data-submit="areaUnlock">${field('Bereichspasswort', inp('password', '', { type: 'password', req: true, attrs: 'autocomplete="off"' }))}<button class="btn btn-dark btn-block" type="submit">Entsperren</button></form></div>`;
}
SUBMIT.areaUnlock = async (d) => { await POST('/area/unlock', d); await loadSession(); toast('Bereich entsperrt.'); reload(); };
ACT.areaLock = async () => { await POST('/area/lock'); await loadSession(); reload(); };
async function guarded(fn, title, what) {
  try { return await fn(); }
  catch (e) { if (e.status === 423) { S.user.areaUnlocked = false; render('#main', lockScreen(title, what)); return null; } throw e; }
}

/* ---------- Start ---------- */
async function boot() {
  const s = await loadSession();
  if (s.needsSetup) return setupScreen(s);
  if (!s.user) return authScreen();
  if (s.user.mustChangePw) return forcePasswordScreen();
  $('#root').innerHTML = '';
  await refreshCounts();
  Router.resolve();
}
setInterval(() => { if (S.user && document.visibilityState === 'visible') refreshCounts(); }, 30000);
