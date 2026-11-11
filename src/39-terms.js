/* ============================================================
   AGB für Geschäftspartner – eine Quelle für alle drei Seiten
   - gespeichert in der Einstellung „partner_terms“ (JSON: html, version, updated_at, updated_by, note, consent_min, shop_sync)
   - Standardfassung: legal/agb-partner.html (beim Bauen als PARTNER_TERMS_DEFAULT eingebettet)
   - jede veröffentlichte Fassung liegt im Archiv (Art „agb_partner“, 10 Jahre)
   - Anzeige: internes Dashboard (Verwaltung → Partner-AGB), Partner-Dashboard (#/agb, Zustimmung),
     Webseite (/pages/agb-partner lädt GET /legal/agb-partner; Shopify-Seitentext wird zusätzlich aktualisiert, soweit erlaubt)
   ============================================================ */

const TERMS_KEY = 'partner_terms';
const TERMS_ARCHIVE_DAYS = 3653;
const TERMS_MAX = 200_000;
const TERMS_SHOP_PAGE = 'gid://shopify/Page/186627916115';

function termsOf(s) {
  const t = s && s[TERMS_KEY];
  if (t && typeof t === 'object' && typeof t.html === 'string' && t.html.trim()) return { consent_min: 0, ...t, version: toInt(t.version, 1) || 1 };
  return { html: typeof PARTNER_TERMS_DEFAULT === 'string' ? PARTNER_TERMS_DEFAULT : '', version: 1, updated_at: '2026-11-11T08:00:00.000Z', updated_by: 'KFL GbR', note: 'Erstfassung (Stand 11. November 2026)', consent_min: 0, shop_sync: null };
}
// „Stand: …“ aus dem Text (erste Fundstelle)
const termsStand = (html) => { const m = String(html || '').match(/Stand:\s*([^<\n]{3,40})/); return m ? m[1].trim() : ''; };
const termsPublic = (t) => ({ html: t.html, version: t.version, updated_at: t.updated_at, stand: termsStand(t.html), consent_min: t.consent_min || 0 });

/* ---------- HTML bereinigen (Whitelist) ---------- */
const TERMS_TAGS = { p: 'p', div: 'p', h1: 'h2', h2: 'h2', h3: 'h3', h4: 'h3', ul: 'ul', ol: 'ol', li: 'li', strong: 'strong', b: 'strong', em: 'em', i: 'em', u: 'u', a: 'a', br: 'br', blockquote: 'blockquote' };
const TERMS_BLOCK = new Set(['p', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote']);
const decodeAttr = (v) => String(v).replace(/&quot;/g, '"').replace(/&#0*39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
function termsHref(attrs) {
  const m = String(attrs || '').match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/i); if (!m) return null;
  const v = decodeAttr(m[1] ?? m[2] ?? m[3] ?? '').trim();
  if (/[\u0000-\u001f\u007f]/.test(v) || v.length > 600) return null;
  if (/^(https?:\/\/[^\s]+|mailto:[^\s]+|tel:\+?[0-9 ()/-]+|\/(?!\/)[^\s]*|#[\w-]*)$/i.test(v)) return v;
  return null;
}
function termsText(t) { return String(t).replace(/&(?!(?:#\d{1,7}|#x[0-9a-f]{1,6}|[a-z][a-z0-9]{1,31});)/gi, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function sanitizeTermsHtml(input) {
  let s = String(input || '').slice(0, TERMS_MAX * 2).replace(/\r\n?/g, '\n');
  s = s.replace(/<!--[\s\S]*?(-->|$)/g, '');
  s = s.replace(/<(script|style|iframe|object|embed|template|svg|math|noscript|textarea|title|head|select|xml|frame|frameset|form|button)\b[\s\S]*?(<\/\1\s*>|$)/gi, '');
  const out = [], stack = [];
  const close = (name) => { const i = stack.map((x) => x.name).lastIndexOf(name); if (i < 0) return; while (stack.length > i) { const e = stack.pop(); if (e.out) out.push(`</${e.out}>`); } };
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g;
  let last = 0, m;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(termsText(s.slice(last, m.index)));
    last = re.lastIndex;
    const closing = !!m[1], tag = m[2].toLowerCase(), mapped = TERMS_TAGS[tag];
    if (!mapped) continue; // unbekannte Tags fallen weg, der Text bleibt
    if (mapped === 'br') { if (!closing) out.push('<br>'); continue; }
    if (closing) { close(tag); continue; }
    if (TERMS_BLOCK.has(mapped) && mapped !== 'li') { const open = stack.findIndex((e) => ['p', 'h2', 'h3'].includes(e.out)); if (open >= 0) close(stack[open].name); }
    if (mapped === 'a') {
      const href = termsHref(m[3]);
      if (!href) { stack.push({ name: tag, out: null }); continue; }
      const ext = /^https?:/i.test(href);
      out.push(`<a href="${esc(href)}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ''}>`);
      stack.push({ name: tag, out: 'a' });
      continue;
    }
    out.push(`<${mapped}>`); stack.push({ name: tag, out: mapped });
  }
  if (last < s.length) out.push(termsText(s.slice(last)));
  while (stack.length) { const e = stack.pop(); if (e.out) out.push(`</${e.out}>`); }
  return out.join('').replace(/<p>\s*(?:<br>\s*)*<\/p>/g, '').replace(/<(strong|em|u)>\s*<\/\1>/g, '').replace(/\n{3,}/g, '\n\n').trim();
}
const termsPlain = (html) => String(html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const termsDay = (iso) => new Date(iso || Date.now()).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Berlin' });

/* ---------- Veröffentlichen ---------- */
async function archiveTermsVersion(ctx, t) {
  const have = await DB.val(ctx.db, "SELECT COUNT(*) FROM archive WHERE kind = 'agb_partner' AND ref_id = ?", t.version);
  if (have) return;
  await DB.insert(ctx.db, 'archive', { kind: 'agb_partner', ref_id: t.version, title: `AGB für Geschäftspartner – Fassung ${t.version}${termsStand(t.html) ? ' (Stand ' + termsStand(t.html) + ')' : ''}`,
    data: JSON.stringify({ version: t.version, html: t.html, note: t.note || '', updated_at: t.updated_at, updated_by: t.updated_by, consent_min: t.consent_min || 0 }),
    archived_at: nowIso(), expires_at: isoOf(nowMs() + TERMS_ARCHIVE_DAYS * 864e5) });
}
async function saveTerms(ctx, t) {
  await DB.run(ctx.db, 'INSERT OR REPLACE INTO settings (key, value, updated_at, updated_by) VALUES (?, ?, ?, ?)', TERMS_KEY, JSON.stringify(t), nowIso(), (ctx.actor && ctx.actor.name) || 'system');
  if (ctx._settings) ctx._settings[TERMS_KEY] = t;
}
// Shopify-Seite /pages/agb-partner mitziehen (Suchmaschinen und Besucher ohne JavaScript); braucht write_online_store_pages
async function pushTermsToShop(ctx, t) {
  if (!shopifyConfigured(ctx.env)) return { ok: false, at: nowIso(), error: 'Shopify ist nicht verbunden – die Webseite lädt die neue Fassung trotzdem live.' };
  try {
    const d = await shopifyGql(ctx.env, 'mutation($id: ID!, $page: PageUpdateInput!) { pageUpdate(id: $id, page: $page) { page { id updatedAt } userErrors { field message } } }',
      { id: (await settingsOf(ctx)).shop_page_agb_partner || TERMS_SHOP_PAGE, page: { body: t.html } });
    const errs = (d && d.pageUpdate && d.pageUpdate.userErrors) || [];
    if (errs.length) return { ok: false, at: nowIso(), error: errs.map((e) => e.message).join(' · ').slice(0, 240) };
    return { ok: true, at: nowIso() };
  } catch (e) { return { ok: false, at: nowIso(), error: String(e && e.message || e).slice(0, 240) }; }
}
async function publishTerms(ctx, u, body) {
  const s = await settingsOf(ctx), cur = termsOf(s);
  need(toInt(body.base_version, -1) === cur.version, 409, `Die AGB wurden in der Zwischenzeit geändert (jetzt Fassung ${cur.version}). Bitte lade die Seite neu und übernimm deine Änderungen erneut.`);
  need(String(body.html || '').length <= TERMS_MAX * 2, 413, 'Der Text ist zu lang.');
  let html = sanitizeTermsHtml(body.html);
  need(html.length <= TERMS_MAX, 413, 'Der Text ist zu lang.');
  need(termsPlain(html).length >= 300, 400, 'Der AGB-Text ist zu kurz. Bitte prüfe, ob versehentlich etwas gelöscht wurde.');
  const note = str(body.note, 500);
  need(note.length >= 3, 400, 'Bitte beschreibe kurz, was sich geändert hat (Änderungshinweis).');
  const at = nowIso();
  if (body.stand !== false) { const day = termsDay(at); html = /Stand:\s*[^<\n]{3,40}/.test(html) ? html.replace(/Stand:\s*[^<\n]{3,40}/, 'Stand: ' + day) : `<p><strong>Stand: ${day}</strong></p>\n` + html; }
  need(html !== cur.html, 400, 'Der Text ist unverändert – es gibt nichts zu veröffentlichen.');
  await archiveTermsVersion(ctx, cur);
  const next = { html, version: cur.version + 1, updated_at: at, updated_by: u.name, updated_by_id: u.id, note, consent_min: body.reconsent ? cur.version + 1 : (cur.consent_min || 0), shop_sync: null };
  await saveTerms(ctx, next);
  await archiveTermsVersion(ctx, next);
  let news = null;
  if (body.notify) {
    news = await DB.insert(ctx.db, 'news_posts', { author_id: u.id, author_name: u.name, scope: 'partner', audience: JSON.stringify({ type: 'partners_all', values: [] }),
      title: `Aktualisierte AGB für Geschäftspartner (Fassung ${next.version})`,
      body: `Wir haben unsere AGB für Geschäftspartner aktualisiert (Stand: ${termsStand(html) || termsDay(at)}).\n\nWas sich geändert hat: ${note}\n\n${body.reconsent ? 'Bitte bestätige die neue Fassung beim nächsten Öffnen des Partner-Dashboards – erst danach kannst du weiterarbeiten.' : 'Die neue Fassung gilt für alle ab jetzt übernommenen Anfragen.'} Du findest den vollständigen Text jederzeit im Menü unter „AGB für Partner“ und auf kfl-group.com/pages/agb-partner.`,
      important: body.reconsent ? 1 : 0, created_at: at });
  }
  next.shop_sync = await pushTermsToShop(ctx, next);
  await saveTerms(ctx, next);
  await audit(ctx, 'partner_agb_veroeffentlicht', 'einstellungen', next.version, { fassung: next.version, hinweis: note, neue_zustimmung: !!body.reconsent, news: news || null, shopify: next.shop_sync.ok ? 'aktualisiert' : next.shop_sync.error });
  return next;
}

/* ---------- Öffentliche Ausgabe (Webseite, Link aus dem Partner-Dashboard) ---------- */
function termsJsonResponse(t) {
  return out({ ok: true, ...termsPublic(t), title: 'AGB für Geschäftspartner' }, 200, { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=60', 'Vary': 'Origin' });
}
function termsPageResponse(t) {
  const stand = termsStand(t.html);
  return new Response(`<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AGB für Geschäftspartner – KFL GbR</title>
<link rel="canonical" href="https://kfl-group.com/pages/agb-partner">
<style>:root{color-scheme:light}body{margin:0;font:17px/1.65 "Helvetica Neue",Helvetica,Arial,sans-serif;background:#f4f4f4;color:#1a1a1a}
.w{max-width:860px;margin:0 auto;padding:32px 20px 80px}.top{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:24px}
.logo{font-weight:800;letter-spacing:-.02em;font-size:22px}.logo b{color:#ff6c01}.meta{color:#6b6b70;font-size:14px}
.c{background:#fff;border-radius:24px;padding:clamp(24px,5vw,56px);box-shadow:0 20px 60px rgba(0,0,0,.06)}h1{font-size:clamp(28px,4vw,40px);letter-spacing:-.02em;line-height:1.15;margin:0 0 8px}
h2{font-size:21px;margin:36px 0 10px;letter-spacing:-.01em}h3{font-size:18px;margin:24px 0 8px}p,li{color:#2b2b2e}a{color:#c45300}ul,ol{padding-left:1.3em}
@media print{body{background:#fff}.c{box-shadow:none;padding:0}.top{display:none}}</style></head>
<body><div class="w"><div class="top"><div class="logo">KFL<b>.</b></div><div class="meta">Fassung ${t.version}${stand ? ' · Stand ' + esc(stand) : ''}</div></div>
<main class="c"><h1>AGB für Geschäftspartner</h1>${t.html}</main></div></body></html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'", 'X-Frame-Options': 'DENY', ...SEC_HEADERS } });
}
