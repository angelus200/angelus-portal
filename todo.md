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
