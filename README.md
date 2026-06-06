# Angelus Portal

> Privates Investorenportal der Angelus Group für professionelle Anleger.
> Mindestanlage €100.000 · Zugang nur per Einladungslink · Multi-Emittenten-fähig

Zentrale Dokumentation für Entwickler und Admins. Sie beschreibt das echte System
(Stand: Code-Analyse Juni 2026) — Architektur, Setup, Features, Datenbankschema,
Deployment und die in der Praxis gelernten Stolperfallen.

---

## Live-System

| | |
|---|---|
| Portal | https://www.unternehmerrente.app |
| Admin | https://www.unternehmerrente.app/admin |
| Hosting | Railway (Auto-Deploy bei Push auf `main`) |
| Status | Production, Live-Zahlungen aktiv |

---

## Emittenten (Multi-Brand)

Das Portal verwaltet Anleihen **zweier Firmen** auf **einer** Plattform:

| Emittent | `issuerKey` | Domain | Badge |
|---|---|---|---|
| Angelus Managementberatungs und Service KG | `angelus` | unternehmerrente.app | gelb |
| Angelus Alpha Beteiligungen GmbH | `angelus-alpha` | angelus-alpha.app | lila |

- **Investoren** sehen ALLE aktiven Anleihen beider Emittenten auf einer Seite (`bonds.list`), Badges unterscheiden den Emittenten.
- **Admin** (`bonds.listAll`) ist nach `VITE_BRAND` gefiltert — jede Marke sieht im Admin nur ihre eigenen Anleihen.
- Neue Anleihen erben den `issuerKey` automatisch aus `VITE_BRAND`, sofern nicht explizit gesetzt.
- Brand-Konfiguration zentral in [`shared/brand.ts`](shared/brand.ts) (Name, Logo, Domain, Kontakt-E-Mail, Issuer).
- Einladungs-E-Mails sind brand-aware (Name, Domain, Absender pro `issuerKey`).

`shared/brand.ts` löst die aktive Marke sowohl im Client (`import.meta.env.VITE_BRAND`)
als auch im Server (`process.env.VITE_BRAND`) auf und fällt auf `angelus` zurück.

---

## Tech Stack

Versionen exakt aus [`package.json`](package.json) (Node `>=20.11.0`, ES-Module):

| Bereich | Technologie | Version |
|---|---|---|
| Frontend | React | 19.2.1 |
| | TypeScript | 5.9.3 |
| | Tailwind CSS | 4.1.14 |
| | shadcn/ui (Radix UI) | diverse |
| | Routing | wouter 3.3.5 |
| | Forms | react-hook-form 7.64 + zod 4.1 |
| Backend | Express | 4.21.2 |
| | tRPC (client/server/react-query) | 11.6.0 |
| | Build (Server) | esbuild 0.25 |
| | Build (Client) | Vite 7.1.7 |
| Datenbank | MySQL (Railway) | — |
| | Drizzle ORM | 0.44.5 |
| | drizzle-kit | 0.31.4 |
| | mysql2 | 3.15.0 |
| | decimal.js (Geld-Arithmetik) | 10.6.0 |
| Auth | Clerk (`@clerk/express`) | 1.7.77 |
| | Clerk React | 5.61.3 |
| Payments | Stripe | 20.1.2 |
| E-Mail | Resend (deutsche Templates) | 6.7.0 |
| KI | Anthropic Claude API (REST, `claude-sonnet-4-20250514`) — Dokument-Extraktion | — |
| Files | Railway Volume `/app/uploads`, Multer-Upload | — |
| Package Manager | npm (Railway); pnpm lokal optional | — |

---

## Setup & lokale Entwicklung

```bash
git clone https://github.com/angelus200/angelus-portal.git
cd angelus-portal
npm install
cp .env.example .env   # Werte aus Railway/Clerk/Stripe Dashboard eintragen
npm run build          # Client (Vite) + Server (esbuild) nach dist/
npm run dev            # startet dist/index.js mit NODE_ENV=development
```

> **Windows:** Die Repo-Scripts nutzen `cross-env`, damit `NODE_ENV=...` auch in
> PowerShell/cmd funktioniert (Unix-Inline-Syntax bricht dort sonst). Siehe
> [Lessons Learned](#bekannte-eigenheiten-lessons-learned).

### npm-Scripts

| Script | Wirkung |
|---|---|
| `npm run dev` | Build-Output starten (`cross-env NODE_ENV=development node dist/index.js`) |
| `npm run build` | `vite build` (Client) **+** `esbuild server/_core/index.ts … --outdir=dist` (Server) |
| `npm start` | Produktionsstart (`cross-env NODE_ENV=production node dist/index.js`) |
| `npm run check` | `tsc --noEmit` (Typecheck) |
| `npm run format` | Prettier über das Repo |
| `npm test` | Vitest (Unit-/Integrationstests) |
| `npm run db:push` | `drizzle-kit generate && drizzle-kit migrate` |

`npm run dev` startet den **gebauten** Server — vor dem Start also `npm run build`
ausführen (oder nach Server-Änderungen erneut builden).

---

## Environment Variables

Variablennamen + Zweck (Werte aus den jeweiligen Dashboards — **niemals committen**).
Basis: [`.env.example`](.env.example).

| Variable | Zweck |
|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk Public Key (Client) |
| `CLERK_PUBLISHABLE_KEY` | Clerk Public Key (Server) |
| `CLERK_SECRET_KEY` | Clerk Secret (Server) |
| `DATABASE_URL` | MySQL-Connection-String (Railway) |
| `STRIPE_SECRET_KEY` | Stripe Secret (Server) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe Public Key (Client) |
| `STRIPE_WEBHOOK_SECRET` | Signatur-Secret für Stripe-Webhooks |
| `RESEND_API_KEY` | Resend (E-Mail-Versand) |
| `ANTHROPIC_API_KEY` | Claude API für KI-Dokumentenextraktion (**in `.env.example` ergänzen**) |
| `PORT` | Server-Port (Default `3000`) |
| `NODE_ENV` | `development` / `production` |
| `VITE_BRAND` | Aktive Marke: `angelus` (Default) \| `angelus-alpha` |
| `VITE_FRONTEND_URL` | Öffentliche URL Marke Angelus |
| `VITE_FRONTEND_URL_ALPHA` | Öffentliche URL Marke Angelus Alpha |
| `UPLOAD_PATH` | Upload-Basisverzeichnis (Default `/app/uploads`, Railway Volume) |

---

## Projektstruktur

```
angelus-portal/
├── client/src/
│   └── pages/
│       ├── admin/        Admin-Bereich (Dashboard, Bonds, Investors, Wallets, Steuern, …)
│       ├── investor/     Investor-Bereich (Dashboard, Subscribe, Wallet, MyInvestments, …)
│       ├── legal/        AML, Privacy, RiskDisclosure
│       └── *.tsx         Home, ForInvestors, SignIn/SignUp, RegisterWithInvitation, …
├── server/
│   ├── _core/            Framework-Kern (index.ts = Entrypoint, trpc, clerk-auth, env, vite)
│   ├── routers.ts        Haupt-tRPC-Router (bonds, subscriptions, investors, wallet, tax, …)
│   ├── adminRouter.ts    Admin-Dashboard-Procedures
│   ├── legacy*Router.ts  Bestandskunden (Verträge, Einladungen, Kunden)
│   ├── tax-service.ts    Kapitalertragsteuer-Berechnung (§ 32d EStG)
│   ├── wallet-service.ts Stripe-Checkout + Wallet-Logik
│   ├── interest-*.ts     Zinsberechnung Bestandskunden (act/365 + Strafzinsen)
│   ├── webhooks/stripe.ts Stripe-Webhook-Handler (idempotent)
│   ├── upload-*.ts       Multer-Upload + Storage (Railway Volume)
│   ├── email/            Resend-Templates (Einladungen)
│   └── *.test.ts         Vitest-Tests
├── drizzle/
│   ├── schema.ts          Kern-Tabellen (Users, Bonds, Subscriptions, Wallets, …)
│   ├── legacy-schema.ts   Bestandskunden-Tabellen
│   ├── interest-schema.ts Zins-Parameter + Berechnungen + Pläne
│   └── relations.ts       Drizzle-Relations
├── shared/brand.ts        Multi-Brand-Konfiguration
├── scripts/               Einmal-Skripte (z.B. set-clerk-templates.ts)
└── docs/                  Spezifikationen & Pläne
```

---

## Features

### Authentifizierung & Sicherheit
- Clerk mit Rollen-Enum `role`: **`user`** (= Investor), `admin`, `superadmin`.
- 2FA/TOTP-Pflicht für Admins (Admin-Bereich „Security").
- Privates Portal: Registrierung NUR per Einladungslink.
- **WICHTIG:** Investoren haben `role = 'user'`, **nicht** `'investor'`.
- Admin-Gate in tRPC: `adminProcedure` erlaubt nur `admin`/`superadmin`.

### Einladungssystem
Zwei getrennte Systeme:
- `invitations` — allgemeine Admin-Einladungen für neue Investoren (Token + `tokenHash`, `issuerKey`, 30 Tage).
- `legacy_customer_invitations` — Einladungen für Bestandskunden (Token, 7 Tage, `resendCount`).

### Wallet-System
- **Stripe-Einzahlung** via Checkout-Session + Webhook (`depositWithStripe`, Limits €1.000–€1.000.000).
- **Investment nur aus Wallet-Guthaben**: Bei `subscriptions.create` wird das Wallet
  belastet (`debitWalletForInvestment`); schlägt die Abbuchung fehl, wird die
  Subscription auf `cancelled` zurückgerollt.
- **Auszahlung mit Penalty**: `requestWithdrawal` berechnet eine vorzeitige
  Auszahlungs-Strafe; Auszahlungen brauchen **Admin-Genehmigung** (`approveWithdrawal`).
- **Crypto Cold Wallets**: Investor meldet Einzahlung per TX-Hash (`reportCryptoDeposit`),
  Admin bestätigt. Firmen-Adressen in `company_wallets` (BTC/ETH/USDT/USDC…).

### Anleihen & Investments
- Bonds-CRUD mit `issuerKey` (Multi-Emittent), Status `draft|active|closed|matured`.
- Mehrstufiger Subscribe-Flow mit KYC- und Risikoprofil-Gate
  (kein Investment ohne `kycStatus='verified'` und nicht-konservatives Risikoprofil).
- Consent-Logging (Terms + Risikohinweis, Timestamp + IP) bei Zeichnung.
- `payment_schedules` werden bei Bestätigung erzeugt.

### Kapitalertragsteuer (KeSt)
Implementiert in [`server/tax-service.ts`](server/tax-service.ts):
- KeSt 25 % + Soli 5,5 % (auf die KeSt) + Kirchensteuer 8 % (BY/BW) bzw. 9 %.
- **Reduzierter KeSt-Satz bei Kirchensteuerpflicht** (§ 32d Abs. 1 EStG):

  ```
  reduzierter KeSt-Satz = 0,25 / (1 + KiSt-Satz × 0,25)
  KiSt                  = reduzierter KeSt × KiSt-Satz
  Soli                  = KeSt × 0,055
  ```
- Freistellungsauftrag wird vor der Besteuerung abgezogen (gedeckelt auf den Kapitalertrag).
- 7 Steuerfelder pro Investor (`users`): `kirchensteuer`, `kirchensteuer_satz`,
  `steuer_nummer`, `steuer_id`, `finanzamt`, `familienstand`, `freistellungsauftrag`.
- Admin-Tab „Steuerdaten" mit Live-Vorschau (`tax.berechne`, public);
  Investor sieht aufklappbaren Netto-Auszahlungsplan (`tax.auszahlungsplan`) in MyInvestments.

### Bestandskunden (Legacy)
- act/365-Zinsberechnung + Strafzinsen bei Fehlbetrag (`interest_parameters`:
  `annual_interest_rate` 6 %, `default_interest_rate` 17 %, konfigurierbar).
- KI-Dokumentenextraktion via Anthropic Claude API (`legacyContractsRouter`,
  Modell `claude-sonnet-4-20250514`).
- Admin-UI mit Tabs: Zeichnungsschein, Einzahlungen, Zinsabschläge, Berechnung.

### Dokumentenverwaltung
- Railway Volume (`/app/uploads`, override `UPLOAD_PATH`), Multer-Upload.
- Ablagepfad: `/app/uploads/{category}/{userId}/{timestamp}_{filename}`.

### Weitere Module
- **Risikoprofil** (`risk_profiles`) — Fragebogen + Scoring + Compliance-Bestätigungen.
- **Profile-Check** (`profile_checks`) — öffentliche „Bin ich geeignet?"-Selbsteinschätzung vor Registrierung.
- **News** (`news`) — Ankündigungen, public/targeted.
- **Audit-Log** (`audit_logs`) — jede Admin-Aktion mit Actor, IP, Details.
- **Investor-Notizen** (`investor_notes`) — interne Admin-Notizen (Kategorie/Priorität/Pin).
- **Consent-Audit** (`consents`, `consent_logs`) — siehe [CONSENT_AUDIT_SYSTEM.md](CONSENT_AUDIT_SYSTEM.md).

---

## Datenbankschema

MySQL über Drizzle ORM. Tabellen nach Schema-Datei gruppiert.

**Kern — [`drizzle/schema.ts`](drizzle/schema.ts)**

| Tabelle | Beschreibung |
|---|---|
| `users` | Investoren + Admins (Stammdaten, Adresse, Firma, Bank, KYC, 7 Steuerfelder, `role`) |
| `risk_profiles` | Risikoprofil-Ergebnisse + Compliance-Bestätigungen + Consent |
| `bonds` | Anleihen/Angebote (Konditionen, Status, `issuer_key`, Kündigungsfristen) |
| `contract_templates` | Versionierte Vertragsvorlagen |
| `bond_contract_templates` | Zuordnung Vorlage ↔ Anleihe (erforderlich/Reihenfolge) |
| `subscriptions` | Zeichnungen (Investor ↔ Anleihe, Betrag, Status, Consent, Stripe-Refs) |
| `contracts` | Hochgeladene Vertragsdokumente |
| `payment_schedules` | Zins-/Tilgungstermine je Zeichnung (auch Crypto-Felder) |
| `company_wallets` | Firmen-Cold-Wallets (Crypto-Einzahladressen) |
| `wallets` | Investor-Wallets (Fiat + Crypto, Balance) |
| `wallet_transactions` | Wallet-Bewegungen (Ein-/Auszahlung, Penalty, Admin-Approval) |
| `news` | Ankündigungen |
| `audit_logs` | Compliance-Audit-Trail |
| `investor_notes` | Interne Admin-Notizen zu Investoren |
| `profile_checks` | Öffentliche Eignungs-Selbsteinschätzung (pre-registration) |
| `consents` | Einwilligungen (Checkbox-Acknowledgments) |
| `consent_logs` | Audit-Trail jeder Consent-Aktion |
| `invitations` | Allgemeine Einladungen (Token, `issuer_key`, 30 Tage) |
| `legacy_contracts` | Bestandskunden-Verträge (Zeichnungsscheine) |
| `legacy_payments` | Bestandskunden-Einzahlungen |
| `legacy_interest_payments` | Bereits ausgezahlte Zinsen (Bestandskunden) |
| `documents` | Datei-Uploads (KYC/Verträge/Zahlungen) |

**Bestandskunden — [`drizzle/legacy-schema.ts`](drizzle/legacy-schema.ts)**

| Tabelle | Beschreibung |
|---|---|
| `legacy_customers` | Bestandskunden mit DocuSign-Anleihen (Stammdaten, Vertrag, Zins, Steuer) |
| `legacy_customer_documents` | Dokumente je Bestandskunde (Vertrag, Hochrechnung, …) inkl. extrahierter Daten |
| `legacy_customer_interest_calculations` | Berechnete Zinsen je Periode (inkl. Steuerabzüge) |
| `legacy_customer_payment_history` | Zahlungshistorie Bestandskunden |
| `legacy_customer_invitations` | Einladungs-Tokens für Bestandskunden (7 Tage) |

**Zinsen — [`drizzle/interest-schema.ts`](drizzle/interest-schema.ts)**

| Tabelle | Beschreibung |
|---|---|
| `interest_parameters` | Globale, jederzeit änderbare Zins-/Steuer-/Rechenparameter (act/365, Default-/Strafzins) |
| `interest_calculations` | Audit-Trail aller Zinsberechnungen (Inputs, Steuern, Ergebnisse) |
| `payment_schedules` | Generierte Zahlungspläne je Berechnung (⚠️ Namensdoppelung, siehe Lessons Learned) |
| `payment_schedule_items` | Einzelne Zahlungspositionen eines Plans |

---

## Deployment

```bash
# Eiserne Regeln (siehe Workflow unten):
npx tsc --noEmit     # MUSS sauber sein (Typecheck)
npm run build        # MUSS erfolgreich sein (Client + Server)
git add -A && git commit -m "feat: Beschreibung auf Deutsch"
git push origin main # Railway Auto-Deploy (~60–90s)
# Danach: Browser Hard Refresh (Strg+Shift+R / Cmd+Shift+R)
```

Railway buildet via **npm**, startet `npm start` (`dist/index.js`). Im internen Log
erscheint `Server running on http://localhost:3000/` — das ist normal, Railway mappt
den Port nach außen.

---

## Workflow-Regeln (gelernt aus der Praxis)

### Eiserne Regeln
1. Build muss erfolgreich sein — niemals mit kaputtem Build committen.
2. Commit-Messages auf Deutsch, im Imperativ (`feat: …`, `fix: …`, `docs: …`).
3. Additiv, nicht destruktiv — Production-Daten sind heilig.
4. NIEMALS `git push --force` oder `git reset --hard`.
5. Root Cause vor Symptom — kein Trial-and-Error.
6. `git diff` zeigen + Freigabe abwarten vor Commit.

### tRPC-Pattern (Pflicht)
- `protectedProcedure` für alles Authentifizierte, `adminProcedure` für Admin-only.
- Zod-Validierung auf jedem Input.
- Jede schreibende Admin-Aktion erzeugt einen `audit_logs`-Eintrag (`createAuditLog`).
- Client: `isPending`-Doppelklick-Schutz, `onError`-Handler, Cache-Invalidierung.
- Array-Fallback: `const items = data || []`.

### Stripe-Webhooks
- **Idempotenz Pflicht** — Webhooks feuern mehrfach (Retry). Erst prüfen, ob die
  Session schon verarbeitet wurde, dann verarbeiten.
- `STRIPE_WEBHOOK_SECRET` zur Signaturprüfung.

### Externe Services
- Immer in `try/catch` wrappen — ein ausgefallener externer Dienst darf den User-Flow
  nicht brechen.
- **Ausnahme**: Payment-Flow — hier ist die Stripe-Antwort essenziell.

---

## Bekannte Eigenheiten (Lessons Learned)

1. **npm vs pnpm**: Railway nutzt npm, lokal geht beides — `pnpm` ist nicht überall installiert.
   Das `packageManager`-Feld in `package.json` ist insofern irreführend; lokal `npm install` verwenden.
2. **`role`-Enum**: Investoren haben `role = 'user'` (nicht `'investor'`!). Enum-Werte: `user|admin|superadmin`.
3. **decimal-Felder MySQL**: beim Lesen immer mit `Number()` casten (kommen als String).
4. **`mysqlEnum` statt `pgEnum`**: Das Projekt nutzt **MySQL**, nicht PostgreSQL.
5. **Clerk `verifyPassword`**: TypeScript-Cast `(user as any)` nötig (fehlt in den v5-Types).
6. **QR-Codes**: `api.qrserver.com` statt `qrcode.react` (CSP-Problem).
7. **Datum UTC-Offset**: MySQL zeigt Datum teils −1 Tag (UTC), die Berechnung bleibt korrekt.
8. **Zwei Einladungssysteme**: `invitations` (neu, 30 Tage) vs. `legacy_customer_invitations` (Bestandskunden, 7 Tage).
9. **`VITE_*`-Variablen**: Client via `import.meta.env`, Server via `process.env` —
   `shared/brand.ts` behandelt beide Pfade.
10. **Railway 504-Builds**: GitHub-Timeouts beim Nixpacks-Download → einfach Redeploy, kein Code-Fehler.
11. **Railway internes Log**: `Server running on http://localhost:3000/` ist normal — Railway mappt nach außen.
12. **Claude Code Login**: richtiger Anthropic-Account nötig (`grossdigitalpartner@gmail.com`), nicht andere Accounts.
13. **`tax-service`-Import im Frontend**: bei Live-Preview prüfen, ob Vite den Server-Import sauber bundelt.
14. **`NODE_ENV`-Scripts nutzen `cross-env`** (Commit `e51fefc`): Unix-Syntax `NODE_ENV=… node …`
    funktioniert auf Windows (PowerShell/cmd) nicht — `cross-env` vereinheitlicht das plattformübergreifend.
15. **Railway buildet mit npm, nicht pnpm**: Das `packageManager`-Feld ist irreführend; lokal `npm install` verwenden.
    (Ein versehentlich erzeugtes `package-lock.json` aus `npm install` gehört nicht ins Repo, wenn pnpm der Standard ist.)
16. **Windows-Entwicklung**: Repo unter `C:\Users\Admin\Projects\angelus-portal`; PowerShell-Syntax beachten,
    ein Befehl pro Eingabe (Multi-Line-Paste bricht in PowerShell).
17. **`git commit` unter Windows PS 5.1**: `-m` mit Umlauten/Quotes kann brechen — Commit-Message in eine
    Datei schreiben und mit `git commit -F <datei>` übergeben.
18. **Tabellenname `payment_schedules` doppelt definiert**: einmal in `drizzle/schema.ts` (je Zeichnung)
    und einmal in `drizzle/interest-schema.ts` (je Zinsberechnung). Beim Import/Query genau auf die
    richtige Quelle achten.

---

## Sicherheitsregeln

- API-Keys NIEMALS in Chat, Commits oder Screenshots — bei Leak sofort rotieren.
- DB-Zugangsdaten nur als ENV verwenden, nie hardcoden.
- Bei Kompromittierung: Key sofort im jeweiligen Dashboard rotieren
  (Railway / Clerk / Anthropic / Stripe / Resend).
- 2FA für alle Admin-Accounts Pflicht.
- Uploads sind auf PDF/JPG/PNG/DOCX begrenzt (max. 10 MB).

---

## Test-Daten

- Test-Investorin: **Siglinde Brigitte Brendel** (User ID 257, Contract ID 1).
- Stripe-Testkarte: `4242 4242 4242 4242` (nur im Test-Modus).
- Tests laufen mit `npm test` (Vitest); siehe `server/*.test.ts`.

---

## Weiterführende Docs

- [IMPLEMENTIERUNGSPLAN.md](IMPLEMENTIERUNGSPLAN.md)
- [INTEREST_CALCULATION_SPEC.md](INTEREST_CALCULATION_SPEC.md) — Zinsberechnungs-Spezifikation
- [LEGACY_CUSTOMER_STRUCTURE.md](LEGACY_CUSTOMER_STRUCTURE.md) — Bestandskunden-Datenmodell
- [CONSENT_AUDIT_SYSTEM.md](CONSENT_AUDIT_SYSTEM.md) — Consent-/Audit-Konzept
- [ONBOARDING_PLAN.md](ONBOARDING_PLAN.md)
- [TEST_BOND_SETUP.md](TEST_BOND_SETUP.md)
- [docs/WALLET-INVESTMENT-PLAN.md](docs/WALLET-INVESTMENT-PLAN.md)
- [docs/PHASE-1-IMPLEMENTATION-SUMMARY.md](docs/PHASE-1-IMPLEMENTATION-SUMMARY.md)
- [docs/investoren-profil-check-fragenkatalog.md](docs/investoren-profil-check-fragenkatalog.md)
- [todo.md](todo.md) · [ui_test_notes.md](ui_test_notes.md)

---

## Support & Kontakte

| | |
|---|---|
| Portal-Administration | office@angelus.group |
| Railway Dashboard | https://railway.app |
| Clerk Dashboard | https://dashboard.clerk.com |
| Stripe Dashboard | https://dashboard.stripe.com |

---

*Angelus Group · VERTRAULICH — nur für interne Nutzung*
