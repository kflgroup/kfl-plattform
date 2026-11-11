/* ===== AGB für Geschäftspartner (Text kommt aus dem internen Dashboard, immer die aktuelle Fassung) ===== */
const ptermsToc = (root) => {
  const hs = [...root.querySelectorAll('h2')]; hs.forEach((h, i) => { h.id = 'agb-' + (i + 1); });
  const toc = root.parentElement && root.parentElement.querySelector('.legal-toc');
  if (toc) toc.innerHTML = hs.map((h) => `<li><a href="#" data-act="ptermsJump" data-to="${h.id}">${esc(h.textContent.replace(/\s+/g, ' ').trim().slice(0, 48))}</a></li>`).join('');
};
ACT.ptermsJump = (b) => { const el = document.getElementById(b.dataset.to); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
async function pTerms() {
  const V = ppage('agb');
  const d = await GET('/terms'); if (!V.alive()) return;
  const me = d.mine || {};
  const status = me.agb_at ? (me.version && me.version >= d.version ? html`<div class="info-box">${icon('check')}<span>Du hast diese Fassung am ${fDate(me.agb_at)} bestätigt.</span></div>`
    : html`<div class="info-box">${icon('check')}<span>Deine Zustimmung ist vom ${fDate(me.agb_at)}${me.version ? ` (Fassung ${me.version})` : ''}. Seitdem wurde der Text aktualisiert – es gilt die unten stehende Fassung ${d.version}.</span></div>`) : '';
  V.show(html`${phead('AGB für Geschäftspartner', `Fassung ${d.version}${d.stand ? ' · Stand ' + d.stand : ''} · gilt für die Zusammenarbeit über das Partner-Dashboard`, html`<div class="row"><a class="btn" href="/agb-partner" target="_blank" rel="noopener">${icon('download')}Druckansicht / PDF</a>${d.web ? html`<a class="btn btn-ghost" href="${d.web}" target="_blank" rel="noopener">${icon('external')}Auf kfl-group.com</a>` : ''}</div>`)}
    ${status}<section class="block mt"><div class="block-body"><ul class="legal-toc" aria-label="Inhalt"></ul><article class="legal-doc" id="pterms">${raw(d.html)}</article></div></section>
    <p class="small muted mt">Fragen zu den AGB? Schreib uns über den <a class="link" href="#/support">Support</a>.</p>`);
  const a = $('#pterms'); if (a) ptermsToc(a);
}
// Kurzansicht im Fenster (Einladung, Zustimmung, Anmeldung) – ohne Anmeldung abrufbar
ACT.pagbShow = async () => {
  const d = await GET('/terms');
  modal({ title: 'AGB für Geschäftspartner', wide: true, body: html`<p class="small muted">Fassung ${d.version}${d.stand ? ' · Stand ' + d.stand : ''} · <a class="link" href="/agb-partner" target="_blank" rel="noopener">Druckansicht / PDF</a></p><article class="legal-doc mt">${raw(d.html)}</article>` });
};
