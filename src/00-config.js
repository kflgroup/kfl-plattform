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
  { key: 'acc_settings',      group: 'Buchhaltung', label: 'Zahlungsziel, Mahngebühren, Zahlungsbedingungen festlegen' },
  { key: 'acc_release',       group: 'Buchhaltung', label: 'Zahlungsliste freigeben (Bank-Export)' },
  // Geschäftspartner
  { key: 'partner_view',      group: 'Geschäftspartner', label: 'Geschäftspartner sehen' },
  { key: 'partner_manage',    group: 'Geschäftspartner', label: 'Geschäftspartner anlegen und bearbeiten' },
  { key: 'partner_terms',     group: 'Geschäftspartner', label: 'Konditionen je Partner (Zahlungsziel, Gebühren, Abrechnungsart)' },
  { key: 'partner_stats',     group: 'Geschäftspartner', label: 'Partner-Statistik sehen' },
  { key: 'partner_pw',        group: 'Geschäftspartner', label: 'Partner-Passwörter zurücksetzen' },
  { key: 'partner_delete',    group: 'Geschäftspartner', label: 'Organisationen und Partnerkonten löschen' },
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
  const vertrieb = ['req_view', 'req_edit', 'req_contact', 'req_message', 'req_spam_report', 'support_view', 'support_manage', 'partner_view'];
  const teamleitung = [...vertrieb, 'req_partner', 'req_assign', 'req_spam_confirm', 'req_status_force', 'team_stats', 'users_view', 'users_create_vt'];
  const buchhaltung = ['acc_view', 'acc_manage', 'acc_cancel', 'partner_view'];
  const gf = [...new Set([...teamleitung, ...buchhaltung, 'acc_settings', 'acc_release', 'partner_manage', 'partner_terms', 'partner_stats',
    'stats_view', 'stats_shop', 'support_changes', 'links_view', 'users_create', 'news_publish', 'news_partner'])];
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
const DUNNING_LEVELS = { 1: 'Zahlungserinnerung', 2: '1. Mahnung', 3: '2. Mahnung', 4: 'Letzte Mahnung' };

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
  mail_from_invoice: 'rechnung@kfl-group.com',
  mail_from_system: 'noreplay@kfl-group.com',
  mail_from_partner: 'vermittlung@kfl-group.com',
  mail_from_support: 'support@kfl-group.com',
  mail_from_customer: 'vermittlung@kfl-group.com',
  mail_sender_name: 'KFL – Kaufen Finanzieren Leasen',
  mail_internal_inbox: 'vermittlung@kfl-group.com',
  mail_support_inbox: 'support@kfl-group.com',
  // Anfragen
  offer_window_hours: 24,
  lock_hours: 4,
  contact_window_hours: 24,
  presented_count: 1,
  show_partner_identity: false,
  radius_options: [25, 50, 100, 200, 0],
  radius_default: 50,
  score_weight_price: 60,
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
  dunning_days_1: 3,
  dunning_days_2: 10,
  dunning_days_3: 10,
  dunning_days_4: 10,
  dunning_fee: 5,
  dunning_due_days: 7,
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
  support_ack_text: 'vielen Dank für deine Nachricht an den Support der KFL GbR. Deine Anfrage ist bei uns eingegangen und wir kümmern uns schnellstmöglich darum. Du bekommst unsere Antwort per E-Mail und – falls du ein Konto bei uns hast – zusätzlich in deinem Dashboard.',
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

// Einstellungen, die die Geschäftsführung ändern darf (sonst nur Admin)
const GF_SETTINGS = ['payment_terms_days', 'dunning_fee', 'dunning_auto', 'dunning_days_1', 'dunning_days_2', 'dunning_days_3', 'dunning_days_4',
  'lead_price_deal', 'lead_price_sell', 'vat_rate', 'vat_enabled', 'invoice_intro', 'invoice_footer'];
// Buchhaltung darf die Mahngebühr einstellen (laut Vorgabe „Manuell in den Einstellungen bei der Buchhaltung“)
const ACC_SETTINGS = ['dunning_fee'];

const WEEKDAYS = ['mo', 'di', 'mi', 'do', 'fr', 'sa', 'so'];
const WEEKDAY_LABELS = { mo: 'Montag', di: 'Dienstag', mi: 'Mittwoch', do: 'Donnerstag', fr: 'Freitag', sa: 'Samstag', so: 'Sonntag' };
const DEFAULT_OPENING = { mo: ['08:00', '18:00'], di: ['08:00', '18:00'], mi: ['08:00', '18:00'], do: ['08:00', '18:00'], fr: ['08:00', '18:00'], sa: null, so: null };

const BRANDS_TOP = ['Audi', 'BMW', 'Mercedes-Benz', 'Volkswagen', 'Skoda', 'Seat', 'Cupra', 'Opel', 'Ford', 'Hyundai', 'Kia', 'Toyota', 'Tesla', 'Porsche', 'Renault', 'Peugeot', 'Fiat', 'Volvo', 'Mazda', 'Nissan', 'Mini', 'Dacia', 'Citroen', 'Land Rover', 'Jaguar', 'Jeep', 'Alfa Romeo', 'BYD', 'MG', 'Polestar', 'Smart', 'Suzuki', 'Mitsubishi', 'Honda', 'Lexus', 'DS Automobiles', 'Lynk&Co', 'Subaru', 'Maserati', 'Ferrari', 'Lamborghini', 'Bentley', 'Rolls-Royce', 'Aston Martin', 'McLaren'];
