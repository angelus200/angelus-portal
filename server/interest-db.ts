import { getDb } from './db';
import { interestParameters } from '../drizzle/interest-schema';
import { eq, and, or, isNull, lte, gte } from 'drizzle-orm';
import Decimal from 'decimal.js';

/**
 * Get the currently active interest parameters
 * Only one parameter set should be active at a time
 */
export async function getActiveInterestParameters() {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const params = await db
    .select()
    .from(interestParameters)
    .where(eq(interestParameters.isActive, true))
    .limit(1);

  if (params.length === 0) {
    throw new Error('No active interest parameters found');
  }

  return params[0];
}

/**
 * Get interest parameters by ID
 */
export async function getInterestParametersById(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const params = await db
    .select()
    .from(interestParameters)
    .where(eq(interestParameters.id, id))
    .limit(1);

  if (params.length === 0) {
    throw new Error(`Interest parameters with ID ${id} not found`);
  }

  return params[0];
}

/**
 * Get all interest parameter sets
 */
export async function getAllInterestParameters() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(interestParameters).orderBy(interestParameters.createdAt).execute();
}

/**
 * Get effective interest parameters for a specific date
 * Returns parameters that are effective on the given date
 */
export async function getEffectiveInterestParameters(date: Date) {
  const db = await getDb();
  if (!db) return getActiveInterestParameters();
  const params = await db
    .select()
    .from(interestParameters)
    .where(
      and(
        gte(interestParameters.effectiveFrom, date),
        or(
          isNull(interestParameters.effectiveUntil),
          lte(interestParameters.effectiveUntil, date)
        )
      )
    )
    .limit(1);

  if (params.length === 0) {
    return getActiveInterestParameters();
  }

  return params[0];
}

/**
 * Create new interest parameters
 */
export async function createInterestParameters(data: {
  name: string;
  description?: string;
  annualInterestRate: string | number;
  defaultInterestRate: string | number;
  latePaymentInterestRate?: string | number;
  capitalGainsTax: string | number;
  solidaritySurcharge: string | number;
  churchTax?: string | number;
  noDefaultInterestForCompany?: boolean;
  enableInsolvencyHold?: boolean;
  enableCompoundInterest?: boolean;
  roundInterestToCent?: boolean;
  daysPerYear?: number;
  minimumInterestAmount?: string | number;
  graceperiodDays?: number;
  defaultPaymentFrequency?: string;
  monthlyPaymentDay?: number;
  annualPaymentDay?: number;
  isActive?: boolean;
  version?: number;
  effectiveFrom?: Date;
  effectiveUntil?: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // If this is the new active parameter set, deactivate all others
  if (data.isActive) {
    await db
      .update(interestParameters)
      .set({ isActive: false })
      .where(eq(interestParameters.isActive, true));
  }

  const result = await db.insert(interestParameters).values({
    name: data.name,
    description: data.description,
    annualInterestRate: new Decimal(data.annualInterestRate).toString(),
    defaultInterestRate: new Decimal(data.defaultInterestRate).toString(),
    latePaymentInterestRate: new Decimal(data.latePaymentInterestRate || 0).toString(),
    capitalGainsTax: new Decimal(data.capitalGainsTax).toString(),
    solidaritySurcharge: new Decimal(data.solidaritySurcharge).toString(),
    churchTax: new Decimal(data.churchTax || 0).toString(),
    noDefaultInterestForCompany: data.noDefaultInterestForCompany ?? true,
    enableInsolvencyHold: data.enableInsolvencyHold ?? true,
    enableCompoundInterest: data.enableCompoundInterest ?? false,
    roundInterestToCent: data.roundInterestToCent ?? true,
    daysPerYear: data.daysPerYear ?? 365,
    minimumInterestAmount: new Decimal(data.minimumInterestAmount || 0.01).toString(),
    graceperiodDays: data.graceperiodDays ?? 0,
    defaultPaymentFrequency: data.defaultPaymentFrequency ?? 'monthly',
    monthlyPaymentDay: data.monthlyPaymentDay ?? 15,
    annualPaymentDay: data.annualPaymentDay ?? 365,
    isActive: data.isActive ?? false,
    version: data.version ?? 1,
    effectiveFrom: data.effectiveFrom ?? new Date(),
    effectiveUntil: data.effectiveUntil,
  }).execute();

  return result[0] || result;
}

/**
 * Update interest parameters
 */
export async function updateInterestParameters(
  id: number,
  data: Partial<{
    name: string;
    description: string;
    annualInterestRate: string | number;
    defaultInterestRate: string | number;
    latePaymentInterestRate: string | number;
    capitalGainsTax: string | number;
    solidaritySurcharge: string | number;
    churchTax: string | number;
    noDefaultInterestForCompany: boolean;
    enableInsolvencyHold: boolean;
    enableCompoundInterest: boolean;
    roundInterestToCent: boolean;
    daysPerYear: number;
    minimumInterestAmount: string | number;
    graceperiodDays: number;
    defaultPaymentFrequency: string;
    monthlyPaymentDay: number;
    annualPaymentDay: number;
    isActive: boolean;
    version: number;
    effectiveUntil: Date;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // If activating this parameter set, deactivate all others
  if (data.isActive) {
    await db
      .update(interestParameters)
      .set({ isActive: false })
      .where(eq(interestParameters.isActive, true));
  }

  const updateData: any = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.annualInterestRate !== undefined)
    updateData.annualInterestRate = new Decimal(data.annualInterestRate);
  if (data.defaultInterestRate !== undefined)
    updateData.defaultInterestRate = new Decimal(data.defaultInterestRate);
  if (data.latePaymentInterestRate !== undefined)
    updateData.latePaymentInterestRate = new Decimal(data.latePaymentInterestRate);
  if (data.capitalGainsTax !== undefined)
    updateData.capitalGainsTax = new Decimal(data.capitalGainsTax);
  if (data.solidaritySurcharge !== undefined)
    updateData.solidaritySurcharge = new Decimal(data.solidaritySurcharge);
  if (data.churchTax !== undefined) updateData.churchTax = new Decimal(data.churchTax);
  if (data.noDefaultInterestForCompany !== undefined)
    updateData.noDefaultInterestForCompany = data.noDefaultInterestForCompany;
  if (data.enableInsolvencyHold !== undefined)
    updateData.enableInsolvencyHold = data.enableInsolvencyHold;
  if (data.enableCompoundInterest !== undefined)
    updateData.enableCompoundInterest = data.enableCompoundInterest;
  if (data.roundInterestToCent !== undefined)
    updateData.roundInterestToCent = data.roundInterestToCent;
  if (data.daysPerYear !== undefined) updateData.daysPerYear = data.daysPerYear;
  if (data.minimumInterestAmount !== undefined)
    updateData.minimumInterestAmount = new Decimal(data.minimumInterestAmount);
  if (data.graceperiodDays !== undefined) updateData.graceperiodDays = data.graceperiodDays;
  if (data.defaultPaymentFrequency !== undefined)
    updateData.defaultPaymentFrequency = data.defaultPaymentFrequency;
  if (data.monthlyPaymentDay !== undefined) updateData.monthlyPaymentDay = data.monthlyPaymentDay;
  if (data.annualPaymentDay !== undefined) updateData.annualPaymentDay = data.annualPaymentDay;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.version !== undefined) updateData.version = data.version;
  if (data.effectiveUntil !== undefined) updateData.effectiveUntil = data.effectiveUntil;

  return await db
    .update(interestParameters)
    .set(updateData)
    .where(eq(interestParameters.id, id));
}

/**
 * Delete interest parameters
 */
export async function deleteInterestParameters(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return await db.delete(interestParameters).where(eq(interestParameters.id, id));
}

/**
 * Activate a specific parameter set
 */
export async function activateInterestParameters(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Deactivate all others
  await db
    .update(interestParameters)
    .set({ isActive: false })
    .where(eq(interestParameters.isActive, true));

  // Activate the specified one
  return await db
    .update(interestParameters)
    .set({ isActive: true })
    .where(eq(interestParameters.id, id));
}

/**
 * Create a new version of interest parameters
 * Useful for scheduling parameter changes
 */
export async function createParameterVersion(
  baseId: number,
  data: {
    name: string;
    effectiveFrom: Date;
    effectiveUntil?: Date;
    [key: string]: any;
  }
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Get base parameters
  const baseParams = await getInterestParametersById(baseId);

  // Create new version with updated values
  const newVersion = {
    ...baseParams,
    ...data,
    id: undefined, // Will be auto-generated
    version: (baseParams.version || 1) + 1,
    isActive: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return await db.insert(interestParameters).values(newVersion);
}

/**
 * Get parameter history
 * Returns all versions of parameters ordered by creation date
 */
export async function getParameterHistory(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(interestParameters)
    .orderBy(interestParameters.createdAt)
    .limit(limit)
    .execute();
}

/**
 * Validate interest parameters
 * Ensures all values are within acceptable ranges
 */
export function validateInterestParameters(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate percentage fields (0-100)
  const percentageFields = [
    'annualInterestRate',
    'defaultInterestRate',
    'latePaymentInterestRate',
    'capitalGainsTax',
    'solidaritySurcharge',
    'churchTax',
  ];

  for (const field of percentageFields) {
    if (data[field] !== undefined) {
      const value = parseFloat(data[field]);
      if (isNaN(value) || value < 0 || value > 100) {
        errors.push(`${field} must be between 0 and 100`);
      }
    }
  }

  // Validate day fields
  if (data.monthlyPaymentDay !== undefined) {
    if (data.monthlyPaymentDay < 1 || data.monthlyPaymentDay > 31) {
      errors.push('monthlyPaymentDay must be between 1 and 31');
    }
  }

  if (data.annualPaymentDay !== undefined) {
    if (data.annualPaymentDay < 1 || data.annualPaymentDay > 365) {
      errors.push('annualPaymentDay must be between 1 and 365');
    }
  }

  if (data.graceperiodDays !== undefined) {
    if (data.graceperiodDays < 0 || data.graceperiodDays > 365) {
      errors.push('graceperiodDays must be between 0 and 365');
    }
  }

  // Validate daysPerYear
  if (data.daysPerYear !== undefined) {
    if (![360, 365, 366].includes(data.daysPerYear)) {
      errors.push('daysPerYear must be 360, 365, or 366');
    }
  }

  // Validate payment frequency
  if (data.defaultPaymentFrequency !== undefined) {
    const validFrequencies = ['monthly', 'quarterly', 'annual', 'thesaurierend'];
    if (!validFrequencies.includes(data.defaultPaymentFrequency)) {
      errors.push(
        `defaultPaymentFrequency must be one of: ${validFrequencies.join(', ')}`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
