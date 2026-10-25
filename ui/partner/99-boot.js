/* ===== Routen ===== */
Router
  .on(/^#\/einladung\/([0-9a-f]{64})/, (t) => pinvite(t))
  .on(/^#\/?(\?.*)?$/, () => pStart())
  .on(/^#\/notizen/, () => pNotes())
  .on(/^#\/anfragen\/(\d+)/, (id) => pRequest(id))
  .on(/^#\/anfragen(\?.*)?$/, () => pRequests())
  .on(/^#\/angebote/, () => pOffers())
  .on(/^#\/news/, () => pNews())
  .on(/^#\/statistik/, () => pStats())
  .on(/^#\/einstellungen\/?([a-z]*)/, (t) => pSettings(t))
  .on(/^#\/support\/(\d+)/, (id) => pSupport(id))
  .on(/^#\/support/, () => pSupport());
Router.fallback = () => { location.hash = '#/'; };
const _presolve = Router.resolve.bind(Router);
Router.resolve = async function () { if (/^#\/einladung\//.test(location.hash)) return _presolve(); if (P.user && P.user.consentsOk) return _presolve(); return pboot(); };
// Login-Seite zeigt Social-Links: Sitzung (inkl. Links) zuerst laden
run(async () => { if (/^#\/einladung\//.test(location.hash)) { await ploadSession().catch(() => {}); return _presolve(); } return pboot(); });
