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
| `APP_SECRET` | neuer Zufallsschlüssel, mind. 32 Zeichen (signierte Links, Server-Verschlüsselung) |
| `SETUP_TOKEN` | nur nötig, falls die Datenbank leer startet (ohne Altdaten) |
| `SMTP_USER` | E-Mail-Postfach für den Versand: `noreplay@kfl-group.com` (IONOS) |
| `SMTP_PASS` | Passwort dieses IONOS-Postfachs |
| `SMTP_PASS_RECHNUNG`, `SMTP_PASS_VERMITTLUNG`, `SMTP_PASS_SUPPORT` | optional: Passwörter der Postfächer rechnung@, vermittlung@, support@ (sonst wird über noreplay@ mit passender Antwortadresse gesendet) |
| `BREVO_API_KEY` | optional: Alternative zum Postfach (Brevo) |
| `SHOPIFY_ADMIN_TOKEN` | optional: Admin-API-Token (Lesezugriff Bestellungen) für die Webshop-Statistik |
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
