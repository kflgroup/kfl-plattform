/* ===== Start und News ===== */
function pgreet() { const h = +new Intl.DateTimeFormat('de-DE', { timeZone: TZ, hour: 'numeric', hour12: false }).format(new Date()); return h < 11 ? 'Guten Morgen' : h < 18 ? 'Hallo' : 'Guten Abend'; }
function motivation(d) {
  const s = d.stats, left = Math.max(0, s.weekGoal - s.weekOffers);
  if (d.newRequests.length) return `${plural(d.newRequests.length, 'neue Anfrage wartet', 'neue Anfragen warten')} auf dich. Wer zuerst ein starkes Angebot abgibt, hat die besten Chancen.`;
  if (d.won.length) return `${plural(d.won.length, 'Kunde wartet', 'Kunden warten')} auf deinen Anruf – melde dich innerhalb der Kontaktfrist.`;
  if (!left) return 'Wochenziel erreicht – stark! Jedes weitere Angebot erhöht deine Gewinnchance.';
  return `Noch ${plural(left, 'Angebot', 'Angebote')} bis zu deinem Wochenziel. Neue Anfragen kommen laufend rein.`;
}
const nextDeadline = (list, key = 'deadline_at') => list.map((a) => a[key]).filter(Boolean).sort()[0];
function kpi({ href, tone, ic, label, value, sub, hot }) {
  const inner = html`<div class="kpi-top"><span class="kpi-ic">${icon(ic)}</span>${href ? icon('arrow', 'go') : ''}</div><div><div class="kpi-v">${value}</div><div class="kpi-l">${label}</div></div><div class="kpi-s">${sub || ''}</div>`;
  return href ? html`<a class="kpi k-${tone} ${hot ? 'is-hot' : ''}" href="${href}">${inner}</a>` : html`<div class="kpi k-${tone}">${inner}</div>`;
}
function pnewsRow(i) {
  return html`<button class="nw ${i.read ? '' : 'unread'}" data-act="popenFeed" data-kind="${i.kind}" data-id="${i.id}" data-link="${i.link || ''}"><span class="fi-mark ${i.kind === 'post' ? (i.important ? 'important' : 'post') : ''}">${icon(i.kind === 'post' ? 'news' : P_ICON[i.ntype] || 'bell')}</span>
    <span><span class="nw-t">${i.title}</span><span class="nw-m">${i.kind === 'post' ? 'Nachricht der KFL · ' : ''}${fRel(i.created_at)}</span></span></button>`;
}
let PSTART_SEG = 'mine';
async function pStart() {
  const V = ppage('start');
  const d = await pcounts() || await GET('/start'); if (!V.alive()) return;
  const s = d.stats, pct = s.weekGoal ? s.weekOffers / s.weekGoal : 0;
  const items = feedOf(d.news).slice(0, 5);
  const nd = nextDeadline(d.mine);
  const act = d.activity || [], amax = Math.max(1, ...act.map((x) => x.offers + x.taken));
  const fun = [['Übernommen', s.taken], ['Angebote', s.offers], ['Vorgestellt', s.presented || 0], ['Gewonnen', s.won]], fmax = Math.max(1, s.taken, s.offers);
  const segs = [['mine', 'In Bearbeitung', d.mine], ['waiting', 'Beim Kunden', d.waiting]];
  const seg = segs.find((x) => x[0] === PSTART_SEG) || segs[0];
  V.show(html`<section class="p-hero"><div><span class="ph-kicker"><i></i>${fLong(new Date())}</span><h1>${pgreet()}, ${P.user.name.split(' ')[0]}</h1><p class="push">${motivation(d)}</p>
      <div class="ph-actions">${d.newRequests.length ? html`<a class="btn btn-primary" href="#/anfragen?tab=neu">${icon('bolt')}${plural(d.newRequests.length, 'neue Anfrage', 'neue Anfragen')} ansehen</a>` : html`<a class="btn btn-primary" href="#/anfragen">${icon('inbox')}Zu meinen Anfragen</a>`}${d.mine.length ? html`<a class="btn btn-glass" href="#/anfragen?tab=meine">${icon('clock')}Angebote fertigstellen</a>` : ''}</div></div>
    <div class="ph-goal"><span class="ring-wrap">${ring(pct, { size: 88, stroke: 9, label: 'Wochenziel' })}<span class="ring-c">${Math.min(100, Math.round(pct * 100))} %</span></span><div><b>${s.weekOffers} / ${s.weekGoal}</b><span>Angebote diese Woche<br>Dein Wochenziel · KW ${d.week}</span></div></div></section>
    <div class="kpis">
      ${kpi({ href: '#/anfragen?tab=neu', tone: 'orange', ic: 'inbox', label: 'Neue Anfragen', value: fNum(d.newRequests.length), sub: d.newRequests.length ? 'jetzt übernehmen' : 'aktuell keine offen', hot: d.newRequests.length > 0 })}
      ${kpi({ href: '#/anfragen?tab=meine', tone: 'blue', ic: 'clock', label: 'In Bearbeitung', value: fNum(d.mine.length), sub: nd ? html`${icon('clock')}nächste Frist ${fLeft(nd).replace('noch ', 'in ')}` : 'nichts offen' })}
      ${kpi({ href: '#/anfragen?tab=beantwortet', tone: 'amber', ic: 'send', label: 'Beim Kunden', value: fNum(d.waiting.length), sub: 'warten auf Rückmeldung' })}
      ${kpi({ href: '#/anfragen?tab=gewonnen', tone: 'green', ic: 'trophy', label: 'Deals gewonnen', value: fNum(s.won), sub: `Erfolgsquote ${s.winRate} %` })}</div>
    <div class="p-grid"><div class="stack">
      ${d.won.length ? html`<section class="urgent-card"><h2>${icon('phone')}${plural(d.won.length, 'Kunde wartet', 'Kunden warten')} auf deinen Anruf</h2><p class="uc-sub">Gewonnen! Melde dich innerhalb der Kontaktfrist – so wird aus dem Angebot ein Abschluss.</p>
        <div class="uc-list">${d.won.map((a) => html`<a class="uc-item" href="#/anfragen/${a.id}"><div><b>${rqTitle(a)} · #${a.request.number}</b><span>${a.contact_due_at ? 'Kontakt bis ' + fDT(a.contact_due_at) : a.statusLabel}</span></div><span class="uc-cta">${icon('phone')}Kontaktdaten</span></a>`)}</div></section>` : ''}
      <section class="block"><div class="block-head"><h2><span class="h-ic">${icon('bolt')}</span>Neue Anfragen ${d.newRequests.length ? html`<span class="count hot">${d.newRequests.length}</span>` : ''}</h2><a class="more-link" href="#/anfragen?tab=neu">Alle${icon('arrow')}</a></div>
        ${d.newRequests.length ? rqList(d.newRequests.slice(0, 6)) : html`<div class="block-body">${empty('Gerade keine neuen Anfragen', 'Sobald ein Kunde in deiner Region anfragt, erscheint die Anfrage hier – und du bekommst eine E-Mail.')}</div>`}
        ${d.newRequests.length > 6 ? html`<div class="block-foot"><a href="#/anfragen?tab=neu">Alle ${d.newRequests.length} neuen Anfragen${icon('arrow')}</a></div>` : ''}</section>
      <section class="block" id="pseg"><div class="block-head"><h2><span class="h-ic">${icon('file')}</span>Meine Vorgänge</h2><div class="seg-tabs" role="tablist">${segs.map(([k, l, list]) => html`<button role="tab" aria-selected="${k === seg[0]}" class="${k === seg[0] ? 'on' : ''}" data-act="pseg" data-k="${k}">${l}<span class="count">${list.length}</span></button>`)}</div></div>
        ${seg[2].length ? rqList(seg[2]) : html`<div class="block-body"><p class="muted small">${seg[0] === 'mine' ? 'Keine Anfrage in Bearbeitung. Übernimm eine neue Anfrage und gib dein Angebot ab.' : 'Noch keine offenen Angebote beim Kunden.'}</p></div>`}</section></div>
    <div class="stack">
      <section class="block"><div class="block-head"><h2><span class="h-ic">${icon('chart')}</span>Deine Leistung</h2>${isVL() ? html`<a class="more-link" href="#/statistik">Statistik${icon('arrow')}</a>` : ''}</div><div class="block-body">
        <div class="perf-top"><div><b>${s.winRate} %</b><span class="tiny muted"> Erfolgsquote</span></div><span>${plural(s.offers, 'Angebot', 'Angebote')} insgesamt</span></div>
        <div class="funnel">${fun.map(([l, v]) => html`<div class="fn-row"><span class="fn-l">${l}</span><span class="fn-track"><i data-w="${Math.round((v / fmax) * 100)}"></i></span><span class="fn-v">${fNum(v)}</span></div>`)}</div>
        ${act.length ? html`<div class="spark" title="Übernahmen und Angebote der letzten 14 Tage">${act.map((x, i) => html`<span class="${i === act.length - 1 ? 'today' : x.offers + x.taken ? 'has' : ''}" data-h="${Math.max(6, Math.round(((x.offers + x.taken) / amax) * 100))}" title="${fDate(x.day)}: ${x.taken} übernommen, ${x.offers} Angebote"></span>`)}</div><div class="spark-l"><span>vor 14 Tagen</span><span>Aktivität</span><span>heute</span></div>` : ''}</div></section>
      <section class="block"><div class="block-head"><h2><span class="h-ic">${icon('bell')}</span>News ${d.newSince ? html`<span class="count hot">${d.newSince} neu</span>` : ''}</h2><a class="more-link" href="#/news">Alle${icon('arrow')}</a></div>
        ${items.length ? html`<div>${items.map(pnewsRow)}</div>` : html`<div class="block-body muted small">Noch keine Neuigkeiten.</div>`}</section>
      <section class="block"><div class="block-head"><h2><span class="h-ic">${icon('note')}</span>Mein Infofeld</h2><a class="more-link" href="#/notizen">Alle${icon('arrow')}</a></div><div class="block-body">
        <form data-submit="noteAdd"><div class="note-add">${inp('text', '', { req: true, ph: 'Notiz, z. B. Rückruf Herr M. um 14 Uhr' })}<button class="btn btn-dark" type="submit" aria-label="Notiz speichern">${icon('plus')}</button></div>
          <label class="note-opts">${icon('calendar')}Nur an einem Tag anzeigen:<input type="date" name="day" aria-label="Tag (optional)"></label></form>
        ${d.notes.map((n) => html`<div class="note ${n.day ? 'day' : ''}">${icon(n.day ? 'calendar' : 'pin')}<span class="spacer">${n.text}${n.day ? html`<span class="tiny muted"> · heute</span>` : ''}</span><button class="icon-btn" data-act="noteDel" data-id="${n.id}" aria-label="Notiz löschen">${icon('x')}</button></div>`)}</div></section></div></div>`);
}
ACT.pseg = (b) => { PSTART_SEG = b.dataset.k; plast = location.hash; preload(); };
SUBMIT.noteAdd = async (d, f) => { await POST('/notes', d); f.reset(); toast('Notiz gespeichert.'); preload(); };
ACT.noteDel = async (b) => { await DEL('/notes/' + b.dataset.id); preload(); };
async function pNotes() {
  const V = ppage('start'); const d = await GET('/notes'); if (!V.alive()) return;
  V.show(html`${phead('Mein Infofeld', 'Dauerhafte Notizen und Notizen für einzelne Tage.', '', ['#/', 'Start'])}<section class="block"><div class="block-body">
    <form class="stack-s" data-submit="noteAdd">${area('text', '', { rows: 2, req: true })}<div class="row">${field('Tag (leer = immer anzeigen)', inp('day', '', { type: 'date' }))}<button class="btn btn-dark btn-sm" type="submit">Speichern</button></div></form>
    ${d.notes.length ? d.notes.map((n) => html`<div class="note ${n.day ? 'day' : ''}">${icon(n.day ? 'calendar' : 'pin')}<span class="spacer">${n.day ? html`<b>${fDate(n.day)}:</b> ` : ''}${n.text}</span><button class="icon-btn" data-act="noteDel" data-id="${n.id}" aria-label="Löschen">${icon('x')}</button></div>`) : html`<p class="muted small mt">Noch keine Notizen.</p>`}</div></section>`);
}

const feedOf = (news) => [...news.posts.map((p) => ({ ...p, kind: 'post' })), ...news.notifications.map((n) => ({ ...n, ntype: n.kind, kind: 'note' }))].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
const P_ICON = { anfrage: 'inbox', neu: 'inbox', gewonnen: 'trophy', vorgestellt: 'star', geschlossen: 'x', support: 'support', rechnung: 'euro', mahnung: 'euro', probefahrt: 'car', info: 'news' };
function pfeedRow(i) {
  return html`<div class="feed-item ${i.read ? '' : 'unread'}"><span class="fi-mark ${i.kind === 'post' ? (i.important ? 'important' : 'post') : ''}">${icon(i.kind === 'post' ? 'news' : P_ICON[i.ntype] || 'bell')}</span>
    <div><a href="#" class="fi-title" data-act="popenFeed" data-kind="${i.kind}" data-id="${i.id}" data-link="${i.link || ''}">${i.title}</a>${i.body ? html`<div class="fi-body">${i.body}</div>` : ''}<div class="tiny muted">${i.kind === 'post' ? 'Nachricht der KFL' : fDT(i.created_at)}</div></div>
    <div class="stack-s"><span class="fi-time">${fRel(i.created_at)}</span><button class="btn btn-ghost btn-sm" data-act="ptoggleRead" data-kind="${i.kind}" data-id="${i.id}" data-read="${i.read ? 1 : 0}">${i.read ? 'Ungelesen' : 'Gelesen'}</button></div></div>`;
}
let PNEWS = null;
ACT.popenFeed = async (a) => {
  const id = +a.dataset.id, kind = a.dataset.kind;
  await POST('/news/read', kind === 'post' ? { posts: [id] } : { notifications: [id] });
  if (kind === 'note' && a.dataset.link) { await pcounts(); location.hash = a.dataset.link; return; }
  const src = PNEWS || (P.start && P.start.news) || { posts: [] };
  const p = src.posts.find((x) => x.id === id);
  if (p) modal({ title: p.title, body: html`<p class="tiny muted">${fDT(p.created_at)}</p><div class="pre mt">${p.body}</div>`, foot: html`<button class="btn btn-dark" data-close>Schließen</button>`, onClose: () => { pcounts(); preload(); } });
  else { await pcounts(); preload(); }
};
ACT.ptoggleRead = async (b) => { const id = +b.dataset.id; await POST('/news/read', { ...(b.dataset.kind === 'post' ? { posts: [id] } : { notifications: [id] }), read: b.dataset.read !== '1' }); await pcounts(); preload(); };
ACT.pallRead = async () => { await POST('/news/read', { all: true, posts: (PNEWS?.posts || []).filter((p) => !p.read).map((p) => p.id) }); await pcounts(); preload(); };
async function pNews() {
  const V = ppage('news'); const d = await GET('/news'); if (!V.alive()) return;
  PNEWS = d;
  const f = hashQuery().f || 'alle';
  let items = feedOf(d);
  if (f === 'ungelesen') items = items.filter((i) => !i.read);
  if (f === 'kfl') items = items.filter((i) => i.kind === 'post');
  V.show(html`${phead('News', 'Nachrichten der KFL, neue Anfragen, Support-Antworten und Erfolge.', html`<button class="btn btn-sm" data-act="pallRead">Alles gelesen</button>`)}
    <section class="block"><div class="toolbar">${[['alle', 'Alle'], ['ungelesen', 'Ungelesen'], ['kfl', 'Von der KFL']].map(([k, l]) => html`<a class="btn btn-sm ${f === k ? 'btn-dark' : 'btn-ghost'}" href="#/news?f=${k}">${l}</a>`)}</div>
    ${items.length ? items.map(pfeedRow) : html`<div class="block-body">${empty('Keine Nachrichten', f === 'ungelesen' ? 'Du hast alles gelesen.' : '')}</div>`}</section>`);
}
