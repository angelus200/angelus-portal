import { mysqlTable, int, decimal, boolean, timestamp, varchar, text, unique } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';
import Decimal from 'decimal.js';

/**
 * Interest Parameters Table
 * Stores global interest calculation parameters and rules
 * All values are flexible and can be changed at any time
 */
export const interestParameters = mysqlTable(
  'interest_parameters',
  {
    // Primary Key
    id: int('id').primaryKey().autoincrement(),

    // === BASIC INTEREST RATES ===
    /**
     * Annual interest rate for normal bond payments (in percentage)
     * Example: 6.00 = 6% p.a.
     * Range: 0.00 - 100.00
     */
    annualInterestRate: decimal('annual_interest_rate', { precision: 5, scale: 2 })
      .notNull()
      .default('6.00'),

    /**
     * Default interest rate for outstanding/unpaid amounts (in percentage)
     * Applied when investor draws amount but doesn't pay full amount
     * Example: 17.00 = 17% p.a. on outstanding amount
     * Range: 0.00 - 100.00
     */
    defaultInterestRate: decimal('default_interest_rate', { precision: 5, scale: 2 })
      .notNull()
      .default('17.00'),

    /**
     * Penalty interest rate for late payments by company (in percentage)
     * Set to 0.00 if no penalty interest should be charged
     * Range: 0.00 - 100.00
     */
    latePaymentInterestRate: decimal('late_payment_interest_rate', { precision: 5, scale: 2 })
      .notNull()
      .default('0.00'),

    // === TAX PARAMETERS ===
    /**
     * Capital gains tax (Kapitalertragsteuer) in percentage
     * Standard in Germany: 25%
     * Range: 0.00 - 100.00
     */
    capitalGainsTax: decimal('capital_gains_tax', { precision: 5, scale: 2 })
      .notNull()
      .default('25.00'),

    /**
     * Solidarity surcharge (Solidaritätszuschlag) in percentage
     * Calculated on capital gains tax: typically 5.5% of tax
     * Range: 0.00 - 100.00
     */
    solidaritySurcharge: decimal('solidarity_surcharge', { precision: 5, scale: 2 })
      .notNull()
      .default('5.50'),

    /**
     * Church tax (Kirchensteuer) in percentage
     * Varies by state in Germany: 0% - 9%
     * Range: 0.00 - 100.00
     */
    churchTax: decimal('church_tax', { precision: 5, scale: 2 })
      .notNull()
      .default('0.00'),

    // === BUSINESS RULES ===
    /**
     * Flag: No default interest for company's own late payments
     * If true: Company doesn't pay penalty interest for late payments
     * If false: Company pays penalty interest like any other investor
     */
    noDefaultInterestForCompany: boolean('no_default_interest_for_company')
      .notNull()
      .default(true),

    /**
     * Flag: Enable insolvency hold
     * If true: Payments can be suspended due to insolvency
     * If false: All payments must be made regardless of insolvency
     */
    enableInsolvencyHold: boolean('enable_insolvency_hold')
      .notNull()
      .default(true),

    /**
     * Flag: Apply compound interest for thesaurierend (reinvested) payments
     * If true: Interest is calculated on interest (compound)
     * If false: Interest is always calculated on original amount (simple interest)
     * Note: Per business rules, this should be false (no compound interest)
     */
    enableCompoundInterest: boolean('enable_compound_interest')
      .notNull()
      .default(false),

    /**
     * Flag: Round interest to nearest cent
     * If true: 123.456 € becomes 123.46 €
     * If false: Keep full precision
     */
    roundInterestToCent: boolean('round_interest_to_cent')
      .notNull()
      .default(true),

    // === CALCULATION SETTINGS ===
    /**
     * Number of days per year for interest calculation
     * 360 = 30/360 method (Euribor standard)
     * 365 = Actual/365 method
     * 366 = Actual/Actual method
     */
    daysPerYear: int('days_per_year')
      .notNull()
      .default(365),

    /**
     * Minimum interest amount to calculate (in EUR)
     * Interest below this threshold is not calculated
     * Example: 0.01 means only calculate if interest >= 0.01 €
     */
    minimumInterestAmount: decimal('minimum_interest_amount', { precision: 10, scale: 2 })
      .notNull()
      .default('0.01'),

    /**
     * Grace period for late payments in days
     * Example: 14 means 14 days grace period before penalty interest applies
     */
    graceperiodDays: int('grace_period_days')
      .notNull()
      .default(0),

    // === PAYMENT FREQUENCY SETTINGS ===
    /**
     * Default payment frequency for new bonds
     * 'monthly' = monthly interest payments
     * 'quarterly' = quarterly interest payments
     * 'annual' = annual interest payments
     * 'thesaurierend' = reinvested (no payments)
     */
    defaultPaymentFrequency: varchar('default_payment_frequency', { length: 20 })
      .notNull()
      .default('monthly'),

    /**
     * Day of month for monthly interest payments (1-31)
     * Example: 15 = interest paid on 15th of each month
     */
    monthlyPaymentDay: int('monthly_payment_day')
      .notNull()
      .default(15),

    /**
     * Day of year for annual interest payments (1-365)
     * Example: 365 = interest paid on December 31st
     */
    annualPaymentDay: int('annual_payment_day')
      .notNull()
      .default(365),

    // === DESCRIPTION & METADATA ===
    /**
     * Human-readable name for this parameter set
     * Example: "Standard Parameters 2024"
     */
    name: varchar('name', { length: 255 })
      .notNull()
      .default('Default Parameters'),

    /**
     * Description of these parameters
     * For documentation purposes
     */
    description: text('description'),

    /**
     * Is this the active parameter set?
     * Only one parameter set should be active at a time
     */
    isActive: boolean('is_active')
      .notNull()
      .default(true),

    /**
     * Version number for tracking changes
     * Increment when parameters change significantly
     */
    version: int('version')
      .notNull()
      .default(1),

    // === TIMESTAMPS ===
    createdAt: timestamp('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    updatedAt: timestamp('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`)
      .onUpdateNow(),

    /**
     * When these parameters become effective
     * Useful for scheduling parameter changes
     */
    effectiveFrom: timestamp('effective_from')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    /**
     * When these parameters expire
     * NULL = no expiration
     */
    effectiveUntil: timestamp('effective_until'),
  },
  (table) => ({
    // Index for quick lookups
    idxActive: sql`INDEX idx_active ON interest_parameters(is_active)`,
    idxEffectiveFrom: sql`INDEX idx_effective_from ON interest_parameters(effective_from)`,
  })
);

/**
 * Type definitions for TypeScript
 */
export type InterestParameters = typeof interestParameters.$inferSelect;
export type InsertInterestParameters = typeof interestParameters.$inferInsert;

/**
 * Validation schema for interest parameters
 * Ensures all values are within valid ranges
 */
export const interestParametersValidation = {
  annualInterestRate: { min: 0, max: 100, decimals: 2 },
  defaultInterestRate: { min: 0, max: 100, decimals: 2 },
  latePaymentInterestRate: { min: 0, max: 100, decimals: 2 },
  capitalGainsTax: { min: 0, max: 100, decimals: 2 },
  solidaritySurcharge: { min: 0, max: 100, decimals: 2 },
  churchTax: { min: 0, max: 100, decimals: 2 },
  daysPerYear: { min: 360, max: 366 },
  monthlyPaymentDay: { min: 1, max: 31 },
  annualPaymentDay: { min: 1, max: 365 },
  graceperiodDays: { min: 0, max: 365 },
};

/**
 * Default parameter values
 * Used when creating new parameter sets
 */
export const defaultInterestParameters: InsertInterestParameters = {
  name: 'Default Parameters',
  description: 'Standard interest calculation parameters',
  annualInterestRate: '6.00' as any,
  defaultInterestRate: '17.00' as any,
  latePaymentInterestRate: '0.00' as any,
  capitalGainsTax: '25.00' as any,
  solidaritySurcharge: '5.50' as any,
  churchTax: '0.00' as any,
  noDefaultInterestForCompany: true,
  enableInsolvencyHold: true,
  enableCompoundInterest: false,
  roundInterestToCent: true,
  daysPerYear: 365,
  minimumInterestAmount: '0.01' as any,
  graceperiodDays: 0,
  defaultPaymentFrequency: 'monthly',
  monthlyPaymentDay: 15,
  annualPaymentDay: 365,
  isActive: true,
  version: 1,
};

/**
 * Example parameter sets for different scenarios
 */
export const exampleParameterSets = {
  /**
   * Conservative parameters (lower interest rates)
   */
  conservative: {
    name: 'Conservative Parameters',
    description: 'Lower interest rates for conservative investors',
    annualInterestRate: '3.00' as any,
    defaultInterestRate: '10.00' as any,
    latePaymentInterestRate: '0.00' as any,
  },

  /**
   * Aggressive parameters (higher interest rates)
   */
  aggressive: {
    name: 'Aggressive Parameters',
    description: 'Higher interest rates for higher returns',
    annualInterestRate: '10.00' as any,
    defaultInterestRate: '25.00' as any,
    latePaymentInterestRate: '5.00' as any,
  },

  /**
   * No-tax parameters (for testing)
   */
  noTax: {
    name: 'No Tax Parameters',
    description: 'Parameters with no taxes (for testing)',
    capitalGainsTax: '0.00' as any,
    solidaritySurcharge: '0.00' as any,
    churchTax: '0.00' as any,
  },
};


/**
 * Interest Calculations Table
 * Stores all calculated interest calculations for audit trail and reporting
 */
export const interestCalculations = mysqlTable(
  'interest_calculations',
  {
    id: int('id').primaryKey().autoincrement(),
    
    // User reference
    userId: int('user_id').notNull(),
    
    // Calculation inputs
    principal: decimal('principal', { precision: 18, scale: 2 }).notNull(),
    annualRate: decimal('annual_rate', { precision: 5, scale: 2 }).notNull(),
    subscriptionAmount: decimal('subscription_amount', { precision: 18, scale: 2 }).notNull(),
    paidAmount: decimal('paid_amount', { precision: 18, scale: 2 }).notNull(),
    startDate: timestamp('start_date').notNull(),
    periods: int('periods').notNull(),
    
    // Tax rates
    kestRate: decimal('kest_rate', { precision: 5, scale: 2 }).notNull().default('25.00'),
    solzRate: decimal('solz_rate', { precision: 5, scale: 2 }).notNull().default('5.50'),
    churchTaxRate: decimal('church_tax_rate', { precision: 5, scale: 2 }).notNull().default('0.00'),
    
    // Default interest rate
    defaultRate: decimal('default_rate', { precision: 5, scale: 2 }).notNull().default('17.00'),
    
    // Business rules
    isCompanyLiability: boolean('is_company_liability').notNull().default(false),
    enableInsolvencyHold: boolean('enable_insolvency_hold').notNull().default(false),
    
    // Payment frequency
    paymentFrequency: varchar('payment_frequency', { length: 20 }).notNull(), // 'monthly', 'annual', 'thesaurierend'
    
    // Calculation results
    basicInterest: decimal('basic_interest', { precision: 18, scale: 2 }).notNull(),
    kest: decimal('kest', { precision: 18, scale: 2 }).notNull(),
    solz: decimal('solz', { precision: 18, scale: 2 }).notNull(),
    churchTax: decimal('church_tax', { precision: 18, scale: 2 }).notNull(),
    totalTaxes: decimal('total_taxes', { precision: 18, scale: 2 }).notNull(),
    defaultInterest: decimal('default_interest', { precision: 18, scale: 2 }).notNull(),
    appliedDefaultInterest: decimal('applied_default_interest', { precision: 18, scale: 2 }).notNull(),
    totalInterestAndTaxes: decimal('total_interest_and_taxes', { precision: 18, scale: 2 }).notNull(),
    netInterest: decimal('net_interest', { precision: 18, scale: 2 }).notNull(),
    totalPayable: decimal('total_payable', { precision: 18, scale: 2 }).notNull(),
    
    // Applied business rules (stored as JSON for audit trail)
    businessRulesApplied: text('business_rules_applied'), // JSON array
    
    // Metadata
    description: text('description'),
    reference: varchar('reference', { length: 255 }), // External reference (e.g., bond ID, contract ID)
    
    // Timestamps
    createdAt: timestamp('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    
    updatedAt: timestamp('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`)
      .onUpdateNow(),
  },
  (table) => ({
    idxUserId: sql`INDEX idx_user_id ON interest_calculations(user_id)`,
    idxCreatedAt: sql`INDEX idx_created_at ON interest_calculations(created_at)`,
    idxReference: sql`INDEX idx_reference ON interest_calculations(reference)`,
  })
);

export type InterestCalculation = typeof interestCalculations.$inferSelect;
export type InsertInterestCalculation = typeof interestCalculations.$inferInsert;

/**
 * Payment Schedules Table
 * Stores generated payment schedules for each interest calculation
 */
export const paymentSchedules = mysqlTable(
  'payment_schedules',
  {
    id: int('id').primaryKey().autoincrement(),
    
    // Reference to interest calculation
    interestCalculationId: int('interest_calculation_id').notNull(),
    userId: int('user_id').notNull(),
    
    // Schedule metadata
    frequency: varchar('frequency', { length: 20 }).notNull(), // 'monthly', 'annual', 'thesaurierend'
    totalPayments: int('total_payments').notNull(),
    
    // Summary totals
    totalInterest: decimal('total_interest', { precision: 18, scale: 2 }).notNull(),
    totalTaxes: decimal('total_taxes', { precision: 18, scale: 2 }).notNull(),
    totalDefaultInterest: decimal('total_default_interest', { precision: 18, scale: 2 }).notNull(),
    totalPayable: decimal('total_payable', { precision: 18, scale: 2 }).notNull(),
    
    // Schedule data (stored as JSON for flexibility)
    scheduleData: text('schedule_data').notNull(), // JSON array of payment items
    
    // Metadata
    reference: varchar('reference', { length: 255 }), // External reference
    notes: text('notes'),
    
    // Timestamps
    createdAt: timestamp('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    
    updatedAt: timestamp('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`)
      .onUpdateNow(),
  },
  (table) => ({
    idxInterestCalculationId: sql`INDEX idx_interest_calculation_id ON payment_schedules(interest_calculation_id)`,
    idxUserId: sql`INDEX idx_user_id ON payment_schedules(user_id)`,
    idxCreatedAt: sql`INDEX idx_created_at ON payment_schedules(created_at)`,
  })
);

export type PaymentSchedule = typeof paymentSchedules.$inferSelect;
export type InsertPaymentSchedule = typeof paymentSchedules.$inferInsert;

/**
 * Payment Schedule Items Table
 * Individual payment items from a schedule (denormalized for quick access)
 */
export const paymentScheduleItems = mysqlTable(
  'payment_schedule_items',
  {
    id: int('id').primaryKey().autoincrement(),
    
    // Reference to payment schedule
    paymentScheduleId: int('payment_schedule_id').notNull(),
    interestCalculationId: int('interest_calculation_id').notNull(),
    userId: int('user_id').notNull(),
    
    // Payment details
    paymentNumber: int('payment_number').notNull(),
    paymentDate: timestamp('payment_date').notNull(),
    
    // Amount breakdown
    principalAmount: decimal('principal_amount', { precision: 18, scale: 2 }).notNull(),
    interestAmount: decimal('interest_amount', { precision: 18, scale: 2 }).notNull(),
    taxAmount: decimal('tax_amount', { precision: 18, scale: 2 }).notNull(),
    defaultInterestAmount: decimal('default_interest_amount', { precision: 18, scale: 2 }).notNull(),
    totalPayment: decimal('total_payment', { precision: 18, scale: 2 }).notNull(),
    
    // Payment status
    status: varchar('status', { length: 20 }).notNull().default('pending'), // 'pending', 'paid', 'overdue', 'cancelled'
    paidAt: timestamp('paid_at'),
    
    // Metadata
    notes: text('notes'),
    
    // Timestamps
    createdAt: timestamp('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    
    updatedAt: timestamp('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`)
      .onUpdateNow(),
  },
  (table) => ({
    idxPaymentScheduleId: sql`INDEX idx_payment_schedule_id ON payment_schedule_items(payment_schedule_id)`,
    idxUserId: sql`INDEX idx_user_id ON payment_schedule_items(user_id)`,
    idxPaymentDate: sql`INDEX idx_payment_date ON payment_schedule_items(payment_date)`,
    idxStatus: sql`INDEX idx_status ON payment_schedule_items(status)`,
  })
);

export type PaymentScheduleItem = typeof paymentScheduleItems.$inferSelect;
export type InsertPaymentScheduleItem = typeof paymentScheduleItems.$inferInsert;
