/* ============================================================
   KFL Plattform 2.0 – zentrale Konfiguration
   Rollen, Rechte, Status, Standard-Einstellungen
   ============================================================ */

const APP_VERSION = '2.0.0';
const NUMBER_OFFSET = 1000; // Anfrage #1001 = id 1

/* ---------- Interne Rollen (KFL GbR) ---------- */
// rank: höhere Zahl = übergeordnet (für Vertretungen und Nutzerverwaltung)
const STAFF_ROLES = {
  admin:       { label: 'Admin',           rank: 100 },
  gf:          { label: 'Geschäftsführung', rank: 80 },
  teamleitung: { label: 'Teamleitung',     rank: 60 },
  vertrieb:    { label: 'Vertrieb',        rank: 40 },
  buchhaltung: { label: 'Buchhaltung',     rank: 40 }
};

const PERMISSIONS = [
  // Anfragen
  { key: 'req_view',          group: 'Anfragen', label: 'Anfragen sehen' },
  { key: 'req_edit',          group: 'Anfragen', label: 'Anfragen bearbeiten (Status, Notizen, Übernahme)' },
  { key: 'req_contact',       group: 'Anfragen', label: 'Kontaktdaten der Kunden sehen' },
  { key: 'req_message',       group: 'Anfragen', label: 'Nachrichten an Kunden und Partner senden' },
  { key: 'req_partner',       group: 'Anfragen', label: 'Partner manuell zuordnen, erneut senden, anmahnen' },
  { key: 'req_assign',        group: 'Anfragen', label: 'Anfragen internen Mitarbeitern zuweisen' },
  { key: 'req_spam_report',   group: 'Anfragen', label: 'Anfragen als Spam melden' },
  { key: 'req_spam_confirm',  group: 'Anfragen', label: 'Spam-Meldungen prüfen und bestätigen' },
  { key: 'req_status_force',  group: 'Anfragen', label: 'Status manuell setzen (Gewonnen, Verloren …)' },
  { key: 'req_delete',        group: 'Anfragen', label: 'Anfragen löschen' },
  // Buchhaltung
  { key: 'acc_view',          group: 'Buchhaltung', label: 'Buchhaltung sehen' },
  { key: 'acc_manage',        group: 'Buchhaltung', label: 'Rechnungen, Mahnungen, Zahlungen, Lieferanten verwalten' },
  { key: 'acc_cancel',        group: 'Buchhaltung', label: 'Abrechnungsfälle und Rechnungen stornieren' },
  { key: 'fibu_view',         group: 'Finanzbuchhaltung', label: 'Finanzbuchhaltung sehen (Konten, Buchungen, Belegarchiv, Abschlüsse)' },
  { key: 'fibu_book',         group: 'Finanzbuchhaltung', label: 'Konten anlegen, buchen, Eingangsrechnungen erfassen, Belege hochladen' },
  { key: 'fibu_manage',       group: 'Finanzbuchhaltung', label: 'Konten schließen, Anfangsbestände, Import alter Buchführung, Abschlüsse erstellen' },
  { key: 'acc_settings',      group: 'Buchhaltung', label: 'Zahlungsziel, Mahngebühren, Zahlungsbedingungen festlegen' },
  { key: 'acc_release',       group: 'Buchhaltung', label: 'Zahlungsliste freigeben (Bank-Export)' },
  // Geschäftspartner
  { key: 'partner_view',      group: 'Geschäftspartner', label: 'Geschäftspartner sehen' },
  { key: 'partner_manage',    group: 'Geschäftspartner', label: 'Geschäftspartner anlegen und bearbeiten' },
  { key: 'partner_terms',     group: 'Geschäftspartner', label: 'Konditionen je Partner (Zahlungsziel, Gebühren, Abrechnungsart)' },
  { key: 'partner_stats',     group: 'Geschäftspartner', label: 'Partner-Statistik sehen' },
  { key: 'partner_pw',        group: 'Geschäftspartner', label: 'Partner-Passwörter zurücksetzen' },
  { key: 'partner_delete',    group: 'Geschäftspartner', label: 'Organisationen und Partnerkonten löschen' },
  // Kunden (Shopify)
  { key: 'customers_view',    group: 'Kunden', label: 'Kundendatenbank sehen (Kontaktdaten, Adressen, Einwilligungen aus Shopify)' },
  { key: 'visitors_view',     group: 'Kunden', label: 'Besucherzahlen und Herkunft der Webseite sehen' },
  // Statistik
  { key: 'stats_view',        group: 'Statistik', label: 'Statistik sehen' },
  { key: 'stats_shop',        group: 'Statistik', label: 'Webshop-Statistik (Shopify) sehen' },
  { key: 'team_stats',        group: 'Statistik', label: 'Team-Auswertung (Performance der Mitarbeiter)' },
  // Support
  { key: 'support_view',      group: 'Support', label: 'Support-Anfragen sehen' },
  { key: 'support_manage',    group: 'Support', label: 'Support-Anfragen bearbeiten und beantworten' },
  { key: 'support_changes',   group: 'Support', label: 'Änderungsanträge von Partnern bestätigen' },
  { key: 'support_syslist',   group: 'Support', label: 'System-Fehlerliste' },
  // System
  { key: 'backup_view',       group: 'System', label: 'Backup' },
  { key: 'audit_view',        group: 'System', label: 'Protokoll' },
  { key: 'settings_all',      group: 'System', label: 'Alle Einstellungen' },
  { key: 'links_view',        group: 'System', label: 'Links (Dashboard, Partner, Shopify) sehen' },
  // Mitarbeiter
  { key: 'users_view',        group: 'Mitarbeiter', label: 'Mitarbeiter sehen' },
  { key: 'users_create_vt',   group: 'Mitarbeiter', label: 'Mitarbeiter mit Rolle Vertrieb anlegen' },
  { key: 'users_create',      group: 'Mitarbeiter', label: 'Mitarbeiter anlegen (außer Admin und Geschäftsführung)' },
  { key: 'users_admin',       group: 'Mitarbeiter', label: 'Alle Mitarbeiterkonten verwalten, sperren, Passwörter zurücksetzen' },
  { key: 'users_perms',       group: 'Mitarbeiter', label: 'Rollen und Sonderrechte festlegen' },
  // News
  { key: 'news_publish',      group: 'News', label: 'Mitteilungen an Mitarbeiter veröffentlichen' },
  { key: 'news_partner',      group: 'News', label: 'Nachrichten an Geschäftspartner senden' }
];
const PERM_KEYS = PERMISSIONS.map((p) => p.key);

const ROLE_PERMS = (() => {
  const vertrieb = ['req_view', 'req_edit', 'req_contact', 'req_message', 'req_spam_report', 'support_view', 'support_manage', 'partner_view', 'customers_view'];
  const teamleitung = [...vertrieb, 'req_partner', 'req_assign', 'req_spam_confirm', 'req_status_force', 'team_stats', 'users_view', 'users_create_vt'];
  const buchhaltung = ['acc_view', 'acc_manage', 'acc_cancel', 'fibu_view', 'fibu_book', 'partner_view'];
  const gf = [...new Set([...teamleitung, ...buchhaltung, 'fibu_manage', 'acc_settings', 'acc_release', 'partner_manage', 'partner_terms', 'partner_stats',
    'stats_view', 'stats_shop', 'visitors_view', 'support_changes', 'links_view', 'users_create', 'news_publish', 'news_partner'])];
  return { admin: PERM_KEYS.slice(), gf, teamleitung, vertrieb, buchhaltung };
})();

/* ---------- Partner-Rollen ---------- */
const PARTNER_ROLES = {
  gf: { label: 'Geschäftsführer', rank: 3 },
  vl: { label: 'Verkaufsleitung', rank: 2 },
  vt: { label: 'Vertriebler', rank: 1 }
};

/* ---------- Anfragearten ---------- */
const REQUEST_TYPES = {
  deal: { label: 'Traumwagen-DEAL', short: 'Kauf', inbox: 'vermittlung@kfl-group.com' },
  sell: { label: 'Fahrzeugverkauf', short: 'Verkauf', inbox: 'vermittlung@kfl-group.com' }
};
// Formulare der Webseite, die als Support-Ticket laufen
const TICKET_FORMS = {
  support:     { tag: 'Webseite', category: 'Support-Anfrage', priority: 'normal' },
  widerruf:    { tag: 'Webseite', category: 'Widerruf (§ 356a BGB)', priority: 'hoch' },
  partner:     { tag: 'Partner',  category: 'Partner-Antrag', priority: 'normal' },
  partnerdesk: { tag: 'Partner',  category: 'Partner-Anfrage', priority: 'normal' }
};

/* ---------- Status einer Anfrage (intern) ---------- */
const REQUEST_STATUSES = [
  { key: 'eingang',                label: 'Eingang',                  tone: 'neutral' },
  { key: 'in_bearbeitung',         label: 'In Bearbeitung',           tone: 'info' },
  { key: 'versendet',              label: 'Automatisch versendet',    tone: 'info' },
  { key: 'angebot_liegt_vor',      label: 'Angebot liegt vor',        tone: 'accent' },
  { key: 'angebot_in_bearbeitung', label: 'Angebot in Bearbeitung',   tone: 'accent' },
  { key: 'angebot_beim_kunden',    label: 'Angebot beim Kunden',      tone: 'accent' },
  { key: 'angebot_abgelehnt',      label: 'Angebot abgelehnt',        tone: 'muted' },
  { key: 'angebot_akzeptiert',     label: 'Angebot akzeptiert',       tone: 'ok' },
  { key: 'kontaktdaten_versendet', label: 'Kontaktdaten versendet',   tone: 'ok' },
  { key: 'kein_angebot',           label: 'Kein Angebot erhalten',    tone: 'muted' },
  { key: 'fehler',                 label: 'Fehler',                   tone: 'err' },
  { key: 'stoerung',               label: 'Störung',                  tone: 'err' },
  { key: 'spam',                   label: 'Spam (deaktiviert)',       tone: 'muted' }
];
const OPEN_STATUSES = ['eingang', 'in_bearbeitung', 'versendet', 'angebot_liegt_vor', 'angebot_in_bearbeitung', 'angebot_beim_kunden', 'angebot_akzeptiert', 'fehler', 'stoerung'];
const CUSTOMER_EDITABLE = ['eingang', 'in_bearbeitung', 'versendet'];

/* ---------- Status beim Partner (Zuordnung) ---------- */
const ASSIGN_STATUSES = [
  { key: 'neu',            label: 'Neu',                            tone: 'info' },
  { key: 'in_bearbeitung', label: 'In Bearbeitung',                 tone: 'accent' },
  { key: 'versendet',      label: 'Versendet – wartet auf Rückmeldung', tone: 'info' },
  { key: 'geschlossen',    label: 'Geschlossen',                    tone: 'warn' },
  { key: 'vorgestellt',    label: 'Vorgestellt',                    tone: 'ok-light' },
  { key: 'gewonnen',       label: 'Gewonnen',                       tone: 'ok' },
  { key: 'kontaktiert',    label: 'Kunde erfolgreich kontaktiert',  tone: 'ok' },
  { key: 'nicht_erreicht', label: 'Kunde nicht erreicht',           tone: 'warn' },
  { key: 'verloren',       label: 'Verloren',                       tone: 'muted' },
  { key: 'gescheitert',    label: 'Verhandlung gescheitert',        tone: 'muted' }
];
const ASSIGN_LIVE = ['neu', 'in_bearbeitung', 'versendet', 'vorgestellt', 'gewonnen', 'nicht_erreicht'];

/* ---------- Support ---------- */
const TICKET_STATUSES = [
  { key: 'neu', label: 'Neu' }, { key: 'in_bearbeitung', label: 'In Bearbeitung' },
  { key: 'wartet', label: 'Wartet auf Rückmeldung' }, { key: 'erledigt', label: 'Erledigt' }
];
const TICKET_PRIORITIES = [
  { key: 'normal', label: 'Normal', rank: 1 }, { key: 'hoch', label: 'Hoch', rank: 2 }, { key: 'dringend', label: 'Dringend', rank: 3 }
];

/* ---------- Buchhaltung ---------- */
const INVOICE_STATUSES = [
  { key: 'entwurf', label: 'Entwurf' }, { key: 'offen', label: 'Offen' }, { key: 'teilbezahlt', label: 'Teilbezahlt' },
  { key: 'bezahlt', label: 'Bezahlt' }, { key: 'storniert', label: 'Storniert' }
];
// Mahnwesen: kostenlose Zahlungserinnerung, dann 1. Mahnung (Stufe 1) und 2. Mahnung (Stufe 2, letzte Mahnung)
const DUNNING_LEVELS = { 1: 'Zahlungserinnerung', 2: '1. Mahnung', 3: '2. Mahnung' };
const DUNNING_MAX = 3;

/* ---------- Mail-Absender je Kategorie ---------- */
const MAIL_CATEGORIES = {
  invoice:  { label: 'Rechnungen, Mahnungen, Schreiben der Buchhaltung', setting: 'mail_from_invoice' },
  system:   { label: 'System (Einladungen, Konten, sonstige Systemmails)', setting: 'mail_from_system' },
  partner:  { label: 'Anfragetool an Geschäftspartner', setting: 'mail_from_partner' },
  support:  { label: 'Support an Partner und Kunden', setting: 'mail_from_support' },
  customer: { label: 'Nachrichten zu Anfragen an Kunden', setting: 'mail_from_customer' },
  internal: { label: 'Interne Benachrichtigungen an KFL', setting: 'mail_from_system' }
};

/* ---------- Standard-Einstellungen (alle im Admin änderbar) ---------- */
const DEFAULT_SETTINGS = {
  // Firma (Rechnungssteller)
  company_name: 'KFL GbR',
  company_street: 'Ahornring 2',
  company_zip: '49451',
  company_city: 'Holdorf',
  company_country: 'Deutschland',
  company_email: 'info@kfl-group.com',
  company_phone: '',
  company_web: 'www.kfl-group.com',
  company_tax_no: '',
  company_vat_id: '',
  company_owners: '',
  company_register: '',
  company_bank: '',
  company_iban: '',
  company_bic: '',
  // Absender
  mail_from_invoice: 'noreplay@kfl-group.com',
  mail_from_system: 'noreplay@kfl-group.com',
  mail_from_partner: 'vermittlung@kfl-group.com',
  mail_from_support: 'support@kfl-group.com',
  mail_from_customer: 'vermittlung@kfl-group.com',
  mail_sender_name: 'KFL',
  mail_internal_inbox: 'vermittlung@kfl-group.com',
  mail_support_inbox: 'support@kfl-group.com',
  // Anfragen
  offer_window_hours: 24,
  lock_hours: 4,
  contact_window_hours: 24,
  presented_count: 3,
  show_partner_identity: false,
  radius_options: [25, 50, 100, 200, 0],
  radius_default: 50,
  score_weight_price: 60, // veraltet, ersetzt durch SCORE_FACTORS
  // Gewichtung der Angebotsauswahl (Summe 100 %) – nur Admin mit Freigabepasswort
  score_w_distance: 15,
  score_w_response: 10,
  score_w_equipment: 15,
  score_w_price: 35,
  score_w_model: 10,
  score_w_term: 10,
  score_w_addons: 5,
  review_before_present: false,
  feedback_delay_hours: 24,
  survey_delay_days: 3,
  // Kunden-Erinnerungen und Nachfragen (0 = aus)
  offer_reminder_hours: 24,   // Erinnerung, wenn der Kunde auf ein vorgestelltes Angebot nicht reagiert
  service_survey_days: 5,     // Nachfrage zu Anfragetool, Service und Partnerkontakt nach der Zusage (nur mit Einwilligung)
  cart_code: 'SCHNELLSEIN',   // Gutscheincode der Warenkorb-Erinnerung (Shopify)
  cart_code_renew: true,      // Gutschein vor Ablauf automatisch um cart_code_days verlängern
  cart_code_days: 30,
  // Rechnungs-Postfach: E-Mails mit PDF-Rechnung werden als Eingangsrechnung „zu prüfen“ angelegt (Passwort als Cloudflare-Geheimnis SMTP_PASS_<NAME>)
  invoice_inbox: 'rechnung@kfl-group.com',
  invoice_inbox_active: true,
  invoice_inbox_days: 14,
  // Buchhaltung
  lead_price_deal: 0,
  lead_price_sell: 0,
  vat_rate: 19,
  vat_enabled: true,
  payment_terms_days: 14,
  dunning_auto: false,
  // Versand der nächsten Stufe: Tage nach Ablauf der vorherigen Frist (Zahlungsziel bzw. Frist im letzten Schreiben)
  dunning_days_1: 1,
  dunning_days_2: 1,
  dunning_days_3: 1,
  reminder_due_days: 5,      // neue Frist in der kostenlosen Zahlungserinnerung
  dunning_fee_1: 4.9,        // Mahngebühr 1. Mahnung (Stufe 1)
  dunning_fee_2: 79.8,       // Mahngebühr 2. Mahnung (Stufe 2)
  dunning_due_days: 10,      // Frist in der 1. Mahnung
  dunning_due_days_2: 7,     // Frist in der 2. (letzten) Mahnung
  invoice_prefix: 'RE',
  invoice_next: 1,
  invoice_intro: 'Wir berechnen Ihnen für die erfolgreiche Vermittlung folgende Leistungen:',
  invoice_footer: 'Bitte überweisen Sie den Rechnungsbetrag unter Angabe der Rechnungsnummer innerhalb des Zahlungsziels.',
  monthly_run_day: 'last',
  monthly_run_hour: 23,
  day_close_time: '18:00',
  // Support
  support_escalate_hours: 24,
  support_archive_days: 10,
  syslist_retention_days: 365,
  support_ack_subject: 'Wir haben deine Anfrage erhalten',
  support_ack_text: 'vielen Dank für deine Nachricht an den KFL-Support. Deine Anfrage ist bei uns eingegangen und wir kümmern uns schnellstmöglich darum. Du bekommst unsere Antwort per E-Mail und – falls du ein Konto bei uns hast – zusätzlich in deinem Dashboard.',
  // System
  audit_retention_days: 30,
  backup_keep: 30,
  backup_hour: 0,
  backup_minute: 1,
  backup_webhook_url: '',
  // Links
  link_public: '',
  link_staff: '',
  link_partner: '',
  link_shopify_admin: 'https://admin.shopify.com/store/3r1qns-2d',
  link_shop: 'https://kfl-group.com',
  link_instagram: 'https://www.instagram.com/',
  link_agb_partner: 'https://kfl-group.com/policies/terms-of-service',
  link_privacy: 'https://kfl-group.com/policies/privacy-policy',
  link_my_requests: 'https://kfl-group.com/pages/meine-anfragen'
};

/* ---------- Finanzbuchhaltung ---------- */
// Kontenrahmen (angelehnt an SKR03, vereinfacht). sys = feste Rolle für automatische Buchungen.
const FIBU_TYPES = { aktiv: 'Aktivkonto (Vermögen)', passiv: 'Passivkonto (Kapital/Schulden)', aufwand: 'Aufwandskonto', ertrag: 'Ertragskonto' };
// Gesellschafter (Kapital- und Privatkonten, Vorlagen „Kapitaleinlage“, „Privateinlage“, „Privatentnahme“)
// Optionale Einwilligung im Anfrageformular: Zufriedenheitsumfragen per E-Mail (Werbung i. S. v. § 7 UWG)
const FEEDBACK_CONSENT_KEY = 'Einwilligung Feedback und Erinnerungen';
const FIBU_PARTNERS = [
  { key: 'tk', name: 'Tobias Krusch', capital: '0870', deposit: '1891', withdrawal: '1801' },
  { key: 'rl', name: 'Rene Lipownik', capital: '0871', deposit: '1892', withdrawal: '1802' }
];
const FIBU_DEFAULT_ACCOUNTS = [
  ['1000', 'Kasse', 'aktiv', 'kasse'], ['1200', 'Bank', 'aktiv', 'bank'], ['1400', 'Forderungen aus Lieferungen und Leistungen', 'aktiv', 'forderungen'],
  ['1576', 'Abziehbare Vorsteuer 19 %', 'aktiv', 'vorsteuer'], ['1571', 'Abziehbare Vorsteuer 7 %', 'aktiv', 'vorsteuer7'],
  ['1600', 'Verbindlichkeiten aus Lieferungen und Leistungen', 'passiv', 'verbindlichkeiten'], ['1776', 'Umsatzsteuer 19 %', 'passiv', 'umsatzsteuer'], ['1771', 'Umsatzsteuer 7 %', 'passiv', 'umsatzsteuer7'],
  ['1800', 'Privatentnahmen', 'passiv', null], ['1890', 'Privateinlagen', 'passiv', null], ['0880', 'Eigenkapital', 'passiv', 'eigenkapital'],
  ['8400', 'Erlöse Vermittlung 19 % USt', 'ertrag', 'erloese'], ['2700', 'Sonstige Erträge (z. B. Mahngebühren)', 'ertrag', 'mahngebuehren'],
  ['4210', 'Miete', 'aufwand', null], ['4500', 'Fahrzeugkosten', 'aufwand', null], ['4600', 'Werbekosten', 'aufwand', null], ['4920', 'Telefon und Internet', 'aufwand', null],
  ['4930', 'Bürobedarf', 'aufwand', null], ['4964', 'Software und IT-Dienste', 'aufwand', null], ['4970', 'Nebenkosten des Geldverkehrs', 'aufwand', null],
  ['4950', 'Rechts- und Beratungskosten', 'aufwand', null], ['4900', 'Sonstige betriebliche Aufwendungen', 'aufwand', null],
  ['9000', 'Saldenvorträge (Eröffnung)', 'passiv', 'eroeffnung'],
  // Ergänzt für die Buchungsvorlagen (Reverse Charge, USt-Vorauszahlung, Versicherungen)
  ['1577', 'Abziehbare Vorsteuer § 13b UStG 19 %', 'aktiv', 'vorsteuer13b'], ['1787', 'Umsatzsteuer § 13b UStG 19 %', 'passiv', 'umsatzsteuer13b'],
  ['1780', 'Umsatzsteuer-Vorauszahlungen', 'passiv', 'ust_vorauszahlung'], ['4360', 'Versicherungen', 'aufwand', null],
  // Gesellschafter der KFL GbR: je ein Kapitalkonto (Einlage lt. Gesellschaftsvertrag) sowie Privateinlagen und -entnahmen
  ...FIBU_PARTNERS.flatMap((g) => [[g.capital, `Festkapital ${g.name}`, 'passiv', null], [g.deposit, `Privateinlagen ${g.name}`, 'passiv', null], [g.withdrawal, `Privatentnahmen ${g.name}`, 'passiv', null]])
];
const FIBU_DOC_KINDS = { eingangsrechnung: 'Eingangsrechnung', ausgangsrechnung: 'Ausgangsrechnung', kontoauszug: 'Kontoauszug', quittung: 'Quittung / Kassenbeleg', vertrag: 'Vertrag', abschluss: 'Abschluss', import: 'Import alte Buchführung', sonstiges: 'Sonstiger Beleg' };

/* ---------- Buchungsvorlagen ----------
   Belegart + Vorgang → Soll, Haben und USt werden in der Buchungsmaske automatisch gesetzt (bleiben änderbar).
   Konten: Systemrolle (sys) oder Kontonummer; '@aufwand' = Kostenart wählt der Nutzer (Aufwandskonto).
   mode 'rc'  = Reverse Charge (§ 13b UStG): Betrag ist netto, USt und Vorsteuer werden zusätzlich gebucht.
   redirect   = Vorgang läuft über eine andere Funktion (verhindert Doppelbuchungen). */
const FIBU_TEMPLATES = [
  { key: 'er_bank', kind: 'eingangsrechnung', label: 'Per Bank bezahlt (Überweisung, Lastschrift, Karte)', debit: '@aufwand', credit: 'bank', vat: 19, text: 'Eingangsrechnung', hint: 'Kosten (netto) und Vorsteuer an Bank (brutto).' },
  { key: 'er_kasse', kind: 'eingangsrechnung', label: 'Bar bezahlt', debit: '@aufwand', credit: 'kasse', vat: 19, text: 'Eingangsrechnung bar', hint: 'Kosten (netto) und Vorsteuer an Kasse (brutto).' },
  { key: 'er_rc', kind: 'eingangsrechnung', label: 'Aus dem Ausland ohne deutsche USt (Reverse Charge § 13b), per Bank bezahlt', debit: '@aufwand', credit: 'bank', vat: 19, mode: 'rc', text: 'Eingangsrechnung § 13b', hint: 'Z. B. Shopify, Google, Meta, Cloudflare. Betrag = Rechnungsbetrag ohne USt. Umsatzsteuer und Vorsteuer (§ 13b) werden zusätzlich gebucht und gleichen sich aus.' },
  { key: 'er_offen', kind: 'eingangsrechnung', label: 'Noch nicht bezahlt → als Eingangsrechnung erfassen', redirect: 'purchase', hint: 'Offene Rechnungen bitte unter Buchhaltung → Eingangsrechnungen erfassen. Dort werden sie automatisch gebucht und landen in der Zahlungsliste.' },
  { key: 'q_kasse', kind: 'quittung', label: 'Barausgabe mit Quittung / Kassenbon', debit: '@aufwand', credit: 'kasse', vat: 19, text: 'Barausgabe', hint: 'Kosten (netto) und Vorsteuer an Kasse. Bei Lebensmitteln, Büchern o. Ä. 7 % wählen.' },
  { key: 'q_bank', kind: 'quittung', label: 'Kartenzahlung mit Kassenbon', debit: '@aufwand', credit: 'bank', vat: 19, text: 'Kartenzahlung', hint: 'Kosten (netto) und Vorsteuer an Bank.' },
  { key: 'ka_rechnung', kind: 'kontoauszug', label: 'Zahlungseingang zu einer KFL-Rechnung → an der Rechnung erfassen', redirect: 'invoices', hint: 'Zahlungen zu Rechnungen aus dem Dashboard bitte an der Rechnung über „Zahlung erfassen“ buchen. Sonst bleibt die Rechnung offen und wird angemahnt.' },
  { key: 'ka_forderung', kind: 'kontoauszug', label: 'Zahlungseingang zu einer manuell gebuchten Ausgangsrechnung', debit: 'bank', credit: 'forderungen', vat: 0, text: 'Zahlungseingang', hint: 'Bank an Forderungen.' },
  ...FIBU_PARTNERS.map((g) => ({ key: 'um_kapital_' + g.key, kind: 'sonstiges', label: `Umbuchung: Privateinlage → Kapitaleinlage ${g.name}`, debit: '1890', credit: g.capital, vat: 0, text: `Umbuchung Kapitaleinlage ${g.name}`, hint: 'Korrektur: eine Einlage, die auf „1890 Privateinlagen“ gebucht wurde, auf das Kapitalkonto umbuchen. Im Buchungstext die ursprüngliche Buchungsnummer nennen.' })),
  { key: 'ka_gebuehr', kind: 'kontoauszug', label: 'Bankgebühren / Kontoführung', debit: '4970', credit: 'bank', vat: 0, text: 'Kontoführungsgebühren', hint: 'Bankgebühren sind umsatzsteuerfrei – keine Vorsteuer.' },
  ...FIBU_PARTNERS.map((g) => ({ key: 'ka_kapital_' + g.key, kind: 'kontoauszug', label: `Kapitaleinlage ${g.name} (lt. Gesellschaftsvertrag)`, debit: 'bank', credit: g.capital, vat: 0, text: `Kapitaleinlage ${g.name}`, hint: `Bank an Festkapital ${g.name}. Für die im Gesellschaftsvertrag vereinbarte Einlage – den Vertrag am besten als Beleg anhängen.` })),
  ...FIBU_PARTNERS.map((g) => ({ key: 'ka_einlage_' + g.key, kind: 'kontoauszug', label: `Privateinlage ${g.name} (zusätzliches Geld ins Geschäft)`, debit: 'bank', credit: g.deposit, vat: 0, text: `Privateinlage ${g.name}`, hint: 'Freiwillige Einzahlung über die vereinbarte Kapitaleinlage hinaus.' })),
  ...FIBU_PARTNERS.map((g) => ({ key: 'ka_entnahme_' + g.key, kind: 'kontoauszug', label: `Privatentnahme ${g.name}`, debit: g.withdrawal, credit: 'bank', vat: 0, text: `Privatentnahme ${g.name}` })),
  { key: 'ka_bareinzahlung', kind: 'kontoauszug', label: 'Bareinzahlung auf das Bankkonto', debit: 'bank', credit: 'kasse', vat: 0, text: 'Bareinzahlung' },
  { key: 'ka_barabhebung', kind: 'kontoauszug', label: 'Barabhebung vom Bankkonto in die Kasse', debit: 'kasse', credit: 'bank', vat: 0, text: 'Barabhebung' },
  { key: 'ka_ust', kind: 'kontoauszug', label: 'Umsatzsteuer-Vorauszahlung ans Finanzamt', debit: 'ust_vorauszahlung', credit: 'bank', vat: 0, text: 'USt-Vorauszahlung', hint: 'Im Buchungstext bitte den Zeitraum nennen, z. B. „USt-Vorauszahlung 10/2026“.' },
  { key: 'ka_lastschrift', kind: 'kontoauszug', label: 'Lastschrift / Abbuchung ohne eigene Rechnung', debit: '@aufwand', credit: 'bank', vat: 0, text: 'Abbuchung', hint: 'Nur Vorsteuer wählen, wenn auf dem Kontoauszug bzw. Beleg USt ausgewiesen ist.' },
  { key: 'ar_kfl', kind: 'ausgangsrechnung', label: 'Rechnung aus dem Dashboard → wird automatisch gebucht', redirect: 'invoices', hint: 'Rechnungen, die über die Buchhaltung des Dashboards erstellt werden, bucht das System selbst (Forderung an Erlöse + USt). Bitte nicht zusätzlich buchen.' },
  { key: 'ar_manuell', kind: 'ausgangsrechnung', label: 'Außerhalb des Dashboards erstellt (noch nicht bezahlt)', debit: 'forderungen', credit: 'erloese', vat: 19, text: 'Ausgangsrechnung', hint: 'Forderung (brutto) an Erlöse (netto) und Umsatzsteuer.' },
  { key: 'ar_bezahlt', kind: 'ausgangsrechnung', label: 'Außerhalb des Dashboards erstellt und sofort bezahlt', debit: 'bank', credit: 'erloese', vat: 19, text: 'Erlös', hint: 'Bank (brutto) an Erlöse (netto) und Umsatzsteuer.' },
  { key: 'v_miete', kind: 'vertrag', label: 'Miete per Bank', debit: '4210', credit: 'bank', vat: 0, text: 'Miete', hint: '19 % nur wählen, wenn im Mietvertrag Umsatzsteuer ausgewiesen ist.' },
  { key: 'v_versicherung', kind: 'vertrag', label: 'Versicherungsbeitrag per Bank', debit: '4360', credit: 'bank', vat: 0, text: 'Versicherungsbeitrag', hint: 'Versicherungsbeiträge enthalten keine Umsatzsteuer.' },
  { key: 'v_abo', kind: 'vertrag', label: 'Laufender Vertrag / Abo per Bank (Software, Telefon, Leasing …)', debit: '@aufwand', credit: 'bank', vat: 19, text: 'Vertrag', hint: 'Kostenart wählen. Bei ausländischen Anbietern ohne deutsche USt die Vorlage „Reverse Charge“ unter Eingangsrechnung nutzen.' }
];
const FIBU_TEMPLATE = Object.fromEntries(FIBU_TEMPLATES.map((t) => [t.key, t]));

// Faktoren der automatischen Angebotsauswahl
const SCORE_FACTORS = [
  { key: 'distance', label: 'Nähe des Geschäftspartners zum Kunden', hint: 'Je näher, desto besser (gemessen am gewählten Umkreis).' },
  { key: 'response', label: 'Antwortzeit des Geschäftspartners', hint: 'Zeit von der Anfrage bis zum Angebot – je schneller, desto besser.' },
  { key: 'equipment', label: 'Konfiguration / Ausstattung wie gewünscht', hint: 'Partner bestätigt: Ausstattung entspricht der Anfrage.' },
  { key: 'price', label: 'Monatliche Rate bzw. Kaufpreis', hint: 'Günstigstes Angebot = 100 % (beim Ankauf: höchster Preis).' },
  { key: 'model', label: 'Exaktes Modell wie angefragt', hint: '„Wie angefragt“ statt Alternative.' },
  { key: 'term', label: 'Exakte Vertragslaufzeit', hint: 'Laufzeit entspricht dem Kundenwunsch (nur Leasing/Finanzierung).' },
  { key: 'addons', label: 'Zusatzprodukte, wenn gewünscht', hint: 'Servicepaket und Versicherung, falls der Kunde sie angefragt hat.' }
];
const SCORING_KEYS = [...SCORE_FACTORS.map((f) => 'score_w_' + f.key), 'presented_count'];

// Einstellungen, die die Geschäftsführung ändern darf (sonst nur Admin)
const GF_SETTINGS = ['payment_terms_days', 'reminder_due_days', 'dunning_fee_1', 'dunning_fee_2', 'dunning_due_days', 'dunning_due_days_2', 'dunning_auto', 'dunning_days_1', 'dunning_days_2', 'dunning_days_3',
  'lead_price_deal', 'lead_price_sell', 'vat_rate', 'vat_enabled', 'invoice_intro', 'invoice_footer'];
// Buchhaltung darf die Mahngebühr einstellen (laut Vorgabe „Manuell in den Einstellungen bei der Buchhaltung“)
const ACC_SETTINGS = ['dunning_fee_1', 'dunning_fee_2'];

// Konditionen, die bei jedem Geschäftspartner einzeln hinterlegt werden (Startwert = Einstellung)
const ORG_TERMS = { payment_terms_days: 'payment_terms_days', reminder_due_days: 'reminder_due_days', dunning_fee_1: 'dunning_fee_1', dunning_fee_2: 'dunning_fee_2', dunning_due_days: 'dunning_due_days', dunning_due_days_2: 'dunning_due_days_2' };

const WEEKDAYS = ['mo', 'di', 'mi', 'do', 'fr', 'sa', 'so'];
const WEEKDAY_LABELS = { mo: 'Montag', di: 'Dienstag', mi: 'Mittwoch', do: 'Donnerstag', fr: 'Freitag', sa: 'Samstag', so: 'Sonntag' };
const DEFAULT_OPENING = { mo: ['08:00', '18:00'], di: ['08:00', '18:00'], mi: ['08:00', '18:00'], do: ['08:00', '18:00'], fr: ['08:00', '18:00'], sa: null, so: null };

const BRANDS_TOP = ['Audi', 'BMW', 'Mercedes-Benz', 'Volkswagen', 'Skoda', 'Seat', 'Cupra', 'Opel', 'Ford', 'Hyundai', 'Kia', 'Toyota', 'Tesla', 'Porsche', 'Renault', 'Peugeot', 'Fiat', 'Volvo', 'Mazda', 'Nissan', 'Mini', 'Dacia', 'Citroen', 'Land Rover', 'Jaguar', 'Jeep', 'Alfa Romeo', 'BYD', 'MG', 'Polestar', 'Smart', 'Suzuki', 'Mitsubishi', 'Honda', 'Lexus', 'DS Automobiles', 'Lynk&Co', 'Subaru', 'Maserati', 'Ferrari', 'Lamborghini', 'Bentley', 'Rolls-Royce', 'Aston Martin', 'McLaren'];
