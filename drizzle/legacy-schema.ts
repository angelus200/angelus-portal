import {
  mysqlTable,
  varchar,
  int,
  decimal,
  date,
  timestamp,
  text,
  mysqlEnum,
  boolean,
  json,
  primaryKey,
  foreignKey,
  index,
  uniqueIndex,
} from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';
import { bonds, users } from './schema';

/**
 * Legacy Customers Table
 * Stores information about existing customers with DocuSign bonds
 */
export const legacyCustomers = mysqlTable(
  'legacy_customers',
  {
    // Primary Key
    id: int('id').primaryKey().autoincrement(),

    // Identification
    contractNumber: varchar('contract_number', { length: 20 }).notNull().unique(),
    userId: int('user_id').unique(), // Link to investor user (optional)

    // Personal Data
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    birthDate: date('birth_date'),
    email: varchar('email', { length: 255 }).unique(),
    phone: varchar('phone', { length: 20 }),

    // Address
    street: varchar('street', { length: 255 }),
    houseNumber: varchar('house_number', { length: 10 }),
    postalCode: varchar('postal_code', { length: 10 }),
    city: varchar('city', { length: 100 }),
    country: varchar('country', { length: 100 }).default('Deutschland'),

    // Bank Details
    iban: varchar('iban', { length: 34 }),
    bic: varchar('bic', { length: 11 }),
    accountHolder: varchar('account_holder', { length: 255 }),

    // Bond Information
    bondId: int('bond_id'),
    bondNumber: varchar('bond_number', { length: 50 }), // e.g., "60-2023"

    // Contract Data
    contractDate: date('contract_date'), // Zeichnungsdatum (e.g., 17.10.2024)
    valueDate: date('value_date'), // Wertstellungsdatum (e.g., 18.10.2023)
    investmentAmount: decimal('investment_amount', { precision: 15, scale: 2 }), // e.g., 100000.00
    shareCount: int('share_count'), // Number of shares (e.g., 100)
    shareValue: decimal('share_value', { precision: 15, scale: 2 }), // Value per share (e.g., 1000.00)

    // Interest Information
    annualInterestRate: decimal('annual_interest_rate', { precision: 5, scale: 2 }), // e.g., 18.00
    interestPaymentFrequency: mysqlEnum('interest_payment_frequency', [
      'monthly',
      'quarterly',
      'annual',
    ]).default('monthly'),
    annualInterestDate: date('annual_interest_date'), // Stichtag (e.g., 01.06.)
    monthlyPaymentDay: int('monthly_payment_day'), // Day of month for interest payment (e.g., 15)

    // Maturity
    maturityDate: date('maturity_date'), // End date
    termMonths: int('term_months'), // Term in months

    // Taxes
    capitalGainsTax: decimal('capital_gains_tax', { precision: 5, scale: 2 }).default('25.00'), // Kapitalertragsteuer
    solidaritySurcharge: decimal('solidarity_surcharge', { precision: 5, scale: 2 }).default('5.50'), // Solidaritätszuschlag
    churchTax: decimal('church_tax', { precision: 5, scale: 2 }).default('0.00'), // Kirchensteuer

    // Forderung / Verzug (Kontokorrent-Forderungsmodul)
    refinancingRate: decimal('refinancing_rate', { precision: 5, scale: 2 }), // Negativzinssatz p.a. auf offene Resteinlage; nullable + KEIN Default = noch nicht gesetzt (Guard: computeKontokorrent verweigert ohne Satz)
    riskClassification: varchar('risk_classification', { length: 64 }), // Risikoprofil aus Zeichnungsschein (z.B. "risikobereit"); NICHT zu verwechseln mit dem Onboarding-riskProfile-Modell
    zinsbasis: varchar('zinsbasis', { length: 16 }).default('act/365'), // Tageszählung der Anleihe: 'act/365' (Default) | '30E/360' (§4(6), z.B. Anleihe 60-2023)

    // Kündigung (dokumentiert die KG-Position; reine Anzeige, KEINE Engine-/Zahlungslogik)
    kuendigungEingegangenAm: date('kuendigung_eingegangen_am'),
    kuendigungStatus: varchar('kuendigung_status', { length: 32 }), // null=keine | 'eingereicht' | 'zurueckgewiesen' | 'wirksam'
    naechsterKuendigungstermin: date('naechster_kuendigungstermin'),

    // Status
    status: mysqlEnum('status', ['pending', 'active', 'completed', 'cancelled']).default('pending'),
    importDate: timestamp('import_date').defaultNow(),
    activationDate: timestamp('activation_date'),

    // Metadata
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
  },
  (table) => ({
    contractNumberIdx: uniqueIndex('idx_contract_number').on(table.contractNumber),
    emailIdx: uniqueIndex('idx_email').on(table.email),
    statusIdx: index('idx_status').on(table.status),
    userIdIdx: index('idx_user_id').on(table.userId),
    bondIdIdx: index('idx_bond_id').on(table.bondId),
    statusAndActivationIdx: index('idx_status_activation').on(table.status, table.activationDate),
  })
);

/**
 * Legacy Customer Documents Table
 * Stores documents uploaded for legacy customers
 */
export const legacyCustomerDocuments = mysqlTable(
  'legacy_customer_documents',
  {
    // Primary Key
    id: int('id').primaryKey().autoincrement(),

    // Reference
    legacyCustomerId: int('legacy_customer_id').notNull(),

    // Document Type
    documentType: mysqlEnum('document_type', [
      'contract', // Vertrag/Annahmebestätigung
      'projection', // Hochrechnung
      'interest_calculation', // Zinsberechnung
      'payment_confirmation', // Zahlungsbestätigung
      'tax_certificate', // Steuerbescheinigung
      'bank_statement', // Kontoauszug
      'zeichnungsschein', // Unterschriebener Zeichnungsschein (KYC-relevant)
      'other', // Sonstiges
    ]).notNull(),

    // File Information
    fileName: varchar('file_name', { length: 255 }).notNull(),
    filePath: varchar('file_path', { length: 500 }).notNull(), // S3 path
    fileSize: int('file_size'), // in bytes
    fileType: varchar('file_type', { length: 50 }), // e.g., 'application/pdf'

    // Document Data
    documentDate: date('document_date'), // Date of document
    richtung: varchar('richtung', { length: 16 }), // null | 'eingehend' | 'ausgehend' (Korrespondenz-Richtung)
    description: text('description'),

    // Upload Information
    uploadedBy: int('uploaded_by'), // Admin user
    uploadedAt: timestamp('uploaded_at').defaultNow(),

    // Processing
    isProcessed: boolean('is_processed').default(false),
    extractedData: json('extracted_data'), // Extracted data from document

    // Metadata
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
  },
  (table) => ({
    legacyCustomerIdIdx: index('idx_legacy_customer_id').on(table.legacyCustomerId),
    documentTypeIdx: index('idx_document_type').on(table.documentType),
    uploadedAtIdx: index('idx_uploaded_at').on(table.uploadedAt),
  })
);

/**
 * Legacy Customer Interest Calculations Table
 * Stores calculated interest for legacy customers
 */
export const legacyCustomerInterestCalculations = mysqlTable(
  'legacy_customer_interest_calculations',
  {
    // Primary Key
    id: int('id').primaryKey().autoincrement(),

    // Reference
    legacyCustomerId: int('legacy_customer_id').notNull(),

    // Calculation Period
    calculationYear: int('calculation_year').notNull(),
    calculationMonth: int('calculation_month'), // 1-12, null for annual
    periodStartDate: date('period_start_date').notNull(),
    periodEndDate: date('period_end_date').notNull(),

    // Calculation
    annualInterest: decimal('annual_interest', { precision: 15, scale: 2 }), // Jährliche Zinsen
    monthlyInstallment: decimal('monthly_installment', { precision: 15, scale: 2 }), // Monatliche Rate

    // Taxes
    capitalGainsTaxAmount: decimal('capital_gains_tax_amount', { precision: 15, scale: 2 }),
    solidaritySurchargeAmount: decimal('solidarity_surcharge_amount', { precision: 15, scale: 2 }),
    churchTaxAmount: decimal('church_tax_amount', { precision: 15, scale: 2 }),
    totalTaxWithheld: decimal('total_tax_withheld', { precision: 15, scale: 2 }),

    // Payment
    netInterest: decimal('net_interest', { precision: 15, scale: 2 }), // Nach Steuern
    paymentDate: date('payment_date'), // Fälligkeitsdatum

    // Status
    status: mysqlEnum('status', ['pending', 'paid', 'failed', 'cancelled']).default('pending'),
    paymentConfirmationDate: timestamp('payment_confirmation_date'),

    // Metadata
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
  },
  (table) => ({
    legacyCustomerIdIdx: index('idx_legacy_customer_id').on(table.legacyCustomerId),
    paymentDateIdx: index('idx_payment_date').on(table.paymentDate),
    statusIdx: index('idx_status').on(table.status),
    calculationYearMonthIdx: index('idx_calculation_year_month').on(
      table.calculationYear,
      table.calculationMonth
    ),
  })
);

/**
 * Legacy Customer Payment History Table
 * Stores payment history for legacy customers
 */
export const legacyCustomerPaymentHistory = mysqlTable(
  'legacy_customer_payment_history',
  {
    // Primary Key
    id: int('id').primaryKey().autoincrement(),

    // Reference
    legacyCustomerId: int('legacy_customer_id').notNull(),
    interestCalculationId: int('interest_calculation_id'),

    // Payment Information
    paymentType: mysqlEnum('payment_type', [
      'initial_investment',
      'interest_payment',
      'refund',
      'adjustment',
    ]).notNull(),
    paymentDate: date('payment_date').notNull(),
    amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),

    // Bank Details
    transactionReference: varchar('transaction_reference', { length: 255 }),
    bankTransactionId: varchar('bank_transaction_id', { length: 255 }),

    // Status
    status: mysqlEnum('status', ['pending', 'confirmed', 'failed', 'cancelled']).default('pending'),
    confirmationDate: timestamp('confirmation_date'),

    // Notes
    notes: text('notes'),

    // Metadata
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
  },
  (table) => ({
    legacyCustomerIdIdx: index('idx_legacy_customer_id').on(table.legacyCustomerId),
    paymentDateIdx: index('idx_payment_date').on(table.paymentDate),
    statusIdx: index('idx_status').on(table.status),
    interestCalculationIdIdx: index('idx_interest_calculation_id').on(table.interestCalculationId),
  })
);

/**
 * Legacy Customer Invitations Table
 * Stores invitation tokens for legacy customers to register
 */
export const legacyCustomerInvitations = mysqlTable(
  'legacy_customer_invitations',
  {
    // Primary Key
    id: int('id').primaryKey().autoincrement(),

    // Reference
    legacyCustomerId: int('legacy_customer_id').notNull(),

    // Invitation Token
    token: varchar('token', { length: 255 }).notNull().unique(), // Unique invitation token
    tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(), // Hash of token for security

    // Invitation Details
    email: varchar('email', { length: 255 }).notNull(), // Email to send invitation to
    status: mysqlEnum('status', ['pending', 'accepted', 'expired', 'cancelled']).default('pending'),

    // Timestamps
    sentAt: timestamp('sent_at').defaultNow(),
    expiresAt: timestamp('expires_at').notNull(), // Token expires after 7 days
    acceptedAt: timestamp('accepted_at'), // When invitation was accepted
    usedAt: timestamp('used_at'), // When token was used for registration

    // Metadata
    sentByAdminId: int('sent_by_admin_id'), // Admin who sent the invitation
    resendCount: int('resend_count').default(0), // How many times invitation was resent
    lastResendAt: timestamp('last_resend_at'),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
  },
  (table) => ({
    legacyCustomerIdIdx: index('idx_legacy_customer_id').on(table.legacyCustomerId),
    tokenIdx: uniqueIndex('idx_token').on(table.token),
    tokenHashIdx: uniqueIndex('idx_token_hash').on(table.tokenHash),
    emailIdx: index('idx_email').on(table.email),
    statusIdx: index('idx_status').on(table.status),
    expiresAtIdx: index('idx_expires_at').on(table.expiresAt),
    statusExpiresIdx: index('idx_status_expires').on(table.status, table.expiresAt),
  })
);

/**
 * Relations
 */
export const legacyCustomersRelations = relations(legacyCustomers, ({ one, many }) => ({
  user: one(users, {
    fields: [legacyCustomers.userId],
    references: [users.id],
  }),
  bond: one(bonds, {
    fields: [legacyCustomers.bondId],
    references: [bonds.id],
  }),
  documents: many(legacyCustomerDocuments),
  interestCalculations: many(legacyCustomerInterestCalculations),
  paymentHistory: many(legacyCustomerPaymentHistory),
}));

export const legacyCustomerDocumentsRelations = relations(
  legacyCustomerDocuments,
  ({ one }) => ({
    legacyCustomer: one(legacyCustomers, {
      fields: [legacyCustomerDocuments.legacyCustomerId],
      references: [legacyCustomers.id],
    }),
    uploadedByUser: one(users, {
      fields: [legacyCustomerDocuments.uploadedBy],
      references: [users.id],
    }),
  })
);

export const legacyCustomerInterestCalculationsRelations = relations(
  legacyCustomerInterestCalculations,
  ({ one, many }) => ({
    legacyCustomer: one(legacyCustomers, {
      fields: [legacyCustomerInterestCalculations.legacyCustomerId],
      references: [legacyCustomers.id],
    }),
    paymentHistory: many(legacyCustomerPaymentHistory),
  })
);

export const legacyCustomerPaymentHistoryRelations = relations(
  legacyCustomerPaymentHistory,
  ({ one }) => ({
    legacyCustomer: one(legacyCustomers, {
      fields: [legacyCustomerPaymentHistory.legacyCustomerId],
      references: [legacyCustomers.id],
    }),
    interestCalculation: one(legacyCustomerInterestCalculations, {
      fields: [legacyCustomerPaymentHistory.interestCalculationId],
      references: [legacyCustomerInterestCalculations.id],
    }),
  })
);

export const legacyCustomerInvitationsRelations = relations(
  legacyCustomerInvitations,
  ({ one }) => ({
    legacyCustomer: one(legacyCustomers, {
      fields: [legacyCustomerInvitations.legacyCustomerId],
      references: [legacyCustomers.id],
    }),
    sentByAdmin: one(users, {
      fields: [legacyCustomerInvitations.sentByAdminId],
      references: [users.id],
    }),
  })
);
