import { getDb } from './db';
import {
  legacyCustomers,
  legacyCustomerDocuments,
  legacyCustomerInterestCalculations,
  legacyCustomerPaymentHistory,
} from '../drizzle/legacy-schema';
import { eq, and, gte, lte, desc, asc, like, sql, or } from 'drizzle-orm';
import { Decimal } from 'decimal.js';

/**
 * Legacy Customer Management Functions
 */

/**
 * Create a new legacy customer
 */
export async function createLegacyCustomer(data: {
  contractNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  birthDate?: Date;
  street?: string;
  houseNumber?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  iban?: string;
  bic?: string;
  accountHolder?: string;
  bondId?: number;
  bondNumber?: string;
  contractDate?: Date;
  valueDate?: Date;
  investmentAmount?: Decimal | number;
  shareCount?: number;
  shareValue?: Decimal | number;
  annualInterestRate?: Decimal | number;
  interestPaymentFrequency?: 'monthly' | 'quarterly' | 'annual';
  annualInterestDate?: Date;
  monthlyPaymentDay?: number;
  maturityDate?: Date;
  termMonths?: number;
  capitalGainsTax?: Decimal | number;
  solidaritySurcharge?: Decimal | number;
  churchTax?: Decimal | number;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const result = await db.insert(legacyCustomers).values({
    contractNumber: data.contractNumber,
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: data.phone,
    birthDate: data.birthDate,
    street: data.street,
    houseNumber: data.houseNumber,
    postalCode: data.postalCode,
    city: data.city,
    country: data.country || 'Deutschland',
    iban: data.iban,
    bic: data.bic,
    accountHolder: data.accountHolder,
    bondId: data.bondId,
    bondNumber: data.bondNumber,
    contractDate: data.contractDate,
    valueDate: data.valueDate,
    investmentAmount: data.investmentAmount ? new Decimal(data.investmentAmount).toString() : undefined,
    shareCount: data.shareCount,
    shareValue: data.shareValue ? new Decimal(data.shareValue).toString() : undefined,
    annualInterestRate: data.annualInterestRate ? new Decimal(data.annualInterestRate).toString() : undefined,
    interestPaymentFrequency: data.interestPaymentFrequency || 'monthly',
    annualInterestDate: data.annualInterestDate,
    monthlyPaymentDay: data.monthlyPaymentDay,
    maturityDate: data.maturityDate,
    termMonths: data.termMonths,
    capitalGainsTax: data.capitalGainsTax ? new Decimal(data.capitalGainsTax).toString() : '25.00',
    solidaritySurcharge: data.solidaritySurcharge ? new Decimal(data.solidaritySurcharge).toString() : '5.50',
    churchTax: data.churchTax ? new Decimal(data.churchTax).toString() : '0.00',
    notes: data.notes,
  });

  return result;
}

/**
 * Get legacy customer by contract number
 */
export async function getLegacyCustomerByContractNumber(contractNumber: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(legacyCustomers).where(eq(legacyCustomers.contractNumber, contractNumber)).limit(1).execute();
  return result.length > 0 ? result[0] : null;
}

/**
 * Get legacy customer by ID
 */
export async function getLegacyCustomerById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(legacyCustomers).where(eq(legacyCustomers.id, id)).limit(1).execute();
  return result.length > 0 ? result[0] : null;
}

/**
 * Get all legacy customers with pagination
 */
export async function getAllLegacyCustomers(
  page: number = 1,
  limit: number = 50,
  status?: 'pending' | 'active' | 'completed' | 'cancelled'
) {
  const db = await getDb();
  if (!db) return { customers: [], total: 0, page, limit, pages: 0 };
  const offset = (page - 1) * limit;

  const whereCondition = status ? eq(legacyCustomers.status, status) : undefined;

  const customers = await db.select().from(legacyCustomers)
    .where(whereCondition)
    .orderBy(desc(legacyCustomers.createdAt))
    .limit(limit)
    .offset(offset)
    .execute();

  const countResult = await db
    .select({ count: sql<number>`COUNT(*)`.as('count') })
    .from(legacyCustomers)
    .where(whereCondition);

  const total = countResult[0]?.count || 0;

  return {
    customers,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  };
}

/**
 * Search legacy customers
 */
export async function searchLegacyCustomers(query: string, limit: number = 20) {
  const db = await getDb();
  if (!db) return [];
  const searchTerm = `%${query}%`;

  const results = await db.select().from(legacyCustomers)
    .where(or(
      like(legacyCustomers.firstName, searchTerm),
      like(legacyCustomers.lastName, searchTerm),
      like(legacyCustomers.email, searchTerm),
      like(legacyCustomers.contractNumber, searchTerm)
    ))
    .limit(limit)
    .execute();

  return results;
}

/**
 * Update legacy customer
 */
export async function updateLegacyCustomer(
  id: number,
  data: Partial<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    street: string;
    houseNumber: string;
    postalCode: string;
    city: string;
    iban: string;
    bic: string;
    accountHolder: string;
    investmentAmount: Decimal | number;
    annualInterestRate: Decimal | number;
    maturityDate: Date;
    termMonths: number;
    status: 'pending' | 'active' | 'completed' | 'cancelled';
    notes: string;
  }>
) {
  const db = await getDb();
  const updateData: any = { ...data };

  if (data.investmentAmount) {
    updateData.investmentAmount = new Decimal(data.investmentAmount).toString();
  }

  if (data.annualInterestRate) {
    updateData.annualInterestRate = new Decimal(data.annualInterestRate).toString();
  }

  if (!db) throw new Error('Database not available');
  const result = await db
    .update(legacyCustomers)
    .set({
      ...updateData,
      updatedAt: new Date(),
    })
    .where(eq(legacyCustomers.id, id));

  return result;
}

/**
 * Delete legacy customer
 */
export async function deleteLegacyCustomer(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  // Delete related records first
  await db.delete(legacyCustomerPaymentHistory).where(eq(legacyCustomerPaymentHistory.legacyCustomerId, id));
  await db.delete(legacyCustomerInterestCalculations).where(eq(legacyCustomerInterestCalculations.legacyCustomerId, id));
  await db.delete(legacyCustomerDocuments).where(eq(legacyCustomerDocuments.legacyCustomerId, id));

  // Delete customer
  const result = await db.delete(legacyCustomers).where(eq(legacyCustomers.id, id));

  return result;
}

/**
 * Document Management Functions
 */

/**
 * Add document to legacy customer
 */
export async function addLegacyCustomerDocument(data: {
  legacyCustomerId: number;
  documentType:
    | 'contract'
    | 'projection'
    | 'interest_calculation'
    | 'payment_confirmation'
    | 'tax_certificate'
    | 'bank_statement'
    | 'other';
  fileName: string;
  filePath: string;
  fileSize?: number;
  fileType?: string;
  documentDate?: Date;
  description?: string;
  uploadedBy?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const result = await db.insert(legacyCustomerDocuments).values({
    legacyCustomerId: data.legacyCustomerId,
    documentType: data.documentType,
    fileName: data.fileName,
    filePath: data.filePath,
    fileSize: data.fileSize,
    fileType: data.fileType,
    documentDate: data.documentDate,
    description: data.description,
    uploadedBy: data.uploadedBy,
  });

  return result;
}

/**
 * Get documents for legacy customer
 */
export async function getLegacyCustomerDocuments(legacyCustomerId: number) {
  const db = await getDb();
  if (!db) return [];
  const documents = await db.select().from(legacyCustomerDocuments)
    .where(eq(legacyCustomerDocuments.legacyCustomerId, legacyCustomerId))
    .orderBy(desc(legacyCustomerDocuments.uploadedAt))
    .execute();
  return documents;
}

/**
 * Delete document
 */
export async function deleteLegacyCustomerDocument(documentId: number) {
  const db = await getDb();
  if (!db) return;
  const result = await db.delete(legacyCustomerDocuments).where(eq(legacyCustomerDocuments.id, documentId));
  return result;
}

/**
 * Interest Calculation Functions
 */

/**
 * Create interest calculation
 */
export async function createInterestCalculation(data: {
  legacyCustomerId: number;
  calculationYear: number;
  calculationMonth?: number;
  periodStartDate: Date;
  periodEndDate: Date;
  annualInterest?: Decimal | number;
  monthlyInstallment?: Decimal | number;
  capitalGainsTaxAmount?: Decimal | number;
  solidaritySurchargeAmount?: Decimal | number;
  churchTaxAmount?: Decimal | number;
  totalTaxWithheld?: Decimal | number;
  netInterest?: Decimal | number;
  paymentDate: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const result = await db.insert(legacyCustomerInterestCalculations).values({
    legacyCustomerId: data.legacyCustomerId,
    calculationYear: data.calculationYear,
    calculationMonth: data.calculationMonth,
    periodStartDate: data.periodStartDate,
    periodEndDate: data.periodEndDate,
    annualInterest: data.annualInterest ? new Decimal(data.annualInterest).toString() : undefined,
    monthlyInstallment: data.monthlyInstallment ? new Decimal(data.monthlyInstallment).toString() : undefined,
    capitalGainsTaxAmount: data.capitalGainsTaxAmount
      ? new Decimal(data.capitalGainsTaxAmount).toString()
      : undefined,
    solidaritySurchargeAmount: data.solidaritySurchargeAmount
      ? new Decimal(data.solidaritySurchargeAmount).toString()
      : undefined,
    churchTaxAmount: data.churchTaxAmount ? new Decimal(data.churchTaxAmount).toString() : undefined,
    totalTaxWithheld: data.totalTaxWithheld ? new Decimal(data.totalTaxWithheld).toString() : undefined,
    netInterest: data.netInterest ? new Decimal(data.netInterest).toString() : undefined,
    paymentDate: data.paymentDate,
  });

  return result;
}

/**
 * Get interest calculations for legacy customer
 */
export async function getLegacyCustomerInterestCalculations(legacyCustomerId: number) {
  const db = await getDb();
  if (!db) return [];
  const calculations = await db.select().from(legacyCustomerInterestCalculations)
    .where(eq(legacyCustomerInterestCalculations.legacyCustomerId, legacyCustomerId))
    .orderBy(asc(legacyCustomerInterestCalculations.paymentDate))
    .execute();
  return calculations;
}

/**
 * Get interest calculations by date range
 */
export async function getInterestCalculationsByDateRange(
  legacyCustomerId: number,
  startDate: Date,
  endDate: Date
) {
  const db = await getDb();
  if (!db) return [];
  const calculations = await db.select().from(legacyCustomerInterestCalculations)
    .where(and(
      eq(legacyCustomerInterestCalculations.legacyCustomerId, legacyCustomerId),
      gte(legacyCustomerInterestCalculations.paymentDate, startDate),
      lte(legacyCustomerInterestCalculations.paymentDate, endDate)
    ))
    .orderBy(asc(legacyCustomerInterestCalculations.paymentDate))
    .execute();
  return calculations;
}

/**
 * Payment History Functions
 */

/**
 * Add payment to history
 */
export async function addPaymentToHistory(data: {
  legacyCustomerId: number;
  interestCalculationId?: number;
  paymentType: 'initial_investment' | 'interest_payment' | 'refund' | 'adjustment';
  paymentDate: Date;
  amount: Decimal | number;
  transactionReference?: string;
  bankTransactionId?: string;
  status?: 'pending' | 'confirmed' | 'failed' | 'cancelled';
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const result = await db.insert(legacyCustomerPaymentHistory).values({
    legacyCustomerId: data.legacyCustomerId,
    interestCalculationId: data.interestCalculationId,
    paymentType: data.paymentType,
    paymentDate: data.paymentDate,
    amount: new Decimal(data.amount).toString(),
    transactionReference: data.transactionReference,
    bankTransactionId: data.bankTransactionId,
    status: data.status || 'pending',
    notes: data.notes,
  });

  return result;
}

/**
 * Get payment history for legacy customer
 */
export async function getLegacyCustomerPaymentHistory(legacyCustomerId: number) {
  const db = await getDb();
  if (!db) return [];
  const history = await db.select().from(legacyCustomerPaymentHistory).where(eq(legacyCustomerPaymentHistory.legacyCustomerId, legacyCustomerId)).orderBy(desc(legacyCustomerPaymentHistory.paymentDate)).execute();
  return history;
}

/**
 * Update payment status
 */
export async function updatePaymentStatus(
  paymentId: number,
  status: 'pending' | 'confirmed' | 'failed' | 'cancelled'
) {
  const db = await getDb();
  if (!db) return;
  const result = await db
    .update(legacyCustomerPaymentHistory)
    .set({
      status,
      confirmationDate: status === 'confirmed' ? new Date() : undefined,
      updatedAt: new Date(),
    })
    .where(eq(legacyCustomerPaymentHistory.id, paymentId));

  return result;
}

/**
 * Get total payments by type
 */
export async function getTotalPaymentsByType(legacyCustomerId: number) {
  const db = await getDb();
  if (!db) return { initialInvestment: new Decimal(0), interestPayment: new Decimal(0), refund: new Decimal(0), adjustment: new Decimal(0) };
  const payments = await db.select().from(legacyCustomerPaymentHistory).where(eq(legacyCustomerPaymentHistory.legacyCustomerId, legacyCustomerId)).execute();

  const totals = {
    initialInvestment: new Decimal(0),
    interestPayment: new Decimal(0),
    refund: new Decimal(0),
    adjustment: new Decimal(0),
  };

  payments.forEach((payment: any) => {
    const amount = new Decimal(payment.amount);
    switch (payment.paymentType) {
      case 'initial_investment':
        totals.initialInvestment = totals.initialInvestment.plus(amount);
        break;
      case 'interest_payment':
        totals.interestPayment = totals.interestPayment.plus(amount);
        break;
      case 'refund':
        totals.refund = totals.refund.plus(amount);
        break;
      case 'adjustment':
        totals.adjustment = totals.adjustment.plus(amount);
        break;
    }
  });

  return totals;
}

/**
 * Statistics Functions
 */

/**
 * Get legacy customers statistics
 */
export async function getLegacyCustomerStats() {
  const db = await getDb();
  if (!db) return { total: 0, pending: 0, active: 0, completed: 0, cancelled: 0, totalInvestment: new Decimal(0), totalInterestRate: new Decimal(0) };
  const allCustomers = await db.select().from(legacyCustomers).execute();

  const stats = {
    total: allCustomers.length,
    pending: allCustomers.filter((c: any) => c.status === 'pending').length,
    active: allCustomers.filter((c: any) => c.status === 'active').length,
    completed: allCustomers.filter((c: any) => c.status === 'completed').length,
    cancelled: allCustomers.filter((c: any) => c.status === 'cancelled').length,
    totalInvestment: new Decimal(0),
    totalInterestRate: new Decimal(0),
  };

  allCustomers.forEach((customer: any) => {
    if (customer.investmentAmount) {
      stats.totalInvestment = stats.totalInvestment.plus(new Decimal(customer.investmentAmount));
    }
  });

  return stats;
}

/**
 * Get pending payments for legacy customer
 */
export async function getPendingPaymentsForCustomer(legacyCustomerId: number) {
  const db = await getDb();
  if (!db) return [];
  const calculations = await db.select().from(legacyCustomerInterestCalculations).where(and(
    eq(legacyCustomerInterestCalculations.legacyCustomerId, legacyCustomerId),
    eq(legacyCustomerInterestCalculations.status, 'pending')
  )).orderBy(asc(legacyCustomerInterestCalculations.paymentDate)).execute();
  return calculations;
}

/**
 * Get pending payments for legacy customer (old implementation)
 */
export async function getPendingPaymentsForCustomer_old(legacyCustomerId: number) {
  const db = await getDb();
  if (!db) return [];
  const calculations = await db.select().from(legacyCustomerInterestCalculations).where(and(
    eq(legacyCustomerInterestCalculations.legacyCustomerId, legacyCustomerId),
    eq(legacyCustomerInterestCalculations.status, 'pending')
  )).orderBy(asc(legacyCustomerInterestCalculations.paymentDate)).execute();
  return calculations;
}

/**
 * Get upcoming payments (next 30 days)
 */
export async function getUpcomingPayments(legacyCustomerId: number, daysAhead: number = 30) {
  const db = await getDb();
  if (!db) return [];
  const today = new Date();
  const futureDate = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  const calculations = await db.select().from(legacyCustomerInterestCalculations).where(and(
    eq(legacyCustomerInterestCalculations.legacyCustomerId, legacyCustomerId),
    eq(legacyCustomerInterestCalculations.status, 'pending'),
    gte(legacyCustomerInterestCalculations.paymentDate, today),
    lte(legacyCustomerInterestCalculations.paymentDate, futureDate)
  )).orderBy(asc(legacyCustomerInterestCalculations.paymentDate)).execute();
  return calculations;
}

/**
 * Get upcoming payments (old implementation)
 */
export async function getUpcomingPayments_old(legacyCustomerId: number, daysAhead: number = 30) {
  const db = await getDb();
  if (!db) return [];
  const today = new Date();
  const futureDate = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  const calculations = await db.select().from(legacyCustomerInterestCalculations).where(and(
    eq(legacyCustomerInterestCalculations.legacyCustomerId, legacyCustomerId),
    eq(legacyCustomerInterestCalculations.status, 'pending'),
    gte(legacyCustomerInterestCalculations.paymentDate, today),
    lte(legacyCustomerInterestCalculations.paymentDate, futureDate)
  )).orderBy(asc(legacyCustomerInterestCalculations.paymentDate)).execute();
  return calculations;
}
