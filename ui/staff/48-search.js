/* ===== Suche (Kopfzeile): eine Eingabe für Anfragen, Kunden, Geschäftspartner, Partnerkonten, Mitarbeiter, Lieferanten und Support ===== */
CRUMB.suche = 'Suche';
const SEARCH_ICON = { anfragen: 'inbox', partner: 'partner', partnerkonten: 'users', mitarbeiter: 'user', lieferanten: 'file', support: 'support', kunden: 'users' };
async function pageSearch() {
  const P = page('suche');
  const q = String(hashQuery().q || '').trim();
  const d = q.length >= 2 ? await GET('/search', { q }) : { groups: [] }; if (!P.alive()) return;
  const total = d.groups.reduce((a, g) => a + g.items.length, 0);
  const pb = d.partner;
  P.show(html`${head('Suche', q ? html`${plural(total, 'Treffer', 'Treffer')} für „${q}“` : 'Suche nach Name, E-Mail-Adresse, Anfragenummer, PLZ oder Fahrzeug.')}
    <section class="panel"><form class="toolbar" data-submit="globalSearch"><label class="search">${icon('search')}<input name="q" value="${q}" placeholder="Name, E-Mail, Anfragenummer, PLZ …" aria-label="Suche" autofocus></label><button class="btn btn-sm btn-dark" type="submit">Suchen</button></form></section>
    ${pb ? html`<section class="panel mt"><div class="panel-body row-between"><div>${icon('partner')} <b>${q}</b> gehört zum Geschäftspartner <a class="link strong" href="#/partner/${pb.org_id}">${pb.org_name}</a>${pb.city ? ` (${pb.city})` : ''}${pb.user ? html` · Konto von ${pb.user.name}` : ''}</div><a class="btn btn-sm btn-primary" href="#/partner/${pb.org_id}">Zum Profil</a></div></section>` : ''}
    ${q.length >= 2 && !total ? html`<section class="panel mt"><div class="panel-body">${empty('Nichts gefunden', 'Prüfe die Schreibweise oder suche nach einem Teil der E-Mail-Adresse (z. B. nur die Domain).')}</div></section>` : ''}
    ${d.groups.map((g) => html`<section class="panel mt"><div class="panel-head"><h2>${icon(SEARCH_ICON[g.key] || 'search')} ${g.label} <span class="count">${g.items.length}${g.more ? '+' : ''}</span></h2></div>
      <div class="table-wrap"><table class="table"><tbody>${g.items.map((it) => html`<tr class="clickable" data-act="go" data-href="${it.href}"><td><b>${it.title}</b><span class="cell-sub">${it.sub || ''}</span></td>
        <td class="r nowrap">${it.badge ? badge(it.badge, 'muted') : ''}${it.status && g.key === 'anfragen' ? statusBadge(RS(), it.status) : it.status ? badge(it.status, 'neutral') : ''}${it.date ? html`<span class="cell-sub">${fDate(it.date)}</span>` : ''}</td></tr>`)}</tbody></table></div>
      ${g.more ? html`<div class="panel-body small muted">Es gibt weitere Treffer – bitte genauer suchen.</div>` : ''}</section>`)}
    ${d.shop_error ? html`<p class="small muted mt">Shop-Kunden konnten nicht durchsucht werden: ${d.shop_error}</p>` : ''}`);
}
