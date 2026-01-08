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


/**
 * SCHRITT 3: Verzugszins-Berechnung
 * 
 * Berechnet Verzugszinsen für ausstehende Zahlungen auf Investor-Seite.
 * 
 * Szenario: Ein Investor zeichnet 100.000€, zahlt aber nur 80.000€ ein.
 * Auf die fehlenden 20.000€ fallen Verzugszinsen von 17% p.a. an.
 * 
 * Formel:
 * Ausstehender Betrag = Zeichnungsbetrag - Eingezahlter Betrag
 * Verzugszins = Ausstehender Betrag × 17% × Tage / 365
 * 
 * WICHTIG: Keine Verzugszinsen für Unternehmensverbindlichkeiten
 * (wird in Schritt 4 behandelt)
 */

interface DefaultInterestCalculationInput {
  subscriptionAmount: number | Decimal; // Zeichnungsbetrag in EUR
  paidAmount: number | Decimal; // Eingezahlter Betrag in EUR
  defaultRate?: number; // Verzugszinssatz in % (Standard: 17)
  days: number; // Anzahl der Tage
}

interface DefaultInterestCalculationResult {
  subscriptionAmount: Decimal;
  paidAmount: Decimal;
  outstandingAmount: Decimal; // Ausstehender Betrag
  defaultRate: Decimal;
  days: number;
  defaultInterestAmount: Decimal; // Berechnete Verzugszinsen
  calculationMethod: string;
}

/**
 * Berechnet Verzugszinsen für ausstehende Zahlungen
 * 
 * @param input - Eingabeparameter (Zeichnungsbetrag, Eingezahlter Betrag, Tage)
 * @returns Berechnete Verzugszinsen
 * 
 * @example
 * const result = calculateDefaultInterest({
 *   subscriptionAmount: 100000,
 *   paidAmount: 80000,
 *   defaultRate: 17,
 *   days: 30
 * });
 * // Ausstehend: 20.000€
 * // Verzugszins: 20.000 × 17% × 30 / 365 = 279,45€
 */
export function calculateDefaultInterest(
  input: DefaultInterestCalculationInput
): DefaultInterestCalculationResult {
  // Standardwert
  const defaultRate = input.defaultRate ?? 17;

  // Konvertiere zu Decimal für präzise Berechnung
  const subscriptionAmount = new Decimal(input.subscriptionAmount);
  const paidAmount = new Decimal(input.paidAmount);
  const days = new Decimal(input.days);

  // Validierung
  if (subscriptionAmount.lessThan(0)) {
    throw new Error('Zeichnungsbetrag darf nicht negativ sein');
  }
  if (paidAmount.lessThan(0)) {
    throw new Error('Eingezahlter Betrag darf nicht negativ sein');
  }
  if (paidAmount.greaterThan(subscriptionAmount)) {
    throw new Error('Eingezahlter Betrag darf nicht größer als Zeichnungsbetrag sein');
  }
  if (defaultRate < 0 || defaultRate > 100) {
    throw new Error('Verzugszinssatz muss zwischen 0 und 100% liegen');
  }
  if (days.lessThan(0)) {
    throw new Error('Tage darf nicht negativ sein');
  }

  // Berechne ausstehenden Betrag
  const outstandingAmount = subscriptionAmount
    .minus(paidAmount)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  // Berechne Verzugszinsen: (Ausstehender Betrag × Verzugszinssatz × Tage) / 365 / 100
  const defaultInterestAmount = outstandingAmount
    .times(new Decimal(defaultRate))
    .times(days)
    .dividedBy(365)
    .dividedBy(100)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  return {
    subscriptionAmount,
    paidAmount,
    outstandingAmount,
    defaultRate: new Decimal(defaultRate),
    days: input.days,
    defaultInterestAmount,
    calculationMethod: 'default_interest_17_percent_365_days',
  };
}

/**
 * Berechnet Verzugszinsen für mehrere Perioden
 * 
 * @param input - Eingabeparameter
 * @param periods - Anzahl der Perioden (z.B. 12 für 12 Monate)
 * @returns Array von Verzugszinsen für jede Periode
 */
export function calculateDefaultInterestByPeriods(
  input: DefaultInterestCalculationInput,
  periods: number
): DefaultInterestCalculationResult[] {
  if (periods <= 0) {
    throw new Error('Perioden müssen größer als 0 sein');
  }

  const daysPerPeriod = input.days / periods;
  const results: DefaultInterestCalculationResult[] = [];

  for (let i = 0; i < periods; i++) {
    const result = calculateDefaultInterest({
      subscriptionAmount: input.subscriptionAmount,
      paidAmount: input.paidAmount,
      defaultRate: input.defaultRate,
      days: daysPerPeriod,
    });
    results.push(result);
  }

  return results;
}

/**
 * Berechnet Verzugszinsen für einen Datumsbereich
 * 
 * @param subscriptionAmount - Zeichnungsbetrag
 * @param paidAmount - Eingezahlter Betrag
 * @param startDate - Startdatum
 * @param endDate - Enddatum
 * @param defaultRate - Verzugszinssatz (Standard: 17%)
 * @returns Berechnete Verzugszinsen
 */
export function calculateDefaultInterestByDateRange(
  subscriptionAmount: number | Decimal,
  paidAmount: number | Decimal,
  startDate: Date,
  endDate: Date,
  defaultRate?: number
): DefaultInterestCalculationResult {
  // Berechne Anzahl der Tage zwischen den Daten
  const timeDiff = endDate.getTime() - startDate.getTime();
  const days = Math.ceil(timeDiff / (1000 * 3600 * 24));

  if (days < 0) {
    throw new Error('Enddatum muss nach Startdatum liegen');
  }

  return calculateDefaultInterest({
    subscriptionAmount,
    paidAmount,
    defaultRate,
    days,
  });
}

/**
 * Berechnet die Gesamtverzugszinsen für einen Zeitraum
 * (Summe aller Perioden)
 * 
 * @param input - Eingabeparameter
 * @param periods - Anzahl der Perioden
 * @returns Gesamtverzugszinsen
 */
export function calculateTotalDefaultInterestByPeriods(
  input: DefaultInterestCalculationInput,
  periods: number
): Decimal {
  const results = calculateDefaultInterestByPeriods(input, periods);
  return results.reduce(
    (sum, result) => sum.plus(result.defaultInterestAmount),
    new Decimal(0)
  );
}


/**
 * SCHRITT 4: Insolvenzvorhalt & Geschäftsregeln
 * 
 * Implementiert komplexe Geschäftsregeln für die Zinsberechnung:
 * 
 * 1. UNTERNEHMENSVERBINDLICHKEITEN (Company Liabilities):
 *    - KEINE Verzugszinsen, auch wenn Zahlungen ausstehen
 *    - Grund: Unternehmen zahlen nur wenn möglich (Insolvenzvorhalt)
 *    - Normale Zinsen werden weiterhin berechnet
 * 
 * 2. INSOLVENZVORHALT (Insolvency Hold):
 *    - Wenn enableInsolvencyHold = true, werden Zahlungen suspendiert
 *    - Ansprüche bleiben bestehen
 *    - Keine Verzugszinsen während Suspension
 * 
 * 3. INVESTOR-SEITE (Investor):
 *    - Volle Verzugszinsen (17% p.a.) auf ausstehende Beträge
 *    - Normale Geschäftsbedingungen
 */

interface BusinessRulesInput {
  subscriptionAmount: number | Decimal;
  paidAmount: number | Decimal;
  principal: number | Decimal;
  annualRate: number;
  days: number;
  isCompanyLiability?: boolean; // true = Unternehmensverbindlichkeit
  enableInsolvencyHold?: boolean; // true = Insolvenzvorhalt aktiv
  kestRate?: number;
  solzRate?: number;
  churchTaxRate?: number;
  defaultRate?: number;
}

interface InterestWithBusinessRulesResult {
  basicInterest: InterestCalculationResult;
  taxes: TaxCalculationResult;
  defaultInterest: DefaultInterestCalculationResult;
  appliedDefaultInterest: Decimal; // Tatsächlich angewendete Verzugszinsen
  isCompanyLiability: boolean;
  enableInsolvencyHold: boolean;
  businessRulesApplied: string[]; // Array von angewendeten Regeln
  totalInterestAndTaxes: Decimal; // Gesamtzinsen + Steuern + (ggf.) Verzugszinsen
}

/**
 * Prüft, ob Verzugszinsen angewendet werden sollen
 * 
 * Verzugszinsen werden NICHT angewendet bei:
 * 1. Unternehmensverbindlichkeiten (Company Liabilities)
 * 2. Aktivem Insolvenzvorhalt
 * 
 * @param isCompanyLiability - Ist dies eine Unternehmensverbindlichkeit?
 * @param enableInsolvencyHold - Ist der Insolvenzvorhalt aktiv?
 * @returns true wenn Verzugszinsen angewendet werden sollen
 */
export function shouldApplyDefaultInterest(
  isCompanyLiability: boolean = false,
  enableInsolvencyHold: boolean = false
): boolean {
  // Keine Verzugszinsen für Unternehmensverbindlichkeiten
  if (isCompanyLiability) {
    return false;
  }

  // Keine Verzugszinsen wenn Insolvenzvorhalt aktiv
  if (enableInsolvencyHold) {
    return false;
  }

  // Ansonsten: Verzugszinsen anwenden
  return true;
}

/**
 * Prüft, ob ein Insolvenzvorhalt aktiv ist
 * 
 * Bei aktivem Insolvenzvorhalt:
 * - Zahlungen werden suspendiert
 * - Ansprüche bleiben bestehen
 * - Keine Verzugszinsen
 * 
 * @param enableInsolvencyHold - Ist der Insolvenzvorhalt aktiv?
 * @returns true wenn Insolvenzvorhalt aktiv
 */
export function isInsolvencyHoldActive(enableInsolvencyHold: boolean = false): boolean {
  return enableInsolvencyHold;
}

/**
 * Berechnet Zinsen mit Geschäftsregeln
 * 
 * Kombiniert:
 * 1. Basis-Zinsberechnung
 * 2. Steuer-Berechnung
 * 3. Verzugszins-Berechnung (mit Geschäftsregeln)
 * 
 * @param input - Eingabeparameter
 * @returns Zinsen mit angewendeten Geschäftsregeln
 * 
 * @example
 * // Investor mit ausstehenden Beträgen
 * const result = calculateInterestWithBusinessRules({
 *   subscriptionAmount: 100000,
 *   paidAmount: 80000,
 *   principal: 100000,
 *   annualRate: 6,
 *   days: 30,
 *   isCompanyLiability: false,
 *   enableInsolvencyHold: false,
 *   kestRate: 25,
 *   solzRate: 5.5,
 *   churchTaxRate: 9,
 *   defaultRate: 17
 * });
 * // Verzugszinsen werden angewendet
 * 
 * @example
 * // Unternehmensverbindlichkeit mit ausstehenden Beträgen
 * const result = calculateInterestWithBusinessRules({
 *   subscriptionAmount: 100000,
 *   paidAmount: 80000,
 *   principal: 100000,
 *   annualRate: 6,
 *   days: 30,
 *   isCompanyLiability: true,  // <-- Unternehmensverbindlichkeit
 *   enableInsolvencyHold: false,
 *   kestRate: 25,
 *   solzRate: 5.5,
 *   churchTaxRate: 9,
 *   defaultRate: 17
 * });
 * // Verzugszinsen werden NICHT angewendet
 */
export function calculateInterestWithBusinessRules(
  input: BusinessRulesInput
): InterestWithBusinessRulesResult {
  // Standardwerte
  const isCompanyLiability = input.isCompanyLiability ?? false;
  const enableInsolvencyHold = input.enableInsolvencyHold ?? false;

  // Array von angewendeten Geschäftsregeln
  const businessRulesApplied: string[] = [];

  // Berechne Basis-Zinsen
  const basicInterest = calculateBasicInterest({
    principal: input.principal,
    annualRate: input.annualRate,
    days: input.days,
  });

  // Berechne Steuern
  const taxes = calculateTaxes({
    interestAmount: basicInterest.interestAmount,
    kestRate: input.kestRate,
    solzRate: input.solzRate,
    churchTaxRate: input.churchTaxRate,
  });

  // Berechne Verzugszinsen (ohne Geschäftsregeln)
  const defaultInterest = calculateDefaultInterest({
    subscriptionAmount: input.subscriptionAmount,
    paidAmount: input.paidAmount,
    defaultRate: input.defaultRate,
    days: input.days,
  });

  // Prüfe Geschäftsregeln
  let appliedDefaultInterest = defaultInterest.defaultInterestAmount;

  if (isCompanyLiability) {
    businessRulesApplied.push('Unternehmensverbindlichkeit: Keine Verzugszinsen');
    appliedDefaultInterest = new Decimal(0);
  }

  if (enableInsolvencyHold) {
    businessRulesApplied.push('Insolvenzvorhalt aktiv: Zahlungen suspendiert, keine Verzugszinsen');
    appliedDefaultInterest = new Decimal(0);
  }

  if (!isCompanyLiability && !enableInsolvencyHold) {
    businessRulesApplied.push('Investor-Seite: Volle Verzugszinsen angewendet');
  }

  // Berechne Gesamtzinsen + Steuern + Verzugszinsen
  const totalInterestAndTaxes = basicInterest.interestAmount
    .plus(taxes.totalTaxes)
    .plus(appliedDefaultInterest)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  return {
    basicInterest,
    taxes,
    defaultInterest,
    appliedDefaultInterest,
    isCompanyLiability,
    enableInsolvencyHold,
    businessRulesApplied,
    totalInterestAndTaxes,
  };
}

/**
 * Berechnet Netto-Zinsen nach Steuern und Geschäftsregeln
 * 
 * Netto = Basis-Zinsen - Steuern + (ggf.) Verzugszinsen
 * 
 * @param input - Eingabeparameter
 * @returns Netto-Zinsen nach allen Abzügen und Regeln
 */
export function calculateNetInterestWithBusinessRules(
  input: BusinessRulesInput
): Decimal {
  const result = calculateInterestWithBusinessRules(input);
  
  // Netto-Zinsen = Basis-Zinsen - Steuern + Verzugszinsen
  return result.basicInterest.interestAmount
    .minus(result.taxes.totalTaxes)
    .plus(result.appliedDefaultInterest)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}


/**
 * SCHRITT 5: Zahlungsweisen-Handling
 * 
 * Implementiert verschiedene Zahlungsweisen für die Zinsberechnung:
 * 
 * 1. MONATLICH (Monthly):
 *    - 12 Zahlungen pro Jahr
 *    - Zinsen werden monatlich berechnet und ausgezahlt
 *    - Keine Zinseszinsen
 * 
 * 2. JÄHRLICH (Annual):
 *    - 1 Zahlung pro Jahr
 *    - Zinsen werden über das ganze Jahr berechnet
 *    - Keine Zinseszinsen
 * 
 * 3. THESAURIEREND (Accumulating):
 *    - Zinsen werden angesammelt (nicht ausgezahlt)
 *    - Am Ende der Laufzeit wird Kapital + alle Zinsen ausgezahlt
 *    - WICHTIG: KEINE Zinseszinsen! Zinsen werden linear addiert
 *    - Formel: Gesamtzinsen = Summe aller Jahres-Zinsen
 */

type PaymentFrequency = 'monthly' | 'annual' | 'thesaurierend';

interface PaymentScheduleItem {
  paymentNumber: number;
  paymentDate: Date;
  principalAmount: Decimal;
  interestAmount: Decimal;
  taxAmount: Decimal;
  defaultInterestAmount: Decimal;
  totalPayment: Decimal;
  frequency: PaymentFrequency;
}

interface PaymentScheduleResult {
  frequency: PaymentFrequency;
  totalPayments: number;
  schedule: PaymentScheduleItem[];
  totalInterest: Decimal;
  totalTaxes: Decimal;
  totalDefaultInterest: Decimal;
  totalPayable: Decimal;
}

/**
 * Berechnet Zahlungsplan für monatliche Zahlungen
 * 
 * 12 Zahlungen pro Jahr, keine Zinseszinsen
 * 
 * @param principal - Hauptbetrag
 * @param annualRate - Jährlicher Zinssatz
 * @param months - Anzahl der Monate
 * @param startDate - Startdatum
 * @param kestRate - KESt-Satz
 * @param solzRate - SolZ-Satz
 * @param churchTaxRate - Kirchensteuer-Satz
 * @returns Zahlungsplan
 */
export function calculateMonthlyPaymentSchedule(
  principal: number | Decimal,
  annualRate: number,
  months: number,
  startDate: Date,
  kestRate?: number,
  solzRate?: number,
  churchTaxRate?: number
): PaymentScheduleResult {
  const principalDecimal = new Decimal(principal);
  const daysPerMonth = 365 / 12; // ~30.42 Tage pro Monat
  const schedule: PaymentScheduleItem[] = [];
  let totalInterest = new Decimal(0);
  let totalTaxes = new Decimal(0);
  let totalDefaultInterest = new Decimal(0);

  for (let i = 1; i <= months; i++) {
    // Berechne Zahlungsdatum
    const paymentDate = new Date(startDate);
    paymentDate.setMonth(paymentDate.getMonth() + i);

    // Berechne Zinsen für diesen Monat
    const interestResult = calculateBasicInterest({
      principal: principalDecimal,
      annualRate,
      days: daysPerMonth,
    });

    // Berechne Steuern
    const taxResult = calculateTaxes({
      interestAmount: interestResult.interestAmount,
      kestRate,
      solzRate,
      churchTaxRate,
    });

    // Keine Verzugszinsen bei regelmäßigen Zahlungen
    const defaultInterestAmount = new Decimal(0);

    // Gesamtzahlung = Zinsen + Steuern + Verzugszinsen
    const totalPayment = interestResult.interestAmount
      .plus(taxResult.totalTaxes)
      .plus(defaultInterestAmount)
      .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

    schedule.push({
      paymentNumber: i,
      paymentDate,
      principalAmount: principalDecimal,
      interestAmount: interestResult.interestAmount,
      taxAmount: taxResult.totalTaxes,
      defaultInterestAmount,
      totalPayment,
      frequency: 'monthly',
    });

    totalInterest = totalInterest.plus(interestResult.interestAmount);
    totalTaxes = totalTaxes.plus(taxResult.totalTaxes);
    totalDefaultInterest = totalDefaultInterest.plus(defaultInterestAmount);
  }

  const totalPayable = principalDecimal
    .plus(totalInterest)
    .plus(totalTaxes)
    .plus(totalDefaultInterest)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  return {
    frequency: 'monthly',
    totalPayments: months,
    schedule,
    totalInterest: totalInterest.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
    totalTaxes: totalTaxes.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
    totalDefaultInterest: totalDefaultInterest.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
    totalPayable,
  };
}

/**
 * Berechnet Zahlungsplan für jährliche Zahlungen
 * 
 * 1 Zahlung pro Jahr, keine Zinseszinsen
 * 
 * @param principal - Hauptbetrag
 * @param annualRate - Jährlicher Zinssatz
 * @param years - Anzahl der Jahre
 * @param startDate - Startdatum
 * @param kestRate - KESt-Satz
 * @param solzRate - SolZ-Satz
 * @param churchTaxRate - Kirchensteuer-Satz
 * @returns Zahlungsplan
 */
export function calculateAnnualPaymentSchedule(
  principal: number | Decimal,
  annualRate: number,
  years: number,
  startDate: Date,
  kestRate?: number,
  solzRate?: number,
  churchTaxRate?: number
): PaymentScheduleResult {
  const principalDecimal = new Decimal(principal);
  const schedule: PaymentScheduleItem[] = [];
  let totalInterest = new Decimal(0);
  let totalTaxes = new Decimal(0);
  let totalDefaultInterest = new Decimal(0);

  for (let i = 1; i <= years; i++) {
    // Berechne Zahlungsdatum
    const paymentDate = new Date(startDate);
    paymentDate.setFullYear(paymentDate.getFullYear() + i);

    // Berechne Zinsen für dieses Jahr
    const interestResult = calculateBasicInterest({
      principal: principalDecimal,
      annualRate,
      days: 365,
    });

    // Berechne Steuern
    const taxResult = calculateTaxes({
      interestAmount: interestResult.interestAmount,
      kestRate,
      solzRate,
      churchTaxRate,
    });

    // Keine Verzugszinsen bei regelmäßigen Zahlungen
    const defaultInterestAmount = new Decimal(0);

    // Gesamtzahlung = Zinsen + Steuern + Verzugszinsen
    const totalPayment = interestResult.interestAmount
      .plus(taxResult.totalTaxes)
      .plus(defaultInterestAmount)
      .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

    schedule.push({
      paymentNumber: i,
      paymentDate,
      principalAmount: principalDecimal,
      interestAmount: interestResult.interestAmount,
      taxAmount: taxResult.totalTaxes,
      defaultInterestAmount,
      totalPayment,
      frequency: 'annual',
    });

    totalInterest = totalInterest.plus(interestResult.interestAmount);
    totalTaxes = totalTaxes.plus(taxResult.totalTaxes);
    totalDefaultInterest = totalDefaultInterest.plus(defaultInterestAmount);
  }

  const totalPayable = principalDecimal
    .plus(totalInterest)
    .plus(totalTaxes)
    .plus(totalDefaultInterest)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  return {
    frequency: 'annual',
    totalPayments: years,
    schedule,
    totalInterest: totalInterest.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
    totalTaxes: totalTaxes.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
    totalDefaultInterest: totalDefaultInterest.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
    totalPayable,
  };
}

/**
 * Berechnet Zahlungsplan für thesaurierende Zahlungen
 * 
 * Zinsen werden angesammelt, am Ende ausgezahlt
 * WICHTIG: KEINE Zinseszinsen! Zinsen werden linear addiert
 * 
 * @param principal - Hauptbetrag
 * @param annualRate - Jährlicher Zinssatz
 * @param years - Anzahl der Jahre
 * @param startDate - Startdatum
 * @param kestRate - KESt-Satz
 * @param solzRate - SolZ-Satz
 * @param churchTaxRate - Kirchensteuer-Satz
 * @returns Zahlungsplan (nur eine Zahlung am Ende)
 */
export function calculateThesaurierendPaymentSchedule(
  principal: number | Decimal,
  annualRate: number,
  years: number,
  startDate: Date,
  kestRate?: number,
  solzRate?: number,
  churchTaxRate?: number
): PaymentScheduleResult {
  const principalDecimal = new Decimal(principal);
  const schedule: PaymentScheduleItem[] = [];

  // Berechne Gesamtzinsen für alle Jahre (LINEAR, KEINE Zinseszinsen)
  let totalInterest = new Decimal(0);
  let totalTaxes = new Decimal(0);

  for (let i = 1; i <= years; i++) {
    // Berechne Zinsen für dieses Jahr
    const interestResult = calculateBasicInterest({
      principal: principalDecimal,
      annualRate,
      days: 365,
    });

    totalInterest = totalInterest.plus(interestResult.interestAmount);
  }

  // Berechne Steuern auf Gesamtzinsen
  const taxResult = calculateTaxes({
    interestAmount: totalInterest,
    kestRate,
    solzRate,
    churchTaxRate,
  });

  totalTaxes = taxResult.totalTaxes;

  // Zahlungsdatum: Nach Ende der Laufzeit
  const paymentDate = new Date(startDate);
  paymentDate.setFullYear(paymentDate.getFullYear() + years);

  // Gesamtzahlung = Kapital + Zinsen + Steuern
  const totalPayment = principalDecimal
    .plus(totalInterest)
    .plus(totalTaxes)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  schedule.push({
    paymentNumber: 1,
    paymentDate,
    principalAmount: principalDecimal,
    interestAmount: totalInterest.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
    taxAmount: totalTaxes,
    defaultInterestAmount: new Decimal(0),
    totalPayment,
    frequency: 'thesaurierend',
  });

  return {
    frequency: 'thesaurierend',
    totalPayments: 1,
    schedule,
    totalInterest: totalInterest.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
    totalTaxes: totalTaxes,
    totalDefaultInterest: new Decimal(0),
    totalPayable: totalPayment,
  };
}

/**
 * Berechnet Zahlungsplan basierend auf Zahlungsweise
 * 
 * @param frequency - Zahlungsweise (monthly, annual, thesaurierend)
 * @param principal - Hauptbetrag
 * @param annualRate - Jährlicher Zinssatz
 * @param periods - Anzahl der Perioden (Monate oder Jahre)
 * @param startDate - Startdatum
 * @param kestRate - KESt-Satz
 * @param solzRate - SolZ-Satz
 * @param churchTaxRate - Kirchensteuer-Satz
 * @returns Zahlungsplan
 */
export function calculatePaymentScheduleByFrequency(
  frequency: PaymentFrequency,
  principal: number | Decimal,
  annualRate: number,
  periods: number,
  startDate: Date,
  kestRate?: number,
  solzRate?: number,
  churchTaxRate?: number
): PaymentScheduleResult {
  switch (frequency) {
    case 'monthly':
      return calculateMonthlyPaymentSchedule(
        principal,
        annualRate,
        periods,
        startDate,
        kestRate,
        solzRate,
        churchTaxRate
      );
    case 'annual':
      return calculateAnnualPaymentSchedule(
        principal,
        annualRate,
        periods,
        startDate,
        kestRate,
        solzRate,
        churchTaxRate
      );
    case 'thesaurierend':
      return calculateThesaurierendPaymentSchedule(
        principal,
        annualRate,
        periods,
        startDate,
        kestRate,
        solzRate,
        churchTaxRate
      );
    default:
      throw new Error(`Unbekannte Zahlungsweise: ${frequency}`);
  }
}
