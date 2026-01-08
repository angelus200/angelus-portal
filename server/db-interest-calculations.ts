/**
 * Database functions for Interest Calculations and Payment Schedules
 * 
 * Provides CRUD operations for storing and retrieving interest calculations
 * and payment schedules from the database
 */

import * as db from './db';
import {
  interestCalculations,
  paymentSchedules,
  paymentScheduleItems,
  InsertInterestCalculation,
  InsertPaymentSchedule,
  InsertPaymentScheduleItem,
} from '../drizzle/interest-schema';
import { eq, and, desc } from 'drizzle-orm';
import Decimal from 'decimal.js';

/**
 * Save an interest calculation to the database
 */
export async function saveInterestCalculation(
  userId: number,
  input: {
    principal: string;
    annualRate: string;
    subscriptionAmount: string;
    paidAmount: string;
    startDate: string;
    periods: number;
    kestRate: string;
    solzRate: string;
    churchTaxRate: string;
    defaultRate: string;
    isCompanyLiability: boolean;
    enableInsolvencyHold: boolean;
    paymentFrequency: string;
    basicInterest: string;
    kest: string;
    solz: string;
    churchTax: string;
    totalTaxes: string;
    defaultInterest: string;
    appliedDefaultInterest: string;
    totalInterestAndTaxes: string;
    netInterest: string;
    totalPayable: string;
    businessRulesApplied: string[];
    description?: string;
    reference?: string;
  }
): Promise<number> {
  const database = await db.getDb();
  if (!database) throw new Error('Database not available');
  const result = await database.insert(interestCalculations).values({
    userId,
    principal: input.principal as any,
    annualRate: input.annualRate as any,
    subscriptionAmount: input.subscriptionAmount as any,
    paidAmount: input.paidAmount as any,
    startDate: new Date(input.startDate),
    periods: input.periods,
    kestRate: input.kestRate as any,
    solzRate: input.solzRate as any,
    churchTaxRate: input.churchTaxRate as any,
    defaultRate: input.defaultRate as any,
    isCompanyLiability: input.isCompanyLiability,
    enableInsolvencyHold: input.enableInsolvencyHold,
    paymentFrequency: input.paymentFrequency,
    basicInterest: input.basicInterest as any,
    kest: input.kest as any,
    solz: input.solz as any,
    churchTax: input.churchTax as any,
    totalTaxes: input.totalTaxes as any,
    defaultInterest: input.defaultInterest as any,
    appliedDefaultInterest: input.appliedDefaultInterest as any,
    totalInterestAndTaxes: input.totalInterestAndTaxes as any,
    netInterest: input.netInterest as any,
    totalPayable: input.totalPayable as any,
    businessRulesApplied: JSON.stringify(input.businessRulesApplied),
    description: input.description,
    reference: input.reference,
  });

  return result[0].insertId;
}

/**
 * Get an interest calculation by ID
 */
export async function getInterestCalculationById(id: number, userId: number) {
  const database = await db.getDb();
  if (!database) return null;
  const result = await database
    .select()
    .from(interestCalculations)
    .where(and(eq(interestCalculations.id, id), eq(interestCalculations.userId, userId)))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  const calc = result[0];
  return {
    ...calc,
    businessRulesApplied: JSON.parse(calc.businessRulesApplied || '[]'),
  };
}

/**
 * List all interest calculations for a user
 */
export async function listUserInterestCalculations(
  userId: number,
  limit: number = 50,
  offset: number = 0
) {
  const database = await db.getDb();
  if (!database) return [];
  const results = await database
    .select()
    .from(interestCalculations)
    .where(eq(interestCalculations.userId, userId))
    .orderBy(desc(interestCalculations.createdAt))
    .limit(limit)
    .offset(offset);

  return results.map((calc) => ({
    ...calc,
    businessRulesApplied: JSON.parse(calc.businessRulesApplied || '[]'),
  }));
}

/**
 * Save a payment schedule to the database
 */
export async function savePaymentSchedule(
  userId: number,
  interestCalculationId: number,
  input: {
    frequency: string;
    totalPayments: number;
    totalInterest: string;
    totalTaxes: string;
    totalDefaultInterest: string;
    totalPayable: string;
    scheduleData: any[];
    reference?: string;
    notes?: string;
  }
): Promise<number> {
  const database = await db.getDb();
  if (!database) throw new Error('Database not available');
  const result = await database.insert(paymentSchedules).values({
    userId,
    interestCalculationId,
    frequency: input.frequency,
    totalPayments: input.totalPayments,
    totalInterest: input.totalInterest as any,
    totalTaxes: input.totalTaxes as any,
    totalDefaultInterest: input.totalDefaultInterest as any,
    totalPayable: input.totalPayable as any,
    scheduleData: JSON.stringify(input.scheduleData),
    reference: input.reference,
    notes: input.notes,
  });

  return result[0].insertId;
}

/**
 * Get a payment schedule by ID
 */
export async function getPaymentScheduleById(id: number, userId: number) {
  const database = await db.getDb();
  if (!database) return null;
  const result = await database
    .select()
    .from(paymentSchedules)
    .where(and(eq(paymentSchedules.id, id), eq(paymentSchedules.userId, userId)))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  const schedule = result[0];
  return {
    ...schedule,
    scheduleData: JSON.parse(schedule.scheduleData),
  };
}

/**
 * List all payment schedules for a user
 */
export async function listUserPaymentSchedules(
  userId: number,
  limit: number = 50,
  offset: number = 0
) {
  const database = await db.getDb();
  if (!database) return [];
  const results = await database
    .select()
    .from(paymentSchedules)
    .where(eq(paymentSchedules.userId, userId))
    .orderBy(desc(paymentSchedules.createdAt))
    .limit(limit)
    .offset(offset);

  return results.map((schedule) => ({
    ...schedule,
    scheduleData: JSON.parse(schedule.scheduleData),
  }));
}

/**
 * Save payment schedule items (individual payments)
 */
export async function savePaymentScheduleItems(
  userId: number,
  paymentScheduleId: number,
  interestCalculationId: number,
  items: Array<{
    paymentNumber: number;
    paymentDate: string;
    principalAmount: string;
    interestAmount: string;
    taxAmount: string;
    defaultInterestAmount: string;
    totalPayment: string;
  }>
): Promise<void> {
  const database = await db.getDb();
  if (!database) throw new Error('Database not available');
  const values = items.map((item) => ({
    userId,
    paymentScheduleId,
    interestCalculationId,
    paymentNumber: item.paymentNumber,
    paymentDate: new Date(item.paymentDate),
    principalAmount: item.principalAmount as any,
    interestAmount: item.interestAmount as any,
    taxAmount: item.taxAmount as any,
    defaultInterestAmount: item.defaultInterestAmount as any,
    totalPayment: item.totalPayment as any,
    status: 'pending' as const,
  }));

  await database.insert(paymentScheduleItems).values(values);
}

/**
 * Get payment schedule items for a schedule
 */
export async function getPaymentScheduleItems(paymentScheduleId: number, userId: number) {
  const database = await db.getDb();
  if (!database) return [];
  const results = await database
    .select()
    .from(paymentScheduleItems)
    .where(
      and(
        eq(paymentScheduleItems.paymentScheduleId, paymentScheduleId),
        eq(paymentScheduleItems.userId, userId)
      )
    )
    .orderBy(paymentScheduleItems.paymentNumber);

  return results;
}

/**
 * Update payment schedule item status
 */
export async function updatePaymentScheduleItemStatus(
  itemId: number,
  status: 'pending' | 'paid' | 'overdue' | 'cancelled',
  userId: number
): Promise<boolean> {
  const database = await db.getDb();
  if (!database) return false;
  const result = await database
    .update(paymentScheduleItems)
    .set({
      status,
      paidAt: status === 'paid' ? new Date() : null,
    })
    .where(
      and(eq(paymentScheduleItems.id, itemId), eq(paymentScheduleItems.userId, userId))
    );

  return (result as any).changes > 0 || (result as any).rowsAffected > 0;
}

/**
 * Get statistics for a user's interest calculations
 */
export async function getUserInterestCalculationStats(userId: number) {
  const database = await db.getDb();
  if (!database) return { totalCalculations: 0, totalInterest: '0', totalTaxes: '0', totalPayable: '0', averageRate: '0' };
  const calculations = await database
    .select()
    .from(interestCalculations)
    .where(eq(interestCalculations.userId, userId));

  if (calculations.length === 0) {
    return {
      totalCalculations: 0,
      totalInterest: '0',
      totalTaxes: '0',
      totalPayable: '0',
      averageRate: '0',
    };
  }

  const result = calculations.reduce(
    (sum: Decimal, calc: any) => sum.plus(new Decimal(calc.basicInterest)),
    new Decimal(0)
  );

  const totalTaxes = calculations.reduce(
    (sum, calc) => sum.plus(new Decimal(calc.totalTaxes)),
    new Decimal(0)
  );

  const totalPayable = calculations.reduce(
    (sum, calc) => sum.plus(new Decimal(calc.totalPayable)),
    new Decimal(0)
  );

  const averageRate = calculations.reduce(
    (sum, calc) => sum.plus(new Decimal(calc.annualRate)),
    new Decimal(0)
  ).dividedBy(calculations.length);

  return {
    totalCalculations: calculations.length,
    totalInterest: result.toString(),
    totalTaxes: totalTaxes.toString(),
    totalPayable: totalPayable.toString(),
    averageRate: averageRate.toString(),
  };
}

/**
 * Delete an interest calculation and its associated payment schedules
 */
export async function deleteInterestCalculation(id: number, userId: number): Promise<boolean> {
  const database = await db.getDb();
  if (!database) return false;
  
  // First, get the calculation to verify ownership
  const calc = await getInterestCalculationById(id, userId);
  if (!calc) {
    return false;
  }

  // Delete payment schedule items
  await database
    .delete(paymentScheduleItems)
    .where(eq(paymentScheduleItems.interestCalculationId, id));

  // Delete payment schedules
  await database
    .delete(paymentSchedules)
    .where(eq(paymentSchedules.interestCalculationId, id));

  // Delete interest calculation
  await database
    .delete(interestCalculations)
    .where(eq(interestCalculations.id, id));

  return true;
}
