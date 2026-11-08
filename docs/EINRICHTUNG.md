# KFL Plattform 2.0 – Einrichtung und Go-live

Die Plattform läuft als ein einziger Cloudflare Worker und **ersetzt das bisherige Dashboard unter derselben Adresse** (Worker `tiny-lab-d971kfl-forms`, `https://tiny-lab-d971kfl-forms.black-lake-b0cd.workers.dev`):

| Adresse | Inhalt |
|---|---|
| `/admin` | Internes Dashboard der KFL GbR |
| `/partner` | Partner-Dashboard (mobil optimiert) |
| `POST /` | Formular-Dienst für kfl-group.com (Traumwagen-DEAL, Auto verkaufen, Support, Widerruf, Partner) |
| `POST /my/…` | „Meine Anfragen“ im Shop: Anfragen, Angebote, „Interessiert mich“ |
| `/c/…` | Links aus Kunden-E-Mails (Rückfrage Ja/Nein, Umfrage) |

Beim ersten Start mit der neuen, leeren Datenbank übernimmt die Plattform automatisch alle Daten aus der bisherigen Datenbank `kfl-dashboard` (Konten mit ihren Passwörtern, Anfragen, Notizen, Verlauf, alte Support-Formulare als Tickets). Die alte Datenbank bleibt unverändert erhalten.

## 1. Datenbank anlegen (einmalig, ca. 1 Minute)

1. Cloudflare-Dashboard → **Storage & Databases → D1 SQL Database → Create**.
2. Name `kfl-plattform`, **Location: Jurisdiction „European Union (EU)“** (Daten bleiben in der EU, DSGVO).
3. Die **Database ID** steht in `wrangler.toml` (`f2b0e0e7-538e-4af4-8a3a-ac761029dfa4`, angelegt am 25.10.2026).

Die Tabellen legt der Worker beim ersten Aufruf selbst an.

## 2. Worker aus GitHub verbinden (Workers Builds)

1. Claude-GitHub-App für das Repository `kflgroup/kfl-plattform` installieren (damit Claude Änderungen hochladen kann): https://github.com/apps/claude/installations/select_target
2. Cloudflare → Workers & Pages → Worker `tiny-lab-d971kfl-forms` → **Einstellungen → Build → Verbinden** → GitHub → Repository `kfl-plattform`, Branch `main`.
3. Build command: leer lassen. Deploy command: `npx wrangler deploy`. Root: `/`.
4. Jeder Push auf `main` baut und veröffentlicht automatisch (der Build läuft über `node build.mjs`).

## 3. Tarif

Workers **Paid** (5 USD/Monat). Der kostenlose Tarif erlaubt nur 10 ms Rechenzeit pro Aufruf – zu wenig für Passwort-Prüfung, PDF-Rechnungen, Backups und den Import.

## 4. Secrets hinterlegen

Worker `tiny-lab-d971kfl-forms` → Einstellungen → **Variablen und Secrets** → jeweils als **Secret**:

| Name | Inhalt |
|---|---|
| `FORM_SECRET` | ist schon hinterlegt (derselbe Schlüssel wie im Shopify-Snippet `kfl-config`) – bleibt beim Deploy erhalten |
| `APP_SECRET` | eigener Zufallsschlüssel, mind. 32 Zeichen (signierte Links, Server-Verschlüsselung; Umstellung automatisch, siehe 5g) |
| `SETUP_TOKEN` | nur nötig, falls die Datenbank leer startet (ohne Altdaten) |
| `SMTP_USER` | E-Mail-Postfach für den Versand: `noreplay@kfl-group.com` (IONOS) |
| `SMTP_PASS` | Passwort dieses IONOS-Postfachs |
| `SMTP_PASS_VERMITTLUNG`, `SMTP_PASS_SUPPORT` | optional: Passwörter der Postfächer vermittlung@, support@ (Rechnungen gehen immer über noreplay@, Antworten an info@) (sonst wird über noreplay@ mit passender Antwortadresse gesendet) |
| `BREVO_API_KEY` | optional: Alternative zum Postfach (Brevo) |
| `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET` | Shopify-App aus dem Dev Dashboard für Kunden, Besucher und Webshop-Statistik (siehe 5f) |
| `SHOPIFY_ADMIN_TOKEN` | nur für alte, vor 2026 im Shopify-Admin angelegte Apps (statt Client-ID/Secret) |
| `SHOPIFY_SHOP` | optional, Standard `3r1qns-2d.myshopify.com` |
| `CF_API_TOKEN`, `CF_ACCOUNT_ID` | optional: Systemcode zusätzlich im täglichen Backup |

Variable (kein Secret): `PUBLIC_ORIGIN` = Adresse des Workers, z. B. `https://kfl-plattform.<konto>.workers.dev` oder später `https://dashboard.kfl-group.com`.

**E-Mail-Versand:** Bei IONOS das Postfach `noreplay@kfl-group.com` anlegen, dann `SMTP_USER` und `SMTP_PASS` als Secret setzen. Server `smtp.ionos.de`, Port 587 (STARTTLS) – Änderung über `SMTP_HOST`/`SMTP_PORT` möglich. Prüfen unter **Verwaltung → Einstellungen → E-Mail-Versand → Test senden**. Einladungen an Geschäftspartner (Einzelhändler und Organisationen) gehen beim Anlegen direkt per E-Mail von noreplay@ raus.

## 5. Ersteinrichtung

1. `https://tiny-lab-d971kfl-forms.black-lake-b0cd.workers.dev/admin` öffnen und mit dem **bisherigen Admin-Zugang** anmelden (Konten werden automatisch übernommen).
2. **Verwaltung → Einstellungen:** Firmendaten (Steuernummer/USt-IdNr., IBAN – Pflicht für Rechnungen und SEPA), Links (`link_staff`, `link_partner`, `link_public`), Preise je Vermittlung, Tagesabschluss.
3. **Verwaltung → Einstellungen → Bereichspasswort** ändern (Startwert ist das Passwort aus der Vorgabe, nur als Hash gespeichert).
4. **Backup → Backup-Passwort** festlegen.
5. Altdaten prüfen (passiert automatisch beim ersten Start; Eintrag „altdaten importiert“ im Protokoll).
6. Mitarbeiter anlegen (Einladung per E-Mail), Geschäftspartner mit Marken, Öffnungszeiten und Konten anlegen, Einladungen senden.

## 5b. Buchungsvorlagen (seit 07.11.2026)

- **Finanzbuchhaltung → Buchung erfassen:** erst **Belegart** wählen (Eingangsrechnung, Quittung, Kontoauszug, Ausgangsrechnung, Vertrag), dann den **Vorgang**. Soll, Haben und USt werden automatisch gesetzt und bleiben änderbar. Darunter steht eine Vorschau mit allen Buchungszeilen.
- 21 Vorgänge, z. B. Eingangsrechnung per Bank/bar/Reverse Charge (§ 13b), Bankgebühren, Privateinlage/-entnahme, Bareinzahlung, USt-Vorauszahlung, Miete, Versicherung, Abo.
- **Weiterleitungen statt Doppelbuchungen:** „Eingangsrechnung noch nicht bezahlt“ öffnet „Eingangsrechnung erfassen“. „Zahlungseingang zu einer KFL-Rechnung“ und „Rechnung aus dem Dashboard“ führen zu den Ausgangsrechnungen.
- **Aussteller merken:** Pro Aussteller oder Lieferant merkt sich das System Vorgang, Kostenart und USt der letzten Buchung und schlägt sie beim nächsten Mal vor.
- Neue Konten (werden beim ersten Aufruf automatisch angelegt): 1577 Vorsteuer § 13b, 1787 USt § 13b, 1780 USt-Vorauszahlungen, 4360 Versicherungen. Die Kennzahl „USt-Zahllast offen“ berücksichtigt § 13b und die Vorauszahlungen.
- **Gesellschafter** (`FIBU_PARTNERS`): Tobias Krusch (Festkapital 0870, Privateinlagen 1891, Privatentnahmen 1801) und Rene Lipownik (0871, 1892, 1802). Unter Kontoauszug gibt es je Gesellschafter die Vorlagen „Kapitaleinlage“, „Privateinlage“ und „Privatentnahme“, unter Sonstiger Beleg die Korrektur „Umbuchung: Privateinlage → Kapitaleinlage“.
- Vorlagen pflegen: `FIBU_TEMPLATES` in `src/00-config.js`. Kontenzuordnung bitte einmal mit der Steuerberatung abstimmen.

## 5c. Partner-Dashboard: News und Inzahlungnahme (seit 07.11.2026)

- **News-Zähler:** Öffnet, übernimmt oder bearbeitet ein Partner eine Anfrage (Angebot, Kontaktstatus, Ankauf zusätzlich), werden die News zu dieser Anfrage automatisch als gelesen markiert. Übernimmt jemand die Anfrage, verschwindet „Neue Anfrage“ auch bei den Kolleginnen und Kollegen.
- **Inzahlungnahme über zwei Formulare:** Schickt ein Kunde einen Traumwagen-DEAL mit „Inzahlungnahme: Ja“ und (vorher oder bis zu 30 Tage später) „Mein Auto verkaufen“, werden beide Anfragen automatisch verknüpft. Der Partner sieht dann in der Traumwagen-Anfrage „Ankauf zusätzlich übernehmen“ und bekommt einen Hinweis in den News.
- **Ankauf zusätzlich übernehmen** klappt jetzt auch, wenn die eigene Ankauf-Zuordnung schon verfallen war. Sie wird mit neuer Frist wieder geöffnet und direkt übernommen.

## 5d. Mehrere Belege je Buchung (seit 07.11.2026)

- **Buchung öffnen → „Beleg hinzufügen“:** Eine oder mehrere PDFs auf einmal (max. 8 MB je Datei), mit Belegart und Notiz. Jede Datei wird nummeriert archiviert und an die Buchung angehängt.
- Das geht jederzeit, auch bei stornierten Buchungen und in abgeschlossenen Zeiträumen, weil sich dabei keine Beträge ändern. Jedes Anhängen steht im Protokoll.
- Die Buchungsliste zeigt den ersten Beleg und „+N weitere“. Die Suche findet Buchungen auch über die Nummer eines zusätzlichen Belegs.

## 5e. Eigene Adressen (seit 07.11.2026)

- **dashboard.kfl-group.com** zeigt direkt das interne Dashboard, **partner.kfl-group.com** das Partner-Dashboard. `/admin` und `/partner` leiten jeweils zur passenden Adresse weiter.
- Voraussetzung: kfl-group.com läuft als Zone bei Cloudflare (Nameserver bei IONOS umgestellt). Danach im Worker unter **Einstellungen → Domains & Routes → Custom Domain** beide Adressen hinzufügen.
- Danach unter **Verwaltung → Einstellungen → Links:** `link_staff` = `https://dashboard.kfl-group.com`, `link_partner` = `https://partner.kfl-group.com`. Damit stehen die neuen Adressen auch in E-Mails und Einladungen.
- Die alte workers.dev-Adresse funktioniert weiter. Formulare des Shops und „Meine Anfragen“ bleiben unverändert.
- Andere Namen: Variablen `STAFF_HOST` / `PARTNER_HOST` im Worker setzen.

## 5f. Kunden: Besucher und Kundendatenbank (seit 08.11.2026)

- Neuer Menüpunkt **Kunden** mit zwei Reitern:
  - **Besucher & Herkunft:** Besucher der aktuellen Stunde und der letzten 24 Stunden, Besucher und Sitzungen pro Stunde, Tag oder Woche. Dazu Herkunft (Direkt, Suchmaschine, Social Media …), Orte, Einstiegsseiten, Geräte sowie Warenkorb, Kasse, Bestellungen und Conversion-Rate. Quelle sind die Shopify-Analysen, mit wenigen Minuten Verzögerung.
  - **Kundendatenbank:** alle Shopify-Kunden mit Name, E-Mail, Telefon und Adresse, Bestellungen, Umsatz und Anfragen. Suche, Filter (Konto, Einwilligungen, Käufer, Newsletter) und Kundenakte mit allen Adressen, Bestellungen und Anfragen.
- **Einwilligungen je Kunde:** AGB, Widerrufsbelehrung, Datenschutz und Weitergabe an Partner kommen aus den Formularen der Webseite, mit Version und Zeitpunkt. Der vorzeitige Beginn bei digitalen Inhalten kommt aus der Warenkorb-Checkbox an der Bestellung, der Newsletter-Status aus Shopify. Bei der Kontoerstellung selbst fragt Shopify (neue Kundenkonten) keine AGB ab.
- **Datenschutz:** Kundendaten werden live aus Shopify abgerufen und nicht in der Datenbank der Plattform gespeichert. Suchen und das Öffnen einer Kundenakte stehen im Protokoll.
- **Rechte:** „Kundendatenbank sehen“ haben Admin, Geschäftsführung, Teamleitung und Vertrieb, „Besucherzahlen sehen“ Admin und Geschäftsführung. Beides ist pro Rolle anpassbar.
- **Shop verbinden (einmalig):**
  1. Shopify-Admin → Shopname oben rechts → **Dev Dashboard** → **App erstellen** („KFL Dashboard“).
  2. Unter **Versionen** die Zugriffe `read_customers`, `read_orders`, `read_reports` wählen und **geschützte Kundendaten** (Name, E-Mail, Telefon, Adresse) freigeben. Version freigeben.
  3. App auf dem Shop installieren.
  4. Unter **Einstellungen** Client-ID und Secret kopieren und im Worker als Secrets `SHOPIFY_CLIENT_ID` und `SHOPIFY_CLIENT_SECRET` hinterlegen.
- Technik: `src/36-shopify.js`, Token per Client-Credentials-Verfahren (24 Stunden gültig, nur im Arbeitsspeicher), Admin API 2026-10, Test `test/kunden.mjs`.

## 5g. Bestätigung im Kundenkonto und APP_SECRET (seit 08.11.2026)

- **Hinweis für angemeldete Kunden** (Theme-Section `kfl-account-consent` im Footer-Bereich, Skript `assets/kfl-account-consent.js`): Wer im Shop angemeldet ist und für die aktuelle Version der Rechtstexte (`kfl-config` → `legal`) noch keine Bestätigung abgegeben hat, sieht einmalig ein Fenster. Darin bestätigt er die AGB, nimmt die Widerrufsbelehrung zur Kenntnis und bestätigt, die Datenschutzerklärung gelesen zu haben. Mit „Später“ kommt der Hinweis erst in der nächsten Sitzung wieder. Auf Formularseiten mit eigenen Einwilligungen erscheint er nicht.
- Gespeichert wird in `customer_consents` (Kundennummer, Art, Version, Text, Zeitpunkt, IP nur als Hash). Die Einträge werden nie überschrieben, nur ergänzt. Sie dienen als Nachweis nach Art. 7 Abs. 1 DSGVO und erscheinen in der Kundendatenbank. Bei einer neuen Version der Rechtstexte wird erneut nachgefragt.
- **APP_SECRET:** eigener Zufallsschlüssel für Server-Verschlüsselung und signierte Links, getrennt vom `FORM_SECRET` des Themes. Nach dem Setzen verschlüsselt der nächste Cron-Lauf (spätestens 5 Minuten) Backup-Passwort und E-Mail-Zugang automatisch neu (Protokoll „schluessel_umgestellt“). Links aus älteren E-Mails bleiben gültig. Erzeugen z. B. im Mac-Terminal mit `openssl rand -base64 48` und direkt als Geheimnis `APP_SECRET` in Cloudflare einfügen.

## 6. Shop umstellen (Go-live)

Im Theme **„KFL 2027 – Neuer Auftritt“** sind bereits enthalten (rückwärtskompatibel mit dem alten Worker):
- Umkreis-Auswahl (25/50/100/200 km/Deutschlandweit) in Traumwagen-DEAL und Auto verkaufen
- Angebote in „Meine Anfragen“ mit „Interessiert mich“, Ablehnen und neutraler PDF
- Herkunft des Besuchs (`_src`, z. B. Instagram · Kampagne) – nur mit Statistik-Einwilligung

Zum Umschalten im Snippet `kfl-config` den `endpoint` auf die neue Worker-Adresse setzen und das Theme veröffentlichen.

## 7. Entwicklung und Tests

```bash
npm run build      # dist/worker.js bauen (nur ASCII, direkt kopierbar)
npm test           # Ende-zu-Ende-Test mit echter SQLite-Datenbank (200+ Prüfungen)
npm run serve      # lokaler Testserver mit Beispieldaten: http://localhost:8787/admin und /partner
npm run test:ui    # Klicktests beider Oberflächen (Playwright, Testserver muss laufen)
```

Testzugänge des lokalen Servers (nur lokal): `admin@kfl.de` / `AdminPass123`, Mitarbeiter `gf|tl|vt|bh@kfl.de` / `Passwort1234`, Partner `a_gf|a_vl|a_vt1@partner.de` / `Partner12345`.

## Noch offen / später

- Bereich **Support**: Feinkonzept folgt durch Tobias.
- **News für Partner**: Definition folgt laut Vorgabe.
- **Schulungsbereich** für Partner (Update); bis dahin wird die Erstschulung manuell angehakt.
- **Cloud-Ziel für Backups**: Webhook-URL in den Einstellungen; bis dahin Download im Bereich Backup.
- PDF-Anonymisierung: Eckdaten werden aus PDFs mit Text ausgelesen. Eine automatische Schwärzung von Logo/Anschrift in fremden PDFs ist technisch nicht zuverlässig – der Kunde sieht deshalb nur die strukturierten Eckdaten; das Team kann eine neutrale PDF hochladen.
