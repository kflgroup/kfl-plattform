/* ===== Finanzbuchhaltung: Übersicht, Buchungen, Konten, Belegarchiv, Abschlüsse, Anfangsbestände & Import ===== */
const FIBU_TABS = () => [['uebersicht', 'Übersicht', '#/fibu'], ['buchungen', 'Buchungen', '#/fibu/buchungen'], ['konten', 'Konten', '#/fibu/konten'], ['belege', 'Belegarchiv', '#/fibu/belege'],
  ['abschluesse', 'Abschlüsse', '#/fibu/abschluesse'], can('fibu_manage') && ['import', 'Anfangsbestände & Import', '#/fibu/import']];
const FIBU_TYPE_LABEL = { aktiv: 'Aktiv', passiv: 'Passiv', aufwand: 'Aufwand', ertrag: 'Ertrag' };
const FIBU_SOURCE = { manuell: 'Manuell', rechnung: 'Ausgangsrechnung', zahlung: 'Zahlungseingang', mahngebuehr: 'Mahngebühr', eingangsrechnung: 'Eingangsrechnung', zahlung_er: 'Zahlung Eingangsrechnung', eroeffnung: 'Anfangsbestand', import: 'Import', storno: 'Storno' };
const fibuHead = (tab) => html`${head('Finanzbuchhaltung', 'Konten, Buchungen, Belegarchiv und Abschlüsse.',
  can('fibu_book') ? html`<button class="btn" data-act="fibuDoc">${icon('upload')}Beleg hochladen</button><button class="btn btn-primary" data-act="fibuEntry">${icon('plus')}Buchung erfassen</button>` : '')}${tabsBar(FIBU_TABS(), tab)}`;
let FIBU_ACC = null;
async function fibuAccounts(force) { if (!FIBU_ACC || force) FIBU_ACC = (await GET('/fibu/accounts')).accounts; return FIBU_ACC; }
const accOpt = (list) => list.filter((a) => a.status === 'offen').map((a) => [a.id, `${a.number} · ${a.name}`]);
const monthName = (p) => (p.length === 4 ? `Jahr ${p}` : `${['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'][+p.slice(5) - 1]} ${p.slice(0, 4)}`);
const PER_STATUS = { abgeschlossen: ['Abgeschlossen', 'ok'], wieder_geoeffnet: ['Wieder geöffnet', 'warn'], offen: ['Offen', 'info'], laufend: ['Laufend', 'neutral'] };

async function pageFibu(tab = 'uebersicht') {
  const P = page('fibu');
  if (!can('fibu_view')) return P.show(noAccess());
  const fn = { uebersicht: fibuOverview, buchungen: fibuEntries, konten: fibuAccountsPage, belege: fibuDocs, abschluesse: fibuPeriods, import: fibuImport }[tab] || fibuOverview;
  await fn(P, tab);
}
function entryRow(e) {
  return html`<tr class="clickable ${e.reversed_by || e.reverses ? 'is-muted' : ''}" data-act="fibuEntryOpen" data-id="${e.id}"><td class="nowrap num"><b>${e.number}</b><span class="cell-sub">${fDate(e.date)}</span></td>
    <td>${e.text}<span class="cell-sub">${FIBU_SOURCE[e.source] || e.source}${e.reversed_by ? ' · storniert' : ''}</span></td><td class="small acct-cell">${e.debit.map((x) => html`<div title="${x}">${x}</div>`)}</td><td class="small acct-cell">${e.credit.map((x) => html`<div title="${x}">${x}</div>`)}</td>
    <td class="r num">${fEur(e.amount)}</td><td>${e.doc_number ? html`<span class="tag">${e.doc_number}</span>` : html`<span class="muted small">–</span>`}</td></tr>`;
}
const accShort = (x) => String(x || '').split(' ')[0];
const entryRowCompact = (e) => html`<tr class="clickable ${e.reversed_by || e.reverses ? 'is-muted' : ''}" data-act="fibuEntryOpen" data-id="${e.id}"><td class="nowrap num"><b>${e.number}</b><span class="cell-sub">${fDate(e.date)}</span></td>
    <td>${e.text}<span class="cell-sub">${e.debit.map(accShort).join(', ')} an ${e.credit.map(accShort).join(', ')} · ${FIBU_SOURCE[e.source] || e.source}</span></td><td class="r num nowrap">${fEur(e.amount)}</td></tr>`;
const entryTableCompact = (list) => html`<div class="table-wrap"><table class="table"><thead><tr><th>Buchung</th><th>Text · Soll an Haben</th><th class="r">Betrag</th></tr></thead><tbody>${list.map(entryRowCompact)}</tbody></table></div>`;
const entryTable = (list) => html`<div class="table-wrap"><table class="table"><thead><tr><th>Buchung</th><th>Text</th><th>Soll</th><th>Haben</th><th class="r">Betrag</th><th>Beleg</th></tr></thead><tbody>${list.map(entryRow)}</tbody></table></div>`;

async function fibuOverview(P, tab) {
  const d = await GET('/fibu/overview'); if (!P.alive()) return;
  const k = d.kpis;
  P.show(html`${fibuHead(tab)}
    <div class="kpis fibu-kpis mt"><a class="kpi" href="#/fibu/konten"><b>${fEur(k.bank)}</b><span>Bank</span></a><div class="kpi"><b>${fEur(k.kasse)}</b><span>Kasse</span></div>
      <div class="kpi"><b>${fEur(k.forderungen)}</b><span>Forderungen (offen)</span></div><div class="kpi"><b>${fEur(k.verbindlichkeiten)}</b><span>Verbindlichkeiten</span></div>
      <div class="kpi"><b class="${k.monthResult < 0 ? 'neg' : 'pos'}">${fEur(k.monthResult)}</b><span>Ergebnis diesen Monat</span></div><div class="kpi"><b class="${k.yearResult < 0 ? 'neg' : 'pos'}">${fEur(k.yearResult)}</b><span>Ergebnis seit Jahresbeginn</span></div>
      <div class="kpi"><b>${fEur(k.ust)}</b><span>USt-Zahllast (minus = Erstattung)</span></div><a class="kpi ${d.unbooked ? 'hot' : ''}" href="#/buchhaltung/eingang"><b>${fNum(d.unbooked)}</b><span>Eingangsrechnungen nicht gebucht</span></a></div>
    <div class="detail-grid mt"><section class="panel"><div class="panel-head"><h2>Letzte Buchungen</h2><a class="btn btn-sm btn-ghost" href="#/fibu/buchungen">Alle</a></div>${d.recent.length ? entryTableCompact(d.recent) : html`<div class="panel-body">${empty('Noch keine Buchungen', 'Rechnungen, Zahlungen und Eingangsrechnungen werden automatisch gebucht. Manuelle Buchungen über „Buchung erfassen“.')}</div>`}</section>
      <section class="panel"><div class="panel-head"><h2>Stand</h2></div><div class="panel-body">${kv([['Buchungen gesamt', fNum(d.entries)], ['Belege im Archiv', fNum(d.docs)], ['Letzter Abschluss', d.lastClose ? `${monthName(d.lastClose.period)} (${fDT(d.lastClose.closed_at)})` : 'noch keiner'], ['Nächster Monatsabschluss', 'automatisch am 1. des Folgemonats, 1:00 Uhr']])}
        <p class="small muted mt">Automatisch gebucht werden: Ausgangsrechnungen (Forderung an Erlöse + USt), Zahlungseingänge (Bank an Forderung), Mahngebühren, Eingangsrechnungen (Aufwand + Vorsteuer an Verbindlichkeit) und deren Zahlung.</p></div></section></div>`);
}

async function fibuEntries(P, tab) {
  const q = hashQuery();
  const [d, accs] = await Promise.all([GET('/fibu/entries', q), fibuAccounts(true)]); if (!P.alive()) return;
  P.show(html`${fibuHead(tab)}<section class="panel mt"><form class="toolbar" data-submit="fibuFilter"><label class="search">${icon('search')}<input name="q" value="${q.q || ''}" placeholder="Text, Buchungs- oder Belegnummer" aria-label="Suche"></label>
      <input type="month" name="period" value="${q.period || ''}" aria-label="Monat">${sel('account', accs.map((a) => [a.id, `${a.number} · ${a.name}`]), q.account, { empty: 'Alle Konten', attrs: 'aria-label="Konto"' })}
      ${sel('source', Object.entries(FIBU_SOURCE), q.source, { empty: 'Alle Arten', attrs: 'aria-label="Art"' })}<button class="btn btn-sm btn-dark" type="submit">Filtern</button></form>
    ${d.entries.length ? entryTable(d.entries) : html`<div class="panel-body">${empty('Keine Buchungen', 'Passe den Filter an oder erfasse eine Buchung.')}</div>`}</section>`);
}
SUBMIT.fibuFilter = (d) => setHashQuery(d, '#/fibu/buchungen');
ACT.fibuEntryOpen = async (b) => {
  const { entry: e } = await GET('/fibu/entries/' + b.dataset.id);
  modal({ title: `Buchung ${e.number}`, wide: true, body: html`${kv([['Datum', fDate(e.date)], ['Text', e.text], ['Art', FIBU_SOURCE[e.source] || e.source], ['Erfasst', `${e.created_by || 'System'} · ${fDT(e.created_at)}`], ['Beleg', e.doc_id ? html`<a class="link" target="_blank" rel="noopener" href="${fileUrl(`/fibu/docs/${e.doc_id}/file`)}">${e.doc_number} öffnen</a>` : 'kein Beleg'], e.reversed_by && ['Status', 'storniert (Gegenbuchung vorhanden)'], e.reverses && ['Storno zu', 'Buchung #' + e.reverses]])}
    <table class="table mt"><thead><tr><th>Konto</th><th class="r">Soll</th><th class="r">Haben</th></tr></thead><tbody>${e.lines.map((l) => html`<tr><td>${l.number} ${l.name}</td><td class="r num">${l.debit ? fEur(l.debit) : ''}</td><td class="r num">${l.credit ? fEur(l.credit) : ''}</td></tr>`)}</tbody></table>`,
    foot: html`${can('fibu_book') && !e.reversed_by && !e.reverses ? html`<button class="btn btn-ghost" data-act="fibuReverse" data-id="${e.id}">Stornieren</button>` : ''}${can('fibu_book') && !e.doc_id ? html`<button class="btn" data-act="fibuEntryDoc" data-id="${e.id}">${icon('upload')}Beleg zuordnen</button>` : ''}<span class="spacer"></span><button class="btn btn-dark" data-close>Schließen</button>` });
};
ACT.fibuReverse = async (b) => { const d = await ask({ title: 'Buchung stornieren?', text: 'Es wird eine Gegenbuchung erstellt. Die ursprüngliche Buchung bleibt unverändert sichtbar (keine Löschung).', ok: 'Stornieren', danger: true, fields: field('Grund *', inp('reason', '', { req: true, attrs: 'minlength="3"' })) }); if (!d) return; const r = await POST(`/fibu/entries/${b.dataset.id}/reverse`, { reason: d.reason }); closeModal(); toast(`Storniert (${r.number}).`); reload(); };
ACT.fibuEntryDoc = async (b) => { const d = await ask({ title: 'Beleg zuordnen', ok: 'Zuordnen', fields: html`${field('Beleg (PDF)', raw('<input type="file" name="file" accept="application/pdf" required>'))}${field('Belegart', sel('doc_kind', Object.entries(S.fibuKinds || { sonstiges: 'Sonstiger Beleg' }), 'sonstiges'))}` }); if (!d) return; const file = await fileField(d._form.elements.file, { max: 10 }); await POST(`/fibu/entries/${b.dataset.id}/doc`, { file, doc_kind: d.doc_kind }); closeModal(); toast('Beleg zugeordnet.'); reload(); };

// Neue Buchung (Soll an Haben, mit optionaler USt-Aufteilung und Beleg)
ACT.fibuEntry = async () => {
  const accs = await fibuAccounts(true);
  if (!S.fibuKinds) S.fibuKinds = (await GET('/fibu/docs', { q: '___' })).kinds;
  const d = await ask({ title: 'Buchung erfassen', wide: true, ok: 'Buchen', fields: html`<div class="grid-2">${field('Buchungsdatum *', inp('date', todayISO(), { type: 'date', req: true }))}${field('Betrag (brutto) *', inp('amount', '', { req: true, ph: '0,00', attrs: 'inputmode="decimal"' }))}
      ${field('Soll-Konto *', sel('debit', accOpt(accs), '', { empty: 'Bitte wählen', attrs: 'required' }), 'z. B. Aufwand, Bank bei Einzahlung')}${field('Haben-Konto *', sel('credit', accOpt(accs), '', { empty: 'Bitte wählen', attrs: 'required' }), 'z. B. Bank bei Zahlung, Erlöse')}
      ${field('Umsatzsteuer', sel('vat_rate', [['0', 'keine Aufteilung'], ['19', '19 % herausrechnen'], ['7', '7 % herausrechnen']], '0'), 'Vorsteuer bei Aufwand, Umsatzsteuer bei Erlös')}${field('Buchungstext *', inp('text', '', { req: true, ph: 'z. B. Miete November' }))}
      ${field('Beleg (PDF)', raw('<input type="file" name="file" accept="application/pdf">'), 'wird nummeriert archiviert')}${field('Belegart', sel('doc_kind', Object.entries(S.fibuKinds), 'sonstiges'))}</div>` });
  if (!d) return; const file = await fileField(d._form.elements.file, { max: 10 }); delete d._form;
  const r = await POST('/fibu/entries', { ...d, debit: +d.debit, credit: +d.credit, file });
  toast(`Gebucht: ${r.number}${r.doc ? ' · Beleg ' + r.doc : ''}`); FIBU_ACC = null; reload();
};

async function fibuAccountsPage(P, tab) {
  const accs = await fibuAccounts(true); if (!P.alive()) return;
  const q = hashQuery(), t = q.type || '';
  const list = accs.filter((a) => (!t || a.type === t) && (q.show === 'alle' || a.status === 'offen' || a.saldo));
  P.show(html`${fibuHead(tab)}<section class="panel mt"><div class="toolbar">${[['', 'Alle'], ['aktiv', 'Aktiv'], ['passiv', 'Passiv'], ['aufwand', 'Aufwand'], ['ertrag', 'Ertrag']].map(([k, l]) => html`<a class="btn btn-sm ${t === k ? 'btn-dark' : 'btn-ghost'}" href="#/fibu/konten${qs({ ...q, type: k })}">${l}</a>`)}
      <a class="btn btn-sm btn-ghost" href="#/fibu/konten${qs({ ...q, show: q.show === 'alle' ? '' : 'alle' })}">${q.show === 'alle' ? 'Geschlossene ausblenden' : 'Geschlossene zeigen'}</a><span class="spacer"></span>${can('fibu_book') ? html`<button class="btn btn-sm btn-primary" data-act="fibuAccNew">${icon('plus')}Konto anlegen</button>` : ''}</div>
    <div class="table-wrap"><table class="table"><thead><tr><th>Konto</th><th>Bezeichnung</th><th>Art</th><th class="r">Soll</th><th class="r">Haben</th><th class="r">Saldo</th><th>Status</th></tr></thead><tbody>
      ${list.map((a) => html`<tr class="clickable" data-act="fibuAccOpen" data-id="${a.id}"><td class="strong num">${a.number}</td><td>${a.name}${a.sys ? html`<span class="cell-sub">Systemkonto (automatische Buchungen)</span>` : ''}</td><td>${FIBU_TYPE_LABEL[a.type]}</td>
        <td class="r num">${fEur(a.debit)}</td><td class="r num">${fEur(a.credit)}</td><td class="r num strong">${fEur(a.saldo)}</td><td>${a.status === 'offen' ? badge('Offen', 'ok') : badge('Geschlossen', 'muted')}</td></tr>`)}</tbody></table></div></section>`);
}
ACT.fibuAccNew = async () => {
  const d = await ask({ title: 'Konto anlegen', ok: 'Anlegen', fields: html`<div class="grid-2">${field('Kontonummer *', inp('number', '', { req: true, ph: 'z. B. 4980', attrs: 'inputmode="numeric" pattern="[0-9]{3,8}"' }))}${field('Kontoart *', sel('type', Object.entries({ aufwand: 'Aufwandskonto', ertrag: 'Ertragskonto', aktiv: 'Aktivkonto (Vermögen, Bank)', passiv: 'Passivkonto (Schulden, Kapital)' }), 'aufwand'))}</div>${field('Bezeichnung *', inp('name', '', { req: true }))}${field('Notiz', inp('note', ''))}` });
  if (!d) return; await POST('/fibu/accounts', d); toast('Konto angelegt.'); FIBU_ACC = null; reload();
};
ACT.fibuAccOpen = async (b) => {
  const d = await GET('/fibu/accounts/' + b.dataset.id); const a = d.account;
  modal({ title: `Konto ${a.number} · ${a.name}`, wide: true, body: html`<div class="row-between"><div class="small muted">${FIBU_TYPE_LABEL[a.type]}konto${a.sys ? ' · Systemkonto' : ''}${a.status !== 'offen' ? ` · geschlossen am ${fDT(a.closed_at)} von ${a.closed_by}` : ''}</div><div class="strong">Saldo ${fEur(d.saldo)}</div></div>
    ${d.items.length ? html`<div class="table-wrap mt"><table class="table"><thead><tr><th>Datum</th><th>Buchung</th><th>Text</th><th class="r">Soll</th><th class="r">Haben</th><th class="r">Saldo</th></tr></thead><tbody>${d.items.map((i) => html`<tr><td>${fDate(i.date)}</td><td class="num">${i.number}${i.doc_number ? html`<span class="cell-sub">${i.doc_number}</span>` : ''}</td><td>${i.text}</td><td class="r num">${i.debit ? fEur(i.debit) : ''}</td><td class="r num">${i.credit ? fEur(i.credit) : ''}</td><td class="r num">${fEur(i.balance)}</td></tr>`)}</tbody></table></div>` : html`<p class="muted mt">Noch keine Buchungen auf diesem Konto.</p>`}`,
    foot: html`${can('fibu_manage') && a.status === 'offen' && !a.sys ? html`<button class="btn btn-ghost" data-act="fibuAccClose" data-id="${a.id}" data-name="${a.number} ${a.name}">Konto schließen</button>` : ''}${S.user.role === 'admin' && a.status !== 'offen' ? html`<button class="btn" data-act="fibuAccReopen" data-id="${a.id}">Wieder öffnen</button>` : ''}<span class="spacer"></span><button class="btn btn-dark" data-close>Schließen</button>` });
};
ACT.fibuAccClose = async (b) => { const d = await ask({ title: `Konto ${b.dataset.name} schließen?`, text: 'Auf geschlossene Konten kann nicht mehr gebucht werden. Das Konto muss dafür ausgeglichen sein (Saldo 0). Nur der Admin kann es wieder öffnen.', ok: 'Schließen', danger: true, fields: field('Grund', inp('reason', '')) }); if (!d) return; await POST(`/fibu/accounts/${b.dataset.id}/close`, d); closeModal(); toast('Konto geschlossen.'); FIBU_ACC = null; reload(); };
ACT.fibuAccReopen = async (b) => { await POST(`/fibu/accounts/${b.dataset.id}/reopen`); closeModal(); toast('Konto wieder geöffnet.'); FIBU_ACC = null; reload(); };

async function fibuDocs(P, tab) {
  const q = hashQuery(); const d = await GET('/fibu/docs', q); if (!P.alive()) return; S.fibuKinds = d.kinds;
  P.show(html`${fibuHead(tab)}<section class="panel mt"><form class="toolbar" data-submit="fibuDocFilter"><label class="search">${icon('search')}<input name="q" value="${q.q || ''}" placeholder="Belegnummer, Titel, Lieferant, Referenz" aria-label="Suche"></label>
      ${sel('kind', Object.entries(d.kinds), q.kind, { empty: 'Alle Belegarten', attrs: 'aria-label="Belegart"' })}<input name="year" value="${q.year || ''}" placeholder="Jahr" size="5" aria-label="Jahr"><button class="btn btn-sm btn-dark" type="submit">Suchen</button>
      <span class="spacer"></span><span class="small muted">Belege werden fortlaufend nummeriert, mit Prüfsumme gespeichert und nie gelöscht.</span></form>
    ${d.docs.length ? html`<div class="table-wrap"><table class="table"><thead><tr><th>Beleg</th><th>Datum</th><th>Art</th><th>Titel</th><th class="r">Betrag</th><th>Buchungen</th><th></th></tr></thead><tbody>${d.docs.map((x) => html`<tr><td class="strong num nowrap">${x.number}${x.ref ? html`<span class="cell-sub">Ref. ${x.ref}</span>` : ''}</td><td>${fDate(x.date)}</td><td>${d.kinds[x.kind] || x.kind}</td>
      <td>${x.title}${x.counterparty ? html`<span class="cell-sub">${x.counterparty}</span>` : ''}<span class="cell-sub" title="SHA-256 Prüfsumme">${x.sha256 ? 'SHA-256 ' + x.sha256.slice(0, 12) + '…' : ''} · ${x.created_by} · ${fDT(x.created_at)}</span></td><td class="r num">${x.amount != null ? fEur(x.amount) : '–'}</td><td class="small nowrap">${x.entries ? String(x.entries).split(/,\s*/).map((n) => html`<div>${n}</div>`) : html`<span class="muted">nicht verbucht</span>`}</td>
      <td class="r"><a class="btn btn-sm" target="_blank" rel="noopener" href="${fileUrl(`/fibu/docs/${x.id}/file`)}">${icon('file')}PDF</a></td></tr>`)}</tbody></table></div>` : html`<div class="panel-body">${empty('Noch keine Belege', 'Belege entstehen automatisch bei Rechnungen und Eingangsrechnungen oder über „Beleg hochladen“.')}</div>`}</section>`);
}
SUBMIT.fibuDocFilter = (d) => setHashQuery(d, '#/fibu/belege');
ACT.fibuDoc = async () => {
  if (!S.fibuKinds) S.fibuKinds = (await GET('/fibu/docs', { q: '___' })).kinds;
  const d = await ask({ title: 'Belege hochladen', wide: true, ok: 'Archivieren', text: 'Mehrere PDFs auf einmal möglich. Jeder Beleg erhält eine fortlaufende Belegnummer. Der Dateiname wird als Referenz gespeichert (z. B. für den Import alter Buchungen).', fields: html`${field('Belege (PDF) *', raw('<input type="file" name="files" accept="application/pdf" multiple required>'))}
    <div class="grid-2">${field('Belegart', sel('kind', Object.entries(S.fibuKinds), 'eingangsrechnung'))}${field('Belegdatum', inp('date', todayISO(), { type: 'date' }))}${field('Aussteller / Lieferant', inp('counterparty', ''))}${field('Betrag (optional)', inp('amount', '', { attrs: 'inputmode="decimal"' }))}</div>` });
  if (!d) return; const files = [...d._form.elements.files.files]; let n = 0, last = '';
  for (const f of files) { if (f.size > 10 * 1024 * 1024) { toast(`${f.name}: zu groß (max. 10 MB)`, 'err'); continue; } const r = await POST('/fibu/docs', { kind: d.kind, date: d.date, counterparty: d.counterparty, amount: files.length === 1 ? d.amount : '', title: f.name.replace(/\.pdf$/i, ''), file: { name: f.name, type: f.type || 'application/pdf', base64: await fileToB64(f) } }); n++; last = r.number; }
  toast(n === 1 ? `Beleg ${last} archiviert.` : `${n} Belege archiviert.`); if (location.hash.startsWith('#/fibu/belege')) reload(); else location.hash = '#/fibu/belege';
};

async function fibuPeriods(P, tab) {
  const d = await GET('/fibu/periods'); if (!P.alive()) return;
  const row = (p) => html`<tr class="clickable" data-act="fibuPerOpen" data-p="${p.period}"><td class="strong">${monthName(p.period)}</td><td>${badge(...(PER_STATUS[p.status] || [p.status, 'neutral']))}${p.closed_at ? html`<span class="cell-sub">${p.closed_by} · ${fDT(p.closed_at)}</span>` : ''}</td>
    <td class="r num ${p.result < 0 ? 'neg' : ''}">${p.result != null ? fEur(p.result) : '–'}</td><td class="r nowrap"><a class="btn btn-sm btn-ghost" target="_blank" rel="noopener" href="${fileUrl(`/fibu/periods/${p.period}/pdf`)}">${icon('file')}${p.has_pdf ? 'PDF' : 'Vorschau'}</a></td></tr>`;
  P.show(html`${fibuHead(tab)}<div class="info-box mt">${icon('calendar')}<span>Der <b>Monatsabschluss</b> wird automatisch am 1. des Folgemonats um 1:00 Uhr erstellt, der <b>Jahresabschluss</b> am 1. Januar. Die Geschäftsführung bekommt jeweils eine Nachricht mit dem Ergebnis. Abgeschlossene Zeiträume sind für Buchungen gesperrt – nur der Admin kann sie wieder öffnen.</span></div>
    <div class="grid-2 mt"><section class="panel"><div class="panel-head"><h2>Monate</h2></div><div class="table-wrap"><table class="table"><thead><tr><th>Zeitraum</th><th>Status</th><th class="r">Ergebnis</th><th></th></tr></thead><tbody>${d.months.map(row)}</tbody></table></div></section>
      <section class="panel"><div class="panel-head"><h2>Jahre</h2></div><div class="table-wrap"><table class="table"><thead><tr><th>Zeitraum</th><th>Status</th><th class="r">Ergebnis</th><th></th></tr></thead><tbody>${d.years.map(row)}</tbody></table></div></section></div>`);
}
ACT.fibuPerOpen = async (b) => {
  const per = b.dataset.p, d = await GET('/fibu/periods/' + per), r = d.report;
  const closable = can('fibu_manage') && d.status !== 'abgeschlossen' && r.to < todayISO();
  modal({ title: `${r.kind === 'jahr' ? 'Jahresabschluss' : 'Monatsabschluss'} ${monthName(per)}`, wide: true, body: html`<div class="row-between"><div>${badge(...(PER_STATUS[d.status] || [d.status === 'offen' && r.to >= todayISO() ? 'Laufend' : 'Offen', 'info']))} <span class="small muted">${fDate(r.from)} – ${fDate(r.to)} · ${r.entries} Buchungen · ${r.docs} Belege</span></div><a class="btn btn-sm" target="_blank" rel="noopener" href="${fileUrl(`/fibu/periods/${per}/pdf`)}">${icon('file')}PDF</a></div>
    <div class="kpis fibu-kpis mt"><div class="kpi"><b>${fEur(r.income)}</b><span>Erträge</span></div><div class="kpi"><b>${fEur(r.expense)}</b><span>Aufwand</span></div><div class="kpi"><b class="${r.result < 0 ? 'neg' : 'pos'}">${fEur(r.result)}</b><span>${r.result < 0 ? 'Verlust' : 'Gewinn'}</span></div>${r.ytdResult != null ? html`<div class="kpi"><b>${fEur(r.ytdResult)}</b><span>seit Jahresbeginn</span></div>` : ''}</div>
    <h3 class="mt-l">Summen- und Saldenliste</h3><div class="table-wrap"><table class="table"><thead><tr><th>Konto</th><th>Bezeichnung</th><th class="r">Vortrag</th><th class="r">Soll</th><th class="r">Haben</th><th class="r">Saldo</th></tr></thead><tbody>${r.accounts.map((a) => html`<tr><td class="num">${a.number}</td><td>${a.name}</td><td class="r num">${fEur(a.opening)}</td><td class="r num">${fEur(a.debit)}</td><td class="r num">${fEur(a.credit)}</td><td class="r num strong">${fEur(a.saldo)}</td></tr>`)}</tbody></table></div>`,
    foot: html`${closable ? html`<button class="btn btn-primary" data-act="fibuPerClose" data-p="${per}">${icon('check')}Jetzt abschließen</button>` : ''}${S.user.role === 'admin' && d.status === 'abgeschlossen' ? html`<button class="btn btn-ghost" data-act="fibuPerReopen" data-p="${per}">Wieder öffnen</button>` : ''}<span class="spacer"></span><button class="btn btn-dark" data-close>Schließen</button>` });
};
ACT.fibuPerClose = async (b) => { if (!(await confirmBox(`${monthName(b.dataset.p)} abschließen?`, 'Der Bericht wird als PDF im Belegarchiv abgelegt, die Geschäftsführung bekommt eine Nachricht und der Zeitraum wird für Buchungen gesperrt.', 'Abschließen'))) return; const r = await POST(`/fibu/periods/${b.dataset.p}/close`); closeModal(); toast(`Abgeschlossen · Ergebnis ${fEur(r.result)}`); reload(); };
ACT.fibuPerReopen = async (b) => { if (!(await confirmBox('Zeitraum wieder öffnen?', 'Danach sind Buchungen in diesem Zeitraum wieder möglich. Der bisherige Abschlussbericht bleibt im Belegarchiv erhalten; beim erneuten Abschließen entsteht ein neuer.', 'Wieder öffnen', true))) return; await POST(`/fibu/periods/${b.dataset.p}/reopen`); closeModal(); toast('Zeitraum wieder geöffnet.'); reload(); };

// Anfangsbestände festlegen und alte Buchführung importieren (GF und Admin)
let FIBU_IMPORT = null;
async function fibuImport(P, tab) {
  if (!can('fibu_manage')) return P.show(noAccess());
  const accs = (await fibuAccounts(true)).filter((a) => a.status === 'offen' && (a.type === 'aktiv' || a.type === 'passiv') && a.sys !== 'eroeffnung'); if (!P.alive()) return;
  const imp = FIBU_IMPORT;
  P.show(html`${fibuHead(tab)}<div class="grid-2 mt"><form class="panel" data-submit="fibuOpening"><div class="panel-head"><h2>Anfangsbestände festlegen</h2></div><div class="panel-body stack">
      <p class="small muted">Kontostände zum Start (z. B. Bankguthaben, offene Verbindlichkeiten, Eigenkapital). Gebucht wird gegen das Konto 9000 Saldenvorträge. Betrag auf der üblichen Seite eintragen (Vermögen = Guthaben, Schulden = offener Betrag); ein Minus kehrt die Seite um.</p>
      ${field('Stichtag *', inp('date', todayISO().slice(0, 7) + '-01', { type: 'date', req: true }))}
      <div class="opening-list">${accs.map((a) => html`<label class="opening-row"><span><b class="num">${a.number}</b> ${a.name}<span class="cell-sub">${FIBU_TYPE_LABEL[a.type]} · aktuell ${fEur(a.saldo)}</span></span><input name="ob_${a.id}" placeholder="0,00" inputmode="decimal" aria-label="Anfangsbestand ${a.number}"></label>`)}</div>
      ${field('Nachweis (PDF, optional)', raw('<input type="file" name="file" accept="application/pdf">'), 'z. B. Kontoauszug oder Saldenliste zum Stichtag')}
      <button class="btn btn-primary" type="submit">${icon('check')}Anfangsbestände buchen</button></div></form>
    <div class="stack"><form class="panel" data-submit="fibuImportParse"><div class="panel-head"><h2>Alte Buchführung importieren</h2></div><div class="panel-body stack">
      <p class="small muted">Lade eine <b>Summen- und Saldenliste</b> oder ein <b>Buchungsjournal</b> als PDF (mit Text, kein Scan) oder CSV hoch. Das System liest die Zeilen aus – du prüfst die Vorschau und übernimmst sie. Das PDF wird im Belegarchiv abgelegt.</p>
      ${field('Datei (PDF oder CSV) *', raw('<input type="file" name="file" accept="application/pdf,.csv,text/csv,text/plain" required>'), 'CSV-Spalten: Datum;Beleg;Text;Soll;Haben;Betrag')}<button class="btn btn-dark" type="submit">${icon('upload')}Auslesen</button></div></form>
      <section class="panel"><div class="panel-head"><h2>Belege zur alten Buchführung</h2></div><div class="panel-body stack-s"><p class="small muted">Lade die zugehörigen Belege als PDF hoch. Heißt eine Datei wie die Belegnummer im Journal (z. B. <code>R-100.pdf</code>), wird sie beim Import automatisch der Buchung zugeordnet.</p><button class="btn" data-act="fibuDoc">${icon('upload')}Belege hochladen</button></div></section></div></div>
    ${imp ? html`<section class="panel mt"><div class="panel-head"><h2>Vorschau: ${imp.rows.length} Zeilen erkannt</h2><span class="small muted">${imp.lineCount} Textzeilen gelesen</span></div><form class="panel-body stack" data-submit="fibuImportCommit">
      ${imp.rows.length ? html`<div class="row">${field('Übernehmen als', sel('mode', imp.rows.some((r) => r.kind === 'buchung') ? [['buchungen', 'Buchungen (Journal)'], ['eroeffnung', 'Anfangsbestände (Salden)']] : [['eroeffnung', 'Anfangsbestände (Salden)'], ['buchungen', 'Buchungen (Journal)']], imp.rows.some((r) => r.kind === 'buchung') ? 'buchungen' : 'eroeffnung'))}${field('Stichtag für Salden', inp('date', todayISO().slice(0, 7) + '-01', { type: 'date' }))}</div>
        <div class="table-wrap"><table class="table"><thead><tr><th></th><th>Art</th><th>Datum</th><th>Konto / Soll</th><th>Bezeichnung / Haben</th><th>Text</th><th class="r">Betrag</th></tr></thead><tbody>${imp.rows.map((r, i) => html`<tr><td><input type="checkbox" name="row_${i}" checked aria-label="Zeile übernehmen"></td><td>${r.kind === 'saldo' ? 'Saldo' : 'Buchung'}</td><td>${r.date ? fDate(r.date) : ''}</td><td class="num">${r.kind === 'saldo' ? r.number : r.debit}</td><td>${r.kind === 'saldo' ? r.name : r.credit}</td><td>${r.kind === 'saldo' ? (r.side === 'H' ? 'Haben' : 'Soll') : r.text}${r.ref ? html`<span class="cell-sub">Beleg ${r.ref}</span>` : ''}</td><td class="r num">${fEur(r.amount)}</td></tr>`)}</tbody></table></div>
        <p class="small muted">Unbekannte Kontonummern werden automatisch angelegt (Kontoart nach SKR03-Logik, später änderbar). Bitte vor der Übernahme prüfen.</p><div class="row"><button class="btn btn-primary" type="submit">${icon('check')}Ausgewählte Zeilen übernehmen</button><button class="btn btn-ghost" type="button" data-act="fibuImportClear">Verwerfen</button></div>`
        : html`<div class="note-box">${icon('alert')}<span>${imp.textFound ? 'Es wurden keine Salden- oder Buchungszeilen erkannt. Bitte prüfe das Format (Beispiel unten) oder nutze eine CSV-Datei.' : 'Das PDF enthält keinen lesbaren Text (vermutlich ein Scan). Bitte ein PDF mit Text oder eine CSV-Datei verwenden.'}</span></div>${imp.sample.length ? html`<pre class="pre small sample">${imp.sample.join('\n')}</pre>` : ''}`}</form></section>` : ''}`);
}
SUBMIT.fibuOpening = async (d, f) => {
  const rows = Object.entries(d).filter(([k, v]) => k.startsWith('ob_') && String(v).trim()).map(([k, v]) => ({ account_id: +k.slice(3), amount: v }));
  if (!rows.length) throw new Error('Bitte mindestens einen Kontostand eintragen.');
  if (!(await confirmBox('Anfangsbestände buchen?', `${rows.length} Kontostände zum ${fDate(d.date)} werden gegen 9000 Saldenvorträge gebucht.`, 'Buchen'))) return;
  const file = await fileField(f.elements.file, { max: 10 }); const r = await POST('/fibu/opening', { date: d.date, rows, file }); toast(`${r.created} Anfangsbestände gebucht.`); FIBU_ACC = null; reload();
};
SUBMIT.fibuImportParse = async (d, f) => { const file = await fileField(f.elements.file, { max: 10 }); if (!file) throw new Error('Bitte eine Datei wählen.'); FIBU_IMPORT = await POST('/fibu/import/parse', { file }); toast(`${FIBU_IMPORT.rows.length} Zeilen erkannt.`); reload(); };
SUBMIT.fibuImportCommit = async (d) => {
  const rows = FIBU_IMPORT.rows.filter((r, i) => d['row_' + i]);
  if (!(await confirmBox(`${rows.length} Zeilen übernehmen?`, d.mode === 'eroeffnung' ? `Die Salden werden als Anfangsbestände zum ${fDate(d.date)} gebucht.` : 'Die Buchungen werden mit ihrem Originaldatum übernommen.', 'Übernehmen'))) return;
  const r = await POST('/fibu/import/commit', { mode: d.mode, date: d.date, rows, docId: FIBU_IMPORT.docId }); FIBU_IMPORT = null; toast(`${r.created} Buchungen übernommen.`); FIBU_ACC = null; location.hash = '#/fibu/buchungen';
};
ACT.fibuImportClear = () => { FIBU_IMPORT = null; reload(); };
