# Angelus Portal - Bestandskunden Onboarding & Automatisierung

## 🎯 Ziel
Automatisierung der manuellen Verwaltung (Excel, PDF, Email) für bis zu 50 bestehende Kunden mit DocuSign-Anleihen.

---

## 📊 Datenstruktur der Bestandskunden

### Kundendaten
- **Name**: Brigitte Brendel
- **Geburtsdatum**: 28.06.1960
- **Adresse**: Gartenweg 2, 91257 Pegnitz
- **Email**: (muss erfasst werden)
- **Telefon**: (muss erfasst werden)

### Anleihendaten
- **Vertragsnummer**: 136171024
- **Anleihe-Nummer**: 60-2023
- **Zeichnungsdatum**: 17.10.2024
- **Wertstellungsdatum**: 18.10.2023
- **Betrag**: 100.000,00 EUR
- **Anzahl Teilschuldverschreibungen**: 100 x 1.000 EUR
- **Zinssatz**: 18%
- **Zinsfälligkeit**: Jährlich nachschüssig (Vertragsstichtag: 01.06.)
- **Zinsauszahlung**: Monatlich zum 15. des Folgemonats
- **Laufzeit**: (muss erfasst werden)

### Bankverbindung des Kunden
- **IBAN**: DE57 7734 0076 0380 6924 00
- **BIC**: COBADEFFXXX
- **Kontoinhaber**: Siglinde Brigitte Brendel

### Steuerdaten
- **Kapitalertragsteuer**: 25%
- **Solidaritätszuschlag**: 5,5%
- **Kirchensteuer**: 8% (optional)

---

## 🔄 Automatisierungsprozesse

### Phase 1: Datenerfassung & Migration (Woche 1-2)

#### 1.1 Bestandsdaten-Import
**Aufgabe**: Erstelle Bulk-Import-Tool für bestehende Kunden

**Features**:
- [ ] CSV/Excel-Import für Kundendaten
- [ ] CSV/Excel-Import für Anleihendaten
- [ ] Duplikat-Erkennung (nach Email/Telefon/Name)
- [ ] Validierung der IBAN/BIC
- [ ] Datenbereinigung & Normalisierung
- [ ] Import-Protokoll mit Fehlerbehandlung
- [ ] Batch-Processing für bis zu 50 Kunden

**Datenquellen**:
- Excel-Listen (Kundendaten, Anleihendaten)
- PDF-Hochrechnungen (Zinsberechnung)
- DocuSign-Verträge (Vertragsdaten)
- Email-Archiv (Zeichnungsdatum, Kommunikation)

**Datenbank-Schema**:
```sql
-- Bestandskunden-Tabelle
CREATE TABLE legacy_customers (
  id INT PRIMARY KEY,
  contract_number VARCHAR(20) UNIQUE,
  customer_name VARCHAR(255),
  birth_date DATE,
  address VARCHAR(255),
  postal_code VARCHAR(10),
  city VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(20),
  iban VARCHAR(34),
  bic VARCHAR(11),
  account_holder VARCHAR(255),
  bond_id INT,
  amount DECIMAL(15,2),
  subscription_count INT,
  interest_rate DECIMAL(5,2),
  contract_date DATE,
  value_date DATE,
  annual_interest_date DATE,
  maturity_date DATE,
  status ENUM('active', 'completed', 'cancelled'),
  imported_at TIMESTAMP,
  FOREIGN KEY (bond_id) REFERENCES bonds(id)
);

-- Zinsberechnungs-Tabelle
CREATE TABLE legacy_interest_calculations (
  id INT PRIMARY KEY,
  contract_number VARCHAR(20),
  customer_id INT,
  calculation_date DATE,
  annual_interest DECIMAL(15,2),
  monthly_installment DECIMAL(15,2),
  tax_withheld DECIMAL(15,2),
  net_interest DECIMAL(15,2),
  payment_date DATE,
  status ENUM('pending', 'paid', 'failed'),
  FOREIGN KEY (customer_id) REFERENCES legacy_customers(id)
);
```

#### 1.2 Admin-Interface für Datenimport
**Aufgabe**: Erstelle Admin-Panel für Bestandsdaten-Import

**Features**:
- [ ] Upload-Interface für CSV/Excel
- [ ] Daten-Vorschau vor Import
- [ ] Validierungsergebnisse anzeigen
- [ ] Import-Fortschritt (Progress Bar)
- [ ] Fehlerbehandlung & Fehlerbericht
- [ ] Undo/Rollback-Funktion
- [ ] Import-Audit-Log

---

### Phase 2: Zinsberechnung & Zahlungsplan (Woche 2-3)

#### 2.1 Automatische Zinsberechnung
**Aufgabe**: Implementiere automatische Zinsberechnung für Bestandskunden

**Features**:
- [ ] Zinsberechnung nach Vertragsstichtag (01.06.)
- [ ] Monatliche Zinsabschlagszahlung (15. des Folgemonats)
- [ ] Steuern automatisch berechnen (KESt, SolZ, Kirchensteuer)
- [ ] Netto-Zinsauszahlung berechnen
- [ ] Zinsberechnung für mehrere Jahre
- [ ] Historische Zinsberechnungen speichern

**Zinsberechnung-Logik**:
```
Jährliche Zinsberechnung:
- Vertragsstichtag: 01.06. jeden Jahres
- Berechnung: Kapital × Zinssatz × (Tage / 365)
- Beispiel: 100.000 EUR × 18% = 18.000 EUR/Jahr
- Monatliche Abschlagszahlung: 18.000 EUR / 12 = 1.500 EUR

Steuern:
- Kapitalertragsteuer: 25%
- Solidaritätszuschlag: 5,5% auf KESt
- Kirchensteuer: 8% auf KESt (optional)
- Beispiel: 1.500 EUR × (1 - 0.25 - 0.025 - 0.02) = 1.095 EUR (netto)
```

#### 2.2 Zahlungsplan-Generator
**Aufgabe**: Erstelle automatischen Zahlungsplan für Bestandskunden

**Features**:
- [ ] Zahlungsplan basierend auf Vertragsdaten
- [ ] Monatliche Zahlungstermine (15. des Folgemonats)
- [ ] Jährliche Stichtag-Berechnung (01.06.)
- [ ] Zahlungsplan für gesamte Laufzeit
- [ ] PDF-Export des Zahlungsplans
- [ ] Zahlungsplan im Portal anzeigen
- [ ] Zahlungserinnerungen automatisch erstellen

---

### Phase 3: Automatisierte Kommunikation (Woche 3-4)

#### 3.1 Email-Automatisierung
**Aufgabe**: Automatisierte Emails für Bestandskunden

**Features**:
- [ ] Willkommens-Email nach Onboarding
- [ ] Monatliche Zinsauszahlungs-Benachrichtigungen
- [ ] Zahlungsbestätigungen
- [ ] Jährliche Hochrechnungen (PDF)
- [ ] Steuerbescheinigungen (Jahresende)
- [ ] Zahlungserinnerungen (3 Tage vor Fälligkeit)
- [ ] Fehlerbenachrichtigungen (z.B. Zahlungsausfälle)

**Email-Templates**:
- `welcome_legacy_customer.html` - Willkommens-Email
- `monthly_interest_payment.html` - Zinsauszahlungs-Benachrichtigung
- `annual_projection.html` - Jährliche Hochrechnung
- `tax_certificate.html` - Steuerbescheinigung
- `payment_reminder.html` - Zahlungserinnerung

#### 3.2 PDF-Generierung
**Aufgabe**: Automatische PDF-Generierung für Bestandskunden

**Features**:
- [ ] Hochrechnungs-PDF (wie Brigitte Brendel Beispiel)
- [ ] Zahlungsplan-PDF
- [ ] Steuerbescheinigung-PDF
- [ ] Vertragsbestätigung-PDF
- [ ] Zinsabrechnung-PDF
- [ ] Kontoauszug-PDF (Zahlungshistorie)

---

### Phase 4: Portal-Integration (Woche 4-5)

#### 4.1 Bestandskunden-Dashboard
**Aufgabe**: Erstelle Investor-Portal für Bestandskunden

**Features**:
- [ ] Anleihendaten anzeigen
- [ ] Zahlungshistorie anzeigen
- [ ] Zinsberechnungen anzeigen
- [ ] Zahlungsplan anzeigen
- [ ] Hochrechnungen herunterladen (PDF)
- [ ] Steuerbescheinigungen herunterladen
- [ ] Kontaktinformationen aktualisieren
- [ ] Bankverbindung aktualisieren

#### 4.2 Admin-Dashboard für Bestandskunden
**Aufgabe**: Erstelle Admin-Panel für Bestandskunden-Verwaltung

**Features**:
- [ ] Bestandskunden-Übersicht
- [ ] Einzelne Kundendetails anzeigen
- [ ] Zinsberechnungen überprüfen
- [ ] Zahlungsplan anzeigen
- [ ] Zahlungshistorie anzeigen
- [ ] Fehler/Probleme kennzeichnen
- [ ] Manuelle Anpassungen vornehmen
- [ ] Emails manuell senden

---

### Phase 5: Reporting & Analytik (Woche 5-6)

#### 5.1 Finanz-Reports
**Aufgabe**: Erstelle automatische Finanz-Reports

**Reports**:
- [ ] Gesamte Zinsauszahlungen (monatlich/jährlich)
- [ ] Ausstehende Zahlungen
- [ ] Zahlungsausfälle
- [ ] Steuern einbehalten
- [ ] Kundenübersicht (aktiv/inaktiv)
- [ ] Anleihen-Übersicht (Laufzeiten)
- [ ] Fälligkeitskalender

#### 5.2 Compliance & Audit
**Aufgabe**: Implementiere Compliance-Features

**Features**:
- [ ] Audit-Log für alle Änderungen
- [ ] Steuerbescheinigungen archivieren
- [ ] Vertragsbestätigungen archivieren
- [ ] Zahlungshistorie archivieren
- [ ] Datenschutz-Compliance (DSGVO)
- [ ] Datenexport für Steuererklärung

---

## 📋 Implementierungs-Roadmap

### Sprint 1: Datenerfassung (Woche 1-2)
- [ ] Datenbank-Schema für Bestandskunden erstellen
- [ ] CSV/Excel-Import-Tool implementieren
- [ ] Admin-Interface für Datenimport
- [ ] Duplikat-Erkennung
- [ ] Validierung & Fehlerbehandlung
- [ ] Import 10 Test-Kunden

### Sprint 2: Zinsberechnung (Woche 2-3)
- [ ] Zinsberechnung-Engine implementieren
- [ ] Steuern automatisch berechnen
- [ ] Zahlungsplan-Generator
- [ ] Historische Zinsberechnungen speichern
- [ ] Zinsberechnung für alle 50 Kunden

### Sprint 3: Kommunikation (Woche 3-4)
- [ ] Email-Templates erstellen
- [ ] Email-Automatisierung implementieren
- [ ] PDF-Generierung für Hochrechnungen
- [ ] Zahlungserinnerungen
- [ ] Test-Emails versenden

### Sprint 4: Portal (Woche 4-5)
- [ ] Bestandskunden-Dashboard im Portal
- [ ] Admin-Panel für Bestandskunden
- [ ] Zahlungshistorie anzeigen
- [ ] Zinsberechnungen anzeigen
- [ ] PDF-Download-Funktion

### Sprint 5: Reporting (Woche 5-6)
- [ ] Finanz-Reports implementieren
- [ ] Audit-Log einrichten
- [ ] Compliance-Features
- [ ] Datenexport
- [ ] Abschließende Tests

---

## 🔧 Technische Anforderungen

### Backend-Anforderungen
- [ ] tRPC-Prozeduren für Bestandskunden-Management
- [ ] Zinsberechnung-Service
- [ ] Email-Service (Resend API)
- [ ] PDF-Generierung (ReportLab)
- [ ] CSV/Excel-Import
- [ ] Datenvalidierung & Bereinigung

### Frontend-Anforderungen
- [ ] Admin-Upload-Interface
- [ ] Bestandskunden-Dashboard
- [ ] Admin-Panel für Bestandskunden
- [ ] Zahlungshistorie-Ansicht
- [ ] Zinsberechnungs-Ansicht
- [ ] PDF-Download-Buttons

### Datenbank-Anforderungen
- [ ] Legacy-Kunden-Tabelle
- [ ] Legacy-Zinsberechnungs-Tabelle
- [ ] Legacy-Zahlungshistorie-Tabelle
- [ ] Audit-Log-Tabelle

---

## 📊 Erfolgskriterien

### Phase 1: Datenerfassung
- ✅ Alle 50 Kunden erfolgreich importiert
- ✅ Keine Duplikate
- ✅ Alle erforderlichen Felder vorhanden
- ✅ Datenvalidierung 100% erfolgreich

### Phase 2: Zinsberechnung
- ✅ Zinsberechnung korrekt (Abweichung < 0,01 EUR)
- ✅ Steuern korrekt berechnet
- ✅ Zahlungsplan für alle Kunden erstellt
- ✅ Historische Daten archiviert

### Phase 3: Kommunikation
- ✅ Emails automatisch versendet
- ✅ PDFs korrekt generiert
- ✅ Keine fehlgeschlagenen Emails
- ✅ Kundenbestätigung erhalten

### Phase 4: Portal
- ✅ Bestandskunden können sich anmelden
- ✅ Alle Daten im Portal sichtbar
- ✅ PDFs herunterladbar
- ✅ Benutzerfreundlichkeit getestet

### Phase 5: Reporting
- ✅ Reports automatisch generiert
- ✅ Compliance-Anforderungen erfüllt
- ✅ Audit-Log vollständig
- ✅ Datenexport funktioniert

---

## 💡 Zusätzliche Features (Optional)

- [ ] API-Integration mit DocuSign (automatische Vertragsdaten-Extraktion)
- [ ] Automatische Bankverbindungs-Validierung (IBAN-Prüfung)
- [ ] Zahlungs-Tracking (automatische Zahlungsbestätigung)
- [ ] Zahlungs-Fehlerbehandlung (automatische Benachrichtigungen)
- [ ] Multi-Sprachen-Support (Deutsch/Englisch)
- [ ] Mobile App für Bestandskunden
- [ ] Zwei-Faktor-Authentifizierung
- [ ] Biometrische Authentifizierung

---

## 📅 Zeitplan

| Phase | Woche | Aufgaben | Status |
|-------|-------|----------|--------|
| 1 | 1-2 | Datenerfassung & Migration | ⏳ |
| 2 | 2-3 | Zinsberechnung & Zahlungsplan | ⏳ |
| 3 | 3-4 | Automatisierte Kommunikation | ⏳ |
| 4 | 4-5 | Portal-Integration | ⏳ |
| 5 | 5-6 | Reporting & Analytik | ⏳ |
| - | 6 | Testing & Optimierung | ⏳ |
| - | 7 | Go-Live & Monitoring | ⏳ |

**Gesamtdauer**: ~7 Wochen

---

## 🎓 Schulung & Support

- [ ] Admin-Schulung (Datenimport, Verwaltung)
- [ ] Kundenanleitungen (Portal-Nutzung)
- [ ] FAQ-Dokumentation
- [ ] Support-Hotline
- [ ] Video-Tutorials

---

## 📞 Kontakt & Support

Bei Fragen oder Problemen: support@angelus.group
