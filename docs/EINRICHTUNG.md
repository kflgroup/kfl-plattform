# KFL Plattform 2.0 – Einrichtung und Go-live

Die Plattform läuft als ein einziger Cloudflare Worker (`kfl-plattform`):

| Adresse | Inhalt |
|---|---|
| `/admin` | Internes Dashboard der KFL GbR |
| `/partner` | Partner-Dashboard (mobil optimiert) |
| `POST /` | Formular-Dienst für kfl-group.com (Traumwagen-DEAL, Auto verkaufen, Support, Widerruf, Partner) |
| `POST /my/…` | „Meine Anfragen“ im Shop: Anfragen, Angebote, „Interessiert mich“ |
| `/c/…` | Links aus Kunden-E-Mails (Rückfrage Ja/Nein, Umfrage) |

Der bisherige Worker `tiny-lab-d971kfl-forms` läuft unverändert weiter, bis die neue Plattform freigeschaltet ist.

## 1. Datenbank anlegen (einmalig, ca. 1 Minute)

1. Cloudflare-Dashboard → **Storage & Databases → D1 SQL Database → Create**.
2. Name `kfl-plattform`, **Location: Jurisdiction „European Union (EU)“** (Daten bleiben in der EU, DSGVO).
3. Die angezeigte **Database ID** in `wrangler.toml` bei `database_id` eintragen (oder an Claude schicken).

Die Tabellen legt der Worker beim ersten Aufruf selbst an.

## 2. Worker aus GitHub verbinden (Workers Builds)

1. Workers & Pages → **Create → Import a repository** → GitHub-Konto `kflgroup` → Repository `kfl-plattform`.
2. Build command: leer lassen. Deploy command: `npx wrangler deploy`. Root: `/`.
3. Jeder Push auf `main` baut und veröffentlicht automatisch (der Build läuft über `node build.mjs`).

## 3. Tarif

Workers **Paid** (5 USD/Monat). Der kostenlose Tarif erlaubt nur 10 ms Rechenzeit pro Aufruf – zu wenig für Passwort-Prüfung, PDF-Rechnungen, Backups und den Import.

## 4. Secrets hinterlegen

Worker `kfl-plattform` → Einstellungen → **Variablen und Secrets** → jeweils als **Secret**:

| Name | Inhalt |
|---|---|
| `FORM_SECRET` | **derselbe** Schlüssel wie im Shopify-Snippet `kfl-config` (Formulare und „Meine Anfragen“ sind damit signiert) |
| `APP_SECRET` | neuer Zufallsschlüssel, mind. 32 Zeichen (signierte Links, Server-Verschlüsselung) |
| `SETUP_TOKEN` | frei gewählter Einmal-Schlüssel für die Ersteinrichtung |
| `BREVO_API_KEY` | API-Schlüssel von Brevo für den E-Mail-Versand |
| `SHOPIFY_ADMIN_TOKEN` | optional: Admin-API-Token (Lesezugriff Bestellungen) für die Webshop-Statistik |
| `SHOPIFY_SHOP` | optional, Standard `3r1qns-2d.myshopify.com` |
| `CF_API_TOKEN`, `CF_ACCOUNT_ID` | optional: Systemcode zusätzlich im täglichen Backup |

Variable (kein Secret): `PUBLIC_ORIGIN` = Adresse des Workers, z. B. `https://kfl-plattform.<konto>.workers.dev` oder später `https://dashboard.kfl-group.com`.

**E-Mail-Absender in Brevo bestätigen:** `rechnung@`, `noreply@`, `vermittlung@` und `support@kfl-group.com` (bzw. die ganze Domain `kfl-group.com` mit SPF/DKIM).

## 5. Ersteinrichtung

1. `https://<worker>/admin` öffnen → **Ersteinrichtung** mit dem `SETUP_TOKEN` → erstes Admin-Konto anlegen.
2. **Verwaltung → Einstellungen:** Firmendaten (Steuernummer/USt-IdNr., IBAN – Pflicht für Rechnungen und SEPA), Links (`link_staff`, `link_partner`, `link_public`), Preise je Vermittlung, Tagesabschluss.
3. **Verwaltung → Einstellungen → Bereichspasswort** ändern (Startwert ist das Passwort aus der Vorgabe, nur als Hash gespeichert).
4. **Backup → Backup-Passwort** festlegen.
5. **Verwaltung → System → Daten aus dem alten Dashboard** importieren (Anfragen, Notizen, Verlauf, Support-Fälle).
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
