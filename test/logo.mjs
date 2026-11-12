// Firmenlogo in beiden Dashboards: Auslieferung über /brand/logo.png, Einstellung, Fallback auf den Schriftzug
import { makeD1, installFetch, SECRET, setNow, client, check } from './harness.mjs';
const worker = (await import('./wk.mjs')).default;
installFetch();
const png = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13]);
let calls = 0, fail = false;
const prev = globalThis.fetch;
globalThis.fetch = async (input, init) => { const url = typeof input === 'string' ? input : input.url;
  if (url.startsWith('https://cdn.shopify.com/')) { calls++; return fail ? new Response('x', { status: 500 }) : new Response(png, { headers: { 'Content-Type': 'image/png' } }); }
  return prev(input, init); };
setNow('2026-11-12T08:00:00Z');
const env = { DB: makeD1(), FORM_SECRET: SECRET, SETUP_TOKEN: 's' };
const c = client(worker, env);
await c.post('/api/setup', { token: 's', email: 'admin@kfl.de', name: 'Admin', password: 'AdminPass123!' }, { who: 'admin' });
console.log('Logo');
let r = await c.call('GET', '/brand/logo.png', null, { raw: true });
const b = new Uint8Array(await r.arrayBuffer());
check(r.status === 200 && r.headers.get('Content-Type') === 'image/png' && b.length === png.length && /max-age=86400/.test(r.headers.get('Cache-Control')), 'Logo wird aus Shopify geladen und ausgeliefert');
await c.call('GET', '/brand/logo.png', null, { raw: true }); check(calls === 1, 'Zwischengespeichert (kein zweiter Abruf)');
for (const [app, path] of [['intern', '/admin'], ['Partner', '/partner']]) {
  const h = await (await c.call('GET', path, null, { raw: true })).text();
  check(h.includes('/brand/logo.png') && h.includes('logo-img') && h.includes('Finanzieren.') && h.includes('rel="icon"'), `${app}: Logo, Unterzeile und Favicon im Dashboard`);
}
r = await c.patch('/api/settings', { brand_logo_url: 'https://evil.test/logo.png' }, { who: 'admin' });
check(r.status === 400, 'Fremde Bildadressen werden abgelehnt (nur Shopify / kfl-group.com)', r);
r = await c.patch('/api/settings', { brand_logo_url: 'https://cdn.shopify.com/s/files/neu.png' }, { who: 'admin' }); check(r.ok, 'Neue Shopify-Adresse kann gespeichert werden');
fail = true; r = await c.call('GET', '/brand/logo.png', null, { raw: true });
check(r.status === 404, 'Bild nicht erreichbar → 404, die Dashboards zeigen dann den Schriftzug');
if (!process.exitCode) console.log('OK – Logo');
