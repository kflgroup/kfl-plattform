/* ===== Start und News ===== */
function pgreet() { const h = +new Intl.DateTimeFormat('de-DE', { timeZone: TZ, hour: 'numeric', hour12: false }).format(new Date()); return h < 11 ? 'Guten Morgen' : h < 18 ? 'Hallo' : 'Guten Abend'; }
function motivation(d) {
  const s = d.stats, left = Math.max(0, s.weekGoal - s.weekOffers);
  if (d.newRequests.length) return `${plural(d.newRequests.length, 'neue Anfrage wartet', 'neue Anfragen warten')} auf dich. Wer zuerst ein starkes Angebot abgibt, hat die besten Chancen.`;
  if (d.won.length) return `${plural(d.won.length, 'Kunde wartet', 'Kunden warten')} auf deinen Anruf – melde dich innerhalb der Kontaktfrist.`;
  if (!left) return 'Wochenziel erreicht – stark! Jedes weitere Angebot erhöht deine Gewinnchance.';
  return `Noch ${plural(left, 'Angebot', 'Angebote')} bis zu deinem Wochenziel. Neue Anfragen kommen laufend rein.`;
}
async function pStart() {
  const V = ppage('start');
  const d = await pcounts() || await GET('/start'); if (!V.alive()) return;
  const s = d.stats, pct = s.weekGoal ? s.weekOffers / s.weekGoal : 0;
  const items = feedOf(d.news).slice(0, 8);
  V.show(html`<section class="hero"><div><h1>${pgreet()}, ${P.user.name.split(' ')[0]}</h1><p class="when">${fLong(new Date())} · KW ${d.week} · ${d.year}</p><p class="push">${motivation(d)}</p>
      ${d.newRequests.length ? html`<a class="btn btn-primary mt" href="#/anfragen">${icon('bolt')}Neue Anfragen ansehen</a>` : ''}</div>
    <div class="goal"><span class="ring-wrap">${ring(pct, { size: 92, stroke: 9, label: 'Wochenziel' })}<span class="ring-c">${Math.min(100, Math.round(pct * 100))} %</span></span><div class="goal-txt"><b>${s.weekOffers}/${s.weekGoal}</b><span>Angebote diese Woche<br>Wochenziel</span></div></div></section>
    <div class="pstats"><div class="pstat"><b>${fNum(s.taken)}</b><span>Anfragen übernommen</span></div><div class="pstat"><b>${fNum(s.offers)}</b><span>Angebote abgegeben</span></div><div class="pstat"><b>${fNum(s.won)}</b><span>Deals gewonnen</span></div><div class="pstat"><b>${s.winRate} %</b><span>Erfolgsquote</span></div></div>
    <div class="p-grid"><div class="stack">
      <section class="block"><div class="block-head"><h2>Neue Anfragen ${d.newRequests.length ? html`<span class="count hot">${d.newRequests.length}</span>` : ''}</h2><a class="btn btn-sm btn-ghost" href="#/anfragen">Alle</a></div>
        ${d.newRequests.length ? d.newRequests.slice(0, 6).map((a) => rqCard(a)) : html`<div class="block-body">${empty('Gerade keine neuen Anfragen', 'Sobald ein Kunde in deiner Region anfragt, erscheint die Anfrage hier und per E-Mail.')}</div>`}</section>
      ${d.won.length ? html`<section class="block"><div class="block-head"><h2>Kunde wartet auf dich</h2></div>${d.won.map((a) => rqCard(a))}</section>` : ''}
      <section class="block"><div class="block-head"><h2>In Bearbeitung</h2><a class="btn btn-sm btn-ghost" href="#/anfragen?tab=meine">Alle</a></div>
        ${d.mine.length ? d.mine.map((a) => rqCard(a)) : html`<div class="block-body muted small">Keine Anfrage in Bearbeitung.</div>`}</section>
      <section class="block"><div class="block-head"><h2>Beantwortet – wartet auf Rückmeldung</h2><a class="btn btn-sm btn-ghost" href="#/anfragen?tab=beantwortet">Alle</a></div>
        ${d.waiting.length ? d.waiting.map((a) => rqCard(a)) : html`<div class="block-body muted small">Noch keine offenen Angebote.</div>`}</section></div>
    <div class="stack">
      <section class="block"><div class="block-head"><h2>News ${d.newSince ? html`<span class="count hot">${d.newSince} neu</span>` : ''}</h2><a class="btn btn-sm btn-ghost" href="#/news">Alle</a></div>
        ${items.length ? items.map(pfeedRow) : html`<div class="block-body muted small">Noch keine Neuigkeiten.</div>`}</section>
      <section class="block"><div class="block-head"><h2>Mein Infofeld</h2></div><div class="block-body">
        <form class="stack-s" data-submit="noteAdd">${area('text', '', { rows: 2, req: true, ph: 'Notiz für dich, z. B. Rückruf Herr M. um 14 Uhr' })}
          <div class="row">${field('Nur an diesem Tag (optional)', inp('day', '', { type: 'date' }))}<button class="btn btn-dark btn-sm" type="submit">Speichern</button></div></form>
        ${d.notes.map((n) => html`<div class="note ${n.day ? 'day' : ''}">${icon(n.day ? 'calendar' : 'pin')}<span class="spacer">${n.text}${n.day ? html`<span class="tiny muted"> · heute</span>` : ''}</span><button class="icon-btn" data-act="noteDel" data-id="${n.id}" aria-label="Notiz löschen">${icon('x')}</button></div>`)}
        <a class="link small mt" href="#/notizen">Alle Notizen</a></div></section></div></div>`);
}
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
