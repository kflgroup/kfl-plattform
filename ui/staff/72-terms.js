/* ===== Verwaltung → Partner-AGB: ansehen, bearbeiten, veröffentlichen (synchron mit Partner-Dashboard und Webseite) ===== */
const termsTeaser = () => html`<section class="panel mt terms-teaser"><div class="panel-body row-between"><div class="row">${icon('file')}<div><b>AGB für Geschäftspartner</b><div class="small muted">Text ansehen, ändern und veröffentlichen – erscheint sofort im Partner-Dashboard und auf kfl-group.com.</div></div></div>
  <a class="btn btn-sm btn-dark" href="#/verwaltung/agb">${icon('edit')}Partner-AGB öffnen</a></div></section>`;

// Erlaubte Formatierung (wie auf dem Server) – für Einfügen aus Word/Webseiten und die Vorschau
const TERMS_MAP = { P: 'p', DIV: 'p', H1: 'h2', H2: 'h2', H3: 'h3', H4: 'h3', UL: 'ul', OL: 'ol', LI: 'li', STRONG: 'strong', B: 'strong', EM: 'em', I: 'em', U: 'u', A: 'a', BR: 'br', BLOCKQUOTE: 'blockquote' };
const TERMS_DROP = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'TEMPLATE', 'SVG', 'MATH', 'NOSCRIPT', 'TEXTAREA', 'TITLE', 'HEAD', 'META', 'LINK', 'FORM', 'BUTTON', 'SELECT', 'IMG', 'VIDEO', 'AUDIO']);
function termsClean(htmlStr) {
  const doc = new DOMParser().parseFromString(`<body>${htmlStr}</body>`, 'text/html');
  const walk = (n) => [...n.childNodes].map((c) => {
    if (c.nodeType === 3) return esc(c.nodeValue);
    if (c.nodeType !== 1 || TERMS_DROP.has(c.tagName)) return '';
    const t = TERMS_MAP[c.tagName], inner = walk(c);
    if (!t) return inner;
    if (t === 'br') return '<br>';
    if (t === 'a') { const h = (c.getAttribute('href') || '').trim(); return /^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i.test(h) ? `<a href="${esc(h)}">${inner}</a>` : inner; }
    return `<${t}>${inner}</${t}>`;
  }).join('');
  return walk(doc.body).replace(/<p>\s*(<br>\s*)*<\/p>/g, '').replace(/<(strong|em|u)>\s*<\/\1>/g, '').trim();
}
const termsWords = (h) => (String(h).replace(/<[^>]+>/g, ' ').match(/\S+/g) || []).length;
const termsCurrentHtml = () => { const src = $('#termsSrc'); return termsClean(src && !src.hidden ? src.value : ($('#termsEd') || {}).innerHTML || ''); };

async function admTerms(P, tab) {
  const d = await GET('/partner-terms'); if (!P.alive()) return;
  S.terms = d; S.termsDirty = false;
  const t = d.terms, st = d.stats, sync = t.shop_sync, share = st.total ? Math.round((st.current / st.total) * 100) : 0;
  const syncBadge = !sync ? badge('Seitentext noch nicht abgeglichen', 'neutral') : sync.ok ? badge(`Seitentext aktuell · ${fDT(sync.at)}`, 'ok') : badge('Seitentext nicht aktualisiert', 'warn');
  P.show(html`${admHead(tab)}
    <section class="panel mt"><div class="panel-head"><h2>AGB für Geschäftspartner</h2><div class="row">
      <a class="btn btn-sm btn-ghost" href="${d.publicUrl}" target="_blank" rel="noopener">${icon('external')}Leseansicht</a>
      <a class="btn btn-sm btn-ghost" href="${d.web}" target="_blank" rel="noopener">${icon('shop')}Auf der Webseite</a>
      ${d.canEdit ? html`<button class="btn btn-sm btn-primary" data-act="termsEdit">${icon('edit')}Bearbeiten</button>` : ''}</div></div>
      <div class="panel-body terms-overview">
        <div class="terms-facts"><div><span>Aktuelle Fassung</span><b>${t.version}</b><small>${t.stand ? 'Stand ' + t.stand : fDate(t.updated_at)}</small></div>
          <div><span>Veröffentlicht</span><b>${fDate(t.updated_at)}</b><small>${t.updated_by || '–'}</small></div>
          <div><span>Zustimmung zur aktuellen Fassung</span><b>${st.current} / ${st.total}</b><small>${st.total ? share + ' % der aktiven Partnerkonten' : 'noch keine aktiven Partnerkonten'}${t.consent_min === t.version ? ' · Pflicht beim nächsten Login' : ''}</small></div></div>
        ${t.note ? html`<p class="small muted mt">Letzte Änderung: ${t.note}</p>` : ''}
        <ul class="terms-sync mt">
          <li>${icon('check')}<div><b>Internes Dashboard</b><span>Hier wird der Text gepflegt – eine Quelle für alle Seiten.</span></div>${badge('Quelle', 'ok')}</li>
          <li>${icon('check')}<div><b>Partner-Dashboard</b><span>Menü „AGB für Partner“, Zustimmung bei Einladung und Login – aktualisiert sich sofort.</span></div>${badge('synchron', 'ok')}</li>
          <li>${icon(sync && !sync.ok ? 'alert' : 'check')}<div><b>Webseite kfl-group.com/pages/agb-partner</b><span>Die Seite lädt die aktuelle Fassung live. Zusätzlich wird der Shopify-Seitentext (für Suchmaschinen) mitgezogen${sync && !sync.ok ? html` – <span class="warn-text">${sync.error}</span>` : ''}.</span></div>
            <div class="row">${badge('synchron', 'ok')}${syncBadge}${d.canEdit && (!sync || !sync.ok) ? html`<button class="btn btn-sm btn-ghost" data-act="termsShopSync">${icon('refresh')}Erneut abgleichen</button>` : ''}</div></li>
        </ul></div></section>
    <div id="termsMain"><section class="panel mt"><div class="panel-body"><article class="legal-doc">${raw(t.html)}</article></div></section></div>
    <section class="panel mt"><div class="panel-head"><h2>Fassungen</h2><span class="small muted">Jede veröffentlichte Fassung bleibt 10 Jahre im Archiv – als Nachweis, welcher Text wann galt.</span></div>
      ${d.versions.length ? html`<div class="table-wrap"><table class="table"><thead><tr><th>Fassung</th><th>Veröffentlicht</th><th>Von</th><th>Änderung</th><th></th></tr></thead><tbody>
        ${d.versions.map((v) => html`<tr><td class="strong num">${v.version}${v.version === t.version ? html` ${badge('aktuell', 'ok')}` : ''}${v.reconsent ? html` ${badge('neue Zustimmung', 'info')}` : ''}</td><td class="nowrap">${fDT(v.updated_at)}</td><td>${v.updated_by || '–'}</td><td class="small">${v.note || '–'}</td>
          <td class="r nowrap"><button class="btn btn-sm btn-ghost" data-act="termsVersion" data-v="${v.version}">${icon('eye')}Ansehen</button>${d.canEdit && v.version !== t.version ? html`<button class="btn btn-sm btn-ghost" data-act="termsLoad" data-v="${v.version}">${icon('refresh')}Als Vorlage</button>` : ''}</td></tr>`)}</tbody></table></div>`
        : html`<div class="panel-body small muted">Die Erstfassung wird beim ersten Veröffentlichen automatisch archiviert.</div>`}</section>
    ${d.canEdit ? '' : html`<div class="note-box mt">${icon('lock')}<span>Ändern dürfen Geschäftsführung und Admin (Recht „AGB für Geschäftspartner bearbeiten“).</span></div>`}`);
}

function termsEditor(htmlStr, from) {
  const t = S.terms.terms;
  render('#termsMain', html`<section class="panel mt terms-edit"><div class="panel-head"><h2>Bearbeiten – wird Fassung ${t.version + 1}</h2><span class="small muted">${from ? `Vorlage: Fassung ${from} · ` : ''}<span id="termsCount"></span> · wirksam erst mit „Veröffentlichen“</span></div>
    <div class="terms-toolbar" role="toolbar" aria-label="Formatierung">
      ${[['formatBlock', 'p', 'Absatz', 'Absatz'], ['formatBlock', 'h2', '§ Überschrift', 'Paragraf-Überschrift'], ['formatBlock', 'h3', 'Zwischentitel', 'Zwischenüberschrift']].map(([c, a, l, t2]) => html`<button type="button" class="btn btn-sm btn-ghost" data-act="termsCmd" data-cmd="${c}" data-arg="${a}" title="${t2}">${l}</button>`)}
      <span class="sep"></span>
      <button type="button" class="btn btn-sm btn-ghost strong" data-act="termsCmd" data-cmd="bold" title="Fett (Strg+B)">F</button><button type="button" class="btn btn-sm btn-ghost em" data-act="termsCmd" data-cmd="italic" title="Kursiv (Strg+I)">K</button>
      <button type="button" class="btn btn-sm btn-ghost" data-act="termsCmd" data-cmd="insertUnorderedList" title="Aufzählung">• Liste</button><button type="button" class="btn btn-sm btn-ghost" data-act="termsCmd" data-cmd="insertOrderedList" title="Nummerierte Liste">1. Liste</button>
      <span class="sep"></span>
      <button type="button" class="btn btn-sm btn-ghost" data-act="termsLink" title="Link einfügen">${icon('link')}Link</button><button type="button" class="btn btn-sm btn-ghost" data-act="termsCmd" data-cmd="unlink" title="Link entfernen">Link entfernen</button>
      <button type="button" class="btn btn-sm btn-ghost" data-act="termsCmd" data-cmd="removeFormat" title="Formatierung entfernen">Format löschen</button>
      <span class="sep"></span>
      <button type="button" class="btn btn-sm btn-ghost" data-act="termsCmd" data-cmd="undo" title="Rückgängig (Strg+Z)">↶</button><button type="button" class="btn btn-sm btn-ghost" data-act="termsCmd" data-cmd="redo" title="Wiederholen">↷</button>
      <span class="spacer"></span><button type="button" class="btn btn-sm btn-ghost" data-act="termsSource" id="termsSrcBtn">&lt;/&gt; HTML</button></div>
    <div class="legal-doc terms-editor" id="termsEd" contenteditable="true" spellcheck="true" lang="de" role="textbox" aria-multiline="true" aria-label="AGB-Text">${raw(htmlStr)}</div>
    <textarea id="termsSrc" class="terms-src" hidden aria-label="HTML-Quelltext" spellcheck="false"></textarea>
    <form class="panel-body stack terms-publish" data-submit="termsPublish">
      ${field('Was hat sich geändert? *', area('note', '', { rows: 2, req: true, ph: 'z. B. § 5 Vergütung: Zahlungsziel auf 14 Tage angepasst' }), 'Erscheint in der Fassungsliste, im Protokoll und – falls gewählt – in der News an die Partner.')}
      <div class="checks">${chk('stand', true, 'Stand-Datum im Text auf heute setzen')}${chk('notify', true, 'Partner per News im Partner-Dashboard informieren')}
        ${chk('reconsent', false, raw('<b>Zustimmung aller Partner erneut einholen</b> – bei wesentlichen Änderungen: Partner müssen die neue Fassung beim nächsten Öffnen des Dashboards bestätigen, bevor sie weiterarbeiten.'))}</div>
      <div class="row"><button class="btn btn-primary" type="submit">${icon('send')}Veröffentlichen</button><button class="btn" type="button" data-act="termsPreview">${icon('eye')}Vorschau</button><span class="spacer"></span><button class="btn btn-ghost" type="button" data-act="termsCancel">Verwerfen</button></div>
    </form></section>`);
  const ed = $('#termsEd');
  try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) { /* älterer Browser */ }
  const count = () => { const n = termsWords(termsCurrentHtml()); const c = $('#termsCount'); if (c) c.textContent = `${fNum(n)} Wörter`; };
  ed.addEventListener('input', () => { S.termsDirty = true; count(); });
  ed.addEventListener('paste', (e) => {
    const cd = e.clipboardData; if (!cd) return; e.preventDefault();
    const h = cd.getData('text/html'), tx = cd.getData('text/plain');
    const clean = h ? termsClean(h) : tx.split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
    document.execCommand('insertHTML', false, clean); S.termsDirty = true; count();
  });
  $('#termsSrc').addEventListener('input', () => { S.termsDirty = true; count(); });
  count(); ed.focus();
  $('#termsMain').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
// Werkzeugleiste: Auswahl im Editor behalten
document.addEventListener('mousedown', (e) => { if (e.target.closest('.terms-toolbar button')) e.preventDefault(); });
window.addEventListener('beforeunload', (e) => { if (S.termsDirty && $('#termsEd')) { e.preventDefault(); e.returnValue = ''; } });

ACT.termsEdit = () => termsEditor(S.terms.terms.html);
ACT.termsLoad = async (b) => {
  if (S.termsDirty && !(await confirmBox('Ungespeicherte Änderungen verwerfen?', 'Der Editor wird mit der gewählten Fassung neu gefüllt.', 'Verwerfen und laden', true))) return;
  const d = await GET('/partner-terms/versions/' + b.dataset.v); termsEditor(d.version.html, d.version.version); S.termsDirty = true;
};
ACT.termsCmd = (b) => {
  const src = $('#termsSrc'); if (src && !src.hidden) return toast('Formatierung im HTML-Modus nicht möglich – bitte zurück zur Textansicht.', 'err');
  $('#termsEd').focus();
  document.execCommand(b.dataset.cmd, false, b.dataset.cmd === 'formatBlock' ? `<${b.dataset.arg}>` : null);
  S.termsDirty = true;
};
ACT.termsLink = async () => {
  const sel = getSelection(), range = sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
  if (!range || range.collapsed || !$('#termsEd').contains(range.commonAncestorContainer)) return toast('Bitte zuerst den Text markieren, der verlinkt werden soll.', 'err');
  const d = await ask({ title: 'Link einfügen', ok: 'Einfügen', fields: field('Adresse', inp('href', 'https://', { req: true }), 'https://…, mailto:… oder /pages/… (Seite auf kfl-group.com)') });
  if (!d) return;
  const h = String(d.href || '').trim(); if (!/^(https?:\/\/\S+|mailto:\S+|tel:[+0-9 ()/-]+|\/(?!\/)\S*)$/i.test(h)) return toast('Bitte eine gültige Adresse angeben.', 'err');
  $('#termsEd').focus(); sel.removeAllRanges(); sel.addRange(range); document.execCommand('createLink', false, h); S.termsDirty = true;
};
ACT.termsSource = () => {
  const ed = $('#termsEd'), src = $('#termsSrc'), btn = $('#termsSrcBtn');
  if (src.hidden) { src.value = termsClean(ed.innerHTML).replace(/<\/(p|h2|h3|ul|ol|li|blockquote)>/g, '</$1>\n'); src.hidden = false; ed.hidden = true; btn.classList.add('on'); src.focus(); }
  else { ed.innerHTML = termsClean(src.value); src.hidden = true; ed.hidden = false; btn.classList.remove('on'); ed.focus(); }
};
ACT.termsPreview = () => modal({ title: `Vorschau – Fassung ${S.terms.terms.version + 1}`, wide: true, body: html`<div class="note-box">${icon('eye')}<span>So erscheint der Text im Partner-Dashboard und auf der Webseite.</span></div><article class="legal-doc mt">${raw(termsCurrentHtml())}</article>` });
ACT.termsCancel = async () => { if (S.termsDirty && !(await confirmBox('Änderungen verwerfen?', 'Alles, was du seit dem Öffnen geändert hast, geht verloren.', 'Verwerfen', true))) return; S.termsDirty = false; reload(); };
ACT.termsVersion = async (b) => {
  const d = await GET('/partner-terms/versions/' + b.dataset.v), v = d.version;
  modal({ title: `Fassung ${v.version}${v.stand ? ' · Stand ' + v.stand : ''}`, wide: true, body: html`<dl class="kv"><dt>Veröffentlicht</dt><dd>${fDT(v.updated_at)} · ${v.updated_by || '–'}</dd><dt>Änderung</dt><dd>${v.note || '–'}</dd></dl><article class="legal-doc mt">${raw(v.html)}</article>` });
};
ACT.termsShopSync = async () => { const r = await POST('/partner-terms/shop-sync', {}); toast(r.shop_sync.ok ? 'Shopify-Seitentext aktualisiert.' : 'Nicht aktualisiert: ' + r.shop_sync.error, r.shop_sync.ok ? 'ok' : 'err'); reload(); };
SUBMIT.termsPublish = async (d) => {
  const htmlStr = termsCurrentHtml(), t = S.terms.terms;
  if (termsWords(htmlStr) < 60) throw new Error('Der Text ist sehr kurz – bitte prüfe, ob versehentlich etwas gelöscht wurde.');
  const ok = await confirmBox(`Fassung ${t.version + 1} veröffentlichen?`, `Die neue Fassung erscheint sofort im Partner-Dashboard und auf kfl-group.com/pages/agb-partner. Die bisherige Fassung ${t.version} bleibt im Archiv.${d.reconsent ? ' Alle Partner müssen die neue Fassung beim nächsten Öffnen bestätigen.' : ''}`, 'Jetzt veröffentlichen');
  if (!ok) return;
  const r = await PUT('/partner-terms', { html: htmlStr, base_version: t.version, note: d.note, stand: !!d.stand, notify: !!d.notify, reconsent: !!d.reconsent });
  S.termsDirty = false; window.scrollTo(0, 0);
  toast(`Fassung ${r.version} veröffentlicht${d.notify ? ' · Partner informiert' : ''}${r.shop_sync && r.shop_sync.ok ? ' · Webseite aktualisiert' : ''}.`);
  reload();
};
