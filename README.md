# KFL Plattform 2.0

Internes Dashboard, Partner-Dashboard und Formular-Dienst der KFL GbR – ein Cloudflare Worker mit D1-Datenbank, ohne Fremdpakete.

- **Internes Dashboard** (`/admin`): Anfragen mit automatischer Verteilung nach Marke und Umkreis, Angebotsauswertung, Buchhaltung (Rechnungen, Sammelrechnungen, Mahnwesen, Eingangsrechnungen, Lieferanten, SEPA-Zahlungslisten), Geschäftspartner, Statistik inkl. Webshop, Support mit Tags, News & Chat, Urlaub/Vertretung, Verwaltung, Backup und Protokoll (zusätzlich passwortgeschützt).
- **Partner-Dashboard** (`/partner`): mobil optimiert, Anfragen übernehmen (vorher nur Neu/Gebraucht, PLZ, Entfernung), Angebot abgeben (inkl. PDF-Auslesen), Stoppuhr für Fristen, Wochenziel, Statistik und Berichte, Team- und Rechnungsverwaltung für Geschäftsführer.
- **Formular-Dienst**: Anfragen von kfl-group.com, „Meine Anfragen“ mit Angeboten und „Interessiert mich“.

Rollen intern: Admin, Geschäftsführung, Teamleitung, Vertrieb, Buchhaltung (+ individuelle Sonderrechte durch den Admin). Partner: Geschäftsführer, Verkaufsleitung, Vertriebler.

## Aufbau

```
src/          Server (Konfiguration, Datenbank, Engine, Buchhaltung, Support, Backup/Statistik, Schnittstellen)
ui/           Oberflächen: common.*, staff.* + ui/staff/*.js, partner.* + ui/partner/*.js
build.mjs     baut dist/worker.js (Oberflächen eingebettet, nur ASCII)
test/         e2e.mjs (Backend), serve.mjs (lokaler Server), ui-flow.mjs (Klicktests), harness.mjs
theme/        Shopify-Theme-Dateien (Umkreis, „Meine Anfragen“ mit Angeboten)
docs/         Einrichtung und Go-live
```

Einrichtung: siehe [docs/EINRICHTUNG.md](docs/EINRICHTUNG.md).
