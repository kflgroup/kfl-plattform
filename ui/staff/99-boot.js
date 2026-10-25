/* ===== Routen ===== */
Router
  .on(/^#\/einladung\/([0-9a-f]{64})/, (t) => inviteScreen(t))
  .on(/^#\/?(\?.*)?$/, () => pageStart())
  .on(/^#\/anfragen\/(\d+)/, (no) => pageRequest(no))
  .on(/^#\/anfragen(\?.*)?$/, () => pageRequests())
  .on(/^#\/buchhaltung\/?([a-z]*)/, (t) => pageAccounting(t || 'uebersicht'))
  .on(/^#\/partner\/(\d+)/, (id) => pagePartner(id))
  .on(/^#\/partner(\?.*)?$/, () => pagePartners())
  .on(/^#\/statistik\/?([a-z]*)/, (t) => pageStats(t))
  .on(/^#\/support\/(\d+|systemfehler)/, (id) => pageSupport(id))
  .on(/^#\/support(\?.*)?$/, () => pageSupport())
  .on(/^#\/news\/chat\/(\d+)/, (id) => pageNews('chat', id))
  .on(/^#\/news\/?([a-z]*)/, (sub) => pageNews(sub))
  .on(/^#\/verwaltung\/?([a-z]*)/, (t) => pageAdmin(t))
  .on(/^#\/einstellungen/, () => pageAdmin('einstellungen'))
  .on(/^#\/backup/, () => pageBackup())
  .on(/^#\/protokoll/, () => pageAudit());
Router.fallback = () => { location.hash = '#/'; };
const _resolve = Router.resolve.bind(Router);
// Ohne Anmeldung nur Einladung erlauben
Router.resolve = async function () {
  if (/^#\/einladung\//.test(location.hash) || S.user) return _resolve();
  return boot();
};
if (/^#\/einladung\//.test(location.hash)) Router.resolve(); else run(boot);
