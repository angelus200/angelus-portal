# Angelus Portal - Project TODO

## Phase 1: Setup & Foundation
- [x] Database schema (users, bonds, subscriptions, wallets, transactions, risk profiles, news)
- [x] Global styling with gold/black/white color palette
- [x] Base layout components

## Phase 2: Admin Dashboard
- [x] Admin authentication and role-based access
- [x] Bond management (create, edit, list bonds)
- [x] Investor management with import function (CSV)
- [x] Contract upload and management
- [x] Payment schedule management
- [x] News/content management
- [x] Wallet transaction overview and approval

## Phase 3: Investor Onboarding
- [x] Registration flow with email verification
- [x] KYC integration placeholder (Sumsub)
- [x] Risk profile questionnaire
- [x] Compliance checklists with checkboxes
- [x] Professional investor verification

## Phase 4: Investor Portal
- [x] Personalized investor dashboard
- [x] My investments overview
- [x] Interest and repayment schedule visualization
- [x] Document access and download
- [x] Profile management

## Phase 5: E-Wallet System
- [x] Fiat wallet (EUR deposits/withdrawals)
- [x] Crypto wallet (BTC, ETH, USDT)
- [x] Transaction history
- [x] Withdrawal request system
- [x] Balance display

## Phase 6: Subscription Process
- [x] Checkbox-based bond subscription (Swiss law compliant)
- [x] Consent logging (timestamp, IP address)
- [x] Risk acknowledgment flow
- [x] Subscription confirmation

## Phase 7: Additional Features
- [ ] Multi-language support (i18next)
- [ ] Chatbot UI placeholder
- [ ] Security headers and rate limiting
- [ ] 2FA for admin accounts

## Future Enhancements
- [ ] Google Translate API integration
- [ ] Full chatbot implementation
- [ ] External KYC provider integration
- [ ] Payment gateway integration

## Bugs
- [ ] Fix: "Unauthenticated - Missing Authorization Header" Fehler beim Zugriff auf geschützte Bereiche

## New Features
- [x] E-Mail/Passwort Login (zusätzlich zu Manus OAuth)
- [x] Registrierung mit E-Mail-Verifizierung
- [x] Passwort-Reset Funktion
- [x] Admin-Funktion: Investoren mit E-Mail/Passwort anlegen
- [x] Erweiterte Investoren-Daten: Persönliche Daten (Vorname, Nachname, Geburtsdatum, Steuernummer)
- [x] Erweiterte Investoren-Daten: Adresse (Straße, Hausnummer, PLZ, Ort)
- [x] Erweiterte Investoren-Daten: Firma (ja/nein, Firmenname, Register, Steuernummer)
- [x] Erweiterte Investoren-Daten: Bankverbindung (IBAN, BIC, Kontoinhaber)
- [x] Verbesserter CSV-Import für Investoren mit allen Feldern
- [x] Import von bestehenden Zeichnungen/Anleihen pro Investor
- [x] Import-Vorschau mit Validierung und Fehleranzeige
- [x] Beispiel-CSV-Template zum Download
- [x] Detaillierte Investor-Ansicht: Persönliche Daten Tab
- [x] Detaillierte Investor-Ansicht: Zeichnungen/Investments Tab
- [x] Detaillierte Investor-Ansicht: Dokumente Tab
- [x] Detaillierte Investor-Ansicht: Wallet/Transaktionen Tab
- [x] Detaillierte Investor-Ansicht: Aktivitätslog
- [x] Admin-Notizen: Datenbank-Tabelle für Investor-Notizen
- [x] Admin-Notizen: API-Endpunkte (erstellen, bearbeiten, löschen, auflisten)
- [x] Admin-Notizen: Notizen-Tab in der Investor-Detailansicht
- [x] Admin-Notizen: Kategorien (Allgemein, KYC, Compliance, Zahlung, Kommunikation)
- [x] Admin-Notizen: Prioritäten (Niedrig, Normal, Hoch, Dringend)
- [x] Admin-Notizen: Anheften-Funktion
- [x] CSV-Export: API-Endpunkt für Investoren-Export
- [x] CSV-Export: Alle persönlichen Daten, Adresse, Firma, Bank
- [x] CSV-Export: Zeichnungen und Investitionsbeträge pro Investor
- [x] CSV-Export: Export-Button in der Admin-Investoren-Übersicht
- [x] CSV-Export: Filteroptionen (KYC-Status, Investortyp)

## Landing Page Erweiterungen
- [x] Presse & Auszeichnungen Sektion auf Landing Page
- [x] Urkunde "Unternehmen der Zukunft" (diind) integriert
- [x] Forbes Artikel "Markenaufbau im Amazon-Zeitalter" verlinkt
- [x] Focus Online Artikel "Amazon Markenaufbau" verlinkt
- [x] Navigation um "Presse" Link erweitert
- [x] Scoredex Artikel "Angelus Group - Start-up-Finanzierung" zur Presse-Sektion hinzufügen
- [x] FAQ-Bereich auf Landing Page für Investoren
- [x] Accordion-Komponente für FAQ-Fragen
- [x] Navigation um FAQ-Link erweitern

## Rebranding & Rechtliche Anpassungen
- [x] Landing Page: "Investorenportal der Angelus Group" statt "Anleihenportal der Angelus KG"
- [x] Alle Texte: "Angelus Group" statt "Angelus KG" verwenden
- [x] FAQ/Risikohinweise: Neutraler formulieren bezüglich anwendbarem Recht
- [x] Impressum-Seite mit vollständigen rechtlichen Angaben erstellen
- [x] Kontaktdaten aktualisieren (Telefon: 0800 175 077 0, E-Mail: office@angelus.group)
- [x] Footer-Links zu Impressum verknüpfen

## Begriffe neutralisieren (regulatorisch)
- [x] "Anleihen" durch neutrale Begriffe ersetzen (Investitionsmöglichkeiten, Beteiligungen)
- [x] "Einlagen" durch "Guthaben" oder "Vermögenswerte" ersetzen
- [x] FAQ-Fragen umformulieren (keine Anleihen-Begriffe)
- [x] Hinweis auf prospektfreie Angebote und individuelle Vereinbarungen hinzufügen
- [x] Feature-Karten anpassen ("Attraktive Anleihen" → neutraler)

## FAQ Erweiterung & Trust Indicators
- [x] "Reguliert" aus Trust Indicators entfernen (Aufsicht) → "International tätig"
- [x] FAQ: Geschäftsbereiche der Angelus Group hinzufügen
- [x] FAQ: Unternehmensstruktur erklären (verschiedene Unternehmen, SPVs, Banken, Jurisdiktionen)

## Dashboard Begriffe neutralisieren
- [x] Admin Dashboard: "Anleihenportal" durch "Investorenportal" ersetzen
- [x] Sidebar Navigation: "Anleihen" durch "Beteiligungen" ersetzen
- [x] Dashboard-Karten und Statistiken anpassen
- [x] Investor Dashboard ebenfalls prüfen und anpassen
- [x] Admin Bonds.tsx: Alle Anleihe-Begriffe durch Angebot/Beteiligung ersetzen

## Investoren-Profil Check
- [x] InvestorProfileCheck Komponente erstellen
- [x] Multi-Step Wizard mit Fortschrittsanzeige
- [x] Abschnitt 1: Renditeerwartungen (2 Fragen)
- [x] Abschnitt 2: Kapitalverfügbarkeit & Timing (4 Fragen)
- [x] Abschnitt 3: Risiko-Realitätscheck mit Quiz (4 Fragen)
- [x] Abschnitt 4: Portfolio & Erfahrung (4 Fragen)
- [x] Abschnitt 5: Zusammenarbeit & Erwartungen (3 Fragen)
- [x] Ergebnisauswertung mit Profil-Kategorien
- [x] Risikomatrix Visualisierung
- [x] Integration auf Landing Page

## Profil-Check Datenbankintegration
- [x] Datenbank-Tabelle für Profil-Check-Ergebnisse erstellen
- [x] tRPC-Prozedur zum Speichern der Ergebnisse
- [x] tRPC-Prozedur zum Abrufen der Ergebnisse
- [x] Frontend: Ergebnisse nach Abschluss speichern
- [x] Bei Registrierung: Profil-Check-Daten mit User verknüpfen
- [x] Admin-Dashboard: Profil-Check-Ergebnisse anzeigen (tRPC-Prozedur vorhanden)

## Profil-Check Bug-Fixes
- [x] Optik des Dialogs verbessern (Abschnitt-Icons überlappen, Layout)
- [x] "Später fortfahren" Button funktioniert nicht (onClose Handler hinzugefügt)
- [x] "Jetzt registrieren" verwendet getLoginUrl() für OAuth-Registrierung

## Admin Verträge Bug-Fix
- [x] Fehler beim Anlegen eines neuen Vertrags beheben (unexpected error)

## Admin Profil-Checks Seite
- [x] Admin ProfileChecks.tsx Seite erstellen
- [x] Tabelle mit allen Profil-Checks anzeigen
- [x] Filter nach Kategorie, Datum, Investor
- [x] Detailansicht fuer einzelne Profil-Checks
- [x] Route und Navigation hinzufuegen
## Investor-Dashboard Profil-Check Anzeige
- [x] tRPC-Prozedur zum Abrufen des Profil-Checks des aktuellen Users
- [x] Profil-Check Sektion im Investor Dashboard hinzufuegen
- [x] Profil-Kategorie und Risiko-Score anzeigen
- [x] Risikomatrix Visualisierung im Dashboard
- [x] Option zum Erneut-Durchfuehren des Tests
## Verträge Fehler-Behebung
- [x] Fehler beim Anlegen neuer Verträge beheben (unexpected error) - type enum korrigiert

## Button "Bin ich geeignet?" Verbesserung
- [x] Button Styling verbessern - besserer Kontrast und Sichtbarkeit
- [x] Text-Farbe aufhellen oder Button-Hintergrund dunkler machen
- [x] Icon besser sichtbar machen

## Verträge Fehler - Neuer Versuch
- [x] Fehler beim Anlegen neuer Verträge - SelectItem value "terms_conditions" auf "terms" korrigiert

## Consent-Management-System (Zustimmungen)
- [x] Datenbank-Tabelle für Consents erstellen (bondId, userId, consentType, accepted, timestamp)
- [x] tRPC-Prozeduren für Consent-Verwaltung (upsert, getByBond, getAllByBond)
- [x] Admin Bonds: Consent-Checkboxen beim Erstellen/Bearbeiten
- [x] Investor-Seite: Zustimmungs-Checkboxen bei Beteiligung anzeigen
- [x] Admin-Dashboard: Übersicht der Zustimmungen pro Beteiligung

## AML und Datenschutz Seiten
- [x] AML-Seite von https://kg.angelus.group/aml/ auslesen und im Portal erstellen
- [x] Datenschutz-Seite von https://kg.angelus.group/datenschutz/ auslesen und im Portal erstellen
- [x] Links im Footer hinzufügen

## Bugs
- [x] Contracts-Seite: JavaScript-Fehler beim Laden der Seite - "An unexpected error occurred" (DashboardLayout Import fehlte)
- [x] 404-Fehler bei /admin/bonds und /admin/contracts Routes - auf /admin/products-and-contracts umgeleitet

## Verträge & Produkte mit Consent-System & Audit-Trail
- [x] Überprüfen: Können Verträge als Consent-Typen abgebildet werden? (JA)
- [x] Audit-Trail Tabelle erstellen (consent_logs mit Timestamp, User, IP, Browser-Info)
- [x] tRPC Prozeduren für Consent-Logs (logConsentAction, getLogsForBond, getLogsForUser, exportLogs)
- [x] Consent-Typen Management im Admin-Interface
- [x] Consent-Logs Anzeige im Admin-Dashboard (mit Filteroptionen) - ConsentLogsTable Komponente erstellt
- [x] Export-Funktion für Compliance-Nachweise (CSV/PDF) - exportLogs Prozedur
- [x] Investor-Interface: Checkbox-Zustimmungen mit Audit-Logging
- [x] Dokumentation: Consent-System und Audit-Trail beschreiben (CONSENT_AUDIT_SYSTEM.md)


## Bond-Verwaltung & Vertragsvorlagen-System (VEREINFACHT)
- [x] Alte Komponenten bereinigen
- [x] Neues vereinigtes Admin-Interface: Produkte & Verträge
- [x] Tab 1: Produkte mit Vertragsvorlagen-Zuordnung
- [x] Tab 2: Vertragsvorlagen mit Rich-Text-Editor
- [x] tRPC Prozeduren für Bond-CRUD
- [x] tRPC Prozeduren für Vertragsvorlagen-CRUD
- [x] tRPC Prozeduren für Bond-Template-Zuordnung
- [x] Investor-Seite: Vertragsvorlagen anzeigen
- [ ] Tests für neues System


## Professionelle Vertragsvorlagen mit Schiedsgerichtsklausel
- [x] 5 ausführliche Vertragsvorlagen schreiben (mit Schiedsgerichtsklausel):
  - [x] Zeichnungsvereinbarung
  - [x] Risikooffenlegung
  - [x] Allgemeine Geschäftsbedingungen (AGB)
  - [x] KYC/AML Vereinbarung
  - [x] Prospekt
- [x] Seed-Script zum Einfügen der Vorlagen erstellen
- [x] Seed-Script ausführen und Vorlagen in DB laden
- [ ] Vertragsvorlagen im Admin-Interface testen und manuell laden

## Test-Anleihe "Angelus Bond 2026"
- [ ] Test-Bond im Admin-Interface anlegen mit allen Details
- [ ] Vertragsvorlagen zum Bond zuordnen
- [ ] Investor-Onboarding testen (Zeichnung durchführen)

## Aktuelle Aufgabe: Professionelle Vertragsvorlagen mit Schiedsgerichtsklausel
- [x] TypeScript-Fehler in routers.ts beheben (consentVersion Feld)
- [x] Professionelle Vertragsvorlagen mit Schiedsgerichtsklausel schreiben
- [x] Seed-Script zum Laden der Vorlagen erstellen
- [x] Vertragsvorlagen in Datenbank laden (via Admin-Interface)
- [ ] Test-Bond "Angelus Bond 2026" anlegen und Vorlagen zuordnen

## Vorlage-Wiederverwendung
- [x] Copy-Funktion für Vertragsvorlagen hinzufügen - handleCopyTemplate implementiert
- [x] Template-Bibliothek im Admin-Interface - Copy-Button in Tabelle
- [ ] Schnelle Zuordnung von Vorlagen zu neuen Produkten
- [ ] Versionskontrolle bei Vorlagen-Kopien
