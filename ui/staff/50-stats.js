/* ===== Statistik ===== */
const PRESETS = () => { const t = todayISO(), y = t.slice(0, 4), m = t.slice(0, 7); return [['7', '7 Tage', addDays(t, -6), t], ['30', '30 Tage', addDays(t, -29), t], ['90', '90 Tage', addDays(t, -89), t], ['monat', 'Dieser Monat', m + '-01', t], ['jahr', 'Dieses Jahr', y + '-01-01', t]]; };
function periodBar(q, base) {
  return html`<form class="toolbar" data-submit="statPeriod" data-base="${base}">${PRESETS().map(([k, l, f, t]) => html`<a class="btn btn-sm ${q.from === f && q.to === t ? 'btn-dark' : 'btn-ghost'}" href="${base}${qs({ from: f, to: t })}">${l}</a>`)}
    <span class="spacer"></span><input type="date" name="from" value="${q.from || ''}" aria-label="Von"><input type="date" name="to" value="${q.to || ''}" aria-label="Bis"><button class="btn btn-sm btn-dark" type="submit">Anwenden</button></form>`;
}
SUBMIT.statPeriod = (d, f) => setHashQuery({ from: d.from, to: d.to }, f.dataset.base);
const statTabs = (cur) => tabsBar([can('stats_view') && ['uebersicht', 'Übersicht', '#/statistik'], canAny('stats_view', 'team_stats') && ['team', 'Team', '#/statistik/team'], canAny('stats_view', 'partner_stats') && ['partner', 'Geschäftspartner', '#/statistik/partner'], can('stats_shop') && ['shop', 'Webshop', '#/statistik/shop']], cur);
const statHead = (cur) => html`${head('Statistik', 'Anfragen, Umsatz, Kosten, Partner und Team im Vergleich zum Vorzeitraum und Vorjahr.')}${statTabs(cur)}`;

async function pageStats(tab) {
  const P = page('statistik');
  if (!canAny('stats_view', 'team_stats', 'partner_stats', 'stats_shop')) return P.show(noAccess());
  tab = tab || (can('stats_view') ? 'uebersicht' : can('team_stats') ? 'team' : 'partner');
  const q = hashQuery(); if (!q.from) { q.from = addDays(todayISO(), -29); q.to = todayISO(); }
  if (tab === 'team') return statsTeam(P, q);
  if (tab === 'partner') return statsPartners(P, q);
  if (tab === 'shop') return statsShop(P, q);
  if (!can('stats_view')) return P.show(noAccess());
  const d = await GET('/stats/overview', q); if (!P.alive()) return;
  const c = d.cur, p = d.prev, ly = d.ly;
  const row = (label, k, fmt = fNum, invert = false) => html`<tr><td>${label}</td><td class="r num strong">${fmt(c[k])}</td><td class="r num">${fmt(p[k])} ${delta(c[k], p[k], { invert })}</td><td class="r num">${fmt(ly[k])} ${delta(c[k], ly[k], { invert })}</td></tr>`;
  let adj = 0; try { adj = +(localStorage.getItem('kfl_fc_adj') || 0); } catch (e) { /* ohne Speicher */ }
  const fc = (v) => v * (1 + adj / 100);
  const days = d.daily.map((x) => ({ label: fDate(x.day), short: x.day.slice(8, 10) + '.' + x.day.slice(5, 7), value: x.n, second: x.won }));
  P.show(html`${statHead('uebersicht')}<section class="panel mt">${periodBar(q, '#/statistik')}
    <div class="kpis kpis-flat">
      <div class="kpi"><b>${fNum(c.requests)}</b><span>Anfragen</span>${delta(c.requests, p.requests)}</div>
      <div class="kpi"><b>${fNum(c.won)}</b><span>Vermittelt (${fPct(c.conversion)})</span>${delta(c.won, p.won)}</div>
      <div class="kpi"><b>${fEur(c.revenue_net)}</b><span>Umsatz netto</span>${delta(c.revenue_net, p.revenue_net)}</div>
      <div class="kpi"><b>${fEur(c.expenses_net)}</b><span>Ausgaben netto</span>${delta(c.expenses_net, p.expenses_net, { invert: true })}</div>
      <div class="kpi ${c.profit_net < 0 ? 'hot' : ''}"><b>${fEur(c.profit_net)}</b><span>Ergebnis netto</span>${delta(c.profit_net, p.profit_net)}</div>
      <a class="kpi ${d.overdue.n ? 'hot' : ''}" href="#/buchhaltung/rechnungen?overdue=1"><b>${fEur(d.open.sum)}</b><span>offen · davon ${fEur(d.overdue.sum)} überfällig</span></a></div></section>
    <div class="grid-2 mt">
      <section class="panel"><div class="panel-head"><h2>Anfragen pro Tag</h2><span class="small muted"><span class="dot"></span> davon vermittelt</span></div><div class="panel-body">${barChart(days, { h: 180 })}</div></section>
      <section class="panel"><div class="panel-head"><h2>Vorausschau nächste 30 Tage</h2><span class="small muted">Basis: ${d.forecast.basis}</span></div><div class="panel-body stack">
        ${kv([['Anfragen', fNum(fc(d.forecast.requests))], ['Vermittlungen', fNum(fc(d.forecast.won))], ['Umsatz netto', fEur(fc(d.forecast.revenue_net))], ['Ausgaben netto', fEur(d.forecast.expenses_net)], ['Ergebnis netto', html`<b>${fEur(fc(d.forecast.revenue_net) - d.forecast.expenses_net)}</b>`]])}
        ${isAdmin() || can('settings_all') ? html`<form class="inline-form" data-submit="fcAdj">${field('Manuelle Anpassung in % (z. B. Kampagne, Saison)', inp('adj', adj, { type: 'number', attrs: 'step="1" min="-90" max="500"' }))}<button class="btn btn-sm" type="submit">Übernehmen</button></form>` : ''}</div></section></div>
    <section class="panel mt"><div class="panel-head"><h2>Vergleich</h2><span class="small muted">${fDate(d.period.from)} – ${fDate(d.period.to)} gegenüber ${fDate(d.period.prevFrom)} – ${fDate(d.period.prevTo)} und Vorjahr</span></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>Kennzahl</th><th class="r">Zeitraum</th><th class="r">Vorzeitraum</th><th class="r">Vorjahr</th></tr></thead><tbody>
        ${row('Anfragen gesamt', 'requests')}${row('davon Traumwagen-DEAL', 'deal')}${row('davon Fahrzeugverkauf', 'sell')}${row('Vermittelt (Kontaktdaten versendet)', 'won')}${row('Ohne Angebot', 'no_offer', fNum, true)}${row('Spam', 'spam', fNum, true)}
        ${row('Angebote von Partnern', 'offers')}${row('Angebote angenommen', 'offers_accepted')}${row('Angebote nicht gewählt / abgelehnt', 'offers_rejected', fNum, true)}
        ${row('Rechnungen erstellt', 'invoices')}${row('Umsatz netto', 'revenue_net', fEur)}${row('Umsatz brutto', 'revenue_gross', fEur)}${row('Zahlungseingänge', 'payments', fEur)}
        ${row('Mahnungen', 'dunnings', fNum, true)}${row('Mahngebühren', 'dunning_fees', fEur)}${row('Kulanz / Stornos', 'kulanz', fEur, true)}${row('Ausgaben netto', 'expenses_net', fEur, true)}${row('Ergebnis netto', 'profit_net', fEur)}
        ${row('Neue Geschäftspartner', 'new_partners')}${row('Support-Tickets', 'tickets', fNum, true)}</tbody></table></div></section>
    <div class="grid-3 mt">
      <section class="panel"><div class="panel-head"><h3>Heute vs. gestern</h3></div><div class="panel-body">${kv([['Anfragen', html`${fNum(d.today.requests)} ${delta(d.today.requests, d.yesterday.requests)}`], ['Vermittelt', html`${fNum(d.today.won)} ${delta(d.today.won, d.yesterday.won)}`], ['Umsatz', html`${fEur(d.today.revenue_net)} ${delta(d.today.revenue_net, d.yesterday.revenue_net)}`]])}</div></section>
      <section class="panel"><div class="panel-head"><h3>Monat vs. Vormonat</h3></div><div class="panel-body">${kv([['Anfragen', html`${fNum(d.month.requests)} ${delta(d.month.requests, d.lastMonth.requests)}`], ['Vermittelt', html`${fNum(d.month.won)} ${delta(d.month.won, d.lastMonth.won)}`], ['Umsatz', html`${fEur(d.month.revenue_net)} ${delta(d.month.revenue_net, d.lastMonth.revenue_net)}`], ['Ausgaben', fEur(d.month.expenses_net)]])}</div></section>
      <section class="panel"><div class="panel-head"><h3>Status im Zeitraum</h3></div><div class="panel-body">${hbars(d.statuses.map((s) => ({ label: statusOf(RS(), s.status).label, value: s.n })).sort((a, b) => b.value - a.value))}</div></section></div>
    <div class="grid-2 mt">
      <section class="panel"><div class="panel-head"><h2>Marken</h2></div><div class="panel-body">${hbars(d.brands.map((b) => ({ label: b.brand, value: b.n })))}</div></section>
      <section class="panel"><div class="panel-head"><h2>Herkunft (Marketing)</h2></div><div class="table-wrap"><table class="table"><thead><tr><th>Quelle</th><th class="r">Anfragen</th><th class="r">Vermittelt</th><th class="r">Quote</th></tr></thead><tbody>${d.sources.map((s) => html`<tr><td>${s.source}</td><td class="r num">${s.n}</td><td class="r num">${s.won || 0}</td><td class="r num">${fPct(s.n ? ((s.won || 0) / s.n) * 100 : 0)}</td></tr>`)}</tbody></table></div></section></div>`);
}
SUBMIT.fcAdj = (d) => { try { localStorage.setItem('kfl_fc_adj', String(+d.adj || 0)); } catch (e) { /* ohne Speicher */ } reload(); };

async function statsTeam(P, q) {
  if (!canAny('stats_view', 'team_stats')) return P.show(noAccess());
  const d = await GET('/stats/staff', q); if (!P.alive()) return;
  const max = Math.max(1, ...d.staff.map((s) => s.actions));
  P.show(html`${statHead('team')}<section class="panel mt">${periodBar(q, '#/statistik/team')}
    <div class="table-wrap"><table class="table"><thead><tr><th>Mitarbeiter</th><th>Rolle</th><th class="r">Zugewiesen</th><th class="r">Bearbeitet</th><th class="r">Ø Reaktionszeit</th><th class="r">Support-Tickets</th><th>Aktivität</th></tr></thead><tbody>
      ${d.staff.map((s) => html`<tr><td class="strong">${s.name}</td><td>${roleLabel(s.role)}</td><td class="r num">${s.assigned}</td><td class="r num">${s.handled}</td>
        <td class="r num">${s.reaction_min == null ? '–' : s.reaction_min < 60 ? s.reaction_min + ' Min.' : fNum(s.reaction_min / 60, 1) + ' Std.'}</td><td class="r num">${s.tickets}</td>
        <td><span class="hbar-track hbar-inline"><i data-w="${Math.round((s.actions / max) * 100)}"></i></span> <span class="small muted">${s.actions} Aktionen</span></td></tr>`)}</tbody></table></div>
    <p class="small muted panel-body">Reaktionszeit = Zeit vom Eingang der Anfrage bis zur ersten Aktion des Mitarbeiters.</p></section>`);
}
async function statsPartners(P, q) {
  if (!canAny('stats_view', 'partner_stats')) return P.show(noAccess());
  const d = await GET('/stats/partners', q); if (!P.alive()) return;
  const sort = q.sort || 'received';
  const list = [...d.partners].sort((a, b) => (b[sort] ?? -1) - (a[sort] ?? -1));
  const th = (k, l) => html`<th class="r"><a class="${sort === k ? 'strong' : ''}" href="#/statistik/partner${qs({ ...q, sort: k })}">${l}</a></th>`;
  P.show(html`${statHead('partner')}<section class="panel mt">${periodBar(q, '#/statistik/partner')}
    <div class="table-wrap"><table class="table"><thead><tr><th>Partner</th>${th('received', 'Erhalten')}${th('offers', 'Angebote')}${th('offer_rate', 'Angebotsquote')}${th('won', 'Zusagen')}${th('win_rate', 'Erfolgsquote')}${th('lost', 'Verloren')}${th('avg_hours', 'Ø Stunden')}${th('rating', 'Bewertung')}${th('users_active', 'Konten aktiv')}${th('support_reply_h', 'Support-Reaktion')}</tr></thead><tbody>
      ${list.map((p) => html`<tr class="clickable" data-act="go" data-href="#/partner/${p.id}"><td class="strong">${p.name}${p.active ? '' : html` ${badge('inaktiv', 'muted')}`}</td><td class="r num">${p.received}</td><td class="r num">${p.offers}</td><td class="r num">${fPct(p.offer_rate)}</td><td class="r num">${p.won}</td><td class="r num">${fPct(p.win_rate)}</td><td class="r num">${p.lost}</td>
        <td class="r num">${p.avg_hours == null ? '–' : fNum(p.avg_hours, 1)}</td><td class="r num">${p.rating == null ? '–' : fNum(p.rating, 1) + ' ★'}</td><td class="r num">${p.users_active}/${p.users_active + p.users_inactive}</td><td class="r num">${p.support_reply_h == null ? '–' : fNum(p.support_reply_h, 1) + ' h'}</td></tr>`)}</tbody></table></div></section>`);
}
async function statsShop(P, q) {
  if (!can('stats_shop')) return P.show(noAccess());
  const d = await GET('/stats/shop', q); if (!P.alive()) return;
  if (!d.configured) return P.show(html`${statHead('shop')}<section class="panel mt"><div class="panel-body">${empty('Webshop-Statistik noch nicht verbunden', 'Hinterlege in Cloudflare das Secret SHOPIFY_ADMIN_TOKEN (Admin-API, Lesezugriff auf Bestellungen) und optional SHOPIFY_SHOP. Danach erscheinen hier Bestellungen, Umsatz und Topseller von kfl-group.com.')}</div></section>`);
  if (d.error) return P.show(html`${statHead('shop')}<div class="err-box mt">${icon('alert')}<span>Shopify meldet einen Fehler: ${d.error}</span></div>`);
  const c = d.cur, p = d.prev, ly = d.ly;
  P.show(html`${statHead('shop')}<section class="panel mt">${periodBar(q, '#/statistik/shop')}
    <div class="kpis kpis-flat"><div class="kpi"><b>${fNum(c.orders)}</b><span>Bestellungen</span>${delta(c.orders, p.orders)}</div><div class="kpi"><b>${fEur(c.revenue)}</b><span>Umsatz brutto</span>${delta(c.revenue, p.revenue)}</div>
      <div class="kpi"><b>${fEur(c.aov)}</b><span>Ø Warenkorb</span>${delta(c.aov, p.aov)}</div><div class="kpi"><b>${fNum(c.newCustomers)}</b><span>Neukunden</span>${delta(c.newCustomers, p.newCustomers)}</div></div></section>
    <div class="grid-2 mt"><section class="panel"><div class="panel-head"><h2>Topseller</h2></div><div class="panel-body">${hbars(c.top.map(([l, v]) => ({ label: l, value: v })))}</div></section>
      <section class="panel"><div class="panel-head"><h2>Vorjahr</h2></div><div class="panel-body">${kv([['Bestellungen', html`${fNum(ly.orders)} ${delta(c.orders, ly.orders)}`], ['Umsatz', html`${fEur(ly.revenue)} ${delta(c.revenue, ly.revenue)}`], ['Ø Warenkorb', fEur(ly.aov)], ['Neukunden', fNum(ly.newCustomers)]])}
        <p class="small muted mt">Shop: ${d.shop}</p></div></section></div>`);
}
