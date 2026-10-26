import { connect as SMTP_CONNECT } from 'cloudflare:sockets';
/* KFL Plattform 2.0 \u2013 automatisch gebaut aus src/ und ui/ (node build.mjs). Nicht direkt bearbeiten. */

/* ===== 00-config.js ===== */
/* ============================================================
   KFL Plattform 2.0 \u2013 zentrale Konfiguration
   Rollen, Rechte, Status, Standard-Einstellungen
   ============================================================ */

const APP_VERSION = '2.0.0';
const NUMBER_OFFSET = 1000; // Anfrage #1001 = id 1

/* ---------- Interne Rollen (KFL GbR) ---------- */
// rank: h\u00f6here Zahl = \u00fcbergeordnet (f\u00fcr Vertretungen und Nutzerverwaltung)
const STAFF_ROLES = {
  admin:       { label: 'Admin',           rank: 100 },
  gf:          { label: 'Gesch\u00e4ftsf\u00fchrung', rank: 80 },
  teamleitung: { label: 'Teamleitung',     rank: 60 },
  vertrieb:    { label: 'Vertrieb',        rank: 40 },
  buchhaltung: { label: 'Buchhaltung',     rank: 40 }
};

const PERMISSIONS = [
  // Anfragen
  { key: 'req_view',          group: 'Anfragen', label: 'Anfragen sehen' },
  { key: 'req_edit',          group: 'Anfragen', label: 'Anfragen bearbeiten (Status, Notizen, \u00dcbernahme)' },
  { key: 'req_contact',       group: 'Anfragen', label: 'Kontaktdaten der Kunden sehen' },
  { key: 'req_message',       group: 'Anfragen', label: 'Nachrichten an Kunden und Partner senden' },
  { key: 'req_partner',       group: 'Anfragen', label: 'Partner manuell zuordnen, erneut senden, anmahnen' },
  { key: 'req_assign',        group: 'Anfragen', label: 'Anfragen internen Mitarbeitern zuweisen' },
  { key: 'req_spam_report',   group: 'Anfragen', label: 'Anfragen als Spam melden' },
  { key: 'req_spam_confirm',  group: 'Anfragen', label: 'Spam-Meldungen pr\u00fcfen und best\u00e4tigen' },
  { key: 'req_status_force',  group: 'Anfragen', label: 'Status manuell setzen (Gewonnen, Verloren \u2026)' },
  { key: 'req_delete',        group: 'Anfragen', label: 'Anfragen l\u00f6schen' },
  // Buchhaltung
  { key: 'acc_view',          group: 'Buchhaltung', label: 'Buchhaltung sehen' },
  { key: 'acc_manage',        group: 'Buchhaltung', label: 'Rechnungen, Mahnungen, Zahlungen, Lieferanten verwalten' },
  { key: 'acc_cancel',        group: 'Buchhaltung', label: 'Abrechnungsf\u00e4lle und Rechnungen stornieren' },
  { key: 'fibu_view',         group: 'Finanzbuchhaltung', label: 'Finanzbuchhaltung sehen (Konten, Buchungen, Belegarchiv, Abschl\u00fcsse)' },
  { key: 'fibu_book',         group: 'Finanzbuchhaltung', label: 'Konten anlegen, buchen, Eingangsrechnungen erfassen, Belege hochladen' },
  { key: 'fibu_manage',       group: 'Finanzbuchhaltung', label: 'Konten schlie\u00dfen, Anfangsbest\u00e4nde, Import alter Buchf\u00fchrung, Abschl\u00fcsse erstellen' },
  { key: 'acc_settings',      group: 'Buchhaltung', label: 'Zahlungsziel, Mahngeb\u00fchren, Zahlungsbedingungen festlegen' },
  { key: 'acc_release',       group: 'Buchhaltung', label: 'Zahlungsliste freigeben (Bank-Export)' },
  // Gesch\u00e4ftspartner
  { key: 'partner_view',      group: 'Gesch\u00e4ftspartner', label: 'Gesch\u00e4ftspartner sehen' },
  { key: 'partner_manage',    group: 'Gesch\u00e4ftspartner', label: 'Gesch\u00e4ftspartner anlegen und bearbeiten' },
  { key: 'partner_terms',     group: 'Gesch\u00e4ftspartner', label: 'Konditionen je Partner (Zahlungsziel, Geb\u00fchren, Abrechnungsart)' },
  { key: 'partner_stats',     group: 'Gesch\u00e4ftspartner', label: 'Partner-Statistik sehen' },
  { key: 'partner_pw',        group: 'Gesch\u00e4ftspartner', label: 'Partner-Passw\u00f6rter zur\u00fccksetzen' },
  { key: 'partner_delete',    group: 'Gesch\u00e4ftspartner', label: 'Organisationen und Partnerkonten l\u00f6schen' },
  // Statistik
  { key: 'stats_view',        group: 'Statistik', label: 'Statistik sehen' },
  { key: 'stats_shop',        group: 'Statistik', label: 'Webshop-Statistik (Shopify) sehen' },
  { key: 'team_stats',        group: 'Statistik', label: 'Team-Auswertung (Performance der Mitarbeiter)' },
  // Support
  { key: 'support_view',      group: 'Support', label: 'Support-Anfragen sehen' },
  { key: 'support_manage',    group: 'Support', label: 'Support-Anfragen bearbeiten und beantworten' },
  { key: 'support_changes',   group: 'Support', label: '\u00c4nderungsantr\u00e4ge von Partnern best\u00e4tigen' },
  { key: 'support_syslist',   group: 'Support', label: 'System-Fehlerliste' },
  // System
  { key: 'backup_view',       group: 'System', label: 'Backup' },
  { key: 'audit_view',        group: 'System', label: 'Protokoll' },
  { key: 'settings_all',      group: 'System', label: 'Alle Einstellungen' },
  { key: 'links_view',        group: 'System', label: 'Links (Dashboard, Partner, Shopify) sehen' },
  // Mitarbeiter
  { key: 'users_view',        group: 'Mitarbeiter', label: 'Mitarbeiter sehen' },
  { key: 'users_create_vt',   group: 'Mitarbeiter', label: 'Mitarbeiter mit Rolle Vertrieb anlegen' },
  { key: 'users_create',      group: 'Mitarbeiter', label: 'Mitarbeiter anlegen (au\u00dfer Admin und Gesch\u00e4ftsf\u00fchrung)' },
  { key: 'users_admin',       group: 'Mitarbeiter', label: 'Alle Mitarbeiterkonten verwalten, sperren, Passw\u00f6rter zur\u00fccksetzen' },
  { key: 'users_perms',       group: 'Mitarbeiter', label: 'Rollen und Sonderrechte festlegen' },
  // News
  { key: 'news_publish',      group: 'News', label: 'Mitteilungen an Mitarbeiter ver\u00f6ffentlichen' },
  { key: 'news_partner',      group: 'News', label: 'Nachrichten an Gesch\u00e4ftspartner senden' }
];
const PERM_KEYS = PERMISSIONS.map((p) => p.key);

const ROLE_PERMS = (() => {
  const vertrieb = ['req_view', 'req_edit', 'req_contact', 'req_message', 'req_spam_report', 'support_view', 'support_manage', 'partner_view'];
  const teamleitung = [...vertrieb, 'req_partner', 'req_assign', 'req_spam_confirm', 'req_status_force', 'team_stats', 'users_view', 'users_create_vt'];
  const buchhaltung = ['acc_view', 'acc_manage', 'acc_cancel', 'fibu_view', 'fibu_book', 'partner_view'];
  const gf = [...new Set([...teamleitung, ...buchhaltung, 'fibu_manage', 'acc_settings', 'acc_release', 'partner_manage', 'partner_terms', 'partner_stats',
    'stats_view', 'stats_shop', 'support_changes', 'links_view', 'users_create', 'news_publish', 'news_partner'])];
  return { admin: PERM_KEYS.slice(), gf, teamleitung, vertrieb, buchhaltung };
})();

/* ---------- Partner-Rollen ---------- */
const PARTNER_ROLES = {
  gf: { label: 'Gesch\u00e4ftsf\u00fchrer', rank: 3 },
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
  widerruf:    { tag: 'Webseite', category: 'Widerruf (\u00a7 356a BGB)', priority: 'hoch' },
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
  { key: 'stoerung',               label: 'St\u00f6rung',                  tone: 'err' },
  { key: 'spam',                   label: 'Spam (deaktiviert)',       tone: 'muted' }
];
const OPEN_STATUSES = ['eingang', 'in_bearbeitung', 'versendet', 'angebot_liegt_vor', 'angebot_in_bearbeitung', 'angebot_beim_kunden', 'angebot_akzeptiert', 'fehler', 'stoerung'];
const CUSTOMER_EDITABLE = ['eingang', 'in_bearbeitung', 'versendet'];

/* ---------- Status beim Partner (Zuordnung) ---------- */
const ASSIGN_STATUSES = [
  { key: 'neu',            label: 'Neu',                            tone: 'info' },
  { key: 'in_bearbeitung', label: 'In Bearbeitung',                 tone: 'accent' },
  { key: 'versendet',      label: 'Versendet \u2013 wartet auf R\u00fcckmeldung', tone: 'info' },
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
  { key: 'wartet', label: 'Wartet auf R\u00fcckmeldung' }, { key: 'erledigt', label: 'Erledigt' }
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
  partner:  { label: 'Anfragetool an Gesch\u00e4ftspartner', setting: 'mail_from_partner' },
  support:  { label: 'Support an Partner und Kunden', setting: 'mail_from_support' },
  customer: { label: 'Nachrichten zu Anfragen an Kunden', setting: 'mail_from_customer' },
  internal: { label: 'Interne Benachrichtigungen an KFL', setting: 'mail_from_system' }
};

/* ---------- Standard-Einstellungen (alle im Admin \u00e4nderbar) ---------- */
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
  mail_sender_name: 'KFL \u2013 Kaufen Finanzieren Leasen',
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
  // Gewichtung der Angebotsauswahl (Summe 100 %) \u2013 nur Admin mit Freigabepasswort
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
  // Buchhaltung
  lead_price_deal: 0,
  lead_price_sell: 0,
  vat_rate: 19,
  vat_enabled: true,
  payment_terms_days: 14,
  dunning_auto: false,
  // Versand der n\u00e4chsten Stufe: Tage nach Ablauf der vorherigen Frist (Zahlungsziel bzw. Frist im letzten Schreiben)
  dunning_days_1: 1,
  dunning_days_2: 1,
  dunning_days_3: 1,
  reminder_due_days: 5,      // neue Frist in der kostenlosen Zahlungserinnerung
  dunning_fee_1: 4.9,        // Mahngeb\u00fchr 1. Mahnung (Stufe 1)
  dunning_fee_2: 79.8,       // Mahngeb\u00fchr 2. Mahnung (Stufe 2)
  dunning_due_days: 10,      // Frist in der 1. Mahnung
  dunning_due_days_2: 7,     // Frist in der 2. (letzten) Mahnung
  invoice_prefix: 'RE',
  invoice_next: 1,
  invoice_intro: 'Wir berechnen Ihnen f\u00fcr die erfolgreiche Vermittlung folgende Leistungen:',
  invoice_footer: 'Bitte \u00fcberweisen Sie den Rechnungsbetrag unter Angabe der Rechnungsnummer innerhalb des Zahlungsziels.',
  monthly_run_day: 'last',
  monthly_run_hour: 23,
  day_close_time: '18:00',
  // Support
  support_escalate_hours: 24,
  support_archive_days: 10,
  syslist_retention_days: 365,
  support_ack_subject: 'Wir haben deine Anfrage erhalten',
  support_ack_text: 'vielen Dank f\u00fcr deine Nachricht an den Support der KFL GbR. Deine Anfrage ist bei uns eingegangen und wir k\u00fcmmern uns schnellstm\u00f6glich darum. Du bekommst unsere Antwort per E-Mail und \u2013 falls du ein Konto bei uns hast \u2013 zus\u00e4tzlich in deinem Dashboard.',
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
// Kontenrahmen (angelehnt an SKR03, vereinfacht). sys = feste Rolle f\u00fcr automatische Buchungen.
const FIBU_TYPES = { aktiv: 'Aktivkonto (Verm\u00f6gen)', passiv: 'Passivkonto (Kapital/Schulden)', aufwand: 'Aufwandskonto', ertrag: 'Ertragskonto' };
const FIBU_DEFAULT_ACCOUNTS = [
  ['1000', 'Kasse', 'aktiv', 'kasse'], ['1200', 'Bank', 'aktiv', 'bank'], ['1400', 'Forderungen aus Lieferungen und Leistungen', 'aktiv', 'forderungen'],
  ['1576', 'Abziehbare Vorsteuer 19 %', 'aktiv', 'vorsteuer'], ['1571', 'Abziehbare Vorsteuer 7 %', 'aktiv', 'vorsteuer7'],
  ['1600', 'Verbindlichkeiten aus Lieferungen und Leistungen', 'passiv', 'verbindlichkeiten'], ['1776', 'Umsatzsteuer 19 %', 'passiv', 'umsatzsteuer'], ['1771', 'Umsatzsteuer 7 %', 'passiv', 'umsatzsteuer7'],
  ['1800', 'Privatentnahmen', 'passiv', null], ['1890', 'Privateinlagen', 'passiv', null], ['0880', 'Eigenkapital', 'passiv', 'eigenkapital'],
  ['8400', 'Erl\u00f6se Vermittlung 19 % USt', 'ertrag', 'erloese'], ['2700', 'Sonstige Ertr\u00e4ge (z. B. Mahngeb\u00fchren)', 'ertrag', 'mahngebuehren'],
  ['4210', 'Miete', 'aufwand', null], ['4500', 'Fahrzeugkosten', 'aufwand', null], ['4600', 'Werbekosten', 'aufwand', null], ['4920', 'Telefon und Internet', 'aufwand', null],
  ['4930', 'B\u00fcrobedarf', 'aufwand', null], ['4964', 'Software und IT-Dienste', 'aufwand', null], ['4970', 'Nebenkosten des Geldverkehrs', 'aufwand', null],
  ['4950', 'Rechts- und Beratungskosten', 'aufwand', null], ['4900', 'Sonstige betriebliche Aufwendungen', 'aufwand', null],
  ['9000', 'Saldenvortr\u00e4ge (Er\u00f6ffnung)', 'passiv', 'eroeffnung']
];
const FIBU_DOC_KINDS = { eingangsrechnung: 'Eingangsrechnung', ausgangsrechnung: 'Ausgangsrechnung', kontoauszug: 'Kontoauszug', quittung: 'Quittung / Kassenbeleg', vertrag: 'Vertrag', abschluss: 'Abschluss', import: 'Import alte Buchf\u00fchrung', sonstiges: 'Sonstiger Beleg' };

// Faktoren der automatischen Angebotsauswahl
const SCORE_FACTORS = [
  { key: 'distance', label: 'N\u00e4he des Gesch\u00e4ftspartners zum Kunden', hint: 'Je n\u00e4her, desto besser (gemessen am gew\u00e4hlten Umkreis).' },
  { key: 'response', label: 'Antwortzeit des Gesch\u00e4ftspartners', hint: 'Zeit von der Anfrage bis zum Angebot \u2013 je schneller, desto besser.' },
  { key: 'equipment', label: 'Konfiguration / Ausstattung wie gew\u00fcnscht', hint: 'Partner best\u00e4tigt: Ausstattung entspricht der Anfrage.' },
  { key: 'price', label: 'Monatliche Rate bzw. Kaufpreis', hint: 'G\u00fcnstigstes Angebot = 100 % (beim Ankauf: h\u00f6chster Preis).' },
  { key: 'model', label: 'Exaktes Modell wie angefragt', hint: '\u201eWie angefragt\u201c statt Alternative.' },
  { key: 'term', label: 'Exakte Vertragslaufzeit', hint: 'Laufzeit entspricht dem Kundenwunsch (nur Leasing/Finanzierung).' },
  { key: 'addons', label: 'Zusatzprodukte, wenn gew\u00fcnscht', hint: 'Servicepaket und Versicherung, falls der Kunde sie angefragt hat.' }
];
const SCORING_KEYS = [...SCORE_FACTORS.map((f) => 'score_w_' + f.key), 'presented_count'];

// Einstellungen, die die Gesch\u00e4ftsf\u00fchrung \u00e4ndern darf (sonst nur Admin)
const GF_SETTINGS = ['payment_terms_days', 'reminder_due_days', 'dunning_fee_1', 'dunning_fee_2', 'dunning_due_days', 'dunning_due_days_2', 'dunning_auto', 'dunning_days_1', 'dunning_days_2', 'dunning_days_3',
  'lead_price_deal', 'lead_price_sell', 'vat_rate', 'vat_enabled', 'invoice_intro', 'invoice_footer'];
// Buchhaltung darf die Mahngeb\u00fchr einstellen (laut Vorgabe \u201eManuell in den Einstellungen bei der Buchhaltung\u201c)
const ACC_SETTINGS = ['dunning_fee_1', 'dunning_fee_2'];

// Konditionen, die bei jedem Gesch\u00e4ftspartner einzeln hinterlegt werden (Startwert = Einstellung)
const ORG_TERMS = { payment_terms_days: 'payment_terms_days', reminder_due_days: 'reminder_due_days', dunning_fee_1: 'dunning_fee_1', dunning_fee_2: 'dunning_fee_2', dunning_due_days: 'dunning_due_days', dunning_due_days_2: 'dunning_due_days_2' };

const WEEKDAYS = ['mo', 'di', 'mi', 'do', 'fr', 'sa', 'so'];
const WEEKDAY_LABELS = { mo: 'Montag', di: 'Dienstag', mi: 'Mittwoch', do: 'Donnerstag', fr: 'Freitag', sa: 'Samstag', so: 'Sonntag' };
const DEFAULT_OPENING = { mo: ['08:00', '18:00'], di: ['08:00', '18:00'], mi: ['08:00', '18:00'], do: ['08:00', '18:00'], fr: ['08:00', '18:00'], sa: null, so: null };

const BRANDS_TOP = ['Audi', 'BMW', 'Mercedes-Benz', 'Volkswagen', 'Skoda', 'Seat', 'Cupra', 'Opel', 'Ford', 'Hyundai', 'Kia', 'Toyota', 'Tesla', 'Porsche', 'Renault', 'Peugeot', 'Fiat', 'Volvo', 'Mazda', 'Nissan', 'Mini', 'Dacia', 'Citroen', 'Land Rover', 'Jaguar', 'Jeep', 'Alfa Romeo', 'BYD', 'MG', 'Polestar', 'Smart', 'Suzuki', 'Mitsubishi', 'Honda', 'Lexus', 'DS Automobiles', 'Lynk&Co', 'Subaru', 'Maserati', 'Ferrari', 'Lamborghini', 'Bentley', 'Rolls-Royce', 'Aston Martin', 'McLaren'];


/* ===== 01-util.js ===== */
/* ============================================================
   Hilfsfunktionen: Zeit (Europe/Berlin), Gesch\u00e4ftszeit, Texte
   ============================================================ */

// Uhr \u2013 in Tests \u00fcber globalThis.__KFL_NOW steuerbar
const nowMs = () => (typeof globalThis.__KFL_NOW === 'number' ? globalThis.__KFL_NOW : Date.now());
const nowIso = () => new Date(nowMs()).toISOString();
const isoOf = (ms) => new Date(ms).toISOString();
const msOf = (iso) => (iso ? Date.parse(iso) : NaN);

const TZ = 'Europe/Berlin';
const _dtf = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short' });
const WD_MAP = { Mon: 'mo', Tue: 'di', Wed: 'mi', Thu: 'do', Fri: 'fr', Sat: 'sa', Sun: 'so' };

// Datumsteile in Berliner Zeit
function berlinParts(ms) {
  const o = {};
  for (const p of _dtf.formatToParts(new Date(ms))) o[p.type] = p.value;
  return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour, mi: +o.minute, s: +o.second, wd: WD_MAP[o.weekday] };
}
function tzOffsetMs(ms) {
  const p = berlinParts(ms);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(ms / 1000) * 1000;
}
// Berliner Ortszeit \u2192 UTC-Millisekunden (Tag/Monat d\u00fcrfen \u00fcberlaufen)
function berlinToUtc(y, m, d, h = 0, mi = 0) {
  const guess = Date.UTC(y, m - 1, d, h, mi);
  let t = guess - tzOffsetMs(guess);
  const off2 = tzOffsetMs(t);
  t = guess - off2;
  return t;
}
const berlinDate = (ms) => { const p = berlinParts(ms); return `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`; };
const berlinTime = (ms) => { const p = berlinParts(ms); return `${String(p.h).padStart(2, '0')}:${String(p.mi).padStart(2, '0')}`; };
function fmtDE(ms, withTime = true) {
  if (!ms && ms !== 0) return '';
  if (typeof ms === 'string') ms = msOf(ms);
  if (isNaN(ms)) return '';
  const p = berlinParts(ms);
  const d = `${String(p.d).padStart(2, '0')}.${String(p.m).padStart(2, '0')}.${p.y}`;
  return withTime ? `${d}, ${String(p.h).padStart(2, '0')}:${String(p.mi).padStart(2, '0')} Uhr` : d;
}
const fmtDateDE = (iso) => fmtDE(iso, false);
// ISO-Kalenderwoche
function isoWeek(ms) {
  const p = berlinParts(ms);
  const d = new Date(Date.UTC(p.y, p.m - 1, p.d));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return { week: Math.ceil(((d - y0) / 86400000 + 1) / 7), year: d.getUTCFullYear() };
}
function lastDayOfMonth(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
function addDaysIso(iso, days) { const t = new Date(msOf(iso)); t.setUTCDate(t.getUTCDate() + days); return t.toISOString(); }
function addDaysDate(dateStr, days) { const t = new Date(dateStr + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + days); return t.toISOString().slice(0, 10); }

/* ---------- Gesch\u00e4ftszeit ----------
   Gez\u00e4hlt werden nur ganze Kalendertage Montag bis Freitag (0:00\u201324:00 Berliner Zeit),
   Samstag nur, wenn der Partner samstags ge\u00f6ffnet hat. Sonntag z\u00e4hlt nie. */
function countsDay(wd, opts) { if (wd === 'so') return false; if (wd === 'sa') return !!(opts && opts.saturday); return true; }
function addBusinessHours(startMs, hours, opts = {}) {
  let remaining = Math.max(0, hours) * 3600 * 1000;
  let t = startMs;
  for (let guard = 0; guard < 400; guard++) {
    const p = berlinParts(t);
    const next = berlinToUtc(p.y, p.m, p.d + 1, 0, 0);
    if (!countsDay(p.wd, opts)) { t = next; continue; }
    const avail = next - t;
    if (avail >= remaining) return t + remaining;
    remaining -= avail; t = next;
  }
  return t;
}
// verbleibende Gesch\u00e4ftszeit in ms bis zu einem Zeitpunkt
function businessMsBetween(fromMs, toMs, opts = {}) {
  if (toMs <= fromMs) return 0;
  let t = fromMs, sum = 0;
  for (let guard = 0; guard < 400 && t < toMs; guard++) {
    const p = berlinParts(t);
    const next = Math.min(berlinToUtc(p.y, p.m, p.d + 1, 0, 0), toMs);
    if (countsDay(p.wd, opts)) sum += next - t;
    t = next;
  }
  return sum;
}
const saturdayOpen = (opening) => { try { const o = typeof opening === 'string' ? JSON.parse(opening) : opening; return !!(o && o.sa && o.sa[0]); } catch (e) { return false; } };

/* ---------- Texte / Werte ---------- */
const str = (v, max = 200) => String(v ?? '').trim().slice(0, max);
const clean = (v) => String(v ?? '').trim().slice(0, 4000);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || ''));
const plzOk = (p) => /^[0-9]{5}$/.test(String(p || '').trim());
const toInt = (v, d = 0) => { const n = parseInt(v, 10); return isNaN(n) ? d : n; };
const toNum = (v, d = null) => {
  if (v === null || v === undefined || v === '') return d;
  if (typeof v === 'number') return isFinite(v) ? v : d;
  let s = String(v).trim().replace(/[\u20ac\s]/g, '');
  if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.'); else s = s.replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const n = parseFloat(s);
  return isFinite(n) ? n : d;
};
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const money = (n) => (Number(n) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' \u20ac';
const jparse = (s, d = null) => { if (s === null || s === undefined || s === '') return d; if (typeof s !== 'string') return s; try { return JSON.parse(s); } catch (e) { return d; } };
const toNumber = (id) => id + NUMBER_OFFSET;
const fromNumber = (n) => parseInt(String(n).replace(/[^0-9]/g, ''), 10) - NUMBER_OFFSET;
const pick = (o, keys) => Object.fromEntries(keys.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]));
const uniq = (a) => [...new Set(a)];
const statusLabel = (list, k) => (list.find((s) => s.key === k) || {}).label || k;
const normBrand = (b) => String(b || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');

/* ---------- HTTP ---------- */
const SEC_HEADERS = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow' };
function out(obj, status = 200, extra = {}) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...SEC_HEADERS, ...extra } });
}
const fail = (status, error, extra) => out({ ok: false, error, ...(extra || {}) }, status);
async function readJson(request, maxBytes = 2_000_000) {
  const len = parseInt(request.headers.get('Content-Length') || '0', 10);
  if (len > maxBytes) throw new HttpError(413, 'Die Daten sind zu gro\u00df.');
  try { const b = await request.json(); return b && typeof b === 'object' ? b : {}; } catch (e) { return {}; }
}
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const need = (cond, status, msg) => { if (!cond) throw new HttpError(status, msg); };
const clientIp = (request) => request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || '';


/* ===== 02-crypto.js ===== */
/* ============================================================
   Kryptografie: Hashes, HMAC, Passw\u00f6rter (PBKDF2), AES-GCM
   ============================================================ */

const enc = new TextEncoder();
const dec = new TextDecoder();
const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const fromHex = (hex) => new Uint8Array((hex.match(/.{1,2}/g) || []).map((h) => parseInt(h, 16)));
const randomHex = (bytes = 32) => toHex(crypto.getRandomValues(new Uint8Array(bytes)));
const b64 = (u8) => { let s = ''; const a = u8 instanceof Uint8Array ? u8 : new Uint8Array(u8); for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = (s) => { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };

async function sha256Hex(text) { return toHex(await crypto.subtle.digest('SHA-256', typeof text === 'string' ? enc.encode(text) : text)); }
async function hmacHex(secret, msg) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toHex(await crypto.subtle.sign('HMAC', key, enc.encode(msg)));
}
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0;
}

const PBKDF2_ITERATIONS = 100000;
async function hashPassword(password, saltHex) {
  const salt = saltHex || randomHex(16);
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: PBKDF2_ITERATIONS }, key, 256);
  return { hash: toHex(bits), salt };
}
async function verifyPassword(password, hash, salt) {
  if (!hash || !salt) return false;
  const h = await hashPassword(String(password || ''), salt);
  return safeEqual(h.hash, hash);
}
function passwordProblem(pw) {
  if (typeof pw !== 'string' || pw.length < 10) return 'Das Passwort muss mindestens 10 Zeichen lang sein.';
  if (pw.length > 200) return 'Das Passwort ist zu lang.';
  if (!/[A-Za-z\u00c4\u00d6\u00dc\u00e4\u00f6\u00fc\u00df]/.test(pw) || !/[0-9]/.test(pw)) return 'Bitte verwende Buchstaben und mindestens eine Ziffer.';
  return null;
}

// AES-GCM mit Schl\u00fcssel aus Passwort (f\u00fcr Backups und gesch\u00fctzte Einstellungen)
async function aesKeyFromPassword(password, saltU8) {
  const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: saltU8, iterations: 150000 }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function encryptBytes(password, bytes) {
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await aesKeyFromPassword(password, salt);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes));
  return { salt: b64(salt), iv: b64(iv), data: b64(ct), alg: 'AES-256-GCM/PBKDF2-SHA256-150000' };
}
async function decryptBytes(password, box) {
  const key = await aesKeyFromPassword(password, unb64(box.salt));
  return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(box.iv) }, key, unb64(box.data)));
}
// Geheimnisse in den Einstellungen mit dem Server-Schl\u00fcssel verschl\u00fcsseln
async function sealSecret(env, text) { return JSON.stringify(await encryptBytes(serverKey(env), enc.encode(String(text)))); }
async function openSecret(env, sealed) { if (!sealed) return ''; try { return dec.decode(await decryptBytes(serverKey(env), JSON.parse(sealed))); } catch (e) { return ''; } }
const serverKey = (env) => String(env.APP_SECRET || env.FORM_SECRET || 'kfl-dev-only');

async function gzip(bytes) {
  if (typeof CompressionStream === 'undefined') return bytes;
  const cs = new CompressionStream('gzip');
  const out = new Response(new Blob([bytes]).stream().pipeThrough(cs));
  return new Uint8Array(await out.arrayBuffer());
}
async function gunzip(bytes) {
  const ds = new DecompressionStream('gzip');
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(ds)).arrayBuffer());
}


/* ===== 03-db.js ===== */
/* ============================================================
   Datenbank (Cloudflare D1 / SQLite): Schema, Migration, Helfer
   Tabellen werden beim ersten Aufruf automatisch angelegt bzw. erweitert.
   Bestehende Daten des alten Dashboards bleiben erhalten.
   ============================================================ */

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'eingang', priority TEXT NOT NULL DEFAULT 'normal',
    assignee_id INTEGER, customer_name TEXT, email TEXT, phone TEXT, brand TEXT, model TEXT, vehicle TEXT, summary TEXT,
    customer_account TEXT, page TEXT, data TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY AUTOINCREMENT, request_id INTEGER NOT NULL, user_id INTEGER, text TEXT NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, request_id INTEGER, user_id INTEGER, action TEXT NOT NULL, detail TEXT, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS roles (key TEXT PRIMARY KEY, name TEXT NOT NULL, perms TEXT NOT NULL, builtin INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, role_key TEXT NOT NULL,
    pass_hash TEXT, pass_salt TEXT, active INTEGER NOT NULL DEFAULT 1, invite_hash TEXT, invite_expires TEXT,
    failed_logins INTEGER NOT NULL DEFAULT 0, locked_until TEXT, created_at TEXT NOT NULL, last_login TEXT)`,
  `CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL)`,

  `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT, updated_at TEXT, updated_by TEXT)`,
  `CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, actor_type TEXT, actor_id INTEGER, actor_name TEXT,
    action TEXT NOT NULL, entity TEXT, entity_id TEXT, detail TEXT, ip TEXT)`,

  // Gesch\u00e4ftspartner
  `CREATE TABLE IF NOT EXISTS orgs (id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL DEFAULT 'organisation', name TEXT NOT NULL,
    street TEXT, zip TEXT, city TEXT, country TEXT DEFAULT 'Deutschland', lat REAL, lon REAL, phone TEXT, email TEXT, website TEXT,
    billing_name TEXT, billing_street TEXT, billing_zip TEXT, billing_city TEXT, billing_email TEXT, vat_id TEXT, tax_no TEXT,
    brands TEXT NOT NULL DEFAULT '[]', accepts TEXT NOT NULL DEFAULT '["deal","sell"]', max_radius_km INTEGER,
    billing_mode TEXT NOT NULL DEFAULT 'einzel', payment_terms_days INTEGER, dunning_fee REAL, lead_price REAL,
    opening TEXT, contacts TEXT NOT NULL DEFAULT '[]', training_done INTEGER NOT NULL DEFAULT 0, training_at TEXT,
    active INTEGER NOT NULL DEFAULT 1, deleted INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS org_notes (id INTEGER PRIMARY KEY AUTOINCREMENT, org_id INTEGER NOT NULL, user_id INTEGER, text TEXT NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS partner_users (id INTEGER PRIMARY KEY AUTOINCREMENT, org_id INTEGER NOT NULL, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'vt', phone TEXT, pass_hash TEXT, pass_salt TEXT, must_change_pw INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1, invite_hash TEXT, invite_expires TEXT, failed_logins INTEGER NOT NULL DEFAULT 0, locked_until TEXT,
    agb_at TEXT, privacy_at TEXT, last_login TEXT, prev_login TEXT, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS partner_sessions (token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS partner_notes (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, day TEXT, text TEXT NOT NULL, created_at TEXT NOT NULL)`,

  // Zuordnung Anfrage \u2194 Partner und Angebote
  `CREATE TABLE IF NOT EXISTS assignments (id INTEGER PRIMARY KEY AUTOINCREMENT, request_id INTEGER NOT NULL, org_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'neu', source TEXT NOT NULL DEFAULT 'auto', target_user_id INTEGER, distance_km REAL,
    taken_by INTEGER, taken_at TEXT, lock_until TEXT, deadline_at TEXT, sent_at TEXT, offer_id INTEGER, mailed_at TEXT,
    reminded_at TEXT, reminders INTEGER NOT NULL DEFAULT 0, closed_reason TEXT, won_at TEXT, contact_due_at TEXT, contact_at TEXT,
    seen_at TEXT, archived INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(request_id, org_id))`,
  `CREATE TABLE IF NOT EXISTS offers (id INTEGER PRIMARY KEY AUTOINCREMENT, request_id INTEGER NOT NULL, assignment_id INTEGER NOT NULL, org_id INTEGER NOT NULL,
    user_id INTEGER, kind TEXT, data TEXT NOT NULL, compare_value REAL, score REAL, rank INTEGER,
    status TEXT NOT NULL DEFAULT 'eingereicht', pdf_file_id INTEGER, expose_file_id INTEGER, public_file_id INTEGER, public_expose_id INTEGER,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS partner_events (id INTEGER PRIMARY KEY AUTOINCREMENT, assignment_id INTEGER, request_id INTEGER, org_id INTEGER,
    actor_type TEXT, actor_id INTEGER, actor_name TEXT, action TEXT NOT NULL, text TEXT, confidential INTEGER NOT NULL DEFAULT 0,
    visible_partner INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL)`,

  // Dateien (R2 oder Datenbank)
  `CREATE TABLE IF NOT EXISTS files (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, mime TEXT, size INTEGER, storage TEXT, key TEXT,
    owner_type TEXT, owner_id INTEGER, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS file_chunks (file_id INTEGER NOT NULL, idx INTEGER NOT NULL, data TEXT NOT NULL, PRIMARY KEY (file_id, idx))`,

  // News, Benachrichtigungen, Chat
  `CREATE TABLE IF NOT EXISTS news_posts (id INTEGER PRIMARY KEY AUTOINCREMENT, author_id INTEGER, author_name TEXT, scope TEXT NOT NULL DEFAULT 'staff',
    audience TEXT NOT NULL DEFAULT '{}', title TEXT NOT NULL, body TEXT, important INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS news_reads (post_id INTEGER NOT NULL, reader_type TEXT NOT NULL, reader_id INTEGER NOT NULL, read_at TEXT NOT NULL, PRIMARY KEY (post_id, reader_type, reader_id))`,
  `CREATE TABLE IF NOT EXISTS notifications (id INTEGER PRIMARY KEY AUTOINCREMENT, recipient_type TEXT NOT NULL, recipient_id INTEGER NOT NULL,
    kind TEXT, title TEXT NOT NULL, body TEXT, link TEXT, read_at TEXT, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS chats (id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, title TEXT, created_by INTEGER, created_at TEXT NOT NULL, last_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS chat_members (chat_id INTEGER NOT NULL, user_id INTEGER NOT NULL, last_read_at TEXT, PRIMARY KEY (chat_id, user_id))`,
  `CREATE TABLE IF NOT EXISTS chat_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, chat_id INTEGER NOT NULL, user_id INTEGER NOT NULL, text TEXT NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS absences (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, from_date TEXT NOT NULL, to_date TEXT NOT NULL,
    substitute_id INTEGER, status TEXT NOT NULL DEFAULT 'angefragt', note TEXT, created_at TEXT NOT NULL, decided_at TEXT)`,

  // Support
  `CREATE TABLE IF NOT EXISTS tickets (id INTEGER PRIMARY KEY AUTOINCREMENT, tag TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'ticket', category TEXT,
    subject TEXT NOT NULL, priority TEXT NOT NULL DEFAULT 'normal', status TEXT NOT NULL DEFAULT 'neu', requester_type TEXT, requester_id INTEGER,
    requester_name TEXT, requester_email TEXT, org_id INTEGER, request_id INTEGER, assignee_id INTEGER, payload TEXT,
    escalated_at TEXT, done_at TEXT, archived_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS ticket_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, ticket_id INTEGER NOT NULL, author_type TEXT NOT NULL,
    author_id INTEGER, author_name TEXT, text TEXT NOT NULL, internal INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS sys_issues (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, details TEXT, status TEXT NOT NULL DEFAULT 'offen',
    created_by INTEGER, created_at TEXT NOT NULL, done_at TEXT, notes TEXT NOT NULL DEFAULT '[]')`,
  `CREATE TABLE IF NOT EXISTS archive (id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, ref_id INTEGER, title TEXT, data TEXT NOT NULL,
    archived_at TEXT NOT NULL, expires_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS backups (id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'auto', size INTEGER,
    sha256 TEXT, file_id INTEGER, report TEXT, uploaded TEXT)`,

  // Buchhaltung
  `CREATE TABLE IF NOT EXISTS billing_items (id INTEGER PRIMARY KEY AUTOINCREMENT, org_id INTEGER NOT NULL, request_id INTEGER, assignment_id INTEGER,
    description TEXT NOT NULL, amount_net REAL NOT NULL, status TEXT NOT NULL DEFAULT 'offen', invoice_id INTEGER, note TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  // Finanzbuchhaltung: Konten, Buchungen (Kopf + Zeilen Soll/Haben), Belegarchiv, Abschl\u00fcsse
  `CREATE TABLE IF NOT EXISTS fibu_accounts (id INTEGER PRIMARY KEY AUTOINCREMENT, number TEXT NOT NULL UNIQUE, name TEXT NOT NULL, type TEXT NOT NULL,
    sys TEXT, status TEXT NOT NULL DEFAULT 'offen', note TEXT, closed_at TEXT, closed_by TEXT, created_by TEXT, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS fibu_entries (id INTEGER PRIMARY KEY AUTOINCREMENT, number TEXT NOT NULL UNIQUE, date TEXT NOT NULL, period TEXT NOT NULL,
    text TEXT NOT NULL, doc_id INTEGER, source TEXT NOT NULL DEFAULT 'manuell', source_id TEXT, reverses INTEGER, reversed_by INTEGER,
    created_by TEXT, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS fibu_lines (id INTEGER PRIMARY KEY AUTOINCREMENT, entry_id INTEGER NOT NULL, account_id INTEGER NOT NULL,
    debit REAL NOT NULL DEFAULT 0, credit REAL NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS fibu_docs (id INTEGER PRIMARY KEY AUTOINCREMENT, number TEXT NOT NULL UNIQUE, date TEXT NOT NULL, kind TEXT NOT NULL,
    title TEXT NOT NULL, amount REAL, counterparty TEXT, ref TEXT, file_id INTEGER, sha256 TEXT, size INTEGER, note TEXT, created_by TEXT, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS fibu_periods (id INTEGER PRIMARY KEY AUTOINCREMENT, period TEXT NOT NULL UNIQUE, kind TEXT NOT NULL, status TEXT NOT NULL,
    report TEXT, file_id INTEGER, doc_id INTEGER, closed_by TEXT, closed_at TEXT, reopened_by TEXT, reopened_at TEXT)`,
  // Notizen der Buchhaltung zu Rechnungen und Abrechnungsf\u00e4llen
  `CREATE TABLE IF NOT EXISTS acc_notes (id INTEGER PRIMARY KEY AUTOINCREMENT, invoice_id INTEGER, item_id INTEGER, text TEXT NOT NULL,
    user_id INTEGER, author_name TEXT, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS invoices (id INTEGER PRIMARY KEY AUTOINCREMENT, number TEXT UNIQUE, org_id INTEGER, kind TEXT NOT NULL DEFAULT 'einzel',
    status TEXT NOT NULL DEFAULT 'offen', issue_date TEXT, service_from TEXT, service_to TEXT, due_date TEXT, net REAL NOT NULL DEFAULT 0,
    vat_rate REAL NOT NULL DEFAULT 19, vat REAL NOT NULL DEFAULT 0, gross REAL NOT NULL DEFAULT 0, paid REAL NOT NULL DEFAULT 0, fees REAL NOT NULL DEFAULT 0,
    dunning_level INTEGER NOT NULL DEFAULT 0, last_dunning_at TEXT, recipient TEXT NOT NULL DEFAULT '{}', lines TEXT NOT NULL DEFAULT '[]',
    file_id INTEGER, sent_at TEXT, sent_to TEXT, note TEXT, created_by INTEGER, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS dunnings (id INTEGER PRIMARY KEY AUTOINCREMENT, invoice_id INTEGER NOT NULL, level INTEGER NOT NULL, fee REAL NOT NULL DEFAULT 0,
    due_date TEXT, file_id INTEGER, sent_at TEXT, sent_to TEXT, created_by INTEGER, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS payments (id INTEGER PRIMARY KEY AUTOINCREMENT, invoice_id INTEGER NOT NULL, amount REAL NOT NULL, date TEXT NOT NULL,
    method TEXT, note TEXT, created_by INTEGER, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS suppliers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, street TEXT, zip TEXT, city TEXT, country TEXT,
    email TEXT, phone TEXT, iban TEXT, bic TEXT, vat_id TEXT, customer_no TEXT, note TEXT, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS purchase_invoices (id INTEGER PRIMARY KEY AUTOINCREMENT, supplier_id INTEGER NOT NULL, number TEXT, date TEXT, due_date TEXT,
    net REAL NOT NULL DEFAULT 0, vat REAL NOT NULL DEFAULT 0, gross REAL NOT NULL DEFAULT 0, category TEXT, status TEXT NOT NULL DEFAULT 'offen',
    pay_date TEXT, file_id INTEGER, note TEXT, paid_at TEXT, created_by INTEGER, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS payruns (id INTEGER PRIMARY KEY AUTOINCREMENT, day TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'offen', total REAL NOT NULL DEFAULT 0,
    items TEXT NOT NULL DEFAULT '[]', closed_at TEXT, released_by INTEGER, released_at TEXT, file_id INTEGER, created_at TEXT NOT NULL)`,

  // Sonstiges
  `CREATE TABLE IF NOT EXISTS mail_outbox (id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT, sender TEXT, recipient TEXT, subject TEXT, html TEXT,
    status TEXT NOT NULL, error TEXT, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS geo_cache (zip TEXT PRIMARY KEY, lat REAL, lon REAL, city TEXT, source TEXT, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS surveys (id INTEGER PRIMARY KEY AUTOINCREMENT, request_id INTEGER NOT NULL, org_id INTEGER, kind TEXT NOT NULL,
    answer TEXT, rating INTEGER, sent_at TEXT, answered_at TEXT, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS jobs (key TEXT PRIMARY KEY, last_run TEXT, last_result TEXT)`
];

const INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_req_type ON requests(type, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_req_status ON requests(status)`,
  `CREATE INDEX IF NOT EXISTS idx_req_account ON requests(customer_account)`,
  `CREATE INDEX IF NOT EXISTS idx_events_req ON events(request_id)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_at ON audit(at)`,
  `CREATE INDEX IF NOT EXISTS idx_asg_req ON assignments(request_id)`,
  `CREATE INDEX IF NOT EXISTS idx_asg_org ON assignments(org_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_offers_req ON offers(request_id)`,
  `CREATE INDEX IF NOT EXISTS idx_pu_org ON partner_users(org_id)`,
  `CREATE INDEX IF NOT EXISTS idx_notif ON notifications(recipient_type, recipient_id, read_at)`,
  `CREATE INDEX IF NOT EXISTS idx_tickets ON tickets(status, priority)`,
  `CREATE INDEX IF NOT EXISTS idx_tmsg ON ticket_messages(ticket_id)`,
  `CREATE INDEX IF NOT EXISTS idx_bill ON billing_items(org_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_accnotes ON acc_notes(invoice_id, item_id)`,
  `CREATE INDEX IF NOT EXISTS idx_fibu_lines ON fibu_lines(account_id, entry_id)`,
  `CREATE INDEX IF NOT EXISTS idx_fibu_entries ON fibu_entries(period, date)`,
  `CREATE INDEX IF NOT EXISTS idx_fibu_src ON fibu_entries(source, source_id)`,
  `CREATE INDEX IF NOT EXISTS idx_inv_org ON invoices(org_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_chatmsg ON chat_messages(chat_id, id)`,
  `CREATE INDEX IF NOT EXISTS idx_pev ON partner_events(request_id)`
];

// Zus\u00e4tzliche Spalten bestehender Tabellen (Migration vom alten Dashboard)
const EXTRA_COLUMNS = {
  requests: {
    plz: 'TEXT', city: 'TEXT', radius_km: 'INTEGER', lat: 'REAL', lon: 'REAL', zustand: 'TEXT', pay_kind: 'TEXT', budget: 'TEXT', source: 'TEXT',
    deadline_at: 'TEXT', dispatched_at: 'TEXT', evaluated_at: 'TEXT', presented_at: 'TEXT', decided_at: 'TEXT', won_assignment_id: 'INTEGER',
    spam_state: 'TEXT', spam_by: 'INTEGER', spam_reason: 'TEXT', deleted: "INTEGER NOT NULL DEFAULT 0", billed: "INTEGER NOT NULL DEFAULT 0",
    feedback_state: 'TEXT', customer_note_at: 'TEXT', customer_note_unread: "INTEGER NOT NULL DEFAULT 0", first_action_at: 'TEXT', status_note: 'TEXT'
  },
  notes: { visibility: "TEXT NOT NULL DEFAULT 'intern'", org_id: 'INTEGER', author_type: "TEXT NOT NULL DEFAULT 'staff'", acc_relevant: 'INTEGER NOT NULL DEFAULT 0', acc_marked_by: 'TEXT', acc_marked_at: 'TEXT' },
  users: { extra_perms: "TEXT NOT NULL DEFAULT '[]'", revoked_perms: "TEXT NOT NULL DEFAULT '[]'", department: 'TEXT', phone: 'TEXT',
    must_change_pw: "INTEGER NOT NULL DEFAULT 0", created_by: 'INTEGER', prev_login: 'TEXT' },
  sessions: { area_until: 'TEXT' },
  mail_outbox: { server_reply: 'TEXT' },
  offers: { score_detail: 'TEXT' },
  purchase_invoices: { account_id: 'INTEGER', vat_rate: 'REAL', doc_id: 'INTEGER', entry_id: 'INTEGER', pay_entry_id: 'INTEGER', text: 'TEXT' },
  orgs: { reminder_due_days: 'INTEGER', dunning_fee_1: 'REAL', dunning_fee_2: 'REAL', dunning_due_days: 'INTEGER', dunning_due_days_2: 'INTEGER' },
  invoices: { mail_status: 'TEXT', mail_error: 'TEXT', intro: 'TEXT' },
  billing_items: { cancel_reason: 'TEXT', cancelled_at: 'TEXT', cancelled_by: 'TEXT', prev_status: 'TEXT' }
};

const OLD_STATUS_MAP = { neu: 'eingang', in_bearbeitung: 'in_bearbeitung', angebot_gesendet: 'angebot_beim_kunden', abgeschlossen: 'kontaktdaten_versendet', abgelehnt: 'angebot_abgelehnt' };
const OLD_ROLE_MAP = { admin: 'admin', bearbeiter: 'teamleitung', team_angebote: 'vertrieb', team_ankauf: 'vertrieb' };

// Rechte, die nach dem Start hinzukamen: welche festen Rollen sie automatisch bekommen
const NEW_ROLE_PERMS = { acc_cancel: ['gf', 'buchhaltung'], fibu_view: ['gf', 'buchhaltung'], fibu_book: ['gf', 'buchhaltung'], fibu_manage: ['gf'] };

let migrated = false;
async function migrate(db) {
  if (migrated) return;
  for (const sql of SCHEMA) await db.prepare(sql).run();
  for (const [table, cols] of Object.entries(EXTRA_COLUMNS)) {
    const have = new Set(((await db.prepare(`PRAGMA table_info(${table})`).all()).results || []).map((c) => c.name));
    for (const [col, type] of Object.entries(cols)) if (!have.has(col)) await db.prepare(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`).run();
  }
  for (const sql of INDEXES) await db.prepare(sql).run();
  // Rollen (feste Rollen, Rechte durch Admin anpassbar)
  for (const [key, r] of Object.entries(STAFF_ROLES)) {
    await db.prepare('INSERT OR IGNORE INTO roles (key, name, perms, builtin) VALUES (?, ?, ?, 1)').bind(key, r.label, JSON.stringify(ROLE_PERMS[key])).run();
  }
  // Neue Rechte einmalig den vorgesehenen festen Rollen erg\u00e4nzen (vom Admin sp\u00e4ter \u00e4nderbar)
  for (const [perm, roles] of Object.entries(NEW_ROLE_PERMS)) {
    const flag = '_perm_' + perm;
    if (await db.prepare('SELECT value FROM settings WHERE key = ?').bind(flag).first()) continue;
    for (const key of roles) {
      const row = await db.prepare('SELECT perms FROM roles WHERE key = ?').bind(key).first();
      if (!row) continue;
      const perms = jparse(row.perms, []); if (!perms.includes(perm)) { perms.push(perm); await db.prepare('UPDATE roles SET perms = ? WHERE key = ?').bind(JSON.stringify(perms), key).run(); }
    }
    await db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at, updated_by) VALUES (?, '1', ?, 'system')").bind(flag, nowIso()).run();
  }
  // Einmalig: Rechnungen, die als versendet markiert sind, obwohl keine E-Mail rausging, korrigieren
  if (!(await db.prepare("SELECT value FROM settings WHERE key = '_fix_invoice_sent'").first())) {
    await db.prepare(`UPDATE invoices SET mail_status = 'nicht_konfiguriert', mail_error = 'E-Mail-Versand war nicht eingerichtet', sent_at = NULL
      WHERE sent_at IS NOT NULL AND NOT EXISTS (SELECT 1 FROM mail_outbox m WHERE m.category = 'invoice' AND m.status = 'gesendet' AND instr(m.subject, invoices.number) > 0)`).run();
    await db.prepare("UPDATE invoices SET mail_status = 'gesendet' WHERE sent_at IS NOT NULL AND mail_status IS NULL").run();
    await db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at, updated_by) VALUES ('_fix_invoice_sent', '1', ?, 'system')").bind(nowIso()).run();
  }
  // Einmalig: Standard-Konditionen (Zahlungsziel, Mahnfristen, Mahngeb\u00fchren) bei allen Gesch\u00e4ftspartnern hinterlegen
  if (!(await db.prepare("SELECT value FROM settings WHERE key = '_org_terms_v2'").first())) {
    const val = async (k) => { const r = await db.prepare('SELECT value FROM settings WHERE key = ?').bind(k).first(); const v = r ? jparse(r.value, null) : null; return v === null || v === '' ? DEFAULT_SETTINGS[k] : v; };
    for (const [col, key] of Object.entries(ORG_TERMS)) await db.prepare(`UPDATE orgs SET ${col} = ? WHERE ${col} IS NULL`).bind(await val(key)).run();
    await db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at, updated_by) VALUES ('_org_terms_v2', '1', ?, 'system')").bind(nowIso()).run();
  }
  // Einmalig: bisherige Einzel-Notiz der Abrechnungsf\u00e4lle in die neue Notizliste \u00fcbernehmen
  if (!(await db.prepare("SELECT value FROM settings WHERE key = '_acc_notes_v1'").first())) {
    await db.prepare("INSERT INTO acc_notes (item_id, text, author_name, created_at) SELECT id, note, 'Buchhaltung', updated_at FROM billing_items WHERE note IS NOT NULL AND trim(note) != ''").run();
    await db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at, updated_by) VALUES ('_acc_notes_v1', '1', ?, 'system')").bind(nowIso()).run();
  }
  // Kontenrahmen anlegen (fehlende Standardkonten erg\u00e4nzen)
  for (const [number, name, type, sys] of FIBU_DEFAULT_ACCOUNTS) await db.prepare('INSERT OR IGNORE INTO fibu_accounts (number, name, type, sys, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(number, name, type, sys, 'System', nowIso()).run();
  // Beginn der Finanzbuchhaltung merken (ab diesem Monat gibt es automatische Abschl\u00fcsse)
  await db.prepare("INSERT OR IGNORE INTO settings (key, value, updated_at, updated_by) VALUES ('_fibu_start', ?, ?, 'system')").bind(JSON.stringify(berlinDate(nowMs()).slice(0, 7)), nowIso()).run();
  // Admin hat immer alle Rechte (auch neu hinzugekommene)
  await db.prepare("UPDATE roles SET perms = ?, name = 'Admin', builtin = 1 WHERE key = 'admin'").bind(JSON.stringify(PERM_KEYS)).run();
  // Alte Rollen und Status \u00fcbernehmen (einmalig)
  const done = await db.prepare("SELECT value FROM settings WHERE key = '_migrated_v2'").first();
  if (!done) {
    for (const [o, n] of Object.entries(OLD_ROLE_MAP)) if (o !== n) await db.prepare('UPDATE users SET role_key = ? WHERE role_key = ?').bind(n, o).run();
    for (const [o, n] of Object.entries(OLD_STATUS_MAP)) if (o !== n) await db.prepare("UPDATE requests SET status = ? WHERE status = ? AND type IN ('deal','sell')").bind(n, o).run();
    await db.prepare("DELETE FROM roles WHERE key IN ('bearbeiter','team_angebote','team_ankauf') AND key NOT IN (SELECT role_key FROM users)").run();
    await migrateOldTickets(db);
    await db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at, updated_by) VALUES ('_migrated_v2', '1', ?, 'system')").bind(nowIso()).run();
  }
  migrated = true;
}
// Alte Support-/Widerruf-/Partner-Eintr\u00e4ge aus der Anfragetabelle werden Support-Tickets
async function migrateOldTickets(db) {
  const rows = (await db.prepare("SELECT * FROM requests WHERE type NOT IN ('deal','sell')").all()).results || [];
  for (const r of rows) {
    const def = TICKET_FORMS[r.type] || { tag: 'Intern', category: r.type, priority: 'normal' };
    const d = jparse(r.data, {});
    const body = Object.entries(d).filter(([k]) => !/^_/.test(k)).map(([k, v]) => `${k}: ${v}`).join('\n');
    const t = await db.prepare(`INSERT INTO tickets (tag, kind, category, subject, priority, status, requester_type, requester_name, requester_email, created_at, updated_at)
      VALUES (?, 'ticket', ?, ?, ?, ?, 'web', ?, ?, ?, ?) RETURNING id`).bind(def.tag, def.category, r.summary || def.category, def.priority,
      ['abgeschlossen', 'abgelehnt'].includes(r.status) ? 'erledigt' : 'neu', r.customer_name || '', r.email || '', r.created_at, r.updated_at).first();
    await db.prepare("INSERT INTO ticket_messages (ticket_id, author_type, author_name, text, created_at) VALUES (?, 'requester', ?, ?, ?)").bind(t.id, r.customer_name || '', body || '(ohne Text)', r.created_at).run();
    await db.prepare('UPDATE requests SET deleted = 1, status = ? WHERE id = ?').bind('spam', r.id).run();
    await db.prepare("INSERT INTO events (request_id, action, detail, created_at) VALUES (?, 'migriert', ?, ?)").bind(r.id, 'Als Support-Ticket #' + t.id + ' \u00fcbernommen', nowIso()).run();
  }
}
function resetMigrationFlag() { migrated = false; }

/* ---------- Abfrage-Helfer ---------- */
const DB = {
  async all(db, sql, ...args) { return (await db.prepare(sql).bind(...args).all()).results || []; },
  async one(db, sql, ...args) { return (await db.prepare(sql).bind(...args).first()) || null; },
  async run(db, sql, ...args) { return db.prepare(sql).bind(...args).run(); },
  async val(db, sql, ...args) { const r = await db.prepare(sql).bind(...args).first(); return r ? Object.values(r)[0] : null; },
  async insert(db, table, obj) {
    const keys = Object.keys(obj);
    const r = await db.prepare(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')}) RETURNING id`).bind(...keys.map((k) => norm(obj[k]))).first();
    return r ? r.id : null;
  },
  async update(db, table, id, obj, idCol = 'id') {
    const keys = Object.keys(obj); if (!keys.length) return;
    await db.prepare(`UPDATE ${table} SET ${keys.map((k) => k + ' = ?').join(', ')} WHERE ${idCol} = ?`).bind(...keys.map((k) => norm(obj[k])), id).run();
  }
};
const norm = (v) => (v === undefined ? null : (v !== null && typeof v === 'object') ? JSON.stringify(v) : (typeof v === 'boolean' ? (v ? 1 : 0) : v));
const inList = (arr) => arr.map(() => '?').join(',');


/* ===== 04-services.js ===== */
/* ============================================================
   Dienste: Einstellungen, Protokoll, E-Mail, Geodaten, Dateien, Benachrichtigungen
   ============================================================ */

/* ---------- Einstellungen ---------- */
async function loadSettings(db) {
  const s = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  for (const r of await DB.all(db, 'SELECT key, value FROM settings')) {
    if (r.key.startsWith('_')) { s[r.key] = r.value; continue; }
    s[r.key] = jparse(r.value, r.value);
  }
  return s;
}
async function settingsOf(ctx) { if (!ctx._settings) ctx._settings = await loadSettings(ctx.db); return ctx._settings; }
async function saveSettings(ctx, obj) {
  for (const [k, v] of Object.entries(obj)) {
    await DB.run(ctx.db, 'INSERT OR REPLACE INTO settings (key, value, updated_at, updated_by) VALUES (?, ?, ?, ?)', k, JSON.stringify(v), nowIso(), ctx.actor ? ctx.actor.name : 'system');
  }
  ctx._settings = null;
}
async function rawSetting(db, key) { const r = await DB.one(db, 'SELECT value FROM settings WHERE key = ?', key); return r ? r.value : null; }
async function setRawSetting(db, key, value) { await DB.run(db, 'INSERT OR REPLACE INTO settings (key, value, updated_at, updated_by) VALUES (?, ?, ?, ?)', key, value, nowIso(), 'system'); }

/* ---------- Protokoll (wer, was, wann) ---------- */
async function audit(ctx, action, entity, entityId, detail) {
  try {
    const a = ctx.actor || { type: 'system', id: null, name: 'System' };
    const d = detail === undefined || detail === null ? null : (typeof detail === 'string' ? detail : JSON.stringify(detail));
    await DB.run(ctx.db, 'INSERT INTO audit (at, actor_type, actor_id, actor_name, action, entity, entity_id, detail, ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      nowIso(), a.type, a.id ?? null, a.name || null, action, entity || null, entityId === undefined || entityId === null ? null : String(entityId), d ? d.slice(0, 4000) : null, ctx.ipHash || null);
  } catch (e) { console.log('Protokoll-Fehler', e.message); }
}
async function reqEvent(ctx, requestId, action, detail) {
  const a = ctx.actor || { type: 'system' };
  const who = a.type === 'staff' ? null : a.type === 'system' ? 'System' : a.type === 'customer' ? 'Kunde' : (a.name || 'Partner');
  const text = [who ? `[${who}]` : null, detail ? String(detail).slice(0, 1000) : null].filter(Boolean).join(' ') || null;
  await DB.run(ctx.db, 'INSERT INTO events (request_id, user_id, action, detail, created_at) VALUES (?, ?, ?, ?, ?)', requestId, a.type === 'staff' ? a.id : null, action, text, nowIso());
}
async function partnerEvent(ctx, { assignmentId, requestId, orgId, action, text, confidential = false, visiblePartner = false }) {
  const a = ctx.actor || { type: 'system', name: 'System' };
  await DB.insert(ctx.db, 'partner_events', { assignment_id: assignmentId || null, request_id: requestId || null, org_id: orgId || null, actor_type: a.type, actor_id: a.id ?? null,
    actor_name: a.name || null, action, text: text || null, confidential: confidential ? 1 : 0, visible_partner: visiblePartner ? 1 : 0, created_at: nowIso() });
}

/* ---------- E-Mail (Brevo) mit Absender je Kategorie ---------- */
function mailWrap(s, title, body) {
  return `<!doctype html><html><body style="margin:0;background:#f4f4f4;padding:24px 0">
<div style="max-width:620px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;font:16px/1.55 Helvetica,Arial,sans-serif;color:#1a1a1a">
<div style="background:#000;padding:22px 28px"><span style="display:inline-block;background:#ff6c01;color:#fff;font:italic 700 20px Helvetica,Arial;padding:8px 10px;border-radius:4px">KFL</span></div>
<div style="padding:28px"><h1 style="font-size:23px;line-height:1.25;margin:0 0 16px">${esc(title)}</h1>${body}</div>
<div style="padding:18px 28px;background:#f4f4f4;color:#6b6b70;font-size:12.5px;line-height:1.5">${esc(s.company_name)} \u00b7 ${esc(s.company_street)} \u00b7 ${esc(s.company_zip)} ${esc(s.company_city)} \u00b7 ${esc(s.company_email)}</div>
</div></body></html>`;
}
const mailBtn = (href, label) => `<p style="margin:22px 0"><a href="${esc(href)}" style="display:inline-block;background:#ff6c01;color:#000;font-weight:700;padding:12px 22px;border-radius:999px;text-decoration:none">${esc(label)}</a></p>`;
const mailTable = (rows) => `<table style="border-collapse:collapse;width:100%;font:14.5px/1.5 Helvetica,Arial,sans-serif">${rows.filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '').map(([k, v]) => `<tr><td style="padding:7px 10px;border-bottom:1px solid #eee;color:#6b6b70;vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="padding:7px 10px;border-bottom:1px solid #eee">${esc(v).replace(/\n/g, '<br>')}</td></tr>`).join('')}</table>`;

async function sendMail(ctx, { category = 'system', to, toName, subject, title, html, body, replyTo, attachments }) {
  const s = await settingsOf(ctx);
  const from = s[(MAIL_CATEGORIES[category] || MAIL_CATEGORIES.system).setting] || s.mail_from_system;
  const content = html || mailWrap(s, title || subject, body || '');
  const recipient = Array.isArray(to) ? to.join(', ') : to;
  if (!recipient || !emailOk(String(recipient).split(',')[0].trim())) return { ok: false, error: 'Keine g\u00fcltige Empf\u00e4ngeradresse' };
  let status = 'nicht_konfiguriert', error = null, reply = null;
  const list = (Array.isArray(to) ? to : String(to).split(',')).map((x) => String(x).trim()).filter(Boolean);
  const menv = await mailEnv(ctx);
  if (smtpConfigured(menv)) {
    try {
      reply = await smtpSendMail(menv, { from, fromName: s.mail_sender_name, to: list, toName, subject, html: content, replyTo, attachments: (attachments || []).map((a) => ({ name: a.name, base64: a.base64, type: a.type })) });
      status = 'gesendet';
    } catch (e) { status = 'fehler'; error = String(e.message || e).slice(0, 500); }
  } else if (ctx.env.BREVO_API_KEY) {
    try {
      const payload = { sender: { name: s.mail_sender_name, email: from }, to: (Array.isArray(to) ? to : [to]).map((e) => ({ email: e, name: toName || undefined })),
        subject, htmlContent: content };
      if (replyTo) payload.replyTo = typeof replyTo === 'string' ? { email: replyTo } : replyTo;
      if (attachments && attachments.length) payload.attachment = attachments.map((a) => ({ name: a.name, content: a.base64 }));
      const res = await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers: { 'api-key': ctx.env.BREVO_API_KEY, 'Content-Type': 'application/json', accept: 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) { status = 'fehler'; error = 'Brevo ' + res.status + ': ' + (await res.text()).slice(0, 300); } else status = 'gesendet';
    } catch (e) { status = 'fehler'; error = e.message; }
  }
  // Antwort des Mailservers (z. B. \u201e250 \u2026 queued as \u2026\u201c) als Zustellnachweis speichern
  await DB.insert(ctx.db, 'mail_outbox', { category, sender: from, recipient, subject, html: content.slice(0, 60000), status, error, server_reply: reply ? String(reply).slice(0, 300) : null, created_at: nowIso() });
  if (status === 'fehler') console.log('Mail-Fehler', error);
  return { ok: status === 'gesendet', status, error };
}

/* ---------- Geodaten (PLZ \u2192 Koordinaten) ---------- */
// Grobe Mittelpunkte der Postleitregionen (Fallback, falls kein exakter Wert vorliegt)
const PLZ_REGIONS = {
  '01': [51.05, 13.74], '02': [51.18, 14.42], '03': [51.76, 14.33], '04': [51.34, 12.37], '06': [51.48, 11.97], '07': [50.88, 11.99], '08': [50.62, 12.38], '09': [50.83, 12.92],
  '10': [52.52, 13.40], '12': [52.45, 13.45], '13': [52.57, 13.33], '14': [52.39, 13.06], '15': [52.35, 14.30], '16': [52.83, 13.65], '17': [53.56, 13.26], '18': [54.09, 12.13], '19': [53.63, 11.41],
  '20': [53.55, 10.00], '21': [53.40, 10.15], '22': [53.60, 10.05], '23': [53.87, 10.69], '24': [54.32, 10.13], '25': [54.10, 9.40], '26': [53.20, 7.90], '27': [53.40, 8.80], '28': [53.08, 8.80], '29': [52.80, 10.40],
  '30': [52.37, 9.73], '31': [52.10, 9.60], '32': [52.15, 8.70], '33': [51.90, 8.55], '34': [51.31, 9.48], '35': [50.62, 8.70], '36': [50.55, 9.68], '37': [51.53, 9.93], '38': [52.27, 10.52], '39': [52.13, 11.62],
  '40': [51.23, 6.78], '41': [51.18, 6.50], '42': [51.26, 7.15], '44': [51.51, 7.47], '45': [51.45, 7.01], '46': [51.60, 6.85], '47': [51.40, 6.65], '48': [52.00, 7.60], '49': [52.40, 7.90],
  '50': [50.94, 6.96], '51': [50.98, 7.15], '52': [50.78, 6.08], '53': [50.73, 7.10], '54': [49.75, 6.64], '55': [49.90, 7.95], '56': [50.36, 7.59], '57': [50.87, 8.02], '58': [51.36, 7.47], '59': [51.55, 7.95],
  '60': [50.11, 8.68], '61': [50.25, 8.65], '63': [50.05, 9.00], '64': [49.87, 8.65], '65': [50.08, 8.24], '66': [49.24, 6.99], '67': [49.45, 7.90], '68': [49.49, 8.47], '69': [49.40, 8.69],
  '70': [48.78, 9.18], '71': [48.75, 9.10], '72': [48.50, 9.05], '73': [48.70, 9.60], '74': [49.14, 9.22], '75': [48.89, 8.70], '76': [49.01, 8.40], '77': [48.47, 7.94], '78': [47.95, 8.70], '79': [47.99, 7.85],
  '80': [48.14, 11.58], '81': [48.12, 11.62], '82': [47.80, 11.20], '83': [47.85, 12.12], '84': [48.54, 12.15], '85': [48.60, 11.60], '86': [48.37, 10.90], '87': [47.73, 10.31], '88': [47.78, 9.61], '89': [48.40, 9.99],
  '90': [49.45, 11.08], '91': [49.40, 10.80], '92': [49.50, 12.00], '93': [49.02, 12.10], '94': [48.57, 13.43], '95': [50.00, 11.70], '96': [50.00, 10.95], '97': [49.79, 9.95], '98': [50.60, 10.70], '99': [50.98, 11.03]
};
async function geocodePlz(ctx, plz) {
  plz = String(plz || '').trim();
  if (!plzOk(plz)) return null;
  const c = await DB.one(ctx.db, 'SELECT lat, lon, city, source FROM geo_cache WHERE zip = ?', plz);
  if (c && c.source !== 'region') return c;
  if (!ctx.noNetworkGeo) {
    try {
      const res = await fetch('https://api.zippopotam.us/de/' + plz, { headers: { accept: 'application/json' } });
      if (res.ok) {
        const j = await res.json(); const p = j.places && j.places[0];
        if (p) {
          const row = { lat: parseFloat(p.latitude), lon: parseFloat(p.longitude), city: p['place name'] || '', source: 'zippopotam' };
          await DB.run(ctx.db, 'INSERT OR REPLACE INTO geo_cache (zip, lat, lon, city, source, created_at) VALUES (?, ?, ?, ?, ?, ?)', plz, row.lat, row.lon, row.city, row.source, nowIso());
          return row;
        }
      }
    } catch (e) { console.log('Geodaten nicht erreichbar', e.message); }
  }
  if (c) return c;
  const r = PLZ_REGIONS[plz.slice(0, 2)];
  if (!r) return null;
  const row = { lat: r[0], lon: r[1], city: '', source: 'region' };
  await DB.run(ctx.db, 'INSERT OR REPLACE INTO geo_cache (zip, lat, lon, city, source, created_at) VALUES (?, ?, ?, ?, ?, ?)', plz, row.lat, row.lon, '', 'region', nowIso());
  return row;
}
function distanceKm(a, b) {
  if (!a || !b || a.lat == null || b.lat == null) return null;
  const R = 6371, toR = (x) => (x * Math.PI) / 180;
  const dLat = toR(b.lat - a.lat), dLon = toR(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
}

/* ---------- Dateien (R2-Bucket FILES, sonst Datenbank) ---------- */
const CHUNK = 700000;
async function putFile(ctx, { name, mime, bytes, ownerType, ownerId }) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const storage = ctx.env.FILES ? 'r2' : 'd1';
  const id = await DB.insert(ctx.db, 'files', { name: str(name, 200) || 'datei', mime: mime || 'application/octet-stream', size: u8.length, storage, key: null, owner_type: ownerType || null, owner_id: ownerId || null, created_at: nowIso() });
  if (storage === 'r2') {
    const key = `f/${id}-${randomHex(8)}`;
    await ctx.env.FILES.put(key, u8, { httpMetadata: { contentType: mime } });
    await DB.update(ctx.db, 'files', id, { key });
  } else {
    const s = b64(u8);
    for (let i = 0, n = 0; i < s.length || n === 0; i += CHUNK, n++) await DB.run(ctx.db, 'INSERT INTO file_chunks (file_id, idx, data) VALUES (?, ?, ?)', id, n, s.slice(i, i + CHUNK));
  }
  return id;
}
async function getFile(ctx, id) {
  const meta = await DB.one(ctx.db, 'SELECT * FROM files WHERE id = ?', id);
  if (!meta) return null;
  let bytes;
  if (meta.storage === 'r2') { const o = await ctx.env.FILES.get(meta.key); if (!o) return null; bytes = new Uint8Array(await o.arrayBuffer()); }
  else bytes = unb64((await DB.all(ctx.db, 'SELECT data FROM file_chunks WHERE file_id = ? ORDER BY idx', id)).map((r) => r.data).join(''));
  return { meta, bytes };
}
async function deleteFile(ctx, id) {
  const meta = await DB.one(ctx.db, 'SELECT * FROM files WHERE id = ?', id); if (!meta) return;
  if (meta.storage === 'r2' && ctx.env.FILES) await ctx.env.FILES.delete(meta.key);
  await DB.run(ctx.db, 'DELETE FROM file_chunks WHERE file_id = ?', id);
  await DB.run(ctx.db, 'DELETE FROM files WHERE id = ?', id);
}
function fileResponse(f, download = false) {
  return new Response(f.bytes, { headers: { 'Content-Type': f.meta.mime || 'application/octet-stream', 'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${String(f.meta.name || 'datei').replace(/[^\w.\- ]+/g, '_')}"`, 'Cache-Control': 'private, no-store', ...SEC_HEADERS } });
}

/* ---------- Benachrichtigungen (News-Feed je Nutzer) ---------- */
async function notify(ctx, recipientType, recipientId, { kind, title, body, link }) {
  await DB.insert(ctx.db, 'notifications', { recipient_type: recipientType, recipient_id: recipientId, kind: kind || 'info', title: str(title, 200), body: body ? String(body).slice(0, 2000) : null, link: link || null, read_at: null, created_at: nowIso() });
}
// an alle aktiven Mitarbeiter mit einem bestimmten Recht (oder bestimmte Nutzer)
async function notifyStaff(ctx, { perm, roles, userIds, except }, msg) {
  let ids = [];
  if (userIds) ids = userIds;
  else {
    const users = await DB.all(ctx.db, 'SELECT u.id, u.role_key, u.extra_perms, u.revoked_perms, r.perms FROM users u LEFT JOIN roles r ON r.key = u.role_key WHERE u.active = 1');
    ids = users.filter((u) => {
      if (roles && !roles.includes(u.role_key)) return false;
      if (!perm) return true;
      const p = new Set([...jparse(u.perms, []), ...jparse(u.extra_perms, [])]); for (const x of jparse(u.revoked_perms, [])) p.delete(x);
      return p.has(perm);
    }).map((u) => u.id);
  }
  for (const id of uniq(ids)) if (id && id !== except) await notify(ctx, 'staff', id, msg);
  return ids.length;
}
async function notifyPartner(ctx, { orgId, userIds, roles }, msg) {
  let ids = userIds || (await DB.all(ctx.db, `SELECT id, role FROM partner_users WHERE org_id = ? AND active = 1`, orgId)).filter((u) => !roles || roles.includes(u.role)).map((u) => u.id);
  for (const id of uniq(ids)) await notify(ctx, 'partner', id, msg);
  return ids.length;
}


/* ===== 05-mail.js ===== */
/* ============================================================
   E-Mail-Versand \u00fcber SMTP (z. B. IONOS-Postfach von kfl-group.com)
   Secrets: SMTP_USER (Postfach, z. B. noreplay@kfl-group.com), SMTP_PASS
   optional: SMTP_HOST (Standard smtp.ionos.de), SMTP_PORT (587 = STARTTLS, 465 = TLS)
   optional je Absender eigenes Postfach: SMTP_PASS_<NAME> (z. B. SMTP_PASS_RECHNUNG f\u00fcr rechnung@)
   Darf das Postfach eine Absenderadresse nicht verwenden, wird mit dem Hauptpostfach
   gesendet und die gew\u00fcnschte Adresse als Antwortadresse (Reply-To) gesetzt.
   ============================================================ */

const SMTP_DEFAULT_USER = 'noreplay@kfl-group.com';
const smtpUser = (env) => env.SMTP_USER || SMTP_DEFAULT_USER;
const smtpConfigured = (env) => !!env.SMTP_PASS;
// Postfach-Zugang: im Dashboard hinterlegt (verschl\u00fcsselt in der Datenbank) oder als Cloudflare-Secret
async function mailEnv(ctx) {
  if (ctx._mailEnv) return ctx._mailEnv;
  let env = ctx.env;
  try {
    const sealed = await rawSetting(ctx.db, '_smtp_cred');
    if (sealed) { const c = jparse(await openSecret(ctx.env, sealed), null); if (c && c.user && c.pass) env = { ...ctx.env, SMTP_USER: c.user, SMTP_PASS: c.pass, _smtpSource: 'dashboard' }; }
  } catch (e) { /* ohne gespeicherten Zugang */ }
  if (env === ctx.env && ctx.env.SMTP_PASS) env = { ...ctx.env, _smtpSource: 'cloudflare' };
  ctx._mailEnv = env; return env;
}
// Zugangsdaten bei IONOS pr\u00fcfen (Anmeldung ohne Versand)
async function smtpVerify(env, user, pass) {
  return Promise.race([smtpSession(env, user, pass, async () => true), new Promise((_, rej) => setTimeout(() => rej(new Error('Zeit\u00fcberschreitung bei der Verbindung zum Mailserver')), 20000))]);
}
const mailProvider = (env) => (smtpConfigured(env) ? 'smtp' : env.BREVO_API_KEY ? 'brevo' : null);

const utf8b64 = (s) => { const bytes = new TextEncoder().encode(String(s)); let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(bin); };
const wrap76 = (b) => b.replace(/.{1,76}/g, (x) => x + '\r\n');
const encWord = (s) => (/^[\x20-\x7e]*$/.test(String(s)) ? String(s) : `=?UTF-8?B?${utf8b64(s)}?=`);
const addr = (email, name) => (name ? `${encWord(String(name).replace(/[\r\n"]/g, ''))} <${email}>` : `<${email}>`);
function htmlToText(html) {
  return String(html).replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)').replace(/<(br|\/p|\/div|\/h\d|\/tr|\/li)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
function buildMime({ from, fromName, to, toName, subject, html, replyTo, attachments, domain }) {
  const rnd = () => randomHex(12);
  const alt = 'alt_' + rnd(), mix = 'mix_' + rnd();
  const head = [
    `From: ${addr(from, fromName)}`, `To: ${to.map((t, i) => addr(t, i === 0 ? toName : '')).join(', ')}`, `Subject: ${encWord(subject)}`,
    `Date: ${new Date(nowMs()).toUTCString().replace('GMT', '+0000')}`, `Message-ID: <${rnd()}.${Date.now()}@${domain}>`, 'MIME-Version: 1.0'
  ];
  if (replyTo) head.push(`Reply-To: ${addr(replyTo.email || replyTo, replyTo.name)}`);
  const altPart = [`--${alt}`, 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', wrap76(utf8b64(htmlToText(html))),
    `--${alt}`, 'Content-Type: text/html; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', wrap76(utf8b64(html)), `--${alt}--`, ''].join('\r\n');
  if (!attachments || !attachments.length) return [...head, `Content-Type: multipart/alternative; boundary="${alt}"`, '', altPart].join('\r\n');
  const parts = [`--${mix}`, `Content-Type: multipart/alternative; boundary="${alt}"`, '', altPart];
  for (const a of attachments) parts.push(`--${mix}`, `Content-Type: ${a.type || 'application/pdf'}; name="${encWord(a.name)}"`, 'Content-Transfer-Encoding: base64', `Content-Disposition: attachment; filename="${encWord(a.name)}"`, '', wrap76(String(a.base64).replace(/\s+/g, '')));
  parts.push(`--${mix}--`, '');
  return [...head, `Content-Type: multipart/mixed; boundary="${mix}"`, '', parts.join('\r\n')].join('\r\n');
}

// Minimaler SMTP-Client (STARTTLS/TLS, AUTH LOGIN) \u00fcber Cloudflare TCP-Sockets
async function smtpSession(env, user, pass, fn) {
  const host = env.SMTP_HOST || 'smtp.ionos.de', port = toInt(env.SMTP_PORT, 587), secure = port === 465;
  let socket = SMTP_CONNECT({ hostname: host, port }, { secureTransport: secure ? 'on' : 'starttls', allowHalfOpen: false });
  let reader = socket.readable.getReader(), writer = socket.writable.getWriter();
  const enc = new TextEncoder(), dec = new TextDecoder(); let buf = '';
  const read = async () => {
    for (;;) {
      const lines = buf.split('\r\n');
      for (let i = 0; i < lines.length - 1; i++) if (/^\d{3}( |$)/.test(lines[i])) { buf = lines.slice(i + 1).join('\r\n'); return { code: +lines[i].slice(0, 3), text: lines.slice(0, i + 1).join(' | ') }; }
      const { value, done } = await reader.read();
      if (done) throw new Error('SMTP-Verbindung wurde vom Server geschlossen');
      buf += dec.decode(value, { stream: true });
    }
  };
  const send = async (line, expect, label) => {
    await writer.write(enc.encode(line + '\r\n'));
    const r = await read();
    if (expect && !expect.includes(r.code)) { const e = new Error(`SMTP ${label || line.split(' ')[0]}: ${r.text}`); e.smtp = r.code; throw e; }
    return r;
  };
  try {
    let r = await read(); if (r.code !== 220) throw new Error('SMTP-Begr\u00fc\u00dfung: ' + r.text);
    await send('EHLO kfl-group.com', [250]);
    if (!secure) {
      await send('STARTTLS', [220]);
      reader.releaseLock(); writer.releaseLock();
      socket = socket.startTls();
      reader = socket.readable.getReader(); writer = socket.writable.getWriter(); buf = '';
      await send('EHLO kfl-group.com', [250]);
    }
    await send('AUTH LOGIN', [334]);
    await send(utf8b64(user), [334], 'AUTH');
    await send(utf8b64(pass), [235], 'AUTH (Benutzername oder Passwort falsch?)');
    const res = await fn({ send, write: (s) => writer.write(enc.encode(s)), read });
    try { await send('QUIT'); } catch (e) { /* egal */ }
    return res;
  } finally { try { socket.close(); } catch (e) { /* bereits zu */ } }
}
async function smtpSendMail(env, mail) {
  const main = String(smtpUser(env)).toLowerCase(), want = String(mail.from).toLowerCase();
  const local = want.split('@')[0].replace(/[^a-z0-9]/gi, '_').toUpperCase();
  const own = want !== main && env['SMTP_PASS_' + local] ? { user: want, pass: env['SMTP_PASS_' + local] } : null;
  const domain = (want.split('@')[1] || 'kfl-group.com');
  const deliver = async (user, pass, from, replyTo) => smtpSession(env, user, pass, async ({ send, write, read }) => {
    await send(`MAIL FROM:<${from}>`, [250]);
    for (const t of mail.to) await send(`RCPT TO:<${t}>`, [250, 251]);
    await send('DATA', [354]);
    const mime = buildMime({ ...mail, from, replyTo, domain }).replace(/\r\n\./g, '\r\n..');
    await write(mime + (mime.endsWith('\r\n') ? '' : '\r\n') + '.\r\n');
    const r = await read();
    if (r.code !== 250) { const e = new Error('SMTP DATA: ' + r.text); e.smtp = r.code; throw e; }
    return r.text;
  });
  const timeout = (p) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('SMTP-Zeit\u00fcberschreitung')), 25000))]);
  if (own) return timeout(deliver(own.user, own.pass, want, mail.replyTo));
  try { return await timeout(deliver(main, env.SMTP_PASS, want, mail.replyTo)); }
  catch (e) {
    // Absenderadresse f\u00fcr dieses Postfach nicht erlaubt \u2192 mit Hauptpostfach senden, gew\u00fcnschte Adresse als Antwortadresse
    if (want !== main && e.smtp >= 500) return timeout(deliver(main, env.SMTP_PASS, main, mail.replyTo || { email: want, name: mail.fromName }));
    throw e;
  }
}


/* ===== 09-pdf.js ===== */
/* ============================================================
   Schlanker PDF-Generator (ohne Fremdbibliothek) f\u00fcr Rechnungen,
   Mahnungen und Berichte. Schrift: Helvetica (WinAnsi), A4.
   ============================================================ */

const HELV = { 32: 278, 33: 278, 34: 355, 35: 556, 36: 556, 37: 889, 38: 667, 39: 191, 40: 333, 41: 333, 42: 389, 43: 584, 44: 278, 45: 333, 46: 278, 47: 278,
  48: 556, 49: 556, 50: 556, 51: 556, 52: 556, 53: 556, 54: 556, 55: 556, 56: 556, 57: 556, 58: 278, 59: 278, 60: 584, 61: 584, 62: 584, 63: 556, 64: 1015,
  65: 667, 66: 667, 67: 722, 68: 722, 69: 667, 70: 611, 71: 778, 72: 722, 73: 278, 74: 500, 75: 667, 76: 556, 77: 833, 78: 722, 79: 778, 80: 667, 81: 778, 82: 722, 83: 667, 84: 611, 85: 722, 86: 667, 87: 944, 88: 667, 89: 667, 90: 611,
  91: 278, 92: 278, 93: 278, 94: 469, 95: 556, 96: 333, 97: 556, 98: 556, 99: 500, 100: 556, 101: 556, 102: 278, 103: 556, 104: 556, 105: 222, 106: 222, 107: 500, 108: 222, 109: 833, 110: 556, 111: 556, 112: 556, 113: 556, 114: 333, 115: 500, 116: 278, 117: 556, 118: 500, 119: 722, 120: 500, 121: 500, 122: 500, 123: 334, 124: 260, 125: 334, 126: 584 };
const HELVB = { 32: 278, 33: 333, 34: 474, 35: 556, 36: 556, 37: 889, 38: 722, 39: 238, 40: 333, 41: 333, 42: 389, 43: 584, 44: 278, 45: 333, 46: 278, 47: 278,
  48: 556, 49: 556, 50: 556, 51: 556, 52: 556, 53: 556, 54: 556, 55: 556, 56: 556, 57: 556, 58: 333, 59: 333, 60: 584, 61: 584, 62: 584, 63: 611, 64: 975,
  65: 722, 66: 722, 67: 722, 68: 722, 69: 667, 70: 611, 71: 778, 72: 722, 73: 278, 74: 556, 75: 722, 76: 611, 77: 833, 78: 722, 79: 778, 80: 667, 81: 778, 82: 722, 83: 667, 84: 611, 85: 722, 86: 667, 87: 944, 88: 667, 89: 667, 90: 611,
  91: 333, 92: 278, 93: 333, 94: 584, 95: 556, 96: 333, 97: 556, 98: 611, 99: 556, 100: 611, 101: 556, 102: 333, 103: 611, 104: 611, 105: 278, 106: 278, 107: 556, 108: 278, 109: 889, 110: 611, 111: 611, 112: 611, 113: 611, 114: 389, 115: 556, 116: 333, 117: 611, 118: 556, 119: 778, 120: 556, 121: 556, 122: 500, 123: 389, 124: 280, 125: 389, 126: 584 };
// Unicode \u2192 WinAnsi (CP1252)
const WINANSI = { 0x20ac: 0x80, 0x201a: 0x82, 0x201e: 0x84, 0x2026: 0x85, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97 };
const WIDTH_ALIAS = { 0xc4: 65, 0xd6: 79, 0xdc: 85, 0xe4: 97, 0xf6: 111, 0xfc: 117, 0xe9: 101, 0xe8: 101, 0xe0: 97, 0xe1: 97, 0xc9: 69, 0xe7: 99, 0xf1: 110 };
function pdfBytesOf(s) {
  const out = [];
  for (const ch of String(s)) {
    const c = ch.codePointAt(0);
    if (c < 128) out.push(c); else if (WINANSI[c]) out.push(WINANSI[c]); else if (c < 256) out.push(c); else out.push(63);
  }
  return out;
}
function charWidth(code, bold) {
  const t = bold ? HELVB : HELV;
  if (t[code]) return t[code];
  if (WIDTH_ALIAS[code]) return t[WIDTH_ALIAS[code]];
  if (code === 0xdf) return 611; if (code === 0x80) return 556; if (code === 0x96) return 556; if (code === 0x97) return 1000;
  if (code === 0x84 || code === 0x93 || code === 0x94) return bold ? 500 : 333; if (code === 0xb7) return 278; if (code === 0x95) return 350;
  return 556;
}
function textWidth(s, size, bold) { return pdfBytesOf(s).reduce((a, c) => a + charWidth(c, bold), 0) * size / 1000; }
function pdfEscape(bytes) { return bytes.map((c) => (c === 40 || c === 41 || c === 92) ? '\\' + String.fromCharCode(c) : (c < 32 || c > 126) ? '\\' + c.toString(8).padStart(3, '0') : String.fromCharCode(c)).join(''); }
const rgb = (hex) => { const h = hex.replace('#', ''); return [0, 2, 4].map((i) => (parseInt(h.slice(i, i + 2), 16) / 255).toFixed(3)).join(' '); };

class PdfDoc {
  constructor() { this.pages = []; this.W = 595.28; this.H = 841.89; this.newPage(); }
  newPage() { this.cur = []; this.pages.push(this.cur); return this; }
  // y wird von oben gemessen (mm-\u00e4hnlich bequemer): top in pt
  text(x, top, s, o = {}) {
    const size = o.size || 10, bold = !!o.bold || !!o.italic; let tx = x;
    if (o.spacing) { let cx = o.align === 'right' ? x - (textWidth(s, size, bold) + o.spacing * (String(s).length - 1)) : x; for (const ch of String(s)) { this.text(cx, top, ch, { ...o, spacing: 0, align: 'left' }); cx += textWidth(ch, size, bold) + o.spacing; } return cx - x; }
    const w = textWidth(s, size, bold);
    if (o.align === 'right') tx = x - w; else if (o.align === 'center') tx = x - w / 2;
    this.cur.push(`BT /${o.italic ? 'F3' : bold ? 'F2' : 'F1'} ${size} Tf ${rgb(o.color || '#1a1a1a')} rg ${tx.toFixed(2)} ${(this.H - top - size).toFixed(2)} Td (${pdfEscape(pdfBytesOf(s))}) Tj ET`);
    return w;
  }
  line(x1, t1, x2, t2, o = {}) { this.cur.push(`${rgb(o.color || '#dadada')} RG ${o.w || 0.6} w ${x1.toFixed(2)} ${(this.H - t1).toFixed(2)} m ${x2.toFixed(2)} ${(this.H - t2).toFixed(2)} l S`); }
  // Fl\u00e4che mit abgerundeten Ecken
  rrect(x, top, w, h, r, o = {}) {
    const k = 0.5523 * r, y0 = this.H - top - h, f = (n) => n.toFixed(2);
    this.cur.push(`${rgb(o.fill || '#f4f4f4')} rg ${f(x + r)} ${f(y0)} m ${f(x + w - r)} ${f(y0)} l ${f(x + w - r + k)} ${f(y0)} ${f(x + w)} ${f(y0 + r - k)} ${f(x + w)} ${f(y0 + r)} c ${f(x + w)} ${f(y0 + h - r)} l ${f(x + w)} ${f(y0 + h - r + k)} ${f(x + w - r + k)} ${f(y0 + h)} ${f(x + w - r)} ${f(y0 + h)} c ${f(x + r)} ${f(y0 + h)} l ${f(x + r - k)} ${f(y0 + h)} ${f(x)} ${f(y0 + h - r + k)} ${f(x)} ${f(y0 + h - r)} c ${f(x)} ${f(y0 + r)} l ${f(x)} ${f(y0 + r - k)} ${f(x + r - k)} ${f(y0)} ${f(x + r)} ${f(y0)} c f`);
  }
  // Parallelogramm (Tempo-Strich des Logos)
  skew(x, top, w, h, slant, o = {}) { const y0 = this.H - top - h, f = (n) => n.toFixed(2); this.cur.push(`${rgb(o.fill || '#ffffff')} rg ${f(x)} ${f(y0)} m ${f(x + w)} ${f(y0)} l ${f(x + w + slant)} ${f(y0 + h)} l ${f(x + slant)} ${f(y0 + h)} l h f`); }
  page(i) { this.cur = this.pages[i]; return this; }
  rect(x, top, w, h, o = {}) { this.cur.push(`${rgb(o.fill || '#f4f4f4')} rg ${x.toFixed(2)} ${(this.H - top - h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`); }
  wrap(s, width, size = 10, bold = false) {
    const lines = [];
    for (const para of String(s ?? '').split('\n')) {
      let line = '';
      for (const word of para.split(/\s+/)) {
        if (!word) continue;
        const test = line ? line + ' ' + word : word;
        if (textWidth(test, size, bold) <= width) line = test;
        else { if (line) lines.push(line); line = word; while (textWidth(line, size, bold) > width && line.length > 1) { let cut = line.length - 1; while (cut > 1 && textWidth(line.slice(0, cut), size, bold) > width) cut--; lines.push(line.slice(0, cut)); line = line.slice(cut); } }
      }
      lines.push(line);
    }
    return lines;
  }
  finish() {
    const objs = []; const add = (s) => { objs.push(s); return objs.length; };
    const catalog = add(null), pagesId = add(null);
    const f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    const f2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    const f3 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-BoldOblique /Encoding /WinAnsiEncoding >>');
    const kids = [];
    for (const p of this.pages) {
      const content = p.join('\n');
      const cId = add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
      kids.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${this.W} ${this.H}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R /F3 ${f3} 0 R >> >> /Contents ${cId} 0 R >>`));
    }
    objs[catalog - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
    objs[pagesId - 1] = `<< /Type /Pages /Kids [${kids.map((k) => k + ' 0 R').join(' ')}] /Count ${kids.length} >>`;
    let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'; const offsets = [];
    objs.forEach((o, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
    const xref = pdf.length;
    pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offsets.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('');
    pdf += `trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;
    const u8 = new Uint8Array(pdf.length); for (let i = 0; i < pdf.length; i++) u8[i] = pdf.charCodeAt(i) & 255; return u8;
  }
}
const mm = (v) => v * 2.8346;

/* ---------- Gesch\u00e4ftsbrief im KFL-Design (DIN 5008 Form B, Infospalte rechts) ---------- */
const PDF_C = { orange: '#ff6c01', ink: '#16171a', grey: '#6b6e74', light: '#9a9da3', line: '#e3e4e7', wash: '#f5f6f7', owash: '#fff3ea' };
// KFL-Logo als Vektor: orange Kachel, \u201eKFL\u201c kursiv mit Tempo-Strich, KAUFEN / FINANZIEREN / LEASEN
function pdfLogo(doc, x, top, size) {
  const u = size / 100;
  doc.rrect(x, top, size, size, 6 * u, { fill: PDF_C.orange });
  doc.text(x + 9 * u, top + 10 * u, 'KFL', { size: 36 * u, italic: true, color: '#ffffff' });
  doc.skew(x + 68 * u, top + 30 * u, 20 * u, 4.2 * u, 2.4 * u, { fill: '#ffffff' });
  doc.text(x + 10 * u, top + 52 * u, 'KAUFEN', { size: 13.2 * u, bold: true, color: '#ffffff', spacing: 0.25 * u });
  doc.text(x + 10.4 * u, top + 67 * u, 'FINANZIEREN', { size: 8.6 * u, bold: true, color: '#ffd9bd', spacing: 0.35 * u });
  doc.text(x + 10 * u, top + 77 * u, 'LEASEN', { size: 13.2 * u, bold: true, color: '#ffffff', spacing: 0.25 * u });
}
const caps = (doc, x, top, t, o = {}) => doc.text(x, top, String(t).toUpperCase(), { size: 5.8, bold: true, color: PDF_C.light, spacing: 0.45, ...o });
// Infospalte rechts: Firma, Kontakt, Steuer, Bank \u2013 liefert die Unterkante
function pdfSidebar(doc, s, x, top, w) {
  let y = top;
  doc.text(x, y, s.company_name, { size: 11.5, bold: true, color: PDF_C.ink }); y += 14;
  caps(doc, x, y, 'Kaufen \u00b7 Finanzieren \u00b7 Leasen'); y += 12;
  for (const l of [s.company_street, `${s.company_zip} ${s.company_city}`]) { doc.text(x, y, l, { size: 8.2, color: PDF_C.ink }); y += 10.5; }
  y += 6;
  const block = (label, lines) => { lines = lines.filter(Boolean); if (!lines.length) return; caps(doc, x, y, label); y += 8.5; for (const l of lines) for (const wl of doc.wrap(l, w, 8.2)) { doc.text(x, y, wl, { size: 8.2, color: PDF_C.ink }); y += 10.5; } y += 6; };
  block('Telefon', [s.company_phone]);
  block('E-Mail', [s.company_email]);
  block('Web', [s.company_web]);
  block('USt-IdNr.', [s.company_vat_id]);
  block('Steuernummer', [s.company_tax_no]);
  block('Bankverbindung', [s.company_bank, s.company_iban ? fmtIban(s.company_iban) : '', s.company_bic ? 'BIC ' + s.company_bic : '']);
  return y;
}
const fmtIban = (v) => String(v || '').replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim();
function pdfLetterBase(doc, s, recipient, meta, title, o = {}) {
  const L = mm(22), R = doc.W - mm(16), SX = doc.W - mm(58), SW = R - SX;
  doc.rect(0, 0, mm(3), doc.H, { fill: PDF_C.orange });
  pdfLogo(doc, SX, mm(14), mm(24));
  const sideEnd = pdfSidebar(doc, s, SX, mm(44), SW);
  // Absenderzeile + Anschriftfeld (Fensterposition DIN 5008 Form B)
  doc.text(L, mm(46), `${s.company_name} \u00b7 ${s.company_street} \u00b7 ${s.company_zip} ${s.company_city}`, { size: 6.8, color: PDF_C.grey });
  doc.line(L, mm(49.2), L + mm(85), mm(49.2), { color: PDF_C.line, w: 0.5 });
  let y = mm(52);
  for (const l of [recipient.name, recipient.extra, recipient.street, `${recipient.zip || ''} ${recipient.city || ''}`.trim(), recipient.country && recipient.country !== 'Deutschland' ? recipient.country : ''].filter(Boolean)) { doc.text(L, y, l, { size: 10.5, color: PDF_C.ink, bold: l === recipient.name }); y += 14; }
  // Titel
  let ty = Math.max(mm(98), sideEnd + mm(4));
  if (o.kicker) caps(doc, L, ty, o.kicker, { color: o.kickerColor || PDF_C.orange, size: 6.8 });
  doc.text(L, ty + 10, title, { size: 22, bold: true, color: PDF_C.ink });
  if (o.number) doc.text(L + textWidth(title, 22, true) + 8, ty + 18.5, o.number, { size: 11, bold: true, color: PDF_C.orange });
  // Kennzahlen-Leiste (Nummer, Datum, F\u00e4lligkeit \u2026)
  const cells = meta.filter(([, v]) => v);
  const by = ty + 44, bh = 32;
  const nat = cells.map(([k, v]) => Math.max(textWidth(String(k).toUpperCase(), 5.8, true) + String(k).length * 0.45, textWidth(v, 9.2, true)) + 24);
  const extra = Math.max(0, (R - L) - nat.reduce((a, b) => a + b, 0)) / Math.max(1, cells.length);
  const xs = nat.reduce((a, w, i) => { a.push(i ? a[i - 1] + nat[i - 1] + extra : L); return a; }, []);
  doc.rrect(L, by, R - L, bh, 5, { fill: PDF_C.wash });
  cells.forEach(([k, v, hl], i) => {
    const cx = xs[i] + 12;
    caps(doc, cx, by + 7, k, { color: hl ? PDF_C.orange : PDF_C.light });
    doc.text(cx, by + 16, v, { size: 9.2, bold: true, color: hl ? PDF_C.orange : PDF_C.ink });
    if (i) doc.line(cx - 12, by + 7, cx - 12, by + bh - 7, { color: '#dcdde0', w: 0.5 });
  });
  return { L, R, y: by + bh + 22 };
}
function pdfFooter(doc, s) {
  const L = mm(22), R = doc.W - mm(16), top = doc.H - mm(22);
  doc.line(L, top - 8, R, top - 8, { color: PDF_C.line, w: 0.5 });
  const cols = [
    ['Anschrift', [s.company_name, s.company_street, `${s.company_zip} ${s.company_city}`, s.company_owners ? 'Gesellschafter: ' + s.company_owners : '']],
    ['Kontakt', [s.company_email, s.company_phone ? 'Tel. ' + s.company_phone : '', s.company_web]],
    ['Steuer', [s.company_vat_id ? 'USt-IdNr. ' + s.company_vat_id : '', s.company_tax_no ? 'St.-Nr. ' + s.company_tax_no : '', s.company_register]],
    ['Bankverbindung', [s.company_bank, s.company_iban ? 'IBAN ' + fmtIban(s.company_iban) : '', s.company_bic ? 'BIC ' + s.company_bic : '']]
  ].filter(([, l]) => l.some(Boolean));
  const cw = (R - L) / cols.length;
  cols.forEach(([h, lines], i) => { const x = L + i * cw; caps(doc, x, top, h, { size: 5.4 }); let y = top + 8.5; for (const l of lines.filter(Boolean)) { doc.text(x, y, l, { size: 6.6, color: PDF_C.grey }); y += 8.4; } });
}
// Seitenzahlen nachtr\u00e4glich auf alle Seiten setzen
function pdfPageNumbers(doc) { const n = doc.pages.length; if (n < 2) return; doc.pages.forEach((_, i) => { doc.page(i); doc.text(doc.W - mm(16), doc.H - mm(9), `Seite ${i + 1} von ${n}`, { size: 6.6, align: 'right', color: PDF_C.light }); }); doc.page(n - 1); }

function renderInvoicePdf(s, inv) {
  const doc = new PdfDoc();
  const rc = jparse(inv.recipient, {}), lines = jparse(inv.lines, []);
  const isCredit = inv.kind === 'storno';
  const period = inv.service_from && inv.service_to && inv.service_from !== inv.service_to;
  const meta = [['Rechnungsnummer', inv.number], ['Rechnungsdatum', fmtDateDE(inv.issue_date)],
    [period ? 'Leistungszeitraum' : 'Leistungsdatum', period ? `${fmtDateDE(inv.service_from)} \u2013 ${fmtDateDE(inv.service_to)}` : inv.service_from ? fmtDateDE(inv.service_from) : ''],
    ['Kundennummer', rc.customer_no], ['Ihre USt-IdNr.', rc.vat_id], isCredit ? ['Bezug', String(inv.note || '').replace(/^Storno zu /, '')] : ['F\u00e4llig am', fmtDateDE(inv.due_date), true]];
  let { L, R, y } = pdfLetterBase(doc, s, rc, meta, isCredit ? 'Stornorechnung' : 'Rechnung', { kicker: isCredit ? 'Gutschrift / Storno' : '', kickerColor: '#c4291c', number: inv.number });
  doc.text(L, y, rc.salutation || 'Sehr geehrte Damen und Herren,', { size: 10, color: PDF_C.ink }); y += 18;
  const ref = isCredit ? String(inv.note || '').replace(/^Storno zu /, '') : '';
  for (const l of doc.wrap(inv.intro || (isCredit ? `hiermit stornieren wir die Rechnung ${ref}. Die folgenden Positionen werden gutgeschrieben:` : s.invoice_intro), R - L, 10)) { doc.text(L, y, l, { size: 10, color: PDF_C.ink }); y += 13.5; }
  y += 12;
  const cx = { pos: L + 8, desc: L + mm(12), qty: R - mm(58), unit: R - mm(30), total: R - 8 };
  const head = () => {
    doc.rrect(L, y - 5, R - L, 20, 4, { fill: PDF_C.ink });
    const h = (x, t, al) => caps(doc, x, y + 1.5, t, { color: '#ffffff', size: 6.2, align: al });
    h(cx.pos, 'Pos.'); h(cx.desc, 'Beschreibung'); h(cx.qty, 'Menge', 'right'); h(cx.unit, 'Einzelpreis', 'right'); h(cx.total, 'Gesamt netto', 'right');
    y += 26;
  };
  head();
  lines.forEach((ln, i) => {
    const descLines = doc.wrap(ln.description, cx.qty - cx.desc - mm(14), 9.5);
    if (y + descLines.length * 12.5 > doc.H - mm(36)) { pdfFooter(doc, s); doc.newPage(); doc.rect(0, 0, mm(3), doc.H, { fill: PDF_C.orange }); y = mm(22); head(); }
    if (i % 2 === 1) doc.rect(L, y - 6, R - L, descLines.length * 12.5 + 10, { fill: '#fafafb' });
    doc.text(cx.pos, y, String(i + 1).padStart(2, '0'), { size: 9.5, color: PDF_C.light, bold: true });
    descLines.forEach((dl, k) => doc.text(cx.desc, y + k * 12.5, dl, { size: 9.5, color: PDF_C.ink, bold: k === 0 && descLines.length > 1 }));
    doc.text(cx.qty, y, String(ln.qty ?? 1).replace('.', ','), { size: 9.5, align: 'right', color: PDF_C.ink });
    doc.text(cx.unit, y, money(ln.unit), { size: 9.5, align: 'right', color: PDF_C.ink });
    doc.text(cx.total, y, money(ln.total), { size: 9.5, align: 'right', bold: true, color: PDF_C.ink });
    y += Math.max(1, descLines.length) * 12.5 + 8;
    doc.line(L, y - 4, R, y - 4, { color: PDF_C.line, w: 0.5 });
  });
  y += 10;
  // Summen rechts, Gesamtbetrag als orange Fl\u00e4che
  const TX = R - mm(78);
  const tot = [['Zwischensumme netto', money(inv.net)], [inv.vat_rate ? `zzgl. ${String(inv.vat_rate).replace('.', ',')} % Umsatzsteuer` : 'Umsatzsteuer', money(inv.vat)]];
  if (y > doc.H - mm(95)) { pdfFooter(doc, s); doc.newPage(); doc.rect(0, 0, mm(3), doc.H, { fill: PDF_C.orange }); y = mm(22); }
  for (const [k, v] of tot) { doc.text(TX + 10, y, k, { size: 9.2, color: PDF_C.grey }); doc.text(R - 10, y, v, { size: 9.2, align: 'right', color: PDF_C.ink }); y += 15; }
  y += 4;
  doc.rrect(TX, y - 7, R - TX, 30, 5, { fill: isCredit ? '#c4291c' : PDF_C.orange });
  caps(doc, TX + 10, y + 5, isCredit ? 'Gutschriftsbetrag' : 'Rechnungsbetrag', { color: '#ffffff', size: 6.8 });
  doc.text(R - 10, y - 0.5, money(inv.gross), { size: 15, bold: true, align: 'right', color: '#ffffff' });
  y += 44;
  if (!inv.vat_rate && !s.vat_enabled) { doc.text(L, y, 'Gem\u00e4\u00df \u00a7 19 UStG wird keine Umsatzsteuer berechnet.', { size: 8.8, color: PDF_C.grey }); y += 16; }
  // Zahlungshinweis
  if (!isCredit) {
    const rows = [['Zahlbar bis', `${fmtDateDE(inv.due_date)} ohne Abzug`], ['Verwendungszweck', inv.number], s.company_iban ? ['IBAN', fmtIban(s.company_iban)] : null, s.company_bank ? ['Bank', [s.company_bank, s.company_bic ? 'BIC ' + s.company_bic : ''].filter(Boolean).join(' \u00b7 ')] : null].filter(Boolean);
    const bh = 22 + rows.length * 13;
    doc.rrect(L, y, R - L, bh, 6, { fill: PDF_C.owash });
    doc.rect(L + 7, y + 8, 2.2, bh - 16, { fill: PDF_C.orange });
    caps(doc, L + 16, y + 9, 'Zahlungsinformationen', { color: PDF_C.orange });
    rows.forEach(([k, v], i) => { doc.text(L + 16, y + 21 + i * 13, k, { size: 8.8, color: PDF_C.grey }); doc.text(L + mm(40), y + 21 + i * 13, v, { size: 8.8, bold: true, color: PDF_C.ink }); });
    y += bh + 16;
    for (const l of doc.wrap(s.invoice_footer || '', R - L, 8.8)) { doc.text(L, y, l, { size: 8.8, color: PDF_C.grey }); y += 12; }
  } else { for (const l of doc.wrap('Der Betrag wird mit der urspr\u00fcnglichen Rechnung verrechnet. Sollte diese bereits bezahlt sein, erstatten wir Ihnen den Betrag.', R - L, 8.8)) { doc.text(L, y, l, { size: 8.8, color: PDF_C.grey }); y += 12; } }
  y += 14;
  if (y < doc.H - mm(40)) {
    doc.text(L, y, 'Vielen Dank f\u00fcr die gute Zusammenarbeit.', { size: 10, color: PDF_C.ink }); y += 22;
    doc.text(L, y, 'Ihr ', { size: 10, color: PDF_C.ink }); doc.text(L + textWidth('Ihr ', 10, false), y, 'KFL', { size: 10, italic: true, color: PDF_C.orange }); doc.text(L + textWidth('Ihr ', 10, false) + textWidth('KFL', 10, true) + 3, y, 'Team', { size: 10, color: PDF_C.ink });
  }
  pdfFooter(doc, s);
  pdfPageNumbers(doc);
  return doc.finish();
}

function renderDunningPdf(s, inv, level, fee, dueDate, openAmount) {
  const doc = new PdfDoc();
  const rc = jparse(inv.recipient, {});
  const title = DUNNING_LEVELS[level] || 'Mahnung';
  let { L, R, y } = pdfLetterBase(doc, s, rc, [['Datum', fmtDateDE(nowIso())], ['Rechnungsnummer', inv.number], ['Kundennummer', rc.customer_no], ['Zahlbar bis', fmtDateDE(dueDate), true]], title, { kicker: level === 1 ? 'Zahlungserinnerung' : 'Mahnung', kickerColor: level >= 2 ? '#c4291c' : PDF_C.orange, number: inv.number });
  const text = level === 1
    ? `Sehr geehrte Damen und Herren,\n\nsicher ist es Ihrer Aufmerksamkeit entgangen: Zu unserer Rechnung ${inv.number} vom ${fmtDateDE(inv.issue_date)} konnten wir bis heute keinen vollst\u00e4ndigen Zahlungseingang feststellen. Diese Zahlungserinnerung ist f\u00fcr Sie selbstverst\u00e4ndlich kostenfrei. Wir bitten Sie, den offenen Betrag bis zum ${fmtDateDE(dueDate)} zu \u00fcberweisen. Sollten Sie die Zahlung bereits veranlasst haben, betrachten Sie dieses Schreiben bitte als gegenstandslos.`
    : level === 2
      ? `Sehr geehrte Damen und Herren,\n\ntrotz unserer Zahlungserinnerung ist die Rechnung ${inv.number} vom ${fmtDateDE(inv.issue_date)} weiterhin nicht vollst\u00e4ndig beglichen. Sie befinden sich damit in Zahlungsverzug. Bitte \u00fcberweisen Sie den offenen Gesamtbetrag einschlie\u00dflich der Mahngeb\u00fchr bis zum ${fmtDateDE(dueDate)}.`
      : `Sehr geehrte Damen und Herren,\n\nleider ist die Rechnung ${inv.number} vom ${fmtDateDE(inv.issue_date)} trotz Zahlungserinnerung und 1. Mahnung weiterhin offen. Dies ist unsere letzte Mahnung. Bitte \u00fcberweisen Sie den offenen Gesamtbetrag einschlie\u00dflich der Mahngeb\u00fchren bis sp\u00e4testens ${fmtDateDE(dueDate)}. Geht bis dahin keine Zahlung ein, \u00fcbergeben wir die Forderung ohne weitere Ank\u00fcndigung an ein Inkassounternehmen bzw. leiten das gerichtliche Mahnverfahren ein. Die dadurch entstehenden Kosten gehen zu Ihren Lasten.`;
  for (const l of doc.wrap(text, R - L, 10)) { doc.text(L, y, l, { size: 10 }); y += 13.5; }
  y += 12;
  const rows = [['Rechnungsbetrag', money(inv.gross)], ['Bereits bezahlt', money(inv.paid)], ['Bisherige Mahngeb\u00fchren', money(inv.fees)], level >= 2 && fee ? ['Mahngeb\u00fchr dieser Mahnung', money(fee)] : null].filter(Boolean);
  for (const [k, v] of rows) { doc.text(R - mm(60), y, k, { size: 10, color: '#6b6b70' }); doc.text(R, y, v, { size: 10, align: 'right' }); y += 15; }
  doc.line(R - mm(60), y, R, y, { color: '#1a1a1a', w: 0.8 }); y += 6;
  doc.text(R - mm(60), y, 'Offener Betrag', { size: 11, bold: true }); doc.text(R, y, money(openAmount), { size: 11, bold: true, align: 'right' }); y += 28;
  if (s.company_iban) { doc.text(L, y, `Bankverbindung: ${[s.company_bank, 'IBAN ' + s.company_iban, s.company_bic ? 'BIC ' + s.company_bic : ''].filter(Boolean).join(' \u00b7 ')}`, { size: 9.5 }); y += 13; doc.text(L, y, `Verwendungszweck: ${inv.number}`, { size: 9.5, bold: true }); y += 20; }
  doc.text(L, y, 'Mit freundlichen Gr\u00fc\u00dfen', { size: 10 }); doc.text(L, y + 14, `${s.company_name} \u2013 Buchhaltung`, { size: 10 });
  pdfFooter(doc, s);
  pdfPageNumbers(doc);
  return doc.finish();
}

// Einfacher Tabellen-Bericht (z. B. Partner-Bericht 30/60 Tage)
function renderReportPdf(s, title, subtitle, sections) {
  const doc = new PdfDoc();
  const L = mm(20), R = doc.W - mm(20);
  doc.rect(0, 0, doc.W, mm(4), { fill: '#ff6c01' });
  doc.text(L, mm(12), title, { size: 18, bold: true }); doc.text(L, mm(20), subtitle, { size: 9.5, color: '#6b6b70' });
  let y = mm(30);
  for (const sec of sections) {
    if (y > doc.H - mm(40)) { doc.newPage(); y = mm(20); }
    doc.text(L, y, sec.title, { size: 12, bold: true }); y += 18;
    const cols = sec.columns, widths = sec.widths || cols.map(() => (R - L) / cols.length);
    const xs = widths.reduce((a, w, i) => { a.push(i ? a[i - 1] + widths[i - 1] : L); return a; }, []);
    doc.rect(L - 3, y - 3, R - L + 6, 16, { fill: '#f4f4f4' });
    cols.forEach((c, i) => doc.text(xs[i], y, c, { size: 8.5, bold: true })); y += 18;
    for (const row of sec.rows) {
      if (y > doc.H - mm(20)) { doc.newPage(); y = mm(20); }
      row.forEach((c, i) => doc.text(xs[i], y, doc.wrap(String(c ?? ''), widths[i] - 4, 8.5)[0] || '', { size: 8.5 })); y += 13;
    }
    y += 14;
  }
  return doc.finish();
}


/* ===== 10-sepa.js ===== */
/* ============================================================
   SEPA-\u00dcberweisungsdatei (pain.001.001.09) f\u00fcr den Bank-Import
   ============================================================ */

function sepaText(s, max = 70) {
  return String(s ?? '').replace(/\u00c4/g, 'Ae').replace(/\u00d6/g, 'Oe').replace(/\u00dc/g, 'Ue').replace(/\u00e4/g, 'ae').replace(/\u00f6/g, 'oe').replace(/\u00fc/g, 'ue').replace(/\u00df/g, 'ss')
    .replace(/[^A-Za-z0-9 /\-?:().,'+]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}
const xmlEsc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
const ibanClean = (i) => String(i || '').replace(/\s+/g, '').toUpperCase();
function ibanValid(iban) {
  const s = ibanClean(iban);
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(s)) return false;
  const r = (s.slice(4) + s.slice(0, 4)).replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let m = 0; for (const ch of r) m = (m * 10 + +ch) % 97; return m === 1;
}

function buildSepaXml(s, { msgId, execDate, items }) {
  const total = round2(items.reduce((a, i) => a + i.amount, 0));
  const created = new Date(nowMs()).toISOString().slice(0, 19);
  const bic = s.company_bic ? `<DbtrAgt><FinInstnId><BICFI>${xmlEsc(s.company_bic.replace(/\s+/g, ''))}</BICFI></FinInstnId></DbtrAgt>` : '<DbtrAgt><FinInstnId><Othr><Id>NOTPROVIDED</Id></Othr></FinInstnId></DbtrAgt>';
  const tx = items.map((i, n) => `
      <CdtTrfTxInf>
        <PmtId><EndToEndId>${xmlEsc(sepaText(i.endToEnd || (msgId + '-' + (n + 1)), 35))}</EndToEndId></PmtId>
        <Amt><InstdAmt Ccy="EUR">${i.amount.toFixed(2)}</InstdAmt></Amt>
        ${i.bic ? `<CdtrAgt><FinInstnId><BICFI>${xmlEsc(i.bic.replace(/\s+/g, ''))}</BICFI></FinInstnId></CdtrAgt>` : ''}
        <Cdtr><Nm>${xmlEsc(sepaText(i.name))}</Nm></Cdtr>
        <CdtrAcct><Id><IBAN>${xmlEsc(ibanClean(i.iban))}</IBAN></Id></CdtrAcct>
        <RmtInf><Ustrd>${xmlEsc(sepaText(i.purpose, 140))}</Ustrd></RmtInf>
      </CdtTrfTxInf>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.09" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${xmlEsc(sepaText(msgId, 35))}</MsgId>
      <CreDtTm>${created}</CreDtTm>
      <NbOfTxs>${items.length}</NbOfTxs>
      <CtrlSum>${total.toFixed(2)}</CtrlSum>
      <InitgPty><Nm>${xmlEsc(sepaText(s.company_name))}</Nm></InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${xmlEsc(sepaText(msgId + '-P', 35))}</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <NbOfTxs>${items.length}</NbOfTxs>
      <CtrlSum>${total.toFixed(2)}</CtrlSum>
      <PmtTpInf><SvcLvl><Cd>SEPA</Cd></SvcLvl></PmtTpInf>
      <ReqdExctnDt><Dt>${execDate}</Dt></ReqdExctnDt>
      <Dbtr><Nm>${xmlEsc(sepaText(s.company_name))}</Nm></Dbtr>
      <DbtrAcct><Id><IBAN>${xmlEsc(ibanClean(s.company_iban))}</IBAN></Id></DbtrAcct>
      ${bic}
      <ChrgBr>SLEV</ChrgBr>${tx}
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`;
}


/* ===== 20-auth.js ===== */
/* ============================================================
   Anmeldung: Mitarbeiter (Cookie kfl_s) und Gesch\u00e4ftspartner (Cookie kfl_p)
   Passw\u00f6rter PBKDF2, Sperre nach 5 Fehlversuchen, Sitzungen 12 h,
   gesch\u00fctzte Bereiche (Protokoll, Backup) mit Zusatzpasswort.
   ============================================================ */

const SESSION_HOURS = 12;
const INVITE_DAYS = 7;
const AREA_MINUTES = 30;
const STAFF_COOKIE = 'kfl_s';
const PARTNER_COOKIE = 'kfl_p';

function readCookie(request, name) {
  const h = request.headers.get('Cookie') || '';
  for (const part of h.split(';')) { const [k, ...v] = part.trim().split('='); if (k === name) return v.join('='); }
  return null;
}
const cookieHeader = (name, token, maxAge) => `${name}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;

async function createSessionRow(db, table, userId) {
  const token = randomHex(32);
  await DB.run(db, `INSERT INTO ${table} (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)`, await sha256Hex(token), userId, isoOf(nowMs() + SESSION_HOURS * 3600e3), nowIso());
  return { token, maxAge: SESSION_HOURS * 3600 };
}
async function newInvite() {
  const token = randomHex(32);
  return { token, hash: await sha256Hex(token), expires: isoOf(nowMs() + INVITE_DAYS * 86400e3) };
}

/* ---------- Mitarbeiter ---------- */
function effectivePerms(row) {
  if (row.role_key === 'admin') return new Set(PERM_KEYS);
  const p = new Set([...jparse(row.perms, []), ...jparse(row.extra_perms, [])]);
  for (const x of jparse(row.revoked_perms, [])) p.delete(x);
  return p;
}
async function currentStaff(ctx) {
  if (ctx._staff !== undefined) return ctx._staff;
  ctx._staff = null;
  const token = readCookie(ctx.request, STAFF_COOKIE);
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
  const row = await DB.one(ctx.db, `SELECT u.*, s.expires_at, s.area_until, s.token_hash, r.perms, r.name AS role_name FROM sessions s JOIN users u ON u.id = s.user_id
    LEFT JOIN roles r ON r.key = u.role_key WHERE s.token_hash = ?`, await sha256Hex(token));
  if (!row || !row.active || row.expires_at < nowIso() || (row.locked_until && row.locked_until > nowIso() && row.locked_until > '9000')) return null;
  const today = berlinDate(nowMs());
  const subs = (await DB.all(ctx.db, "SELECT user_id FROM absences WHERE substitute_id = ? AND status = 'bestaetigt' AND from_date <= ? AND to_date >= ?", row.id, today, today)).map((r) => r.user_id);
  const u = { id: row.id, email: row.email, name: row.name, role: row.role_key, roleLabel: (STAFF_ROLES[row.role_key] || {}).label || row.role_name || row.role_key,
    rank: (STAFF_ROLES[row.role_key] || { rank: 0 }).rank, perms: effectivePerms(row), extra: jparse(row.extra_perms, []), revoked: jparse(row.revoked_perms, []),
    mustChangePw: !!row.must_change_pw, areaUntil: row.area_until, tokenHash: row.token_hash, subs, prevLogin: row.prev_login };
  ctx._staff = u;
  ctx.actor = { type: 'staff', id: u.id, name: u.name };
  return u;
}
const can = (u, perm) => !!u && u.perms.has(perm);
function requirePerm(u, perm) { need(u, 401, 'Bitte melde dich an.'); need(can(u, perm), 403, 'Daf\u00fcr fehlt dir die Berechtigung.'); }
const areaUnlocked = (u) => !!u && !!u.areaUntil && u.areaUntil > nowIso();
function requireArea(u, perm) { requirePerm(u, perm); need(areaUnlocked(u), 423, 'Dieser Bereich ist zus\u00e4tzlich gesch\u00fctzt. Bitte gib das Bereichspasswort ein.'); }

// Bereichspasswort (Protokoll/Backup). Standard laut Vorgabe, als Hash gespeichert, vom Admin \u00e4nderbar.
// Startwert laut Vorgabe \u2013 nur als PBKDF2-Hash hinterlegt
const DEFAULT_AREA_HASH = { salt: 'kfl-area-2026-10', hash: 'ee1cf79402a417ca96f3f99861cefb748e01c56be773ee20dd7b89489dc44a3e' };
async function areaPasswordOk(ctx, password) {
  const raw = await rawSetting(ctx.db, '_area_pw');
  if (raw) { const o = jparse(raw, {}); return verifyPassword(password, o.hash, o.salt); }
  if (ctx.env.AREA_PASSWORD) return safeEqual(String(password || ''), String(ctx.env.AREA_PASSWORD));
  return verifyPassword(password, DEFAULT_AREA_HASH.hash, DEFAULT_AREA_HASH.salt);
}
// Freigabepasswort f\u00fcr die Angebotsauswahl (Startwert laut Vorgabe, nur als Hash hinterlegt)
async function scoringPasswordOk(ctx, password) {
  if (!password) return false;
  const raw = await rawSetting(ctx.db, '_scoring_pw');
  if (raw) { const o = jparse(raw, {}); return verifyPassword(password, o.hash, o.salt); }
  if (ctx.env.SCORING_PASSWORD) return safeEqual(String(password), String(ctx.env.SCORING_PASSWORD));
  return verifyPassword(password, DEFAULT_AREA_HASH.hash, DEFAULT_AREA_HASH.salt);
}
async function setAreaPassword(ctx, password) { const h = await hashPassword(password); await setRawSetting(ctx.db, '_area_pw', JSON.stringify(h)); }

async function loginGeneric(ctx, table, sessTable, email, password) {
  const u = await DB.one(ctx.db, `SELECT * FROM ${table} WHERE email = ?`, email);
  const generic = 'E-Mail oder Passwort ist falsch.';
  if (!u || !u.active || !u.pass_hash) { await hashPassword(password || 'x', 'timing-protect'); return { error: generic, status: 401 }; }
  if (table === 'partner_users') { const org = await DB.one(ctx.db, 'SELECT active, deleted FROM orgs WHERE id = ?', u.org_id); if (!org || !org.active || org.deleted) return { error: 'Dieses Partnerkonto ist derzeit nicht aktiv. Bitte wende dich an den KFL-Support.', status: 403 }; }
  if (u.locked_until && u.locked_until > nowIso()) return { error: u.locked_until > '9000' ? 'Dieses Konto ist gesperrt. Bitte wende dich an die Administration.' : 'Zu viele Fehlversuche. Bitte in 15 Minuten erneut versuchen.', status: 429 };
  if (!(await verifyPassword(password, u.pass_hash, u.pass_salt))) {
    const f = (u.failed_logins || 0) + 1, lock = f >= 5 ? isoOf(nowMs() + 15 * 60e3) : null;
    await DB.run(ctx.db, `UPDATE ${table} SET failed_logins = ?, locked_until = COALESCE(?, locked_until) WHERE id = ?`, lock ? 0 : f, lock, u.id);
    ctx.actor = { type: table === 'users' ? 'staff' : 'partner', id: u.id, name: u.name };
    await audit(ctx, lock ? 'login_gesperrt' : 'login_fehlgeschlagen', table === 'users' ? 'mitarbeiter' : 'partner', u.id, email);
    return { error: generic, status: 401 };
  }
  await DB.run(ctx.db, `UPDATE ${table} SET failed_logins = 0, locked_until = CASE WHEN locked_until > '9000' THEN locked_until ELSE NULL END, prev_login = last_login, last_login = ? WHERE id = ?`, nowIso(), u.id);
  const s = await createSessionRow(ctx.db, sessTable, u.id);
  ctx.actor = { type: table === 'users' ? 'staff' : 'partner', id: u.id, name: u.name };
  await audit(ctx, 'login', table === 'users' ? 'mitarbeiter' : 'partner', u.id, null);
  return { session: s, user: u };
}

/* ---------- Gesch\u00e4ftspartner ---------- */
async function currentPartner(ctx) {
  if (ctx._partner !== undefined) return ctx._partner;
  ctx._partner = null;
  const token = readCookie(ctx.request, PARTNER_COOKIE);
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
  const row = await DB.one(ctx.db, `SELECT u.*, s.expires_at FROM partner_sessions s JOIN partner_users u ON u.id = s.user_id WHERE s.token_hash = ?`, await sha256Hex(token));
  if (!row || !row.active || row.expires_at < nowIso() || (row.locked_until && row.locked_until > '9000')) return null;
  const org = await DB.one(ctx.db, 'SELECT * FROM orgs WHERE id = ?', row.org_id);
  if (!org || !org.active || org.deleted) return null;
  const p = { id: row.id, orgId: row.org_id, email: row.email, name: row.name, role: row.role, rank: (PARTNER_ROLES[row.role] || { rank: 1 }).rank,
    roleLabel: (PARTNER_ROLES[row.role] || {}).label || row.role, phone: row.phone, mustChangePw: !!row.must_change_pw,
    consentsOk: !!(row.agb_at && row.privacy_at), prevLogin: row.prev_login, lastLogin: row.last_login, org };
  ctx._partner = p;
  ctx.actor = { type: 'partner', id: p.id, name: `${p.name} (${org.name})` };
  return p;
}
function requirePartner(p, minRole) {
  need(p, 401, 'Bitte melde dich an.');
  if (minRole) need(p.rank >= PARTNER_ROLES[minRole].rank, 403, 'Diese Funktion steht deiner Rolle nicht zur Verf\u00fcgung.');
}

/* ---------- Kunden-Token (Shopify-Konto, signiert vom Theme) ---------- */
async function verifyCustomerToken(env, b, scope = 'my', maxAgeSec = 12 * 3600) {
  const kid = String(b._kid || ''), ts = parseInt(b._ts || '0', 10);
  if (!/^[0-9]{3,20}$/.test(kid)) return { error: 'Bitte zuerst anmelden', status: 401 };
  const expected = await hmacHex(env.FORM_SECRET, `${kid}.${ts}.${scope}`);
  if (typeof b._sig !== 'string' || !safeEqual(b._sig, expected)) return { error: 'Signatur ung\u00fcltig', status: 403 };
  if (!ts || Math.abs(nowMs() / 1000 - ts) > maxAgeSec) return { error: 'Sitzung abgelaufen, bitte Seite neu laden', status: 403 };
  return { kid };
}
// signierte Links in E-Mails (R\u00fcckfrage ja/nein, Umfrage)
async function linkToken(env, ...parts) { return (await hmacHex(serverKey(env), parts.join('|'))).slice(0, 40); }


/* ===== 30-engine.js ===== */
/* ============================================================
   Anfragen-Engine: Eingang \u2192 Verteilung \u2192 Angebote \u2192 Auswertung \u2192
   Vorstellung beim Kunden \u2192 \u201eInteressiert mich\u201c \u2192 Kontakt \u2192 Abrechnung
   ============================================================ */

const PERSONAL_KEY = /^(vorname|nachname|name|email|e-mail|phone|telefon|mobil|handy|stra\u00dfe|strasse|hausnummer|adresse|anschrift|ort|wohnort|stadt|kundennummer|kundenkonto-id|firma|firmenname)$/i;
const HIDDEN_KEY = /^(_|form$|form_type$|utf8$|Firma2$|Formular$|Eingang \(Server\)$|Ge\u00e4ndert \(Server\)$|Einwilligung|AGB akzeptiert|Datenschutz akzeptiert|Weitergabe an Partner)/;
const PAY_LABEL = { kaufen: 'Kaufen', finanzieren: 'Finanzieren', leasen: 'Leasen' };

/* ---------- Spalten aus den Formulardaten ---------- */
function requestColumns(type, d) {
  const name = [d.Vorname, d.name].filter(Boolean).join(' ').trim();
  const brandRaw = d['Marke (Freitext)'] || (d.Marke === 'Andere' ? '' : d.Marke) || '';
  const modelRaw = d['Modell (Freitext)'] || (d.Modell === 'Anderes Modell' || d.Modell === 'Noch offen' ? '' : d.Modell) || '';
  let brand = clean(brandRaw), model = clean(modelRaw);
  if (!brand && d['Marke und Modell']) { const v = clean(d['Marke und Modell']); brand = v.split(/\s+/)[0] || ''; model = v.slice(brand.length).trim(); }
  const vehicle = [brand === 'Noch offen' ? 'Fahrzeug noch offen' : brand, model, clean(d.Modellvariante)].filter(Boolean).join(' ');
  const zustand = type === 'sell' ? 'Gebrauchtwagen' : (d.Zustand || '');
  const pay = type === 'sell' ? 'verkaufen' : String(d.Bezahlart || '').toLowerCase();
  const budget = type === 'sell' ? (d.Preisvorstellung || '') : (d.Budget || d.Wunschrate || '');
  const summary = type === 'sell'
    ? ['Verkauf', d.Verkaufszeitpunkt].filter(Boolean).join(' \u00b7 ')
    : [PAY_LABEL[pay] || d.Bezahlart, d.Zustand, d['Servicepaket Wartung & Inspektion'] ? 'Service Plus' : '', d['Servicepaket Versicherung / Kasko'] ? 'Versicherung/Kasko' : ''].filter(Boolean).join(' \u00b7 ');
  return { customer_name: name, email: clean(d.email).toLowerCase(), phone: clean(d.phone), brand, model, vehicle, summary, zustand, pay_kind: pay, budget: str(budget, 40), plz: str(d.PLZ, 5), city: str(d.Ort, 80) };
}
function parseRadius(v, s) {
  if (v === undefined || v === null || v === '') return s.radius_default;
  if (/bundesweit|deutschland|ganz|alle|egal/i.test(String(v))) return 0;
  const n = toInt(String(v).replace(/[^0-9]/g, ''), s.radius_default); return n;
}

/* ---------- Eingang einer neuen Anfrage (Webseite) ---------- */
async function createRequest(ctx, type, data, { customerAccount, source }) {
  const s = await settingsOf(ctx);
  const stored = {};
  for (const [k, v] of Object.entries(data)) if (!/^(_sig|_ts|Firma2)$/.test(k)) stored[k] = typeof v === 'string' ? v.slice(0, k === 'body' ? 20000 : 4000) : String(v ?? '');
  const c = requestColumns(type, stored);
  const t = nowIso();
  const id = await DB.insert(ctx.db, 'requests', { type, status: 'eingang', priority: 'normal', customer_name: c.customer_name, email: c.email, phone: c.phone,
    brand: c.brand, model: c.model, vehicle: c.vehicle, summary: c.summary, customer_account: customerAccount || null, page: str(stored._page, 300),
    data: JSON.stringify(stored), created_at: t, updated_at: t, plz: c.plz, city: c.city, radius_km: parseRadius(stored.Umkreis, s), zustand: c.zustand,
    pay_kind: c.pay_kind, budget: c.budget, source: str(source || stored._src || 'Webseite', 120), deleted: 0, billed: 0, customer_note_unread: 0 });
  await reqEvent(ctx, id, 'eingang', REQUEST_TYPES[type].label);
  await audit(ctx, 'anfrage_eingang', 'anfrage', toNumber(id), { type, plz: c.plz, marke: c.brand });
  await notifyStaff(ctx, { perm: 'req_edit' }, { kind: 'anfrage', title: `Neue Anfrage #${toNumber(id)} \u00b7 ${c.vehicle || REQUEST_TYPES[type].label}`, body: `${c.summary} \u00b7 PLZ ${c.plz}`, link: `#/anfragen/${toNumber(id)}` });
  return id;
}

/* ---------- Automatische Verteilung an Gesch\u00e4ftspartner ---------- */
async function matchingOrgs(ctx, req) {
  const orgs = await DB.all(ctx.db, "SELECT * FROM orgs WHERE active = 1 AND deleted = 0");
  const loc = req.lat != null ? { lat: req.lat, lon: req.lon } : null;
  const b = normBrand(req.brand);
  const out = [];
  for (const o of orgs) {
    if (!jparse(o.accepts, ['deal', 'sell']).includes(req.type)) continue;
    const brands = jparse(o.brands, []);
    const brandOk = brands.includes('*') || !b || req.brand === 'Noch offen' || brands.some((x) => normBrand(x) === b);
    if (!brandOk) continue;
    const users = await DB.val(ctx.db, 'SELECT COUNT(*) FROM partner_users WHERE org_id = ? AND active = 1', o.id);
    if (!users) continue;
    const dist = loc && o.lat != null ? distanceKm(loc, { lat: o.lat, lon: o.lon }) : null;
    const radius = req.radius_km || 0;
    if (radius > 0 && (dist === null || dist > radius)) continue;
    if (o.max_radius_km && dist !== null && dist > o.max_radius_km) continue;
    out.push({ org: o, dist });
  }
  return out.sort((a, b2) => (a.dist ?? 9999) - (b2.dist ?? 9999));
}

async function dispatchRequest(ctx, id) {
  const s = await settingsOf(ctx);
  const req = await DB.one(ctx.db, 'SELECT * FROM requests WHERE id = ?', id);
  if (!req || req.deleted) return { ok: false };
  const problems = [];
  if (!plzOk(req.plz)) problems.push('Postleitzahl fehlt oder ist ung\u00fcltig');
  if (!req.brand) problems.push('Marke fehlt');
  if (problems.length && !(req.brand === 'Noch offen' && plzOk(req.plz))) {
    await DB.update(ctx.db, 'requests', id, { status: 'fehler', status_note: problems.join(', '), updated_at: nowIso() });
    await reqEvent(ctx, id, 'fehler', problems.join(', '));
    await notifyStaff(ctx, { perm: 'req_partner' }, { kind: 'fehler', title: `Fehlerhafte Anfrage #${toNumber(id)}`, body: problems.join(', '), link: `#/anfragen/${toNumber(id)}` });
    return { ok: false, error: problems.join(', ') };
  }
  const geo = await geocodePlz(ctx, req.plz);
  if (geo) { await DB.update(ctx.db, 'requests', id, { lat: geo.lat, lon: geo.lon, city: req.city || geo.city || null }); req.lat = geo.lat; req.lon = geo.lon; }
  const matches = await matchingOrgs(ctx, req);
  const existing = new Set((await DB.all(ctx.db, 'SELECT org_id FROM assignments WHERE request_id = ?', id)).map((r) => r.org_id));
  let created = 0, mailErrors = 0, mails = 0;
  for (const m of matches) {
    if (existing.has(m.org.id)) continue;
    const r = await createAssignment(ctx, req, m.org, { source: 'auto', distance: m.dist });
    created++; mails += r.mails; mailErrors += r.mailErrors;
  }
  const t = nowIso();
  if (!created && !existing.size) {
    await DB.update(ctx.db, 'requests', id, { status: 'in_bearbeitung', status_note: 'Kein passender Gesch\u00e4ftspartner (Marke/Umkreis) \u2013 bitte manuell zuordnen', updated_at: t });
    await reqEvent(ctx, id, 'kein_partner', `Kein Partner f\u00fcr ${req.brand || 'Marke'} im Umkreis ${req.radius_km ? req.radius_km + ' km' : 'bundesweit'}`);
    await notifyStaff(ctx, { perm: 'req_partner' }, { kind: 'anfrage', title: `#${toNumber(id)}: kein passender Partner`, body: `${req.vehicle} \u00b7 PLZ ${req.plz} \u00b7 Umkreis ${req.radius_km || 'bundesweit'} km`, link: `#/anfragen/${toNumber(id)}` });
    return { ok: true, assigned: 0 };
  }
  const deadline = await DB.val(ctx.db, "SELECT MAX(deadline_at) FROM assignments WHERE request_id = ? AND status IN ('neu','in_bearbeitung')", id);
  const status = mailErrors && mailErrors >= mails && mails > 0 ? 'stoerung' : 'versendet';
  await DB.update(ctx.db, 'requests', id, { status: ['eingang', 'in_bearbeitung', 'fehler'].includes(req.status) ? status : req.status, dispatched_at: req.dispatched_at || t, deadline_at: deadline, status_note: status === 'stoerung' ? 'Versand an Partner fehlgeschlagen' : null, updated_at: t });
  await reqEvent(ctx, id, 'versendet', `An ${created} Gesch\u00e4ftspartner verteilt`);
  if (status === 'stoerung') await notifyStaff(ctx, { perm: 'req_partner' }, { kind: 'fehler', title: `St\u00f6rung bei #${toNumber(id)}`, body: 'Die E-Mails an die Partner konnten nicht zugestellt werden.', link: `#/anfragen/${toNumber(id)}` });
  return { ok: true, assigned: created };
}

async function createAssignment(ctx, req, org, { source = 'auto', distance = null, targetUserId = null, note = null } = {}) {
  const s = await settingsOf(ctx);
  const t = nowIso();
  if (distance === null && req.lat != null && org.lat != null) distance = distanceKm({ lat: req.lat, lon: req.lon }, { lat: org.lat, lon: org.lon });
  const deadline = isoOf(addBusinessHours(nowMs(), s.offer_window_hours, { saturday: saturdayOpen(org.opening) }));
  const aid = await DB.insert(ctx.db, 'assignments', { request_id: req.id, org_id: org.id, status: 'neu', source, target_user_id: targetUserId, distance_km: distance,
    deadline_at: deadline, archived: 0, reminders: 0, created_at: t, updated_at: t });
  await partnerEvent(ctx, { assignmentId: aid, requestId: req.id, orgId: org.id, action: 'zugeordnet', text: source === 'auto' ? 'Automatisch zugeordnet (Marke/Umkreis)' : 'Manuell durch KFL zugeordnet' });
  if (note) await partnerEvent(ctx, { assignmentId: aid, requestId: req.id, orgId: org.id, action: 'notiz', text: note, visiblePartner: true });
  const r = await mailAssignment(ctx, req, org, aid, { targetUserId, deadline });
  await DB.update(ctx.db, 'assignments', aid, { mailed_at: r.mails ? nowIso() : null });
  return { id: aid, ...r };
}
function teaserLine(req, distance) {
  return [req.type === 'sell' ? 'Ankauf' : (req.zustand || 'Fahrzeug'), req.brand && req.brand !== 'Noch offen' ? req.brand : null, req.plz ? `PLZ ${req.plz}` : null, distance != null ? `${String(distance).replace('.', ',')} km entfernt` : null].filter(Boolean).join(' \u00b7 ');
}
async function mailAssignment(ctx, req, org, aid, { targetUserId, deadline, reminder = false, extra = '' } = {}) {
  const s = await settingsOf(ctx);
  const users = await DB.all(ctx.db, 'SELECT id, email, name, role FROM partner_users WHERE org_id = ? AND active = 1', org.id);
  const targets = targetUserId ? users.filter((u) => u.id === targetUserId || u.role !== 'vt') : users;
  const asg = await DB.one(ctx.db, 'SELECT * FROM assignments WHERE id = ?', aid);
  const line = teaserLine(req, asg ? asg.distance_km : null);
  const title = reminder ? `Erinnerung: Anfrage #${toNumber(req.id)} wartet auf dein Angebot` : `Neue Anfrage #${toNumber(req.id)} in deiner N\u00e4he`;
  const link = (s.link_partner || '') + `#/anfragen/${aid}`;
  let mails = 0, mailErrors = 0;
  for (const u of targets) {
    await notify(ctx, 'partner', u.id, { kind: reminder ? 'mahnung' : 'anfrage', title, body: line + (extra ? '\n' + extra : ''), link: `#/anfragen/${aid}` });
    const body = `<p>Hallo ${esc(u.name)},</p><p>${reminder ? 'zu dieser Anfrage liegt uns noch kein Angebot von dir vor:' : 'f\u00fcr dich ist eine neue Anfrage eingegangen:'}</p>
      <p style="font-size:18px;font-weight:700;margin:14px 0">${esc(line)}</p>${extra ? `<p>${esc(extra).replace(/\n/g, '<br>')}</p>` : ''}
      <p>Angebotsfrist: <strong>${esc(fmtDE(deadline || (asg && asg.deadline_at)))}</strong> (gez\u00e4hlt werden Werktage${saturdayOpen(org.opening) ? ' inkl. Samstag' : ''}).</p>
      ${s.link_partner ? mailBtn(link, 'Anfrage im Partner-Dashboard \u00f6ffnen') : ''}<p style="color:#6b6b70;font-size:13px">Die Kontaktdaten des Kunden erh\u00e4ltst du, sobald er dein Angebot annimmt.</p>`;
    const r = await sendMail(ctx, { category: 'partner', to: u.email, toName: u.name, subject: title, title, body });
    mails++; if (r.status === 'fehler') mailErrors++;
  }
  return { mails, mailErrors };
}

/* ---------- Ansicht f\u00fcr Partner (ohne pers\u00f6nliche Kundendaten) ---------- */
function partnerRequestData(req, level) {
  const d = jparse(req.data, {});
  const base = { number: toNumber(req.id), type: req.type, typeLabel: REQUEST_TYPES[req.type] ? REQUEST_TYPES[req.type].label : req.type, zustand: req.zustand, plz: req.plz,
    brand: req.brand === 'Noch offen' ? '' : req.brand, created_at: req.created_at };
  if (level === 'teaser') return base;
  const fields = {};
  for (const [k, v] of Object.entries(d)) { if (HIDDEN_KEY.test(k) || PERSONAL_KEY.test(k) || String(v).trim() === '') continue; fields[k] = k === 'Bezahlart' ? (PAY_LABEL[v] || v) : v; }
  return { ...base, model: req.model, vehicle: req.vehicle, pay_kind: req.pay_kind, summary: req.summary, budget: req.budget, fields };
}
function customerContact(req) {
  const d = jparse(req.data, {});
  return { name: [d.Vorname, d.name].filter(Boolean).join(' '), email: d.email || req.email, phone: d.phone || req.phone, street: d['Stra\u00dfe'] || '', zip: d.PLZ || req.plz, city: d.Ort || req.city || '', contactWay: d.Kontaktweg || '' };
}

/* ---------- Partner \u00fcbernimmt / gibt frei ---------- */
async function takeAssignment(ctx, p, aid) {
  const s = await settingsOf(ctx);
  const a = await DB.one(ctx.db, 'SELECT * FROM assignments WHERE id = ? AND org_id = ?', aid, p.orgId);
  need(a, 404, 'Anfrage nicht gefunden.');
  need(a.status === 'neu', 409, a.status === 'in_bearbeitung' ? 'Diese Anfrage wird bereits von jemandem aus deinem Team bearbeitet.' : 'Diese Anfrage kann nicht mehr \u00fcbernommen werden.');
  need(!a.target_user_id || a.target_user_id === p.id || p.rank >= 2, 403, 'Diese Anfrage ist einer anderen Person zugeordnet.');
  need(!a.deadline_at || a.deadline_at > nowIso(), 409, 'Die Frist f\u00fcr diese Anfrage ist abgelaufen.');
  const t = nowIso();
  const res = await ctx.db.prepare("UPDATE assignments SET status = 'in_bearbeitung', taken_by = ?, taken_at = ?, lock_until = ?, updated_at = ? WHERE id = ? AND status = 'neu'")
    .bind(p.id, t, isoOf(nowMs() + s.lock_hours * 3600e3), t, aid).run();
  need(!res.meta || res.meta.changes !== 0, 409, 'Diese Anfrage wurde gerade von jemand anderem \u00fcbernommen.');
  await partnerEvent(ctx, { assignmentId: aid, requestId: a.request_id, orgId: a.org_id, action: 'uebernommen', text: `\u00dcbernommen von ${p.name}` });
  await reqEvent(ctx, a.request_id, 'partner_uebernommen', `${p.org.name}: in Bearbeitung`);
  await audit(ctx, 'partner_uebernahme', 'zuordnung', aid, { anfrage: toNumber(a.request_id) });
  const req = await DB.one(ctx.db, 'SELECT first_action_at FROM requests WHERE id = ?', a.request_id);
  if (req && !req.first_action_at) await DB.update(ctx.db, 'requests', a.request_id, { first_action_at: t });
  return { ok: true };
}
async function releaseAssignment(ctx, aid, { byPartner, reason }) {
  const a = await DB.one(ctx.db, 'SELECT a.*, u.name AS taker FROM assignments a LEFT JOIN partner_users u ON u.id = a.taken_by WHERE a.id = ?', aid);
  if (!a || a.status !== 'in_bearbeitung') return false;
  await DB.run(ctx.db, "UPDATE assignments SET status = 'neu', taken_by = NULL, taken_at = NULL, lock_until = NULL, updated_at = ? WHERE id = ?", nowIso(), aid);
  await partnerEvent(ctx, { assignmentId: aid, requestId: a.request_id, orgId: a.org_id, action: 'wieder_geoeffnet', confidential: true,
    text: `Vertrauliche Information: ${reason || (byPartner ? `${a.taker || 'Ein Nutzer'} hat die Anfrage wieder f\u00fcr die Organisation ge\u00f6ffnet.` : `Bearbeitung durch ${a.taker || 'Nutzer'} ohne Angebot \u2013 nach Ablauf der Bearbeitungszeit automatisch wieder freigegeben.`)}` });
  await notifyPartner(ctx, { orgId: a.org_id }, { kind: 'anfrage', title: `Anfrage #${toNumber(a.request_id)} ist wieder frei`, body: 'Die Anfrage kann von deinem Team \u00fcbernommen werden.', link: `#/anfragen/${aid}` });
  return true;
}

/* ---------- Angebot ---------- */
const OFFER_FIELDS = ['config', 'herstellercode', 'price', 'monthly_rate', 'km_per_year', 'km_confirmed', 'term_months', 'term_confirmed', 'down_payment', 'final_rate',
  'transfer_cost', 'service_cost', 'insurance_cost', 'vat_mode', 'delivery', 'first_registration', 'mileage', 'upe', 'accident_free', 'owners', 'equipment_match',
  'buy_price', 'pickup', 'valid_until', 'notes'];
function normalizeOffer(req, b) {
  const kind = req.type === 'sell' ? 'ankauf' : ({ kaufen: 'kauf', finanzieren: 'finanzierung', leasen: 'leasing' }[req.pay_kind] || str(b.kind, 20) || 'kauf');
  const d = {};
  for (const k of OFFER_FIELDS) if (b[k] !== undefined && b[k] !== null && b[k] !== '') d[k] = typeof b[k] === 'string' ? b[k].trim().slice(0, k === 'notes' ? 3000 : 200) : b[k];
  for (const k of ['price', 'monthly_rate', 'down_payment', 'final_rate', 'transfer_cost', 'service_cost', 'insurance_cost', 'upe', 'buy_price']) if (d[k] !== undefined) d[k] = toNum(d[k]);
  for (const k of ['km_per_year', 'term_months', 'mileage', 'owners']) if (d[k] !== undefined) d[k] = toInt(String(d[k]).replace(/[^0-9]/g, ''), null);
  const isB2B = /gewerb|selbst/i.test(jparse(req.data, {}).Kundenart || '');
  d.vat_mode = kind === 'finanzierung' ? 'brutto' : (isB2B ? 'netto' : 'brutto');
  const errors = [];
  if (kind === 'kauf' && !(d.price > 0)) errors.push('Bitte gib den Kaufpreis an.');
  if (kind === 'leasing') { if (!(d.monthly_rate > 0)) errors.push('Bitte gib die monatliche Rate an.'); if (!d.km_per_year) errors.push('Bitte best\u00e4tige die Kilometerleistung oder gib eine Alternative an.'); if (!d.term_months) errors.push('Bitte best\u00e4tige die Laufzeit oder gib eine Alternative an.'); }
  if (kind === 'finanzierung') { if (!(d.price > 0)) errors.push('Bitte gib den Kaufpreis an.'); if (!(d.monthly_rate > 0)) errors.push('Bitte gib die monatliche Rate an.'); if (d.final_rate === undefined || d.final_rate === null) errors.push('Bitte gib die Schlussrate an (0, falls keine).'); if (!d.term_months) errors.push('Bitte gib die Laufzeit an.'); }
  if (kind === 'ankauf' && !(d.buy_price > 0)) errors.push('Bitte gib deinen Ankaufpreis an.');
  if (kind !== 'ankauf' && !['gleich', 'alternativ'].includes(d.config)) errors.push('Bitte w\u00e4hle, ob das Angebot der angefragten Konfiguration entspricht.');
  if (!['ja', 'nein'].includes(String(d.equipment_match || '').toLowerCase())) errors.push('Bitte beantworte, ob die Ausstattung der Anfrage entspricht (Ja/Nein).');
  if (d.equipment_match) d.equipment_match = String(d.equipment_match).toLowerCase();
  const data = jparse(req.data, {});
  if (kind !== 'ankauf' && data['Servicepaket Wartung & Inspektion'] && d.service_cost === undefined) errors.push('Der Kunde w\u00fcnscht das Servicepaket Wartung & Inspektion \u2013 bitte gib die Kosten an.');
  if (kind !== 'ankauf' && data['Servicepaket Versicherung / Kasko'] && d.insurance_cost === undefined) errors.push('Der Kunde w\u00fcnscht Versicherung/Kasko \u2013 bitte gib die Kosten an.');
  return { kind, d, errors };
}
function compareValue(kind, d) {
  const term = d.term_months || 36, one = (d.transfer_cost || 0);
  if (kind === 'kauf') return (d.price || 0) + one;
  if (kind === 'leasing') return (d.monthly_rate || 0) * term + (d.down_payment || 0) + one;
  if (kind === 'finanzierung') return (d.monthly_rate || 0) * term + (d.down_payment || 0) + (d.final_rate || 0) + one;
  if (kind === 'ankauf') return d.buy_price || 0;
  return 0;
}
async function submitOffer(ctx, p, aid, body) {
  const a = await DB.one(ctx.db, 'SELECT * FROM assignments WHERE id = ? AND org_id = ?', aid, p.orgId);
  need(a, 404, 'Anfrage nicht gefunden.');
  need(a.status === 'in_bearbeitung' && a.taken_by === p.id, 409, 'Bitte \u00fcbernimm die Anfrage zuerst.');
  need(!a.deadline_at || a.deadline_at > nowIso(), 409, 'Die Angebotsfrist ist leider abgelaufen.');
  const req = await DB.one(ctx.db, 'SELECT * FROM requests WHERE id = ?', a.request_id);
  const { kind, d, errors } = normalizeOffer(req, body);
  need(!errors.length, 400, errors.join(' '));
  const t = nowIso();
  const files = {};
  for (const [field, col] of [['pdf', 'pdf_file_id'], ['expose', 'expose_file_id']]) {
    const f = body[field];
    if (f && f.base64) {
      need(/pdf/i.test(f.type || '') || /\.pdf$/i.test(f.name || ''), 400, 'Bitte lade nur PDF-Dateien hoch.');
      const bytes = unb64(f.base64); need(bytes.length <= 8 * 1024 * 1024, 413, 'Die PDF-Datei ist zu gro\u00df (max. 8 MB).');
      files[col] = await putFile(ctx, { name: f.name || field + '.pdf', mime: 'application/pdf', bytes, ownerType: 'offer', ownerId: aid });
    }
  }
  const oid = await DB.insert(ctx.db, 'offers', { request_id: a.request_id, assignment_id: aid, org_id: p.orgId, user_id: p.id, kind, data: JSON.stringify(d),
    compare_value: compareValue(kind, d), status: 'eingereicht', ...files, created_at: t, updated_at: t });
  await DB.update(ctx.db, 'assignments', aid, { status: 'versendet', sent_at: t, offer_id: oid, lock_until: null, updated_at: t });
  if (['versendet', 'eingang', 'in_bearbeitung', 'stoerung'].includes(req.status)) await DB.update(ctx.db, 'requests', req.id, { status: 'angebot_liegt_vor', updated_at: t });
  await partnerEvent(ctx, { assignmentId: aid, requestId: req.id, orgId: p.orgId, action: 'angebot', text: `Angebot abgegeben von ${p.name}` });
  await reqEvent(ctx, req.id, 'angebot', `Angebot von ${p.org.name} eingegangen`);
  await audit(ctx, 'angebot_abgegeben', 'angebot', oid, { anfrage: toNumber(req.id), org: p.orgId });
  await notifyStaff(ctx, { perm: 'req_edit' }, { kind: 'angebot', title: `Angebot zu #${toNumber(req.id)} eingegangen`, body: `${p.org.name} \u00b7 ${req.vehicle || ''}`, link: `#/anfragen/${toNumber(req.id)}` });
  await maybeEvaluate(ctx, req.id);
  return { ok: true, id: oid };
}

/* ---------- Auswertung und Vorstellung beim Kunden ---------- */
async function maybeEvaluate(ctx, rid, { force = false } = {}) {
  const req = await DB.one(ctx.db, 'SELECT * FROM requests WHERE id = ?', rid);
  if (!req || req.deleted || req.evaluated_at) return false;
  const open = await DB.val(ctx.db, "SELECT COUNT(*) FROM assignments WHERE request_id = ? AND status IN ('neu','in_bearbeitung')", rid);
  const total = await DB.val(ctx.db, 'SELECT COUNT(*) FROM assignments WHERE request_id = ?', rid);
  if (!total) return false;
  if (open && !force) return false;
  await evaluateRequest(ctx, rid);
  return true;
}
async function partnerRating(ctx, orgId) {
  const r = await DB.one(ctx.db, 'SELECT AVG(rating) AS avg, COUNT(*) AS n FROM surveys WHERE org_id = ? AND rating IS NOT NULL', orgId);
  return r && r.n ? r.avg : null;
}
/* Bewertung nach 7 Faktoren (je 0\u2013100 Punkte), gewichtet laut Einstellung (Summe 100 %).
   Faktoren, die f\u00fcr eine Anfrage nicht zutreffen (z. B. Laufzeit beim Kauf), werden herausgerechnet. */
const lastNum = (v) => { const m = String(v || '').replace(/\./g, '').match(/\d+/g); return m ? +m[m.length - 1] : null; };
function scoreWeights(s) { const w = {}; for (const f of SCORE_FACTORS) w[f.key] = Math.max(0, toNum(s['score_w_' + f.key], 0) || 0); return w; }
async function scoreOffers(ctx, req, offers, s) {
  const sell = req.type === 'sell', f = jparse(req.data, {}), w = scoreWeights(s);
  const vals = offers.map((o) => o.compare_value).filter((v) => v > 0);
  const best = vals.length ? (sell ? Math.max(...vals) : Math.min(...vals)) : 0;
  const maxKm = req.radius_km > 0 ? req.radius_km : 200;
  const winH = Math.max(1, toNum(s.offer_window_hours, 24) || 24);
  const wantTerm = lastNum(f.Laufzeit);
  const wantService = !!f['Servicepaket Wartung & Inspektion'], wantKasko = !!f['Servicepaket Versicherung / Kasko'];
  for (const o of offers) {
    const d = jparse(o.data, {});
    const a = await DB.one(ctx.db, 'SELECT created_at, taken_at FROM assignments WHERE id = ?', o.assignment_id);
    const hours = a ? Math.max(0, (msOf(o.created_at) - msOf(a.created_at)) / 3600e3) : null;
    const pts = {
      distance: o.distance_km == null ? 50 : Math.max(0, 100 * (1 - o.distance_km / maxKm)),
      response: hours == null ? 50 : Math.max(0, 100 * (1 - hours / winH)),
      equipment: d.equipment_match === 'ja' ? 100 : d.equipment_match === 'nein' ? 0 : 50,
      price: best && o.compare_value > 0 ? (sell ? o.compare_value / best : best / o.compare_value) * 100 : 0,
      model: sell ? null : d.config === 'alternativ' ? 0 : 100,
      term: wantTerm && d.term_months ? (+lastNum(d.term_months) === wantTerm ? 100 : Math.max(0, 100 - Math.abs(+lastNum(d.term_months) - wantTerm) * 5)) : null,
      addons: wantService || wantKasko ? ((wantService ? (toNum(d.service_cost) > 0 ? 1 : 0) : 0) + (wantKasko ? (toNum(d.insurance_cost) > 0 ? 1 : 0) : 0)) / ((wantService ? 1 : 0) + (wantKasko ? 1 : 0)) * 100 : null
    };
    let sum = 0, wsum = 0; const detail = {};
    for (const k of Object.keys(pts)) { if (pts[k] === null) { detail[k] = null; continue; } const p = Math.round(Math.min(100, pts[k]) * 10) / 10; detail[k] = p; sum += p * w[k]; wsum += w[k]; }
    o.score = wsum ? Math.round((sum / wsum) * 10) / 10 : 0;
    o.scoreDetail = { points: detail, weights: w, hours: hours == null ? null : Math.round(hours * 10) / 10 };
  }
  return offers;
}
async function evaluateRequest(ctx, rid) {
  const s = await settingsOf(ctx);
  const req = await DB.one(ctx.db, 'SELECT * FROM requests WHERE id = ?', rid);
  const offers = await DB.all(ctx.db, "SELECT o.*, a.distance_km FROM offers o JOIN assignments a ON a.id = o.assignment_id WHERE o.request_id = ? AND o.status = 'eingereicht'", rid);
  const t = nowIso();
  if (!offers.length) {
    await DB.update(ctx.db, 'requests', rid, { status: 'kein_angebot', evaluated_at: t, updated_at: t });
    await reqEvent(ctx, rid, 'auswertung', 'Kein Angebot innerhalb der Frist');
    await notifyStaff(ctx, { perm: 'req_edit' }, { kind: 'anfrage', title: `#${toNumber(rid)}: kein Angebot erhalten`, body: 'Bitte den Kunden pers\u00f6nlich kontaktieren oder weitere Partner zuordnen.', link: `#/anfragen/${toNumber(rid)}` });
    return;
  }
  await scoreOffers(ctx, req, offers, s);
  offers.sort((a, b) => b.score - a.score);
  // die besten (Standard: 3) Angebote werden dem Kunden vorgestellt \u2013 auch wenn mehr eingegangen sind
  const n = Math.max(1, Math.min(3, toInt(s.presented_count, 3)));
  const review = !!s.review_before_present;
  for (const [i, o] of offers.entries()) {
    const chosen = i < n;
    await DB.update(ctx.db, 'offers', o.id, { score: o.score, score_detail: JSON.stringify(o.scoreDetail || {}), rank: i + 1, status: chosen ? (review ? 'ausgewaehlt' : 'vorgestellt') : 'nicht_ausgewaehlt', updated_at: t });
    if (!chosen) await closeAssignmentNotChosen(ctx, o.assignment_id, 'Ein anderes Angebot hat beim Preis-Leistungs-Vergleich besser abgeschnitten.');
  }
  await DB.update(ctx.db, 'requests', rid, { evaluated_at: t, status: review ? 'angebot_in_bearbeitung' : 'angebot_beim_kunden', updated_at: t });
  await reqEvent(ctx, rid, 'auswertung', `${offers.length} Angebot(e) ausgewertet, ${Math.min(n, offers.length)} ausgew\u00e4hlt`);
  if (review) {
    await notifyStaff(ctx, { perm: 'req_edit' }, { kind: 'angebot', title: `#${toNumber(rid)}: Angebot zur Freigabe`, body: 'Bitte pr\u00fcfen und dem Kunden vorstellen.', link: `#/anfragen/${toNumber(rid)}` });
    return;
  }
  await presentOffers(ctx, rid);
}
async function closeAssignmentNotChosen(ctx, aid, reason) {
  const a = await DB.one(ctx.db, 'SELECT * FROM assignments WHERE id = ?', aid);
  if (!a) return;
  await DB.update(ctx.db, 'assignments', aid, { status: 'geschlossen', closed_reason: reason, updated_at: nowIso() });
  await partnerEvent(ctx, { assignmentId: aid, requestId: a.request_id, orgId: a.org_id, action: 'geschlossen', text: reason, visiblePartner: true });
  const who = a.taken_by ? { userIds: [a.taken_by] } : { orgId: a.org_id, roles: ['gf', 'vl'] };
  await notifyPartner(ctx, who, { kind: 'info', title: `Anfrage #${toNumber(a.request_id)} geschlossen`, body: reason + ' Danke f\u00fcr dein Angebot \u2013 beim n\u00e4chsten Mal klappt es!', link: `#/anfragen/${aid}` });
}
async function presentOffers(ctx, rid) {
  const s = await settingsOf(ctx);
  const t = nowIso();
  await DB.run(ctx.db, "UPDATE offers SET status = 'vorgestellt', updated_at = ? WHERE request_id = ? AND status = 'ausgewaehlt'", t, rid);
  const chosen = await DB.all(ctx.db, "SELECT * FROM offers WHERE request_id = ? AND status = 'vorgestellt'", rid);
  for (const o of chosen) {
    const a = await DB.one(ctx.db, 'SELECT * FROM assignments WHERE id = ?', o.assignment_id);
    await DB.update(ctx.db, 'assignments', a.id, { status: 'vorgestellt', updated_at: t });
    await partnerEvent(ctx, { assignmentId: a.id, requestId: rid, orgId: a.org_id, action: 'vorgestellt', text: 'Dein Angebot wurde dem Kunden vorgestellt.', visiblePartner: true });
    await notifyPartner(ctx, a.taken_by ? { userIds: [a.taken_by] } : { orgId: a.org_id }, { kind: 'erfolg', title: `Stark! Dein Angebot zu #${toNumber(rid)} wurde dem Kunden vorgestellt`, body: 'Es geh\u00f6rt zu den besten Angeboten. Jetzt entscheidet der Kunde.', link: `#/anfragen/${a.id}` });
  }
  const req = await DB.one(ctx.db, 'SELECT * FROM requests WHERE id = ?', rid);
  await DB.update(ctx.db, 'requests', rid, { status: 'angebot_beim_kunden', presented_at: t, updated_at: t });
  await reqEvent(ctx, rid, 'vorgestellt', `${chosen.length} Angebot(e) dem Kunden vorgestellt`);
  const d = jparse(req.data, {});
  const link = s.link_my_requests + '#anfrage-' + toNumber(rid);
  const r = await sendMail(ctx, { category: 'system', to: req.email, toName: d.Vorname, subject: `Dein Angebot zu Anfrage #${toNumber(rid)} ist da`, title: 'Dein Angebot ist da.',
    body: `<p>Hallo ${esc(d.Vorname || '')},</p><p>wir haben die Angebote unserer gepr\u00fcften Partner f\u00fcr deine Anfrage <strong>#${toNumber(rid)}</strong> (${esc(req.vehicle || REQUEST_TYPES[req.type].label)}) verglichen und das beste f\u00fcr dich ausgew\u00e4hlt.</p>
      <p>Schau es dir in deinem Kundenkonto an. Gef\u00e4llt es dir, klickst du einfach auf <strong>\u201eInteressiert mich\u201c</strong> \u2013 dann meldet sich der Partner direkt bei dir.</p>${mailBtn(link, 'Angebot ansehen')}<p style="color:#6b6b70;font-size:13px">Bis zu deiner Zusage bleiben deine Kontaktdaten bei uns.</p>` });
  if (r.status === 'fehler') { await DB.update(ctx.db, 'requests', rid, { status_note: 'E-Mail an Kunden fehlgeschlagen' }); await reqEvent(ctx, rid, 'stoerung', 'Mail an Kunden fehlgeschlagen'); }
}

// Anonymisierte Angebotsdaten f\u00fcr den Kunden
async function customerOffers(ctx, req) {
  const s = await settingsOf(ctx);
  const offers = await DB.all(ctx.db, "SELECT o.*, a.distance_km, a.status AS a_status, g.name AS org_name, g.city AS org_city, g.street AS org_street, g.zip AS org_zip, g.phone AS org_phone, g.email AS org_email, g.website AS org_web FROM offers o JOIN assignments a ON a.id = o.assignment_id JOIN orgs g ON g.id = o.org_id WHERE o.request_id = ? AND o.status IN ('vorgestellt','angenommen','abgelehnt_kunde') ORDER BY o.rank", req.id);
  const out = [];
  for (const o of offers) {
    const d = jparse(o.data, {});
    const accepted = o.status === 'angenommen';
    const identity = accepted || s.show_partner_identity;
    let contact = null;
    if (accepted) {
      const u = await DB.one(ctx.db, 'SELECT name, email, phone FROM partner_users WHERE id = (SELECT taken_by FROM assignments WHERE id = ?)', o.assignment_id);
      contact = { person: u ? u.name : '', email: (u && u.email) || o.org_email, phone: (u && u.phone) || o.org_phone };
    }
    out.push({ id: o.id, kind: o.kind, status: o.status, rank: o.rank, data: pick(d, OFFER_FIELDS.filter((k) => k !== 'herstellercode' || !!d.herstellercode)),
      partner: identity ? { name: o.org_name, city: o.org_city, street: accepted ? o.org_street : undefined, zip: accepted ? o.org_zip : undefined, web: o.org_web, ...(contact || {}) } : { name: 'Gepr\u00fcfter KFL-Partner', city: '' },
      distance_km: o.distance_km, has_pdf: !!o.public_file_id, has_expose: !!o.public_expose_id });
  }
  return out;
}

/* ---------- Kunde: \u201eInteressiert mich\u201c / ablehnen ---------- */
async function acceptOffer(ctx, req, offerId) {
  const s = await settingsOf(ctx);
  const o = await DB.one(ctx.db, "SELECT * FROM offers WHERE id = ? AND request_id = ?", offerId, req.id);
  need(o, 404, 'Angebot nicht gefunden.');
  need(o.status === 'vorgestellt', 409, 'Dieses Angebot ist nicht mehr verf\u00fcgbar.');
  const t = nowIso();
  await DB.update(ctx.db, 'offers', o.id, { status: 'angenommen', updated_at: t });
  for (const other of await DB.all(ctx.db, "SELECT * FROM offers WHERE request_id = ? AND status = 'vorgestellt' AND id != ?", req.id, o.id)) {
    await DB.update(ctx.db, 'offers', other.id, { status: 'nicht_ausgewaehlt', updated_at: t });
    await closeAssignmentNotChosen(ctx, other.assignment_id, 'Der Kunde hat sich f\u00fcr ein anderes Angebot entschieden.');
  }
  await DB.update(ctx.db, 'requests', req.id, { status: 'angebot_akzeptiert', decided_at: t, won_assignment_id: o.assignment_id, updated_at: t });
  await reqEvent(ctx, req.id, 'angebot_akzeptiert', 'Kunde: \u201eInteressiert mich\u201c');
  await audit(ctx, 'angebot_angenommen', 'angebot', o.id, { anfrage: toNumber(req.id) });
  await markWon(ctx, o.assignment_id, { initial: true });
  return { ok: true };
}
async function markWon(ctx, aid, { initial = false, note = null } = {}) {
  const s = await settingsOf(ctx);
  const a = await DB.one(ctx.db, 'SELECT a.*, g.name AS org_name, g.opening, g.lead_price FROM assignments a JOIN orgs g ON g.id = a.org_id WHERE a.id = ?', aid);
  const req = await DB.one(ctx.db, 'SELECT * FROM requests WHERE id = ?', a.request_id);
  const t = nowIso();
  const due = isoOf(addBusinessHours(nowMs(), s.contact_window_hours, { saturday: saturdayOpen(a.opening) }));
  await DB.update(ctx.db, 'assignments', aid, { status: 'gewonnen', won_at: a.won_at || t, contact_due_at: due, updated_at: t });
  await partnerEvent(ctx, { assignmentId: aid, requestId: req.id, orgId: a.org_id, action: 'gewonnen', text: note || 'Der Kunde ist interessiert \u2013 Kontaktdaten freigegeben.', visiblePartner: true });
  // Kontaktdaten an den Partner
  const c = customerContact(req);
  const taker = a.taken_by ? await DB.one(ctx.db, 'SELECT * FROM partner_users WHERE id = ?', a.taken_by) : null;
  const recipients = taker ? [taker] : await DB.all(ctx.db, "SELECT * FROM partner_users WHERE org_id = ? AND active = 1 AND role IN ('gf','vl')", a.org_id);
  let mailFail = false;
  for (const u of recipients) {
    await notify(ctx, 'partner', u.id, { kind: 'gewonnen', title: `Gewonnen! Anfrage #${toNumber(req.id)}`, body: `Der Kunde wartet auf deinen Anruf oder deine E-Mail. Bitte melde dich innerhalb der Frist (bis ${fmtDE(due)}).`, link: `#/anfragen/${aid}` });
    const r = await sendMail(ctx, { category: 'partner', to: u.email, toName: u.name, subject: `Gewonnen: Kunde zu Anfrage #${toNumber(req.id)} wartet auf dich`, title: 'Gl\u00fcckwunsch, du hast das Angebot gewonnen!',
      body: `<p>Hallo ${esc(u.name)},</p><p>der Kunde hat sich f\u00fcr dein Angebot zu <strong>#${toNumber(req.id)} \u00b7 ${esc(req.vehicle || '')}</strong> entschieden und wartet auf deinen Anruf oder deine E-Mail.</p>
        ${mailTable([['Name', c.name], ['Telefon', c.phone], ['E-Mail', c.email], ['Anschrift', [c.street, [c.zip, c.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')], ['Bevorzugter Kontaktweg', c.contactWay]])}
        <p>Bitte kontaktiere den Kunden bis <strong>${esc(fmtDE(due))}</strong> und setze den Status im Partner-Dashboard auf \u201eKunde erfolgreich kontaktiert\u201c.</p>${s.link_partner ? mailBtn(s.link_partner + '#/anfragen/' + aid, 'Zur Anfrage') : ''}` });
    if (r.status === 'fehler') mailFail = true;
  }
  await DB.update(ctx.db, 'requests', req.id, { status: mailFail ? 'stoerung' : 'kontaktdaten_versendet', status_note: mailFail ? 'Kontaktdaten konnten nicht per Mail an den Partner gesendet werden' : null, updated_at: t });
  await reqEvent(ctx, req.id, mailFail ? 'stoerung' : 'kontaktdaten_versendet', `${a.org_name}: Kontaktdaten ${mailFail ? 'NICHT ' : ''}versendet`);
  // Kunde informieren (Partnerdaten)
  if (initial) {
    const org = await DB.one(ctx.db, 'SELECT * FROM orgs WHERE id = ?', a.org_id);
    const d = jparse(req.data, {});
    await sendMail(ctx, { category: 'system', to: req.email, toName: d.Vorname, subject: `Super, ${org.name} meldet sich bei dir`, title: 'Dein Partner meldet sich bei dir.',
      body: `<p>Hallo ${esc(d.Vorname || '')},</p><p>danke f\u00fcr deine R\u00fcckmeldung zu Anfrage <strong>#${toNumber(req.id)}</strong>. Wir haben deine Kontaktdaten an unseren Partner weitergegeben. Er meldet sich in K\u00fcrze bei dir:</p>
        ${mailTable([['Partner', org.name], ['Ansprechpartner', taker ? taker.name : ''], ['Telefon', (taker && taker.phone) || org.phone], ['E-Mail', (taker && taker.email) || org.email], ['Anschrift', [org.street, [org.zip, org.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')]])}
        <p>Falls sich niemand meldet, sag uns einfach Bescheid \u2013 wir k\u00fcmmern uns.</p>` });
  }
  // Abrechnung (nur einmal je Zuordnung)
  const exists = await DB.val(ctx.db, 'SELECT COUNT(*) FROM billing_items WHERE assignment_id = ?', aid);
  if (!exists) {
    const price = a.lead_price != null ? a.lead_price : (req.type === 'sell' ? s.lead_price_sell : s.lead_price_deal);
    await DB.insert(ctx.db, 'billing_items', { org_id: a.org_id, request_id: req.id, assignment_id: aid, description: `Vermittlung Anfrage #${toNumber(req.id)} \u2013 ${req.vehicle || REQUEST_TYPES[req.type].label}${req.plz ? ' (PLZ ' + req.plz + ')' : ''}`,
      amount_net: round2(price), status: 'offen', created_at: t, updated_at: t });
    await reqEvent(ctx, req.id, 'buchhaltung', 'An die Buchhaltung \u00fcbergeben');
    await notifyStaff(ctx, { perm: 'acc_manage' }, { kind: 'buchhaltung', title: `Neuer Abrechnungsfall #${toNumber(req.id)}`, body: `${a.org_name} \u00b7 ${money(price)} netto`, link: '#/buchhaltung/faelle' });
  }
}
async function declineOffers(ctx, req, reason) {
  const t = nowIso();
  for (const o of await DB.all(ctx.db, "SELECT * FROM offers WHERE request_id = ? AND status = 'vorgestellt'", req.id)) {
    await DB.update(ctx.db, 'offers', o.id, { status: 'abgelehnt_kunde', updated_at: t });
    await closeAssignmentNotChosen(ctx, o.assignment_id, 'Der Kunde hat sich gegen das Angebot entschieden.');
  }
  await DB.update(ctx.db, 'requests', req.id, { status: 'angebot_abgelehnt', decided_at: t, updated_at: t });
  await reqEvent(ctx, req.id, 'angebot_abgelehnt', reason ? 'Kunde: ' + reason : 'Kunde hat abgelehnt');
  await notifyStaff(ctx, { perm: 'req_edit' }, { kind: 'anfrage', title: `#${toNumber(req.id)}: Kunde hat das Angebot abgelehnt`, body: reason || 'Bitte nachfassen.', link: `#/anfragen/${toNumber(req.id)}` });
}

/* ---------- Kontakt-Nachverfolgung nach \u201eGewonnen\u201c ---------- */
async function partnerContactStatus(ctx, p, aid, status, note) {
  const a = await DB.one(ctx.db, 'SELECT * FROM assignments WHERE id = ? AND org_id = ?', aid, p.orgId);
  need(a, 404, 'Anfrage nicht gefunden.');
  need(['gewonnen', 'nicht_erreicht'].includes(a.status), 409, 'Der Status kann gerade nicht ge\u00e4ndert werden.');
  need(a.taken_by === p.id || p.rank >= 2, 403, 'Nur die bearbeitende Person kann den Status setzen.');
  need(['kontaktiert', 'nicht_erreicht'].includes(status), 400, 'Unbekannter Status.');
  const t = nowIso();
  await DB.update(ctx.db, 'assignments', aid, { status, contact_at: t, updated_at: t });
  await partnerEvent(ctx, { assignmentId: aid, requestId: a.request_id, orgId: a.org_id, action: status, text: (status === 'kontaktiert' ? 'Kunde erfolgreich kontaktiert' : 'Kunde nicht erreicht') + (note ? ': ' + note : '') });
  await reqEvent(ctx, a.request_id, 'partner_' + status, (status === 'kontaktiert' ? 'Partner: Kunde kontaktiert' : 'Partner: Kunde nicht erreicht') + (note ? ' \u2013 ' + note : ''));
  if (status === 'kontaktiert') await scheduleSurvey(ctx, a);
  else await customerFollowUp(ctx, a, 'Der Partner konnte dich leider nicht erreichen.');
  return { ok: true };
}
async function customerFollowUp(ctx, a, intro) {
  const s = await settingsOf(ctx);
  const req = await DB.one(ctx.db, 'SELECT * FROM requests WHERE id = ?', a.request_id);
  if (req.feedback_state === 'gefragt') return;
  const d = jparse(req.data, {});
  const base = (ctx.origin || '') + `/c/feedback?r=${toNumber(req.id)}&t=${await linkToken(ctx.env, 'fb', req.id)}`;
  await DB.update(ctx.db, 'requests', req.id, { feedback_state: 'gefragt', updated_at: nowIso() });
  await sendMail(ctx, { category: 'system', to: req.email, toName: d.Vorname, subject: `Kurze Frage zu deiner Anfrage #${toNumber(req.id)}`, title: 'Hat sich unser Partner bei dir gemeldet?',
    body: `<p>Hallo ${esc(d.Vorname || '')},</p><p>${esc(intro)} Hat sich unser Partner zu deiner Anfrage <strong>#${toNumber(req.id)}</strong> schon bei dir gemeldet?</p>
      <p style="margin:22px 0"><a href="${esc(base + '&a=ja')}" style="display:inline-block;background:#0a7d3b;color:#fff;font-weight:700;padding:12px 26px;border-radius:999px;text-decoration:none;margin-right:10px">Ja</a>
      <a href="${esc(base + '&a=nein')}" style="display:inline-block;background:#1a1a1a;color:#fff;font-weight:700;padding:12px 26px;border-radius:999px;text-decoration:none">Nein</a></p>` });
  await reqEvent(ctx, req.id, 'kunde_nachgefragt', 'Kunde per Mail gefragt, ob der Partner sich gemeldet hat');
}
async function customerFeedback(ctx, rid, answer) {
  const req = await DB.one(ctx.db, 'SELECT * FROM requests WHERE id = ?', rid);
  if (!req) return false;
  await DB.update(ctx.db, 'requests', rid, { feedback_state: answer, updated_at: nowIso() });
  await reqEvent(ctx, rid, 'kunde_feedback', answer === 'ja' ? 'Kunde: Partner hat sich gemeldet' : 'Kunde: Partner hat sich NICHT gemeldet');
  await DB.insert(ctx.db, 'surveys', { request_id: rid, org_id: null, kind: 'kontakt', answer, answered_at: nowIso(), created_at: nowIso() });
  await notifyStaff(ctx, { perm: 'req_edit' }, { kind: answer === 'ja' ? 'info' : 'anfrage', title: `#${toNumber(rid)}: Kunde sagt \u201e${answer === 'ja' ? 'Ja, gemeldet' : 'Nein, nicht gemeldet'}\u201c`, body: answer === 'ja' ? 'Bitte den Partner informieren und den Status ggf. auf \u201eGewonnen\u201c setzen.' : 'Bitte den Partner kontaktieren und nachfassen.', link: `#/anfragen/${toNumber(rid)}` });
  return true;
}
async function scheduleSurvey(ctx, a) {
  const exists = await DB.val(ctx.db, "SELECT COUNT(*) FROM surveys WHERE request_id = ? AND kind = 'bewertung'", a.request_id);
  if (!exists) await DB.insert(ctx.db, 'surveys', { request_id: a.request_id, org_id: a.org_id, kind: 'bewertung', created_at: nowIso() });
}
// KFL-Vertrieb setzt den Partner-Status manuell (immer mit Begr\u00fcndung, f\u00fcr Partner sichtbar)
async function staffSetAssignmentStatus(ctx, aid, status, note) {
  need(['gewonnen', 'verloren', 'gescheitert', 'kontaktiert'].includes(status), 400, 'Unbekannter Status.');
  need(str(note, 2000).length >= 3, 400, 'Bitte gib eine Begr\u00fcndung an \u2013 sie ist auch f\u00fcr den Partner sichtbar.');
  const a = await DB.one(ctx.db, 'SELECT * FROM assignments WHERE id = ?', aid);
  need(a, 404, 'Zuordnung nicht gefunden.');
  if (status === 'gewonnen') { await markWon(ctx, aid, { note: 'KFL: ' + note }); }
  else {
    await DB.update(ctx.db, 'assignments', aid, { status, updated_at: nowIso() });
    await partnerEvent(ctx, { assignmentId: aid, requestId: a.request_id, orgId: a.org_id, action: status, text: 'KFL: ' + note, visiblePartner: true });
  }
  await reqEvent(ctx, a.request_id, 'partnerstatus', `${statusLabel(ASSIGN_STATUSES, status)} \u2013 ${note}`);
  await notifyPartner(ctx, a.taken_by ? { userIds: [a.taken_by] } : { orgId: a.org_id }, { kind: 'info', title: `Anfrage #${toNumber(a.request_id)}: ${statusLabel(ASSIGN_STATUSES, status)}`, body: note, link: `#/anfragen/${aid}` });
}

/* ---------- Spam ---------- */
async function reportSpam(ctx, rid, reason) {
  const u = ctx._staff;
  await DB.update(ctx.db, 'requests', rid, { spam_state: 'gemeldet', spam_by: u.id, spam_reason: str(reason, 500), updated_at: nowIso() });
  await reqEvent(ctx, rid, 'spam_gemeldet', reason || '');
  await notifyStaff(ctx, { perm: 'req_spam_confirm' }, { kind: 'spam', title: `Spam-Verdacht #${toNumber(rid)} \u2013 bitte pr\u00fcfen`, body: `${u.name}: ${reason || 'ohne Begr\u00fcndung'}`, link: `#/anfragen/${toNumber(rid)}` });
}
async function decideSpam(ctx, rid, confirm, note) {
  const req = await DB.one(ctx.db, 'SELECT * FROM requests WHERE id = ?', rid);
  need(req && req.spam_state === 'gemeldet', 409, 'F\u00fcr diese Anfrage liegt keine offene Spam-Meldung vor.');
  if (!confirm) {
    await DB.update(ctx.db, 'requests', rid, { spam_state: 'abgelehnt', updated_at: nowIso() });
    await reqEvent(ctx, rid, 'spam_abgelehnt', note || 'Kein Spam');
    return;
  }
  const t = nowIso();
  await DB.update(ctx.db, 'requests', rid, { spam_state: 'bestaetigt', status: 'spam', deleted: 1, updated_at: t });
  for (const a of await DB.all(ctx.db, "SELECT * FROM assignments WHERE request_id = ? AND status IN ('neu','in_bearbeitung','versendet','vorgestellt')", rid)) {
    await DB.update(ctx.db, 'assignments', a.id, { status: 'geschlossen', archived: 1, closed_reason: 'Anfrage wurde als Spam erkannt und deaktiviert.', updated_at: t });
  }
  await reqEvent(ctx, rid, 'spam_bestaetigt', note || '');
  await createTicket(ctx, { tag: 'Intern', kind: 'spam', category: 'Spam-Pr\u00fcfung', subject: `Spam best\u00e4tigt: Anfrage #${toNumber(rid)}`, priority: 'normal',
    requester: { type: 'staff', id: ctx._staff.id, name: ctx._staff.name, email: ctx._staff.email }, requestId: rid,
    text: `Die Anfrage #${toNumber(rid)} wurde als Spam gemeldet (${req.spam_reason || 'ohne Begr\u00fcndung'}) und von ${ctx._staff.name} best\u00e4tigt. Sie ist deaktiviert. Bitte den Fall abschlie\u00dfend pr\u00fcfen.${note ? '\nNotiz: ' + note : ''}`, notifyAdmin: true });
}

/* ---------- Zeitgesteuerte Abl\u00e4ufe (Cron, alle 5 Minuten) ---------- */
async function runRequestJobs(ctx) {
  const t = nowIso(), res = { released: 0, expired: 0, evaluated: 0, followups: 0, surveys: 0 };
  // 1) Bearbeitungssperre (4 h) abgelaufen ohne Angebot \u2192 wieder f\u00fcr die Organisation frei
  for (const a of await DB.all(ctx.db, "SELECT id FROM assignments WHERE status = 'in_bearbeitung' AND lock_until IS NOT NULL AND lock_until < ?", t)) {
    if (await releaseAssignment(ctx, a.id, { byPartner: false })) res.released++;
  }
  // 2) Angebotsfrist abgelaufen \u2192 Verloren
  for (const a of await DB.all(ctx.db, "SELECT * FROM assignments WHERE status IN ('neu','in_bearbeitung') AND deadline_at < ?", t)) {
    await DB.update(ctx.db, 'assignments', a.id, { status: 'verloren', closed_reason: 'Die Angebotsfrist ist abgelaufen.', updated_at: t });
    await partnerEvent(ctx, { assignmentId: a.id, requestId: a.request_id, orgId: a.org_id, action: 'verloren', text: 'Frist abgelaufen \u2013 kein Angebot abgegeben.', visiblePartner: true });
    res.expired++;
  }
  // 3) Auswertung, sobald keine Zuordnung mehr offen ist
  for (const r of await DB.all(ctx.db, "SELECT id FROM requests WHERE deleted = 0 AND evaluated_at IS NULL AND status IN ('versendet','angebot_liegt_vor','stoerung') AND (SELECT COUNT(*) FROM assignments WHERE request_id = requests.id) > 0 AND (SELECT COUNT(*) FROM assignments WHERE request_id = requests.id AND status IN ('neu','in_bearbeitung')) = 0")) {
    await evaluateRequest(ctx, r.id); res.evaluated++;
  }
  // 4) Kontaktfrist nach \u201eGewonnen\u201c abgelaufen ohne R\u00fcckmeldung \u2192 Kunde fragen, Vertrieb informieren
  for (const a of await DB.all(ctx.db, "SELECT * FROM assignments WHERE status = 'gewonnen' AND contact_due_at < ? AND contact_at IS NULL", t)) {
    await DB.update(ctx.db, 'assignments', a.id, { contact_at: t });
    await partnerEvent(ctx, { assignmentId: a.id, requestId: a.request_id, orgId: a.org_id, action: 'kontaktfrist', text: 'Kontaktfrist abgelaufen \u2013 KFL fragt beim Kunden nach.', visiblePartner: true });
    await customerFollowUp(ctx, a, 'Wir m\u00f6chten sichergehen, dass alles geklappt hat.');
    await notifyStaff(ctx, { perm: 'req_edit' }, { kind: 'anfrage', title: `#${toNumber(a.request_id)}: Kontaktfrist abgelaufen`, body: 'Der Partner hat noch keinen Kontakt gemeldet.', link: `#/anfragen/${toNumber(a.request_id)}` });
    res.followups++;
  }
  // 5) Bewertungsumfrage an Kunden
  const s = await settingsOf(ctx);
  const cutoff = isoOf(nowMs() - (s.survey_delay_days || 3) * 86400e3);
  for (const sv of await DB.all(ctx.db, "SELECT s.*, a.contact_at FROM surveys s JOIN assignments a ON a.request_id = s.request_id AND a.org_id = s.org_id WHERE s.kind = 'bewertung' AND s.sent_at IS NULL AND a.contact_at < ?", cutoff)) {
    const req = await DB.one(ctx.db, 'SELECT * FROM requests WHERE id = ?', sv.request_id);
    const tok = await linkToken(ctx.env, 'sv', sv.id);
    const stars = [1, 2, 3, 4, 5].map((n) => `<a href="${esc((ctx.origin || '') + `/c/survey?s=${sv.id}&t=${tok}&r=${n}`)}" style="display:inline-block;width:44px;height:44px;line-height:44px;text-align:center;border-radius:50%;background:${n >= 4 ? '#ff6c01' : '#f4f4f4'};color:#000;font-weight:700;text-decoration:none;margin-right:6px">${n}</a>`).join('');
    await sendMail(ctx, { category: 'system', to: req.email, subject: 'Wie zufrieden warst du mit unserem Partner?', title: 'Wie war deine Erfahrung?',
      body: `<p>Hallo ${esc(jparse(req.data, {}).Vorname || '')},</p><p>wie zufrieden warst du mit dem Partner zu deiner Anfrage <strong>#${toNumber(req.id)}</strong>? 1 = gar nicht, 5 = sehr zufrieden.</p><p style="margin:20px 0">${stars}</p>` });
    await DB.update(ctx.db, 'surveys', sv.id, { sent_at: t }); res.surveys++;
  }
  return res;
}


/* ===== 31-billing.js ===== */
/* ============================================================
   Buchhaltung: Abrechnungsf\u00e4lle, Rechnungen (einzeln / monatlich),
   Zahlungen, Zahlungserinnerung und Mahnstufen, Eingangsrechnungen,
   Lieferanten, Zahlungsliste mit SEPA-Export, Tagesabschluss
   ============================================================ */

function orgRecipient(org) {
  return { name: org.billing_name || org.name, street: org.billing_street || org.street, zip: org.billing_zip || org.zip, city: org.billing_city || org.city,
    country: org.country || 'Deutschland', email: org.billing_email || org.email, vat_id: org.vat_id || '', customer_no: 'P-' + String(org.id).padStart(5, '0') };
}
async function nextInvoiceNumber(ctx) {
  const s = await settingsOf(ctx);
  const year = berlinParts(nowMs()).y;
  for (let guard = 0; guard < 50; guard++) {
    const raw = await rawSetting(ctx.db, 'invoice_next');
    const n = Math.max(1, toInt(jparse(raw, s.invoice_next), 1));
    const number = `${s.invoice_prefix}-${year}-${String(n).padStart(5, '0')}`;
    await setRawSetting(ctx.db, 'invoice_next', JSON.stringify(n + 1));
    if (!(await DB.one(ctx.db, 'SELECT id FROM invoices WHERE number = ?', number))) return number;
  }
  throw new HttpError(500, 'Rechnungsnummer konnte nicht vergeben werden.');
}
// Konditionen eines Gesch\u00e4ftspartners (individueller Wert, sonst Einstellung)
async function termsFor(ctx, org) {
  const s = await settingsOf(ctx);
  const g = (k) => (org && org[k] != null && org[k] !== '' ? +org[k] : +s[k]);
  return { days: g('payment_terms_days'), reminderDays: g('reminder_due_days'), fee1: g('dunning_fee_1'), fee2: g('dunning_fee_2'), dueDays1: g('dunning_due_days'), dueDays2: g('dunning_due_days_2') };
}

async function createInvoice(ctx, { org = null, recipient = null, lines, kind = 'einzel', serviceFrom, serviceTo, intro, note, send = true, sendTo }) {
  const s = await settingsOf(ctx);
  need(lines && lines.length, 400, 'Die Rechnung braucht mindestens eine Position.');
  const rc = recipient || orgRecipient(org);
  need(rc.name, 400, 'Bitte gib einen Rechnungsempf\u00e4nger an.');
  const norm = lines.map((l) => { const qty = toNum(l.qty, 1) || 1, unit = round2(toNum(l.unit, 0)); return { description: str(l.description, 500), qty, unit, total: round2(qty * unit), billing_item_id: l.billing_item_id || null, request_id: l.request_id || null }; });
  const net = round2(norm.reduce((a, l) => a + l.total, 0));
  const vatRate = s.vat_enabled ? toNum(s.vat_rate, 19) : 0;
  const vat = round2(net * vatRate / 100), gross = round2(net + vat);
  const terms = await termsFor(ctx, org);
  const today = berlinDate(nowMs());
  const number = await nextInvoiceNumber(ctx);
  const t = nowIso();
  const inv = { number, org_id: org ? org.id : null, kind, status: 'offen', issue_date: today, service_from: serviceFrom || today, service_to: serviceTo || serviceFrom || today,
    due_date: kind === 'storno' ? today : addDaysDate(today, terms.days), net, vat_rate: vatRate, vat, gross, paid: 0, fees: 0, dunning_level: 0, recipient: JSON.stringify(rc),
    lines: JSON.stringify(norm), note: note || null, intro: intro || null, created_by: ctx._staff ? ctx._staff.id : null, created_at: t, updated_at: t };
  const id = await DB.insert(ctx.db, 'invoices', inv);
  inv.id = id;
  const pdf = renderInvoicePdf(s, inv);
  const fileId = await putFile(ctx, { name: `${number}.pdf`, mime: 'application/pdf', bytes: pdf, ownerType: 'invoice', ownerId: id });
  await DB.update(ctx.db, 'invoices', id, { file_id: fileId });
  for (const l of norm) if (l.billing_item_id) await DB.update(ctx.db, 'billing_items', l.billing_item_id, { status: 'abgerechnet', invoice_id: id, updated_at: t });
  for (const rid of uniq(norm.map((l) => l.request_id).filter(Boolean))) { await DB.update(ctx.db, 'requests', rid, { billed: 1 }); await reqEvent(ctx, rid, 'in_rechnung_gestellt', number); }
  await audit(ctx, 'rechnung_erstellt', 'rechnung', number, { brutto: gross, empfaenger: rc.name, art: kind });
  await fibuBookInvoice(ctx, id); // Forderung an Erl\u00f6se + Umsatzsteuer, Beleg ins Archiv
  if (send) await sendInvoiceMail(ctx, id, sendTo);
  return id;
}
// Zieladresse f\u00fcr Rechnungs-E-Mails: aktuelle Rechnungs-E-Mail des Partners, sonst die Adresse auf der Rechnung
async function invoiceMailTo(ctx, inv) {
  const org = inv.org_id ? await DB.one(ctx.db, 'SELECT billing_email, email FROM orgs WHERE id = ?', inv.org_id) : null;
  const cand = [org && org.billing_email, jparse(inv.recipient, {}).email, org && org.email].find((e) => emailOk(e));
  return cand || null;
}
async function sendInvoiceMail(ctx, id, sendTo) {
  const s = await settingsOf(ctx);
  const inv = await DB.one(ctx.db, 'SELECT * FROM invoices WHERE id = ?', id);
  const rc = jparse(inv.recipient, {});
  const to = sendTo || (await invoiceMailTo(ctx, inv));
  if (!emailOk(to)) { await DB.update(ctx.db, 'invoices', id, { mail_status: 'keine_adresse', mail_error: 'Keine Rechnungs-E-Mail hinterlegt', updated_at: nowIso() }); return { ok: false, status: 'keine_adresse', error: 'Keine Rechnungs-E-Mail hinterlegt' }; }
  // Noch nie versendete Rechnung: PDF im aktuellen Briefbogen neu erzeugen (Inhalt unver\u00e4ndert)
  if (!inv.sent_at) {
    const pdf = renderInvoicePdf(s, inv);
    const fileId = await putFile(ctx, { name: `${inv.number}.pdf`, mime: 'application/pdf', bytes: pdf, ownerType: 'invoice', ownerId: id });
    await DB.update(ctx.db, 'invoices', id, { file_id: fileId }); inv.file_id = fileId;
  }
  const f = await getFile(ctx, inv.file_id);
  const isStorno = inv.kind === 'storno';
  const r = await sendMail(ctx, { category: 'invoice', to, toName: rc.name, subject: `${isStorno ? 'Stornorechnung' : 'Rechnung'} ${inv.number} der ${s.company_name}`, title: `${isStorno ? 'Stornorechnung' : 'Ihre Rechnung'} ${inv.number}`,
    body: `<p>Sehr geehrte Damen und Herren,</p><p>anbei erhalten Sie ${isStorno ? 'die Stornorechnung' : 'unsere Rechnung'} <strong>${esc(inv.number)}</strong> vom ${esc(fmtDateDE(inv.issue_date))} \u00fcber <strong>${esc(money(inv.gross))}</strong>${isStorno ? '' : `, zahlbar bis ${esc(fmtDateDE(inv.due_date))}`}.</p>${mailTable(jparse(inv.lines, []).map((l) => [l.description, money(l.total)]))}<p>Mit freundlichen Gr\u00fc\u00dfen<br>${esc(s.company_name)} \u2013 Buchhaltung</p>`,
    replyTo: { email: s.company_email, name: `${s.company_name} Buchhaltung` },
    attachments: f ? [{ name: `${inv.number}.pdf`, base64: b64(f.bytes) }] : [] });
  // Nur bei erfolgreichem Versand als \u201eversendet\u201c markieren
  const err = r.ok ? null : r.status === 'nicht_konfiguriert' ? 'E-Mail-Versand ist nicht eingerichtet (Postfach-Zugang fehlt)' : (r.error || 'Versand fehlgeschlagen');
  await DB.update(ctx.db, 'invoices', id, { ...(r.ok ? { sent_at: nowIso() } : {}), sent_to: to, mail_status: r.status, mail_error: err, updated_at: nowIso() });
  if (!r.ok) await notifyStaff(ctx, { perm: 'acc_manage' }, { kind: 'fehler', title: `Rechnung ${inv.number} nicht versendet`, body: `An ${to}: ${err}`, link: '#/buchhaltung/rechnungen' });
  return { ...r, error: err };
}

// \u201eRechnung versenden\u201c f\u00fcr einen Abrechnungsfall
async function billItem(ctx, itemId) {
  const it = await DB.one(ctx.db, 'SELECT * FROM billing_items WHERE id = ?', itemId);
  need(it && it.status === 'offen', 409, 'Dieser Fall wurde bereits abgerechnet oder vorgemerkt.');
  const org = await DB.one(ctx.db, 'SELECT * FROM orgs WHERE id = ?', it.org_id);
  if (org.billing_mode === 'monatlich') {
    await DB.update(ctx.db, 'billing_items', it.id, { status: 'gesammelt', updated_at: nowIso() });
    await reqEvent(ctx, it.request_id, 'rechnung_gesammelt', 'F\u00fcr die Monatsrechnung vorgemerkt');
    await audit(ctx, 'fall_gesammelt', 'abrechnung', it.id, { org: org.name });
    return { mode: 'monatlich' };
  }
  const id = await createInvoice(ctx, { org, lines: [{ description: it.description, qty: 1, unit: it.amount_net, billing_item_id: it.id, request_id: it.request_id }], kind: 'einzel', serviceFrom: berlinDate(msOf(it.created_at)) });
  return { mode: 'einzel', invoiceId: id };
}
async function runMonthlyInvoices(ctx, { force = false } = {}) {
  const p = berlinParts(nowMs());
  const from = `${p.y}-${String(p.m).padStart(2, '0')}-01`, to = `${p.y}-${String(p.m).padStart(2, '0')}-${String(lastDayOfMonth(p.y, p.m)).padStart(2, '0')}`;
  const orgs = await DB.all(ctx.db, "SELECT DISTINCT org_id FROM billing_items WHERE status = 'gesammelt'");
  let n = 0;
  for (const { org_id } of orgs) {
    const org = await DB.one(ctx.db, 'SELECT * FROM orgs WHERE id = ?', org_id);
    const items = await DB.all(ctx.db, "SELECT * FROM billing_items WHERE org_id = ? AND status = 'gesammelt' ORDER BY id", org_id);
    if (!items.length) continue;
    await createInvoice(ctx, { org, kind: 'sammel', serviceFrom: from, serviceTo: to, intro: `Monatliche Sammelrechnung f\u00fcr ${String(p.m).padStart(2, '0')}/${p.y}. Wir berechnen Ihnen die erfolgreichen Vermittlungen dieses Monats:`,
      lines: items.map((it) => ({ description: it.description, qty: 1, unit: it.amount_net, billing_item_id: it.id, request_id: it.request_id })) });
    n++;
  }
  return n;
}
/* ---------- Notizen der Buchhaltung + vom Vertrieb angeheftete Notizen ---------- */
// Notizen zu einem Abrechnungsfall: eigene Notizen der Buchhaltung und f\u00fcr die Buchhaltung markierte Notizen der Anfrage
async function accNotesFor(ctx, { itemIds = [], invoiceId = null, requestIds = [] }) {
  const db = ctx.db, out = [];
  if (invoiceId) for (const n of await DB.all(db, 'SELECT * FROM acc_notes WHERE invoice_id = ? ORDER BY id DESC', invoiceId)) out.push({ ...n, kind: 'rechnung' });
  for (const id of uniq(itemIds.filter(Boolean))) for (const n of await DB.all(db, 'SELECT * FROM acc_notes WHERE item_id = ? ORDER BY id DESC', id)) out.push({ ...n, kind: 'fall' });
  for (const rid of uniq(requestIds.filter(Boolean))) for (const n of await DB.all(db, 'SELECT n.id, n.text, n.created_at, n.acc_marked_by, n.acc_marked_at, u.name AS author_name FROM notes n LEFT JOIN users u ON u.id = n.user_id WHERE n.request_id = ? AND n.acc_relevant = 1 ORDER BY n.id DESC', rid)) out.push({ ...n, kind: 'vertrieb', request_number: toNumber(rid) });
  // angeheftete Vertriebsnotizen zuerst, danach neueste zuerst
  return out.sort((a, b) => ((b.kind === 'vertrieb') - (a.kind === 'vertrieb')) || (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0));
}
async function addAccNote(ctx, { invoiceId = null, itemId = null, text }) {
  text = str(text, 4000); need(text, 400, 'Bitte einen Text f\u00fcr die Notiz eingeben.');
  const u = ctx._staff;
  const id = await DB.insert(ctx.db, 'acc_notes', { invoice_id: invoiceId, item_id: itemId, text, user_id: u ? u.id : null, author_name: u ? u.name : 'System', created_at: nowIso() });
  await audit(ctx, 'buchhaltung_notiz', invoiceId ? 'rechnung' : 'abrechnung', invoiceId || itemId, { text: text.slice(0, 200) });
  return id;
}

// Abrechnungsfall stornieren. Ist der Fall schon abgerechnet, wird die Rechnung storniert (Stornorechnung)
// und weitere F\u00e4lle derselben Rechnung werden sofort mit einer korrigierten Rechnung neu abgerechnet.
async function cancelBillingItem(ctx, itemId, reason) {
  const it = await DB.one(ctx.db, 'SELECT * FROM billing_items WHERE id = ?', itemId);
  need(it, 404, 'Fall nicht gefunden.');
  need(it.status !== 'storniert', 409, 'Dieser Fall ist bereits storniert.');
  reason = str(reason, 300); need(reason.length >= 3, 400, 'Bitte gib einen Grund f\u00fcr das Storno an.');
  const who = ctx._staff ? ctx._staff.name : 'System';
  const res = { stornoInvoiceId: null, stornoNumber: null, newInvoiceId: null, newNumber: null, rebilled: 0 };
  if (it.status === 'abgerechnet' && it.invoice_id) {
    const inv = await DB.one(ctx.db, 'SELECT * FROM invoices WHERE id = ?', it.invoice_id);
    need(inv && inv.status !== 'storniert', 409, 'Die zugeh\u00f6rige Rechnung ist bereits storniert.');
    need(!inv.paid, 409, `F\u00fcr die Rechnung ${inv.number} sind bereits Zahlungen erfasst. Bitte zuerst die Zahlung kl\u00e4ren (z. B. R\u00fcckzahlung oder Verrechnung), dann stornieren.`);
    const others = await DB.all(ctx.db, 'SELECT * FROM billing_items WHERE invoice_id = ? AND id != ? ORDER BY id', inv.id, it.id);
    res.stornoInvoiceId = await cancelInvoice(ctx, inv.id, `Storno Abrechnungsfall${it.request_id ? ' zu Anfrage #' + toNumber(it.request_id) : ''}: ${reason}`);
    res.stornoNumber = await DB.val(ctx.db, 'SELECT number FROM invoices WHERE id = ?', res.stornoInvoiceId);
    if (others.length) {
      const org = await DB.one(ctx.db, 'SELECT * FROM orgs WHERE id = ?', inv.org_id);
      res.newInvoiceId = await createInvoice(ctx, { org, recipient: jparse(inv.recipient, {}), kind: inv.kind, serviceFrom: inv.service_from, serviceTo: inv.service_to,
        intro: `Korrigierte Rechnung zur stornierten Rechnung ${inv.number}. Wir berechnen Ihnen die folgenden Vermittlungen:`, note: 'Ersetzt ' + inv.number,
        lines: others.map((o) => ({ description: o.description, qty: 1, unit: o.amount_net, billing_item_id: o.id, request_id: o.request_id })) });
      res.newNumber = await DB.val(ctx.db, 'SELECT number FROM invoices WHERE id = ?', res.newInvoiceId);
      res.rebilled = others.length;
    }
  }
  const t = nowIso();
  await DB.update(ctx.db, 'billing_items', it.id, { status: 'storniert', prev_status: it.status, invoice_id: null, cancel_reason: reason, cancelled_at: t, cancelled_by: who, updated_at: t });
  if (it.request_id) await reqEvent(ctx, it.request_id, 'abrechnung_storniert', `${reason}${res.stornoNumber ? ' (Stornorechnung ' + res.stornoNumber + ')' : ''}`);
  await audit(ctx, 'fall_storniert', 'abrechnung', it.id, { grund: reason, anfrage: it.request_id ? toNumber(it.request_id) : null, netto: it.amount_net, stornorechnung: res.stornoNumber, neue_rechnung: res.newNumber });
  return res;
}
// Storno eines Falls aufheben: Fall wird wieder abrechenbar (offen bzw. Sammelablage)
async function reopenBillingItem(ctx, itemId) {
  const it = await DB.one(ctx.db, 'SELECT * FROM billing_items WHERE id = ?', itemId);
  need(it && it.status === 'storniert', 409, 'Nur stornierte F\u00e4lle k\u00f6nnen wieder ge\u00f6ffnet werden.');
  const status = it.prev_status === 'gesammelt' ? 'gesammelt' : 'offen';
  await DB.update(ctx.db, 'billing_items', it.id, { status, prev_status: null, cancel_reason: null, cancelled_at: null, cancelled_by: null, updated_at: nowIso() });
  if (it.request_id) await reqEvent(ctx, it.request_id, 'abrechnung_reaktiviert', '');
  await audit(ctx, 'fall_storno_aufgehoben', 'abrechnung', it.id, { status, frueherer_grund: it.cancel_reason });
  return { status };
}
async function cancelInvoice(ctx, id, reason) {
  const inv = await DB.one(ctx.db, 'SELECT * FROM invoices WHERE id = ?', id);
  need(inv && inv.status !== 'storniert' && inv.kind !== 'storno', 409, 'Diese Rechnung kann nicht storniert werden.');
  need(!inv.paid, 409, 'F\u00fcr diese Rechnung sind Zahlungen erfasst. Bitte zuerst die Zahlungen kl\u00e4ren.');
  const org = inv.org_id ? await DB.one(ctx.db, 'SELECT * FROM orgs WHERE id = ?', inv.org_id) : null;
  const lines = jparse(inv.lines, []).map((l) => ({ description: 'Storno: ' + l.description, qty: l.qty, unit: -l.unit }));
  const sid = await createInvoice(ctx, { org, recipient: jparse(inv.recipient, {}), lines, kind: 'storno', intro: `Hiermit stornieren wir die Rechnung ${inv.number} vom ${fmtDateDE(inv.issue_date)}.${reason ? ' Grund: ' + reason : ''}`, note: 'Storno zu ' + inv.number });
  await DB.update(ctx.db, 'invoices', id, { status: 'storniert', note: (inv.note ? inv.note + ' \u00b7 ' : '') + 'Storniert' + (reason ? ': ' + reason : ''), updated_at: nowIso() });
  // F\u00e4lle wieder abrechenbar machen \u2013 Monatszahler zur\u00fcck in die Sammelablage (n\u00e4chste Sammelrechnung), sonst \u201eOffen\u201c
  const backTo = org && org.billing_mode === 'monatlich' ? 'gesammelt' : 'offen';
  await DB.run(ctx.db, "UPDATE billing_items SET status = ?, invoice_id = NULL, updated_at = ? WHERE invoice_id = ?", backTo, nowIso(), id);
  await audit(ctx, 'rechnung_storniert', 'rechnung', inv.number, { grund: reason, storno_id: sid });
  return sid;
}
async function addPayment(ctx, id, { amount, date, method, note }) {
  const inv = await DB.one(ctx.db, 'SELECT * FROM invoices WHERE id = ?', id);
  need(inv && inv.status !== 'storniert', 404, 'Rechnung nicht gefunden.');
  const a = round2(toNum(amount, 0)); need(a !== 0, 400, 'Bitte gib einen Betrag an.');
  const d = /^\d{4}-\d{2}-\d{2}$/.test(date || '') ? date : berlinDate(nowMs());
  const payId = await DB.insert(ctx.db, 'payments', { invoice_id: id, amount: a, date: d, method: str(method, 40) || '\u00dcberweisung', note: str(note, 300), created_by: ctx._staff ? ctx._staff.id : null, created_at: nowIso() });
  await fibuBookPayment(ctx, id, a, d, payId); // Bank an Forderungen
  const paid = round2((await DB.val(ctx.db, 'SELECT SUM(amount) FROM payments WHERE invoice_id = ?', id)) || 0);
  const total = round2(inv.gross + inv.fees);
  const status = paid >= total - 0.005 ? 'bezahlt' : paid > 0 ? 'teilbezahlt' : 'offen';
  await DB.update(ctx.db, 'invoices', id, { paid, status, updated_at: nowIso() });
  await audit(ctx, 'zahlung_erfasst', 'rechnung', inv.number, { betrag: a, datum: d, status });
  return { paid, status };
}
async function sendDunning(ctx, id, { auto = false } = {}) {
  const s = await settingsOf(ctx);
  const inv = await DB.one(ctx.db, 'SELECT * FROM invoices WHERE id = ?', id);
  need(inv && ['offen', 'teilbezahlt'].includes(inv.status) && inv.kind !== 'storno', 409, 'F\u00fcr diese Rechnung ist keine Mahnung m\u00f6glich.');
  need((inv.dunning_level || 0) < DUNNING_MAX, 409, 'Die letzte Mahnstufe (2. Mahnung) ist bereits erreicht. Weiter geht es mit Inkasso bzw. gerichtlichem Mahnverfahren.');
  const level = (inv.dunning_level || 0) + 1;
  const org = inv.org_id ? await DB.one(ctx.db, 'SELECT * FROM orgs WHERE id = ?', inv.org_id) : null;
  const terms = await termsFor(ctx, org);
  // Stufe 1: kostenlose Zahlungserinnerung (Frist 5 Tage) \u00b7 Stufe 2: 1. Mahnung \u00b7 Stufe 3: 2. (letzte) Mahnung
  const fee = level === 2 ? round2(terms.fee1) : level === 3 ? round2(terms.fee2) : 0;
  const due = addDaysDate(berlinDate(nowMs()), Math.max(1, level === 1 ? terms.reminderDays : level === 2 ? terms.dueDays1 : terms.dueDays2) || 7);
  const fees = round2(inv.fees + fee), open = round2(inv.gross + fees - inv.paid);
  const pdf = renderDunningPdf(s, { ...inv, fees: inv.fees }, level, fee, due, open);
  const fileId = await putFile(ctx, { name: `${inv.number}-${DUNNING_LEVELS[level].replace(/\W+/g, '-')}.pdf`, mime: 'application/pdf', bytes: pdf, ownerType: 'dunning', ownerId: id });
  const rc = jparse(inv.recipient, {});
  const t = nowIso();
  const dunId = await DB.insert(ctx.db, 'dunnings', { invoice_id: id, level, fee, due_date: due, file_id: fileId, sent_at: t, sent_to: rc.email || null, created_by: ctx._staff ? ctx._staff.id : null, created_at: t });
  if (fee) await fibuBookDunningFee(ctx, id, fee, dunId); // Forderung an sonstige Ertr\u00e4ge
  await DB.update(ctx.db, 'invoices', id, { dunning_level: level, last_dunning_at: t, fees, updated_at: t });
  if (emailOk(rc.email)) await sendMail(ctx, { category: 'invoice', to: rc.email, toName: rc.name, replyTo: { email: s.company_email, name: `${s.company_name} Buchhaltung` }, subject: `${DUNNING_LEVELS[level]} zur Rechnung ${inv.number}`, title: `${DUNNING_LEVELS[level]} zur Rechnung ${inv.number}`,
    body: `<p>Sehr geehrte Damen und Herren,</p><p>${level === 1 ? 'zu unserer Rechnung' : 'trotz unserer Erinnerung ist die Rechnung'} <strong>${esc(inv.number)}</strong> vom ${esc(fmtDateDE(inv.issue_date))} ${level === 1 ? 'konnten wir noch keinen vollst\u00e4ndigen Zahlungseingang feststellen' : 'weiterhin offen'}. Bitte \u00fcberweisen Sie den offenen Betrag von <strong>${esc(money(open))}</strong>${fee ? ` (inkl. Mahngeb\u00fchr ${esc(money(fee))})` : ''} bis zum <strong>${esc(fmtDateDE(due))}</strong>.</p><p>Sollten Sie bereits gezahlt haben, betrachten Sie dieses Schreiben bitte als gegenstandslos.</p><p>Mit freundlichen Gr\u00fc\u00dfen<br>${esc(s.company_name)} \u2013 Buchhaltung</p>`,
    attachments: [{ name: `${inv.number}-${DUNNING_LEVELS[level]}.pdf`, base64: b64(pdf) }] });
  if (org) await notifyPartner(ctx, { orgId: org.id, roles: ['gf'] }, { kind: 'buchhaltung', title: `${DUNNING_LEVELS[level]}: Rechnung ${inv.number}`, body: `Offener Betrag ${money(open)}, bitte bis ${fmtDateDE(due)} begleichen.`, link: '#/einstellungen/rechnungen' });
  await audit(ctx, auto ? 'mahnung_automatisch' : 'mahnung', 'rechnung', inv.number, { stufe: DUNNING_LEVELS[level], gebuehr: fee });
  return { level, fee, due };
}
async function runDunningJobs(ctx) {
  const s = await settingsOf(ctx);
  if (!s.dunning_auto) return 0;
  const today = berlinDate(nowMs()); let n = 0;
  for (const inv of await DB.all(ctx.db, "SELECT * FROM invoices WHERE status IN ('offen','teilbezahlt') AND kind != 'storno' AND due_date < ? AND dunning_level < ?", today, DUNNING_MAX)) {
    const days = toInt(s['dunning_days_' + (inv.dunning_level + 1)], 1);
    // n\u00e4chste Stufe erst, wenn die Frist des letzten Schreibens (bzw. das Zahlungsziel) abgelaufen ist
    const ref = inv.dunning_level ? ((await DB.val(ctx.db, 'SELECT due_date FROM dunnings WHERE invoice_id = ? ORDER BY level DESC LIMIT 1', inv.id)) || berlinDate(msOf(inv.last_dunning_at))) : inv.due_date;
    if (addDaysDate(ref, days) <= today) { try { await sendDunning(ctx, inv.id, { auto: true }); n++; } catch (e) { console.log('Mahnung', e.message); } }
  }
  return n;
}

// Tagesabschluss: vorgemerkte Zahlungen (Eingangsrechnungen) \u2192 Zahlungsliste zur Freigabe durch die Gesch\u00e4ftsf\u00fchrung
async function runDayClose(ctx, { force = false } = {}) {
  const day = berlinDate(nowMs());
  if (!force && await DB.one(ctx.db, 'SELECT id FROM payruns WHERE day = ?', day)) return null;
  const items = await DB.all(ctx.db, "SELECT pi.*, s.name AS supplier, s.iban, s.bic FROM purchase_invoices pi JOIN suppliers s ON s.id = pi.supplier_id WHERE pi.status = 'zur_zahlung' AND (pi.pay_date IS NULL OR pi.pay_date <= ?)", addDaysDate(day, 1));
  if (!items.length) return null;
  const list = items.map((i) => ({ id: i.id, supplier: i.supplier, iban: i.iban, bic: i.bic, amount: round2(i.gross), purpose: `${i.number || 'Rechnung'} ${i.supplier}`, number: i.number, pay_date: i.pay_date }));
  const id = await DB.insert(ctx.db, 'payruns', { day, status: 'offen', total: round2(list.reduce((a, x) => a + x.amount, 0)), items: JSON.stringify(list), closed_at: nowIso(), created_at: nowIso() });
  for (const i of items) await DB.update(ctx.db, 'purchase_invoices', i.id, { status: 'in_zahlungsliste', updated_at: nowIso() });
  await notifyStaff(ctx, { perm: 'acc_release' }, { kind: 'buchhaltung', title: `Zahlungsliste ${fmtDateDE(day)} zur Freigabe`, body: `${list.length} Zahlung(en), ${money(list.reduce((a, x) => a + x.amount, 0))}`, link: '#/buchhaltung/zahlungen' });
  await audit(ctx, 'tagesabschluss', 'zahlungsliste', id, { anzahl: list.length });
  return id;
}
async function releasePayrun(ctx, id, execDate) {
  const s = await settingsOf(ctx);
  const pr = await DB.one(ctx.db, 'SELECT * FROM payruns WHERE id = ?', id);
  need(pr && pr.status === 'offen', 409, 'Diese Zahlungsliste ist bereits freigegeben.');
  need(ibanValid(s.company_iban), 400, 'Bitte hinterlege zuerst eine g\u00fcltige eigene IBAN in den Einstellungen (Firma).');
  const items = jparse(pr.items, []);
  const bad = items.filter((i) => !ibanValid(i.iban));
  need(!bad.length, 400, 'Ung\u00fcltige IBAN bei: ' + bad.map((b) => b.supplier).join(', '));
  const date = /^\d{4}-\d{2}-\d{2}$/.test(execDate || '') ? execDate : addDaysDate(pr.day, 1);
  const xml = buildSepaXml(s, { msgId: `KFL-${pr.day.replace(/-/g, '')}-${id}`, execDate: date, items: items.map((i) => ({ name: i.supplier, iban: i.iban, bic: i.bic, amount: i.amount, purpose: i.purpose, endToEnd: `KFL-PI-${i.id}` })) });
  const fileId = await putFile(ctx, { name: `SEPA-${pr.day}-${id}.xml`, mime: 'application/xml', bytes: enc.encode(xml), ownerType: 'payrun', ownerId: id });
  await DB.update(ctx.db, 'payruns', id, { status: 'freigegeben', released_by: ctx._staff.id, released_at: nowIso(), file_id: fileId });
  for (const i of items) await DB.update(ctx.db, 'purchase_invoices', i.id, { status: 'freigegeben', updated_at: nowIso() });
  await audit(ctx, 'zahlungsliste_freigegeben', 'zahlungsliste', id, { summe: pr.total, ausfuehrung: date });
  return fileId;
}


/* ===== 32-support.js ===== */
/* ============================================================
   Support: Tickets (Webseite / Intern / Partner / Kunde), Antworten,
   Eskalation nach 24 h, Archiv, \u00c4nderungsantr\u00e4ge, System-Fehlerliste
   ============================================================ */

async function createTicket(ctx, { tag, kind = 'ticket', category, subject, priority = 'normal', requester, orgId = null, requestId = null, text, payload = null, ack = true, notifyAdmin = false }) {
  const s = await settingsOf(ctx);
  const t = nowIso();
  const id = await DB.insert(ctx.db, 'tickets', { tag, kind, category: category || null, subject: str(subject, 200) || 'Support-Anfrage', priority, status: 'neu',
    requester_type: requester.type, requester_id: requester.id || null, requester_name: str(requester.name, 120), requester_email: str(requester.email, 200).toLowerCase(),
    org_id: orgId, request_id: requestId, payload: payload ? JSON.stringify(payload) : null, created_at: t, updated_at: t });
  await DB.insert(ctx.db, 'ticket_messages', { ticket_id: id, author_type: 'requester', author_id: requester.id || null, author_name: str(requester.name, 120), text: String(text || '').slice(0, 8000), internal: 0, created_at: t });
  await audit(ctx, 'support_ticket', 'ticket', id, { tag, kind, priority });
  await notifyStaff(ctx, notifyAdmin ? { roles: ['admin'] } : { perm: 'support_manage' }, { kind: 'support', title: `Support #${id} \u00b7 ${tag}${priority !== 'normal' ? ' \u00b7 ' + statusLabel(TICKET_PRIORITIES, priority) : ''}`, body: subject, link: `#/support/${id}` });
  if (ack && emailOk(requester.email)) {
    await sendMail(ctx, { category: 'system', to: requester.email, toName: requester.name, subject: `${s.support_ack_subject} (Ticket #${id})`, title: s.support_ack_subject,
      body: `<p>Hallo ${esc(requester.name || '')},</p><p>${esc(s.support_ack_text).replace(/\n/g, '<br>')}</p>${mailTable([['Ticketnummer', '#' + id], ['Betreff', subject], ['Eingang', fmtDE(t)]])}<p>Viele Gr\u00fc\u00dfe<br>Dein Support-Team der ${esc(s.company_name)}</p>` });
  }
  return id;
}

async function ticketReply(ctx, ticketId, { authorType, authorId, authorName, text, internal = false }) {
  const s = await settingsOf(ctx);
  const tk = await DB.one(ctx.db, 'SELECT * FROM tickets WHERE id = ?', ticketId);
  need(tk, 404, 'Ticket nicht gefunden.');
  need(str(text, 8000).length >= 1, 400, 'Bitte gib eine Nachricht ein.');
  const t = nowIso();
  await DB.insert(ctx.db, 'ticket_messages', { ticket_id: ticketId, author_type: authorType, author_id: authorId || null, author_name: authorName || '', text: String(text).slice(0, 8000), internal: internal ? 1 : 0, created_at: t });
  const upd = { updated_at: t };
  if (authorType === 'staff' && !internal && tk.status === 'neu') upd.status = 'in_bearbeitung';
  if (authorType !== 'staff' && tk.status === 'wartet') upd.status = 'in_bearbeitung';
  if (authorType !== 'staff' && tk.status === 'erledigt') upd.status = 'in_bearbeitung';
  await DB.update(ctx.db, 'tickets', ticketId, upd);
  if (authorType === 'staff' && !internal) {
    // Antwort an den Absender: News (Mitarbeiter/Partner) + E-Mail
    if (tk.requester_type === 'staff' && tk.requester_id) await notify(ctx, 'staff', tk.requester_id, { kind: 'support', title: `Antwort vom Support zu #${ticketId}`, body: String(text).slice(0, 300), link: `#/support/${ticketId}` });
    if (tk.requester_type === 'partner' && tk.requester_id) await notify(ctx, 'partner', tk.requester_id, { kind: 'support', title: `Antwort vom KFL-Support zu #${ticketId}`, body: String(text).slice(0, 300), link: `#/support/${ticketId}` });
    if (emailOk(tk.requester_email)) await sendMail(ctx, { category: 'support', to: tk.requester_email, toName: tk.requester_name, subject: `Re: ${tk.subject} (Ticket #${ticketId})`, title: 'Antwort vom KFL-Support',
      body: `<p>Hallo ${esc(tk.requester_name || '')},</p><p style="white-space:pre-wrap">${esc(text)}</p><p>Viele Gr\u00fc\u00dfe<br>Dein Support-Team der ${esc(s.company_name)}</p><p style="color:#6b6b70;font-size:12.5px">Ticket #${ticketId} \u00b7 ${esc(tk.subject)}</p>` });
  } else if (authorType !== 'staff') {
    await notifyStaff(ctx, tk.assignee_id ? { userIds: [tk.assignee_id] } : { perm: 'support_manage' }, { kind: 'support', title: `Neue Nachricht zu Support #${ticketId}`, body: String(text).slice(0, 200), link: `#/support/${ticketId}` });
  }
  return true;
}

// \u00c4nderungsantrag eines Partner-Gesch\u00e4ftsf\u00fchrers (Rollen, Konten l\u00f6schen) \u2192 Support best\u00e4tigt
async function applyChangeRequest(ctx, tk, approve, note) {
  const p = jparse(tk.payload, {});
  const t = nowIso();
  if (approve) {
    if (p.action === 'role' && p.user_id && PARTNER_ROLES[p.role]) await DB.run(ctx.db, 'UPDATE partner_users SET role = ? WHERE id = ? AND org_id = ?', p.role, p.user_id, tk.org_id);
    if (p.action === 'delete_user' && p.user_id) await DB.run(ctx.db, "UPDATE partner_users SET active = 0, email = email || '.geloescht-' || id, invite_hash = NULL WHERE id = ? AND org_id = ?", p.user_id, tk.org_id);
    if (p.action === 'add_user' && emailOk(p.email) && PARTNER_ROLES[p.role]) {
      const exists = await DB.one(ctx.db, 'SELECT id FROM partner_users WHERE email = ?', p.email.toLowerCase());
      if (!exists) {
        const inv = await newInvite();
        const uid = await DB.insert(ctx.db, 'partner_users', { org_id: tk.org_id, email: p.email.toLowerCase(), name: str(p.name, 80), role: p.role, phone: str(p.phone, 40), active: 1, invite_hash: inv.hash, invite_expires: inv.expires, created_at: t });
        await sendPartnerInvite(ctx, uid, inv.token);
      }
    }
    await partnerAudit(ctx, tk.org_id, `\u00c4nderung best\u00e4tigt: ${p.label || p.action}`);
  }
  await DB.update(ctx.db, 'tickets', tk.id, { status: 'erledigt', done_at: t, updated_at: t });
  await DB.insert(ctx.db, 'ticket_messages', { ticket_id: tk.id, author_type: 'staff', author_id: ctx._staff ? ctx._staff.id : null, author_name: ctx._staff ? ctx._staff.name : 'System', text: (approve ? '\u00c4nderung best\u00e4tigt und durchgef\u00fchrt.' : '\u00c4nderung abgelehnt.') + (note ? ' ' + note : ''), internal: 0, created_at: t });
  if (tk.requester_id) {
    await notify(ctx, 'partner', tk.requester_id, { kind: 'support', title: approve ? 'Deine \u00c4nderung wurde durchgef\u00fchrt' : 'Deine \u00c4nderung wurde abgelehnt', body: (p.label || '') + (note ? ' \u2013 ' + note : ''), link: `#/support/${tk.id}` });
    if (emailOk(tk.requester_email)) await sendMail(ctx, { category: 'support', to: tk.requester_email, toName: tk.requester_name, subject: approve ? `\u00c4nderung durchgef\u00fchrt (Ticket #${tk.id})` : `\u00c4nderung abgelehnt (Ticket #${tk.id})`,
      title: approve ? 'Deine \u00c4nderung wurde durchgef\u00fchrt.' : 'Deine \u00c4nderung wurde nicht durchgef\u00fchrt.', body: `<p>Hallo ${esc(tk.requester_name || '')},</p><p>${esc(p.label || 'Deine beantragte \u00c4nderung')} wurde ${approve ? 'vom KFL-Support best\u00e4tigt und durchgef\u00fchrt' : 'vom KFL-Support abgelehnt'}.${note ? '<br>' + esc(note) : ''}</p>` });
  }
  await audit(ctx, approve ? 'aenderung_bestaetigt' : 'aenderung_abgelehnt', 'ticket', tk.id, p);
}
async function partnerAudit(ctx, orgId, text) { await DB.insert(ctx.db, 'org_notes', { org_id: orgId, user_id: ctx._staff ? ctx._staff.id : null, text, created_at: nowIso() }); }

/* ---------- Einladungs-E-Mail an Gesch\u00e4ftspartner (tabellenbasiert, f\u00fcr alle Mailprogramme) ---------- */
function partnerMailHtml(s, { preheader, kicker, headline, intro, cta, link, facts = [], steps = [], perks = [], note }) {
  const F = 'Helvetica,Arial,sans-serif', ink = '#16171a', grey = '#6b6e74', orange = '#ff6c01';
  const btn = (href, label) => `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 8px"><tr><td bgcolor="${orange}" style="border-radius:999px;mso-padding-alt:15px 30px"><a href="${esc(href)}" target="_blank" style="display:inline-block;padding:15px 30px;font:700 16px ${F};color:#ffffff;text-decoration:none;border-radius:999px">${esc(label)} &rarr;</a></td></tr></table>`;
  const logo = `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${orange}" style="border-radius:8px;padding:9px 12px 8px;line-height:1">
      <div style="font:italic 900 24px/1 ${F};color:#fff;letter-spacing:-.5px">KFL<span style="display:inline-block;width:14px;height:3px;background:#fff;margin-left:3px;vertical-align:4px;transform:skewX(-24deg)"></span></div>
      <div style="font:700 8px/1.25 ${F};color:#fff;letter-spacing:1.2px;margin-top:5px">KAUFEN<br><span style="color:#ffd9bd;font-size:6.5px">FINANZIEREN</span><br>LEASEN</div></td></tr></table>`;
  const factRows = facts.filter(([, v]) => v).map(([k, v]) => `<tr><td style="padding:9px 0;border-bottom:1px solid #ececee;font:13px ${F};color:${grey};width:42%">${esc(k)}</td><td style="padding:9px 0;border-bottom:1px solid #ececee;font:600 14px ${F};color:${ink}">${esc(v)}</td></tr>`).join('');
  const stepRows = steps.map((t, i) => `<tr><td valign="top" style="padding:0 14px 14px 0;width:34px"><div style="width:30px;height:30px;border-radius:50%;background:${i === 0 ? orange : ink};color:#fff;text-align:center;font:700 14px/30px ${F}">${i + 1}</div></td><td valign="top" style="padding:5px 0 14px;font:15px/1.5 ${F};color:${ink}">${t}</td></tr>`).join('');
  const perkCells = perks.map(([t, d]) => `<tr><td style="padding:0 6px 8px"><div style="background:#f6f7f8;border-radius:12px;padding:13px 16px;border-left:3px solid ${orange}"><div style="font:700 14px ${F};color:${ink}">${esc(t)}</div><div style="font:13.5px/1.45 ${F};color:${grey};margin-top:2px">${esc(d)}</div></div></td></tr>`).join('');
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(headline)}</title></head>
<body style="margin:0;padding:0;background:#eef0f2">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#eef0f2"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;background:#ffffff;border-radius:18px;overflow:hidden">
  <tr><td bgcolor="#141518" style="padding:26px 32px 24px;background:#141518;background-image:linear-gradient(135deg,#141518 55%,#5a2a08)">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td>${logo}</td><td align="right" style="font:600 12px ${F};color:#a9acb2">Partner-Dashboard</td></tr></table>
    <div style="font:700 12px ${F};letter-spacing:1.5px;color:#ffb27a;text-transform:uppercase;margin-top:28px">${esc(kicker)}</div>
    <div style="font:italic 900 30px/1.15 ${F};color:#ffffff;letter-spacing:-.5px;margin-top:8px">${esc(headline)}</div></td></tr>
  <tr><td style="padding:30px 32px 8px">
    <div style="font:16px/1.6 ${F};color:${ink}">${intro}</div>
    ${btn(link, cta)}
    <div style="font:12.5px/1.5 ${F};color:${grey}">Der Button funktioniert nicht? Kopiere diesen Link in deinen Browser:<br><a href="${esc(link)}" style="color:#b84d00;word-break:break-all">${esc(link)}</a></div>
  </td></tr>
  ${factRows ? `<tr><td style="padding:22px 32px 4px"><div style="font:700 12px ${F};letter-spacing:1.2px;color:${grey};text-transform:uppercase;margin-bottom:4px">Dein Zugang</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${factRows}</table></td></tr>` : ''}
  ${stepRows ? `<tr><td style="padding:26px 32px 4px"><div style="font:700 12px ${F};letter-spacing:1.2px;color:${grey};text-transform:uppercase;margin-bottom:14px">So startest du</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${stepRows}</table></td></tr>` : ''}
  ${perkCells ? `<tr><td style="padding:14px 26px 6px"><div style="font:700 12px ${F};letter-spacing:1.2px;color:${grey};text-transform:uppercase;margin:0 6px 12px">Was dich erwartet</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${perkCells}</table></td></tr>` : ''}
  <tr><td style="padding:22px 32px 30px"><div style="font:15px/1.6 ${F};color:${ink}">Wir freuen uns auf die Zusammenarbeit!<br>Dein <b style="color:${orange};font-style:italic">KFL</b> Team</div>
    ${note ? `<div style="font:12.5px/1.5 ${F};color:${grey};margin-top:18px;padding-top:16px;border-top:1px solid #ececee">${note}</div>` : ''}</td></tr>
  <tr><td bgcolor="#f6f7f8" style="padding:20px 32px;font:12px/1.6 ${F};color:${grey}">
    <b style="color:${ink}">${esc(s.company_name)}</b> \u00b7 ${esc(s.company_street)} \u00b7 ${esc(s.company_zip)} ${esc(s.company_city)}<br>
    ${esc(s.company_email)}${s.company_phone ? ' \u00b7 ' + esc(s.company_phone) : ''} \u00b7 ${esc(s.company_web || '')}<br>
    <span style="color:#9a9da3">Diese E-Mail wurde automatisch versendet. Bitte antworte nicht direkt \u2013 schreib uns bei Fragen an ${esc(s.company_email)}.</span></td></tr>
</table></td></tr></table></body></html>`;
}

async function sendPartnerInvite(ctx, uid, token, { reset = false, tempPassword = null } = {}) {
  const s = await settingsOf(ctx);
  const u = await DB.one(ctx.db, 'SELECT u.*, o.name AS org_name FROM partner_users u JOIN orgs o ON o.id = u.org_id WHERE u.id = ?', uid);
  const base = s.link_partner || ((ctx.origin || '') + '/partner');
  const link = token ? `${base.replace(/\/$/, '')}#/einladung/${token}` : base;
  const first = esc(String(u.name || '').split(/\s+/)[0] || '');
  const validUntil = fmtDE(nowMs() + INVITE_DAYS * 86400e3);
  const replyTo = { email: s.company_email, name: s.company_name };
  if (tempPassword) {
    const html = partnerMailHtml(s, { preheader: 'Dein vorl\u00e4ufiges Passwort f\u00fcr das KFL-Partner-Dashboard', kicker: 'Passwort zur\u00fcckgesetzt', headline: 'Dein vorl\u00e4ufiges Passwort', link: base, cta: 'Zum Partner-Dashboard',
      intro: `<p style="margin:0 0 14px">Hallo ${first},</p><p style="margin:0 0 14px">dein Passwort f\u00fcr das KFL-Partner-Dashboard wurde zur\u00fcckgesetzt. Dein vorl\u00e4ufiges Passwort lautet:</p><p style="margin:0;font:700 20px monospace;background:#f6f7f8;border-radius:10px;padding:12px 16px;display:inline-block">${esc(tempPassword)}</p><p style="margin:14px 0 0">Bitte melde dich an und vergib direkt ein eigenes Passwort.</p>`,
      note: 'Du hast kein neues Passwort angefordert? Dann melde dich bitte umgehend beim KFL-Support.' });
    return sendMail(ctx, { category: 'system', to: u.email, toName: u.name, subject: 'Dein vorl\u00e4ufiges Passwort f\u00fcr das KFL-Partner-Dashboard', html, replyTo });
  }
  if (reset) {
    const html = partnerMailHtml(s, { preheader: 'Lege jetzt ein neues Passwort f\u00fcr dein KFL-Partner-Dashboard fest.', kicker: 'Neues Passwort', headline: 'Neues Passwort festlegen', link, cta: 'Neues Passwort festlegen',
      intro: `<p style="margin:0 0 14px">Hallo ${first},</p><p style="margin:0">\u00fcber den folgenden Button legst du ein neues Passwort f\u00fcr dein KFL-Partner-Dashboard fest. Der Link ist bis zum <b>${esc(validUntil)}</b> g\u00fcltig.</p>`,
      facts: [['Anmelde-E-Mail', u.email], ['Unternehmen', u.org_name]], note: 'Du hast das nicht angefordert? Dann ignoriere diese E-Mail einfach \u2013 dein bisheriges Passwort bleibt g\u00fcltig.' });
    return sendMail(ctx, { category: 'system', to: u.email, toName: u.name, subject: 'Neues Passwort f\u00fcr dein KFL-Partner-Dashboard', html, replyTo });
  }
  const html = partnerMailHtml(s, {
    preheader: `Dein Zugang f\u00fcr ${u.org_name} ist bereit \u2013 jetzt Passwort festlegen und loslegen.`,
    kicker: 'Willkommen als KFL-Partner', headline: `Sch\u00f6n, dass du dabei bist, ${String(u.name || '').split(/\s+/)[0] || 'Partner'}!`,
    intro: `<p style="margin:0 0 14px">Hallo ${first},</p><p style="margin:0">f\u00fcr <b>${esc(u.org_name)}</b> haben wir deinen pers\u00f6nlichen Zugang zum <b>KFL-Partner-Dashboard</b> eingerichtet. Dort landen ab sofort die Kundenanfragen aus deiner Region \u2013 zum Kaufen, Finanzieren und Leasen. Mit einem Klick legst du dein Passwort fest und bist startklar.</p>`,
    cta: 'Jetzt Zugang aktivieren', link,
    facts: [['Anmelde-E-Mail', u.email], ['Unternehmen', u.org_name], ['Rolle', (PARTNER_ROLES[u.role] || {}).label], ['Link g\u00fcltig bis', validUntil]],
    steps: ['<b>Button klicken</b> und die Einladung \u00f6ffnen.', '<b>Passwort festlegen</b> (mindestens 10 Zeichen) und AGB sowie Datenschutz best\u00e4tigen.', '<b>Loslegen:</b> Neue Anfragen \u00fcbernehmen, Angebot abgeben und Kunden gewinnen.'],
    perks: [['Anfragen in Echtzeit', 'Neue Kundenanfragen aus deiner Region sofort im Dashboard und per E-Mail.'], ['24 Std. Angebotsfrist', 'Eine Uhr zeigt dir an jeder Anfrage, wie viel Zeit noch bleibt.'], ['Kontakt nach Zusage', 'Nimmt der Kunde dein Angebot an, erh\u00e4ltst du direkt seine Kontaktdaten.']],
    note: `Diese Einladung ist pers\u00f6nlich und nur f\u00fcr ${esc(u.email)} bestimmt. Du hast sie nicht erwartet? Dann ignoriere diese E-Mail einfach.`
  });
  return sendMail(ctx, { category: 'system', to: u.email, toName: u.name, subject: `Deine Einladung zum KFL-Partner-Dashboard \u2013 ${u.org_name}`, html, replyTo });
}

async function runSupportJobs(ctx) {
  const s = await settingsOf(ctx);
  const t = nowIso(), res = { escalated: 0, archived: 0, toBackup: 0, sysToBackup: 0 };
  // Eskalation: nach 24 h ohne Bearbeitung \u2192 Priorit\u00e4t hoch
  const cut = isoOf(nowMs() - s.support_escalate_hours * 3600e3);
  for (const tk of await DB.all(ctx.db, "SELECT * FROM tickets WHERE status = 'neu' AND priority = 'normal' AND created_at < ? AND archived_at IS NULL", cut)) {
    await DB.update(ctx.db, 'tickets', tk.id, { priority: 'hoch', escalated_at: t, updated_at: t });
    await DB.insert(ctx.db, 'ticket_messages', { ticket_id: tk.id, author_type: 'system', author_name: 'System', text: `Automatisch auf Priorit\u00e4t \u201eHoch\u201c gesetzt (seit ${s.support_escalate_hours} Stunden unbearbeitet).`, internal: 1, created_at: t });
    res.escalated++;
  }
  // Erledigte Tickets: nach X Tagen ins Backup-Archiv verschieben
  const arch = isoOf(nowMs() - s.support_archive_days * 86400e3);
  for (const tk of await DB.all(ctx.db, "SELECT * FROM tickets WHERE status = 'erledigt' AND done_at < ? AND archived_at IS NULL", arch)) {
    const msgs = await DB.all(ctx.db, 'SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY id', tk.id);
    await DB.insert(ctx.db, 'archive', { kind: 'ticket', ref_id: tk.id, title: `#${tk.id} ${tk.subject}`, data: JSON.stringify({ ticket: tk, messages: msgs }), archived_at: t, expires_at: null });
    await DB.update(ctx.db, 'tickets', tk.id, { archived_at: t, updated_at: t });
    res.toBackup++;
  }
  // System-Fehlerliste: erledigte Eintr\u00e4ge nach 365 Tagen aus dem Archiv entfernen
  for (const si of await DB.all(ctx.db, "SELECT * FROM sys_issues WHERE status = 'erledigt' AND done_at IS NOT NULL AND id NOT IN (SELECT ref_id FROM archive WHERE kind = 'sysissue')")) {
    await DB.insert(ctx.db, 'archive', { kind: 'sysissue', ref_id: si.id, title: si.title, data: JSON.stringify(si), archived_at: t, expires_at: isoOf(msOf(si.done_at) + s.syslist_retention_days * 86400e3) });
    res.sysToBackup++;
  }
  await DB.run(ctx.db, 'DELETE FROM archive WHERE expires_at IS NOT NULL AND expires_at < ?', t);
  await DB.run(ctx.db, "DELETE FROM sys_issues WHERE status = 'erledigt' AND done_at < ?", isoOf(nowMs() - s.syslist_retention_days * 86400e3));
  return res;
}

/* ---------- News, Chat, Abwesenheit ---------- */
function audienceMatchesStaff(aud, u) {
  if (!aud || aud.type === 'all') return true;
  if (aud.type === 'roles') return (aud.values || []).includes(u.role);
  if (aud.type === 'users') return (aud.values || []).map(Number).includes(u.id);
  return false;
}
function audienceMatchesPartner(aud, p) {
  if (!aud || aud.type === 'partners_all') return true;
  if (aud.type === 'orgs') return (aud.values || []).map(Number).includes(p.orgId);
  if (aud.type === 'partner_users') return (aud.values || []).map(Number).includes(p.id);
  if (aud.type === 'brands') { const ob = jparse(p.org.brands, []).map(normBrand); return ob.includes('*') || (aud.values || []).some((b) => ob.includes(normBrand(b))); }
  if (aud.type === 'partner_roles') return (aud.values || []).includes(p.role);
  return false;
}
async function newsFor(ctx, readerType, reader, { limit = 50 } = {}) {
  const scope = readerType === 'staff' ? 'staff' : 'partner';
  const posts = await DB.all(ctx.db, 'SELECT p.*, r.read_at FROM news_posts p LEFT JOIN news_reads r ON r.post_id = p.id AND r.reader_type = ? AND r.reader_id = ? WHERE p.scope = ? ORDER BY p.id DESC LIMIT 200', readerType, reader.id, scope);
  const match = readerType === 'staff' ? audienceMatchesStaff : audienceMatchesPartner;
  const list = posts.filter((p) => match(jparse(p.audience, {}), reader)).slice(0, limit).map((p) => ({ id: p.id, kind: 'post', title: p.title, body: p.body, author: p.author_name, important: !!p.important, created_at: p.created_at, read: !!p.read_at }));
  const notes = await DB.all(ctx.db, 'SELECT * FROM notifications WHERE recipient_type = ? AND recipient_id = ? ORDER BY id DESC LIMIT ?', readerType, reader.id, limit);
  return { posts: list, notifications: notes.map((n) => ({ id: n.id, kind: n.kind, title: n.title, body: n.body, link: n.link, created_at: n.created_at, read: !!n.read_at })) };
}

async function chatList(ctx, u) {
  const chats = await DB.all(ctx.db, `SELECT c.*, m.last_read_at, (SELECT COUNT(*) FROM chat_messages x WHERE x.chat_id = c.id AND x.user_id != ? AND (m.last_read_at IS NULL OR x.created_at > m.last_read_at)) AS unread,
    (SELECT text FROM chat_messages x WHERE x.chat_id = c.id ORDER BY x.id DESC LIMIT 1) AS last_text FROM chats c JOIN chat_members m ON m.chat_id = c.id AND m.user_id = ? ORDER BY COALESCE(c.last_at, c.created_at) DESC`, u.id, u.id);
  for (const c of chats) c.members = await DB.all(ctx.db, 'SELECT u.id, u.name, u.role_key FROM chat_members m JOIN users u ON u.id = m.user_id WHERE m.chat_id = ?', c.id);
  return chats;
}
async function chatOpen(ctx, u, { userIds, title }) {
  const ids = uniq((userIds || []).map(Number).filter((x) => x && x !== u.id));
  need(ids.length, 400, 'Bitte w\u00e4hle mindestens eine Person aus.');
  const users = await DB.all(ctx.db, `SELECT id, role_key, active FROM users WHERE id IN (${inList(ids)})`, ...ids);
  need(users.length === ids.length && users.every((x) => x.active), 400, 'Unbekannte oder gesperrte Person ausgew\u00e4hlt.');
  if (ids.length === 1) {
    const ex = await DB.one(ctx.db, "SELECT c.id FROM chats c WHERE c.kind = 'direct' AND (SELECT COUNT(*) FROM chat_members m WHERE m.chat_id = c.id) = 2 AND EXISTS (SELECT 1 FROM chat_members m WHERE m.chat_id = c.id AND m.user_id = ?) AND EXISTS (SELECT 1 FROM chat_members m WHERE m.chat_id = c.id AND m.user_id = ?)", u.id, ids[0]);
    if (ex) return ex.id;
  } else {
    need(users.every((x) => x.role_key === u.role) || u.role === 'admin' || u.role === 'gf', 403, 'Gruppenchats sind mit Personen der gleichen Rolle m\u00f6glich.');
  }
  const cid = await DB.insert(ctx.db, 'chats', { kind: ids.length === 1 ? 'direct' : 'group', title: ids.length > 1 ? (str(title, 80) || 'Gruppe') : null, created_by: u.id, created_at: nowIso(), last_at: nowIso() });
  for (const id of [u.id, ...ids]) await DB.run(ctx.db, 'INSERT INTO chat_members (chat_id, user_id, last_read_at) VALUES (?, ?, ?)', cid, id, id === u.id ? nowIso() : null);
  await audit(ctx, 'chat_erstellt', 'chat', cid, { mitglieder: ids.length + 1 });
  return cid;
}
async function chatSend(ctx, u, chatId, text) {
  const m = await DB.one(ctx.db, 'SELECT 1 AS ok FROM chat_members WHERE chat_id = ? AND user_id = ?', chatId, u.id);
  need(m, 403, 'Du bist nicht Mitglied dieses Chats.');
  need(str(text, 4000).length, 400, 'Bitte gib eine Nachricht ein.');
  const t = nowIso();
  await DB.insert(ctx.db, 'chat_messages', { chat_id: chatId, user_id: u.id, text: String(text).slice(0, 4000), created_at: t });
  await DB.run(ctx.db, 'UPDATE chats SET last_at = ? WHERE id = ?', t, chatId);
  await DB.run(ctx.db, 'UPDATE chat_members SET last_read_at = ? WHERE chat_id = ? AND user_id = ?', t, chatId, u.id);
}

async function requestAbsence(ctx, u, { from, to, substituteId, note }) {
  need(/^\d{4}-\d{2}-\d{2}$/.test(from || '') && /^\d{4}-\d{2}-\d{2}$/.test(to || '') && from <= to, 400, 'Bitte gib einen g\u00fcltigen Zeitraum an.');
  const sub = substituteId ? await DB.one(ctx.db, 'SELECT id, name, role_key, active FROM users WHERE id = ?', substituteId) : null;
  if (substituteId) {
    need(sub && sub.active && sub.id !== u.id, 400, 'Bitte w\u00e4hle eine aktive Vertretung aus.');
    need(((STAFF_ROLES[sub.role_key] || {}).rank || 0) >= u.rank && (sub.role_key === u.role || STAFF_ROLES[sub.role_key].rank > u.rank), 400, 'Die Vertretung muss die gleiche oder eine h\u00f6here Rolle haben.');
  }
  const id = await DB.insert(ctx.db, 'absences', { user_id: u.id, from_date: from, to_date: to, substitute_id: sub ? sub.id : null, status: sub ? 'angefragt' : 'bestaetigt', note: str(note, 300), created_at: nowIso() });
  if (sub) await notify(ctx, 'staff', sub.id, { kind: 'vertretung', title: `${u.name} bittet dich um Vertretung`, body: `${fmtDateDE(from)} \u2013 ${fmtDateDE(to)}${note ? ' \u00b7 ' + note : ''}. Bitte best\u00e4tige oder lehne ab.`, link: '#/news/vertretung' });
  await audit(ctx, 'abwesenheit', 'abwesenheit', id, { from, to, vertretung: sub ? sub.name : null });
  return id;
}


/* ===== 33-backup-stats.js ===== */
/* ============================================================
   Backup (t\u00e4glich 0:01, verschl\u00fcsselt), Sicherheitsbericht,
   Aufbewahrungsfristen, Statistik inkl. Prognose und Shopify
   ============================================================ */

const BACKUP_TABLES = ['requests', 'notes', 'events', 'assignments', 'offers', 'partner_events', 'orgs', 'org_notes', 'partner_users', 'partner_notes', 'users', 'roles',
  'settings', 'audit', 'news_posts', 'news_reads', 'notifications', 'chats', 'chat_members', 'chat_messages', 'absences', 'tickets', 'ticket_messages', 'sys_issues', 'archive',
  'billing_items', 'invoices', 'dunnings', 'payments', 'suppliers', 'purchase_invoices', 'payruns', 'surveys', 'files', 'mail_outbox', 'geo_cache', 'acc_notes', 'fibu_accounts', 'fibu_entries', 'fibu_lines', 'fibu_docs', 'fibu_periods'];
const SECRET_COLS = { users: ['pass_hash', 'pass_salt', 'invite_hash'], partner_users: ['pass_hash', 'pass_salt', 'invite_hash'] };

async function securityReport(ctx) {
  const s = await settingsOf(ctx);
  const since = isoOf(nowMs() - 86400e3), t = nowIso();
  const issues = [];
  const failed = await DB.val(ctx.db, "SELECT COUNT(*) FROM audit WHERE action = 'login_fehlgeschlagen' AND at >= ?", since);
  const locks = await DB.val(ctx.db, "SELECT COUNT(*) FROM audit WHERE action = 'login_gesperrt' AND at >= ?", since);
  if (failed >= 20) issues.push({ level: 'hoch', text: `${failed} fehlgeschlagene Anmeldungen in 24 Stunden \u2013 m\u00f6glicher Angriff auf Konten.` }); else if (failed) issues.push({ level: 'info', text: `${failed} fehlgeschlagene Anmeldungen in 24 Stunden.` });
  if (locks) issues.push({ level: 'mittel', text: `${locks} Konto-Sperren wegen Fehlversuchen in 24 Stunden.` });
  const admins = await DB.val(ctx.db, "SELECT COUNT(*) FROM users WHERE role_key = 'admin' AND active = 1");
  if (admins > 3) issues.push({ level: 'mittel', text: `${admins} aktive Admin-Konten \u2013 bitte pr\u00fcfen, ob alle n\u00f6tig sind.` });
  const stale = await DB.val(ctx.db, 'SELECT COUNT(*) FROM users WHERE active = 1 AND (last_login IS NULL OR last_login < ?)', isoOf(nowMs() - 90 * 86400e3));
  if (stale) issues.push({ level: 'info', text: `${stale} aktive Mitarbeiterkonten ohne Anmeldung seit 90 Tagen.` });
  const pstale = await DB.val(ctx.db, 'SELECT COUNT(*) FROM partner_users WHERE active = 1 AND pass_hash IS NOT NULL AND (last_login IS NULL OR last_login < ?)', isoOf(nowMs() - 90 * 86400e3));
  if (pstale) issues.push({ level: 'info', text: `${pstale} aktive Partnerkonten ohne Anmeldung seit 90 Tagen.` });
  const mailErr = await DB.val(ctx.db, "SELECT COUNT(*) FROM mail_outbox WHERE status = 'fehler' AND created_at >= ?", since);
  if (mailErr) issues.push({ level: 'hoch', text: `${mailErr} E-Mails konnten in 24 Stunden nicht zugestellt werden.` });
  if (!mailProvider(await mailEnv(ctx))) issues.push({ level: 'hoch', text: 'Kein E-Mail-Versand eingerichtet (SMTP_USER/SMTP_PASS oder BREVO_API_KEY) \u2013 E-Mails werden nur im Postausgang protokolliert.' });
  if (!(await rawSetting(ctx.db, '_area_pw'))) issues.push({ level: 'hoch', text: 'Das Bereichspasswort f\u00fcr Protokoll und Backup ist noch das Standardpasswort. Bitte \u00e4ndern.' });
  if (!(await rawSetting(ctx.db, '_backup_pw'))) issues.push({ level: 'hoch', text: 'Kein eigenes Backup-Passwort festgelegt \u2013 Backups sind mit dem Server-Schl\u00fcssel verschl\u00fcsselt.' });
  if (!ctx.env.FILES) issues.push({ level: 'info', text: 'Kein R2-Dateispeicher verbunden \u2013 Dateien und Backups liegen in der Datenbank (Gr\u00f6\u00dfenlimit beachten).' });
  if (!s.company_iban) issues.push({ level: 'mittel', text: 'Keine Bankverbindung in den Firmendaten \u2013 erscheint nicht auf Rechnungen, SEPA-Export nicht m\u00f6glich.' });
  if (!s.company_tax_no && !s.company_vat_id) issues.push({ level: 'hoch', text: 'Steuernummer bzw. USt-IdNr. fehlt \u2013 Pflichtangabe auf Rechnungen (\u00a7 14 UStG).' });
  const spam = await DB.val(ctx.db, 'SELECT COUNT(*) FROM requests WHERE created_at >= ?', since);
  if (spam > 200) issues.push({ level: 'mittel', text: `${spam} Anfragen in 24 Stunden \u2013 ungew\u00f6hnlich hohes Aufkommen.` });
  const deletes = await DB.val(ctx.db, "SELECT COUNT(*) FROM audit WHERE action LIKE '%geloescht%' AND at >= ?", since);
  if (deletes > 10) issues.push({ level: 'mittel', text: `${deletes} L\u00f6schvorg\u00e4nge in 24 Stunden.` });
  const rights = await DB.all(ctx.db, "SELECT actor_name, action, at FROM audit WHERE action IN ('rechte_geaendert','rolle_geaendert','bereichspasswort_geaendert','backup_passwort_geaendert') AND at >= ? ORDER BY id DESC LIMIT 20", since);
  for (const r of rights) issues.push({ level: 'info', text: `${r.actor_name}: ${r.action.replace(/_/g, ' ')} (${fmtDE(r.at)})` });
  return { created_at: t, version: APP_VERSION, issues, ok: !issues.some((i) => i.level === 'hoch') };
}

async function backupPassword(ctx) { const sealed = await rawSetting(ctx.db, '_backup_pw'); return sealed ? await openSecret(ctx.env, sealed) : serverKey(ctx.env); }

async function createBackup(ctx, { kind = 'auto' } = {}) {
  const s = await settingsOf(ctx);
  const data = { meta: { app: 'KFL Plattform', version: APP_VERSION, created_at: nowIso(), kind }, tables: {} };
  for (const tbl of BACKUP_TABLES) {
    try {
      let rows = await DB.all(ctx.db, `SELECT * FROM ${tbl}`);
      if (SECRET_COLS[tbl]) rows = rows.map((r) => { const c = { ...r }; for (const k of SECRET_COLS[tbl]) if (c[k]) c[k] = '[gesch\u00fctzt]'; return c; });
      if (tbl === 'settings') rows = rows.map((r) => (r.key.startsWith('_') ? { ...r, value: '[gesch\u00fctzt]' } : r));
      data.tables[tbl] = rows;
    } catch (e) { data.tables[tbl] = { error: e.message }; }
  }
  // Systemcode (optional \u00fcber die Cloudflare-API)
  if (ctx.env.CF_API_TOKEN && ctx.env.CF_ACCOUNT_ID) {
    try {
      const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ctx.env.CF_ACCOUNT_ID}/workers/scripts/${ctx.env.CF_SCRIPT_NAME || 'kfl-plattform'}/content/v2`, { headers: { Authorization: 'Bearer ' + ctx.env.CF_API_TOKEN } });
      data.system_code = res.ok ? await res.text() : `Nicht abrufbar (${res.status})`;
    } catch (e) { data.system_code = 'Nicht abrufbar: ' + e.message; }
  } else data.system_code = 'Nicht enthalten \u2013 f\u00fcr die Sicherung des Codes CF_API_TOKEN und CF_ACCOUNT_ID hinterlegen (Code liegt zus\u00e4tzlich versioniert in GitHub).';
  const report = await securityReport(ctx);
  data.security_report = report;
  const json = enc.encode(JSON.stringify(data));
  const zipped = await gzip(json);
  const box = await encryptBytes(await backupPassword(ctx), zipped);
  const fileText = JSON.stringify({ format: 'kfl-backup-1', created_at: data.meta.created_at, compression: 'gzip', ...box });
  const sha = await sha256Hex(fileText);
  const name = `KFL-Backup-${berlinDate(nowMs())}-${berlinTime(nowMs()).replace(':', '')}.kflbackup.txt`;
  const fileId = await putFile(ctx, { name, mime: 'text/plain', bytes: enc.encode(fileText), ownerType: 'backup' });
  const id = await DB.insert(ctx.db, 'backups', { created_at: nowIso(), kind, size: fileText.length, sha256: sha, file_id: fileId, report: JSON.stringify(report) });
  let uploaded = null;
  if (s.backup_webhook_url && /^https:\/\//.test(s.backup_webhook_url)) {
    try { const r = await fetch(s.backup_webhook_url, { method: 'PUT', headers: { 'Content-Type': 'text/plain', 'X-KFL-Backup': name }, body: fileText }); uploaded = r.ok ? 'hochgeladen' : 'Fehler ' + r.status; } catch (e) { uploaded = 'Fehler: ' + e.message; }
    await DB.update(ctx.db, 'backups', id, { uploaded });
  }
  // Aufbewahrung: nur die letzten N Backups behalten
  const keep = Math.max(3, toInt(s.backup_keep, 30));
  for (const old of await DB.all(ctx.db, 'SELECT id, file_id FROM backups ORDER BY id DESC LIMIT -1 OFFSET ?', keep)) { await deleteFile(ctx, old.file_id); await DB.run(ctx.db, 'DELETE FROM backups WHERE id = ?', old.id); }
  await audit(ctx, 'backup_erstellt', 'backup', id, { groesse: fileText.length, art: kind, hochgeladen: uploaded });
  if (!report.ok) await notifyStaff(ctx, { roles: ['admin'] }, { kind: 'sicherheit', title: 'Sicherheitsbericht: Handlungsbedarf', body: report.issues.filter((i) => i.level === 'hoch').map((i) => i.text).join(' \u00b7 '), link: '#/backup' });
  return id;
}
async function retentionJobs(ctx) {
  const s = await settingsOf(ctx);
  const cut = isoOf(nowMs() - toInt(s.audit_retention_days, 30) * 86400e3);
  await DB.run(ctx.db, 'DELETE FROM audit WHERE at < ?', cut);
  await DB.run(ctx.db, 'DELETE FROM sessions WHERE expires_at < ?', nowIso());
  await DB.run(ctx.db, 'DELETE FROM partner_sessions WHERE expires_at < ?', nowIso());
  await DB.run(ctx.db, 'DELETE FROM notifications WHERE created_at < ? AND read_at IS NOT NULL', isoOf(nowMs() - 180 * 86400e3));
  await DB.run(ctx.db, 'DELETE FROM mail_outbox WHERE created_at < ?', isoOf(nowMs() - 90 * 86400e3));
  // Anfragen nach Aufbewahrungsfrist (Datenschutz, Standard 24 Monate)
  const days = toInt(ctx.env.RETENTION_DAYS || 730, 730);
  const old = await DB.all(ctx.db, 'SELECT id FROM requests WHERE created_at < ?', isoOf(nowMs() - days * 86400e3));
  for (const r of old) {
    for (const t of ['notes', 'events', 'partner_events', 'surveys']) await DB.run(ctx.db, `DELETE FROM ${t} WHERE request_id = ?`, r.id);
    for (const o of await DB.all(ctx.db, 'SELECT * FROM offers WHERE request_id = ?', r.id)) for (const f of [o.pdf_file_id, o.expose_file_id, o.public_file_id, o.public_expose_id]) if (f) await deleteFile(ctx, f);
    await DB.run(ctx.db, 'DELETE FROM offers WHERE request_id = ?', r.id);
    await DB.run(ctx.db, 'DELETE FROM assignments WHERE request_id = ?', r.id);
    await DB.run(ctx.db, "UPDATE requests SET customer_name = NULL, email = NULL, phone = NULL, data = '{}', deleted = 1 WHERE id = ? AND billed = 1", r.id);
    await DB.run(ctx.db, 'DELETE FROM requests WHERE id = ? AND billed = 0', r.id);
  }
  return old.length;
}

/* ---------- Statistik ---------- */
function periodOf(q) {
  const now = nowMs();
  const to = q.to && /^\d{4}-\d{2}-\d{2}$/.test(q.to) ? q.to : berlinDate(now);
  const from = q.from && /^\d{4}-\d{2}-\d{2}$/.test(q.from) ? q.from : addDaysDate(to, -29);
  const days = Math.round((Date.parse(to) - Date.parse(from)) / 86400e3) + 1;
  const prevTo = addDaysDate(from, -1), prevFrom = addDaysDate(prevTo, -(days - 1));
  const lyFrom = `${+from.slice(0, 4) - 1}${from.slice(4)}`, lyTo = `${+to.slice(0, 4) - 1}${to.slice(4)}`;
  const iso = (d, end) => isoOf(berlinToUtc(+d.slice(0, 4), +d.slice(5, 7), +d.slice(8, 10) + (end ? 1 : 0), 0, 0));
  return { from, to, days, range: [iso(from), iso(to, true)], prev: [iso(prevFrom), iso(prevTo, true)], ly: [iso(lyFrom), iso(lyTo, true)], prevFrom, prevTo, lyFrom, lyTo };
}
async function kpis(ctx, [a, b]) {
  const db = ctx.db;
  const req = await DB.one(db, `SELECT COUNT(*) AS total, SUM(type='deal') AS deal, SUM(type='sell') AS sell, SUM(status IN ('kontaktdaten_versendet','angebot_akzeptiert')) AS won, SUM(status='kein_angebot') AS no_offer, SUM(status='spam') AS spam FROM requests WHERE created_at >= ? AND created_at < ? AND (deleted = 0 OR status = 'spam')`, a, b);
  const off = await DB.one(db, "SELECT COUNT(*) AS n, SUM(status='angenommen') AS accepted, SUM(status IN ('nicht_ausgewaehlt','abgelehnt_kunde')) AS rejected FROM offers WHERE created_at >= ? AND created_at < ?", a, b);
  const inv = await DB.one(db, "SELECT COALESCE(SUM(net),0) AS net, COALESCE(SUM(gross),0) AS gross, COUNT(*) AS n FROM invoices WHERE status != 'storniert' AND kind != 'storno' AND issue_date >= ? AND issue_date <= ?", a.slice(0, 10), isoOf(msOf(b) - 1).slice(0, 10));
  const paid = await DB.val(db, 'SELECT COALESCE(SUM(amount),0) FROM payments WHERE date >= ? AND date <= ?', a.slice(0, 10), isoOf(msOf(b) - 1).slice(0, 10));
  const fees = await DB.val(db, 'SELECT COALESCE(SUM(fee),0) FROM dunnings WHERE created_at >= ? AND created_at < ?', a, b);
  const dunn = await DB.val(db, 'SELECT COUNT(*) FROM dunnings WHERE created_at >= ? AND created_at < ?', a, b);
  const exp = await DB.one(db, "SELECT COALESCE(SUM(net),0) AS net, COALESCE(SUM(gross),0) AS gross FROM purchase_invoices WHERE date >= ? AND date <= ?", a.slice(0, 10), isoOf(msOf(b) - 1).slice(0, 10));
  const kulanz = await DB.val(db, "SELECT COALESCE(-SUM(net),0) FROM invoices WHERE kind = 'storno' AND issue_date >= ? AND issue_date <= ?", a.slice(0, 10), isoOf(msOf(b) - 1).slice(0, 10));
  const newOrgs = await DB.val(db, 'SELECT COUNT(*) FROM orgs WHERE created_at >= ? AND created_at < ? AND deleted = 0', a, b);
  const tickets = await DB.val(db, 'SELECT COUNT(*) FROM tickets WHERE created_at >= ? AND created_at < ?', a, b);
  return { requests: req.total || 0, deal: req.deal || 0, sell: req.sell || 0, won: req.won || 0, no_offer: req.no_offer || 0, spam: req.spam || 0,
    offers: off.n || 0, offers_accepted: off.accepted || 0, offers_rejected: off.rejected || 0, conversion: req.total ? round2((req.won || 0) / req.total * 100) : 0,
    revenue_net: round2(inv.net), revenue_gross: round2(inv.gross), invoices: inv.n || 0, payments: round2(paid), dunning_fees: round2(fees), dunnings: dunn,
    expenses_net: round2(exp.net), expenses_gross: round2(exp.gross), profit_net: round2(inv.net - exp.net), kulanz: round2(kulanz), new_partners: newOrgs, tickets };
}
async function statsOverview(ctx, q) {
  const P = periodOf(q);
  const [cur, prev, ly] = [await kpis(ctx, P.range), await kpis(ctx, P.prev), await kpis(ctx, P.ly)];
  const todayStart = isoOf(berlinToUtc(...berlinDate(nowMs()).split('-').map(Number), 0, 0));
  const today = await kpis(ctx, [todayStart, nowIso()]);
  const yStart = isoOf(msOf(todayStart) - 86400e3);
  const yesterday = await kpis(ctx, [yStart, todayStart]);
  const pm = berlinParts(nowMs());
  const mStart = isoOf(berlinToUtc(pm.y, pm.m, 1)), lmStart = isoOf(berlinToUtc(pm.y, pm.m - 1, 1));
  const month = await kpis(ctx, [mStart, nowIso()]), lastMonth = await kpis(ctx, [lmStart, mStart]);
  // Prognose der n\u00e4chsten 30 Tage: 70 % letzte 30 Tage + 30 % gleiche Zeit im Vorjahr
  const last30 = await kpis(ctx, [isoOf(nowMs() - 30 * 86400e3), nowIso()]);
  const lyNext = await kpis(ctx, [isoOf(nowMs() - 365 * 86400e3), isoOf(nowMs() - 335 * 86400e3)]);
  const hasLy = lyNext.requests || lyNext.revenue_net;
  const fc = (k) => round2(hasLy ? last30[k] * 0.7 + lyNext[k] * 0.3 : last30[k]);
  const forecast = { requests: fc('requests'), won: fc('won'), revenue_net: fc('revenue_net'), expenses_net: fc('expenses_net'), profit_net: round2(fc('revenue_net') - fc('expenses_net')), basis: hasLy ? 'letzte 30 Tage (70 %) und Vorjahr (30 %)' : 'letzte 30 Tage' };
  const open = await DB.one(ctx.db, "SELECT COUNT(*) AS n, COALESCE(SUM(gross + fees - paid),0) AS sum FROM invoices WHERE status IN ('offen','teilbezahlt') AND kind != 'storno'");
  const overdue = await DB.one(ctx.db, "SELECT COUNT(*) AS n, COALESCE(SUM(gross + fees - paid),0) AS sum FROM invoices WHERE status IN ('offen','teilbezahlt') AND kind != 'storno' AND due_date < ?", berlinDate(nowMs()));
  const daily = await DB.all(ctx.db, `SELECT substr(created_at,1,10) AS day, COUNT(*) AS n, SUM(status IN ('kontaktdaten_versendet','angebot_akzeptiert')) AS won FROM requests WHERE created_at >= ? AND created_at < ? GROUP BY day ORDER BY day`, ...P.range);
  const brands = await DB.all(ctx.db, "SELECT COALESCE(NULLIF(brand,''),'(ohne)') AS brand, COUNT(*) AS n FROM requests WHERE created_at >= ? AND created_at < ? AND deleted = 0 GROUP BY brand ORDER BY n DESC LIMIT 12", ...P.range);
  const sources = await DB.all(ctx.db, "SELECT COALESCE(NULLIF(source,''),'Webseite') AS source, COUNT(*) AS n, SUM(status IN ('kontaktdaten_versendet','angebot_akzeptiert')) AS won FROM requests WHERE created_at >= ? AND created_at < ? AND deleted = 0 GROUP BY source ORDER BY n DESC LIMIT 15", ...P.range);
  const statuses = await DB.all(ctx.db, 'SELECT status, COUNT(*) AS n FROM requests WHERE created_at >= ? AND created_at < ? GROUP BY status', ...P.range);
  return { period: { from: P.from, to: P.to, days: P.days, prevFrom: P.prevFrom, prevTo: P.prevTo, lyFrom: P.lyFrom, lyTo: P.lyTo }, cur, prev, ly, today, yesterday, month, lastMonth, forecast,
    open: { n: open.n, sum: round2(open.sum) }, overdue: { n: overdue.n, sum: round2(overdue.sum) }, daily, brands, sources, statuses };
}
async function staffPerformance(ctx, q, onlyRole) {
  const P = periodOf(q);
  const users = await DB.all(ctx.db, `SELECT id, name, role_key FROM users WHERE active = 1 ${onlyRole ? "AND role_key IN ('vertrieb','teamleitung')" : ''} ORDER BY name`);
  const out = [];
  for (const u of users) {
    const acts = await DB.val(ctx.db, 'SELECT COUNT(*) FROM events WHERE user_id = ? AND created_at >= ? AND created_at < ?', u.id, ...P.range);
    const assigned = await DB.val(ctx.db, 'SELECT COUNT(*) FROM requests WHERE assignee_id = ? AND created_at >= ? AND created_at < ?', u.id, ...P.range);
    const firsts = await DB.all(ctx.db, `SELECT r.created_at, MIN(e.created_at) AS first FROM requests r JOIN events e ON e.request_id = r.id AND e.user_id = ? WHERE r.created_at >= ? AND r.created_at < ? GROUP BY r.id`, u.id, ...P.range);
    const reaction = firsts.length ? Math.round(firsts.reduce((a, f) => a + (msOf(f.first) - msOf(f.created_at)), 0) / firsts.length / 60000) : null;
    const tickets = await DB.val(ctx.db, "SELECT COUNT(DISTINCT ticket_id) FROM ticket_messages WHERE author_type = 'staff' AND author_id = ? AND created_at >= ? AND created_at < ?", u.id, ...P.range);
    out.push({ id: u.id, name: u.name, role: u.role_key, actions: acts, assigned, handled: firsts.length, reaction_min: reaction, tickets });
  }
  return out;
}
async function partnerPerformance(ctx, q, orgId) {
  const P = periodOf(q);
  const orgs = orgId ? await DB.all(ctx.db, 'SELECT * FROM orgs WHERE id = ?', orgId) : await DB.all(ctx.db, 'SELECT * FROM orgs WHERE deleted = 0 ORDER BY name');
  const out = [];
  for (const o of orgs) {
    const a = await DB.one(ctx.db, `SELECT COUNT(*) AS n, SUM(status NOT IN ('neu','verloren')) AS worked, SUM(offer_id IS NOT NULL) AS offers, SUM(status IN ('gewonnen','kontaktiert','nicht_erreicht')) AS won,
      SUM(status = 'verloren') AS lost, SUM(status = 'geschlossen') AS closed, AVG(CASE WHEN sent_at IS NOT NULL THEN (julianday(sent_at) - julianday(created_at)) * 24 END) AS hours FROM assignments WHERE org_id = ? AND created_at >= ? AND created_at < ?`, o.id, ...P.range);
    const rating = await DB.one(ctx.db, 'SELECT AVG(rating) AS avg, COUNT(*) AS n FROM surveys WHERE org_id = ? AND rating IS NOT NULL', o.id);
    const users = await DB.one(ctx.db, 'SELECT SUM(active = 1) AS active, SUM(active = 0) AS inactive FROM partner_users WHERE org_id = ?', o.id);
    const tk = await DB.one(ctx.db, "SELECT COUNT(*) AS n FROM tickets WHERE org_id = ?", o.id);
    const replyH = await DB.val(ctx.db, `SELECT AVG((julianday(m.created_at) - julianday(t.created_at)) * 24) FROM tickets t JOIN ticket_messages m ON m.ticket_id = t.id AND m.author_type = 'requester' AND m.id != (SELECT MIN(id) FROM ticket_messages WHERE ticket_id = t.id) WHERE t.org_id = ?`, o.id);
    out.push({ id: o.id, name: o.name, kind: o.kind, active: !!o.active, received: a.n || 0, worked: a.worked || 0, offers: a.offers || 0, won: a.won || 0, lost: a.lost || 0, closed: a.closed || 0,
      offer_rate: a.n ? round2((a.offers || 0) / a.n * 100) : 0, win_rate: a.offers ? round2((a.won || 0) / a.offers * 100) : 0, avg_hours: a.hours != null ? round2(a.hours) : null,
      rating: rating.n ? round2(rating.avg) : null, ratings: rating.n, users_active: users.active || 0, users_inactive: users.inactive || 0, tickets: tk.n || 0, support_reply_h: replyH != null ? round2(replyH) : null });
  }
  return out;
}
async function shopifyStats(ctx, q) {
  const token = ctx.env.SHOPIFY_ADMIN_TOKEN, shop = ctx.env.SHOPIFY_SHOP || '3r1qns-2d.myshopify.com';
  if (!token) return { configured: false };
  const P = periodOf(q);
  const gql = async (query, variables) => {
    const res = await fetch(`https://${shop}/admin/api/2025-10/graphql.json`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token }, body: JSON.stringify({ query, variables }) });
    if (!res.ok) throw new Error('Shopify ' + res.status);
    const j = await res.json(); if (j.errors) throw new Error(JSON.stringify(j.errors).slice(0, 200)); return j.data;
  };
  const range = async (from, to) => {
    let after = null, orders = [], guard = 0;
    do {
      const d = await gql(`query($q:String!,$after:String){orders(first:100,after:$after,query:$q){pageInfo{hasNextPage endCursor} nodes{createdAt displayFinancialStatus totalPriceSet{shopMoney{amount}} customer{id numberOfOrders} lineItems(first:20){nodes{title quantity}}}}}`, { q: `created_at:>=${from} created_at:<=${to}`, after });
      orders = orders.concat(d.orders.nodes); after = d.orders.pageInfo.hasNextPage ? d.orders.pageInfo.endCursor : null;
    } while (after && ++guard < 10);
    const revenue = round2(orders.reduce((a, o) => a + parseFloat(o.totalPriceSet.shopMoney.amount || 0), 0));
    const products = {}; for (const o of orders) for (const li of o.lineItems.nodes) products[li.title] = (products[li.title] || 0) + li.quantity;
    const newCustomers = orders.filter((o) => o.customer && +o.customer.numberOfOrders === 1).length;
    return { orders: orders.length, revenue, aov: orders.length ? round2(revenue / orders.length) : 0, newCustomers, top: Object.entries(products).sort((a, b) => b[1] - a[1]).slice(0, 10) };
  };
  try {
    return { configured: true, shop, period: { from: P.from, to: P.to }, cur: await range(P.from, P.to), prev: await range(P.prevFrom, P.prevTo), ly: await range(P.lyFrom, P.lyTo) };
  } catch (e) { return { configured: true, error: e.message }; }
}


/* ===== 34-ledger.js ===== */
/* ============================================================
   Finanzbuchhaltung: Konten, doppelte Buchf\u00fchrung (Soll/Haben), Umsatzsteuer,
   Belegarchiv (nummeriert, mit SHA-256), Monats- und Jahresabschl\u00fcsse,
   automatische Buchungen aus Rechnungen, Zahlungen und Eingangsrechnungen,
   Anfangsbest\u00e4nde und Import alter Buchf\u00fchrung (PDF/CSV)
   Grundsatz (GoBD): Buchungen werden nie gel\u00f6scht, nur storniert (Gegenbuchung).
   ============================================================ */

const fibuPeriod = (date) => String(date).slice(0, 7);
const fibuMonthEnd = (period) => { const [y, m] = period.split('-').map(Number); return `${period}-${String(lastDayOfMonth(y, m)).padStart(2, '0')}`; };
const prevPeriod = (period) => { let [y, m] = period.split('-').map(Number); m--; if (!m) { m = 12; y--; } return `${y}-${String(m).padStart(2, '0')}`; };
const nextPeriod = (period) => { let [y, m] = period.split('-').map(Number); m++; if (m > 12) { m = 1; y++; } return `${y}-${String(m).padStart(2, '0')}`; };
const fibuWho = (ctx) => (ctx._staff ? ctx._staff.name : ctx.actor && ctx.actor.name) || 'System';
const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ''));
// Normalseite: Aktiv- und Aufwandskonten nehmen im Soll zu, Passiv- und Ertragskonten im Haben
const debitNormal = (type) => type === 'aktiv' || type === 'aufwand';
const saldoOf = (type, debit, credit) => round2(debitNormal(type) ? debit - credit : credit - debit);

async function fibuNextNo(ctx, key, prefix, date) {
  const year = String(date || berlinDate(nowMs())).slice(0, 4);
  for (let guard = 0; guard < 50; guard++) {
    const k = `_fibu_no_${key}_${year}`;
    const n = toInt(jparse(await rawSetting(ctx.db, k), 1), 1);
    await setRawSetting(ctx.db, k, JSON.stringify(n + 1));
    const number = `${prefix}-${year}-${String(n).padStart(5, '0')}`;
    const table = key === 'beleg' ? 'fibu_docs' : 'fibu_entries';
    if (!(await DB.one(ctx.db, `SELECT id FROM ${table} WHERE number = ?`, number))) return number;
  }
  throw new HttpError(500, 'Nummer konnte nicht vergeben werden.');
}
async function fibuAccountBySys(ctx, sys) {
  const a = await DB.one(ctx.db, 'SELECT * FROM fibu_accounts WHERE sys = ?', sys);
  need(a, 500, `Systemkonto \u201e${sys}\u201c fehlt im Kontenrahmen.`);
  return a;
}
// Konto \u00fcber Datensatz, interne ID (Zahl) oder Systemrolle/Kontonummer (Text)
async function fibuAccount(ctx, ref) {
  if (ref && typeof ref === 'object') return ref;
  const a = typeof ref === 'number' ? await DB.one(ctx.db, 'SELECT * FROM fibu_accounts WHERE id = ?', ref) : await DB.one(ctx.db, 'SELECT * FROM fibu_accounts WHERE sys = ? OR number = ?', String(ref), String(ref));
  need(a, 400, `Konto ${ref} nicht gefunden.`);
  return a;
}
// Periode gesperrt? (Monat abgeschlossen oder ganzes Jahr abgeschlossen)
async function fibuClosed(ctx, period) {
  const r = await DB.one(ctx.db, "SELECT id FROM fibu_periods WHERE status = 'abgeschlossen' AND (period = ? OR period = ?)", period, period.slice(0, 4));
  return !!r;
}
// Automatische Buchungen in gesperrte Perioden landen am ersten Tag der n\u00e4chsten offenen Periode
async function fibuOpenDate(ctx, date) {
  let d = date, guard = 0;
  while (await fibuClosed(ctx, fibuPeriod(d)) && guard++ < 36) d = nextPeriod(fibuPeriod(d)) + '-01';
  return d;
}

/* ---------- Buchen ---------- */
async function fibuPost(ctx, { date, text, lines, docId = null, source = 'manuell', sourceId = null, auto = false, reverses = null }) {
  need(isDate(date), 400, 'Bitte ein g\u00fcltiges Buchungsdatum angeben.');
  text = str(text, 300); need(text, 400, 'Bitte einen Buchungstext angeben.');
  if (await fibuClosed(ctx, fibuPeriod(date))) {
    need(auto, 409, `Der Zeitraum ${fibuPeriod(date).split('-').reverse().join('/')} ist abgeschlossen. Buchungen sind dort nicht mehr m\u00f6glich \u2013 bitte ein Datum im offenen Zeitraum w\u00e4hlen (oder der Admin \u00f6ffnet den Zeitraum wieder).`);
    date = await fibuOpenDate(ctx, date);
  }
  const rows = [];
  for (const l of lines) {
    const debit = round2(toNum(l.debit, 0) || 0), credit = round2(toNum(l.credit, 0) || 0);
    if (!debit && !credit) continue;
    need(debit >= 0 && credit >= 0, 400, 'Betr\u00e4ge m\u00fcssen positiv sein (Soll oder Haben).');
    const a = await fibuAccount(ctx, l.account);
    need(a.status === 'offen', 409, `Das Konto ${a.number} ${a.name} ist geschlossen. Darauf kann nicht mehr gebucht werden.`);
    rows.push({ account_id: a.id, debit, credit });
  }
  need(rows.length >= 2, 400, 'Eine Buchung braucht mindestens ein Soll- und ein Habenkonto.');
  const sd = round2(rows.reduce((s, r) => s + r.debit, 0)), sc = round2(rows.reduce((s, r) => s + r.credit, 0));
  need(Math.abs(sd - sc) < 0.005 && sd > 0, 400, `Soll (${money(sd)}) und Haben (${money(sc)}) m\u00fcssen gleich sein.`);
  const number = await fibuNextNo(ctx, 'buchung', 'BU', date);
  const id = await DB.insert(ctx.db, 'fibu_entries', { number, date, period: fibuPeriod(date), text, doc_id: docId, source, source_id: sourceId == null ? null : String(sourceId), reverses, created_by: fibuWho(ctx), created_at: nowIso() });
  for (const r of rows) await DB.insert(ctx.db, 'fibu_lines', { entry_id: id, ...r });
  return id;
}
// Einfache Buchung \u201eSoll an Haben\u201c mit optionaler Umsatzsteuer-Aufteilung (Betrag = brutto)
async function fibuSimple(ctx, { date, text, debit, credit, amount, vatRate = 0, docId = null, source = 'manuell', sourceId = null, auto = false }) {
  const gross = round2(toNum(amount, 0) || 0); need(gross > 0, 400, 'Bitte einen Betrag gr\u00f6\u00dfer 0 angeben.');
  const da = await fibuAccount(ctx, debit), ca = await fibuAccount(ctx, credit);
  need(da.id !== ca.id, 400, 'Soll- und Habenkonto m\u00fcssen verschieden sein.');
  const rate = toNum(vatRate, 0) || 0;
  if (!rate) return fibuPost(ctx, { date, text, docId, source, sourceId, auto, lines: [{ account: da, debit: gross }, { account: ca, credit: gross }] });
  need([7, 19].includes(rate), 400, 'Umsatzsteuer: 0, 7 oder 19 %.');
  const net = round2(gross / (1 + rate / 100)), vat = round2(gross - net);
  if (da.type === 'aufwand' || (da.type === 'aktiv' && ca.type !== 'ertrag' && !['bank', 'kasse'].includes(da.sys))) {
    const vst = await fibuAccountBySys(ctx, rate === 7 ? 'vorsteuer7' : 'vorsteuer');
    return fibuPost(ctx, { date, text, docId, source, sourceId, auto, lines: [{ account: da, debit: net }, { account: vst, debit: vat }, { account: ca, credit: gross }] });
  }
  need(ca.type === 'ertrag', 400, 'Umsatzsteuer kann nur bei Aufwands- (Vorsteuer) oder Ertragskonten (Umsatzsteuer) aufgeteilt werden.');
  const ust = await fibuAccountBySys(ctx, rate === 7 ? 'umsatzsteuer7' : 'umsatzsteuer');
  return fibuPost(ctx, { date, text, docId, source, sourceId, auto, lines: [{ account: da, debit: gross }, { account: ca, credit: net }, { account: ust, credit: vat }] });
}
// Storno einer Buchung: Gegenbuchung mit vertauschten Seiten (Original bleibt sichtbar)
async function fibuReverse(ctx, id, reason) {
  const e = await DB.one(ctx.db, 'SELECT * FROM fibu_entries WHERE id = ?', id);
  need(e, 404, 'Buchung nicht gefunden.');
  need(!e.reversed_by && !e.reverses, 409, e.reverses ? 'Eine Stornobuchung kann nicht erneut storniert werden.' : 'Diese Buchung wurde bereits storniert.');
  reason = str(reason, 200); need(reason.length >= 3, 400, 'Bitte einen Grund f\u00fcr das Storno angeben.');
  const lines = await DB.all(ctx.db, 'SELECT * FROM fibu_lines WHERE entry_id = ?', id);
  const today = berlinDate(nowMs());
  const date = (await fibuClosed(ctx, e.period)) ? today : (e.date > today ? e.date : today);
  for (const l of lines) { const a = await DB.one(ctx.db, 'SELECT status FROM fibu_accounts WHERE id = ?', l.account_id); need(a.status === 'offen', 409, 'Ein beteiligtes Konto ist geschlossen. Bitte zuerst wieder \u00f6ffnen (Admin).'); }
  const sid = await fibuPost(ctx, { date, text: `Storno ${e.number}: ${reason}`, docId: e.doc_id, source: 'storno', sourceId: e.id, reverses: e.id, lines: lines.map((l) => ({ account: l.account_id, debit: l.credit, credit: l.debit })) });
  await DB.update(ctx.db, 'fibu_entries', id, { reversed_by: sid });
  await audit(ctx, 'buchung_storniert', 'buchung', e.number, { grund: reason });
  return sid;
}

/* ---------- Belegarchiv ---------- */
async function fibuArchive(ctx, { kind = 'sonstiges', title, date, amount = null, counterparty = null, ref = null, file = null, fileId = null, note = null }) {
  need(FIBU_DOC_KINDS[kind], 400, 'Unbekannte Belegart.');
  let bytes = null, size = null;
  if (file && file.base64) {
    bytes = unb64(String(file.base64).replace(/\s+/g, ''));
    need(bytes.length <= 10 * 1024 * 1024, 400, 'Der Beleg ist zu gro\u00df (max. 10 MB).');
    need(/pdf/i.test(file.type || 'application/pdf') || /\.pdf$/i.test(file.name || ''), 400, 'Bitte den Beleg als PDF hochladen.');
    fileId = await putFile(ctx, { name: file.name || 'beleg.pdf', mime: 'application/pdf', bytes, ownerType: 'beleg', ownerId: null });
  } else if (fileId) { const f = await getFile(ctx, fileId); bytes = f ? f.bytes : null; }
  need(fileId, 400, 'Bitte den Beleg als PDF hochladen.');
  size = bytes ? bytes.length : null;
  const d = isDate(date) ? date : berlinDate(nowMs());
  const number = await fibuNextNo(ctx, 'beleg', 'BE', d);
  const id = await DB.insert(ctx.db, 'fibu_docs', { number, date: d, kind, title: str(title, 200) || FIBU_DOC_KINDS[kind], amount: amount == null || amount === '' ? null : round2(toNum(amount, 0)), counterparty: str(counterparty, 200) || null,
    ref: str(ref, 100) || null, file_id: fileId, sha256: bytes ? await sha256Hex(bytes) : null, size, note: str(note, 1000) || null, created_by: fibuWho(ctx), created_at: nowIso() });
  await DB.run(ctx.db, "UPDATE files SET owner_type = 'beleg', owner_id = ? WHERE id = ? AND (owner_type IS NULL OR owner_type = 'beleg')", id, fileId);
  await audit(ctx, 'beleg_archiviert', 'beleg', number, { art: kind, titel: title });
  return id;
}

/* ---------- Kontost\u00e4nde und Berichte ---------- */
async function fibuBalances(ctx, { from = null, to = null } = {}) {
  const accts = await DB.all(ctx.db, 'SELECT * FROM fibu_accounts ORDER BY number');
  const sums = async (cond, args) => Object.fromEntries((await DB.all(ctx.db, `SELECT l.account_id, COALESCE(SUM(l.debit),0) AS d, COALESCE(SUM(l.credit),0) AS c FROM fibu_lines l JOIN fibu_entries e ON e.id = l.entry_id WHERE ${cond} GROUP BY l.account_id`, ...args)).map((r) => [r.account_id, r]));
  const before = from ? await sums('e.date < ?', [from]) : {};
  const within = await sums(from && to ? 'e.date >= ? AND e.date <= ?' : to ? 'e.date <= ?' : '1=1', from && to ? [from, to] : to ? [to] : []);
  return accts.map((a) => {
    const b = before[a.id] || { d: 0, c: 0 }, w = within[a.id] || { d: 0, c: 0 };
    const opening = from ? saldoOf(a.type, b.d, b.c) : 0;
    return { ...a, opening, debit: round2(w.d), credit: round2(w.c), saldo: round2(opening + saldoOf(a.type, w.d, w.c)) };
  });
}
async function fibuReport(ctx, period) {
  const year = period.slice(0, 4), isYear = period.length === 4;
  const from = isYear ? `${year}-01-01` : `${period}-01`, to = isYear ? `${year}-12-31` : fibuMonthEnd(period);
  const rows = await fibuBalances(ctx, { from, to });
  // GuV: Erfolgskonten im Zeitraum (ohne Vortrag), Ergebnis seit Jahresbeginn
  const guv = rows.filter((a) => a.type === 'ertrag' || a.type === 'aufwand').map((a) => ({ number: a.number, name: a.name, type: a.type, amount: saldoOf(a.type, a.debit, a.credit) }));
  const income = round2(guv.filter((g) => g.type === 'ertrag').reduce((s, g) => s + g.amount, 0)), expense = round2(guv.filter((g) => g.type === 'aufwand').reduce((s, g) => s + g.amount, 0));
  const ytd = isYear ? null : await fibuBalances(ctx, { from: `${year}-01-01`, to });
  const ytdResult = ytd ? round2(ytd.filter((a) => a.type === 'ertrag').reduce((s, a) => s + saldoOf(a.type, a.debit, a.credit), 0) - ytd.filter((a) => a.type === 'aufwand').reduce((s, a) => s + saldoOf(a.type, a.debit, a.credit), 0)) : null;
  // Bestandskonten (Verm\u00f6gen/Schulden) zum Stichtag \u2013 alle Buchungen bis Periodenende
  const stock = (await fibuBalances(ctx, { to })).filter((a) => a.type === 'aktiv' || a.type === 'passiv').map((a) => ({ number: a.number, name: a.name, type: a.type, saldo: a.saldo }));
  const entries = await DB.val(ctx.db, 'SELECT COUNT(*) FROM fibu_entries WHERE date >= ? AND date <= ?', from, to);
  const docs = await DB.val(ctx.db, 'SELECT COUNT(*) FROM fibu_docs WHERE date >= ? AND date <= ?', from, to);
  const openRec = await DB.one(ctx.db, "SELECT COUNT(*) AS n, COALESCE(SUM(gross + fees - paid),0) AS sum FROM invoices WHERE status IN ('offen','teilbezahlt') AND kind != 'storno' AND issue_date <= ?", to);
  const openPay = await DB.one(ctx.db, "SELECT COUNT(*) AS n, COALESCE(SUM(gross),0) AS sum FROM purchase_invoices WHERE status != 'bezahlt' AND date <= ?", to);
  return { period, kind: isYear ? 'jahr' : 'monat', from, to, created_at: nowIso(),
    accounts: rows.filter((a) => a.opening || a.debit || a.credit || a.saldo).map((a) => ({ number: a.number, name: a.name, type: a.type, opening: a.opening, debit: a.debit, credit: a.credit, saldo: a.saldo })),
    guv, income, expense, result: round2(income - expense), ytdResult, stock, entries, docs,
    openReceivables: { n: openRec.n, sum: round2(openRec.sum) }, openPayables: { n: openPay.n, sum: round2(openPay.sum) } };
}
const periodLabel = (p) => (p.length === 4 ? `Jahr ${p}` : `${['Januar', 'Februar', 'M\u00e4rz', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'][+p.slice(5) - 1]} ${p.slice(0, 4)}`);
function renderFibuReportPdf(s, r) {
  const title = r.kind === 'jahr' ? `Jahresabschluss ${r.period}` : `Monatsabschluss ${periodLabel(r.period)}`;
  const sub = `${s.company_name} \u00b7 Zeitraum ${fmtDateDE(r.from)} \u2013 ${fmtDateDE(r.to)} \u00b7 erstellt ${fmtDE(msOf(r.created_at))} \u00b7 ${r.entries} Buchungen, ${r.docs} Belege`;
  return renderReportPdf(s, title, sub, [
    { title: 'Ergebnis', columns: ['', 'Betrag'], widths: [mm(120), mm(50)], rows: [['Ertr\u00e4ge', money(r.income)], ['Aufwendungen', money(r.expense)], [r.result >= 0 ? 'Gewinn im Zeitraum' : 'Verlust im Zeitraum', money(r.result)], ...(r.ytdResult != null ? [['Ergebnis seit Jahresbeginn', money(r.ytdResult)]] : []),
      ['Offene Forderungen (Ausgangsrechnungen)', `${money(r.openReceivables.sum)} (${r.openReceivables.n})`], ['Offene Verbindlichkeiten (Eingangsrechnungen)', `${money(r.openPayables.sum)} (${r.openPayables.n})`]] },
    { title: 'Gewinn- und Verlustrechnung', columns: ['Konto', 'Bezeichnung', 'Art', 'Betrag'], widths: [mm(20), mm(90), mm(25), mm(35)], rows: r.guv.filter((g) => g.amount).map((g) => [g.number, g.name, g.type === 'ertrag' ? 'Ertrag' : 'Aufwand', money(g.amount)]) },
    { title: 'Summen- und Saldenliste', columns: ['Konto', 'Bezeichnung', 'Vortrag', 'Soll', 'Haben', 'Saldo'], widths: [mm(16), mm(62), mm(23), mm(23), mm(23), mm(23)], rows: r.accounts.map((a) => [a.number, a.name, money(a.opening), money(a.debit), money(a.credit), money(a.saldo)]) },
    { title: `Bestandskonten zum ${fmtDateDE(r.to)}`, columns: ['Konto', 'Bezeichnung', 'Art', 'Saldo'], widths: [mm(20), mm(90), mm(25), mm(35)], rows: r.stock.filter((a) => a.saldo).map((a) => [a.number, a.name, a.type === 'aktiv' ? 'Aktiva' : 'Passiva', money(a.saldo)]) }
  ]);
}
async function fibuClosePeriod(ctx, period, { auto = false, silent = false } = {}) {
  need(/^\d{4}(-\d{2})?$/.test(period), 400, 'Ung\u00fcltiger Zeitraum.');
  const isYear = period.length === 4;
  const today = berlinDate(nowMs());
  need((isYear ? `${period}-12-31` : fibuMonthEnd(period)) < today, 409, 'Ein Zeitraum kann erst nach seinem Ende abgeschlossen werden.');
  const ex = await DB.one(ctx.db, 'SELECT * FROM fibu_periods WHERE period = ?', period);
  need(!ex || ex.status !== 'abgeschlossen', 409, 'Dieser Zeitraum ist bereits abgeschlossen.');
  if (isYear) for (let m = 1; m <= 12; m++) { const p = `${period}-${String(m).padStart(2, '0')}`; if (!(await DB.one(ctx.db, "SELECT id FROM fibu_periods WHERE period = ? AND status = 'abgeschlossen'", p)) && fibuMonthEnd(p) < today) await fibuClosePeriod(ctx, p, { auto: true, silent: true }).catch(() => null); }
  const s = await settingsOf(ctx);
  const report = await fibuReport(ctx, period);
  const pdf = renderFibuReportPdf(s, report);
  const label = isYear ? `Jahresabschluss ${period}` : `Monatsabschluss ${periodLabel(period)}`;
  const fileId = await putFile(ctx, { name: `${isYear ? 'Jahresabschluss' : 'Monatsabschluss'}-${period}.pdf`, mime: 'application/pdf', bytes: pdf, ownerType: 'abschluss', ownerId: null });
  const docId = await fibuArchive(ctx, { kind: 'abschluss', title: label, date: report.to, amount: report.result, fileId, note: auto ? 'Automatisch erstellt' : `Erstellt von ${fibuWho(ctx)}` });
  const row = { period, kind: isYear ? 'jahr' : 'monat', status: 'abgeschlossen', report: JSON.stringify(report), file_id: fileId, doc_id: docId, closed_by: auto ? 'System (automatisch)' : fibuWho(ctx), closed_at: nowIso() };
  if (ex) await DB.update(ctx.db, 'fibu_periods', ex.id, row); else await DB.insert(ctx.db, 'fibu_periods', row);
  await audit(ctx, isYear ? 'jahresabschluss' : 'monatsabschluss', 'abschluss', period, { ergebnis: report.result, buchungen: report.entries });
  // Neue Nachricht an Gesch\u00e4ftsf\u00fchrung (und Admin)
  if (!silent) await notifyStaff(ctx, { perm: 'fibu_manage' }, { kind: 'buchhaltung', title: `${label} liegt vor`, body: `${report.result >= 0 ? 'Gewinn' : 'Verlust'} im Zeitraum: ${money(report.result)} \u00b7 Ertr\u00e4ge ${money(report.income)} \u00b7 Aufwand ${money(report.expense)}${report.ytdResult != null ? ` \u00b7 seit Jahresbeginn ${money(report.ytdResult)}` : ''}. Der Bericht liegt als PDF im Belegarchiv.`, link: '#/fibu/abschluesse' });
  return { period, result: report.result, docId };
}
async function fibuReopenPeriod(ctx, period) {
  const ex = await DB.one(ctx.db, "SELECT * FROM fibu_periods WHERE period = ? AND status = 'abgeschlossen'", period);
  need(ex, 404, 'Dieser Zeitraum ist nicht abgeschlossen.');
  if (period.length === 7) need(!(await fibuClosed(ctx, period.slice(0, 4))), 409, 'Das Jahr ist abgeschlossen. Bitte zuerst den Jahresabschluss wieder \u00f6ffnen.');
  await DB.update(ctx.db, 'fibu_periods', ex.id, { status: 'wieder_geoeffnet', reopened_by: fibuWho(ctx), reopened_at: nowIso() });
  await audit(ctx, 'abschluss_wieder_geoeffnet', 'abschluss', period, null);
  return { ok: true };
}
// T\u00e4glicher Ablauf: Vormonat am 1. (ab 1:00 Uhr) abschlie\u00dfen, Vorjahr am 1. Januar
async function runFibuJobs(ctx, { force = false } = {}) {
  const p = berlinParts(nowMs()), today = berlinDate(nowMs());
  if (!force && p.h < 1) return 'noch nicht f\u00e4llig';
  let start = jparse(await rawSetting(ctx.db, '_fibu_start'), null);
  if (!start) { start = today.slice(0, 7); await setRawSetting(ctx.db, '_fibu_start', JSON.stringify(start)); }
  const out = [];
  const prev = prevPeriod(today.slice(0, 7));
  if (prev >= start && !(await DB.one(ctx.db, 'SELECT id FROM fibu_periods WHERE period = ?', prev))) out.push((await fibuClosePeriod(ctx, prev, { auto: true })).period);
  const lastYear = String(p.y - 1);
  if (`${lastYear}-12` >= start && !(await DB.one(ctx.db, 'SELECT id FROM fibu_periods WHERE period = ?', lastYear))) out.push((await fibuClosePeriod(ctx, lastYear, { auto: true })).period);
  return out.length ? out.join(', ') : 'nichts f\u00e4llig';
}

/* ---------- Automatische Buchungen aus Rechnungen und Zahlungen ---------- */
// Fehler in der Buchf\u00fchrung d\u00fcrfen Rechnungen und Zahlungen nie blockieren \u2013 sie werden gemeldet
async function fibuSafe(ctx, what, fn) {
  try { return await fn(); }
  catch (e) {
    console.log('Fibu ' + what, e.message);
    await audit(ctx, 'fibu_fehler', 'buchung', null, { vorgang: what, fehler: e.message }).catch(() => null);
    await notifyStaff(ctx, { perm: 'fibu_book' }, { kind: 'fehler', title: `Buchung fehlgeschlagen: ${what}`, body: e.message + ' \u2013 bitte manuell buchen.', link: '#/fibu/buchungen' }).catch(() => null);
    return null;
  }
}
const already = async (ctx, source, sourceId) => !!(await DB.one(ctx.db, 'SELECT id FROM fibu_entries WHERE source = ? AND source_id = ? AND reverses IS NULL', source, String(sourceId)));
async function fibuBookInvoice(ctx, invId) {
  return fibuSafe(ctx, 'Ausgangsrechnung', async () => {
    if (await already(ctx, 'rechnung', invId)) return null;
    const inv = await DB.one(ctx.db, 'SELECT * FROM invoices WHERE id = ?', invId); if (!inv || !inv.gross) return null;
    const neg = inv.gross < 0, gross = Math.abs(inv.gross), net = Math.abs(inv.net), vat = Math.abs(inv.vat);
    const docId = inv.file_id ? await fibuArchive(ctx, { kind: 'ausgangsrechnung', title: `${inv.kind === 'storno' ? 'Stornorechnung' : 'Rechnung'} ${inv.number}`, date: inv.issue_date, amount: inv.gross, counterparty: jparse(inv.recipient, {}).name, ref: inv.number, fileId: inv.file_id }) : null;
    const fo = await fibuAccountBySys(ctx, 'forderungen'), er = await fibuAccountBySys(ctx, 'erloese'), ust = await fibuAccountBySys(ctx, 'umsatzsteuer');
    const lines = [{ account: fo, debit: gross }, { account: er, credit: net }, ...(vat ? [{ account: ust, credit: vat }] : [])];
    return fibuPost(ctx, { date: inv.issue_date, text: `${inv.kind === 'storno' ? 'Stornorechnung' : 'Rechnung'} ${inv.number} \u00b7 ${jparse(inv.recipient, {}).name || ''}`.trim(), docId, source: 'rechnung', sourceId: invId, auto: true,
      lines: neg ? lines.map((l) => ({ account: l.account, debit: l.credit || 0, credit: l.debit || 0 })) : lines });
  });
}
async function fibuBookPayment(ctx, invId, amount, date, paymentId) {
  return fibuSafe(ctx, 'Zahlungseingang', async () => {
    const inv = await DB.one(ctx.db, 'SELECT number FROM invoices WHERE id = ?', invId);
    const a = round2(amount); if (!a) return null;
    const bank = await fibuAccountBySys(ctx, 'bank'), fo = await fibuAccountBySys(ctx, 'forderungen');
    return fibuPost(ctx, { date, text: `Zahlungseingang ${inv.number}`, source: 'zahlung', sourceId: paymentId, auto: true,
      lines: a > 0 ? [{ account: bank, debit: a }, { account: fo, credit: a }] : [{ account: fo, debit: -a }, { account: bank, credit: -a }] });
  });
}
async function fibuBookDunningFee(ctx, invId, fee, dunningId) {
  return fibuSafe(ctx, 'Mahngeb\u00fchr', async () => {
    if (!fee) return null;
    const inv = await DB.one(ctx.db, 'SELECT number FROM invoices WHERE id = ?', invId);
    return fibuPost(ctx, { date: berlinDate(nowMs()), text: `Mahngeb\u00fchr ${inv.number}`, source: 'mahngebuehr', sourceId: dunningId, auto: true,
      lines: [{ account: await fibuAccountBySys(ctx, 'forderungen'), debit: fee }, { account: await fibuAccountBySys(ctx, 'mahngebuehren'), credit: fee }] });
  });
}
// Eingangsrechnung: Aufwand (netto) + Vorsteuer an Verbindlichkeiten (brutto)
async function fibuBookPurchase(ctx, piId) {
  const pi = await DB.one(ctx.db, 'SELECT p.*, s.name AS supplier_name FROM purchase_invoices p JOIN suppliers s ON s.id = p.supplier_id WHERE p.id = ?', piId);
  need(pi, 404, 'Eingangsrechnung nicht gefunden.');
  if (pi.entry_id) return pi.entry_id;
  need(pi.account_id, 400, 'Bitte ein Aufwandskonto f\u00fcr die Eingangsrechnung w\u00e4hlen.');
  const acc = await fibuAccount(ctx, pi.account_id);
  const gross = round2(pi.gross || 0); need(gross > 0, 400, 'Bitte den Bruttobetrag der Eingangsrechnung angeben.');
  const vat = round2(pi.vat || 0), net = round2(gross - vat);
  const rate = toNum(pi.vat_rate, null) ?? (net ? Math.round((vat / net) * 100) : 0);
  let docId = pi.doc_id;
  if (!docId && pi.file_id) { docId = await fibuArchive(ctx, { kind: 'eingangsrechnung', title: `Eingangsrechnung ${pi.number || ''} \u00b7 ${pi.supplier_name}`.trim(), date: pi.date, amount: gross, counterparty: pi.supplier_name, ref: pi.number, fileId: pi.file_id }); }
  const vst = vat ? await fibuAccountBySys(ctx, rate === 7 ? 'vorsteuer7' : 'vorsteuer') : null;
  const id = await fibuPost(ctx, { date: isDate(pi.date) ? pi.date : berlinDate(nowMs()), text: `ER ${pi.number || '\u2013'} \u00b7 ${pi.supplier_name}${pi.text ? ' \u00b7 ' + pi.text : ''}`, docId, source: 'eingangsrechnung', sourceId: pi.id, auto: true,
    lines: [{ account: acc, debit: net }, ...(vat ? [{ account: vst, debit: vat }] : []), { account: await fibuAccountBySys(ctx, 'verbindlichkeiten'), credit: gross }] });
  await DB.update(ctx.db, 'purchase_invoices', pi.id, { entry_id: id, doc_id: docId, updated_at: nowIso() });
  return id;
}
async function fibuBookPurchasePaid(ctx, piId, date) {
  return fibuSafe(ctx, 'Zahlung Eingangsrechnung', async () => {
    const pi = await DB.one(ctx.db, 'SELECT p.*, s.name AS supplier_name FROM purchase_invoices p JOIN suppliers s ON s.id = p.supplier_id WHERE p.id = ?', piId);
    if (!pi || pi.pay_entry_id || !pi.entry_id) return null;
    const id = await fibuPost(ctx, { date: date || berlinDate(nowMs()), text: `Zahlung ER ${pi.number || '\u2013'} \u00b7 ${pi.supplier_name}`, docId: pi.doc_id, source: 'zahlung_er', sourceId: pi.id, auto: true,
      lines: [{ account: await fibuAccountBySys(ctx, 'verbindlichkeiten'), debit: pi.gross }, { account: await fibuAccountBySys(ctx, 'bank'), credit: pi.gross }] });
    await DB.update(ctx.db, 'purchase_invoices', pi.id, { pay_entry_id: id });
    return id;
  });
}

/* ---------- Anfangsbest\u00e4nde und Import ---------- */
// Kontoart aus der Kontonummer ableiten (angelehnt an SKR03)
function fibuGuessType(number) {
  const n = toInt(String(number).slice(0, 4), 0), l = String(number).length;
  const k = l <= 4 ? n : toInt(String(number).slice(0, 4), 0);
  if (k >= 8000 && k < 9000) return 'ertrag';
  if (k >= 2700 && k < 2800) return 'ertrag';
  if ((k >= 3000 && k < 8000) || (k >= 2000 && k < 2700)) return 'aufwand';
  if ((k >= 1600 && k < 2000) || (k >= 800 && k < 1000) || k >= 9000) return 'passiv';
  return 'aktiv';
}
async function fibuEnsureAccount(ctx, number, name) {
  number = String(number).trim(); need(/^\d{3,8}$/.test(number), 400, `Ung\u00fcltige Kontonummer \u201e${number}\u201c.`);
  const ex = await DB.one(ctx.db, 'SELECT * FROM fibu_accounts WHERE number = ?', number);
  if (ex) return ex;
  const id = await DB.insert(ctx.db, 'fibu_accounts', { number, name: str(name, 120) || `Konto ${number}`, type: fibuGuessType(number), status: 'offen', note: 'Beim Import angelegt', created_by: fibuWho(ctx), created_at: nowIso() });
  return DB.one(ctx.db, 'SELECT * FROM fibu_accounts WHERE id = ?', id);
}
// Anfangsbest\u00e4nde: Betrag auf der Normalseite des Kontos (Aktiv = Soll, Passiv = Haben); negativ = Gegenseite
async function fibuOpening(ctx, { date, rows, docId = null, note = 'Anfangsbestand' }) {
  need(isDate(date), 400, 'Bitte einen Stichtag angeben.');
  const ev = await fibuAccountBySys(ctx, 'eroeffnung');
  const ids = [];
  for (const r of rows) {
    const a = r.account_id ? await fibuAccount(ctx, r.account_id) : await fibuEnsureAccount(ctx, r.number, r.name);
    need(a.type === 'aktiv' || a.type === 'passiv', 400, `Anfangsbest\u00e4nde gibt es nur f\u00fcr Bestandskonten (Konto ${a.number} ist ein ${a.type === 'ertrag' ? 'Ertrags' : 'Aufwands'}konto). Erfolgskonten starten bei 0.`);
    let amt = round2(toNum(r.amount, 0) || 0); if (!amt) continue;
    if (r.side === 'H' && debitNormal(a.type)) amt = -amt; if (r.side === 'S' && !debitNormal(a.type)) amt = -amt;
    const onDebit = debitNormal(a.type) ? amt > 0 : amt < 0, v = Math.abs(amt);
    ids.push(await fibuPost(ctx, { date, text: `${note} ${a.number} ${a.name}`, docId, source: 'eroeffnung', lines: onDebit ? [{ account: a, debit: v }, { account: ev, credit: v }] : [{ account: ev, debit: v }, { account: a, credit: v }] }));
  }
  await audit(ctx, 'anfangsbestaende', 'buchung', null, { stichtag: date, konten: ids.length });
  return ids;
}
// Text eines PDFs zeilenweise: Textst\u00fccke mit Position sammeln, nach Zeile (y) gruppieren und nach x sortieren
async function pdfLines(bytes) {
  const raw = new TextDecoder('latin1').decode(bytes);
  const pages = []; const re = /stream\r?\n/g; let mt;
  while ((mt = re.exec(raw))) {
    const start = mt.index + mt[0].length, end = raw.indexOf('endstream', start); if (end < 0) break;
    const dict = raw.slice(Math.max(0, mt.index - 300), mt.index), data = bytes.subarray(start, end);
    let txt = '';
    if (/FlateDecode/.test(dict)) { try { txt = new TextDecoder('latin1').decode(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer()); } catch (e) { txt = ''; } } else txt = new TextDecoder('latin1').decode(data);
    re.lastIndex = end;
    if (!/\bTj\b|\bTJ\b/.test(txt)) continue;
    const items = []; let lx = 0, ly = 0, lead = 0;
    for (const t of txt.matchAll(/BT|(-?[\d.]+)\s+(-?[\d.]+)\s+(T[dD])|(-?[\d.]+)\s+TL|(?:-?[\d.]+\s+){4}(-?[\d.]+)\s+(-?[\d.]+)\s+Tm|T\*|\((?:\\.|[^\\)])*\)\s*(?:Tj|'|")|\[(?:[^\]]*)\]\s*TJ/g)) {
      const s = t[0];
      if (s === 'BT') { lx = 0; ly = 0; continue; }
      if (t[3]) { lx += +t[1]; ly += +t[2]; if (t[3] === 'TD') lead = -+t[2]; continue; }
      if (t[4] !== undefined && /TL$/.test(s)) { lead = +t[4]; continue; }
      if (/Tm$/.test(s)) { lx = +t[5]; ly = +t[6]; continue; }
      if (s === 'T*') { ly -= lead || 12; continue; }
      const strs = [...s.matchAll(/\(((?:\\.|[^\\)])*)\)/g)].map((x) => x[1].replace(/\\(\d{3})/g, (_, o) => String.fromCharCode(parseInt(o, 8))).replace(/\\([()\\])/g, '$1'));
      const text = strs.join(''); if (text.trim()) items.push({ x: lx, y: ly, text });
    }
    pages.push(items);
  }
  const out = [];
  for (const items of pages) {
    const rows = [];
    for (const it of items.sort((a, b) => b.y - a.y || a.x - b.x)) { const r = rows.find((x) => Math.abs(x.y - it.y) < 2.5); if (r) r.items.push(it); else rows.push({ y: it.y, items: [it] }); }
    for (const r of rows.sort((a, b) => b.y - a.y)) out.push(r.items.sort((a, b) => a.x - b.x).map((i) => i.text).join(' ').replace(/\s+/g, ' ').trim());
  }
  return out.filter(Boolean);
}
const DE_AMOUNT = /-?\d{1,3}(?:\.\d{3})*,\d{2}|-?\d+,\d{2}/g;
// Zeilen alter Buchf\u00fchrung erkennen: Buchungsjournal (Datum, Beleg, Text, Soll, Haben, Betrag) oder Saldenliste (Konto, Name, Saldo, S/H)
function fibuParseLegacy(lines) {
  const rows = [];
  for (const raw of lines) {
    const line = raw.replace(/\s+/g, ' ').trim(); if (!line) continue;
    const parts = line.includes(';') ? line.split(';').map((x) => x.trim()) : null;
    if (parts && parts.length >= 6 && /^\d{1,2}\.\d{1,2}\.\d{2,4}$/.test(parts[0])) {
      const [d, ref, text, soll, haben, betrag] = parts;
      rows.push({ kind: 'buchung', date: deDate(d), ref, text, debit: soll, credit: haben, amount: toNum(betrag) }); continue;
    }
    const dm = line.match(/^(\d{1,2}\.\d{1,2}\.(?:\d{4}|\d{2}))\s+(.*)$/);
    if (dm) {
      const amounts = dm[2].match(DE_AMOUNT) || [], accts = (dm[2].replace(DE_AMOUNT, ' ').match(/\b\d{4,8}\b/g) || []);
      if (amounts.length && accts.length >= 2) {
        const ref = (dm[2].match(/^(\S+)\s/) || [])[1];
        const text = dm[2].replace(DE_AMOUNT, ' ').replace(/\b\d{4,8}\b/g, ' ').replace(ref && !/^\d{4,8}$/.test(ref) ? ref : '\u0000', ' ').replace(/\s+/g, ' ').trim();
        rows.push({ kind: 'buchung', date: deDate(dm[1]), ref: ref && !/^\d{4,8}$/.test(ref) ? ref : '', text: text || '\u00dcbernahme', debit: accts[0], credit: accts[1], amount: Math.abs(toNum(amounts[amounts.length - 1])) });
        continue;
      }
    }
    const sm = line.match(/^(\d{3,8})\s+(.+?)\s+((?:-?\d{1,3}(?:\.\d{3})*,\d{2}\s*)+)\s*(S|H|Soll|Haben)?$/i);
    if (sm) {
      const nums = sm[3].match(DE_AMOUNT) || []; const amount = toNum(nums[nums.length - 1]);
      if (amount !== null) rows.push({ kind: 'saldo', number: sm[1], name: sm[2].trim(), amount: Math.abs(amount), side: sm[4] ? sm[4][0].toUpperCase() : amount < 0 ? 'H' : 'S' });
    }
  }
  return rows;
}
function deDate(d) { const m = String(d).match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/); if (!m) return null; const y = m[3].length === 2 ? '20' + m[3] : m[3]; return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; }
async function fibuImportCommit(ctx, { mode, date, rows, docId }) {
  need(Array.isArray(rows) && rows.length, 400, 'Keine Zeilen zum \u00dcbernehmen ausgew\u00e4hlt.');
  need(rows.length <= 2000, 400, 'Bitte h\u00f6chstens 2.000 Zeilen auf einmal \u00fcbernehmen.');
  if (mode === 'eroeffnung') return { created: (await fibuOpening(ctx, { date, rows: rows.map((r) => ({ number: r.number, name: r.name, amount: r.amount, side: r.side })), docId, note: '\u00dcbernahme Saldo' })).length };
  let n = 0;
  for (const r of rows) {
    const da = await fibuEnsureAccount(ctx, r.debit), ca = await fibuEnsureAccount(ctx, r.credit);
    const refDoc = r.ref ? await DB.one(ctx.db, 'SELECT id FROM fibu_docs WHERE ref = ? ORDER BY id DESC LIMIT 1', r.ref) : null;
    await fibuPost(ctx, { date: r.date, text: `${r.text || '\u00dcbernahme'}${r.ref ? ' \u00b7 Beleg ' + r.ref : ''}`, docId: refDoc ? refDoc.id : docId, source: 'import', lines: [{ account: da, debit: Math.abs(toNum(r.amount)) }, { account: ca, credit: Math.abs(toNum(r.amount)) }] });
    n++;
  }
  await audit(ctx, 'buchfuehrung_importiert', 'buchung', null, { buchungen: n });
  return { created: n };
}


/* ===== 40-api-public.js ===== */
/* ============================================================
   \u00d6ffentliche Schnittstellen: Formular-Eingang der Webseite,
   Kundenbereich \u201eMeine Anfragen\u201c (/my/\u2026), Kunden-Links (/c/\u2026)
   ============================================================ */

const FORM_ORIGINS = ['https://kfl-group.com', 'https://www.kfl-group.com', 'https://3r1qns-2d.myshopify.com'];
const MAX_FORM_AGE = 7 * 24 * 3600;
function formCors(origin) {
  const allowed = FORM_ORIGINS.includes(origin) ? origin : FORM_ORIGINS[0];
  return { 'Access-Control-Allow-Origin': allowed, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400', 'Vary': 'Origin' };
}
const cjson = (obj, status, origin) => out(obj, status, formCors(origin));

/* ---------- Formular-Eingang (POST /) ---------- */
async function handleForm(ctx) {
  const { request, env } = ctx;
  const origin = request.headers.get('Origin') || '';
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: formCors(origin) });
  if (!FORM_ORIGINS.includes(origin)) return cjson({ ok: false, error: 'Origin not allowed' }, 403, origin);
  const data = await readJson(request);
  const form = String(data._form || '');
  if (!REQUEST_TYPES[form] && !TICKET_FORMS[form]) return cjson({ ok: false, error: 'Unbekanntes Formular' }, 400, origin);
  if (data.Firma2) return cjson({ ok: true }, 200, origin);
  const kid = String(data._kid || '0'), ts = parseInt(data._ts || '0', 10);
  if (!env.FORM_SECRET) return cjson({ ok: false, error: 'Dienst nicht konfiguriert' }, 500, origin);
  const expected = await hmacHex(env.FORM_SECRET, `${kid}.${ts}.${form}`);
  if (typeof data._sig !== 'string' || !safeEqual(data._sig, expected)) return cjson({ ok: false, error: 'Signatur ung\u00fcltig' }, 403, origin);
  if (Math.abs(nowMs() / 1000 - ts) > MAX_FORM_AGE) return cjson({ ok: false, error: 'Formular abgelaufen, bitte Seite neu laden' }, 403, origin);
  if ((REQUEST_TYPES[form] || form === 'partner' || form === 'partnerdesk') && kid === '0') return cjson({ ok: false, error: 'Bitte zuerst anmelden' }, 401, origin);
  const email = String(data.email || '').trim();
  if (!emailOk(email)) return cjson({ ok: false, error: 'E-Mail-Adresse ung\u00fcltig' }, 400, origin);
  for (const k of Object.keys(data)) if (typeof data[k] !== 'string') data[k] = String(data[k] ?? '');
  data['Eingang (Server)'] = fmtDE(nowMs());
  data['Kundenkonto-ID'] = kid === '0' ? '\u2013' : kid;
  ctx.actor = { type: 'customer', id: null, name: [data.Vorname, data.name].filter(Boolean).join(' ') || email };

  if (TICKET_FORMS[form]) {
    const def = TICKET_FORMS[form];
    const text = Object.entries(data).filter(([k, v]) => !/^_|^Firma2$|^Formular$|AGB|Datenschutz|Einwilligung/.test(k) && String(v).trim()).map(([k, v]) => `${k}: ${v}`).join('\n');
    const subject = form === 'widerruf' ? `Widerruf: ${data.Vertrag || data.Bestellnummer || ''}`.trim() : (data.Thema || data.Betreff || def.category);
    const id = await createTicket(ctx, { tag: def.tag, category: def.category, subject, priority: def.priority, requester: { type: kid !== '0' ? 'customer' : 'web', name: [data.Vorname, data.name].filter(Boolean).join(' '), email }, text, ack: form !== 'widerruf' });
    if (form === 'widerruf') {
      const s = await settingsOf(ctx);
      await sendMail(ctx, { category: 'system', to: email, subject: `Eingangsbest\u00e4tigung deiner Widerrufserkl\u00e4rung (#${id})`, title: 'Eingangsbest\u00e4tigung deiner Widerrufserkl\u00e4rung',
        body: `<p>Hallo ${esc(data.Vorname || data.name || '')},</p><p>deine Widerrufserkl\u00e4rung ist am <strong>${esc(data['Eingang (Server)'])}</strong> bei uns eingegangen (Vorgang #${id}). Mit dieser E-Mail best\u00e4tigen wir ausschlie\u00dflich den Eingang. Die Wirksamkeit und den Umfang des Widerrufs pr\u00fcfen wir gesondert und melden uns bei dir.</p>${mailTable(Object.entries(data).filter(([k]) => !/^_|Firma2|Formular/.test(k)))}` });
    }
    return cjson({ ok: true, number: id, ticket: true, receivedAt: data['Eingang (Server)'] }, 200, origin);
  }
  const id = await createRequest(ctx, form, data, { customerAccount: kid !== '0' ? kid : null });
  try { await dispatchRequest(ctx, id); } catch (e) { console.log('Verteilung', e.stack || e.message); await DB.update(ctx.db, 'requests', id, { status: 'stoerung', status_note: 'Verteilung fehlgeschlagen: ' + e.message }); }
  // Eingangsbest\u00e4tigung an den Kunden
  const s = await settingsOf(ctx);
  const link = s.link_my_requests;
  await sendMail(ctx, { category: 'system', to: email, toName: data.Vorname, subject: `Deine Anfrage #${toNumber(id)} ist bei KFL eingegangen${form === 'deal' ? ' \u2013 plus 50 % auf unsere Ratgeber' : ''}`, title: form === 'deal' ? 'Danke, deine Anfrage ist bei uns.' : 'Danke, wir bewerten dein Auto.',
    body: `<p>Hallo ${esc(data.Vorname || '')},</p><p>wir haben deine Anfrage <strong>#${toNumber(id)}</strong> erhalten und an unsere passenden Partner weitergegeben. Innerhalb von 24 Stunden an Werktagen sammeln wir die Angebote und stellen dir das beste vor \u2013 <strong>deine Kontaktdaten bleiben bis zu deiner Zusage bei uns</strong>.</p>
      ${form === 'deal' ? `<p style="background:#000;color:#fff;border-radius:12px;padding:18px 20px">Dein Dankesch\u00f6n: <strong style="color:#ff6c01;font-size:20px;letter-spacing:1px">TRAUMDEAL50</strong><br><span style="color:#c7c7cc">50 % Rabatt auf die KFL Ratgeber. <a href="https://kfl-group.com/discount/TRAUMDEAL50?redirect=/collections/ratgeber" style="color:#ff6c01">Jetzt einl\u00f6sen</a></span></p>` : ''}
      <p>Unter <a href="${esc(link)}" style="color:#ff6c01">Meine Anfragen</a> siehst du den Stand, kannst deine Anfrage \u00e4ndern und uns Notizen schicken.</p>${mailTable(Object.entries(data).filter(([k, v]) => !HIDDEN_KEY.test(k) && String(v).trim()))}` });
  return cjson({ ok: true, number: toNumber(id), receivedAt: data['Eingang (Server)'] }, 200, origin);
}

/* ---------- Kundenbereich \u201eMeine Anfragen\u201c ---------- */
const MY_HIDDEN = /^(_|form$|form_type$|utf8$|Firma2$|Formular$|Kundennummer$|Eingang \(Server\)$|Kundenkonto-ID$|Ge\u00e4ndert \(Server\)$|Einwilligung|AGB akzeptiert|Datenschutz akzeptiert|Weitergabe an Partner)/;
const MY_STATUS = {
  eingang: ['Eingegangen', 'open'], in_bearbeitung: ['In Bearbeitung', 'progress'], versendet: ['Angebote werden eingeholt', 'progress'], angebot_liegt_vor: ['Angebote werden eingeholt', 'progress'],
  angebot_in_bearbeitung: ['Angebote werden gepr\u00fcft', 'progress'], angebot_beim_kunden: ['Angebot liegt vor', 'offer'], angebot_akzeptiert: ['Angebot angenommen', 'done'],
  kontaktdaten_versendet: ['Partner meldet sich bei dir', 'done'], angebot_abgelehnt: ['Abgeschlossen', 'done'], kein_angebot: ['Wir melden uns pers\u00f6nlich', 'progress'],
  fehler: ['In Bearbeitung', 'progress'], stoerung: ['In Bearbeitung', 'progress']
};
async function myView(ctx, r) {
  const d = jparse(r.data, {});
  const fields = {}; for (const [k, v] of Object.entries(d)) if (!MY_HIDDEN.test(k)) fields[k] = v;
  const st = MY_STATUS[r.status] || ['In Bearbeitung', 'progress'];
  const offers = await DB.val(ctx.db, "SELECT COUNT(*) FROM offers WHERE request_id = ?", r.id);
  return { id: toNumber(r.id), number: toNumber(r.id), form: r.type, created_at: r.created_at, updated_at: r.updated_at, status: r.status, status_label: st[0], tone: st[1],
    editable: CUSTOMER_EDITABLE.includes(r.status) && !offers, fields, offers: ['angebot_beim_kunden', 'angebot_akzeptiert', 'kontaktdaten_versendet', 'angebot_abgelehnt'].includes(r.status) ? await customerOffers(ctx, r) : [] };
}
async function handleMy(ctx, url) {
  const { request, env } = ctx;
  const origin = request.headers.get('Origin') || '';
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: formCors(origin) });
  if (!FORM_ORIGINS.includes(origin)) return cjson({ ok: false, error: 'Origin not allowed' }, 403, origin);
  if (request.method !== 'POST') return cjson({ ok: false, error: 'Nicht erlaubt' }, 405, origin);
  if (!env.FORM_SECRET) return cjson({ ok: false, error: 'Dienst nicht konfiguriert' }, 500, origin);
  const b = await readJson(request, 12_000_000);
  const v = await verifyCustomerToken(env, b, 'my');
  if (v.error) return cjson({ ok: false, error: v.error }, v.status, origin);
  const kid = v.kid;
  ctx.actor = { type: 'customer', id: null, name: 'Kunde ' + kid };
  const path = url.pathname.replace(/^\/my/, '').replace(/\/+$/, '');
  if (path === '/requests') {
    let sql = "SELECT * FROM requests WHERE customer_account = ? AND deleted = 0", args = [kid];
    if (b.id !== undefined && b.id !== null && b.id !== '') { const id = fromNumber(b.id); if (!(id > 0)) return cjson({ ok: true, requests: [] }, 200, origin); sql += ' AND id = ?'; args.push(id); }
    const rows = await DB.all(ctx.db, sql + ' ORDER BY id DESC LIMIT 100', ...args);
    const list = []; for (const r of rows) list.push(await myView(ctx, r));
    return cjson({ ok: true, requests: list }, 200, origin);
  }
  const m = path.match(/^\/requests\/(\d{1,12})\/(note|update|accept|decline|file)$/);
  if (!m) return cjson({ ok: false, error: 'Nicht gefunden' }, 404, origin);
  const id = fromNumber(m[1]);
  const r = id > 0 ? await DB.one(ctx.db, 'SELECT * FROM requests WHERE id = ? AND customer_account = ? AND deleted = 0', id, kid) : null;
  if (!r) return cjson({ ok: false, error: 'Anfrage nicht gefunden' }, 404, origin);
  const data = jparse(r.data, {});
  ctx.actor = { type: 'customer', id: null, name: [data.Vorname, data.name].filter(Boolean).join(' ') || 'Kunde' };

  if (m[2] === 'note') {
    const text = String(b.text ?? '').replace(/\r\n?/g, '\n').trim().slice(0, 2000);
    if (text.length < 2) return cjson({ ok: false, error: 'Bitte einen Text eingeben' }, 400, origin);
    const prev = String(data.body ?? '').trim();
    data.body = ((prev ? prev + '\n\n' : '') + `[${fmtDE(nowMs()).replace(' Uhr', '')} \u00b7 Notiz vom Kunden]\n${text}`).slice(-20000);
    await DB.update(ctx.db, 'requests', id, { data: JSON.stringify(data), customer_note_at: nowIso(), customer_note_unread: 1, updated_at: nowIso() });
    await reqEvent(ctx, id, 'kundennotiz', text);
    await notifyStaff(ctx, r.assignee_id ? { userIds: [r.assignee_id] } : { perm: 'req_edit' }, { kind: 'kundennotiz', title: `Neue Notiz vom Kunden zu #${toNumber(id)}`, body: text.slice(0, 300), link: `#/anfragen/${toNumber(id)}` });
    for (const a of await DB.all(ctx.db, "SELECT * FROM assignments WHERE request_id = ? AND status IN ('in_bearbeitung','versendet','vorgestellt','gewonnen')", id)) {
      await partnerEvent(ctx, { assignmentId: a.id, requestId: id, orgId: a.org_id, action: 'kundennotiz', text: 'Erg\u00e4nzung des Kunden: ' + text, visiblePartner: true });
      await notifyPartner(ctx, a.taken_by ? { userIds: [a.taken_by] } : { orgId: a.org_id }, { kind: 'info', title: `Erg\u00e4nzung des Kunden zu #${toNumber(id)}`, body: text.slice(0, 300), link: `#/anfragen/${a.id}` });
    }
    return cjson({ ok: true, body: data.body }, 200, origin);
  }
  if (m[2] === 'update') {
    const offers = await DB.val(ctx.db, 'SELECT COUNT(*) FROM offers WHERE request_id = ?', id);
    if (!CUSTOMER_EDITABLE.includes(r.status) || offers) return cjson({ ok: false, error: 'Diese Anfrage kann nicht mehr ge\u00e4ndert werden' }, 409, origin);
    if (String(b._form || '') !== r.type) return cjson({ ok: false, error: 'Falsches Formular' }, 400, origin);
    if (!emailOk(b.email)) return cjson({ ok: false, error: 'E-Mail-Adresse ung\u00fcltig' }, 400, origin);
    const next = {};
    for (const [k, val] of Object.entries(b)) { if (/^(_sig|_ts|_edit|Firma2)$/.test(k) || k === 'Eingang (Server)' || k === 'Kundenkonto-ID') continue; next[k] = String(val ?? '').slice(0, k === 'body' ? 20000 : 4000); }
    next._kid = kid; next._form = r.type; next['Eingang (Server)'] = data['Eingang (Server)']; next['Kundenkonto-ID'] = kid; next['Ge\u00e4ndert (Server)'] = fmtDE(nowMs());
    const changed = uniq([...Object.keys(data), ...Object.keys(next)]).filter((k) => !MY_HIDDEN.test(k) && String(data[k] ?? '') !== String(next[k] ?? ''));
    const s = await settingsOf(ctx);
    const c = requestColumns(r.type, next);
    await DB.update(ctx.db, 'requests', id, { customer_name: c.customer_name, email: c.email, phone: c.phone, brand: c.brand, model: c.model, vehicle: c.vehicle, summary: c.summary, zustand: c.zustand,
      pay_kind: c.pay_kind, budget: c.budget, plz: c.plz, city: c.city, radius_km: parseRadius(next.Umkreis, s), data: JSON.stringify(next), updated_at: nowIso() });
    await reqEvent(ctx, id, 'vom_kunden_ge\u00e4ndert', changed.length ? 'Ge\u00e4ndert: ' + changed.join(', ') : 'Ohne \u00c4nderung gespeichert');
    await audit(ctx, 'anfrage_kunde_geaendert', 'anfrage', toNumber(id), { felder: changed });
    for (const a of await DB.all(ctx.db, "SELECT * FROM assignments WHERE request_id = ? AND status IN ('neu','in_bearbeitung')", id)) {
      await partnerEvent(ctx, { assignmentId: a.id, requestId: id, orgId: a.org_id, action: 'aktualisiert', text: 'Der Kunde hat die Anfrage aktualisiert: ' + changed.join(', '), visiblePartner: true });
      await notifyPartner(ctx, a.taken_by ? { userIds: [a.taken_by] } : { orgId: a.org_id }, { kind: 'info', title: `Anfrage #${toNumber(id)} wurde aktualisiert`, body: 'Ge\u00e4ndert: ' + changed.join(', '), link: `#/anfragen/${a.id}` });
    }
    // Bei ge\u00e4nderter Marke/PLZ/Umkreis: neu verteilen (nur zus\u00e4tzliche Partner)
    if (changed.some((k) => ['Marke', 'Marke (Freitext)', 'PLZ', 'Umkreis'].includes(k))) await dispatchRequest(ctx, id);
    return cjson({ ok: true, number: toNumber(id) }, 200, origin);
  }
  if (m[2] === 'accept') { await acceptOffer(ctx, r, toInt(b.offer_id)); return cjson({ ok: true }, 200, origin); }
  if (m[2] === 'decline') { await declineOffers(ctx, r, str(b.reason, 500)); return cjson({ ok: true }, 200, origin); }
  if (m[2] === 'file') {
    const o = await DB.one(ctx.db, "SELECT * FROM offers WHERE id = ? AND request_id = ? AND status IN ('vorgestellt','angenommen')", toInt(b.offer_id), id);
    const fid = o && (b.which === 'expose' ? o.public_expose_id : o.public_file_id);
    if (!fid) return cjson({ ok: false, error: 'Keine Datei verf\u00fcgbar' }, 404, origin);
    const f = await getFile(ctx, fid);
    return cjson({ ok: true, name: f.meta.name, base64: b64(f.bytes) }, 200, origin);
  }
  return cjson({ ok: false, error: 'Nicht gefunden' }, 404, origin);
}

/* ---------- Kunden-Links aus E-Mails ---------- */
function simplePage(title, text, ok = true) {
  return new Response(`<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title>
<style>body{margin:0;font:17px/1.55 "Helvetica Neue",Helvetica,Arial,sans-serif;background:#f4f4f4;color:#1a1a1a;display:grid;place-items:center;min-height:100vh;padding:20px;box-sizing:border-box}
.c{background:#fff;border-radius:24px;max-width:520px;width:100%;padding:36px;box-shadow:0 20px 60px rgba(0,0,0,.08)}.i{width:56px;height:56px;border-radius:50%;background:${ok ? '#ff6c01' : '#c4291c'};display:grid;place-items:center;color:#000;font-size:26px;font-weight:700}
h1{font-size:28px;letter-spacing:-.02em;margin:18px 0 8px}p{color:#6b6b70;margin:0 0 18px}a{display:inline-block;background:#000;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:999px}</style></head>
<body><div class="c"><div class="i">${ok ? '\u2713' : '!'}</div><h1>${esc(title)}</h1><p>${esc(text)}</p><a href="https://kfl-group.com">Zu kfl-group.com</a></div></body></html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', ...SEC_HEADERS } });
}
async function handleCustomerLinks(ctx, url) {
  if (url.pathname === '/c/feedback') {
    const rid = fromNumber(url.searchParams.get('r') || ''), a = url.searchParams.get('a');
    if (!(rid > 0) || !['ja', 'nein'].includes(a) || url.searchParams.get('t') !== await linkToken(ctx.env, 'fb', rid)) return simplePage('Link ung\u00fcltig', 'Dieser Link ist leider nicht (mehr) g\u00fcltig.', false);
    ctx.actor = { type: 'customer', name: 'Kunde' };
    await customerFeedback(ctx, rid, a);
    return simplePage('Danke f\u00fcr deine R\u00fcckmeldung!', a === 'ja' ? 'Sch\u00f6n, dass sich der Partner gemeldet hat. Wir w\u00fcnschen dir viel Freude mit deinem Fahrzeug!' : 'Das tut uns leid. Unser Team k\u00fcmmert sich sofort darum und meldet sich bei dir.');
  }
  if (url.pathname === '/c/survey') {
    const sid = toInt(url.searchParams.get('s')), rating = toInt(url.searchParams.get('r'));
    if (!sid || rating < 1 || rating > 5 || url.searchParams.get('t') !== await linkToken(ctx.env, 'sv', sid)) return simplePage('Link ung\u00fcltig', 'Dieser Link ist leider nicht (mehr) g\u00fcltig.', false);
    const sv = await DB.one(ctx.db, 'SELECT * FROM surveys WHERE id = ?', sid);
    if (!sv) return simplePage('Link ung\u00fcltig', 'Diese Umfrage gibt es nicht mehr.', false);
    if (!sv.answered_at) {
      await DB.update(ctx.db, 'surveys', sid, { rating, answered_at: nowIso() });
      ctx.actor = { type: 'customer', name: 'Kunde' };
      await reqEvent(ctx, sv.request_id, 'bewertung', `Kunde bewertet den Partner mit ${rating} von 5`);
    }
    return simplePage('Vielen Dank!', `Du hast ${rating} von 5 Punkten vergeben. Dein Feedback hilft uns, dir immer die besten Partner zu vermitteln.`);
  }
  return new Response('Nicht gefunden', { status: 404 });
}


/* ===== 41-api-staff.js ===== */
/* ============================================================
   Schnittstelle internes Dashboard (/api/\u2026)
   ============================================================ */

function staffPublic(u) {
  return u && { id: u.id, email: u.email, name: u.name, role: u.role, roleLabel: u.roleLabel, perms: [...u.perms], mustChangePw: u.mustChangePw, areaUnlocked: areaUnlocked(u), subs: u.subs, prevLogin: u.prevLogin };
}
function publicConfig() {
  return { version: APP_VERSION, roles: STAFF_ROLES, permissions: PERMISSIONS, requestStatuses: REQUEST_STATUSES, assignStatuses: ASSIGN_STATUSES, ticketStatuses: TICKET_STATUSES,
    ticketPriorities: TICKET_PRIORITIES, invoiceStatuses: INVOICE_STATUSES, dunningLevels: DUNNING_LEVELS, partnerRoles: PARTNER_ROLES, requestTypes: REQUEST_TYPES,
    weekdays: WEEKDAYS, weekdayLabels: WEEKDAY_LABELS, brands: BRANDS_TOP, mailCategories: MAIL_CATEGORIES };
}
const REQ_SORT = { number: 'r.id', created_at: 'r.id', status: 'r.status', customer: 'r.customer_name', brand: 'r.brand', model: 'r.model', budget: "CAST(REPLACE(REPLACE(r.budget,'.',''),',','.') AS REAL)", assignee: 'u.name' };

async function staffRequestRow(ctx, r, u) {
  const a = await DB.one(ctx.db, `SELECT COUNT(*) AS n, SUM(status NOT IN ('neu')) AS reacted, SUM(offer_id IS NOT NULL) AS offers, MAX(sent_at) AS last_offer FROM assignments WHERE request_id = ?`, r.id);
  const billing = await DB.one(ctx.db, 'SELECT status FROM billing_items WHERE request_id = ? ORDER BY id DESC LIMIT 1', r.id);
  return { number: toNumber(r.id), type: r.type, status: r.status, status_note: r.status_note, priority: r.priority, created_at: r.created_at, summary: r.summary,
    customer: can(u, 'req_contact') ? r.customer_name : (r.customer_name ? r.customer_name.split(' ')[0] + ' \u2026' : ''), email: can(u, 'req_contact') ? r.email : '',
    brand: r.brand, model: r.model, vehicle: r.vehicle, budget: r.budget, plz: r.plz, assignee_id: r.assignee_id, assignee_name: r.assignee_name || null,
    partners: a.n || 0, partners_reacted: a.reacted || 0, offers: a.offers || 0, last_offer_at: a.last_offer, customer_note_unread: !!r.customer_note_unread,
    spam_state: r.spam_state, billed: !!r.billed, billing: billing ? billing.status : null, deadline_at: r.deadline_at, source: r.source };
}

async function handleStaffApi(ctx, url) {
  const { request, db, env } = ctx;
  const path = url.pathname.replace(/^\/api/, '') || '/';
  const method = request.method;
  if (method !== 'GET') {
    need(request.headers.get('X-KFL') === '1', 403, 'Ung\u00fcltige Anfrage');
    const o = request.headers.get('Origin'); need(!o || o === url.origin, 403, 'Ung\u00fcltige Herkunft');
  }
  const body = method === 'GET' ? {} : await readJson(request, 12_000_000);
  const q = Object.fromEntries(url.searchParams);
  let m;

  /* ---------- \u00d6ffentlich ---------- */
  if (path === '/session' && method === 'GET') {
    const u = await currentStaff(ctx);
    const cnt = await DB.val(db, 'SELECT COUNT(*) FROM users');
    return out({ ok: true, user: staffPublic(u), needsSetup: cnt === 0, setupConfigured: !!env.SETUP_TOKEN, mailReady: !!mailProvider(await mailEnv(ctx)), config: publicConfig() });
  }
  if (path === '/setup' && method === 'POST') {
    need((await DB.val(db, 'SELECT COUNT(*) FROM users')) === 0, 403, 'Die Ersteinrichtung ist bereits abgeschlossen.');
    need(env.SETUP_TOKEN && safeEqual(str(body.token, 200), env.SETUP_TOKEN), 403, 'Einrichtungsschl\u00fcssel ist falsch.');
    const email = str(body.email).toLowerCase(), name = str(body.name, 80);
    need(emailOk(email) && name, 400, 'Bitte Name und g\u00fcltige E-Mail angeben.');
    const p = passwordProblem(body.password); need(!p, 400, p);
    const h = await hashPassword(body.password);
    const id = await DB.insert(db, 'users', { email, name, role_key: 'admin', pass_hash: h.hash, pass_salt: h.salt, active: 1, created_at: nowIso(), last_login: nowIso() });
    ctx.actor = { type: 'staff', id, name };
    await audit(ctx, 'ersteinrichtung', 'mitarbeiter', id, email);
    const s = await createSessionRow(db, 'sessions', id);
    return out({ ok: true }, 200, { 'Set-Cookie': cookieHeader(STAFF_COOKIE, s.token, s.maxAge) });
  }
  if (path === '/login' && method === 'POST') {
    const r = await loginGeneric(ctx, 'users', 'sessions', str(body.email).toLowerCase(), String(body.password || ''));
    if (r.error) return fail(r.status, r.error);
    return out({ ok: true, mustChangePw: !!r.user.must_change_pw }, 200, { 'Set-Cookie': cookieHeader(STAFF_COOKIE, r.session.token, r.session.maxAge) });
  }
  if (path === '/logout' && method === 'POST') {
    const t = readCookie(request, STAFF_COOKIE); if (t) await DB.run(db, 'DELETE FROM sessions WHERE token_hash = ?', await sha256Hex(t));
    return out({ ok: true }, 200, { 'Set-Cookie': cookieHeader(STAFF_COOKIE, '', 0) });
  }
  if (path === '/invite/check' && method === 'GET') {
    const t = q.token || ''; need(/^[0-9a-f]{64}$/.test(t), 400, 'Ung\u00fcltiger Link.');
    const u = await DB.one(db, 'SELECT email, name, invite_expires FROM users WHERE invite_hash = ? AND active = 1', await sha256Hex(t));
    need(u && u.invite_expires > nowIso(), 400, 'Dieser Link ist ung\u00fcltig oder abgelaufen. Bitte fordere einen neuen an.');
    return out({ ok: true, email: u.email, name: u.name });
  }
  if (path === '/invite/accept' && method === 'POST') {
    const t = str(body.token, 64); need(/^[0-9a-f]{64}$/.test(t), 400, 'Ung\u00fcltiger Link.');
    const u = await DB.one(db, 'SELECT id, name, invite_expires FROM users WHERE invite_hash = ? AND active = 1', await sha256Hex(t));
    need(u && u.invite_expires > nowIso(), 400, 'Dieser Link ist ung\u00fcltig oder abgelaufen.');
    const p = passwordProblem(body.password); need(!p, 400, p);
    const h = await hashPassword(body.password);
    await DB.run(db, "UPDATE users SET pass_hash = ?, pass_salt = ?, invite_hash = NULL, invite_expires = NULL, failed_logins = 0, locked_until = CASE WHEN locked_until > '9000' THEN locked_until ELSE NULL END, must_change_pw = 0, last_login = ? WHERE id = ?", h.hash, h.salt, nowIso(), u.id);
    await DB.run(db, 'DELETE FROM sessions WHERE user_id = ?', u.id);
    ctx.actor = { type: 'staff', id: u.id, name: u.name };
    await audit(ctx, 'passwort_gesetzt', 'mitarbeiter', u.id, null);
    const s = await createSessionRow(db, 'sessions', u.id);
    return out({ ok: true }, 200, { 'Set-Cookie': cookieHeader(STAFF_COOKIE, s.token, s.maxAge) });
  }
  // Support-Anfrage von der Anmeldeseite (Mitarbeiter mit Problem, Tag \u201eIntern\u201c)
  if (path === '/support' && method === 'POST') {
    if (body.website) return out({ ok: true, number: null });
    const name = str(body.name, 80), email = str(body.email, 200).toLowerCase(), message = str(body.message, 4000);
    need(name && emailOk(email), 400, 'Bitte gib deinen Namen und eine g\u00fcltige E-Mail-Adresse an.');
    need(message.length >= 5, 400, 'Bitte beschreib kurz dein Anliegen.');
    const iph = ctx.ipHash || 'unbekannt';
    const since = isoOf(nowMs() - 3600e3);
    const perIp = await DB.val(db, "SELECT COUNT(*) FROM audit WHERE action = 'support_ticket' AND ip = ? AND at >= ?", iph, since);
    need(perIp < 5, 429, 'Gerade sind zu viele Anfragen eingegangen. Bitte versuch es sp\u00e4ter noch einmal oder schreib an support@kfl-group.com.');
    ctx.actor = { type: 'web', name };
    const known = await DB.one(db, 'SELECT id FROM users WHERE email = ?', email);
    const id = await createTicket(ctx, { tag: 'Intern', category: str(body.topic, 60) || 'Anmeldung / Zugang', subject: str(body.topic, 60) || 'Support-Anfrage aus dem Dashboard', requester: { type: known ? 'staff' : 'web', id: known ? known.id : null, name, email }, text: message });
    return out({ ok: true, number: id });
  }

  /* ---------- Ab hier angemeldet ---------- */
  const u = await currentStaff(ctx);
  need(u, 401, 'Bitte melde dich an.');
  if (u.mustChangePw && !['/password', '/me/start'].includes(path)) need(false, 428, 'Bitte vergib zuerst ein eigenes Passwort.');

  if (path === '/password' && method === 'POST') {
    const row = await DB.one(db, 'SELECT pass_hash, pass_salt FROM users WHERE id = ?', u.id);
    need(await verifyPassword(body.current, row.pass_hash, row.pass_salt), 400, 'Das aktuelle Passwort ist falsch.');
    const p = passwordProblem(body.next); need(!p, 400, p);
    const h = await hashPassword(body.next);
    await DB.run(db, 'UPDATE users SET pass_hash = ?, pass_salt = ?, must_change_pw = 0 WHERE id = ?', h.hash, h.salt, u.id);
    await DB.run(db, 'DELETE FROM sessions WHERE user_id = ? AND token_hash != ?', u.id, u.tokenHash);
    await audit(ctx, 'passwort_geaendert', 'mitarbeiter', u.id, null);
    return out({ ok: true });
  }
  if (path === '/area/unlock' && method === 'POST') {
    need(can(u, 'audit_view') || can(u, 'backup_view'), 403, 'Daf\u00fcr fehlt dir die Berechtigung.');
    const ok = await areaPasswordOk(ctx, body.password);
    await audit(ctx, ok ? 'bereich_entsperrt' : 'bereich_passwort_falsch', 'bereich', null, null);
    need(ok, 403, 'Das Bereichspasswort ist falsch.');
    await DB.run(db, 'UPDATE sessions SET area_until = ? WHERE token_hash = ?', isoOf(nowMs() + AREA_MINUTES * 60e3), u.tokenHash);
    return out({ ok: true, until: isoOf(nowMs() + AREA_MINUTES * 60e3) });
  }
  if (path === '/area/lock' && method === 'POST') { await DB.run(db, 'UPDATE sessions SET area_until = NULL WHERE token_hash = ?', u.tokenHash); return out({ ok: true }); }

  /* ---------- Startseite ---------- */
  if (path === '/me/start' && method === 'GET') {
    const news = await newsFor(ctx, 'staff', u, { limit: 12 });
    const chats = (await chatList(ctx, u)).slice(0, 8);
    const kp = {};
    if (can(u, 'req_view')) {
      kp.open = await DB.val(db, `SELECT COUNT(*) FROM requests WHERE deleted = 0 AND status IN (${inList(OPEN_STATUSES)})`, ...OPEN_STATUSES);
      kp.mine = await DB.val(db, `SELECT COUNT(*) FROM requests WHERE deleted = 0 AND assignee_id = ? AND status IN (${inList(OPEN_STATUSES)})`, u.id, ...OPEN_STATUSES);
      kp.notes = await DB.val(db, 'SELECT COUNT(*) FROM requests WHERE deleted = 0 AND customer_note_unread = 1');
      kp.problems = await DB.val(db, "SELECT COUNT(*) FROM requests WHERE deleted = 0 AND status IN ('fehler','stoerung','kein_angebot')");
      kp.today = await DB.val(db, 'SELECT COUNT(*) FROM requests WHERE created_at >= ?', isoOf(berlinToUtc(...berlinDate(nowMs()).split('-').map(Number), 0, 0)));
      if (can(u, 'req_spam_confirm')) kp.spam = await DB.val(db, "SELECT COUNT(*) FROM requests WHERE spam_state = 'gemeldet'");
    }
    if (can(u, 'support_view')) kp.tickets = await DB.val(db, "SELECT COUNT(*) FROM tickets WHERE status IN ('neu','in_bearbeitung') AND archived_at IS NULL");
    if (can(u, 'acc_view')) { kp.bill = await DB.val(db, "SELECT COUNT(*) FROM billing_items WHERE status = 'offen'"); kp.overdue = await DB.val(db, "SELECT COUNT(*) FROM invoices WHERE status IN ('offen','teilbezahlt') AND kind != 'storno' AND due_date < ?", berlinDate(nowMs())); }
    const abs = await DB.all(db, "SELECT a.*, u.name AS user_name FROM absences a JOIN users u ON u.id = a.user_id WHERE a.substitute_id = ? AND a.status = 'angefragt'", u.id);
    const w = isoWeek(nowMs());
    return out({ ok: true, today: berlinDate(nowMs()), week: w.week, year: w.year, news, chats, kpis: kp, absenceRequests: abs });
  }

  /* ---------- News & Chat ---------- */
  if (path === '/news' && method === 'GET') return out({ ok: true, ...(await newsFor(ctx, 'staff', u, { limit: 100 })) });
  if (path === '/news' && method === 'POST') {
    const scope = body.scope === 'partner' ? 'partner' : 'staff';
    requirePerm(u, scope === 'partner' ? 'news_partner' : 'news_publish');
    const aud = body.audience || { type: scope === 'partner' ? 'partners_all' : 'all' };
    const types = scope === 'partner' ? ['partners_all', 'orgs', 'partner_users', 'brands', 'partner_roles'] : ['all', 'roles', 'users'];
    need(types.includes(aud.type), 400, 'Ung\u00fcltige Empf\u00e4ngergruppe.');
    need(str(body.title, 200), 400, 'Bitte gib einen Titel an.');
    const id = await DB.insert(db, 'news_posts', { author_id: u.id, author_name: u.name, scope, audience: JSON.stringify({ type: aud.type, values: aud.values || [] }), title: str(body.title, 200), body: str(body.body, 8000), important: body.important ? 1 : 0, created_at: nowIso() });
    await audit(ctx, 'news_veroeffentlicht', 'news', id, { scope, audience: aud });
    if (scope === 'partner' && body.mail) {
      const users = await DB.all(db, 'SELECT u.*, o.brands, o.name AS org_name FROM partner_users u JOIN orgs o ON o.id = u.org_id WHERE u.active = 1 AND o.active = 1 AND o.deleted = 0');
      for (const pu of users) if (audienceMatchesPartner(aud, { id: pu.id, orgId: pu.org_id, role: pu.role, org: { brands: pu.brands } }))
        await sendMail(ctx, { category: 'system', to: pu.email, toName: pu.name, subject: str(body.title, 200), title: str(body.title, 200), body: `<p style="white-space:pre-wrap">${esc(str(body.body, 8000))}</p>` });
    }
    return out({ ok: true, id });
  }
  if (path === '/news/read' && method === 'POST') {
    const read = body.read !== false;
    for (const id of (body.posts || []).map(Number)) {
      if (read) await DB.run(db, 'INSERT OR IGNORE INTO news_reads (post_id, reader_type, reader_id, read_at) VALUES (?, ?, ?, ?)', id, 'staff', u.id, nowIso());
      else await DB.run(db, "DELETE FROM news_reads WHERE post_id = ? AND reader_type = 'staff' AND reader_id = ?", id, u.id);
    }
    for (const id of (body.notifications || []).map(Number)) await DB.run(db, "UPDATE notifications SET read_at = ? WHERE id = ? AND recipient_type = 'staff' AND recipient_id = ?", read ? nowIso() : null, id, u.id);
    if (body.all) { await DB.run(db, "UPDATE notifications SET read_at = ? WHERE recipient_type = 'staff' AND recipient_id = ? AND read_at IS NULL", nowIso(), u.id); }
    return out({ ok: true });
  }
  if (path === '/directory' && method === 'GET') return out({ ok: true, users: await DB.all(db, 'SELECT id, name, role_key, department FROM users WHERE active = 1 ORDER BY name') });
  if (path === '/chats' && method === 'GET') return out({ ok: true, chats: await chatList(ctx, u) });
  if (path === '/chats' && method === 'POST') return out({ ok: true, id: await chatOpen(ctx, u, body) });
  if ((m = path.match(/^\/chats\/(\d+)$/))) {
    const cid = +m[1];
    need(await DB.one(db, 'SELECT 1 AS ok FROM chat_members WHERE chat_id = ? AND user_id = ?', cid, u.id), 403, 'Du bist nicht Mitglied dieses Chats.');
    if (method === 'GET') {
      const msgs = await DB.all(db, 'SELECT m.*, u.name FROM chat_messages m JOIN users u ON u.id = m.user_id WHERE m.chat_id = ? ORDER BY m.id DESC LIMIT 200', cid);
      if (q.read !== '0') await DB.run(db, 'UPDATE chat_members SET last_read_at = ? WHERE chat_id = ? AND user_id = ?', nowIso(), cid, u.id);
      const chat = await DB.one(db, 'SELECT * FROM chats WHERE id = ?', cid);
      chat.members = await DB.all(db, 'SELECT u.id, u.name, u.role_key FROM chat_members m JOIN users u ON u.id = m.user_id WHERE m.chat_id = ?', cid);
      return out({ ok: true, chat, messages: msgs.reverse() });
    }
    if (method === 'POST') { await chatSend(ctx, u, cid, body.text); return out({ ok: true }); }
    if (method === 'PATCH') { await DB.run(db, 'UPDATE chat_members SET last_read_at = ? WHERE chat_id = ? AND user_id = ?', body.unread ? null : nowIso(), cid, u.id); return out({ ok: true }); }
  }
  if (path === '/absences' && method === 'GET') {
    return out({ ok: true, mine: await DB.all(db, 'SELECT a.*, s.name AS substitute_name FROM absences a LEFT JOIN users s ON s.id = a.substitute_id WHERE a.user_id = ? ORDER BY a.from_date DESC LIMIT 50', u.id),
      asSubstitute: await DB.all(db, 'SELECT a.*, x.name AS user_name FROM absences a JOIN users x ON x.id = a.user_id WHERE a.substitute_id = ? ORDER BY a.from_date DESC LIMIT 50', u.id),
      candidates: (await DB.all(db, 'SELECT id, name, role_key FROM users WHERE active = 1 AND id != ? ORDER BY name', u.id)).filter((x) => (x.role_key === u.role || (STAFF_ROLES[x.role_key] || {}).rank > u.rank)) });
  }
  if (path === '/absences' && method === 'POST') return out({ ok: true, id: await requestAbsence(ctx, u, { from: body.from, to: body.to, substituteId: toInt(body.substitute_id) || null, note: body.note }) });
  if ((m = path.match(/^\/absences\/(\d+)\/(decide|cancel)$/)) && method === 'POST') {
    const a = await DB.one(db, 'SELECT * FROM absences WHERE id = ?', +m[1]); need(a, 404, 'Nicht gefunden.');
    if (m[2] === 'cancel') { need(a.user_id === u.id, 403, 'Nicht erlaubt.'); await DB.update(db, 'absences', a.id, { status: 'storniert', decided_at: nowIso() }); }
    else {
      need(a.substitute_id === u.id && a.status === 'angefragt', 403, 'Nicht erlaubt.');
      await DB.update(db, 'absences', a.id, { status: body.accept ? 'bestaetigt' : 'abgelehnt', decided_at: nowIso() });
      await notify(ctx, 'staff', a.user_id, { kind: 'vertretung', title: body.accept ? `${u.name} \u00fcbernimmt deine Vertretung` : `${u.name} kann die Vertretung nicht \u00fcbernehmen`, body: `${fmtDateDE(a.from_date)} \u2013 ${fmtDateDE(a.to_date)}`, link: '#/news/vertretung' });
    }
    await audit(ctx, 'abwesenheit_' + m[2], 'abwesenheit', a.id, { accept: !!body.accept });
    return out({ ok: true });
  }

  /* ---------- Anfragen ---------- */
  if (path === '/requests' && method === 'GET') {
    requirePerm(u, 'req_view');
    const where = ['1=1'], args = [];
    const view = q.view || 'aktiv';
    if (view === 'spam') { where.push("(r.spam_state = 'gemeldet' OR r.status = 'spam')"); }
    else if (view === 'archiv') where.push(`r.deleted = 0 AND r.status NOT IN (${inList(OPEN_STATUSES)})`), args.push(...OPEN_STATUSES);
    else if (view === 'kopien') where.push('r.deleted = 0 AND EXISTS (SELECT 1 FROM billing_items b WHERE b.request_id = r.id)');
    else if (view === 'alle') where.push('r.deleted = 0');
    else { where.push(`r.deleted = 0 AND r.status IN (${inList(OPEN_STATUSES)})`); args.push(...OPEN_STATUSES); }
    if (q.mine === '1') { where.push(`r.assignee_id IN (${inList([u.id, ...u.subs])})`); args.push(u.id, ...u.subs); }
    if (q.unassigned === '1') where.push('r.assignee_id IS NULL');
    if (q.notes === '1') where.push('r.customer_note_unread = 1');
    if (q.type && REQUEST_TYPES[q.type]) { where.push('r.type = ?'); args.push(q.type); }
    if (q.status) { const st = q.status.split(',').filter((x) => REQUEST_STATUSES.some((s) => s.key === x)); if (st.length) { where.push(`r.status IN (${inList(st)})`); args.push(...st); } }
    if (q.brand) { where.push('r.brand = ?'); args.push(q.brand); }
    if (q.model) { where.push('r.model LIKE ?'); args.push('%' + q.model + '%'); }
    if (q.from) { where.push('r.created_at >= ?'); args.push(isoOf(berlinToUtc(...q.from.split('-').map(Number)))); }
    if (q.to) { where.push('r.created_at < ?'); args.push(isoOf(berlinToUtc(+q.to.slice(0, 4), +q.to.slice(5, 7), +q.to.slice(8, 10) + 1))); }
    if (q.assignee) { where.push('r.assignee_id = ?'); args.push(toInt(q.assignee)); }
    if (q.q) {
      const s = str(q.q, 100), num = /^#?\d{3,}$/.test(s) ? fromNumber(s) : null, like = '%' + s.replace(/[\\%_]/g, (c) => '\\' + c) + '%';
      const cols = ['r.customer_name', 'r.email', 'r.phone', 'r.brand', 'r.model', 'r.vehicle', 'r.summary', 'r.plz'];
      where.push('(' + cols.map((c) => `${c} LIKE ? ESCAPE '\\'`).join(' OR ') + (num ? ' OR r.id = ?' : '') + ')'); cols.forEach(() => args.push(like)); if (num) args.push(num);
    }
    const sort = REQ_SORT[q.sort] || 'r.id', dir = q.dir === 'asc' ? 'ASC' : 'DESC';
    const w = where.join(' AND ');
    const total = await DB.val(db, `SELECT COUNT(*) FROM requests r LEFT JOIN users u ON u.id = r.assignee_id WHERE ${w}`, ...args);
    const per = 50, pages = Math.max(1, Math.ceil(total / per)), page = Math.min(pages, Math.max(1, toInt(q.page, 1)));
    const rows = await DB.all(db, `SELECT r.*, u.name AS assignee_name FROM requests r LEFT JOIN users u ON u.id = r.assignee_id WHERE ${w} ORDER BY ${sort} ${dir}, r.id DESC LIMIT ? OFFSET ?`, ...args, per, (page - 1) * per);
    const items = []; for (const r of rows) items.push(await staffRequestRow(ctx, r, u));
    const brands = (await DB.all(db, "SELECT DISTINCT brand FROM requests WHERE brand IS NOT NULL AND brand != '' ORDER BY brand")).map((x) => x.brand);
    return out({ ok: true, items, total, page, pages, brands });
  }
  if ((m = path.match(/^\/requests\/(\d+)(?:\/(.+))?$/))) {
    requirePerm(u, 'req_view');
    const rid = fromNumber(m[1]), sub = m[2] || '', reqNo = m[1];
    const r = await DB.one(db, 'SELECT r.*, u.name AS assignee_name FROM requests r LEFT JOIN users u ON u.id = r.assignee_id WHERE r.id = ?', rid);
    need(r && (!r.deleted || r.status === 'spam' || can(u, 'req_delete')), 404, 'Anfrage nicht gefunden.');
    if (!sub && method === 'GET') {
      const d = jparse(r.data, {});
      const fields = {}; for (const [k, v] of Object.entries(d)) { if (/^(_|form$|form_type$|utf8$)/.test(k)) continue; if (!can(u, 'req_contact') && PERSONAL_KEY.test(k)) continue; fields[k] = v; }
      const assignments = await DB.all(db, `SELECT a.*, o.name AS org_name, o.city AS org_city, o.kind AS org_kind, pu.name AS taker_name FROM assignments a JOIN orgs o ON o.id = a.org_id LEFT JOIN partner_users pu ON pu.id = a.taken_by WHERE a.request_id = ? ORDER BY a.id`, rid);
      const offers = (await DB.all(db, 'SELECT o.*, g.name AS org_name, pu.name AS user_name FROM offers o JOIN orgs g ON g.id = o.org_id LEFT JOIN partner_users pu ON pu.id = o.user_id WHERE o.request_id = ? ORDER BY COALESCE(o.rank, 99), o.id', rid)).map((o) => ({ ...o, data: jparse(o.data, {}) }));
      const events = await DB.all(db, 'SELECT e.*, u.name AS author FROM events e LEFT JOIN users u ON u.id = e.user_id WHERE e.request_id = ? ORDER BY e.id DESC LIMIT 300', rid);
      const notes = await DB.all(db, 'SELECT n.*, u.name AS author FROM notes n LEFT JOIN users u ON u.id = n.user_id WHERE n.request_id = ? ORDER BY n.id DESC', rid);
      const pevents = await DB.all(db, 'SELECT * FROM partner_events WHERE request_id = ? ORDER BY id DESC LIMIT 300', rid);
      const billing = await DB.all(db, 'SELECT b.*, i.number AS invoice_number FROM billing_items b LEFT JOIN invoices i ON i.id = b.invoice_id WHERE b.request_id = ?', rid);
      const tickets = await DB.all(db, 'SELECT id, subject, status, tag FROM tickets WHERE request_id = ?', rid);
      if (r.customer_note_unread && can(u, 'req_edit')) await DB.update(db, 'requests', rid, { customer_note_unread: 0 });
      return out({ ok: true, request: { ...(await staffRequestRow(ctx, r, u)), fields, contact: can(u, 'req_contact') ? customerContact(r) : null, radius_km: r.radius_km, lat: r.lat, lon: r.lon,
        customer_account: r.customer_account, dispatched_at: r.dispatched_at, evaluated_at: r.evaluated_at, presented_at: r.presented_at, decided_at: r.decided_at, feedback_state: r.feedback_state, spam_reason: r.spam_reason, deleted: !!r.deleted },
        assignments, offers, events, notes, partnerEvents: pevents, billing, tickets });
    }
    if (!sub && method === 'PATCH') {
      requirePerm(u, 'req_edit');
      const upd = {}, log = [];
      if (body.status !== undefined) {
        need(REQUEST_STATUSES.some((s) => s.key === body.status) && body.status !== 'spam', 400, 'Unbekannter Status.');
        need(can(u, 'req_status_force') || ['eingang', 'in_bearbeitung', 'fehler', 'stoerung'].includes(body.status), 403, 'Diesen Status darf nur die Teamleitung setzen.');
        if (body.status !== r.status) { upd.status = body.status; log.push(['status', statusLabel(REQUEST_STATUSES, body.status) + (body.note ? ' \u2013 ' + body.note : '')]); }
      }
      if (body.priority !== undefined && ['normal', 'hoch', 'dringend'].includes(body.priority) && body.priority !== r.priority) { upd.priority = body.priority; log.push(['prioritaet', body.priority]); }
      if (body.assignee_id !== undefined) {
        const aid = body.assignee_id ? toInt(body.assignee_id) : null;
        need(can(u, 'req_assign') || aid === u.id || (aid === null && r.assignee_id === u.id), 403, 'Du kannst Anfragen nur dir selbst zuweisen.');
        if (aid) need(await DB.one(db, 'SELECT id FROM users WHERE id = ? AND active = 1', aid), 400, 'Mitarbeiter nicht gefunden.');
        if (aid !== r.assignee_id) {
          upd.assignee_id = aid; const nm = aid ? (await DB.one(db, 'SELECT name FROM users WHERE id = ?', aid)).name : 'niemand'; log.push(['zuweisung', nm]);
          if (aid && aid !== u.id) await notify(ctx, 'staff', aid, { kind: 'anfrage', title: `Dir wurde Anfrage #${m[1]} zugewiesen`, body: r.vehicle || '', link: `#/anfragen/${m[1]}` });
        }
      }
      if (Object.keys(upd).length) {
        upd.updated_at = nowIso(); if (!r.first_action_at) upd.first_action_at = nowIso();
        await DB.update(db, 'requests', rid, upd);
        for (const [a, dtl] of log) await reqEvent(ctx, rid, a, dtl);
        await audit(ctx, 'anfrage_geaendert', 'anfrage', reqNo, upd);
      }
      return out({ ok: true });
    }
    if (!sub && method === 'DELETE') {
      requirePerm(u, 'req_delete');
      await DB.update(db, 'requests', rid, { deleted: 1, status: 'spam', customer_name: null, email: null, phone: null, data: '{}', updated_at: nowIso() });
      await DB.run(db, "UPDATE assignments SET status = 'geschlossen', archived = 1, closed_reason = 'Anfrage gel\u00f6scht' WHERE request_id = ? AND status IN ('neu','in_bearbeitung','versendet','vorgestellt')", rid);
      await audit(ctx, 'anfrage_geloescht', 'anfrage', reqNo, { grund: str(body.reason, 300) });
      return out({ ok: true });
    }
    // Bestehende Notiz f\u00fcr die Buchhaltung markieren (bleibt dauerhaft am Fall angeheftet; aufheben nur Admin)
    const accM = String(sub || '').match(/^notes\/(\d+)\/acc$/);
    if (accM && method === 'POST') {
      const n = await DB.one(db, 'SELECT * FROM notes WHERE id = ? AND request_id = ?', +accM[1], rid); need(n, 404, 'Notiz nicht gefunden.');
      if (body.relevant === false) { need(u.role === 'admin', 403, 'Die Markierung f\u00fcr die Buchhaltung kann nur ein Admin aufheben.'); await DB.update(db, 'notes', n.id, { acc_relevant: 0 }); await audit(ctx, 'notiz_buchhaltung_aufgehoben', 'anfrage', reqNo, { notiz: n.id }); return out({ ok: true }); }
      requirePerm(u, 'req_edit');
      await DB.update(db, 'notes', n.id, { acc_relevant: 1, acc_marked_by: u.name, acc_marked_at: nowIso() });
      await audit(ctx, 'notiz_buchhaltung', 'anfrage', reqNo, { notiz: n.id, text: String(n.text).slice(0, 200) });
      return out({ ok: true });
    }
    if (sub === 'notes' && method === 'POST') {
      requirePerm(u, 'req_edit'); const text = str(body.text, 4000); need(text, 400, 'Bitte einen Text eingeben.');
      const accRel = body.acc_relevant === true || body.acc_relevant === 'on' || body.acc_relevant === '1';
      await DB.insert(db, 'notes', { request_id: rid, user_id: u.id, text, created_at: nowIso(), visibility: 'intern', author_type: 'staff', acc_relevant: accRel ? 1 : 0, acc_marked_by: accRel ? u.name : null, acc_marked_at: accRel ? nowIso() : null });
      if (accRel) await audit(ctx, 'notiz_buchhaltung', 'anfrage', reqNo, { text: text.slice(0, 200) });
      if (!r.first_action_at) await DB.update(db, 'requests', rid, { first_action_at: nowIso() });
      await reqEvent(ctx, rid, 'notiz', text.slice(0, 120));
      return out({ ok: true });
    }
    if (sub === 'dispatch' && method === 'POST') { requirePerm(u, 'req_partner'); const res = await dispatchRequest(ctx, rid); await audit(ctx, 'neu_verteilt', 'anfrage', reqNo, res); return out({ ok: true, ...res }); }
    if (sub === 'evaluate' && method === 'POST') { requirePerm(u, 'req_partner'); need(!r.evaluated_at, 409, 'Die Anfrage wurde bereits ausgewertet.'); await evaluateRequest(ctx, rid); await audit(ctx, 'auswertung_manuell', 'anfrage', reqNo, null); return out({ ok: true }); }
    if (sub === 'present' && method === 'POST') { requirePerm(u, 'req_edit'); need(r.status === 'angebot_in_bearbeitung', 409, 'Keine Angebote zur Freigabe.'); await presentOffers(ctx, rid); await audit(ctx, 'angebot_freigegeben', 'anfrage', reqNo, null); return out({ ok: true }); }
    if (sub === 'assign' && method === 'POST') {
      requirePerm(u, 'req_partner');
      const org = await DB.one(db, 'SELECT * FROM orgs WHERE id = ? AND deleted = 0', toInt(body.org_id)); need(org, 404, 'Gesch\u00e4ftspartner nicht gefunden.');
      need(!(await DB.one(db, 'SELECT id FROM assignments WHERE request_id = ? AND org_id = ?', rid, org.id)), 409, 'Dieser Partner hat die Anfrage bereits.');
      if (r.lat == null && plzOk(r.plz)) { const g = await geocodePlz(ctx, r.plz); if (g) { await DB.update(db, 'requests', rid, { lat: g.lat, lon: g.lon }); r.lat = g.lat; r.lon = g.lon; } }
      const res = await createAssignment(ctx, r, org, { source: 'manuell', targetUserId: toInt(body.target_user_id) || null, note: str(body.note, 2000) || null });
      const upd = { updated_at: nowIso(), deadline_at: await DB.val(db, "SELECT MAX(deadline_at) FROM assignments WHERE request_id = ? AND status IN ('neu','in_bearbeitung')", rid) };
      if (['eingang', 'in_bearbeitung', 'fehler', 'kein_angebot', 'stoerung'].includes(r.status)) { upd.status = 'versendet'; upd.status_note = null; upd.evaluated_at = null; upd.dispatched_at = r.dispatched_at || nowIso(); }
      await DB.update(db, 'requests', rid, upd);
      await reqEvent(ctx, rid, 'partner_zugeordnet', `${org.name} manuell zugeordnet`);
      await audit(ctx, 'partner_zugeordnet', 'anfrage', reqNo, { org: org.name });
      return out({ ok: true, id: res.id });
    }
    if (sub === 'candidates' && method === 'GET') {
      requirePerm(u, 'req_partner');
      const orgs = await DB.all(db, 'SELECT id, name, city, zip, lat, lon, brands, active FROM orgs WHERE deleted = 0 ORDER BY name');
      const have = new Set((await DB.all(db, 'SELECT org_id FROM assignments WHERE request_id = ?', rid)).map((x) => x.org_id));
      return out({ ok: true, orgs: orgs.map((o) => ({ id: o.id, name: o.name, city: o.city, active: !!o.active, assigned: have.has(o.id), brands: jparse(o.brands, []), brandMatch: jparse(o.brands, []).includes('*') || jparse(o.brands, []).some((b) => normBrand(b) === normBrand(r.brand)), distance: r.lat != null && o.lat != null ? distanceKm(r, o) : null })) });
    }
    if (sub === 'message' && method === 'POST') {
      requirePerm(u, 'req_message');
      const text = str(body.text, 4000), kind = ['notiz', 'ergaenzung', 'probefahrt', 'mahnung', 'info'].includes(body.kind) ? body.kind : 'info';
      need(text || kind === 'probefahrt', 400, 'Bitte gib eine Nachricht ein.');
      const s = await settingsOf(ctx);
      if (body.to === 'customer') {
        requirePerm(u, 'req_contact');
        const d = jparse(r.data, {});
        const res = await sendMail(ctx, { category: 'customer', to: r.email, toName: d.Vorname, subject: `Deine Anfrage #${m[1]} bei KFL`, title: `Nachricht zu deiner Anfrage #${m[1]}`, replyTo: s.mail_internal_inbox,
          body: `<p>Hallo ${esc(d.Vorname || '')},</p><p style="white-space:pre-wrap">${esc(text)}</p><p>Viele Gr\u00fc\u00dfe<br>${esc(u.name)}<br>${esc(s.company_name)}</p>` });
        await reqEvent(ctx, rid, 'nachricht_kunde', text.slice(0, 300));
        await audit(ctx, 'nachricht_kunde', 'anfrage', reqNo, { status: res.status });
        return out({ ok: true, mail: res.status });
      }
      const ids = (body.assignment_ids || []).map(Number);
      const asgs = await DB.all(db, `SELECT a.*, o.name AS org_name FROM assignments a JOIN orgs o ON o.id = a.org_id WHERE a.request_id = ?${ids.length ? ` AND a.id IN (${inList(ids)})` : ''}`, rid, ...ids);
      need(asgs.length, 400, 'Bitte w\u00e4hle mindestens einen Partner aus.');
      const label = { notiz: 'Notiz von KFL', ergaenzung: 'Erg\u00e4nzung zur Anfrage', probefahrt: 'Der Kunde ist an einer Probefahrt interessiert', mahnung: 'Bitte bearbeite diese Anfrage', info: 'Information von KFL' }[kind];
      const full = kind === 'probefahrt' ? (label + (text ? ': ' + text : '.')) : label + ': ' + text;
      for (const a of asgs) {
        await partnerEvent(ctx, { assignmentId: a.id, requestId: rid, orgId: a.org_id, action: kind, text: full, visiblePartner: true });
        if (kind === 'mahnung') { await DB.run(db, 'UPDATE assignments SET reminded_at = ?, reminders = reminders + 1 WHERE id = ?', nowIso(), a.id); await mailAssignment(ctx, r, { id: a.org_id, opening: (await DB.one(db, 'SELECT opening FROM orgs WHERE id = ?', a.org_id)).opening }, a.id, { reminder: true, extra: text, targetUserId: a.taken_by || a.target_user_id }); }
        else {
          const users = a.taken_by ? await DB.all(db, 'SELECT * FROM partner_users WHERE id = ?', a.taken_by) : await DB.all(db, 'SELECT * FROM partner_users WHERE org_id = ? AND active = 1', a.org_id);
          for (const pu of users) {
            await notify(ctx, 'partner', pu.id, { kind: kind === 'probefahrt' ? 'probefahrt' : 'info', title: `${label} \u00b7 #${m[1]}`, body: text, link: `#/anfragen/${a.id}` });
            await sendMail(ctx, { category: 'partner', to: pu.email, toName: pu.name, subject: `${label} \u00b7 Anfrage #${m[1]}`, title: label, body: `<p>Hallo ${esc(pu.name)},</p><p>zur Anfrage <strong>#${m[1]} \u00b7 ${esc(teaserLine(r, a.distance_km))}</strong>:</p><p style="white-space:pre-wrap">${esc(text || label)}</p>${s.link_partner ? mailBtn(s.link_partner + '#/anfragen/' + a.id, 'Zur Anfrage') : ''}` });
          }
        }
      }
      await reqEvent(ctx, rid, 'nachricht_partner', `${label} an ${asgs.map((a) => a.org_name).join(', ')}${text ? ': ' + text.slice(0, 200) : ''}`);
      await audit(ctx, 'nachricht_partner', 'anfrage', reqNo, { kind, partner: asgs.length });
      return out({ ok: true });
    }
    if ((m = sub.match(/^assignments\/(\d+)\/(resend|status|release)$/)) && method === 'POST') {
      const a = await DB.one(db, 'SELECT a.*, o.opening, o.name AS org_name FROM assignments a JOIN orgs o ON o.id = a.org_id WHERE a.id = ? AND a.request_id = ?', +m[1], rid); need(a, 404, 'Zuordnung nicht gefunden.');
      if (m[2] === 'resend') { requirePerm(u, 'req_message'); const res = await mailAssignment(ctx, r, { id: a.org_id, opening: a.opening }, a.id, { targetUserId: a.target_user_id }); await reqEvent(ctx, rid, 'erneut_gesendet', a.org_name); return out({ ok: true, ...res }); }
      if (m[2] === 'release') { requirePerm(u, 'req_partner'); await releaseAssignment(ctx, a.id, { reason: `KFL (${u.name}) hat die Anfrage wieder f\u00fcr die Organisation ge\u00f6ffnet.` }); return out({ ok: true }); }
      requirePerm(u, 'req_message'); await staffSetAssignmentStatus(ctx, a.id, body.status, body.note); await audit(ctx, 'partnerstatus_gesetzt', 'zuordnung', a.id, { status: body.status }); return out({ ok: true });
    }
    if (sub === 'spam' && method === 'POST') { requirePerm(u, 'req_spam_report'); need(!r.spam_state || r.spam_state === 'abgelehnt', 409, 'Diese Anfrage wurde bereits gemeldet.'); await reportSpam(ctx, rid, body.reason); await audit(ctx, 'spam_gemeldet', 'anfrage', reqNo, { grund: body.reason }); return out({ ok: true }); }
    if (sub === 'spam/decide' && method === 'POST') { requirePerm(u, 'req_spam_confirm'); await decideSpam(ctx, rid, !!body.confirm, str(body.note, 500)); await audit(ctx, body.confirm ? 'spam_bestaetigt' : 'spam_abgelehnt', 'anfrage', reqNo, null); return out({ ok: true }); }
    if ((m = sub.match(/^offers\/(\d+)\/(file|public)$/))) {
      const o = await DB.one(db, 'SELECT * FROM offers WHERE id = ? AND request_id = ?', +m[1], rid); need(o, 404, 'Angebot nicht gefunden.');
      if (m[2] === 'file' && method === 'GET') {
        const col = { pdf: 'pdf_file_id', expose: 'expose_file_id', public: 'public_file_id', public_expose: 'public_expose_id' }[q.which || 'pdf'];
        need(col && o[col], 404, 'Keine Datei vorhanden.');
        await audit(ctx, 'angebot_datei_geoeffnet', 'angebot', o.id, { datei: q.which || 'pdf' });
        return fileResponse(await getFile(ctx, o[col]), q.download === '1');
      }
      if (m[2] === 'public' && method === 'POST') {
        requirePerm(u, 'req_edit');
        const f = body.file; need(f && f.base64, 400, 'Bitte eine PDF-Datei ausw\u00e4hlen.');
        const id = await putFile(ctx, { name: f.name || 'angebot-neutral.pdf', mime: 'application/pdf', bytes: unb64(f.base64), ownerType: 'offer_public', ownerId: o.id });
        await DB.update(db, 'offers', o.id, { [body.which === 'expose' ? 'public_expose_id' : 'public_file_id']: id, updated_at: nowIso() });
        await reqEvent(ctx, rid, 'neutrale_pdf', 'Neutrale PDF f\u00fcr den Kunden freigegeben'); await audit(ctx, 'neutrale_pdf', 'angebot', o.id, null);
        return out({ ok: true });
      }
    }
  }

  /* ---------- Gesch\u00e4ftspartner ---------- */
  if (path === '/orgs' && method === 'GET') {
    requirePerm(u, 'partner_view');
    const rows = await DB.all(db, `SELECT o.*, (SELECT COUNT(*) FROM partner_users p WHERE p.org_id = o.id AND p.active = 1) AS users, (SELECT COUNT(*) FROM assignments a WHERE a.org_id = o.id AND a.status IN ('neu','in_bearbeitung')) AS open_asg FROM orgs o WHERE o.deleted = 0 ORDER BY o.name`);
    return out({ ok: true, orgs: rows.map((o) => ({ ...o, brands: jparse(o.brands, []), accepts: jparse(o.accepts, []), opening: jparse(o.opening, DEFAULT_OPENING), contacts: jparse(o.contacts, []) })) });
  }
  if (path === '/orgs' && method === 'POST') {
    requirePerm(u, 'partner_manage');
    const o = await orgFromBody(ctx, u, body, null);
    const id = await DB.insert(db, 'orgs', { ...o, created_at: nowIso(), updated_at: nowIso() });
    await audit(ctx, 'partner_angelegt', 'partner', id, { name: o.name });
    return out({ ok: true, id });
  }
  if ((m = path.match(/^\/orgs\/(\d+)(?:\/(.+))?$/))) {
    requirePerm(u, 'partner_view');
    const oid = +m[1], sub = m[2] || '';
    const org = await DB.one(db, 'SELECT * FROM orgs WHERE id = ?', oid);
    need(org && (!org.deleted || can(u, 'partner_delete')), 404, 'Gesch\u00e4ftspartner nicht gefunden.');
    if (!sub && method === 'GET') {
      const users = await DB.all(db, 'SELECT id, email, name, role, phone, active, agb_at, privacy_at, last_login, created_at, invite_expires, CASE WHEN pass_hash IS NULL THEN 1 ELSE 0 END AS pending, locked_until FROM partner_users WHERE org_id = ? ORDER BY role, name', oid);
      const notes = u.role === 'admin' ? await DB.all(db, 'SELECT n.*, u.name AS author FROM org_notes n LEFT JOIN users u ON u.id = n.user_id WHERE n.org_id = ? ORDER BY n.id DESC', oid) : [];
      const stats = can(u, 'partner_stats') ? (await partnerPerformance(ctx, { from: addDaysDate(berlinDate(nowMs()), -364) }, oid))[0] : null;
      const invoices = can(u, 'acc_view') ? await DB.all(db, 'SELECT id, number, issue_date, due_date, gross, paid, fees, status, dunning_level FROM invoices WHERE org_id = ? ORDER BY id DESC LIMIT 50', oid) : [];
      const asg = await DB.all(db, 'SELECT a.id, a.request_id, a.status, a.created_at, r.vehicle FROM assignments a JOIN requests r ON r.id = a.request_id WHERE a.org_id = ? ORDER BY a.id DESC LIMIT 30', oid);
      return out({ ok: true, org: { ...org, brands: jparse(org.brands, []), accepts: jparse(org.accepts, []), opening: jparse(org.opening, DEFAULT_OPENING), contacts: jparse(org.contacts, []) }, users, notes, stats, invoices, assignments: asg.map((a) => ({ ...a, number: toNumber(a.request_id) })) });
    }
    if (!sub && method === 'PATCH') {
      requirePerm(u, 'partner_manage');
      const o = await orgFromBody(ctx, u, body, org);
      await DB.update(db, 'orgs', oid, { ...o, updated_at: nowIso() });
      if (o.billing_mode && o.billing_mode !== org.billing_mode) await DB.insert(db, 'org_notes', { org_id: oid, user_id: u.id, text: `Abrechnungsart ge\u00e4ndert: ${org.billing_mode} \u2192 ${o.billing_mode} am ${fmtDE(nowMs())} durch ${u.name}`, created_at: nowIso() });
      const TL = { payment_terms_days: 'Zahlungsziel (Tage)', reminder_due_days: 'Frist Zahlungserinnerung (Tage)', dunning_fee_1: 'Mahngeb\u00fchr 1. Mahnung', dunning_fee_2: 'Mahngeb\u00fchr 2. Mahnung', dunning_due_days: 'Frist 1. Mahnung (Tage)', dunning_due_days_2: 'Frist 2. Mahnung (Tage)', lead_price: 'Lead-Preis' };
      for (const k of Object.keys(TL)) if (o[k] !== undefined && o[k] !== org[k]) await DB.insert(db, 'org_notes', { org_id: oid, user_id: u.id, text: `${TL[k]} ge\u00e4ndert: ${org[k] ?? 'Standard'} \u2192 ${o[k] ?? 'Standard'} (${u.name})`, created_at: nowIso() });
      await audit(ctx, 'partner_geaendert', 'partner', oid, Object.keys(o));
      return out({ ok: true });
    }
    if (!sub && method === 'DELETE') {
      requirePerm(u, 'partner_delete');
      await DB.update(db, 'orgs', oid, { deleted: 1, active: 0, updated_at: nowIso() });
      await DB.run(db, "UPDATE partner_users SET active = 0 WHERE org_id = ?", oid);
      await DB.run(db, "DELETE FROM partner_sessions WHERE user_id IN (SELECT id FROM partner_users WHERE org_id = ?)", oid);
      await audit(ctx, 'partner_geloescht', 'partner', oid, { name: org.name });
      return out({ ok: true });
    }
    if (sub === 'notes' && method === 'POST') { need(u.role === 'admin', 403, 'Nur f\u00fcr Admins.'); await DB.insert(db, 'org_notes', { org_id: oid, user_id: u.id, text: str(body.text, 2000), created_at: nowIso() }); return out({ ok: true }); }
    if (sub === 'training' && method === 'POST') { requirePerm(u, 'partner_manage'); await DB.update(db, 'orgs', oid, { training_done: body.done ? 1 : 0, training_at: body.done ? nowIso() : null }); await audit(ctx, 'schulung_' + (body.done ? 'ja' : 'nein'), 'partner', oid, null); return out({ ok: true }); }
    if (sub === 'users' && method === 'POST') {
      requirePerm(u, 'partner_manage');
      const email = str(body.email, 200).toLowerCase(), name = str(body.name, 80), role = PARTNER_ROLES[body.role] ? body.role : (org.kind === 'einzel' ? 'gf' : 'vt');
      need(emailOk(email) && name, 400, 'Bitte Name und g\u00fcltige E-Mail angeben.');
      need(!(await DB.one(db, 'SELECT id FROM partner_users WHERE email = ?', email)), 400, 'Diese E-Mail ist bereits als Partnerkonto angelegt.');
      const id = await DB.insert(db, 'partner_users', { org_id: oid, email, name, role, phone: str(body.phone, 40), active: 1, created_at: nowIso() });
      await audit(ctx, 'partnerkonto_angelegt', 'partner', oid, { email, role });
      return out({ ok: true, id });
    }
    if ((m = sub.match(/^users\/(\d+)(?:\/(invite|reset))?$/))) {
      const pu = await DB.one(db, 'SELECT * FROM partner_users WHERE id = ? AND org_id = ?', +m[1], oid); need(pu, 404, 'Konto nicht gefunden.');
      if (m[2] === 'invite' && method === 'POST') {
        requirePerm(u, 'partner_manage');
        need(!pu.pass_hash || can(u, 'partner_pw'), 403, 'Das Konto ist bereits aktiv. Passw\u00f6rter kann nur ein Admin zur\u00fccksetzen.');
        const inv = await newInvite(); await DB.update(db, 'partner_users', pu.id, { invite_hash: inv.hash, invite_expires: inv.expires });
        const r = await sendPartnerInvite(ctx, pu.id, inv.token);
        await audit(ctx, 'partner_einladung', 'partnerkonto', pu.id, { email: pu.email, mail: r.status });
        const s = await settingsOf(ctx);
        return out({ ok: true, mail: r.status, link: `${(s.link_partner || url.origin + '/partner').replace(/\/$/, '')}#/einladung/${inv.token}` });
      }
      if (m[2] === 'reset' && method === 'POST') {
        requirePerm(u, 'partner_pw');
        if (body.mode === 'temp') {
          const p = passwordProblem(body.password); need(!p, 400, p);
          const h = await hashPassword(body.password);
          await DB.update(db, 'partner_users', pu.id, { pass_hash: h.hash, pass_salt: h.salt, must_change_pw: 1, failed_logins: 0, locked_until: null, invite_hash: null });
          await DB.run(db, 'DELETE FROM partner_sessions WHERE user_id = ?', pu.id);
          const r = await sendPartnerInvite(ctx, pu.id, null, { tempPassword: body.password });
          await audit(ctx, 'partner_passwort_standard', 'partnerkonto', pu.id, { mail: r.status });
          return out({ ok: true, mail: r.status });
        }
        const inv = await newInvite(); await DB.update(db, 'partner_users', pu.id, { invite_hash: inv.hash, invite_expires: inv.expires });
        const r = await sendPartnerInvite(ctx, pu.id, inv.token, { reset: true });
        await audit(ctx, 'partner_passwort_link', 'partnerkonto', pu.id, { mail: r.status });
        return out({ ok: true, mail: r.status });
      }
      if (!m[2] && method === 'PATCH') {
        requirePerm(u, 'partner_manage');
        const upd = {};
        if (body.name !== undefined) upd.name = str(body.name, 80);
        if (body.phone !== undefined) upd.phone = str(body.phone, 40);
        if (body.role !== undefined && PARTNER_ROLES[body.role]) upd.role = body.role;
        if (body.active !== undefined) { upd.active = body.active ? 1 : 0; if (!body.active) await DB.run(db, 'DELETE FROM partner_sessions WHERE user_id = ?', pu.id); }
        if (body.locked !== undefined) { need(can(u, 'partner_delete'), 403, 'Sperren kann nur ein Admin.'); upd.locked_until = body.locked ? '9999-12-31T00:00:00.000Z' : null; if (body.locked) await DB.run(db, 'DELETE FROM partner_sessions WHERE user_id = ?', pu.id); }
        await DB.update(db, 'partner_users', pu.id, upd);
        await audit(ctx, 'partnerkonto_geaendert', 'partnerkonto', pu.id, upd);
        return out({ ok: true });
      }
      if (!m[2] && method === 'DELETE') {
        requirePerm(u, 'partner_delete');
        await DB.run(db, "UPDATE partner_users SET active = 0, email = email || '.geloescht-' || id, invite_hash = NULL, pass_hash = NULL WHERE id = ?", pu.id);
        await DB.run(db, 'DELETE FROM partner_sessions WHERE user_id = ?', pu.id);
        await audit(ctx, 'partnerkonto_geloescht', 'partnerkonto', pu.id, { email: pu.email });
        return out({ ok: true });
      }
    }
  }

  /* ---------- Buchhaltung ---------- */
  if (path.startsWith('/fibu/')) return handleFibu(ctx, u, path.slice(5), method, body, q, url);
  if (path.startsWith('/acc/')) return handleAccounting(ctx, u, path.slice(4), method, body, q, url);

  /* ---------- Statistik ---------- */
  if (path === '/stats/overview' && method === 'GET') { requirePerm(u, 'stats_view'); return out({ ok: true, ...(await statsOverview(ctx, q)) }); }
  if (path === '/stats/staff' && method === 'GET') { need(can(u, 'stats_view') || can(u, 'team_stats'), 403, 'Daf\u00fcr fehlt dir die Berechtigung.'); return out({ ok: true, staff: await staffPerformance(ctx, q, !can(u, 'stats_view')) }); }
  if (path === '/stats/partners' && method === 'GET') { need(can(u, 'stats_view') || can(u, 'partner_stats'), 403, 'Daf\u00fcr fehlt dir die Berechtigung.'); return out({ ok: true, partners: await partnerPerformance(ctx, q) }); }
  if (path === '/stats/shop' && method === 'GET') { requirePerm(u, 'stats_shop'); return out({ ok: true, ...(await shopifyStats(ctx, q)) }); }

  /* ---------- Support ---------- */
  if (path === '/tickets' && method === 'GET') {
    requirePerm(u, 'support_view');
    const where = [], args = [];
    if (q.archived === '1') where.push('t.archived_at IS NOT NULL'); else where.push('t.archived_at IS NULL');
    if (q.tag) { where.push('t.tag = ?'); args.push(q.tag); }
    if (q.status) { where.push('t.status = ?'); args.push(q.status); } else if (q.archived !== '1' && q.all !== '1') where.push("t.status != 'erledigt'");
    if (q.priority) { where.push('t.priority = ?'); args.push(q.priority); }
    if (q.kind) { where.push('t.kind = ?'); args.push(q.kind); }
    if (q.q) { const like = '%' + q.q + '%'; where.push('(t.subject LIKE ? OR t.requester_name LIKE ? OR t.requester_email LIKE ? OR t.id = ?)'); args.push(like, like, like, toInt(q.q, -1)); }
    const rows = await DB.all(db, `SELECT t.*, u.name AS assignee_name, o.name AS org_name, (SELECT COUNT(*) FROM ticket_messages m WHERE m.ticket_id = t.id) AS messages
      FROM tickets t LEFT JOIN users u ON u.id = t.assignee_id LEFT JOIN orgs o ON o.id = t.org_id WHERE ${where.join(' AND ')}
      ORDER BY CASE t.priority WHEN 'dringend' THEN 0 WHEN 'hoch' THEN 1 ELSE 2 END, CASE t.status WHEN 'neu' THEN 0 WHEN 'in_bearbeitung' THEN 1 WHEN 'wartet' THEN 2 ELSE 3 END, t.id DESC LIMIT 300`, ...args);
    return out({ ok: true, tickets: rows });
  }
  if (path === '/tickets' && method === 'POST') {
    const id = await createTicket(ctx, { tag: 'Intern', category: str(body.category, 60) || 'Technisches Problem', subject: str(body.subject, 200), priority: ['normal', 'hoch', 'dringend'].includes(body.priority) ? body.priority : 'normal', requester: { type: 'staff', id: u.id, name: u.name, email: u.email }, text: str(body.text, 8000) });
    return out({ ok: true, id });
  }
  if ((m = path.match(/^\/tickets\/(\d+)(?:\/(reply|change))?$/))) {
    const tk = await DB.one(db, 'SELECT t.*, o.name AS org_name FROM tickets t LEFT JOIN orgs o ON o.id = t.org_id WHERE t.id = ?', +m[1]);
    need(tk, 404, 'Ticket nicht gefunden.');
    const own = tk.requester_type === 'staff' && tk.requester_id === u.id;
    need(can(u, 'support_view') || own, 403, 'Daf\u00fcr fehlt dir die Berechtigung.');
    if (!m[2] && method === 'GET') {
      const msgs = await DB.all(db, `SELECT * FROM ticket_messages WHERE ticket_id = ? ${can(u, 'support_view') ? '' : 'AND internal = 0'} ORDER BY id`, tk.id);
      return out({ ok: true, ticket: { ...tk, payload: jparse(tk.payload, null) }, messages: msgs });
    }
    if (m[2] === 'reply' && method === 'POST') {
      if (!own) requirePerm(u, 'support_manage');
      await ticketReply(ctx, tk.id, { authorType: own && !can(u, 'support_manage') ? 'requester' : 'staff', authorId: u.id, authorName: u.name, text: body.text, internal: !!body.internal && can(u, 'support_manage') });
      if (!own || can(u, 'support_manage')) await audit(ctx, 'support_antwort', 'ticket', tk.id, { intern: !!body.internal });
      return out({ ok: true });
    }
    if (m[2] === 'change' && method === 'POST') { requirePerm(u, 'support_changes'); need(tk.kind === 'aenderung' && tk.status !== 'erledigt', 409, 'Kein offener \u00c4nderungsantrag.'); await applyChangeRequest(ctx, tk, !!body.approve, str(body.note, 500)); return out({ ok: true }); }
    if (!m[2] && method === 'PATCH') {
      requirePerm(u, 'support_manage');
      const upd = { updated_at: nowIso() };
      if (body.status && TICKET_STATUSES.some((s) => s.key === body.status)) { upd.status = body.status; upd.done_at = body.status === 'erledigt' ? nowIso() : null; }
      if (body.priority && TICKET_PRIORITIES.some((s) => s.key === body.priority)) upd.priority = body.priority;
      if (body.assignee_id !== undefined) upd.assignee_id = body.assignee_id ? toInt(body.assignee_id) : null;
      if (body.tag && ['Webseite', 'Intern', 'Partner', 'Kunde'].includes(body.tag)) upd.tag = body.tag;
      await DB.update(db, 'tickets', tk.id, upd);
      await audit(ctx, 'support_geaendert', 'ticket', tk.id, upd);
      return out({ ok: true });
    }
  }
  if (path === '/sysissues' && method === 'GET') { requirePerm(u, 'support_syslist'); return out({ ok: true, issues: (await DB.all(db, 'SELECT s.*, u.name AS author FROM sys_issues s LEFT JOIN users u ON u.id = s.created_by ORDER BY s.status = \'erledigt\', s.id DESC')).map((x) => ({ ...x, notes: jparse(x.notes, []) })) }); }
  if (path === '/sysissues' && method === 'POST') { requirePerm(u, 'support_syslist'); need(str(body.title, 200), 400, 'Bitte einen Titel angeben.'); const id = await DB.insert(db, 'sys_issues', { title: str(body.title, 200), details: str(body.details, 8000), status: 'offen', created_by: u.id, created_at: nowIso(), notes: '[]' }); await audit(ctx, 'systemfehler_angelegt', 'systemfehler', id, null); return out({ ok: true, id }); }
  if ((m = path.match(/^\/sysissues\/(\d+)$/)) && method === 'PATCH') {
    requirePerm(u, 'support_syslist');
    const si = await DB.one(db, 'SELECT * FROM sys_issues WHERE id = ?', +m[1]); need(si, 404, 'Nicht gefunden.');
    const notes = jparse(si.notes, []);
    if (body.note) notes.push({ at: nowIso(), by: u.name, text: str(body.note, 2000) });
    const upd = { notes: JSON.stringify(notes) };
    if (body.status && ['offen', 'in_bearbeitung', 'erledigt'].includes(body.status)) { upd.status = body.status; upd.done_at = body.status === 'erledigt' ? nowIso() : null; }
    await DB.update(db, 'sys_issues', si.id, upd); await audit(ctx, 'systemfehler_geaendert', 'systemfehler', si.id, { status: upd.status });
    return out({ ok: true });
  }

  /* ---------- Backup (Admin + Bereichspasswort) ---------- */
  if (path === '/backups' && method === 'GET') { requireArea(u, 'backup_view'); return out({ ok: true, backups: (await DB.all(db, 'SELECT * FROM backups ORDER BY id DESC LIMIT 60')).map((b) => ({ ...b, report: jparse(b.report, null) })), report: await securityReport(ctx), passwordSet: !!(await rawSetting(db, '_backup_pw')) }); }
  if (path === '/backups' && method === 'POST') { requireArea(u, 'backup_view'); return out({ ok: true, id: await createBackup(ctx, { kind: 'manuell' }) }); }
  if ((m = path.match(/^\/backups\/(\d+)\/download$/)) && method === 'GET') { requireArea(u, 'backup_view'); const b = await DB.one(db, 'SELECT * FROM backups WHERE id = ?', +m[1]); need(b, 404, 'Backup nicht gefunden.'); await audit(ctx, 'backup_heruntergeladen', 'backup', b.id, null); return fileResponse(await getFile(ctx, b.file_id), true); }
  if (path === '/backups/password' && method === 'POST') {
    requireArea(u, 'backup_view'); need(u.role === 'admin', 403, 'Nur der Admin kann das Backup-Passwort festlegen.');
    const p = passwordProblem(body.password); need(!p, 400, p);
    await setRawSetting(db, '_backup_pw', await sealSecret(env, body.password));
    await audit(ctx, 'backup_passwort_geaendert', 'backup', null, null);
    return out({ ok: true });
  }
  if (path === '/archive' && method === 'GET') { requireArea(u, 'backup_view'); return out({ ok: true, items: await DB.all(db, `SELECT id, kind, ref_id, title, archived_at, expires_at FROM archive ${q.kind ? 'WHERE kind = ?' : ''} ORDER BY id DESC LIMIT 500`, ...(q.kind ? [q.kind] : [])) }); }
  if ((m = path.match(/^\/archive\/(\d+)$/)) && method === 'GET') { requireArea(u, 'backup_view'); const a = await DB.one(db, 'SELECT * FROM archive WHERE id = ?', +m[1]); need(a, 404, 'Nicht gefunden.'); return out({ ok: true, item: { ...a, data: jparse(a.data, {}) } }); }

  /* ---------- Protokoll (Admin + Bereichspasswort) ---------- */
  if (path === '/audit' && method === 'GET') {
    requireArea(u, 'audit_view');
    const where = [], args = [];
    if (q.q) { const like = '%' + q.q + '%'; where.push('(action LIKE ? OR actor_name LIKE ? OR entity_id LIKE ? OR detail LIKE ?)'); args.push(like, like, like, like); }
    if (q.actor_type) { where.push('actor_type = ?'); args.push(q.actor_type); }
    if (q.from) { where.push('at >= ?'); args.push(isoOf(berlinToUtc(...q.from.split('-').map(Number)))); }
    if (q.to) { where.push('at < ?'); args.push(isoOf(berlinToUtc(+q.to.slice(0, 4), +q.to.slice(5, 7), +q.to.slice(8, 10) + 1))); }
    const per = 100, page = Math.max(1, toInt(q.page, 1));
    const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const total = await DB.val(db, `SELECT COUNT(*) FROM audit ${w}`, ...args);
    const rows = await DB.all(db, `SELECT * FROM audit ${w} ORDER BY id DESC LIMIT ? OFFSET ?`, ...args, per, (page - 1) * per);
    if (q.export === '1') {
      const all = await DB.all(db, `SELECT * FROM audit ${w} ORDER BY id DESC LIMIT 20000`, ...args);
      const txt = all.map((a) => [a.at, a.actor_type, a.actor_name, a.action, a.entity, a.entity_id, a.detail, a.ip].map((x) => String(x ?? '').replace(/[\t\n]/g, ' ')).join('\t')).join('\n');
      await audit(ctx, 'protokoll_export', 'protokoll', null, { eintraege: all.length });
      return new Response('Zeit\tTyp\tWer\tAktion\tObjekt\tID\tDetails\tIP-Kennung\n' + txt, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Disposition': `attachment; filename="kfl-protokoll-${berlinDate(nowMs())}.txt"`, ...SEC_HEADERS } });
    }
    return out({ ok: true, items: rows, total, page, pages: Math.max(1, Math.ceil(total / per)) });
  }

  /* ---------- Verwaltung: Mitarbeiter, Rollen, Einstellungen, Links ---------- */
  if (path === '/users' && method === 'GET') {
    need(can(u, 'users_view') || can(u, 'users_create') || can(u, 'users_admin'), 403, 'Daf\u00fcr fehlt dir die Berechtigung.');
    const rows = await DB.all(db, `SELECT id, email, name, role_key, active, department, phone, extra_perms, revoked_perms, created_at, last_login, locked_until, CASE WHEN pass_hash IS NULL THEN 1 ELSE 0 END AS pending FROM users ORDER BY active DESC, name`);
    return out({ ok: true, users: rows.map((r) => ({ ...r, extra_perms: jparse(r.extra_perms, []), revoked_perms: jparse(r.revoked_perms, []), locked: !!(r.locked_until && r.locked_until > '9000') })) });
  }
  if (path === '/users' && method === 'POST') {
    const role = String(body.role_key || '');
    need(STAFF_ROLES[role], 400, 'Bitte eine Rolle w\u00e4hlen.');
    const allowed = can(u, 'users_admin') ? Object.keys(STAFF_ROLES) : can(u, 'users_create') ? ['teamleitung', 'vertrieb', 'buchhaltung'] : can(u, 'users_create_vt') ? ['vertrieb'] : [];
    need(allowed.includes(role), 403, 'Diese Rolle darfst du nicht vergeben.');
    const email = str(body.email, 200).toLowerCase(), name = str(body.name, 80);
    need(emailOk(email) && name, 400, 'Bitte Name und g\u00fcltige E-Mail angeben.');
    need(!(await DB.one(db, 'SELECT id FROM users WHERE email = ?', email)), 400, 'Diese E-Mail ist bereits angelegt.');
    const inv = await newInvite();
    const id = await DB.insert(db, 'users', { email, name, role_key: role, department: str(body.department, 60), phone: str(body.phone, 40), active: 1, invite_hash: inv.hash, invite_expires: inv.expires, created_by: u.id, created_at: nowIso() });
    await audit(ctx, 'mitarbeiter_angelegt', 'mitarbeiter', id, { email, role });
    const r = await staffInviteMail(ctx, { email, name }, inv.token, url);
    return out({ ok: true, id, invite: r.link, mail: r.status });
  }
  if ((m = path.match(/^\/users\/(\d+)(?:\/(invite|reset))?$/))) {
    const target = await DB.one(db, 'SELECT * FROM users WHERE id = ?', +m[1]); need(target, 404, 'Mitarbeiter nicht gefunden.');
    const targetRank = (STAFF_ROLES[target.role_key] || { rank: 0 }).rank;
    const isAdmin = can(u, 'users_admin');
    if (!isAdmin) need((can(u, 'users_create') && targetRank < 80) || (can(u, 'users_create_vt') && target.role_key === 'vertrieb'), 403, 'Dieses Konto darfst du nicht verwalten.');
    if (m[2] === 'invite' && method === 'POST') {
      need(!target.pass_hash || isAdmin, 403, 'Passw\u00f6rter bestehender Konten kann nur ein Admin zur\u00fccksetzen.');
      const inv = await newInvite(); await DB.update(db, 'users', target.id, { invite_hash: inv.hash, invite_expires: inv.expires });
      const r = await staffInviteMail(ctx, target, inv.token, url);
      await audit(ctx, 'mitarbeiter_einladung', 'mitarbeiter', target.id, null);
      return out({ ok: true, invite: r.link, mail: r.status });
    }
    if (m[2] === 'reset' && method === 'POST') {
      need(isAdmin, 403, 'Passw\u00f6rter kann nur ein Admin zur\u00fccksetzen.');
      if (body.mode === 'temp') {
        const p = passwordProblem(body.password); need(!p, 400, p);
        const h = await hashPassword(body.password);
        await DB.update(db, 'users', target.id, { pass_hash: h.hash, pass_salt: h.salt, must_change_pw: 1, failed_logins: 0, invite_hash: null });
        await DB.run(db, 'DELETE FROM sessions WHERE user_id = ?', target.id);
        const s = await settingsOf(ctx);
        const r = await sendMail(ctx, { category: 'system', to: target.email, toName: target.name, subject: 'Dein vorl\u00e4ufiges Passwort f\u00fcr das KFL Dashboard', title: 'Passwort zur\u00fcckgesetzt', body: `<p>Hallo ${esc(target.name)},</p><p>dein vorl\u00e4ufiges Passwort lautet:</p><p style="font:700 20px monospace;background:#f4f4f4;border-radius:10px;padding:12px 16px;display:inline-block">${esc(body.password)}</p><p>Bitte melde dich an und vergib sofort ein eigenes Passwort.</p>${mailBtn(s.link_staff || url.origin + '/admin', 'Zum Dashboard')}` });
        await audit(ctx, 'mitarbeiter_passwort_standard', 'mitarbeiter', target.id, { mail: r.status });
        return out({ ok: true, mail: r.status });
      }
      const inv = await newInvite(); await DB.update(db, 'users', target.id, { invite_hash: inv.hash, invite_expires: inv.expires });
      const r = await staffInviteMail(ctx, target, inv.token, url, true);
      await audit(ctx, 'mitarbeiter_passwort_link', 'mitarbeiter', target.id, null);
      return out({ ok: true, invite: r.link, mail: r.status });
    }
    if (!m[2] && method === 'PATCH') {
      const upd = {};
      if (body.name !== undefined) upd.name = str(body.name, 80);
      if (body.department !== undefined) upd.department = str(body.department, 60);
      if (body.phone !== undefined) upd.phone = str(body.phone, 40);
      if (body.role_key !== undefined && body.role_key !== target.role_key) {
        need(STAFF_ROLES[body.role_key], 400, 'Unbekannte Rolle.');
        const allowed = isAdmin ? Object.keys(STAFF_ROLES) : can(u, 'users_create') ? ['teamleitung', 'vertrieb', 'buchhaltung'] : ['vertrieb'];
        need(allowed.includes(body.role_key), 403, 'Diese Rolle darfst du nicht vergeben.');
        if (target.role_key === 'admin') need((await DB.val(db, "SELECT COUNT(*) FROM users WHERE role_key = 'admin' AND active = 1 AND id != ?", target.id)) > 0, 400, 'Es muss mindestens ein aktiver Admin bleiben.');
        upd.role_key = body.role_key;
      }
      if (body.active !== undefined || body.locked !== undefined) {
        need(isAdmin, 403, 'Konten sperren kann nur ein Admin.');
        need(target.id !== u.id, 400, 'Du kannst dein eigenes Konto nicht sperren.');
        if (body.active === false || body.locked === true) need(target.role_key !== 'admin' || (await DB.val(db, "SELECT COUNT(*) FROM users WHERE role_key = 'admin' AND active = 1 AND id != ?", target.id)) > 0, 400, 'Es muss mindestens ein aktiver Admin bleiben.');
        if (body.active !== undefined) upd.active = body.active ? 1 : 0;
        if (body.locked !== undefined) upd.locked_until = body.locked ? '9999-12-31T00:00:00.000Z' : null;
        if (body.active === false || body.locked === true) await DB.run(db, 'DELETE FROM sessions WHERE user_id = ?', target.id);
      }
      if (body.extra_perms !== undefined || body.revoked_perms !== undefined) {
        need(can(u, 'users_perms'), 403, 'Sonderrechte kann nur der Admin vergeben.');
        if (body.extra_perms !== undefined) upd.extra_perms = JSON.stringify((body.extra_perms || []).filter((p) => PERM_KEYS.includes(p)));
        if (body.revoked_perms !== undefined) upd.revoked_perms = JSON.stringify((body.revoked_perms || []).filter((p) => PERM_KEYS.includes(p)));
      }
      await DB.update(db, 'users', target.id, upd);
      await audit(ctx, upd.extra_perms || upd.revoked_perms ? 'rechte_geaendert' : 'mitarbeiter_geaendert', 'mitarbeiter', target.id, upd);
      return out({ ok: true });
    }
    if (!m[2] && method === 'DELETE') {
      need(isAdmin, 403, 'Nutzerkonten l\u00f6schen kann nur ein Admin.'); need(target.id !== u.id, 400, 'Du kannst dich nicht selbst l\u00f6schen.');
      need(target.role_key !== 'admin' || (await DB.val(db, "SELECT COUNT(*) FROM users WHERE role_key = 'admin' AND active = 1 AND id != ?", target.id)) > 0, 400, 'Es muss mindestens ein aktiver Admin bleiben.');
      await DB.run(db, "UPDATE users SET active = 0, email = email || '.geloescht-' || id, pass_hash = NULL, invite_hash = NULL WHERE id = ?", target.id);
      await DB.run(db, 'DELETE FROM sessions WHERE user_id = ?', target.id);
      await audit(ctx, 'mitarbeiter_geloescht', 'mitarbeiter', target.id, { email: target.email });
      return out({ ok: true });
    }
  }
  if (path === '/roles' && method === 'GET') { need(can(u, 'users_view') || can(u, 'users_admin') || can(u, 'users_create'), 403, 'Daf\u00fcr fehlt dir die Berechtigung.'); return out({ ok: true, roles: (await DB.all(db, 'SELECT * FROM roles')).map((r) => ({ ...r, perms: jparse(r.perms, []) })) }); }
  if ((m = path.match(/^\/roles\/([a-z_]+)$/)) && method === 'PATCH') {
    requirePerm(u, 'users_perms'); need(STAFF_ROLES[m[1]] && m[1] !== 'admin', 400, 'Die Admin-Rolle hat immer alle Rechte.');
    const perms = (body.perms || []).filter((p) => PERM_KEYS.includes(p));
    await DB.run(db, 'UPDATE roles SET perms = ? WHERE key = ?', JSON.stringify(perms), m[1]);
    await audit(ctx, 'rolle_geaendert', 'rolle', m[1], perms);
    return out({ ok: true });
  }
  if (path === '/settings' && method === 'GET') {
    need(can(u, 'settings_all') || can(u, 'acc_settings') || can(u, 'acc_manage'), 403, 'Daf\u00fcr fehlt dir die Berechtigung.');
    const s = await settingsOf(ctx);
    const keys = (can(u, 'settings_all') ? Object.keys(DEFAULT_SETTINGS) : can(u, 'acc_settings') ? GF_SETTINGS : ACC_SETTINGS).filter((k) => !SCORING_KEYS.includes(k) && k !== 'score_weight_price');
    const menv = await mailEnv(ctx);
    return out({ ok: true, settings: Object.fromEntries(keys.map((k) => [k, s[k]])), editable: keys, env: can(u, 'settings_all') ? { mail: mailProvider(menv), smtpUser: menv.SMTP_PASS ? smtpUser(menv) : null, smtpSource: menv._smtpSource || null, smtpCheck: { user: true, pass: !!menv.SMTP_PASS, host: env.SMTP_HOST || 'smtp.ionos.de', port: env.SMTP_PORT || '587', similar: Object.keys(env).filter((k) => /smtp|e-?mail|ionos|norepl/i.test(k) && !['SMTP_USER', 'SMTP_PASS', 'SMTP_HOST', 'SMTP_PORT'].includes(k) && !/^SMTP_PASS_[A-Z0-9_]+$/.test(k)) }, brevo: !!env.BREVO_API_KEY, r2: !!env.FILES, shopify: !!env.SHOPIFY_ADMIN_TOKEN, cfapi: !!env.CF_API_TOKEN, oldDb: !!env.OLD_DB } : undefined });
  }
  if (path === '/settings' && method === 'PATCH') {
    need(can(u, 'settings_all') || can(u, 'acc_settings') || can(u, 'acc_manage'), 403, 'Daf\u00fcr fehlt dir die Berechtigung.');
    const keys = (can(u, 'settings_all') ? Object.keys(DEFAULT_SETTINGS) : can(u, 'acc_settings') ? GF_SETTINGS : ACC_SETTINGS).filter((k) => !SCORING_KEYS.includes(k) && k !== 'score_weight_price');
    const upd = {};
    for (const [k, v] of Object.entries(body || {})) {
      if (!keys.includes(k)) continue;
      const def = DEFAULT_SETTINGS[k];
      if (typeof def === 'number') { const n = toNum(v); need(n !== null && n >= 0, 400, `Ung\u00fcltiger Wert f\u00fcr ${k}.`); upd[k] = n; }
      else if (typeof def === 'boolean') upd[k] = !!v;
      else if (Array.isArray(def)) upd[k] = Array.isArray(v) ? v : String(v).split(',').map((x) => toInt(x.trim())).filter((x) => !isNaN(x));
      else upd[k] = str(v, 4000);
      if (/^mail_from_/.test(k)) need(emailOk(upd[k]), 400, `Bitte eine g\u00fcltige Absenderadresse f\u00fcr ${k} angeben.`);
    }
    await saveSettings(ctx, upd);
    await audit(ctx, 'einstellungen_geaendert', 'einstellungen', null, upd);
    return out({ ok: true });
  }
  /* ---------- Angebotsauswahl: Gewichtung der Faktoren (nur Admin, Freigabe mit Passwort) ---------- */
  if (path === '/scoring' && method === 'GET') {
    need(u.role === 'admin', 403, 'Die Angebotsauswahl kann nur der Admin einsehen und \u00e4ndern.');
    const s = await settingsOf(ctx);
    return out({ ok: true, factors: SCORE_FACTORS, weights: scoreWeights(s), presented_count: toInt(s.presented_count, 3), review_before_present: !!s.review_before_present,
      history: (await DB.all(db, "SELECT at, actor_name, detail FROM audit WHERE action = 'angebotsauswahl_geaendert' ORDER BY id DESC LIMIT 10")).map((h) => ({ at: h.at, author: h.actor_name, detail: jparse(h.detail, {}) })) });
  }
  if (path === '/scoring' && method === 'POST') {
    need(u.role === 'admin', 403, 'Die Angebotsauswahl kann nur der Admin \u00e4ndern.');
    need(await scoringPasswordOk(ctx, body.password), 403, 'Das Freigabepasswort ist falsch. Die Einstellungen wurden nicht gespeichert.');
    const upd = {}; let sum = 0;
    for (const f of SCORE_FACTORS) {
      const v = toInt(body.weights && body.weights[f.key], NaN);
      need(Number.isInteger(v) && v >= 0 && v <= 100, 400, `Bitte f\u00fcr \u201e${f.label}\u201c einen Wert zwischen 0 und 100 % angeben.`);
      upd['score_w_' + f.key] = v; sum += v;
    }
    need(sum === 100, 400, `Die Faktoren m\u00fcssen zusammen genau 100 % ergeben (aktuell ${sum} %).`);
    const n = toInt(body.presented_count, 3); need(n >= 1 && n <= 3, 400, 'Es k\u00f6nnen 1 bis 3 Angebote vorgestellt werden.');
    upd.presented_count = n;
    await saveSettings(ctx, upd);
    await audit(ctx, 'angebotsauswahl_geaendert', 'einstellungen', null, upd);
    return out({ ok: true });
  }
  if (path === '/settings/area-password' && method === 'POST') {
    need(u.role === 'admin', 403, 'Nur der Admin kann das Bereichspasswort \u00e4ndern.');
    need(await areaPasswordOk(ctx, body.current), 403, 'Das aktuelle Bereichspasswort ist falsch.');
    const p = passwordProblem(body.next); need(!p, 400, p);
    await setAreaPassword(ctx, body.next);
    await audit(ctx, 'bereichspasswort_geaendert', 'einstellungen', null, null);
    return out({ ok: true });
  }
  if (path === '/links' && method === 'GET') {
    const s = await settingsOf(ctx);
    return out({ ok: true, staff: s.link_staff || url.origin + '/admin', partner: s.link_partner || url.origin + '/partner', shopify: can(u, 'links_view') ? s.link_shopify_admin : null });
  }
  if (path === '/links/send' && method === 'POST') {
    need(can(u, 'users_create') || can(u, 'users_create_vt') || can(u, 'partner_manage'), 403, 'Daf\u00fcr fehlt dir die Berechtigung.');
    const s = await settingsOf(ctx);
    const which = body.which === 'partner' ? 'partner' : 'staff';
    need(emailOk(body.email), 400, 'Bitte eine g\u00fcltige E-Mail-Adresse angeben.');
    const link = which === 'partner' ? (s.link_partner || url.origin + '/partner') : (s.link_staff || url.origin + '/admin');
    const r = await sendMail(ctx, { category: 'system', to: str(body.email, 200), subject: which === 'partner' ? 'Dein Link zum KFL-Partner-Dashboard' : 'Dein Link zum KFL Dashboard', title: which === 'partner' ? 'KFL-Partner-Dashboard' : 'KFL Dashboard', body: `<p>Hallo,</p><p>hier ist der Link ${which === 'partner' ? 'zum KFL-Partner-Dashboard' : 'zum internen KFL Dashboard'}:</p>${mailBtn(link, 'Dashboard \u00f6ffnen')}<p style="color:#6b6b70;font-size:13px">${esc(link)}</p>` });
    await audit(ctx, 'link_versendet', 'link', which, { an: body.email });
    return out({ ok: true, mail: r.status });
  }
  // Postfach-Zugang im Dashboard hinterlegen: wird bei IONOS gepr\u00fcft und verschl\u00fcsselt gespeichert
  if (path === '/mail/credentials' && method === 'POST') {
    requirePerm(u, 'settings_all');
    const user = str(body.user, 200).toLowerCase(), pass = String(body.pass || '');
    need(emailOk(user), 400, 'Bitte die E-Mail-Adresse des Postfachs angeben.');
    need(pass.length >= 1 && pass.length <= 200, 400, 'Bitte das Passwort des Postfachs angeben.');
    try { await smtpVerify(env, user, pass); }
    catch (e) { await audit(ctx, 'mailzugang_fehlgeschlagen', 'einstellungen', null, { postfach: user }); throw new HttpError(400, /AUTH|535|Authentication/i.test(e.message) ? 'IONOS hat die Anmeldung abgelehnt: E-Mail-Adresse oder Passwort des Postfachs stimmen nicht.' : 'Keine Verbindung zum Mailserver: ' + e.message); }
    await setRawSetting(db, '_smtp_cred', await sealSecret(env, JSON.stringify({ user, pass })));
    ctx._mailEnv = null;
    await audit(ctx, 'mailzugang_gespeichert', 'einstellungen', null, { postfach: user });
    return out({ ok: true, user });
  }
  if (path === '/mail/credentials' && method === 'DELETE') {
    requirePerm(u, 'settings_all');
    await DB.run(db, "DELETE FROM settings WHERE key = '_smtp_cred'"); ctx._mailEnv = null;
    await audit(ctx, 'mailzugang_entfernt', 'einstellungen', null, null);
    return out({ ok: true });
  }
  if (path === '/mail/test' && method === 'POST') {
    requirePerm(u, 'settings_all');
    const to = str(body.to, 200) || u.email; need(emailOk(to), 400, 'Bitte eine g\u00fcltige E-Mail-Adresse angeben.');
    const cat = MAIL_CATEGORIES[body.category] ? body.category : 'system';
    const s = await settingsOf(ctx);
    const r = await sendMail(ctx, { category: cat, to, subject: 'Test-E-Mail aus dem KFL Dashboard', title: 'Der E-Mail-Versand funktioniert',
      body: `<p>Hallo ${esc(u.name)},</p><p>diese Test-E-Mail wurde \u00fcber ${mailProvider(await mailEnv(ctx)) === 'smtp' ? 'das Postfach ' + esc(smtpUser(await mailEnv(ctx))) : mailProvider(await mailEnv(ctx)) === 'brevo' ? 'Brevo' : 'keinen Dienst'} mit dem Absender <strong>${esc(s[MAIL_CATEGORIES[cat].setting] || s.mail_from_system)}</strong> versendet.</p>` });
    await audit(ctx, 'test_mail', 'einstellungen', null, { an: to, status: r.status });
    return out({ ok: true, status: r.status, error: r.error || null, provider: mailProvider(await mailEnv(ctx)) });
  }
  if (path === '/outbox' && method === 'GET') { requirePerm(u, 'settings_all'); return out({ ok: true, mails: await DB.all(db, 'SELECT id, category, sender, recipient, subject, status, error, server_reply, created_at FROM mail_outbox ORDER BY id DESC LIMIT 200') }); }
  if ((m = path.match(/^\/outbox\/(\d+)$/)) && method === 'GET') { requirePerm(u, 'settings_all'); const mm = await DB.one(db, 'SELECT * FROM mail_outbox WHERE id = ?', +m[1]); need(mm, 404, 'Nicht gefunden.'); return new Response(mm.html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'none'; img-src data:; style-src 'unsafe-inline'", ...SEC_HEADERS } }); }
  if (path === '/geo/import' && method === 'POST') {
    requirePerm(u, 'settings_all');
    let n = 0;
    for (const line of String(body.csv || '').split(/\r?\n/)) {
      const [zip, lat, lon, city] = line.split(/[;,\t]/).map((x) => (x || '').trim());
      if (!plzOk(zip) || isNaN(parseFloat(lat)) || isNaN(parseFloat(lon))) continue;
      await DB.run(db, 'INSERT OR REPLACE INTO geo_cache (zip, lat, lon, city, source, created_at) VALUES (?, ?, ?, ?, ?, ?)', zip, parseFloat(lat), parseFloat(lon), city || '', 'import', nowIso()); n++;
    }
    await audit(ctx, 'geodaten_importiert', 'einstellungen', null, { anzahl: n });
    return out({ ok: true, imported: n });
  }
  if (path === '/jobs/run' && method === 'POST') { requirePerm(u, 'settings_all'); const r = await runJobs(ctx, { force: body.job }); await audit(ctx, 'job_manuell', 'system', body.job || 'alle', r); return out({ ok: true, result: r }); }
  if (path === '/import-old' && method === 'POST') { requirePerm(u, 'settings_all'); const r = await importOldDatabase(ctx); await audit(ctx, 'altdaten_importiert', 'system', null, r); return out({ ok: true, ...r }); }

  return fail(404, 'Nicht gefunden.');
}

async function staffInviteMail(ctx, user, token, url, reset = false) {
  const s = await settingsOf(ctx);
  const base = s.link_staff || url.origin + '/admin';
  const link = `${base.replace(/\/$/, '')}#/einladung/${token}`;
  const r = await sendMail(ctx, { category: 'system', to: user.email, toName: user.name, subject: reset ? 'Neues Passwort f\u00fcr dein KFL Dashboard' : 'Deine Einladung zum KFL Dashboard', title: reset ? 'Neues Passwort festlegen' : 'Willkommen im KFL Dashboard',
    body: `<p>Hallo ${esc(user.name)},</p><p>${reset ? '\u00fcber diesen Link legst du ein neues Passwort fest' : 'du wurdest zum internen KFL Dashboard eingeladen. Lege \u00fcber diesen Link dein Passwort fest'} (g\u00fcltig ${INVITE_DAYS} Tage):</p>${mailBtn(link, 'Passwort festlegen')}<p style="color:#6b6b70;font-size:13px">Wenn du diese E-Mail nicht erwartet hast, ignoriere sie einfach.</p>` });
  return { link, status: r.status };
}

async function orgFromBody(ctx, u, b, existing) {
  const o = {};
  const set = (k, v) => { if (v !== undefined) o[k] = v; };
  if (!existing || b.name !== undefined) { need(str(b.name, 160), 400, 'Bitte gib den Firmennamen an.'); o.name = str(b.name, 160); }
  if (b.kind !== undefined) set('kind', b.kind === 'einzel' ? 'einzel' : 'organisation');
  for (const k of ['street', 'city', 'country', 'phone', 'website', 'billing_name', 'billing_street', 'billing_city', 'vat_id', 'tax_no']) if (b[k] !== undefined) set(k, str(b[k], 200));
  for (const k of ['email', 'billing_email']) if (b[k] !== undefined) { const e = str(b[k], 200).toLowerCase(); need(!e || emailOk(e), 400, 'Bitte eine g\u00fcltige E-Mail-Adresse angeben.'); set(k, e); }
  for (const k of ['zip', 'billing_zip']) if (b[k] !== undefined) { const z = str(b[k], 10); need(!z || plzOk(z), 400, 'Bitte eine g\u00fcltige Postleitzahl angeben.'); set(k, z); }
  if (b.brands !== undefined) set('brands', JSON.stringify(Array.isArray(b.brands) ? b.brands.map((x) => str(x, 60)).filter(Boolean) : String(b.brands).split(',').map((x) => x.trim()).filter(Boolean)));
  if (b.accepts !== undefined) set('accepts', JSON.stringify((Array.isArray(b.accepts) ? b.accepts : []).filter((x) => REQUEST_TYPES[x])));
  if (b.max_radius_km !== undefined) set('max_radius_km', b.max_radius_km === '' || b.max_radius_km === null ? null : toInt(b.max_radius_km, null));
  if (b.opening !== undefined) { const op = {}; for (const d of WEEKDAYS) { const v = b.opening[d]; op[d] = v && v[0] && v[1] ? [str(v[0], 5), str(v[1], 5)] : null; } set('opening', JSON.stringify(op)); }
  if (b.contacts !== undefined) set('contacts', JSON.stringify((b.contacts || []).slice(0, 20).map((c) => ({ role: str(c.role, 60), name: str(c.name, 80), email: str(c.email, 200), phone: str(c.phone, 40) }))));
  if (b.active !== undefined) set('active', b.active ? 1 : 0);
  const terms = ['billing_mode', 'lead_price', ...Object.keys(ORG_TERMS)].filter((k) => b[k] !== undefined && (!existing || String(b[k] ?? '') !== String(existing[k] ?? '')));
  if (terms.length) {
    need(can(u, 'partner_terms'), 403, 'Konditionen (Abrechnungsart, Zahlungsziel, Geb\u00fchren) d\u00fcrfen nur Gesch\u00e4ftsf\u00fchrung und Admin \u00e4ndern.');
    if (b.billing_mode !== undefined) set('billing_mode', b.billing_mode === 'monatlich' ? 'monatlich' : 'einzel');
    // Zahlungsziel, Fristen (Tage) und Mahngeb\u00fchren (\u20ac) \u2013 leer = Standard aus den Einstellungen
    for (const k of Object.keys(ORG_TERMS)) if (b[k] !== undefined) {
      const isFee = /fee/.test(k), v = b[k] === '' || b[k] === null ? null : isFee ? toNum(b[k]) : toInt(b[k], null);
      need(v === null || (v >= 0 && (isFee ? v <= 10000 : v <= 365)), 400, isFee ? 'Bitte eine g\u00fcltige Mahngeb\u00fchr angeben.' : 'Bitte eine g\u00fcltige Anzahl Tage (0\u2013365) angeben.');
      set(k, v === null ? null : isFee ? round2(v) : v);
    }
    if (b.lead_price !== undefined) set('lead_price', b.lead_price === '' || b.lead_price === null ? null : toNum(b.lead_price));
  }
  // Geokoordinaten der Anschrift
  const zip = o.zip !== undefined ? o.zip : existing && existing.zip;
  if (zip && (!existing || o.zip !== undefined)) { const g = await geocodePlz(ctx, zip); if (g) { o.lat = g.lat; o.lon = g.lon; } }
  if (!existing) {
    if (!o.opening) o.opening = JSON.stringify(DEFAULT_OPENING); if (!o.brands) o.brands = '[]';
    // Neue Gesch\u00e4ftspartner bekommen die Standard-Konditionen fest hinterlegt (danach je Partner \u00e4nderbar)
    const st = await settingsOf(ctx); for (const [col, key] of Object.entries(ORG_TERMS)) if (o[col] === undefined || o[col] === null) o[col] = st[key];
  }
  return o;
}


/* ===== 42-api-partner.js ===== */
/* ============================================================
   Schnittstelle Partner-Dashboard (/papi/\u2026)
   Sichtbarkeit: Neue Anfragen sieht die ganze Organisation (nur Eckdaten),
   nach \u00dcbernahme nur die bearbeitende Person; Verkaufsleitung/Gesch\u00e4ftsf\u00fchrer
   sehen nur, wer bearbeitet (Angebote \u00fcber die Seite \u201eAngebote\u201c, protokolliert).
   ============================================================ */

function partnerPublic(p) {
  return p && { id: p.id, name: p.name, email: p.email, role: p.role, roleLabel: p.roleLabel, phone: p.phone, mustChangePw: p.mustChangePw, consentsOk: p.consentsOk, prevLogin: p.prevLogin,
    org: { id: p.org.id, name: p.org.name, kind: p.org.kind, city: p.org.city, brands: jparse(p.org.brands, []) } };
}
function asgTone(a) { return (ASSIGN_STATUSES.find((s) => s.key === a.status) || {}).tone || 'info'; }

async function partnerAssignmentView(ctx, p, a, { detail = false } = {}) {
  const req = await DB.one(ctx.db, 'SELECT * FROM requests WHERE id = ?', a.request_id);
  const mine = a.taken_by === p.id;
  const base = { id: a.id, status: a.status, statusLabel: statusLabel(ASSIGN_STATUSES, a.status), tone: a.archived ? 'warn' : asgTone(a), distance_km: a.distance_km, deadline_at: a.deadline_at,
    created_at: a.created_at, lock_until: mine ? a.lock_until : null, taken_at: a.taken_at, sent_at: a.sent_at, won_at: a.won_at, contact_due_at: mine || p.rank >= 2 ? a.contact_due_at : null,
    closed_reason: a.closed_reason, archived: !!a.archived, mine, direct: a.target_user_id === p.id, source: a.source };
  if (a.status === 'neu') return { ...base, level: 'teaser', request: partnerRequestData(req, 'teaser') };
  if (!mine) {
    if (p.rank < 2) return null;
    const taker = a.taken_by ? await DB.one(ctx.db, 'SELECT name FROM partner_users WHERE id = ?', a.taken_by) : null;
    return { ...base, level: 'summary', taker: taker ? taker.name : null, request: partnerRequestData(req, 'teaser') };
  }
  const v = { ...base, level: 'full', request: partnerRequestData(req, 'full') };
  if (detail) {
    const offer = a.offer_id ? await DB.one(ctx.db, 'SELECT * FROM offers WHERE id = ?', a.offer_id) : null;
    v.offer = offer ? { ...offer, data: jparse(offer.data, {}) } : null;
    v.events = await DB.all(ctx.db, 'SELECT action, text, actor_name, created_at FROM partner_events WHERE assignment_id = ? AND visible_partner = 1 ORDER BY id DESC', a.id);
    if (['gewonnen', 'kontaktiert', 'nicht_erreicht', 'gescheitert'].includes(a.status)) v.contact = customerContact(req);
    v.payKind = req.pay_kind; v.kindHint = req.type === 'sell' ? 'ankauf' : ({ kaufen: 'kauf', finanzieren: 'finanzierung', leasen: 'leasing' }[req.pay_kind] || 'kauf');
    v.b2b = /gewerb|selbst/i.test(jparse(req.data, {}).Kundenart || '');
    if (!a.seen_at) await DB.update(ctx.db, 'assignments', a.id, { seen_at: nowIso() });
  }
  return v;
}

// PDF-Text grob auslesen (unkomprimiert und Flate), um Eckdaten vorzuschlagen
async function pdfText(bytes) {
  const raw = new TextDecoder('latin1').decode(bytes);
  const chunks = [];
  const re = /stream\r?\n/g; let mt;
  while ((mt = re.exec(raw))) {
    const start = mt.index + mt[0].length, end = raw.indexOf('endstream', start);
    if (end < 0) break;
    const dict = raw.slice(Math.max(0, mt.index - 300), mt.index);
    const data = bytes.subarray(start, end);
    let txt = '';
    if (/FlateDecode/.test(dict)) { try { const ds = new DecompressionStream('deflate'); txt = new TextDecoder('latin1').decode(await new Response(new Blob([data]).stream().pipeThrough(ds)).arrayBuffer()); } catch (e) { txt = ''; } }
    else txt = new TextDecoder('latin1').decode(data);
    const parts = [];
    for (const t of txt.matchAll(/\((?:\\.|[^\\)])*\)\s*Tj|\[(?:[^\]]*)\]\s*TJ/g)) {
      const s = t[0];
      const strs = [...s.matchAll(/\(((?:\\.|[^\\)])*)\)/g)].map((x) => x[1].replace(/\\(\d{3})/g, (_, o) => String.fromCharCode(parseInt(o, 8))).replace(/\\([()\\])/g, '$1'));
      parts.push(strs.join(''));
    }
    if (parts.length) chunks.push(parts.join(' '));
    re.lastIndex = end;
  }
  return chunks.join('\n').replace(/\s+/g, ' ').slice(0, 50000);
}
function offerSuggestions(text) {
  const num = (s) => toNum(s);
  const find = (patterns) => { for (const p of patterns) { const m = text.match(p); if (m) { const n = num(m[1]); if (n !== null) return n; } } return null; };
  const amount = '([0-9]{1,3}(?:[.\\s][0-9]{3})*(?:,[0-9]{2})?|[0-9]+(?:,[0-9]{2})?)\\s*(?:\u20ac|EUR)?';
  const sug = {
    monthly_rate: find([new RegExp('(?:monatliche?\\s*(?:Leasing|Finanzierungs)?rate|Rate\\s*mtl\\.?|mtl\\.?\\s*Rate|Leasingrate|monatlich)[^0-9]{0,40}' + amount, 'i')]),
    price: find([new RegExp('(?:Kaufpreis|Barpreis|Hauspreis|Gesamtpreis|Fahrzeugpreis)[^0-9]{0,40}' + amount, 'i')]),
    final_rate: find([new RegExp('(?:Schlussrate|Restrate|Restwert)[^0-9]{0,40}' + amount, 'i')]),
    down_payment: find([new RegExp('(?:Anzahlung|Sonderzahlung|Leasingsonderzahlung)[^0-9]{0,40}' + amount, 'i')]),
    transfer_cost: find([new RegExp('(?:\u00dcberf\u00fchrung|Ueberfuehrung|Bereitstellung|Zulassung)[^0-9]{0,60}' + amount, 'i')]),
    term_months: find([/(?:Laufzeit|Vertragslaufzeit)[^0-9]{0,30}([0-9]{2})\s*(?:Monate|Mon)/i, /([0-9]{2})\s*Monate/i]),
    km_per_year: find([/([0-9]{1,3}[.\s]?[0-9]{3})\s*km\s*(?:\/|pro|p\.)\s*(?:Jahr|a)/i, /(?:Fahrleistung|Laufleistung)[^0-9]{0,30}([0-9]{1,3}[.\s]?[0-9]{3})/i]),
    upe: find([new RegExp('(?:UPE|Listenpreis|unverbindliche Preisempfehlung)[^0-9]{0,40}' + amount, 'i')]),
    mileage: find([/(?:Kilometerstand|km-Stand|Laufleistung)[^0-9]{0,20}([0-9]{1,3}[.\s]?[0-9]{3})\s*km/i])
  };
  const herst = text.match(/(?:Konfigurationscode|Konfigurations-?Nr|Code)[:\s]*([A-Z0-9-]{6,20})/i);
  if (herst) sug.herstellercode = herst[1];
  return Object.fromEntries(Object.entries(sug).filter(([, v]) => v !== null && v !== undefined));
}

async function handlePartnerApi(ctx, url) {
  const { request, db } = ctx;
  const path = url.pathname.replace(/^\/papi/, '') || '/';
  const method = request.method;
  if (method !== 'GET') { need(request.headers.get('X-KFL') === '1', 403, 'Ung\u00fcltige Anfrage'); const o = request.headers.get('Origin'); need(!o || o === url.origin, 403, 'Ung\u00fcltige Herkunft'); }
  const body = method === 'GET' ? {} : await readJson(request, 20_000_000);
  const q = Object.fromEntries(url.searchParams);
  const s = await settingsOf(ctx);
  let m;

  if (path === '/session' && method === 'GET') { const p = await currentPartner(ctx); return out({ ok: true, user: partnerPublic(p), links: { shop: s.link_shop, instagram: s.link_instagram, agb: s.link_agb_partner, privacy: s.link_privacy }, config: { assignStatuses: ASSIGN_STATUSES, partnerRoles: PARTNER_ROLES, weekdays: WEEKDAYS, weekdayLabels: WEEKDAY_LABELS } }); }
  if (path === '/login' && method === 'POST') {
    const r = await loginGeneric(ctx, 'partner_users', 'partner_sessions', str(body.email, 200).toLowerCase(), String(body.password || ''));
    if (r.error) return fail(r.status, r.error);
    return out({ ok: true }, 200, { 'Set-Cookie': cookieHeader(PARTNER_COOKIE, r.session.token, r.session.maxAge) });
  }
  if (path === '/logout' && method === 'POST') { const t = readCookie(request, PARTNER_COOKIE); if (t) await DB.run(db, 'DELETE FROM partner_sessions WHERE token_hash = ?', await sha256Hex(t)); return out({ ok: true }, 200, { 'Set-Cookie': cookieHeader(PARTNER_COOKIE, '', 0) }); }
  if (path === '/invite/check' && method === 'GET') {
    const t = q.token || ''; need(/^[0-9a-f]{64}$/.test(t), 400, 'Ung\u00fcltiger Link.');
    const u = await DB.one(db, 'SELECT u.email, u.name, u.invite_expires, o.name AS org_name FROM partner_users u JOIN orgs o ON o.id = u.org_id WHERE u.invite_hash = ? AND u.active = 1', await sha256Hex(t));
    need(u && u.invite_expires > nowIso(), 400, 'Dieser Link ist ung\u00fcltig oder abgelaufen. Bitte wende dich an den KFL-Support.');
    return out({ ok: true, email: u.email, name: u.name, org: u.org_name });
  }
  if (path === '/invite/accept' && method === 'POST') {
    const t = str(body.token, 64); need(/^[0-9a-f]{64}$/.test(t), 400, 'Ung\u00fcltiger Link.');
    const u = await DB.one(db, 'SELECT * FROM partner_users WHERE invite_hash = ? AND active = 1', await sha256Hex(t));
    need(u && u.invite_expires > nowIso(), 400, 'Dieser Link ist ung\u00fcltig oder abgelaufen.');
    const pr = passwordProblem(body.password); need(!pr, 400, pr);
    need(body.agb && body.privacy, 400, 'Bitte akzeptiere die AGB und die Datenschutzhinweise.');
    const h = await hashPassword(body.password);
    await DB.run(db, 'UPDATE partner_users SET pass_hash = ?, pass_salt = ?, invite_hash = NULL, invite_expires = NULL, failed_logins = 0, must_change_pw = 0, agb_at = COALESCE(agb_at, ?), privacy_at = COALESCE(privacy_at, ?), last_login = ? WHERE id = ?', h.hash, h.salt, nowIso(), nowIso(), nowIso(), u.id);
    await DB.run(db, 'DELETE FROM partner_sessions WHERE user_id = ?', u.id);
    ctx.actor = { type: 'partner', id: u.id, name: u.name };
    await audit(ctx, 'partner_passwort_gesetzt', 'partnerkonto', u.id, { agb: true, datenschutz: true });
    const sess = await createSessionRow(db, 'partner_sessions', u.id);
    return out({ ok: true }, 200, { 'Set-Cookie': cookieHeader(PARTNER_COOKIE, sess.token, sess.maxAge) });
  }
  if (path === '/support-public' && method === 'POST') {
    if (body.website) return out({ ok: true });
    const name = str(body.name, 80), email = str(body.email, 200).toLowerCase(), message = str(body.message, 4000);
    need(name && emailOk(email) && message.length >= 5, 400, 'Bitte f\u00fclle Name, E-Mail und Nachricht aus.');
    need((await DB.val(db, "SELECT COUNT(*) FROM audit WHERE action = 'support_ticket' AND ip = ? AND at >= ?", ctx.ipHash || '-', isoOf(nowMs() - 3600e3))) < 5, 429, 'Zu viele Anfragen. Bitte sp\u00e4ter erneut versuchen.');
    const known = await DB.one(db, 'SELECT id, org_id FROM partner_users WHERE email = ?', email);
    ctx.actor = { type: 'web', name };
    const id = await createTicket(ctx, { tag: 'Partner', category: str(body.topic, 60) || 'Anmeldung / Zugang', subject: str(body.topic, 60) || 'Support-Anfrage (Partner-Login)', requester: { type: known ? 'partner' : 'web', id: known ? known.id : null, name, email }, orgId: known ? known.org_id : null, text: message });
    return out({ ok: true, number: id });
  }

  const p = await currentPartner(ctx);
  requirePartner(p);
  if (path === '/consents' && method === 'POST') {
    need(body.agb && body.privacy, 400, 'Bitte akzeptiere beides.');
    await DB.run(db, 'UPDATE partner_users SET agb_at = COALESCE(agb_at, ?), privacy_at = COALESCE(privacy_at, ?) WHERE id = ?', nowIso(), nowIso(), p.id);
    await audit(ctx, 'partner_zustimmung', 'partnerkonto', p.id, { agb: true, datenschutz: true });
    return out({ ok: true });
  }
  if (path === '/password' && method === 'POST') {
    const row = await DB.one(db, 'SELECT pass_hash, pass_salt FROM partner_users WHERE id = ?', p.id);
    need(await verifyPassword(body.current, row.pass_hash, row.pass_salt), 400, 'Das aktuelle Passwort ist falsch.');
    const pr = passwordProblem(body.next); need(!pr, 400, pr);
    const h = await hashPassword(body.next);
    await DB.run(db, 'UPDATE partner_users SET pass_hash = ?, pass_salt = ?, must_change_pw = 0 WHERE id = ?', h.hash, h.salt, p.id);
    await audit(ctx, 'partner_passwort_geaendert', 'partnerkonto', p.id, null);
    return out({ ok: true });
  }
  need(p.consentsOk, 451, 'Bitte best\u00e4tige zuerst die AGB und die Datenschutzhinweise.');
  need(!p.mustChangePw, 428, 'Bitte vergib zuerst ein eigenes Passwort.');
  const visibleAsg = async (where, ...args) => {
    const rows = await DB.all(db, `SELECT * FROM assignments WHERE org_id = ? AND ${where} ORDER BY id DESC LIMIT 300`, p.orgId, ...args);
    const out2 = []; for (const a of rows) { const v = await partnerAssignmentView(ctx, p, a); if (v) out2.push(v); } return out2;
  };

  /* ---------- Start ---------- */
  if (path === '/start' && method === 'GET') {
    const w = isoWeek(nowMs());
    const news = await newsFor(ctx, 'partner', p, { limit: 20 });
    const since = p.prevLogin || isoOf(nowMs() - 7 * 86400e3);
    const today = berlinDate(nowMs());
    const notes = await DB.all(db, 'SELECT * FROM partner_notes WHERE user_id = ? AND (day IS NULL OR day = ?) ORDER BY day IS NOT NULL DESC, id DESC', p.id, today);
    const newReq = await visibleAsg("status = 'neu' AND archived = 0 AND (target_user_id IS NULL OR target_user_id = ? OR ? >= 2)", p.id, p.rank);
    const mine = await visibleAsg("taken_by = ? AND status = 'in_bearbeitung'", p.id);
    const waiting = await visibleAsg("taken_by = ? AND status IN ('versendet','vorgestellt')", p.id);
    const won = await visibleAsg("taken_by = ? AND status IN ('gewonnen','nicht_erreicht')", p.id);
    const st = await DB.one(db, `SELECT COUNT(*) AS taken, SUM(offer_id IS NOT NULL) AS offers, SUM(status IN ('gewonnen','kontaktiert','nicht_erreicht')) AS won, SUM(status = 'vorgestellt' OR status IN ('gewonnen','kontaktiert','nicht_erreicht')) AS presented FROM assignments WHERE org_id = ? AND taken_by = ?`, p.orgId, p.id);
    const weekStart = isoOf(berlinToUtc(...addDaysDate(today, -((['mo', 'di', 'mi', 'do', 'fr', 'sa', 'so'].indexOf(berlinParts(nowMs()).wd)))).split('-').map(Number), 0, 0));
    const weekOffers = await DB.val(db, 'SELECT COUNT(*) FROM offers WHERE user_id = ? AND created_at >= ?', p.id, weekStart);
    const orgAvg = await DB.val(db, `SELECT AVG(n) FROM (SELECT COUNT(*) AS n FROM offers WHERE org_id = ? AND created_at >= ? GROUP BY user_id)`, p.orgId, isoOf(nowMs() - 28 * 86400e3));
    const goal = Math.max(3, Math.ceil(((orgAvg || 0) / 4) * 1.2));
    const newSince = await DB.val(db, "SELECT COUNT(*) FROM notifications WHERE recipient_type = 'partner' AND recipient_id = ? AND created_at > ?", p.id, since);
    // Aktivit\u00e4t der letzten 14 Tage (eigene Angebote und \u00dcbernahmen je Tag) f\u00fcr das Start-Diagramm
    const from14 = isoOf(nowMs() - 13 * 86400e3).slice(0, 10);
    const offDays = await DB.all(db, 'SELECT substr(created_at, 1, 10) AS d, COUNT(*) AS n FROM offers WHERE user_id = ? AND created_at >= ? GROUP BY d', p.id, from14);
    const takeDays = await DB.all(db, 'SELECT substr(taken_at, 1, 10) AS d, COUNT(*) AS n FROM assignments WHERE taken_by = ? AND taken_at >= ? GROUP BY d', p.id, from14);
    const activity = []; for (let i = 13; i >= 0; i--) { const d = isoOf(nowMs() - i * 86400e3).slice(0, 10); activity.push({ day: d, offers: (offDays.find((x) => x.d === d) || {}).n || 0, taken: (takeDays.find((x) => x.d === d) || {}).n || 0 }); }
    return out({ ok: true, today, week: w.week, year: w.year, news, notes, newRequests: newReq, mine, waiting, won, newSince, activity,
      stats: { taken: st.taken || 0, offers: st.offers || 0, won: st.won || 0, presented: st.presented || 0, winRate: st.offers ? Math.round((st.won || 0) / st.offers * 100) : 0, weekOffers, weekGoal: goal } });
  }
  if (path === '/notes' && method === 'GET') return out({ ok: true, notes: await DB.all(db, 'SELECT * FROM partner_notes WHERE user_id = ? ORDER BY day IS NULL DESC, day, id DESC', p.id) });
  if (path === '/notes' && method === 'POST') { need(str(body.text, 1000), 400, 'Bitte einen Text eingeben.'); need(!body.day || /^\d{4}-\d{2}-\d{2}$/.test(body.day), 400, 'Ung\u00fcltiges Datum.'); const id = await DB.insert(db, 'partner_notes', { user_id: p.id, day: body.day || null, text: str(body.text, 1000), created_at: nowIso() }); return out({ ok: true, id }); }
  if ((m = path.match(/^\/notes\/(\d+)$/)) && method === 'DELETE') { await DB.run(db, 'DELETE FROM partner_notes WHERE id = ? AND user_id = ?', +m[1], p.id); return out({ ok: true }); }

  /* ---------- Anfragen ---------- */
  if (path === '/requests' && method === 'GET') {
    const tab = q.tab || 'neu';
    const W = {
      neu: ["status = 'neu' AND archived = 0 AND (target_user_id IS NULL OR target_user_id = ? OR ? >= 2)", p.id, p.rank],
      meine: ["taken_by = ? AND status = 'in_bearbeitung'", p.id],
      beantwortet: ["taken_by = ? AND (status IN ('versendet','vorgestellt') OR (status = 'geschlossen' AND archived = 0))", p.id],
      gewonnen: ["taken_by = ? AND status IN ('gewonnen','kontaktiert','nicht_erreicht')", p.id],
      archiv: [p.rank >= 2 ? "(archived = 1 OR status IN ('verloren','gescheitert','kontaktiert'))" : "taken_by = ? AND (archived = 1 OR status IN ('verloren','gescheitert','kontaktiert'))", ...(p.rank >= 2 ? [] : [p.id])],
      team: ["status NOT IN ('neu') AND archived = 0", ]
    }[tab];
    need(W && (tab !== 'team' || p.rank >= 2), 400, 'Unbekannte Ansicht.');
    return out({ ok: true, items: await visibleAsg(...W) });
  }
  if ((m = path.match(/^\/requests\/(\d+)(?:\/(take|release|offer|contact|parse-pdf))?$/))) {
    const a = await DB.one(db, 'SELECT * FROM assignments WHERE id = ? AND org_id = ?', +m[1], p.orgId);
    need(a, 404, 'Anfrage nicht gefunden.');
    const sub = m[2] || '';
    if (!sub && method === 'GET') { const v = await partnerAssignmentView(ctx, p, a, { detail: true }); need(v, 403, 'Diese Anfrage wird von einer anderen Person bearbeitet.'); return out({ ok: true, item: v }); }
    if (sub === 'take' && method === 'POST') return out(await takeAssignment(ctx, p, a.id));
    if (sub === 'release' && method === 'POST') { need(a.taken_by === p.id && a.status === 'in_bearbeitung', 409, 'Du kannst nur deine eigenen Anfragen in Bearbeitung wieder \u00f6ffnen.'); await releaseAssignment(ctx, a.id, { byPartner: true }); await audit(ctx, 'partner_wieder_geoeffnet', 'zuordnung', a.id, null); return out({ ok: true }); }
    if (sub === 'offer' && method === 'POST') return out(await submitOffer(ctx, p, a.id, body));
    if (sub === 'contact' && method === 'POST') { await partnerContactStatus(ctx, p, a.id, body.status, str(body.note, 1000)); await audit(ctx, 'partner_kontaktstatus', 'zuordnung', a.id, { status: body.status }); return out({ ok: true }); }
    if (sub === 'parse-pdf' && method === 'POST') {
      need(a.taken_by === p.id, 403, 'Bitte \u00fcbernimm die Anfrage zuerst.');
      need(body.base64, 400, 'Bitte eine PDF-Datei ausw\u00e4hlen.');
      const text = await pdfText(unb64(body.base64));
      return out({ ok: true, suggestions: offerSuggestions(text), textFound: text.length > 20 });
    }
  }

  /* ---------- Angebote (Verkaufsleitung, Gesch\u00e4ftsf\u00fchrer) ---------- */
  if (path === '/offers' && method === 'GET') {
    requirePartner(p, 'vl');
    const rows = await DB.all(db, `SELECT o.id, o.request_id, o.kind, o.status, o.created_at, o.data, o.pdf_file_id, o.expose_file_id, a.status AS a_status, a.id AS assignment_id, pu.name AS user_name, r.brand, r.model, r.zustand
      FROM offers o JOIN assignments a ON a.id = o.assignment_id JOIN requests r ON r.id = o.request_id LEFT JOIN partner_users pu ON pu.id = o.user_id WHERE o.org_id = ? ORDER BY o.id DESC LIMIT 500`, p.orgId);
    return out({ ok: true, offers: rows.map((o) => ({ id: o.id, number: toNumber(o.request_id), kind: o.kind, status: o.status, aStatus: o.a_status, aStatusLabel: statusLabel(ASSIGN_STATUSES, o.a_status), created_at: o.created_at, user_name: o.user_name, brand: o.brand, model: o.model, zustand: o.zustand, has_pdf: !!o.pdf_file_id, has_expose: !!o.expose_file_id })) });
  }
  if ((m = path.match(/^\/offers\/(\d+)(?:\/file)?$/)) && method === 'GET') {
    requirePartner(p, 'vl');
    const o = await DB.one(db, 'SELECT o.*, pu.name AS user_name, r.brand, r.model FROM offers o JOIN requests r ON r.id = o.request_id LEFT JOIN partner_users pu ON pu.id = o.user_id WHERE o.id = ? AND o.org_id = ?', +m[1], p.orgId);
    need(o, 404, 'Angebot nicht gefunden.');
    const isFile = path.endsWith('/file');
    await partnerEvent(ctx, { assignmentId: o.assignment_id, requestId: o.request_id, orgId: p.orgId, action: 'angebot_eingesehen', confidential: true, text: `Vertrauliche Information: ${p.name} (${p.roleLabel}) hat ${isFile ? 'die PDF-Datei' : 'das Angebot'} von ${o.user_name || 'einem Nutzer'} ge\u00f6ffnet.` });
    await audit(ctx, 'partner_angebot_eingesehen', 'angebot', o.id, { datei: isFile });
    if (isFile) { const fid = q.which === 'expose' ? o.expose_file_id : o.pdf_file_id; need(fid, 404, 'Keine Datei vorhanden.'); return fileResponse(await getFile(ctx, fid), q.download === '1'); }
    return out({ ok: true, offer: { id: o.id, number: toNumber(o.request_id), kind: o.kind, status: o.status, created_at: o.created_at, user_name: o.user_name, brand: o.brand, model: o.model, data: jparse(o.data, {}), has_pdf: !!o.pdf_file_id, has_expose: !!o.expose_file_id } });
  }

  /* ---------- News ---------- */
  if (path === '/news' && method === 'GET') return out({ ok: true, ...(await newsFor(ctx, 'partner', p, { limit: 100 })) });
  if (path === '/news/read' && method === 'POST') {
    const read = body.read !== false;
    for (const id of (body.posts || []).map(Number)) { if (read) await DB.run(db, 'INSERT OR IGNORE INTO news_reads (post_id, reader_type, reader_id, read_at) VALUES (?, ?, ?, ?)', id, 'partner', p.id, nowIso()); else await DB.run(db, "DELETE FROM news_reads WHERE post_id = ? AND reader_type = 'partner' AND reader_id = ?", id, p.id); }
    for (const id of (body.notifications || []).map(Number)) await DB.run(db, "UPDATE notifications SET read_at = ? WHERE id = ? AND recipient_type = 'partner' AND recipient_id = ?", read ? nowIso() : null, id, p.id);
    if (body.all) await DB.run(db, "UPDATE notifications SET read_at = ? WHERE recipient_type = 'partner' AND recipient_id = ? AND read_at IS NULL", nowIso(), p.id);
    return out({ ok: true });
  }

  /* ---------- Statistik ---------- */
  if ((path === '/stats' || path === '/report') && method === 'GET') {
    requirePartner(p, 'vl');
    const days = path === '/report' ? (q.days === '60' ? 60 : 30) : null;
    const P = periodOf(days ? { from: addDaysDate(berlinDate(nowMs()), -(days - 1)) } : q);
    const where = ['a.org_id = ?', 'a.created_at >= ?', 'a.created_at < ?'], args = [p.orgId, ...P.range];
    if (q.brand) { where.push('r.brand = ?'); args.push(q.brand); }
    if (q.model) { where.push('r.model = ?'); args.push(q.model); }
    if (q.role && p.role === 'gf' && PARTNER_ROLES[q.role]) { where.push('a.taken_by IN (SELECT id FROM partner_users WHERE org_id = ? AND role = ?)'); args.push(p.orgId, q.role); }
    const W = where.join(' AND ');
    const tot = await DB.one(db, `SELECT COUNT(*) AS received, SUM(a.status != 'neu' AND a.status != 'verloren' OR a.offer_id IS NOT NULL) AS worked, SUM(a.status = 'verloren' AND a.offer_id IS NULL) AS missed,
      SUM(a.status IN ('gewonnen','kontaktiert','nicht_erreicht')) AS won, SUM(a.status IN ('geschlossen','gescheitert')) AS lost, SUM(a.status IN ('in_bearbeitung','versendet','vorgestellt')) AS open, SUM(a.offer_id IS NOT NULL) AS offers FROM assignments a JOIN requests r ON r.id = a.request_id WHERE ${W}`, ...args);
    const brands = await DB.all(db, `SELECT COALESCE(NULLIF(r.brand,''),'(ohne)') AS brand, COUNT(*) AS n, SUM(a.status IN ('gewonnen','kontaktiert','nicht_erreicht')) AS won FROM assignments a JOIN requests r ON r.id = a.request_id WHERE ${W} GROUP BY brand ORDER BY n DESC LIMIT 15`, ...args);
    const models = await DB.all(db, `SELECT COALESCE(NULLIF(r.brand,''),'') || ' ' || COALESCE(r.model,'') AS model, COUNT(*) AS n FROM assignments a JOIN requests r ON r.id = a.request_id WHERE ${W} GROUP BY model ORDER BY n DESC LIMIT 15`, ...args);
    let team = null;
    if (p.role === 'gf') team = await DB.all(db, `SELECT u.id, u.name, u.role, COUNT(a.id) AS taken, SUM(a.offer_id IS NOT NULL) AS offers, SUM(a.status IN ('gewonnen','kontaktiert','nicht_erreicht')) AS won,
      AVG(CASE WHEN a.taken_at IS NOT NULL THEN (julianday(a.taken_at) - julianday(a.created_at)) * 24 END) AS react_h, AVG(CASE WHEN a.sent_at IS NOT NULL THEN (julianday(a.sent_at) - julianday(a.taken_at)) * 24 END) AS offer_h
      FROM partner_users u LEFT JOIN assignments a ON a.taken_by = u.id AND a.created_at >= ? AND a.created_at < ? WHERE u.org_id = ? AND u.active = 1 GROUP BY u.id ORDER BY offers DESC`, ...P.range, p.orgId);
    const accept = await DB.one(db, `SELECT SUM(o.status = 'angenommen') AS accepted, SUM(o.status IN ('nicht_ausgewaehlt','abgelehnt_kunde')) AS rejected, SUM(o.status = 'vorgestellt') AS presented FROM offers o WHERE o.org_id = ? AND o.created_at >= ? AND o.created_at < ?`, p.orgId, ...P.range);
    const data = { period: { from: P.from, to: P.to }, totals: tot, brands, models, team, accept, filters: { brands: (await DB.all(db, 'SELECT DISTINCT r.brand FROM assignments a JOIN requests r ON r.id = a.request_id WHERE a.org_id = ? AND r.brand != \'\' ORDER BY r.brand', p.orgId)).map((x) => x.brand) } };
    if (path === '/stats') return out({ ok: true, ...data });
    requirePartner(p, 'gf');
    await audit(ctx, 'partner_bericht', 'partner', p.orgId, { tage: days, rolle: q.role || 'alle' });
    const pdf = renderReportPdf(s, `Bericht ${p.org.name}`, `Zeitraum ${fmtDateDE(P.from)} \u2013 ${fmtDateDE(P.to)} (${days} Tage)${q.role ? ' \u00b7 Rolle: ' + PARTNER_ROLES[q.role].label : ''} \u00b7 erstellt ${fmtDE(nowMs())}`, [
      { title: '\u00dcberblick', columns: ['Erhalten', 'Bearbeitet', 'Angebote', 'Gewonnen', 'Nicht gew\u00e4hlt', 'Verpasst'], rows: [[tot.received || 0, tot.worked || 0, tot.offers || 0, tot.won || 0, tot.lost || 0, tot.missed || 0]] },
      { title: 'Angebote beim Kunden', columns: ['Angenommen', 'Nicht gew\u00e4hlt / abgelehnt', 'Aktuell vorgestellt'], rows: [[accept.accepted || 0, accept.rejected || 0, accept.presented || 0]] },
      ...(team ? [{ title: 'Team', columns: ['Name', 'Rolle', '\u00dcbernommen', 'Angebote', 'Gewonnen', 'Reaktion (h)', 'Angebot (h)'], widths: [140, 80, 60, 55, 55, 60, 60], rows: team.map((t) => [t.name, PARTNER_ROLES[t.role].label, t.taken || 0, t.offers || 0, t.won || 0, t.react_h != null ? t.react_h.toFixed(1) : '\u2013', t.offer_h != null ? t.offer_h.toFixed(1) : '\u2013']) }] : []),
      { title: 'Marken', columns: ['Marke', 'Anfragen', 'Gewonnen'], rows: brands.map((b) => [b.brand, b.n, b.won || 0]) },
      { title: 'Modelle', columns: ['Modell', 'Anfragen'], rows: models.map((x) => [x.model, x.n]) }
    ]);
    return new Response(pdf, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="KFL-Bericht-${days}-Tage.pdf"`, ...SEC_HEADERS } });
  }

  /* ---------- Einstellungen ---------- */
  if (path === '/settings' && method === 'GET') {
    const org = p.org;
    const res = { profile: { name: p.name, email: p.email, phone: p.phone, role: p.role }, org: { name: org.name, street: org.street, zip: org.zip, city: org.city, phone: org.phone, email: org.email, website: org.website, brands: jparse(org.brands, []) } };
    if (p.role === 'gf') {
      Object.assign(res.org, { opening: jparse(org.opening, DEFAULT_OPENING), billing_email: org.billing_email, billing_name: org.billing_name, billing_street: org.billing_street, billing_zip: org.billing_zip, billing_city: org.billing_city, vat_id: org.vat_id, billing_mode: org.billing_mode });
      res.terms = await termsFor(ctx, org);
      res.users = await DB.all(db, 'SELECT id, name, email, role, active, last_login FROM partner_users WHERE org_id = ? AND active = 1 ORDER BY role, name', p.orgId);
      res.pending = await DB.all(db, "SELECT id, subject, created_at, status FROM tickets WHERE org_id = ? AND kind = 'aenderung' AND status != 'erledigt' ORDER BY id DESC", p.orgId);
      res.invoices = await DB.all(db, "SELECT id, number, issue_date, due_date, gross, paid, fees, status, dunning_level FROM invoices WHERE org_id = ? AND kind != 'storno' ORDER BY id DESC LIMIT 50", p.orgId);
    }
    return out({ ok: true, ...res });
  }
  if (path === '/settings/profile' && method === 'PATCH') { await DB.update(db, 'partner_users', p.id, { name: str(body.name, 80) || p.name, phone: str(body.phone, 40) }); await audit(ctx, 'partner_profil', 'partnerkonto', p.id, null); return out({ ok: true }); }
  if (path === '/settings/org' && method === 'PATCH') {
    requirePartner(p, 'gf');
    const upd = {};
    if (body.opening) { const op = {}; for (const d of WEEKDAYS) { const v = body.opening[d]; op[d] = v && v[0] && v[1] && /^\d{2}:\d{2}$/.test(v[0]) && /^\d{2}:\d{2}$/.test(v[1]) ? [v[0], v[1]] : null; } upd.opening = JSON.stringify(op); }
    if (body.billing_email !== undefined) { need(emailOk(body.billing_email), 400, 'Bitte eine g\u00fcltige Rechnungs-E-Mail angeben.'); upd.billing_email = str(body.billing_email, 200).toLowerCase(); }
    for (const k of ['billing_name', 'billing_street', 'billing_city']) if (body[k] !== undefined) upd[k] = str(body[k], 160);
    if (body.billing_zip !== undefined) { need(!body.billing_zip || plzOk(body.billing_zip), 400, 'Ung\u00fcltige Postleitzahl.'); upd.billing_zip = str(body.billing_zip, 5); }
    upd.updated_at = nowIso();
    await DB.update(db, 'orgs', p.orgId, upd);
    await DB.insert(db, 'org_notes', { org_id: p.orgId, user_id: null, text: `Partner-Gesch\u00e4ftsf\u00fchrer ${p.name} hat ge\u00e4ndert: ${Object.keys(upd).filter((k) => k !== 'updated_at').join(', ')}`, created_at: nowIso() });
    await audit(ctx, 'partner_org_geaendert', 'partner', p.orgId, Object.keys(upd));
    return out({ ok: true });
  }
  if (path === '/settings/users/request' && method === 'POST') {
    requirePartner(p, 'gf');
    const action = body.action;
    need(['role', 'delete_user', 'add_user', 'delete_org'].includes(action), 400, 'Unbekannte \u00c4nderung.');
    let label = '', payload = { action };
    if (action === 'delete_org') { label = `L\u00f6schung der gesamten Organisation ${p.org.name}`; }
    else if (action === 'add_user') { need(emailOk(body.email) && str(body.name, 80) && PARTNER_ROLES[body.role], 400, 'Bitte Name, E-Mail und Rolle angeben.'); payload = { action, email: str(body.email, 200).toLowerCase(), name: str(body.name, 80), role: body.role, phone: str(body.phone, 40) }; label = `Neues Konto: ${payload.name} (${payload.email}) als ${PARTNER_ROLES[body.role].label}`; }
    else {
      const t = await DB.one(db, 'SELECT * FROM partner_users WHERE id = ? AND org_id = ? AND active = 1', toInt(body.user_id), p.orgId); need(t, 404, 'Konto nicht gefunden.'); need(t.id !== p.id || action === 'role', 400, 'Du kannst dein eigenes Konto nicht l\u00f6schen.');
      if (action === 'role') { need(PARTNER_ROLES[body.role], 400, 'Unbekannte Rolle.'); payload = { action, user_id: t.id, role: body.role }; label = `Rolle von ${t.name} \u00e4ndern: ${PARTNER_ROLES[t.role].label} \u2192 ${PARTNER_ROLES[body.role].label}`; }
      else { payload = { action, user_id: t.id }; label = `Konto von ${t.name} (${t.email}) l\u00f6schen`; }
    }
    payload.label = label;
    const id = await createTicket(ctx, { tag: 'Partner', kind: action === 'delete_org' ? 'ticket' : 'aenderung', category: action === 'delete_org' ? 'L\u00f6schung Organisation' : '\u00c4nderungsantrag', subject: label, priority: 'hoch', requester: { type: 'partner', id: p.id, name: p.name, email: p.email }, orgId: p.orgId, payload, text: `${label}${body.note ? '\nAnmerkung: ' + str(body.note, 1000) : ''}\nBeantragt von ${p.name} (Gesch\u00e4ftsf\u00fchrer, ${p.org.name}).` });
    return out({ ok: true, ticket: id });
  }
  if ((m = path.match(/^\/invoices\/(\d+)\/pdf$/)) && method === 'GET') {
    requirePartner(p, 'gf');
    const inv = await DB.one(db, 'SELECT * FROM invoices WHERE id = ? AND org_id = ?', +m[1], p.orgId); need(inv, 404, 'Rechnung nicht gefunden.');
    return fileResponse(await getFile(ctx, inv.file_id), q.download === '1');
  }

  /* ---------- Support ---------- */
  if (path === '/tickets' && method === 'GET') {
    const rows = await DB.all(db, `SELECT t.id, t.subject, t.category, t.status, t.priority, t.created_at, t.updated_at, t.kind, (SELECT COUNT(*) FROM ticket_messages m WHERE m.ticket_id = t.id AND m.internal = 0) AS messages FROM tickets t WHERE (t.requester_type = 'partner' AND t.requester_id = ?) ${p.role === 'gf' ? 'OR t.org_id = ?' : ''} ORDER BY t.id DESC LIMIT 200`, p.id, ...(p.role === 'gf' ? [p.orgId] : []));
    return out({ ok: true, tickets: rows });
  }
  if (path === '/tickets' && method === 'POST') {
    need(str(body.subject, 200) && str(body.text, 8000), 400, 'Bitte Betreff und Nachricht angeben.');
    const id = await createTicket(ctx, { tag: 'Partner', category: str(body.category, 60) || 'Allgemein', subject: str(body.subject, 200), priority: p.role === 'gf' ? 'hoch' : 'normal', requester: { type: 'partner', id: p.id, name: p.name, email: p.email }, orgId: p.orgId, requestId: body.request_number ? fromNumber(body.request_number) : null, text: str(body.text, 8000) });
    return out({ ok: true, id });
  }
  if ((m = path.match(/^\/tickets\/(\d+)(?:\/reply)?$/))) {
    const tk = await DB.one(db, 'SELECT * FROM tickets WHERE id = ?', +m[1]);
    need(tk && ((tk.requester_type === 'partner' && tk.requester_id === p.id) || (p.role === 'gf' && tk.org_id === p.orgId)), 404, 'Ticket nicht gefunden.');
    if (method === 'GET') return out({ ok: true, ticket: { id: tk.id, subject: tk.subject, status: tk.status, priority: tk.priority, category: tk.category, created_at: tk.created_at }, messages: await DB.all(db, "SELECT id, author_type, author_name, text, created_at FROM ticket_messages WHERE ticket_id = ? AND internal = 0 AND author_type != 'system' ORDER BY id", tk.id) });
    if (method === 'POST') { await ticketReply(ctx, tk.id, { authorType: 'requester', authorId: p.id, authorName: p.name, text: str(body.text, 8000) }); return out({ ok: true }); }
  }
  return fail(404, 'Nicht gefunden.');
}


/* ===== 43-api-accounting.js ===== */
/* ============================================================
   Schnittstelle Buchhaltung (/api/acc/\u2026)
   ============================================================ */

async function handleAccounting(ctx, u, path, method, body, q, url) {
  const db = ctx.db; let m;
  requirePerm(u, 'acc_view');
  const manage = () => requirePerm(u, 'acc_manage');

  if (path === '/overview' && method === 'GET') {
    const today = berlinDate(nowMs());
    const open = await DB.one(db, "SELECT COUNT(*) AS n, COALESCE(SUM(gross + fees - paid),0) AS sum FROM invoices WHERE status IN ('offen','teilbezahlt') AND kind != 'storno'");
    const overdue = await DB.one(db, "SELECT COUNT(*) AS n, COALESCE(SUM(gross + fees - paid),0) AS sum FROM invoices WHERE status IN ('offen','teilbezahlt') AND kind != 'storno' AND due_date < ?", today);
    const cases = await DB.one(db, "SELECT SUM(status = 'offen') AS open, SUM(status = 'gesammelt') AS collected, SUM(status = 'storniert') AS cancelled, COALESCE(SUM(CASE WHEN status = 'gesammelt' THEN amount_net END),0) AS collected_sum FROM billing_items");
    const pi = await DB.one(db, "SELECT SUM(status = 'offen') AS open, SUM(status = 'zur_zahlung') AS queued, SUM(status IN ('in_zahlungsliste')) AS listed, COALESCE(SUM(CASE WHEN status IN ('offen','zur_zahlung','in_zahlungsliste','freigegeben') THEN gross END),0) AS due FROM purchase_invoices");
    const pm = berlinParts(nowMs());
    const mFrom = `${pm.y}-${String(pm.m).padStart(2, '0')}-01`;
    const month = await DB.one(db, "SELECT COALESCE(SUM(net),0) AS net, COUNT(*) AS n FROM invoices WHERE status != 'storniert' AND kind != 'storno' AND issue_date >= ?", mFrom);
    const paidMonth = await DB.val(db, 'SELECT COALESCE(SUM(amount),0) FROM payments WHERE date >= ?', mFrom);
    const payruns = await DB.val(db, "SELECT COUNT(*) FROM payruns WHERE status = 'offen'");
    return out({ ok: true, open: { n: open.n, sum: round2(open.sum) }, overdue: { n: overdue.n, sum: round2(overdue.sum) }, cases: { open: cases.open || 0, collected: cases.collected || 0, cancelled: cases.cancelled || 0, collected_sum: round2(cases.collected_sum) },
      purchase: { open: pi.open || 0, queued: pi.queued || 0, listed: pi.listed || 0, due: round2(pi.due) }, month: { net: round2(month.net), n: month.n, paid: round2(paidMonth) }, payruns });
  }

  /* ---------- Abrechnungsf\u00e4lle (gewonnene Anfragen) ---------- */
  if (path === '/items' && method === 'GET') {
    const st = q.status || 'aktiv';
    const where = st === 'alle' ? '1=1' : st === 'aktiv' ? "b.status IN ('offen','gesammelt','abgerechnet')" : 'b.status = ?';
    const rows = await DB.all(db, `SELECT b.*, o.name AS org_name, o.billing_mode, o.billing_email, r.vehicle, r.customer_name, r.email AS customer_email, r.phone AS customer_phone, r.plz, r.type, r.created_at AS request_date,
        i.number AS invoice_number, i.status AS invoice_status, i.kind AS invoice_kind, i.paid AS invoice_paid, i.gross AS invoice_gross, (SELECT COUNT(*) FROM billing_items x WHERE x.invoice_id = b.invoice_id) AS invoice_cases, (SELECT COUNT(*) FROM acc_notes an WHERE an.item_id = b.id) + (SELECT COUNT(*) FROM notes rn WHERE rn.request_id = b.request_id AND rn.acc_relevant = 1) AS notes_n, (SELECT COUNT(*) FROM notes rn WHERE rn.request_id = b.request_id AND rn.acc_relevant = 1) AS pinned_n
      FROM billing_items b JOIN orgs o ON o.id = b.org_id LEFT JOIN requests r ON r.id = b.request_id LEFT JOIN invoices i ON i.id = b.invoice_id
      WHERE ${where} ORDER BY CASE b.status WHEN 'offen' THEN 0 WHEN 'gesammelt' THEN 1 WHEN 'abgerechnet' THEN 2 ELSE 3 END, b.id DESC LIMIT 500`, ...(['alle', 'aktiv'].includes(st) ? [] : [st]));
    const counts = Object.fromEntries((await DB.all(db, 'SELECT status, COUNT(*) AS n FROM billing_items GROUP BY status')).map((x) => [x.status, x.n]));
    counts.aktiv = (counts.offen || 0) + (counts.gesammelt || 0) + (counts.abgerechnet || 0);
    counts.alle = counts.aktiv + (counts.storniert || 0);
    return out({ ok: true, counts, items: rows.map((r) => ({ ...r, number: r.request_id ? toNumber(r.request_id) : null })) });
  }
  if ((m = path.match(/^\/items\/(\d+)$/)) && method === 'GET') {
    const it = await DB.one(db, 'SELECT * FROM billing_items WHERE id = ?', +m[1]); need(it, 404, 'Fall nicht gefunden.');
    const req = it.request_id ? await DB.one(db, 'SELECT * FROM requests WHERE id = ?', it.request_id) : null;
    const org = await DB.one(db, 'SELECT * FROM orgs WHERE id = ?', it.org_id);
    const offer = it.assignment_id ? await DB.one(db, 'SELECT o.*, pu.name AS user_name FROM offers o LEFT JOIN partner_users pu ON pu.id = o.user_id WHERE o.assignment_id = ?', it.assignment_id) : null;
    const d = req ? jparse(req.data, {}) : {};
    const notes = await accNotesFor(ctx, { itemIds: [it.id], requestIds: [it.request_id] });
    const invRow = it.invoice_id ? await DB.one(db, 'SELECT number, paid, (SELECT COUNT(*) FROM billing_items x WHERE x.invoice_id = invoices.id) AS cases FROM invoices WHERE id = ?', it.invoice_id) : null;
    return out({ ok: true, item: { ...it, number: it.request_id ? toNumber(it.request_id) : null }, notes, invoiceNumber: invRow ? invRow.number : null, invoicePaid: invRow ? invRow.paid : 0, invoiceCases: invRow ? invRow.cases : 0, request: req ? { number: toNumber(req.id), type: req.type, vehicle: req.vehicle, summary: req.summary, created_at: req.created_at, status: req.status, fields: Object.fromEntries(Object.entries(d).filter(([k]) => !/^(_|form$|form_type$|utf8$)/.test(k))) } : null,
      customer: req ? customerContact(req) : null, org: { ...orgRecipient(org), id: org.id, name: org.name, billing_mode: org.billing_mode, payment_terms_days: org.payment_terms_days, dunning_fee_1: org.dunning_fee_1, dunning_fee_2: org.dunning_fee_2 }, offer: offer ? { ...offer, data: jparse(offer.data, {}) } : null });
  }
  if ((m = path.match(/^\/items\/(\d+)\/notes$/)) && method === 'POST') {
    const it = await DB.one(db, 'SELECT id FROM billing_items WHERE id = ?', +m[1]); need(it, 404, 'Fall nicht gefunden.');
    return out({ ok: true, id: await addAccNote(ctx, { itemId: it.id, text: body.text }) });
  }
  if ((m = path.match(/^\/items\/(\d+)\/(cancel|reopen)$/)) && method === 'POST') {
    requirePerm(u, 'acc_cancel');
    if (m[2] === 'cancel' && body.mode === 'rechnung') {
      // Nur die Rechnung stornieren: Fall (und weitere F\u00e4lle der Rechnung) werden wieder abrechenbar
      const it = await DB.one(db, 'SELECT * FROM billing_items WHERE id = ?', +m[1]); need(it, 404, 'Fall nicht gefunden.');
      need(it.status === 'abgerechnet' && it.invoice_id, 409, 'F\u00fcr diesen Fall gibt es keine Rechnung zum Stornieren.');
      const reason = str(body.reason, 300); need(reason.length >= 3, 400, 'Bitte gib einen Grund f\u00fcr das Storno an.');
      const sid = await cancelInvoice(ctx, it.invoice_id, reason);
      return out({ ok: true, mode: 'rechnung', stornoInvoiceId: sid, stornoNumber: await DB.val(db, 'SELECT number FROM invoices WHERE id = ?', sid), status: await DB.val(db, 'SELECT status FROM billing_items WHERE id = ?', it.id) });
    }
    if (m[2] === 'cancel') return out({ ok: true, ...(await cancelBillingItem(ctx, +m[1], body.reason)) });
    return out({ ok: true, ...(await reopenBillingItem(ctx, +m[1])) });
  }
  if ((m = path.match(/^\/items\/(\d+)\/(bill|note|amount)$/)) && method === 'POST') {
    manage();
    const it = await DB.one(db, 'SELECT * FROM billing_items WHERE id = ?', +m[1]); need(it, 404, 'Fall nicht gefunden.');
    if (m[2] === 'note') { await DB.update(db, 'billing_items', it.id, { note: str(body.text, 2000), updated_at: nowIso() }); await audit(ctx, 'fall_notiz', 'abrechnung', it.id, null); return out({ ok: true }); }
    if (m[2] === 'amount') { need(it.status === 'offen' || it.status === 'gesammelt', 409, 'Bereits abgerechnet.'); const a = toNum(body.amount); need(a !== null && a >= 0, 400, 'Ung\u00fcltiger Betrag.'); await DB.update(db, 'billing_items', it.id, { amount_net: round2(a), description: str(body.description, 500) || it.description, updated_at: nowIso() }); await audit(ctx, 'fall_betrag', 'abrechnung', it.id, { netto: a }); return out({ ok: true }); }
    const r = await billItem(ctx, it.id); await audit(ctx, 'rechnung_versenden', 'abrechnung', it.id, r);
    if (r.invoiceId) { const iv = await DB.one(db, 'SELECT mail_status, mail_error, sent_to FROM invoices WHERE id = ?', r.invoiceId); r.mail = iv.mail_status; r.mailError = iv.mail_error; r.sentTo = iv.sent_to; }
    return out({ ok: true, ...r });
  }

  /* ---------- Rechnungen ---------- */
  if (path === '/invoices' && method === 'GET') {
    const where = ['1=1'], args = [];
    if (q.status) { where.push('i.status = ?'); args.push(q.status); }
    if (q.overdue === '1') { where.push("i.status IN ('offen','teilbezahlt') AND i.due_date < ?"); args.push(berlinDate(nowMs())); }
    if (q.dunned === '1') where.push('i.dunning_level > 0');
    if (q.org) { where.push('i.org_id = ?'); args.push(toInt(q.org)); }
    if (q.kind) { where.push('i.kind = ?'); args.push(q.kind); }
    if (q.from) { where.push('i.issue_date >= ?'); args.push(q.from); }
    if (q.to) { where.push('i.issue_date <= ?'); args.push(q.to); }
    if (q.q) { const like = '%' + q.q + '%'; where.push("(i.number LIKE ? OR i.recipient LIKE ? OR i.lines LIKE ?)"); args.push(like, like, like); }
    const sort = { number: 'i.number', date: 'i.issue_date', due: 'i.due_date', recipient: "json_extract(i.recipient,'$.name')", gross: 'i.gross', status: 'i.status' }[q.sort] || 'i.id';
    const rows = await DB.all(db, `SELECT i.id, i.number, i.org_id, i.kind, i.status, i.issue_date, i.due_date, i.net, i.vat, i.gross, i.paid, i.fees, i.dunning_level, i.last_dunning_at, i.sent_at, i.sent_to, i.mail_status, i.mail_error, i.recipient, (SELECT COUNT(*) FROM acc_notes an WHERE an.invoice_id = i.id OR an.item_id IN (SELECT id FROM billing_items WHERE invoice_id = i.id)) + (SELECT COUNT(*) FROM notes rn WHERE rn.acc_relevant = 1 AND rn.request_id IN (SELECT request_id FROM billing_items WHERE invoice_id = i.id)) AS notes_n FROM invoices i WHERE ${where.join(' AND ')} ORDER BY ${sort} ${q.dir === 'asc' ? 'ASC' : 'DESC'}, i.id DESC LIMIT 1000`, ...args);
    return out({ ok: true, invoices: rows.map((r) => ({ ...r, recipient: jparse(r.recipient, {}), open: round2(r.gross + r.fees - r.paid), overdue: ['offen', 'teilbezahlt'].includes(r.status) && r.due_date < berlinDate(nowMs()) })) });
  }
  if (path === '/invoices' && method === 'POST') {
    manage();
    const org = body.org_id ? await DB.one(db, 'SELECT * FROM orgs WHERE id = ?', toInt(body.org_id)) : null;
    const rc = org ? orgRecipient(org) : { name: str(body.recipient?.name, 160), street: str(body.recipient?.street, 160), zip: str(body.recipient?.zip, 10), city: str(body.recipient?.city, 80), email: str(body.recipient?.email, 200), vat_id: str(body.recipient?.vat_id, 40) };
    const id = await createInvoice(ctx, { org, recipient: rc, lines: body.lines || [], kind: 'manuell', serviceFrom: body.service_from, serviceTo: body.service_to, intro: str(body.intro, 1000) || undefined, send: body.send !== false });
    return out({ ok: true, id });
  }
  if ((m = path.match(/^\/invoices\/(\d+)(?:\/(pdf|payment|dunning|cancel|resend|notes|dunning-pdf\/\d+))?$/))) {
    const inv = await DB.one(db, 'SELECT * FROM invoices WHERE id = ?', +m[1]); need(inv, 404, 'Rechnung nicht gefunden.');
    const sub = m[2] || '';
    if (!sub && method === 'GET') {
      const lines = jparse(inv.lines, []);
      const itemIds = [...lines.map((l) => l.billing_item_id), ...(await DB.all(db, 'SELECT id FROM billing_items WHERE invoice_id = ?', inv.id)).map((x) => x.id)];
      const notes = await accNotesFor(ctx, { invoiceId: inv.id, itemIds, requestIds: lines.map((l) => l.request_id) });
      return out({ ok: true, notes, invoice: { ...inv, recipient: jparse(inv.recipient, {}), lines, open: round2(inv.gross + inv.fees - inv.paid), mail_to: await invoiceMailTo(ctx, inv) },
        payments: await DB.all(db, 'SELECT p.*, u.name AS author FROM payments p LEFT JOIN users u ON u.id = p.created_by WHERE p.invoice_id = ? ORDER BY p.id', inv.id),
        dunnings: await DB.all(db, 'SELECT d.*, u.name AS author FROM dunnings d LEFT JOIN users u ON u.id = d.created_by WHERE d.invoice_id = ? ORDER BY d.id', inv.id) });
    }
    if (sub === 'pdf' && method === 'GET') return fileResponse(await getFile(ctx, inv.file_id), q.download === '1');
    if (sub.startsWith('dunning-pdf/') && method === 'GET') { const d = await DB.one(db, 'SELECT * FROM dunnings WHERE id = ? AND invoice_id = ?', +sub.split('/')[1], inv.id); need(d, 404, 'Nicht gefunden.'); return fileResponse(await getFile(ctx, d.file_id), q.download === '1'); }
    if (sub === 'payment' && method === 'POST') { manage(); return out({ ok: true, ...(await addPayment(ctx, inv.id, body)) }); }
    if (sub === 'dunning' && method === 'POST') { manage(); return out({ ok: true, ...(await sendDunning(ctx, inv.id)) }); }
    if (sub === 'notes' && method === 'POST') return out({ ok: true, id: await addAccNote(ctx, { invoiceId: inv.id, text: body.text }) });
    if (sub === 'cancel' && method === 'POST') { requirePerm(u, 'acc_cancel'); need(str(body.reason, 300).length >= 3, 400, 'Bitte gib einen Grund f\u00fcr das Storno an.'); return out({ ok: true, id: await cancelInvoice(ctx, inv.id, str(body.reason, 300)) }); }
    if (sub === 'resend' && method === 'POST') { manage(); const r = await sendInvoiceMail(ctx, inv.id, emailOk(body.email) ? body.email : null); await audit(ctx, 'rechnung_erneut_gesendet', 'rechnung', inv.number, { an: body.email || null }); return out({ ok: true, mail: r && r.status, error: r && r.error, to: emailOk(body.email) ? body.email : await invoiceMailTo(ctx, inv) }); }
  }
  if (path === '/monthly-run' && method === 'POST') { manage(); const n = await runMonthlyInvoices(ctx, { force: true }); await audit(ctx, 'sammelrechnungen_manuell', 'buchhaltung', null, { anzahl: n }); return out({ ok: true, count: n }); }

  /* ---------- Lieferanten & Eingangsrechnungen ---------- */
  if (path === '/suppliers' && method === 'GET') return out({ ok: true, suppliers: await DB.all(db, 'SELECT s.*, (SELECT COUNT(*) FROM purchase_invoices p WHERE p.supplier_id = s.id) AS invoices FROM suppliers s ORDER BY s.active DESC, s.name') });
  if ((path === '/suppliers' && method === 'POST') || ((m = path.match(/^\/suppliers\/(\d+)$/)) && method === 'PATCH')) {
    manage();
    const o = {};
    for (const k of ['name', 'street', 'zip', 'city', 'country', 'email', 'phone', 'bic', 'vat_id', 'customer_no', 'note']) if (body[k] !== undefined) o[k] = str(body[k], k === 'note' ? 1000 : 160);
    if (body.iban !== undefined) { const ib = ibanClean(body.iban); need(!ib || ibanValid(ib), 400, 'Die IBAN ist ung\u00fcltig.'); o.iban = ib; }
    if (body.active !== undefined) o.active = body.active ? 1 : 0;
    if (method === 'POST') { need(o.name, 400, 'Bitte einen Namen angeben.'); const id = await DB.insert(db, 'suppliers', { ...o, active: 1, created_at: nowIso() }); await audit(ctx, 'lieferant_angelegt', 'lieferant', id, { name: o.name }); return out({ ok: true, id }); }
    await DB.update(db, 'suppliers', +m[1], o); await audit(ctx, 'lieferant_geaendert', 'lieferant', +m[1], Object.keys(o)); return out({ ok: true });
  }
  if (path === '/purchase' && method === 'GET') {
    const where = ['1=1'], args = [];
    if (q.status) { where.push('p.status = ?'); args.push(q.status); }
    if (q.supplier) { where.push('p.supplier_id = ?'); args.push(toInt(q.supplier)); }
    if (q.q) { const like = '%' + q.q + '%'; where.push('(p.number LIKE ? OR s.name LIKE ?)'); args.push(like, like); }
    return out({ ok: true, invoices: await DB.all(db, `SELECT p.*, s.name AS supplier_name, fa.number AS account_number, fa.name AS account_name, fe.number AS entry_number, fd.number AS doc_number FROM purchase_invoices p JOIN suppliers s ON s.id = p.supplier_id LEFT JOIN fibu_accounts fa ON fa.id = p.account_id LEFT JOIN fibu_entries fe ON fe.id = p.entry_id LEFT JOIN fibu_docs fd ON fd.id = p.doc_id WHERE ${where.join(' AND ')} ORDER BY p.id DESC LIMIT 1000`, ...args) });
  }
  if ((path === '/purchase' && method === 'POST') || ((m = path.match(/^\/purchase\/(\d+)$/)) && method === 'PATCH')) {
    manage();
    const o = {};
    if (body.supplier_id !== undefined) { need(await DB.one(db, 'SELECT id FROM suppliers WHERE id = ?', toInt(body.supplier_id)), 400, 'Bitte einen Lieferanten w\u00e4hlen.'); o.supplier_id = toInt(body.supplier_id); }
    for (const k of ['number', 'category', 'note', 'text']) if (body[k] !== undefined) o[k] = str(body[k], 300);
    if (body.account_id !== undefined && body.account_id !== '') { const acc = await DB.one(db, "SELECT * FROM fibu_accounts WHERE id = ? AND status = 'offen'", toInt(body.account_id)); need(acc, 400, 'Bitte ein offenes Konto w\u00e4hlen.'); need(acc.type === 'aufwand' || acc.type === 'aktiv', 400, 'Eingangsrechnungen werden auf Aufwands- oder Aktivkonten gebucht.'); o.account_id = acc.id; }
    if (body.vat_rate !== undefined && body.vat_rate !== '') { const r = toNum(body.vat_rate); need([0, 7, 19].includes(r), 400, 'Umsatzsteuer: 0, 7 oder 19 %.'); o.vat_rate = r; }
    for (const k of ['date', 'due_date']) if (body[k] !== undefined) { need(!body[k] || /^\d{4}-\d{2}-\d{2}$/.test(body[k]), 400, 'Ung\u00fcltiges Datum.'); o[k] = body[k] || null; }
    if (body.net !== undefined || body.gross !== undefined || body.vat !== undefined) {
      const rate = o.vat_rate != null ? o.vat_rate : 19;
      let net = toNum(body.net, 0), vat = body.vat !== undefined && body.vat !== '' ? toNum(body.vat, 0) : null, gross = body.gross !== undefined && body.gross !== '' ? toNum(body.gross, 0) : null;
      // Brutto angegeben, Netto leer \u2192 Netto und Umsatzsteuer aus dem Steuersatz berechnen
      if (gross && !net) { net = round2(gross / (1 + rate / 100)); if (vat === null) vat = round2(gross - net); }
      if (vat === null) vat = round2(net * rate / 100); if (gross === null) gross = round2(net + vat);
      Object.assign(o, { net: round2(net), vat: round2(vat), gross: round2(gross) });
    }
    if (body.file && body.file.base64) { need(/pdf/i.test(body.file.type || 'application/pdf'), 400, 'Bitte den Beleg als PDF hochladen.'); o.file_id = await putFile(ctx, { name: body.file.name || 'eingangsrechnung.pdf', mime: 'application/pdf', bytes: unb64(body.file.base64), ownerType: 'purchase' }); }
    o.updated_at = nowIso();
    if (method === 'POST') {
      need(o.supplier_id, 400, 'Bitte einen Lieferanten w\u00e4hlen.');
      const id = await DB.insert(db, 'purchase_invoices', { ...o, status: 'offen', created_by: u.id, created_at: nowIso() });
      await audit(ctx, 'eingangsrechnung_erfasst', 'eingangsrechnung', id, { brutto: o.gross });
      // Auf Konto buchen und Beleg archivieren (wenn Konto gew\u00e4hlt)
      let booking = null, bookingError = null;
      if (o.account_id) { try { const eid = await fibuBookPurchase(ctx, id); booking = await DB.val(db, 'SELECT number FROM fibu_entries WHERE id = ?', eid); } catch (e) { bookingError = e.message; } }
      const pi2 = await DB.one(db, 'SELECT doc_id FROM purchase_invoices WHERE id = ?', id);
      return out({ ok: true, id, booking, bookingError, doc: pi2.doc_id ? await DB.val(db, 'SELECT number FROM fibu_docs WHERE id = ?', pi2.doc_id) : null });
    }
    const cur = await DB.one(db, 'SELECT entry_id FROM purchase_invoices WHERE id = ?', +m[1]); need(cur, 404, 'Nicht gefunden.');
    if (cur.entry_id) need(!['supplier_id', 'net', 'vat', 'gross', 'account_id', 'date', 'vat_rate'].some((k) => o[k] !== undefined), 409, 'Die Eingangsrechnung ist bereits gebucht. Betr\u00e4ge, Konto und Datum lassen sich nur \u00fcber ein Storno der Buchung \u00e4ndern.');
    await DB.update(db, 'purchase_invoices', +m[1], o); await audit(ctx, 'eingangsrechnung_geaendert', 'eingangsrechnung', +m[1], Object.keys(o)); return out({ ok: true });
  }
  if ((m = path.match(/^\/purchase\/(\d+)\/(schedule|unschedule|paid|file|book)$/))) {
    const pi = await DB.one(db, 'SELECT * FROM purchase_invoices WHERE id = ?', +m[1]); need(pi, 404, 'Nicht gefunden.');
    if (m[2] === 'file' && method === 'GET') { need(pi.file_id, 404, 'Keine Datei.'); return fileResponse(await getFile(ctx, pi.file_id), q.download === '1'); }
    manage();
    if (m[2] === 'schedule') { need(['offen'].includes(pi.status), 409, 'Nur offene Rechnungen k\u00f6nnen zur Zahlung vorgemerkt werden.'); const sup = await DB.one(db, 'SELECT iban FROM suppliers WHERE id = ?', pi.supplier_id); need(ibanValid(sup && sup.iban), 400, 'Beim Lieferanten ist keine g\u00fcltige IBAN hinterlegt.'); await DB.update(db, 'purchase_invoices', pi.id, { status: 'zur_zahlung', pay_date: /^\d{4}-\d{2}-\d{2}$/.test(body.pay_date || '') ? body.pay_date : berlinDate(nowMs()), updated_at: nowIso() }); }
    if (m[2] === 'unschedule') { need(pi.status === 'zur_zahlung', 409, 'Nicht vorgemerkt.'); await DB.update(db, 'purchase_invoices', pi.id, { status: 'offen', pay_date: null, updated_at: nowIso() }); }
    if (m[2] === 'paid') { await DB.update(db, 'purchase_invoices', pi.id, { status: 'bezahlt', paid_at: nowIso(), updated_at: nowIso() }); await fibuBookPurchasePaid(ctx, pi.id, /^\d{4}-\d{2}-\d{2}$/.test(body.date || '') ? body.date : null); }
    if (m[2] === 'book') { requirePerm(u, 'fibu_book'); if (body.account_id) { const acc = await DB.one(db, "SELECT id FROM fibu_accounts WHERE id = ? AND status = 'offen'", toInt(body.account_id)); need(acc, 400, 'Bitte ein offenes Konto w\u00e4hlen.'); await DB.update(db, 'purchase_invoices', pi.id, { account_id: acc.id }); } const eid = await fibuBookPurchase(ctx, pi.id); if (pi.status === 'bezahlt') await fibuBookPurchasePaid(ctx, pi.id, berlinDate(msOf(pi.paid_at || nowIso()))); return out({ ok: true, booking: await DB.val(db, 'SELECT number FROM fibu_entries WHERE id = ?', eid) }); }
    await audit(ctx, 'eingangsrechnung_' + m[2], 'eingangsrechnung', pi.id, null);
    return out({ ok: true });
  }
  if (path === '/payruns' && method === 'GET') return out({ ok: true, payruns: (await DB.all(db, 'SELECT p.*, u.name AS released_name FROM payruns p LEFT JOIN users u ON u.id = p.released_by ORDER BY p.id DESC LIMIT 100')).map((p) => ({ ...p, items: jparse(p.items, []) })) });
  if (path === '/payruns/close' && method === 'POST') { manage(); const id = await runDayClose(ctx, { force: true }); return out({ ok: true, id }); }
  if ((m = path.match(/^\/payruns\/(\d+)\/(release|file|paid)$/))) {
    const pr = await DB.one(db, 'SELECT * FROM payruns WHERE id = ?', +m[1]); need(pr, 404, 'Nicht gefunden.');
    if (m[2] === 'file' && method === 'GET') { need(pr.file_id, 404, 'Noch nicht freigegeben.'); await audit(ctx, 'sepa_heruntergeladen', 'zahlungsliste', pr.id, null); return fileResponse(await getFile(ctx, pr.file_id), true); }
    if (m[2] === 'release' && method === 'POST') { requirePerm(u, 'acc_release'); await releasePayrun(ctx, pr.id, body.exec_date); return out({ ok: true }); }
    if (m[2] === 'paid' && method === 'POST') { manage(); need(pr.status === 'freigegeben', 409, 'Bitte zuerst freigeben.'); for (const i of jparse(pr.items, [])) { await DB.update(db, 'purchase_invoices', i.id, { status: 'bezahlt', paid_at: nowIso() }); await fibuBookPurchasePaid(ctx, i.id, pr.exec_date || null); } await DB.update(db, 'payruns', pr.id, { status: 'ausgefuehrt' }); await audit(ctx, 'zahlungsliste_ausgefuehrt', 'zahlungsliste', pr.id, null); return out({ ok: true }); }
  }
  if (path === '/orgs' && method === 'GET') return out({ ok: true, orgs: await DB.all(db, 'SELECT id, name, billing_mode, billing_email, payment_terms_days, reminder_due_days, dunning_fee_1, dunning_fee_2, dunning_due_days, dunning_due_days_2, lead_price FROM orgs WHERE deleted = 0 ORDER BY name') });
  return fail(404, 'Nicht gefunden.');
}


/* ===== 44-api-fibu.js ===== */
/* ============================================================
   Schnittstelle Finanzbuchhaltung (/api/fibu/\u2026)
   Rechte: fibu_view (sehen), fibu_book (Konten anlegen, buchen, Belege),
           fibu_manage (Konten schlie\u00dfen, Anfangsbest\u00e4nde, Import, Abschl\u00fcsse),
           Admin: alles inkl. Wieder\u00f6ffnen von Abschl\u00fcssen und Konten
   ============================================================ */

async function handleFibu(ctx, u, path, method, body, q) {
  const db = ctx.db; let m;
  requirePerm(u, 'fibu_view');
  const book = () => requirePerm(u, 'fibu_book');
  const manage = () => requirePerm(u, 'fibu_manage');
  const admin = () => need(u.role === 'admin', 403, 'Das kann nur der Admin.');
  const today = berlinDate(nowMs());
  const entryView = async (rows) => {
    if (!rows.length) return [];
    const ids = rows.map((r) => r.id);
    const lines = await DB.all(db, `SELECT l.*, a.number, a.name, a.type FROM fibu_lines l JOIN fibu_accounts a ON a.id = l.account_id WHERE l.entry_id IN (${ids.map(() => '?').join(',')}) ORDER BY l.id`, ...ids);
    return rows.map((e) => { const ls = lines.filter((l) => l.entry_id === e.id); return { ...e, lines: ls, amount: round2(ls.reduce((s, l) => s + l.debit, 0)), debit: ls.filter((l) => l.debit).map((l) => `${l.number} ${l.name}`), credit: ls.filter((l) => l.credit).map((l) => `${l.number} ${l.name}`) }; });
  };

  /* ---------- \u00dcbersicht ---------- */
  if (path === '/overview' && method === 'GET') {
    const bal = await fibuBalances(ctx, { to: today });
    const bySys = (sys) => (bal.find((a) => a.sys === sys) || { saldo: 0 }).saldo;
    const month = today.slice(0, 7), year = today.slice(0, 4);
    const res = async (from) => { const b = await fibuBalances(ctx, { from, to: today }); return round2(b.filter((a) => a.type === 'ertrag').reduce((s, a) => s + saldoOf(a.type, a.debit, a.credit), 0) - b.filter((a) => a.type === 'aufwand').reduce((s, a) => s + saldoOf(a.type, a.debit, a.credit), 0)); };
    const recent = await entryView(await DB.all(db, 'SELECT e.*, d.number AS doc_number FROM fibu_entries e LEFT JOIN fibu_docs d ON d.id = e.doc_id ORDER BY e.id DESC LIMIT 8'));
    const unbooked = await DB.val(db, 'SELECT COUNT(*) FROM purchase_invoices WHERE entry_id IS NULL');
    const lastClose = await DB.one(db, "SELECT period, closed_at FROM fibu_periods WHERE status = 'abgeschlossen' ORDER BY period DESC LIMIT 1");
    return out({ ok: true, kpis: { bank: bySys('bank'), kasse: bySys('kasse'), forderungen: bySys('forderungen'), verbindlichkeiten: bySys('verbindlichkeiten'),
      ust: round2(bySys('umsatzsteuer') + bySys('umsatzsteuer7') - bySys('vorsteuer') - bySys('vorsteuer7')), monthResult: await res(`${month}-01`), yearResult: await res(`${year}-01-01`) },
      recent, unbooked, lastClose, docs: await DB.val(db, 'SELECT COUNT(*) FROM fibu_docs'), entries: await DB.val(db, 'SELECT COUNT(*) FROM fibu_entries') });
  }

  /* ---------- Konten ---------- */
  if (path === '/accounts' && method === 'GET') {
    const bal = await fibuBalances(ctx, { to: q.to && isDate(q.to) ? q.to : '9999-12-31' });
    const cnt = Object.fromEntries((await DB.all(db, 'SELECT account_id, COUNT(*) AS n FROM fibu_lines GROUP BY account_id')).map((r) => [r.account_id, r.n]));
    return out({ ok: true, types: FIBU_TYPES, accounts: bal.map((a) => ({ ...a, lines: cnt[a.id] || 0 })) });
  }
  if (path === '/accounts' && method === 'POST') {
    book();
    const number = str(body.number, 8); need(/^\d{3,8}$/.test(number), 400, 'Die Kontonummer besteht aus 3 bis 8 Ziffern.');
    need(!(await DB.one(db, 'SELECT id FROM fibu_accounts WHERE number = ?', number)), 409, `Das Konto ${number} gibt es bereits.`);
    const name = str(body.name, 120); need(name, 400, 'Bitte eine Bezeichnung angeben.');
    const type = FIBU_TYPES[body.type] ? body.type : fibuGuessType(number);
    const id = await DB.insert(db, 'fibu_accounts', { number, name, type, status: 'offen', note: str(body.note, 500) || null, created_by: u.name, created_at: nowIso() });
    await audit(ctx, 'konto_angelegt', 'konto', number, { name, art: type });
    return out({ ok: true, id });
  }
  if ((m = path.match(/^\/accounts\/(\d+)(?:\/(close|reopen))?$/))) {
    const a = await DB.one(db, 'SELECT * FROM fibu_accounts WHERE id = ?', +m[1]); need(a, 404, 'Konto nicht gefunden.');
    if (!m[2] && method === 'GET') {
      const from = isDate(q.from) ? q.from : null, to = isDate(q.to) ? q.to : '9999-12-31';
      const before = from ? await DB.one(db, 'SELECT COALESCE(SUM(l.debit),0) AS d, COALESCE(SUM(l.credit),0) AS c FROM fibu_lines l JOIN fibu_entries e ON e.id = l.entry_id WHERE l.account_id = ? AND e.date < ?', a.id, from) : { d: 0, c: 0 };
      const rows = await DB.all(db, `SELECT l.debit, l.credit, e.id, e.number, e.date, e.text, e.source, e.reverses, e.reversed_by, d.number AS doc_number, d.id AS doc_id FROM fibu_lines l JOIN fibu_entries e ON e.id = l.entry_id LEFT JOIN fibu_docs d ON d.id = e.doc_id WHERE l.account_id = ? ${from ? 'AND e.date >= ?' : ''} AND e.date <= ? ORDER BY e.date, e.id`, ...[a.id, ...(from ? [from] : []), to]);
      let run = saldoOf(a.type, before.d, before.c);
      const opening = run;
      const items = rows.map((r) => { run = round2(run + saldoOf(a.type, r.debit, r.credit)); return { ...r, balance: run }; });
      return out({ ok: true, account: a, opening, items, saldo: run });
    }
    if (!m[2] && method === 'PATCH') {
      book(); const upd = {};
      if (body.name !== undefined) { upd.name = str(body.name, 120); need(upd.name, 400, 'Bitte eine Bezeichnung angeben.'); }
      if (body.note !== undefined) upd.note = str(body.note, 500) || null;
      if (body.type !== undefined) { need(FIBU_TYPES[body.type], 400, 'Ung\u00fcltige Kontoart.'); need(!(await DB.val(db, 'SELECT COUNT(*) FROM fibu_lines WHERE account_id = ?', a.id)), 409, 'Die Kontoart kann nach der ersten Buchung nicht mehr ge\u00e4ndert werden.'); upd.type = body.type; }
      await DB.update(db, 'fibu_accounts', a.id, upd); await audit(ctx, 'konto_geaendert', 'konto', a.number, upd); return out({ ok: true });
    }
    if (m[2] === 'close' && method === 'POST') {
      manage();
      need(a.status === 'offen', 409, 'Das Konto ist bereits geschlossen.');
      need(!a.sys, 409, 'Dieses Konto wird f\u00fcr automatische Buchungen (Rechnungen, Zahlungen, Steuern) ben\u00f6tigt und kann nicht geschlossen werden.');
      const b = (await fibuBalances(ctx, { to: '9999-12-31' })).find((x) => x.id === a.id);
      need(Math.abs(b.saldo) < 0.005, 409, `Das Konto hat noch einen Saldo von ${money(b.saldo)}. Bitte den Saldo zuerst auf ein anderes Konto umbuchen.`);
      await DB.update(db, 'fibu_accounts', a.id, { status: 'geschlossen', closed_at: nowIso(), closed_by: u.name, note: [a.note, body.reason ? 'Geschlossen: ' + str(body.reason, 300) : ''].filter(Boolean).join(' \u00b7 ') || null });
      await audit(ctx, 'konto_geschlossen', 'konto', a.number, { grund: str(body.reason, 300) });
      return out({ ok: true });
    }
    if (m[2] === 'reopen' && method === 'POST') { admin(); need(a.status === 'geschlossen', 409, 'Das Konto ist nicht geschlossen.'); await DB.update(db, 'fibu_accounts', a.id, { status: 'offen', closed_at: null, closed_by: null }); await audit(ctx, 'konto_wieder_geoeffnet', 'konto', a.number, null); return out({ ok: true }); }
  }

  /* ---------- Buchungen ---------- */
  if (path === '/entries' && method === 'GET') {
    const where = ['1=1'], args = [];
    if (/^\d{4}(-\d{2})?$/.test(q.period || '')) { where.push('e.period LIKE ?'); args.push(q.period + '%'); }
    if (q.account) { where.push('e.id IN (SELECT entry_id FROM fibu_lines WHERE account_id = ?)'); args.push(toInt(q.account)); }
    if (q.source) { where.push('e.source = ?'); args.push(str(q.source, 30)); }
    if (q.q) { where.push('(e.text LIKE ? OR e.number LIKE ? OR d.number LIKE ?)'); const t = '%' + str(q.q, 80) + '%'; args.push(t, t, t); }
    const rows = await DB.all(db, `SELECT e.*, d.number AS doc_number FROM fibu_entries e LEFT JOIN fibu_docs d ON d.id = e.doc_id WHERE ${where.join(' AND ')} ORDER BY e.date DESC, e.id DESC LIMIT 500`, ...args);
    return out({ ok: true, entries: await entryView(rows) });
  }
  if (path === '/entries' && method === 'POST') {
    book();
    let docId = body.doc_id ? toInt(body.doc_id) : null;
    if (docId) need(await DB.one(db, 'SELECT id FROM fibu_docs WHERE id = ?', docId), 400, 'Beleg nicht gefunden.');
    if (body.file && body.file.base64) docId = await fibuArchive(ctx, { kind: FIBU_DOC_KINDS[body.doc_kind] ? body.doc_kind : 'sonstiges', title: str(body.doc_title, 200) || str(body.text, 200), date: body.date, amount: body.amount, ref: body.ref, file: body.file });
    let id;
    if (Array.isArray(body.lines) && body.lines.length) id = await fibuPost(ctx, { date: body.date, text: body.text, docId, lines: body.lines.map((l) => ({ account: toInt(l.account_id), debit: l.debit, credit: l.credit })) });
    else id = await fibuSimple(ctx, { date: body.date, text: body.text, debit: toInt(body.debit), credit: toInt(body.credit), amount: body.amount, vatRate: body.vat_rate, docId });
    const e = await DB.one(db, 'SELECT number FROM fibu_entries WHERE id = ?', id);
    await audit(ctx, 'buchung_erfasst', 'buchung', e.number, { text: str(body.text, 200), betrag: body.amount });
    return out({ ok: true, id, number: e.number, doc: docId ? await DB.val(db, 'SELECT number FROM fibu_docs WHERE id = ?', docId) : null });
  }
  if ((m = path.match(/^\/entries\/(\d+)(?:\/(reverse|doc))?$/))) {
    const e = await DB.one(db, 'SELECT * FROM fibu_entries WHERE id = ?', +m[1]); need(e, 404, 'Buchung nicht gefunden.');
    if (!m[2] && method === 'GET') { const [v] = await entryView([{ ...e, doc_number: e.doc_id ? await DB.val(db, 'SELECT number FROM fibu_docs WHERE id = ?', e.doc_id) : null }]); return out({ ok: true, entry: v }); }
    if (m[2] === 'reverse' && method === 'POST') { book(); const sid = await fibuReverse(ctx, e.id, body.reason); return out({ ok: true, id: sid, number: await DB.val(db, 'SELECT number FROM fibu_entries WHERE id = ?', sid) }); }
    if (m[2] === 'doc' && method === 'POST') {
      book(); need(!e.doc_id, 409, 'Diese Buchung hat bereits einen Beleg. Belege werden nie ausgetauscht \u2013 bitte Storno und neue Buchung.');
      let docId = body.doc_id ? toInt(body.doc_id) : null;
      if (body.file && body.file.base64) docId = await fibuArchive(ctx, { kind: FIBU_DOC_KINDS[body.doc_kind] ? body.doc_kind : 'sonstiges', title: e.text, date: e.date, ref: body.ref, file: body.file });
      need(docId && (await DB.one(db, 'SELECT id FROM fibu_docs WHERE id = ?', docId)), 400, 'Bitte einen Beleg w\u00e4hlen oder hochladen.');
      await DB.update(db, 'fibu_entries', e.id, { doc_id: docId }); await audit(ctx, 'beleg_zugeordnet', 'buchung', e.number, { beleg: docId });
      return out({ ok: true });
    }
  }

  /* ---------- Belegarchiv ---------- */
  if (path === '/docs' && method === 'GET') {
    const where = ['1=1'], args = [];
    if (FIBU_DOC_KINDS[q.kind]) { where.push('d.kind = ?'); args.push(q.kind); }
    if (/^\d{4}$/.test(q.year || '')) { where.push('d.date LIKE ?'); args.push(q.year + '%'); }
    if (q.q) { where.push('(d.number LIKE ? OR d.title LIKE ? OR d.counterparty LIKE ? OR d.ref LIKE ?)'); const t = '%' + str(q.q, 80) + '%'; args.push(t, t, t, t); }
    const docs = await DB.all(db, `SELECT d.*, (SELECT GROUP_CONCAT(e.number, ', ') FROM fibu_entries e WHERE e.doc_id = d.id) AS entries FROM fibu_docs d WHERE ${where.join(' AND ')} ORDER BY d.id DESC LIMIT 500`, ...args);
    return out({ ok: true, kinds: FIBU_DOC_KINDS, docs });
  }
  if (path === '/docs' && method === 'POST') {
    book();
    const id = await fibuArchive(ctx, { kind: FIBU_DOC_KINDS[body.kind] ? body.kind : 'sonstiges', title: body.title || (body.file && body.file.name) || '', date: body.date, amount: body.amount, counterparty: body.counterparty, ref: body.ref || (body.file && body.file.name ? String(body.file.name).replace(/\.pdf$/i, '') : null), file: body.file, note: body.note });
    return out({ ok: true, id, number: await DB.val(db, 'SELECT number FROM fibu_docs WHERE id = ?', id) });
  }
  if ((m = path.match(/^\/docs\/(\d+)\/file$/)) && method === 'GET') {
    const d = await DB.one(db, 'SELECT * FROM fibu_docs WHERE id = ?', +m[1]); need(d && d.file_id, 404, 'Beleg nicht gefunden.');
    await audit(ctx, 'beleg_angesehen', 'beleg', d.number, null);
    return fileResponse(await getFile(ctx, d.file_id), q.download === '1');
  }

  /* ---------- Abschl\u00fcsse ---------- */
  if (path === '/periods' && method === 'GET') {
    let start = jparse(await rawSetting(db, '_fibu_start'), null) || today.slice(0, 7);
    const first = await DB.val(db, 'SELECT MIN(period) FROM fibu_entries'); if (first && first < start) start = first;
    const rows = await DB.all(db, 'SELECT id, period, kind, status, file_id, doc_id, closed_by, closed_at, reopened_by, reopened_at, report FROM fibu_periods');
    const map = Object.fromEntries(rows.map((r) => [r.period, r]));
    const list = []; let p = today.slice(0, 7);
    for (let i = 0; i < 36 && p >= start; i++) { const r = map[p]; const rep = r && jparse(r.report, null); list.push({ period: p, kind: 'monat', status: r ? r.status : p === today.slice(0, 7) ? 'laufend' : 'offen', result: rep ? rep.result : null, closed_by: r && r.closed_by, closed_at: r && r.closed_at, has_pdf: !!(r && r.file_id) }); p = prevPeriod(p); }
    const years = []; for (let y = +today.slice(0, 4); y >= +start.slice(0, 4); y--) { const r = map[String(y)]; const rep = r && jparse(r.report, null); years.push({ period: String(y), kind: 'jahr', status: r ? r.status : y === +today.slice(0, 4) ? 'laufend' : 'offen', result: rep ? rep.result : null, closed_by: r && r.closed_by, closed_at: r && r.closed_at, has_pdf: !!(r && r.file_id) }); }
    return out({ ok: true, months: list, years });
  }
  if ((m = path.match(/^\/periods\/(\d{4}(?:-\d{2})?)(?:\/(close|reopen|pdf))?$/))) {
    const per = m[1], row = await DB.one(db, 'SELECT * FROM fibu_periods WHERE period = ?', per);
    if (!m[2] && method === 'GET') return out({ ok: true, report: row && row.status === 'abgeschlossen' ? jparse(row.report, null) : await fibuReport(ctx, per), status: row ? row.status : 'offen', closed_by: row && row.closed_by, closed_at: row && row.closed_at });
    if (m[2] === 'pdf' && method === 'GET') {
      if (row && row.file_id) return fileResponse(await getFile(ctx, row.file_id), q.download === '1');
      const s = await settingsOf(ctx); const r = await fibuReport(ctx, per);
      return new Response(renderFibuReportPdf(s, r), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="Vorschau-${per}.pdf"`, 'Cache-Control': 'no-store' } });
    }
    if (m[2] === 'close' && method === 'POST') { manage(); return out({ ok: true, ...(await fibuClosePeriod(ctx, per)) }); }
    if (m[2] === 'reopen' && method === 'POST') { admin(); return out(await fibuReopenPeriod(ctx, per)); }
  }

  /* ---------- Anfangsbest\u00e4nde und Import alter Buchf\u00fchrung ---------- */
  if (path === '/opening' && method === 'POST') {
    manage();
    const rows = (body.rows || []).filter((r) => toNum(r.amount, 0)).map((r) => ({ account_id: toInt(r.account_id), amount: r.amount }));
    need(rows.length, 400, 'Bitte mindestens einen Kontostand eintragen.');
    let docId = null; if (body.file && body.file.base64) docId = await fibuArchive(ctx, { kind: 'import', title: `Nachweis Anfangsbest\u00e4nde ${fmtDateDE(body.date)}`, date: body.date, file: body.file });
    const ids = await fibuOpening(ctx, { date: body.date, rows, docId });
    return out({ ok: true, created: ids.length });
  }
  if (path === '/import/parse' && method === 'POST') {
    manage();
    need(body.file && body.file.base64, 400, 'Bitte eine Datei (PDF oder CSV) hochladen.');
    const bytes = unb64(String(body.file.base64).replace(/\s+/g, ''));
    need(bytes.length <= 10 * 1024 * 1024, 400, 'Die Datei ist zu gro\u00df (max. 10 MB).');
    const isPdf = /pdf/i.test(body.file.type || '') || /\.pdf$/i.test(body.file.name || '') || new TextDecoder('latin1').decode(bytes.subarray(0, 5)) === '%PDF-';
    const lines = isPdf ? await pdfLines(bytes) : new TextDecoder(/[\xc3][\x80-\xbf]/.test(new TextDecoder('latin1').decode(bytes.subarray(0, 4000))) ? 'utf-8' : 'windows-1252').decode(bytes).split(/\r?\n/);
    const rows = fibuParseLegacy(lines);
    let docId = null;
    if (isPdf) docId = await fibuArchive(ctx, { kind: 'import', title: `Import alte Buchf\u00fchrung: ${str(body.file.name, 120) || 'Datei'}`, date: today, file: { ...body.file, type: 'application/pdf' } });
    await audit(ctx, 'import_gelesen', 'buchung', null, { datei: str(body.file.name, 120), zeilen: lines.length, erkannt: rows.length });
    return out({ ok: true, docId, lineCount: lines.length, textFound: lines.some((l) => l.trim()), rows, sample: lines.slice(0, 40) });
  }
  if (path === '/import/commit' && method === 'POST') { manage(); return out({ ok: true, ...(await fibuImportCommit(ctx, { mode: body.mode === 'eroeffnung' ? 'eroeffnung' : 'buchungen', date: body.date, rows: body.rows, docId: body.docId ? toInt(body.docId) : null })) }); }

  return fail(404, 'Nicht gefunden.');
}


/* ===== Oberfl\u00e4chen ===== */
const STAFF_HTML = "<!doctype html><html lang=\"de\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><meta name=\"robots\" content=\"noindex,nofollow\"><meta name=\"theme-color\" content=\"#1b1d20\"><title>KFL Dashboard</title><style nonce=\"__NONCE__\">/* ===== KFL Gestaltungssystem (gemeinsam) ===== */\n:root{\n  --ink:#16171a; --ink-2:#2b2d31; --steel:#62656b; --steel-2:#8a8d93; --line:#e1e2e5; --line-2:#eceef0;\n  --bg:#f2f3f5; --surface:#fff; --sunken:#f7f8f9;\n  --asphalt:#1b1d20; --asphalt-2:#26292d; --asphalt-3:#33363b;\n  --orange:#ff6c01; --orange-hover:#ff8124; --orange-ink:#b84d00; --orange-wash:#fff2e8;\n  --green:#0a7d3b; --green-wash:#e6f4ec; --green-light:#58b77d; --green-light-wash:#effaf2;\n  --blue:#1d4ed8; --blue-wash:#e9effd; --red:#c4291c; --red-wash:#fdecea; --amber:#9a5b00; --amber-wash:#fff5db;\n  --r-s:8px; --r-m:12px; --r-l:18px;\n  --font:\"Helvetica Neue\",Helvetica,Arial,system-ui,-apple-system,\"Segoe UI\",sans-serif;\n  --ease:cubic-bezier(.2,.7,.1,1);\n  --focus:0 0 0 3px rgba(255,108,1,.35);\n}\n*{box-sizing:border-box}\nhtml{-webkit-text-size-adjust:100%}\nbody{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 var(--font);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}\nbody.has-modal{overflow:hidden}\nh1,h2,h3,h4{margin:0;line-height:1.2;letter-spacing:-.01em}\nh1{font-size:28px;font-weight:800;font-style:italic;letter-spacing:-.02em}\nh2{font-size:19px;font-weight:700}\nh3{font-size:15.5px;font-weight:700}\nh4{font-size:13.5px;font-weight:700;color:var(--steel)}\np{margin:0}\na{color:inherit}\na.link,.link{color:var(--orange-ink);text-decoration:underline;text-underline-offset:2px;cursor:pointer;background:none;border:0;padding:0;font:inherit}\nbutton{font:inherit;color:inherit}\n:focus-visible{outline:none;box-shadow:var(--focus);border-radius:6px}\n.ic{width:18px;height:18px;flex:none;display:inline-block;vertical-align:middle}\n.num{font-variant-numeric:tabular-nums}\n.muted{color:var(--steel)}\n.small{font-size:13px}\n.tiny{font-size:12px}\n.strong{font-weight:700}\n.nowrap{white-space:nowrap}\n.hide{display:none!important}\n.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}\n.lead{color:var(--steel);font-size:15px}\n.pre{white-space:pre-wrap;word-break:break-word}\nhr.sep{border:0;border-top:1px solid var(--line);margin:18px 0}\n\n/* Logo: Wortmarke mit Tempo-Strich */\n.logo{display:inline-flex;align-items:center;gap:7px;text-decoration:none}\n.logo b{font:italic 900 23px/1 var(--font);letter-spacing:-.03em;color:currentColor}\n.logo i{display:block;width:26px;height:5px;background:var(--orange);transform:skewX(-24deg);border-radius:1px}\n\n/* Layout-Helfer */\n.stack{display:flex;flex-direction:column;gap:14px}\n.stack-s{display:flex;flex-direction:column;gap:8px}\n.row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}\n.row-between{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}\n.spacer{flex:1}\n.grid-2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}\n.grid-3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}\n.grid-4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}\n.span-2{grid-column:span 2}\n@media (max-width:900px){.grid-3,.grid-4{grid-template-columns:repeat(2,minmax(0,1fr))}}\n@media (max-width:640px){.grid-2,.grid-3,.grid-4{grid-template-columns:1fr}.span-2{grid-column:auto}}\n\n/* Buttons */\n.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:0 16px;border-radius:var(--r-s);border:1px solid var(--line);background:var(--surface);font-weight:600;font-size:14.5px;cursor:pointer;text-decoration:none;white-space:nowrap;transition:background .15s,border-color .15s,color .15s}\n.btn:hover{border-color:#c9cbcf;background:var(--sunken)}\n.btn:disabled{opacity:.5;cursor:not-allowed}\n.btn-primary{background:var(--orange);border-color:var(--orange);color:#fff}\n.btn-primary:hover{background:var(--orange-hover);border-color:var(--orange-hover)}\n.btn-dark{background:var(--ink);border-color:var(--ink);color:#fff}\n.btn-dark:hover{background:var(--ink-2);border-color:var(--ink-2)}\n.btn-ghost{background:transparent;border-color:transparent}\n.btn-ghost:hover{background:rgba(0,0,0,.05);border-color:transparent}\n.btn-danger{background:var(--red);border-color:var(--red);color:#fff}\n.btn-danger:hover{background:#a82216}\n.btn-ok{background:var(--green);border-color:var(--green);color:#fff}\n.btn-ok:hover{background:#086a32}\n.btn-sm{min-height:32px;padding:0 11px;font-size:13.5px;gap:6px}\n.btn-sm .ic{width:16px;height:16px}\n.btn-block{width:100%}\n.btn.is-busy{pointer-events:none;opacity:.7;position:relative}\n.btn.is-busy::after{content:\"\";width:14px;height:14px;border-radius:50%;border:2px solid currentColor;border-right-color:transparent;animation:spin .7s linear infinite}\n.icon-btn{display:inline-grid;place-items:center;width:36px;height:36px;border-radius:var(--r-s);border:0;background:transparent;cursor:pointer;color:inherit}\n.icon-btn:hover{background:rgba(0,0,0,.06)}\n\n/* Formulare */\n.field{display:flex;flex-direction:column;gap:5px;min-width:0}\n.field-label{font-size:13px;font-weight:600;color:var(--ink-2)}\n.field-hint{font-size:12px;color:var(--steel)}\ninput,select,textarea{font:inherit;font-size:15px;color:var(--ink);background:var(--surface);border:1px solid #d3d5d9;border-radius:var(--r-s);padding:9px 12px;min-height:40px;width:100%;transition:border-color .15s,box-shadow .15s}\ntextarea{resize:vertical;line-height:1.45}\ninput:focus,select:focus,textarea:focus{outline:none;border-color:var(--orange);box-shadow:var(--focus)}\ninput[type=checkbox],input[type=radio]{width:18px;height:18px;min-height:0;accent-color:var(--orange);margin:0;flex:none}\ninput[type=file]{padding:7px;font-size:14px}\nselect{appearance:none;background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' fill='none' stroke='%2362656b' stroke-width='1.8'%3E%3Cpath d='m1 1.5 5 5 5-5'/%3E%3C/svg%3E\");background-repeat:no-repeat;background-position:right 12px center;padding-right:34px}\n.check{display:flex;align-items:flex-start;gap:9px;cursor:pointer;font-size:14.5px;line-height:1.35}\n.check input{margin-top:1px}\n.checks{display:flex;flex-wrap:wrap;gap:8px 18px}\n.inline-form{display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap}\n.inline-form .field{flex:1;min-width:160px}\nfieldset{border:1px solid var(--line);border-radius:var(--r-m);padding:14px 16px 16px;margin:0}\nlegend{font-weight:700;font-size:14px;padding:0 6px}\n.seg{display:inline-flex;border:1px solid var(--line);border-radius:var(--r-s);overflow:hidden;background:var(--surface)}\n.seg label{position:relative}\n.seg input{position:absolute;opacity:0;pointer-events:none}\n.seg span{display:block;padding:8px 14px;font-size:14px;font-weight:600;cursor:pointer;border-right:1px solid var(--line)}\n.seg label:last-child span{border-right:0}\n.seg input:checked+span{background:var(--ink);color:#fff}\n.seg input:focus-visible+span{box-shadow:inset var(--focus)}\n\n/* Badges */\n.badge{display:inline-flex;align-items:center;gap:5px;padding:2px 9px;border-radius:999px;font-size:12.5px;font-weight:600;line-height:1.55;white-space:nowrap;background:var(--line-2);color:var(--ink-2)}\n.badge::before{content:\"\";width:6px;height:6px;border-radius:50%;background:currentColor;opacity:.75}\n.t-info{background:var(--blue-wash);color:var(--blue)}\n.t-accent{background:var(--orange-wash);color:var(--orange-ink)}\n.t-ok{background:var(--green-wash);color:var(--green)}\n.t-ok-light{background:var(--green-light-wash);color:#2f8a54}\n.t-warn{background:var(--amber-wash);color:var(--amber)}\n.t-err{background:var(--red-wash);color:var(--red)}\n.t-muted{background:#eef0f2;color:var(--steel)}\n.t-neutral{background:#eef0f2;color:var(--ink-2)}\n.tag{display:inline-block;padding:1px 8px;border-radius:5px;font-size:12px;font-weight:700;border:1px solid var(--line);color:var(--ink-2);background:var(--surface)}\n.dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--orange)}\n\n/* Tabellen */\n.table-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}\ntable.table{width:100%;border-collapse:collapse;font-size:14px}\n.table th{text-align:left;font-weight:600;color:var(--steel);font-size:12.5px;padding:10px 12px;border-bottom:1px solid var(--line);white-space:nowrap;background:var(--sunken);position:sticky;top:0}\n.table td{padding:11px 12px;border-bottom:1px solid var(--line-2);vertical-align:top}\n.table tr.clickable{cursor:pointer}\n.table tr.clickable:hover td{background:#fafafa}\n.table tr.is-unread td:first-child{box-shadow:inset 3px 0 0 var(--orange)}\n.table th button{all:unset;cursor:pointer;display:inline-flex;gap:4px;align-items:center}\n.table th button:focus-visible{box-shadow:var(--focus)}\n.table th .sort-on{color:var(--ink)}\n.table td.r,.table th.r{text-align:right}\n.cell-sub{display:block;color:var(--steel);font-size:12.5px;margin-top:1px}\n\n/* Key-Value */\n.kv{display:grid;grid-template-columns:minmax(120px,38%) 1fr;gap:7px 16px;margin:0;font-size:14px}\n.kv dt{color:var(--steel)}\n.kv dd{margin:0;word-break:break-word}\n\n/* Tabs */\n.tabs{display:flex;gap:2px;border-bottom:1px solid var(--line);overflow-x:auto;scrollbar-width:none}\n.tabs::-webkit-scrollbar{display:none}\n.tab{appearance:none;border:0;background:none;padding:11px 14px 12px;font-weight:600;font-size:14.5px;color:var(--steel);cursor:pointer;white-space:nowrap;border-bottom:2.5px solid transparent;margin-bottom:-1px;text-decoration:none;display:inline-flex;gap:7px;align-items:center}\n.tab:hover{color:var(--ink)}\n.tab.on{color:var(--ink);border-bottom-color:var(--orange)}\n.count{display:inline-grid;place-items:center;min-width:20px;height:20px;padding:0 6px;border-radius:10px;background:var(--line-2);color:var(--ink-2);font-size:11.5px;font-weight:700}\n.count.hot{background:var(--orange);color:#fff}\n\n/* Modal */\n.modal-wrap{position:fixed;inset:0;background:rgba(20,21,24,.45);display:grid;place-items:center;padding:20px;z-index:100;opacity:0;transition:opacity .18s}\n.modal-wrap.in{opacity:1}\n.modal{background:var(--surface);border-radius:var(--r-l);width:min(560px,100%);max-height:calc(100vh - 40px);display:flex;flex-direction:column;box-shadow:0 30px 80px -20px rgba(0,0,0,.4);transform:translateY(10px);transition:transform .22s var(--ease)}\n.modal.is-wide{width:min(900px,100%)}\n.modal-wrap.in .modal{transform:none}\n.modal-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px 20px 12px}\n.modal-head h2{font-size:18px}\n.modal-body{padding:4px 20px 20px;overflow:auto}\n.modal-foot{display:flex;justify-content:flex-end;gap:10px;padding:14px 20px;border-top:1px solid var(--line-2)}\n@media (max-width:640px){.modal-wrap{padding:0;align-items:end}.modal{border-radius:var(--r-l) var(--r-l) 0 0;max-height:92vh}}\n\n/* Toasts */\n#toasts{position:fixed;right:18px;bottom:18px;display:flex;flex-direction:column;gap:8px;z-index:200;max-width:calc(100vw - 36px)}\n.toast{display:flex;gap:10px;align-items:flex-start;background:var(--ink);color:#fff;padding:12px 16px;border-radius:var(--r-m);font-size:14px;box-shadow:0 12px 30px -10px rgba(0,0,0,.4);transform:translateY(8px);opacity:0;transition:all .25s var(--ease);max-width:420px}\n.toast.in{transform:none;opacity:1}\n.toast.t-err{background:var(--red)}\n.toast .ic{margin-top:1px}\n\n/* Leer- und Ladezust\u00e4nde */\n.empty{text-align:center;padding:42px 20px;color:var(--steel);display:flex;flex-direction:column;align-items:center;gap:8px}\n.empty strong{color:var(--ink);font-size:16px}\n.empty p{max-width:420px}\n.empty-mark{width:46px;height:46px;border-radius:50%;background:var(--line-2);display:grid;place-items:center;color:var(--steel-2);margin-bottom:4px}\n.empty-sm{color:var(--steel);font-size:14px;padding:18px 0}\n.loading{display:flex;align-items:center;gap:10px;color:var(--steel);padding:40px 0;justify-content:center}\n.spinner{width:18px;height:18px;border-radius:50%;border:2.5px solid var(--line);border-top-color:var(--orange);animation:spin .8s linear infinite}\n@keyframes spin{to{transform:rotate(360deg)}}\n\n/* Avatare */\n.avatar{display:inline-grid;place-items:center;width:32px;height:32px;border-radius:50%;background:var(--ink);color:#fff;font-size:12px;font-weight:700;flex:none;letter-spacing:.02em}\n.avatar.lg{width:44px;height:44px;font-size:15px}\n.avatar.alt{background:var(--orange)}\n\n/* Diagramme */\n.chart{display:block;overflow:visible}\n.chart .bar{fill:#2b2d31}\n.chart .bar-accent{fill:var(--orange)}\n.chart-axis{stroke:var(--line);stroke-width:1}\n.chart-label{font-size:10px;fill:var(--steel);font-family:var(--font)}\n.hbars{display:flex;flex-direction:column;gap:9px}\n.hbar{display:grid;grid-template-columns:minmax(90px,32%) 1fr 56px;align-items:center;gap:10px;font-size:13.5px}\n.hbar-l{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n.hbar-track{height:8px;background:var(--line-2);border-radius:4px;overflow:hidden}\n.hbar-track i{display:block;height:100%;background:var(--ink);border-radius:4px}\n.hbar:first-child .hbar-track i{background:var(--orange)}\n.hbar-v{text-align:right;font-weight:600}\n.ring-bg{stroke:var(--line-2)}\n.ring-fg{stroke:var(--orange);transition:stroke-dashoffset .8s var(--ease)}\n.delta{font-size:12.5px;font-weight:700;color:var(--steel)}\n.delta.up{color:var(--green)}\n.delta.down{color:var(--red)}\n\n/* Chatverlauf / Kommentare */\n.thread{display:flex;flex-direction:column;gap:12px}\n.msg{max-width:min(560px,88%);padding:10px 14px;border-radius:14px;background:var(--sunken);border:1px solid var(--line-2);font-size:14.5px}\n.msg.me{align-self:flex-end;background:var(--ink);color:#fff;border-color:var(--ink)}\n.msg.internal{background:var(--amber-wash);border-color:#f2dfae}\n.msg-meta{font-size:12px;color:var(--steel);margin-bottom:3px;display:flex;gap:8px}\n.msg.me .msg-meta{color:#b6b8bc}\n\n/* Zeitleiste */\n.timeline{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}\n.timeline li{display:grid;grid-template-columns:14px 1fr;gap:12px;padding-bottom:14px;position:relative;font-size:14px}\n.timeline li::before{content:\"\";width:9px;height:9px;border-radius:50%;background:var(--steel-2);margin-top:6px;margin-left:2px}\n.timeline li::after{content:\"\";position:absolute;left:6px;top:18px;bottom:0;width:1px;background:var(--line)}\n.timeline li:last-child::after{display:none}\n.timeline li.conf::before{background:var(--amber)}\n.timeline li.kfl::before{background:var(--orange)}\n.timeline .tl-meta{font-size:12px;color:var(--steel)}\n\n@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;transition-duration:.01ms!important}}\n.mt{margin-top:14px}.mt-l{margin-top:24px}\n.cols{display:flex;align-items:stretch;gap:4px;padding-top:6px}\n.col{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:4px}\n.col-bar{width:min(100%,30px);background:#2b2d31;border-radius:4px 4px 1px 1px;display:flex;align-items:flex-end;overflow:hidden}\n.col-bar i{display:block;width:100%;background:var(--orange)}\n.col-v{font-size:11px;color:var(--steel);font-variant-numeric:tabular-nums}\n.col-l{font-size:11px;color:var(--steel);height:15px;white-space:nowrap}\n.toolbar .check{align-items:center}\n\n/* gemeinsam genutzte Bausteine */\n.note-box{background:var(--amber-wash);border:1px solid #f0dca6;border-radius:var(--r-m);padding:12px 14px;font-size:14px;display:flex;gap:10px}\n.info-box{background:var(--blue-wash);border:1px solid #cdd9f8;border-radius:var(--r-m);padding:12px 14px;font-size:14px;display:flex;gap:10px;color:#1a3a9e}\n.err-box{background:var(--red-wash);border:1px solid #f4c7c2;border-radius:var(--r-m);padding:12px 14px;font-size:14px;display:flex;gap:10px;color:#8f1d13}\n.toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:12px 14px;border-bottom:1px solid var(--line-2)}\n.toolbar input,.toolbar select{min-height:36px;padding:6px 10px;font-size:14px;width:auto}\n.toolbar .search{position:relative;flex:1;min-width:220px}\n.toolbar .search input{width:100%;padding-left:34px}\n.toolbar .search .ic{position:absolute;left:10px;top:9px;color:var(--steel-2)}\n.toolbar select{padding-right:30px;background-position:right 10px center}\n.pager{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 14px;font-size:13.5px;color:var(--steel)}\n.feed-item{display:grid;grid-template-columns:34px 1fr auto;gap:12px;padding:13px 18px;border-bottom:1px solid var(--line-2);text-decoration:none;align-items:start}\n.feed-item:hover{background:var(--sunken)}\n.feed-item.unread{background:#fffaf5}\n.feed-item.unread .fi-title::after{content:\"\";display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--orange);margin-left:7px;vertical-align:middle}\n.fi-mark{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:var(--line-2);color:var(--ink-2)}\n.fi-mark.post{background:var(--ink);color:#fff}\n.fi-mark.important{background:var(--orange);color:#fff}\n.fi-title{font-weight:600;font-size:14.5px}\n.fi-body{color:var(--steel);font-size:13.5px;margin-top:2px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}\n.fi-time{font-size:12px;color:var(--steel);white-space:nowrap}\n.fi-actions{display:flex;gap:4px;margin-top:6px}\n.asg{padding:14px 18px;border-bottom:1px solid var(--line-2)}\n.asg:last-child{border-bottom:0}\n.asg-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}\n.asg-meta{font-size:13px;color:var(--steel);margin-top:3px}\n.asg .row{margin-top:9px}\n.auth-help{display:flex;align-items:center;gap:12px;padding:14px 16px;border:1px solid var(--line);border-radius:var(--r-m);font-size:14px}\n.auth-help .spacer{min-width:8px}\n.fi-title{text-decoration:none}\n.fi-title:hover{text-decoration:underline}\n/* ===== Internes Dashboard ===== */\n.shell{display:grid;grid-template-columns:248px 1fr;min-height:100vh}\n.side{background:var(--asphalt);color:#d9dadc;display:flex;flex-direction:column;position:sticky;top:0;height:100vh;padding:20px 12px 14px;gap:4px}\n.side .logo{color:#fff;padding:2px 10px 18px}\n.side-sub{font-size:11.5px;color:#8c8f95;margin:-14px 10px 16px;letter-spacing:.01em}\n.nav{display:flex;flex-direction:column;gap:2px;overflow-y:auto;flex:1;margin:0 -4px;padding:0 4px}\n.nav a{display:flex;align-items:center;gap:11px;padding:9px 10px;border-radius:9px;text-decoration:none;font-size:14.5px;font-weight:500;color:#c8cacd;position:relative}\n.nav a:hover{background:var(--asphalt-2);color:#fff}\n.nav a.on{background:var(--asphalt-3);color:#fff}\n.nav a.on::before{content:\"\";position:absolute;left:-4px;top:9px;bottom:9px;width:3px;border-radius:2px;background:var(--orange)}\n.nav a .ic{color:#8f9298}\n.nav a.on .ic,.nav a:hover .ic{color:#fff}\n.nav .count{margin-left:auto;background:var(--asphalt-3);color:#e6e7e9}\n.nav .count.hot{background:var(--orange);color:#fff}\n.nav-sep{height:1px;background:var(--asphalt-3);margin:10px 8px}\n.side-foot{border-top:1px solid var(--asphalt-3);padding:12px 6px 0;display:flex;align-items:center;gap:10px}\n.side-foot .who{flex:1;min-width:0;font-size:13.5px;line-height:1.3}\n.side-foot .who b{display:block;color:#fff;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.side-foot .who span{color:#8c8f95;font-size:12px}\n.side-foot .icon-btn{color:#a9acb1}\n.side-foot .icon-btn:hover{background:var(--asphalt-3);color:#fff}\n.topbar{display:none}\n.main{min-width:0;padding:26px 32px 60px}\n.page-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:20px}\n.page-head .sub{color:var(--steel);margin-top:4px;font-size:14.5px}\n.page-head .actions{display:flex;gap:8px;flex-wrap:wrap}\n.crumb{display:inline-flex;align-items:center;gap:6px;color:var(--steel);text-decoration:none;font-size:13.5px;margin-bottom:8px}\n.crumb:hover{color:var(--ink)}\n@media (max-width:960px){\n  .shell{grid-template-columns:1fr}\n  .side{position:fixed;left:0;top:0;bottom:0;width:270px;z-index:60;transform:translateX(-100%);transition:transform .25s var(--ease)}\n  body.nav-open .side{transform:none;box-shadow:0 0 0 100vmax rgba(0,0,0,.4)}\n  .topbar{display:flex;align-items:center;gap:10px;position:sticky;top:0;z-index:50;background:var(--asphalt);color:#fff;padding:10px 14px}\n  .topbar .logo{color:#fff}\n  .main{padding:18px 16px 50px}\n  h1{font-size:24px}\n}\n\n/* Fl\u00e4chen */\n.panel{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-m)}\n.panel-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 18px;border-bottom:1px solid var(--line-2)}\n.panel-head h2{font-size:16px}\n.panel-head h3{font-size:15px}\n.panel-body{padding:16px 18px}\n.panel-body.tight{padding:0}\n.panel + .panel{margin-top:14px}\n.section-title{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:26px 0 10px}\n.section-title h2{font-size:17px}\n\n/* Kennzahlen-Leiste: eine Zeile mit Trennern statt Kachelgitter */\n.kpis{display:flex;background:var(--surface);border:1px solid var(--line);border-radius:var(--r-m);overflow-x:auto}\n.kpi{flex:1;min-width:130px;padding:14px 18px;border-right:1px solid var(--line-2);text-decoration:none;display:flex;flex-direction:column;gap:2px}\n.kpi:last-child{border-right:0}\na.kpi:hover{background:var(--sunken)}\n.kpi b{font-size:26px;font-weight:800;letter-spacing:-.02em;font-variant-numeric:tabular-nums;line-height:1.15}\n.kpi span{font-size:13px;color:var(--steel)}\n.kpi.hot b{color:var(--orange-ink)}\n.kpi .delta{margin-top:2px}\n\n/* Toolbar / Filter */\n\n/* Startseite */\n.hello{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:18px}\n.hello h1{font-size:32px}\n.hello .date{text-align:right;color:var(--steel);font-size:14px;line-height:1.4}\n.hello .date b{display:block;color:var(--ink);font-size:15px}\n.start-grid{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(300px,1fr);gap:16px;margin-top:16px;align-items:start}\n@media (max-width:1100px){.start-grid{grid-template-columns:1fr}}\n.newsroom{min-height:520px;display:flex;flex-direction:column}\n.newsroom .feed{flex:1;overflow:auto;max-height:640px}\n\n/* Anfrage-Detail: Fortschrittsstrecke */\n.track{display:flex;align-items:flex-start;gap:0;padding:18px 18px 14px;overflow-x:auto}\n.track-step{flex:1;min-width:104px;position:relative;text-align:center;font-size:12.5px;color:var(--steel)}\n.track-step::before{content:\"\";position:absolute;top:9px;left:-50%;right:50%;height:3px;background:var(--line)}\n.track-step:first-child::before{display:none}\n.track-step i{position:relative;z-index:1;display:block;width:21px;height:21px;margin:0 auto 7px;border-radius:50%;background:var(--surface);border:3px solid var(--line)}\n.track-step.done{color:var(--ink)}\n.track-step.done::before{background:var(--ink)}\n.track-step.done i{background:var(--ink);border-color:var(--ink)}\n.track-step.now{color:var(--ink);font-weight:700}\n.track-step.now::before{background:var(--ink)}\n.track-step.now i{border-color:var(--orange);background:#fff;box-shadow:0 0 0 4px var(--orange-wash)}\n.track-step.bad i{border-color:var(--red);background:var(--red)}\n.track-step small{display:block;font-weight:400;color:var(--steel);font-size:11.5px;margin-top:1px}\n.detail-grid{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(320px,1fr);gap:16px;align-items:start}\n@media (max-width:1150px){.detail-grid{grid-template-columns:1fr}}\n.fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1px;background:var(--line-2)}\n.fields > div{background:var(--surface);padding:10px 18px}\n.fields dt{font-size:12.5px;color:var(--steel)}\n.fields dd{margin:2px 0 0;font-size:14.5px;word-break:break-word}\n.fields .wide{grid-column:1/-1}\n@media (max-width:640px){.fields{grid-template-columns:1fr}}\n.offer-card{border:1px solid var(--line);border-radius:var(--r-m);padding:14px 16px}\n.offer-card.top{border-color:var(--orange);box-shadow:inset 3px 0 0 var(--orange)}\n.offer-card + .offer-card{margin-top:10px}\n.offer-price{font-size:22px;font-weight:800;letter-spacing:-.02em}\n.composer{border-top:1px solid var(--line-2);padding:14px 18px;display:flex;flex-direction:column;gap:10px}\n\n/* Anmeldung */\n.auth{min-height:100vh;display:grid;grid-template-columns:minmax(0,1fr) minmax(380px,520px);background:var(--surface)}\n.auth-art{background:var(--asphalt);color:#fff;padding:44px 52px;display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden}\n.auth-art .logo b{font-size:30px}\n.auth-art .logo i{width:36px;height:6px}\n.auth-art h1{font-size:46px;line-height:1.05;max-width:520px;font-weight:900}\n.auth-art p{color:#a8abb0;max-width:440px;margin-top:14px;font-size:16px}\n.auth-art .stripes{position:absolute;right:-60px;top:0;bottom:0;width:340px;display:flex;gap:22px;transform:skewX(-24deg);opacity:.9;pointer-events:none}\n.auth-art .stripes span{width:36px;background:var(--asphalt-2)}\n.auth-art .stripes span:nth-child(2){background:var(--orange);width:14px}\n.auth-art .stripes span:nth-child(3){background:var(--asphalt-3);width:22px}\n.auth-art > *{position:relative}\n.auth-art .stripes{position:absolute}\n.auth-art .foot{color:#7f838a;font-size:13px}\n.auth-form{padding:44px 48px;display:flex;flex-direction:column;justify-content:center;gap:20px;max-width:520px;width:100%;margin:0 auto}\n.auth-form h2{font-size:24px;font-weight:800}\n@media (max-width:860px){.auth{grid-template-columns:1fr}.auth-art{padding:28px 22px;min-height:auto}.auth-art h1{font-size:30px;margin-top:26px}.auth-art .foot{display:none}.auth-form{padding:28px 20px 40px}}\n\n/* Sonstiges */\n.perm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:6px 22px}\n.perm-group{margin-top:12px}\n.perm-group h4{margin-bottom:6px}\n.matrix th,.matrix td{text-align:center}\n.matrix th:first-child,.matrix td:first-child{text-align:left}\n.chat-layout{display:grid;grid-template-columns:300px 1fr;min-height:520px}\n.chat-list{border-right:1px solid var(--line-2);overflow:auto;max-height:640px}\n.chat-row{display:flex;gap:10px;padding:12px 14px;border-bottom:1px solid var(--line-2);text-decoration:none;align-items:center}\n.chat-row:hover{background:var(--sunken)}\n.chat-row.on{background:var(--orange-wash)}\n.chat-row .t{flex:1;min-width:0}\n.chat-row .t b{display:block;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.chat-row .t span{display:block;font-size:12.5px;color:var(--steel);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.chat-main{display:flex;flex-direction:column;min-width:0}\n.chat-main .thread{flex:1;padding:18px;overflow:auto;max-height:560px}\n.chat-main form{display:flex;gap:8px;padding:12px;border-top:1px solid var(--line-2)}\n@media (max-width:760px){.chat-layout{grid-template-columns:1fr}.chat-list{max-height:240px;border-right:0;border-bottom:1px solid var(--line-2)}}\n.lockscreen{max-width:420px;margin:60px auto;text-align:center;display:flex;flex-direction:column;gap:14px;align-items:center}\n.lockscreen .mark{width:58px;height:58px;border-radius:16px;background:var(--ink);color:#fff;display:grid;place-items:center}\n.lockscreen .mark .ic{width:26px;height:26px}\n.lockscreen form{width:100%;display:flex;flex-direction:column;gap:10px}\n.lines-table input{min-height:36px;padding:6px 9px}\n.sec-issue{display:flex;gap:10px;padding:10px 0;border-bottom:1px solid var(--line-2);font-size:14px}\n.sec-issue:last-child{border-bottom:0}\n.level{flex:none;width:62px}\n.kpis-flat{border:0;border-radius:0;border-top:1px solid var(--line-2)}\n.hbar-inline{display:inline-block;width:110px;vertical-align:middle}\n.logo-link{text-decoration:none;color:#fff}\n@media (min-width:961px){.shell{background:linear-gradient(to right,var(--asphalt) 248px,var(--bg) 248px)}}\n.side-foot{flex-wrap:wrap}\n.side-foot .who{flex:1 1 120px}\n.side-tools{display:flex;gap:2px;width:100%;justify-content:space-between;margin-top:6px}\nhtml,body{overflow-x:clip}\n\n.row-acts{display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end;min-width:150px}\n.row-acts .btn{white-space:nowrap}\n\n.checklist{list-style:none;margin:0;padding:0}\n.checklist code{font-weight:700}\n\n/* Notizen Buchhaltung */\n.acc-notes{display:flex;flex-direction:column;gap:10px}\n.pin-note{display:flex;gap:10px;align-items:flex-start;padding:11px 14px;border-radius:12px;background:var(--orange-wash);border:1px solid #ffd2b0;border-left:3px solid var(--orange)}\n.pin-note .ic{color:var(--orange);margin-top:2px}\n.note-form{display:flex;gap:8px;align-items:flex-end}\n.note-form textarea{flex:1;min-height:42px}\n.notes-tag{display:inline-flex!important;align-items:center;gap:4px;color:var(--steel)}\n.notes-tag .ic{width:13px;height:13px}\n.notes-tag.pinned{color:var(--orange-ink);font-weight:600}\n.acc-flag{display:inline-flex;align-items:center;gap:4px;font-size:11.5px;font-weight:700;color:var(--orange-ink);background:var(--orange-wash);border-radius:999px;padding:1px 8px;margin-left:6px}\n.acc-flag .ic{width:12px;height:12px}\n@media (max-width:640px){.note-form{flex-direction:column;align-items:stretch}}\n\n/* Angebotsauswahl */\n.score-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(140px,220px) 96px;gap:16px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line-2)}\n.score-l{display:flex;flex-direction:column;gap:2px}\n.score-row input[type=range]{accent-color:var(--orange);padding:0;min-height:0;border:0}\n.score-v{display:flex;align-items:center;gap:6px}\n.score-v input{width:70px;text-align:right}\n.sum-pill{font-weight:800;font-size:13px;border-radius:999px;padding:4px 12px}\n.sum-pill.ok{background:var(--green-wash);color:var(--green)}\n.sum-pill.bad{background:var(--red-wash);color:var(--red)}\n.score-bar{display:flex;height:12px;border-radius:6px;overflow:hidden;background:var(--line-2)}\n.score-bar i{display:block;height:100%}\n.sc-0{background:#ff6c01}.sc-1{background:#16171a}.sc-2{background:#1d4ed8}.sc-3{background:#0a7d3b}.sc-4{background:#9a5b00}.sc-5{background:#8a8d93}.sc-6{background:#c4291c}\n.score-detail{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px 14px;margin-top:10px;padding:10px 12px;border-radius:10px;background:var(--sunken);font-size:12.5px}\n.score-detail div{display:flex;justify-content:space-between;gap:8px}\n.score-detail b{font-variant-numeric:tabular-nums}\n@media (max-width:760px){.score-row{grid-template-columns:1fr 90px}.score-row input[type=range]{grid-column:1 / -1;order:3}}\n\n/* Finanzbuchhaltung */\n.kpi b.neg,td.neg{color:var(--red)}\n.kpi b.pos{color:var(--green)}\ntr.is-muted td{color:var(--steel-2)}\n.opening-list{display:flex;flex-direction:column;max-height:420px;overflow:auto;border:1px solid var(--line-2);border-radius:10px}\n.opening-row{display:grid;grid-template-columns:minmax(0,1fr) 140px;gap:12px;align-items:center;padding:8px 12px;border-bottom:1px solid var(--line-2);font-size:14px}\n.opening-row:last-child{border-bottom:0}\n.opening-row input{text-align:right;min-height:36px}\npre.sample{background:var(--sunken);border-radius:10px;padding:10px 12px;max-height:240px;overflow:auto}\n\n.fibu-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));overflow:hidden}\n.fibu-kpis .kpi{min-width:0;border-bottom:1px solid var(--line-2)}\n.fibu-kpis .kpi b{font-size:22px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n@media (max-width:900px){.fibu-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}\n.acct-cell div{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:190px}\n</style></head><body><div id=\"root\"></div><script nonce=\"__NONCE__\">'use strict';\n/* ===== Gemeinsame Bausteine f\u00fcr internes und Partner-Dashboard ===== */\nconst $ = (s, el = document) => el.querySelector(s);\nconst $$ = (s, el = document) => [...el.querySelectorAll(s)];\nclass Raw { constructor(s) { this.s = s; } toString() { return this.s; } }\nconst raw = (s) => new Raw(String(s ?? ''));\nconst esc = (s) => String(s ?? '').replace(/[&<>\"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', \"'\": '&#39;' }[c]));\nconst part = (v) => (v == null || v === false ? '' : v instanceof Raw ? v.s : Array.isArray(v) ? v.map(part).join('') : esc(v));\nconst html = (s, ...v) => raw(s.reduce((a, x, i) => a + x + (i < v.length ? part(v[i]) : ''), ''));\nconst when = (c, a, b) => (c ? a : b || '');\n\n/* ---------- Schnittstelle ---------- */\nconst App = { base: '/api', onAuth: null, config: {}, user: null };\nclass ApiError extends Error { constructor(status, msg) { super(msg); this.status = status; } }\nconst qs = (q) => { if (!q) return ''; const p = Object.entries(q).filter(([, v]) => v !== undefined && v !== null && v !== ''); return p.length ? '?' + p.map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&') : ''; };\nasync function api(method, path, body) {\n  const opt = { method, headers: { 'X-KFL': '1' }, credentials: 'same-origin' };\n  if (method !== 'GET') { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body || {}); }\n  let res;\n  try { res = await fetch(App.base + path, opt); } catch (e) { throw new ApiError(0, 'Keine Verbindung zum Server. Bitte pr\u00fcfe deine Internetverbindung.'); }\n  let j = null; try { j = await res.json(); } catch (e) { /* keine JSON-Antwort */ }\n  if (!res.ok || (j && j.ok === false)) {\n    const err = new ApiError(res.status, (j && j.error) || `Unerwarteter Fehler (${res.status}).`);\n    if (res.status === 401 && App.onAuth && !path.startsWith('/session') && !path.startsWith('/login')) App.onAuth();\n    if (res.status === 428 && App.onPw) App.onPw();\n    throw err;\n  }\n  return j;\n}\nconst GET = (p, q) => api('GET', p + qs(q));\nconst POST = (p, b) => api('POST', p, b);\nconst PATCH = (p, b) => api('PATCH', p, b);\nconst DEL = (p, b) => api('DELETE', p, b);\nconst fileUrl = (p, q) => App.base + p + qs(q);\n\n/* ---------- Format ---------- */\nconst TZ = 'Europe/Berlin';\nconst dtf = new Intl.DateTimeFormat('de-DE', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' });\nconst dtfT = new Intl.DateTimeFormat('de-DE', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });\nconst dtfH = new Intl.DateTimeFormat('de-DE', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });\nconst dtfL = new Intl.DateTimeFormat('de-DE', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });\nconst toDate = (v) => (v instanceof Date ? v : /^\\d{4}-\\d{2}-\\d{2}$/.test(v || '') ? new Date(v + 'T12:00:00Z') : new Date(v));\nconst fDate = (v) => (v ? dtf.format(toDate(v)) : '\u2013');\nconst fDT = (v) => (v ? dtfT.format(toDate(v)) : '\u2013');\nconst fTime = (v) => (v ? dtfH.format(toDate(v)) : '');\nconst fLong = (v) => dtfL.format(toDate(v || new Date()));\nconst eur = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });\nconst fEur = (n) => (n == null || n === '' || isNaN(+n) ? '\u2013' : eur.format(+n));\nconst fNum = (n, d = 0) => (n == null || isNaN(+n) ? '\u2013' : (+n).toLocaleString('de-DE', { maximumFractionDigits: d, minimumFractionDigits: 0 }));\nconst fPct = (n) => (n == null ? '\u2013' : fNum(n, 1) + ' %');\nfunction fRel(v) {\n  if (!v) return '';\n  const d = (Date.now() - toDate(v).getTime()) / 1000;\n  if (d < 60) return 'gerade eben';\n  if (d < 3600) return `vor ${Math.floor(d / 60)} Min.`;\n  if (d < 86400) return `vor ${Math.floor(d / 3600)} Std.`;\n  if (d < 7 * 86400) return `vor ${Math.floor(d / 86400)} ${Math.floor(d / 86400) === 1 ? 'Tag' : 'Tagen'}`;\n  return fDate(v);\n}\nfunction fLeft(v) {\n  if (!v) return '';\n  const d = (toDate(v).getTime() - Date.now()) / 60000;\n  if (d <= 0) return 'abgelaufen';\n  const h = Math.floor(d / 60), m = Math.floor(d % 60);\n  if (h >= 48) return `noch ${Math.floor(h / 24)} Tage`;\n  return h ? `noch ${h} Std. ${m} Min.` : `noch ${m} Min.`;\n}\nconst todayISO = () => new Intl.DateTimeFormat('sv-SE', { timeZone: TZ }).format(new Date());\nconst addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };\nfunction isoWeekOf(d = new Date()) { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day); const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return { week: Math.ceil(((t - y) / 86400e3 + 1) / 7), year: t.getUTCFullYear() }; }\nconst initials = (n) => String(n || '?').split(/\\s+/).filter(Boolean).slice(0, 2).map((x) => x[0].toUpperCase()).join('');\nconst plural = (n, one, many) => `${fNum(n)} ${n === 1 ? one : many}`;\nconst nl2br = (s) => raw(esc(s).replace(/\\n/g, '<br>'));\n\n/* ---------- Status ---------- */\nfunction statusOf(list, key) { return (list || []).find((s) => s.key === key) || { key, label: key || '\u2013', tone: 'neutral' }; }\nconst badge = (label, tone = 'neutral') => html`<span class=\"badge t-${tone}\">${label}</span>`;\nconst statusBadge = (list, key) => { const s = statusOf(list, key); return badge(s.label, s.tone || 'neutral'); };\n\n/* ---------- Icons (Linien, 24er Raster) ---------- */\nconst ICONS = {\n  home: '<path d=\"M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z\"/>',\n  inbox: '<path d=\"M3 13h5l1.5 3h5L16 13h5\"/><path d=\"M5 5h14l2 8v6H3v-6z\"/>',\n  euro: '<path d=\"M17 6.5A7 7 0 1 0 17 17.5\"/><path d=\"M4 10h9M4 14h9\"/>',\n  partner: '<path d=\"M3 21V8l6-4 6 4v13\"/><path d=\"M15 11h6v10\"/><path d=\"M7 11h4M7 15h4M3 21h18\"/>',\n  chart: '<path d=\"M4 20V10M10 20V4M16 20v-7M22 20H2\"/>',\n  support: '<circle cx=\"12\" cy=\"12\" r=\"9\"/><circle cx=\"12\" cy=\"12\" r=\"3.5\"/><path d=\"m5.6 5.6 3.9 3.9M14.5 14.5l3.9 3.9M18.4 5.6l-3.9 3.9M9.5 14.5l-3.9 3.9\"/>',\n  shield: '<path d=\"M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z\"/>',\n  gear: '<circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z\"/>',\n  news: '<path d=\"M4 5h13v14a2 2 0 0 0 2 2H6a2 2 0 0 1-2-2z\"/><path d=\"M17 9h3v10a2 2 0 0 1-2 2M8 9h5M8 13h5M8 17h3\"/>',\n  log: '<path d=\"M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01\"/>',\n  chat: '<path d=\"M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z\"/>',\n  logout: '<path d=\"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9\"/>',\n  plus: '<path d=\"M12 5v14M5 12h14\"/>',\n  search: '<circle cx=\"11\" cy=\"11\" r=\"7\"/><path d=\"m21 21-4.3-4.3\"/>',\n  check: '<path d=\"M20 6 9 17l-5-5\"/>',\n  x: '<path d=\"M18 6 6 18M6 6l12 12\"/>',\n  file: '<path d=\"M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z\"/><path d=\"M14 3v6h6\"/>',\n  download: '<path d=\"M12 3v12M7 10l5 5 5-5M4 21h16\"/>',\n  upload: '<path d=\"M12 21V9M7 14l5-5 5 5M4 3h16\"/>',\n  clock: '<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 7v5l3 2\"/>',\n  phone: '<path d=\"M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z\"/>',\n  mail: '<rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"2\"/><path d=\"m3 7 9 6 9-6\"/>',\n  car: '<path d=\"M5 17h14M3 13l2-5.5A2 2 0 0 1 6.9 6h10.2a2 2 0 0 1 1.9 1.5L21 13v4a1 1 0 0 1-1 1h-1M3 13v4a1 1 0 0 0 1 1h1M3 13h18\"/><circle cx=\"7\" cy=\"17\" r=\"2\"/><circle cx=\"17\" cy=\"17\" r=\"2\"/>',\n  user: '<circle cx=\"12\" cy=\"8\" r=\"4\"/><path d=\"M4 21a8 8 0 0 1 16 0\"/>',\n  users: '<circle cx=\"9\" cy=\"8\" r=\"3.5\"/><path d=\"M2 20a7 7 0 0 1 14 0M16 4.5a3.5 3.5 0 0 1 0 7M22 20a7 7 0 0 0-4-6.3\"/>',\n  lock: '<rect x=\"4\" y=\"11\" width=\"16\" height=\"10\" rx=\"2\"/><path d=\"M8 11V7a4 4 0 0 1 8 0v4\"/>',\n  eye: '<path d=\"M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>',\n  refresh: '<path d=\"M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5\"/>',\n  send: '<path d=\"M22 2 11 13M22 2l-7 20-4-9-9-4z\"/>',\n  link: '<path d=\"M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7\"/><path d=\"M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7\"/>',\n  flag: '<path d=\"M4 22V4M4 4h13l-2 4 2 4H4\"/>',\n  star: '<path d=\"m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2-5.5-2.9-5.5 2.9 1-6.2L3 9.6l6.2-.9z\"/>',\n  trophy: '<path d=\"M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z\"/><path d=\"M17 5h3a3 3 0 0 1-3 4M7 5H4a3 3 0 0 0 3 4\"/>',\n  bolt: '<path d=\"M13 2 4 14h7l-1 8 9-12h-7z\"/>',\n  menu: '<path d=\"M4 6h16M4 12h16M4 18h16\"/>',\n  bell: '<path d=\"M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0\"/>',\n  trash: '<path d=\"M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15\"/>',\n  edit: '<path d=\"M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z\"/>',\n  external: '<path d=\"M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6\"/>',\n  calendar: '<rect x=\"3\" y=\"4\" width=\"18\" height=\"18\" rx=\"2\"/><path d=\"M16 2v4M8 2v4M3 10h18\"/>',\n  note: '<path d=\"M4 4h16v12l-4 4H4z\"/><path d=\"M16 20v-4h4\"/>',\n  pin: '<path d=\"M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z\"/><circle cx=\"12\" cy=\"9\" r=\"2.5\"/>',\n  shop: '<path d=\"M4 7h16l-1.5 12a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2z\"/><path d=\"M9 7a3 3 0 0 1 6 0\"/>',\n  insta: '<rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"5\"/><circle cx=\"12\" cy=\"12\" r=\"4\"/><path d=\"M17.5 6.5h.01\"/>',\n  arrow: '<path d=\"M5 12h14M13 6l6 6-6 6\"/>',\n  back: '<path d=\"M19 12H5M11 18l-6-6 6-6\"/>',\n  alert: '<path d=\"M12 9v4M12 17h.01\"/><path d=\"M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z\"/>',\n  key: '<circle cx=\"7.5\" cy=\"15.5\" r=\"4.5\"/><path d=\"m10.7 12.3 9.8-9.8M17 6l3 3M14 9l2 2\"/>',\n  pause: '<rect x=\"6\" y=\"5\" width=\"4\" height=\"14\" rx=\"1\"/><rect x=\"14\" y=\"5\" width=\"4\" height=\"14\" rx=\"1\"/>'\n};\nconst icon = (n, cls = '') => raw(`<svg class=\"ic ${cls}\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\">${ICONS[n] || ''}</svg>`);\nconst LOGO = raw('<span class=\"logo\" aria-label=\"KFL \u2013 Kaufen Finanzieren Leasen\"><b>KFL</b><i></i></span>');\n\n/* ---------- Aktionen (CSP-konform ohne Inline-Handler) ---------- */\nconst ACT = {}, SUBMIT = {}, CHANGE = {}, INPUT = {};\nasync function run(fn, btn) {\n  if (btn) { if (btn.dataset.busy) return; btn.dataset.busy = '1'; btn.classList.add('is-busy'); }\n  try { return await fn(); }\n  catch (e) { console.error(e); toast(e.message || 'Das hat nicht geklappt.', 'err'); }\n  finally { if (btn) { delete btn.dataset.busy; btn.classList.remove('is-busy'); } }\n}\ndocument.addEventListener('click', (e) => {\n  const t = e.target.closest('[data-act]'); if (!t || t.disabled) return;\n  const fn = ACT[t.dataset.act]; if (!fn) return;\n  e.preventDefault(); run(() => fn(t, e), t.tagName === 'BUTTON' ? t : null);\n});\ndocument.addEventListener('submit', (e) => {\n  const f = e.target.closest('form[data-submit]'); if (!f) return;\n  e.preventDefault();\n  const fn = SUBMIT[f.dataset.submit]; if (!fn) return;\n  const btn = f.querySelector('button[type=submit]') || e.submitter;\n  run(() => fn(formData(f), f, e.submitter), btn);\n});\ndocument.addEventListener('change', (e) => { const t = e.target.closest('[data-change]'); if (t && CHANGE[t.dataset.change]) run(() => CHANGE[t.dataset.change](t, e)); });\nlet inputTimer = null;\ndocument.addEventListener('input', (e) => { const t = e.target.closest('[data-input]'); if (!t || !INPUT[t.dataset.input]) return; clearTimeout(inputTimer); inputTimer = setTimeout(() => run(() => INPUT[t.dataset.input](t, e)), 320); });\n\nfunction formData(f) {\n  const o = {};\n  for (const el of f.elements) {\n    if (!el.name || el.disabled) continue;\n    const multi = el.name.endsWith('[]'), k = multi ? el.name.slice(0, -2) : el.name;\n    if (el.type === 'checkbox') { if (multi) { o[k] = o[k] || []; if (el.checked) o[k].push(el.value); } else o[k] = el.checked; continue; }\n    if (el.type === 'radio') { if (el.checked) o[k] = el.value; continue; }\n    if (el.type === 'file') continue;\n    if (el.tagName === 'SELECT' && el.multiple) { o[k] = [...el.selectedOptions].map((x) => x.value); continue; }\n    if (multi) { (o[k] = o[k] || []).push(el.value); continue; }\n    o[k] = el.value;\n  }\n  return o;\n}\nconst fileToB64 = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(file); });\nasync function fileField(input, { max = 10 } = {}) {\n  const f = input && input.files && input.files[0]; if (!f) return null;\n  if (f.size > max * 1024 * 1024) throw new Error(`Die Datei ist zu gro\u00df (max. ${max} MB).`);\n  return { name: f.name, type: f.type || 'application/pdf', base64: await fileToB64(f) };\n}\n\n/* ---------- R\u00fcckmeldungen ---------- */\nfunction toast(msg, tone = 'ok') {\n  let box = $('#toasts'); if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }\n  const t = document.createElement('div'); t.className = 'toast t-' + tone; t.innerHTML = part(html`${icon(tone === 'err' ? 'alert' : 'check')}<span>${msg}</span>`);\n  box.appendChild(t); requestAnimationFrame(() => t.classList.add('in'));\n  setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 300); }, tone === 'err' ? 6000 : 3200);\n}\nlet modalStack = [];\nfunction modal({ title, body, foot, wide, onClose, cls = '' }) {\n  const wrap = document.createElement('div');\n  wrap.className = 'modal-wrap';\n  wrap.innerHTML = part(html`<div class=\"modal ${wide ? 'is-wide' : ''} ${cls}\" role=\"dialog\" aria-modal=\"true\" aria-label=\"${title || 'Dialog'}\">\n    <header class=\"modal-head\"><h2>${title}</h2><button class=\"icon-btn\" data-close aria-label=\"Schlie\u00dfen\">${icon('x')}</button></header>\n    <div class=\"modal-body\">${body}</div>${foot ? html`<footer class=\"modal-foot\">${foot}</footer>` : ''}</div>`);\n  document.body.appendChild(wrap); document.body.classList.add('has-modal');\n  const prev = document.activeElement;\n  const close = () => { wrap.classList.remove('in'); setTimeout(() => wrap.remove(), 180); modalStack = modalStack.filter((m) => m !== api); if (!modalStack.length) document.body.classList.remove('has-modal'); if (prev && prev.focus) prev.focus(); if (onClose) onClose(); };\n  const api = { el: wrap, close, set(bodyHtml) { $('.modal-body', wrap).innerHTML = part(bodyHtml); hydrate(wrap); } };\n  wrap.addEventListener('click', (e) => { if (e.target === wrap || e.target.closest('[data-close]')) close(); });\n  modalStack.push(api);\n  requestAnimationFrame(() => { wrap.classList.add('in'); const f = wrap.querySelector('[autofocus], input:not([type=hidden]), select, textarea, button.btn'); if (f) f.focus(); });\n  hydrate(wrap);\n  return api;\n}\ndocument.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modalStack.length) modalStack[modalStack.length - 1].close(); });\nfunction closeModal() { if (modalStack.length) modalStack[modalStack.length - 1].close(); }\n// Formular im Dialog: resolve mit Daten oder null\nfunction ask({ title, text, fields = raw(''), ok = 'Best\u00e4tigen', danger = false, wide = false }) {\n  return new Promise((resolve) => {\n    let done = false;\n    const id = 'f' + Math.random().toString(36).slice(2);\n    const m = modal({ title, wide, body: html`<form id=\"${id}\" class=\"stack\">${text ? html`<p class=\"lead\">${text}</p>` : ''}${fields}</form>`,\n      foot: html`<button class=\"btn btn-ghost\" data-close type=\"button\">Abbrechen</button><button class=\"btn ${danger ? 'btn-danger' : 'btn-primary'}\" type=\"submit\" form=\"${id}\">${ok}</button>`,\n      onClose: () => { if (!done) resolve(null); } });\n    $('#' + id, m.el).addEventListener('submit', (e) => { e.preventDefault(); const f = e.target; if (!f.reportValidity()) return; done = true; const d = formData(f); d._form = f; resolve(d); m.close(); });\n  });\n}\nconst confirmBox = (title, text, ok = 'Ja, fortfahren', danger = false) => ask({ title, text, ok, danger }).then((r) => !!r);\n\n/* ---------- Formularfelder ---------- */\nfunction field(label, input, hint) { return html`<label class=\"field\"><span class=\"field-label\">${label}</span>${input}${hint ? html`<span class=\"field-hint\">${hint}</span>` : ''}</label>`; }\nconst inp = (name, value = '', { type = 'text', ph = '', req = false, attrs = '' } = {}) => raw(`<input name=\"${esc(name)}\" type=\"${type}\" value=\"${esc(value ?? '')}\" placeholder=\"${esc(ph)}\" ${req ? 'required' : ''} ${attrs}>`);\nconst area = (name, value = '', { rows = 4, ph = '', req = false } = {}) => raw(`<textarea name=\"${esc(name)}\" rows=\"${rows}\" placeholder=\"${esc(ph)}\" ${req ? 'required' : ''}>${esc(value ?? '')}</textarea>`);\nfunction sel(name, options, value, { attrs = '', empty } = {}) {\n  const opts = (Array.isArray(options) ? options : Object.entries(options).map(([k, v]) => [k, v])).map((o) => (Array.isArray(o) ? o : typeof o === 'object' ? [o.key ?? o.value, o.label] : [o, o]));\n  return raw(`<select name=\"${esc(name)}\" ${attrs}>${empty !== undefined ? `<option value=\"\">${esc(empty)}</option>` : ''}${opts.map(([k, l]) => `<option value=\"${esc(k)}\" ${String(k) === String(value ?? '') ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`);\n}\nconst chk = (name, checked, label, value) => html`<label class=\"check\"><input type=\"checkbox\" name=\"${name}\" ${value !== undefined ? raw(`value=\"${esc(value)}\"`) : ''} ${checked ? raw('checked') : ''}><span>${label}</span></label>`;\n\n/* ---------- Diagramme (SVG) ---------- */\nfunction barChart(rows, { h = 160, valueFmt = fNum } = {}) {\n  if (!rows.length) return html`<div class=\"empty-sm\">Keine Daten im Zeitraum.</div>`;\n  const max = Math.max(1, ...rows.map((r) => r.value)), step = Math.ceil(rows.length / 10);\n  return html`<div class=\"cols\" data-hpx=\"${h}\">${rows.map((r, i) => html`<div class=\"col\" title=\"${r.label}: ${valueFmt(r.value)}${r.second != null ? ' \u00b7 ' + valueFmt(r.second) : ''}\"><span class=\"col-v\">${r.value ? valueFmt(r.value) : ''}</span>\n    <span class=\"col-bar\" data-h=\"${Math.round((r.value / max) * 80)}\">${r.second ? html`<i data-h=\"${Math.round((r.second / Math.max(1, r.value)) * 100)}\"></i>` : ''}</span><span class=\"col-l\">${i % step === 0 ? r.short || r.label : ''}</span></div>`)}</div>`;\n}\nfunction hbars(rows, { fmt = fNum } = {}) {\n  if (!rows.length) return html`<div class=\"empty-sm\">Keine Daten im Zeitraum.</div>`;\n  const max = Math.max(1, ...rows.map((r) => r.value));\n  return html`<div class=\"hbars\">${rows.map((r) => html`<div class=\"hbar\"><span class=\"hbar-l\">${r.label}</span><span class=\"hbar-track\"><i data-w=\"${Math.round((r.value / max) * 100)}\"></i></span><span class=\"hbar-v num\">${fmt(r.value)}</span></div>`)}</div>`;\n}\nfunction ring(pct, { size = 64, stroke = 7, label = '' } = {}) {\n  const r = (size - stroke) / 2, c = 2 * Math.PI * r, p = Math.max(0, Math.min(1, pct));\n  return raw(`<svg class=\"ring\" width=\"${size}\" height=\"${size}\" viewBox=\"0 0 ${size} ${size}\" role=\"img\" aria-label=\"${esc(label)}\"><circle cx=\"${size / 2}\" cy=\"${size / 2}\" r=\"${r}\" class=\"ring-bg\" stroke-width=\"${stroke}\" fill=\"none\"/><circle cx=\"${size / 2}\" cy=\"${size / 2}\" r=\"${r}\" class=\"ring-fg\" stroke-width=\"${stroke}\" fill=\"none\" stroke-dasharray=\"${c}\" stroke-dashoffset=\"${c * (1 - p)}\" transform=\"rotate(-90 ${size / 2} ${size / 2})\" stroke-linecap=\"round\"/></svg>`);\n}\n// Breiten \u00fcber CSSOM setzen (Inline-Styles sind per CSP gesperrt)\nfunction hydrate(root = document) { for (const el of root.querySelectorAll('[data-w]')) el.style.width = el.dataset.w + '%'; for (const el of root.querySelectorAll('[data-h]')) el.style.height = Math.max(+el.dataset.h, +el.dataset.h ? 2 : 0) + '%'; for (const el of root.querySelectorAll('[data-hpx]')) el.style.height = el.dataset.hpx + 'px'; }\nfunction render(el, content) { if (typeof el === 'string') el = $(el); if (!el) return; el.innerHTML = part(content); hydrate(el); }\nconst delta = (cur, prev, { invert = false } = {}) => {\n  if (prev == null || cur == null) return '';\n  if (!prev && !cur) return html`<span class=\"delta\">\u00b10</span>`;\n  if (!prev) return html`<span class=\"delta up\">neu</span>`;\n  const d = ((cur - prev) / Math.abs(prev)) * 100, good = invert ? d < 0 : d > 0;\n  return html`<span class=\"delta ${d === 0 ? '' : good ? 'up' : 'down'}\">${d > 0 ? '+' : ''}${fNum(d, 0)} %</span>`;\n};\n\n/* ---------- Router ---------- */\nconst Router = {\n  routes: [], current: null,\n  on(re, fn) { this.routes.push([re, fn]); return this; },\n  go(h) { if (location.hash === h) this.resolve(); else location.hash = h; },\n  async resolve() {\n    const h = location.hash || '#/';\n    for (const [re, fn] of this.routes) { const m = h.match(re); if (m) { this.current = h; await run(() => fn(...m.slice(1))); return; } }\n    if (this.fallback) await run(() => this.fallback(h));\n  }\n};\nwindow.addEventListener('hashchange', () => { [...modalStack].reverse().forEach((m) => m.close()); Router.resolve(); });\n\n/* ---------- Kleinteile ---------- */\nconst empty = (title, text, action) => html`<div class=\"empty\"><div class=\"empty-mark\">${icon('inbox')}</div><strong>${title}</strong>${text ? html`<p>${text}</p>` : ''}${action || ''}</div>`;\nconst loading = () => html`<div class=\"loading\" aria-busy=\"true\"><span class=\"spinner\"></span>Wird geladen \u2026</div>`;\nconst kv = (rows) => html`<dl class=\"kv\">${rows.filter((r) => r && r[1] !== undefined && r[1] !== null && r[1] !== '').map(([k, v]) => html`<dt>${k}</dt><dd>${v}</dd>`)}</dl>`;\nconst avatar = (name, cls = '') => html`<span class=\"avatar ${cls}\" aria-hidden=\"true\">${initials(name)}</span>`;\nfunction copyText(t) { return navigator.clipboard ? navigator.clipboard.writeText(t).then(() => toast('In die Zwischenablage kopiert.')) : Promise.resolve(); }\nACT.copy = (b) => copyText(b.dataset.text);\nACT.closeModal = () => closeModal();\nfunction pwStrength(pw) { let s = 0; if ((pw || '').length >= 10) s++; if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++; if (/\\d/.test(pw)) s++; if (/[^A-Za-z0-9]/.test(pw) || (pw || '').length >= 14) s++; return s; }\nconst PW_HINT = 'Mindestens 10 Zeichen mit Buchstaben und Zahlen.';\n\n/* ---------- Angebote ---------- */\nconst OFFER_KIND = { kauf: 'Kauf', leasing: 'Leasing', finanzierung: 'Finanzierung', ankauf: 'Ankauf' };\nconst OFFER_STATUS = { eingereicht: ['Eingereicht', 'info'], vorgestellt: ['Dem Kunden vorgestellt', 'ok-light'], nicht_ausgewaehlt: ['Nicht ausgew\u00e4hlt', 'muted'], angenommen: ['Vom Kunden angenommen', 'ok'], abgelehnt_kunde: ['Vom Kunden abgelehnt', 'muted'] };\nconst offerStatus = (s) => badge(...(OFFER_STATUS[s] || [s, 'neutral']));\nconst OFFER_LABELS = [\n  ['config', 'Konfiguration', (v) => (v === 'gleich' ? 'Wie angefragt' : v === 'alternativ' ? 'Alternative Konfiguration' : v)],\n  ['herstellercode', 'Herstellercode'], ['equipment_match', 'Ausstattung wie angefragt', (v) => (v === 'ja' ? 'Ja' : v === 'nein' ? 'Nein' : v)],\n  ['price', 'Kaufpreis', fEur], ['buy_price', 'Ankaufpreis', fEur], ['monthly_rate', 'Monatliche Rate', fEur], ['down_payment', 'Anzahlung', fEur], ['final_rate', 'Schlussrate', fEur],\n  ['km_per_year', 'Kilometer pro Jahr', (v) => fNum(v) + ' km'], ['term_months', 'Laufzeit', (v) => v + ' Monate'],\n  ['transfer_cost', '\u00dcberf\u00fchrung und Zulassung', fEur], ['service_cost', 'Servicepaket (monatlich)', fEur], ['insurance_cost', 'Versicherung / Kasko (monatlich)', fEur],\n  ['vat_mode', 'Preisangaben', (v) => (v === 'netto' ? 'Netto (gewerblich)' : 'Brutto')], ['delivery', 'Lieferzeit / Verf\u00fcgbarkeit'],\n  ['first_registration', 'Erstzulassung'], ['mileage', 'Kilometerstand', (v) => fNum(v) + ' km'], ['upe', 'UPE (Listenpreis)', fEur], ['accident_free', 'Unfallfrei', (v) => (v === 'ja' || v === true ? 'Ja' : v === 'nein' || v === false ? 'Nein' : v)], ['owners', 'Vorbesitzer'],\n  ['pickup', 'Abholung'], ['valid_until', 'G\u00fcltig bis', fDate], ['notes', 'Anmerkungen']\n];\nfunction offerRows(d) { return OFFER_LABELS.filter(([k]) => d[k] !== undefined && d[k] !== null && d[k] !== '').map(([k, l, f]) => [l, f ? f(d[k]) : d[k]]); }\nconst offerHeadline = (d) => (d.monthly_rate ? html`${fEur(d.monthly_rate)} <span class=\"small muted\">/ Monat</span>` : d.price ? fEur(d.price) : d.buy_price ? fEur(d.buy_price) : '\u2013');\n\nfunction hashQuery() { const i = location.hash.indexOf('?'); return i < 0 ? {} : Object.fromEntries(new URLSearchParams(location.hash.slice(i + 1))); }\n\n/* ===== Internes Dashboard: Grundger\u00fcst, Anmeldung, Navigation ===== */\nApp.base = '/api';\nconst S = { user: null, config: {}, kpis: {}, unread: 0, lastHash: null };\nconst can = (p) => !!S.user && S.user.perms.includes(p);\nconst canAny = (...ps) => ps.some(can);\nconst isAdmin = () => S.user && S.user.role === 'admin';\nconst RS = () => S.config.requestStatuses || [];\nconst AS = () => S.config.assignStatuses || [];\nconst roleLabel = (k) => ((S.config.roles || {})[k] || {}).label || k;\nconst typeLabel = (k) => ((S.config.requestTypes || {})[k] || {}).label || k;\nconst typeShort = (k) => ((S.config.requestTypes || {})[k] || {}).short || k;\n\nconst NAV = [\n  { key: 'start', href: '#/', label: 'Start', icon: 'home' },\n  { key: 'anfragen', href: '#/anfragen', label: 'Anfragen', icon: 'inbox', perm: ['req_view'], count: 'open' },\n  { key: 'buchhaltung', href: '#/buchhaltung', label: 'Buchhaltung', icon: 'euro', perm: ['acc_view'], count: 'bill' },\n  { key: 'fibu', href: '#/fibu', label: 'Finanzbuchhaltung', icon: 'file', perm: ['fibu_view'] },\n  { key: 'partner', href: '#/partner', label: 'Gesch\u00e4ftspartner', icon: 'partner', perm: ['partner_view'] },\n  { key: 'statistik', href: '#/statistik', label: 'Statistik', icon: 'chart', perm: ['stats_view', 'team_stats', 'partner_stats'] },\n  { key: 'support', href: '#/support', label: 'Support', icon: 'support', perm: ['support_view'], count: 'tickets' },\n  { key: 'news', href: '#/news', label: 'News & Chat', icon: 'news', count: 'unread' },\n  { sep: true },\n  { key: 'verwaltung', href: '#/verwaltung', label: 'Verwaltung', icon: 'gear', perm: ['users_view', 'users_create', 'users_create_vt', 'users_admin', 'settings_all', 'acc_settings', 'links_view'] },\n  { key: 'backup', href: '#/backup', label: 'Backup', icon: 'shield', perm: ['backup_view'] },\n  { key: 'protokoll', href: '#/protokoll', label: 'Protokoll', icon: 'log', perm: ['audit_view'] }\n];\nconst navVisible = (n) => !n.perm || n.perm.some(can);\n\nfunction shell(active) {\n  if (!$('#main')) {\n    render('#root', html`<div class=\"shell\">\n      <aside class=\"side\" id=\"side\">\n        <a href=\"#/\" class=\"logo-link\">${LOGO}</a><div class=\"side-sub\">Internes Dashboard</div>\n        <nav class=\"nav\" id=\"nav\" aria-label=\"Hauptnavigation\"></nav>\n        <div class=\"side-foot\">${avatar(S.user.name, 'alt')}<div class=\"who\"><b>${S.user.name}</b><span>${S.user.roleLabel}</span></div><div class=\"side-tools\">\n          <button class=\"icon-btn\" data-act=\"myPassword\" title=\"Passwort \u00e4ndern\" aria-label=\"Passwort \u00e4ndern\">${icon('key')}</button>\n          <button class=\"icon-btn\" data-act=\"newTicket\" title=\"Support kontaktieren\" aria-label=\"Support kontaktieren\">${icon('support')}</button>\n          <button class=\"icon-btn\" data-act=\"logout\" title=\"Abmelden\" aria-label=\"Abmelden\">${icon('logout')}</button></div></div>\n      </aside>\n      <div class=\"content\"><div class=\"topbar\"><button class=\"icon-btn\" data-act=\"toggleNav\" aria-label=\"Men\u00fc\">${icon('menu')}</button>${LOGO}<span class=\"spacer\"></span><a class=\"icon-btn\" href=\"#/news\" aria-label=\"News\">${icon('bell')}</a></div>\n      <main class=\"main\" id=\"main\" tabindex=\"-1\"></main></div></div>`);\n  }\n  S.active = active;\n  renderNav();\n  document.body.classList.remove('nav-open');\n}\nfunction renderNav() {\n  const counts = { open: S.kpis.open, bill: S.kpis.bill, tickets: S.kpis.tickets, unread: S.unread };\n  const hot = { open: S.kpis.notes > 0, tickets: false, unread: S.unread > 0, bill: S.kpis.bill > 0 };\n  render('#nav', NAV.filter((n) => n.sep || navVisible(n)).map((n) => n.sep ? html`<div class=\"nav-sep\"></div>` :\n    html`<a href=\"${n.href}\" class=\"${S.active === n.key ? 'on' : ''}\" ${S.active === n.key ? raw('aria-current=\"page\"') : ''}>${icon(n.icon)}<span>${n.label}</span>${n.count && counts[n.count] ? html`<span class=\"count ${hot[n.count] ? 'hot' : ''}\">${counts[n.count] > 99 ? '99+' : counts[n.count]}</span>` : ''}</a>`));\n}\nACT.toggleNav = () => document.body.classList.toggle('nav-open');\n\n// Seitenwechsel: Ladezustand, Schutz gegen veraltete Antworten, Scrollposition bei Aktualisierung\nlet pageTok = 0;\nfunction page(navKey) {\n  shell(navKey);\n  const soft = S.lastHash === location.hash;\n  S.lastHash = location.hash;\n  const t = ++pageTok, y = window.scrollY;\n  if (!soft) { render('#main', loading()); window.scrollTo(0, 0); }\n  return { alive: () => t === pageTok, show: (c) => { if (t !== pageTok) return; render('#main', c); if (soft) window.scrollTo(0, y); } };\n}\nconst reload = () => Router.resolve();\nconst head = (title, sub, actions, crumb) => html`${crumb ? html`<a class=\"crumb\" href=\"${crumb[0]}\">${icon('back')}${crumb[1]}</a>` : ''}<div class=\"page-head\"><div><h1>${title}</h1>${sub ? html`<p class=\"sub\">${sub}</p>` : ''}</div>${actions ? html`<div class=\"actions\">${actions}</div>` : ''}</div>`;\nconst tabsBar = (items, cur) => html`<div class=\"tabs\" role=\"tablist\">${items.filter(Boolean).map(([k, label, href, n]) => html`<a class=\"tab ${k === cur ? 'on' : ''}\" href=\"${href}\" role=\"tab\" aria-selected=\"${k === cur}\">${label}${n ? html`<span class=\"count\">${n}</span>` : ''}</a>`)}</div>`;\nconst noAccess = () => html`${head('Kein Zugriff')}<div class=\"panel\"><div class=\"panel-body\">${empty('Dieser Bereich ist f\u00fcr deine Rolle nicht freigegeben.', 'Wende dich an die Administration, wenn du Zugriff brauchst.')}</div></div>`;\nfunction setHashQuery(q, base) { const b = base || location.hash.split('?')[0]; const s = qs(q); if (b + s !== location.hash) location.hash = b + s; else reload(); }\n\n/* ---------- Sitzung ---------- */\nasync function loadSession() {\n  const s = await GET('/session');\n  S.config = s.config; S.user = s.user; S.mailReady = s.mailReady !== false; App.config = s.config;\n  return s;\n}\nasync function refreshCounts() {\n  if (!S.user) return;\n  try {\n    const d = await GET('/me/start');\n    S.kpis = d.kpis || {};\n    S.unread = (d.news.notifications || []).filter((n) => !n.read).length + (d.news.posts || []).filter((p) => !p.read).length + (d.chats || []).reduce((a, c) => a + (c.unread || 0), 0);\n    S.start = d;\n    if ($('#nav')) renderNav();\n    return d;\n  } catch (e) { return null; }\n}\nApp.onAuth = () => { S.user = null; authScreen(); };\nApp.onPw = () => forcePasswordScreen();\n\n/* ---------- Anmeldung ---------- */\nfunction authFrame(inner) {\n  render('#root', html`<div class=\"auth\">\n    <section class=\"auth-art\"><div class=\"stripes\" aria-hidden=\"true\"><span></span><span></span><span></span></div>\n      <div>${LOGO}</div>\n      <div><h1>Jede Anfrage verdient den besten Deal.</h1><p>Das interne Dashboard der KFL GbR: Anfragen, Partner, Buchhaltung und Support an einem Ort.</p></div>\n      <div class=\"foot\">KFL GbR \u00b7 Kaufen Finanzieren Leasen \u00b7 ${new Date().getFullYear()}</div></section>\n    <section class=\"auth-form\">${inner}</section></div>`);\n  const f = $('.auth-form input'); if (f) f.focus();\n}\nconst supportHelp = () => html`<div class=\"auth-help\">${icon('support')}<span>Probleme bei der Anmeldung?</span><span class=\"spacer\"></span><button class=\"btn btn-sm\" type=\"button\" data-act=\"loginSupport\">Support kontaktieren</button></div>`;\nfunction authScreen(msg) {\n  authFrame(html`<div><h2>Anmelden</h2><p class=\"muted\">Mit deiner KFL-E-Mail-Adresse und deinem Passwort.</p></div>\n    ${msg ? html`<div class=\"info-box\">${icon('check')}<span>${msg}</span></div>` : ''}\n    <form class=\"stack\" data-submit=\"login\">\n      ${field('E-Mail', inp('email', '', { type: 'email', req: true, attrs: 'autocomplete=\"username\"' }))}\n      ${field('Passwort', inp('password', '', { type: 'password', req: true, attrs: 'autocomplete=\"current-password\"' }))}\n      <button class=\"btn btn-primary btn-block\" type=\"submit\">Anmelden</button></form>\n    ${supportHelp()}\n    <p class=\"tiny muted\">Passwort vergessen? Die Administration schickt dir einen neuen Link. Nach 5 Fehlversuchen wird das Konto f\u00fcr 15 Minuten gesperrt.</p>`);\n}\nSUBMIT.login = async (d) => { const r = await POST('/login', d); if (r.mustChangePw) return forcePasswordScreen(); await boot(); };\nfunction setupScreen(s) {\n  authFrame(html`<div><h2>Ersteinrichtung</h2><p class=\"muted\">Lege das erste Admin-Konto an. Den Einrichtungsschl\u00fcssel findest du in den Cloudflare-Secrets (SETUP_TOKEN).</p></div>\n    ${!s.setupConfigured ? html`<div class=\"err-box\">${icon('alert')}<span>Es ist noch kein SETUP_TOKEN hinterlegt. Bitte zuerst in Cloudflare als Secret anlegen.</span></div>` : ''}\n    <form class=\"stack\" data-submit=\"setup\">\n      ${field('Einrichtungsschl\u00fcssel', inp('token', '', { type: 'password', req: true }))}\n      ${field('Dein Name', inp('name', '', { req: true }))}\n      ${field('E-Mail', inp('email', '', { type: 'email', req: true }))}\n      ${field('Passwort', inp('password', '', { type: 'password', req: true, attrs: 'minlength=\"10\" autocomplete=\"new-password\"' }), PW_HINT)}\n      <button class=\"btn btn-primary btn-block\" type=\"submit\">Admin-Konto anlegen</button></form>`);\n}\nSUBMIT.setup = async (d) => { await POST('/setup', d); await boot(); };\nasync function inviteScreen(token) {\n  let info;\n  try { info = await GET('/invite/check', { token }); } catch (e) { return authFrame(html`<div><h2>Link nicht mehr g\u00fcltig</h2></div><div class=\"err-box\">${icon('alert')}<span>${e.message}</span></div><a class=\"btn\" href=\"#/\">Zur Anmeldung</a>${supportHelp()}`); }\n  authFrame(html`<div><h2>Willkommen, ${info.name}</h2><p class=\"muted\">Lege dein Passwort f\u00fcr ${info.email} fest.</p></div>\n    <form class=\"stack\" data-submit=\"invite\"><input type=\"hidden\" name=\"token\" value=\"${token}\">\n      ${field('Neues Passwort', inp('password', '', { type: 'password', req: true, attrs: 'minlength=\"10\" autocomplete=\"new-password\"' }), PW_HINT)}\n      ${field('Passwort wiederholen', inp('password2', '', { type: 'password', req: true, attrs: 'minlength=\"10\" autocomplete=\"new-password\"' }))}\n      <button class=\"btn btn-primary btn-block\" type=\"submit\">Passwort speichern und starten</button></form>`);\n}\nSUBMIT.invite = async (d) => { if (d.password !== d.password2) throw new Error('Die Passw\u00f6rter stimmen nicht \u00fcberein.'); await POST('/invite/accept', d); history.replaceState(null, '', '#/'); await boot(); };\nfunction forcePasswordScreen() {\n  authFrame(html`<div><h2>Eigenes Passwort vergeben</h2><p class=\"muted\">Du hast ein vorl\u00e4ufiges Passwort erhalten. Bitte lege jetzt dein eigenes fest.</p></div>\n    <form class=\"stack\" data-submit=\"forcePw\">\n      ${field('Vorl\u00e4ufiges Passwort', inp('current', '', { type: 'password', req: true }))}\n      ${field('Neues Passwort', inp('next', '', { type: 'password', req: true, attrs: 'minlength=\"10\" autocomplete=\"new-password\"' }), PW_HINT)}\n      ${field('Neues Passwort wiederholen', inp('next2', '', { type: 'password', req: true }))}\n      <button class=\"btn btn-primary btn-block\" type=\"submit\">Passwort speichern</button></form>`);\n}\nSUBMIT.forcePw = async (d) => { if (d.next !== d.next2) throw new Error('Die Passw\u00f6rter stimmen nicht \u00fcberein.'); await POST('/password', d); await boot(); };\nconst SUPPORT_TOPICS = ['Anmeldung / Zugang', 'Passwort vergessen', 'Technisches Problem', 'Fehlermeldung im Dashboard', 'Sonstiges'];\nACT.loginSupport = async () => {\n  const d = await ask({ title: 'Support kontaktieren', text: 'Beschreib kurz dein Anliegen. Das Support-Team meldet sich per E-Mail.', ok: 'Anfrage senden',\n    fields: html`${field('Name', inp('name', '', { req: true }))}${field('E-Mail', inp('email', '', { type: 'email', req: true }))}\n      ${field('Thema', sel('topic', SUPPORT_TOPICS, SUPPORT_TOPICS[0]))}${field('Nachricht', area('message', '', { rows: 5, req: true }))}\n      <input class=\"sr\" name=\"website\" tabindex=\"-1\" autocomplete=\"off\" aria-hidden=\"true\">` });\n  if (!d) return;\n  const r = await POST('/support', d);\n  toast(r.number ? `Danke! Deine Anfrage #${r.number} ist beim Support eingegangen.` : 'Danke! Deine Anfrage ist eingegangen.');\n};\nACT.logout = async () => { await POST('/logout'); S.user = null; S.lastHash = null; authScreen('Du wurdest abgemeldet.'); };\nACT.myPassword = async () => {\n  const d = await ask({ title: 'Passwort \u00e4ndern', ok: 'Passwort speichern', fields: html`${field('Aktuelles Passwort', inp('current', '', { type: 'password', req: true }))}\n    ${field('Neues Passwort', inp('next', '', { type: 'password', req: true, attrs: 'minlength=\"10\"' }), PW_HINT)}${field('Neues Passwort wiederholen', inp('next2', '', { type: 'password', req: true }))}` });\n  if (!d) return;\n  if (d.next !== d.next2) throw new Error('Die Passw\u00f6rter stimmen nicht \u00fcberein.');\n  await POST('/password', d); toast('Passwort ge\u00e4ndert. Andere Sitzungen wurden abgemeldet.');\n};\nACT.newTicket = async () => {\n  const d = await ask({ title: 'Support kontaktieren', text: 'Technisches Problem oder Frage zum Dashboard? Das Ticket l\u00e4uft mit dem Tag \u201eIntern\u201c im Support ein.', ok: 'Ticket senden',\n    fields: html`${field('Betreff', inp('subject', '', { req: true }))}${field('Kategorie', sel('category', ['Technisches Problem', 'Fehlermeldung im Dashboard', 'Zugang / Rechte', 'Frage', 'Sonstiges'], 'Technisches Problem'))}\n      ${field('Priorit\u00e4t', sel('priority', [['normal', 'Normal'], ['hoch', 'Hoch'], ['dringend', 'Dringend']], 'normal'))}${field('Beschreibung', area('text', '', { rows: 5, req: true }))}` });\n  if (!d) return;\n  const r = await POST('/tickets', d); toast(`Ticket #${r.id} wurde angelegt. Antworten erscheinen in deinen News.`);\n};\n\n/* ---------- Gesch\u00fctzte Bereiche (Protokoll, Backup) ---------- */\nfunction lockScreen(title, what) {\n  return html`${head(title)}<div class=\"lockscreen\"><div class=\"mark\">${icon('lock')}</div><h2>${title} ist zus\u00e4tzlich gesch\u00fctzt</h2>\n    <p class=\"muted\">${what} Gib das Bereichspasswort ein. Der Bereich bleibt danach 30 Minuten entsperrt.</p>\n    <form data-submit=\"areaUnlock\">${field('Bereichspasswort', inp('password', '', { type: 'password', req: true, attrs: 'autocomplete=\"off\"' }))}<button class=\"btn btn-dark btn-block\" type=\"submit\">Entsperren</button></form></div>`;\n}\nSUBMIT.areaUnlock = async (d) => { await POST('/area/unlock', d); await loadSession(); toast('Bereich entsperrt.'); reload(); };\nACT.areaLock = async () => { await POST('/area/lock'); await loadSession(); reload(); };\nasync function guarded(fn, title, what) {\n  try { return await fn(); }\n  catch (e) { if (e.status === 423) { S.user.areaUnlocked = false; render('#main', lockScreen(title, what)); return null; } throw e; }\n}\n\n/* ---------- Start ---------- */\nasync function boot() {\n  const s = await loadSession();\n  if (s.needsSetup) return setupScreen(s);\n  if (!s.user) return authScreen();\n  if (s.user.mustChangePw) return forcePasswordScreen();\n  $('#root').innerHTML = '';\n  await refreshCounts();\n  Router.resolve();\n}\nsetInterval(() => { if (S.user && document.visibilityState === 'visible') refreshCounts(); }, 30000);\n\n/* ===== Startseite, News, Chat, Vertretung ===== */\nfunction greeting() { const h = +new Intl.DateTimeFormat('de-DE', { timeZone: TZ, hour: 'numeric', hour12: false }).format(new Date()); return h < 11 ? 'Guten Morgen' : h < 18 ? 'Hallo' : 'Guten Abend'; }\nconst NOTE_ICON = { anfrage: 'inbox', kundennotiz: 'note', support: 'support', vertretung: 'users', spam: 'flag', buchhaltung: 'euro', chat: 'chat', partner: 'partner', backup: 'shield', system: 'gear' };\n\nfunction feedItems(news, filter = 'alle') {\n  let items = [...(news.posts || []).map((p) => ({ ...p, kind: 'post' })), ...(news.notifications || []).map((n) => ({ ...n, ntype: n.kind, kind: 'note' }))]\n    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));\n  if (filter === 'ungelesen') items = items.filter((i) => !i.read);\n  if (filter === 'mitteilungen') items = items.filter((i) => i.kind === 'post');\n  if (filter === 'system') items = items.filter((i) => i.kind === 'note');\n  return items;\n}\nfunction feedRow(i) {\n  const mark = i.kind === 'post' ? html`<span class=\"fi-mark ${i.important ? 'important' : 'post'}\">${icon(i.important ? 'bolt' : 'news')}</span>` : html`<span class=\"fi-mark\">${icon(NOTE_ICON[i.ntype] || 'bell')}</span>`;\n  return html`<div class=\"feed-item ${i.read ? '' : 'unread'}\">${mark}\n    <div><a href=\"#\" class=\"fi-title\" data-act=\"openFeed\" data-kind=\"${i.kind}\" data-id=\"${i.id}\" data-link=\"${i.link || ''}\">${i.title}</a>\n      ${i.body ? html`<div class=\"fi-body\">${i.body}</div>` : ''}\n      <div class=\"tiny muted\">${i.kind === 'post' ? `Mitteilung von ${i.author || 'KFL'}` : 'Systemhinweis'}</div></div>\n    <div class=\"stack-s\"><span class=\"fi-time\" title=\"${fDT(i.created_at)}\">${fRel(i.created_at)}</span>\n      <button class=\"btn btn-ghost btn-sm\" data-act=\"toggleRead\" data-kind=\"${i.kind}\" data-id=\"${i.id}\" data-read=\"${i.read ? 1 : 0}\">${i.read ? 'Ungelesen' : 'Gelesen'}</button></div></div>`;\n}\nlet NEWS_CACHE = null;\nACT.openFeed = async (a) => {\n  const kind = a.dataset.kind, id = +a.dataset.id;\n  await POST('/news/read', kind === 'post' ? { posts: [id] } : { notifications: [id] });\n  if (kind === 'note' && a.dataset.link) { await refreshCounts(); location.hash = a.dataset.link; return; }\n  const p = NEWS_CACHE && (NEWS_CACHE.posts || []).find((x) => x.id === id);\n  if (p) modal({ title: p.title, body: html`<p class=\"tiny muted\">${p.author} \u00b7 ${fDT(p.created_at)}</p><div class=\"pre\">${p.body}</div>`, foot: html`<button class=\"btn btn-dark\" data-close>Schlie\u00dfen</button>`, onClose: () => { refreshCounts(); reload(); } });\n  else { await refreshCounts(); reload(); }\n};\nACT.toggleRead = async (b) => { const id = +b.dataset.id, read = b.dataset.read !== '1'; await POST('/news/read', { ...(b.dataset.kind === 'post' ? { posts: [id] } : { notifications: [id] }), read }); await refreshCounts(); reload(); };\nACT.allRead = async () => { await POST('/news/read', { all: true, posts: (NEWS_CACHE?.posts || []).filter((p) => !p.read).map((p) => p.id) }); await refreshCounts(); toast('Alles als gelesen markiert.'); reload(); };\n\nasync function pageStart() {\n  const P = page('start');\n  const d = (await refreshCounts()) || (await GET('/me/start'));\n  if (!P.alive()) return;\n  NEWS_CACHE = d.news;\n  const k = d.kpis || {};\n  const tiles = [\n    k.open !== undefined && ['Offene Anfragen', k.open, '#/anfragen'],\n    k.mine !== undefined && ['Mir zugewiesen', k.mine, '#/anfragen?mine=1'],\n    k.today !== undefined && ['Heute eingegangen', k.today, '#/anfragen?view=alle&from=' + todayISO()],\n    k.notes !== undefined && ['Neue Kundennotizen', k.notes, '#/anfragen?notes=1', k.notes > 0],\n    k.problems !== undefined && ['Fehler / ohne Angebot', k.problems, '#/anfragen?view=alle&status=fehler,stoerung,kein_angebot', k.problems > 0],\n    k.spam !== undefined && ['Spam zu pr\u00fcfen', k.spam, '#/anfragen?view=spam', k.spam > 0],\n    k.tickets !== undefined && ['Offene Tickets', k.tickets, '#/support'],\n    k.bill !== undefined && ['Abrechnungsf\u00e4lle offen', k.bill, '#/buchhaltung/faelle', k.bill > 0],\n    k.overdue !== undefined && ['Rechnungen \u00fcberf\u00e4llig', k.overdue, '#/buchhaltung/rechnungen?overdue=1', k.overdue > 0]\n  ].filter(Boolean);\n  const unread = feedItems(d.news, 'ungelesen').length;\n  P.show(html`${canAny('settings_all', 'acc_view') ? mailWarn() : ''}<div class=\"hello\"><div><h1>${greeting()}, ${S.user.name.split(' ')[0]}</h1><p class=\"sub muted\">${S.user.roleLabel}${S.user.prevLogin ? ` \u00b7 letzte Anmeldung ${fDT(S.user.prevLogin)}` : ''}</p></div>\n      <div class=\"date\"><b>${fLong(new Date())}</b>KW ${d.week} \u00b7 ${d.year}</div></div>\n    ${tiles.length ? html`<div class=\"kpis\">${tiles.map(([l, v, href, hot]) => html`<a class=\"kpi ${hot ? 'hot' : ''}\" href=\"${href}\"><b>${fNum(v)}</b><span>${l}</span></a>`)}</div>` : ''}\n    ${(d.absenceRequests || []).map((a) => html`<div class=\"note-box mt\">${icon('users')}<div class=\"spacer\"><b>${a.user_name}</b> bittet dich um Vertretung vom ${fDate(a.from_date)} bis ${fDate(a.to_date)}.${a.note ? html` \u201e${a.note}\u201c` : ''}</div>\n      <button class=\"btn btn-sm btn-ok\" data-act=\"absDecide\" data-id=\"${a.id}\" data-accept=\"1\">Zusagen</button><button class=\"btn btn-sm\" data-act=\"absDecide\" data-id=\"${a.id}\" data-accept=\"0\">Absagen</button></div>`)}\n    <div class=\"start-grid\">\n      <section class=\"panel newsroom\"><div class=\"panel-head\"><h2>News ${unread ? html`<span class=\"count hot\">${unread}</span>` : ''}</h2>\n        <div class=\"row\">${canAny('news_publish', 'news_partner') ? html`<button class=\"btn btn-sm btn-dark\" data-act=\"composeNews\">${icon('plus')}Mitteilung</button>` : ''}<button class=\"btn btn-sm btn-ghost\" data-act=\"allRead\">Alles gelesen</button><a class=\"btn btn-sm\" href=\"#/news\">Alle News</a></div></div>\n        <div class=\"feed\">${feedItems(d.news).length ? feedItems(d.news).slice(0, 20).map(feedRow) : empty('Keine Neuigkeiten', 'Neue Anfragen, Support-Antworten und Mitteilungen erscheinen hier.')}</div></section>\n      <div class=\"stack\">\n        <section class=\"panel\"><div class=\"panel-head\"><h2>Chats</h2><button class=\"btn btn-sm\" data-act=\"newChat\">${icon('plus')}Neuer Chat</button></div>\n          <div class=\"panel-body tight\">${(d.chats || []).length ? d.chats.map(chatRow) : html`<div class=\"panel-body\">${empty('Noch keine Chats', 'Schreib Kolleginnen und Kollegen direkt an.')}</div>`}</div></section>\n        <section class=\"panel\"><div class=\"panel-head\"><h2>Schnellzugriff</h2></div><div class=\"panel-body stack-s\">\n          ${can('req_view') ? html`<a class=\"btn btn-block\" href=\"#/anfragen?mine=1\">${icon('inbox')}Meine Anfragen</a>` : ''}\n          ${can('acc_view') ? html`<a class=\"btn btn-block\" href=\"#/buchhaltung/faelle\">${icon('euro')}Abrechnungsf\u00e4lle</a>` : ''}\n          <a class=\"btn btn-block\" href=\"#/news/vertretung\">${icon('calendar')}Urlaub und Vertretung</a>\n          <button class=\"btn btn-block\" data-act=\"newTicket\">${icon('support')}Support kontaktieren</button></div></section>\n      </div></div>`);\n}\n\n/* ---------- News-Seite ---------- */\nasync function pageNews(sub, id) {\n  const P = page('news');\n  const tabs = tabsBar([['feed', 'Neuigkeiten', '#/news'], ['chat', 'Chats', '#/news/chat'], ['vertretung', 'Urlaub & Vertretung', '#/news/vertretung']], sub || 'feed');\n  const actions = canAny('news_publish', 'news_partner') ? html`<button class=\"btn btn-primary\" data-act=\"composeNews\">${icon('plus')}Mitteilung ver\u00f6ffentlichen</button>` : '';\n  if (sub === 'chat') return pageChats(P, tabs, actions, id);\n  if (sub === 'vertretung') return pageAbsences(P, tabs, actions);\n  const d = await GET('/news'); if (!P.alive()) return;\n  NEWS_CACHE = d;\n  const f = hashQuery().f || 'alle';\n  const items = feedItems(d, f);\n  P.show(html`${head('News & Chat', 'Mitteilungen der Gesch\u00e4ftsf\u00fchrung, Systemhinweise zu deinem Fachbereich und deine Chats.', actions)}${tabs}\n    <section class=\"panel newsroom mt\"><div class=\"toolbar\">${[['alle', 'Alle'], ['ungelesen', 'Ungelesen'], ['mitteilungen', 'Mitteilungen'], ['system', 'Systemhinweise']].map(([k, l]) => html`<a class=\"btn btn-sm ${f === k ? 'btn-dark' : 'btn-ghost'}\" href=\"#/news?f=${k}\">${l}</a>`)}<span class=\"spacer\"></span><button class=\"btn btn-sm\" data-act=\"allRead\">Alles als gelesen markieren</button></div>\n      <div class=\"feed\">${items.length ? items.map(feedRow) : empty('Hier ist gerade nichts', f === 'ungelesen' ? 'Du hast alles gelesen.' : '')}</div></section>`);\n}\n\nACT.composeNews = async () => {\n  let dir = { users: [] }, orgs = [];\n  try { dir = await GET('/directory'); } catch (e) { /* optional */ }\n  if (can('news_partner')) try { orgs = (await GET('/orgs')).orgs; } catch (e) { /* ohne Partnerliste */ }\n  const roles = Object.entries(S.config.roles || {});\n  const scopes = [can('news_publish') && ['staff', 'Mitarbeiter der KFL'], can('news_partner') && ['partner', 'Gesch\u00e4ftspartner']].filter(Boolean);\n  const m = modal({ title: 'Mitteilung ver\u00f6ffentlichen', wide: true, body: html`<form class=\"stack\" data-submit=\"publishNews\" id=\"newsForm\">\n    <div class=\"row\">${scopes.map(([k, l], i) => html`<label class=\"check\"><input type=\"radio\" name=\"scope\" value=\"${k}\" ${i === 0 ? raw('checked') : ''} data-change=\"newsScope\"><span>${l}</span></label>`)}</div>\n    ${field('Titel', inp('title', '', { req: true }))}${field('Nachricht', area('body', '', { rows: 6 }))}\n    ${chk('important', false, 'Als wichtig markieren (steht oben und ist hervorgehoben)')}\n    <fieldset data-scope=\"staff\" class=\"${scopes[0][0] === 'staff' ? '' : 'hide'}\"><legend>Empf\u00e4nger im Team</legend><div class=\"stack-s\">\n      <div class=\"row\">${[['all', 'Alle Mitarbeiter'], ['roles', 'Bestimmte Rollen'], ['users', 'Einzelne Personen']].map(([k, l], i) => html`<label class=\"check\"><input type=\"radio\" name=\"aud_staff\" value=\"${k}\" ${i === 0 ? raw('checked') : ''}><span>${l}</span></label>`)}</div>\n      <div class=\"checks\">${roles.map(([k, r]) => chk('roles[]', false, r.label, k))}</div>\n      ${field('Einzelne Personen (Mehrfachauswahl mit Strg/Cmd)', raw(`<select name=\"users\" multiple size=\"5\">${dir.users.map((u) => `<option value=\"${u.id}\">${esc(u.name)} \u2013 ${esc(roleLabel(u.role_key))}</option>`).join('')}</select>`))}</div></fieldset>\n    ${can('news_partner') ? html`<fieldset data-scope=\"partner\" class=\"${scopes[0][0] === 'partner' ? '' : 'hide'}\"><legend>Empf\u00e4nger bei den Partnern</legend><div class=\"stack-s\">\n      <div class=\"row\">${[['partners_all', 'Alle Partner'], ['brands', 'Nach Marke'], ['orgs', 'Organisationen'], ['partner_roles', 'Nach Rolle']].map(([k, l], i) => html`<label class=\"check\"><input type=\"radio\" name=\"aud_partner\" value=\"${k}\" ${i === 0 ? raw('checked') : ''}><span>${l}</span></label>`)}</div>\n      ${field('Marken (kommagetrennt)', inp('brands', '', { ph: 'z. B. Audi, Volkswagen' }))}\n      ${field('Organisationen', raw(`<select name=\"orgs\" multiple size=\"5\">${orgs.map((o) => `<option value=\"${o.id}\">${esc(o.name)}</option>`).join('')}</select>`))}\n      <div class=\"checks\">${Object.entries(S.config.partnerRoles || {}).map(([k, r]) => chk('proles[]', false, r.label, k))}</div>\n      ${chk('mail', false, 'Zus\u00e4tzlich per E-Mail senden')}</div></fieldset>` : ''}\n    </form>`, foot: html`<button class=\"btn btn-ghost\" data-close>Abbrechen</button><button class=\"btn btn-primary\" type=\"submit\" form=\"newsForm\">Ver\u00f6ffentlichen</button>` });\n  m.el.dataset.m = '1';\n};\nCHANGE.newsScope = (el) => { const f = el.form; $$('fieldset[data-scope]', f).forEach((fs) => fs.classList.toggle('hide', fs.dataset.scope !== el.value)); };\nSUBMIT.publishNews = async (d, f) => {\n  const scope = d.scope || 'staff';\n  let audience;\n  if (scope === 'staff') {\n    const t = d.aud_staff || 'all';\n    audience = { type: t, values: t === 'roles' ? d.roles : t === 'users' ? [...f.elements.users.selectedOptions].map((o) => +o.value) : [] };\n    if (t !== 'all' && !audience.values.length) throw new Error('Bitte w\u00e4hle mindestens eine Rolle oder Person aus.');\n  } else {\n    const t = d.aud_partner || 'partners_all';\n    audience = { type: t, values: t === 'brands' ? String(d.brands || '').split(',').map((x) => x.trim()).filter(Boolean) : t === 'orgs' ? [...f.elements.orgs.selectedOptions].map((o) => +o.value) : t === 'partner_roles' ? d.proles : [] };\n    if (t !== 'partners_all' && !audience.values.length) throw new Error('Bitte w\u00e4hle die Empf\u00e4nger aus.');\n  }\n  await POST('/news', { scope, title: d.title, body: d.body, important: d.important, audience, mail: d.mail });\n  closeModal(); toast('Mitteilung ver\u00f6ffentlicht.'); reload();\n};\n\n/* ---------- Chats ---------- */\nconst chatName = (c) => c.title || (c.members || []).filter((m) => m.id !== S.user.id).map((m) => m.name).join(', ') || 'Chat';\nconst chatRow = (c, on) => html`<a class=\"chat-row ${on ? 'on' : ''}\" href=\"#/news/chat/${c.id}\">${avatar(chatName(c), c.kind === 'group' ? 'alt' : '')}<span class=\"t\"><b>${chatName(c)}</b><span>${c.last_text || 'Noch keine Nachrichten'}</span></span>${c.unread ? html`<span class=\"count hot\">${c.unread}</span>` : ''}</a>`;\nlet chatTimer = null;\nasync function pageChats(P, tabs, actions, id) {\n  const [list, cur] = await Promise.all([GET('/chats'), id ? GET('/chats/' + id) : null]);\n  if (!P.alive()) return;\n  P.show(html`${head('News & Chat', 'Direktnachrichten und Gruppenchats im Team.', actions)}${tabs}\n    <section class=\"panel chat-layout\"><div class=\"chat-list\"><div class=\"panel-head\"><h3>Unterhaltungen</h3><button class=\"btn btn-sm\" data-act=\"newChat\">${icon('plus')}Neu</button></div>\n      ${list.chats.length ? list.chats.map((c) => chatRow(c, +id === c.id)) : html`<div class=\"panel-body\">${empty('Noch keine Chats')}</div>`}</div>\n      <div class=\"chat-main\">${cur ? html`<div class=\"panel-head\"><div><h3>${chatName(cur.chat)}</h3><span class=\"tiny muted\">${cur.chat.members.map((m) => m.name).join(', ')}</span></div><button class=\"btn btn-sm btn-ghost\" data-act=\"chatUnread\" data-id=\"${id}\">Als ungelesen markieren</button></div>\n        <div class=\"thread\" id=\"thread\">${threadHtml(cur.messages)}</div>\n        <form data-submit=\"chatSend\"><input type=\"hidden\" name=\"id\" value=\"${id}\"><input name=\"text\" placeholder=\"Nachricht schreiben \u2026\" autocomplete=\"off\" required><button class=\"btn btn-primary\" type=\"submit\">${icon('send')}Senden</button></form>`\n        : empty('W\u00e4hle einen Chat aus', 'oder starte eine neue Unterhaltung.', html`<button class=\"btn btn-dark\" data-act=\"newChat\">Neuer Chat</button>`)}</div></section>`);\n  const t = $('#thread'); if (t) t.scrollTop = t.scrollHeight;\n  clearInterval(chatTimer);\n  if (cur) chatTimer = setInterval(async () => { if (!location.hash.startsWith('#/news/chat/' + id)) return clearInterval(chatTimer); const n = await GET('/chats/' + id).catch(() => null); const th = $('#thread'); if (n && th && n.messages.length !== th.children.length) { render(th, threadHtml(n.messages)); th.scrollTop = th.scrollHeight; } }, 12000);\n  refreshCounts();\n}\nconst threadHtml = (msgs) => msgs.length ? msgs.map((m) => html`<div class=\"msg ${m.user_id === S.user.id ? 'me' : ''}\"><div class=\"msg-meta\"><b>${m.name}</b><span>${fDT(m.created_at)}</span></div><div class=\"pre\">${m.text}</div></div>`) : html`<div class=\"empty-sm\">Schreib die erste Nachricht.</div>`;\nSUBMIT.chatSend = async (d, f) => { await POST('/chats/' + d.id, { text: d.text }); f.reset(); const n = await GET('/chats/' + d.id); const th = $('#thread'); render(th, threadHtml(n.messages)); th.scrollTop = th.scrollHeight; };\nACT.chatUnread = async (b) => { await PATCH('/chats/' + b.dataset.id, { unread: true }); toast('Als ungelesen markiert.'); location.hash = '#/news/chat'; };\nACT.newChat = async () => {\n  const dir = await GET('/directory');\n  const others = dir.users.filter((u) => u.id !== S.user.id);\n  const d = await ask({ title: 'Neuer Chat', text: 'Eine Person f\u00fcr einen Direktchat, mehrere f\u00fcr einen Gruppenchat. Gruppen sind mit Personen der gleichen Rolle m\u00f6glich.', ok: 'Chat starten',\n    fields: html`<div class=\"stack-s\">${others.map((u) => chk('users[]', false, raw(`${esc(u.name)} <span class=\"muted small\">${esc(roleLabel(u.role_key))}</span>`), u.id))}</div>${field('Name der Gruppe (optional)', inp('title'))}` });\n  if (!d) return;\n  if (!d.users.length) throw new Error('Bitte w\u00e4hle mindestens eine Person aus.');\n  const r = await POST('/chats', { userIds: d.users.map(Number), title: d.title });\n  location.hash = '#/news/chat/' + r.id;\n};\n\n/* ---------- Abwesenheit & Vertretung ---------- */\nconst ABS_STATUS = { angefragt: ['Wartet auf Zusage', 'warn'], bestaetigt: ['Best\u00e4tigt', 'ok'], abgelehnt: ['Abgelehnt', 'err'], storniert: ['Storniert', 'muted'] };\nasync function pageAbsences(P, tabs, actions) {\n  const d = await GET('/absences'); if (!P.alive()) return;\n  const st = (s) => badge(...(ABS_STATUS[s] || [s, 'neutral']));\n  P.show(html`${head('News & Chat', 'Trag Urlaub oder Abwesenheit ein. Deine Vertretung muss zustimmen und bekommt solange Einsicht und Bearbeitung in deinen F\u00e4llen.', actions)}${tabs}\n    <div class=\"grid-2\">\n      <section class=\"panel\"><div class=\"panel-head\"><h2>Abwesenheit eintragen</h2></div><form class=\"panel-body stack\" data-submit=\"absNew\">\n        <div class=\"grid-2\">${field('Von', inp('from', todayISO(), { type: 'date', req: true }))}${field('Bis', inp('to', todayISO(), { type: 'date', req: true }))}</div>\n        ${field('Vertretung', sel('substitute_id', d.candidates.map((c) => [c.id, `${c.name} (${roleLabel(c.role_key)})`]), '', { empty: 'Keine Vertretung' }), 'Nur gleiche oder h\u00f6here Rolle m\u00f6glich.')}\n        ${field('Notiz f\u00fcr die Vertretung', area('note', '', { rows: 3 }))}\n        <button class=\"btn btn-primary\" type=\"submit\">Eintragen und Vertretung anfragen</button></form></section>\n      <section class=\"panel\"><div class=\"panel-head\"><h2>Ich vertrete</h2></div><div class=\"panel-body tight\">\n        ${d.asSubstitute.length ? html`<table class=\"table\"><tbody>${d.asSubstitute.map((a) => html`<tr><td><b>${a.user_name}</b><span class=\"cell-sub\">${fDate(a.from_date)} \u2013 ${fDate(a.to_date)}</span>${a.note ? html`<span class=\"cell-sub\">${a.note}</span>` : ''}</td><td>${st(a.status)}</td>\n          <td class=\"r\">${a.status === 'angefragt' ? html`<button class=\"btn btn-sm btn-ok\" data-act=\"absDecide\" data-id=\"${a.id}\" data-accept=\"1\">Zusagen</button> <button class=\"btn btn-sm\" data-act=\"absDecide\" data-id=\"${a.id}\" data-accept=\"0\">Absagen</button>` : ''}</td></tr>`)}</tbody></table>` : html`<div class=\"panel-body\">${empty('Keine Vertretungen')}</div>`}</div></section></div>\n    <section class=\"panel mt\"><div class=\"panel-head\"><h2>Meine Abwesenheiten</h2></div><div class=\"panel-body tight\">\n      ${d.mine.length ? html`<table class=\"table\"><thead><tr><th>Zeitraum</th><th>Vertretung</th><th>Status</th><th></th></tr></thead><tbody>${d.mine.map((a) => html`<tr><td>${fDate(a.from_date)} \u2013 ${fDate(a.to_date)}</td><td>${a.substitute_name || '\u2013'}</td><td>${st(a.status)}</td><td class=\"r\">${['angefragt', 'bestaetigt'].includes(a.status) ? html`<button class=\"btn btn-sm btn-ghost\" data-act=\"absCancel\" data-id=\"${a.id}\">Stornieren</button>` : ''}</td></tr>`)}</tbody></table>` : html`<div class=\"panel-body\">${empty('Keine Eintr\u00e4ge')}</div>`}</div></section>`);\n}\nSUBMIT.absNew = async (d) => { await POST('/absences', d); toast(d.substitute_id ? 'Eingetragen. Deine Vertretung wurde angefragt.' : 'Abwesenheit eingetragen.'); reload(); };\nACT.absDecide = async (b) => { await POST(`/absences/${b.dataset.id}/decide`, { accept: b.dataset.accept === '1' }); toast(b.dataset.accept === '1' ? 'Vertretung zugesagt.' : 'Vertretung abgesagt.'); await loadSession(); reload(); };\nACT.absCancel = async (b) => { if (!(await confirmBox('Abwesenheit stornieren?', 'Die Vertretung endet sofort.'))) return; await POST(`/absences/${b.dataset.id}/cancel`); reload(); };\n\n/* ===== Anfragen: Liste und Detail ===== */\nACT.go = (el) => { location.hash = el.dataset.href; };\nconst REQ_VIEWS = [['aktiv', 'Aktiv'], ['alle', 'Alle'], ['archiv', 'Abgeschlossen'], ['kopien', 'In Rechnung gestellt'], ['spam', 'Spam']];\n\nasync function pageRequests() {\n  const P = page('anfragen');\n  if (!can('req_view')) return P.show(noAccess());\n  const q = hashQuery(); q.view = q.view || 'aktiv';\n  let users = [];\n  const [d] = await Promise.all([GET('/requests', q), can('req_assign') ? GET('/directory').then((r) => { users = r.users; }).catch(() => {}) : null]);\n  if (!P.alive()) return;\n  const sortBtn = (key, label) => html`<button data-act=\"reqSort\" data-key=\"${key}\" class=\"${q.sort === key ? 'sort-on' : ''}\">${label}${q.sort === key ? (q.dir === 'asc' ? ' \u2191' : ' \u2193') : ''}</button>`;\n  const flt = (k, v, label) => html`<a class=\"btn btn-sm ${q[k] === v ? 'btn-dark' : 'btn-ghost'}\" href=\"#/anfragen${qs({ ...q, [k]: q[k] === v ? '' : v, page: '' })}\">${label}</a>`;\n  P.show(html`${head('Anfragen', `${plural(d.total, 'Anfrage', 'Anfragen')} \u00b7 Traumwagen-DEAL und Fahrzeugverkauf`, html`<button class=\"btn\" data-act=\"reqExport\">${icon('download')}Liste exportieren</button>`)}\n    ${tabsBar(REQ_VIEWS.filter(([k]) => k !== 'spam' || canAny('req_spam_confirm', 'req_spam_report')).map(([k, l]) => [k, l, '#/anfragen' + qs({ view: k })]), q.view)}\n    <section class=\"panel mt\"><form class=\"toolbar\" data-submit=\"reqFilter\">\n      <label class=\"search\">${icon('search')}<input name=\"q\" value=\"${q.q || ''}\" placeholder=\"Nummer, Name, E-Mail, Marke, PLZ \u2026\" aria-label=\"Suche\"></label>\n      ${sel('type', [['deal', 'Traumwagen-DEAL'], ['sell', 'Fahrzeugverkauf']], q.type, { empty: 'Alle Arten', attrs: 'aria-label=\"Art\" data-change=\"reqFilterChange\"' })}\n      ${sel('status', RS().map((s) => [s.key, s.label]), q.status, { empty: 'Alle Status', attrs: 'aria-label=\"Status\" data-change=\"reqFilterChange\"' })}\n      ${sel('brand', d.brands, q.brand, { empty: 'Alle Marken', attrs: 'aria-label=\"Marke\" data-change=\"reqFilterChange\"' })}\n      <input name=\"model\" value=\"${q.model || ''}\" placeholder=\"Modell\" aria-label=\"Modell\" size=\"9\">\n      <input type=\"date\" name=\"from\" value=\"${q.from || ''}\" aria-label=\"Von\" data-change=\"reqFilterChange\"><input type=\"date\" name=\"to\" value=\"${q.to || ''}\" aria-label=\"Bis\" data-change=\"reqFilterChange\">\n      ${users.length ? sel('assignee', users.map((u) => [u.id, u.name]), q.assignee, { empty: 'Alle Zust\u00e4ndigen', attrs: 'aria-label=\"Zust\u00e4ndig\" data-change=\"reqFilterChange\"' }) : ''}\n      <button class=\"btn btn-sm btn-dark\" type=\"submit\">Filtern</button>${Object.keys(q).some((k) => !['view', 'page', 'sort', 'dir'].includes(k) && q[k]) ? html`<a class=\"btn btn-sm btn-ghost\" href=\"#/anfragen?view=${q.view}\">Zur\u00fccksetzen</a>` : ''}\n    </form>\n    <div class=\"toolbar\">${flt('mine', '1', 'Mir zugewiesen')}${flt('unassigned', '1', 'Ohne Zust\u00e4ndigen')}${flt('notes', '1', 'Neue Kundennotizen')}</div>\n    ${d.items.length ? html`<div class=\"table-wrap\"><table class=\"table\"><thead><tr>\n        <th>${sortBtn('number', 'Nr.')}</th><th>${sortBtn('created_at', 'Datum')}</th><th>${sortBtn('status', 'Status')}</th><th>Anliegen</th><th>${sortBtn('customer', 'Kunde')}</th>\n        <th>${sortBtn('brand', 'Marke')}</th><th>${sortBtn('model', 'Modell')}</th><th class=\"r\">${sortBtn('budget', 'Budget')}</th><th>${sortBtn('assignee', 'Zust\u00e4ndig')}</th><th>R\u00fcckmeldung Partner</th><th>Angebote</th></tr></thead>\n      <tbody>${d.items.map((r) => html`<tr class=\"clickable ${r.customer_note_unread ? 'is-unread' : ''}\" data-act=\"go\" data-href=\"#/anfragen/${r.number}\">\n        <td class=\"num strong\">#${r.number}${r.priority !== 'normal' ? html` <span class=\"tag\">${r.priority}</span>` : ''}</td>\n        <td class=\"nowrap\">${fDate(r.created_at)}<span class=\"cell-sub\">${fTime(r.created_at)} Uhr</span></td>\n        <td>${statusBadge(RS(), r.status)}${r.spam_state === 'gemeldet' ? html`<span class=\"cell-sub\">Spam gemeldet</span>` : ''}${r.billed ? html`<span class=\"cell-sub\">Kopie \u00b7 in Rechnung gestellt</span>` : ''}</td>\n        <td>${r.summary || typeLabel(r.type)}<span class=\"cell-sub\">${typeLabel(r.type)}</span>${r.customer_note_unread ? html`<span class=\"cell-sub strong\">Neue Notiz vom Kunden</span>` : ''}</td>\n        <td>${r.customer || '\u2013'}<span class=\"cell-sub\">${r.email || ''}</span></td><td>${r.brand || '\u2013'}</td><td>${r.model || '\u2013'}</td><td class=\"r num\">${r.budget || '\u2013'}</td>\n        <td>${r.assignee_name || html`<span class=\"muted\">offen</span>`}</td>\n        <td class=\"nowrap\">${r.partners ? html`${r.partners_reacted}/${r.partners} reagiert` : html`<span class=\"muted\">nicht verteilt</span>`}${r.deadline_at && ['versendet', 'angebot_liegt_vor'].includes(r.status) ? html`<span class=\"cell-sub\">${fLeft(r.deadline_at)}</span>` : ''}</td>\n        <td class=\"nowrap\">${r.offers ? html`<b>${r.offers}</b>${r.last_offer_at ? html`<span class=\"cell-sub\">zuletzt ${fDT(r.last_offer_at)}</span>` : ''}` : html`<span class=\"muted\">\u2013</span>`}</td></tr>`)}</tbody></table></div>\n      <div class=\"pager\"><span>Seite ${d.page} von ${d.pages}</span><span class=\"row\">${d.page > 1 ? html`<a class=\"btn btn-sm\" href=\"#/anfragen${qs({ ...q, page: d.page - 1 })}\">Zur\u00fcck</a>` : ''}${d.page < d.pages ? html`<a class=\"btn btn-sm\" href=\"#/anfragen${qs({ ...q, page: d.page + 1 })}\">Weiter</a>` : ''}</span></div>`\n      : empty('Keine Anfragen gefunden', 'Passe die Filter an oder setze sie zur\u00fcck.')}</section>`);\n}\nSUBMIT.reqFilter = (d) => { const q = hashQuery(); setHashQuery({ view: q.view, mine: q.mine, unassigned: q.unassigned, notes: q.notes, sort: q.sort, dir: q.dir, ...d }); };\nCHANGE.reqFilterChange = (el) => SUBMIT.reqFilter(formData(el.form));\nACT.reqSort = (b) => { const q = hashQuery(); const k = b.dataset.key; setHashQuery({ ...q, sort: k, dir: q.sort === k && q.dir !== 'asc' ? 'asc' : 'desc', page: '' }); };\nACT.reqExport = async () => {\n  const q = hashQuery(); const rows = []; let page = 1, pages = 1;\n  do { const d = await GET('/requests', { ...q, page }); rows.push(...d.items); pages = d.pages; page++; } while (page <= pages && page <= 40);\n  const head = ['Nr', 'Datum', 'Status', 'Art', 'Anliegen', 'Kunde', 'E-Mail', 'Marke', 'Modell', 'Budget', 'PLZ', 'Zust\u00e4ndig', 'Partner', 'reagiert', 'Angebote', 'Quelle'];\n  const csv = [head, ...rows.map((r) => [r.number, fDT(r.created_at), statusOf(RS(), r.status).label, typeShort(r.type), r.summary, r.customer, r.email, r.brand, r.model, r.budget, r.plz, r.assignee_name, r.partners, r.partners_reacted, r.offers, r.source])]\n    .map((l) => l.map((v) => `\"${String(v ?? '').replace(/\"/g, '\"\"')}\"`).join(';')).join('\\r\\n');\n  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })); a.download = `kfl-anfragen-${todayISO()}.csv`; a.click();\n};\n\n/* ---------- Detail ---------- */\nconst TRACK = [['Eingang', ['eingang', 'in_bearbeitung', 'fehler', 'stoerung']], ['An Partner versendet', ['versendet', 'kein_angebot']], ['Angebot liegt vor', ['angebot_liegt_vor', 'angebot_in_bearbeitung']], ['Beim Kunden', ['angebot_beim_kunden', 'angebot_abgelehnt']], ['Kontaktdaten versendet', ['angebot_akzeptiert', 'kontaktdaten_versendet']]];\nfunction trackHtml(r) {\n  const idx = Math.max(0, TRACK.findIndex(([, s]) => s.includes(r.status)));\n  const bad = ['fehler', 'stoerung', 'kein_angebot', 'angebot_abgelehnt', 'spam'].includes(r.status);\n  const dates = [r.created_at, r.dispatched_at, r.evaluated_at, r.presented_at, r.decided_at];\n  return html`<div class=\"track\" aria-label=\"Fortschritt der Anfrage\">${TRACK.map(([l], i) => html`<div class=\"track-step ${i < idx ? 'done' : i === idx ? (bad ? 'bad now' : r.status === 'kontaktdaten_versendet' ? 'done' : 'now') : ''}\"><i></i>${l}${i === idx && bad ? html`<small>${statusOf(RS(), r.status).label}</small>` : dates[i] && i <= idx ? html`<small>${fDT(dates[i])}</small>` : ''}</div>`)}</div>`;\n}\nconst EVENT_LABEL = { abrechnung_storniert: 'Abrechnung storniert', abrechnung_reaktiviert: 'Storno der Abrechnung aufgehoben', eingang: 'Eingang', versendet: 'Verteilt', kein_partner: 'Kein passender Partner', partner_zugeordnet: 'Partner zugeordnet', partner_uebernommen: 'Vom Partner \u00fcbernommen', angebot: 'Angebot eingegangen', auswertung: 'Ausgewertet', vorgestellt: 'Dem Kunden vorgestellt',\n  angebot_akzeptiert: 'Kunde interessiert sich', angebot_abgelehnt: 'Kunde hat abgelehnt', partnerstatus: 'Partnerstatus', kunde_nachgefragt: 'R\u00fcckfrage an den Kunden', kunde_feedback: 'R\u00fcckmeldung des Kunden', kundennotiz: 'Notiz vom Kunden', notiz: 'Interne Notiz', status: 'Status', prioritaet: 'Priorit\u00e4t', zuweisung: 'Zust\u00e4ndig',\n  nachricht_kunde: 'Nachricht an den Kunden', nachricht_partner: 'Nachricht an Partner', erneut_gesendet: 'Erneut gesendet', neutrale_pdf: 'Neutrale PDF', buchhaltung: 'An die Buchhaltung', in_rechnung_gestellt: 'In Rechnung gestellt', rechnung_gesammelt: 'F\u00fcr Sammelrechnung vorgemerkt',\n  spam_gemeldet: 'Als Spam gemeldet', spam_bestaetigt: 'Spam best\u00e4tigt', spam_abgelehnt: 'Kein Spam', fehler: 'Fehler', stoerung: 'St\u00f6rung', bewertung: 'Kundenbewertung' };\nconst FIELD_LABEL = { name: 'Nachname', email: 'E-Mail', phone: 'Telefon', body: 'Sonstiges' };\nconst CONTACT_KEYS = ['Vorname', 'name', 'email', 'phone', 'Stra\u00dfe', 'Kontaktweg', 'Kundennummer', 'Kundenkonto-ID'];\nconst FIELD_ORDER = ['Formular', 'Zustand', 'Marke', 'Modell', 'Modellvariante', 'Bezahlart', 'Kilometer pro Jahr', 'Laufzeit', 'Anzahlung', 'Budget', 'Umkreis'];\nfunction fieldsGrid(fields, hideContact) {\n  const keys = Object.keys(fields).filter((k) => fields[k] !== '' && fields[k] != null && !(hideContact && CONTACT_KEYS.includes(k))).sort((a, b) => { const ia = FIELD_ORDER.indexOf(a), ib = FIELD_ORDER.indexOf(b); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); });\n  return html`<dl class=\"fields\">${keys.map((k) => html`<div class=\"${String(fields[k]).length > 60 || /body|Sonstiges|Nachricht/i.test(k) ? 'wide' : ''}\"><dt>${FIELD_LABEL[k] || k}</dt><dd class=\"pre\">${fields[k]}</dd></div>`)}</dl>`;\n}\nlet REQ = null;\nasync function pageRequest(no) {\n  const P = page('anfragen');\n  if (!can('req_view')) return P.show(noAccess());\n  const d = await GET('/requests/' + no); if (!P.alive()) return;\n  REQ = d;\n  const r = d.request;\n  let users = [];\n  if (can('req_assign')) users = (await GET('/directory').catch(() => ({ users: [] }))).users;\n  const statusChoices = RS().filter((s) => s.key !== 'spam' && (can('req_status_force') || ['eingang', 'in_bearbeitung', 'fehler', 'stoerung', r.status].includes(s.key)));\n  const timeline = [...d.events.map((e) => { const m = String(e.detail || '').match(/^\\[([^\\]]+)\\]\\s*(.*)$/s); return { at: e.created_at, who: e.author || (m ? m[1] : 'System'), text: `${EVENT_LABEL[e.action] || e.action.replace(/_/g, ' ')}${(m ? m[2] : e.detail) ? ': ' + (m ? m[2] : e.detail) : ''}`, cls: e.user_id ? 'kfl' : '' }; }),\n    ...d.partnerEvents.filter((e) => e.confidential || !['uebernommen', 'angebot', 'zugeordnet'].includes(e.action)).map((e) => ({ at: e.created_at, who: e.actor_name || 'Partner', text: e.text || e.action.replace(/_/g, ' '), cls: e.confidential ? 'conf' : '', conf: !!e.confidential }))].sort((a, b) => (a.at < b.at ? 1 : -1));\n  const canMsg = can('req_message');\n  P.show(html`${head(html`#${r.number} \u00b7 ${r.vehicle || r.summary || typeLabel(r.type)}`, html`${typeLabel(r.type)} \u00b7 eingegangen ${fDT(r.created_at)} \u00b7 Quelle: ${r.source || 'Webseite'}${r.radius_km != null ? html` \u00b7 Umkreis ${r.radius_km ? r.radius_km + ' km' : 'bundesweit'}` : ''}`,\n      html`${statusBadge(RS(), r.status)}${r.billed ? badge('Kopie \u00b7 in Rechnung gestellt', 'ok') : ''}${r.deleted ? badge('Deaktiviert', 'err') : ''}`, ['#/anfragen', 'Alle Anfragen'])}\n    ${r.status_note ? html`<div class=\"note-box\">${icon('alert')}<span>${r.status_note}</span></div>` : ''}\n    ${r.customer_note_unread ? html`<div class=\"info-box mt\">${icon('note')}<span>Der Kunde hat eine neue Notiz unter \u201eSonstiges\u201c hinterlassen. Bitte ber\u00fccksichtigen und ggf. an die Partner weitergeben.</span></div>` : ''}\n    <section class=\"panel mt\">${trackHtml(r)}</section>\n    <div class=\"detail-grid mt\">\n      <div class=\"stack\">\n        <section class=\"panel\"><div class=\"panel-head\"><h2>Anfrage</h2>${r.deadline_at && ['versendet', 'angebot_liegt_vor'].includes(r.status) ? html`<span class=\"badge t-accent\">${icon('clock')}Angebotsfrist ${fDT(r.deadline_at)} \u00b7 ${fLeft(r.deadline_at)}</span>` : ''}</div>\n          <div class=\"panel-body tight\">${fieldsGrid(r.fields, !!r.contact)}</div></section>\n        ${r.contact ? html`<section class=\"panel\"><div class=\"panel-head\"><h2>Kunde</h2>${canMsg ? html`<button class=\"btn btn-sm\" data-act=\"msgCustomer\">${icon('mail')}Nachricht an Kunden</button>` : ''}</div><div class=\"panel-body\">\n          ${kv([['Name', r.contact.name], ['E-Mail', r.contact.email ? html`<a class=\"link\" href=\"mailto:${r.contact.email}\">${r.contact.email}</a>` : ''], ['Telefon', r.contact.phone ? html`<a class=\"link\" href=\"tel:${r.contact.phone}\">${r.contact.phone}</a>` : ''],\n            ['Anschrift', [r.contact.street, [r.contact.zip, r.contact.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')], ['Kundenart', r.fields.Kundenart], ['Kontaktweg', r.contact.contactWay],\n            ['Kundenkonto', r.customer_account ? 'Shopify-Kunde ' + r.customer_account : 'ohne Konto'], ['R\u00fcckmeldung Kontakt', r.feedback_state ? (r.feedback_state === 'ja' ? 'Partner hat sich gemeldet' : 'Partner hat sich NICHT gemeldet') : '']])}</div></section>`\n          : html`<section class=\"panel\"><div class=\"panel-body muted small\">${icon('lock')} Kontaktdaten sind f\u00fcr deine Rolle ausgeblendet.</div></section>`}\n        <section class=\"panel\"><div class=\"panel-head\"><h2>Gesch\u00e4ftspartner <span class=\"count\">${d.assignments.length}</span></h2>\n          <div class=\"row\">${can('req_partner') ? html`<button class=\"btn btn-sm\" data-act=\"assignPartner\">${icon('plus')}Manuell zuordnen</button>${!d.assignments.length || ['eingang', 'in_bearbeitung', 'fehler', 'stoerung', 'kein_angebot'].includes(r.status) ? html`<button class=\"btn btn-sm\" data-act=\"redispatch\">${icon('refresh')}Automatisch verteilen</button>` : ''}` : ''}</div></div>\n          ${d.assignments.length ? d.assignments.map((a) => asgHtml(a, d.offers.find((o) => o.assignment_id === a.id))) : html`<div class=\"panel-body\">${empty('Noch an keinen Partner verteilt', 'Kein passender Partner im Umkreis? Ordne manuell zu.')}</div>`}\n          ${canMsg && d.assignments.length ? html`<form class=\"composer\" data-submit=\"msgPartners\"><h3>Nachricht an Partner</h3>\n            <div class=\"row\">${sel('kind', [['notiz', 'Notiz'], ['ergaenzung', 'Erg\u00e4nzung zur Anfrage'], ['info', 'Sonstige Information'], ['mahnung', 'Anmahnen'], ['probefahrt', 'Kunde m\u00f6chte Probefahrt']], 'notiz')}\n              ${sel('to', [['all', 'An alle Partner dieser Anfrage'], ...d.assignments.map((a) => [a.id, a.org_name])], 'all')}</div>\n            ${area('text', '', { rows: 3, ph: 'Text, den der Partner bei der Anfrage und per E-Mail sieht \u2026' })}\n            <div class=\"row\"><button class=\"btn btn-dark\" type=\"submit\">${icon('send')}Senden</button><button class=\"btn\" type=\"button\" data-act=\"testDrive\">${icon('car')}Probefahrt-Info an alle</button></div></form>` : ''}\n        </section>\n        <section class=\"panel\"><div class=\"panel-head\"><h2>Angebote <span class=\"count\">${d.offers.length}</span></h2>\n          <div class=\"row\">${can('req_partner') && !r.evaluated_at && d.offers.length ? html`<button class=\"btn btn-sm\" data-act=\"evaluate\">Jetzt auswerten</button>` : ''}${r.status === 'angebot_in_bearbeitung' && can('req_edit') ? html`<button class=\"btn btn-sm btn-primary\" data-act=\"present\">Dem Kunden vorstellen</button>` : ''}</div></div>\n          <div class=\"panel-body\">${d.offers.length ? d.offers.map(offerHtml) : empty('Noch keine Angebote', 'Sobald Partner Angebote abgeben, erscheinen sie hier mit Bewertung.')}</div></section>\n      </div>\n      <div class=\"stack\">\n        ${can('req_edit') ? html`<section class=\"panel\"><div class=\"panel-head\"><h2>Bearbeitung</h2></div><form class=\"panel-body stack\" data-submit=\"reqUpdate\">\n          ${field('Status', sel('status', statusChoices.map((s) => [s.key, s.label]), r.status))}\n          ${field('Begr\u00fcndung (optional)', inp('note', '', { ph: 'z. B. Fehler in der Anfrage' }))}\n          <div class=\"grid-2\">${field('Priorit\u00e4t', sel('priority', [['normal', 'Normal'], ['hoch', 'Hoch'], ['dringend', 'Dringend']], r.priority))}\n          ${field('Zust\u00e4ndig', can('req_assign') ? sel('assignee_id', users.map((u) => [u.id, u.name]), r.assignee_id, { empty: 'Niemand' }) : html`<div class=\"row\"><span>${r.assignee_name || 'Niemand'}</span>${r.assignee_id !== S.user.id ? html`<button class=\"btn btn-sm\" type=\"button\" data-act=\"takeReq\">\u00dcbernehmen</button>` : ''}</div>`)}</div>\n          <button class=\"btn btn-dark\" type=\"submit\">Speichern</button></form></section>` : ''}\n        <section class=\"panel\"><div class=\"panel-head\"><h2>Interne Notizen</h2></div><div class=\"panel-body stack\">\n          ${can('req_edit') ? html`<form class=\"stack-s\" data-submit=\"reqNote\">${area('text', '', { rows: 3, ph: 'Nur intern sichtbar \u2026', req: true })}<div class=\"row-between\">${chk('acc_relevant', false, 'F\u00fcr die Buchhaltung relevant \u2013 dauerhaft am Abrechnungsfall anheften')}<button class=\"btn btn-sm\" type=\"submit\">Notiz speichern</button></div></form>` : ''}\n          ${d.notes.length ? html`<ul class=\"timeline\">${d.notes.map((n) => html`<li class=\"${n.author_type === 'customer' ? 'kfl' : ''}\"><div><div class=\"tl-meta\">${n.author_type === 'customer' ? 'Kunde (Sonstiges)' : n.author || 'System'} \u00b7 ${fDT(n.created_at)}${n.acc_relevant ? html`<span class=\"acc-flag\" title=\"Markiert von ${n.acc_marked_by || '\u2013'} am ${fDT(n.acc_marked_at)}\">${icon('pin')}Buchhaltung</span>` : ''}</div><div class=\"pre\">${n.text}</div>\n            ${!n.acc_relevant && n.author_type !== 'customer' && can('req_edit') ? html`<button class=\"link small\" data-act=\"noteAcc\" data-id=\"${n.id}\">F\u00fcr die Buchhaltung markieren</button>` : ''}${n.acc_relevant && S.user.role === 'admin' ? html`<button class=\"link small\" data-act=\"noteAccOff\" data-id=\"${n.id}\">Markierung aufheben</button>` : ''}</div></li>`)}</ul>` : html`<p class=\"muted small\">Noch keine Notizen.</p>`}</div></section>\n        ${d.billing.length ? html`<section class=\"panel\"><div class=\"panel-head\"><h2>Abrechnung</h2></div><div class=\"panel-body\">${d.billing.map((b) => kv([['Betrag netto', fEur(b.amount_net)], ['Status', b.status === 'storniert' ? 'Storniert' : b.status], ['Rechnung', b.invoice_number || (b.status === 'storniert' ? '\u2013' : 'noch nicht erstellt')], b.status === 'storniert' && ['Storno-Grund', `${b.cancel_reason || '\u2013'} (${b.cancelled_by || ''}, ${fDT(b.cancelled_at)})`]]))}${can('acc_view') ? html`<a class=\"link small\" href=\"#/buchhaltung/faelle\">Zur Buchhaltung</a>` : ''}</div></section>` : ''}\n        ${d.tickets.length ? html`<section class=\"panel\"><div class=\"panel-head\"><h2>Support-F\u00e4lle</h2></div><div class=\"panel-body stack-s\">${d.tickets.map((t) => html`<a class=\"link\" href=\"#/support/${t.id}\">#${t.id} ${t.subject}</a>`)}</div></section>` : ''}\n        <section class=\"panel\"><div class=\"panel-head\"><h2>Verlauf</h2></div><div class=\"panel-body\"><ul class=\"timeline\">${timeline.map((e) => html`<li class=\"${e.cls}\"><div><div class=\"tl-meta\">${e.who} \u00b7 ${fDT(e.at)}${e.conf ? ' \u00b7 Vertrauliche Information' : ''}</div><div>${e.text}</div></div></li>`)}</ul></div></section>\n        ${spamPanel(r)}\n        ${can('req_delete') && !r.deleted ? html`<section class=\"panel\"><div class=\"panel-body row-between\"><span class=\"small muted\">Anfrage endg\u00fcltig deaktivieren und personenbezogene Daten entfernen.</span><button class=\"btn btn-sm btn-danger\" data-act=\"reqDelete\">${icon('trash')}L\u00f6schen</button></div></section>` : ''}\n      </div></div>`);\n}\nfunction asgHtml(a, offer) {\n  const live = ['neu', 'in_bearbeitung'].includes(a.status);\n  return html`<div class=\"asg\"><div class=\"asg-head\"><div><b>${a.org_name}</b>${a.org_city ? html` <span class=\"muted small\">${a.org_city}</span>` : ''}\n      <div class=\"asg-meta\">${a.distance_km != null ? `${fNum(a.distance_km)} km Luftlinie \u00b7 ` : ''}${a.source === 'manuell' ? 'manuell zugeordnet' : 'automatisch'} \u00b7 ${a.mailed_at ? 'versendet ' + fDT(a.mailed_at) : 'noch nicht versendet'}${a.reminders ? ` \u00b7 ${a.reminders}\u00d7 angemahnt` : ''}</div>\n      <div class=\"asg-meta\">${a.taker_name ? `In Bearbeitung von ${a.taker_name}${a.taken_at ? ' seit ' + fDT(a.taken_at) : ''}` : ''}${live && a.deadline_at ? ` \u00b7 Frist ${fDT(a.deadline_at)} (${fLeft(a.deadline_at)})` : ''}${a.contact_due_at && ['gewonnen', 'nicht_erreicht'].includes(a.status) ? ` \u00b7 Kontaktfrist ${fDT(a.contact_due_at)}` : ''}</div>\n      ${a.closed_reason ? html`<div class=\"asg-meta\">${a.closed_reason}</div>` : ''}</div>\n    ${statusBadge(AS(), a.status)}</div>\n    ${can('req_message') ? html`<div class=\"row\">${live ? html`<button class=\"btn btn-sm\" data-act=\"asgResend\" data-id=\"${a.id}\">${icon('send')}Erneut senden</button><button class=\"btn btn-sm\" data-act=\"asgRemind\" data-id=\"${a.id}\">${icon('bell')}Anmahnen</button>` : ''}\n      ${a.status === 'in_bearbeitung' && can('req_partner') ? html`<button class=\"btn btn-sm\" data-act=\"asgRelease\" data-id=\"${a.id}\">F\u00fcr Organisation freigeben</button>` : ''}\n      ${['gewonnen', 'nicht_erreicht', 'kontaktiert', 'verloren', 'gescheitert', 'vorgestellt'].includes(a.status) || offer ? html`<button class=\"btn btn-sm\" data-act=\"asgStatus\" data-id=\"${a.id}\">Status setzen</button>` : ''}</div>` : ''}</div>`;\n}\nconst SCORE_SHORT = { distance: 'N\u00e4he', response: 'Antwortzeit', equipment: 'Ausstattung', price: 'Rate / Preis', model: 'Modell', term: 'Laufzeit', addons: 'Zusatzprodukte' };\nfunction scoreDetail(o) {\n  const sd = typeof o.score_detail === 'string' ? jparse0(o.score_detail) : o.score_detail; if (!sd || !sd.points) return '';\n  return html`<div class=\"score-detail\" title=\"Punkte je Faktor (0\u2013100) \u00b7 Gewichtung in Klammern\">${Object.entries(sd.points).map(([k, p]) => html`<div><span>${SCORE_SHORT[k] || k} <span class=\"muted\">(${sd.weights[k]} %)</span></span><b>${p == null ? 'entf\u00e4llt' : fNum(p, 0)}</b></div>`)}${sd.hours != null ? html`<div><span class=\"muted\">Antwort nach</span><b>${fNum(sd.hours, 1)} Std.</b></div>` : ''}</div>`;\n}\nconst jparse0 = (s) => { try { return JSON.parse(s); } catch (e) { return null; } };\nfunction offerHtml(o) {\n  const d = o.data || {};\n  return html`<article class=\"offer-card ${o.rank === 1 ? 'top' : ''}\"><div class=\"row-between\"><div><b>${o.org_name}</b> <span class=\"muted small\">${o.user_name || ''} \u00b7 ${fDT(o.created_at)}</span></div>\n      <div class=\"row\">${o.rank ? html`<span class=\"tag\">Platz ${o.rank}</span>` : ''}${o.score != null ? html`<span class=\"tag\">Score ${fNum(o.score, 1)}</span>` : ''}${offerStatus(o.status)}</div></div>\n    <div class=\"row-between mt\"><div class=\"offer-price num\">${offerHeadline(d)}</div><span class=\"muted small\">${OFFER_KIND[o.kind] || o.kind}</span></div>\n    <div class=\"mt\">${kv(offerRows(d))}</div>\n    ${scoreDetail(o)}\n    <div class=\"row mt\">${o.pdf_file_id ? html`<a class=\"btn btn-sm\" target=\"_blank\" rel=\"noopener\" href=\"${fileUrl(`/requests/${REQ.request.number}/offers/${o.id}/file`, { which: 'pdf' })}\">${icon('file')}Angebot (PDF)</a>` : ''}\n      ${o.expose_file_id ? html`<a class=\"btn btn-sm\" target=\"_blank\" rel=\"noopener\" href=\"${fileUrl(`/requests/${REQ.request.number}/offers/${o.id}/file`, { which: 'expose' })}\">${icon('file')}Expos\u00e9</a>` : ''}\n      ${o.public_file_id ? html`<a class=\"btn btn-sm\" target=\"_blank\" rel=\"noopener\" href=\"${fileUrl(`/requests/${REQ.request.number}/offers/${o.id}/file`, { which: 'public' })}\">${icon('eye')}Neutrale PDF</a>` : ''}\n      ${can('req_edit') && (o.pdf_file_id || o.expose_file_id) ? html`<button class=\"btn btn-sm btn-ghost\" data-act=\"offerPublic\" data-id=\"${o.id}\">${icon('upload')}Neutrale PDF f\u00fcr Kunden hochladen</button>` : ''}</div></article>`;\n}\nfunction spamPanel(r) {\n  if (r.spam_state === 'gemeldet') return html`<section class=\"panel\"><div class=\"panel-head\"><h2>Spam-Meldung</h2>${badge('Zur Pr\u00fcfung', 'warn')}</div><div class=\"panel-body stack\">\n    <p class=\"small\">${r.spam_reason ? `Grund: ${r.spam_reason}` : 'Ohne Begr\u00fcndung gemeldet.'}</p>\n    ${can('req_spam_confirm') ? html`<div class=\"row\"><button class=\"btn btn-danger btn-sm\" data-act=\"spamDecide\" data-confirm=\"1\">Als Spam best\u00e4tigen</button><button class=\"btn btn-sm\" data-act=\"spamDecide\" data-confirm=\"0\">Kein Spam</button></div>` : html`<p class=\"muted small\">Die Teamleitung pr\u00fcft die Meldung.</p>`}</div></section>`;\n  if (can('req_spam_report') && !r.deleted && r.spam_state !== 'bestaetigt') return html`<section class=\"panel\"><div class=\"panel-body row-between\"><span class=\"small muted\">Fantasiedaten oder Werbung?</span><button class=\"btn btn-sm\" data-act=\"spamReport\">${icon('flag')}Als Spam melden</button></div></section>`;\n  return '';\n}\nconst rno = () => REQ.request.number;\nSUBMIT.reqUpdate = async (d) => { await PATCH('/requests/' + rno(), { status: d.status, note: d.note, priority: d.priority, ...(d.assignee_id !== undefined ? { assignee_id: d.assignee_id || null } : {}) }); toast('Gespeichert.'); reload(); };\nACT.takeReq = async () => { await PATCH('/requests/' + rno(), { assignee_id: S.user.id }); toast('Du bist jetzt zust\u00e4ndig.'); reload(); };\nSUBMIT.reqNote = async (d) => { await POST(`/requests/${rno()}/notes`, d); toast(d.acc_relevant ? 'Notiz gespeichert und f\u00fcr die Buchhaltung angeheftet.' : 'Notiz gespeichert.'); reload(); };\nACT.noteAcc = async (b) => { if (!(await confirmBox('F\u00fcr die Buchhaltung markieren?', 'Die Notiz wird dauerhaft am Abrechnungsfall und an der Rechnung angeheftet und ist f\u00fcr Buchhaltung, Gesch\u00e4ftsf\u00fchrung und Admin sichtbar. Die Markierung kann nur ein Admin wieder aufheben.', 'Markieren'))) return; await POST(`/requests/${rno()}/notes/${b.dataset.id}/acc`, { relevant: true }); toast('F\u00fcr die Buchhaltung angeheftet.'); reload(); };\nACT.noteAccOff = async (b) => { if (!(await confirmBox('Markierung aufheben?', 'Die Notiz bleibt an der Anfrage, erscheint aber nicht mehr bei der Buchhaltung.', 'Aufheben'))) return; await POST(`/requests/${rno()}/notes/${b.dataset.id}/acc`, { relevant: false }); toast('Markierung aufgehoben.'); reload(); };\nACT.msgCustomer = async () => {\n  const d = await ask({ title: 'Nachricht an den Kunden', text: `Geht per E-Mail an ${REQ.request.contact.email} (Absender vermittlung@). Antworten landen im Postfach der Vermittlung.`, ok: 'Senden', fields: field('Nachricht', area('text', '', { rows: 7, req: true })) });\n  if (!d) return; const r = await POST(`/requests/${rno()}/message`, { to: 'customer', text: d.text }); toast(r.mail === 'gesendet' ? 'Nachricht gesendet.' : 'Nachricht gespeichert (E-Mail-Dienst nicht eingerichtet).'); reload();\n};\nSUBMIT.msgPartners = async (d, f) => { if (d.kind !== 'probefahrt' && !d.text.trim()) throw new Error('Bitte gib eine Nachricht ein.'); await POST(`/requests/${rno()}/message`, { kind: d.kind, text: d.text, assignment_ids: d.to === 'all' ? [] : [+d.to] }); f.reset(); toast('An die Partner gesendet.'); reload(); };\nACT.testDrive = async () => { if (!(await confirmBox('Probefahrt-Info senden?', 'Alle Partner dieser Anfrage erfahren, dass der Kunde an einer Probefahrt interessiert ist.', 'Info senden'))) return; await POST(`/requests/${rno()}/message`, { kind: 'probefahrt', text: '' }); toast('Probefahrt-Info gesendet.'); reload(); };\nACT.asgResend = async (b) => { const r = await POST(`/requests/${rno()}/assignments/${b.dataset.id}/resend`); toast(r.mailErrors ? 'E-Mail konnte nicht zugestellt werden.' : `Erneut gesendet${r.mails ? ` (${r.mails} Empf\u00e4nger)` : ''}.`, r.mailErrors ? 'err' : 'ok'); reload(); };\nACT.asgRemind = async (b) => { const d = await ask({ title: 'Partner anmahnen', text: 'Der Partner bekommt eine Erinnerung per E-Mail und im Dashboard.', ok: 'Anmahnen', fields: field('Zusatz (optional)', area('text', '', { rows: 3 })) }); if (!d) return; await POST(`/requests/${rno()}/message`, { kind: 'mahnung', text: d.text || 'Bitte bearbeite diese Anfrage zeitnah.', assignment_ids: [+b.dataset.id] }); toast('Partner angemahnt.'); reload(); };\nACT.asgRelease = async (b) => { if (!(await confirmBox('Wieder f\u00fcr die Organisation freigeben?', 'Der aktuelle Bearbeiter verliert die Anfrage; alle Vertriebler der Organisation sehen sie wieder.'))) return; await POST(`/requests/${rno()}/assignments/${b.dataset.id}/release`); reload(); };\nACT.asgStatus = async (b) => {\n  const d = await ask({ title: 'Status beim Partner setzen', text: 'Die Begr\u00fcndung ist auch f\u00fcr den Partner sichtbar. \u201eGewonnen\u201c erzeugt einmalig einen Abrechnungsfall.', ok: 'Status setzen',\n    fields: html`${field('Neuer Status', sel('status', [['gewonnen', 'Gewonnen'], ['kontaktiert', 'Kunde erfolgreich kontaktiert'], ['verloren', 'Verloren'], ['gescheitert', 'Verhandlung gescheitert']], 'gewonnen'))}${field('Begr\u00fcndung / Notiz', area('note', '', { rows: 4, req: true, ph: 'Was hat der Kunde gesagt?' }))}` });\n  if (!d) return; await POST(`/requests/${rno()}/assignments/${b.dataset.id}/status`, d); toast('Status gesetzt.'); reload();\n};\nACT.assignPartner = async () => {\n  const c = await GET(`/requests/${rno()}/candidates`);\n  const list = c.orgs.filter((o) => !o.assigned && o.active).sort((a, b) => (b.brandMatch - a.brandMatch) || ((a.distance ?? 1e9) - (b.distance ?? 1e9)));\n  const d = await ask({ title: 'Partner manuell zuordnen', wide: true, ok: 'Zuordnen und senden',\n    fields: html`${field('Gesch\u00e4ftspartner', raw(`<select name=\"org_id\" required size=\"8\">${list.map((o) => `<option value=\"${o.id}\">${esc(o.name)} \u00b7 ${esc(o.city || '')}${o.distance != null ? ' \u00b7 ' + fNum(o.distance) + ' km' : ''}${o.brandMatch ? '' : ' \u00b7 andere Marke'}</option>`).join('')}</select>`), 'Passende Marke zuerst, dann nach Entfernung sortiert.')}\n      ${field('Notiz an den Partner (optional)', area('note', '', { rows: 3 }))}` });\n  if (!d) return; await POST(`/requests/${rno()}/assign`, d); toast('Partner zugeordnet und benachrichtigt.'); reload();\n};\nACT.redispatch = async () => { const r = await POST(`/requests/${rno()}/dispatch`); toast(r.assigned ? `An ${r.assigned} Partner verteilt.` : (r.error || 'Kein neuer passender Partner gefunden \u2013 bitte manuell zuordnen.'), r.assigned ? 'ok' : 'err'); reload(); };\nACT.evaluate = async () => { if (!(await confirmBox('Jetzt auswerten?', 'Die Angebotsfrist wird nicht abgewartet. Das beste Angebot wird ermittelt und \u2013 je nach Einstellung \u2013 dem Kunden vorgestellt.', 'Auswerten'))) return; await POST(`/requests/${rno()}/evaluate`); reload(); };\nACT.present = async () => { await POST(`/requests/${rno()}/present`); toast('Das Angebot wurde dem Kunden vorgestellt.'); reload(); };\nACT.offerPublic = async (b) => {\n  const d = await ask({ title: 'Neutrale PDF f\u00fcr den Kunden', text: 'Lade eine Fassung ohne Hinweise auf den Partner (Anschrift, Ansprechpartner, Logo) hoch. Der Kunde sieht dann nur diese Datei.', ok: 'Hochladen',\n    fields: html`${field('Datei', raw('<input type=\"file\" name=\"file\" accept=\"application/pdf\" required>'))}${field('Ersetzt', sel('which', [['pdf', 'Angebot'], ['expose', 'Expos\u00e9']], 'pdf'))}` });\n  if (!d) return; const file = await fileField(d._form.elements.file, { max: 8 }); await POST(`/requests/${rno()}/offers/${b.dataset.id}/public`, { file, which: d.which }); toast('Neutrale PDF gespeichert.'); reload();\n};\nACT.spamReport = async () => { const d = await ask({ title: 'Als Spam melden', text: 'Die Teamleitung pr\u00fcft die Meldung. Bei Best\u00e4tigung wird die Anfrage deaktiviert.', ok: 'Melden', fields: field('Grund', inp('reason', '', { req: true, ph: 'z. B. Fantasiename, Werbung' })) }); if (!d) return; await POST(`/requests/${rno()}/spam`, d); toast('An die Teamleitung gemeldet.'); reload(); };\nACT.spamDecide = async (b) => { const yes = b.dataset.confirm === '1'; if (yes && !(await confirmBox('Spam best\u00e4tigen?', 'Die Anfrage wird deaktiviert, die Partner-Zuordnungen geschlossen und der Fall l\u00e4uft beim Admin im Support zur Nachpr\u00fcfung auf.', 'Spam best\u00e4tigen', true))) return; await POST(`/requests/${rno()}/spam/decide`, { confirm: yes }); toast(yes ? 'Als Spam best\u00e4tigt.' : 'Meldung abgelehnt.'); reload(); };\nACT.reqDelete = async () => { const d = await ask({ title: `Anfrage #${rno()} l\u00f6schen?`, text: 'Kundendaten werden entfernt, offene Partner-Zuordnungen geschlossen. Das kann nicht r\u00fcckg\u00e4ngig gemacht werden.', ok: 'Endg\u00fcltig l\u00f6schen', danger: true, fields: field('Grund', inp('reason', '', { req: true })) }); if (!d) return; await DEL('/requests/' + rno(), d); toast('Anfrage gel\u00f6scht.'); location.hash = '#/anfragen'; };\n\n/* ===== Buchhaltung ===== */\nconst INV_STATUS = { entwurf: ['Entwurf', 'neutral'], offen: ['Offen', 'info'], teilbezahlt: ['Teilbezahlt', 'warn'], bezahlt: ['Bezahlt', 'ok'], storniert: ['Storniert', 'muted'] };\nconst ITEM_STATUS = { offen: ['Offen', 'accent'], gesammelt: ['In der Sammelablage', 'info'], abgerechnet: ['Abgerechnet', 'ok'], storniert: ['Storniert', 'muted'] };\nconst PI_STATUS = { offen: ['Offen', 'info'], zur_zahlung: ['Zur Zahlung vorgemerkt', 'accent'], in_zahlungsliste: ['In Zahlungsliste', 'warn'], freigegeben: ['Freigegeben', 'ok-light'], bezahlt: ['Bezahlt', 'ok'] };\nconst PR_STATUS = { offen: ['Wartet auf Freigabe', 'accent'], freigegeben: ['Freigegeben', 'ok-light'], ausgefuehrt: ['Ausgef\u00fchrt', 'ok'] };\nconst st = (map, k) => badge(...(map[k] || [k, 'neutral']));\nconst notSent = (i) => i.kind !== 'storno' && i.status !== 'storniert' && i.mail_status && i.mail_status !== 'gesendet';\nconst invStatus = (i) => html`${st(INV_STATUS, i.status)}${notSent(i) ? html` ${badge('nicht versendet', 'warn')}` : ''}${i.overdue ? html` ${badge('\u00fcberf\u00e4llig', 'err')}` : ''}${i.dunning_level ? html`<span class=\"cell-sub\">${S.config.dunningLevels[i.dunning_level] || 'Mahnstufe ' + i.dunning_level}</span>` : ''}`;\nconst ACC_TABS = () => [['uebersicht', '\u00dcbersicht', '#/buchhaltung'], ['faelle', 'Abrechnungsf\u00e4lle', '#/buchhaltung/faelle'], ['rechnungen', 'Ausgangsrechnungen', '#/buchhaltung/rechnungen'],\n  ['eingang', 'Eingangsrechnungen', '#/buchhaltung/eingang'], ['lieferanten', 'Lieferanten', '#/buchhaltung/lieferanten'], ['zahlungen', 'Zahlungslisten', '#/buchhaltung/zahlungen']];\n// Hinweis, solange kein E-Mail-Versand eingerichtet ist\nconst mailWarn = () => (S.mailReady ? '' : html`<div class=\"err-box mt\">${icon('alert')}<span><b>E-Mail-Versand ist nicht eingerichtet.</b> Rechnungen, Mahnungen und Einladungen werden erstellt, aber <b>nicht verschickt</b>. ${can('settings_all') ? html`Hinterlege den Postfach-Zugang einmal unter <a class=\"link\" href=\"#/verwaltung/einstellungen\">Verwaltung \u2192 Einstellungen \u2192 E-Mail-Versand</a>.` : 'Bitte den Admin, den Postfach-Zugang in den Einstellungen zu hinterlegen.'} Danach Rechnungen \u00fcber \u201eJetzt senden\u201c verschicken.</span></div>`);\nconst accHead = (tab) => html`${mailWarn()}${head('Buchhaltung', 'Rechnungen an Gesch\u00e4ftspartner, Zahlungseing\u00e4nge, Mahnwesen, Eingangsrechnungen und Zahlungsl\u00e4ufe.', can('acc_manage') ? html`<button class=\"btn\" data-act=\"newInvoice\">${icon('plus')}Rechnung schreiben</button>${can('acc_manage') ? html`<button class=\"btn\" data-act=\"monthlyRun\">Sammelrechnungen jetzt erstellen</button>` : ''}` : '')}${tabsBar(ACC_TABS(), tab)}`;\n\nasync function pageAccounting(tab = 'uebersicht') {\n  const P = page('buchhaltung');\n  if (!can('acc_view')) return P.show(noAccess());\n  const fn = { uebersicht: accOverview, faelle: accItems, rechnungen: accInvoices, eingang: accPurchase, lieferanten: accSuppliers, zahlungen: accPayruns }[tab] || accOverview;\n  await fn(P, tab);\n}\nasync function accOverview(P, tab) {\n  const [o, od] = await Promise.all([GET('/acc/overview'), GET('/acc/invoices', { overdue: 1, sort: 'due', dir: 'asc' })]);\n  if (!P.alive()) return;\n  P.show(html`${accHead(tab)}\n    <div class=\"kpis mt\">\n      <a class=\"kpi\" href=\"#/buchhaltung/rechnungen?status=offen\"><b>${fEur(o.open.sum)}</b><span>${plural(o.open.n, 'offene Rechnung', 'offene Rechnungen')}</span></a>\n      <a class=\"kpi ${o.overdue.n ? 'hot' : ''}\" href=\"#/buchhaltung/rechnungen?overdue=1\"><b>${fEur(o.overdue.sum)}</b><span>${plural(o.overdue.n, 'Rechnung', 'Rechnungen')} \u00fcberf\u00e4llig</span></a>\n      <a class=\"kpi ${o.cases.open ? 'hot' : ''}\" href=\"#/buchhaltung/faelle\"><b>${fNum(o.cases.open)}</b><span>Abrechnungsf\u00e4lle offen</span></a>\n      <a class=\"kpi\" href=\"#/buchhaltung/faelle?status=gesammelt\"><b>${fEur(o.cases.collected_sum)}</b><span>${fNum(o.cases.collected)} in der Sammelablage</span></a>\n      <div class=\"kpi\"><b>${fEur(o.month.net)}</b><span>Umsatz netto diesen Monat</span></div>\n      <div class=\"kpi\"><b>${fEur(o.month.paid)}</b><span>Zahlungseingang diesen Monat</span></div>\n      <a class=\"kpi\" href=\"#/buchhaltung/eingang\"><b>${fEur(o.purchase.due)}</b><span>Eingangsrechnungen f\u00e4llig</span></a>\n      <a class=\"kpi ${o.payruns ? 'hot' : ''}\" href=\"#/buchhaltung/zahlungen\"><b>${fNum(o.payruns)}</b><span>Zahlungslisten zur Freigabe</span></a></div>\n    <section class=\"panel mt\"><div class=\"panel-head\"><h2>\u00dcberf\u00e4llige Rechnungen</h2><a class=\"btn btn-sm\" href=\"#/buchhaltung/rechnungen?overdue=1\">Alle anzeigen</a></div>\n      ${od.invoices.length ? invTable(od.invoices.slice(0, 12)) : html`<div class=\"panel-body\">${empty('Keine \u00fcberf\u00e4lligen Rechnungen', 'Alle offenen Rechnungen sind noch im Zahlungsziel.')}</div>`}</section>`);\n}\nfunction invTable(list) {\n  return html`<div class=\"table-wrap\"><table class=\"table\"><thead><tr><th><button data-act=\"invSort\" data-key=\"number\">Nummer</button></th><th><button data-act=\"invSort\" data-key=\"date\">Datum</button></th><th><button data-act=\"invSort\" data-key=\"recipient\">Empf\u00e4nger</button></th><th><button data-act=\"invSort\" data-key=\"due\">F\u00e4llig</button></th><th class=\"r\"><button data-act=\"invSort\" data-key=\"gross\">Brutto</button></th><th class=\"r\">Offen</th><th><button data-act=\"invSort\" data-key=\"status\">Status</button></th></tr></thead>\n    <tbody>${list.map((i) => html`<tr class=\"clickable\" data-act=\"openInvoice\" data-id=\"${i.id}\"><td class=\"strong num\">${i.number}<span class=\"cell-sub\">${{ einzel: 'Einzelrechnung', sammel: 'Sammelrechnung', manuell: 'Manuell', storno: 'Stornorechnung' }[i.kind] || i.kind}</span></td>\n      <td>${fDate(i.issue_date)}</td><td>${i.recipient.name || '\u2013'}<span class=\"cell-sub\">${i.sent_to || ''}</span></td><td>${fDate(i.due_date)}</td><td class=\"r num\">${fEur(i.gross)}${i.fees ? html`<span class=\"cell-sub\">+ ${fEur(i.fees)} Geb\u00fchren</span>` : ''}</td><td class=\"r num\">${fEur(i.open)}</td><td>${invStatus(i)}${notesTag(i)}</td></tr>`)}</tbody></table></div>`;\n}\nACT.invSort = (b) => { const q = hashQuery(); setHashQuery({ ...q, sort: b.dataset.key, dir: q.sort === b.dataset.key && q.dir !== 'asc' ? 'asc' : 'desc' }, '#/buchhaltung/rechnungen'); };\n\nasync function accItems(P, tab) {\n  const q = hashQuery(); const status = q.status || 'aktiv';\n  const d = await GET('/acc/items', { status }); if (!P.alive()) return;\n  const n = d.counts || {};\n  const chips = { aktiv: 'Aktuell', offen: 'Offen', gesammelt: 'Sammelablage', abgerechnet: 'Abgerechnet', storniert: 'Storniert', alle: 'Alle' };\n  P.show(html`${accHead(tab)}<section class=\"panel mt\"><div class=\"toolbar\">${Object.entries(chips).map(([k, l]) => html`<a class=\"btn btn-sm ${status === k ? 'btn-dark' : 'btn-ghost'}\" href=\"#/buchhaltung/faelle?status=${k}\">${l}${n[k] ? html` <span class=\"count ${k === 'offen' ? 'hot' : ''}\">${n[k]}</span>` : ''}</a>`)}\n      <span class=\"spacer\"></span><span class=\"small muted\">Gewonnene Anfragen, deren Kontaktdaten an den Partner gingen. \u201eAktuell\u201c zeigt alle F\u00e4lle au\u00dfer stornierten.</span></div>\n    ${d.items.length ? html`<div class=\"table-wrap\"><table class=\"table\"><thead><tr><th>Anfrage</th><th>Kunde</th><th>Gesch\u00e4ftspartner</th><th>Abrechnung</th><th class=\"r\">Netto</th><th>Status</th><th></th></tr></thead><tbody>\n      ${d.items.map((i) => html`<tr><td class=\"nowrap\">${i.number ? html`<a class=\"link strong\" href=\"#/anfragen/${i.number}\">#${i.number}</a>` : '\u2013'}<span class=\"cell-sub\">${i.vehicle || i.description}</span><span class=\"cell-sub\">gewonnen ${fDate(i.created_at)}</span></td>\n        <td>${i.customer_name || '\u2013'}<span class=\"cell-sub\">${i.customer_email || ''}</span><span class=\"cell-sub\">${i.customer_phone || ''}</span></td>\n        <td>${i.org_name}<span class=\"cell-sub\">${i.billing_email || 'keine Rechnungs-E-Mail'}</span></td><td>${i.billing_mode === 'monatlich' ? 'Monatlich' : 'Je Fall'}</td>\n        <td class=\"r num\">${fEur(i.amount_net)}</td><td>${st(ITEM_STATUS, i.status)}${i.invoice_number ? html`<span class=\"cell-sub\"><button class=\"link\" data-act=\"openInvoice\" data-id=\"${i.invoice_id}\">${i.invoice_number}</button> \u00b7 ${(INV_STATUS[i.invoice_status] || [i.invoice_status])[0]}${i.invoice_cases > 1 ? ` \u00b7 ${i.invoice_cases} F\u00e4lle` : ''}</span>` : ''}${notesTag(i)}${i.status === 'storniert' ? html`<span class=\"cell-sub\">Grund: ${i.cancel_reason || '\u2013'}</span><span class=\"cell-sub\">${i.cancelled_by || ''} \u00b7 ${fDT(i.cancelled_at)}</span>` : ''}</td>\n        <td class=\"r\"><div class=\"row-acts\"><button class=\"btn btn-sm btn-ghost\" data-act=\"itemOpen\" data-id=\"${i.id}\">Ansehen</button>${can('acc_manage') && i.status === 'offen' ? html`<button class=\"btn btn-sm btn-primary\" data-act=\"itemBill\" data-id=\"${i.id}\" data-mode=\"${i.billing_mode}\">${icon('send')}Rechnung versenden</button>` : ''}${itemCancelBtn(i)}</div></td></tr>`)}</tbody></table></div>`\n      : html`<div class=\"panel-body\">${empty({ aktiv: 'Keine aktuellen Abrechnungsf\u00e4lle', offen: 'Keine offenen Abrechnungsf\u00e4lle', storniert: 'Keine stornierten F\u00e4lle' }[status] || 'Keine F\u00e4lle', status === 'offen' && n.aktiv ? 'Bereits abgerechnete F\u00e4lle findest du unter \u201eAktuell\u201c oder \u201eAbgerechnet\u201c \u2013 dort lassen sie sich auch stornieren.' : 'Sobald ein Kunde \u201eInteressiert mich\u201c klickt, erscheint der Fall hier.')}</div>`}</section>`);\n}\n/* ---------- Notizen (Buchhaltung) und vom Vertrieb angeheftete Notizen ---------- */\nfunction accNotesBlock(notes, target, id) {\n  const pinned = notes.filter((n) => n.kind === 'vertrieb'), own = notes.filter((n) => n.kind !== 'vertrieb');\n  return html`<section class=\"acc-notes\"><div class=\"row-between\"><h3>Notizen</h3><span class=\"small muted\">sichtbar f\u00fcr Buchhaltung, Gesch\u00e4ftsf\u00fchrung und Admin</span></div>\n    ${pinned.map((n) => html`<div class=\"pin-note\">${icon('pin')}<div><div class=\"tl-meta\"><b>Vom Vertrieb angeheftet</b> \u00b7 ${n.author_name || 'Vertrieb'} \u00b7 ${fDT(n.created_at)}${n.request_number ? html` \u00b7 <a class=\"link\" href=\"#/anfragen/${n.request_number}\">Anfrage #${n.request_number}</a>` : ''}</div><div class=\"pre\">${n.text}</div></div></div>`)}\n    <form class=\"note-form\" data-submit=\"accNote\"><input type=\"hidden\" name=\"target\" value=\"${target}\"><input type=\"hidden\" name=\"id\" value=\"${id}\">${area('text', '', { rows: 2, req: true, ph: target === 'invoice' ? 'Notiz zur Rechnung, z. B. Zahlung telefonisch zugesagt bis 15.11.' : 'Notiz zum Fall, z. B. Partner bittet um Sammelrechnung' })}<button class=\"btn btn-sm btn-dark\" type=\"submit\">${icon('plus')}Notiz hinzuf\u00fcgen</button></form>\n    ${own.length ? html`<ul class=\"timeline mt\">${own.map((n) => html`<li class=\"kfl\"><div><div class=\"tl-meta\">${n.author_name || 'System'} \u00b7 ${fDT(n.created_at)}${target === 'invoice' && n.kind === 'fall' ? ' \u00b7 zum Abrechnungsfall' : ''}</div><div class=\"pre\">${n.text}</div></div></li>`)}</ul>` : html`<p class=\"small muted\">Noch keine Notizen der Buchhaltung.</p>`}</section>`;\n}\nSUBMIT.accNote = async (d, f) => {\n  await POST(d.target === 'invoice' ? `/acc/invoices/${d.id}/notes` : `/acc/items/${d.id}/notes`, { text: d.text });\n  toast('Notiz gespeichert.');\n  const reopen = { dataset: { id: d.id } }; closeModal(); await (d.target === 'invoice' ? ACT.openInvoice(reopen) : ACT.itemOpen(reopen)); reload();\n};\nconst notesTag = (i) => (i.notes_n ? html`<span class=\"cell-sub notes-tag ${i.pinned_n ? 'pinned' : ''}\">${icon(i.pinned_n ? 'pin' : 'note')}${plural(i.notes_n, 'Notiz', 'Notizen')}${i.pinned_n ? ' \u00b7 Vertrieb' : ''}</span>` : '');\nACT.itemOpen = async (b) => {\n  const d = await GET('/acc/items/' + b.dataset.id);\n  const it = d.item, mng = can('acc_manage');\n  modal({ title: `Abrechnungsfall${d.request ? ' zu Anfrage #' + d.request.number : ''}`, wide: true, body: html`<div class=\"grid-2\">\n    <div class=\"stack\"><h3>Anfrage</h3>${d.request ? kv([['Nummer', html`<a class=\"link\" href=\"#/anfragen/${d.request.number}\">#${d.request.number}</a>`], ['Fahrzeug', d.request.vehicle], ['Anliegen', d.request.summary], ['Eingang', fDT(d.request.created_at)]]) : html`<p class=\"muted\">Kein Anfragebezug.</p>`}\n      <h3>Kunde</h3>${d.customer ? kv([['Name', d.customer.name], ['E-Mail', d.customer.email], ['Telefon', d.customer.phone], ['Anschrift', [d.customer.street, d.customer.zip, d.customer.city].filter(Boolean).join(' ')]]) : ''}</div>\n    <div class=\"stack\"><h3>Gesch\u00e4ftspartner (Zuschlag)</h3>${kv([['Firma', d.org.name], ['Rechnungsanschrift', [d.org.street, [d.org.zip, d.org.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')], ['Rechnungs-E-Mail', d.org.email], ['USt-IdNr.', d.org.vat_id], ['Abrechnung', d.org.billing_mode === 'monatlich' ? 'Monatliche Sammelrechnung' : 'Je Fall'], ['Zahlungsziel', d.org.payment_terms_days != null ? d.org.payment_terms_days + ' Tage (individuell)' : 'Standard']])}\n      ${d.offer ? html`<h3>Angebot</h3>${kv([['Bearbeiter', d.offer.user_name], ...offerRows(d.offer.data).slice(0, 8)])}` : ''}</div></div>\n    <hr class=\"sep\"><form class=\"stack\" data-submit=\"itemSave\"><input type=\"hidden\" name=\"id\" value=\"${it.id}\">\n      <div class=\"grid-2\">${field('Betrag netto', inp('amount', it.amount_net, { attrs: mng && ['offen', 'gesammelt'].includes(it.status) ? '' : 'disabled' }))}${field('Leistungstext', inp('description', it.description, { attrs: mng && ['offen', 'gesammelt'].includes(it.status) ? '' : 'disabled' }))}</div>\n      ${it.status === 'storniert' ? html`<div class=\"note-box\">${icon('x')}<span><b>Storniert</b> am ${fDT(it.cancelled_at)} von ${it.cancelled_by || '\u2013'}. Grund: ${it.cancel_reason || '\u2013'}</span></div>` : ''}\n      ${mng || can('acc_cancel') ? html`<div class=\"row\">${mng ? html`<button class=\"btn btn-dark\" type=\"submit\">Speichern</button>` : ''}${mng && it.status === 'offen' ? html`<button class=\"btn btn-primary\" type=\"button\" data-act=\"itemBill\" data-id=\"${it.id}\" data-mode=\"${d.org.billing_mode}\">${icon('send')}Rechnung versenden</button>` : ''}<span class=\"spacer\"></span>${itemCancelBtn({ ...it, invoice_number: d.invoiceNumber, invoice_cases: d.invoiceCases, invoice_paid: d.invoicePaid, billing_mode: d.org.billing_mode })}</div>` : ''}</form><hr class=\"sep\">${accNotesBlock(d.notes || [], 'item', it.id)}` });\n};\n// Stornieren nur mit Recht \u201eacc_cancel\u201c (Admin, Gesch\u00e4ftsf\u00fchrung, Buchhaltung)\nfunction itemCancelBtn(i) {\n  if (!can('acc_cancel')) return '';\n  if (i.status === 'storniert') return html` <button class=\"btn btn-sm\" type=\"button\" data-act=\"itemReopen\" data-id=\"${i.id}\">${icon('refresh')}Storno aufheben</button>`;\n  if (i.status === 'abgerechnet' && i.invoice_paid > 0) return html` <button class=\"btn btn-sm btn-ghost\" type=\"button\" disabled title=\"F\u00fcr die Rechnung ${i.invoice_number} sind Zahlungen erfasst \u2013 Storno erst nach Kl\u00e4rung der Zahlung.\">${icon('lock')}Bezahlt</button>`;\n  return html` <button class=\"btn btn-sm btn-ghost\" type=\"button\" data-act=\"itemCancel\" data-id=\"${i.id}\" data-status=\"${i.status}\" data-inv=\"${i.invoice_number || ''}\" data-cases=\"${i.invoice_cases || 0}\" data-monthly=\"${i.billing_mode === 'monatlich' ? 1 : ''}\" data-no=\"${i.number || ''}\">${icon('x')}Stornieren</button>`;\n}\nACT.itemCancel = async (b) => {\n  const billed = b.dataset.status === 'abgerechnet', inv = b.dataset.inv, no = b.dataset.no, cases = +b.dataset.cases || 1;\n  const back = b.dataset.monthly ? 'kommt zur\u00fcck in die Sammelablage' : 'wird wieder \u201eOffen\u201c';\n  const choice = billed ? html`<div class=\"field\"><span class=\"field-label\">Was soll storniert werden? *</span>\n      <label class=\"check\"><input type=\"radio\" name=\"mode\" value=\"fall\" checked><span><b>Fall und Rechnung stornieren</b><br><span class=\"small muted\">Der Vorgang wird nicht berechnet. Die Rechnung ${inv} wird per Stornorechnung aufgehoben${cases > 1 ? `, die ${cases - 1} anderen F\u00e4lle dieser Rechnung werden sofort korrigiert neu berechnet` : ''}.</span></span></label>\n      <label class=\"check\"><input type=\"radio\" name=\"mode\" value=\"rechnung\"><span><b>Nur die Rechnung stornieren</b><br><span class=\"small muted\">Die Rechnung ${inv} wird per Stornorechnung aufgehoben, der Fall ${back}${cases > 1 ? ` (ebenso die ${cases - 1} anderen F\u00e4lle der Rechnung)` : ''} \u2013 z. B. um ihn mit korrigiertem Betrag neu abzurechnen.</span></span></label></div>` : '';\n  const text = billed ? `Der Fall ist bereits abgerechnet (Rechnung ${inv}). Die Stornorechnung geht automatisch an den Gesch\u00e4ftspartner.`\n    : 'Der Fall wird nicht abgerechnet und verschwindet aus den offenen F\u00e4llen' + (b.dataset.status === 'gesammelt' ? ' und aus der Sammelablage' : '') + '. Das Storno kann sp\u00e4ter wieder aufgehoben werden.';\n  const d = await ask({ title: `Abrechnungsfall${no ? ' zu Anfrage #' + no : ''} stornieren?`, text, ok: 'Stornieren', danger: true,\n    fields: html`${choice}${field('Grund *', inp('reason', '', { req: true, ph: 'z. B. Kunde hat nicht gekauft, Kulanz, doppelt erfasst', attrs: 'minlength=\"3\" maxlength=\"300\"' }), 'Wird im Protokoll, beim Fall und auf der Stornorechnung vermerkt.')}` });\n  if (!d) return;\n  const r = await POST(`/acc/items/${b.dataset.id}/cancel`, { reason: d.reason, mode: d.mode || 'fall' });\n  closeModal();\n  if (r.mode === 'rechnung') toast(`Rechnung storniert (Stornorechnung ${r.stornoNumber}). Der Fall ist wieder ${r.status === 'gesammelt' ? 'in der Sammelablage' : 'offen'}.`);\n  else toast(r.stornoNumber ? `Storniert. Stornorechnung ${r.stornoNumber} erstellt${r.newNumber ? `, ${plural(r.rebilled, 'weiterer Fall', 'weitere F\u00e4lle')} neu abgerechnet (${r.newNumber})` : ''}.` : 'Fall storniert.');\n  reload();\n};\nACT.itemReopen = async (b) => {\n  if (!(await confirmBox('Storno aufheben?', 'Der Fall wird wieder abrechenbar und erscheint unter \u201eOffen\u201c (bzw. in der Sammelablage). Eine bereits erstellte Stornorechnung bleibt bestehen.', 'Storno aufheben'))) return;\n  const r = await POST(`/acc/items/${b.dataset.id}/reopen`); closeModal(); toast(r.status === 'gesammelt' ? 'Fall liegt wieder in der Sammelablage.' : 'Fall ist wieder offen.'); reload();\n};\nSUBMIT.itemSave = async (d) => { if (d.amount !== undefined) await POST(`/acc/items/${d.id}/amount`, { amount: d.amount, description: d.description }); closeModal(); toast('Gespeichert.'); reload(); };\nACT.itemBill = async (b) => {\n  const monthly = b.dataset.mode === 'monatlich';\n  if (!(await confirmBox('Rechnung versenden?', monthly ? 'Dieser Partner zahlt monatlich: Der Fall kommt in die Sammelablage und wird am Monatsende mit allen anderen F\u00e4llen abgerechnet. Das Zahlungsziel beginnt dann.' : 'Die Rechnung wird erstellt und sofort per E-Mail (von noreplay@kfl-group.com) an die Rechnungsadresse des Partners geschickt.', monthly ? 'In Sammelablage legen' : 'Rechnung erstellen und senden'))) return;\n  const r = await POST(`/acc/items/${b.dataset.id}/bill`); closeModal();\n  if (r.mode === 'monatlich') toast('In die Sammelablage gelegt.');\n  else if (r.mail === 'gesendet') toast(`Rechnung erstellt und an ${r.sentTo} versendet.`);\n  else toast(`Rechnung erstellt, aber NICHT versendet: ${r.mailError || 'E-Mail-Versand nicht eingerichtet'}`, 'err');\n  reload();\n};\nACT.monthlyRun = async () => { if (!(await confirmBox('Sammelrechnungen jetzt erstellen?', 'Normalerweise passiert das automatisch am Monatsende. Alle F\u00e4lle in der Sammelablage werden jetzt je Partner abgerechnet und versendet.', 'Jetzt erstellen'))) return; const r = await POST('/acc/monthly-run'); toast(`${r.count || 0} Sammelrechnung(en) erstellt.`); reload(); };\n\nasync function accInvoices(P, tab) {\n  const q = hashQuery();\n  const d = await GET('/acc/invoices', q); if (!P.alive()) return;\n  const sum = d.invoices.reduce((a, i) => a + (i.status === 'storniert' ? 0 : i.open), 0);\n  P.show(html`${accHead(tab)}<section class=\"panel mt\"><form class=\"toolbar\" data-submit=\"invFilter\">\n      <label class=\"search\">${icon('search')}<input name=\"q\" value=\"${q.q || ''}\" placeholder=\"Rechnungsnummer, Empf\u00e4nger, Anfragenummer \u2026\" aria-label=\"Suche\"></label>\n      ${sel('status', Object.entries(INV_STATUS).map(([k, v]) => [k, v[0]]), q.status, { empty: 'Alle Status', attrs: 'data-change=\"invFilterChange\" aria-label=\"Status\"' })}\n      ${sel('kind', [['einzel', 'Einzelrechnung'], ['sammel', 'Sammelrechnung'], ['manuell', 'Manuell'], ['storno', 'Storno']], q.kind, { empty: 'Alle Arten', attrs: 'data-change=\"invFilterChange\" aria-label=\"Art\"' })}\n      <input type=\"date\" name=\"from\" value=\"${q.from || ''}\" aria-label=\"Von\" data-change=\"invFilterChange\"><input type=\"date\" name=\"to\" value=\"${q.to || ''}\" aria-label=\"Bis\" data-change=\"invFilterChange\">\n      <label class=\"check small\"><input type=\"checkbox\" name=\"overdue\" value=\"1\" ${q.overdue ? raw('checked') : ''} data-change=\"invFilterChange\"><span>\u00dcberf\u00e4llig</span></label>\n      <label class=\"check small\"><input type=\"checkbox\" name=\"dunned\" value=\"1\" ${q.dunned ? raw('checked') : ''} data-change=\"invFilterChange\"><span>Angemahnt</span></label>\n      <button class=\"btn btn-sm btn-dark\" type=\"submit\">Suchen</button></form>\n    ${d.invoices.length ? html`${invTable(d.invoices)}<div class=\"pager\"><span>${plural(d.invoices.length, 'Rechnung', 'Rechnungen')}</span><span>Offen gesamt: <b class=\"num\">${fEur(sum)}</b></span></div>` : html`<div class=\"panel-body\">${empty('Keine Rechnungen gefunden')}</div>`}</section>`);\n}\nSUBMIT.invFilter = (d) => { const q = hashQuery(); setHashQuery({ sort: q.sort, dir: q.dir, q: d.q, status: d.status, kind: d.kind, from: d.from, to: d.to, overdue: d.overdue ? 1 : '', dunned: d.dunned ? 1 : '' }, '#/buchhaltung/rechnungen'); };\nCHANGE.invFilterChange = (el) => SUBMIT.invFilter({ ...formData(el.form), overdue: el.form.elements.overdue.checked, dunned: el.form.elements.dunned.checked });\n\nACT.openInvoice = async (b) => {\n  const d = await GET('/acc/invoices/' + b.dataset.id);\n  const i = d.invoice, mng = can('acc_manage'), live = ['offen', 'teilbezahlt'].includes(i.status) && i.kind !== 'storno';\n  const nextLevel = (i.dunning_level || 0) + 1;\n  modal({ title: `Rechnung ${i.number}`, wide: true, body: html`<div class=\"row-between\"><div>${invStatus({ ...i, overdue: live && i.due_date < todayISO() })}</div>\n      <div class=\"row\"><a class=\"btn btn-sm\" target=\"_blank\" rel=\"noopener\" href=\"${fileUrl(`/acc/invoices/${i.id}/pdf`)}\">${icon('eye')}PDF ansehen</a><a class=\"btn btn-sm\" href=\"${fileUrl(`/acc/invoices/${i.id}/pdf`, { download: 1 })}\">${icon('download')}Herunterladen</a></div></div>\n    <div class=\"grid-2 mt\"><div>${kv([['Empf\u00e4nger', i.recipient.name], ['Anschrift', [i.recipient.street, [i.recipient.zip, i.recipient.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')], ['Rechnungs-E-Mail', i.mail_to || i.recipient.email || html`<span class=\"badge t-err\">keine hinterlegt</span>`], ['USt-IdNr.', i.recipient.vat_id], ['Versendet', i.sent_at ? `${fDT(i.sent_at)} an ${i.sent_to}` : html`<span class=\"badge t-warn\">nicht versendet</span>${i.mail_error ? html`<span class=\"cell-sub\">${i.mail_error}</span>` : ''}`]])}</div>\n      <div>${kv([['Rechnungsdatum', fDate(i.issue_date)], ['Leistungszeitraum', i.service_from ? `${fDate(i.service_from)}${i.service_to ? ' \u2013 ' + fDate(i.service_to) : ''}` : ''], ['F\u00e4llig am', fDate(i.due_date)], ['Netto', fEur(i.net)], [`USt ${fNum(i.vat_rate)} %`, fEur(i.vat)], ['Brutto', html`<b>${fEur(i.gross)}</b>`], ['Mahngeb\u00fchren', i.fees ? fEur(i.fees) : ''], ['Bezahlt', fEur(i.paid)], ['Offen', html`<b>${fEur(i.open)}</b>`]])}</div></div>\n    <h3 class=\"mt-l\">Positionen</h3><table class=\"table\"><thead><tr><th>Leistung</th><th class=\"r\">Menge</th><th class=\"r\">Einzelpreis</th><th class=\"r\">Summe</th></tr></thead><tbody>${i.lines.map((l) => html`<tr><td>${l.description}</td><td class=\"r\">${fNum(l.qty, 2)}</td><td class=\"r num\">${fEur(l.unit)}</td><td class=\"r num\">${fEur(l.total)}</td></tr>`)}</tbody></table>\n    <div class=\"grid-2 mt-l\"><div><h3>Zahlungen</h3>${d.payments.length ? html`<ul class=\"timeline mt\">${d.payments.map((p) => html`<li><div><div class=\"tl-meta\">${fDate(p.date)} \u00b7 ${p.method}${p.author ? ' \u00b7 ' + p.author : ''}</div><b class=\"num\">${fEur(p.amount)}</b>${p.note ? html` <span class=\"muted\">${p.note}</span>` : ''}</div></li>`)}</ul>` : html`<p class=\"muted small mt\">Noch kein Zahlungseingang.</p>`}\n        ${mng && live ? html`<form class=\"inline-form mt\" data-submit=\"payAdd\"><input type=\"hidden\" name=\"id\" value=\"${i.id}\">${field('Betrag', inp('amount', i.open.toFixed(2).replace('.', ','), { req: true }))}${field('Datum', inp('date', todayISO(), { type: 'date' }))}${field('Art', sel('method', ['\u00dcberweisung', 'Lastschrift', 'Bar', 'Verrechnung', 'Kulanz'], '\u00dcberweisung'))}<button class=\"btn btn-ok\" type=\"submit\">Zahlung buchen</button></form>` : ''}</div>\n      <div><h3>Mahnwesen</h3>${d.dunnings.length ? html`<ul class=\"timeline mt\">${d.dunnings.map((m) => html`<li><div><div class=\"tl-meta\">${fDT(m.created_at)}${m.author ? ' \u00b7 ' + m.author : ' \u00b7 automatisch'}</div>${S.config.dunningLevels[m.level] || 'Stufe ' + m.level}${m.fee ? ` \u00b7 Geb\u00fchr ${fEur(m.fee)}` : ''} \u00b7 f\u00e4llig ${fDate(m.due_date)} ${m.file_id ? html`<a class=\"link small\" target=\"_blank\" rel=\"noopener\" href=\"${fileUrl(`/acc/invoices/${i.id}/dunning-pdf/${m.id}`)}\">PDF</a>` : ''}</div></li>`)}</ul>` : html`<p class=\"muted small mt\">Noch nicht angemahnt.</p>`}\n        ${mng && live && nextLevel > 3 ? html`<p class=\"small muted mt\">Letzte Mahnstufe erreicht \u2013 weiter mit Inkasso bzw. gerichtlichem Mahnverfahren.</p>` : ''}${mng && live && nextLevel <= 3 ? html`<button class=\"btn btn-sm mt\" data-act=\"dunning\" data-id=\"${i.id}\" data-level=\"${nextLevel}\">${icon('bell')}${nextLevel === 1 ? 'Zahlungserinnerung senden' : S.config.dunningLevels[nextLevel] + ' senden'}</button>` : ''}</div></div>\n    <hr class=\"sep\">${accNotesBlock(d.notes || [], 'invoice', i.id)}`,\n    foot: mng || can('acc_cancel') ? html`${can('acc_cancel') && i.kind !== 'storno' && i.status !== 'storniert' ? html`<button class=\"btn btn-ghost\" data-act=\"invCancel\" data-id=\"${i.id}\">Stornieren</button>` : ''}<span class=\"spacer\"></span>${mng ? html`<button class=\"btn ${notSent(i) ? 'btn-primary' : ''}\" data-act=\"invResend\" data-id=\"${i.id}\" data-to=\"${i.mail_to || ''}\" data-no=\"${i.number}\">${icon('mail')}${notSent(i) ? 'Jetzt senden' : 'Erneut senden'}</button>` : ''}<button class=\"btn btn-dark\" data-close>Schlie\u00dfen</button>` : html`<button class=\"btn btn-dark\" data-close>Schlie\u00dfen</button>` });\n};\nSUBMIT.payAdd = async (d) => { const r = await POST(`/acc/invoices/${d.id}/payment`, d); closeModal(); toast(r.status === 'bezahlt' ? 'Zahlung gebucht \u2013 Rechnung ist bezahlt.' : 'Teilzahlung gebucht.'); reload(); };\nACT.dunning = async (b) => {\n  const lvl = +b.dataset.level;\n  if (!(await confirmBox(`${S.config.dunningLevels[lvl]} senden?`, lvl === 1 ? 'Eine kostenlose Zahlungserinnerung mit neuer Zahlungsfrist geht per E-Mail an den Partner und erscheint in seinen News.' : `Es wird die beim Partner hinterlegte Mahngeb\u00fchr f\u00fcr die ${lvl === 2 ? '1. Mahnung (Stufe 1)' : '2. Mahnung (Stufe 2, letzte Mahnung)'} berechnet. Das Schreiben geht per E-Mail (von noreplay@kfl-group.com) und erscheint in den Partner-News.`, 'Senden'))) return;\n  const r = await POST(`/acc/invoices/${b.dataset.id}/dunning`); closeModal(); toast(`${S.config.dunningLevels[r.level]} versendet${r.fee ? ' \u00b7 Geb\u00fchr ' + fEur(r.fee) : ''}.`); reload();\n};\nACT.invCancel = async (b) => { const d = await ask({ title: 'Rechnung stornieren?', text: 'Es wird eine Stornorechnung erzeugt. Verkn\u00fcpfte Abrechnungsf\u00e4lle werden wieder ge\u00f6ffnet.', ok: 'Stornieren', danger: true, fields: field('Grund', inp('reason', '', { req: true })) }); if (!d) return; await POST(`/acc/invoices/${b.dataset.id}/cancel`, d); closeModal(); toast('Storniert.'); reload(); };\n// \u201eJetzt senden\u201c: direkt an die hinterlegte Rechnungs-E-Mail des Partners; andere Adresse nur auf Wunsch\nasync function invSend(id, email) {\n  const r = await POST(`/acc/invoices/${id}/resend`, email ? { email } : {});\n  closeModal(); closeModal();\n  if (r.mail === 'gesendet') toast(`Rechnung an ${r.to || email || 'die Rechnungsadresse'} versendet.`);\n  else toast(`Nicht versendet: ${r.error || 'E-Mail-Versand nicht eingerichtet'}`, 'err');\n  reload();\n}\nACT.invResend = async (b) => {\n  const to = b.dataset.to;\n  if (!to) return ACT.invResendOther(b);\n  const ok = await ask({ title: `Rechnung ${b.dataset.no || ''} senden`, ok: 'Jetzt senden', text: '', fields: html`<p class=\"lead\">Die Rechnung wird mit PDF an die hinterlegte Rechnungs-E-Mail gesendet:</p><p class=\"strong\">${to}</p><p class=\"small\"><button class=\"link\" type=\"button\" data-act=\"invResendOther\" data-id=\"${b.dataset.id}\" data-no=\"${b.dataset.no || ''}\">An eine andere Adresse senden</button></p>` });\n  if (ok) await invSend(b.dataset.id);\n};\nACT.invResendOther = async (b) => {\n  closeModal();\n  const d = await ask({ title: 'An andere Adresse senden', ok: 'Senden', fields: field('E-Mail-Adresse', inp('email', '', { type: 'email', req: true })) });\n  if (d) await invSend(b.dataset.id, d.email);\n};\nACT.newInvoice = async () => {\n  const orgs = (await GET('/acc/orgs')).orgs;\n  const line = () => html`<tr><td><input name=\"ld[]\" placeholder=\"Leistung\" required></td><td><input name=\"lq[]\" value=\"1\" size=\"4\"></td><td><input name=\"lu[]\" placeholder=\"0,00\" size=\"8\" required></td></tr>`;\n  modal({ title: 'Rechnung schreiben', wide: true, body: html`<form class=\"stack\" data-submit=\"invCreate\" id=\"invForm\">\n    ${field('Empf\u00e4nger', sel('org_id', orgs.map((o) => [o.id, o.name]), '', { empty: 'Anderer Empf\u00e4nger (unten eintragen)' }))}\n    <div class=\"grid-2\">${field('Name', inp('r_name'))}${field('E-Mail', inp('r_email', '', { type: 'email' }))}${field('Stra\u00dfe', inp('r_street'))}${field('PLZ / Ort', inp('r_city', '', { ph: '49451 Holdorf' }))}</div>\n    <div class=\"grid-2\">${field('Leistung von', inp('service_from', '', { type: 'date' }))}${field('Leistung bis', inp('service_to', '', { type: 'date' }))}</div>\n    ${field('Einleitungstext (optional)', area('intro', '', { rows: 2 }))}\n    <table class=\"table lines-table\"><thead><tr><th>Leistung</th><th>Menge</th><th>Einzelpreis netto</th></tr></thead><tbody id=\"lines\">${line()}${line()}</tbody></table>\n    <div class=\"row\"><button class=\"btn btn-sm\" type=\"button\" data-act=\"addLine\">${icon('plus')}Position</button><span class=\"spacer\"></span>${chk('send', true, 'Direkt per E-Mail versenden')}</div></form>`,\n    foot: html`<button class=\"btn btn-ghost\" data-close>Abbrechen</button><button class=\"btn btn-primary\" type=\"submit\" form=\"invForm\">Rechnung erstellen</button>` });\n  ACT.addLine = () => { $('#lines').insertAdjacentHTML('beforeend', part(line())); };\n};\nSUBMIT.invCreate = async (d) => {\n  const lines = d.ld.map((desc, i) => ({ description: desc, qty: d.lq[i], unit: d.lu[i] })).filter((l) => l.description && l.unit);\n  const [zip, ...city] = String(d.r_city || '').split(' ');\n  await POST('/acc/invoices', { org_id: d.org_id || null, recipient: d.org_id ? null : { name: d.r_name, email: d.r_email, street: d.r_street, zip, city: city.join(' ') }, lines, service_from: d.service_from, service_to: d.service_to, intro: d.intro, send: d.send });\n  closeModal(); toast('Rechnung erstellt.'); location.hash = '#/buchhaltung/rechnungen';\n};\n\nasync function accPurchase(P, tab) {\n  const q = hashQuery();\n  const [d, s] = await Promise.all([GET('/acc/purchase', q), GET('/acc/suppliers')]); if (!P.alive()) return;\n  const mng = can('acc_manage');\n  P.show(html`${accHead(tab)}<section class=\"panel mt\"><form class=\"toolbar\" data-submit=\"piFilter\"><label class=\"search\">${icon('search')}<input name=\"q\" value=\"${q.q || ''}\" placeholder=\"Rechnungsnummer oder Lieferant\" aria-label=\"Suche\"></label>\n      ${sel('status', Object.entries(PI_STATUS).map(([k, v]) => [k, v[0]]), q.status, { empty: 'Alle Status', attrs: 'data-change=\"piFilterChange\" aria-label=\"Status\"' })}\n      ${sel('supplier', s.suppliers.map((x) => [x.id, x.name]), q.supplier, { empty: 'Alle Lieferanten', attrs: 'data-change=\"piFilterChange\" aria-label=\"Lieferant\"' })}<button class=\"btn btn-sm btn-dark\" type=\"submit\">Suchen</button>\n      <span class=\"spacer\"></span>${mng ? html`<button class=\"btn btn-sm btn-primary\" type=\"button\" data-act=\"piNew\">${icon('plus')}Eingangsrechnung erfassen</button>` : ''}</form>\n    ${d.invoices.length ? html`<div class=\"table-wrap\"><table class=\"table\"><thead><tr><th>Lieferant</th><th>Nummer</th><th>Datum</th><th>F\u00e4llig</th><th class=\"r\">Brutto</th><th>Status</th><th></th></tr></thead><tbody>${d.invoices.map((p) => html`<tr>\n      <td><b>${p.supplier_name}</b>${p.category ? html`<span class=\"cell-sub\">${p.category}</span>` : ''}${p.entry_number ? html`<span class=\"cell-sub\">${icon('check')} ${p.account_number} ${p.account_name} \u00b7 ${p.entry_number}${p.doc_number ? ' \u00b7 ' + p.doc_number : ''}</span>` : can('fibu_view') ? html`<span class=\"cell-sub\">${badge('nicht gebucht', 'warn')}</span>` : ''}</td><td>${p.number || '\u2013'}</td><td>${fDate(p.date)}</td><td>${fDate(p.due_date)}${p.pay_date ? html`<span class=\"cell-sub\">Zahlung am ${fDate(p.pay_date)}</span>` : ''}</td><td class=\"r num\">${fEur(p.gross)}<span class=\"cell-sub\">netto ${fEur(p.net)}</span></td><td>${st(PI_STATUS, p.status)}</td>\n      <td class=\"r nowrap\">${p.file_id ? html`<a class=\"btn btn-sm btn-ghost\" target=\"_blank\" rel=\"noopener\" href=\"${fileUrl(`/acc/purchase/${p.id}/file`)}\">${icon('file')}Beleg</a>` : ''}\n        ${can('fibu_book') && !p.entry_id ? html`<button class=\"btn btn-sm btn-primary\" data-act=\"piBook\" data-id=\"${p.id}\" data-acc=\"${p.account_id || ''}\">Auf Konto buchen</button>` : ''}\n        ${mng && p.status === 'offen' ? html`<button class=\"btn btn-sm\" data-act=\"piSchedule\" data-id=\"${p.id}\" data-due=\"${p.due_date || ''}\">Zur Zahlung vormerken</button>` : ''}\n        ${mng && p.status === 'zur_zahlung' ? html`<button class=\"btn btn-sm btn-ghost\" data-act=\"piUnschedule\" data-id=\"${p.id}\">Vormerkung l\u00f6sen</button>` : ''}\n        ${mng && ['offen', 'zur_zahlung'].includes(p.status) ? html`<button class=\"btn btn-sm btn-ghost\" data-act=\"piPaid\" data-id=\"${p.id}\">Bezahlt</button>` : ''}</td></tr>`)}</tbody></table></div>`\n      : html`<div class=\"panel-body\">${empty('Keine Eingangsrechnungen', 'Erfasse Rechnungen deiner Lieferanten und merke sie zur Zahlung vor.')}</div>`}</section>`);\n  S.suppliers = s.suppliers;\n}\nSUBMIT.piFilter = (d) => setHashQuery(d, '#/buchhaltung/eingang');\nCHANGE.piFilterChange = (el) => SUBMIT.piFilter(formData(el.form));\n// Konten f\u00fcr Eingangsrechnungen (Aufwand und Aktiv, nur offene)\nasync function fibuExpenseAccounts() { if (!can('fibu_view')) return []; const d = await GET('/fibu/accounts'); return d.accounts.filter((a) => a.status === 'offen' && (a.type === 'aufwand' || (a.type === 'aktiv' && !a.sys))); }\nACT.piNew = async () => {\n  const sups = (S.suppliers || []).filter((x) => x.active);\n  if (!sups.length) { toast('Bitte lege zuerst einen Lieferanten an.', 'err'); location.hash = '#/buchhaltung/lieferanten'; return; }\n  const accs = await fibuExpenseAccounts(), bookable = can('fibu_book') && accs.length;\n  const d = await ask({ title: 'Eingangsrechnung erfassen', wide: true, ok: bookable ? 'Erfassen und buchen' : 'Speichern', fields: html`<div class=\"grid-2\">${field('Lieferant *', sel('supplier_id', sups.map((x) => [x.id, x.name]), '', { attrs: 'required' }))}${field('Rechnungsnummer *', inp('number', '', { req: true }))}\n    ${field('Rechnungsdatum *', inp('date', todayISO(), { type: 'date', req: true }))}${field('F\u00e4llig am', inp('due_date', addDays(todayISO(), 14), { type: 'date' }))}\n    ${field('Bruttobetrag *', inp('gross', '', { req: true, ph: '0,00', attrs: 'inputmode=\"decimal\"' }), 'Rechnungsbetrag inkl. Umsatzsteuer')}${field('Umsatzsteuer', sel('vat_rate', [['19', '19 %'], ['7', '7 %'], ['0', '0 % (ohne USt / Kleinunternehmer)']], '19'), 'Netto und Vorsteuer werden berechnet')}\n    ${bookable ? field('Konto (Aufwand) *', sel('account_id', accs.map((a) => [a.id, `${a.number} \u00b7 ${a.name}`]), '', { empty: 'Bitte w\u00e4hlen', attrs: 'required' }), 'Die Rechnung wird direkt auf dieses Konto gebucht') : ''}${field('Buchungstext', inp('text', '', { ph: 'z. B. Social-Media-Kampagne Oktober' }))}\n    ${field('Kategorie', inp('category', '', { ph: 'z. B. Marketing, Software' }))}${field('Beleg (PDF) *', raw('<input type=\"file\" name=\"file\" accept=\"application/pdf\" required>'), 'Wird nummeriert im Belegarchiv abgelegt')}</div>${field('Notiz', area('note', '', { rows: 2 }))}` });\n  if (!d) return; const file = await fileField(d._form.elements.file, { max: 10 }); delete d._form;\n  if (!file) return toast('Bitte den Beleg als PDF hochladen.', 'err');\n  const r = await POST('/acc/purchase', { ...d, file });\n  if (r.bookingError) toast(`Erfasst, aber nicht gebucht: ${r.bookingError}`, 'err');\n  else toast(r.booking ? `Erfasst und gebucht (${r.booking}) \u00b7 Beleg ${r.doc}` : 'Eingangsrechnung erfasst.');\n  reload();\n};\nACT.piBook = async (b) => {\n  const accs = await fibuExpenseAccounts();\n  const d = await ask({ title: 'Eingangsrechnung buchen', ok: 'Buchen', text: 'Aufwand (netto) und Vorsteuer an Verbindlichkeiten. Der Beleg wird ins Belegarchiv \u00fcbernommen.', fields: field('Konto (Aufwand)', sel('account_id', accs.map((a) => [a.id, `${a.number} \u00b7 ${a.name}`]), b.dataset.acc || '', { empty: 'Bitte w\u00e4hlen', attrs: 'required' })) });\n  if (!d) return; const r = await POST(`/acc/purchase/${b.dataset.id}/book`, { account_id: d.account_id }); toast(`Gebucht: ${r.booking}`); reload();\n};\nACT.piSchedule = async (b) => { const d = await ask({ title: 'Zur Zahlung vormerken', text: 'Vorgemerkte Rechnungen landen beim Tagesabschluss auf der Zahlungsliste zur Freigabe durch die Gesch\u00e4ftsf\u00fchrung.', ok: 'Vormerken', fields: field('Zahlung am', inp('pay_date', b.dataset.due && b.dataset.due > todayISO() ? b.dataset.due : todayISO(), { type: 'date', req: true })) }); if (!d) return; await POST(`/acc/purchase/${b.dataset.id}/schedule`, d); toast('Vorgemerkt.'); reload(); };\nACT.piUnschedule = async (b) => { await POST(`/acc/purchase/${b.dataset.id}/unschedule`); reload(); };\nACT.piPaid = async (b) => { if (!(await confirmBox('Als bezahlt markieren?', 'Nur verwenden, wenn die Rechnung au\u00dferhalb der Zahlungsliste bezahlt wurde.', 'Als bezahlt markieren'))) return; await POST(`/acc/purchase/${b.dataset.id}/paid`); reload(); };\n\nasync function accSuppliers(P, tab) {\n  const d = await GET('/acc/suppliers'); if (!P.alive()) return;\n  P.show(html`${accHead(tab)}<section class=\"panel mt\"><div class=\"toolbar\"><span class=\"small muted\">Lieferantenkonten mit Bankverbindung f\u00fcr den SEPA-Zahlungslauf.</span><span class=\"spacer\"></span>${can('acc_manage') ? html`<button class=\"btn btn-sm btn-primary\" data-act=\"supEdit\">${icon('plus')}Lieferant anlegen</button>` : ''}</div>\n    ${d.suppliers.length ? html`<div class=\"table-wrap\"><table class=\"table\"><thead><tr><th>Name</th><th>Kontakt</th><th>IBAN</th><th>Kundennr.</th><th class=\"r\">Rechnungen</th><th></th></tr></thead><tbody>${d.suppliers.map((x) => html`<tr class=\"${x.active ? '' : 'muted'}\">\n      <td><b>${x.name}</b><span class=\"cell-sub\">${[x.street, x.zip, x.city].filter(Boolean).join(' ')}</span></td><td>${x.email || '\u2013'}<span class=\"cell-sub\">${x.phone || ''}</span></td><td class=\"num\">${x.iban ? x.iban.replace(/(.{4})/g, '$1 ').trim() : html`<span class=\"badge t-warn\">fehlt</span>`}</td><td>${x.customer_no || '\u2013'}</td><td class=\"r\">${x.invoices}</td>\n      <td class=\"r\">${can('acc_manage') ? html`<button class=\"btn btn-sm btn-ghost\" data-act=\"supEdit\" data-id=\"${x.id}\">Bearbeiten</button>` : ''}</td></tr>`)}</tbody></table></div>` : html`<div class=\"panel-body\">${empty('Noch keine Lieferanten')}</div>`}</section>`);\n  S.suppliers = d.suppliers;\n}\nACT.supEdit = async (b) => {\n  const x = (S.suppliers || []).find((s) => s.id === +b.dataset.id) || {};\n  const d = await ask({ title: x.id ? 'Lieferant bearbeiten' : 'Lieferant anlegen', wide: true, ok: 'Speichern', fields: html`<div class=\"grid-2\">${field('Name', inp('name', x.name, { req: true }))}${field('E-Mail', inp('email', x.email, { type: 'email' }))}\n    ${field('Stra\u00dfe', inp('street', x.street))}<div class=\"grid-2\">${field('PLZ', inp('zip', x.zip))}${field('Ort', inp('city', x.city))}</div>${field('Telefon', inp('phone', x.phone))}${field('Unsere Kundennummer', inp('customer_no', x.customer_no))}\n    ${field('IBAN', inp('iban', x.iban))}${field('BIC', inp('bic', x.bic))}${field('USt-IdNr.', inp('vat_id', x.vat_id))}</div>${field('Notiz', area('note', x.note, { rows: 2 }))}${x.id ? chk('active', x.active, 'Aktiv') : ''}` });\n  if (!d) return; delete d._form;\n  if (x.id) await PATCH('/acc/suppliers/' + x.id, d); else await POST('/acc/suppliers', d);\n  toast('Gespeichert.'); reload();\n};\n\nasync function accPayruns(P, tab) {\n  const d = await GET('/acc/payruns'); if (!P.alive()) return;\n  P.show(html`${accHead(tab)}<div class=\"info-box mt\">${icon('clock')}<span>Beim Tagesabschluss (Uhrzeit in den Einstellungen) werden alle vorgemerkten Eingangsrechnungen auf eine Zahlungsliste gesetzt. Die Gesch\u00e4ftsf\u00fchrung gibt sie frei und l\u00e4dt die SEPA-Datei f\u00fcrs Online-Banking herunter.</span></div>\n    <section class=\"panel mt\"><div class=\"toolbar\"><h3>Zahlungslisten</h3><span class=\"spacer\"></span>${can('acc_manage') ? html`<button class=\"btn btn-sm\" data-act=\"dayClose\">Tagesabschluss jetzt ausf\u00fchren</button>` : ''}</div>\n    ${d.payruns.length ? d.payruns.map((p) => html`<div class=\"asg\"><div class=\"asg-head\"><div><b>Zahlungsliste vom ${fDate(p.day)}</b><div class=\"asg-meta\">${plural(p.items.length, 'Zahlung', 'Zahlungen')} \u00b7 Summe <b class=\"num\">${fEur(p.total)}</b>${p.released_at ? ` \u00b7 freigegeben ${fDT(p.released_at)} von ${p.released_name || '\u2013'}` : ''}</div></div>${st(PR_STATUS, p.status)}</div>\n      <table class=\"table mt\"><tbody>${p.items.map((i) => html`<tr><td>${i.supplier}<span class=\"cell-sub\">${i.purpose}</span></td><td class=\"num small\">${i.iban}</td><td class=\"r num\">${fEur(i.amount)}</td></tr>`)}</tbody></table>\n      <div class=\"row\">${p.status === 'offen' && can('acc_release') ? html`<button class=\"btn btn-sm btn-primary\" data-act=\"prRelease\" data-id=\"${p.id}\">Freigeben und SEPA-Datei erzeugen</button>` : ''}${p.status === 'offen' && !can('acc_release') ? html`<span class=\"small muted\">Wartet auf Freigabe durch die Gesch\u00e4ftsf\u00fchrung.</span>` : ''}\n        ${p.file_id ? html`<a class=\"btn btn-sm\" href=\"${fileUrl(`/acc/payruns/${p.id}/file`)}\">${icon('download')}SEPA-Datei (XML)</a>` : ''}${p.status === 'freigegeben' && can('acc_manage') ? html`<button class=\"btn btn-sm btn-ok\" data-act=\"prPaid\" data-id=\"${p.id}\">Als ausgef\u00fchrt markieren</button>` : ''}</div></div>`)\n      : html`<div class=\"panel-body\">${empty('Noch keine Zahlungslisten')}</div>`}</section>`);\n}\nACT.dayClose = async () => { const r = await POST('/acc/payruns/close'); toast(r.id ? 'Zahlungsliste erstellt.' : 'Keine vorgemerkten Zahlungen f\u00fcr heute.', r.id ? 'ok' : 'err'); reload(); };\nACT.prRelease = async (b) => { const d = await ask({ title: 'Zahlungsliste freigeben', text: 'Es wird eine SEPA-\u00dcberweisungsdatei (pain.001) f\u00fcr dein Online-Banking erzeugt.', ok: 'Freigeben', fields: field('Ausf\u00fchrungsdatum', inp('exec_date', todayISO(), { type: 'date', req: true })) }); if (!d) return; await POST(`/acc/payruns/${b.dataset.id}/release`, d); toast('Freigegeben. Die SEPA-Datei steht zum Download bereit.'); reload(); };\nACT.prPaid = async (b) => { await POST(`/acc/payruns/${b.dataset.id}/paid`); toast('Als ausgef\u00fchrt markiert.'); reload(); };\n\n/* ===== Finanzbuchhaltung: \u00dcbersicht, Buchungen, Konten, Belegarchiv, Abschl\u00fcsse, Anfangsbest\u00e4nde & Import ===== */\nconst FIBU_TABS = () => [['uebersicht', '\u00dcbersicht', '#/fibu'], ['buchungen', 'Buchungen', '#/fibu/buchungen'], ['konten', 'Konten', '#/fibu/konten'], ['belege', 'Belegarchiv', '#/fibu/belege'],\n  ['abschluesse', 'Abschl\u00fcsse', '#/fibu/abschluesse'], can('fibu_manage') && ['import', 'Anfangsbest\u00e4nde & Import', '#/fibu/import']];\nconst FIBU_TYPE_LABEL = { aktiv: 'Aktiv', passiv: 'Passiv', aufwand: 'Aufwand', ertrag: 'Ertrag' };\nconst FIBU_SOURCE = { manuell: 'Manuell', rechnung: 'Ausgangsrechnung', zahlung: 'Zahlungseingang', mahngebuehr: 'Mahngeb\u00fchr', eingangsrechnung: 'Eingangsrechnung', zahlung_er: 'Zahlung Eingangsrechnung', eroeffnung: 'Anfangsbestand', import: 'Import', storno: 'Storno' };\nconst fibuHead = (tab) => html`${head('Finanzbuchhaltung', 'Konten, Buchungen, Belegarchiv und Abschl\u00fcsse.',\n  can('fibu_book') ? html`<button class=\"btn\" data-act=\"fibuDoc\">${icon('upload')}Beleg hochladen</button><button class=\"btn btn-primary\" data-act=\"fibuEntry\">${icon('plus')}Buchung erfassen</button>` : '')}${tabsBar(FIBU_TABS(), tab)}`;\nlet FIBU_ACC = null;\nasync function fibuAccounts(force) { if (!FIBU_ACC || force) FIBU_ACC = (await GET('/fibu/accounts')).accounts; return FIBU_ACC; }\nconst accOpt = (list) => list.filter((a) => a.status === 'offen').map((a) => [a.id, `${a.number} \u00b7 ${a.name}`]);\nconst monthName = (p) => (p.length === 4 ? `Jahr ${p}` : `${['Januar', 'Februar', 'M\u00e4rz', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'][+p.slice(5) - 1]} ${p.slice(0, 4)}`);\nconst PER_STATUS = { abgeschlossen: ['Abgeschlossen', 'ok'], wieder_geoeffnet: ['Wieder ge\u00f6ffnet', 'warn'], offen: ['Offen', 'info'], laufend: ['Laufend', 'neutral'] };\n\nasync function pageFibu(tab = 'uebersicht') {\n  const P = page('fibu');\n  if (!can('fibu_view')) return P.show(noAccess());\n  const fn = { uebersicht: fibuOverview, buchungen: fibuEntries, konten: fibuAccountsPage, belege: fibuDocs, abschluesse: fibuPeriods, import: fibuImport }[tab] || fibuOverview;\n  await fn(P, tab);\n}\nfunction entryRow(e) {\n  return html`<tr class=\"clickable ${e.reversed_by || e.reverses ? 'is-muted' : ''}\" data-act=\"fibuEntryOpen\" data-id=\"${e.id}\"><td class=\"nowrap num\"><b>${e.number}</b><span class=\"cell-sub\">${fDate(e.date)}</span></td>\n    <td>${e.text}<span class=\"cell-sub\">${FIBU_SOURCE[e.source] || e.source}${e.reversed_by ? ' \u00b7 storniert' : ''}</span></td><td class=\"small acct-cell\">${e.debit.map((x) => html`<div title=\"${x}\">${x}</div>`)}</td><td class=\"small acct-cell\">${e.credit.map((x) => html`<div title=\"${x}\">${x}</div>`)}</td>\n    <td class=\"r num\">${fEur(e.amount)}</td><td>${e.doc_number ? html`<span class=\"tag\">${e.doc_number}</span>` : html`<span class=\"muted small\">\u2013</span>`}</td></tr>`;\n}\nconst accShort = (x) => String(x || '').split(' ')[0];\nconst entryRowCompact = (e) => html`<tr class=\"clickable ${e.reversed_by || e.reverses ? 'is-muted' : ''}\" data-act=\"fibuEntryOpen\" data-id=\"${e.id}\"><td class=\"nowrap num\"><b>${e.number}</b><span class=\"cell-sub\">${fDate(e.date)}</span></td>\n    <td>${e.text}<span class=\"cell-sub\">${e.debit.map(accShort).join(', ')} an ${e.credit.map(accShort).join(', ')} \u00b7 ${FIBU_SOURCE[e.source] || e.source}</span></td><td class=\"r num nowrap\">${fEur(e.amount)}</td></tr>`;\nconst entryTableCompact = (list) => html`<div class=\"table-wrap\"><table class=\"table\"><thead><tr><th>Buchung</th><th>Text \u00b7 Soll an Haben</th><th class=\"r\">Betrag</th></tr></thead><tbody>${list.map(entryRowCompact)}</tbody></table></div>`;\nconst entryTable = (list) => html`<div class=\"table-wrap\"><table class=\"table\"><thead><tr><th>Buchung</th><th>Text</th><th>Soll</th><th>Haben</th><th class=\"r\">Betrag</th><th>Beleg</th></tr></thead><tbody>${list.map(entryRow)}</tbody></table></div>`;\n\nasync function fibuOverview(P, tab) {\n  const d = await GET('/fibu/overview'); if (!P.alive()) return;\n  const k = d.kpis;\n  P.show(html`${fibuHead(tab)}\n    <div class=\"kpis fibu-kpis mt\"><a class=\"kpi\" href=\"#/fibu/konten\"><b>${fEur(k.bank)}</b><span>Bank</span></a><div class=\"kpi\"><b>${fEur(k.kasse)}</b><span>Kasse</span></div>\n      <div class=\"kpi\"><b>${fEur(k.forderungen)}</b><span>Forderungen (offen)</span></div><div class=\"kpi\"><b>${fEur(k.verbindlichkeiten)}</b><span>Verbindlichkeiten</span></div>\n      <div class=\"kpi\"><b class=\"${k.monthResult < 0 ? 'neg' : 'pos'}\">${fEur(k.monthResult)}</b><span>Ergebnis diesen Monat</span></div><div class=\"kpi\"><b class=\"${k.yearResult < 0 ? 'neg' : 'pos'}\">${fEur(k.yearResult)}</b><span>Ergebnis seit Jahresbeginn</span></div>\n      <div class=\"kpi\"><b>${fEur(k.ust)}</b><span>USt-Zahllast (minus = Erstattung)</span></div><a class=\"kpi ${d.unbooked ? 'hot' : ''}\" href=\"#/buchhaltung/eingang\"><b>${fNum(d.unbooked)}</b><span>Eingangsrechnungen nicht gebucht</span></a></div>\n    <div class=\"detail-grid mt\"><section class=\"panel\"><div class=\"panel-head\"><h2>Letzte Buchungen</h2><a class=\"btn btn-sm btn-ghost\" href=\"#/fibu/buchungen\">Alle</a></div>${d.recent.length ? entryTableCompact(d.recent) : html`<div class=\"panel-body\">${empty('Noch keine Buchungen', 'Rechnungen, Zahlungen und Eingangsrechnungen werden automatisch gebucht. Manuelle Buchungen \u00fcber \u201eBuchung erfassen\u201c.')}</div>`}</section>\n      <section class=\"panel\"><div class=\"panel-head\"><h2>Stand</h2></div><div class=\"panel-body\">${kv([['Buchungen gesamt', fNum(d.entries)], ['Belege im Archiv', fNum(d.docs)], ['Letzter Abschluss', d.lastClose ? `${monthName(d.lastClose.period)} (${fDT(d.lastClose.closed_at)})` : 'noch keiner'], ['N\u00e4chster Monatsabschluss', 'automatisch am 1. des Folgemonats, 1:00 Uhr']])}\n        <p class=\"small muted mt\">Automatisch gebucht werden: Ausgangsrechnungen (Forderung an Erl\u00f6se + USt), Zahlungseing\u00e4nge (Bank an Forderung), Mahngeb\u00fchren, Eingangsrechnungen (Aufwand + Vorsteuer an Verbindlichkeit) und deren Zahlung.</p></div></section></div>`);\n}\n\nasync function fibuEntries(P, tab) {\n  const q = hashQuery();\n  const [d, accs] = await Promise.all([GET('/fibu/entries', q), fibuAccounts(true)]); if (!P.alive()) return;\n  P.show(html`${fibuHead(tab)}<section class=\"panel mt\"><form class=\"toolbar\" data-submit=\"fibuFilter\"><label class=\"search\">${icon('search')}<input name=\"q\" value=\"${q.q || ''}\" placeholder=\"Text, Buchungs- oder Belegnummer\" aria-label=\"Suche\"></label>\n      <input type=\"month\" name=\"period\" value=\"${q.period || ''}\" aria-label=\"Monat\">${sel('account', accs.map((a) => [a.id, `${a.number} \u00b7 ${a.name}`]), q.account, { empty: 'Alle Konten', attrs: 'aria-label=\"Konto\"' })}\n      ${sel('source', Object.entries(FIBU_SOURCE), q.source, { empty: 'Alle Arten', attrs: 'aria-label=\"Art\"' })}<button class=\"btn btn-sm btn-dark\" type=\"submit\">Filtern</button></form>\n    ${d.entries.length ? entryTable(d.entries) : html`<div class=\"panel-body\">${empty('Keine Buchungen', 'Passe den Filter an oder erfasse eine Buchung.')}</div>`}</section>`);\n}\nSUBMIT.fibuFilter = (d) => setHashQuery(d, '#/fibu/buchungen');\nACT.fibuEntryOpen = async (b) => {\n  const { entry: e } = await GET('/fibu/entries/' + b.dataset.id);\n  modal({ title: `Buchung ${e.number}`, wide: true, body: html`${kv([['Datum', fDate(e.date)], ['Text', e.text], ['Art', FIBU_SOURCE[e.source] || e.source], ['Erfasst', `${e.created_by || 'System'} \u00b7 ${fDT(e.created_at)}`], ['Beleg', e.doc_id ? html`<a class=\"link\" target=\"_blank\" rel=\"noopener\" href=\"${fileUrl(`/fibu/docs/${e.doc_id}/file`)}\">${e.doc_number} \u00f6ffnen</a>` : 'kein Beleg'], e.reversed_by && ['Status', 'storniert (Gegenbuchung vorhanden)'], e.reverses && ['Storno zu', 'Buchung #' + e.reverses]])}\n    <table class=\"table mt\"><thead><tr><th>Konto</th><th class=\"r\">Soll</th><th class=\"r\">Haben</th></tr></thead><tbody>${e.lines.map((l) => html`<tr><td>${l.number} ${l.name}</td><td class=\"r num\">${l.debit ? fEur(l.debit) : ''}</td><td class=\"r num\">${l.credit ? fEur(l.credit) : ''}</td></tr>`)}</tbody></table>`,\n    foot: html`${can('fibu_book') && !e.reversed_by && !e.reverses ? html`<button class=\"btn btn-ghost\" data-act=\"fibuReverse\" data-id=\"${e.id}\">Stornieren</button>` : ''}${can('fibu_book') && !e.doc_id ? html`<button class=\"btn\" data-act=\"fibuEntryDoc\" data-id=\"${e.id}\">${icon('upload')}Beleg zuordnen</button>` : ''}<span class=\"spacer\"></span><button class=\"btn btn-dark\" data-close>Schlie\u00dfen</button>` });\n};\nACT.fibuReverse = async (b) => { const d = await ask({ title: 'Buchung stornieren?', text: 'Es wird eine Gegenbuchung erstellt. Die urspr\u00fcngliche Buchung bleibt unver\u00e4ndert sichtbar (keine L\u00f6schung).', ok: 'Stornieren', danger: true, fields: field('Grund *', inp('reason', '', { req: true, attrs: 'minlength=\"3\"' })) }); if (!d) return; const r = await POST(`/fibu/entries/${b.dataset.id}/reverse`, { reason: d.reason }); closeModal(); toast(`Storniert (${r.number}).`); reload(); };\nACT.fibuEntryDoc = async (b) => { const d = await ask({ title: 'Beleg zuordnen', ok: 'Zuordnen', fields: html`${field('Beleg (PDF)', raw('<input type=\"file\" name=\"file\" accept=\"application/pdf\" required>'))}${field('Belegart', sel('doc_kind', Object.entries(S.fibuKinds || { sonstiges: 'Sonstiger Beleg' }), 'sonstiges'))}` }); if (!d) return; const file = await fileField(d._form.elements.file, { max: 10 }); await POST(`/fibu/entries/${b.dataset.id}/doc`, { file, doc_kind: d.doc_kind }); closeModal(); toast('Beleg zugeordnet.'); reload(); };\n\n// Neue Buchung (Soll an Haben, mit optionaler USt-Aufteilung und Beleg)\nACT.fibuEntry = async () => {\n  const accs = await fibuAccounts(true);\n  if (!S.fibuKinds) S.fibuKinds = (await GET('/fibu/docs', { q: '___' })).kinds;\n  const d = await ask({ title: 'Buchung erfassen', wide: true, ok: 'Buchen', fields: html`<div class=\"grid-2\">${field('Buchungsdatum *', inp('date', todayISO(), { type: 'date', req: true }))}${field('Betrag (brutto) *', inp('amount', '', { req: true, ph: '0,00', attrs: 'inputmode=\"decimal\"' }))}\n      ${field('Soll-Konto *', sel('debit', accOpt(accs), '', { empty: 'Bitte w\u00e4hlen', attrs: 'required' }), 'z. B. Aufwand, Bank bei Einzahlung')}${field('Haben-Konto *', sel('credit', accOpt(accs), '', { empty: 'Bitte w\u00e4hlen', attrs: 'required' }), 'z. B. Bank bei Zahlung, Erl\u00f6se')}\n      ${field('Umsatzsteuer', sel('vat_rate', [['0', 'keine Aufteilung'], ['19', '19 % herausrechnen'], ['7', '7 % herausrechnen']], '0'), 'Vorsteuer bei Aufwand, Umsatzsteuer bei Erl\u00f6s')}${field('Buchungstext *', inp('text', '', { req: true, ph: 'z. B. Miete November' }))}\n      ${field('Beleg (PDF)', raw('<input type=\"file\" name=\"file\" accept=\"application/pdf\">'), 'wird nummeriert archiviert')}${field('Belegart', sel('doc_kind', Object.entries(S.fibuKinds), 'sonstiges'))}</div>` });\n  if (!d) return; const file = await fileField(d._form.elements.file, { max: 10 }); delete d._form;\n  const r = await POST('/fibu/entries', { ...d, debit: +d.debit, credit: +d.credit, file });\n  toast(`Gebucht: ${r.number}${r.doc ? ' \u00b7 Beleg ' + r.doc : ''}`); FIBU_ACC = null; reload();\n};\n\nasync function fibuAccountsPage(P, tab) {\n  const accs = await fibuAccounts(true); if (!P.alive()) return;\n  const q = hashQuery(), t = q.type || '';\n  const list = accs.filter((a) => (!t || a.type === t) && (q.show === 'alle' || a.status === 'offen' || a.saldo));\n  P.show(html`${fibuHead(tab)}<section class=\"panel mt\"><div class=\"toolbar\">${[['', 'Alle'], ['aktiv', 'Aktiv'], ['passiv', 'Passiv'], ['aufwand', 'Aufwand'], ['ertrag', 'Ertrag']].map(([k, l]) => html`<a class=\"btn btn-sm ${t === k ? 'btn-dark' : 'btn-ghost'}\" href=\"#/fibu/konten${qs({ ...q, type: k })}\">${l}</a>`)}\n      <a class=\"btn btn-sm btn-ghost\" href=\"#/fibu/konten${qs({ ...q, show: q.show === 'alle' ? '' : 'alle' })}\">${q.show === 'alle' ? 'Geschlossene ausblenden' : 'Geschlossene zeigen'}</a><span class=\"spacer\"></span>${can('fibu_book') ? html`<button class=\"btn btn-sm btn-primary\" data-act=\"fibuAccNew\">${icon('plus')}Konto anlegen</button>` : ''}</div>\n    <div class=\"table-wrap\"><table class=\"table\"><thead><tr><th>Konto</th><th>Bezeichnung</th><th>Art</th><th class=\"r\">Soll</th><th class=\"r\">Haben</th><th class=\"r\">Saldo</th><th>Status</th></tr></thead><tbody>\n      ${list.map((a) => html`<tr class=\"clickable\" data-act=\"fibuAccOpen\" data-id=\"${a.id}\"><td class=\"strong num\">${a.number}</td><td>${a.name}${a.sys ? html`<span class=\"cell-sub\">Systemkonto (automatische Buchungen)</span>` : ''}</td><td>${FIBU_TYPE_LABEL[a.type]}</td>\n        <td class=\"r num\">${fEur(a.debit)}</td><td class=\"r num\">${fEur(a.credit)}</td><td class=\"r num strong\">${fEur(a.saldo)}</td><td>${a.status === 'offen' ? badge('Offen', 'ok') : badge('Geschlossen', 'muted')}</td></tr>`)}</tbody></table></div></section>`);\n}\nACT.fibuAccNew = async () => {\n  const d = await ask({ title: 'Konto anlegen', ok: 'Anlegen', fields: html`<div class=\"grid-2\">${field('Kontonummer *', inp('number', '', { req: true, ph: 'z. B. 4980', attrs: 'inputmode=\"numeric\" pattern=\"[0-9]{3,8}\"' }))}${field('Kontoart *', sel('type', Object.entries({ aufwand: 'Aufwandskonto', ertrag: 'Ertragskonto', aktiv: 'Aktivkonto (Verm\u00f6gen, Bank)', passiv: 'Passivkonto (Schulden, Kapital)' }), 'aufwand'))}</div>${field('Bezeichnung *', inp('name', '', { req: true }))}${field('Notiz', inp('note', ''))}` });\n  if (!d) return; await POST('/fibu/accounts', d); toast('Konto angelegt.'); FIBU_ACC = null; reload();\n};\nACT.fibuAccOpen = async (b) => {\n  const d = await GET('/fibu/accounts/' + b.dataset.id); const a = d.account;\n  modal({ title: `Konto ${a.number} \u00b7 ${a.name}`, wide: true, body: html`<div class=\"row-between\"><div class=\"small muted\">${FIBU_TYPE_LABEL[a.type]}konto${a.sys ? ' \u00b7 Systemkonto' : ''}${a.status !== 'offen' ? ` \u00b7 geschlossen am ${fDT(a.closed_at)} von ${a.closed_by}` : ''}</div><div class=\"strong\">Saldo ${fEur(d.saldo)}</div></div>\n    ${d.items.length ? html`<div class=\"table-wrap mt\"><table class=\"table\"><thead><tr><th>Datum</th><th>Buchung</th><th>Text</th><th class=\"r\">Soll</th><th class=\"r\">Haben</th><th class=\"r\">Saldo</th></tr></thead><tbody>${d.items.map((i) => html`<tr><td>${fDate(i.date)}</td><td class=\"num\">${i.number}${i.doc_number ? html`<span class=\"cell-sub\">${i.doc_number}</span>` : ''}</td><td>${i.text}</td><td class=\"r num\">${i.debit ? fEur(i.debit) : ''}</td><td class=\"r num\">${i.credit ? fEur(i.credit) : ''}</td><td class=\"r num\">${fEur(i.balance)}</td></tr>`)}</tbody></table></div>` : html`<p class=\"muted mt\">Noch keine Buchungen auf diesem Konto.</p>`}`,\n    foot: html`${can('fibu_manage') && a.status === 'offen' && !a.sys ? html`<button class=\"btn btn-ghost\" data-act=\"fibuAccClose\" data-id=\"${a.id}\" data-name=\"${a.number} ${a.name}\">Konto schlie\u00dfen</button>` : ''}${S.user.role === 'admin' && a.status !== 'offen' ? html`<button class=\"btn\" data-act=\"fibuAccReopen\" data-id=\"${a.id}\">Wieder \u00f6ffnen</button>` : ''}<span class=\"spacer\"></span><button class=\"btn btn-dark\" data-close>Schlie\u00dfen</button>` });\n};\nACT.fibuAccClose = async (b) => { const d = await ask({ title: `Konto ${b.dataset.name} schlie\u00dfen?`, text: 'Auf geschlossene Konten kann nicht mehr gebucht werden. Das Konto muss daf\u00fcr ausgeglichen sein (Saldo 0). Nur der Admin kann es wieder \u00f6ffnen.', ok: 'Schlie\u00dfen', danger: true, fields: field('Grund', inp('reason', '')) }); if (!d) return; await POST(`/fibu/accounts/${b.dataset.id}/close`, d); closeModal(); toast('Konto geschlossen.'); FIBU_ACC = null; reload(); };\nACT.fibuAccReopen = async (b) => { await POST(`/fibu/accounts/${b.dataset.id}/reopen`); closeModal(); toast('Konto wieder ge\u00f6ffnet.'); FIBU_ACC = null; reload(); };\n\nasync function fibuDocs(P, tab) {\n  const q = hashQuery(); const d = await GET('/fibu/docs', q); if (!P.alive()) return; S.fibuKinds = d.kinds;\n  P.show(html`${fibuHead(tab)}<section class=\"panel mt\"><form class=\"toolbar\" data-submit=\"fibuDocFilter\"><label class=\"search\">${icon('search')}<input name=\"q\" value=\"${q.q || ''}\" placeholder=\"Belegnummer, Titel, Lieferant, Referenz\" aria-label=\"Suche\"></label>\n      ${sel('kind', Object.entries(d.kinds), q.kind, { empty: 'Alle Belegarten', attrs: 'aria-label=\"Belegart\"' })}<input name=\"year\" value=\"${q.year || ''}\" placeholder=\"Jahr\" size=\"5\" aria-label=\"Jahr\"><button class=\"btn btn-sm btn-dark\" type=\"submit\">Suchen</button>\n      <span class=\"spacer\"></span><span class=\"small muted\">Belege werden fortlaufend nummeriert, mit Pr\u00fcfsumme gespeichert und nie gel\u00f6scht.</span></form>\n    ${d.docs.length ? html`<div class=\"table-wrap\"><table class=\"table\"><thead><tr><th>Beleg</th><th>Datum</th><th>Art</th><th>Titel</th><th class=\"r\">Betrag</th><th>Buchungen</th><th></th></tr></thead><tbody>${d.docs.map((x) => html`<tr><td class=\"strong num nowrap\">${x.number}${x.ref ? html`<span class=\"cell-sub\">Ref. ${x.ref}</span>` : ''}</td><td>${fDate(x.date)}</td><td>${d.kinds[x.kind] || x.kind}</td>\n      <td>${x.title}${x.counterparty ? html`<span class=\"cell-sub\">${x.counterparty}</span>` : ''}<span class=\"cell-sub\" title=\"SHA-256 Pr\u00fcfsumme\">${x.sha256 ? 'SHA-256 ' + x.sha256.slice(0, 12) + '\u2026' : ''} \u00b7 ${x.created_by} \u00b7 ${fDT(x.created_at)}</span></td><td class=\"r num\">${x.amount != null ? fEur(x.amount) : '\u2013'}</td><td class=\"small nowrap\">${x.entries ? String(x.entries).split(/,\\s*/).map((n) => html`<div>${n}</div>`) : html`<span class=\"muted\">nicht verbucht</span>`}</td>\n      <td class=\"r\"><a class=\"btn btn-sm\" target=\"_blank\" rel=\"noopener\" href=\"${fileUrl(`/fibu/docs/${x.id}/file`)}\">${icon('file')}PDF</a></td></tr>`)}</tbody></table></div>` : html`<div class=\"panel-body\">${empty('Noch keine Belege', 'Belege entstehen automatisch bei Rechnungen und Eingangsrechnungen oder \u00fcber \u201eBeleg hochladen\u201c.')}</div>`}</section>`);\n}\nSUBMIT.fibuDocFilter = (d) => setHashQuery(d, '#/fibu/belege');\nACT.fibuDoc = async () => {\n  if (!S.fibuKinds) S.fibuKinds = (await GET('/fibu/docs', { q: '___' })).kinds;\n  const d = await ask({ title: 'Belege hochladen', wide: true, ok: 'Archivieren', text: 'Mehrere PDFs auf einmal m\u00f6glich. Jeder Beleg erh\u00e4lt eine fortlaufende Belegnummer. Der Dateiname wird als Referenz gespeichert (z. B. f\u00fcr den Import alter Buchungen).', fields: html`${field('Belege (PDF) *', raw('<input type=\"file\" name=\"files\" accept=\"application/pdf\" multiple required>'))}\n    <div class=\"grid-2\">${field('Belegart', sel('kind', Object.entries(S.fibuKinds), 'eingangsrechnung'))}${field('Belegdatum', inp('date', todayISO(), { type: 'date' }))}${field('Aussteller / Lieferant', inp('counterparty', ''))}${field('Betrag (optional)', inp('amount', '', { attrs: 'inputmode=\"decimal\"' }))}</div>` });\n  if (!d) return; const files = [...d._form.elements.files.files]; let n = 0, last = '';\n  for (const f of files) { if (f.size > 10 * 1024 * 1024) { toast(`${f.name}: zu gro\u00df (max. 10 MB)`, 'err'); continue; } const r = await POST('/fibu/docs', { kind: d.kind, date: d.date, counterparty: d.counterparty, amount: files.length === 1 ? d.amount : '', title: f.name.replace(/\\.pdf$/i, ''), file: { name: f.name, type: f.type || 'application/pdf', base64: await fileToB64(f) } }); n++; last = r.number; }\n  toast(n === 1 ? `Beleg ${last} archiviert.` : `${n} Belege archiviert.`); if (location.hash.startsWith('#/fibu/belege')) reload(); else location.hash = '#/fibu/belege';\n};\n\nasync function fibuPeriods(P, tab) {\n  const d = await GET('/fibu/periods'); if (!P.alive()) return;\n  const row = (p) => html`<tr class=\"clickable\" data-act=\"fibuPerOpen\" data-p=\"${p.period}\"><td class=\"strong\">${monthName(p.period)}</td><td>${badge(...(PER_STATUS[p.status] || [p.status, 'neutral']))}${p.closed_at ? html`<span class=\"cell-sub\">${p.closed_by} \u00b7 ${fDT(p.closed_at)}</span>` : ''}</td>\n    <td class=\"r num ${p.result < 0 ? 'neg' : ''}\">${p.result != null ? fEur(p.result) : '\u2013'}</td><td class=\"r nowrap\"><a class=\"btn btn-sm btn-ghost\" target=\"_blank\" rel=\"noopener\" href=\"${fileUrl(`/fibu/periods/${p.period}/pdf`)}\">${icon('file')}${p.has_pdf ? 'PDF' : 'Vorschau'}</a></td></tr>`;\n  P.show(html`${fibuHead(tab)}<div class=\"info-box mt\">${icon('calendar')}<span>Der <b>Monatsabschluss</b> wird automatisch am 1. des Folgemonats um 1:00 Uhr erstellt, der <b>Jahresabschluss</b> am 1. Januar. Die Gesch\u00e4ftsf\u00fchrung bekommt jeweils eine Nachricht mit dem Ergebnis. Abgeschlossene Zeitr\u00e4ume sind f\u00fcr Buchungen gesperrt \u2013 nur der Admin kann sie wieder \u00f6ffnen.</span></div>\n    <div class=\"grid-2 mt\"><section class=\"panel\"><div class=\"panel-head\"><h2>Monate</h2></div><div class=\"table-wrap\"><table class=\"table\"><thead><tr><th>Zeitraum</th><th>Status</th><th class=\"r\">Ergebnis</th><th></th></tr></thead><tbody>${d.months.map(row)}</tbody></table></div></section>\n      <section class=\"panel\"><div class=\"panel-head\"><h2>Jahre</h2></div><div class=\"table-wrap\"><table class=\"table\"><thead><tr><th>Zeitraum</th><th>Status</th><th class=\"r\">Ergebnis</th><th></th></tr></thead><tbody>${d.years.map(row)}</tbody></table></div></section></div>`);\n}\nACT.fibuPerOpen = async (b) => {\n  const per = b.dataset.p, d = await GET('/fibu/periods/' + per), r = d.report;\n  const closable = can('fibu_manage') && d.status !== 'abgeschlossen' && r.to < todayISO();\n  modal({ title: `${r.kind === 'jahr' ? 'Jahresabschluss' : 'Monatsabschluss'} ${monthName(per)}`, wide: true, body: html`<div class=\"row-between\"><div>${badge(...(PER_STATUS[d.status] || [d.status === 'offen' && r.to >= todayISO() ? 'Laufend' : 'Offen', 'info']))} <span class=\"small muted\">${fDate(r.from)} \u2013 ${fDate(r.to)} \u00b7 ${r.entries} Buchungen \u00b7 ${r.docs} Belege</span></div><a class=\"btn btn-sm\" target=\"_blank\" rel=\"noopener\" href=\"${fileUrl(`/fibu/periods/${per}/pdf`)}\">${icon('file')}PDF</a></div>\n    <div class=\"kpis fibu-kpis mt\"><div class=\"kpi\"><b>${fEur(r.income)}</b><span>Ertr\u00e4ge</span></div><div class=\"kpi\"><b>${fEur(r.expense)}</b><span>Aufwand</span></div><div class=\"kpi\"><b class=\"${r.result < 0 ? 'neg' : 'pos'}\">${fEur(r.result)}</b><span>${r.result < 0 ? 'Verlust' : 'Gewinn'}</span></div>${r.ytdResult != null ? html`<div class=\"kpi\"><b>${fEur(r.ytdResult)}</b><span>seit Jahresbeginn</span></div>` : ''}</div>\n    <h3 class=\"mt-l\">Summen- und Saldenliste</h3><div class=\"table-wrap\"><table class=\"table\"><thead><tr><th>Konto</th><th>Bezeichnung</th><th class=\"r\">Vortrag</th><th class=\"r\">Soll</th><th class=\"r\">Haben</th><th class=\"r\">Saldo</th></tr></thead><tbody>${r.accounts.map((a) => html`<tr><td class=\"num\">${a.number}</td><td>${a.name}</td><td class=\"r num\">${fEur(a.opening)}</td><td class=\"r num\">${fEur(a.debit)}</td><td class=\"r num\">${fEur(a.credit)}</td><td class=\"r num strong\">${fEur(a.saldo)}</td></tr>`)}</tbody></table></div>`,\n    foot: html`${closable ? html`<button class=\"btn btn-primary\" data-act=\"fibuPerClose\" data-p=\"${per}\">${icon('check')}Jetzt abschlie\u00dfen</button>` : ''}${S.user.role === 'admin' && d.status === 'abgeschlossen' ? html`<button class=\"btn btn-ghost\" data-act=\"fibuPerReopen\" data-p=\"${per}\">Wieder \u00f6ffnen</button>` : ''}<span class=\"spacer\"></span><button class=\"btn btn-dark\" data-close>Schlie\u00dfen</button>` });\n};\nACT.fibuPerClose = async (b) => { if (!(await confirmBox(`${monthName(b.dataset.p)} abschlie\u00dfen?`, 'Der Bericht wird als PDF im Belegarchiv abgelegt, die Gesch\u00e4ftsf\u00fchrung bekommt eine Nachricht und der Zeitraum wird f\u00fcr Buchungen gesperrt.', 'Abschlie\u00dfen'))) return; const r = await POST(`/fibu/periods/${b.dataset.p}/close`); closeModal(); toast(`Abgeschlossen \u00b7 Ergebnis ${fEur(r.result)}`); reload(); };\nACT.fibuPerReopen = async (b) => { if (!(await confirmBox('Zeitraum wieder \u00f6ffnen?', 'Danach sind Buchungen in diesem Zeitraum wieder m\u00f6glich. Der bisherige Abschlussbericht bleibt im Belegarchiv erhalten; beim erneuten Abschlie\u00dfen entsteht ein neuer.', 'Wieder \u00f6ffnen', true))) return; await POST(`/fibu/periods/${b.dataset.p}/reopen`); closeModal(); toast('Zeitraum wieder ge\u00f6ffnet.'); reload(); };\n\n// Anfangsbest\u00e4nde festlegen und alte Buchf\u00fchrung importieren (GF und Admin)\nlet FIBU_IMPORT = null;\nasync function fibuImport(P, tab) {\n  if (!can('fibu_manage')) return P.show(noAccess());\n  const accs = (await fibuAccounts(true)).filter((a) => a.status === 'offen' && (a.type === 'aktiv' || a.type === 'passiv') && a.sys !== 'eroeffnung'); if (!P.alive()) return;\n  const imp = FIBU_IMPORT;\n  P.show(html`${fibuHead(tab)}<div class=\"grid-2 mt\"><form class=\"panel\" data-submit=\"fibuOpening\"><div class=\"panel-head\"><h2>Anfangsbest\u00e4nde festlegen</h2></div><div class=\"panel-body stack\">\n      <p class=\"small muted\">Kontost\u00e4nde zum Start (z. B. Bankguthaben, offene Verbindlichkeiten, Eigenkapital). Gebucht wird gegen das Konto 9000 Saldenvortr\u00e4ge. Betrag auf der \u00fcblichen Seite eintragen (Verm\u00f6gen = Guthaben, Schulden = offener Betrag); ein Minus kehrt die Seite um.</p>\n      ${field('Stichtag *', inp('date', todayISO().slice(0, 7) + '-01', { type: 'date', req: true }))}\n      <div class=\"opening-list\">${accs.map((a) => html`<label class=\"opening-row\"><span><b class=\"num\">${a.number}</b> ${a.name}<span class=\"cell-sub\">${FIBU_TYPE_LABEL[a.type]} \u00b7 aktuell ${fEur(a.saldo)}</span></span><input name=\"ob_${a.id}\" placeholder=\"0,00\" inputmode=\"decimal\" aria-label=\"Anfangsbestand ${a.number}\"></label>`)}</div>\n      ${field('Nachweis (PDF, optional)', raw('<input type=\"file\" name=\"file\" accept=\"application/pdf\">'), 'z. B. Kontoauszug oder Saldenliste zum Stichtag')}\n      <button class=\"btn btn-primary\" type=\"submit\">${icon('check')}Anfangsbest\u00e4nde buchen</button></div></form>\n    <div class=\"stack\"><form class=\"panel\" data-submit=\"fibuImportParse\"><div class=\"panel-head\"><h2>Alte Buchf\u00fchrung importieren</h2></div><div class=\"panel-body stack\">\n      <p class=\"small muted\">Lade eine <b>Summen- und Saldenliste</b> oder ein <b>Buchungsjournal</b> als PDF (mit Text, kein Scan) oder CSV hoch. Das System liest die Zeilen aus \u2013 du pr\u00fcfst die Vorschau und \u00fcbernimmst sie. Das PDF wird im Belegarchiv abgelegt.</p>\n      ${field('Datei (PDF oder CSV) *', raw('<input type=\"file\" name=\"file\" accept=\"application/pdf,.csv,text/csv,text/plain\" required>'), 'CSV-Spalten: Datum;Beleg;Text;Soll;Haben;Betrag')}<button class=\"btn btn-dark\" type=\"submit\">${icon('upload')}Auslesen</button></div></form>\n      <section class=\"panel\"><div class=\"panel-head\"><h2>Belege zur alten Buchf\u00fchrung</h2></div><div class=\"panel-body stack-s\"><p class=\"small muted\">Lade die zugeh\u00f6rigen Belege als PDF hoch. Hei\u00dft eine Datei wie die Belegnummer im Journal (z. B. <code>R-100.pdf</code>), wird sie beim Import automatisch der Buchung zugeordnet.</p><button class=\"btn\" data-act=\"fibuDoc\">${icon('upload')}Belege hochladen</button></div></section></div></div>\n    ${imp ? html`<section class=\"panel mt\"><div class=\"panel-head\"><h2>Vorschau: ${imp.rows.length} Zeilen erkannt</h2><span class=\"small muted\">${imp.lineCount} Textzeilen gelesen</span></div><form class=\"panel-body stack\" data-submit=\"fibuImportCommit\">\n      ${imp.rows.length ? html`<div class=\"row\">${field('\u00dcbernehmen als', sel('mode', imp.rows.some((r) => r.kind === 'buchung') ? [['buchungen', 'Buchungen (Journal)'], ['eroeffnung', 'Anfangsbest\u00e4nde (Salden)']] : [['eroeffnung', 'Anfangsbest\u00e4nde (Salden)'], ['buchungen', 'Buchungen (Journal)']], imp.rows.some((r) => r.kind === 'buchung') ? 'buchungen' : 'eroeffnung'))}${field('Stichtag f\u00fcr Salden', inp('date', todayISO().slice(0, 7) + '-01', { type: 'date' }))}</div>\n        <div class=\"table-wrap\"><table class=\"table\"><thead><tr><th></th><th>Art</th><th>Datum</th><th>Konto / Soll</th><th>Bezeichnung / Haben</th><th>Text</th><th class=\"r\">Betrag</th></tr></thead><tbody>${imp.rows.map((r, i) => html`<tr><td><input type=\"checkbox\" name=\"row_${i}\" checked aria-label=\"Zeile \u00fcbernehmen\"></td><td>${r.kind === 'saldo' ? 'Saldo' : 'Buchung'}</td><td>${r.date ? fDate(r.date) : ''}</td><td class=\"num\">${r.kind === 'saldo' ? r.number : r.debit}</td><td>${r.kind === 'saldo' ? r.name : r.credit}</td><td>${r.kind === 'saldo' ? (r.side === 'H' ? 'Haben' : 'Soll') : r.text}${r.ref ? html`<span class=\"cell-sub\">Beleg ${r.ref}</span>` : ''}</td><td class=\"r num\">${fEur(r.amount)}</td></tr>`)}</tbody></table></div>\n        <p class=\"small muted\">Unbekannte Kontonummern werden automatisch angelegt (Kontoart nach SKR03-Logik, sp\u00e4ter \u00e4nderbar). Bitte vor der \u00dcbernahme pr\u00fcfen.</p><div class=\"row\"><button class=\"btn btn-primary\" type=\"submit\">${icon('check')}Ausgew\u00e4hlte Zeilen \u00fcbernehmen</button><button class=\"btn btn-ghost\" type=\"button\" data-act=\"fibuImportClear\">Verwerfen</button></div>`\n        : html`<div class=\"note-box\">${icon('alert')}<span>${imp.textFound ? 'Es wurden keine Salden- oder Buchungszeilen erkannt. Bitte pr\u00fcfe das Format (Beispiel unten) oder nutze eine CSV-Datei.' : 'Das PDF enth\u00e4lt keinen lesbaren Text (vermutlich ein Scan). Bitte ein PDF mit Text oder eine CSV-Datei verwenden.'}</span></div>${imp.sample.length ? html`<pre class=\"pre small sample\">${imp.sample.join('\\n')}</pre>` : ''}`}</form></section>` : ''}`);\n}\nSUBMIT.fibuOpening = async (d, f) => {\n  const rows = Object.entries(d).filter(([k, v]) => k.startsWith('ob_') && String(v).trim()).map(([k, v]) => ({ account_id: +k.slice(3), amount: v }));\n  if (!rows.length) throw new Error('Bitte mindestens einen Kontostand eintragen.');\n  if (!(await confirmBox('Anfangsbest\u00e4nde buchen?', `${rows.length} Kontost\u00e4nde zum ${fDate(d.date)} werden gegen 9000 Saldenvortr\u00e4ge gebucht.`, 'Buchen'))) return;\n  const file = await fileField(f.elements.file, { max: 10 }); const r = await POST('/fibu/opening', { date: d.date, rows, file }); toast(`${r.created} Anfangsbest\u00e4nde gebucht.`); FIBU_ACC = null; reload();\n};\nSUBMIT.fibuImportParse = async (d, f) => { const file = await fileField(f.elements.file, { max: 10 }); if (!file) throw new Error('Bitte eine Datei w\u00e4hlen.'); FIBU_IMPORT = await POST('/fibu/import/parse', { file }); toast(`${FIBU_IMPORT.rows.length} Zeilen erkannt.`); reload(); };\nSUBMIT.fibuImportCommit = async (d) => {\n  const rows = FIBU_IMPORT.rows.filter((r, i) => d['row_' + i]);\n  if (!(await confirmBox(`${rows.length} Zeilen \u00fcbernehmen?`, d.mode === 'eroeffnung' ? `Die Salden werden als Anfangsbest\u00e4nde zum ${fDate(d.date)} gebucht.` : 'Die Buchungen werden mit ihrem Originaldatum \u00fcbernommen.', '\u00dcbernehmen'))) return;\n  const r = await POST('/fibu/import/commit', { mode: d.mode, date: d.date, rows, docId: FIBU_IMPORT.docId }); FIBU_IMPORT = null; toast(`${r.created} Buchungen \u00fcbernommen.`); FIBU_ACC = null; location.hash = '#/fibu/buchungen';\n};\nACT.fibuImportClear = () => { FIBU_IMPORT = null; reload(); };\n\n/* ===== Gesch\u00e4ftspartner ===== */\nconst PROLE = (k) => ((S.config.partnerRoles || {})[k] || {}).label || k;\nasync function pagePartners() {\n  const P = page('partner');\n  if (!can('partner_view')) return P.show(noAccess());\n  const d = await GET('/orgs'); if (!P.alive()) return;\n  S.orgs = d.orgs;\n  const q = (hashQuery().q || '').toLowerCase();\n  const list = d.orgs.filter((o) => !q || [o.name, o.city, o.zip, o.email, ...(o.brands || [])].join(' ').toLowerCase().includes(q));\n  P.show(html`${head('Gesch\u00e4ftspartner', `${plural(d.orgs.length, 'Partner', 'Partner')} \u00b7 Autoh\u00e4user und H\u00e4ndler, die Anfragen erhalten`, can('partner_manage') ? html`<button class=\"btn btn-primary\" data-act=\"orgNew\">${icon('plus')}Partner anlegen</button>` : '')}\n    <section class=\"panel\"><form class=\"toolbar\" data-submit=\"orgSearch\"><label class=\"search\">${icon('search')}<input name=\"q\" value=\"${hashQuery().q || ''}\" placeholder=\"Name, Ort, PLZ, Marke \u2026\" data-input=\"orgSearchLive\" aria-label=\"Suche\"></label></form>\n    ${list.length ? html`<div class=\"table-wrap\"><table class=\"table\"><thead><tr><th>Partner</th><th>Art</th><th>Ort</th><th>Marken</th><th>Abrechnung</th><th class=\"r\">Konten</th><th class=\"r\">Offene Anfragen</th><th>Status</th></tr></thead><tbody>\n      ${list.map((o) => html`<tr class=\"clickable\" data-act=\"go\" data-href=\"#/partner/${o.id}\"><td><b>${o.name}</b><span class=\"cell-sub\">${o.email || ''}</span></td><td>${o.kind === 'einzel' ? 'Einzelpartner' : 'Organisation'}</td>\n        <td>${o.zip || ''} ${o.city || ''}${o.max_radius_km ? html`<span class=\"cell-sub\">max. ${o.max_radius_km} km</span>` : ''}</td><td>${(o.brands || []).includes('*') ? 'Alle Marken' : (o.brands || []).join(', ') || html`<span class=\"badge t-warn\">keine</span>`}</td>\n        <td>${o.billing_mode === 'monatlich' ? 'Monatlich' : 'Je Fall'}</td><td class=\"r\">${o.users}</td><td class=\"r\">${o.open_asg}</td><td>${o.active ? badge('Aktiv', 'ok') : badge('Inaktiv', 'muted')}${o.training_done ? html`<span class=\"cell-sub\">Schulung \u2713</span>` : ''}</td></tr>`)}</tbody></table></div>`\n      : html`<div class=\"panel-body\">${empty(q ? 'Kein Partner passt zur Suche' : 'Noch keine Gesch\u00e4ftspartner', q ? '' : 'Lege den ersten Partner an und lade seine Mitarbeiter ein.')}</div>`}</section>`);\n}\nINPUT.orgSearchLive = (el) => { history.replaceState(null, '', '#/partner' + qs({ q: el.value })); const pos = el.selectionStart; pagePartners().then(() => { const i = $('input[name=q]'); if (i) { i.focus(); i.setSelectionRange(pos, pos); } }); };\nSUBMIT.orgSearch = (d) => setHashQuery({ q: d.q }, '#/partner');\n\nfunction brandPicker(sel) {\n  const all = sel.includes('*'); const extra = sel.filter((b) => b !== '*' && !S.config.brands.includes(b));\n  return html`<div class=\"stack-s\">${chk('brand_all', all, 'Alle Marken (Mehrmarkenh\u00e4ndler)')}<div class=\"checks\">${S.config.brands.map((b) => chk('brands[]', sel.includes(b), b, b))}</div>${field('Weitere Marken (kommagetrennt)', inp('brands_extra', extra.join(', ')))}</div>`;\n}\nfunction openingEditor(op) {\n  return html`<table class=\"table\"><tbody>${S.config.weekdays.map((d) => { const v = op[d]; return html`<tr><td class=\"strong\">${S.config.weekdayLabels[d]}</td><td>${chk('open_' + d, !!v, 'ge\u00f6ffnet')}</td><td><input type=\"time\" name=\"from_${d}\" value=\"${v ? v[0] : '08:00'}\" aria-label=\"${S.config.weekdayLabels[d]} von\"></td><td><input type=\"time\" name=\"to_${d}\" value=\"${v ? v[1] : '18:00'}\" aria-label=\"${S.config.weekdayLabels[d]} bis\"></td></tr>`; })}</tbody></table>\n    <p class=\"small muted panel-body\">Ist samstags ge\u00f6ffnet, z\u00e4hlt der Samstag bei Angebots- und Kontaktfristen mit. Sonntage z\u00e4hlen nie.</p>`;\n}\nfunction orgPayload(d) {\n  const brands = d.brand_all ? ['*'] : [...(d.brands || []), ...String(d.brands_extra || '').split(',').map((x) => x.trim()).filter(Boolean)];\n  const opening = {}; for (const w of S.config.weekdays) opening[w] = d['open_' + w] ? [d['from_' + w], d['to_' + w]] : null;\n  const contacts = (d.c_name || []).map((n, i) => ({ name: n, role: d.c_role[i], email: d.c_email[i], phone: d.c_phone[i] })).filter((c) => c.name || c.email);\n  const o = { name: d.name, kind: d.kind, street: d.street, zip: d.zip, city: d.city, phone: d.phone, email: d.email, website: d.website,\n    billing_name: d.billing_name, billing_street: d.billing_street, billing_zip: d.billing_zip, billing_city: d.billing_city, billing_email: d.billing_email, vat_id: d.vat_id, tax_no: d.tax_no,\n    brands, accepts: d.accepts || [], max_radius_km: d.max_radius_km, opening, contacts, active: d.active };\n  if (can('partner_terms') && d.billing_mode !== undefined) Object.assign(o, { billing_mode: d.billing_mode, lead_price: d.lead_price, ...Object.fromEntries(ORG_TERM_KEYS.filter((k) => d[k] !== undefined).map((k) => [k, d[k]])) });\n  return o;\n}\n/* Zahlungsziel und Mahnwesen je Gesch\u00e4ftspartner (Startwert = Standard aus den Einstellungen) */\nconst ORG_TERM_KEYS = ['payment_terms_days', 'reminder_due_days', 'dunning_fee_1', 'dunning_due_days', 'dunning_fee_2', 'dunning_due_days_2'];\nconst feeTxt = (v) => (v === null || v === undefined || v === '' ? '' : (+v).toFixed(2).replace('.', ','));\nfunction termsFields(o, terms) {\n  const dis = terms ? '' : 'disabled', days = (k, l, h) => field(l, inp(k, o[k] ?? '', { type: 'number', ph: 'Standard', attrs: `min=\"0\" max=\"365\" inputmode=\"numeric\" ${dis}` }), h);\n  const fee = (k, l, h) => field(l, inp(k, feeTxt(o[k]), { ph: 'Standard', attrs: `inputmode=\"decimal\" ${dis}` }), h);\n  const t = (k) => o[k] ?? '\u2013', f = (k) => (o[k] != null ? feeTxt(o[k]) + ' \u20ac' : '\u2013');\n  return html`${days('payment_terms_days', 'Zahlungsziel (Tage)', 'ab Rechnungsdatum')}${days('reminder_due_days', 'Frist Zahlungserinnerung (Tage)', 'Erinnerung ist kostenlos')}\n    ${fee('dunning_fee_1', 'Mahngeb\u00fchr 1. Mahnung (Stufe 1, \u20ac)')}${days('dunning_due_days', 'Frist 1. Mahnung (Tage)')}\n    ${fee('dunning_fee_2', 'Mahngeb\u00fchr 2. Mahnung (Stufe 2, \u20ac)')}${days('dunning_due_days_2', 'Frist 2. Mahnung (Tage)', 'letzte Mahnung')}\n    <p class=\"small muted span-2\">Ablauf: Rechnung \u2192 nach ${t('payment_terms_days')} Tagen f\u00e4llig \u2192 kostenlose Zahlungserinnerung (Frist ${t('reminder_due_days')} Tage) \u2192 1. Mahnung + ${f('dunning_fee_1')} (Frist ${t('dunning_due_days')} Tage) \u2192 2. Mahnung + ${f('dunning_fee_2')} (Frist ${t('dunning_due_days_2')} Tage) \u2192 Inkasso / gerichtliches Mahnverfahren.</p>`;\n}\nACT.orgNew = async () => {\n  modal({ title: 'Gesch\u00e4ftspartner anlegen', wide: true, body: html`<form class=\"stack\" data-submit=\"orgCreate\" id=\"orgNewForm\">\n    <div class=\"seg\" role=\"radiogroup\" aria-label=\"Art\"><label><input type=\"radio\" name=\"kind\" value=\"organisation\" checked><span>Organisation (mehrere Konten)</span></label><label><input type=\"radio\" name=\"kind\" value=\"einzel\"><span>Einzelpartner</span></label></div>\n    <div class=\"grid-2\">${field('Firmenname', inp('name', '', { req: true }))}${field('E-Mail', inp('email', '', { type: 'email', req: true }))}${field('Stra\u00dfe', inp('street'))}<div class=\"grid-2\">${field('PLZ', inp('zip', '', { req: true, attrs: 'pattern=\"[0-9]{5}\"' }))}${field('Ort', inp('city'))}</div>\n      ${field('Telefon', inp('phone'))}${field('Rechnungs-E-Mail', inp('billing_email', '', { type: 'email' }), 'Leer = allgemeine E-Mail')}${field('USt-IdNr.', inp('vat_id'))}\n      ${can('partner_terms') ? field('Abrechnung', sel('billing_mode', [['einzel', 'Jeder Fall einzeln'], ['monatlich', 'Monatliche Sammelrechnung']], 'einzel')) : ''}</div>\n    <fieldset><legend>Marken</legend>${brandPicker([])}</fieldset>\n    <div class=\"checks\">${chk('accepts[]', true, 'Traumwagen-DEAL (Kauf, Leasing, Finanzierung)', 'deal')}${chk('accepts[]', true, 'Fahrzeugankauf', 'sell')}</div>\n    <fieldset><legend>Zugang zum Partner-Dashboard</legend><p class=\"small muted\">Optional: Lege gleich das erste Konto an. Die Person bekommt den Einladungslink per E-Mail und legt ihr Passwort selbst fest. Weitere Konten (bei Organisationen) legst du danach beim Partner an.</p>\n      <div class=\"grid-2 mt\">${field('Name der Person', inp('u_name', '', { ph: 'z. B. Max H\u00e4ndler' }))}${field('E-Mail f\u00fcr den Zugang', inp('u_email', '', { type: 'email', ph: 'leer = kein Konto anlegen' }))}\n      ${field('Rolle', sel('u_role', Object.entries(S.config.partnerRoles).map(([k, r]) => [k, r.label]), 'gf'))}${field('Telefon', inp('u_phone'))}</div>\n      ${chk('u_invite', true, 'Einladungslink sofort per E-Mail senden')}</fieldset></form>`,\n    foot: html`<button class=\"btn btn-ghost\" data-close>Abbrechen</button><button class=\"btn btn-primary\" type=\"submit\" form=\"orgNewForm\">Anlegen</button>` });\n};\nSUBMIT.orgCreate = async (d) => {\n  const brands = d.brand_all ? ['*'] : [...(d.brands || []), ...String(d.brands_extra || '').split(',').map((x) => x.trim()).filter(Boolean)];\n  const r = await POST('/orgs', { name: d.name, kind: d.kind, email: d.email, street: d.street, zip: d.zip, city: d.city, phone: d.phone, billing_email: d.billing_email, vat_id: d.vat_id, brands, accepts: d.accepts, ...(can('partner_terms') ? { billing_mode: d.billing_mode } : {}) });\n  closeModal();\n  if (d.u_email) {\n    const pu = await POST(`/orgs/${r.id}/users`, { name: d.u_name || d.u_email.split('@')[0], email: d.u_email, role: d.u_role, phone: d.u_phone });\n    if (d.u_invite) {\n      const inv = await POST(`/orgs/${r.id}/users/${pu.id}/invite`);\n      if (inv.mail === 'gesendet') toast(`Partner angelegt \u2013 Einladung an ${d.u_email} versendet.`);\n      else { toast('Partner und Konto angelegt, die Einladung ging aber nicht per E-Mail raus.', 'err'); showLink('Einladung nicht versendet', inv.link, mailWhy(inv)); }\n    } else toast('Partner und Konto angelegt. Die Einladung kannst du beim Konto senden.');\n  } else toast('Partner angelegt. Lege jetzt die Konten an und verschicke die Einladungen.');\n  location.hash = '#/partner/' + r.id;\n};\n\nlet ORG = null;\nasync function pagePartner(id) {\n  const P = page('partner');\n  if (!can('partner_view')) return P.show(noAccess());\n  const d = await GET('/orgs/' + id); if (!P.alive()) return;\n  ORG = d;\n  const o = d.org, mng = can('partner_manage'), terms = can('partner_terms'), dis = mng ? '' : 'disabled';\n  const st = d.stats;\n  P.show(html`${head(o.name, html`${o.kind === 'einzel' ? 'Einzelpartner' : 'Organisation'} \u00b7 Kundennummer P-${String(o.id).padStart(5, '0')} \u00b7 seit ${fDate(o.created_at)}`,\n      html`${o.active ? badge('Aktiv', 'ok') : badge('Inaktiv', 'muted')}${can('news_partner') ? html`<button class=\"btn btn-sm\" data-act=\"orgMessage\">${icon('send')}Nachricht senden</button>` : ''}`, ['#/partner', 'Alle Partner'])}\n    ${st ? html`<div class=\"kpis\"><div class=\"kpi\"><b>${fNum(st.received)}</b><span>Anfragen erhalten (12 Mon.)</span></div><div class=\"kpi\"><b>${fPct(st.offer_rate)}</b><span>Angebotsquote</span></div>\n      <div class=\"kpi\"><b>${fNum(st.won)}</b><span>Zusagen</span></div><div class=\"kpi\"><b>${fNum(st.lost + st.closed)}</b><span>Absagen / verloren</span></div><div class=\"kpi\"><b>${st.avg_hours != null ? fNum(st.avg_hours, 1) + ' h' : '\u2013'}</b><span>\u00d8 Zeit bis Angebot</span></div>\n      <div class=\"kpi\"><b>${st.rating != null ? fNum(st.rating, 1) + ' \u2605' : '\u2013'}</b><span>Kundenumfrage (${st.ratings})</span></div><div class=\"kpi\"><b>${st.users_active}/${st.users_active + st.users_inactive}</b><span>aktive Konten</span></div><div class=\"kpi\"><b>${st.support_reply_h != null ? fNum(st.support_reply_h, 1) + ' h' : '\u2013'}</b><span>Reaktion auf Support</span></div></div>` : ''}\n    <div class=\"detail-grid mt\"><form class=\"stack\" data-submit=\"orgSave\">\n      <section class=\"panel\"><div class=\"panel-head\"><h2>Stammdaten</h2>${mng ? html`<button class=\"btn btn-sm btn-dark\" type=\"submit\">Speichern</button>` : ''}</div><div class=\"panel-body stack\">\n        <div class=\"grid-2\">${field('Firmenname', inp('name', o.name, { req: true, attrs: dis }))}${field('Art', sel('kind', [['organisation', 'Organisation'], ['einzel', 'Einzelpartner']], o.kind, { attrs: dis }))}\n          ${field('Stra\u00dfe', inp('street', o.street, { attrs: dis }))}<div class=\"grid-2\">${field('PLZ', inp('zip', o.zip, { attrs: dis }))}${field('Ort', inp('city', o.city, { attrs: dis }))}</div>\n          ${field('E-Mail', inp('email', o.email, { type: 'email', attrs: dis }))}${field('Telefon', inp('phone', o.phone, { attrs: dis }))}${field('Webseite', inp('website', o.website, { attrs: dis }))}</div>\n        ${chk('active', !!o.active, 'Aktiv \u2013 erh\u00e4lt Anfragen und kann sich anmelden')}</div></section>\n      <section class=\"panel\"><div class=\"panel-head\"><h2>Rechnung</h2></div><div class=\"panel-body grid-2\">\n        ${field('Rechnungsempf\u00e4nger', inp('billing_name', o.billing_name, { ph: o.name, attrs: dis }))}${field('Rechnungs-E-Mail', inp('billing_email', o.billing_email, { type: 'email', ph: o.email, attrs: dis }))}\n        ${field('Stra\u00dfe', inp('billing_street', o.billing_street, { ph: o.street, attrs: dis }))}<div class=\"grid-2\">${field('PLZ', inp('billing_zip', o.billing_zip, { ph: o.zip, attrs: dis }))}${field('Ort', inp('billing_city', o.billing_city, { ph: o.city, attrs: dis }))}</div>\n        ${field('USt-IdNr.', inp('vat_id', o.vat_id, { attrs: dis }))}${field('Steuernummer', inp('tax_no', o.tax_no, { attrs: dis }))}</div></section>\n      <section class=\"panel\"><div class=\"panel-head\"><h2>Konditionen</h2>${terms ? '' : html`<span class=\"small muted\">${icon('lock')} nur Gesch\u00e4ftsf\u00fchrung und Admin</span>`}</div><div class=\"panel-body grid-2\">\n        ${field('Abrechnung', sel('billing_mode', [['einzel', 'Jeder Fall einzeln'], ['monatlich', 'Monatliche Sammelrechnung']], o.billing_mode, { attrs: terms ? '' : 'disabled' }))}\n        ${field('Preis je Vermittlung (netto)', inp('lead_price', o.lead_price ?? '', { ph: 'Standard laut Einstellungen', attrs: terms ? '' : 'disabled' }))}\n        ${termsFields(o, terms)}</div></section>\n      <section class=\"panel\"><div class=\"panel-head\"><h2>Anfragen</h2></div><div class=\"panel-body stack\">\n        <div class=\"checks\">${chk('accepts[]', o.accepts.includes('deal'), 'Traumwagen-DEAL', 'deal')}${chk('accepts[]', o.accepts.includes('sell'), 'Fahrzeugankauf', 'sell')}</div>\n        ${field('Maximaler Umkreis (km)', inp('max_radius_km', o.max_radius_km ?? '', { type: 'number', ph: 'ohne Begrenzung', attrs: dis }), 'Der Kunde w\u00e4hlt seinen Umkreis selbst; hier kann der Partner zus\u00e4tzlich begrenzt werden.')}\n        <h3>Marken</h3>${brandPicker(o.brands)}</div></section>\n      <section class=\"panel\"><div class=\"panel-head\"><h2>\u00d6ffnungszeiten</h2></div><div class=\"panel-body tight\">${openingEditor(o.opening)}</div></section>\n      <section class=\"panel\"><div class=\"panel-head\"><h2>Ansprechpartner ohne Konto</h2>${mng ? html`<button class=\"btn btn-sm\" type=\"button\" data-act=\"addContact\">${icon('plus')}Hinzuf\u00fcgen</button>` : ''}</div><div class=\"panel-body tight\">\n        <table class=\"table lines-table\"><thead><tr><th>Funktion</th><th>Name</th><th>E-Mail</th><th>Telefon</th></tr></thead><tbody id=\"contacts\">${(o.contacts.length ? o.contacts : [{}]).map(contactRow)}</tbody></table></div></section>\n      ${mng ? html`<div class=\"row\"><button class=\"btn btn-primary\" type=\"submit\">Alle \u00c4nderungen speichern</button></div>` : ''}\n    </form>\n    <div class=\"stack\">\n      <section class=\"panel\"><div class=\"panel-head\"><h2>Konten <span class=\"count\">${d.users.length}</span></h2>${mng ? html`<button class=\"btn btn-sm btn-dark\" data-act=\"puNew\">${icon('plus')}Konto anlegen</button>` : ''}</div>\n        ${d.users.length ? d.users.map(puRow) : html`<div class=\"panel-body\">${empty('Noch keine Konten', 'Lege f\u00fcr jeden Mitarbeiter des Partners ein Konto an.')}</div>`}</section>\n      <section class=\"panel\"><div class=\"panel-body row-between\"><div><b>Erstschulung</b><div class=\"small muted\">${o.training_done ? `teilgenommen am ${fDate(o.training_at)}` : 'noch nicht teilgenommen'}</div></div>\n        ${mng ? html`<label class=\"check\"><input type=\"checkbox\" data-change=\"orgTraining\" ${o.training_done ? raw('checked') : ''}><span>Teilgenommen</span></label>` : ''}</div></section>\n      ${d.invoices.length ? html`<section class=\"panel\"><div class=\"panel-head\"><h2>Rechnungen</h2></div><div class=\"table-wrap\"><table class=\"table\"><tbody>${d.invoices.map((i) => html`<tr class=\"clickable\" data-act=\"openInvoice\" data-id=\"${i.id}\"><td class=\"num strong\">${i.number}<span class=\"cell-sub\">${fDate(i.issue_date)}</span></td><td class=\"r num\">${fEur(i.gross + i.fees)}</td><td>${st2(i)}</td></tr>`)}</tbody></table></div></section>` : ''}\n      <section class=\"panel\"><div class=\"panel-head\"><h2>Letzte Anfragen</h2></div>${d.assignments.length ? html`<div class=\"table-wrap\"><table class=\"table\"><tbody>${d.assignments.map((a) => html`<tr class=\"clickable\" data-act=\"go\" data-href=\"#/anfragen/${a.number}\"><td class=\"num strong\">#${a.number}<span class=\"cell-sub\">${fDate(a.created_at)}</span></td><td>${a.vehicle || ''}</td><td>${statusBadge(AS(), a.status)}</td></tr>`)}</tbody></table></div>` : html`<div class=\"panel-body\">${empty('Noch keine Anfragen')}</div>`}</section>\n      ${isAdmin() ? html`<section class=\"panel\"><div class=\"panel-head\"><h2>Admin-Notizen</h2><span class=\"small muted\">nur f\u00fcr Admins sichtbar</span></div><div class=\"panel-body stack\">\n        <form class=\"stack-s\" data-submit=\"orgNote\">${area('text', '', { rows: 2, req: true })}<button class=\"btn btn-sm\" type=\"submit\">Notiz speichern</button></form>\n        <ul class=\"timeline\">${d.notes.map((n) => html`<li><div><div class=\"tl-meta\">${n.author || 'System'} \u00b7 ${fDT(n.created_at)}</div><div class=\"pre\">${n.text}</div></div></li>`)}</ul></div></section>` : ''}\n      ${can('partner_delete') ? html`<section class=\"panel\"><div class=\"panel-body row-between\"><span class=\"small muted\">Organisation mit allen Konten l\u00f6schen.</span><button class=\"btn btn-sm btn-danger\" data-act=\"orgDelete\">${icon('trash')}L\u00f6schen</button></div></section>` : ''}\n    </div></div>`);\n}\nconst st2 = (i) => { const live = ['offen', 'teilbezahlt'].includes(i.status); return html`${st(INV_STATUS, i.status)}${live && i.due_date < todayISO() ? html` ${badge('\u00fcberf\u00e4llig', 'err')}` : ''}`; };\nconst contactRow = (c = {}) => html`<tr><td><input name=\"c_role[]\" value=\"${c.role || ''}\" placeholder=\"z. B. Buchhaltung\"></td><td><input name=\"c_name[]\" value=\"${c.name || ''}\"></td><td><input name=\"c_email[]\" value=\"${c.email || ''}\" type=\"email\"></td><td><input name=\"c_phone[]\" value=\"${c.phone || ''}\"></td></tr>`;\nACT.addContact = () => $('#contacts').insertAdjacentHTML('beforeend', part(contactRow()));\nfunction puRow(u) {\n  const locked = u.locked_until && u.locked_until > '9000';\n  const state = !u.active ? badge('Deaktiviert', 'muted') : locked ? badge('Gesperrt', 'err') : u.pending ? badge('Einladung offen', 'warn') : badge('Aktiv', 'ok');\n  return html`<div class=\"asg\"><div class=\"asg-head\"><div><b>${u.name}</b> <span class=\"tag\">${PROLE(u.role)}</span><div class=\"asg-meta\">${u.email}${u.phone ? ' \u00b7 ' + u.phone : ''}</div>\n      <div class=\"asg-meta\">AGB ${u.agb_at ? '\u2713 ' + fDate(u.agb_at) : '\u2717'} \u00b7 Datenschutz ${u.privacy_at ? '\u2713 ' + fDate(u.privacy_at) : '\u2717'} \u00b7 ${u.last_login ? 'zuletzt angemeldet ' + fDT(u.last_login) : 'noch nie angemeldet'}</div></div>${state}</div>\n    ${can('partner_manage') ? html`<div class=\"row\">${u.pending ? html`<button class=\"btn btn-sm\" data-act=\"puInvite\" data-id=\"${u.id}\">${icon('mail')}Einladung senden</button>` : ''}\n      ${can('partner_pw') && !u.pending ? html`<button class=\"btn btn-sm\" data-act=\"puReset\" data-id=\"${u.id}\">${icon('key')}Passwort zur\u00fccksetzen</button>` : ''}\n      <button class=\"btn btn-sm btn-ghost\" data-act=\"puEdit\" data-id=\"${u.id}\">Bearbeiten</button>\n      ${can('partner_delete') ? html`<button class=\"btn btn-sm btn-ghost\" data-act=\"puLock\" data-id=\"${u.id}\" data-locked=\"${locked ? 1 : 0}\">${locked ? 'Entsperren' : 'Sperren'}</button><button class=\"btn btn-sm btn-ghost\" data-act=\"puDelete\" data-id=\"${u.id}\">L\u00f6schen</button>` : ''}</div>` : ''}</div>`;\n}\nconst oid = () => ORG.org.id;\nSUBMIT.orgSave = async (d) => { await PATCH('/orgs/' + oid(), orgPayload(d)); toast('Partner gespeichert.'); reload(); };\nCHANGE.orgTraining = async (el) => { await POST(`/orgs/${oid()}/training`, { done: el.checked }); toast(el.checked ? 'Schulung als erledigt markiert.' : 'Schulung zur\u00fcckgesetzt.'); reload(); };\nSUBMIT.orgNote = async (d) => { await POST(`/orgs/${oid()}/notes`, d); reload(); };\nACT.orgDelete = async () => { if (!(await ask({ title: `${ORG.org.name} l\u00f6schen?`, text: 'Alle Konten werden deaktiviert und abgemeldet. Bisherige Rechnungen bleiben erhalten.', ok: 'Endg\u00fcltig l\u00f6schen', danger: true }))) return; await DEL('/orgs/' + oid()); toast('Partner gel\u00f6scht.'); location.hash = '#/partner'; };\nACT.orgMessage = async () => {\n  const d = await ask({ title: `Nachricht an ${ORG.org.name}`, text: 'Erscheint bei allen Konten dieser Organisation in den News.', ok: 'Senden', fields: html`${field('Titel', inp('title', '', { req: true }))}${field('Nachricht', area('body', '', { rows: 5 }))}${chk('mail', true, 'Zus\u00e4tzlich per E-Mail senden')}` });\n  if (!d) return; await POST('/news', { scope: 'partner', title: d.title, body: d.body, mail: d.mail, audience: { type: 'orgs', values: [oid()] } }); toast('Nachricht gesendet.');\n};\nACT.puNew = async () => {\n  const d = await ask({ title: 'Konto anlegen', text: 'Danach kannst du die Einladung senden. Der Partner legt sein Passwort selbst fest und best\u00e4tigt AGB und Datenschutz.', ok: 'Anlegen und Einladung senden',\n    fields: html`${field('Name', inp('name', '', { req: true }))}${field('E-Mail', inp('email', '', { type: 'email', req: true }))}${field('Telefon', inp('phone'))}${field('Rolle', sel('role', Object.entries(S.config.partnerRoles).map(([k, r]) => [k, r.label]), ORG.org.kind === 'einzel' ? 'gf' : 'vt'))}` });\n  if (!d) return; delete d._form;\n  const r = await POST(`/orgs/${oid()}/users`, d);\n  const inv = await POST(`/orgs/${oid()}/users/${r.id}/invite`);\n  toast(inv.mail === 'gesendet' ? 'Konto angelegt, Einladung versendet.' : 'Konto angelegt. E-Mail-Dienst nicht eingerichtet \u2013 Link kopieren.', inv.mail === 'gesendet' ? 'ok' : 'err');\n  if (inv.mail !== 'gesendet') showLink('Einladungslink', inv.link);\n  reload();\n};\n// Grund, warum eine Einladung nicht per E-Mail rausging\nconst mailWhy = (r) => (r && r.mail === 'nicht_konfiguriert') || !S.mailReady ? 'Der E-Mail-Versand ist noch nicht eingerichtet: Der Postfach-Zugang f\u00fcr noreplay@kfl-group.com fehlt (Verwaltung \u2192 Einstellungen \u2192 E-Mail-Versand).' : r && r.mail === 'fehler' ? 'Der Mailserver hat den Versand abgelehnt \u2013 Details unter Verwaltung \u2192 Postausgang.' : 'Die E-Mail konnte nicht versendet werden.';\nfunction showLink(title, link, why) { modal({ title, body: html`${why ? html`<div class=\"err-box\">${icon('alert')}<span>${why}${can('settings_all') ? html` <a class=\"link\" href=\"#/verwaltung/einstellungen\" data-close>Zur Einrichtung</a>` : ''}</span></div>` : ''}<p class=\"small muted mt\">Bis dahin kannst du den Link pers\u00f6nlich weitergeben. Er ist 7 Tage g\u00fcltig. Nach der Einrichtung einfach erneut \u201eEinladung senden\u201c klicken.</p><div class=\"row mt\"><input value=\"${link}\" readonly aria-label=\"Link\"><button class=\"btn\" data-act=\"copy\" data-text=\"${link}\">Kopieren</button></div>` }); }\nACT.puInvite = async (b) => { const u = ORG.users.find((x) => x.id === +b.dataset.id); const r = await POST(`/orgs/${oid()}/users/${b.dataset.id}/invite`); if (r.mail === 'gesendet') return toast(`Einladung an ${u ? u.email : 'den Partner'} versendet.`); toast('Einladung erstellt, aber nicht per E-Mail versendet.', 'err'); showLink('Einladung nicht versendet', r.link, mailWhy(r)); };\nACT.puReset = async (b) => {\n  const u = ORG.users.find((x) => x.id === +b.dataset.id);\n  const d = await ask({ title: `Passwort von ${u.name} zur\u00fccksetzen`, ok: 'Senden', fields: html`<div class=\"stack-s\">\n      <label class=\"check\"><input type=\"radio\" name=\"mode\" value=\"link\" checked><span><b>Link senden</b> \u2013 der Partner legt selbst ein neues Passwort fest.</span></label>\n      <label class=\"check\"><input type=\"radio\" name=\"mode\" value=\"temp\"><span><b>Standardpasswort</b> \u2013 du legst ein vorl\u00e4ufiges Passwort fest, das per E-Mail verschickt wird. Der Partner muss es bei der Anmeldung \u00e4ndern.</span></label></div>\n    ${field('Vorl\u00e4ufiges Passwort (nur bei Standardpasswort)', inp('password', '', { attrs: 'minlength=\"10\" autocomplete=\"off\"' }), PW_HINT)}` });\n  if (!d) return;\n  if (d.mode === 'temp' && !d.password) throw new Error('Bitte lege das vorl\u00e4ufige Passwort fest.');\n  const r = await POST(`/orgs/${oid()}/users/${u.id}/reset`, { mode: d.mode, password: d.password });\n  toast(r.mail === 'gesendet' ? 'Per E-Mail versendet.' : 'Gespeichert, aber E-Mail nicht versendet.', r.mail === 'gesendet' ? 'ok' : 'err');\n};\nACT.puEdit = async (b) => {\n  const u = ORG.users.find((x) => x.id === +b.dataset.id);\n  const d = await ask({ title: 'Konto bearbeiten', ok: 'Speichern', fields: html`${field('Name', inp('name', u.name, { req: true }))}${field('Telefon', inp('phone', u.phone))}${field('Rolle', sel('role', Object.entries(S.config.partnerRoles).map(([k, r]) => [k, r.label]), u.role))}${chk('active', !!u.active, 'Konto aktiv')}` });\n  if (!d) return; delete d._form; await PATCH(`/orgs/${oid()}/users/${u.id}`, d); toast('Gespeichert.'); reload();\n};\nACT.puLock = async (b) => { const lock = b.dataset.locked !== '1'; if (lock && !(await confirmBox('Konto sperren?', 'Der Partner wird sofort abgemeldet und kann sich nicht mehr anmelden.', 'Sperren', true))) return; await PATCH(`/orgs/${oid()}/users/${b.dataset.id}`, { locked: lock }); reload(); };\nACT.puDelete = async (b) => { if (!(await confirmBox('Konto l\u00f6schen?', 'Das Konto wird dauerhaft deaktiviert.', 'L\u00f6schen', true))) return; await DEL(`/orgs/${oid()}/users/${b.dataset.id}`); reload(); };\n\n/* ===== Statistik ===== */\nconst PRESETS = () => { const t = todayISO(), y = t.slice(0, 4), m = t.slice(0, 7); return [['7', '7 Tage', addDays(t, -6), t], ['30', '30 Tage', addDays(t, -29), t], ['90', '90 Tage', addDays(t, -89), t], ['monat', 'Dieser Monat', m + '-01', t], ['jahr', 'Dieses Jahr', y + '-01-01', t]]; };\nfunction periodBar(q, base) {\n  return html`<form class=\"toolbar\" data-submit=\"statPeriod\" data-base=\"${base}\">${PRESETS().map(([k, l, f, t]) => html`<a class=\"btn btn-sm ${q.from === f && q.to === t ? 'btn-dark' : 'btn-ghost'}\" href=\"${base}${qs({ from: f, to: t })}\">${l}</a>`)}\n    <span class=\"spacer\"></span><input type=\"date\" name=\"from\" value=\"${q.from || ''}\" aria-label=\"Von\"><input type=\"date\" name=\"to\" value=\"${q.to || ''}\" aria-label=\"Bis\"><button class=\"btn btn-sm btn-dark\" type=\"submit\">Anwenden</button></form>`;\n}\nSUBMIT.statPeriod = (d, f) => setHashQuery({ from: d.from, to: d.to }, f.dataset.base);\nconst statTabs = (cur) => tabsBar([can('stats_view') && ['uebersicht', '\u00dcbersicht', '#/statistik'], canAny('stats_view', 'team_stats') && ['team', 'Team', '#/statistik/team'], canAny('stats_view', 'partner_stats') && ['partner', 'Gesch\u00e4ftspartner', '#/statistik/partner'], can('stats_shop') && ['shop', 'Webshop', '#/statistik/shop']], cur);\nconst statHead = (cur) => html`${head('Statistik', 'Anfragen, Umsatz, Kosten, Partner und Team im Vergleich zum Vorzeitraum und Vorjahr.')}${statTabs(cur)}`;\n\nasync function pageStats(tab) {\n  const P = page('statistik');\n  if (!canAny('stats_view', 'team_stats', 'partner_stats', 'stats_shop')) return P.show(noAccess());\n  tab = tab || (can('stats_view') ? 'uebersicht' : can('team_stats') ? 'team' : 'partner');\n  const q = hashQuery(); if (!q.from) { q.from = addDays(todayISO(), -29); q.to = todayISO(); }\n  if (tab === 'team') return statsTeam(P, q);\n  if (tab === 'partner') return statsPartners(P, q);\n  if (tab === 'shop') return statsShop(P, q);\n  if (!can('stats_view')) return P.show(noAccess());\n  const d = await GET('/stats/overview', q); if (!P.alive()) return;\n  const c = d.cur, p = d.prev, ly = d.ly;\n  const row = (label, k, fmt = fNum, invert = false) => html`<tr><td>${label}</td><td class=\"r num strong\">${fmt(c[k])}</td><td class=\"r num\">${fmt(p[k])} ${delta(c[k], p[k], { invert })}</td><td class=\"r num\">${fmt(ly[k])} ${delta(c[k], ly[k], { invert })}</td></tr>`;\n  let adj = 0; try { adj = +(localStorage.getItem('kfl_fc_adj') || 0); } catch (e) { /* ohne Speicher */ }\n  const fc = (v) => v * (1 + adj / 100);\n  const days = d.daily.map((x) => ({ label: fDate(x.day), short: x.day.slice(8, 10) + '.' + x.day.slice(5, 7), value: x.n, second: x.won }));\n  P.show(html`${statHead('uebersicht')}<section class=\"panel mt\">${periodBar(q, '#/statistik')}\n    <div class=\"kpis kpis-flat\">\n      <div class=\"kpi\"><b>${fNum(c.requests)}</b><span>Anfragen</span>${delta(c.requests, p.requests)}</div>\n      <div class=\"kpi\"><b>${fNum(c.won)}</b><span>Vermittelt (${fPct(c.conversion)})</span>${delta(c.won, p.won)}</div>\n      <div class=\"kpi\"><b>${fEur(c.revenue_net)}</b><span>Umsatz netto</span>${delta(c.revenue_net, p.revenue_net)}</div>\n      <div class=\"kpi\"><b>${fEur(c.expenses_net)}</b><span>Ausgaben netto</span>${delta(c.expenses_net, p.expenses_net, { invert: true })}</div>\n      <div class=\"kpi ${c.profit_net < 0 ? 'hot' : ''}\"><b>${fEur(c.profit_net)}</b><span>Ergebnis netto</span>${delta(c.profit_net, p.profit_net)}</div>\n      <a class=\"kpi ${d.overdue.n ? 'hot' : ''}\" href=\"#/buchhaltung/rechnungen?overdue=1\"><b>${fEur(d.open.sum)}</b><span>offen \u00b7 davon ${fEur(d.overdue.sum)} \u00fcberf\u00e4llig</span></a></div></section>\n    <div class=\"grid-2 mt\">\n      <section class=\"panel\"><div class=\"panel-head\"><h2>Anfragen pro Tag</h2><span class=\"small muted\"><span class=\"dot\"></span> davon vermittelt</span></div><div class=\"panel-body\">${barChart(days, { h: 180 })}</div></section>\n      <section class=\"panel\"><div class=\"panel-head\"><h2>Vorausschau n\u00e4chste 30 Tage</h2><span class=\"small muted\">Basis: ${d.forecast.basis}</span></div><div class=\"panel-body stack\">\n        ${kv([['Anfragen', fNum(fc(d.forecast.requests))], ['Vermittlungen', fNum(fc(d.forecast.won))], ['Umsatz netto', fEur(fc(d.forecast.revenue_net))], ['Ausgaben netto', fEur(d.forecast.expenses_net)], ['Ergebnis netto', html`<b>${fEur(fc(d.forecast.revenue_net) - d.forecast.expenses_net)}</b>`]])}\n        ${isAdmin() || can('settings_all') ? html`<form class=\"inline-form\" data-submit=\"fcAdj\">${field('Manuelle Anpassung in % (z. B. Kampagne, Saison)', inp('adj', adj, { type: 'number', attrs: 'step=\"1\" min=\"-90\" max=\"500\"' }))}<button class=\"btn btn-sm\" type=\"submit\">\u00dcbernehmen</button></form>` : ''}</div></section></div>\n    <section class=\"panel mt\"><div class=\"panel-head\"><h2>Vergleich</h2><span class=\"small muted\">${fDate(d.period.from)} \u2013 ${fDate(d.period.to)} gegen\u00fcber ${fDate(d.period.prevFrom)} \u2013 ${fDate(d.period.prevTo)} und Vorjahr</span></div>\n      <div class=\"table-wrap\"><table class=\"table\"><thead><tr><th>Kennzahl</th><th class=\"r\">Zeitraum</th><th class=\"r\">Vorzeitraum</th><th class=\"r\">Vorjahr</th></tr></thead><tbody>\n        ${row('Anfragen gesamt', 'requests')}${row('davon Traumwagen-DEAL', 'deal')}${row('davon Fahrzeugverkauf', 'sell')}${row('Vermittelt (Kontaktdaten versendet)', 'won')}${row('Ohne Angebot', 'no_offer', fNum, true)}${row('Spam', 'spam', fNum, true)}\n        ${row('Angebote von Partnern', 'offers')}${row('Angebote angenommen', 'offers_accepted')}${row('Angebote nicht gew\u00e4hlt / abgelehnt', 'offers_rejected', fNum, true)}\n        ${row('Rechnungen erstellt', 'invoices')}${row('Umsatz netto', 'revenue_net', fEur)}${row('Umsatz brutto', 'revenue_gross', fEur)}${row('Zahlungseing\u00e4nge', 'payments', fEur)}\n        ${row('Mahnungen', 'dunnings', fNum, true)}${row('Mahngeb\u00fchren', 'dunning_fees', fEur)}${row('Kulanz / Stornos', 'kulanz', fEur, true)}${row('Ausgaben netto', 'expenses_net', fEur, true)}${row('Ergebnis netto', 'profit_net', fEur)}\n        ${row('Neue Gesch\u00e4ftspartner', 'new_partners')}${row('Support-Tickets', 'tickets', fNum, true)}</tbody></table></div></section>\n    <div class=\"grid-3 mt\">\n      <section class=\"panel\"><div class=\"panel-head\"><h3>Heute vs. gestern</h3></div><div class=\"panel-body\">${kv([['Anfragen', html`${fNum(d.today.requests)} ${delta(d.today.requests, d.yesterday.requests)}`], ['Vermittelt', html`${fNum(d.today.won)} ${delta(d.today.won, d.yesterday.won)}`], ['Umsatz', html`${fEur(d.today.revenue_net)} ${delta(d.today.revenue_net, d.yesterday.revenue_net)}`]])}</div></section>\n      <section class=\"panel\"><div class=\"panel-head\"><h3>Monat vs. Vormonat</h3></div><div class=\"panel-body\">${kv([['Anfragen', html`${fNum(d.month.requests)} ${delta(d.month.requests, d.lastMonth.requests)}`], ['Vermittelt', html`${fNum(d.month.won)} ${delta(d.month.won, d.lastMonth.won)}`], ['Umsatz', html`${fEur(d.month.revenue_net)} ${delta(d.month.revenue_net, d.lastMonth.revenue_net)}`], ['Ausgaben', fEur(d.month.expenses_net)]])}</div></section>\n      <section class=\"panel\"><div class=\"panel-head\"><h3>Status im Zeitraum</h3></div><div class=\"panel-body\">${hbars(d.statuses.map((s) => ({ label: statusOf(RS(), s.status).label, value: s.n })).sort((a, b) => b.value - a.value))}</div></section></div>\n    <div class=\"grid-2 mt\">\n      <section class=\"panel\"><div class=\"panel-head\"><h2>Marken</h2></div><div class=\"panel-body\">${hbars(d.brands.map((b) => ({ label: b.brand, value: b.n })))}</div></section>\n      <section class=\"panel\"><div class=\"panel-head\"><h2>Herkunft (Marketing)</h2></div><div class=\"table-wrap\"><table class=\"table\"><thead><tr><th>Quelle</th><th class=\"r\">Anfragen</th><th class=\"r\">Vermittelt</th><th class=\"r\">Quote</th></tr></thead><tbody>${d.sources.map((s) => html`<tr><td>${s.source}</td><td class=\"r num\">${s.n}</td><td class=\"r num\">${s.won || 0}</td><td class=\"r num\">${fPct(s.n ? ((s.won || 0) / s.n) * 100 : 0)}</td></tr>`)}</tbody></table></div></section></div>`);\n}\nSUBMIT.fcAdj = (d) => { try { localStorage.setItem('kfl_fc_adj', String(+d.adj || 0)); } catch (e) { /* ohne Speicher */ } reload(); };\n\nasync function statsTeam(P, q) {\n  if (!canAny('stats_view', 'team_stats')) return P.show(noAccess());\n  const d = await GET('/stats/staff', q); if (!P.alive()) return;\n  const max = Math.max(1, ...d.staff.map((s) => s.actions));\n  P.show(html`${statHead('team')}<section class=\"panel mt\">${periodBar(q, '#/statistik/team')}\n    <div class=\"table-wrap\"><table class=\"table\"><thead><tr><th>Mitarbeiter</th><th>Rolle</th><th class=\"r\">Zugewiesen</th><th class=\"r\">Bearbeitet</th><th class=\"r\">\u00d8 Reaktionszeit</th><th class=\"r\">Support-Tickets</th><th>Aktivit\u00e4t</th></tr></thead><tbody>\n      ${d.staff.map((s) => html`<tr><td class=\"strong\">${s.name}</td><td>${roleLabel(s.role)}</td><td class=\"r num\">${s.assigned}</td><td class=\"r num\">${s.handled}</td>\n        <td class=\"r num\">${s.reaction_min == null ? '\u2013' : s.reaction_min < 60 ? s.reaction_min + ' Min.' : fNum(s.reaction_min / 60, 1) + ' Std.'}</td><td class=\"r num\">${s.tickets}</td>\n        <td><span class=\"hbar-track hbar-inline\"><i data-w=\"${Math.round((s.actions / max) * 100)}\"></i></span> <span class=\"small muted\">${s.actions} Aktionen</span></td></tr>`)}</tbody></table></div>\n    <p class=\"small muted panel-body\">Reaktionszeit = Zeit vom Eingang der Anfrage bis zur ersten Aktion des Mitarbeiters.</p></section>`);\n}\nasync function statsPartners(P, q) {\n  if (!canAny('stats_view', 'partner_stats')) return P.show(noAccess());\n  const d = await GET('/stats/partners', q); if (!P.alive()) return;\n  const sort = q.sort || 'received';\n  const list = [...d.partners].sort((a, b) => (b[sort] ?? -1) - (a[sort] ?? -1));\n  const th = (k, l) => html`<th class=\"r\"><a class=\"${sort === k ? 'strong' : ''}\" href=\"#/statistik/partner${qs({ ...q, sort: k })}\">${l}</a></th>`;\n  P.show(html`${statHead('partner')}<section class=\"panel mt\">${periodBar(q, '#/statistik/partner')}\n    <div class=\"table-wrap\"><table class=\"table\"><thead><tr><th>Partner</th>${th('received', 'Erhalten')}${th('offers', 'Angebote')}${th('offer_rate', 'Angebotsquote')}${th('won', 'Zusagen')}${th('win_rate', 'Erfolgsquote')}${th('lost', 'Verloren')}${th('avg_hours', '\u00d8 Stunden')}${th('rating', 'Bewertung')}${th('users_active', 'Konten aktiv')}${th('support_reply_h', 'Support-Reaktion')}</tr></thead><tbody>\n      ${list.map((p) => html`<tr class=\"clickable\" data-act=\"go\" data-href=\"#/partner/${p.id}\"><td class=\"strong\">${p.name}${p.active ? '' : html` ${badge('inaktiv', 'muted')}`}</td><td class=\"r num\">${p.received}</td><td class=\"r num\">${p.offers}</td><td class=\"r num\">${fPct(p.offer_rate)}</td><td class=\"r num\">${p.won}</td><td class=\"r num\">${fPct(p.win_rate)}</td><td class=\"r num\">${p.lost}</td>\n        <td class=\"r num\">${p.avg_hours == null ? '\u2013' : fNum(p.avg_hours, 1)}</td><td class=\"r num\">${p.rating == null ? '\u2013' : fNum(p.rating, 1) + ' \u2605'}</td><td class=\"r num\">${p.users_active}/${p.users_active + p.users_inactive}</td><td class=\"r num\">${p.support_reply_h == null ? '\u2013' : fNum(p.support_reply_h, 1) + ' h'}</td></tr>`)}</tbody></table></div></section>`);\n}\nasync function statsShop(P, q) {\n  if (!can('stats_shop')) return P.show(noAccess());\n  const d = await GET('/stats/shop', q); if (!P.alive()) return;\n  if (!d.configured) return P.show(html`${statHead('shop')}<section class=\"panel mt\"><div class=\"panel-body\">${empty('Webshop-Statistik noch nicht verbunden', 'Hinterlege in Cloudflare das Secret SHOPIFY_ADMIN_TOKEN (Admin-API, Lesezugriff auf Bestellungen) und optional SHOPIFY_SHOP. Danach erscheinen hier Bestellungen, Umsatz und Topseller von kfl-group.com.')}</div></section>`);\n  if (d.error) return P.show(html`${statHead('shop')}<div class=\"err-box mt\">${icon('alert')}<span>Shopify meldet einen Fehler: ${d.error}</span></div>`);\n  const c = d.cur, p = d.prev, ly = d.ly;\n  P.show(html`${statHead('shop')}<section class=\"panel mt\">${periodBar(q, '#/statistik/shop')}\n    <div class=\"kpis kpis-flat\"><div class=\"kpi\"><b>${fNum(c.orders)}</b><span>Bestellungen</span>${delta(c.orders, p.orders)}</div><div class=\"kpi\"><b>${fEur(c.revenue)}</b><span>Umsatz brutto</span>${delta(c.revenue, p.revenue)}</div>\n      <div class=\"kpi\"><b>${fEur(c.aov)}</b><span>\u00d8 Warenkorb</span>${delta(c.aov, p.aov)}</div><div class=\"kpi\"><b>${fNum(c.newCustomers)}</b><span>Neukunden</span>${delta(c.newCustomers, p.newCustomers)}</div></div></section>\n    <div class=\"grid-2 mt\"><section class=\"panel\"><div class=\"panel-head\"><h2>Topseller</h2></div><div class=\"panel-body\">${hbars(c.top.map(([l, v]) => ({ label: l, value: v })))}</div></section>\n      <section class=\"panel\"><div class=\"panel-head\"><h2>Vorjahr</h2></div><div class=\"panel-body\">${kv([['Bestellungen', html`${fNum(ly.orders)} ${delta(c.orders, ly.orders)}`], ['Umsatz', html`${fEur(ly.revenue)} ${delta(c.revenue, ly.revenue)}`], ['\u00d8 Warenkorb', fEur(ly.aov)], ['Neukunden', fNum(ly.newCustomers)]])}\n        <p class=\"small muted mt\">Shop: ${d.shop}</p></div></section></div>`);\n}\n\n/* ===== Support ===== */\nconst TK_STATUS = { neu: ['Neu', 'accent'], in_bearbeitung: ['In Bearbeitung', 'info'], wartet: ['Wartet auf R\u00fcckmeldung', 'warn'], erledigt: ['Erledigt', 'ok'] };\nconst TK_PRIO = { normal: ['Normal', 'neutral'], hoch: ['Hoch', 'warn'], dringend: ['Dringend', 'err'] };\nconst TK_KIND = { ticket: 'Anfrage', aenderung: '\u00c4nderungsantrag', spam: 'Spam-Pr\u00fcfung' };\nconst CHANGE_FIELD = { email: 'E-Mail', name: 'Name', phone: 'Telefon', reason: 'Begr\u00fcndung', opening: '\u00d6ffnungszeiten', billing_email: 'Rechnungs-E-Mail', billing_street: 'Rechnungsanschrift', note: 'Notiz' };\nconst CHANGE_LABEL = { role: 'Rolle \u00e4ndern', delete_user: 'Konto l\u00f6schen', add_user: 'Konto hinzuf\u00fcgen', opening: '\u00d6ffnungszeiten', billing: 'Rechnungsdaten', org: 'Organisationsdaten' };\n\nasync function pageSupport(id) {\n  const P = page('support');\n  if (!can('support_view')) return P.show(html`${head('Support')}<section class=\"panel\"><div class=\"panel-body\">${empty('Du hast ein Anliegen?', 'Schreib dem Support-Team \u2013 Antworten erscheinen in deinen News.', html`<button class=\"btn btn-primary\" data-act=\"newTicket\">Support kontaktieren</button>`)}</div></section>`);\n  if (id === 'systemfehler') return pageSysIssues(P);\n  if (id) return pageTicket(P, id);\n  const q = hashQuery(); const view = q.view || 'offen';\n  const params = { ...q, view: undefined };\n  if (['Webseite', 'Intern', 'Partner'].includes(view)) params.tag = view;\n  if (view === 'erledigt') params.status = 'erledigt';\n  if (view === 'archiv') params.archived = 1;\n  const d = await GET('/tickets', params); if (!P.alive()) return;\n  const tabs = [['offen', 'Offen'], ['Webseite', 'Webseite'], ['Intern', 'Intern'], ['Partner', 'Partner'], ['erledigt', 'Erledigt (10 Tage)'], ['archiv', 'Archiv']].map(([k, l]) => [k, l, '#/support' + qs({ view: k })]);\n  if (can('support_syslist')) tabs.push(['sys', 'System-Fehlerliste', '#/support/systemfehler']);\n  P.show(html`${head('Support', 'Anfragen von der Webseite, aus dem Team und von Gesch\u00e4ftspartnern. Nach 24 Stunden steigt die Priorit\u00e4t automatisch.', html`<button class=\"btn\" data-act=\"newTicket\">${icon('plus')}Ticket anlegen</button>`)}\n    ${tabsBar(tabs, view)}<section class=\"panel mt\"><form class=\"toolbar\" data-submit=\"tkFilter\"><input type=\"hidden\" name=\"view\" value=\"${view}\">\n      <label class=\"search\">${icon('search')}<input name=\"q\" value=\"${q.q || ''}\" placeholder=\"Betreff, Name, E-Mail, Ticketnummer\" aria-label=\"Suche\"></label>\n      ${sel('priority', Object.entries(TK_PRIO).map(([k, v]) => [k, v[0]]), q.priority, { empty: 'Alle Priorit\u00e4ten', attrs: 'data-change=\"tkFilterChange\" aria-label=\"Priorit\u00e4t\"' })}\n      ${sel('kind', Object.entries(TK_KIND), q.kind, { empty: 'Alle Arten', attrs: 'data-change=\"tkFilterChange\" aria-label=\"Art\"' })}<button class=\"btn btn-sm btn-dark\" type=\"submit\">Suchen</button></form>\n    ${d.tickets.length ? html`<div class=\"table-wrap\"><table class=\"table\"><thead><tr><th>Nr.</th><th>Betreff</th><th>Tag</th><th>Von</th><th>Priorit\u00e4t</th><th>Status</th><th>Zust\u00e4ndig</th><th>Eingang</th></tr></thead><tbody>\n      ${d.tickets.map((t) => html`<tr class=\"clickable ${t.status === 'neu' ? 'is-unread' : ''}\" data-act=\"go\" data-href=\"#/support/${t.id}\"><td class=\"num strong\">#${t.id}</td><td><b>${t.subject}</b><span class=\"cell-sub\">${TK_KIND[t.kind] || t.kind}${t.category ? ' \u00b7 ' + t.category : ''} \u00b7 ${plural(t.messages, 'Nachricht', 'Nachrichten')}</span></td>\n        <td><span class=\"tag\">${t.tag}</span></td><td>${t.requester_name || '\u2013'}<span class=\"cell-sub\">${t.org_name || t.requester_email || ''}</span></td><td>${badge(...(TK_PRIO[t.priority] || [t.priority]))}${t.escalated_at ? html`<span class=\"cell-sub\">automatisch erh\u00f6ht</span>` : ''}</td>\n        <td>${badge(...(TK_STATUS[t.status] || [t.status]))}</td><td>${t.assignee_name || html`<span class=\"muted\">offen</span>`}</td><td class=\"nowrap\">${fDT(t.created_at)}<span class=\"cell-sub\">${fRel(t.created_at)}</span></td></tr>`)}</tbody></table></div>`\n      : html`<div class=\"panel-body\">${empty('Keine Tickets in dieser Ansicht')}</div>`}</section>`);\n}\nSUBMIT.tkFilter = (d) => setHashQuery(d, '#/support');\nCHANGE.tkFilterChange = (el) => SUBMIT.tkFilter(formData(el.form));\n\nlet TK = null;\nasync function pageTicket(P, id) {\n  const [d, dir] = await Promise.all([GET('/tickets/' + id), GET('/directory').catch(() => ({ users: [] }))]); if (!P.alive()) return;\n  TK = d.ticket; const t = d.ticket, mng = can('support_manage');\n  const p = t.payload || {};\n  P.show(html`${head(html`#${t.id} \u00b7 ${t.subject}`, html`${TK_KIND[t.kind] || 'Anfrage'} \u00b7 ${t.category || ''} \u00b7 eingegangen ${fDT(t.created_at)}`, html`<span class=\"tag\">${t.tag}</span>${badge(...(TK_STATUS[t.status] || [t.status]))}${badge(...(TK_PRIO[t.priority] || [t.priority]))}`, ['#/support', 'Alle Tickets'])}\n    <div class=\"detail-grid\"><div class=\"stack\">\n      ${t.kind === 'aenderung' ? html`<section class=\"panel\"><div class=\"panel-head\"><h2>\u00c4nderungsantrag: ${CHANGE_LABEL[p.action] || p.action}</h2>${t.status === 'erledigt' ? badge('Bearbeitet', 'ok') : badge('Wartet auf Best\u00e4tigung', 'accent')}</div><div class=\"panel-body stack\">\n        ${p.label ? html`<p class=\"strong\">${p.label}</p>` : ''}${kv(Object.entries(p).filter(([k]) => !['action', 'label', 'user_id', 'role'].includes(k)).map(([k, v]) => [CHANGE_FIELD[k] || k, typeof v === 'object' ? Object.entries(v || {}).map(([a, b]) => `${a}: ${Array.isArray(b) ? b.join('\u2013') : b ?? 'geschlossen'}`).join(', ') : String(v)]))}\n        <p class=\"small muted\">Die Gesch\u00e4ftsf\u00fchrung des Partners hat diese \u00c4nderung beantragt. Im Zweifel vorher telefonisch beim Antragsteller nachfragen.</p>\n        ${can('support_changes') && t.status !== 'erledigt' ? html`<div class=\"row\"><button class=\"btn btn-ok\" data-act=\"tkChange\" data-ok=\"1\">${icon('check')}\u00c4nderung best\u00e4tigen</button><button class=\"btn\" data-act=\"tkChange\" data-ok=\"0\">Ablehnen</button></div>` : ''}</div></section>` : ''}\n      <section class=\"panel\"><div class=\"panel-head\"><h2>Verlauf</h2></div><div class=\"panel-body\"><div class=\"thread\">${d.messages.map((m) => html`<div class=\"msg ${m.author_type === 'staff' ? 'me' : ''} ${m.internal ? 'internal' : ''}\"><div class=\"msg-meta\"><b>${m.author_name || (m.author_type === 'staff' ? 'KFL Support' : 'Anfragender')}</b><span>${fDT(m.created_at)}</span>${m.internal ? html`<span>\u00b7 interne Notiz</span>` : ''}</div><div class=\"pre\">${m.text}</div></div>`)}</div></div>\n        ${t.status !== 'erledigt' || mng ? html`<form class=\"composer\" data-submit=\"tkReply\">${area('text', '', { rows: 4, req: true, ph: mng ? 'Antwort an den Anfragenden \u2026' : 'Deine Nachricht \u2026' })}\n          <div class=\"row\">${mng ? chk('internal', false, 'Interne Notiz (nicht sichtbar f\u00fcr den Anfragenden)') : ''}<span class=\"spacer\"></span><button class=\"btn btn-primary\" type=\"submit\">${icon('send')}Senden</button></div>\n          ${mng ? html`<p class=\"tiny muted\">Antworten gehen per E-Mail von support@ und erscheinen \u2013 falls vorhanden \u2013 in den News des Kontos.</p>` : ''}</form>` : ''}</section></div>\n      <div class=\"stack\">${mng ? html`<section class=\"panel\"><div class=\"panel-head\"><h2>Bearbeitung</h2></div><form class=\"panel-body stack\" data-submit=\"tkSave\">\n        ${field('Status', sel('status', Object.entries(TK_STATUS).map(([k, v]) => [k, v[0]]), t.status))}${field('Priorit\u00e4t', sel('priority', Object.entries(TK_PRIO).map(([k, v]) => [k, v[0]]), t.priority))}\n        ${field('Zust\u00e4ndig', sel('assignee_id', dir.users.filter((u) => true).map((u) => [u.id, u.name]), t.assignee_id, { empty: 'Niemand' }))}${field('Tag', sel('tag', ['Webseite', 'Intern', 'Partner', 'Kunde'], t.tag))}\n        <div class=\"row\"><button class=\"btn btn-dark\" type=\"submit\">Speichern</button>${t.status !== 'erledigt' ? html`<button class=\"btn btn-ok\" type=\"button\" data-act=\"tkDone\">${icon('check')}Erledigt</button>` : ''}</div></form></section>` : ''}\n        <section class=\"panel\"><div class=\"panel-head\"><h2>Anfragender</h2></div><div class=\"panel-body\">${kv([['Name', t.requester_name], ['E-Mail', t.requester_email ? html`<a class=\"link\" href=\"mailto:${t.requester_email}\">${t.requester_email}</a>` : ''], ['Art', { staff: 'Mitarbeiter KFL', partner: 'Gesch\u00e4ftspartner', web: 'Webseite', customer: 'Kunde' }[t.requester_type] || t.requester_type],\n          ['Organisation', t.org_name ? html`<a class=\"link\" href=\"#/partner/${t.org_id}\">${t.org_name}</a>` : ''], ['Anfrage', t.request_id ? html`<a class=\"link\" href=\"#/anfragen/${t.request_id + 1000}\">#${t.request_id + 1000}</a>` : ''], ['Eskaliert', t.escalated_at ? fDT(t.escalated_at) : ''], ['Erledigt', t.done_at ? fDT(t.done_at) : '']])}</div></section></div></div>`);\n}\nSUBMIT.tkReply = async (d, f) => { await POST(`/tickets/${TK.id}/reply`, d); f.reset(); toast(d.internal ? 'Interne Notiz gespeichert.' : 'Antwort gesendet.'); reload(); };\nSUBMIT.tkSave = async (d) => { await PATCH('/tickets/' + TK.id, { ...d, assignee_id: d.assignee_id || null }); toast('Gespeichert.'); reload(); };\nACT.tkDone = async () => { await PATCH('/tickets/' + TK.id, { status: 'erledigt' }); toast('Erledigt. Das Ticket bleibt 10 Tage im Support und wandert dann ins Archiv.'); reload(); };\nACT.tkChange = async (b) => { const ok = b.dataset.ok === '1'; const d = await ask({ title: ok ? '\u00c4nderung best\u00e4tigen?' : '\u00c4nderung ablehnen?', text: ok ? 'Die \u00c4nderung wird sofort durchgef\u00fchrt. Der Antragsteller wird per E-Mail (support@) und in seinen News informiert.' : 'Der Antragsteller erh\u00e4lt die Ablehnung mit deiner Begr\u00fcndung.', ok: ok ? 'Best\u00e4tigen' : 'Ablehnen', danger: !ok, fields: field('Notiz an den Antragsteller (optional)', area('note', '', { rows: 2 })) }); if (!d) return; await POST(`/tickets/${TK.id}/change`, { approve: ok, note: d.note }); toast(ok ? '\u00c4nderung durchgef\u00fchrt.' : 'Abgelehnt.'); reload(); };\n\nasync function pageSysIssues(P) {\n  if (!can('support_syslist')) return P.show(noAccess());\n  const d = await GET('/sysissues'); if (!P.alive()) return;\n  const tabs = [['offen', 'Offen'], ['Webseite', 'Webseite'], ['Intern', 'Intern'], ['Partner', 'Partner'], ['erledigt', 'Erledigt (10 Tage)'], ['archiv', 'Archiv']].map(([k, l]) => [k, l, '#/support' + qs({ view: k })]);\n  tabs.push(['sys', 'System-Fehlerliste', '#/support/systemfehler']);\n  const ST = { offen: ['Offen', 'accent'], in_bearbeitung: ['In Bearbeitung', 'info'], erledigt: ['Erledigt', 'ok'] };\n  P.show(html`${head('Support', 'Die System-Fehlerliste sieht nur der Admin. Erledigte Eintr\u00e4ge werden 365 Tage im Backup aufbewahrt.', html`<button class=\"btn btn-primary\" data-act=\"sysNew\">${icon('plus')}Fehler erfassen</button>`)}${tabsBar(tabs, 'sys')}\n    <section class=\"panel mt\">${d.issues.length ? d.issues.map((s) => html`<div class=\"asg\"><div class=\"asg-head\"><div><b>${s.title}</b><div class=\"asg-meta\">erfasst ${fDT(s.created_at)} von ${s.author || '\u2013'}${s.done_at ? ' \u00b7 erledigt ' + fDT(s.done_at) : ''}</div></div>${badge(...(ST[s.status] || [s.status]))}</div>\n      ${s.details ? html`<p class=\"pre small mt\">${s.details}</p>` : ''}${s.notes.length ? html`<ul class=\"timeline mt\">${s.notes.map((n) => html`<li><div><div class=\"tl-meta\">${n.by} \u00b7 ${fDT(n.at)}</div>${n.text}</div></li>`)}</ul>` : ''}\n      <form class=\"inline-form mt\" data-submit=\"sysNote\"><input type=\"hidden\" name=\"id\" value=\"${s.id}\">${field('Notiz', inp('note'))}${field('Status', sel('status', Object.entries(ST).map(([k, v]) => [k, v[0]]), s.status))}<button class=\"btn btn-sm btn-dark\" type=\"submit\">Speichern</button></form></div>`)\n      : html`<div class=\"panel-body\">${empty('Keine Systemfehler erfasst')}</div>`}</section>`);\n}\nACT.sysNew = async () => { const d = await ask({ title: 'Systemfehler erfassen', ok: 'Speichern', fields: html`${field('Titel', inp('title', '', { req: true }))}${field('Beschreibung', area('details', '', { rows: 5 }))}` }); if (!d) return; delete d._form; await POST('/sysissues', d); reload(); };\nSUBMIT.sysNote = async (d) => { await PATCH('/sysissues/' + d.id, { note: d.note, status: d.status }); toast('Gespeichert.'); reload(); };\n\n/* ===== Backup, Protokoll, Verwaltung ===== */\nconst fBytes = (n) => (n == null ? '\u2013' : n < 1024 ? n + ' B' : n < 1048576 ? fNum(n / 1024, 1) + ' KB' : fNum(n / 1048576, 1) + ' MB');\nconst LEVEL = { hoch: ['Hoch', 'err'], mittel: ['Mittel', 'warn'], info: ['Info', 'info'] };\nconst areaBar = () => html`<div class=\"row\"><span class=\"small muted\">${icon('lock')} entsperrt</span><button class=\"btn btn-sm btn-ghost\" data-act=\"areaLock\">Sperren</button></div>`;\n\nasync function pageBackup() {\n  const P = page('backup');\n  if (!can('backup_view')) return P.show(noAccess());\n  if (!S.user.areaUnlocked) return P.show(lockScreen('Backup', 'Hier liegen die verschl\u00fcsselten Datensicherungen und das Archiv.'));\n  const d = await guarded(() => GET('/backups'), 'Backup', 'Hier liegen die verschl\u00fcsselten Datensicherungen und das Archiv.'); if (!d || !P.alive()) return;\n  const r = d.report;\n  P.show(html`${head('Backup', 'T\u00e4glich um 0:01 Uhr wird eine verschl\u00fcsselte Sicherung aller Daten, des Protokolls und des Systemstands erstellt.', html`${areaBar()}<button class=\"btn btn-primary\" data-act=\"backupNow\">${icon('shield')}Backup jetzt erstellen</button>`)}\n    ${!d.passwordSet ? html`<div class=\"err-box\">${icon('alert')}<span>Es ist noch kein eigenes Backup-Passwort festgelegt. Ohne Passwort sind Backups nur mit dem Server-Schl\u00fcssel lesbar.</span>${isAdmin() ? html`<button class=\"btn btn-sm\" data-act=\"backupPw\">Jetzt festlegen</button>` : ''}</div>` : ''}\n    <div class=\"detail-grid mt\"><section class=\"panel\"><div class=\"panel-head\"><h2>Sicherungen</h2>${isAdmin() && d.passwordSet ? html`<button class=\"btn btn-sm btn-ghost\" data-act=\"backupPw\">${icon('key')}Backup-Passwort \u00e4ndern</button>` : ''}</div>\n      ${d.backups.length ? html`<div class=\"table-wrap\"><table class=\"table\"><thead><tr><th>Zeitpunkt</th><th>Art</th><th class=\"r\">Gr\u00f6\u00dfe</th><th>Pr\u00fcfsumme</th><th>Cloud</th><th></th></tr></thead><tbody>${d.backups.map((b) => html`<tr><td>${fDT(b.created_at)}</td><td>${b.kind === 'auto' ? 'Automatisch' : 'Manuell'}</td><td class=\"r num\">${fBytes(b.size)}</td>\n        <td class=\"num tiny\" title=\"${b.sha256 || ''}\">${(b.sha256 || '').slice(0, 12)}\u2026</td><td>${b.uploaded ? badge(b.uploaded, b.uploaded === 'hochgeladen' ? 'ok' : 'warn') : html`<span class=\"muted small\">\u2013</span>`}</td>\n        <td class=\"r\"><a class=\"btn btn-sm\" href=\"${fileUrl(`/backups/${b.id}/download`)}\">${icon('download')}Herunterladen</a></td></tr>`)}</tbody></table></div>` : html`<div class=\"panel-body\">${empty('Noch keine Sicherungen')}</div>`}\n      <div class=\"panel-body small muted\">Die Datei ist mit AES-256-GCM verschl\u00fcsselt (Schl\u00fcssel aus dem Backup-Passwort, PBKDF2 mit 150.000 Runden) und enth\u00e4lt alle Tabellen als Text (JSON). Passw\u00f6rter von Konten sind nicht enthalten.</div></section>\n      <section class=\"panel\"><div class=\"panel-head\"><h2>Sicherheitsbericht</h2>${r.ok ? badge('Keine kritischen Punkte', 'ok') : badge('Handlungsbedarf', 'err')}</div><div class=\"panel-body\">\n        ${r.issues.length ? r.issues.map((i) => html`<div class=\"sec-issue\"><span class=\"level\">${badge(...(LEVEL[i.level] || [i.level]))}</span><span>${i.text}</span></div>`) : html`<p class=\"muted\">Keine Auff\u00e4lligkeiten.</p>`}\n        <p class=\"tiny muted mt\">Stand ${fDT(r.created_at)} \u00b7 Version ${r.version}</p></div></section></div>\n    <section class=\"panel mt\"><div class=\"panel-head\"><h2>Archiv</h2><div class=\"row\">${[['', 'Alle'], ['ticket', 'Support'], ['sysissue', 'Systemfehler']].map(([k, l]) => html`<button class=\"btn btn-sm btn-ghost\" data-act=\"archList\" data-kind=\"${k}\">${l}</button>`)}</div></div><div id=\"arch\" class=\"panel-body\">${loading()}</div></section>`);\n  ACT.archList({ dataset: { kind: '' } });\n}\nACT.archList = async (b) => {\n  const d = await GET('/archive', { kind: b.dataset.kind });\n  render('#arch', d.items.length ? html`<table class=\"table\"><thead><tr><th>Art</th><th>Titel</th><th>Archiviert</th><th>Aufbewahrt bis</th><th></th></tr></thead><tbody>${d.items.map((a) => html`<tr><td>${a.kind}</td><td>${a.title}</td><td>${fDate(a.archived_at)}</td><td>${fDate(a.expires_at)}</td><td class=\"r\"><button class=\"btn btn-sm btn-ghost\" data-act=\"archOpen\" data-id=\"${a.id}\">Ansehen</button></td></tr>`)}</tbody></table>` : empty('Das Archiv ist leer'));\n};\nACT.archOpen = async (b) => { const d = await GET('/archive/' + b.dataset.id); modal({ title: d.item.title, wide: true, body: html`<pre class=\"pre small\">${JSON.stringify(d.item.data, null, 2)}</pre>` }); };\nACT.backupNow = async () => { await POST('/backups'); toast('Backup erstellt.'); reload(); };\nACT.backupPw = async () => {\n  const d = await ask({ title: 'Backup-Passwort festlegen', text: 'Mit diesem Passwort werden alle k\u00fcnftigen Backups verschl\u00fcsselt. Bewahre es sicher auf \u2013 ohne Passwort lassen sich Backups nicht \u00f6ffnen.', ok: 'Speichern',\n    fields: html`${field('Passwort', inp('password', '', { type: 'password', req: true, attrs: 'minlength=\"10\" autocomplete=\"new-password\"' }), PW_HINT)}${field('Wiederholen', inp('password2', '', { type: 'password', req: true }))}` });\n  if (!d) return; if (d.password !== d.password2) throw new Error('Die Passw\u00f6rter stimmen nicht \u00fcberein.');\n  await POST('/backups/password', { password: d.password }); toast('Backup-Passwort gespeichert.'); reload();\n};\n\nasync function pageAudit() {\n  const P = page('protokoll');\n  if (!can('audit_view')) return P.show(noAccess());\n  const what = 'Das Protokoll zeigt, wer wann was im System ge\u00e4ndert hat (30 Tage).';\n  if (!S.user.areaUnlocked) return P.show(lockScreen('Protokoll', what));\n  const q = hashQuery();\n  const d = await guarded(() => GET('/audit', q), 'Protokoll', what); if (!d || !P.alive()) return;\n  P.show(html`${head('Protokoll', `${plural(d.total, 'Eintrag', 'Eintr\u00e4ge')} \u00b7 jede \u00c4nderung im System, 30 Tage aufbewahrt, danach im Backup`, html`${areaBar()}<a class=\"btn\" href=\"${fileUrl('/audit', { ...q, export: 1 })}\">${icon('download')}Als Textdatei</a>`)}\n    <section class=\"panel\"><form class=\"toolbar\" data-submit=\"auditFilter\"><label class=\"search\">${icon('search')}<input name=\"q\" value=\"${q.q || ''}\" placeholder=\"Aktion, Person, Objekt, Details \u2026\" aria-label=\"Suche\"></label>\n      ${sel('actor_type', [['staff', 'Mitarbeiter'], ['partner', 'Partner'], ['customer', 'Kunde'], ['web', 'Webseite'], ['system', 'System']], q.actor_type, { empty: 'Alle', attrs: 'aria-label=\"Wer\"' })}\n      <input type=\"date\" name=\"from\" value=\"${q.from || ''}\" aria-label=\"Von\"><input type=\"date\" name=\"to\" value=\"${q.to || ''}\" aria-label=\"Bis\"><button class=\"btn btn-sm btn-dark\" type=\"submit\">Filtern</button></form>\n    <div class=\"table-wrap\"><table class=\"table\"><thead><tr><th>Zeit</th><th>Wer</th><th>Aktion</th><th>Objekt</th><th>Details</th><th>IP-Kennung</th></tr></thead><tbody>${d.items.map((a) => html`<tr><td class=\"nowrap\">${fDT(a.at)}</td><td>${a.actor_name || '\u2013'}<span class=\"cell-sub\">${a.actor_type}</span></td><td class=\"strong\">${String(a.action).replace(/_/g, ' ')}</td>\n      <td>${a.entity || ''} ${a.entity_id || ''}</td><td class=\"small\"><span class=\"pre\">${String(a.detail || '').slice(0, 220)}</span></td><td class=\"tiny muted num\">${(a.ip || '').slice(0, 10)}</td></tr>`)}</tbody></table></div>\n    <div class=\"pager\"><span>Seite ${d.page} von ${d.pages}</span><span class=\"row\">${d.page > 1 ? html`<a class=\"btn btn-sm\" href=\"#/protokoll${qs({ ...q, page: d.page - 1 })}\">Zur\u00fcck</a>` : ''}${d.page < d.pages ? html`<a class=\"btn btn-sm\" href=\"#/protokoll${qs({ ...q, page: d.page + 1 })}\">Weiter</a>` : ''}</span></div></section>`);\n}\nSUBMIT.auditFilter = (d) => setHashQuery(d, '#/protokoll');\n\n/* ---------- Verwaltung ---------- */\nconst ADM_TABS = () => [canAny('users_view', 'users_create', 'users_create_vt', 'users_admin') && ['mitarbeiter', 'Mitarbeiter', '#/verwaltung'], canAny('users_view', 'users_admin', 'users_create') && ['rollen', 'Rollen & Rechte', '#/verwaltung/rollen'],\n  canAny('settings_all', 'acc_settings', 'acc_manage') && ['einstellungen', 'Einstellungen', '#/verwaltung/einstellungen'], ['links', 'Links', '#/verwaltung/links'], S.user.role === 'admin' && ['auswahl', 'Angebotsauswahl', '#/verwaltung/auswahl'], can('settings_all') && ['postausgang', 'Postausgang', '#/verwaltung/postausgang'], can('settings_all') && ['system', 'System', '#/verwaltung/system']];\nconst admHead = (tab) => html`${head('Verwaltung', 'Mitarbeiterkonten, Rollen, Einstellungen und Links.')}${tabsBar(ADM_TABS(), tab)}`;\nasync function pageAdmin(tab) {\n  const P = page('verwaltung');\n  const tabs = ADM_TABS().filter(Boolean);\n  if (!tab) tab = tabs[0][0];\n  if (!tabs.some((t) => t[0] === tab)) return P.show(noAccess());\n  await ({ mitarbeiter: admUsers, rollen: admRoles, einstellungen: admSettings, links: admLinks, postausgang: admOutbox, system: admSystem, auswahl: admScoring }[tab])(P, tab);\n}\nconst creatableRoles = () => can('users_admin') ? Object.keys(S.config.roles) : can('users_create') ? ['teamleitung', 'vertrieb', 'buchhaltung'] : can('users_create_vt') ? ['vertrieb'] : [];\nasync function admUsers(P, tab) {\n  const d = await GET('/users'); if (!P.alive()) return;\n  S.users = d.users;\n  const manageable = (u) => can('users_admin') || (can('users_create') && (S.config.roles[u.role_key] || {}).rank < 80) || (can('users_create_vt') && u.role_key === 'vertrieb');\n  P.show(html`${admHead(tab)}<section class=\"panel mt\"><div class=\"toolbar\"><span class=\"small muted\">${plural(d.users.filter((u) => u.active).length, 'aktives Konto', 'aktive Konten')}</span><span class=\"spacer\"></span>${creatableRoles().length ? html`<button class=\"btn btn-sm btn-primary\" data-act=\"userNew\">${icon('plus')}Mitarbeiter anlegen</button>` : ''}</div>\n    <div class=\"table-wrap\"><table class=\"table\"><thead><tr><th>Name</th><th>Rolle</th><th>Abteilung</th><th>Sonderrechte</th><th>Letzte Anmeldung</th><th>Status</th><th></th></tr></thead><tbody>\n      ${d.users.map((u) => html`<tr class=\"${u.active ? '' : 'muted'}\"><td><b>${u.name}</b><span class=\"cell-sub\">${u.email}</span></td><td>${roleLabel(u.role_key)}</td><td>${u.department || '\u2013'}</td>\n        <td class=\"small\">${u.extra_perms.length ? html`+ ${u.extra_perms.length}` : ''}${u.revoked_perms.length ? html` \u2212 ${u.revoked_perms.length}` : ''}${!u.extra_perms.length && !u.revoked_perms.length ? html`<span class=\"muted\">\u2013</span>` : ''}</td>\n        <td>${u.last_login ? fDT(u.last_login) : html`<span class=\"muted\">nie</span>`}</td><td>${!u.active ? badge('Deaktiviert', 'muted') : u.locked ? badge('Gesperrt', 'err') : u.pending ? badge('Einladung offen', 'warn') : badge('Aktiv', 'ok')}</td>\n        <td class=\"r nowrap\">${manageable(u) ? html`<button class=\"btn btn-sm btn-ghost\" data-act=\"userEdit\" data-id=\"${u.id}\">Bearbeiten</button>` : ''}${u.pending && manageable(u) ? html`<button class=\"btn btn-sm btn-ghost\" data-act=\"userInvite\" data-id=\"${u.id}\">Einladung</button>` : ''}</td></tr>`)}</tbody></table></div></section>`);\n}\nACT.userNew = async () => {\n  const d = await ask({ title: 'Mitarbeiter anlegen', text: 'Der Mitarbeiter erh\u00e4lt eine Einladung per E-Mail (noreplay@) und legt sein Passwort selbst fest. Die Freigabe erfolgt automatisch.', ok: 'Anlegen und einladen',\n    fields: html`${field('Name', inp('name', '', { req: true }))}${field('E-Mail', inp('email', '', { type: 'email', req: true }))}${field('Rolle', sel('role_key', creatableRoles().map((k) => [k, roleLabel(k)]), creatableRoles().slice(-1)[0] === 'buchhaltung' ? 'vertrieb' : creatableRoles()[0]))}\n      <div class=\"grid-2\">${field('Abteilung', inp('department'))}${field('Telefon', inp('phone'))}</div>` });\n  if (!d) return; delete d._form;\n  const r = await POST('/users', d);\n  toast(r.mail === 'gesendet' ? 'Mitarbeiter angelegt, Einladung versendet.' : 'Angelegt. E-Mail-Dienst nicht eingerichtet \u2013 Link kopieren.', r.mail === 'gesendet' ? 'ok' : 'err');\n  if (r.mail !== 'gesendet') showLink('Einladungslink', r.invite);\n  reload();\n};\nACT.userInvite = async (b) => { const r = await POST(`/users/${b.dataset.id}/invite`); toast(r.mail === 'gesendet' ? 'Einladung erneut versendet.' : 'E-Mail nicht versendet.'); if (r.mail !== 'gesendet') showLink('Einladungslink', r.invite); };\nfunction permChecks(name, selected, disabled = false) {\n  const groups = {}; for (const p of S.config.permissions) (groups[p.group] = groups[p.group] || []).push(p);\n  return html`${Object.entries(groups).map(([g, ps]) => html`<div class=\"perm-group\"><h4>${g}</h4><div class=\"perm-grid\">${ps.map((p) => html`<label class=\"check\"><input type=\"checkbox\" name=\"${name}[]\" value=\"${p.key}\" ${selected.includes(p.key) ? raw('checked') : ''} ${disabled ? raw('disabled') : ''}><span>${p.label}</span></label>`)}</div></div>`)}`;\n}\nACT.userEdit = async (b) => {\n  const u = S.users.find((x) => x.id === +b.dataset.id);\n  const self = u.id === S.user.id;\n  const roles = can('users_admin') ? Object.keys(S.config.roles) : can('users_create') ? ['teamleitung', 'vertrieb', 'buchhaltung'] : ['vertrieb'];\n  modal({ title: u.name, wide: true, body: html`<form class=\"stack\" data-submit=\"userSave\" id=\"userForm\"><input type=\"hidden\" name=\"id\" value=\"${u.id}\">\n    <div class=\"grid-2\">${field('Name', inp('name', u.name, { req: true }))}${field('Rolle', sel('role_key', roles.map((k) => [k, roleLabel(k)]), u.role_key))}${field('Abteilung', inp('department', u.department))}${field('Telefon', inp('phone', u.phone))}</div>\n    ${can('users_perms') ? html`<fieldset><legend>Sonderrechte zus\u00e4tzlich zur Rolle</legend><p class=\"small muted\">Nur der Admin kann einzelnen Mitarbeitern Rechte geben oder entziehen.</p>${permChecks('extra', u.extra_perms)}</fieldset>\n      <fieldset><legend>Rechte entziehen</legend>${permChecks('revoked', u.revoked_perms)}</fieldset>` : ''}</form>\n    ${can('users_admin') && !self ? html`<hr class=\"sep\"><div class=\"row\"><button class=\"btn btn-sm\" data-act=\"userReset\" data-id=\"${u.id}\">${icon('key')}Passwort zur\u00fccksetzen</button>\n      <button class=\"btn btn-sm\" data-act=\"userLock\" data-id=\"${u.id}\" data-locked=\"${u.locked ? 1 : 0}\">${u.locked ? 'Entsperren' : 'Sperren'}</button><button class=\"btn btn-sm\" data-act=\"userActive\" data-id=\"${u.id}\" data-active=\"${u.active ? 1 : 0}\">${u.active ? 'Deaktivieren' : 'Aktivieren'}</button>\n      <span class=\"spacer\"></span><button class=\"btn btn-sm btn-danger\" data-act=\"userDelete\" data-id=\"${u.id}\">${icon('trash')}Konto l\u00f6schen</button></div>` : ''}`,\n    foot: html`<button class=\"btn btn-ghost\" data-close>Abbrechen</button><button class=\"btn btn-primary\" type=\"submit\" form=\"userForm\">Speichern</button>` });\n};\nSUBMIT.userSave = async (d) => {\n  const u = S.users.find((x) => x.id === +d.id);\n  const body = { name: d.name, department: d.department, phone: d.phone };\n  if (d.role_key !== u.role_key) body.role_key = d.role_key;\n  if (can('users_perms')) { body.extra_perms = d.extra || []; body.revoked_perms = d.revoked || []; }\n  await PATCH('/users/' + d.id, body); closeModal(); toast('Gespeichert.'); reload();\n};\nACT.userReset = async (b) => {\n  const d = await ask({ title: 'Passwort zur\u00fccksetzen', ok: 'Senden', fields: html`<div class=\"stack-s\"><label class=\"check\"><input type=\"radio\" name=\"mode\" value=\"link\" checked><span><b>Link senden</b> \u2013 neues Passwort selbst festlegen</span></label>\n    <label class=\"check\"><input type=\"radio\" name=\"mode\" value=\"temp\"><span><b>Vorl\u00e4ufiges Passwort</b> \u2013 muss bei der Anmeldung ge\u00e4ndert werden</span></label></div>${field('Vorl\u00e4ufiges Passwort', inp('password', '', { attrs: 'minlength=\"10\" autocomplete=\"off\"' }), PW_HINT)}` });\n  if (!d) return; if (d.mode === 'temp' && !d.password) throw new Error('Bitte lege das vorl\u00e4ufige Passwort fest.');\n  const r = await POST(`/users/${b.dataset.id}/reset`, { mode: d.mode, password: d.password });\n  toast(r.mail === 'gesendet' ? 'Per E-Mail versendet.' : 'Gespeichert, E-Mail nicht versendet.', r.mail === 'gesendet' ? 'ok' : 'err');\n  if (r.invite && r.mail !== 'gesendet') showLink('Link zum neuen Passwort', r.invite);\n};\nACT.userLock = async (b) => { const lock = b.dataset.locked !== '1'; if (lock && !(await confirmBox('Konto sperren?', 'Der Mitarbeiter wird sofort abgemeldet.', 'Sperren', true))) return; await PATCH('/users/' + b.dataset.id, { locked: lock }); closeModal(); reload(); };\nACT.userActive = async (b) => { await PATCH('/users/' + b.dataset.id, { active: b.dataset.active !== '1' }); closeModal(); reload(); };\nACT.userDelete = async (b) => { if (!(await confirmBox('Konto l\u00f6schen?', 'Das Konto wird dauerhaft deaktiviert, die E-Mail-Adresse wird frei.', 'L\u00f6schen', true))) return; await DEL('/users/' + b.dataset.id); closeModal(); toast('Konto gel\u00f6scht.'); reload(); };\n\nasync function admRoles(P, tab) {\n  const d = await GET('/roles'); if (!P.alive()) return;\n  const keys = Object.keys(S.config.roles);\n  const roles = Object.fromEntries(d.roles.map((r) => [r.key, r.perms]));\n  const edit = can('users_perms');\n  P.show(html`${admHead(tab)}<section class=\"panel mt\"><div class=\"panel-head\"><h2>Rechte je Rolle</h2>${edit ? html`<button class=\"btn btn-sm btn-primary\" type=\"submit\" form=\"rolesForm\">Speichern</button>` : html`<span class=\"small muted\">${icon('lock')} \u00c4nderungen nur durch den Admin</span>`}</div>\n    <form id=\"rolesForm\" data-submit=\"rolesSave\"><div class=\"table-wrap\"><table class=\"table matrix\"><thead><tr><th>Recht</th>${keys.map((k) => html`<th>${roleLabel(k)}</th>`)}</tr></thead><tbody>\n      ${S.config.permissions.map((p, i) => html`${i === 0 || S.config.permissions[i - 1].group !== p.group ? html`<tr><td colspan=\"${keys.length + 1}\" class=\"strong\">${p.group}</td></tr>` : ''}<tr><td class=\"small\">${p.label}</td>${keys.map((k) => html`<td><input type=\"checkbox\" name=\"${k}[]\" value=\"${p.key}\" aria-label=\"${roleLabel(k)}: ${p.label}\" ${k === 'admin' || (roles[k] || []).includes(p.key) ? raw('checked') : ''} ${!edit || k === 'admin' ? raw('disabled') : ''}></td>`)}</tr>`)}</tbody></table></div></form>\n    <div class=\"panel-body small muted\">\u00dcbergeordnete Rollen enthalten die Rechte der untergeordneten. Der Admin hat immer alle Rechte. Einzelne Sonderrechte vergibst du beim jeweiligen Mitarbeiter.</div></section>`);\n}\nSUBMIT.rolesSave = async (d) => { for (const k of Object.keys(S.config.roles)) if (k !== 'admin') await PATCH('/roles/' + k, { perms: d[k] || [] }); toast('Rollen gespeichert.'); await loadSession(); reload(); };\n\nconst SET_GROUPS = [\n  ['Firma (Rechnungssteller)', 'company_', { company_name: 'Firmenname', company_street: 'Stra\u00dfe', company_zip: 'PLZ', company_city: 'Ort', company_country: 'Land', company_email: 'E-Mail', company_phone: 'Telefon', company_web: 'Webseite', company_tax_no: 'Steuernummer', company_vat_id: 'USt-IdNr.', company_owners: 'Gesellschafter / Inhaber', company_register: 'Register', company_bank: 'Bank', company_iban: 'IBAN', company_bic: 'BIC' }],\n  ['E-Mail-Absender', 'mail_', { mail_from_invoice: 'Rechnungen, Mahnungen (Buchhaltung)', mail_from_system: 'System, Einladungen, Konten', mail_from_partner: 'Anfragetool an Partner', mail_from_support: 'Support an Partner und Kunden', mail_from_customer: 'Nachrichten zu Anfragen an Kunden', mail_sender_name: 'Absendername', mail_internal_inbox: 'Postfach Vermittlung (Antworten)', mail_support_inbox: 'Postfach Support' }],\n  ['Anfragen und Fristen', '', { offer_window_hours: 'Angebotsfrist (Werktags-Stunden)', lock_hours: 'Bearbeitungssperre ohne Angebot (Stunden)', contact_window_hours: 'Kontaktfrist nach Zusage (Werktags-Stunden)', presented_count: 'Anzahl vorgestellter Angebote', show_partner_identity: 'Kunde sieht Firmendaten des Partners schon vor der Zusage', review_before_present: 'Angebote vor dem Vorstellen intern pr\u00fcfen', radius_options: 'Umkreis-Auswahl f\u00fcr Kunden (km, 0 = bundesweit)', radius_default: 'Standard-Umkreis (km)', score_weight_price: 'Gewichtung Preis bei der Auswertung (%)', feedback_delay_hours: 'R\u00fcckfrage beim Kunden nach (Stunden)', survey_delay_days: 'Kundenumfrage nach (Tagen)' }],\n  ['Buchhaltung', '', { lead_price_deal: 'Preis je Vermittlung Traumwagen-DEAL (netto)', lead_price_sell: 'Preis je Vermittlung Fahrzeugankauf (netto)', vat_enabled: 'Umsatzsteuer ausweisen', vat_rate: 'USt-Satz (%)', payment_terms_days: 'Zahlungsziel (Tage) \u2013 Standard f\u00fcr neue Partner', reminder_due_days: 'Frist in der Zahlungserinnerung (Tage, kostenlos)', dunning_fee_1: 'Mahngeb\u00fchr 1. Mahnung / Stufe 1 (\u20ac)', dunning_due_days: 'Frist in der 1. Mahnung (Tage)', dunning_fee_2: 'Mahngeb\u00fchr 2. Mahnung / Stufe 2 (\u20ac)', dunning_due_days_2: 'Frist in der 2. Mahnung (Tage)', dunning_auto: 'Mahnungen automatisch versenden', dunning_days_1: 'Zahlungserinnerung \u2026 Tage nach F\u00e4lligkeit', dunning_days_2: '1. Mahnung \u2026 Tage nach Ablauf der Erinnerungsfrist', dunning_days_3: '2. Mahnung \u2026 Tage nach Ablauf der Frist der 1. Mahnung', invoice_prefix: 'Pr\u00e4fix Rechnungsnummer', invoice_next: 'N\u00e4chste Rechnungsnummer', invoice_intro: 'Einleitung auf Rechnungen', invoice_footer: 'Hinweis unter Rechnungen', monthly_run_day: 'Sammelrechnungen am (last = Monatsletzter)', monthly_run_hour: 'Sammelrechnungen um (Uhr)', day_close_time: 'Tagesabschluss um (HH:MM)' }],\n  ['Support', '', { support_escalate_hours: 'Priorit\u00e4t \u201eHoch\u201c nach (Stunden)', support_archive_days: 'Erledigte Tickets ins Backup-Archiv nach (Tagen)', syslist_retention_days: 'System-Fehlerliste aufbewahren (Tage)', support_ack_subject: 'Betreff Eingangsbest\u00e4tigung', support_ack_text: 'Text Eingangsbest\u00e4tigung' }],\n  ['System und Backup', '', { audit_retention_days: 'Protokoll im System (Tage)', backup_keep: 'Anzahl aufbewahrter Backups', backup_hour: 'Backup um (Stunde)', backup_minute: 'Backup um (Minute)', backup_webhook_url: 'Cloud-Upload (Webhook-URL, optional)' }],\n  ['Links', 'link_', { link_public: '\u00d6ffentliche Adresse des Systems', link_staff: 'Startseite internes Dashboard', link_partner: 'Startseite Partner-Dashboard', link_shopify_admin: 'Shopify-Admin', link_shop: 'Webshop', link_instagram: 'Instagram', link_agb_partner: 'AGB f\u00fcr Partner', link_privacy: 'Datenschutzerkl\u00e4rung', link_my_requests: 'Seite \u201eMeine Anfragen\u201c im Shop' }]\n];\nasync function admSettings(P, tab) {\n  const d = await GET('/settings'); if (!P.alive()) return;\n  const keys = d.editable, s = d.settings;\n  const input = (k, label) => { const v = s[k]; const long = /intro|footer|ack_text/.test(k);\n    if (typeof v === 'boolean') return html`<div class=\"field\">${chk(k, v, label)}</div>`;\n    if (Array.isArray(v)) return field(label, inp(k, v.join(', ')));\n    if (long) return html`<div class=\"span-2\">${field(label, area(k, v, { rows: 3 }))}</div>`;\n    return field(label, inp(k, v, { type: typeof v === 'number' ? 'text' : /^mail_from|_email|_inbox$/.test(k) ? 'email' : 'text', attrs: typeof v === 'number' ? 'inputmode=\"decimal\"' : '' })); };\n  const groups = SET_GROUPS.map(([title, , labels]) => [title, Object.entries(labels).filter(([k]) => keys.includes(k))]).filter(([, l]) => l.length);\n  P.show(html`${admHead(tab)}${d.env ? html`<section class=\"panel mt\"><div class=\"panel-head\"><h2>E-Mail-Versand</h2>${d.env.mail ? badge(d.env.mail === 'smtp' ? `aktiv \u00fcber Postfach ${d.env.smtpUser}` : 'aktiv \u00fcber Brevo', 'ok') : badge('nicht eingerichtet', 'err')}</div>\n      <div class=\"panel-body stack\">${d.env.mail ? html`<div class=\"row-between\"><p class=\"small muted\">Einladungen, Rechnungen, Mahnungen, Anfragen und Support-Mails werden automatisch versendet${d.env.smtpSource === 'dashboard' ? ' \u2013 Postfach-Zugang hier im Dashboard hinterlegt (verschl\u00fcsselt gespeichert)' : d.env.smtpSource === 'cloudflare' ? ' \u2013 Postfach-Zugang aus den Cloudflare-Secrets' : ''}. Jede E-Mail steht zus\u00e4tzlich im Postausgang.</p>\n          <div class=\"row\"><button class=\"btn btn-sm\" type=\"button\" data-act=\"mailCredEdit\" data-user=\"${d.env.smtpUser || ''}\">${icon('key')}Zugang \u00e4ndern</button>${d.env.smtpSource === 'dashboard' ? html`<button class=\"btn btn-sm btn-ghost\" type=\"button\" data-act=\"mailCredDel\">Entfernen</button>` : ''}</div></div>`\n        : mailCredForm()}\n        <form class=\"inline-form\" data-submit=\"mailTest\">${field('Test-E-Mail senden an', inp('to', S.user.email, { type: 'email', req: true }))}${field('Absender', sel('category', Object.entries(S.config.mailCategories).filter(([k]) => k !== 'internal').map(([k, v]) => [k, v.label]), 'system'))}<button class=\"btn btn-dark\" type=\"submit\">${icon('send')}Test senden</button></form></div></section>\n    <section class=\"panel mt\"><div class=\"panel-head\"><h2>Verbindungen</h2></div><div class=\"panel-body row\">${[['r2', 'Dateispeicher (R2)'], ['shopify', 'Shopify-Statistik'], ['oldDb', 'Alte Datenbank (Import)']].map(([k, l]) => badge(`${l}: ${d.env[k] ? 'verbunden' : 'nicht eingerichtet'}`, d.env[k] ? 'ok' : 'muted'))}</div></section>` : ''}\n    <form class=\"stack mt\" data-submit=\"settingsSave\">${groups.map(([title, list]) => html`<section class=\"panel\"><div class=\"panel-head\"><h2>${title}</h2><button class=\"btn btn-sm btn-dark\" type=\"submit\">Speichern</button></div><div class=\"panel-body grid-2\">${list.map(([k, l]) => input(k, l))}</div></section>`)}</form>\n    ${isAdmin() ? html`<section class=\"panel mt\"><div class=\"panel-head\"><h2>Bereichspasswort (Protokoll und Backup)</h2></div><form class=\"panel-body inline-form\" data-submit=\"areaPw\">\n      ${field('Aktuelles Bereichspasswort', inp('current', '', { type: 'password', req: true, attrs: 'autocomplete=\"off\"' }))}${field('Neues Bereichspasswort', inp('next', '', { type: 'password', req: true, attrs: 'minlength=\"10\" autocomplete=\"new-password\"' }))}<button class=\"btn btn-dark\" type=\"submit\">\u00c4ndern</button></form></section>` : ''}`);\n  S.settingsTypes = s;\n}\nSUBMIT.mailTest = async (d) => { const r = await POST('/mail/test', d); if (r.status === 'gesendet') toast(`Test-E-Mail an ${d.to} gesendet.`); else toast(r.error ? `Nicht gesendet: ${r.error}` : 'Kein E-Mail-Versand eingerichtet \u2013 die E-Mail liegt nur im Postausgang.', 'err'); };\nSUBMIT.settingsSave = async (d) => {\n  const out = {}; for (const [k, v] of Object.entries(d)) { if (!(k in S.settingsTypes)) continue; const t = S.settingsTypes[k]; out[k] = typeof t === 'number' ? String(v).replace(',', '.') : v; }\n  await PATCH('/settings', out); toast('Einstellungen gespeichert.'); reload();\n};\nSUBMIT.areaPw = async (d, f) => { await POST('/settings/area-password', d); f.reset(); toast('Bereichspasswort ge\u00e4ndert.'); };\n\nasync function admLinks(P, tab) {\n  const d = await GET('/links'); if (!P.alive()) return;\n  const canSend = canAny('users_create', 'users_create_vt', 'partner_manage');\n  const row = (label, link, which, text) => html`<div class=\"asg\"><div class=\"asg-head\"><div><b>${label}</b><div class=\"asg-meta\">${text}</div></div></div><div class=\"row\"><input value=\"${link}\" readonly aria-label=\"${label}\"><button class=\"btn btn-sm\" data-act=\"copy\" data-text=\"${link}\">Kopieren</button><a class=\"btn btn-sm btn-ghost\" href=\"${link}\" target=\"_blank\" rel=\"noopener\">${icon('external')}\u00d6ffnen</a></div>\n    ${canSend && which ? html`<form class=\"inline-form mt\" data-submit=\"linkSend\"><input type=\"hidden\" name=\"which\" value=\"${which}\">${field('Link senden an', inp('email', '', { type: 'email', req: true, ph: 'name@beispiel.de' }))}<button class=\"btn btn-sm btn-dark\" type=\"submit\">${icon('send')}Senden</button></form>` : ''}</div>`;\n  P.show(html`${admHead(tab)}<section class=\"panel mt\">${row('Internes Dashboard', d.staff, 'staff', 'F\u00fcr neue Mitarbeiter der KFL GbR.')}${row('Partner-Dashboard', d.partner, 'partner', 'F\u00fcr Gesch\u00e4ftspartner \u2013 Anmeldung mit E-Mail und Passwort.')}\n    ${d.shopify ? row('Shopify-Admin', d.shopify, null, 'Nur f\u00fcr Admin und Gesch\u00e4ftsf\u00fchrung sichtbar.') : ''}</section>`);\n}\nSUBMIT.linkSend = async (d, f) => { const r = await POST('/links/send', d); f.reset(); toast(r.mail === 'gesendet' ? 'Link versendet.' : 'Im Postausgang gespeichert (E-Mail-Dienst fehlt).'); };\n\n// Postfach-Zugang direkt im Dashboard hinterlegen (wird bei IONOS gepr\u00fcft, verschl\u00fcsselt gespeichert)\nfunction mailCredForm(user = 'noreplay@kfl-group.com') {\n  return html`<div class=\"err-box\">${icon('alert')}<span><b>E-Mail-Versand ist noch nicht eingerichtet.</b> Trage hier einmal den Zugang zum IONOS-Postfach ein. Das System pr\u00fcft die Anmeldung bei IONOS sofort und speichert das Passwort verschl\u00fcsselt \u2013 danach gehen Rechnungen, Einladungen und alle Benachrichtigungen automatisch raus.</span></div>\n    <form class=\"inline-form\" data-submit=\"mailCred\" autocomplete=\"off\">${field('Postfach (E-Mail-Adresse)', inp('user', user, { type: 'email', req: true, attrs: 'autocomplete=\"off\"' }))}${field('Passwort des Postfachs', inp('pass', '', { type: 'password', req: true, attrs: 'autocomplete=\"new-password\"' }))}<button class=\"btn btn-primary\" type=\"submit\">${icon('check')}Pr\u00fcfen und speichern</button></form>`;\n}\nSUBMIT.mailCred = async (d, f) => { const r = await POST('/mail/credentials', { user: d.user, pass: d.pass }); f.reset(); closeModal(); S.mailReady = true; toast(`Verbunden: E-Mails werden ab sofort \u00fcber ${r.user} versendet.`); reload(); };\nACT.mailCredEdit = (b) => modal({ title: 'Postfach-Zugang \u00e4ndern', body: html`<p class=\"small muted\">Neue Zugangsdaten werden zuerst bei IONOS gepr\u00fcft. Erst wenn die Anmeldung klappt, werden sie gespeichert.</p><form class=\"stack mt\" data-submit=\"mailCred\" autocomplete=\"off\">${field('Postfach (E-Mail-Adresse)', inp('user', b.dataset.user || 'noreplay@kfl-group.com', { type: 'email', req: true }))}${field('Passwort des Postfachs', inp('pass', '', { type: 'password', req: true, attrs: 'autocomplete=\"new-password\"' }))}<button class=\"btn btn-primary\" type=\"submit\">${icon('check')}Pr\u00fcfen und speichern</button></form>` });\nACT.mailCredDel = async () => { if (!(await confirmBox('Postfach-Zugang entfernen?', 'Danach werden keine E-Mails mehr versendet, bis ein neuer Zugang hinterlegt ist.', 'Entfernen', true))) return; await DEL('/mail/credentials'); toast('Zugang entfernt.'); reload(); };\n// Pr\u00fcfliste: was dem Worker f\u00fcr den E-Mail-Versand fehlt (nur Namen, keine Werte)\nfunction mailSetupHelp(c) {\n  const row = (ok, name, hint) => html`<li class=\"row\">${badge(ok ? 'gefunden' : 'fehlt', ok ? 'ok' : 'err')}<code>${name}</code><span class=\"small muted\">${hint}</span></li>`;\n  return html`<div class=\"err-box\">${icon('alert')}<span><b>Der Worker findet keinen Postfach-Zugang.</b> Ohne diese zwei Secrets kann das System keine E-Mails versenden (Rechnungen, Einladungen, Benachrichtigungen).</span></div>\n    <ul class=\"stack-s checklist\">${row(c.user, 'SMTP_USER', 'Wert: noreplay@kfl-group.com')}${row(c.pass, 'SMTP_PASS', 'Wert: Passwort des IONOS-Postfachs noreplay@kfl-group.com')}</ul>\n    ${c.similar && c.similar.length ? html`<div class=\"note-box\">${icon('alert')}<span>Gefunden, aber falsch benannt: <b>${c.similar.join(', ')}</b>. Die Namen m\u00fcssen exakt <code>SMTP_USER</code> und <code>SMTP_PASS</code> lauten (Gro\u00dfbuchstaben, Unterstrich, keine Leerzeichen).</span></div>` : ''}\n    <div class=\"info-box\">${icon('key')}<span><b>So richtest du es ein:</b> Cloudflare \u2192 Workers &amp; Pages \u2192 <b>tiny-lab-d971kfl-forms</b> \u2192 <b>Einstellungen</b> \u2192 <b>Variablen und Secrets</b> (nicht unter \u201eBuild\u201c) \u2192 <b>Hinzuf\u00fcgen</b> \u2192 Typ <b>Secret</b> \u2192 Name und Wert eintragen \u2192 <b>Bereitstellen</b>. Danach diese Seite neu laden: Beide Eintr\u00e4ge stehen dann auf \u201egefunden\u201c. Server: ${c.host}, Port ${c.port} (STARTTLS).</span></div>`;\n}\n/* ---------- Angebotsauswahl: Gewichtung der Faktoren (nur Admin, Freigabepasswort) ---------- */\nasync function admScoring(P, tab) {\n  const d = await GET('/scoring'); if (!P.alive()) return;\n  const sum = Object.values(d.weights).reduce((a, b) => a + (+b || 0), 0);\n  P.show(html`${admHead(tab)}<div class=\"detail-grid mt\"><form class=\"panel\" data-submit=\"scoringSave\" id=\"scoringForm\" autocomplete=\"off\">\n      <div class=\"panel-head\"><h2>Nach welchen Faktoren werden Angebote ausgew\u00e4hlt?</h2><span class=\"sum-pill ${sum === 100 ? 'ok' : 'bad'}\" id=\"scoreSum\">Summe ${sum} %</span></div>\n      <div class=\"panel-body stack\">\n        <p class=\"small muted\">Jedes Angebot erh\u00e4lt je Faktor 0\u2013100 Punkte. Die Gewichtung bestimmt, wie stark der Faktor z\u00e4hlt. Faktoren, die bei einer Anfrage nicht zutreffen (z. B. Laufzeit beim Kauf oder Zusatzprodukte, die der Kunde nicht wollte), werden automatisch herausgerechnet.</p>\n        ${d.factors.map((f, i) => html`<div class=\"score-row\"><div class=\"score-l\"><b><i class=\"dot sc-${i}\"></i> ${f.label}</b><span class=\"small muted\">${f.hint}</span></div>\n          <input type=\"range\" min=\"0\" max=\"100\" step=\"1\" value=\"${d.weights[f.key]}\" data-score=\"${f.key}\" aria-label=\"${f.label}\">\n          <label class=\"score-v\"><input type=\"number\" min=\"0\" max=\"100\" step=\"1\" name=\"w_${f.key}\" value=\"${d.weights[f.key]}\" data-score-num=\"${f.key}\" inputmode=\"numeric\" aria-label=\"${f.label} in Prozent\"><span>%</span></label></div>`)}\n        <div class=\"score-bar\" id=\"scoreBar\">${d.factors.map((f, i) => html`<i class=\"sc-${i}\" data-w=\"${d.weights[f.key]}\" title=\"${f.label}: ${d.weights[f.key]} %\"></i>`)}</div>\n        <div class=\"grid-2\">${field('Anzahl Angebote, die der Kunde sieht', sel('presented_count', [['3', 'Die 3 besten Angebote'], ['2', 'Die 2 besten Angebote'], ['1', 'Nur das beste Angebot']], String(d.presented_count)), 'Sind weniger Angebote eingegangen, sieht der Kunde alle.')}\n          ${field('Freigabepasswort', inp('password', '', { type: 'password', req: true, attrs: 'autocomplete=\"off\"' }), 'Zum Speichern erforderlich')}</div>\n        <div class=\"row\"><button class=\"btn btn-primary\" type=\"submit\" id=\"scoreSave\" ${sum === 100 ? '' : raw('disabled')}>${icon('check')}Gewichtung speichern</button><button class=\"btn btn-ghost\" type=\"button\" data-act=\"scoringEven\">Gleichm\u00e4\u00dfig verteilen</button><span class=\"small muted\" id=\"scoreHint\">${sum === 100 ? '' : 'Die Faktoren m\u00fcssen zusammen genau 100 % ergeben.'}</span></div></div></form>\n    <div class=\"stack\"><section class=\"panel\"><div class=\"panel-head\"><h2>So funktioniert die Auswahl</h2></div><div class=\"panel-body stack-s small\">\n      <p>1. Nach Ablauf der Angebotsfrist bewertet das System alle eingegangenen Angebote.</p><p>2. Die ${d.presented_count} besten Angebote werden dem Kunden unter \u201eMeine Anfragen\u201c vorgestellt \u2013 sortiert nach Punkten, das beste zuerst.</p>\n      <p>3. Der Kunde w\u00e4hlt eines mit \u201eInteressiert mich\u201c; die anderen Partner werden informiert.</p>${d.review_before_present ? html`<p class=\"note-box\">${icon('eye')}<span>Angebote werden vor dem Vorstellen intern gepr\u00fcft (Einstellung \u201eAngebote vor dem Vorstellen intern pr\u00fcfen\u201c).</span></p>` : ''}\n      <p class=\"muted\">Die Punkte je Faktor siehst du bei jeder Anfrage am Angebot.</p></div></section>\n      <section class=\"panel\"><div class=\"panel-head\"><h2>Letzte \u00c4nderungen</h2></div><div class=\"panel-body\">${d.history.length ? html`<ul class=\"timeline\">${d.history.map((h) => html`<li><div><div class=\"tl-meta\">${h.author || 'Admin'} \u00b7 ${fDT(h.at)}</div><div class=\"small\">${d.factors.map((f) => `${f.label.split(' ')[0]} ${h.detail['score_w_' + f.key]} %`).join(' \u00b7 ')} \u00b7 ${h.detail.presented_count} Angebot(e)</div></div></li>`)}</ul>` : html`<p class=\"small muted\">Noch keine \u00c4nderungen \u2013 es gelten die Startwerte.</p>`}</div></section></div></div>`);\n}\nfunction scoringSync(key, val) {\n  const f = $('#scoringForm'); if (!f) return;\n  val = Math.max(0, Math.min(100, Math.round(+val || 0)));\n  const r = f.querySelector(`[data-score=\"${key}\"]`), n = f.querySelector(`[data-score-num=\"${key}\"]`);\n  if (r && +r.value !== val) r.value = val; if (n && +n.value !== val) n.value = val;\n  const vals = $$('[data-score-num]', f).map((x) => Math.max(0, Math.round(+x.value || 0))), sum = vals.reduce((a, b) => a + b, 0);\n  const pill = $('#scoreSum'); pill.textContent = `Summe ${sum} %`; pill.className = 'sum-pill ' + (sum === 100 ? 'ok' : 'bad');\n  $('#scoreSave').disabled = sum !== 100; $('#scoreHint').textContent = sum === 100 ? '' : sum > 100 ? `${sum - 100} % zu viel \u2013 bitte reduzieren.` : `Noch ${100 - sum} % verteilen.`;\n  $$('#scoreBar i').forEach((el, i) => { el.style.width = (sum ? (vals[i] / Math.max(100, sum)) * 100 : 0) + '%'; });\n}\ndocument.addEventListener('input', (e) => { const t = e.target; if (t.dataset && (t.dataset.score || t.dataset.scoreNum)) scoringSync(t.dataset.score || t.dataset.scoreNum, t.value); });\nACT.scoringEven = () => { const keys = $$('[data-score-num]').map((x) => x.dataset.scoreNum); const base = Math.floor(100 / keys.length); keys.forEach((k, i) => scoringSync(k, base + (i < 100 - base * keys.length ? 1 : 0))); };\nSUBMIT.scoringSave = async (d, f) => {\n  const weights = {}; for (const k of Object.keys(d)) if (k.startsWith('w_')) weights[k.slice(2)] = +d[k];\n  await POST('/scoring', { weights, presented_count: +d.presented_count, password: d.password });\n  f.elements.password.value = ''; toast('Gewichtung gespeichert \u2013 gilt f\u00fcr alle neuen Auswertungen.'); reload();\n};\nasync function admOutbox(P, tab) {\n  const d = await GET('/outbox'); if (!P.alive()) return;\n  const ST = { gesendet: 'ok', fehler: 'err', nicht_konfiguriert: 'warn' };\n  P.show(html`${admHead(tab)}<section class=\"panel mt\"><div class=\"panel-head\"><h2>Letzte 200 E-Mails</h2><span class=\"small muted\">Jede E-Mail wird hier protokolliert \u2013 auch wenn der Versand fehlschl\u00e4gt.</span></div>\n    ${d.mails.length ? html`<div class=\"table-wrap\"><table class=\"table\"><thead><tr><th>Zeit</th><th>Absender</th><th>Empf\u00e4nger</th><th>Betreff</th><th>Status</th><th></th></tr></thead><tbody>${d.mails.map((m) => html`<tr><td class=\"nowrap\">${fDT(m.created_at)}</td><td class=\"small\">${m.sender}</td><td class=\"small\">${m.recipient}</td><td>${m.subject}</td><td>${badge(m.status, ST[m.status] || 'neutral')}${m.error ? html`<span class=\"cell-sub\">${m.error}</span>` : ''}${m.server_reply ? html`<span class=\"cell-sub\" title=\"Antwort des Mailservers\">Server: ${m.server_reply}</span>` : ''}</td><td class=\"r\"><a class=\"btn btn-sm btn-ghost\" target=\"_blank\" rel=\"noopener\" href=\"${fileUrl('/outbox/' + m.id)}\">Ansehen</a></td></tr>`)}</tbody></table></div>` : html`<div class=\"panel-body\">${empty('Noch keine E-Mails')}</div>`}</section>`);\n}\nasync function admSystem(P, tab) {\n  P.show(html`${admHead(tab)}<div class=\"grid-2 mt\">\n    <section class=\"panel\"><div class=\"panel-head\"><h2>Zeitgesteuerte Abl\u00e4ufe</h2></div><div class=\"panel-body stack-s\"><p class=\"small muted\">Laufen automatisch alle 5 Minuten. Hier kannst du einzelne Abl\u00e4ufe sofort starten.</p>\n      ${[['anfragen', 'Fristen und Auswertung der Anfragen'], ['support', 'Support: Eskalation und Archiv'], ['mahnung', 'Automatische Mahnungen'], ['tagesabschluss', 'Tagesabschluss (Zahlungsliste)'], ['monat', 'Sammelrechnungen'], ['backup', 'Backup']].map(([k, l]) => html`<div class=\"row-between\"><span>${l}</span><button class=\"btn btn-sm\" data-act=\"jobRun\" data-job=\"${k}\">Jetzt ausf\u00fchren</button></div>`)}</div></section>\n    <section class=\"panel\"><div class=\"panel-head\"><h2>Postleitzahlen importieren</h2></div><form class=\"panel-body stack\" data-submit=\"geoImport\"><p class=\"small muted\">Optional: eigene Geodaten im Format <code>PLZ;Breite;L\u00e4nge;Ort</code> je Zeile. Sonst werden Koordinaten automatisch ermittelt und zwischengespeichert.</p>${area('csv', '', { rows: 5, ph: '49451;52.5833;8.1167;Holdorf' })}<button class=\"btn\" type=\"submit\">Importieren</button></form></section>\n    <section class=\"panel\"><div class=\"panel-head\"><h2>Daten aus dem alten Dashboard</h2></div><div class=\"panel-body stack-s\"><p class=\"small muted\">\u00dcbernimmt Anfragen, Notizen und Support-F\u00e4lle aus der bisherigen Datenbank (Binding OLD_DB). Bereits \u00fcbernommene Datens\u00e4tze werden \u00fcbersprungen.</p><button class=\"btn\" data-act=\"importOld\">Import starten</button></div></section></div>`);\n}\nACT.jobRun = async (b) => { const r = await POST('/jobs/run', { job: b.dataset.job }); toast('Ausgef\u00fchrt.'); console.log(r.result); };\nSUBMIT.geoImport = async (d) => { const r = await POST('/geo/import', d); toast(`${r.imported} Postleitzahlen importiert.`); };\nACT.importOld = async () => { if (!(await confirmBox('Altdaten importieren?', 'Der Import kann einige Sekunden dauern.', 'Import starten'))) return; const r = await POST('/import-old'); toast(`Importiert: ${Object.entries(r).filter(([k]) => k !== 'ok').map(([k, v]) => `${v} ${k}`).join(', ')}.`); };\n\n/* ===== Routen ===== */\nRouter\n  .on(/^#\\/einladung\\/([0-9a-f]{64})/, (t) => inviteScreen(t))\n  .on(/^#\\/?(\\?.*)?$/, () => pageStart())\n  .on(/^#\\/anfragen\\/(\\d+)/, (no) => pageRequest(no))\n  .on(/^#\\/anfragen(\\?.*)?$/, () => pageRequests())\n  .on(/^#\\/buchhaltung\\/?([a-z]*)/, (t) => pageAccounting(t || 'uebersicht'))\n  .on(/^#\\/fibu\\/?([a-z]*)/, (t) => pageFibu(t || 'uebersicht'))\n  .on(/^#\\/partner\\/(\\d+)/, (id) => pagePartner(id))\n  .on(/^#\\/partner(\\?.*)?$/, () => pagePartners())\n  .on(/^#\\/statistik\\/?([a-z]*)/, (t) => pageStats(t))\n  .on(/^#\\/support\\/(\\d+|systemfehler)/, (id) => pageSupport(id))\n  .on(/^#\\/support(\\?.*)?$/, () => pageSupport())\n  .on(/^#\\/news\\/chat\\/(\\d+)/, (id) => pageNews('chat', id))\n  .on(/^#\\/news\\/?([a-z]*)/, (sub) => pageNews(sub))\n  .on(/^#\\/verwaltung\\/?([a-z]*)/, (t) => pageAdmin(t))\n  .on(/^#\\/einstellungen/, () => pageAdmin('einstellungen'))\n  .on(/^#\\/backup/, () => pageBackup())\n  .on(/^#\\/protokoll/, () => pageAudit());\nRouter.fallback = () => { location.hash = '#/'; };\nconst _resolve = Router.resolve.bind(Router);\n// Ohne Anmeldung nur Einladung erlauben\nRouter.resolve = async function () {\n  if (/^#\\/einladung\\//.test(location.hash) || S.user) return _resolve();\n  return boot();\n};\nif (/^#\\/einladung\\//.test(location.hash)) Router.resolve(); else run(boot);\n</script></body></html>\n";
const PARTNER_HTML = "<!doctype html><html lang=\"de\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\"><meta name=\"robots\" content=\"noindex,nofollow\"><meta name=\"theme-color\" content=\"#16171a\"><meta name=\"apple-mobile-web-app-capable\" content=\"yes\"><title>KFL Partner</title><style nonce=\"__NONCE__\">/* ===== KFL Gestaltungssystem (gemeinsam) ===== */\n:root{\n  --ink:#16171a; --ink-2:#2b2d31; --steel:#62656b; --steel-2:#8a8d93; --line:#e1e2e5; --line-2:#eceef0;\n  --bg:#f2f3f5; --surface:#fff; --sunken:#f7f8f9;\n  --asphalt:#1b1d20; --asphalt-2:#26292d; --asphalt-3:#33363b;\n  --orange:#ff6c01; --orange-hover:#ff8124; --orange-ink:#b84d00; --orange-wash:#fff2e8;\n  --green:#0a7d3b; --green-wash:#e6f4ec; --green-light:#58b77d; --green-light-wash:#effaf2;\n  --blue:#1d4ed8; --blue-wash:#e9effd; --red:#c4291c; --red-wash:#fdecea; --amber:#9a5b00; --amber-wash:#fff5db;\n  --r-s:8px; --r-m:12px; --r-l:18px;\n  --font:\"Helvetica Neue\",Helvetica,Arial,system-ui,-apple-system,\"Segoe UI\",sans-serif;\n  --ease:cubic-bezier(.2,.7,.1,1);\n  --focus:0 0 0 3px rgba(255,108,1,.35);\n}\n*{box-sizing:border-box}\nhtml{-webkit-text-size-adjust:100%}\nbody{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 var(--font);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}\nbody.has-modal{overflow:hidden}\nh1,h2,h3,h4{margin:0;line-height:1.2;letter-spacing:-.01em}\nh1{font-size:28px;font-weight:800;font-style:italic;letter-spacing:-.02em}\nh2{font-size:19px;font-weight:700}\nh3{font-size:15.5px;font-weight:700}\nh4{font-size:13.5px;font-weight:700;color:var(--steel)}\np{margin:0}\na{color:inherit}\na.link,.link{color:var(--orange-ink);text-decoration:underline;text-underline-offset:2px;cursor:pointer;background:none;border:0;padding:0;font:inherit}\nbutton{font:inherit;color:inherit}\n:focus-visible{outline:none;box-shadow:var(--focus);border-radius:6px}\n.ic{width:18px;height:18px;flex:none;display:inline-block;vertical-align:middle}\n.num{font-variant-numeric:tabular-nums}\n.muted{color:var(--steel)}\n.small{font-size:13px}\n.tiny{font-size:12px}\n.strong{font-weight:700}\n.nowrap{white-space:nowrap}\n.hide{display:none!important}\n.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}\n.lead{color:var(--steel);font-size:15px}\n.pre{white-space:pre-wrap;word-break:break-word}\nhr.sep{border:0;border-top:1px solid var(--line);margin:18px 0}\n\n/* Logo: Wortmarke mit Tempo-Strich */\n.logo{display:inline-flex;align-items:center;gap:7px;text-decoration:none}\n.logo b{font:italic 900 23px/1 var(--font);letter-spacing:-.03em;color:currentColor}\n.logo i{display:block;width:26px;height:5px;background:var(--orange);transform:skewX(-24deg);border-radius:1px}\n\n/* Layout-Helfer */\n.stack{display:flex;flex-direction:column;gap:14px}\n.stack-s{display:flex;flex-direction:column;gap:8px}\n.row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}\n.row-between{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}\n.spacer{flex:1}\n.grid-2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}\n.grid-3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}\n.grid-4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}\n.span-2{grid-column:span 2}\n@media (max-width:900px){.grid-3,.grid-4{grid-template-columns:repeat(2,minmax(0,1fr))}}\n@media (max-width:640px){.grid-2,.grid-3,.grid-4{grid-template-columns:1fr}.span-2{grid-column:auto}}\n\n/* Buttons */\n.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:0 16px;border-radius:var(--r-s);border:1px solid var(--line);background:var(--surface);font-weight:600;font-size:14.5px;cursor:pointer;text-decoration:none;white-space:nowrap;transition:background .15s,border-color .15s,color .15s}\n.btn:hover{border-color:#c9cbcf;background:var(--sunken)}\n.btn:disabled{opacity:.5;cursor:not-allowed}\n.btn-primary{background:var(--orange);border-color:var(--orange);color:#fff}\n.btn-primary:hover{background:var(--orange-hover);border-color:var(--orange-hover)}\n.btn-dark{background:var(--ink);border-color:var(--ink);color:#fff}\n.btn-dark:hover{background:var(--ink-2);border-color:var(--ink-2)}\n.btn-ghost{background:transparent;border-color:transparent}\n.btn-ghost:hover{background:rgba(0,0,0,.05);border-color:transparent}\n.btn-danger{background:var(--red);border-color:var(--red);color:#fff}\n.btn-danger:hover{background:#a82216}\n.btn-ok{background:var(--green);border-color:var(--green);color:#fff}\n.btn-ok:hover{background:#086a32}\n.btn-sm{min-height:32px;padding:0 11px;font-size:13.5px;gap:6px}\n.btn-sm .ic{width:16px;height:16px}\n.btn-block{width:100%}\n.btn.is-busy{pointer-events:none;opacity:.7;position:relative}\n.btn.is-busy::after{content:\"\";width:14px;height:14px;border-radius:50%;border:2px solid currentColor;border-right-color:transparent;animation:spin .7s linear infinite}\n.icon-btn{display:inline-grid;place-items:center;width:36px;height:36px;border-radius:var(--r-s);border:0;background:transparent;cursor:pointer;color:inherit}\n.icon-btn:hover{background:rgba(0,0,0,.06)}\n\n/* Formulare */\n.field{display:flex;flex-direction:column;gap:5px;min-width:0}\n.field-label{font-size:13px;font-weight:600;color:var(--ink-2)}\n.field-hint{font-size:12px;color:var(--steel)}\ninput,select,textarea{font:inherit;font-size:15px;color:var(--ink);background:var(--surface);border:1px solid #d3d5d9;border-radius:var(--r-s);padding:9px 12px;min-height:40px;width:100%;transition:border-color .15s,box-shadow .15s}\ntextarea{resize:vertical;line-height:1.45}\ninput:focus,select:focus,textarea:focus{outline:none;border-color:var(--orange);box-shadow:var(--focus)}\ninput[type=checkbox],input[type=radio]{width:18px;height:18px;min-height:0;accent-color:var(--orange);margin:0;flex:none}\ninput[type=file]{padding:7px;font-size:14px}\nselect{appearance:none;background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' fill='none' stroke='%2362656b' stroke-width='1.8'%3E%3Cpath d='m1 1.5 5 5 5-5'/%3E%3C/svg%3E\");background-repeat:no-repeat;background-position:right 12px center;padding-right:34px}\n.check{display:flex;align-items:flex-start;gap:9px;cursor:pointer;font-size:14.5px;line-height:1.35}\n.check input{margin-top:1px}\n.checks{display:flex;flex-wrap:wrap;gap:8px 18px}\n.inline-form{display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap}\n.inline-form .field{flex:1;min-width:160px}\nfieldset{border:1px solid var(--line);border-radius:var(--r-m);padding:14px 16px 16px;margin:0}\nlegend{font-weight:700;font-size:14px;padding:0 6px}\n.seg{display:inline-flex;border:1px solid var(--line);border-radius:var(--r-s);overflow:hidden;background:var(--surface)}\n.seg label{position:relative}\n.seg input{position:absolute;opacity:0;pointer-events:none}\n.seg span{display:block;padding:8px 14px;font-size:14px;font-weight:600;cursor:pointer;border-right:1px solid var(--line)}\n.seg label:last-child span{border-right:0}\n.seg input:checked+span{background:var(--ink);color:#fff}\n.seg input:focus-visible+span{box-shadow:inset var(--focus)}\n\n/* Badges */\n.badge{display:inline-flex;align-items:center;gap:5px;padding:2px 9px;border-radius:999px;font-size:12.5px;font-weight:600;line-height:1.55;white-space:nowrap;background:var(--line-2);color:var(--ink-2)}\n.badge::before{content:\"\";width:6px;height:6px;border-radius:50%;background:currentColor;opacity:.75}\n.t-info{background:var(--blue-wash);color:var(--blue)}\n.t-accent{background:var(--orange-wash);color:var(--orange-ink)}\n.t-ok{background:var(--green-wash);color:var(--green)}\n.t-ok-light{background:var(--green-light-wash);color:#2f8a54}\n.t-warn{background:var(--amber-wash);color:var(--amber)}\n.t-err{background:var(--red-wash);color:var(--red)}\n.t-muted{background:#eef0f2;color:var(--steel)}\n.t-neutral{background:#eef0f2;color:var(--ink-2)}\n.tag{display:inline-block;padding:1px 8px;border-radius:5px;font-size:12px;font-weight:700;border:1px solid var(--line);color:var(--ink-2);background:var(--surface)}\n.dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--orange)}\n\n/* Tabellen */\n.table-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}\ntable.table{width:100%;border-collapse:collapse;font-size:14px}\n.table th{text-align:left;font-weight:600;color:var(--steel);font-size:12.5px;padding:10px 12px;border-bottom:1px solid var(--line);white-space:nowrap;background:var(--sunken);position:sticky;top:0}\n.table td{padding:11px 12px;border-bottom:1px solid var(--line-2);vertical-align:top}\n.table tr.clickable{cursor:pointer}\n.table tr.clickable:hover td{background:#fafafa}\n.table tr.is-unread td:first-child{box-shadow:inset 3px 0 0 var(--orange)}\n.table th button{all:unset;cursor:pointer;display:inline-flex;gap:4px;align-items:center}\n.table th button:focus-visible{box-shadow:var(--focus)}\n.table th .sort-on{color:var(--ink)}\n.table td.r,.table th.r{text-align:right}\n.cell-sub{display:block;color:var(--steel);font-size:12.5px;margin-top:1px}\n\n/* Key-Value */\n.kv{display:grid;grid-template-columns:minmax(120px,38%) 1fr;gap:7px 16px;margin:0;font-size:14px}\n.kv dt{color:var(--steel)}\n.kv dd{margin:0;word-break:break-word}\n\n/* Tabs */\n.tabs{display:flex;gap:2px;border-bottom:1px solid var(--line);overflow-x:auto;scrollbar-width:none}\n.tabs::-webkit-scrollbar{display:none}\n.tab{appearance:none;border:0;background:none;padding:11px 14px 12px;font-weight:600;font-size:14.5px;color:var(--steel);cursor:pointer;white-space:nowrap;border-bottom:2.5px solid transparent;margin-bottom:-1px;text-decoration:none;display:inline-flex;gap:7px;align-items:center}\n.tab:hover{color:var(--ink)}\n.tab.on{color:var(--ink);border-bottom-color:var(--orange)}\n.count{display:inline-grid;place-items:center;min-width:20px;height:20px;padding:0 6px;border-radius:10px;background:var(--line-2);color:var(--ink-2);font-size:11.5px;font-weight:700}\n.count.hot{background:var(--orange);color:#fff}\n\n/* Modal */\n.modal-wrap{position:fixed;inset:0;background:rgba(20,21,24,.45);display:grid;place-items:center;padding:20px;z-index:100;opacity:0;transition:opacity .18s}\n.modal-wrap.in{opacity:1}\n.modal{background:var(--surface);border-radius:var(--r-l);width:min(560px,100%);max-height:calc(100vh - 40px);display:flex;flex-direction:column;box-shadow:0 30px 80px -20px rgba(0,0,0,.4);transform:translateY(10px);transition:transform .22s var(--ease)}\n.modal.is-wide{width:min(900px,100%)}\n.modal-wrap.in .modal{transform:none}\n.modal-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px 20px 12px}\n.modal-head h2{font-size:18px}\n.modal-body{padding:4px 20px 20px;overflow:auto}\n.modal-foot{display:flex;justify-content:flex-end;gap:10px;padding:14px 20px;border-top:1px solid var(--line-2)}\n@media (max-width:640px){.modal-wrap{padding:0;align-items:end}.modal{border-radius:var(--r-l) var(--r-l) 0 0;max-height:92vh}}\n\n/* Toasts */\n#toasts{position:fixed;right:18px;bottom:18px;display:flex;flex-direction:column;gap:8px;z-index:200;max-width:calc(100vw - 36px)}\n.toast{display:flex;gap:10px;align-items:flex-start;background:var(--ink);color:#fff;padding:12px 16px;border-radius:var(--r-m);font-size:14px;box-shadow:0 12px 30px -10px rgba(0,0,0,.4);transform:translateY(8px);opacity:0;transition:all .25s var(--ease);max-width:420px}\n.toast.in{transform:none;opacity:1}\n.toast.t-err{background:var(--red)}\n.toast .ic{margin-top:1px}\n\n/* Leer- und Ladezust\u00e4nde */\n.empty{text-align:center;padding:42px 20px;color:var(--steel);display:flex;flex-direction:column;align-items:center;gap:8px}\n.empty strong{color:var(--ink);font-size:16px}\n.empty p{max-width:420px}\n.empty-mark{width:46px;height:46px;border-radius:50%;background:var(--line-2);display:grid;place-items:center;color:var(--steel-2);margin-bottom:4px}\n.empty-sm{color:var(--steel);font-size:14px;padding:18px 0}\n.loading{display:flex;align-items:center;gap:10px;color:var(--steel);padding:40px 0;justify-content:center}\n.spinner{width:18px;height:18px;border-radius:50%;border:2.5px solid var(--line);border-top-color:var(--orange);animation:spin .8s linear infinite}\n@keyframes spin{to{transform:rotate(360deg)}}\n\n/* Avatare */\n.avatar{display:inline-grid;place-items:center;width:32px;height:32px;border-radius:50%;background:var(--ink);color:#fff;font-size:12px;font-weight:700;flex:none;letter-spacing:.02em}\n.avatar.lg{width:44px;height:44px;font-size:15px}\n.avatar.alt{background:var(--orange)}\n\n/* Diagramme */\n.chart{display:block;overflow:visible}\n.chart .bar{fill:#2b2d31}\n.chart .bar-accent{fill:var(--orange)}\n.chart-axis{stroke:var(--line);stroke-width:1}\n.chart-label{font-size:10px;fill:var(--steel);font-family:var(--font)}\n.hbars{display:flex;flex-direction:column;gap:9px}\n.hbar{display:grid;grid-template-columns:minmax(90px,32%) 1fr 56px;align-items:center;gap:10px;font-size:13.5px}\n.hbar-l{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n.hbar-track{height:8px;background:var(--line-2);border-radius:4px;overflow:hidden}\n.hbar-track i{display:block;height:100%;background:var(--ink);border-radius:4px}\n.hbar:first-child .hbar-track i{background:var(--orange)}\n.hbar-v{text-align:right;font-weight:600}\n.ring-bg{stroke:var(--line-2)}\n.ring-fg{stroke:var(--orange);transition:stroke-dashoffset .8s var(--ease)}\n.delta{font-size:12.5px;font-weight:700;color:var(--steel)}\n.delta.up{color:var(--green)}\n.delta.down{color:var(--red)}\n\n/* Chatverlauf / Kommentare */\n.thread{display:flex;flex-direction:column;gap:12px}\n.msg{max-width:min(560px,88%);padding:10px 14px;border-radius:14px;background:var(--sunken);border:1px solid var(--line-2);font-size:14.5px}\n.msg.me{align-self:flex-end;background:var(--ink);color:#fff;border-color:var(--ink)}\n.msg.internal{background:var(--amber-wash);border-color:#f2dfae}\n.msg-meta{font-size:12px;color:var(--steel);margin-bottom:3px;display:flex;gap:8px}\n.msg.me .msg-meta{color:#b6b8bc}\n\n/* Zeitleiste */\n.timeline{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}\n.timeline li{display:grid;grid-template-columns:14px 1fr;gap:12px;padding-bottom:14px;position:relative;font-size:14px}\n.timeline li::before{content:\"\";width:9px;height:9px;border-radius:50%;background:var(--steel-2);margin-top:6px;margin-left:2px}\n.timeline li::after{content:\"\";position:absolute;left:6px;top:18px;bottom:0;width:1px;background:var(--line)}\n.timeline li:last-child::after{display:none}\n.timeline li.conf::before{background:var(--amber)}\n.timeline li.kfl::before{background:var(--orange)}\n.timeline .tl-meta{font-size:12px;color:var(--steel)}\n\n@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;transition-duration:.01ms!important}}\n.mt{margin-top:14px}.mt-l{margin-top:24px}\n.cols{display:flex;align-items:stretch;gap:4px;padding-top:6px}\n.col{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:4px}\n.col-bar{width:min(100%,30px);background:#2b2d31;border-radius:4px 4px 1px 1px;display:flex;align-items:flex-end;overflow:hidden}\n.col-bar i{display:block;width:100%;background:var(--orange)}\n.col-v{font-size:11px;color:var(--steel);font-variant-numeric:tabular-nums}\n.col-l{font-size:11px;color:var(--steel);height:15px;white-space:nowrap}\n.toolbar .check{align-items:center}\n\n/* gemeinsam genutzte Bausteine */\n.note-box{background:var(--amber-wash);border:1px solid #f0dca6;border-radius:var(--r-m);padding:12px 14px;font-size:14px;display:flex;gap:10px}\n.info-box{background:var(--blue-wash);border:1px solid #cdd9f8;border-radius:var(--r-m);padding:12px 14px;font-size:14px;display:flex;gap:10px;color:#1a3a9e}\n.err-box{background:var(--red-wash);border:1px solid #f4c7c2;border-radius:var(--r-m);padding:12px 14px;font-size:14px;display:flex;gap:10px;color:#8f1d13}\n.toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:12px 14px;border-bottom:1px solid var(--line-2)}\n.toolbar input,.toolbar select{min-height:36px;padding:6px 10px;font-size:14px;width:auto}\n.toolbar .search{position:relative;flex:1;min-width:220px}\n.toolbar .search input{width:100%;padding-left:34px}\n.toolbar .search .ic{position:absolute;left:10px;top:9px;color:var(--steel-2)}\n.toolbar select{padding-right:30px;background-position:right 10px center}\n.pager{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 14px;font-size:13.5px;color:var(--steel)}\n.feed-item{display:grid;grid-template-columns:34px 1fr auto;gap:12px;padding:13px 18px;border-bottom:1px solid var(--line-2);text-decoration:none;align-items:start}\n.feed-item:hover{background:var(--sunken)}\n.feed-item.unread{background:#fffaf5}\n.feed-item.unread .fi-title::after{content:\"\";display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--orange);margin-left:7px;vertical-align:middle}\n.fi-mark{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:var(--line-2);color:var(--ink-2)}\n.fi-mark.post{background:var(--ink);color:#fff}\n.fi-mark.important{background:var(--orange);color:#fff}\n.fi-title{font-weight:600;font-size:14.5px}\n.fi-body{color:var(--steel);font-size:13.5px;margin-top:2px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}\n.fi-time{font-size:12px;color:var(--steel);white-space:nowrap}\n.fi-actions{display:flex;gap:4px;margin-top:6px}\n.asg{padding:14px 18px;border-bottom:1px solid var(--line-2)}\n.asg:last-child{border-bottom:0}\n.asg-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}\n.asg-meta{font-size:13px;color:var(--steel);margin-top:3px}\n.asg .row{margin-top:9px}\n.auth-help{display:flex;align-items:center;gap:12px;padding:14px 16px;border:1px solid var(--line);border-radius:var(--r-m);font-size:14px}\n.auth-help .spacer{min-width:8px}\n.fi-title{text-decoration:none}\n.fi-title:hover{text-decoration:underline}\n/* ===== Partner-Dashboard 2.1 \u2013 Seitenleiste links, Kacheln, klare Karten ===== */\n:root{\n  --side-w:264px; --side-rail:76px;\n  --side-bg:#111214; --side-2:#1a1c1f; --side-line:#26282c; --side-txt:#a9acb2;\n  --card-shadow:0 1px 2px rgba(16,18,24,.04),0 2px 8px -2px rgba(16,18,24,.06);\n  --card-shadow-h:0 2px 4px rgba(16,18,24,.05),0 12px 28px -10px rgba(16,18,24,.18);\n  --r-card:16px;\n}\nbody{background:#f3f4f6;padding-bottom:env(safe-area-inset-bottom)}\nhtml,body{overflow-x:clip}\n\n/* ---------- Grundger\u00fcst ---------- */\n.p-app{display:grid;grid-template-columns:var(--side-w) minmax(0,1fr);min-height:100vh}\n.p-app.is-rail{grid-template-columns:var(--side-rail) minmax(0,1fr)}\n.p-app{background:linear-gradient(90deg,var(--side-bg) var(--side-w),transparent 0)}\n.p-app.is-rail{background:linear-gradient(90deg,var(--side-bg) var(--side-rail),transparent 0)}\n.p-side{position:sticky;top:0;height:100vh;background:var(--side-bg);color:#fff;display:flex;flex-direction:column;gap:6px;padding:18px 14px 14px;overflow-y:auto;overflow-x:hidden;scrollbar-width:thin;scrollbar-color:#2c2f33 transparent;z-index:30}\n.ps-brand{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:2px 6px 14px}\n.ps-brand .logo{color:#fff}\n.ps-collapse{appearance:none;border:0;background:transparent;color:#7d8087;width:32px;height:32px;border-radius:8px;display:grid;place-items:center;cursor:pointer;flex:none}\n.ps-collapse:hover{background:var(--side-2);color:#fff}\n.ps-org{display:flex;align-items:center;gap:11px;padding:11px;border-radius:12px;background:var(--side-2);border:1px solid var(--side-line);margin-bottom:6px}\n.ps-org-mark{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,var(--orange),#ff9a4d);display:grid;place-items:center;font-weight:800;font-size:13px;color:#fff;flex:none;letter-spacing:.02em}\n.ps-org b{display:block;font-size:13.5px;line-height:1.25;color:#fff;font-weight:700;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}\n.ps-org div span{display:block;font-size:12px;color:var(--side-txt);margin-top:1px}\n.ps-cta{display:flex;align-items:center;gap:10px;margin:6px 0 8px;padding:11px 12px;border-radius:12px;background:var(--orange);color:#fff;text-decoration:none;font-weight:700;font-size:14px;box-shadow:0 8px 20px -10px rgba(255,108,1,.8);transition:background .15s,transform .15s}\n.ps-cta:hover{background:var(--orange-hover);transform:translateY(-1px)}\n.ps-cta .count{margin-left:auto;background:rgba(255,255,255,.25);color:#fff}\n.ps-group{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#5f636a;padding:14px 10px 6px}\n.ps-nav{display:flex;flex-direction:column;gap:2px}\n.ps-nav a{display:flex;align-items:center;gap:12px;padding:10px 11px;border-radius:10px;color:var(--side-txt);text-decoration:none;font-weight:600;font-size:14.5px;position:relative;transition:background .15s,color .15s}\n.ps-nav a .ic{width:20px;height:20px;color:#7d8087;transition:color .15s}\n.ps-nav a:hover{background:var(--side-2);color:#fff}\n.ps-nav a:hover .ic{color:#fff}\n.ps-nav a.on{background:#202226;color:#fff}\n.ps-nav a.on .ic{color:var(--orange)}\n.ps-nav a.on::before{content:\"\";position:absolute;left:-14px;top:8px;bottom:8px;width:3px;border-radius:0 3px 3px 0;background:var(--orange)}\n.ps-nav .count{margin-left:auto;background:var(--orange);color:#fff}\n.ps-foot{margin-top:auto;display:flex;flex-direction:column;gap:10px;padding-top:14px}\n.ps-help{border:1px solid var(--side-line);border-radius:12px;padding:12px;background:linear-gradient(160deg,#1b1d20,#141518)}\n.ps-help b{display:block;font-size:13.5px}\n.ps-help p{font-size:12.5px;color:var(--side-txt);margin:3px 0 10px}\n.ps-help a{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:700;color:var(--orange);text-decoration:none}\n.ps-me{display:flex;align-items:center;gap:10px;padding:10px 6px 2px;border-top:1px solid var(--side-line)}\n.ps-me-txt{min-width:0;flex:1}\n.ps-me-txt b{display:block;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.ps-me-txt span{display:block;font-size:12px;color:var(--side-txt)}\n.ps-me .icon-btn{color:#7d8087}\n.ps-me .icon-btn:hover{background:var(--side-2);color:#fff}\n/* eingeklappt: nur Symbole */\n.is-rail .p-side{padding:18px 12px 14px;align-items:stretch}\n.is-rail .ps-brand{flex-direction:column;padding:2px 0 12px}\n.is-rail .ps-brand .logo i{display:none}\n.is-rail .ps-org{justify-content:center;padding:8px;background:transparent;border-color:transparent}\n.is-rail .ps-org > div,.is-rail .ps-group,.is-rail .ps-nav a span.lbl,.is-rail .ps-cta span.lbl,.is-rail .ps-help,.is-rail .ps-me-txt{display:none}\n.is-rail .ps-nav a,.is-rail .ps-cta{justify-content:center;padding:11px 0}\n.is-rail .ps-nav a.on::before{left:-12px}\n.is-rail .ps-nav .count,.is-rail .ps-cta .count{position:absolute;top:3px;right:5px;margin:0;height:17px;min-width:17px;font-size:10px;padding:0 4px}\n.is-rail .ps-cta{position:relative}\n.is-rail .ps-me{flex-direction:column;gap:6px}\n.is-rail .ps-collapse .ic{transform:rotate(180deg)}\n\n.p-body{min-width:0;display:flex;flex-direction:column}\n.p-topbar{position:sticky;top:0;z-index:20;background:rgba(243,244,246,.86);backdrop-filter:saturate(1.4) blur(12px);-webkit-backdrop-filter:saturate(1.4) blur(12px);border-bottom:1px solid transparent;transition:border-color .2s}\n.p-topbar.scrolled{border-bottom-color:var(--line)}\n.p-topbar-in{max-width:1320px;margin:0 auto;display:flex;align-items:center;gap:12px;padding:12px 32px}\n.pt-logo{display:none;text-decoration:none;color:var(--ink)}\n.pt-crumb{display:flex;align-items:center;gap:8px;font-size:13.5px;color:var(--steel);min-width:0}\n.pt-crumb b{color:var(--ink);font-weight:700}\n.pt-crumb .sep{color:#b9bcc1}\n.pt-right{margin-left:auto;display:flex;align-items:center;gap:8px}\n.pt-chip{display:inline-flex;align-items:center;gap:7px;height:36px;padding:0 12px;border-radius:999px;background:#fff;border:1px solid var(--line);font-size:13px;font-weight:600;color:var(--ink-2)}\n.pt-chip .ic{width:16px;height:16px;color:var(--steel)}\n.pt-bell{position:relative;width:40px;height:40px;border-radius:12px;background:#fff;border:1px solid var(--line);display:grid;place-items:center;color:var(--ink-2);text-decoration:none;transition:border-color .15s,box-shadow .15s}\n.pt-bell:hover{border-color:#c9cbcf;box-shadow:var(--card-shadow)}\n.pt-bell .count{position:absolute;top:-6px;right:-6px;background:var(--orange);color:#fff;height:19px;min-width:19px;font-size:10.5px;border:2px solid #f3f4f6}\n.pt-me{display:none}\n.p-main{width:100%;max-width:1320px;margin:0 auto;padding:10px 32px 64px;outline:none}\n.p-tabbar{display:none}\n\n@media (max-width:1180px) and (min-width:861px){\n  .p-app,.p-app.is-rail{grid-template-columns:var(--side-rail) minmax(0,1fr);background:linear-gradient(90deg,var(--side-bg) var(--side-rail),transparent 0)}\n  .p-app .p-side{padding:18px 12px 14px}\n  .p-app .ps-brand{flex-direction:column;padding:2px 0 12px}\n  .p-app .ps-brand .logo i,.p-app .ps-collapse{display:none}\n  .p-app .ps-org{justify-content:center;padding:8px;background:transparent;border-color:transparent}\n  .p-app .ps-org > div,.p-app .ps-group,.p-app .ps-nav a span.lbl,.p-app .ps-cta span.lbl,.p-app .ps-help,.p-app .ps-me-txt{display:none}\n  .p-app .ps-nav a,.p-app .ps-cta{justify-content:center;padding:11px 0;position:relative}\n  .p-app .ps-nav a.on::before{left:-12px}\n  .p-app .ps-nav .count,.p-app .ps-cta .count{position:absolute;top:3px;right:5px;margin:0;height:17px;min-width:17px;font-size:10px;padding:0 4px}\n  .p-app .ps-me{flex-direction:column;gap:6px}\n  .p-topbar-in,.p-main{padding-left:24px;padding-right:24px}\n}\n@media (max-width:860px){\n  .p-app,.p-app.is-rail{display:block;background:none}\n  .p-side{display:none}\n  .p-topbar{background:var(--side-bg);color:#fff;border:0}\n  .p-topbar.scrolled{border:0}\n  .p-topbar-in{padding:10px 16px}\n  .pt-logo{display:inline-flex;color:#fff}\n  .pt-crumb,.pt-chip{display:none}\n  .pt-bell{background:var(--side-2);border-color:var(--side-line);color:#fff;width:38px;height:38px}\n  .pt-bell .count{border-color:var(--side-bg)}\n  .pt-me{display:inline-grid}\n  .p-main{padding:16px 16px 110px}\n  .p-tabbar{display:grid;grid-template-columns:repeat(5,1fr);position:fixed;left:0;right:0;bottom:0;z-index:45;background:rgba(255,255,255,.97);backdrop-filter:blur(10px);border-top:1px solid var(--line);padding:6px 4px calc(6px + env(safe-area-inset-bottom))}\n  .p-tabbar a,.p-tabbar button{appearance:none;border:0;background:none;display:flex;flex-direction:column;align-items:center;gap:2px;font-size:11px;font-weight:600;color:var(--steel);text-decoration:none;padding:4px 0;position:relative;cursor:pointer}\n  .p-tabbar .ic{width:22px;height:22px}\n  .p-tabbar .on{color:var(--ink)}\n  .p-tabbar .on .ic{color:var(--orange)}\n  .p-tabbar .count{position:absolute;top:0;left:calc(50% + 6px);background:var(--orange);color:#fff;height:17px;min-width:17px;font-size:10px}\n}\n\n/* ---------- Seitenkopf ---------- */\n.p-head{display:flex;justify-content:space-between;align-items:flex-end;gap:14px;flex-wrap:wrap;margin:8px 0 18px}\n.p-head h1{font-size:28px;font-weight:800;font-style:normal;letter-spacing:-.025em}\n.p-head .sub{color:var(--steel);margin-top:4px;max-width:720px}\n.back{display:inline-flex;align-items:center;gap:6px;color:var(--steel);text-decoration:none;font-size:13.5px;font-weight:600;margin:4px 0 8px;padding:5px 10px 5px 6px;border-radius:999px}\n.back:hover{background:#fff;color:var(--ink)}\n@media (max-width:640px){.p-head h1{font-size:24px}}\n\n/* ---------- Karten ---------- */\n.block{background:var(--surface);border:1px solid #e7e8eb;border-radius:var(--r-card);box-shadow:var(--card-shadow)}\n.block-head{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:16px 18px 12px}\n.block-head h2{font-size:16px;font-weight:700;display:flex;align-items:center;gap:8px;letter-spacing:-.01em}\n.block-head h2 .h-ic{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;background:var(--sunken);color:var(--ink-2)}\n.block-head h2 .h-ic .ic{width:17px;height:17px}\n.block-body{padding:4px 18px 18px}\n.block-foot{display:flex;justify-content:center;padding:10px;border-top:1px solid var(--line-2)}\n.block-foot a{display:inline-flex;align-items:center;gap:6px;font-size:13.5px;font-weight:700;color:var(--ink-2);text-decoration:none;padding:6px 12px;border-radius:999px}\n.block-foot a:hover{background:var(--sunken)}\n.block-foot .ic{width:16px;height:16px}\n.more-link{display:inline-flex;align-items:center;gap:5px;font-size:13px;font-weight:700;color:var(--orange-ink);text-decoration:none;padding:5px 8px;border-radius:8px}\n.more-link:hover{background:var(--orange-wash)}\n.more-link .ic{width:15px;height:15px}\n\n/* ---------- Start: Begr\u00fc\u00dfung ---------- */\n.p-hero{position:relative;overflow:hidden;border-radius:20px;color:#fff;padding:26px 28px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:24px;align-items:center;\n  background:radial-gradient(120% 140% at 100% 0%,rgba(255,108,1,.38) 0%,rgba(255,108,1,0) 46%),radial-gradient(80% 120% at 0% 100%,rgba(255,255,255,.06),transparent 60%),#141518}\n.p-hero::after{content:\"\";position:absolute;right:-30px;top:-30px;bottom:-30px;width:240px;background:repeating-linear-gradient(115deg,transparent 0 30px,rgba(255,255,255,.05) 30px 38px,transparent 38px 66px);pointer-events:none}\n.p-hero > *{position:relative;z-index:1}\n.ph-kicker{display:inline-flex;align-items:center;gap:8px;font-size:12.5px;font-weight:700;color:#ffb27a;letter-spacing:.04em;text-transform:uppercase}\n.ph-kicker i{width:7px;height:7px;border-radius:50%;background:#3ddc84;box-shadow:0 0 0 4px rgba(61,220,132,.18)}\n.p-hero h1{font-size:32px;font-weight:900;font-style:italic;letter-spacing:-.025em;margin-top:8px}\n.p-hero .push{margin-top:8px;font-size:15.5px;max-width:560px;color:#d9dadd}\n.ph-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}\n.btn-glass{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.16);color:#fff}\n.btn-glass:hover{background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.24)}\n.ph-goal{display:flex;align-items:center;gap:16px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:16px 20px}\n.ph-goal .ring-bg{stroke:rgba(255,255,255,.12)}\n.ph-goal .ring-c{font-size:16px}\n.ph-goal b{display:block;font-size:28px;font-weight:800;line-height:1;letter-spacing:-.02em}\n.ph-goal div > span{font-size:12.5px;color:#b9bcc1;display:block;margin-top:4px;line-height:1.35}\n.ring-wrap{position:relative;display:grid;place-items:center}\n.ring-wrap .ring-c{position:absolute;font-weight:800;font-size:15px}\n@media (max-width:760px){.p-hero{grid-template-columns:1fr;padding:20px}.p-hero h1{font-size:26px}.ph-goal{padding:12px 14px}}\n\n/* ---------- Kennzahl-Kacheln ---------- */\n.kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-top:16px}\n.kpi{position:relative;display:flex;flex-direction:column;gap:12px;padding:16px 18px;background:#fff;border:1px solid #e7e8eb;border-radius:var(--r-card);box-shadow:var(--card-shadow);text-decoration:none;transition:box-shadow .2s,transform .2s,border-color .2s;overflow:hidden}\na.kpi:hover{box-shadow:var(--card-shadow-h);transform:translateY(-2px);border-color:#dcdee2}\n.kpi-top{display:flex;align-items:center;justify-content:space-between;gap:10px}\n.kpi-ic{width:40px;height:40px;border-radius:12px;display:grid;place-items:center}\n.kpi-ic .ic{width:20px;height:20px}\n.kpi-l{font-size:13px;font-weight:600;color:var(--steel)}\n.kpi-v{font-size:32px;font-weight:800;letter-spacing:-.03em;line-height:1;font-variant-numeric:tabular-nums}\n.kpi-s{font-size:12.5px;color:var(--steel);display:flex;align-items:center;gap:6px;min-height:18px}\n.kpi-s .ic{width:14px;height:14px}\n.kpi .go{color:#c2c4c8;width:18px;height:18px;transition:transform .2s,color .2s}\na.kpi:hover .go{color:var(--ink);transform:translateX(3px)}\n.kpi.k-orange .kpi-ic{background:var(--orange-wash);color:var(--orange)}\n.kpi.k-blue .kpi-ic{background:var(--blue-wash);color:var(--blue)}\n.kpi.k-amber .kpi-ic{background:var(--amber-wash);color:var(--amber)}\n.kpi.k-green .kpi-ic{background:var(--green-wash);color:var(--green)}\n.kpi.k-dark .kpi-ic{background:#eceef1;color:var(--ink)}\n.kpi.is-hot{border-color:#ffd2b0;background:linear-gradient(180deg,#fff7f1,#fff 60%)}\n.kpi.is-hot::after{content:\"\";position:absolute;right:16px;top:16px;width:8px;height:8px;border-radius:50%;background:var(--orange);box-shadow:0 0 0 0 rgba(255,108,1,.6);animation:pulse 1.8s infinite}\n.kpi.is-hot .go{display:none}\n@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(255,108,1,.55)}70%{box-shadow:0 0 0 10px rgba(255,108,1,0)}100%{box-shadow:0 0 0 0 rgba(255,108,1,0)}}\n@media (max-width:1100px){.kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}\n@media (max-width:420px){.kpis{gap:10px}.kpi{padding:14px}.kpi-v{font-size:27px}.kpi-ic{width:34px;height:34px}}\n\n/* ---------- Raster Start ---------- */\n.p-grid{display:grid;grid-template-columns:minmax(0,1.65fr) minmax(320px,1fr);gap:16px;margin-top:16px;align-items:start}\n@media (max-width:1060px){.p-grid{grid-template-columns:1fr}}\n\n/* Kunde wartet */\n.urgent-card{border-radius:var(--r-card);background:linear-gradient(135deg,#0b6b33,#0a7d3b 55%,#14964c);color:#fff;padding:16px 18px;box-shadow:0 12px 30px -16px rgba(10,125,59,.9)}\n.urgent-card h2{font-size:16px;display:flex;align-items:center;gap:9px}\n.urgent-card h2 .ic{width:22px;height:22px}\n.urgent-card .uc-sub{font-size:13px;color:#cdebd8;margin-top:2px}\n.uc-list{display:flex;flex-direction:column;gap:8px;margin-top:12px}\n.uc-item{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.1);text-decoration:none;color:#fff;transition:background .15s}\n.uc-item:hover{background:rgba(255,255,255,.18)}\n.uc-item b{display:block;font-size:14.5px}\n.uc-item span{font-size:12.5px;color:#cdebd8}\n.uc-item .uc-cta{margin-left:auto;display:inline-flex;align-items:center;gap:6px;background:#fff;color:var(--green);font-weight:700;font-size:13px;padding:7px 12px;border-radius:999px;white-space:nowrap}\n\n/* Segment-Umschalter */\n.seg-tabs{display:inline-flex;gap:3px;padding:3px;background:#eef0f2;border-radius:11px}\n.seg-tabs button,.seg-tabs a{appearance:none;border:0;background:transparent;padding:6px 12px;border-radius:8px;font-size:13px;font-weight:700;color:var(--steel);cursor:pointer;display:inline-flex;align-items:center;gap:6px;text-decoration:none;white-space:nowrap}\n.seg-tabs .on{background:#fff;color:var(--ink);box-shadow:0 1px 2px rgba(0,0,0,.08)}\n.seg-tabs .count{height:18px;min-width:18px;font-size:10.5px}\n.seg-tabs .on .count{background:var(--ink);color:#fff}\n\n/* Leistung / Trichter */\n.funnel{display:flex;flex-direction:column;gap:11px}\n.fn-row{display:grid;grid-template-columns:104px 1fr 42px;align-items:center;gap:10px;font-size:13.5px}\n.fn-l{color:var(--steel);font-weight:600}\n.fn-track{height:10px;background:#f0f1f3;border-radius:6px;overflow:hidden}\n.fn-track i{display:block;height:100%;border-radius:6px;background:linear-gradient(90deg,#2b2d31,#4a4d53)}\n.fn-row:last-child .fn-track i{background:linear-gradient(90deg,var(--orange),#ff9a4d)}\n.fn-v{text-align:right;font-weight:800;font-variant-numeric:tabular-nums}\n.perf-top{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:14px}\n.perf-top b{font-size:30px;font-weight:800;letter-spacing:-.03em;line-height:1}\n.perf-top span{font-size:12.5px;color:var(--steel)}\n.spark{display:flex;align-items:flex-end;gap:4px;height:56px;margin-top:16px;padding-top:12px;border-top:1px dashed var(--line)}\n.spark span{flex:1;min-width:0;border-radius:4px 4px 2px 2px;background:#e4e6e9;position:relative}\n.spark span.has{background:#2b2d31}\n.spark span.today{background:var(--orange)}\n.spark-l{display:flex;justify-content:space-between;font-size:11px;color:var(--steel-2);margin-top:5px}\n\n/* ---------- Anfrage-Karten ---------- */\n.rq-list{display:flex;flex-direction:column}\n.rq{display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;gap:14px;align-items:center;padding:13px 18px;border-top:1px solid var(--line-2);text-decoration:none;position:relative;transition:background .15s}\n.rq-list > .rq:first-child{border-top:0}\n.rq:hover{background:#fafafb}\n.rq::before{content:\"\";position:absolute;left:0;top:14px;bottom:14px;width:3px;border-radius:0 3px 3px 0;background:transparent}\n.rq.tone-info::before{background:var(--blue)}\n.rq.tone-accent::before{background:var(--orange)}\n.rq.tone-warn::before{background:#e3b23c}\n.rq.tone-ok-light::before{background:var(--green-light)}\n.rq.tone-ok::before{background:var(--green)}\n.rq.tone-muted::before{background:var(--steel-2)}\n.rq-t{font-weight:700;font-size:15px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;letter-spacing:-.005em}\n.rq-no{font-size:12px;font-weight:700;color:var(--steel);background:#f0f1f3;border-radius:6px;padding:1px 7px;font-variant-numeric:tabular-nums}\n.rq-s{font-size:13px;color:var(--steel);margin-top:3px;display:flex;gap:6px 12px;flex-wrap:wrap}\n.rq-s span{display:inline-flex;gap:4px;align-items:center}\n.rq-s .ic{width:14px;height:14px}\n.rq-s .direct{color:var(--orange-ink);font-weight:700}\n.rq-side{display:flex;flex-direction:column;align-items:flex-end;gap:6px}\n.rq-go{color:#c2c4c8;width:18px;height:18px;transition:transform .2s,color .2s}\n.rq:hover .rq-go{color:var(--ink);transform:translateX(3px)}\n.rq-wrap{background:var(--surface);border:1px solid #e7e8eb;border-radius:var(--r-card);box-shadow:var(--card-shadow);overflow:hidden}\n.zustand{display:inline-grid;place-items:center;width:44px;height:44px;border-radius:13px;background:var(--ink);color:#fff;font-weight:800;font-size:12px;letter-spacing:.03em;flex:none}\n.zustand.used{background:var(--orange-wash);color:var(--orange-ink)}\n.zustand.pre{background:var(--blue-wash);color:var(--blue)}\n@media (max-width:640px){.rq{grid-template-columns:auto minmax(0,1fr) auto;padding:12px 14px;gap:12px}.rq-go{display:none}.zustand{width:40px;height:40px;border-radius:12px}}\n\n/* Restzeit als Pille */\n.tpill{display:inline-flex;flex-direction:column;gap:4px;min-width:92px}\n.tpill-t{display:inline-flex;align-items:center;justify-content:flex-end;gap:5px;font-size:12.5px;font-weight:700;color:var(--green);white-space:nowrap}\n.tpill-t .ic{width:14px;height:14px}\n.tpill-b{height:5px;border-radius:3px;background:#eceef0;overflow:hidden}\n.tpill-b i{display:block;height:100%;background:var(--green);border-radius:3px}\n.tpill.soon .tpill-t{color:var(--amber)}.tpill.soon .tpill-b i{background:#e3b23c}\n.tpill.urgent .tpill-t{color:var(--red)}.tpill.urgent .tpill-b i{background:var(--red)}\n.tpill.over .tpill-t{color:var(--steel)}.tpill.over .tpill-b i{background:var(--steel-2)}\n\n/* Ring-Uhr (Detail) */\n.clock{display:flex;flex-direction:column;align-items:center;font-size:11.5px;color:var(--steel);gap:2px}\n.clock .ring-wrap .ring-c{font-size:11px}\n.clock.urgent .ring-fg{stroke:var(--red)}\n.clock.ok .ring-fg{stroke:var(--green)}\n\n/* Tabs als Pillen */\n.p-main .tabs{border:0;gap:6px;padding:2px 0 4px}\n.p-main .tab{border:1px solid #e3e5e8;background:#fff;border-radius:999px;padding:8px 14px;margin:0;font-size:14px;color:var(--ink-2);box-shadow:0 1px 1px rgba(0,0,0,.02)}\n.p-main .tab:hover{border-color:#cfd1d5;color:var(--ink)}\n.p-main .tab.on{background:var(--ink);border-color:var(--ink);color:#fff}\n.p-main .tab .count{background:#eef0f2;color:var(--ink-2)}\n.p-main .tab.on .count{background:var(--orange);color:#fff}\n.p-main .tab .count.hot{background:var(--orange);color:#fff}\n\n/* Hinweisleiste */\n.hint-bar{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:12px;background:#fff;border:1px dashed #d6d8dc;font-size:13px;color:var(--steel);margin-top:12px}\n.hint-bar .ic{color:var(--orange);width:17px;height:17px}\n\n/* ---------- Detail ---------- */\n.p-detail{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(340px,1fr);gap:16px;align-items:start}\n@media (max-width:1060px){.p-detail{grid-template-columns:1fr}}\n.teaser{text-align:center;padding:36px 24px;display:flex;flex-direction:column;gap:16px;align-items:center;max-width:760px}\n.teaser .big{font-size:40px;font-weight:900;font-style:italic;letter-spacing:-.025em}\n.teaser .facts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;width:100%}\n.teaser .facts div{display:flex;flex-direction:column;gap:2px;padding:12px;border-radius:12px;background:var(--sunken);border:1px solid var(--line-2)}\n.teaser .facts b{font-size:17px}\n.teaser .facts span{font-size:12.5px;color:var(--steel)}\n@media (max-width:640px){.teaser .facts{grid-template-columns:repeat(2,minmax(0,1fr))}.teaser .big{font-size:32px}}\n.contact-card{background:var(--green-wash);border:1px solid #b9e0c8;border-radius:var(--r-card);padding:18px}\n.contact-card h3{color:var(--green)}\n.contact-card a.btn{flex:1}\n.win{background:linear-gradient(135deg,#0b6b33,#0a7d3b 55%,#14964c);color:#fff;border-radius:var(--r-card);padding:16px 18px;display:flex;gap:12px;align-items:center}\n.win .ic{width:28px;height:28px}\n.present{background:var(--green-light-wash);border:1px solid #c8ebd3;color:#215c38;border-radius:var(--r-card);padding:14px 16px;display:flex;gap:10px}\n.note-box,.info-box,.err-box{border-radius:14px}\n.offer-form .kind-pill{display:inline-flex;gap:6px;align-items:center;background:var(--ink);color:#fff;border-radius:999px;padding:4px 12px;font-size:13px;font-weight:700}\n.pdf-drop{border:1.5px dashed #c9cbcf;border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:8px;background:var(--sunken)}\n.sugg{background:var(--blue-wash);border-radius:var(--r-s);padding:10px 12px;font-size:13.5px;color:#1a3a9e}\n.sticky-submit{position:sticky;bottom:72px;z-index:5;background:linear-gradient(transparent,var(--surface) 30%);padding-top:14px}\n@media (min-width:861px){.sticky-submit{bottom:0}}\n.offer-price{font-size:24px;font-weight:800;letter-spacing:-.02em}\n\n/* ---------- News kompakt ---------- */\n.feed-item{padding:13px 18px}\n.feed-item.unread{background:#fffaf5}\n.fi-mark{border-radius:10px}\n.nw{display:flex;gap:12px;align-items:flex-start;padding:11px 18px;border-top:1px solid var(--line-2);text-decoration:none;cursor:pointer;background:none;border-left:0;border-right:0;border-bottom:0;width:100%;text-align:left;font:inherit;color:inherit}\n.nw:first-child{border-top:0}\n.nw:hover{background:#fafafb}\n.nw .fi-mark{width:32px;height:32px;flex:none}\n.nw .fi-mark .ic{width:16px;height:16px}\n.nw-t{font-size:14px;font-weight:600;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}\n.nw-m{font-size:12px;color:var(--steel);margin-top:2px}\n.nw.unread .nw-t::after{content:\"\";display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--orange);margin-left:7px;vertical-align:middle}\n\n/* Notizen */\n.note-add{display:flex;gap:8px;align-items:stretch}\n.note-add input[name=text]{flex:1}\n.note-add .btn{min-height:40px}\n.note-opts{display:flex;align-items:center;gap:8px;margin-top:8px;font-size:12.5px;color:var(--steel)}\n.note-opts input{width:auto;min-height:32px;padding:4px 8px;font-size:13px}\n.note{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border-radius:12px;background:var(--amber-wash);margin-top:8px;font-size:14px}\n.note.day{background:var(--orange-wash)}\n.note .spacer{white-space:pre-wrap}\n.note .icon-btn{width:28px;height:28px}\n\n/* ---------- Statistik ---------- */\n.pstats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;padding:16px 18px 18px}\n.pstat{padding:14px 16px;border-radius:14px;background:var(--sunken);border:1px solid var(--line-2)}\n.pstat b{display:block;font-size:26px;font-weight:800;letter-spacing:-.03em;font-variant-numeric:tabular-nums}\n.pstat span{font-size:12.5px;color:var(--steel)}\n.pstats-flat{border:0;margin:0;border-top:1px solid var(--line-2)}\n.pstat.hl{background:var(--orange-wash);border-color:#ffd9bd}\n.pstat.hl b{color:var(--orange-ink)}\n.pstat.ok b{color:var(--green)}\n@media (max-width:900px){.pstats{grid-template-columns:repeat(2,minmax(0,1fr))}}\n.toolbar{padding:14px 18px}\n\n/* ---------- Anmeldung ---------- */\n.p-auth{min-height:100vh;display:grid;grid-template-columns:minmax(0,1.15fr) minmax(360px,500px);background:var(--ink);color:#fff}\n.p-auth-art{padding:40px 48px;display:flex;flex-direction:column;justify-content:space-between;gap:30px;position:relative;overflow:hidden;background:radial-gradient(90% 90% at 100% 0%,rgba(255,108,1,.28),transparent 55%),#141518}\n.p-auth-art::after{content:\"\";position:absolute;inset:0 -10% 0 64%;background:repeating-linear-gradient(115deg,transparent 0 70px,rgba(255,108,1,.95) 70px 80px,transparent 80px 150px,rgba(255,255,255,.05) 150px 196px);-webkit-mask-image:linear-gradient(to right,transparent,#000 45%);mask-image:linear-gradient(to right,transparent,#000 45%);pointer-events:none}\n.p-auth-art > *{position:relative;z-index:1}\n.p-auth-art .logo b{font-size:30px}.p-auth-art .logo i{width:36px;height:6px}\n.p-auth-art h1{font-size:clamp(36px,5.2vw,66px);line-height:.98;font-weight:900;max-width:620px}\n.p-auth-art .claim{font-size:17px;color:#b9bcc1;max-width:470px;margin-top:16px}\n.p-auth-points{display:flex;flex-direction:column;gap:12px;max-width:460px}\n.p-auth-points div{display:flex;gap:12px;align-items:flex-start;font-size:15px;color:#e2e3e5}\n.p-auth-points .ic{color:var(--orange);margin-top:2px;width:20px;height:20px}\n.socials{display:flex;gap:8px;flex-wrap:wrap}\n.social{display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:999px;border:1px solid #3b3e43;color:#fff;text-decoration:none;font-size:14px;font-weight:600}\n.social:hover{border-color:var(--orange);color:var(--orange)}\n.p-auth-form{background:var(--surface);color:var(--ink);padding:40px 44px;display:flex;flex-direction:column;justify-content:center;gap:18px}\n.p-auth-form h2{font-size:26px;font-weight:800}\n@media (max-width:860px){.p-auth{grid-template-columns:1fr}.p-auth-art{padding:26px 20px 30px}.p-auth-art h1{font-size:38px}.p-auth-art::after{inset:0 -60% 40% 60%}.p-auth-points{display:none}.p-auth-form{padding:26px 20px 40px;border-radius:22px 22px 0 0;margin-top:-16px}}\n.consents{display:flex;flex-direction:column;gap:10px;padding:12px 14px;border:1px solid var(--line);border-radius:var(--r-m)}\n\n/* ---------- Sonstiges ---------- */\n.sheet-links{display:flex;flex-direction:column}\n.sheet-links a,.sheet-links button{display:flex;align-items:center;gap:12px;padding:14px 4px;border:0;border-bottom:1px solid var(--line-2);background:none;text-decoration:none;font-size:16px;font-weight:600;cursor:pointer;text-align:left;width:100%}\n.p-table td,.p-table th{font-size:14px}\n.p-table th{background:#fafafb}\n.table-wrap{border-radius:0 0 var(--r-card) var(--r-card)}\n.toolbar input[type=date]{min-width:0}\n.thread .msg{border-radius:16px}\n@media print{body.printing #root,body.printing #toasts{display:none}body.printing .modal-wrap{position:static;background:none;padding:0}body.printing .modal{box-shadow:none;max-height:none;width:100%}body.printing .modal-foot,body.printing .modal-head .icon-btn{display:none}}\n@media (prefers-reduced-motion:reduce){.kpi.is-hot::after{animation:none}}\n\n.block.narrow{max-width:820px}\n.pst-3{grid-template-columns:repeat(3,minmax(0,1fr));padding-top:4px}\n@media (max-width:640px){.pst-3{grid-template-columns:1fr}}\n@media (max-width:640px){\n  .rq{grid-template-columns:auto minmax(0,1fr);row-gap:8px}\n  .rq-side{grid-column:2;flex-direction:row;align-items:center;justify-content:flex-start;flex-wrap:wrap}\n  .tpill{min-width:130px}.tpill-t{justify-content:flex-start}\n  .p-hero .push{font-size:14.5px}\n  .ph-goal .ring{width:64px;height:64px}\n  .ph-goal b{font-size:23px}\n  .hint-bar{font-size:12.5px}\n}\n</style></head><body><div id=\"root\"></div><script nonce=\"__NONCE__\">'use strict';\n/* ===== Gemeinsame Bausteine f\u00fcr internes und Partner-Dashboard ===== */\nconst $ = (s, el = document) => el.querySelector(s);\nconst $$ = (s, el = document) => [...el.querySelectorAll(s)];\nclass Raw { constructor(s) { this.s = s; } toString() { return this.s; } }\nconst raw = (s) => new Raw(String(s ?? ''));\nconst esc = (s) => String(s ?? '').replace(/[&<>\"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', \"'\": '&#39;' }[c]));\nconst part = (v) => (v == null || v === false ? '' : v instanceof Raw ? v.s : Array.isArray(v) ? v.map(part).join('') : esc(v));\nconst html = (s, ...v) => raw(s.reduce((a, x, i) => a + x + (i < v.length ? part(v[i]) : ''), ''));\nconst when = (c, a, b) => (c ? a : b || '');\n\n/* ---------- Schnittstelle ---------- */\nconst App = { base: '/api', onAuth: null, config: {}, user: null };\nclass ApiError extends Error { constructor(status, msg) { super(msg); this.status = status; } }\nconst qs = (q) => { if (!q) return ''; const p = Object.entries(q).filter(([, v]) => v !== undefined && v !== null && v !== ''); return p.length ? '?' + p.map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&') : ''; };\nasync function api(method, path, body) {\n  const opt = { method, headers: { 'X-KFL': '1' }, credentials: 'same-origin' };\n  if (method !== 'GET') { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body || {}); }\n  let res;\n  try { res = await fetch(App.base + path, opt); } catch (e) { throw new ApiError(0, 'Keine Verbindung zum Server. Bitte pr\u00fcfe deine Internetverbindung.'); }\n  let j = null; try { j = await res.json(); } catch (e) { /* keine JSON-Antwort */ }\n  if (!res.ok || (j && j.ok === false)) {\n    const err = new ApiError(res.status, (j && j.error) || `Unerwarteter Fehler (${res.status}).`);\n    if (res.status === 401 && App.onAuth && !path.startsWith('/session') && !path.startsWith('/login')) App.onAuth();\n    if (res.status === 428 && App.onPw) App.onPw();\n    throw err;\n  }\n  return j;\n}\nconst GET = (p, q) => api('GET', p + qs(q));\nconst POST = (p, b) => api('POST', p, b);\nconst PATCH = (p, b) => api('PATCH', p, b);\nconst DEL = (p, b) => api('DELETE', p, b);\nconst fileUrl = (p, q) => App.base + p + qs(q);\n\n/* ---------- Format ---------- */\nconst TZ = 'Europe/Berlin';\nconst dtf = new Intl.DateTimeFormat('de-DE', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' });\nconst dtfT = new Intl.DateTimeFormat('de-DE', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });\nconst dtfH = new Intl.DateTimeFormat('de-DE', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });\nconst dtfL = new Intl.DateTimeFormat('de-DE', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });\nconst toDate = (v) => (v instanceof Date ? v : /^\\d{4}-\\d{2}-\\d{2}$/.test(v || '') ? new Date(v + 'T12:00:00Z') : new Date(v));\nconst fDate = (v) => (v ? dtf.format(toDate(v)) : '\u2013');\nconst fDT = (v) => (v ? dtfT.format(toDate(v)) : '\u2013');\nconst fTime = (v) => (v ? dtfH.format(toDate(v)) : '');\nconst fLong = (v) => dtfL.format(toDate(v || new Date()));\nconst eur = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });\nconst fEur = (n) => (n == null || n === '' || isNaN(+n) ? '\u2013' : eur.format(+n));\nconst fNum = (n, d = 0) => (n == null || isNaN(+n) ? '\u2013' : (+n).toLocaleString('de-DE', { maximumFractionDigits: d, minimumFractionDigits: 0 }));\nconst fPct = (n) => (n == null ? '\u2013' : fNum(n, 1) + ' %');\nfunction fRel(v) {\n  if (!v) return '';\n  const d = (Date.now() - toDate(v).getTime()) / 1000;\n  if (d < 60) return 'gerade eben';\n  if (d < 3600) return `vor ${Math.floor(d / 60)} Min.`;\n  if (d < 86400) return `vor ${Math.floor(d / 3600)} Std.`;\n  if (d < 7 * 86400) return `vor ${Math.floor(d / 86400)} ${Math.floor(d / 86400) === 1 ? 'Tag' : 'Tagen'}`;\n  return fDate(v);\n}\nfunction fLeft(v) {\n  if (!v) return '';\n  const d = (toDate(v).getTime() - Date.now()) / 60000;\n  if (d <= 0) return 'abgelaufen';\n  const h = Math.floor(d / 60), m = Math.floor(d % 60);\n  if (h >= 48) return `noch ${Math.floor(h / 24)} Tage`;\n  return h ? `noch ${h} Std. ${m} Min.` : `noch ${m} Min.`;\n}\nconst todayISO = () => new Intl.DateTimeFormat('sv-SE', { timeZone: TZ }).format(new Date());\nconst addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };\nfunction isoWeekOf(d = new Date()) { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day); const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return { week: Math.ceil(((t - y) / 86400e3 + 1) / 7), year: t.getUTCFullYear() }; }\nconst initials = (n) => String(n || '?').split(/\\s+/).filter(Boolean).slice(0, 2).map((x) => x[0].toUpperCase()).join('');\nconst plural = (n, one, many) => `${fNum(n)} ${n === 1 ? one : many}`;\nconst nl2br = (s) => raw(esc(s).replace(/\\n/g, '<br>'));\n\n/* ---------- Status ---------- */\nfunction statusOf(list, key) { return (list || []).find((s) => s.key === key) || { key, label: key || '\u2013', tone: 'neutral' }; }\nconst badge = (label, tone = 'neutral') => html`<span class=\"badge t-${tone}\">${label}</span>`;\nconst statusBadge = (list, key) => { const s = statusOf(list, key); return badge(s.label, s.tone || 'neutral'); };\n\n/* ---------- Icons (Linien, 24er Raster) ---------- */\nconst ICONS = {\n  home: '<path d=\"M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z\"/>',\n  inbox: '<path d=\"M3 13h5l1.5 3h5L16 13h5\"/><path d=\"M5 5h14l2 8v6H3v-6z\"/>',\n  euro: '<path d=\"M17 6.5A7 7 0 1 0 17 17.5\"/><path d=\"M4 10h9M4 14h9\"/>',\n  partner: '<path d=\"M3 21V8l6-4 6 4v13\"/><path d=\"M15 11h6v10\"/><path d=\"M7 11h4M7 15h4M3 21h18\"/>',\n  chart: '<path d=\"M4 20V10M10 20V4M16 20v-7M22 20H2\"/>',\n  support: '<circle cx=\"12\" cy=\"12\" r=\"9\"/><circle cx=\"12\" cy=\"12\" r=\"3.5\"/><path d=\"m5.6 5.6 3.9 3.9M14.5 14.5l3.9 3.9M18.4 5.6l-3.9 3.9M9.5 14.5l-3.9 3.9\"/>',\n  shield: '<path d=\"M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z\"/>',\n  gear: '<circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z\"/>',\n  news: '<path d=\"M4 5h13v14a2 2 0 0 0 2 2H6a2 2 0 0 1-2-2z\"/><path d=\"M17 9h3v10a2 2 0 0 1-2 2M8 9h5M8 13h5M8 17h3\"/>',\n  log: '<path d=\"M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01\"/>',\n  chat: '<path d=\"M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z\"/>',\n  logout: '<path d=\"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9\"/>',\n  plus: '<path d=\"M12 5v14M5 12h14\"/>',\n  search: '<circle cx=\"11\" cy=\"11\" r=\"7\"/><path d=\"m21 21-4.3-4.3\"/>',\n  check: '<path d=\"M20 6 9 17l-5-5\"/>',\n  x: '<path d=\"M18 6 6 18M6 6l12 12\"/>',\n  file: '<path d=\"M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z\"/><path d=\"M14 3v6h6\"/>',\n  download: '<path d=\"M12 3v12M7 10l5 5 5-5M4 21h16\"/>',\n  upload: '<path d=\"M12 21V9M7 14l5-5 5 5M4 3h16\"/>',\n  clock: '<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 7v5l3 2\"/>',\n  phone: '<path d=\"M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z\"/>',\n  mail: '<rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"2\"/><path d=\"m3 7 9 6 9-6\"/>',\n  car: '<path d=\"M5 17h14M3 13l2-5.5A2 2 0 0 1 6.9 6h10.2a2 2 0 0 1 1.9 1.5L21 13v4a1 1 0 0 1-1 1h-1M3 13v4a1 1 0 0 0 1 1h1M3 13h18\"/><circle cx=\"7\" cy=\"17\" r=\"2\"/><circle cx=\"17\" cy=\"17\" r=\"2\"/>',\n  user: '<circle cx=\"12\" cy=\"8\" r=\"4\"/><path d=\"M4 21a8 8 0 0 1 16 0\"/>',\n  users: '<circle cx=\"9\" cy=\"8\" r=\"3.5\"/><path d=\"M2 20a7 7 0 0 1 14 0M16 4.5a3.5 3.5 0 0 1 0 7M22 20a7 7 0 0 0-4-6.3\"/>',\n  lock: '<rect x=\"4\" y=\"11\" width=\"16\" height=\"10\" rx=\"2\"/><path d=\"M8 11V7a4 4 0 0 1 8 0v4\"/>',\n  eye: '<path d=\"M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>',\n  refresh: '<path d=\"M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5\"/>',\n  send: '<path d=\"M22 2 11 13M22 2l-7 20-4-9-9-4z\"/>',\n  link: '<path d=\"M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7\"/><path d=\"M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7\"/>',\n  flag: '<path d=\"M4 22V4M4 4h13l-2 4 2 4H4\"/>',\n  star: '<path d=\"m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2-5.5-2.9-5.5 2.9 1-6.2L3 9.6l6.2-.9z\"/>',\n  trophy: '<path d=\"M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z\"/><path d=\"M17 5h3a3 3 0 0 1-3 4M7 5H4a3 3 0 0 0 3 4\"/>',\n  bolt: '<path d=\"M13 2 4 14h7l-1 8 9-12h-7z\"/>',\n  menu: '<path d=\"M4 6h16M4 12h16M4 18h16\"/>',\n  bell: '<path d=\"M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0\"/>',\n  trash: '<path d=\"M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15\"/>',\n  edit: '<path d=\"M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z\"/>',\n  external: '<path d=\"M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6\"/>',\n  calendar: '<rect x=\"3\" y=\"4\" width=\"18\" height=\"18\" rx=\"2\"/><path d=\"M16 2v4M8 2v4M3 10h18\"/>',\n  note: '<path d=\"M4 4h16v12l-4 4H4z\"/><path d=\"M16 20v-4h4\"/>',\n  pin: '<path d=\"M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z\"/><circle cx=\"12\" cy=\"9\" r=\"2.5\"/>',\n  shop: '<path d=\"M4 7h16l-1.5 12a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2z\"/><path d=\"M9 7a3 3 0 0 1 6 0\"/>',\n  insta: '<rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"5\"/><circle cx=\"12\" cy=\"12\" r=\"4\"/><path d=\"M17.5 6.5h.01\"/>',\n  arrow: '<path d=\"M5 12h14M13 6l6 6-6 6\"/>',\n  back: '<path d=\"M19 12H5M11 18l-6-6 6-6\"/>',\n  alert: '<path d=\"M12 9v4M12 17h.01\"/><path d=\"M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z\"/>',\n  key: '<circle cx=\"7.5\" cy=\"15.5\" r=\"4.5\"/><path d=\"m10.7 12.3 9.8-9.8M17 6l3 3M14 9l2 2\"/>',\n  pause: '<rect x=\"6\" y=\"5\" width=\"4\" height=\"14\" rx=\"1\"/><rect x=\"14\" y=\"5\" width=\"4\" height=\"14\" rx=\"1\"/>'\n};\nconst icon = (n, cls = '') => raw(`<svg class=\"ic ${cls}\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\">${ICONS[n] || ''}</svg>`);\nconst LOGO = raw('<span class=\"logo\" aria-label=\"KFL \u2013 Kaufen Finanzieren Leasen\"><b>KFL</b><i></i></span>');\n\n/* ---------- Aktionen (CSP-konform ohne Inline-Handler) ---------- */\nconst ACT = {}, SUBMIT = {}, CHANGE = {}, INPUT = {};\nasync function run(fn, btn) {\n  if (btn) { if (btn.dataset.busy) return; btn.dataset.busy = '1'; btn.classList.add('is-busy'); }\n  try { return await fn(); }\n  catch (e) { console.error(e); toast(e.message || 'Das hat nicht geklappt.', 'err'); }\n  finally { if (btn) { delete btn.dataset.busy; btn.classList.remove('is-busy'); } }\n}\ndocument.addEventListener('click', (e) => {\n  const t = e.target.closest('[data-act]'); if (!t || t.disabled) return;\n  const fn = ACT[t.dataset.act]; if (!fn) return;\n  e.preventDefault(); run(() => fn(t, e), t.tagName === 'BUTTON' ? t : null);\n});\ndocument.addEventListener('submit', (e) => {\n  const f = e.target.closest('form[data-submit]'); if (!f) return;\n  e.preventDefault();\n  const fn = SUBMIT[f.dataset.submit]; if (!fn) return;\n  const btn = f.querySelector('button[type=submit]') || e.submitter;\n  run(() => fn(formData(f), f, e.submitter), btn);\n});\ndocument.addEventListener('change', (e) => { const t = e.target.closest('[data-change]'); if (t && CHANGE[t.dataset.change]) run(() => CHANGE[t.dataset.change](t, e)); });\nlet inputTimer = null;\ndocument.addEventListener('input', (e) => { const t = e.target.closest('[data-input]'); if (!t || !INPUT[t.dataset.input]) return; clearTimeout(inputTimer); inputTimer = setTimeout(() => run(() => INPUT[t.dataset.input](t, e)), 320); });\n\nfunction formData(f) {\n  const o = {};\n  for (const el of f.elements) {\n    if (!el.name || el.disabled) continue;\n    const multi = el.name.endsWith('[]'), k = multi ? el.name.slice(0, -2) : el.name;\n    if (el.type === 'checkbox') { if (multi) { o[k] = o[k] || []; if (el.checked) o[k].push(el.value); } else o[k] = el.checked; continue; }\n    if (el.type === 'radio') { if (el.checked) o[k] = el.value; continue; }\n    if (el.type === 'file') continue;\n    if (el.tagName === 'SELECT' && el.multiple) { o[k] = [...el.selectedOptions].map((x) => x.value); continue; }\n    if (multi) { (o[k] = o[k] || []).push(el.value); continue; }\n    o[k] = el.value;\n  }\n  return o;\n}\nconst fileToB64 = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(file); });\nasync function fileField(input, { max = 10 } = {}) {\n  const f = input && input.files && input.files[0]; if (!f) return null;\n  if (f.size > max * 1024 * 1024) throw new Error(`Die Datei ist zu gro\u00df (max. ${max} MB).`);\n  return { name: f.name, type: f.type || 'application/pdf', base64: await fileToB64(f) };\n}\n\n/* ---------- R\u00fcckmeldungen ---------- */\nfunction toast(msg, tone = 'ok') {\n  let box = $('#toasts'); if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }\n  const t = document.createElement('div'); t.className = 'toast t-' + tone; t.innerHTML = part(html`${icon(tone === 'err' ? 'alert' : 'check')}<span>${msg}</span>`);\n  box.appendChild(t); requestAnimationFrame(() => t.classList.add('in'));\n  setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 300); }, tone === 'err' ? 6000 : 3200);\n}\nlet modalStack = [];\nfunction modal({ title, body, foot, wide, onClose, cls = '' }) {\n  const wrap = document.createElement('div');\n  wrap.className = 'modal-wrap';\n  wrap.innerHTML = part(html`<div class=\"modal ${wide ? 'is-wide' : ''} ${cls}\" role=\"dialog\" aria-modal=\"true\" aria-label=\"${title || 'Dialog'}\">\n    <header class=\"modal-head\"><h2>${title}</h2><button class=\"icon-btn\" data-close aria-label=\"Schlie\u00dfen\">${icon('x')}</button></header>\n    <div class=\"modal-body\">${body}</div>${foot ? html`<footer class=\"modal-foot\">${foot}</footer>` : ''}</div>`);\n  document.body.appendChild(wrap); document.body.classList.add('has-modal');\n  const prev = document.activeElement;\n  const close = () => { wrap.classList.remove('in'); setTimeout(() => wrap.remove(), 180); modalStack = modalStack.filter((m) => m !== api); if (!modalStack.length) document.body.classList.remove('has-modal'); if (prev && prev.focus) prev.focus(); if (onClose) onClose(); };\n  const api = { el: wrap, close, set(bodyHtml) { $('.modal-body', wrap).innerHTML = part(bodyHtml); hydrate(wrap); } };\n  wrap.addEventListener('click', (e) => { if (e.target === wrap || e.target.closest('[data-close]')) close(); });\n  modalStack.push(api);\n  requestAnimationFrame(() => { wrap.classList.add('in'); const f = wrap.querySelector('[autofocus], input:not([type=hidden]), select, textarea, button.btn'); if (f) f.focus(); });\n  hydrate(wrap);\n  return api;\n}\ndocument.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modalStack.length) modalStack[modalStack.length - 1].close(); });\nfunction closeModal() { if (modalStack.length) modalStack[modalStack.length - 1].close(); }\n// Formular im Dialog: resolve mit Daten oder null\nfunction ask({ title, text, fields = raw(''), ok = 'Best\u00e4tigen', danger = false, wide = false }) {\n  return new Promise((resolve) => {\n    let done = false;\n    const id = 'f' + Math.random().toString(36).slice(2);\n    const m = modal({ title, wide, body: html`<form id=\"${id}\" class=\"stack\">${text ? html`<p class=\"lead\">${text}</p>` : ''}${fields}</form>`,\n      foot: html`<button class=\"btn btn-ghost\" data-close type=\"button\">Abbrechen</button><button class=\"btn ${danger ? 'btn-danger' : 'btn-primary'}\" type=\"submit\" form=\"${id}\">${ok}</button>`,\n      onClose: () => { if (!done) resolve(null); } });\n    $('#' + id, m.el).addEventListener('submit', (e) => { e.preventDefault(); const f = e.target; if (!f.reportValidity()) return; done = true; const d = formData(f); d._form = f; resolve(d); m.close(); });\n  });\n}\nconst confirmBox = (title, text, ok = 'Ja, fortfahren', danger = false) => ask({ title, text, ok, danger }).then((r) => !!r);\n\n/* ---------- Formularfelder ---------- */\nfunction field(label, input, hint) { return html`<label class=\"field\"><span class=\"field-label\">${label}</span>${input}${hint ? html`<span class=\"field-hint\">${hint}</span>` : ''}</label>`; }\nconst inp = (name, value = '', { type = 'text', ph = '', req = false, attrs = '' } = {}) => raw(`<input name=\"${esc(name)}\" type=\"${type}\" value=\"${esc(value ?? '')}\" placeholder=\"${esc(ph)}\" ${req ? 'required' : ''} ${attrs}>`);\nconst area = (name, value = '', { rows = 4, ph = '', req = false } = {}) => raw(`<textarea name=\"${esc(name)}\" rows=\"${rows}\" placeholder=\"${esc(ph)}\" ${req ? 'required' : ''}>${esc(value ?? '')}</textarea>`);\nfunction sel(name, options, value, { attrs = '', empty } = {}) {\n  const opts = (Array.isArray(options) ? options : Object.entries(options).map(([k, v]) => [k, v])).map((o) => (Array.isArray(o) ? o : typeof o === 'object' ? [o.key ?? o.value, o.label] : [o, o]));\n  return raw(`<select name=\"${esc(name)}\" ${attrs}>${empty !== undefined ? `<option value=\"\">${esc(empty)}</option>` : ''}${opts.map(([k, l]) => `<option value=\"${esc(k)}\" ${String(k) === String(value ?? '') ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`);\n}\nconst chk = (name, checked, label, value) => html`<label class=\"check\"><input type=\"checkbox\" name=\"${name}\" ${value !== undefined ? raw(`value=\"${esc(value)}\"`) : ''} ${checked ? raw('checked') : ''}><span>${label}</span></label>`;\n\n/* ---------- Diagramme (SVG) ---------- */\nfunction barChart(rows, { h = 160, valueFmt = fNum } = {}) {\n  if (!rows.length) return html`<div class=\"empty-sm\">Keine Daten im Zeitraum.</div>`;\n  const max = Math.max(1, ...rows.map((r) => r.value)), step = Math.ceil(rows.length / 10);\n  return html`<div class=\"cols\" data-hpx=\"${h}\">${rows.map((r, i) => html`<div class=\"col\" title=\"${r.label}: ${valueFmt(r.value)}${r.second != null ? ' \u00b7 ' + valueFmt(r.second) : ''}\"><span class=\"col-v\">${r.value ? valueFmt(r.value) : ''}</span>\n    <span class=\"col-bar\" data-h=\"${Math.round((r.value / max) * 80)}\">${r.second ? html`<i data-h=\"${Math.round((r.second / Math.max(1, r.value)) * 100)}\"></i>` : ''}</span><span class=\"col-l\">${i % step === 0 ? r.short || r.label : ''}</span></div>`)}</div>`;\n}\nfunction hbars(rows, { fmt = fNum } = {}) {\n  if (!rows.length) return html`<div class=\"empty-sm\">Keine Daten im Zeitraum.</div>`;\n  const max = Math.max(1, ...rows.map((r) => r.value));\n  return html`<div class=\"hbars\">${rows.map((r) => html`<div class=\"hbar\"><span class=\"hbar-l\">${r.label}</span><span class=\"hbar-track\"><i data-w=\"${Math.round((r.value / max) * 100)}\"></i></span><span class=\"hbar-v num\">${fmt(r.value)}</span></div>`)}</div>`;\n}\nfunction ring(pct, { size = 64, stroke = 7, label = '' } = {}) {\n  const r = (size - stroke) / 2, c = 2 * Math.PI * r, p = Math.max(0, Math.min(1, pct));\n  return raw(`<svg class=\"ring\" width=\"${size}\" height=\"${size}\" viewBox=\"0 0 ${size} ${size}\" role=\"img\" aria-label=\"${esc(label)}\"><circle cx=\"${size / 2}\" cy=\"${size / 2}\" r=\"${r}\" class=\"ring-bg\" stroke-width=\"${stroke}\" fill=\"none\"/><circle cx=\"${size / 2}\" cy=\"${size / 2}\" r=\"${r}\" class=\"ring-fg\" stroke-width=\"${stroke}\" fill=\"none\" stroke-dasharray=\"${c}\" stroke-dashoffset=\"${c * (1 - p)}\" transform=\"rotate(-90 ${size / 2} ${size / 2})\" stroke-linecap=\"round\"/></svg>`);\n}\n// Breiten \u00fcber CSSOM setzen (Inline-Styles sind per CSP gesperrt)\nfunction hydrate(root = document) { for (const el of root.querySelectorAll('[data-w]')) el.style.width = el.dataset.w + '%'; for (const el of root.querySelectorAll('[data-h]')) el.style.height = Math.max(+el.dataset.h, +el.dataset.h ? 2 : 0) + '%'; for (const el of root.querySelectorAll('[data-hpx]')) el.style.height = el.dataset.hpx + 'px'; }\nfunction render(el, content) { if (typeof el === 'string') el = $(el); if (!el) return; el.innerHTML = part(content); hydrate(el); }\nconst delta = (cur, prev, { invert = false } = {}) => {\n  if (prev == null || cur == null) return '';\n  if (!prev && !cur) return html`<span class=\"delta\">\u00b10</span>`;\n  if (!prev) return html`<span class=\"delta up\">neu</span>`;\n  const d = ((cur - prev) / Math.abs(prev)) * 100, good = invert ? d < 0 : d > 0;\n  return html`<span class=\"delta ${d === 0 ? '' : good ? 'up' : 'down'}\">${d > 0 ? '+' : ''}${fNum(d, 0)} %</span>`;\n};\n\n/* ---------- Router ---------- */\nconst Router = {\n  routes: [], current: null,\n  on(re, fn) { this.routes.push([re, fn]); return this; },\n  go(h) { if (location.hash === h) this.resolve(); else location.hash = h; },\n  async resolve() {\n    const h = location.hash || '#/';\n    for (const [re, fn] of this.routes) { const m = h.match(re); if (m) { this.current = h; await run(() => fn(...m.slice(1))); return; } }\n    if (this.fallback) await run(() => this.fallback(h));\n  }\n};\nwindow.addEventListener('hashchange', () => { [...modalStack].reverse().forEach((m) => m.close()); Router.resolve(); });\n\n/* ---------- Kleinteile ---------- */\nconst empty = (title, text, action) => html`<div class=\"empty\"><div class=\"empty-mark\">${icon('inbox')}</div><strong>${title}</strong>${text ? html`<p>${text}</p>` : ''}${action || ''}</div>`;\nconst loading = () => html`<div class=\"loading\" aria-busy=\"true\"><span class=\"spinner\"></span>Wird geladen \u2026</div>`;\nconst kv = (rows) => html`<dl class=\"kv\">${rows.filter((r) => r && r[1] !== undefined && r[1] !== null && r[1] !== '').map(([k, v]) => html`<dt>${k}</dt><dd>${v}</dd>`)}</dl>`;\nconst avatar = (name, cls = '') => html`<span class=\"avatar ${cls}\" aria-hidden=\"true\">${initials(name)}</span>`;\nfunction copyText(t) { return navigator.clipboard ? navigator.clipboard.writeText(t).then(() => toast('In die Zwischenablage kopiert.')) : Promise.resolve(); }\nACT.copy = (b) => copyText(b.dataset.text);\nACT.closeModal = () => closeModal();\nfunction pwStrength(pw) { let s = 0; if ((pw || '').length >= 10) s++; if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++; if (/\\d/.test(pw)) s++; if (/[^A-Za-z0-9]/.test(pw) || (pw || '').length >= 14) s++; return s; }\nconst PW_HINT = 'Mindestens 10 Zeichen mit Buchstaben und Zahlen.';\n\n/* ---------- Angebote ---------- */\nconst OFFER_KIND = { kauf: 'Kauf', leasing: 'Leasing', finanzierung: 'Finanzierung', ankauf: 'Ankauf' };\nconst OFFER_STATUS = { eingereicht: ['Eingereicht', 'info'], vorgestellt: ['Dem Kunden vorgestellt', 'ok-light'], nicht_ausgewaehlt: ['Nicht ausgew\u00e4hlt', 'muted'], angenommen: ['Vom Kunden angenommen', 'ok'], abgelehnt_kunde: ['Vom Kunden abgelehnt', 'muted'] };\nconst offerStatus = (s) => badge(...(OFFER_STATUS[s] || [s, 'neutral']));\nconst OFFER_LABELS = [\n  ['config', 'Konfiguration', (v) => (v === 'gleich' ? 'Wie angefragt' : v === 'alternativ' ? 'Alternative Konfiguration' : v)],\n  ['herstellercode', 'Herstellercode'], ['equipment_match', 'Ausstattung wie angefragt', (v) => (v === 'ja' ? 'Ja' : v === 'nein' ? 'Nein' : v)],\n  ['price', 'Kaufpreis', fEur], ['buy_price', 'Ankaufpreis', fEur], ['monthly_rate', 'Monatliche Rate', fEur], ['down_payment', 'Anzahlung', fEur], ['final_rate', 'Schlussrate', fEur],\n  ['km_per_year', 'Kilometer pro Jahr', (v) => fNum(v) + ' km'], ['term_months', 'Laufzeit', (v) => v + ' Monate'],\n  ['transfer_cost', '\u00dcberf\u00fchrung und Zulassung', fEur], ['service_cost', 'Servicepaket (monatlich)', fEur], ['insurance_cost', 'Versicherung / Kasko (monatlich)', fEur],\n  ['vat_mode', 'Preisangaben', (v) => (v === 'netto' ? 'Netto (gewerblich)' : 'Brutto')], ['delivery', 'Lieferzeit / Verf\u00fcgbarkeit'],\n  ['first_registration', 'Erstzulassung'], ['mileage', 'Kilometerstand', (v) => fNum(v) + ' km'], ['upe', 'UPE (Listenpreis)', fEur], ['accident_free', 'Unfallfrei', (v) => (v === 'ja' || v === true ? 'Ja' : v === 'nein' || v === false ? 'Nein' : v)], ['owners', 'Vorbesitzer'],\n  ['pickup', 'Abholung'], ['valid_until', 'G\u00fcltig bis', fDate], ['notes', 'Anmerkungen']\n];\nfunction offerRows(d) { return OFFER_LABELS.filter(([k]) => d[k] !== undefined && d[k] !== null && d[k] !== '').map(([k, l, f]) => [l, f ? f(d[k]) : d[k]]); }\nconst offerHeadline = (d) => (d.monthly_rate ? html`${fEur(d.monthly_rate)} <span class=\"small muted\">/ Monat</span>` : d.price ? fEur(d.price) : d.buy_price ? fEur(d.buy_price) : '\u2013');\n\nfunction hashQuery() { const i = location.hash.indexOf('?'); return i < 0 ? {} : Object.fromEntries(new URLSearchParams(location.hash.slice(i + 1))); }\n\n/* ===== Partner-Dashboard: Grundger\u00fcst, Anmeldung ===== */\nApp.base = '/papi';\nconst P = { user: null, cfg: {}, links: {}, unread: 0, newCount: 0 };\nconst rank = () => ((P.cfg.partnerRoles || {})[P.user && P.user.role] || { rank: 1 }).rank;\nconst isVL = () => rank() >= 2, isGF = () => P.user && P.user.role === 'gf';\nconst AST = () => P.cfg.assignStatuses || [];\nconst PNAV = () => [\n  { key: 'start', href: '#/', label: '\u00dcbersicht', short: 'Start', icon: 'home', group: 'Arbeiten' },\n  { key: 'anfragen', href: '#/anfragen', label: 'Anfragen', icon: 'inbox', count: P.newCount, group: 'Arbeiten' },\n  isVL() && { key: 'angebote', href: '#/angebote', label: 'Angebote', icon: 'file', group: 'Arbeiten' },\n  isVL() && { key: 'statistik', href: '#/statistik', label: 'Statistik', icon: 'chart', group: 'Auswertung' },\n  { key: 'news', href: '#/news', label: 'News', icon: 'bell', count: P.unread, group: 'Kommunikation' },\n  { key: 'support', href: '#/support', label: 'Support', icon: 'support', group: 'Kommunikation' },\n  { key: 'einstellungen', href: '#/einstellungen', label: 'Einstellungen', icon: 'gear', group: 'Konto' }\n].filter(Boolean);\nconst PCRUMB = { start: '\u00dcbersicht', anfragen: 'Anfragen', angebote: 'Angebote', statistik: 'Statistik', news: 'News', support: 'Support', einstellungen: 'Einstellungen' };\nconst roleLabel = () => ((P.cfg.partnerRoles || {})[P.user && P.user.role] || {}).label || 'Partner';\nconst store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ohne Speicher */ } } };\n\nfunction pshell(active) {\n  if (!$('#pmain')) {\n    const rail = store.get('kfl_p_rail') === '1';\n    render('#root', html`<div class=\"p-app ${rail ? 'is-rail' : ''}\" id=\"papp\">\n      <aside class=\"p-side\" aria-label=\"Seitenleiste\"><div class=\"ps-brand\"><a href=\"#/\" class=\"logo-link\" aria-label=\"Zur \u00dcbersicht\">${LOGO}</a><button class=\"ps-collapse\" data-act=\"prail\" aria-label=\"Men\u00fc ein- oder ausklappen\" title=\"Men\u00fc ein-/ausklappen\">${icon('back')}</button></div>\n        <div class=\"ps-org\" title=\"${P.user.org.name}\"><span class=\"ps-org-mark\">${initials(P.user.org.name)}</span><div><b>${P.user.org.name}</b><span>Partner-Dashboard</span></div></div>\n        <div id=\"pcta\"></div><nav class=\"ps-nav\" id=\"pnav\" aria-label=\"Hauptnavigation\"></nav>\n        <div class=\"ps-foot\"><div class=\"ps-help\"><b>Fragen zu einer Anfrage?</b><p>Das KFL-Team hilft dir schnell weiter.</p><a href=\"#/support\">${icon('support')}Support kontaktieren</a></div>\n          <div class=\"ps-me\">${avatar(P.user.name, 'alt')}<div class=\"ps-me-txt\"><b>${P.user.name}</b><span>${roleLabel()}</span></div><button class=\"icon-btn\" data-act=\"plogout\" aria-label=\"Abmelden\" title=\"Abmelden\">${icon('logout')}</button></div></div></aside>\n      <div class=\"p-body\"><header class=\"p-topbar\" id=\"ptop\"><div class=\"p-topbar-in\"><a href=\"#/\" class=\"pt-logo\" aria-label=\"Zur \u00dcbersicht\">${LOGO}</a><div class=\"pt-crumb\" id=\"pcrumb\"></div>\n        <div class=\"pt-right\"><span class=\"pt-chip\">${icon('calendar')}${fDate(new Date())} \u00b7 KW ${isoWeekOf().week}</span><span id=\"pbell\"></span><span class=\"pt-me\">${avatar(P.user.name, 'alt')}</span></div></div></header>\n        <main class=\"p-main\" id=\"pmain\" tabindex=\"-1\"></main></div>\n      <nav class=\"p-tabbar\" id=\"ptab\" aria-label=\"Navigation\"></nav></div>`);\n  }\n  P.active = active; pnav();\n}\nfunction pnav() {\n  const items = PNAV(); let g = '';\n  render('#pnav', items.map((n) => { const head = n.group !== g ? html`<div class=\"ps-group\">${n.group}</div>` : ''; g = n.group; return html`${head}<a href=\"${n.href}\" class=\"${P.active === n.key ? 'on' : ''}\" title=\"${n.label}\" ${P.active === n.key ? raw('aria-current=\"page\"') : ''}>${icon(n.icon)}<span class=\"lbl\">${n.label}</span>${n.count ? html`<span class=\"count\">${n.count}</span>` : ''}</a>`; }));\n  render('#pcta', P.newCount ? html`<a class=\"ps-cta\" href=\"#/anfragen?tab=neu\" title=\"Neue Anfragen\">${icon('bolt')}<span class=\"lbl\">Neue Anfragen</span><span class=\"count\">${P.newCount}</span></a>` : '');\n  render('#pcrumb', html`<span>${P.user.org.name}</span><span class=\"sep\">/</span><b>${PCRUMB[P.active] || ''}</b>`);\n  render('#pbell', html`<a class=\"pt-bell\" href=\"#/news\" aria-label=\"News${P.unread ? ` (${P.unread} ungelesen)` : ''}\" title=\"News\">${icon('bell')}${P.unread ? html`<span class=\"count\">${P.unread}</span>` : ''}</a>`);\n  const main = items.filter((n) => ['start', 'anfragen', 'news', 'support'].includes(n.key));\n  render('#ptab', html`${main.map((n) => html`<a href=\"${n.href}\" class=\"${P.active === n.key ? 'on' : ''}\">${icon(n.icon)}${n.short || n.label}${n.count ? html`<span class=\"count\">${n.count}</span>` : ''}</a>`)}\n    <button data-act=\"moreSheet\" class=\"${['angebote', 'statistik', 'einstellungen'].includes(P.active) ? 'on' : ''}\">${icon('menu')}Mehr</button>`);\n}\nACT.prail = () => { const a = $('#papp'); a.classList.toggle('is-rail'); store.set('kfl_p_rail', a.classList.contains('is-rail') ? '1' : '0'); };\nwindow.addEventListener('scroll', () => { const t = $('#ptop'); if (t) t.classList.toggle('scrolled', window.scrollY > 4); }, { passive: true });\nACT.moreSheet = () => modal({ title: 'Mehr', body: html`<div class=\"sheet-links\">${PNAV().filter((n) => !['start', 'anfragen', 'news', 'support'].includes(n.key)).map((n) => html`<a href=\"${n.href}\" data-close>${icon(n.icon)}${n.label}</a>`)}\n  <button data-act=\"plogout\">${icon('logout')}Abmelden</button></div>` });\nlet ptok = 0, plast = null;\nfunction ppage(key) {\n  pshell(key);\n  const soft = plast === location.hash; plast = location.hash;\n  const t = ++ptok, y = window.scrollY;\n  if (!soft) { render('#pmain', loading()); window.scrollTo(0, 0); }\n  return { alive: () => t === ptok, show: (c) => { if (t !== ptok) return; render('#pmain', c); if (soft) window.scrollTo(0, y); } };\n}\nconst preload = () => Router.resolve();\nconst phead = (title, sub, actions, back) => html`${back ? html`<a class=\"back\" href=\"${back[0]}\">${icon('back')}${back[1]}</a>` : ''}<div class=\"p-head\"><div><h1>${title}</h1>${sub ? html`<p class=\"sub\">${sub}</p>` : ''}</div>${actions || ''}</div>`;\nconst ptabs = (items, cur) => html`<div class=\"tabs\">${items.filter(Boolean).map(([k, l, h, n]) => html`<a class=\"tab ${k === cur ? 'on' : ''}\" href=\"${h}\">${l}${n ? html`<span class=\"count ${k === 'neu' ? 'hot' : ''}\">${n}</span>` : ''}</a>`)}</div>`;\n\nasync function ploadSession() { const s = await GET('/session'); P.user = s.user; P.cfg = s.config; P.links = s.links; return s; }\nApp.onAuth = () => { P.user = null; plogin(); };\nApp.onPw = () => pforcePw();\n\n/* ---------- Anmeldung ---------- */\nfunction pauthFrame(inner) {\n  const l = P.links || {};\n  render('#root', html`<div class=\"p-auth\"><section class=\"p-auth-art\"><div>${LOGO}</div>\n    <div><h1>Schnell sein. Bestes Angebot. Deal gewinnen.</h1><p class=\"claim\">Das Partner-Dashboard der KFL GbR. Hier landen die Anfragen deiner Region \u2013 wer zuerst ein starkes Angebot abgibt, holt den Kunden.</p></div>\n    <div class=\"p-auth-points\"><div>${icon('bolt')}<span>Neue Anfragen sofort sehen und mit einem Klick \u00fcbernehmen.</span></div><div>${icon('clock')}<span>Jede Anfrage hat 24 Werktags-Stunden \u2013 die Uhr zeigt dir, wie viel Zeit bleibt.</span></div><div>${icon('trophy')}<span>Das beste Angebot gewinnt. Der Kunde meldet sich \u2013 du bekommst seine Kontaktdaten.</span></div></div>\n    <div class=\"socials\">${l.shop ? html`<a class=\"social\" href=\"${l.shop}\" target=\"_blank\" rel=\"noopener\">${icon('shop')}Webstore</a>` : ''}${l.instagram ? html`<a class=\"social\" href=\"${l.instagram}\" target=\"_blank\" rel=\"noopener\">${icon('insta')}Instagram</a>` : ''}</div></section>\n    <section class=\"p-auth-form\">${inner}</section></div>`);\n}\nconst psupportHelp = () => html`<div class=\"auth-help\">${icon('support')}<span>Probleme beim Anmelden?</span><span class=\"spacer\"></span><button class=\"btn btn-sm\" type=\"button\" data-act=\"psupportPublic\">Support kontaktieren</button></div>`;\nfunction plogin(msg) {\n  pauthFrame(html`<div><h2>Willkommen zur\u00fcck</h2><p class=\"muted\">Melde dich mit deiner E-Mail-Adresse an.</p></div>${msg ? html`<div class=\"info-box\">${icon('check')}<span>${msg}</span></div>` : ''}\n    <form class=\"stack\" data-submit=\"plogin\">${field('E-Mail', inp('email', '', { type: 'email', req: true, attrs: 'autocomplete=\"username\" inputmode=\"email\"' }))}${field('Passwort', inp('password', '', { type: 'password', req: true, attrs: 'autocomplete=\"current-password\"' }))}\n      <button class=\"btn btn-primary btn-block\" type=\"submit\">Anmelden</button></form>${psupportHelp()}\n    <p class=\"tiny muted\">Passwort vergessen? Schreib dem Support \u2013 die KFL schickt dir einen Link zum Zur\u00fccksetzen.</p>`);\n}\nSUBMIT.plogin = async (d) => { await POST('/login', d); await pboot(); };\nACT.plogout = async () => { closeModal(); await POST('/logout'); P.user = null; plast = null; plogin('Du wurdest abgemeldet.'); };\nACT.psupportPublic = async () => {\n  const d = await ask({ title: 'Support kontaktieren', text: 'Das KFL-Support-Team meldet sich per E-Mail bei dir.', ok: 'Anfrage senden', fields: html`${field('Name', inp('name', '', { req: true }))}${field('E-Mail', inp('email', '', { type: 'email', req: true }))}\n    ${field('Thema', sel('topic', ['Anmeldung / Zugang', 'Passwort vergessen', 'Neues Konto', 'Technisches Problem', 'Sonstiges'], 'Anmeldung / Zugang'))}${field('Nachricht', area('message', '', { rows: 5, req: true }))}<input class=\"sr\" name=\"website\" tabindex=\"-1\" autocomplete=\"off\" aria-hidden=\"true\">` });\n  if (!d) return; delete d._form; const r = await POST('/support-public', d); toast(r.number ? `Danke! Deine Anfrage #${r.number} ist eingegangen.` : 'Danke, deine Anfrage ist eingegangen.');\n};\nconst consentFields = () => html`<div class=\"consents\">${chk('agb', false, raw(`Ich akzeptiere die <a class=\"link\" href=\"${esc(P.links.agb || '#')}\" target=\"_blank\" rel=\"noopener\">AGB f\u00fcr Gesch\u00e4ftspartner</a>.`))}${chk('privacy', false, raw(`Ich habe die <a class=\"link\" href=\"${esc(P.links.privacy || '#')}\" target=\"_blank\" rel=\"noopener\">Datenschutzhinweise</a> gelesen und stimme der Verarbeitung meiner Daten zu.`))}</div>`;\nasync function pinvite(token) {\n  if (!P.links.agb) await ploadSession().catch(() => {});\n  let info; try { info = await GET('/invite/check', { token }); } catch (e) { return pauthFrame(html`<div><h2>Link nicht mehr g\u00fcltig</h2></div><div class=\"err-box\">${icon('alert')}<span>${e.message}</span></div><a class=\"btn\" href=\"#/\">Zur Anmeldung</a>${psupportHelp()}`); }\n  pauthFrame(html`<div><h2>Hallo ${info.name}!</h2><p class=\"muted\">Willkommen bei der KFL. Lege dein Passwort f\u00fcr ${info.email} fest \u2013 danach geht's los f\u00fcr ${info.org}.</p></div>\n    <form class=\"stack\" data-submit=\"pinvite\"><input type=\"hidden\" name=\"token\" value=\"${token}\">${field('Passwort', inp('password', '', { type: 'password', req: true, attrs: 'minlength=\"10\" autocomplete=\"new-password\"' }), PW_HINT)}\n      ${field('Passwort wiederholen', inp('password2', '', { type: 'password', req: true }))}${consentFields()}<button class=\"btn btn-primary btn-block\" type=\"submit\">Konto aktivieren</button></form>`);\n}\nSUBMIT.pinvite = async (d) => { if (d.password !== d.password2) throw new Error('Die Passw\u00f6rter stimmen nicht \u00fcberein.'); if (!d.agb || !d.privacy) throw new Error('Bitte best\u00e4tige AGB und Datenschutzhinweise.'); await POST('/invite/accept', d); history.replaceState(null, '', '#/'); await pboot(); };\nfunction pconsents() {\n  pauthFrame(html`<div><h2>Noch eine Best\u00e4tigung</h2><p class=\"muted\">Bevor du Anfragen bearbeitest, best\u00e4tige bitte unsere AGB und die Datenschutzhinweise.</p></div>\n    <form class=\"stack\" data-submit=\"pconsents\">${consentFields()}<button class=\"btn btn-primary btn-block\" type=\"submit\">Best\u00e4tigen und weiter</button></form>`);\n}\nSUBMIT.pconsents = async (d) => { if (!d.agb || !d.privacy) throw new Error('Bitte best\u00e4tige beides.'); await POST('/consents', d); await pboot(); };\nfunction pforcePw() {\n  pauthFrame(html`<div><h2>Eigenes Passwort festlegen</h2><p class=\"muted\">Du hast ein vorl\u00e4ufiges Passwort von der KFL bekommen. Bitte vergib jetzt dein eigenes.</p></div>\n    <form class=\"stack\" data-submit=\"pforcePw\">${field('Vorl\u00e4ufiges Passwort', inp('current', '', { type: 'password', req: true }))}${field('Neues Passwort', inp('next', '', { type: 'password', req: true, attrs: 'minlength=\"10\"' }), PW_HINT)}${field('Wiederholen', inp('next2', '', { type: 'password', req: true }))}\n      <button class=\"btn btn-primary btn-block\" type=\"submit\">Speichern</button></form>`);\n}\nSUBMIT.pforcePw = async (d) => { if (d.next !== d.next2) throw new Error('Die Passw\u00f6rter stimmen nicht \u00fcberein.'); await POST('/password', d); await pboot(); };\nasync function pcounts() {\n  try { const d = await GET('/start'); P.start = d; P.newCount = d.newRequests.length; P.unread = d.news.notifications.filter((n) => !n.read).length + d.news.posts.filter((p) => !p.read).length; if ($('#pnav')) pnav(); return d; } catch (e) { return null; }\n}\nasync function pboot() {\n  const s = await ploadSession();\n  if (!s.user) return plogin();\n  if (!s.user.consentsOk) return pconsents();\n  if (s.user.mustChangePw) return pforcePw();\n  $('#root').innerHTML = '';\n  Router.resolve();\n}\nsetInterval(() => { if (P.user && P.user.consentsOk && document.visibilityState === 'visible') pcounts(); }, 30000);\n\n/* ---------- Bausteine ---------- */\n// Stoppuhr: Restzeit als Ring (voller Ring = 24 Werktags-Stunden)\nfunction clock(deadline, total = 24) {\n  if (!deadline) return '';\n  const left = (toDate(deadline).getTime() - Date.now()) / 3600e3;\n  const pct = Math.max(0, Math.min(1, left / total));\n  const label = left <= 0 ? 'abgelaufen' : left < 1 ? `${Math.max(1, Math.round(left * 60))} Min.` : left < 48 ? `${Math.floor(left)} Std.` : `${Math.round(left / 24)} Tage`;\n  return html`<span class=\"clock ${left < 4 ? 'urgent' : ''}\"><span class=\"ring-wrap\">${ring(pct, { size: 44, stroke: 5, label: 'Restzeit ' + label })}<span class=\"ring-c\">${left <= 0 ? '0' : left < 1 ? Math.max(1, Math.round(left * 60)) + \"'\" : Math.floor(left) < 100 ? Math.floor(left) + 'h' : Math.round(left / 24) + 'd'}</span></span>${label}</span>`;\n}\nconst zTag = (z) => html`<span class=\"zustand ${/gebraucht/i.test(z || '') ? 'used' : /vorf/i.test(z || '') ? 'pre' : ''}\" title=\"${z || ''}\">${/gebraucht/i.test(z || '') ? 'GW' : /vorf/i.test(z || '') ? 'VF' : 'NW'}</span>`;\n// Restzeit als Pille mit Fortschrittsbalken (Listen)\nfunction tpill(deadline, total = 24) {\n  if (!deadline) return '';\n  const left = (toDate(deadline).getTime() - Date.now()) / 3600e3, pct = Math.max(0, Math.min(1, left / total));\n  const label = left <= 0 ? 'abgelaufen' : left < 1 ? `noch ${Math.max(1, Math.round(left * 60))} Min.` : left < 48 ? `noch ${Math.floor(left)} Std.` : `noch ${Math.round(left / 24)} Tage`;\n  return html`<span class=\"tpill ${left <= 0 ? 'over' : left < 4 ? 'urgent' : left < 10 ? 'soon' : ''}\" title=\"Frist: ${fDT(deadline)}\"><span class=\"tpill-t\">${icon('clock')}${label}</span><span class=\"tpill-b\"><i data-w=\"${Math.round(pct * 100)}\"></i></span></span>`;\n}\nconst rqTitle = (a) => { const r = a.request || {}; return a.level === 'full' ? (r.vehicle || [r.brand, r.model].filter(Boolean).join(' ') || r.typeLabel) : `${r.zustand || 'Fahrzeug'}${r.brand ? ' \u00b7 ' + r.brand : ''}`; };\nfunction rqCard(a) {\n  const r = a.request || {};\n  const live = ['neu', 'in_bearbeitung'].includes(a.status);\n  return html`<a class=\"rq tone-${a.tone}\" href=\"#/anfragen/${a.id}\">${zTag(r.zustand)}<div class=\"rq-main\"><div class=\"rq-t\">${rqTitle(a)}<span class=\"rq-no\">#${r.number}</span></div>\n    <div class=\"rq-s\"><span>${icon('pin')}PLZ ${r.plz || '\u2013'}${a.distance_km != null ? ` \u00b7 ${fNum(a.distance_km)} km` : ''}</span>${a.level === 'full' && r.summary ? html`<span>${r.summary}</span>` : r.typeLabel ? html`<span>${r.typeLabel}</span>` : ''}${a.taker ? html`<span>${icon('user')}${a.taker}</span>` : ''}${a.direct ? html`<span class=\"direct\">${icon('star')}direkt an dich</span>` : ''}</div></div>\n    <div class=\"rq-side\">${live && a.deadline_at ? tpill(a.deadline_at) : a.status === 'gewonnen' && a.contact_due_at ? tpill(a.contact_due_at) : ''}${a.status !== 'neu' || !a.deadline_at ? badge(a.statusLabel, a.tone) : ''}</div>${icon('arrow', 'rq-go')}</a>`;\n}\nconst rqList = (items) => html`<div class=\"rq-list\">${items.map(rqCard)}</div>`;\n\n/* ===== Start und News ===== */\nfunction pgreet() { const h = +new Intl.DateTimeFormat('de-DE', { timeZone: TZ, hour: 'numeric', hour12: false }).format(new Date()); return h < 11 ? 'Guten Morgen' : h < 18 ? 'Hallo' : 'Guten Abend'; }\nfunction motivation(d) {\n  const s = d.stats, left = Math.max(0, s.weekGoal - s.weekOffers);\n  if (d.newRequests.length) return `${plural(d.newRequests.length, 'neue Anfrage wartet', 'neue Anfragen warten')} auf dich. Wer zuerst ein starkes Angebot abgibt, hat die besten Chancen.`;\n  if (d.won.length) return `${plural(d.won.length, 'Kunde wartet', 'Kunden warten')} auf deinen Anruf \u2013 melde dich innerhalb der Kontaktfrist.`;\n  if (!left) return 'Wochenziel erreicht \u2013 stark! Jedes weitere Angebot erh\u00f6ht deine Gewinnchance.';\n  return `Noch ${plural(left, 'Angebot', 'Angebote')} bis zu deinem Wochenziel. Neue Anfragen kommen laufend rein.`;\n}\nconst nextDeadline = (list, key = 'deadline_at') => list.map((a) => a[key]).filter(Boolean).sort()[0];\nfunction kpi({ href, tone, ic, label, value, sub, hot }) {\n  const inner = html`<div class=\"kpi-top\"><span class=\"kpi-ic\">${icon(ic)}</span>${href ? icon('arrow', 'go') : ''}</div><div><div class=\"kpi-v\">${value}</div><div class=\"kpi-l\">${label}</div></div><div class=\"kpi-s\">${sub || ''}</div>`;\n  return href ? html`<a class=\"kpi k-${tone} ${hot ? 'is-hot' : ''}\" href=\"${href}\">${inner}</a>` : html`<div class=\"kpi k-${tone}\">${inner}</div>`;\n}\nfunction pnewsRow(i) {\n  return html`<button class=\"nw ${i.read ? '' : 'unread'}\" data-act=\"popenFeed\" data-kind=\"${i.kind}\" data-id=\"${i.id}\" data-link=\"${i.link || ''}\"><span class=\"fi-mark ${i.kind === 'post' ? (i.important ? 'important' : 'post') : ''}\">${icon(i.kind === 'post' ? 'news' : P_ICON[i.ntype] || 'bell')}</span>\n    <span><span class=\"nw-t\">${i.title}</span><span class=\"nw-m\">${i.kind === 'post' ? 'Nachricht der KFL \u00b7 ' : ''}${fRel(i.created_at)}</span></span></button>`;\n}\nlet PSTART_SEG = 'mine';\nasync function pStart() {\n  const V = ppage('start');\n  const d = await pcounts() || await GET('/start'); if (!V.alive()) return;\n  const s = d.stats, pct = s.weekGoal ? s.weekOffers / s.weekGoal : 0;\n  const items = feedOf(d.news).slice(0, 5);\n  const nd = nextDeadline(d.mine);\n  const act = d.activity || [], amax = Math.max(1, ...act.map((x) => x.offers + x.taken));\n  const fun = [['\u00dcbernommen', s.taken], ['Angebote', s.offers], ['Vorgestellt', s.presented || 0], ['Gewonnen', s.won]], fmax = Math.max(1, s.taken, s.offers);\n  const segs = [['mine', 'In Bearbeitung', d.mine], ['waiting', 'Beim Kunden', d.waiting]];\n  const seg = segs.find((x) => x[0] === PSTART_SEG) || segs[0];\n  V.show(html`<section class=\"p-hero\"><div><span class=\"ph-kicker\"><i></i>${fLong(new Date())}</span><h1>${pgreet()}, ${P.user.name.split(' ')[0]}</h1><p class=\"push\">${motivation(d)}</p>\n      <div class=\"ph-actions\">${d.newRequests.length ? html`<a class=\"btn btn-primary\" href=\"#/anfragen?tab=neu\">${icon('bolt')}${plural(d.newRequests.length, 'neue Anfrage', 'neue Anfragen')} ansehen</a>` : html`<a class=\"btn btn-primary\" href=\"#/anfragen\">${icon('inbox')}Zu meinen Anfragen</a>`}${d.mine.length ? html`<a class=\"btn btn-glass\" href=\"#/anfragen?tab=meine\">${icon('clock')}Angebote fertigstellen</a>` : ''}</div></div>\n    <div class=\"ph-goal\"><span class=\"ring-wrap\">${ring(pct, { size: 88, stroke: 9, label: 'Wochenziel' })}<span class=\"ring-c\">${Math.min(100, Math.round(pct * 100))} %</span></span><div><b>${s.weekOffers} / ${s.weekGoal}</b><span>Angebote diese Woche<br>Dein Wochenziel \u00b7 KW ${d.week}</span></div></div></section>\n    <div class=\"kpis\">\n      ${kpi({ href: '#/anfragen?tab=neu', tone: 'orange', ic: 'inbox', label: 'Neue Anfragen', value: fNum(d.newRequests.length), sub: d.newRequests.length ? 'jetzt \u00fcbernehmen' : 'aktuell keine offen', hot: d.newRequests.length > 0 })}\n      ${kpi({ href: '#/anfragen?tab=meine', tone: 'blue', ic: 'clock', label: 'In Bearbeitung', value: fNum(d.mine.length), sub: nd ? html`${icon('clock')}n\u00e4chste Frist ${fLeft(nd).replace('noch ', 'in ')}` : 'nichts offen' })}\n      ${kpi({ href: '#/anfragen?tab=beantwortet', tone: 'amber', ic: 'send', label: 'Beim Kunden', value: fNum(d.waiting.length), sub: 'warten auf R\u00fcckmeldung' })}\n      ${kpi({ href: '#/anfragen?tab=gewonnen', tone: 'green', ic: 'trophy', label: 'Deals gewonnen', value: fNum(s.won), sub: `Erfolgsquote ${s.winRate} %` })}</div>\n    <div class=\"p-grid\"><div class=\"stack\">\n      ${d.won.length ? html`<section class=\"urgent-card\"><h2>${icon('phone')}${plural(d.won.length, 'Kunde wartet', 'Kunden warten')} auf deinen Anruf</h2><p class=\"uc-sub\">Gewonnen! Melde dich innerhalb der Kontaktfrist \u2013 so wird aus dem Angebot ein Abschluss.</p>\n        <div class=\"uc-list\">${d.won.map((a) => html`<a class=\"uc-item\" href=\"#/anfragen/${a.id}\"><div><b>${rqTitle(a)} \u00b7 #${a.request.number}</b><span>${a.contact_due_at ? 'Kontakt bis ' + fDT(a.contact_due_at) : a.statusLabel}</span></div><span class=\"uc-cta\">${icon('phone')}Kontaktdaten</span></a>`)}</div></section>` : ''}\n      <section class=\"block\"><div class=\"block-head\"><h2><span class=\"h-ic\">${icon('bolt')}</span>Neue Anfragen ${d.newRequests.length ? html`<span class=\"count hot\">${d.newRequests.length}</span>` : ''}</h2><a class=\"more-link\" href=\"#/anfragen?tab=neu\">Alle${icon('arrow')}</a></div>\n        ${d.newRequests.length ? rqList(d.newRequests.slice(0, 6)) : html`<div class=\"block-body\">${empty('Gerade keine neuen Anfragen', 'Sobald ein Kunde in deiner Region anfragt, erscheint die Anfrage hier \u2013 und du bekommst eine E-Mail.')}</div>`}\n        ${d.newRequests.length > 6 ? html`<div class=\"block-foot\"><a href=\"#/anfragen?tab=neu\">Alle ${d.newRequests.length} neuen Anfragen${icon('arrow')}</a></div>` : ''}</section>\n      <section class=\"block\" id=\"pseg\"><div class=\"block-head\"><h2><span class=\"h-ic\">${icon('file')}</span>Meine Vorg\u00e4nge</h2><div class=\"seg-tabs\" role=\"tablist\">${segs.map(([k, l, list]) => html`<button role=\"tab\" aria-selected=\"${k === seg[0]}\" class=\"${k === seg[0] ? 'on' : ''}\" data-act=\"pseg\" data-k=\"${k}\">${l}<span class=\"count\">${list.length}</span></button>`)}</div></div>\n        ${seg[2].length ? rqList(seg[2]) : html`<div class=\"block-body\"><p class=\"muted small\">${seg[0] === 'mine' ? 'Keine Anfrage in Bearbeitung. \u00dcbernimm eine neue Anfrage und gib dein Angebot ab.' : 'Noch keine offenen Angebote beim Kunden.'}</p></div>`}</section></div>\n    <div class=\"stack\">\n      <section class=\"block\"><div class=\"block-head\"><h2><span class=\"h-ic\">${icon('chart')}</span>Deine Leistung</h2>${isVL() ? html`<a class=\"more-link\" href=\"#/statistik\">Statistik${icon('arrow')}</a>` : ''}</div><div class=\"block-body\">\n        <div class=\"perf-top\"><div><b>${s.winRate} %</b><span class=\"tiny muted\"> Erfolgsquote</span></div><span>${plural(s.offers, 'Angebot', 'Angebote')} insgesamt</span></div>\n        <div class=\"funnel\">${fun.map(([l, v]) => html`<div class=\"fn-row\"><span class=\"fn-l\">${l}</span><span class=\"fn-track\"><i data-w=\"${Math.round((v / fmax) * 100)}\"></i></span><span class=\"fn-v\">${fNum(v)}</span></div>`)}</div>\n        ${act.length ? html`<div class=\"spark\" title=\"\u00dcbernahmen und Angebote der letzten 14 Tage\">${act.map((x, i) => html`<span class=\"${i === act.length - 1 ? 'today' : x.offers + x.taken ? 'has' : ''}\" data-h=\"${Math.max(6, Math.round(((x.offers + x.taken) / amax) * 100))}\" title=\"${fDate(x.day)}: ${x.taken} \u00fcbernommen, ${x.offers} Angebote\"></span>`)}</div><div class=\"spark-l\"><span>vor 14 Tagen</span><span>Aktivit\u00e4t</span><span>heute</span></div>` : ''}</div></section>\n      <section class=\"block\"><div class=\"block-head\"><h2><span class=\"h-ic\">${icon('bell')}</span>News ${d.newSince ? html`<span class=\"count hot\">${d.newSince} neu</span>` : ''}</h2><a class=\"more-link\" href=\"#/news\">Alle${icon('arrow')}</a></div>\n        ${items.length ? html`<div>${items.map(pnewsRow)}</div>` : html`<div class=\"block-body muted small\">Noch keine Neuigkeiten.</div>`}</section>\n      <section class=\"block\"><div class=\"block-head\"><h2><span class=\"h-ic\">${icon('note')}</span>Mein Infofeld</h2><a class=\"more-link\" href=\"#/notizen\">Alle${icon('arrow')}</a></div><div class=\"block-body\">\n        <form data-submit=\"noteAdd\"><div class=\"note-add\">${inp('text', '', { req: true, ph: 'Notiz, z. B. R\u00fcckruf Herr M. um 14 Uhr' })}<button class=\"btn btn-dark\" type=\"submit\" aria-label=\"Notiz speichern\">${icon('plus')}</button></div>\n          <label class=\"note-opts\">${icon('calendar')}Nur an einem Tag anzeigen:<input type=\"date\" name=\"day\" aria-label=\"Tag (optional)\"></label></form>\n        ${d.notes.map((n) => html`<div class=\"note ${n.day ? 'day' : ''}\">${icon(n.day ? 'calendar' : 'pin')}<span class=\"spacer\">${n.text}${n.day ? html`<span class=\"tiny muted\"> \u00b7 heute</span>` : ''}</span><button class=\"icon-btn\" data-act=\"noteDel\" data-id=\"${n.id}\" aria-label=\"Notiz l\u00f6schen\">${icon('x')}</button></div>`)}</div></section></div></div>`);\n}\nACT.pseg = (b) => { PSTART_SEG = b.dataset.k; plast = location.hash; preload(); };\nSUBMIT.noteAdd = async (d, f) => { await POST('/notes', d); f.reset(); toast('Notiz gespeichert.'); preload(); };\nACT.noteDel = async (b) => { await DEL('/notes/' + b.dataset.id); preload(); };\nasync function pNotes() {\n  const V = ppage('start'); const d = await GET('/notes'); if (!V.alive()) return;\n  V.show(html`${phead('Mein Infofeld', 'Dauerhafte Notizen und Notizen f\u00fcr einzelne Tage.', '', ['#/', 'Start'])}<section class=\"block\"><div class=\"block-body\">\n    <form class=\"stack-s\" data-submit=\"noteAdd\">${area('text', '', { rows: 2, req: true })}<div class=\"row\">${field('Tag (leer = immer anzeigen)', inp('day', '', { type: 'date' }))}<button class=\"btn btn-dark btn-sm\" type=\"submit\">Speichern</button></div></form>\n    ${d.notes.length ? d.notes.map((n) => html`<div class=\"note ${n.day ? 'day' : ''}\">${icon(n.day ? 'calendar' : 'pin')}<span class=\"spacer\">${n.day ? html`<b>${fDate(n.day)}:</b> ` : ''}${n.text}</span><button class=\"icon-btn\" data-act=\"noteDel\" data-id=\"${n.id}\" aria-label=\"L\u00f6schen\">${icon('x')}</button></div>`) : html`<p class=\"muted small mt\">Noch keine Notizen.</p>`}</div></section>`);\n}\n\nconst feedOf = (news) => [...news.posts.map((p) => ({ ...p, kind: 'post' })), ...news.notifications.map((n) => ({ ...n, ntype: n.kind, kind: 'note' }))].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));\nconst P_ICON = { anfrage: 'inbox', neu: 'inbox', gewonnen: 'trophy', vorgestellt: 'star', geschlossen: 'x', support: 'support', rechnung: 'euro', mahnung: 'euro', probefahrt: 'car', info: 'news' };\nfunction pfeedRow(i) {\n  return html`<div class=\"feed-item ${i.read ? '' : 'unread'}\"><span class=\"fi-mark ${i.kind === 'post' ? (i.important ? 'important' : 'post') : ''}\">${icon(i.kind === 'post' ? 'news' : P_ICON[i.ntype] || 'bell')}</span>\n    <div><a href=\"#\" class=\"fi-title\" data-act=\"popenFeed\" data-kind=\"${i.kind}\" data-id=\"${i.id}\" data-link=\"${i.link || ''}\">${i.title}</a>${i.body ? html`<div class=\"fi-body\">${i.body}</div>` : ''}<div class=\"tiny muted\">${i.kind === 'post' ? 'Nachricht der KFL' : fDT(i.created_at)}</div></div>\n    <div class=\"stack-s\"><span class=\"fi-time\">${fRel(i.created_at)}</span><button class=\"btn btn-ghost btn-sm\" data-act=\"ptoggleRead\" data-kind=\"${i.kind}\" data-id=\"${i.id}\" data-read=\"${i.read ? 1 : 0}\">${i.read ? 'Ungelesen' : 'Gelesen'}</button></div></div>`;\n}\nlet PNEWS = null;\nACT.popenFeed = async (a) => {\n  const id = +a.dataset.id, kind = a.dataset.kind;\n  await POST('/news/read', kind === 'post' ? { posts: [id] } : { notifications: [id] });\n  if (kind === 'note' && a.dataset.link) { await pcounts(); location.hash = a.dataset.link; return; }\n  const src = PNEWS || (P.start && P.start.news) || { posts: [] };\n  const p = src.posts.find((x) => x.id === id);\n  if (p) modal({ title: p.title, body: html`<p class=\"tiny muted\">${fDT(p.created_at)}</p><div class=\"pre mt\">${p.body}</div>`, foot: html`<button class=\"btn btn-dark\" data-close>Schlie\u00dfen</button>`, onClose: () => { pcounts(); preload(); } });\n  else { await pcounts(); preload(); }\n};\nACT.ptoggleRead = async (b) => { const id = +b.dataset.id; await POST('/news/read', { ...(b.dataset.kind === 'post' ? { posts: [id] } : { notifications: [id] }), read: b.dataset.read !== '1' }); await pcounts(); preload(); };\nACT.pallRead = async () => { await POST('/news/read', { all: true, posts: (PNEWS?.posts || []).filter((p) => !p.read).map((p) => p.id) }); await pcounts(); preload(); };\nasync function pNews() {\n  const V = ppage('news'); const d = await GET('/news'); if (!V.alive()) return;\n  PNEWS = d;\n  const f = hashQuery().f || 'alle';\n  let items = feedOf(d);\n  if (f === 'ungelesen') items = items.filter((i) => !i.read);\n  if (f === 'kfl') items = items.filter((i) => i.kind === 'post');\n  V.show(html`${phead('News', 'Nachrichten der KFL, neue Anfragen, Support-Antworten und Erfolge.', html`<button class=\"btn btn-sm\" data-act=\"pallRead\">Alles gelesen</button>`)}\n    <section class=\"block\"><div class=\"toolbar\">${[['alle', 'Alle'], ['ungelesen', 'Ungelesen'], ['kfl', 'Von der KFL']].map(([k, l]) => html`<a class=\"btn btn-sm ${f === k ? 'btn-dark' : 'btn-ghost'}\" href=\"#/news?f=${k}\">${l}</a>`)}</div>\n    ${items.length ? items.map(pfeedRow) : html`<div class=\"block-body\">${empty('Keine Nachrichten', f === 'ungelesen' ? 'Du hast alles gelesen.' : '')}</div>`}</section>`);\n}\n\n/* ===== Anfragen, Angebot abgeben ===== */\nconst PTABS = () => { const st = P.start || {}, n = (k) => (st[k] || []).length || 0; return [['neu', 'Neu', '#/anfragen?tab=neu', n('newRequests')], ['meine', 'In Bearbeitung', '#/anfragen?tab=meine', n('mine')], ['beantwortet', 'Beim Kunden', '#/anfragen?tab=beantwortet', n('waiting')], ['gewonnen', 'Gewonnen', '#/anfragen?tab=gewonnen', n('won')], ['archiv', 'Archiv', '#/anfragen?tab=archiv'], isVL() && ['team', 'Team', '#/anfragen?tab=team']]; };\nconst TAB_EMPTY = { neu: ['Keine neuen Anfragen', 'Neue Anfragen aus deiner Region erscheinen hier \u2013 du bekommst zus\u00e4tzlich eine E-Mail.'], meine: ['Nichts in Bearbeitung', '\u00dcbernimm eine neue Anfrage und gib dein Angebot ab.'], beantwortet: ['Noch keine Angebote offen', ''], gewonnen: ['Noch kein Deal gewonnen', 'Gute Angebote zahlen sich aus \u2013 bleib dran!'], archiv: ['Archiv ist leer', ''], team: ['Keine Anfragen im Team', ''] };\nasync function pRequests() {\n  const V = ppage('anfragen');\n  const tab = hashQuery().tab || 'neu';\n  const d = await GET('/requests', { tab }); if (!V.alive()) return;\n  if (!P.start) await pcounts(); if (!V.alive()) return;\n  V.show(html`${phead('Anfragen', 'Alle Anfragen aus deiner Region \u2013 sortiert nach Status. Wer zuerst ein starkes Angebot abgibt, gewinnt.')}${ptabs(PTABS(), tab)}\n    ${tab === 'neu' ? html`<div class=\"hint-bar\">${icon('shield')}<span>Vor der \u00dcbernahme siehst du nur die Eckdaten. Nach der \u00dcbernahme geh\u00f6rt die Anfrage dir \u2013 dein Team sieht sie dann nicht mehr.</span></div>` : ''}\n    <div class=\"mt\">${d.items.length ? html`<div class=\"rq-wrap\">${rqList(d.items)}</div>` : html`<section class=\"block\">${empty(...TAB_EMPTY[tab])}</section>`}</div>`);\n}\n\nlet PA = null;\nconst numOf = (v) => { const m = String(v || '').replace(/\\./g, '').match(/\\d+/g); return m ? +m[m.length - 1] : ''; };\nasync function pRequest(id) {\n  const V = ppage('anfragen');\n  const d = await GET('/requests/' + id); if (!V.alive()) return;\n  const a = d.item; PA = a; const r = a.request;\n  const back = ['#/anfragen?tab=' + ({ neu: 'neu', in_bearbeitung: 'meine', versendet: 'beantwortet', vorgestellt: 'beantwortet', gewonnen: 'gewonnen', nicht_erreicht: 'gewonnen' }[a.status] || 'archiv'), 'Anfragen'];\n  if (a.level === 'teaser') {\n    return V.show(html`${phead(`Anfrage #${r.number}`, r.typeLabel, badge(a.statusLabel, a.tone), back)}<section class=\"block teaser\">\n      ${zTag(r.zustand)}<div class=\"big\">${r.zustand || 'Fahrzeug'}</div>\n      <div class=\"facts\"><div><b>${r.brand || '\u2013'}</b><span>Marke</span></div><div><b>PLZ ${r.plz || '\u2013'}</b><span>Wohnort des Kunden</span></div><div><b>${a.distance_km != null ? fNum(a.distance_km) + ' km' : '\u2013'}</b><span>Luftlinie zu dir</span></div><div><b>${fDT(a.deadline_at)}</b><span>Angebotsfrist</span></div></div>\n      ${clock(a.deadline_at)}\n      <p class=\"muted small\">Nach der \u00dcbernahme siehst du alle Details der Anfrage. Du hast dann ${4} Stunden f\u00fcr dein Angebot \u2013 sonst wird sie wieder f\u00fcr dein Team freigegeben. Kontaktdaten des Kunden bekommst du, sobald er dein Angebot annimmt.</p>\n      <button class=\"btn btn-primary\" data-act=\"ptake\" data-id=\"${a.id}\">${icon('bolt')}Anfrage \u00fcbernehmen</button></section>`);\n  }\n  if (a.level === 'summary') {\n    return V.show(html`${phead(`Anfrage #${r.number}`, `${r.zustand || ''} ${r.brand || ''} \u00b7 PLZ ${r.plz}`, badge(a.statusLabel, a.tone), back)}<section class=\"block narrow\"><div class=\"block-head\"><h2><span class=\"h-ic\">${icon('lock')}</span>Wird von deinem Team bearbeitet</h2></div><div class=\"block-body\">\n      ${kv([['Bearbeitet von', a.taker || '\u2013'], ['\u00dcbernommen', fDT(a.taken_at)], ['Angebot gesendet', a.sent_at ? fDT(a.sent_at) : 'noch nicht'], ['Frist', fDT(a.deadline_at)], ['Kontaktfrist', a.contact_due_at ? fDT(a.contact_due_at) : '']])}\n      <p class=\"small muted mt\">Inhalt und Angebot sieht nur die bearbeitende Person. ${isVL() ? html`Abgegebene Angebote findest du unter <a class=\"link\" href=\"#/angebote\">Angebote</a>.` : ''}</p></div></section>`);\n  }\n  const f = r.fields || {};\n  const statusBox = {\n    in_bearbeitung: html`<div class=\"note-box\">${icon('clock')}<div class=\"spacer\">Du bearbeitest diese Anfrage. ${a.lock_until ? html`Reserviert bis <b>${fTime(a.lock_until)} Uhr</b> (${fLeft(a.lock_until)}) \u2013 danach wird sie wieder f\u00fcr dein Team freigegeben.` : ''}</div><button class=\"btn btn-sm\" data-act=\"prelease\" data-id=\"${a.id}\">Wieder \u00f6ffnen</button></div>`,\n    versendet: html`<div class=\"info-box\">${icon('send')}<span>Dein Angebot wurde am ${fDT(a.sent_at)} gesendet. Nach Ablauf der Frist wertet die KFL alle Angebote aus und stellt dem Kunden das beste vor.</span></div>`,\n    vorgestellt: html`<div class=\"present\">${icon('star')}<span><b>Stark! Dein Angebot wurde dem Kunden vorgestellt.</b> Sobald er \u201eInteressiert mich\u201c klickt, bekommst du seine Kontaktdaten.</span></div>`,\n    gewonnen: html`<div class=\"win\">${icon('trophy')}<div><b>Gewonnen! Der Kunde wartet auf deinen Anruf.</b><div class=\"small\">Bitte melde dich bis ${fDT(a.contact_due_at)} (${fLeft(a.contact_due_at)}).</div></div></div>`,\n    nicht_erreicht: html`<div class=\"note-box\">${icon('phone')}<span>Du hast den Kunden nicht erreicht. Die KFL fragt beim Kunden nach und meldet sich. Versuch es gern weiter.</span></div>`,\n    kontaktiert: html`<div class=\"present\">${icon('check')}<span>Kunde erfolgreich kontaktiert \u2013 viel Erfolg beim Abschluss!</span></div>`,\n    geschlossen: html`<div class=\"note-box\">${icon('x')}<span>Geschlossen. ${a.closed_reason || 'Dein Angebot wurde dem Kunden nicht vorgestellt.'}</span></div>`,\n    verloren: html`<div class=\"note-box\">${icon('clock')}<span>${a.closed_reason || 'Die Frist ist abgelaufen.'}</span></div>`,\n    gescheitert: html`<div class=\"note-box\">${icon('x')}<span>Verhandlung gescheitert. ${a.closed_reason || ''}</span></div>`\n  }[a.status] || '';\n  const offerView = a.offer ? html`<section class=\"block\"><div class=\"block-head\"><h2>Dein Angebot</h2>${offerStatus(a.offer.status)}</div><div class=\"block-body\"><div class=\"offer-price num\">${offerHeadline(a.offer.data)}</div><div class=\"mt\">${kv(offerRows(a.offer.data))}</div></div></section>` : '';\n  V.show(html`${phead(html`#${r.number} \u00b7 ${r.vehicle || [r.brand, r.model].filter(Boolean).join(' ')}`, html`${r.typeLabel} \u00b7 ${r.summary || ''} \u00b7 PLZ ${r.plz}${a.distance_km != null ? ` (${fNum(a.distance_km)} km)` : ''}`, html`<div class=\"row\">${['neu', 'in_bearbeitung'].includes(a.status) ? clock(a.deadline_at) : ''}${badge(a.statusLabel, a.tone)}</div>`, back)}\n    ${statusBox}\n    <div class=\"p-detail mt\"><div class=\"stack\">\n      ${a.contact ? html`<section class=\"contact-card stack-s\"><h3>Kontaktdaten des Kunden</h3>${kv([['Name', a.contact.name], ['Telefon', a.contact.phone], ['E-Mail', a.contact.email], ['Anschrift', [a.contact.street, [a.contact.zip, a.contact.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')], ['Bevorzugt', a.contact.contactWay]])}\n        <div class=\"row\">${a.contact.phone ? html`<a class=\"btn btn-ok\" href=\"tel:${a.contact.phone.replace(/[^+\\d]/g, '')}\">${icon('phone')}Anrufen</a>` : ''}${a.contact.email ? html`<a class=\"btn\" href=\"mailto:${a.contact.email}?subject=${encodeURIComponent('Ihr Angebot \u00fcber KFL \u2013 Anfrage #' + r.number)}\">${icon('mail')}E-Mail</a>` : ''}</div>\n        ${['gewonnen', 'nicht_erreicht'].includes(a.status) ? html`<div class=\"row mt\"><button class=\"btn btn-ok btn-sm\" data-act=\"pcontact\" data-s=\"kontaktiert\">${icon('check')}Kunde erfolgreich kontaktiert</button><button class=\"btn btn-sm\" data-act=\"pcontact\" data-s=\"nicht_erreicht\">Kunde nicht erreicht</button></div>` : ''}\n        <button class=\"btn btn-sm btn-ghost\" data-act=\"pcontract\">${icon('file')}Vertragsunterlagen vorbereiten</button></section>` : ''}\n      <section class=\"block\"><div class=\"block-head\"><h2>Anfrage des Kunden</h2><span class=\"small muted\">${fDT(r.created_at)}</span></div><div class=\"block-body\">${kv(Object.entries(f).map(([k, v]) => [k === 'body' ? 'Sonstiges' : k, html`<span class=\"pre\">${v}</span>`]))}\n        <p class=\"tiny muted mt\">Name, E-Mail, Telefon und Anschrift des Kunden siehst du nach seiner Zusage.</p></div></section>\n      ${a.events && a.events.length ? html`<section class=\"block\"><div class=\"block-head\"><h2>Verlauf</h2></div><div class=\"block-body\"><ul class=\"timeline\">${a.events.map((e) => html`<li class=\"${/^KFL/.test(e.text || '') ? 'kfl' : ''}\"><div><div class=\"tl-meta\">${e.actor_name || 'KFL'} \u00b7 ${fDT(e.created_at)}</div><div>${e.text}</div></div></li>`)}</ul></div></section>` : ''}\n    </div><div class=\"stack\">${a.status === 'in_bearbeitung' && a.mine ? offerForm(a) : offerView}</div></div>`);\n}\nACT.ptake = async (b) => { await POST(`/requests/${b.dataset.id}/take`); toast('\u00dcbernommen \u2013 jetzt Angebot erstellen.'); await pcounts(); plast = null; preload(); };\nACT.prelease = async (b) => { if (!(await confirmBox('Anfrage wieder \u00f6ffnen?', 'Die Anfrage wird wieder f\u00fcr deine ganze Organisation sichtbar. Das wird vertraulich vermerkt.', 'Wieder \u00f6ffnen'))) return; await POST(`/requests/${b.dataset.id}/release`); toast('Wieder f\u00fcr dein Team ge\u00f6ffnet.'); location.hash = '#/anfragen'; };\nACT.pcontact = async (b) => {\n  const s = b.dataset.s;\n  const d = await ask({ title: s === 'kontaktiert' ? 'Kunde erfolgreich kontaktiert' : 'Kunde nicht erreicht', text: s === 'kontaktiert' ? 'Super! Kurze Notiz zum Stand (optional).' : 'Die KFL fragt beim Kunden nach, ob du dich gemeldet hast. Wie oft und wie hast du es versucht?', ok: 'Speichern', fields: field('Notiz', area('note', '', { rows: 3, req: s !== 'kontaktiert' })) });\n  if (!d) return; await POST(`/requests/${PA.id}/contact`, { status: s, note: d.note }); toast('Gespeichert.'); preload();\n};\nACT.pcontract = () => {\n  const a = PA, r = a.request, o = a.offer ? a.offer.data : {};\n  modal({ title: 'Vertragsunterlagen vorbereiten', wide: true, cls: 'printable', body: html`<p class=\"small muted\">Zusammenfassung f\u00fcr deinen Kauf-, Leasing- oder Finanzierungsvertrag. \u00dcbernimm die Daten in dein Vertragssystem oder speichere die Seite als PDF.</p>\n    <div class=\"grid-2 mt\"><div><h3>Kunde</h3>${kv([['Name', a.contact.name], ['Anschrift', [a.contact.street, [a.contact.zip, a.contact.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')], ['Telefon', a.contact.phone], ['E-Mail', a.contact.email], ['Kundenart', (r.fields || {}).Kundenart]])}</div>\n      <div><h3>Fahrzeug</h3>${kv([['Fahrzeug', r.vehicle], ['Zustand', r.zustand], ['Wunsch', r.summary], ['KFL-Anfrage', '#' + r.number]])}</div></div>\n    ${custConfig(r, o)}\n    <h3 class=\"mt-l\">Angebot</h3>${kv(offerRows(o).map(([k, v]) => (k === 'Konfiguration' ? [k, o.config === 'gleich' ? 'Wie vom Kunden angefragt (Konfiguration siehe oben)' : o.herstellercode ? `Alternative \u00b7 Herstellercode ${o.herstellercode}` : v] : k === 'Herstellercode' ? null : [k, v])).filter(Boolean))}`, foot: html`<button class=\"btn btn-ghost\" data-close>Schlie\u00dfen</button><button class=\"btn btn-dark\" data-act=\"pprint\">${icon('download')}Drucken / als PDF</button>` });\n};\n// Konfiguration laut Kundenanfrage (alle Angaben inkl. \u201eSonstiges\u201c) \u2013 f\u00fcr den Vertrag ausgeschrieben\nconst CFG_SKIP = /^(PLZ|Umkreis|Kontaktweg|Kundenart|Zustand|Formular|form|utf8|form_type|AGB akzeptiert|Datenschutz akzeptiert)$/i;\nfunction custConfig(r, o) {\n  const f = r.fields || {};\n  const rows = Object.entries(f).filter(([k, v]) => !CFG_SKIP.test(k) && String(v ?? '').trim() !== '').map(([k, v]) => [k === 'body' ? 'Sonstiges' : k, html`<span class=\"pre\">${v}</span>`]);\n  if (!rows.length) return '';\n  return html`<h3 class=\"mt-l\">${o.config === 'alternativ' ? 'Konfiguration laut Kundenanfrage (Angebot weicht ab)' : 'Konfiguration laut Kundenanfrage'}</h3>${o.config === 'gleich' ? html`<p class=\"small muted\">Das Angebot entspricht dieser Konfiguration.</p>` : ''}${kv(rows)}`;\n}\nACT.pprint = () => { document.body.classList.add('printing'); window.print(); setTimeout(() => document.body.classList.remove('printing'), 500); };\n\nfunction offerForm(a) {\n  const r = a.request, f = r.fields || {}, kind = a.kindHint;\n  const used = /gebraucht/i.test(r.zustand || '');\n  const service = !!f['Servicepaket Wartung & Inspektion'], kasko = !!f['Servicepaket Versicherung / Kasko'];\n  const km = numOf(f['Kilometer pro Jahr']), term = numOf(f.Laufzeit);\n  const vat = kind === 'finanzierung' ? 'brutto' : a.b2b ? 'netto' : 'brutto';\n  const money = (name, label, req, hint) => field(`${label}${req ? ' *' : ''} (${vat})`, inp(name, '', { req, ph: '0,00', attrs: 'inputmode=\"decimal\"' }), hint);\n  return html`<form class=\"block offer-form\" data-submit=\"psendOffer\"><div class=\"block-head\"><h2>Angebot erstellen</h2><span class=\"kind-pill\">${OFFER_KIND[kind]}</span></div><div class=\"block-body stack\">\n    <div class=\"pdf-drop\"><b>Angebot als PDF hochladen</b><span class=\"small muted\">Optional. Wir lesen die Eckdaten aus und tragen sie unten ein \u2013 bitte pr\u00fcfen. Der Kunde sieht das Angebot neutral ohne deine Firmendaten.</span>\n      <input type=\"file\" name=\"pdf\" accept=\"application/pdf\" data-change=\"pparsePdf\"><div id=\"sugg\"></div></div>\n    ${kind !== 'ankauf' ? html`<div class=\"field\"><span class=\"field-label\">Konfiguration *</span><div class=\"seg\"><label><input type=\"radio\" name=\"config\" value=\"gleich\" checked data-change=\"pconfig\"><span>Wie angefragt</span></label><label><input type=\"radio\" name=\"config\" value=\"alternativ\" data-change=\"pconfig\"><span>Alternative</span></label></div></div>\n      <div id=\"altBox\" class=\"stack hide\">${field('Herstellercode / Konfigurationscode', inp('herstellercode', '', { ph: 'z. B. AUDI-A4-XYZ123' }))}${field('Expos\u00e9 (PDF)', raw('<input type=\"file\" name=\"expose\" accept=\"application/pdf\">'))}</div>` : ''}\n    <div class=\"field\"><span class=\"field-label\">Entspricht die Ausstattung der Anfrage? *</span><div class=\"seg\"><label><input type=\"radio\" name=\"equipment_match\" value=\"ja\" required><span>Ja</span></label><label><input type=\"radio\" name=\"equipment_match\" value=\"nein\"><span>Nein</span></label></div></div>\n    <div class=\"grid-2\">\n      ${kind === 'kauf' ? money('price', 'Kaufpreis', true) : ''}\n      ${kind === 'leasing' ? html`${money('monthly_rate', 'Monatliche Rate', true, 'ohne Service- und Versicherungskosten')}${field('Kilometer pro Jahr *', inp('km_per_year', km, { req: true, attrs: 'inputmode=\"numeric\"' }), km ? `Kundenwunsch: ${fNum(km)} km \u2013 best\u00e4tigen oder Alternative eintragen` : '')}\n        ${field('Laufzeit in Monaten *', inp('term_months', term, { req: true, attrs: 'inputmode=\"numeric\"' }), term ? `Kundenwunsch: ${term} Monate` : '')}${money('down_payment', 'Sonderzahlung', false)}` : ''}\n      ${kind === 'finanzierung' ? html`${money('price', 'Kaufpreis', true)}${money('monthly_rate', 'Monatliche Rate', true)}${money('final_rate', 'Schlussrate', true)}${field('Laufzeit in Monaten *', inp('term_months', term, { req: true, attrs: 'inputmode=\"numeric\"' }))}${money('down_payment', 'Anzahlung', false)}` : ''}\n      ${kind === 'ankauf' ? html`${money('buy_price', 'Dein Ankaufpreis', true)}${field('Abholung / \u00dcbergabe', inp('pickup', '', { ph: 'z. B. Abholung beim Kunden m\u00f6glich' }))}` : ''}\n      ${kind !== 'ankauf' ? money('transfer_cost', '\u00dcberf\u00fchrung und Zulassung', false) : ''}\n      ${service ? money('service_cost', 'Servicepaket Wartung & Inspektion (mtl.)', true, 'Vom Kunden gew\u00fcnscht') : ''}${kasko ? money('insurance_cost', 'Versicherung / Kasko (mtl.)', true, 'Vom Kunden gew\u00fcnscht') : ''}\n      ${field('Lieferzeit / Verf\u00fcgbarkeit', inp('delivery', '', { ph: 'z. B. sofort, 8 Wochen' }))}${field('Angebot g\u00fcltig bis', inp('valid_until', addDays(todayISO(), 7), { type: 'date' }))}</div>\n    ${used || kind === 'ankauf' ? html`<fieldset><legend>Angaben zum Fahrzeug</legend><div class=\"grid-2\">${field('Erstzulassung', inp('first_registration', '', { ph: 'MM/JJJJ' }))}${field('Kilometerstand', inp('mileage', '', { attrs: 'inputmode=\"numeric\"' }))}\n      ${field('UPE (Neupreis, falls bekannt)', inp('upe', '', { attrs: 'inputmode=\"decimal\"' }))}${field('Vorbesitzer', inp('owners', '', { attrs: 'inputmode=\"numeric\"' }))}\n      <div class=\"field\"><span class=\"field-label\">Unfallfrei</span><div class=\"seg\"><label><input type=\"radio\" name=\"accident_free\" value=\"ja\"><span>Ja</span></label><label><input type=\"radio\" name=\"accident_free\" value=\"nein\"><span>Nein</span></label></div></div></div></fieldset>` : ''}\n    ${field('Anmerkungen f\u00fcr den Kunden', area('notes', '', { rows: 3, ph: 'Was macht dein Angebot besonders? z. B. Wartung inklusive, Winterr\u00e4der' }))}\n    <p class=\"tiny muted\">Preise ${vat === 'netto' ? 'netto (gewerblicher Kunde)' : 'brutto'}. Mit * markierte Felder sind Pflicht.</p>\n    <div class=\"sticky-submit\"><button class=\"btn btn-primary btn-block\" type=\"submit\">${icon('send')}Angebot senden</button></div></div></form>`;\n}\nCHANGE.pconfig = (el) => { $('#altBox').classList.toggle('hide', el.value !== 'alternativ'); };\nCHANGE.pparsePdf = async (el) => {\n  const file = await fileField(el, { max: 8 }); if (!file) return;\n  render('#sugg', html`<div class=\"sugg\">Wird ausgelesen \u2026</div>`);\n  const r = await POST(`/requests/${PA.id}/parse-pdf`, { base64: file.base64 });\n  const s = r.suggestions || {}, form = el.form; let n = 0;\n  for (const [k, v] of Object.entries(s)) { const i = form.elements[k]; if (i && !i.value) { i.value = typeof v === 'number' && !['km_per_year', 'term_months', 'mileage'].includes(k) ? v.toFixed(2).replace('.', ',') : v; n++; } }\n  render('#sugg', html`<div class=\"sugg\">${n ? `${plural(n, 'Feld', 'Felder')} aus der PDF \u00fcbernommen \u2013 bitte pr\u00fcfen.` : r.textFound ? 'Keine Eckdaten erkannt \u2013 bitte manuell eintragen.' : 'Die PDF enth\u00e4lt keinen lesbaren Text (z. B. Scan). Bitte Eckdaten manuell eintragen.'}</div>`);\n};\nSUBMIT.psendOffer = async (d, f) => {\n  const pdf = await fileField(f.elements.pdf, { max: 8 }), expose = f.elements.expose ? await fileField(f.elements.expose, { max: 8 }) : null;\n  const body = { ...d, pdf, expose, km_confirmed: d.km_per_year ? String(d.km_per_year) === String(numOf(PA.request.fields['Kilometer pro Jahr'])) : undefined, term_confirmed: d.term_months ? String(d.term_months) === String(numOf(PA.request.fields.Laufzeit)) : undefined };\n  if (!(await confirmBox('Angebot jetzt senden?', 'Nach dem Senden kannst du das Angebot nicht mehr \u00e4ndern. Die KFL wertet alle Angebote nach Ablauf der Frist aus.', 'Angebot senden'))) return;\n  await POST(`/requests/${PA.id}/offer`, body);\n  toast('Angebot gesendet \u2013 Daumen sind gedr\u00fcckt!'); await pcounts(); preload();\n};\n\n/* ===== Angebote, Statistik, Einstellungen, Support ===== */\nasync function pOffers() {\n  const V = ppage('angebote');\n  if (!isVL()) return V.show(empty('Diese Seite steht deiner Rolle nicht zur Verf\u00fcgung.'));\n  const d = await GET('/offers'); if (!V.alive()) return;\n  V.show(html`${phead('Angebote', 'Alle Angebote deiner Organisation. Jedes \u00d6ffnen wird als \u201eVertrauliche Information\u201c f\u00fcr die Gesch\u00e4ftsf\u00fchrung und die KFL vermerkt.')}\n    <section class=\"block\">${d.offers.length ? html`<div class=\"table-wrap\"><table class=\"table p-table\"><thead><tr><th>Anfrage</th><th>Fahrzeug</th><th>Von</th><th>Abgegeben</th><th>Status</th><th></th></tr></thead><tbody>\n      ${d.offers.map((o) => html`<tr><td class=\"strong num\">#${o.number}</td><td>${o.zustand || ''} ${o.brand || ''} ${o.model || ''}<span class=\"cell-sub\">${OFFER_KIND[o.kind] || o.kind}</span></td><td>${o.user_name || '\u2013'}</td><td>${fDT(o.created_at)}</td><td>${offerStatus(o.status)}<span class=\"cell-sub\">${o.aStatusLabel}</span></td>\n        <td class=\"r\"><button class=\"btn btn-sm\" data-act=\"pofferOpen\" data-id=\"${o.id}\">${icon('eye')}Ansehen</button></td></tr>`)}</tbody></table></div>` : html`<div class=\"block-body\">${empty('Noch keine Angebote', 'Sobald dein Team Angebote abgibt, erscheinen sie hier als Kopie.')}</div>`}</section>`);\n}\nACT.pofferOpen = async (b) => {\n  const d = await GET('/offers/' + b.dataset.id); const o = d.offer;\n  modal({ title: `Angebot zu #${o.number}`, wide: true, body: html`<div class=\"note-box\">${icon('eye')}<span>Vertrauliche Information: Das \u00d6ffnen wurde vermerkt.</span></div>\n    <div class=\"row-between mt\"><div><b>${o.brand} ${o.model}</b><div class=\"small muted\">${o.user_name} \u00b7 ${fDT(o.created_at)}</div></div>${offerStatus(o.status)}</div>\n    <div class=\"offer-price num mt\">${offerHeadline(o.data)}</div><div class=\"mt\">${kv(offerRows(o.data))}</div>\n    <div class=\"row mt\">${o.has_pdf ? html`<a class=\"btn btn-sm\" target=\"_blank\" rel=\"noopener\" href=\"${fileUrl(`/offers/${o.id}/file`)}\">${icon('file')}Angebots-PDF</a>` : ''}${o.has_expose ? html`<a class=\"btn btn-sm\" target=\"_blank\" rel=\"noopener\" href=\"${fileUrl(`/offers/${o.id}/file`, { which: 'expose' })}\">${icon('file')}Expos\u00e9</a>` : ''}</div>` });\n};\n\nasync function pStats() {\n  const V = ppage('statistik');\n  if (!isVL()) return V.show(empty('Die Statistik steht deiner Rolle nicht zur Verf\u00fcgung.'));\n  const q = hashQuery(); if (!q.from) { q.from = addDays(todayISO(), -29); q.to = todayISO(); }\n  const d = await GET('/stats', q); if (!V.alive()) return;\n  const t = d.totals, ac = d.accept;\n  V.show(html`${phead('Statistik', `${fDate(d.period.from)} \u2013 ${fDate(d.period.to)}${isGF() ? ' \u00b7 Gesamtauswertung deiner Organisation' : ''}`, isGF() ? html`<button class=\"btn\" data-act=\"preport\">${icon('download')}Bericht herunterladen</button>` : '')}\n    <section class=\"block\"><form class=\"toolbar\" data-submit=\"pstatFilter\">${[['7', 6], ['30', 29], ['90', 89]].map(([l, n]) => html`<a class=\"btn btn-sm ${q.from === addDays(todayISO(), -n) ? 'btn-dark' : 'btn-ghost'}\" href=\"#/statistik${qs({ ...q, from: addDays(todayISO(), -n), to: todayISO() })}\">${l} Tage</a>`)}\n      <span class=\"spacer\"></span><input type=\"date\" name=\"from\" value=\"${q.from}\" aria-label=\"Von\"><input type=\"date\" name=\"to\" value=\"${q.to}\" aria-label=\"Bis\">\n      ${sel('brand', d.filters.brands, q.brand, { empty: 'Alle Marken', attrs: 'aria-label=\"Marke\"' })}<input name=\"model\" value=\"${q.model || ''}\" placeholder=\"Modell\" size=\"8\" aria-label=\"Modell\">\n      ${isGF() ? sel('role', Object.entries(P.cfg.partnerRoles).map(([k, r]) => [k, r.label]), q.role, { empty: 'Alle Rollen', attrs: 'aria-label=\"Rolle\"' }) : ''}<button class=\"btn btn-sm btn-dark\" type=\"submit\">Anwenden</button></form>\n      <div class=\"pstats pstats-flat\"><div class=\"pstat\"><b>${fNum(t.received || 0)}</b><span>Anfragen erhalten</span></div><div class=\"pstat\"><b>${fNum(t.worked || 0)}</b><span>bearbeitet</span></div><div class=\"pstat ok\"><b>${fNum(t.won || 0)}</b><span>gewonnen</span></div><div class=\"pstat\"><b>${fNum(t.open || 0)}</b><span>in Bearbeitung</span></div>\n        <div class=\"pstat\"><b>${fNum(t.offers || 0)}</b><span>Angebote</span></div><div class=\"pstat\"><b>${fNum(t.lost || 0)}</b><span>nicht gew\u00e4hlt / gescheitert</span></div><div class=\"pstat\"><b>${fNum(t.missed || 0)}</b><span>verpasst (ohne Angebot)</span></div><div class=\"pstat hl\"><b>${t.offers ? Math.round(((t.won || 0) / t.offers) * 100) : 0} %</b><span>Erfolgsquote</span></div></div></section>\n    <div class=\"grid-2 mt\"><section class=\"block\"><div class=\"block-head\"><h2>Marken</h2></div><div class=\"block-body\">${hbars(d.brands.map((b) => ({ label: b.brand, value: b.n })))}</div></section>\n      <section class=\"block\"><div class=\"block-head\"><h2>Modelle</h2></div><div class=\"block-body\">${hbars(d.models.map((m) => ({ label: m.model, value: m.n })))}</div></section></div>\n    ${isGF() ? html`<section class=\"block mt\"><div class=\"block-head\"><h2>Angebote beim Kunden</h2></div><div class=\"pstats pst-3\"><div class=\"pstat ok\"><b>${fNum(ac.accepted || 0)}</b><span>angenommen</span></div><div class=\"pstat\"><b>${fNum(ac.rejected || 0)}</b><span>nicht gew\u00e4hlt / abgelehnt</span></div><div class=\"pstat hl\"><b>${fNum(ac.presented || 0)}</b><span>aktuell vorgestellt</span></div></div></section>` : ''}\n    ${d.team ? html`<section class=\"block mt\"><div class=\"block-head\"><h2>Team</h2><span class=\"small muted\">Wer \u00fcbernimmt, wie schnell und mit welchem Erfolg</span></div><div class=\"table-wrap\"><table class=\"table p-table\"><thead><tr><th>Name</th><th>Rolle</th><th class=\"r\">\u00dcbernommen</th><th class=\"r\">Angebote</th><th class=\"r\">Gewonnen</th><th class=\"r\">\u00d8 bis \u00dcbernahme</th><th class=\"r\">\u00d8 bis Angebot</th></tr></thead><tbody>\n      ${d.team.map((m) => html`<tr><td class=\"strong\">${m.name}</td><td>${(P.cfg.partnerRoles[m.role] || {}).label}</td><td class=\"r num\">${m.taken || 0}</td><td class=\"r num\">${m.offers || 0}</td><td class=\"r num\">${m.won || 0}</td><td class=\"r num\">${m.react_h != null ? fNum(m.react_h, 1) + ' h' : '\u2013'}</td><td class=\"r num\">${m.offer_h != null ? fNum(m.offer_h, 1) + ' h' : '\u2013'}</td></tr>`)}</tbody></table></div></section>` : ''}`);\n}\nSUBMIT.pstatFilter = (d) => setHashQuery(d, '#/statistik');\nACT.preport = async () => {\n  const d = await ask({ title: 'Bericht herunterladen', text: 'PDF-Bericht f\u00fcr deine Organisation oder eine Rolle.', ok: 'Herunterladen', fields: html`${field('Zeitraum', sel('days', [['30', 'Letzte 30 Tage'], ['60', 'Letzte 60 Tage']], '30'))}${field('Rolle', sel('role', Object.entries(P.cfg.partnerRoles).map(([k, r]) => [k, r.label]), '', { empty: 'Gesamte Organisation' }))}` });\n  if (!d) return; const a = document.createElement('a'); a.href = fileUrl('/report', { days: d.days, role: d.role }); a.download = ''; document.body.appendChild(a); a.click(); a.remove();\n};\nfunction setHashQuery(q, base) { const s = qs(q); if (base + s !== location.hash) location.hash = base + s; else preload(); }\n\nasync function pSettings(tab) {\n  const V = ppage('einstellungen');\n  const d = await GET('/settings'); if (!V.alive()) return;\n  const gf = isGF(); tab = tab || 'profil';\n  const tabs = ptabs([['profil', 'Mein Profil', '#/einstellungen'], ['organisation', 'Organisation', '#/einstellungen/organisation'], gf && ['team', 'Team', '#/einstellungen/team'], gf && ['rechnungen', 'Rechnungen', '#/einstellungen/rechnungen']], tab);\n  const o = d.org;\n  let body = '';\n  if (tab === 'profil') body = html`<div class=\"grid-2 mt\"><form class=\"block\" data-submit=\"pprofile\"><div class=\"block-head\"><h2>Profil</h2></div><div class=\"block-body stack\">${field('Name', inp('name', d.profile.name, { req: true }))}${field('Telefon', inp('phone', d.profile.phone))}${field('E-Mail', inp('email', d.profile.email, { attrs: 'disabled' }), '\u00c4nderung der E-Mail \u00fcber den Support.')}<button class=\"btn btn-dark\" type=\"submit\">Speichern</button></div></form>\n    <form class=\"block\" data-submit=\"ppassword\"><div class=\"block-head\"><h2>Passwort \u00e4ndern</h2></div><div class=\"block-body stack\">${field('Aktuelles Passwort', inp('current', '', { type: 'password', req: true }))}${field('Neues Passwort', inp('next', '', { type: 'password', req: true, attrs: 'minlength=\"10\"' }), PW_HINT)}${field('Wiederholen', inp('next2', '', { type: 'password', req: true }))}<button class=\"btn btn-dark\" type=\"submit\">Passwort \u00e4ndern</button></div></form></div>`;\n  if (tab === 'organisation') body = html`<div class=\"grid-2 mt\"><section class=\"block\"><div class=\"block-head\"><h2>${o.name}</h2></div><div class=\"block-body\">${kv([['Anschrift', [o.street, [o.zip, o.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')], ['Telefon', o.phone], ['E-Mail', o.email], ['Webseite', o.website], ['Marken', o.brands.includes('*') ? 'Alle Marken' : o.brands.join(', ')], ...(gf ? [['Abrechnung', o.billing_mode === 'monatlich' ? 'Monatliche Sammelrechnung' : 'Je Vermittlung'], d.terms && ['Zahlungsziel', `${d.terms.days} Tage ab Rechnungsdatum`], d.terms && ['Zahlungserinnerung', `kostenlos, neue Frist ${d.terms.reminderDays} Tage`], d.terms && ['Mahngeb\u00fchren', `1. Mahnung ${fEur(d.terms.fee1)} \u00b7 2. Mahnung ${fEur(d.terms.fee2)}`]].filter(Boolean) : [])])}<p class=\"small muted mt\">\u00c4nderungen an Stammdaten und Marken \u00fcber den Support.</p></div></section>\n    ${gf ? html`<form class=\"block\" data-submit=\"pbilling\"><div class=\"block-head\"><h2>Rechnungsdaten</h2></div><div class=\"block-body stack\">${field('Rechnungs-E-Mail', inp('billing_email', o.billing_email || o.email, { type: 'email', req: true }))}${field('Rechnungsempf\u00e4nger', inp('billing_name', o.billing_name, { ph: o.name }))}${field('Stra\u00dfe', inp('billing_street', o.billing_street, { ph: o.street }))}\n      <div class=\"grid-2\">${field('PLZ', inp('billing_zip', o.billing_zip, { ph: o.zip }))}${field('Ort', inp('billing_city', o.billing_city, { ph: o.city }))}</div><button class=\"btn btn-dark\" type=\"submit\">Speichern</button></div></form>\n      <form class=\"block span-2\" data-submit=\"popening\"><div class=\"block-head\"><h2>\u00d6ffnungszeiten</h2><span class=\"small muted\">Samstag z\u00e4hlt nur bei \u00d6ffnung zu den Fristen.</span></div><div class=\"block-body tight\"><table class=\"table\"><tbody>${P.cfg.weekdays.map((w) => { const v = o.opening[w]; return html`<tr><td class=\"strong\">${P.cfg.weekdayLabels[w]}</td><td>${chk('open_' + w, !!v, 'ge\u00f6ffnet')}</td><td><input type=\"time\" name=\"from_${w}\" value=\"${v ? v[0] : '08:00'}\" aria-label=\"von\"></td><td><input type=\"time\" name=\"to_${w}\" value=\"${v ? v[1] : '18:00'}\" aria-label=\"bis\"></td></tr>`; })}</tbody></table>\n        <div class=\"block-body\"><button class=\"btn btn-dark\" type=\"submit\">\u00d6ffnungszeiten speichern</button></div></div></form>` : ''}</div>`;\n  if (tab === 'team' && gf) body = html`<div class=\"info-box mt\">${icon('shield')}<span>Rollen\u00e4nderungen, neue Konten und L\u00f6schungen pr\u00fcft das KFL-Support-Team und best\u00e4tigt sie. Du bekommst eine Nachricht, sobald die \u00c4nderung aktiv ist.</span></div>\n    <section class=\"block mt\"><div class=\"block-head\"><h2>Konten deiner Organisation</h2><button class=\"btn btn-sm btn-dark\" data-act=\"padduser\">${icon('plus')}Konto beantragen</button></div>${d.users.map((u) => html`<div class=\"rq\"><span class=\"avatar\">${initials(u.name)}</span><div><div class=\"rq-t\">${u.name}</div><div class=\"rq-s\"><span>${u.email}</span><span>${(P.cfg.partnerRoles[u.role] || {}).label}</span><span>${u.last_login ? 'zuletzt ' + fDT(u.last_login) : 'noch nicht angemeldet'}</span></div></div>\n      <div class=\"row\">${u.id !== P.user.id ? html`<button class=\"btn btn-sm\" data-act=\"prole\" data-id=\"${u.id}\" data-role=\"${u.role}\" data-name=\"${u.name}\">Rolle \u00e4ndern</button><button class=\"btn btn-sm btn-ghost\" data-act=\"pdeluser\" data-id=\"${u.id}\" data-name=\"${u.name}\">L\u00f6schen</button>` : html`<span class=\"small muted\">Du</span>`}</div></div>`)}</section>\n    ${d.pending.length ? html`<section class=\"block mt\"><div class=\"block-head\"><h2>Offene Antr\u00e4ge</h2></div>${d.pending.map((t) => html`<a class=\"rq\" href=\"#/support/${t.id}\"><span class=\"fi-mark\">${icon('clock')}</span><div><div class=\"rq-t\">${t.subject}</div><div class=\"rq-s\">beantragt ${fDT(t.created_at)}</div></div>${badge('wird gepr\u00fcft', 'warn')}</a>`)}</section>` : ''}\n    <section class=\"block mt\"><div class=\"block-body row-between\"><span class=\"small muted\">Organisation vollst\u00e4ndig l\u00f6schen? Das kann nur die KFL nach R\u00fccksprache durchf\u00fchren.</span><button class=\"btn btn-sm btn-ghost\" data-act=\"pdelorg\">L\u00f6schung beantragen</button></div></section>`;\n  if (tab === 'rechnungen' && gf) body = html`<section class=\"block mt\">${d.invoices.length ? html`<div class=\"table-wrap\"><table class=\"table p-table\"><thead><tr><th>Rechnung</th><th>Datum</th><th>F\u00e4llig</th><th class=\"r\">Betrag</th><th>Status</th><th></th></tr></thead><tbody>${d.invoices.map((i) => { const open = ['offen', 'teilbezahlt'].includes(i.status); return html`<tr><td class=\"strong num\">${i.number}</td><td>${fDate(i.issue_date)}</td><td>${fDate(i.due_date)}</td><td class=\"r num\">${fEur(i.gross + i.fees)}</td>\n      <td>${badge(i.status === 'bezahlt' ? 'Bezahlt' : open && i.due_date < todayISO() ? '\u00dcberf\u00e4llig' : i.status === 'teilbezahlt' ? 'Teilbezahlt' : i.status === 'storniert' ? 'Storniert' : 'Offen', i.status === 'bezahlt' ? 'ok' : open && i.due_date < todayISO() ? 'err' : 'info')}${i.dunning_level ? html`<span class=\"cell-sub\">Mahnstufe ${i.dunning_level}</span>` : ''}</td>\n      <td class=\"r\"><a class=\"btn btn-sm\" target=\"_blank\" rel=\"noopener\" href=\"${fileUrl(`/invoices/${i.id}/pdf`)}\">${icon('file')}PDF</a></td></tr>`; })}</tbody></table></div>` : html`<div class=\"block-body\">${empty('Noch keine Rechnungen')}</div>`}</section>`;\n  V.show(html`${phead('Einstellungen')}${tabs}${body}`);\n}\nSUBMIT.pprofile = async (d) => { await PATCH('/settings/profile', d); P.user.name = d.name; toast('Profil gespeichert.'); preload(); };\nSUBMIT.ppassword = async (d, f) => { if (d.next !== d.next2) throw new Error('Die Passw\u00f6rter stimmen nicht \u00fcberein.'); await POST('/password', d); f.reset(); toast('Passwort ge\u00e4ndert.'); };\nSUBMIT.pbilling = async (d) => { await PATCH('/settings/org', d); toast('Rechnungsdaten gespeichert.'); preload(); };\nSUBMIT.popening = async (d) => { const opening = {}; for (const w of P.cfg.weekdays) opening[w] = d['open_' + w] ? [d['from_' + w], d['to_' + w]] : null; await PATCH('/settings/org', { opening }); toast('\u00d6ffnungszeiten gespeichert.'); preload(); };\nconst roleOpts = () => Object.entries(P.cfg.partnerRoles).map(([k, r]) => [k, r.label]);\nACT.prole = async (b) => { const d = await ask({ title: `Rolle von ${b.dataset.name} \u00e4ndern`, text: 'Die \u00c4nderung wird vom KFL-Support gepr\u00fcft.', ok: '\u00c4nderung beantragen', fields: html`${field('Neue Rolle', sel('role', roleOpts(), b.dataset.role))}${field('Anmerkung', area('note', '', { rows: 2 }))}` }); if (!d) return; await POST('/settings/users/request', { action: 'role', user_id: +b.dataset.id, role: d.role, note: d.note }); toast('Beantragt. Du bekommst Bescheid, sobald die \u00c4nderung aktiv ist.'); preload(); };\nACT.pdeluser = async (b) => { const d = await ask({ title: `Konto von ${b.dataset.name} l\u00f6schen?`, text: 'Die L\u00f6schung wird vom KFL-Support gepr\u00fcft und best\u00e4tigt.', ok: 'L\u00f6schung beantragen', danger: true, fields: field('Grund', area('note', '', { rows: 2 })) }); if (!d) return; await POST('/settings/users/request', { action: 'delete_user', user_id: +b.dataset.id, note: d.note }); toast('L\u00f6schung beantragt.'); preload(); };\nACT.padduser = async () => { const d = await ask({ title: 'Neues Konto beantragen', text: 'Nach Best\u00e4tigung durch die KFL bekommt die Person eine Einladung per E-Mail.', ok: 'Beantragen', fields: html`${field('Name', inp('name', '', { req: true }))}${field('E-Mail', inp('email', '', { type: 'email', req: true }))}${field('Telefon', inp('phone'))}${field('Rolle', sel('role', roleOpts(), 'vt'))}` }); if (!d) return; delete d._form; await POST('/settings/users/request', { action: 'add_user', ...d }); toast('Beantragt.'); preload(); };\nACT.pdelorg = async () => { const d = await ask({ title: 'L\u00f6schung der Organisation beantragen', text: 'Das KFL-Team meldet sich bei dir, um die L\u00f6schung abzustimmen.', ok: 'Antrag senden', danger: true, fields: field('Grund', area('note', '', { rows: 3, req: true })) }); if (!d) return; await POST('/settings/users/request', { action: 'delete_org', note: d.note }); toast('Antrag gesendet.'); };\n\nconst PT_STATUS = { neu: ['Eingegangen', 'accent'], in_bearbeitung: ['In Bearbeitung', 'info'], wartet: ['Wartet auf dich', 'warn'], erledigt: ['Erledigt', 'ok'] };\nasync function pSupport(id) {\n  const V = ppage('support');\n  if (id) {\n    const d = await GET('/tickets/' + id); if (!V.alive()) return;\n    const t = d.ticket;\n    return V.show(html`${phead(`#${t.id} \u00b7 ${t.subject}`, `${t.category || ''} \u00b7 ${fDT(t.created_at)}`, badge(...(PT_STATUS[t.status] || [t.status])), ['#/support', 'Support'])}\n      <section class=\"block\"><div class=\"block-body\"><div class=\"thread\">${d.messages.map((m) => html`<div class=\"msg ${m.author_type === 'staff' ? '' : 'me'}\"><div class=\"msg-meta\"><b>${m.author_type === 'staff' ? (m.author_name || 'KFL Support') + ' \u00b7 KFL' : m.author_name}</b><span>${fDT(m.created_at)}</span></div><div class=\"pre\">${m.text}</div></div>`)}</div></div>\n      ${t.status !== 'erledigt' ? html`<form class=\"composer\" data-submit=\"preply\"><input type=\"hidden\" name=\"id\" value=\"${t.id}\">${area('text', '', { rows: 3, req: true, ph: 'Deine Antwort \u2026' })}<div class=\"row\"><span class=\"small muted\">Geschlossen wird das Ticket vom KFL-Support.</span><span class=\"spacer\"></span><button class=\"btn btn-primary\" type=\"submit\">${icon('send')}Antworten</button></div></form>` : html`<div class=\"block-body small muted\">Dieses Ticket ist erledigt. F\u00fcr ein neues Anliegen erstelle bitte ein neues Ticket.</div>`}</section>`);\n  }\n  const d = await GET('/tickets'); if (!V.alive()) return;\n  V.show(html`${phead('Support', isGF() ? 'Deine Tickets und die deiner Organisation. Tickets der Gesch\u00e4ftsf\u00fchrung haben automatisch hohe Priorit\u00e4t.' : 'Fragen, Probleme oder W\u00fcnsche? Das KFL-Team hilft dir.', html`<button class=\"btn btn-primary\" data-act=\"pnewTicket\">${icon('plus')}Neues Ticket</button>`)}\n    <section class=\"block\">${d.tickets.length ? d.tickets.map((t) => html`<a class=\"rq\" href=\"#/support/${t.id}\"><span class=\"fi-mark\">${icon(t.kind === 'aenderung' ? 'users' : 'support')}</span><div><div class=\"rq-t\">${t.subject}</div><div class=\"rq-s\"><span>#${t.id}</span><span>${t.category || ''}</span><span>${plural(t.messages, 'Nachricht', 'Nachrichten')}</span><span>${fRel(t.updated_at || t.created_at)}</span></div></div>${badge(...(PT_STATUS[t.status] || [t.status]))}</a>`)\n      : html`<div class=\"block-body\">${empty('Noch keine Tickets', 'Schreib uns \u2013 wir antworten per E-Mail und hier im Dashboard.')}</div>`}</section>`);\n}\nACT.pnewTicket = async () => {\n  const d = await ask({ title: 'Neues Ticket', ok: 'Senden', fields: html`${field('Betreff', inp('subject', '', { req: true }))}${field('Thema', sel('category', ['Anfrage / Angebot', 'Rechnung', 'Konto und Zugang', 'Technisches Problem', 'Feedback', 'Sonstiges'], 'Anfrage / Angebot'))}${field('Anfragenummer (optional)', inp('request_number', '', { ph: 'z. B. 1023', attrs: 'inputmode=\"numeric\"' }))}${field('Nachricht', area('text', '', { rows: 5, req: true }))}` });\n  if (!d) return; delete d._form; const r = await POST('/tickets', d); toast('Ticket gesendet.'); location.hash = '#/support/' + r.id;\n};\nSUBMIT.preply = async (d, f) => { await POST(`/tickets/${d.id}/reply`, { text: d.text }); f.reset(); toast('Antwort gesendet.'); preload(); };\n\n/* ===== Routen ===== */\nRouter\n  .on(/^#\\/einladung\\/([0-9a-f]{64})/, (t) => pinvite(t))\n  .on(/^#\\/?(\\?.*)?$/, () => pStart())\n  .on(/^#\\/notizen/, () => pNotes())\n  .on(/^#\\/anfragen\\/(\\d+)/, (id) => pRequest(id))\n  .on(/^#\\/anfragen(\\?.*)?$/, () => pRequests())\n  .on(/^#\\/angebote/, () => pOffers())\n  .on(/^#\\/news/, () => pNews())\n  .on(/^#\\/statistik/, () => pStats())\n  .on(/^#\\/einstellungen\\/?([a-z]*)/, (t) => pSettings(t))\n  .on(/^#\\/support\\/(\\d+)/, (id) => pSupport(id))\n  .on(/^#\\/support/, () => pSupport());\nRouter.fallback = () => { location.hash = '#/'; };\nconst _presolve = Router.resolve.bind(Router);\nRouter.resolve = async function () { if (/^#\\/einladung\\//.test(location.hash)) return _presolve(); if (P.user && P.user.consentsOk) return _presolve(); return pboot(); };\n// Login-Seite zeigt Social-Links: Sitzung (inkl. Links) zuerst laden\nrun(async () => { if (/^#\\/einladung\\//.test(location.hash)) { await ploadSession().catch(() => {}); return _presolve(); } return pboot(); });\n</script></body></html>\n";

/* ===== 99-index.js ===== */
/* ============================================================
   KFL Plattform 2.0 (Cloudflare Worker)
   POST /            Formular-Eingang der Webseite
   /admin            Internes Dashboard          /api/\u2026   Schnittstelle intern
   /partner          Partner-Dashboard           /papi/\u2026  Schnittstelle Partner
   POST /my/\u2026        Kundenbereich \u201eMeine Anfragen\u201c (signiert vom Shopify-Theme)
   /c/\u2026              Kunden-Links aus E-Mails (R\u00fcckfrage, Bewertung)
   Cron alle 5 Min.  Fristen, Auswertung, Support, Backup, Mahnungen, Abschl\u00fcsse
   ============================================================ */

function pageResponse(html) {
  const nonce = randomHex(16);
  return new Response(html.replace(/__NONCE__/g, nonce), { headers: {
    'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store',
    'Content-Security-Policy': `default-src 'self'; script-src 'nonce-${nonce}'; style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; frame-src 'self' blob:; object-src 'self' blob:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'`,
    'X-Frame-Options': 'DENY', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()', ...SEC_HEADERS } });
}

async function jobDue(db, key, period) {
  const row = await DB.one(db, 'SELECT last_run FROM jobs WHERE key = ?', key);
  return !row || row.last_run !== period;
}
async function jobDone(db, key, period, result) { await DB.run(db, 'INSERT OR REPLACE INTO jobs (key, last_run, last_result) VALUES (?, ?, ?)', key, period, JSON.stringify(result ?? null).slice(0, 2000)); }

async function runJobs(ctx, { force } = {}) {
  const s = await settingsOf(ctx);
  ctx.actor = ctx.actor || { type: 'system', id: null, name: 'System' };
  const res = {};
  const safe = async (name, fn) => { try { res[name] = await fn(); } catch (e) { res[name] = 'Fehler: ' + e.message; console.log('Job ' + name, e.stack || e.message); } };
  await safe('anfragen', () => runRequestJobs(ctx));
  await safe('archiv', async () => { const r = await ctx.db.prepare("UPDATE assignments SET archived = 1 WHERE archived = 0 AND status IN ('geschlossen','verloren','gescheitert') AND updated_at < ?").bind(isoOf(nowMs() - 24 * 3600e3)).run(); return r.meta ? r.meta.changes : 0; });
  await safe('support', () => runSupportJobs(ctx));
  const p = berlinParts(nowMs()), day = berlinDate(nowMs()), hm = p.h * 60 + p.mi;
  // Backup t\u00e4glich ab 0:01 (Berliner Zeit)
  if (force === 'backup' || (hm >= (s.backup_hour * 60 + s.backup_minute) && await jobDue(ctx.db, 'backup', day))) {
    await safe('backup', () => createBackup(ctx, { kind: force === 'backup' ? 'manuell' : 'auto' }));
    await safe('aufbewahrung', () => retentionJobs(ctx));
    await jobDone(ctx.db, 'backup', day, res.backup);
  }
  // Automatische Mahnungen t\u00e4glich ab 8:00
  if (force === 'mahnung' || (hm >= 8 * 60 && await jobDue(ctx.db, 'mahnung', day))) { await safe('mahnung', () => runDunningJobs(ctx)); await jobDone(ctx.db, 'mahnung', day, res.mahnung); }
  // Tagesabschluss zur eingestellten Uhrzeit
  const [ch, cm] = String(s.day_close_time || '18:00').split(':').map((x) => toInt(x, 0));
  if (force === 'tagesabschluss' || (hm >= ch * 60 + cm && await jobDue(ctx.db, 'tagesabschluss', day))) { await safe('tagesabschluss', () => runDayClose(ctx)); await jobDone(ctx.db, 'tagesabschluss', day, res.tagesabschluss); }
  // Finanzbuchhaltung: Monatsabschluss am 1. (ab 1:00 Uhr) f\u00fcr den Vormonat, Jahresabschluss am 1. Januar
  if (force === 'fibu' || (hm >= 60 && await jobDue(ctx.db, 'fibu', day))) { await safe('fibu', () => runFibuJobs(ctx, { force: force === 'fibu' })); await jobDone(ctx.db, 'fibu', day, res.fibu); }
  // Sammelrechnungen am letzten Tag des Monats
  const month = day.slice(0, 7);
  const isLast = p.d === lastDayOfMonth(p.y, p.m);
  if (force === 'monat' || (isLast && p.h >= toInt(s.monthly_run_hour, 23) && await jobDue(ctx.db, 'monatsrechnung', month))) { await safe('monatsrechnung', () => runMonthlyInvoices(ctx)); await jobDone(ctx.db, 'monatsrechnung', month, res.monatsrechnung); }
  return res;
}

// Einmalige \u00dcbernahme aus der Datenbank des alten Dashboards (Binding OLD_DB)
async function importOldDatabase(ctx) {
  const old = ctx.env.OLD_DB;
  need(old, 400, 'Keine alte Datenbank verbunden (Binding OLD_DB).');
  const have = await DB.val(ctx.db, 'SELECT COUNT(*) FROM requests');
  need(!have, 409, 'Im neuen System sind bereits Anfragen vorhanden \u2013 Import nur in eine leere Datenbank m\u00f6glich.');
  const counts = {};
  for (const [tbl, cols] of [['requests', ['id', 'type', 'status', 'priority', 'assignee_id', 'customer_name', 'email', 'phone', 'brand', 'model', 'vehicle', 'summary', 'customer_account', 'page', 'data', 'created_at', 'updated_at']],
    ['notes', ['id', 'request_id', 'user_id', 'text', 'created_at']], ['events', ['id', 'request_id', 'user_id', 'action', 'detail', 'created_at']],
    ['users', ['id', 'email', 'name', 'role_key', 'pass_hash', 'pass_salt', 'active', 'invite_hash', 'invite_expires', 'failed_logins', 'locked_until', 'created_at', 'last_login']]]) {
    const rows = (await old.prepare(`SELECT ${cols.join(', ')} FROM ${tbl}`).all()).results || [];
    for (const r of rows) await ctx.db.prepare(`INSERT OR REPLACE INTO ${tbl} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`).bind(...cols.map((c) => r[c] ?? null)).run();
    counts[tbl] = rows.length;
  }
  for (const [o, n] of Object.entries(OLD_ROLE_MAP)) if (o !== n) await DB.run(ctx.db, 'UPDATE users SET role_key = ? WHERE role_key = ?', n, o);
  for (const [o, n] of Object.entries(OLD_STATUS_MAP)) if (o !== n) await DB.run(ctx.db, "UPDATE requests SET status = ? WHERE status = ? AND type IN ('deal','sell')", n, o);
  await DB.run(ctx.db, 'UPDATE requests SET deleted = 0, billed = 0 WHERE deleted IS NULL');
  for (const r of await DB.all(ctx.db, "SELECT id, type, data FROM requests WHERE type IN ('deal','sell')")) {
    const c = requestColumns(r.type, jparse(r.data, {}));
    await DB.update(ctx.db, 'requests', r.id, { brand: c.brand, model: c.model, vehicle: c.vehicle, plz: c.plz, city: c.city, zustand: c.zustand, pay_kind: c.pay_kind, budget: c.budget, radius_km: 0 });
  }
  await migrateOldTickets(ctx.db);
  const maxId = await DB.val(ctx.db, 'SELECT MAX(id) FROM requests');
  if (maxId) await DB.run(ctx.db, "INSERT OR REPLACE INTO sqlite_sequence (name, seq) VALUES ('requests', ?)", maxId);
  return counts;
}

// Einmalige automatische \u00dcbernahme der Altdaten beim ersten Start mit leerer Datenbank (Binding OLD_DB)
let autoImportDone = false;
async function autoImport(ctx) {
  if (autoImportDone || !ctx.env.OLD_DB) return;
  if (await rawSetting(ctx.db, '_old_import')) { autoImportDone = true; return; }
  const have = (await DB.val(ctx.db, 'SELECT COUNT(*) FROM requests')) + (await DB.val(ctx.db, 'SELECT COUNT(*) FROM users'));
  let result = { uebersprungen: 'Datenbank war nicht leer' };
  if (!have) {
    const actor = ctx.actor; ctx.actor = { type: 'system', id: null, name: 'System' };
    try { result = await importOldDatabase(ctx); } catch (e) { result = { fehler: e.message }; console.log('Altdaten-Import', e.stack || e.message); }
    await audit(ctx, 'altdaten_importiert', 'system', null, result);
    ctx.actor = actor;
  }
  await setRawSetting(ctx.db, '_old_import', JSON.stringify({ at: nowIso(), result }));
  autoImportDone = true;
}

async function makeCtx(request, env, url) {
  const ip = request ? clientIp(request) : '';
  let origin = url ? url.origin : (env.PUBLIC_ORIGIN || '');
  if (!url && !origin) origin = (await rawSetting(env.DB, '_origin')) || '';
  if (url && !(await rawSetting(env.DB, '_origin'))) await setRawSetting(env.DB, '_origin', url.origin);
  return { env, db: env.DB, request, origin, ipHash: ip ? (await sha256Hex('kfl-ip:' + ip)).slice(0, 24) : null, actor: null };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (!env.DB) return new Response('KFL Plattform: D1-Datenbank (Binding "DB") fehlt.', { status: 503 });
      await migrate(env.DB);
      const ctx = await makeCtx(request, env, url);
      await autoImport(ctx);
      const p = url.pathname;
      if (p === '/' && (request.method === 'POST' || request.method === 'OPTIONS')) return await handleForm(ctx);
      if (p.startsWith('/my/')) return await handleMy(ctx, url);
      if (p.startsWith('/c/')) return await handleCustomerLinks(ctx, url);
      if (p === '/admin' || p === '/admin/') return pageResponse(STAFF_HTML);
      if (p === '/partner' || p === '/partner/') return pageResponse(PARTNER_HTML);
      if (p.startsWith('/api/')) return await handleStaffApi(ctx, url);
      if (p.startsWith('/papi/')) return await handlePartnerApi(ctx, url);
      if (p === '/health') return out({ ok: true, version: APP_VERSION });
      if (p === '/') return Response.redirect(url.origin + '/partner', 302);
      return new Response('Nicht gefunden', { status: 404 });
    } catch (e) {
      if (e instanceof HttpError) {
        const origin = request.headers.get('Origin') || '';
        const extra = (url.pathname === '/' || url.pathname.startsWith('/my/')) ? formCors(origin) : {};
        return out({ ok: false, error: e.message }, e.status, extra);
      }
      console.log('Fehler', e && e.stack || e);
      return out({ ok: false, error: 'Interner Fehler' }, 500);
    }
  },
  async scheduled(event, env, ctx) {
    if (!env.DB) return;
    await migrate(env.DB);
    const c = await makeCtx(null, env, null);
    c.actor = { type: 'system', id: null, name: 'System' };
    await autoImport(c);
    ctx.waitUntil(runJobs(c));
  }
};
