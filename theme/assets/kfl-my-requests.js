/* KFL – Meine Anfragen: Liste, Angebote („Interessiert mich“), Notizen und Bearbeiten (über den KFL-Formular-Dienst)
   Schnittstelle (Cloudflare Worker), alle Aufrufe POST mit JSON und Kunden-Token {_kid, _ts, _sig}:
     /my/requests                 → { ok, requests: [ { id, number, form, created_at, status, status_label, tone, editable, fields } ] }
     /my/requests  { id }         → dieselbe Antwort, nur diese Anfrage
     /my/requests/<id>/note       { text } → { ok, body }   (Notiz wird unter „Sonstiges“ = fields.body angehängt)
     /my/requests/<id>/update     komplette Formulardaten wie beim Absenden → { ok }
     /my/requests/<id>/accept     { offer_id } → { ok }   (Kunde klickt „Interessiert mich“, Partner bekommt die Kontaktdaten)
     /my/requests/<id>/decline    { reason }   → { ok }
     /my/requests/<id>/file       { offer_id, which } → { ok, name, base64 }  (neutrale PDF des Angebots)
   Token: _sig = HMAC-SHA256("<kundennummer>.<zeit>.my", FORM_SECRET), erzeugt im Snippet kfl-my-auth. */
(() => {
  'use strict';
  if (window.__kflMy) return;
  window.__kflMy = true;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const MY_URL = '/pages/meine-anfragen';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ready = (fn) => (document.readyState === 'loading' || document.readyState === 'interactive' ? document.addEventListener('DOMContentLoaded', fn, { once: true }) : fn());

  let auth = null;
  try { const el = document.getElementById('k-my-auth'); auth = el ? JSON.parse(el.textContent) : null; } catch (e) { auth = null; }

  const api = async (path, body) => {
    if (!auth || !auth.ep) throw new Error('kein Zugang');
    const res = await fetch(String(auth.ep).replace(/\/+$/, '') + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ _kid: auth.kid, _ts: auth.ts, _sig: auth.sig }, body || {}))
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.ok) { const err = new Error(json.error || 'Fehler'); err.status = res.status; throw err; }
    return json;
  };

  const FORMS = {
    deal: { label: 'Traumwagen-DEAL', page: '/pages/traumwagen-deal' },
    sell: { label: 'Mein Auto verkaufen', page: '/pages/auto-verkaufen' },
    support: { label: 'Support' },
    partner: { label: 'Partner-Anfrage' },
    widerruf: { label: 'Widerruf' }
  };
  const PAY = { kaufen: 'Kaufen', finanzieren: 'Finanzieren', leasen: 'Leasen' };
  const LABEL = { name: 'Nachname', email: 'E-Mail', phone: 'Telefon', Bezahlart: 'Bezahlart' };
  // technische Felder und Einwilligungen nicht anzeigen
  const HIDDEN = /^(_|Formular$|Kundennummer$|Firma2$|body$|Einwilligung|AGB akzeptiert|Datenschutz akzeptiert|Weitergabe an Partner)/;
  // Einwilligungen werden beim Ändern nicht vorbelegt: Der Kunde bestätigt sie neu.
  const NO_PREFILL = /^(_|Formular$|Kundennummer$|Firma2$|Einwilligung|AGB akzeptiert|Datenschutz akzeptiert|Weitergabe an Partner)/;

  const fmtDate = (v) => {
    const d = new Date(typeof v === 'number' && v < 1e12 ? v * 1000 : v);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  const val = (k, v) => (k === 'Bezahlart' ? PAY[v] || v : v);
  const vehicle = (f) => {
    const make = f['Marke (Freitext)'] || (f.Marke && f.Marke !== 'Andere' && f.Marke !== 'Noch offen' ? f.Marke : '');
    const model = f['Modell (Freitext)'] || (f.Modell && f.Modell !== 'Anderes Modell' && f.Modell !== 'Noch offen' ? f.Modell : '');
    const name = [make, model, make || model ? f.Modellvariante : ''].filter(Boolean).join(' ');
    return name || (f.Marke === 'Noch offen' ? 'Fahrzeug noch offen' : '');
  };
  const subline = (r) => {
    const f = r.fields || {}, parts = [];
    if (f.Bezahlart) parts.push(val('Bezahlart', f.Bezahlart));
    if (f.Zustand) parts.push(f.Zustand);
    if (f['Servicepaket Wartung & Inspektion']) parts.push('Wartung & Inspektion');
    if (f['Servicepaket Versicherung / Kasko']) parts.push('Versicherung / Kasko');
    if (f.Erstzulassung) parts.push('EZ ' + String(f.Erstzulassung).split('-').reverse().join('/'));
    if (f['Laufleistung km']) parts.push(f['Laufleistung km'] + ' km');
    return parts.join(' · ');
  };
  const ICON_LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" stroke-linecap="round"/></svg>';
  const ICON_EDIT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></svg>';


  /* ---------- Angebote ---------- */
  const eur = (n) => (n == null || n === '' || isNaN(+n) ? '' : (+n).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }));
  const KIND = { kauf: 'Kaufangebot', leasing: 'Leasingangebot', finanzierung: 'Finanzierungsangebot', ankauf: 'Ankaufangebot' };
  const OROWS = [['monthly_rate', 'Monatliche Rate', eur], ['price', 'Kaufpreis', eur], ['buy_price', 'Ankaufpreis', eur], ['down_payment', 'Anzahlung / Sonderzahlung', eur], ['final_rate', 'Schlussrate', eur],
    ['term_months', 'Laufzeit', (v) => v + ' Monate'], ['km_per_year', 'Kilometer pro Jahr', (v) => (+v).toLocaleString('de-DE') + ' km'], ['transfer_cost', 'Überführung und Zulassung', eur],
    ['service_cost', 'Wartung & Inspektion (mtl.)', eur], ['insurance_cost', 'Versicherung / Kasko (mtl.)', eur], ['delivery', 'Lieferzeit'], ['config', 'Konfiguration', (v) => (v === 'gleich' ? 'Wie von dir angefragt' : 'Alternative Konfiguration')],
    ['equipment_match', 'Ausstattung wie angefragt', (v) => (v === 'ja' ? 'Ja' : 'Nein – siehe Anmerkungen')], ['first_registration', 'Erstzulassung'], ['mileage', 'Kilometerstand', (v) => (+v).toLocaleString('de-DE') + ' km'],
    ['accident_free', 'Unfallfrei', (v) => (v === 'ja' ? 'Ja' : 'Nein')], ['owners', 'Vorbesitzer'], ['pickup', 'Abholung'], ['valid_until', 'Gültig bis', fmtDate], ['notes', 'Anmerkungen des Partners']];
  const headline = (d) => (d.monthly_rate ? `${eur(d.monthly_rate)}<small> / Monat</small>` : d.price ? eur(d.price) : d.buy_price ? eur(d.buy_price) : '');
  const offerCard = (r, o) => {
    const d = o.data || {}, p = o.partner || {}, accepted = o.status === 'angenommen', open = o.status === 'vorgestellt' && r.status === 'angebot_beim_kunden';
    const rows = OROWS.filter(([k]) => d[k] !== undefined && d[k] !== null && d[k] !== '').map(([k, l, f]) => `<dt>${esc(l)}</dt><dd>${esc(f ? f(d[k]) : d[k])}</dd>`).join('');
    const partner = accepted
      ? `<div class="k-offer__partner"><strong>${esc(p.name || '')}</strong>${p.person ? `<span>Dein Ansprechpartner: ${esc(p.person)}</span>` : ''}${p.street ? `<span>${esc(p.street)}, ${esc(p.zip || '')} ${esc(p.city || '')}</span>` : ''}
         <span class="k-actions">${p.phone ? `<a class="k-btn k-btn--dark k-btn--sm" href="tel:${esc(String(p.phone).replace(/[^+\d]/g, ''))}">Anrufen</a>` : ''}${p.email ? `<a class="k-btn k-btn--ghost k-btn--sm" href="mailto:${esc(p.email)}">E-Mail schreiben</a>` : ''}</span></div>`
      : `<p class="k-offer__who">${esc(p.name || 'Geprüfter KFL-Partner')}${o.distance_km != null ? ` · ca. ${Math.round(o.distance_km)} km von dir` : ''}</p>`;
    return `<article class="k-offer${accepted ? ' is-accepted' : ''}">
      <div class="k-offer__head"><div><p class="k-offer__kind">${esc(KIND[o.kind] || 'Angebot')}${d.vat_mode ? ' · ' + (d.vat_mode === 'netto' ? 'netto' : 'inkl. MwSt.') : ''}</p><p class="k-offer__price">${headline(d)}</p></div>
        <span class="k-req__status" data-tone="${accepted ? 'offer' : 'progress'}">${accepted ? 'Angenommen' : open ? 'Für dich ausgewählt' : 'Angebot'}</span></div>
      ${partner}
      ${rows ? `<dl class="k-req__dl">${rows}</dl>` : ''}
      ${o.has_pdf || o.has_expose ? `<p class="k-actions" style="margin:0">${o.has_pdf ? `<button type="button" class="k-link" data-file="${esc(r.id)}" data-offer="${esc(o.id)}" data-which="pdf">Angebot als PDF</button>` : ''}${o.has_expose ? `<button type="button" class="k-link" data-file="${esc(r.id)}" data-offer="${esc(o.id)}" data-which="expose">Exposé als PDF</button>` : ''}</p>` : ''}
      ${open ? `<div class="k-offer__cta"><button type="button" class="k-btn k-btn--primary" data-accept="${esc(r.id)}" data-offer="${esc(o.id)}">Interessiert mich</button>
        <button type="button" class="k-btn k-btn--ghost k-btn--sm" data-decline="${esc(r.id)}">Passt nicht für mich</button>
        <p class="k-offer__hint" data-cta-hint>Mit „Interessiert mich“ geben wir deine Kontaktdaten an diesen Partner weiter. Er meldet sich innerhalb von 24 Stunden an Werktagen bei dir. Unverbindlich – unterschrieben wird erst beim Partner.</p></div>` : ''}
      ${accepted ? '<p class="k-offer__hint">Der Partner hat deine Kontaktdaten und meldet sich bei dir. Du hast dich nach 24 Stunden noch nicht gehört? Schreib uns eine Notiz.</p>' : ''}
    </article>`;
  };
  const offersBlock = (r) => {
    const list = r.offers || [];
    if (!list.length) return r.status === 'angebot_abgelehnt' ? '<p class="k-req__lock">Du hast das Angebot abgelehnt. Wir melden uns, falls wir eine passendere Alternative finden.</p>' : '';
    return `<section class="k-offers" aria-label="Angebote"><h3 class="k-offers__title">${list.length === 1 ? 'Dein Angebot' : 'Deine Angebote'}</h3>${list.map((o) => offerCard(r, o)).join('')}</section>`;
  };

  /* ---------- Seite „Meine Anfragen“ ---------- */
  const card = (r) => {
    const f = r.fields || {};
    const form = FORMS[r.form] || { label: 'Anfrage' };
    const no = r.number || r.id;
    const title = vehicle(f) || form.label;
    const rows = Object.keys(f).filter((k) => !HIDDEN.test(k) && String(f[k]).trim() !== '')
      .map((k) => `<dt>${esc(LABEL[k] || k)}</dt><dd>${esc(val(k, f[k]))}</dd>`).join('');
    const canEdit = r.editable && form.page;
    const bar = canEdit
      ? `<a class="k-btn k-btn--dark k-btn--sm" href="${form.page}?anfrage=${encodeURIComponent(r.id)}">${ICON_EDIT}Anfrage ändern</a><span class="k-req__hint">Möglich, solange noch kein Angebot vorliegt.</span>`
      : `<p class="k-req__lock">${ICON_LOCK}<span>${form.page ? 'Für diese Anfrage liegen bereits Angebote vor. Änderungen schick uns bitte als Notiz.' : 'Diese Anfrage kannst du mit einer Notiz ergänzen.'}</span></p>`;
    return `<article class="k-req" id="anfrage-${esc(r.id)}">
  <header class="k-req__head">
    <div>
      <p class="k-req__meta"><span class="k-req__no">#${esc(no)}</span> · ${esc(form.label)}${r.created_at ? ' · ' + esc(fmtDate(r.created_at)) : ''}</p>
      <h2 class="k-req__title">${esc(title)}</h2>
      ${subline(r) ? `<p class="k-req__sub">${esc(subline(r))}</p>` : ''}
    </div>
    <span class="k-req__status" data-tone="${esc(r.tone || 'open')}">${esc(r.status_label || 'Eingegangen')}</span>
  </header>
  ${offersBlock(r)}
  <div class="k-req__bar">${bar}</div>
  ${rows ? `<details class="k-req__more"><summary>Alle Angaben ansehen</summary><dl class="k-req__dl">${rows}</dl></details>` : ''}
  <div class="k-req__notes">
    <h3>Sonstiges</h3>
    <p class="k-req__body" data-body>${f.body ? esc(f.body) : '<span class="k-muted">Noch keine Notizen.</span>'}</p>
    <form class="k-req__noteform" data-note="${esc(r.id)}" novalidate>
      <label class="k-visually-hidden" for="k-note-${esc(r.id)}">Notiz an KFL zu Anfrage #${esc(no)}</label>
      <textarea class="k-textarea" id="k-note-${esc(r.id)}" name="text" rows="3" maxlength="2000" required placeholder="Notiz an KFL, z. B. Rückrufwunsch oder neue Wunschfarbe"></textarea>
      <div class="k-actions"><button type="submit" class="k-btn k-btn--primary k-btn--sm">Notiz senden</button><span class="k-req__msg" role="status" aria-live="polite"></span></div>
    </form>
  </div>
</article>`;
  };

  const initList = (box) => {
    const render = (list) => {
      if (!list.length) {
        box.innerHTML = `<div class="k-panel k-my-empty"><h2 class="k-h3">Noch keine Anfragen</h2><p class="k-muted" style="margin:0;max-width:52ch">Sobald du eine Anfrage an uns schickst, findest du sie hier mit allen Angaben und dem aktuellen Stand.</p><div class="k-actions"><a class="k-btn k-btn--primary" href="/pages/traumwagen-deal">Traumwagen-DEAL starten</a><a class="k-btn k-btn--ghost" href="/pages/auto-verkaufen">Mein Auto verkaufen</a></div></div>`;
        return;
      }
      box.innerHTML = `<p class="k-my-count">${list.length === 1 ? '1 Anfrage' : list.length + ' Anfragen'}</p>` + list.map(card).join('');
      if (location.hash) { const t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView({ block: 'start' }); }
    };
    const fail = () => {
      box.innerHTML = `<div class="k-note k-note--err" role="alert">Deine Anfragen konnten gerade nicht geladen werden. Bitte versuch es gleich noch einmal oder schreib uns an <a href="mailto:vermittlung@kfl-group.com">vermittlung@kfl-group.com</a>.</div><div class="k-actions" style="margin-top:1.6rem"><button type="button" class="k-btn k-btn--dark k-btn--sm" data-retry>Erneut laden</button></div>`;
      const b = $('[data-retry]', box); if (b) b.addEventListener('click', load);
    };
    const load = () => {
      box.setAttribute('aria-busy', 'true');
      box.innerHTML = '<div class="k-skel"></div><div class="k-skel"></div>';
      api('/my/requests').then((j) => {
        const waiting = (r) => (r.offers || []).some((o) => o.status === 'vorgestellt') && r.status === 'angebot_beim_kunden' ? 1 : 0;
        const list = (j.requests || []).slice().sort((a, b) => waiting(b) - waiting(a) || String(b.created_at || '').localeCompare(String(a.created_at || '')));
        render(list);
      }).catch(fail).finally(() => box.removeAttribute('aria-busy'));
    };
    box.addEventListener('click', async (e) => {
      const acc = e.target.closest('[data-accept]'), dec = e.target.closest('[data-decline]'), file = e.target.closest('[data-file]'), send = e.target.closest('[data-decline-send]');
      if (acc) {
        if (!acc.dataset.sure) { acc.dataset.sure = '1'; acc.textContent = 'Ja, Kontakt freigeben'; const h = $('[data-cta-hint]', acc.closest('.k-offer')); if (h) h.dataset.emph = ''; return; }
        acc.disabled = true; acc.textContent = 'Wird gesendet …';
        try { await api('/my/requests/' + encodeURIComponent(acc.dataset.accept) + '/accept', { offer_id: +acc.dataset.offer }); load(); }
        catch (err) { acc.disabled = false; acc.textContent = 'Interessiert mich'; delete acc.dataset.sure; alert(err.message || 'Das hat nicht geklappt. Bitte versuch es noch einmal.'); }
      }
      if (dec) {
        const wrap = dec.closest('.k-offer__cta'); if ($('[data-decline-form]', wrap)) return;
        wrap.insertAdjacentHTML('beforeend', `<div class="k-req__noteform" data-decline-form><label class="k-visually-hidden" for="k-dec-${esc(dec.dataset.decline)}">Was passt nicht?</label><textarea class="k-textarea" id="k-dec-${esc(dec.dataset.decline)}" rows="2" placeholder="Was passt nicht? z. B. Rate zu hoch, andere Farbe gewünscht (optional)"></textarea><div class="k-actions"><button type="button" class="k-btn k-btn--dark k-btn--sm" data-decline-send="${esc(dec.dataset.decline)}">Angebot ablehnen</button></div></div>`);
      }
      if (send) {
        send.disabled = true;
        try { await api('/my/requests/' + encodeURIComponent(send.dataset.declineSend) + '/decline', { reason: ($('textarea', send.closest('[data-decline-form]')) || {}).value || '' }); load(); }
        catch (err) { send.disabled = false; alert(err.message || 'Das hat nicht geklappt.'); }
      }
      if (file) {
        file.disabled = true;
        try {
          const j = await api('/my/requests/' + encodeURIComponent(file.dataset.file) + '/file', { offer_id: +file.dataset.offer, which: file.dataset.which });
          const bin = atob(j.base64), arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
          const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([arr], { type: 'application/pdf' })); a.download = j.name || 'KFL-Angebot.pdf'; document.body.appendChild(a); a.click(); a.remove();
        } catch (err) { alert('Die Datei ist gerade nicht verfügbar.'); }
        file.disabled = false;
      }
    });
    box.addEventListener('submit', async (e) => {
      const fm = e.target.closest('[data-note]'); if (!fm) return;
      e.preventDefault();
      const ta = $('textarea', fm), msg = $('.k-req__msg', fm), btn = $('button', fm);
      const text = ta.value.trim();
      msg.removeAttribute('data-ok'); msg.removeAttribute('data-err');
      if (text.length < 2) { msg.dataset.err = ''; msg.textContent = 'Bitte schreib kurz, was wir wissen sollen.'; ta.focus(); return; }
      btn.disabled = true; msg.textContent = 'Wird gesendet …';
      try {
        const j = await api('/my/requests/' + encodeURIComponent(fm.dataset.note) + '/note', { text });
        const body = $('[data-body]', fm.closest('.k-req'));
        if (body && j.body != null) body.textContent = j.body;
        ta.value = '';
        msg.dataset.ok = ''; msg.textContent = 'Danke, deine Notiz ist bei uns.';
      } catch (err) {
        msg.dataset.err = ''; msg.textContent = 'Senden hat nicht geklappt. Bitte versuch es noch einmal.';
      }
      btn.disabled = false;
    });
    if (!auth) { fail(); return; }
    load();
  };

  /* ---------- Formular im Bearbeiten-Modus (?anfrage=<id>) ---------- */
  const qs = (k) => `[name="contact[${String(k).replace(/["\\]/g, '\\$&')}]"]`;
  const setField = (form, k, v) => {
    $$(qs(k), form).forEach((el) => {
      if (el.type === 'radio') el.checked = el.value === String(v);
      else if (el.type === 'checkbox') el.checked = v != null && v !== '' && v !== 'Nein';
      else if (el.tagName === 'SELECT') {
        if (!$$('option', el).some((o) => o.value === String(v))) { const o = document.createElement('option'); o.value = o.textContent = String(v); el.append(o); }
        el.value = String(v);
      } else el.value = String(v);
    });
  };
  const waitFor = (test, ms = 6000) => new Promise((resolve) => {
    const t0 = Date.now();
    const tick = () => { if (test()) resolve(true); else if (Date.now() - t0 > ms) resolve(false); else setTimeout(tick, 60); };
    tick();
  });
  const prefill = async (form, f) => {
    const make = $('[data-car-make]', form), model = $('[data-car-model]', form);
    const skip = new Set(['Marke', 'Modell']);
    Object.keys(f).forEach((k) => { if (!NO_PREFILL.test(k) && !skip.has(k)) setField(form, k, f[k]); });
    form.dispatchEvent(new Event('change', { bubbles: true }));
    if (make && f.Marke) {
      setField(form, 'Marke', f.Marke);
      make.dispatchEvent(new Event('change', { bubbles: true }));
      if (model && f.Modell) {
        await waitFor(() => !model.disabled && $$('option', model).length > 1);
        setField(form, 'Modell', f.Modell);
        model.dispatchEvent(new Event('change', { bubbles: true }));
      }
      ['Marke (Freitext)', 'Modell (Freitext)', 'Modellvariante'].forEach((k) => { if (f[k] != null) setField(form, k, f[k]); });
    }
    // Abhängige Felder (Bedingungen, Telefon-Pflicht bei Kontaktweg) neu auswerten
    $$('input[type="radio"]:checked, input[type="checkbox"]', form).forEach((el) => el.dispatchEvent(new Event('change', { bubbles: true })));
    form.dispatchEvent(new Event('change', { bubbles: true }));
    $$('[data-dob]', form).forEach((i) => i.dispatchEvent(new Event('blur')));
  };

  const css = `.k-edit-banner{display:flex;flex-wrap:wrap;gap:1rem 1.6rem;align-items:center;justify-content:space-between;padding:1.6rem 2rem;margin-bottom:2.4rem;border-radius:var(--k-radius-m);background:#000;color:#fff;font-size:1.5rem}.k-edit-banner strong{font-size:1.7rem}.k-edit-banner a{color:#fff;font-weight:700}.k-edit-banner[data-err]{background:#fdecea;color:#7a1a11}.k-edit-banner[data-err] a{color:#7a1a11}.k-my-link{display:inline-flex;align-items:center;gap:.8rem}`;

  const initEdit = (form, id) => {
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    const panel = form.closest('.k-panel') || form;
    const banner = document.createElement('div');
    banner.className = 'k-edit-banner'; banner.setAttribute('role', 'status');
    banner.innerHTML = '<span>Anfrage wird geladen …</span>';
    panel.insertBefore(banner, panel.firstChild);
    form.hidden = true;
    const submit = $('[data-submit]', form);

    api('/my/requests', { id }).then(async (j) => {
      const r = (j.requests || []).find((x) => String(x.id) === String(id));
      if (!r) throw Object.assign(new Error('nicht gefunden'), { status: 404 });
      const no = esc(r.number || r.id);
      if (!r.editable) {
        banner.dataset.err = '';
        banner.innerHTML = `<span><strong>Anfrage #${no} kann nicht mehr geändert werden.</strong><br>Es liegen bereits Angebote vor. Schick uns deine Änderung einfach als Notiz.</span><a href="${MY_URL}#anfrage-${esc(r.id)}">Zu meinen Anfragen</a>`;
        return;
      }
      await prefill(form, r.fields || {});
      // Absenden geht an die Änderungs-Schnittstelle, signiert mit dem Kunden-Token
      form.dataset.endpoint = String(auth.ep).replace(/\/+$/, '') + '/my/requests/' + encodeURIComponent(r.id) + '/update';
      [['_kid', auth.kid], ['_ts', auth.ts], ['_sig', auth.sig], ['_edit', r.id]].forEach(([n, v]) => {
        let inp = $(`input[name="${n}"]`, form);
        if (!inp) { inp = document.createElement('input'); inp.type = 'hidden'; inp.name = n; form.appendChild(inp); }
        inp.value = v;
      });
      if (submit) submit.textContent = 'Änderungen speichern';
      banner.innerHTML = `<span><strong>Du änderst Anfrage #${no}.</strong><br>Alle Angaben sind übernommen. Prüf sie, bestätige am Ende die Hinweise und speichere.</span><a href="${MY_URL}">Abbrechen</a>`;
      form.hidden = false;
      // Danke-Ansicht für Änderungen anpassen
      const ok = $(form.dataset.success);
      if (ok) {
        const h = $('h2', ok); if (h) h.textContent = 'Deine Änderungen sind gespeichert.';
        const p = $('.k-lead', ok); if (p) p.textContent = `Wir haben Anfrage #${r.number || r.id} aktualisiert und arbeiten mit den neuen Angaben weiter.`;
        $$('.k-voucher, .k-steps', ok).forEach((el) => el.remove());
        $$('.k-actions', ok).forEach((el) => el.remove());
        const a = document.createElement('div'); a.className = 'k-actions';
        a.innerHTML = `<a class="k-btn k-btn--primary" href="${MY_URL}#anfrage-${esc(r.id)}">Zu meinen Anfragen</a>`;
        ok.appendChild(a);
        ok.dataset.myDone = '1';
      }
    }).catch(() => {
      banner.dataset.err = '';
      banner.innerHTML = `<span><strong>Die Anfrage konnte nicht geladen werden.</strong><br>Bitte versuch es gleich noch einmal.</span><a href="${MY_URL}">Zu meinen Anfragen</a>`;
    });
  };

  /* ---------- Hinweis auf „Meine Anfragen“ in der Danke-Ansicht ---------- */
  const addSuccessLink = (ok) => {
    if (!ok || ok.dataset.myDone || $('[data-my-link]', ok)) return;
    const p = document.createElement('p');
    p.setAttribute('data-my-link', '');
    p.style.margin = '0';
    p.innerHTML = `<a class="k-link" href="${MY_URL}">Deine Anfrage findest du jederzeit unter „Meine Anfragen“</a> <span class="k-muted">– dort kannst du sie ändern oder uns eine Notiz schicken.</span>`;
    const lead = $('.k-lead', ok);
    if (lead) lead.insertAdjacentElement('afterend', p); else ok.appendChild(p);
  };

  ready(() => {
    const box = $('[data-my-requests]');
    if (box) initList(box);
    const id = new URLSearchParams(location.search).get('anfrage');
    $$('form[data-k-form="deal"], form[data-k-form="sell"]').forEach((form) => {
      if (id && auth) initEdit(form, id);
      const ok = form.dataset.success && $(form.dataset.success);
      if (ok) {
        if (!ok.hidden) addSuccessLink(ok);
        new MutationObserver(() => { if (!ok.hidden) addSuccessLink(ok); }).observe(ok, { attributes: true, attributeFilter: ['hidden'] });
      }
    });
  });
})();
