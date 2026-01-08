import Decimal from 'decimal.js';

/**
 * SCHRITT 1: Basis-Zinsberechnung (ohne Steuern)
 * 
 * Formel: (Betrag × Zinssatz × Tage) / 365
 * 
 * Diese Funktion berechnet die einfachen Zinsen für einen Betrag über einen Zeitraum.
 * Sie ist die Grundlage für alle weiteren Berechnungen.
 */

interface InterestCalculationInput {
  principal: number | Decimal; // Hauptbetrag in EUR
  annualRate: number; // Jährlicher Zinssatz in % (z.B. 6 für 6%)
  days: number; // Anzahl der Tage
}

interface InterestCalculationResult {
  principal: Decimal;
  annualRate: Decimal;
  days: number;
  interestAmount: Decimal; // Berechnete Zinsen
  calculationMethod: string;
}

/**
 * Berechnet einfache Zinsen nach der Formel:
 * Zinsen = (Betrag × Zinssatz × Tage) / 365
 * 
 * @param input - Eingabeparameter (Betrag, Zinssatz, Tage)
 * @returns Berechnete Zinsen
 * 
 * @example
 * const result = calculateBasicInterest({
 *   principal: 100000,
 *   annualRate: 6,
 *   days: 30
 * });
 * // result.interestAmount = 493.15 EUR
 */
export function calculateBasicInterest(
  input: InterestCalculationInput
): InterestCalculationResult {
  // Konvertiere zu Decimal für präzise Berechnung
  const principal = new Decimal(input.principal);
  const annualRate = new Decimal(input.annualRate);
  const days = new Decimal(input.days);

  // Validierung
  if (principal.lessThan(0)) {
    throw new Error('Betrag darf nicht negativ sein');
  }
  if (annualRate.lessThan(0)) {
    throw new Error('Zinssatz darf nicht negativ sein');
  }
  if (days.lessThan(0)) {
    throw new Error('Tage darf nicht negativ sein');
  }

  // Formel: (Betrag × Zinssatz × Tage) / 365 / 100
  // Hinweis: Zinssatz ist in Prozent, daher durch 100 teilen
  const interestAmount = principal
    .times(annualRate)
    .times(days)
    .dividedBy(365)
    .dividedBy(100)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  return {
    principal,
    annualRate,
    days: input.days,
    interestAmount,
    calculationMethod: 'simple_interest_365_days',
  };
}

/**
 * Berechnet Zinsen für mehrere Perioden (z.B. Monate)
 * Nützlich für Zahlungsplan-Berechnung
 * 
 * @param input - Eingabeparameter
 * @param periods - Anzahl der Perioden (z.B. 12 für 12 Monate)
 * @returns Array von Zinsen für jede Periode
 */
export function calculateInterestByPeriods(
  input: InterestCalculationInput,
  periods: number
): InterestCalculationResult[] {
  if (periods <= 0) {
    throw new Error('Perioden müssen größer als 0 sein');
  }

  const daysPerPeriod = input.days / periods;
  const results: InterestCalculationResult[] = [];

  for (let i = 0; i < periods; i++) {
    const result = calculateBasicInterest({
      principal: input.principal,
      annualRate: input.annualRate,
      days: daysPerPeriod,
    });
    results.push(result);
  }

  return results;
}

/**
 * Berechnet Zinsen für einen Datumsbereich
 * 
 * @param principal - Hauptbetrag
 * @param annualRate - Jährlicher Zinssatz
 * @param startDate - Startdatum
 * @param endDate - Enddatum
 * @returns Berechnete Zinsen
 */
export function calculateInterestByDateRange(
  principal: number | Decimal,
  annualRate: number,
  startDate: Date,
  endDate: Date
): InterestCalculationResult {
  // Berechne Anzahl der Tage zwischen den Daten
  const timeDiff = endDate.getTime() - startDate.getTime();
  const days = Math.ceil(timeDiff / (1000 * 3600 * 24));

  if (days < 0) {
    throw new Error('Enddatum muss nach Startdatum liegen');
  }

  return calculateBasicInterest({
    principal,
    annualRate,
    days,
  });
}

/**
 * Berechnet die Gesamtzinsen für einen Zeitraum
 * (Summe aller Perioden)
 * 
 * @param input - Eingabeparameter
 * @param periods - Anzahl der Perioden
 * @returns Gesamtzinsen
 */
export function calculateTotalInterestByPeriods(
  input: InterestCalculationInput,
  periods: number
): Decimal {
  const results = calculateInterestByPeriods(input, periods);
  return results.reduce(
    (sum, result) => sum.plus(result.interestAmount),
    new Decimal(0)
  );
}


/**
 * SCHRITT 2: Steuern-Berechnung
 * 
 * Berechnet folgende Steuern auf Zinserträge:
 * - KESt (Kapitalertragssteuer): 25% auf Zinsen
 * - SolZ (Solidaritätszuschlag): 5,5% auf die KESt (nicht auf Zinsen!)
 * - Kirchensteuer: 0-9% auf Zinsen (optional, abhängig von Bundesland)
 * 
 * Formel:
 * KESt = Zinsen × 25%
 * SolZ = KESt × 5,5%
 * Kirchensteuer = Zinsen × Kirchensteuer% (falls applicable)
 * Gesamtsteuern = KESt + SolZ + Kirchensteuer
 * Netto-Zinsen = Zinsen - Gesamtsteuern
 */

interface TaxCalculationInput {
  interestAmount: number | Decimal; // Zinsbetrag in EUR
  kestRate?: number; // KESt-Satz in % (Standard: 25)
  solzRate?: number; // SolZ-Satz in % (Standard: 5.5)
  churchTaxRate?: number; // Kirchensteuer in % (0-9, Standard: 0)
}

interface TaxCalculationResult {
  interestAmount: Decimal;
  kest: Decimal; // Kapitalertragssteuer
  solz: Decimal; // Solidaritätszuschlag
  churchTax: Decimal; // Kirchensteuer
  totalTaxes: Decimal; // Gesamtsteuern
  netInterest: Decimal; // Netto-Zinsen nach Steuern
  taxRate: Decimal; // Effektiver Steuersatz in %
}

/**
 * Berechnet Steuern auf Zinserträge
 * 
 * @param input - Eingabeparameter (Zinsbetrag, Steuersätze)
 * @returns Steuern und Netto-Zinsen
 * 
 * @example
 * const result = calculateTaxes({
 *   interestAmount: 1000,
 *   kestRate: 25,
 *   solzRate: 5.5,
 *   churchTaxRate: 9
 * });
 * // KESt: 250€
 * // SolZ: 13.75€ (250 × 5.5%)
 * // Kirchensteuer: 90€
 * // Gesamtsteuern: 353.75€
 * // Netto: 646.25€
 */
export function calculateTaxes(
  input: TaxCalculationInput
): TaxCalculationResult {
  // Standardwerte
  const kestRate = input.kestRate ?? 25;
  const solzRate = input.solzRate ?? 5.5;
  const churchTaxRate = input.churchTaxRate ?? 0;

  // Konvertiere zu Decimal für präzise Berechnung
  const interestAmount = new Decimal(input.interestAmount);

  // Validierung
  if (interestAmount.lessThan(0)) {
    throw new Error('Zinsbetrag darf nicht negativ sein');
  }
  if (kestRate < 0 || kestRate > 100) {
    throw new Error('KESt-Satz muss zwischen 0 und 100% liegen');
  }
  if (solzRate < 0 || solzRate > 100) {
    throw new Error('SolZ-Satz muss zwischen 0 und 100% liegen');
  }
  if (churchTaxRate < 0 || churchTaxRate > 100) {
    throw new Error('Kirchensteuer-Satz muss zwischen 0 und 100% liegen');
  }

  // Berechne KESt (25% auf Zinsen)
  const kest = interestAmount
    .times(new Decimal(kestRate))
    .dividedBy(100)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  // Berechne SolZ (5,5% auf KESt, nicht auf Zinsen!)
  const solz = kest
    .times(new Decimal(solzRate))
    .dividedBy(100)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  // Berechne Kirchensteuer (0-9% auf Zinsen)
  const churchTax = interestAmount
    .times(new Decimal(churchTaxRate))
    .dividedBy(100)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  // Gesamtsteuern
  const totalTaxes = kest
    .plus(solz)
    .plus(churchTax)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  // Netto-Zinsen
  const netInterest = interestAmount
    .minus(totalTaxes)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  // Effektiver Steuersatz
  const taxRate = interestAmount.isZero()
    ? new Decimal(0)
    : totalTaxes
        .dividedBy(interestAmount)
        .times(100)
        .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  return {
    interestAmount,
    kest,
    solz,
    churchTax,
    totalTaxes,
    netInterest,
    taxRate,
  };
}

/**
 * Kombinierte Berechnung: Zinsen + Steuern
 * Berechnet Zinsen und zieht dann Steuern ab
 * 
 * @param interestInput - Eingabeparameter für Zinsberechnung
 * @param taxInput - Eingabeparameter für Steuerberechnung (optional)
 * @returns Zinsen und Netto-Zinsen nach Steuern
 */
export interface CombinedInterestAndTaxResult {
  interest: InterestCalculationResult;
  taxes: TaxCalculationResult;
  netInterestAfterTax: Decimal;
}

export function calculateInterestAndTaxes(
  interestInput: InterestCalculationInput,
  taxInput?: Omit<TaxCalculationInput, 'interestAmount'>
): CombinedInterestAndTaxResult {
  // Berechne zuerst die Zinsen
  const interest = calculateBasicInterest(interestInput);

  // Berechne dann die Steuern
  const taxes = calculateTaxes({
    interestAmount: interest.interestAmount,
    ...taxInput,
  });

  return {
    interest,
    taxes,
    netInterestAfterTax: taxes.netInterest,
  };
}
