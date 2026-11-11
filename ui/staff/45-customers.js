/* ===== Kunden: Besucher & Herkunft, Kundendatenbank (live aus Shopify) ===== */
const CU_TABS = () => [can('visitors_view') && ['besucher', 'Besucher & Herkunft', '#/kunden/besucher'], can('customers_view') && ['liste', 'Kundendatenbank', '#/kunden/liste']];
const cuHead = (tab, actions) => html`${head('Kunden', 'Besucher der Webseite und alle Kundenkonten aus dem Shopify-Shop – live abgerufen, nicht im Dashboard gespeichert.', actions)}${tabsBar(CU_TABS(), tab)}`;
const SRC_LABEL = { direct: 'Direkt (Adresse, Lesezeichen)', search: 'Suchmaschine', social: 'Social Media', email: 'E-Mail', paid: 'Werbeanzeigen', referral: 'Verweis von anderer Seite', unknown: 'Unbekannt' };
const DEVICE_LABEL = { desktop: 'Computer', mobile: 'Smartphone', tablet: 'Tablet', other: 'Sonstige' };
const COUNTRY_DE = { Germany: 'Deutschland', Austria: 'Österreich', Switzerland: 'Schweiz', 'United States': 'USA', Netherlands: 'Niederlande', France: 'Frankreich', Spain: 'Spanien', Finland: 'Finnland', Poland: 'Polen', 'United Kingdom': 'Großbritannien', Italy: 'Italien', Belgium: 'Belgien', Denmark: 'Dänemark' };
const CU_STATE = { ENABLED: ['Konto aktiv', 'ok'], INVITED: ['Eingeladen', 'info'], DISABLED: ['Ohne Konto (nur Bestellung)', 'muted'], DECLINED: ['Einladung abgelehnt', 'warn'] };
const cuState = (s) => badge(...(CU_STATE[s] || [s || '–', 'muted']));

function cuNotConfigured(tab) {
  return html`${cuHead(tab)}<section class="panel mt"><div class="panel-body stack">${empty('Shopify ist noch nicht verbunden', 'Für Besucherzahlen und Kundendatenbank braucht das Dashboard einen Lesezugang zu deinem Shop.')}
    ${isAdmin() ? html`<div class="info-box">${icon('key')}<div class="stack-s"><b>So verbindest du den Shop (einmalig, ca. 10 Minuten)</b>
      <ol class="steps"><li>Shopify-Admin → oben rechts auf den Shopnamen → <b>Dev Dashboard</b> → <b>App erstellen</b>, Name z. B. „KFL Dashboard“.</li>
      <li>In der App unter <b>Versionen</b> die Zugriffe <code>read_customers</code>, <code>read_orders</code> und <code>read_reports</code> wählen und unter <b>Geschützte Kundendaten</b> Name, E-Mail, Telefon und Adresse freigeben (Zweck: Kundenverwaltung). Version freigeben.</li>
      <li>Die App auf dem Shop <b>kfl-group.com</b> installieren.</li>
      <li>In der App unter <b>Einstellungen</b> Client-ID und Client-Secret kopieren.</li>
      <li>Cloudflare → Worker <code>tiny-lab-d971kfl-forms</code> → Einstellungen → Variablen und Secrets: <code>SHOPIFY_CLIENT_ID</code> und <code>SHOPIFY_CLIENT_SECRET</code> als <b>Secret</b> anlegen.</li></ol></div></div>` : html`<p class="muted">Bitte den Admin, den Shop zu verbinden.</p>`}</div></section>`;
}

async function pageCustomers(tab) {
  const P = page('kunden');
  if (!canAny('customers_view', 'visitors_view')) return P.show(noAccess());
  tab = tab || (can('visitors_view') ? 'besucher' : 'liste');
  if (tab === 'besucher' && !can('visitors_view')) tab = 'liste';
  if (tab === 'liste' && !can('customers_view')) tab = 'besucher';
  return tab === 'liste' ? cuList(P) : cuVisitors(P);
}

/* ---------- Besucher & Herkunft ---------- */
async function cuVisitors(P) {
  const q = hashQuery(), range = ['heute', '7', '30', '90'].includes(q.range) ? q.range : '7';
  const d = await GET('/customers/visitors', { range }); if (!P.alive()) return;
  if (!d.configured) return P.show(cuNotConfigured('besucher'));
  const t = d.totals, conv = t.sessions ? (t.orders / t.sessions) * 100 : 0;
  const hourLabel = (iso) => `${new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', hour: '2-digit', hourCycle: 'h23' }).format(new Date(iso))} Uhr`;
  const series = d.series.map((r) => d.range.grain === 'hour' ? { label: hourLabel(r.t), short: hourLabel(r.t).slice(0, 2), value: r.visitors } : { label: (d.range.grain === 'week' ? 'Woche ab ' : '') + fDate(r.t), short: String(r.t).slice(8, 10) + '.' + String(r.t).slice(5, 7), value: r.visitors });
  const live = d.shopAdmin ? String(d.shopAdmin).replace(/\/$/, '') + '/dashboards/live' : null;
  P.show(html`${cuHead('besucher', html`<button class="btn" data-act="cuRefresh">${icon('refresh')}Aktualisieren</button>${live ? html`<a class="btn" href="${live}" target="_blank" rel="noopener">${icon('external')}Live-Ansicht in Shopify</a>` : ''}`)}
    <section class="panel mt"><div class="toolbar">${[['heute', 'Heute'], ['7', '7 Tage'], ['30', '30 Tage'], ['90', '90 Tage']].map(([k, l]) => html`<a class="btn btn-sm ${range === k ? 'btn-dark' : 'btn-ghost'}" href="#/kunden/besucher${qs({ range: k })}">${l}</a>`)}<span class="spacer"></span><span class="small muted">Shopify Analytics · wenige Minuten Verzögerung</span></div>
    <div class="kpis kpis-flat kpis-4">
      <div class="kpi"><b>${fNum(d.now.visitors)}</b><span>Besucher seit ${d.now.hour ? hourLabel(d.now.hour) : 'Beginn der Stunde'} (aktuelle Stunde)</span></div>
      <div class="kpi"><b>${fNum(d.now.last24)}</b><span>Besucher letzte 24 Stunden</span></div>
      <div class="kpi"><b>${fNum(t.visitors)}</b><span>Besucher · ${d.range.label}</span></div>
      <div class="kpi"><b>${fNum(t.sessions)}</b><span>Sitzungen · ${d.range.label}</span></div>
      <div class="kpi"><b>${fNum(t.cart)}</b><span>mit Warenkorb</span></div>
      <div class="kpi"><b>${fNum(t.checkout)}</b><span>Kasse erreicht</span></div>
      <div class="kpi"><b>${fNum(t.orders)}</b><span>Bestellungen</span></div>
      <div class="kpi"><b>${fPct(conv)}</b><span>Conversion-Rate</span></div></div></section>
    <section class="panel mt"><div class="panel-head"><h2>Besucher ${d.range.grain === 'hour' ? 'pro Stunde' : d.range.grain === 'week' ? 'pro Woche' : 'pro Tag'}</h2></div><div class="panel-body">${barChart(series, { h: 180 })}</div></section>
    <div class="grid-2 mt">
      <section class="panel"><div class="panel-head"><h2>Woher kommen die Besucher?</h2></div><div class="panel-body">${hbars(d.sources.map((x) => ({ label: (SRC_LABEL[x.source] || x.source) + (x.name ? ' · ' + x.name : ''), value: x.sessions })))}</div></section>
      <section class="panel"><div class="panel-head"><h2>Orte</h2></div><div class="panel-body">${hbars(d.places.map((x) => ({ label: [x.city, COUNTRY_DE[x.country] || x.country].filter(Boolean).join(', ') || 'Unbekannt', value: x.sessions })))}</div></section>
      <section class="panel"><div class="panel-head"><h2>Einstiegsseiten</h2></div><div class="panel-body">${hbars(d.pages.map((x) => ({ label: x.path, value: x.sessions })))}</div></section>
      <section class="panel"><div class="panel-head"><h2>Geräte</h2></div><div class="panel-body">${hbars(d.devices.map((x) => ({ label: DEVICE_LABEL[x.device] || x.device, value: x.sessions })))}</div></section></div>
    <p class="small muted mt">Werte in Sitzungen. Shopify zählt Besuche nur mit Statistik-Einwilligung im Cookie-Banner vollständig. Solange der Shop passwortgeschützt ist, stammt ein Teil der Besuche von Prüfdiensten (z. B. Rechenzentren in den USA).</p>`);
}
ACT.cuRefresh = () => reload();

/* ---------- Kundendatenbank ---------- */
const CU_CONSENTS = [['agb', 'AGB'], ['withdrawal', 'Widerruf'], ['privacy', 'Datenschutz'], ['digital', 'Digitale Inhalte']];
const consentChip = (ok, label, title) => html`<span class="chip ${ok ? 'chip-ok' : 'chip-off'}" title="${title}">${ok ? icon('check') : icon('x')}${label}</span>`;
function consentChips(c) {
  return html`<div class="chips">${CU_CONSENTS.map(([k, l]) => { const v = c.consents[k]; return consentChip(!!v, l, v ? `${l}: ${v.order ? 'Bestellung ' + v.order : v.account ? 'Kundenkonto' : 'Anfrage #' + v.number} · ${v.at || ''}` : `${l}: nicht erfasst`); })}
    ${consentChip(c.marketing.email === 'SUBSCRIBED', 'Newsletter', 'Newsletter: ' + c.marketing.label)}</div>`;
}
let CU_PAGES = [];
async function cuList(P) {
  const q = hashQuery();
  const d = await GET('/customers', q); if (!P.alive()) return;
  if (!d.configured) return P.show(cuNotConfigured('liste'));
  const filtered = !!(q.q || q.state || q.consent || q.buyers || q.newsletter);
  P.show(html`${cuHead('liste')}
    <section class="panel mt"><form class="toolbar" data-submit="cuFilter"><label class="search">${icon('search')}<input name="q" value="${q.q || ''}" placeholder="Name, E-Mail oder Telefon" aria-label="Suche"></label>
      ${sel('state', [['enabled', 'Konto aktiv'], ['invited', 'Eingeladen'], ['disabled', 'Ohne Konto']], q.state, { empty: 'Alle Konten', attrs: 'data-change="cuFilterChange" aria-label="Konto"' })}
      ${sel('consent', [['ok', 'Einwilligungen vollständig'], ['fehlt', 'Einwilligungen fehlen']], q.consent, { empty: 'Alle Einwilligungen', attrs: 'data-change="cuFilterChange" aria-label="Einwilligungen"' })}
      ${sel('sort', [['neu', 'Neueste zuerst'], ['alt', 'Älteste zuerst'], ['name', 'Name A–Z'], ['aktualisiert', 'Zuletzt geändert']], q.sort || 'neu', { attrs: 'data-change="cuFilterChange" aria-label="Sortierung"' })}
      ${chk('buyers', q.buyers === '1', 'Nur Käufer')}${chk('newsletter', q.newsletter === '1', 'Nur Newsletter')}
      <button class="btn btn-sm btn-dark" type="submit">Suchen</button>${filtered ? html`<a class="btn btn-sm btn-ghost" href="#/kunden/liste">Zurücksetzen</a>` : ''}
      <span class="spacer"></span><span class="small muted">${d.total != null ? `${fNum(d.total)} Kunden im Shop` : ''}</span></form>
    ${d.customers.length ? html`<div class="table-wrap"><table class="table cu-table"><thead><tr><th>Kunde</th><th>Kontakt</th><th>Adresse</th><th class="r">Bestellungen</th><th class="r">Anfragen</th><th>Einwilligungen</th></tr></thead><tbody>
      ${d.customers.map((c) => html`<tr class="clickable" data-act="cuOpen" data-id="${c.id}"><td><b>${c.name}</b><span class="cell-sub">seit ${fDate(c.created_at)} · ${(CU_STATE[c.state] || [c.state])[0]}</span></td>
        <td class="small">${c.email ? html`<div>${c.email}</div>` : ''}${c.phone ? html`<div>${c.phone}</div>` : html`<div class="muted">kein Telefon</div>`}</td>
        <td class="small">${c.address ? html`<div>${c.address.street}</div><div>${[c.address.zip, c.address.city].filter(Boolean).join(' ')}${c.address.country && c.address.country !== 'DE' ? ' · ' + c.address.country : ''}</div>` : html`<span class="muted">keine Adresse</span>`}</td>
        <td class="r num">${fNum(c.orders)}<span class="cell-sub">${fEur(c.spent)}</span></td><td class="r num">${fNum(c.requests)}</td><td>${consentChips(c)}</td></tr>`)}</tbody></table></div>
      <div class="toolbar">${q.after ? html`<button class="btn btn-sm btn-ghost" data-act="cuPrev">${icon('back')}Zurück</button>` : ''}<span class="spacer"></span>${d.next ? html`<button class="btn btn-sm" data-act="cuNext" data-after="${d.next}">Nächste 50</button>` : ''}</div>`
      : html`<div class="panel-body">${empty(filtered ? 'Keine Kunden gefunden' : 'Noch keine Kunden', filtered ? 'Passe Suche oder Filter an.' : 'Sobald sich jemand im Shop ein Konto anlegt oder bestellt, erscheint er hier.')}</div>`}</section>
    <div class="info-box mt">${icon('shield')}<span><b>Woher die Einwilligungen kommen:</b> AGB, Widerrufsbelehrung und Datenschutz bestätigen Kunden in den Formularen Dein Auto-DEAL, Auto verkaufen und Support oder einmalig über den Hinweis für angemeldete Kunden auf der Webseite (jeweils mit Version und Zeitpunkt). „Digitale Inhalte“ ist die Zustimmung zum vorzeitigen Beginn im Warenkorb (Verzicht auf das Widerrufsrecht). Den Newsletter-Status liefert Shopify.</span></div>`);
}
SUBMIT.cuFilter = (d) => { CU_PAGES = []; setHashQuery({ q: d.q, state: d.state, consent: d.consent, sort: d.sort === 'neu' ? '' : d.sort, buyers: d.buyers ? 1 : '', newsletter: d.newsletter ? 1 : '' }, '#/kunden/liste'); };
CHANGE.cuFilterChange = (el) => SUBMIT.cuFilter({ ...formData(el.form), buyers: el.form.elements.buyers.checked, newsletter: el.form.elements.newsletter.checked });
ACT.cuNext = (b) => { const q = hashQuery(); CU_PAGES.push(q.after || ''); setHashQuery({ ...q, after: b.dataset.after }, '#/kunden/liste'); };
ACT.cuPrev = () => { const q = hashQuery(); setHashQuery({ ...q, after: CU_PAGES.pop() || '' }, '#/kunden/liste'); };
ACT.cuOpen = (b) => { location.hash = '#/kunden/' + b.dataset.id; };

/* ---------- Kundenakte ---------- */
async function pageCustomer(id) {
  const P = page('kunden');
  if (!can('customers_view')) return P.show(noAccess());
  const { customer: c, shopAdmin } = await GET('/customers/' + id); if (!P.alive()) return;
  const k = c.consents;
  const src = (v) => v ? (v.order ? `Bestellung ${v.order}` : v.account ? `${v.source || 'Kundenkonto'} (Webseite)` : html`${can('req_view') ? html`<a class="link" href="#/anfragen/${v.number}">Anfrage #${v.number}</a>` : `Anfrage #${v.number}`}`) : '–';
  const crow = (label, v, hint) => html`<tr><td><b>${label}</b>${hint ? html`<span class="cell-sub">${hint}</span>` : ''}</td><td>${v ? badge('Bestätigt', 'ok') : badge('Nicht erfasst', 'muted')}</td><td class="small">${v ? (v.value || '') : ''}</td><td class="small">${src(v)}</td><td class="small nowrap">${v ? v.at || fDT(v.created_at) : ''}</td></tr>`;
  const shopLink = shopAdmin ? `${String(shopAdmin).replace(/\/$/, '')}/customers/${c.id}` : null;
  P.show(html`${head(c.name, html`Kunde seit ${fDate(c.created_at)} · ${(CU_STATE[c.state] || [c.state])[0]}${c.verified ? ' · E-Mail bestätigt' : ''}`, shopLink ? html`<a class="btn" href="${shopLink}" target="_blank" rel="noopener">${icon('external')}In Shopify öffnen</a>` : '', ['#/kunden/liste', 'Kundendatenbank'])}
    <div class="kpis kpis-flat mt"><div class="kpi"><b>${fNum(c.orders)}</b><span>Bestellungen</span></div><div class="kpi"><b>${fEur(c.spent)}</b><span>Umsatz im Shop</span></div><div class="kpi"><b>${fNum(c.request_list.length)}</b><span>Anfragen (Deal, Verkauf, Support)</span></div><div class="kpi"><b>${c.marketing.label}</b><span>Newsletter</span></div></div>
    <div class="grid-2 mt">
      <section class="panel"><div class="panel-head"><h2>Kontaktdaten</h2></div><div class="panel-body">${kv([['Vorname', c.first_name || '–'], ['Nachname', c.last_name || '–'],
        ['E-Mail', c.email ? html`<a class="link" href="mailto:${c.email}">${c.email}</a>` : '–'], ['Telefon', c.phone ? html`<a class="link" href="tel:${c.phone.replace(/\s/g, '')}">${c.phone}</a>` : '–'],
        ['Standardadresse', c.address ? html`${c.address.company ? html`${c.address.company}<br>` : ''}${c.address.street}<br>${[c.address.zip, c.address.city].filter(Boolean).join(' ')} · ${c.address.country}` : '–'],
        c.addresses.length > 1 && ['Weitere Adressen', html`${c.addresses.slice(1).map((a) => html`<div>${[a.street, [a.zip, a.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')}</div>`)}`],
        c.tags.length && ['Tags', c.tags.join(', ')], c.note && ['Notiz in Shopify', c.note]].filter(Boolean))}</div></section>
      <section class="panel"><div class="panel-head"><h2>Bestellungen im Shop</h2></div>${c.order_list.length ? html`<div class="table-wrap"><table class="table"><thead><tr><th>Bestellung</th><th>Artikel</th><th>Status</th><th class="r">Betrag</th></tr></thead><tbody>
        ${c.order_list.map((o) => html`<tr><td class="nowrap"><b>${o.name}</b><span class="cell-sub">${fDT(o.created_at)}</span></td><td class="small">${o.items}${o.digital ? html`<span class="cell-sub">${icon('check')} Zustimmung digitale Inhalte: ${o.digital}</span>` : ''}</td><td>${badge(o.status === 'PAID' ? 'Bezahlt' : String(o.status || '').toLowerCase(), o.status === 'PAID' ? 'ok' : 'muted')}</td><td class="r num">${fEur(o.total)}</td></tr>`)}</tbody></table></div>` : html`<div class="panel-body">${empty('Keine Bestellungen', '')}</div>`}</section></div>
    <div class="mt"><section class="panel"><div class="panel-head"><h2>Einwilligungen</h2></div><div class="table-wrap"><table class="table"><thead><tr><th>Art</th><th>Status</th><th>Erklärung</th><th>Quelle</th><th>Zeitpunkt</th></tr></thead><tbody>
        ${crow('AGB', k.agb)}${crow('Widerrufsbelehrung', k.withdrawal, 'zur Kenntnis genommen')}${crow('Datenschutzerklärung', k.privacy)}${crow('Weitergabe an Partner', k.partner, 'Dein Auto-DEAL / Auto verkaufen')}
        ${crow('Vorzeitiger Beginn digitale Inhalte', k.digital ? { ...k.digital, value: 'Zustimmung im Warenkorb (Widerrufsrecht erlischt)' } : null, '§ 356 Abs. 5 BGB')}
        <tr><td><b>Newsletter (E-Mail)</b><span class="cell-sub">laut Shopify</span></td><td>${c.marketing.email === 'SUBSCRIBED' ? badge('Angemeldet', 'ok') : badge(c.marketing.label, 'muted')}</td><td class="small">${c.marketing.level === 'CONFIRMED_OPT_IN' ? 'Double-Opt-in' : c.marketing.level === 'SINGLE_OPT_IN' ? 'Single-Opt-in' : ''}</td><td class="small">Shopify</td><td class="small nowrap">${c.marketing.updated_at ? fDT(c.marketing.updated_at) : ''}</td></tr></tbody></table></div></section></div>
    <div class="mt"><section class="panel"><div class="panel-head"><h2>Anfragen über die Webseite</h2></div>${c.request_list.length ? html`<div class="table-wrap"><table class="table"><thead><tr><th>Anfrage</th><th>Art</th><th>Status</th><th>AGB / Datenschutz</th></tr></thead><tbody>
        ${c.request_list.map((r) => html`<tr class="${can('req_view') ? 'clickable' : ''}" ${can('req_view') ? raw(`data-act="cuReq" data-n="${r.number}"`) : ''}><td class="nowrap"><b>#${r.number}</b><span class="cell-sub">${fDT(r.created_at)}</span></td><td>${typeLabel(r.type)}</td><td>${statusBadge(RS(), r.status)}</td><td class="small">${r.agb || '–'}<br>${r.privacy || '–'}</td></tr>`)}</tbody></table></div>` : html`<div class="panel-body">${empty('Keine Anfragen', 'Dieser Kunde hat noch kein Formular abgeschickt.')}</div>`}</section></div>
    <p class="small muted mt">Der Aufruf dieser Kundenakte wird im Protokoll vermerkt.</p>`);
}
ACT.cuReq = (b) => { location.hash = '#/anfragen/' + b.dataset.n; };
