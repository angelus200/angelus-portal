import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import {
  calculateBasicInterest,
  calculateInterestByPeriods,
  calculateInterestByDateRange,
  calculateTotalInterestByPeriods,
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
