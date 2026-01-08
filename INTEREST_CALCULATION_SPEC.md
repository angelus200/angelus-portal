# Erweiterte Zinsberechnung-Engine - Spezifikation

## Geschäftsregeln

### 1. Insolvenzvorhalt
Zahlungen erfolgen nur, wenn das Unternehmen zahlungsfähig ist. Bei Insolvenz werden keine Zinsen gezahlt, aber die Ansprüche bleiben bestehen und werden später nachgeholt.

**Implementierung:**
- Flag `insolvency_hold` in `legacy_customers` Tabelle
- Wenn `insolvency_hold = true`, werden Zahlungen ausgesetzt
- Ausstehende Zahlungen werden in `payment_defaults` Tabelle verwaltet

### 2. Keine Verzugszinsen für Verbindlichkeit
Das Unternehmen zahlt keine Verzugszinsen, wenn Zahlungen verspätet erfolgen. Dies ist eine einseitige Regelung zu Gunsten des Unternehmens.

**Implementierung:**
- Flag `no_default_interest_for_company = true` in `interest_parameters`
- Verspätete Zahlungen werden nicht mit Verzugszins berechnet

### 3. Flexible Zahlungsweisen
Anleihen können mit verschiedenen Zahlungsweisen strukturiert sein:

| Zahlungsweise | Beschreibung | Zinseszins |
|---|---|---|
| **Monatlich** | Zinsen werden monatlich ausgezahlt | Nein |
| **Jährlich** | Zinsen werden jährlich ausgezahlt | Nein |
| **Thesaurierend** | Zinsen werden reinvestiert (nicht ausgezahlt) | Nein |

**Wichtig:** Es gibt keinen Zinseszinseffekt. Die Zinsen werden immer auf den Ursprungsbetrag berechnet.

**Beispiel (Thesaurierung ohne Zinseszins):**
- Ursprungsbetrag: 100.000 €
- Zinssatz: 6% p.a.
- Jahr 1: 100.000 € × 6% = 6.000 € (Zinsen reinvestiert, aber nicht verzinst)
- Jahr 2: 100.000 € × 6% = 6.000 € (nicht 106.000 € × 6%)
- Gesamtvermögen nach 2 Jahren: 100.000 € + 6.000 € + 6.000 € = 112.000 €

### 4. Verzugszins für unvollständige Einzahlungen
Wenn ein Investor eine Summe von z.B. 100.000 € zeichnet, aber nur 80.000 € bezahlt, wird auf die fehlende Summe (20.000 €) ein Verzugszins von 17% p.a. berechnet.

**Implementierung:**
- Feld `drawn_amount` (gezeichnete Summe) und `paid_amount` (bezahlte Summe)
- Differenz: `outstanding_amount = drawn_amount - paid_amount`
- Verzugszins: `outstanding_amount × 17% p.a.`

**Beispiel:**
- Gezeichnet: 100.000 €
- Bezahlt: 80.000 €
- Ausstehend: 20.000 €
- Verzugszins pro Jahr: 20.000 € × 17% = 3.400 €

### 5. Flexible Zinsparameter
Alle Zinsparameter müssen flexibel änderbar sein:

| Parameter | Beschreibung | Beispiel |
|---|---|---|
| `annual_interest_rate` | Jährlicher Zinssatz | 6% |
| `default_interest_rate` | Verzugszins für ausstehende Zahlungen | 17% |
| `interest_payment_frequency` | Zahlungsrhythmus | monthly, annual, thesaurierend |
| `capital_gains_tax` | Kapitalertragsteuer | 25% |
| `solidarity_surcharge` | Solidaritätszuschlag | 5.5% |
| `church_tax` | Kirchensteuer | 0% - 9% |
| `insolvency_hold` | Insolvenzvorhalt aktiv | true/false |
| `no_default_interest_for_company` | Keine Verzugszinsen für Verbindlichkeit | true |

## Datenbankschema

### `interest_parameters` Tabelle
Globale Zinsparameter für alle Anleihen.

```sql
CREATE TABLE interest_parameters (
  id INT PRIMARY KEY AUTO_INCREMENT,
  annual_interest_rate DECIMAL(5,2) DEFAULT 6.00,
  default_interest_rate DECIMAL(5,2) DEFAULT 17.00,
  capital_gains_tax DECIMAL(5,2) DEFAULT 25.00,
  solidarity_surcharge DECIMAL(5,2) DEFAULT 5.50,
  church_tax DECIMAL(5,2) DEFAULT 0.00,
  no_default_interest_for_company BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### `bond_interest_rules` Tabelle
Anleihenspezifische Zinsregeln (überschreiben globale Parameter).

```sql
CREATE TABLE bond_interest_rules (
  id INT PRIMARY KEY AUTO_INCREMENT,
  bond_id INT NOT NULL,
  annual_interest_rate DECIMAL(5,2),
  default_interest_rate DECIMAL(5,2),
  interest_payment_frequency ENUM('monthly', 'annual', 'thesaurierend') DEFAULT 'monthly',
  insolvency_hold BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (bond_id) REFERENCES bonds(id)
);
```

### `payment_defaults` Tabelle
Verwaltet Zahlungsausfälle und Verzugszins.

```sql
CREATE TABLE payment_defaults (
  id INT PRIMARY KEY AUTO_INCREMENT,
  legacy_customer_id INT NOT NULL,
  outstanding_amount DECIMAL(15,2) NOT NULL,
  default_interest_rate DECIMAL(5,2) NOT NULL,
  accrued_default_interest DECIMAL(15,2) DEFAULT 0.00,
  payment_date DATE,
  status ENUM('pending', 'partial', 'paid') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (legacy_customer_id) REFERENCES legacy_customers(id)
);
```

### `insolvency_holds` Tabelle
Verwaltet Insolvenzvorbehalte und ausstehende Zahlungen.

```sql
CREATE TABLE insolvency_holds (
  id INT PRIMARY KEY AUTO_INCREMENT,
  legacy_customer_id INT NOT NULL,
  hold_date DATE NOT NULL,
  reason VARCHAR(255),
  outstanding_interest DECIMAL(15,2) DEFAULT 0.00,
  status ENUM('active', 'resolved') DEFAULT 'active',
  resolved_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (legacy_customer_id) REFERENCES legacy_customers(id)
);
```

## Zinsberechnung-Algorithmus

### Schritt 1: Zinsparameter abrufen
```
1. Hole globale Parameter aus `interest_parameters`
2. Hole anleihenspezifische Parameter aus `bond_interest_rules`
3. Überschreibe globale Parameter mit anleihenspezifischen (falls vorhanden)
```

### Schritt 2: Insolvenzvorhalt prüfen
```
1. Prüfe `insolvency_hold` Flag
2. Wenn aktiv:
   - Berechne Zinsen, aber speichere sie als "ausstehend"
   - Erstelle Eintrag in `insolvency_holds`
   - Zahlung wird nicht durchgeführt
3. Wenn inaktiv:
   - Fahre mit normaler Berechnung fort
```

### Schritt 3: Verzugszins für ausstehende Einzahlungen
```
1. Berechne: outstanding_amount = drawn_amount - paid_amount
2. Wenn outstanding_amount > 0:
   - Verzugszins = outstanding_amount × default_interest_rate × (days / 365)
   - Addiere zu Gesamtzinsen
```

### Schritt 4: Basis-Zinsberechnung
```
1. Berechne Zinsen auf bezahlten Betrag:
   interest = paid_amount × annual_interest_rate × (days / 365)

2. Nach Zahlungsweise:
   - Monatlich: Zahle Zinsen aus
   - Jährlich: Zahle Zinsen aus
   - Thesaurierend: Addiere zu Kapital (aber KEIN Zinseszins!)
```

### Schritt 5: Steuern berechnen
```
1. Berechne Steuern auf Zinsen:
   - Kapitalertragsteuer = interest × capital_gains_tax
   - Solidaritätszuschlag = interest × solidarity_surcharge
   - Kirchensteuer = interest × church_tax (optional)

2. Netto-Zinsen = interest - (Kapitalertragsteuer + Solidaritätszuschlag + Kirchensteuer)
```

### Schritt 6: Verzugszinsen für verspätete Zahlungen
```
1. Wenn no_default_interest_for_company = true:
   - Keine Verzugszinsen für verspätete Zahlungen des Unternehmens
2. Sonst:
   - Berechne Verzugszinsen für jeden Tag Verspätung
```

## Implementierungsbeispiel (Pseudocode)

```typescript
function calculateInterest(
  customer: LegacyCustomer,
  period: { startDate: Date, endDate: Date }
): InterestCalculation {
  // Schritt 1: Parameter abrufen
  const globalParams = await getInterestParameters();
  const bondRules = await getBondInterestRules(customer.bondId);
  const params = { ...globalParams, ...bondRules };

  // Schritt 2: Insolvenzvorhalt prüfen
  if (params.insolvency_hold) {
    return {
      status: 'on_hold',
      reason: 'Insolvenzvorhalt aktiv',
      outstandingInterest: calculateBaseInterest(customer, params, period),
    };
  }

  // Schritt 3: Verzugszins für ausstehende Einzahlungen
  const outstandingAmount = customer.drawnAmount - customer.paidAmount;
  const defaultInterest = outstandingAmount > 0 
    ? outstandingAmount * params.defaultInterestRate * (days / 365)
    : 0;

  // Schritt 4: Basis-Zinsberechnung
  const baseInterest = customer.paidAmount * params.annualInterestRate * (days / 365);

  // Schritt 5: Steuern berechnen
  const taxes = calculateTaxes(baseInterest, params);
  const netInterest = baseInterest - taxes.total;

  // Schritt 6: Zahlungsweise bearbeiten
  const payment = handlePaymentFrequency(netInterest, params.interestPaymentFrequency);

  return {
    status: 'calculated',
    baseInterest,
    defaultInterest,
    taxes,
    netInterest,
    payment,
  };
}
```

## Testfälle

### Test 1: Normale Zinsberechnung (monatlich)
- Betrag: 100.000 €
- Zinssatz: 6% p.a.
- Zahlungsweise: Monatlich
- Erwartung: 500 € pro Monat (100.000 € × 6% / 12)

### Test 2: Verzugszins für ausstehende Einzahlungen
- Gezeichnet: 100.000 €
- Bezahlt: 80.000 €
- Verzugszins: 17% p.a.
- Erwartung: 3.400 € pro Jahr auf 20.000 € ausstehend

### Test 3: Insolvenzvorhalt
- Insolvenzvorhalt: aktiv
- Normale Zinsen: 500 € pro Monat
- Erwartung: Zinsen werden berechnet, aber nicht gezahlt (ausstehend)

### Test 4: Thesaurierung ohne Zinseszins
- Betrag: 100.000 €
- Zinssatz: 6% p.a.
- Zahlungsweise: Thesaurierend
- Jahr 1: 100.000 € + 6.000 € = 106.000 €
- Jahr 2: 106.000 € + 6.000 € = 112.000 € (nicht 106.000 € × 6%)

### Test 5: Steuern
- Zinsen: 1.000 €
- Kapitalertragsteuer: 25% = 250 €
- Solidaritätszuschlag: 5,5% = 55 €
- Netto: 1.000 € - 250 € - 55 € = 695 €
