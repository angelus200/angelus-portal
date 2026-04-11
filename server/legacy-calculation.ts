/**
 * Bestandskunden Vertragsberechnungen
 * Zinsen (act/365), Strafzinsen, nächste Zahlung
 */

import { getLegacyContractById, getLegacyPaymentsByContract, getLegacyInterestPaymentsByContract } from './db';

export interface ContractStatusResult {
  // Zinsen
  totalInterestAccrued: number;
  totalInterestPaid: number;
  interestDue: number;
  nextInterestPayment: Date | null;
  nextInterestAmount: number;

  // Fehlbetrag & Strafzinsen
  shortfall: number;
  penaltyDaysCount: number;
  totalPenalty: number;

  // Gesamt
  totalOwed: number;
  netPosition: number;

  // Status
  isFullyPaid: boolean;
  isInDefault: boolean;
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Nächstes Zahlungsdatum nach 'after' basierend auf startDate + Intervall
 */
function nextPaymentDate(
  startDate: Date,
  interval: 'monthly' | 'quarterly' | 'yearly' | 'end_of_term',
  endDate: Date,
  after: Date,
): Date | null {
  if (interval === 'end_of_term') {
    return endDate > after ? endDate : null;
  }

  const monthsPerInterval = interval === 'monthly' ? 1 : interval === 'quarterly' ? 3 : 12;
  let candidate = new Date(startDate);

  while (candidate <= after) {
    candidate = new Date(candidate);
    candidate.setMonth(candidate.getMonth() + monthsPerInterval);
  }

  return candidate <= endDate ? candidate : endDate <= after ? null : endDate;
}

/**
 * Zinsen für einen Zeitraum (act/365)
 */
function interestForPeriod(principal: number, ratePercent: number, days: number): number {
  return principal * (ratePercent / 100) * (days / 365);
}

export async function calculateContractStatus(contractId: number): Promise<ContractStatusResult> {
  const contract = await getLegacyContractById(contractId);
  if (!contract) throw new Error(`Contract ${contractId} not found`);

  const payments = await getLegacyPaymentsByContract(contractId);
  const interestPayments = await getLegacyInterestPaymentsByContract(contractId);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(contract.startDate);
  const endDate = new Date(contract.endDate);

  const signedAmount = parseFloat(contract.signedAmount as string);
  const paidAmount = parseFloat((contract.paidAmount as string) ?? '0');
  const interestRate = parseFloat(contract.interestRate as string);
  const penaltyRatePerDay = parseFloat((contract.penaltyRatePerDay as string) ?? '0');

  // Effective end for interest calculation: min(today, endDate)
  const effectiveEnd = today < endDate ? today : endDate;
  const daysAccrued = Math.max(0, daysBetween(startDate, effectiveEnd));

  // Total interest accrued (act/365)
  const totalInterestAccrued = interestForPeriod(paidAmount, interestRate, daysAccrued);

  // Total interest already paid out
  const totalInterestPaid = interestPayments.reduce(
    (sum, p) => sum + parseFloat(p.amount as string),
    0,
  );

  // Interest due but not yet paid
  const interestDue = Math.max(0, totalInterestAccrued - totalInterestPaid);

  // Shortfall & penalty
  const shortfall = Math.max(0, signedAmount - paidAmount);
  const penaltyDaysCount = shortfall > 0 ? Math.max(0, daysBetween(startDate, today)) : 0;
  const totalPenalty = shortfall * (penaltyRatePerDay / 100) * penaltyDaysCount;

  // Next interest payment
  const nextDate = nextPaymentDate(
    startDate,
    contract.paymentInterval as 'monthly' | 'quarterly' | 'yearly' | 'end_of_term',
    endDate,
    today,
  );

  let nextInterestAmount = 0;
  if (nextDate) {
    // Find the previous payment date (or startDate)
    const monthsPerInterval =
      contract.paymentInterval === 'monthly' ? 1
        : contract.paymentInterval === 'quarterly' ? 3
        : contract.paymentInterval === 'yearly' ? 12
        : 0; // end_of_term handled separately

    let prevDate: Date;
    if (contract.paymentInterval === 'end_of_term') {
      prevDate = startDate;
    } else {
      prevDate = new Date(nextDate);
      prevDate.setMonth(prevDate.getMonth() - monthsPerInterval);
      if (prevDate < startDate) prevDate = startDate;
    }

    const periodDays = daysBetween(prevDate, nextDate);
    nextInterestAmount = interestForPeriod(paidAmount, interestRate, periodDays);
  }

  // What investor still owes (penalties)
  const totalOwed = totalPenalty;

  // Net position: positive = portal owes investor, negative = investor owes portal
  const netPosition = interestDue - totalPenalty;

  return {
    totalInterestAccrued,
    totalInterestPaid,
    interestDue,
    nextInterestPayment: nextDate,
    nextInterestAmount,
    shortfall,
    penaltyDaysCount,
    totalPenalty,
    totalOwed,
    netPosition,
    isFullyPaid: shortfall === 0,
    isInDefault: shortfall > 0,
  };
}
