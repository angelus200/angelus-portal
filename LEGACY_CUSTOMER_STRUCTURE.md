# Bestandskunden Onboarding - Struktur & Interface Design

## 🎯 Überblick

**Ziel**: Strukturierter Einzelimport pro Bestandskunde mit vollständiger Dokumentenverwaltung, automatischer Zinsberechnung und Portal-Zugriff.

**Workflow**:
1. Admin importiert Kunden einzeln mit Dokumenten
2. System verarbeitet Dokumente und extrahiert Daten
3. Zinsberechnung wird automatisch erstellt
4. Kunde erhält Portal-Zugriff und sieht alle Informationen

---

## 📁 Datenbank-Struktur

### 1. Legacy Customer (Bestandskunde)

```sql
CREATE TABLE legacy_customers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  
  -- Identifikation
  contract_number VARCHAR(20) UNIQUE NOT NULL,  -- z.B. "136171024"
  user_id INT UNIQUE,  -- Link zu Investor-Benutzer (optional)
  
  -- Persönliche Daten
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  birth_date DATE,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20),
  
  -- Adresse
  street VARCHAR(255),
  house_number VARCHAR(10),
  postal_code VARCHAR(10),
  city VARCHAR(100),
  country VARCHAR(100),
  
  -- Bankverbindung
  iban VARCHAR(34),
  bic VARCHAR(11),
  account_holder VARCHAR(255),
  
  -- Anleihe-Informationen
  bond_id INT,
  bond_number VARCHAR(50),  -- z.B. "60-2023"
  
  -- Vertragsdaten
  contract_date DATE,  -- Zeichnungsdatum (z.B. 17.10.2024)
  value_date DATE,  -- Wertstellungsdatum (z.B. 18.10.2023)
  investment_amount DECIMAL(15,2),  -- z.B. 100.000,00
  share_count INT,  -- Anzahl Teilschuldverschreibungen (z.B. 100)
  share_value DECIMAL(15,2),  -- Wert pro Teilschuldverschreibung (z.B. 1.000,00)
  
  -- Zinsen
  annual_interest_rate DECIMAL(5,2),  -- z.B. 18.00
  interest_payment_frequency ENUM('monthly', 'quarterly', 'annual'),  -- z.B. 'monthly'
  annual_interest_date DATE,  -- Stichtag (z.B. 01.06.)
  monthly_payment_day INT,  -- Tag im Monat für Zinsauszahlung (z.B. 15)
  
  -- Laufzeit
  maturity_date DATE,  -- Enddatum
  term_months INT,  -- Laufzeit in Monaten
  
  -- Steuern
  capital_gains_tax DECIMAL(5,2) DEFAULT 25.00,  -- Kapitalertragsteuer
  solidarity_surcharge DECIMAL(5,2) DEFAULT 5.50,  -- Solidaritätszuschlag
  church_tax DECIMAL(5,2) DEFAULT 0.00,  -- Kirchensteuer
  
  -- Status
  status ENUM('pending', 'active', 'completed', 'cancelled') DEFAULT 'pending',
  import_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  activation_date TIMESTAMP,
  
  -- Metadaten
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (bond_id) REFERENCES bonds(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX (contract_number),
  INDEX (email),
  INDEX (status)
);
```

### 2. Legacy Customer Documents (Dokumentenverwaltung)

```sql
CREATE TABLE legacy_customer_documents (
  id INT PRIMARY KEY AUTO_INCREMENT,
  
  -- Referenz
  legacy_customer_id INT NOT NULL,
  
  -- Dokumenttyp
  document_type ENUM(
    'contract',  -- Vertrag/Annahmebestätigung
    'projection',  -- Hochrechnung
    'interest_calculation',  -- Zinsberechnung
    'payment_confirmation',  -- Zahlungsbestätigung
    'tax_certificate',  -- Steuerbescheinigung
    'bank_statement',  -- Kontoauszug
    'other'  -- Sonstiges
  ) NOT NULL,
  
  -- Dateiinformationen
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,  -- S3-Pfad
  file_size INT,  -- in Bytes
  file_type VARCHAR(50),  -- z.B. 'application/pdf'
  
  -- Dokumentdaten
  document_date DATE,  -- Datum des Dokuments
  description TEXT,
  
  -- Upload-Informationen
  uploaded_by INT,  -- Admin-Benutzer
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Verarbeitung
  is_processed BOOLEAN DEFAULT FALSE,
  extracted_data JSON,  -- Extrahierte Daten aus Dokument
  
  FOREIGN KEY (legacy_customer_id) REFERENCES legacy_customers(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id),
  INDEX (legacy_customer_id),
  INDEX (document_type)
);
```

### 3. Legacy Customer Interest Calculations (Zinsberechnungen)

```sql
CREATE TABLE legacy_customer_interest_calculations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  
  -- Referenz
  legacy_customer_id INT NOT NULL,
  
  -- Berechnungszeitraum
  calculation_year INT,
  calculation_month INT,
  period_start_date DATE,
  period_end_date DATE,
  
  -- Berechnung
  annual_interest DECIMAL(15,2),  -- Jährliche Zinsen
  monthly_installment DECIMAL(15,2),  -- Monatliche Rate
  
  -- Steuern
  capital_gains_tax_amount DECIMAL(15,2),
  solidarity_surcharge_amount DECIMAL(15,2),
  church_tax_amount DECIMAL(15,2),
  total_tax_withheld DECIMAL(15,2),
  
  -- Auszahlung
  net_interest DECIMAL(15,2),  -- Nach Steuern
  payment_date DATE,  -- Fälligkeitsdatum
  
  -- Status
  status ENUM('pending', 'paid', 'failed', 'cancelled') DEFAULT 'pending',
  payment_confirmation_date TIMESTAMP,
  
  -- Metadaten
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (legacy_customer_id) REFERENCES legacy_customers(id) ON DELETE CASCADE,
  INDEX (legacy_customer_id),
  INDEX (payment_date),
  INDEX (status)
);
```

### 4. Legacy Customer Payment History (Zahlungshistorie)

```sql
CREATE TABLE legacy_customer_payment_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  
  -- Referenz
  legacy_customer_id INT NOT NULL,
  interest_calculation_id INT,
  
  -- Zahlungsinformationen
  payment_type ENUM('initial_investment', 'interest_payment', 'refund', 'adjustment'),
  payment_date DATE,
  amount DECIMAL(15,2),
  
  -- Bankdetails
  transaction_reference VARCHAR(255),
  bank_transaction_id VARCHAR(255),
  
  -- Status
  status ENUM('pending', 'confirmed', 'failed', 'cancelled') DEFAULT 'pending',
  confirmation_date TIMESTAMP,
  
  -- Notizen
  notes TEXT,
  
  -- Metadaten
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (legacy_customer_id) REFERENCES legacy_customers(id) ON DELETE CASCADE,
  FOREIGN KEY (interest_calculation_id) REFERENCES legacy_customer_interest_calculations(id),
  INDEX (legacy_customer_id),
  INDEX (payment_date)
);
```

---

## 🎨 Admin-Interface Design

### Admin-Seite: `/admin/legacy-customers`

#### 1. Übersichtsseite (Legacy Customers List)

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│ Bestandskunden                                              │
│ Verwaltung von Kunden mit DocuSign-Anleihen                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ [+ Neuen Kunden importieren] [Filter] [Suchen]              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Status-Statistik                                            │
├─────────────────────────────────────────────────────────────┤
│ Ausstehend: 12  │  Aktiv: 35  │  Abgeschlossen: 3          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Bestandskunden-Tabelle                                      │
├──────┬──────────────┬──────────┬──────────┬──────────────────┤
│ ID   │ Name         │ Betrag   │ Status   │ Aktionen         │
├──────┼──────────────┼──────────┼──────────┼──────────────────┤
│ 001  │ B. Brendel   │ 100.000€ │ ✅ Aktiv │ [Bearbeiten]     │
│ 002  │ M. Schmidt   │ 50.000€  │ ⏳ Ausstehend │ [Bearbeiten] │
│ ...  │ ...          │ ...      │ ...      │ ...              │
└──────┴──────────────┴──────────┴──────────┴──────────────────┘
```

**Features**:
- Tabelle mit allen Bestandskunden
- Status-Filter (Ausstehend, Aktiv, Abgeschlossen, Storniert)
- Suchfunktion (Name, Vertragsnummer, Email)
- Sortierung nach Name, Betrag, Status, Datum
- Quick-Actions (Bearbeiten, Löschen, Exportieren)

---

#### 2. Neuer Kunde importieren (Import-Wizard)

**Route**: `/admin/legacy-customers/import`

**Schritt 1: Kundendaten eingeben**
```
┌─────────────────────────────────────────────────────────────┐
│ Bestandskunde importieren - Schritt 1/4: Kundendaten        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Persönliche Daten                                           │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Vorname *                 │ Brigitte                   │  │
│ │ Nachname *                │ Brendel                    │  │
│ │ Geburtsdatum              │ 28.06.1960                 │  │
│ │ Email *                   │ brigitte@example.com       │  │
│ │ Telefon                   │ +49 123 456789             │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ Adresse                                                     │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Straße *                  │ Gartenweg                  │  │
│ │ Hausnummer *              │ 2                          │  │
│ │ PLZ *                     │ 91257                      │  │
│ │ Stadt *                   │ Pegnitz                    │  │
│ │ Land                      │ Deutschland                │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ [Zurück] [Weiter →]                                         │
└─────────────────────────────────────────────────────────────┘
```

**Schritt 2: Bankverbindung & Anleihedaten**
```
┌─────────────────────────────────────────────────────────────┐
│ Bestandskunde importieren - Schritt 2/4: Anleihedaten       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Bankverbindung                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ IBAN *                    │ DE57 7734 0076 0380 6924 00│  │
│ │ BIC *                     │ COBADEFFXXX                │  │
│ │ Kontoinhaber *            │ Siglinde Brigitte Brendel │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ Anleihe-Informationen                                       │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Vertragsnummer *          │ 136171024                  │  │
│ │ Anleihe-Nummer *          │ 60-2023                    │  │
│ │ Anleihe wählen *          │ [Dropdown: Anleihe 60-2023]│  │
│ │ Betrag *                  │ 100.000,00 EUR             │  │
│ │ Anzahl Anteile *          │ 100                        │  │
│ │ Wert pro Anteil *         │ 1.000,00 EUR               │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ [← Zurück] [Weiter →]                                       │
└─────────────────────────────────────────────────────────────┘
```

**Schritt 3: Vertragsdaten**
```
┌─────────────────────────────────────────────────────────────┐
│ Bestandskunde importieren - Schritt 3/4: Vertragsdaten      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Vertragsdaten                                               │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Zeichnungsdatum *         │ 17.10.2024                 │  │
│ │ Wertstellungsdatum *      │ 18.10.2023                 │  │
│ │ Zinssatz % *              │ 18,00                      │  │
│ │ Zinsfälligkeit *          │ [Dropdown: Jährlich]       │  │
│ │ Zinsauszahlungsart *      │ [Dropdown: Monatlich]      │  │
│ │ Jährlicher Stichtag *     │ 01.06.                     │  │
│ │ Zahlungstag im Monat *    │ 15                         │  │
│ │ Enddatum *                │ 01.06.2033                 │  │
│ │ Laufzeit (Monate) *       │ 120                        │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ Steuern                                                     │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Kapitalertragsteuer %     │ 25,00                      │  │
│ │ Solidaritätszuschlag %    │ 5,50                       │  │
│ │ Kirchensteuer %           │ 0,00                       │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ [← Zurück] [Weiter →]                                       │
└─────────────────────────────────────────────────────────────┘
```

**Schritt 4: Dokumente hochladen**
```
┌─────────────────────────────────────────────────────────────┐
│ Bestandskunde importieren - Schritt 4/4: Dokumente          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Erforderliche Dokumente                                     │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ ☑ Vertrag/Annahmebestätigung                          │  │
│ │   [Datei hochladen] ✓ Annahmebestät...Brendel.docx    │  │
│ │                                                         │  │
│ │ ☑ Hochrechnung/Zinsberechnung                         │  │
│ │   [Datei hochladen] ✓ HochrechnungBrigitteBrendel.pdf │  │
│ │                                                         │  │
│ │ ☑ Zahlungsbestätigung                                 │  │
│ │   [Datei hochladen] ✓ 2024-10-181.Einzahlung100T...   │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ Optionale Dokumente                                         │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ ☐ Zinsberechnungsblatt                                │  │
│ │   [Datei hochladen]                                    │  │
│ │                                                         │  │
│ │ ☐ Sonstige Dokumente                                  │  │
│ │   [Datei hochladen]                                    │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ [← Zurück] [Kunden importieren]                             │
└─────────────────────────────────────────────────────────────┘
```

---

#### 3. Kundendetails (Edit/View)

**Route**: `/admin/legacy-customers/:id`

```
┌─────────────────────────────────────────────────────────────┐
│ Bestandskunde: Brigitte Brendel (Vertrag: 136171024)        │
│ Status: ✅ Aktiv  │ Importiert: 08.01.2025                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ [Bearbeiten] [Löschen] [Exportieren] [Email senden]         │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Persönliche Daten                                       │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ Name: Brigitte Brendel                                  │ │
│ │ Geburtsdatum: 28.06.1960                                │ │
│ │ Email: brigitte@example.com                             │ │
│ │ Telefon: +49 123 456789                                 │ │
│ │ Adresse: Gartenweg 2, 91257 Pegnitz                     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Anleihe-Informationen                                   │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ Vertragsnummer: 136171024                               │ │
│ │ Anleihe: 60-2023 (18% p.a.)                             │ │
│ │ Betrag: 100.000,00 EUR                                  │ │
│ │ Zeichnungsdatum: 17.10.2024                             │ │
│ │ Wertstellung: 18.10.2023                                │ │
│ │ Laufzeit: 120 Monate bis 01.06.2033                     │ │
│ │ Zinssatz: 18,00%                                        │ │
│ │ Zinsauszahlung: Monatlich (15. des Monats)              │ │
│ │ Jährlicher Stichtag: 01.06.                             │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Bankverbindung                                          │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ IBAN: DE57 7734 0076 0380 6924 00                       │ │
│ │ BIC: COBADEFFXXX                                        │ │
│ │ Kontoinhaber: Siglinde Brigitte Brendel                 │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Steuern                                                 │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ Kapitalertragsteuer: 25,00%                             │ │
│ │ Solidaritätszuschlag: 5,50%                             │ │
│ │ Kirchensteuer: 0,00%                                    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Dokumente                                               │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ [Vertrag] Annahmebestät.AnleiheAngelus_VerNr...         │ │
│ │ [Hochrechnung] HochrechnungBrigitteBrendel.pdf          │ │
│ │ [Zahlungsbestätigung] 2024-10-181.Einzahlung100T...     │ │
│ │ [Zinsberechnung] ZinsrechnungenBrigitte.numbers         │ │
│ │ [+ Dokument hinzufügen]                                 │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Zinsberechnungen & Zahlungen                            │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ Monat    │ Zinsen      │ Steuern    │ Netto      │ Status │
│ ├──────────┼─────────────┼────────────┼────────────┼────────┤ │
│ │ Jun 2024 │ 1.500,00 €  │ 405,00 €   │ 1.095,00 € │ ✅ Paid │
│ │ Jul 2024 │ 1.500,00 €  │ 405,00 €   │ 1.095,00 € │ ✅ Paid │
│ │ Aug 2024 │ 1.500,00 €  │ 405,00 €   │ 1.095,00 € │ ⏳ Pending │
│ │ ...      │ ...         │ ...        │ ...        │ ...    │
│ └──────────┴─────────────┴────────────┴────────────┴────────┘ │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Notizen                                                 │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ [Textfeld für Admin-Notizen]                            │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 👥 Kundenportal-Ansicht

### Kundenportal: `/investor/legacy-account`

#### 1. Dashboard (Übersicht)

```
┌─────────────────────────────────────────────────────────────┐
│ Mein Konto - Bestandskunde                                   │
│ Willkommen, Brigitte Brendel                                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Meine Anleihe - Angelus 60-2023                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Investitionsbetrag: 100.000,00 EUR                          │
│ Zinssatz: 18,00% p.a.                                       │
│ Laufzeit: bis 01.06.2033 (120 Monate)                       │
│ Status: ✅ Aktiv                                            │
│                                                              │
│ Nächste Zinsauszahlung: 15.01.2025 (1.095,00 EUR)           │
│ Gesamtzinsen erhalten: 9.660,00 EUR                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Zinsauszahlungen (Letzte 6 Monate)                          │
├─────────────────────────────────────────────────────────────┤
│ Datum      │ Brutto    │ Steuern  │ Netto      │ Status     │
├────────────┼───────────┼──────────┼────────────┼────────────┤
│ 15.12.2024 │ 1.500 EUR │ 405 EUR  │ 1.095 EUR  │ ✅ Paid    │
│ 15.11.2024 │ 1.500 EUR │ 405 EUR  │ 1.095 EUR  │ ✅ Paid    │
│ 15.10.2024 │ 1.500 EUR │ 405 EUR  │ 1.095 EUR  │ ✅ Paid    │
│ 15.09.2024 │ 1.500 EUR │ 405 EUR  │ 1.095 EUR  │ ✅ Paid    │
│ 15.08.2024 │ 1.500 EUR │ 405 EUR  │ 1.095 EUR  │ ✅ Paid    │
│ 15.07.2024 │ 1.500 EUR │ 405 EUR  │ 1.095 EUR  │ ✅ Paid    │
└────────────┴───────────┴──────────┴────────────┴────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Schnellzugriff                                              │
├─────────────────────────────────────────────────────────────┤
│ [Zahlungsplan anzeigen] [Hochrechnung] [Steuerbescheinigung]│
│ [Alle Dokumente] [Kontakt]                                  │
└─────────────────────────────────────────────────────────────┘
```

---

#### 2. Detailansicht - Meine Anleihe

```
┌─────────────────────────────────────────────────────────────┐
│ Meine Anleihe - Angelus 60-2023                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Vertragsdetails                                             │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Vertragsnummer: 136171024                              │  │
│ │ Anleihe: Angelus 60-2023                               │  │
│ │ Zeichnungsdatum: 17.10.2024                            │  │
│ │ Wertstellung: 18.10.2023                               │  │
│ │ Investitionsbetrag: 100.000,00 EUR                     │  │
│ │ Anzahl Anteile: 100 x 1.000,00 EUR                     │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ Zinsinformationen                                           │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Zinssatz: 18,00% p.a.                                  │  │
│ │ Jährliche Zinsen: 18.000,00 EUR                        │  │
│ │ Monatliche Zinsauszahlung: 1.500,00 EUR (brutto)       │  │
│ │ Nach Steuern: 1.095,00 EUR (netto)                     │  │
│ │ Jährlicher Stichtag: 01.06.                            │  │
│ │ Zahlungstag: 15. des Monats                            │  │
│ │ Zinsauszahlung: Monatlich nachschüssig                 │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ Laufzeit & Enddatum                                         │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Laufzeit: 120 Monate                                   │  │
│ │ Enddatum: 01.06.2033                                   │  │
│ │ Verbleibende Zeit: 8 Jahre, 5 Monate                   │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ Steuern                                                     │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Kapitalertragsteuer: 25,00%                            │  │
│ │ Solidaritätszuschlag: 5,50%                            │  │
│ │ Kirchensteuer: 0,00%                                   │  │
│ │ Effektive Steuerquote: 26,38%                          │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ Bankverbindung                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ IBAN: DE57 7734 0076 0380 6924 00                      │  │
│ │ BIC: COBADEFFXXX                                       │  │
│ │ Kontoinhaber: Siglinde Brigitte Brendel                │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

#### 3. Zinsauszahlungen & Zahlungsplan

```
┌─────────────────────────────────────────────────────────────┐
│ Zinsauszahlungen & Zahlungsplan                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Zahlungsplan für 2025                                       │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Datum      │ Brutto    │ Steuern  │ Netto      │ Status │  │
│ ├────────────┼───────────┼──────────┼────────────┼────────┤  │
│ │ 15.01.2025 │ 1.500 EUR │ 405 EUR  │ 1.095 EUR  │ ⏳ Pending │
│ │ 15.02.2025 │ 1.500 EUR │ 405 EUR  │ 1.095 EUR  │ ⏳ Pending │
│ │ 15.03.2025 │ 1.500 EUR │ 405 EUR  │ 1.095 EUR  │ ⏳ Pending │
│ │ 15.04.2025 │ 1.500 EUR │ 405 EUR  │ 1.095 EUR  │ ⏳ Pending │
│ │ 15.05.2025 │ 1.500 EUR │ 405 EUR  │ 1.095 EUR  │ ⏳ Pending │
│ │ 15.06.2025 │ 1.500 EUR │ 405 EUR  │ 1.095 EUR  │ ⏳ Pending │
│ │ 15.07.2025 │ 1.500 EUR │ 405 EUR  │ 1.095 EUR  │ ⏳ Pending │
│ │ 15.08.2025 │ 1.500 EUR │ 405 EUR  │ 1.095 EUR  │ ⏳ Pending │
│ │ 15.09.2025 │ 1.500 EUR │ 405 EUR  │ 1.095 EUR  │ ⏳ Pending │
│ │ 15.10.2025 │ 1.500 EUR │ 405 EUR  │ 1.095 EUR  │ ⏳ Pending │
│ │ 15.11.2025 │ 1.500 EUR │ 405 EUR  │ 1.095 EUR  │ ⏳ Pending │
│ │ 15.12.2025 │ 1.500 EUR │ 405 EUR  │ 1.095 EUR  │ ⏳ Pending │
│ └────────────┴───────────┴──────────┴────────────┴────────┘  │
│                                                              │
│ Gesamtzinsen 2025: 18.000,00 EUR (brutto)                   │
│ Gesamtsteuern 2025: 4.860,00 EUR                            │
│ Gesamtzinsen 2025: 13.140,00 EUR (netto)                    │
│                                                              │
│ [Zahlungsplan PDF herunterladen]                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

#### 4. Hochrechnung & Dokumente

```
┌─────────────────────────────────────────────────────────────┐
│ Hochrechnung & Dokumente                                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Hochrechnung für 5 Jahre                                    │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Jahr  │ Jährliche Zinsen │ Steuern  │ Netto Zinsen    │  │
│ ├───────┼──────────────────┼──────────┼─────────────────┤  │
│ │ 2025  │ 18.000,00 EUR    │ 4.860 EUR│ 13.140,00 EUR   │  │
│ │ 2026  │ 18.000,00 EUR    │ 4.860 EUR│ 13.140,00 EUR   │  │
│ │ 2027  │ 18.000,00 EUR    │ 4.860 EUR│ 13.140,00 EUR   │  │
│ │ 2028  │ 18.000,00 EUR    │ 4.860 EUR│ 13.140,00 EUR   │  │
│ │ 2029  │ 18.000,00 EUR    │ 4.860 EUR│ 13.140,00 EUR   │  │
│ ├───────┼──────────────────┼──────────┼─────────────────┤  │
│ │ Summe │ 90.000,00 EUR    │ 24.300 EUR│ 65.700,00 EUR  │  │
│ └───────┴──────────────────┴──────────┴─────────────────┘  │
│                                                              │
│ Dokumente                                                   │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ [📄 Vertrag] Annahmebestätigung                        │  │
│ │ [📊 Hochrechnung] Zinsberechnungen 2025-2033          │  │
│ │ [💳 Zahlungsbestätigung] Einzahlung 100.000 EUR        │  │
│ │ [📋 Zahlungsplan] Monatliche Zinsauszahlungen          │  │
│ │ [🏦 Steuerbescheinigung] Jahresübersicht (verfügbar ab │  │
│ │                          31.12.2024)                   │  │
│ │ [📁 Alle Dokumente] Archiv                             │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ [Hochrechnung PDF herunterladen]                            │
│ [Steuerbescheinigung PDF herunterladen]                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Datenfluss-Diagramm

```
┌─────────────────────────────────────────────────────────────┐
│ ADMIN IMPORT WORKFLOW                                       │
└─────────────────────────────────────────────────────────────┘

Admin gibt Kundendaten ein
         ↓
    Schritt 1: Kundendaten (Name, Adresse, Email, Telefon)
         ↓
    Schritt 2: Bankverbindung & Anleihedaten
         ↓
    Schritt 3: Vertragsdaten (Zinssatz, Laufzeit, Stichtag)
         ↓
    Schritt 4: Dokumente hochladen
         ↓
    System speichert in Datenbank
         ↓
    System berechnet automatisch:
    - Zinsberechnungen für alle Monate
    - Steuern (KESt, SolZ, Kirchensteuer)
    - Netto-Zinsen
    - Zahlungsplan
         ↓
    System generiert automatisch:
    - Hochrechnung PDF
    - Zahlungsplan PDF
    - Steuerbescheinigung (Jahresende)
         ↓
    System sendet Email an Kunde:
    - Willkommens-Email
    - Hochrechnung PDF
    - Zahlungsplan PDF
         ↓
    Kunde erhält Portal-Zugriff
         ↓
    Kunde sieht im Portal:
    - Alle Vertragsdetails
    - Zahlungsplan
    - Zinsauszahlungen
    - Hochrechnung
    - Dokumente


┌─────────────────────────────────────────────────────────────┐
│ AUTOMATISCHE PROZESSE                                       │
└─────────────────────────────────────────────────────────────┘

Täglich (um 00:00 Uhr):
  - Überprüfe fällige Zinsauszahlungen
  - Generiere Zahlungserinnerungen (3 Tage vor Fälligkeit)

Monatlich (am 1. des Monats):
  - Berechne Zinsauszahlungen für den Monat
  - Sende Zinsauszahlungs-Benachrichtigungen

Jährlich (am 01.06.):
  - Berechne Jahresstichtag-Zinsen
  - Generiere Hochrechnung für nächstes Jahr
  - Aktualisiere Zahlungsplan

Jahresende (31.12.):
  - Generiere Steuerbescheinigung
  - Sende Steuerbescheinigung an Kunde
  - Archiviere Jahresdaten
```

---

## 🔐 Sicherheit & Datenschutz

### Zugriffskontrolle
- Admin: Vollzugriff auf alle Kundendaten und Dokumente
- Kunde: Nur Zugriff auf eigene Daten
- Audit-Log: Alle Änderungen werden protokolliert

### Datenschutz (DSGVO)
- Verschlüsselte Speicherung von Bankdaten
- Sichere Dokumentenverwaltung (S3)
- Automatische Löschung nach Laufzeitende + 10 Jahre
- Datenschutzerklärung im Portal

### Dokumentenverwaltung
- Alle Dokumente auf S3 gespeichert (verschlüsselt)
- Automatische Backups
- Versionskontrolle für Änderungen
- Audit-Trail für Dokumentenzugriff

---

## 📱 Responsive Design

Alle Interfaces sind responsive und funktionieren auf:
- Desktop (1920x1080)
- Tablet (768x1024)
- Mobile (375x667)

---

## 🎯 Implementierungs-Priorität

**Phase 1 (MVP)**: Admin-Import + Zinsberechnung + Kundenportal
**Phase 2**: Automatische Emails + PDF-Generierung
**Phase 3**: Reporting + Compliance-Features
**Phase 4**: Mobile App + API-Integration

---

## 📋 Checkliste für Implementierung

- [ ] Datenbank-Schema erstellen
- [ ] Admin-Import-Wizard implementieren
- [ ] Zinsberechnung-Engine implementieren
- [ ] Kundenportal-Seiten erstellen
- [ ] Email-Templates erstellen
- [ ] PDF-Generierung implementieren
- [ ] Automatische Prozesse einrichten
- [ ] Tests durchführen
- [ ] Dokumentation erstellen
- [ ] Go-Live
