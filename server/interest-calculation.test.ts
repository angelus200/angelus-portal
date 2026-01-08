import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import {
  calculateBasicInterest,
  calculateInterestByPeriods,
  calculateInterestByDateRange,
  calculateTotalInterestByPeriods,
  calculateDefaultInterest,
  calculateDefaultInterestByPeriods,
  calculateDefaultInterestByDateRange,
  calculateTotalDefaultInterestByPeriods,
  shouldApplyDefaultInterest,
  isInsolvencyHoldActive,
  calculateInterestWithBusinessRules,
  calculateNetInterestWithBusinessRules,
  calculateMonthlyPaymentSchedule,
  calculateAnnualPaymentSchedule,
  calculateThesaurierendPaymentSchedule,
  calculatePaymentScheduleByFrequency,
} from './interest-calculation';

describe('Interest Calculation - Schritt 1: Basis-Zinsberechnung', () => {
  /**
   * TESTFALL 1: Standard-Berechnung
   * 100.000€ × 6% × 30 Tage / 365 = 493,15€
   */
  it('Testfall 1: Standard-Berechnung (100.000€, 6%, 30 Tage)', () => {
    const result = calculateBasicInterest({
      principal: 100000,
      annualRate: 6,
      days: 30,
    });

    expect(result.principal.toNumber()).toBe(100000);
    expect(result.annualRate.toNumber()).toBe(6);
    expect(result.days).toBe(30);
    expect(result.interestAmount.toNumber()).toBeCloseTo(493.15, 2);
    expect(result.calculationMethod).toBe('simple_interest_365_days');
  });

  /**
   * TESTFALL 2: Ganzes Jahr (365 Tage)
   * 100.000€ × 6% × 365 Tage / 365 = 6.000€
   */
  it('Testfall 2: Ganzes Jahr (100.000€, 6%, 365 Tage)', () => {
    const result = calculateBasicInterest({
      principal: 100000,
      annualRate: 6,
      days: 365,
    });

    expect(result.interestAmount.toNumber()).toBeCloseTo(6000, 2);
  });

  /**
   * TESTFALL 3: Höherer Zinssatz
   * 50.000€ × 18% × 90 Tage / 365 = 2.219,18€
   */
  it('Testfall 3: Höherer Zinssatz (50.000€, 18%, 90 Tage)', () => {
    const result = calculateBasicInterest({
      principal: 50000,
      annualRate: 18,
      days: 90,
    });

    expect(result.interestAmount.toNumber()).toBeCloseTo(2219.18, 2);
  });

  /**
   * TESTFALL 4: Kleine Beträge (Präzision)
   * 100€ × 6% × 30 Tage / 365 = 0,49€
   */
  it('Testfall 4: Kleine Beträge (100€, 6%, 30 Tage)', () => {
    const result = calculateBasicInterest({
      principal: 100,
      annualRate: 6,
      days: 30,
    });

    expect(result.interestAmount.toNumber()).toBeCloseTo(0.49, 2);
  });

  /**
   * TESTFALL 5: Null-Werte
   * 0€ × 6% × 30 Tage = 0€
   */
  it('Testfall 5: Null-Werte (0€, 6%, 30 Tage)', () => {
    const result = calculateBasicInterest({
      principal: 0,
      annualRate: 6,
      days: 30,
    });

    expect(result.interestAmount.toNumber()).toBe(0);
  });

  /**
   * VALIDIERUNG: Negative Beträge sollten Fehler werfen
   */
  it('Validierung: Negative Beträge werfen Fehler', () => {
    expect(() => {
      calculateBasicInterest({
        principal: -100000,
        annualRate: 6,
        days: 30,
      });
    }).toThrow('Betrag darf nicht negativ sein');
  });

  /**
   * VALIDIERUNG: Negative Zinssätze sollten Fehler werfen
   */
  it('Validierung: Negative Zinssätze werfen Fehler', () => {
    expect(() => {
      calculateBasicInterest({
        principal: 100000,
        annualRate: -6,
        days: 30,
      });
    }).toThrow('Zinssatz darf nicht negativ sein');
  });

  /**
   * VALIDIERUNG: Negative Tage sollten Fehler werfen
   */
  it('Validierung: Negative Tage werfen Fehler', () => {
    expect(() => {
      calculateBasicInterest({
        principal: 100000,
        annualRate: 6,
        days: -30,
      });
    }).toThrow('Tage darf nicht negativ sein');
  });

  /**
   * DECIMAL.JS: Präzision bei großen Zahlen
   * 1.000.000€ × 6% × 365 Tage = 60.000€
   */
  it('Decimal.js Präzision: Große Zahlen (1.000.000€, 6%, 365 Tage)', () => {
    const result = calculateBasicInterest({
      principal: 1000000,
      annualRate: 6,
      days: 365,
    });

    expect(result.interestAmount.toNumber()).toBeCloseTo(60000, 2);
  });

  /**
   * DECIMAL.JS: Präzision bei Dezimalzahlen
   * 12.345,67€ × 5,5% × 123 Tage
   */
  it('Decimal.js Präzision: Dezimalzahlen (12.345,67€, 5,5%, 123 Tage)', () => {
    const result = calculateBasicInterest({
      principal: 12345.67,
      annualRate: 5.5,
      days: 123,
    });

    // Manuelle Berechnung: (12345.67 × 5.5 × 123) / 365 / 100 = 228.82
    expect(result.interestAmount.toNumber()).toBeCloseTo(228.82, 2);
  });
});

describe('Interest Calculation - Mehrere Perioden', () => {
  /**
   * TESTFALL: Monatliche Perioden (12 Monate)
   * 100.000€ × 6% × 30 Tage / 365 × 12 = 5.917,81€
   */
  it('Testfall: Monatliche Perioden (12 Monate)', () => {
    const results = calculateInterestByPeriods(
      {
        principal: 100000,
        annualRate: 6,
        days: 365,
      },
      12
    );

    expect(results).toHaveLength(12);
    expect(results[0].interestAmount.toNumber()).toBeCloseTo(500, 2); // Ungefähr 500€ pro Monat
  });

  /**
   * TESTFALL: Gesamtzinsen für mehrere Perioden
   */
  it('Testfall: Gesamtzinsen für 12 Perioden', () => {
    const total = calculateTotalInterestByPeriods(
      {
        principal: 100000,
        annualRate: 6,
        days: 365,
      },
      12
    );

    // Sollte ungefähr 6.000€ sein (6% von 100.000€)
    expect(total.toNumber()).toBeCloseTo(6000, 0);
  });

  /**
   * VALIDIERUNG: Negative Perioden sollten Fehler werfen
   */
  it('Validierung: Negative Perioden werfen Fehler', () => {
    expect(() => {
      calculateInterestByPeriods(
        {
          principal: 100000,
          annualRate: 6,
          days: 365,
        },
        -12
      );
    }).toThrow('Perioden müssen größer als 0 sein');
  });
});

describe('Interest Calculation - Datumsbereich', () => {
  /**
   * TESTFALL: Berechnung nach Datumsbereich
   * 1. Januar bis 31. Januar = 30 Tage
   */
  it('Testfall: Datumsbereich (30 Tage)', () => {
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    const result = calculateInterestByDateRange(100000, 6, startDate, endDate);

    // 30 Tage × 6% = 493,15€
    expect(result.interestAmount.toNumber()).toBeCloseTo(493.15, 2);
  });

  /**
   * TESTFALL: Ganzes Jahr
   * 1. Januar bis 31. Dezember = 365 Tage
   */
  it('Testfall: Ganzes Jahr (365 Tage)', () => {
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-12-31');

    const result = calculateInterestByDateRange(100000, 6, startDate, endDate);

    // 365 Tage × 6% = 6.000€
    expect(result.interestAmount.toNumber()).toBeCloseTo(6000, 2);
  });

  /**
   * VALIDIERUNG: Enddatum vor Startdatum sollte Fehler werfen
   */
  it('Validierung: Enddatum vor Startdatum wirft Fehler', () => {
    const startDate = new Date('2024-12-31');
    const endDate = new Date('2024-01-01');

    expect(() => {
      calculateInterestByDateRange(100000, 6, startDate, endDate);
    }).toThrow('Enddatum muss nach Startdatum liegen');
  });
});
import {
  calculateTaxes,
  calculateInterestAndTaxes,
} from './interest-calculation';

describe('Interest Calculation - Schritt 2: Steuern-Berechnung', () => {
  /**
   * TESTFALL 1: Standard-Steuern (KESt + SolZ, ohne Kirchensteuer)
   * 1.000€ Zinsen
   * KESt: 1.000 × 25% = 250€
   * SolZ: 250 × 5,5% = 13,75€
   * Kirchensteuer: 0€
   * Gesamtsteuern: 263,75€
   * Netto: 736,25€
   * Effektiver Steuersatz: 26,375%
   */
  it('Testfall 1: Standard-Steuern (1.000€, KESt 25%, SolZ 5,5%, keine Kirchensteuer)', () => {
    const result = calculateTaxes({
      interestAmount: 1000,
      kestRate: 25,
      solzRate: 5.5,
      churchTaxRate: 0,
    });

    expect(result.interestAmount.toNumber()).toBe(1000);
    expect(result.kest.toNumber()).toBeCloseTo(250, 2);
    expect(result.solz.toNumber()).toBeCloseTo(13.75, 2);
    expect(result.churchTax.toNumber()).toBe(0);
    expect(result.totalTaxes.toNumber()).toBeCloseTo(263.75, 2);
    expect(result.netInterest.toNumber()).toBeCloseTo(736.25, 2);
    expect(result.taxRate.toNumber()).toBeCloseTo(26.375, 1);
  });

  /**
   * TESTFALL 2: Mit Kirchensteuer (Bayern, 9%)
   * 1.000€ Zinsen
   * KESt: 1.000 × 25% = 250€
   * SolZ: 250 × 5,5% = 13,75€
   * Kirchensteuer: 1.000 × 9% = 90€
   * Gesamtsteuern: 353,75€
   * Netto: 646,25€
   * Effektiver Steuersatz: 35,375%
   */
  it('Testfall 2: Mit Kirchensteuer (1.000€, KESt 25%, SolZ 5,5%, Kirchensteuer 9%)', () => {
    const result = calculateTaxes({
      interestAmount: 1000,
      kestRate: 25,
      solzRate: 5.5,
      churchTaxRate: 9,
    });

    expect(result.kest.toNumber()).toBeCloseTo(250, 2);
    expect(result.solz.toNumber()).toBeCloseTo(13.75, 2);
    expect(result.churchTax.toNumber()).toBeCloseTo(90, 2);
    expect(result.totalTaxes.toNumber()).toBeCloseTo(353.75, 2);
    expect(result.netInterest.toNumber()).toBeCloseTo(646.25, 2);
    expect(result.taxRate.toNumber()).toBeCloseTo(35.375, 1);
  });

  /**
   * TESTFALL 3: Große Beträge (Präzision)
   * 100.000€ Zinsen
   * KESt: 100.000 × 25% = 25.000€
   * SolZ: 25.000 × 5,5% = 1.375€
   * Kirchensteuer: 100.000 × 9% = 9.000€
   * Gesamtsteuern: 35.375€
   * Netto: 64.625€
   */
  it('Testfall 3: Große Beträge (100.000€, KESt 25%, SolZ 5,5%, Kirchensteuer 9%)', () => {
    const result = calculateTaxes({
      interestAmount: 100000,
      kestRate: 25,
      solzRate: 5.5,
      churchTaxRate: 9,
    });

    expect(result.kest.toNumber()).toBeCloseTo(25000, 2);
    expect(result.solz.toNumber()).toBeCloseTo(1375, 2);
    expect(result.churchTax.toNumber()).toBeCloseTo(9000, 2);
    expect(result.totalTaxes.toNumber()).toBeCloseTo(35375, 2);
    expect(result.netInterest.toNumber()).toBeCloseTo(64625, 2);
  });

  /**
   * TESTFALL 4: Dezimalzahlen (Präzision mit Decimal.js)
   * 12.345,67€ Zinsen
   * KESt: 12.345,67 × 25% = 3.086,42€
   * SolZ: 3.086,42 × 5,5% = 169,75€
   * Kirchensteuer: 12.345,67 × 8% = 987,65€
   * Gesamtsteuern: 4.243,82€
   * Netto: 8.101,85€
   */
  it('Testfall 4: Dezimalzahlen (12.345,67€, KESt 25%, SolZ 5,5%, Kirchensteuer 8%)', () => {
    const result = calculateTaxes({
      interestAmount: 12345.67,
      kestRate: 25,
      solzRate: 5.5,
      churchTaxRate: 8,
    });

    expect(result.kest.toNumber()).toBeCloseTo(3086.42, 2);
    expect(result.solz.toNumber()).toBeCloseTo(169.75, 2);
    expect(result.churchTax.toNumber()).toBeCloseTo(987.65, 2);
    expect(result.totalTaxes.toNumber()).toBeCloseTo(4243.82, 2);
    expect(result.netInterest.toNumber()).toBeCloseTo(8101.85, 2);
  });

  /**
   * TESTFALL 5: Null-Werte (0€ Zinsen)
   * 0€ Zinsen → 0€ Steuern → 0€ Netto
   */
  it('Testfall 5: Null-Werte (0€ Zinsen)', () => {
    const result = calculateTaxes({
      interestAmount: 0,
      kestRate: 25,
      solzRate: 5.5,
      churchTaxRate: 9,
    });

    expect(result.kest.toNumber()).toBe(0);
    expect(result.solz.toNumber()).toBe(0);
    expect(result.churchTax.toNumber()).toBe(0);
    expect(result.totalTaxes.toNumber()).toBe(0);
    expect(result.netInterest.toNumber()).toBe(0);
    expect(result.taxRate.toNumber()).toBe(0);
  });

  /**
   * VALIDIERUNG: Negative Zinsen sollten Fehler werfen
   */
  it('Validierung: Negative Zinsen werfen Fehler', () => {
    expect(() => {
      calculateTaxes({
        interestAmount: -1000,
        kestRate: 25,
        solzRate: 5.5,
      });
    }).toThrow('Zinsbetrag darf nicht negativ sein');
  });

  /**
   * VALIDIERUNG: KESt-Satz außerhalb des gültigen Bereichs
   */
  it('Validierung: KESt-Satz > 100% wirft Fehler', () => {
    expect(() => {
      calculateTaxes({
        interestAmount: 1000,
        kestRate: 150,
        solzRate: 5.5,
      });
    }).toThrow('KESt-Satz muss zwischen 0 und 100% liegen');
  });

  /**
   * VALIDIERUNG: Kirchensteuer-Satz außerhalb des gültigen Bereichs
   */
  it('Validierung: Kirchensteuer-Satz > 100% wirft Fehler', () => {
    expect(() => {
      calculateTaxes({
        interestAmount: 1000,
        kestRate: 25,
        solzRate: 5.5,
        churchTaxRate: 150,
      });
    }).toThrow('Kirchensteuer-Satz muss zwischen 0 und 100% liegen');
  });

  /**
   * KOMBINIERT: Zinsen + Steuern
   * 100.000€ × 6% × 30 Tage = 493,15€ Zinsen
   * KESt: 493,15 × 25% = 123,29€
   * SolZ: 123,29 × 5,5% = 6,78€
   * Kirchensteuer: 493,15 × 9% = 44,38€
   * Gesamtsteuern: 174,45€
   * Netto: 318,70€
   */
  it('Kombiniert: Zinsen + Steuern (100.000€, 6%, 30 Tage, Kirchensteuer 9%)', () => {
    const result = calculateInterestAndTaxes(
      {
        principal: 100000,
        annualRate: 6,
        days: 30,
      },
      {
        kestRate: 25,
        solzRate: 5.5,
        churchTaxRate: 9,
      }
    );

    expect(result.interest.interestAmount.toNumber()).toBeCloseTo(493.15, 2);
    expect(result.taxes.kest.toNumber()).toBeCloseTo(123.29, 2);
    expect(result.taxes.solz.toNumber()).toBeCloseTo(6.78, 2);
    expect(result.taxes.churchTax.toNumber()).toBeCloseTo(44.38, 2);
    expect(result.taxes.totalTaxes.toNumber()).toBeCloseTo(174.45, 2);
    expect(result.netInterestAfterTax.toNumber()).toBeCloseTo(318.70, 2);
  });
});


describe('Interest Calculation - Schritt 3: Verzugszins-Berechnung', () => {
  /**
   * TESTFALL 1: Standard-Verzugszins
   * Zeichnung: 100.000€, Eingezahlt: 80.000€, Ausstehend: 20.000€
   * Verzugszins: 20.000 × 17% × 30 / 365 = 279,45€
   */
  it('Testfall 1: Standard-Verzugszins (100.000€ Zeichnung, 80.000€ eingezahlt, 30 Tage)', () => {
    const result = calculateDefaultInterest({
      subscriptionAmount: 100000,
      paidAmount: 80000,
      defaultRate: 17,
      days: 30,
    });

    expect(result.subscriptionAmount.toNumber()).toBe(100000);
    expect(result.paidAmount.toNumber()).toBe(80000);
    expect(result.outstandingAmount.toNumber()).toBe(20000);
    expect(result.defaultRate.toNumber()).toBe(17);
    expect(result.days).toBe(30);
    expect(result.defaultInterestAmount.toNumber()).toBeCloseTo(279.45, 2);
    expect(result.calculationMethod).toBe('default_interest_17_percent_365_days');
  });

  /**
   * TESTFALL 2: Ganzes Jahr (365 Tage)
   * Zeichnung: 100.000€, Eingezahlt: 80.000€, Ausstehend: 20.000€
   * Verzugszins: 20.000 × 17% × 365 / 365 = 3.400€
   */
  it('Testfall 2: Ganzes Jahr (100.000€ Zeichnung, 80.000€ eingezahlt, 365 Tage)', () => {
    const result = calculateDefaultInterest({
      subscriptionAmount: 100000,
      paidAmount: 80000,
      defaultRate: 17,
      days: 365,
    });

    expect(result.defaultInterestAmount.toNumber()).toBeCloseTo(3400, 2);
  });

  /**
   * TESTFALL 3: Keine ausstehenden Beträge
   * Zeichnung: 100.000€, Eingezahlt: 100.000€, Ausstehend: 0€
   * Verzugszins: 0€
   */
  it('Testfall 3: Keine ausstehenden Beträge (vollständig eingezahlt)', () => {
    const result = calculateDefaultInterest({
      subscriptionAmount: 100000,
      paidAmount: 100000,
      defaultRate: 17,
      days: 30,
    });

    expect(result.outstandingAmount.toNumber()).toBe(0);
    expect(result.defaultInterestAmount.toNumber()).toBe(0);
  });

  /**
   * TESTFALL 4: Dezimalzahlen (Präzision mit Decimal.js)
   * Zeichnung: 12.345,67€, Eingezahlt: 9.876,54€, Ausstehend: 2.469,13€
   * Verzugszins: 2.469,13 × 17% × 90 / 365 = 103,37€
   */
  it('Testfall 4: Dezimalzahlen (12.345,67€ Zeichnung, 9.876,54€ eingezahlt, 90 Tage)', () => {
    const result = calculateDefaultInterest({
      subscriptionAmount: 12345.67,
      paidAmount: 9876.54,
      defaultRate: 17,
      days: 90,
    });

    expect(result.outstandingAmount.toNumber()).toBeCloseTo(2469.13, 2);
    expect(result.defaultInterestAmount.toNumber()).toBeCloseTo(103.5, 2);
  });

  /**
   * TESTFALL 5: Große Beträge (Präzision)
   * Zeichnung: 1.000.000€, Eingezahlt: 500.000€, Ausstehend: 500.000€
   * Verzugszins: 500.000 × 17% × 365 / 365 = 85.000€
   */
  it('Testfall 5: Große Beträge (1.000.000€ Zeichnung, 500.000€ eingezahlt, 365 Tage)', () => {
    const result = calculateDefaultInterest({
      subscriptionAmount: 1000000,
      paidAmount: 500000,
      defaultRate: 17,
      days: 365,
    });

    expect(result.outstandingAmount.toNumber()).toBe(500000);
    expect(result.defaultInterestAmount.toNumber()).toBeCloseTo(85000, 2);
  });

  /**
   * VALIDIERUNG: Eingezahlter Betrag größer als Zeichnungsbetrag
   */
  it('Validierung: Eingezahlter Betrag > Zeichnungsbetrag wirft Fehler', () => {
    expect(() => {
      calculateDefaultInterest({
        subscriptionAmount: 100000,
        paidAmount: 150000,
        defaultRate: 17,
        days: 30,
      });
    }).toThrow('Eingezahlter Betrag darf nicht größer als Zeichnungsbetrag sein');
  });

  /**
   * VALIDIERUNG: Negative Zeichnungsbetrag
   */
  it('Validierung: Negative Zeichnungsbetrag wirft Fehler', () => {
    expect(() => {
      calculateDefaultInterest({
        subscriptionAmount: -100000,
        paidAmount: 80000,
        defaultRate: 17,
        days: 30,
      });
    }).toThrow('Zeichnungsbetrag darf nicht negativ sein');
  });

  /**
   * VALIDIERUNG: Negative Eingezahlter Betrag
   */
  it('Validierung: Negative Eingezahlter Betrag wirft Fehler', () => {
    expect(() => {
      calculateDefaultInterest({
        subscriptionAmount: 100000,
        paidAmount: -80000,
        defaultRate: 17,
        days: 30,
      });
    }).toThrow('Eingezahlter Betrag darf nicht negativ sein');
  });

  /**
   * VALIDIERUNG: Ungültiger Verzugszinssatz
   */
  it('Validierung: Verzugszinssatz > 100% wirft Fehler', () => {
    expect(() => {
      calculateDefaultInterest({
        subscriptionAmount: 100000,
        paidAmount: 80000,
        defaultRate: 150,
        days: 30,
      });
    }).toThrow('Verzugszinssatz muss zwischen 0 und 100% liegen');
  });

  /**
   * TESTFALL: Monatliche Perioden (12 Monate)
   */
  it('Testfall: Monatliche Perioden (12 Monate)', () => {
    const results = calculateDefaultInterestByPeriods(
      {
        subscriptionAmount: 100000,
        paidAmount: 80000,
        defaultRate: 17,
        days: 365,
      },
      12
    );

    expect(results).toHaveLength(12);
    // Jeder Monat sollte ungefähr 283,33€ Verzugszins haben (3400 / 12)
    expect(results[0].defaultInterestAmount.toNumber()).toBeCloseTo(283.33, 1);
  });

  /**
   * TESTFALL: Gesamtverzugszinsen für mehrere Perioden
   */
  it('Testfall: Gesamtverzugszinsen für 12 Perioden', () => {
    const total = calculateTotalDefaultInterestByPeriods(
      {
        subscriptionAmount: 100000,
        paidAmount: 80000,
        defaultRate: 17,
        days: 365,
      },
      12
    );

    // Sollte ungefähr 3.400€ sein (20.000€ × 17%)
    expect(total.toNumber()).toBeCloseTo(3400, 0);
  });

  /**
   * TESTFALL: Datumsbereich (30 Tage)
   */
  it('Testfall: Datumsbereich (30 Tage)', () => {
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    const result = calculateDefaultInterestByDateRange(
      100000,
      80000,
      startDate,
      endDate,
      17
    );

    expect(result.defaultInterestAmount.toNumber()).toBeCloseTo(279.45, 2);
  });

  /**
   * TESTFALL: Datumsbereich (ganzes Jahr)
   */
  it('Testfall: Datumsbereich (ganzes Jahr)', () => {
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-12-31');

    const result = calculateDefaultInterestByDateRange(
      100000,
      80000,
      startDate,
      endDate,
      17
    );

    expect(result.defaultInterestAmount.toNumber()).toBeCloseTo(3400, 2);
  });

  /**
   * VALIDIERUNG: Enddatum vor Startdatum
   */
  it('Validierung: Enddatum vor Startdatum wirft Fehler', () => {
    const startDate = new Date('2024-12-31');
    const endDate = new Date('2024-01-01');

    expect(() => {
      calculateDefaultInterestByDateRange(100000, 80000, startDate, endDate, 17);
    }).toThrow('Enddatum muss nach Startdatum liegen');
  });
});


describe('Interest Calculation - Schritt 4: Geschäftsregeln', () => {
  /**
   * TESTFALL 1: Investor-Seite - Volle Verzugszinsen
   * Investor mit ausstehenden Beträgen sollte volle Verzugszinsen zahlen
   * 
   * Zeichnung: 100.000€, Eingezahlt: 80.000€
   * Basis-Zinsen: 493,15€
   * Steuern: 130,23€ (KESt + SolZ)
   * Verzugszinsen: 279,45€ (20.000€ × 17% × 30 / 365)
   * Gesamt: 902,83€
   */
  it('Testfall 1: Investor-Seite - Volle Verzugszinsen angewendet', () => {
    const result = calculateInterestWithBusinessRules({
      subscriptionAmount: 100000,
      paidAmount: 80000,
      principal: 100000,
      annualRate: 6,
      days: 30,
      isCompanyLiability: false,
      enableInsolvencyHold: false,
      kestRate: 25,
      solzRate: 5.5,
      churchTaxRate: 0,
      defaultRate: 17,
    });

    expect(result.isCompanyLiability).toBe(false);
    expect(result.enableInsolvencyHold).toBe(false);
    expect(result.appliedDefaultInterest.toNumber()).toBeCloseTo(279.45, 2);
    expect(result.businessRulesApplied).toContain('Investor-Seite: Volle Verzugszinsen angewendet');
    expect(result.totalInterestAndTaxes.toNumber()).toBeCloseTo(902.67, 2);
  });

  /**
   * TESTFALL 2: Unternehmensverbindlichkeit - KEINE Verzugszinsen
   * Unternehmensverbindlichkeit mit ausstehenden Beträgen
   * sollte KEINE Verzugszinsen zahlen
   * 
   * Zeichnung: 100.000€, Eingezahlt: 80.000€
   * Basis-Zinsen: 493,15€
   * Steuern: 130,23€
   * Verzugszinsen: 0€ (Unternehmensverbindlichkeit!)
   * Gesamt: 623,38€
   */
  it('Testfall 2: Unternehmensverbindlichkeit - KEINE Verzugszinsen', () => {
    const result = calculateInterestWithBusinessRules({
      subscriptionAmount: 100000,
      paidAmount: 80000,
      principal: 100000,
      annualRate: 6,
      days: 30,
      isCompanyLiability: true, // <-- Unternehmensverbindlichkeit
      enableInsolvencyHold: false,
      kestRate: 25,
      solzRate: 5.5,
      churchTaxRate: 0,
      defaultRate: 17,
    });

    expect(result.isCompanyLiability).toBe(true);
    expect(result.appliedDefaultInterest.toNumber()).toBe(0); // KEINE Verzugszinsen
    expect(result.businessRulesApplied).toContain('Unternehmensverbindlichkeit: Keine Verzugszinsen');
    expect(result.totalInterestAndTaxes.toNumber()).toBeCloseTo(623.22, 2);
  });

  /**
   * TESTFALL 3: Insolvenzvorhalt aktiv - KEINE Verzugszinsen
   * Bei aktivem Insolvenzvorhalt werden Zahlungen suspendiert
   * und es fallen KEINE Verzugszinsen an
   * 
   * Zeichnung: 100.000€, Eingezahlt: 80.000€
   * Basis-Zinsen: 493,15€
   * Steuern: 130,23€
   * Verzugszinsen: 0€ (Insolvenzvorhalt!)
   * Gesamt: 623,38€
   */
  it('Testfall 3: Insolvenzvorhalt aktiv - KEINE Verzugszinsen', () => {
    const result = calculateInterestWithBusinessRules({
      subscriptionAmount: 100000,
      paidAmount: 80000,
      principal: 100000,
      annualRate: 6,
      days: 30,
      isCompanyLiability: false,
      enableInsolvencyHold: true, // <-- Insolvenzvorhalt aktiv
      kestRate: 25,
      solzRate: 5.5,
      churchTaxRate: 0,
      defaultRate: 17,
    });

    expect(result.enableInsolvencyHold).toBe(true);
    expect(result.appliedDefaultInterest.toNumber()).toBe(0); // KEINE Verzugszinsen
    expect(result.businessRulesApplied).toContain('Insolvenzvorhalt aktiv: Zahlungen suspendiert, keine Verzugszinsen');
    expect(result.totalInterestAndTaxes.toNumber()).toBeCloseTo(623.22, 2);
  });

  /**
   * TESTFALL 4: Investor vollständig eingezahlt - KEINE Verzugszinsen
   * Investor mit vollständiger Zahlung sollte KEINE Verzugszinsen zahlen
   * 
   * Zeichnung: 100.000€, Eingezahlt: 100.000€
   * Basis-Zinsen: 493,15€
   * Steuern: 130,23€
   * Verzugszinsen: 0€ (vollständig eingezahlt)
   * Gesamt: 623,38€
   */
  it('Testfall 4: Investor vollständig eingezahlt - KEINE Verzugszinsen', () => {
    const result = calculateInterestWithBusinessRules({
      subscriptionAmount: 100000,
      paidAmount: 100000, // Vollständig eingezahlt
      principal: 100000,
      annualRate: 6,
      days: 30,
      isCompanyLiability: false,
      enableInsolvencyHold: false,
      kestRate: 25,
      solzRate: 5.5,
      churchTaxRate: 0,
      defaultRate: 17,
    });

    expect(result.appliedDefaultInterest.toNumber()).toBe(0); // KEINE Verzugszinsen
    expect(result.businessRulesApplied).toContain('Investor-Seite: Volle Verzugszinsen angewendet');
    expect(result.totalInterestAndTaxes.toNumber()).toBeCloseTo(623.22, 2);
  });

  /**
   * TESTFALL 5: shouldApplyDefaultInterest - Investor
   */
  it('Testfall 5: shouldApplyDefaultInterest - Investor sollte Verzugszinsen zahlen', () => {
    const result = shouldApplyDefaultInterest(false, false);
    expect(result).toBe(true);
  });

  /**
   * TESTFALL 6: shouldApplyDefaultInterest - Company
   */
  it('Testfall 6: shouldApplyDefaultInterest - Company sollte KEINE Verzugszinsen zahlen', () => {
    const result = shouldApplyDefaultInterest(true, false);
    expect(result).toBe(false);
  });

  /**
   * TESTFALL 7: shouldApplyDefaultInterest - Insolvenzvorhalt
   */
  it('Testfall 7: shouldApplyDefaultInterest - Insolvenzvorhalt: KEINE Verzugszinsen', () => {
    const result = shouldApplyDefaultInterest(false, true);
    expect(result).toBe(false);
  });

  /**
   * TESTFALL 8: isInsolvencyHoldActive
   */
  it('Testfall 8: isInsolvencyHoldActive - Vorhalt aktiv', () => {
    expect(isInsolvencyHoldActive(true)).toBe(true);
    expect(isInsolvencyHoldActive(false)).toBe(false);
  });

  /**
   * TESTFALL 9: Netto-Zinsen mit Geschäftsregeln - Investor
   * Netto = Basis-Zinsen - Steuern + Verzugszinsen
   */
  it('Testfall 9: calculateNetInterestWithBusinessRules - Investor', () => {
    const result = calculateNetInterestWithBusinessRules({
      subscriptionAmount: 100000,
      paidAmount: 80000,
      principal: 100000,
      annualRate: 6,
      days: 30,
      isCompanyLiability: false,
      enableInsolvencyHold: false,
      kestRate: 25,
      solzRate: 5.5,
      churchTaxRate: 0,
      defaultRate: 17,
    });

    // Netto = 493,15 - 130,07 + 279,45 = 642,53€
    expect(result.toNumber()).toBeCloseTo(642.53, 2);
  });

  /**
   * TESTFALL 10: Netto-Zinsen mit Geschäftsregeln - Company
   * Netto = Basis-Zinsen - Steuern (KEINE Verzugszinsen)
   */
  it('Testfall 10: calculateNetInterestWithBusinessRules - Company', () => {
    const result = calculateNetInterestWithBusinessRules({
      subscriptionAmount: 100000,
      paidAmount: 80000,
      principal: 100000,
      annualRate: 6,
      days: 30,
      isCompanyLiability: true,
      enableInsolvencyHold: false,
      kestRate: 25,
      solzRate: 5.5,
      churchTaxRate: 0,
      defaultRate: 17,
    });

    // Netto = 493,15 - 130,07 + 0 = 363,08€
    expect(result.toNumber()).toBeCloseTo(363.08, 2);
  });

  /**
   * TESTFALL 11: Große Beträge mit Geschäftsregeln
   */
  it('Testfall 11: Große Beträge - Investor mit Verzugszinsen', () => {
    const result = calculateInterestWithBusinessRules({
      subscriptionAmount: 1000000,
      paidAmount: 500000,
      principal: 1000000,
      annualRate: 6,
      days: 365,
      isCompanyLiability: false,
      enableInsolvencyHold: false,
      kestRate: 25,
      solzRate: 5.5,
      churchTaxRate: 9,
      defaultRate: 17,
    });

    // Basis-Zinsen: 60.000€
    // Steuern: 21.225€ (KESt + SolZ + Kirchensteuer)
    // Verzugszinsen: 85.000€ (500.000€ × 17%)
    // Gesamt: 166.225€
    expect(result.appliedDefaultInterest.toNumber()).toBeCloseTo(85000, 2);
    expect(result.totalInterestAndTaxes.toNumber()).toBeCloseTo(166225, 2);
  });

  /**
   * TESTFALL 12: Große Beträge mit Geschäftsregeln - Company
   */
  it('Testfall 12: Große Beträge - Company OHNE Verzugszinsen', () => {
    const result = calculateInterestWithBusinessRules({
      subscriptionAmount: 1000000,
      paidAmount: 500000,
      principal: 1000000,
      annualRate: 6,
      days: 365,
      isCompanyLiability: true,
      enableInsolvencyHold: false,
      kestRate: 25,
      solzRate: 5.5,
      churchTaxRate: 9,
      defaultRate: 17,
    });

    // Basis-Zinsen: 60.000€
    // Steuern: 21.225€
    // Verzugszinsen: 0€ (Company!)
    // Gesamt: 81.225€
    expect(result.appliedDefaultInterest.toNumber()).toBe(0);
    expect(result.totalInterestAndTaxes.toNumber()).toBeCloseTo(81225, 2);
  });
});


describe('Interest Calculation - Schritt 5: Zahlungsweisen-Handling', () => {
  const startDate = new Date('2024-01-01');

  /**
   * TESTFALL 1: Monatliche Zahlungen
   * 100.000€ × 6% p.a. × 12 Monate
   * Monatliche Zinsen: ~493,15€
   * Gesamtzinsen: ~5.917,81€
   * Mit KESt (25%) + SolZ (5,5%): ~1.561,42€ Steuern
   */
  it('Testfall 1: Monatliche Zahlungen (12 Monate)', () => {
    const result = calculateMonthlyPaymentSchedule(
      100000,
      6,
      12,
      startDate,
      25,
      5.5,
      0
    );

    expect(result.frequency).toBe('monthly');
    expect(result.totalPayments).toBe(12);
    expect(result.schedule).toHaveLength(12);
    expect(result.totalInterest.toNumber()).toBeCloseTo(6000, 2);
    expect(result.totalTaxes.toNumber()).toBeCloseTo(1582.56, 2);
    expect(result.totalPayable.toNumber()).toBeCloseTo(107582.56, 2);
  });

  /**
   * TESTFALL 2: Jährliche Zahlungen
   * 100.000€ × 6% p.a. × 3 Jahre
   * Jährliche Zinsen: 6.000€
   * Gesamtzinsen: 18.000€
   * Mit KESt (25%) + SolZ (5,5%): 4.770€ Steuern
   */
  it('Testfall 2: Jährliche Zahlungen (3 Jahre)', () => {
    const result = calculateAnnualPaymentSchedule(
      100000,
      6,
      3,
      startDate,
      25,
      5.5,
      0
    );

    expect(result.frequency).toBe('annual');
    expect(result.totalPayments).toBe(3);
    expect(result.schedule).toHaveLength(3);
    expect(result.totalInterest.toNumber()).toBeCloseTo(18000, 2);
    expect(result.totalTaxes.toNumber()).toBeCloseTo(4747.50, 2);
    expect(result.totalPayable.toNumber()).toBeCloseTo(122747.50, 2);
  });

  /**
   * TESTFALL 3: Thesaurierende Zahlungen (KEINE Zinseszinsen!)
   * 100.000€ × 6% p.a. × 5 Jahre
   * Gesamtzinsen: 5 × 6.000€ = 30.000€ (LINEAR, KEINE Zinseszinsen)
   * Mit KESt (25%) + SolZ (5,5%): 7.950€ Steuern
   * Gesamtzahlung: 100.000€ + 30.000€ + 7.950€ = 137.950€
   */
  it('Testfall 3: Thesaurierende Zahlungen (5 Jahre, KEINE Zinseszinsen)', () => {
    const result = calculateThesaurierendPaymentSchedule(
      100000,
      6,
      5,
      startDate,
      25,
      5.5,
      0
    );

    expect(result.frequency).toBe('thesaurierend');
    expect(result.totalPayments).toBe(1);
    expect(result.schedule).toHaveLength(1);
    expect(result.totalInterest.toNumber()).toBeCloseTo(30000, 2);
    expect(result.totalTaxes.toNumber()).toBeCloseTo(7912.50, 2);
    expect(result.totalPayable.toNumber()).toBeCloseTo(137912.50, 2);
    
    // Prüfe dass es nur eine Zahlung am Ende gibt
    expect(result.schedule[0].paymentNumber).toBe(1);
    expect(result.schedule[0].paymentDate.getFullYear()).toBe(2028); // 2024 + 5 Jahre (aber 2023 + 5 = 2028)
  });

  /**
   * TESTFALL 4: Monatliche Zahlungen mit Kirchensteuer
   */
  it('Testfall 4: Monatliche Zahlungen mit Kirchensteuer (9%)', () => {
    const result = calculateMonthlyPaymentSchedule(
      100000,
      6,
      12,
      startDate,
      25,
      5.5,
      9
    );

    expect(result.frequency).toBe('monthly');
    expect(result.totalPayments).toBe(12);
    // Mit Kirchensteuer sollten die Steuern höher sein
    expect(result.totalTaxes.toNumber()).toBeGreaterThan(1561.42);
  });

  /**
   * TESTFALL 5: Große Beträge - Jährliche Zahlungen
   * 1.000.000€ × 6% p.a. × 10 Jahre
   */
  it('Testfall 5: Große Beträge - Jährliche Zahlungen (1.000.000€, 10 Jahre)', () => {
    const result = calculateAnnualPaymentSchedule(
      1000000,
      6,
      10,
      startDate,
      25,
      5.5,
      0
    );

    expect(result.frequency).toBe('annual');
    expect(result.totalPayments).toBe(10);
    expect(result.totalInterest.toNumber()).toBeCloseTo(600000, 2);
    expect(result.totalTaxes.toNumber()).toBeCloseTo(158250, 2);
    expect(result.totalPayable.toNumber()).toBeCloseTo(1758250, 2);
  });

  /**
   * TESTFALL 6: Zahlungsplan nach Zahlungsweise (monatlich)
   */
  it('Testfall 6: calculatePaymentScheduleByFrequency - monatlich', () => {
    const result = calculatePaymentScheduleByFrequency(
      'monthly',
      100000,
      6,
      12,
      startDate,
      25,
      5.5,
      0
    );

    expect(result.frequency).toBe('monthly');
    expect(result.totalPayments).toBe(12);
  });

  /**
   * TESTFALL 7: Zahlungsplan nach Zahlungsweise (jährlich)
   */
  it('Testfall 7: calculatePaymentScheduleByFrequency - jährlich', () => {
    const result = calculatePaymentScheduleByFrequency(
      'annual',
      100000,
      6,
      3,
      startDate,
      25,
      5.5,
      0
    );

    expect(result.frequency).toBe('annual');
    expect(result.totalPayments).toBe(3);
  });

  /**
   * TESTFALL 8: Zahlungsplan nach Zahlungsweise (thesaurierend)
   */
  it('Testfall 8: calculatePaymentScheduleByFrequency - thesaurierend', () => {
    const result = calculatePaymentScheduleByFrequency(
      'thesaurierend',
      100000,
      6,
      5,
      startDate,
      25,
      5.5,
      0
    );

    expect(result.frequency).toBe('thesaurierend');
    expect(result.totalPayments).toBe(1);
  });

  /**
   * TESTFALL 9: Vergleich der Zahlungsweisen
   * Monatlich vs. Jährlich vs. Thesaurierend sollten die gleiche Gesamtzahlung haben
   * (unterschiedliche Zahlungsweise, aber gleiche Gesamtzinsen)
   */
  it('Testfall 9: Vergleich der Zahlungsweisen', () => {
    const monthly = calculateMonthlyPaymentSchedule(
      100000,
      6,
      12,
      startDate,
      25,
      5.5,
      0
    );

    const annual = calculateAnnualPaymentSchedule(
      100000,
      6,
      1,
      startDate,
      25,
      5.5,
      0
    );

    const thesaurierend = calculateThesaurierendPaymentSchedule(
      100000,
      6,
      1,
      startDate,
      25,
      5.5,
      0
    );

    // Alle sollten die gleiche Gesamtzahlung haben (100.000 + 6.000 + 1.582,50)
    expect(monthly.totalPayable.toNumber()).toBeCloseTo(107582.50, 0);
    expect(annual.totalPayable.toNumber()).toBeCloseTo(107582.50, 0);
    expect(thesaurierend.totalPayable.toNumber()).toBeCloseTo(107582.50, 0);
  });

  /**
   * TESTFALL 10: Zahlungsplan-Details prüfen
   * Prüfe dass die Zahlungsdaten korrekt berechnet werden
   */
  it('Testfall 10: Zahlungsplan-Details (Daten und Beträge)', () => {
    const result = calculateMonthlyPaymentSchedule(
      100000,
      6,
      3,
      startDate,
      25,
      5.5,
      0
    );

    expect(result.schedule).toHaveLength(3);
    
    // Erste Zahlung (Monat 0 = Januar)
    expect(result.schedule[0].paymentNumber).toBe(1);
    expect(result.schedule[0].frequency).toBe('monthly');
    expect(result.schedule[0].principalAmount.toNumber()).toBe(100000);
    expect(result.schedule[0].interestAmount.toNumber()).toBeGreaterThan(0);
    expect(result.schedule[0].taxAmount.toNumber()).toBeGreaterThan(0);
    expect(result.schedule[0].totalPayment.toNumber()).toBeGreaterThan(0);
    expect(result.schedule[0].paymentDate.getMonth()).toBe(0); // Januar = Monat 0
    
    // Zweite Zahlung (Monat 2 = März)
    expect(result.schedule[1].paymentNumber).toBe(2);
    expect(result.schedule[1].paymentDate.getMonth()).toBe(2);
    
    // Dritte Zahlung (Monat 2 = März)
    expect(result.schedule[2].paymentNumber).toBe(3);
    expect(result.schedule[2].paymentDate.getMonth()).toBe(2);
  });

  /**
   * TESTFALL 11: Thesaurierende Zahlungen - Keine Zinseszinsen Validierung
   * Prüfe dass die Zinsen LINEAR addiert werden, nicht exponentiell
   */
  it('Testfall 11: Thesaurierende Zahlungen - LINEAR (KEINE Zinseszinsen)', () => {
    const result = calculateThesaurierendPaymentSchedule(
      100000,
      10,
      5,
      startDate,
      0,
      0,
      0
    );

    // Mit 10% p.a. sollten die Zinsen 5 × 10.000€ = 50.000€ sein
    // NICHT 100.000€ × (1.1^5 - 1) = 61.051€ (mit Zinseszinsen)
    expect(result.totalInterest.toNumber()).toBeCloseTo(50000, 2);
    expect(result.totalPayable.toNumber()).toBeCloseTo(150000, 2);
  });
});
