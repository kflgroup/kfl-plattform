/* KFL: einmalige Bestätigung von AGB, Widerrufsbelehrung und Datenschutz für angemeldete Kunden (Section kfl-account-consent) */
(() => {
  const auth = document.getElementById('k-consent-auth'), box = document.getElementById('k-cons');
  if (!auth || !box) return;
  let a; try { a = JSON.parse(auth.textContent); } catch (e) { return; }
  // Formulare mit eigenen Einwilligungen (Traumwagen-DEAL, Auto verkaufen, Support) nicht zusätzlich stören
  if (document.querySelector('.k-consents')) return;
  const key = `kfl_cons_${a.kid}_${a.version || 'x'}`;
  const store = { get: (s, k) => { try { return window[s].getItem(k); } catch (e) { return null; } }, set: (s, k, v) => { try { window[s].setItem(k, v); } catch (e) { /* privat */ } } };
  if (store.get('localStorage', key) === 'ok' || store.get('sessionStorage', key) === 'later') return;
  const tok = { _kid: a.kid, _ts: a.ts, _sig: a.sig, version: a.version };
  const post = (p, body) => fetch(a.ep.replace(/\/$/, '') + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    .then((r) => r.json().catch(() => ({ ok: false, error: 'Unerwartete Antwort' })));
  const form = box.querySelector('form'), err = box.querySelector('.k-cons__error'), submit = form.querySelector('[type=submit]');
  const open = () => { box.hidden = false; document.documentElement.classList.add('k-cons-lock'); requestAnimationFrame(() => box.classList.add('is-open')); const f = form.querySelector('input'); if (f) f.focus({ preventScroll: true }); };
  const close = () => { box.classList.remove('is-open'); document.documentElement.classList.remove('k-cons-lock'); setTimeout(() => { box.hidden = true; }, 260); };
  const later = () => { store.set('sessionStorage', key, 'later'); close(); };
  box.querySelectorAll('[data-cons-later]').forEach((el) => el.addEventListener('click', later));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !box.hidden) later(); });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const agb = form.elements.agb.checked, privacy = form.elements.privacy.checked;
    if (!agb || !privacy) { err.textContent = 'Bitte bestätige beide Punkte.'; err.hidden = false; return; }
    err.hidden = true; submit.disabled = true; submit.textContent = 'Wird gespeichert …';
    post('/my/consent', { ...tok, agb: true, privacy: true, source: 'Hinweis auf der Webseite' }).then((r) => {
      if (!r || !r.ok) throw new Error((r && r.error) || 'Speichern fehlgeschlagen');
      store.set('localStorage', key, 'ok');
      form.querySelector('.k-cons__actions').innerHTML = '<span class="k-cons__done">✓ Danke, gespeichert.</span>';
      setTimeout(close, 1200);
    }).catch((x) => { err.textContent = x.message + ' – bitte versuche es gleich noch einmal.'; err.hidden = false; submit.disabled = false; submit.textContent = 'Bestätigen'; });
  });
  // Nur zeigen, wenn für diese Version noch keine Bestätigung vorliegt (Abfrage beim Formular-Dienst)
  const run = () => post('/my/consent/status', tok).then((r) => {
    if (!r || !r.ok) return;
    if (!r.needed) { store.set('localStorage', key, 'ok'); return; }
    setTimeout(open, 900);
  }).catch(() => { /* Dienst nicht erreichbar: nichts anzeigen */ });
  if (document.readyState === 'complete') run(); else window.addEventListener('load', run);
})();
