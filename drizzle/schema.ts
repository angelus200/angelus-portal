import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, json, date } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extended for Angelus bond investor portal.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  clerkId: varchar("clerkId", { length: 64 }).unique(),
  email: varchar("email", { length: 320 }).unique(),
  loginMethod: varchar("loginMethod", { length: 64 }),

  // Clerk auth fields
  emailVerified: boolean("emailVerified").default(false),
  role: mysqlEnum("role", ["user", "admin", "superadmin"]).default("user").notNull(),
  
  // Personal data
  firstName: varchar("firstName", { length: 128 }),
  lastName: varchar("lastName", { length: 128 }),
  name: text("name"), // Full name (legacy/display)
  dateOfBirth: date("dateOfBirth"),
  taxNumber: varchar("taxNumber", { length: 64 }),
  phone: varchar("phone", { length: 32 }),
  
  // Address
  street: varchar("street", { length: 255 }),
  houseNumber: varchar("houseNumber", { length: 16 }),
  postalCode: varchar("postalCode", { length: 16 }),
  city: varchar("city", { length: 128 }),
  country: varchar("country", { length: 64 }),
  
  // Company data (if isCompany = true)
  isCompany: boolean("isCompany").default(false),
  companyName: varchar("companyName", { length: 255 }),
  companyRegisterNumber: varchar("companyRegisterNumber", { length: 64 }),
  companyTaxNumber: varchar("companyTaxNumber", { length: 64 }),
  companyStreet: varchar("companyStreet", { length: 255 }),
  companyHouseNumber: varchar("companyHouseNumber", { length: 16 }),
  companyPostalCode: varchar("companyPostalCode", { length: 16 }),
  companyCity: varchar("companyCity", { length: 128 }),
  companyCountry: varchar("companyCountry", { length: 64 }),
  
  // Bank details
  bankAccountHolder: varchar("bankAccountHolder", { length: 255 }),
  bankIban: varchar("bankIban", { length: 34 }),
  bankBic: varchar("bankBic", { length: 11 }),
  bankName: varchar("bankName", { length: 128 }),
  
  // Legacy fields (kept for compatibility)
  company: varchar("company", { length: 255 }),
  address: text("address"),
  
  // KYC and compliance
  kycStatus: mysqlEnum("kycStatus", ["pending", "in_progress", "verified", "rejected"]).default("pending").notNull(),
  kycVerifiedAt: timestamp("kycVerifiedAt"),
  kycExternalId: varchar("kycExternalId", { length: 128 }),
  
  // Investor type
  investorType: mysqlEnum("investorType", ["professional", "entrepreneur", "institutional"]),
  isAccredited: boolean("isAccredited").default(false),
  
  // Risk profile
  riskProfileId: int("riskProfileId"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Risk profiles for investors
 */
export const riskProfiles = mysqlTable("risk_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // Risk category based on questionnaire
  category: mysqlEnum("category", ["conservative", "moderate", "risk_seeking"]).notNull(),
  
  // Questionnaire answers stored as JSON
  questionnaireAnswers: json("questionnaireAnswers"),
  
  // Compliance checklists confirmed
  riskWarningConfirmed: boolean("riskWarningConfirmed").default(false),
  professionalInvestorConfirmed: boolean("professionalInvestorConfirmed").default(false),
  selfResponsibilityConfirmed: boolean("selfResponsibilityConfirmed").default(false),
  liquidityWaiverConfirmed: boolean("liquidityWaiverConfirmed").default(false),
  
  // Consent logging
  consentTimestamp: timestamp("consentTimestamp"),
  consentIpAddress: varchar("consentIpAddress", { length: 64 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RiskProfile = typeof riskProfiles.$inferSelect;
export type InsertRiskProfile = typeof riskProfiles.$inferInsert;

/**
 * Bonds / Investment offerings
 */
export const bonds = mysqlTable("bonds", {
  id: int("id").autoincrement().primaryKey(),
  
  // Basic info
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isin: varchar("isin", { length: 32 }),
  
  // Financial terms
  totalVolume: decimal("totalVolume", { precision: 18, scale: 2 }).notNull(),
  availableVolume: decimal("availableVolume", { precision: 18, scale: 2 }).notNull(),
  minSubscription: decimal("minSubscription", { precision: 18, scale: 2 }).default("100000").notNull(),
  interestRate: decimal("interestRate", { precision: 5, scale: 2 }).notNull(),
  termMonths: int("termMonths").notNull(),
  
  // Dates
  issueDate: timestamp("issueDate"),
  maturityDate: timestamp("maturityDate"),
  subscriptionStartDate: timestamp("subscriptionStartDate"),
  subscriptionEndDate: timestamp("subscriptionEndDate"),
  
  // Status
  status: mysqlEnum("status", ["draft", "active", "closed", "matured"]).default("draft").notNull(),
  
  // Risk category
  riskCategory: mysqlEnum("riskCategory", ["low", "medium", "high"]).default("high").notNull(),
  
  // Legal
  governingLaw: varchar("governingLaw", { length: 64 }).default("Swiss").notNull(),
  hasSubordination: boolean("hasSubordination").default(true),
  hasInsolvencyReservation: boolean("hasInsolvencyReservation").default(true),
  

  // Bond identification
  bondNumber: varchar("bondNumber", { length: 64 }).notNull().unique(),
  
  // Termination/Cancellation terms
  cancellationNoticeMonths: int("cancellationNoticeMonths").default(3),
  cancellationNoticeDay: int("cancellationNoticeDay").default(31), // Day of month for notice
  nextCancellationDate: timestamp("nextCancellationDate"),
  
  // Tenure details
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  
  // Additional financial terms
  couponPaymentFrequency: mysqlEnum("couponPaymentFrequency", ["monthly", "quarterly", "semi-annual", "annual"]).default("annual"),
  couponPaymentDates: json("couponPaymentDates"), // Array of dates
  
  // Investor limits
  maxSubscription: decimal("maxSubscription", { precision: 18, scale: 2 }),
  
  // Currency
  currency: varchar("currency", { length: 3 }).default("EUR").notNull(),
  
  // Additional info
  issuer: varchar("issuer", { length: 255 }),
  sector: varchar("sector", { length: 128 }),
  country: varchar("country", { length: 64 }),

  // Documents
  prospectusUrl: text("prospectusUrl"),
  termsUrl: text("termsUrl"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Bond = typeof bonds.$inferSelect;
export type InsertBond = typeof bonds.$inferInsert;

/**
 * Contract templates for bonds
 * Stores versioned contract templates that can be used for multiple bonds
 */
export const contractTemplates = mysqlTable("contract_templates", {
  id: int("id").autoincrement().primaryKey(),
  
  // Template identification
  name: varchar("name", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["subscription_agreement", "risk_disclosure", "terms_conditions", "prospectus", "other"]).notNull(),
  
  // Template content
  content: text("content").notNull(), // HTML or Markdown content
  version: varchar("version", { length: 32 }).default("1.0").notNull(),
  
  // Metadata
  description: text("description"),
  validFrom: timestamp("validFrom").defaultNow().notNull(),
  validUntil: timestamp("validUntil"),
  
  // Status
  isActive: boolean("isActive").default(true).notNull(),
  
  // Audit
  createdBy: int("createdBy").notNull(), // Admin user ID
  updatedBy: int("updatedBy"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ContractTemplate = typeof contractTemplates.$inferSelect;
export type InsertContractTemplate = typeof contractTemplates.$inferInsert;

/**
 * Bond-Template associations
 * Links which contract templates are required for each bond
 */
export const bondContractTemplates = mysqlTable("bond_contract_templates", {
  id: int("id").autoincrement().primaryKey(),
  bondId: int("bondId").notNull(),
  templateId: int("templateId").notNull(),
  
  // Whether this template is required for this bond
  isRequired: boolean("isRequired").default(true).notNull(),
  
  // Order of presentation
  displayOrder: int("displayOrder").default(0).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BondContractTemplate = typeof bondContractTemplates.$inferSelect;
export type InsertBondContractTemplate = typeof bondContractTemplates.$inferInsert;


/**
 * Subscriptions - Links investors to bonds
 */
export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  bondId: int("bondId").notNull(),
  
  // Subscription details
  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 8 }).default("EUR").notNull(),
  
  // Status
  status: mysqlEnum("status", ["pending", "confirmed", "active", "completed", "cancelled"]).default("pending").notNull(),
  
  // Payment tracking
  paymentStatus: mysqlEnum("paymentStatus", ["pending", "processing", "completed", "failed", "refunded"]).default("pending"),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  
  // Consent logging (Swiss law compliance)
  termsAccepted: boolean("termsAccepted").default(false),
  riskWarningAccepted: boolean("riskWarningAccepted").default(false),
  consentTimestamp: timestamp("consentTimestamp"),
  consentIpAddress: varchar("consentIpAddress", { length: 64 }),
  
  // Contract
  contractId: int("contractId"),
  
  // Payment timestamps
  paymentCompletedAt: timestamp("paymentCompletedAt"),
  paymentFailedAt: timestamp("paymentFailedAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

/**
 * Contracts / Documents
 */
export const contracts = mysqlTable("contracts", {
  id: int("id").autoincrement().primaryKey(),
  
  // Document info
  name: varchar("name", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["subscription_agreement", "risk_disclosure", "terms", "prospectus", "other"]).notNull(),
  
  // Storage
  fileUrl: text("fileUrl").notNull(),
  fileKey: varchar("fileKey", { length: 512 }),
  mimeType: varchar("mimeType", { length: 128 }),
  fileSize: int("fileSize"),
  
  // Relations
  bondId: int("bondId"),
  userId: int("userId"),
  
  // Version control
  version: int("version").default(1),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Contract = typeof contracts.$inferSelect;
export type InsertContract = typeof contracts.$inferInsert;

/**
 * Payment schedules for interest and principal repayments
 */
export const paymentSchedules = mysqlTable("payment_schedules", {
  id: int("id").autoincrement().primaryKey(),
  subscriptionId: int("subscriptionId").notNull(),

  // Payment details
  dueDate: timestamp("dueDate").notNull(),
  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 8 }).default("EUR").notNull(),
  type: mysqlEnum("type", ["interest", "principal", "combined"]).notNull(),

  // Status
  status: mysqlEnum("status", ["scheduled", "pending", "paid", "overdue"]).default("scheduled").notNull(),
  paidAt: timestamp("paidAt"),

  // Transaction reference
  transactionId: int("transactionId"),

  // Crypto payment fields
  paymentMethod: varchar("paymentMethod", { length: 32 }),  // "bank_transfer" | "crypto"
  cryptoTxHash: varchar("cryptoTxHash", { length: 128 }),
  cryptoCoin: varchar("cryptoCoin", { length: 16 }),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PaymentSchedule = typeof paymentSchedules.$inferSelect;
export type InsertPaymentSchedule = typeof paymentSchedules.$inferInsert;

/**
 * Company Cold Wallets (for crypto deposits/withdrawals)
 */
export const companyWallets = mysqlTable("company_wallets", {
  id: int("id").autoincrement().primaryKey(),
  coin: varchar("coin", { length: 16 }).notNull(),     // BTC, ETH, USDT, USDC, USDT-TRC20
  network: varchar("network", { length: 64 }).notNull(), // Bitcoin, Ethereum, Tron, etc.
  address: varchar("address", { length: 255 }).notNull(),
  label: varchar("label", { length: 128 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CompanyWallet = typeof companyWallets.$inferSelect;
export type InsertCompanyWallet = typeof companyWallets.$inferInsert;

/**
 * Wallets for investors (Fiat and Crypto)
 */
export const wallets = mysqlTable("wallets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),

  // Currency type
  currency: varchar("currency", { length: 16 }).notNull(), // EUR, BTC, ETH, USDT
  currencyType: mysqlEnum("currencyType", ["fiat", "crypto"]).notNull(),

  // Balance
  balance: decimal("balance", { precision: 24, scale: 8 }).default("0").notNull(),
  availableBalance: decimal("availableBalance", { precision: 24, scale: 8 }).default("0").notNull(),

  // Crypto-specific
  depositAddress: varchar("depositAddress", { length: 128 }),

  // Stripe integration
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  lastDepositAt: timestamp("lastDepositAt"),
  totalDeposited: decimal("totalDeposited", { precision: 24, scale: 8 }).default("0").notNull(),
  totalWithdrawn: decimal("totalWithdrawn", { precision: 24, scale: 8 }).default("0").notNull(),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Wallet = typeof wallets.$inferSelect;
export type InsertWallet = typeof wallets.$inferInsert;

/**
 * Wallet transactions
 */
export const walletTransactions = mysqlTable("wallet_transactions", {
  id: int("id").autoincrement().primaryKey(),
  walletId: int("walletId").notNull(),
  userId: int("userId").notNull(),

  // Transaction details
  type: mysqlEnum("type", ["deposit", "withdrawal", "credit", "debit", "transfer"]).notNull(),
  amount: decimal("amount", { precision: 24, scale: 8 }).notNull(),
  currency: varchar("currency", { length: 16 }).notNull(),

  // Status
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed", "cancelled"]).default("pending").notNull(),

  // External references
  externalTxHash: varchar("externalTxHash", { length: 128 }),
  externalAddress: varchar("externalAddress", { length: 128 }),

  // Bank details for fiat
  bankReference: varchar("bankReference", { length: 128 }),

  // Stripe integration
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  stripeCheckoutSessionId: varchar("stripeCheckoutSessionId", { length: 255 }),

  // Related entities
  relatedSubscriptionId: int("relatedSubscriptionId"),

  // Early withdrawal penalty
  penaltyAmount: decimal("penaltyAmount", { precision: 24, scale: 8 }).default("0").notNull(),

  // Description
  description: text("description"),

  // Admin approval for withdrawals
  approvedBy: int("approvedBy"),
  approvedAt: timestamp("approvedAt"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type InsertWalletTransaction = typeof walletTransactions.$inferInsert;

/**
 * News and announcements
 */
export const news = mysqlTable("news", {
  id: int("id").autoincrement().primaryKey(),
  
  // Content
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  excerpt: text("excerpt"),
  
  // Publishing
  status: mysqlEnum("status", ["draft", "published", "archived"]).default("draft").notNull(),
  publishedAt: timestamp("publishedAt"),
  
  // Author
  authorId: int("authorId").notNull(),
  
  // Targeting
  isPublic: boolean("isPublic").default(false),
  targetInvestorTypes: json("targetInvestorTypes"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type News = typeof news.$inferSelect;
export type InsertNews = typeof news.$inferInsert;

/**
 * Audit log for compliance
 */
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  
  // Actor
  userId: int("userId"),
  userEmail: varchar("userEmail", { length: 320 }),
  
  // Action
  action: varchar("action", { length: 128 }).notNull(),
  entityType: varchar("entityType", { length: 64 }),
  entityId: int("entityId"),
  
  // Details
  details: json("details"),
  ipAddress: varchar("ipAddress", { length: 64 }),
  userAgent: text("userAgent"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

/**
 * Admin notes for investors
 */
export const investorNotes = mysqlTable("investor_notes", {
  id: int("id").autoincrement().primaryKey(),
  investorId: int("investorId").notNull(), // User ID of the investor
  authorId: int("authorId").notNull(), // Admin who created the note
  authorName: varchar("authorName", { length: 255 }),
  
  // Note content
  title: varchar("title", { length: 255 }),
  content: text("content").notNull(),
  
  // Categorization
  category: mysqlEnum("category", ["general", "kyc", "compliance", "payment", "communication", "other"]).default("general"),
  priority: mysqlEnum("priority", ["low", "normal", "high", "urgent"]).default("normal"),
  
  // Status
  isPrivate: boolean("isPrivate").default(true), // Only visible to admins
  isPinned: boolean("isPinned").default(false),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type InvestorNote = typeof investorNotes.$inferSelect;
export type InsertInvestorNote = typeof investorNotes.$inferInsert;


/**
 * Investor Profile Check results (pre-registration)
 * Stores results from the "Bin ich geeignet?" self-assessment
 */
export const profileChecks = mysqlTable("profile_checks", {
  id: int("id").autoincrement().primaryKey(),
  
  // Session tracking (before user registration)
  sessionId: varchar("sessionId", { length: 128 }).notNull(),
  
  // Link to user (after registration)
  userId: int("userId"),
  
  // Profile result
  profileCategory: mysqlEnum("profileCategory", ["conservative", "balanced", "growth", "professional"]).notNull(),
  riskScore: int("riskScore").notNull(),
  
  // All answers stored as JSON
  answers: json("answers").notNull(),
  
  // Renditeerwartungen
  expectedReturn: varchar("expectedReturn", { length: 32 }),
  returnVsSecurity: varchar("returnVsSecurity", { length: 32 }),
  
  // Kapital & Timing
  capitalAvailability: varchar("capitalAvailability", { length: 32 }),
  investmentHorizon: varchar("investmentHorizon", { length: 32 }),
  distributionPreference: varchar("distributionPreference", { length: 32 }),
  liquidityNeed: varchar("liquidityNeed", { length: 32 }),
  
  // Risiko
  lossToleranceMax: varchar("lossToleranceMax", { length: 32 }),
  lossReaction: varchar("lossReaction", { length: 32 }),
  
  // Portfolio & Erfahrung
  currentAssets: json("currentAssets"),
  experienceLevel: varchar("experienceLevel", { length: 32 }),
  plannedVolume: varchar("plannedVolume", { length: 32 }),
  portfolioShare: varchar("portfolioShare", { length: 32 }),
  
  // Zusammenarbeit
  informationNeed: varchar("informationNeed", { length: 32 }),
  decisionProcess: varchar("decisionProcess", { length: 32 }),
  interestedBusinessAreas: json("interestedBusinessAreas"),
  
  // Meta
  completedAt: timestamp("completedAt").defaultNow().notNull(),
  ipAddress: varchar("ipAddress", { length: 64 }),
  userAgent: text("userAgent"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProfileCheck = typeof profileChecks.$inferSelect;
export type InsertProfileCheck = typeof profileChecks.$inferInsert;

/**
 * Consents table for tracking investor approvals/confirmations
 * (not signatures, just acknowledgments via checkbox)
 */
export const consents = mysqlTable("consents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  bondId: int("bondId").notNull(),
  consentType: mysqlEnum("consentType", [
    "risk_disclosure",
    "terms_conditions",
    "subscription_agreement",
    "kyc_confirmation",
    "prospectus_acknowledgment"
  ]).notNull(),
  accepted: boolean("accepted").default(false).notNull(),
  acceptedAt: timestamp("acceptedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").onUpdateNow().notNull(),
});

export type Consent = typeof consents.$inferSelect;
export type InsertConsent = typeof consents.$inferInsert;
/**
 * Consent audit trail for compliance and documentation
 * Tracks every consent action with timestamp, user info, and metadata
 */
export const consentLogs = mysqlTable("consent_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  bondId: int("bondId").notNull(),
  consentType: mysqlEnum("consentType", [
    "risk_disclosure",
    "terms_conditions",
    "subscription_agreement",
    "kyc_confirmation",
    "prospectus_acknowledgment"
  ]).notNull(),
  action: mysqlEnum("action", ["accepted", "rejected", "revoked"]).notNull(),
  
  // Audit information
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  consentVersion: varchar("consentVersion", { length: 16 }),
  
  // Metadata
  metadata: json("metadata"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ConsentLog = typeof consentLogs.$inferSelect;
export type InsertConsentLog = typeof consentLogs.$inferInsert;



/**
 * General Invitations
 * Admin-generated invitation links for new investors (not tied to legacy customers)
 */
export const invitations = mysqlTable("invitations", {
  id: int("id").autoincrement().primaryKey(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  tokenHash: varchar("tokenHash", { length: 64 }).notNull().unique(),
  email: varchar("email", { length: 320 }).notNull(),
  name: varchar("name", { length: 255 }),
  sentByAdminId: int("sentByAdminId").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Invitation = typeof invitations.$inferSelect;
export type InsertInvitation = typeof invitations.$inferInsert;

/**
 * Legacy Contracts (Zeichnungsscheine)
 * Bestandskunden-Verträge die vom Admin erfasst werden
 */
export const legacyContracts = mysqlTable("legacy_contracts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  subscriptionId: int("subscriptionId"),

  signedAmount: decimal("signedAmount", { precision: 24, scale: 8 }).notNull(),
  paidAmount: decimal("paidAmount", { precision: 24, scale: 8 }).notNull().default("0"),
  interestRate: decimal("interestRate", { precision: 8, scale: 4 }).notNull(),
  penaltyRatePerDay: decimal("penaltyRatePerDay", { precision: 8, scale: 6 }).notNull().default("0"),

  startDate: date("startDate").notNull(),
  endDate: date("endDate").notNull(),
  paymentInterval: mysqlEnum("paymentInterval", ["monthly", "quarterly", "yearly", "end_of_term"]).notNull(),

  currency: varchar("currency", { length: 16 }).notNull().default("EUR"),
  status: mysqlEnum("status", ["active", "completed", "cancelled"]).notNull().default("active"),
  notes: text("notes"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LegacyContract = typeof legacyContracts.$inferSelect;
export type InsertLegacyContract = typeof legacyContracts.$inferInsert;

/**
 * Legacy Payments (Einzahlungen)
 */
export const legacyPayments = mysqlTable("legacy_payments", {
  id: int("id").autoincrement().primaryKey(),
  contractId: int("contractId").notNull(),
  userId: int("userId").notNull(),

  amount: decimal("amount", { precision: 24, scale: 8 }).notNull(),
  currency: varchar("currency", { length: 16 }).notNull().default("EUR"),
  paidAt: date("paidAt").notNull(),

  txHash: varchar("txHash", { length: 128 }),
  bankReference: varchar("bankReference", { length: 128 }),
  notes: text("notes"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LegacyPayment = typeof legacyPayments.$inferSelect;
export type InsertLegacyPayment = typeof legacyPayments.$inferInsert;

/**
 * Legacy Interest Payments (Bereits ausgezahlte Zinsen)
 */
export const legacyInterestPayments = mysqlTable("legacy_interest_payments", {
  id: int("id").autoincrement().primaryKey(),
  contractId: int("contractId").notNull(),
  userId: int("userId").notNull(),

  amount: decimal("amount", { precision: 24, scale: 8 }).notNull(),
  currency: varchar("currency", { length: 16 }).notNull().default("EUR"),
  paidAt: date("paidAt").notNull(),

  paymentMethod: mysqlEnum("paymentMethod", ["bank_transfer", "crypto"]).notNull().default("bank_transfer"),
  txHash: varchar("txHash", { length: 128 }),
  notes: text("notes"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LegacyInterestPayment = typeof legacyInterestPayments.$inferSelect;
export type InsertLegacyInterestPayment = typeof legacyInterestPayments.$inferInsert;

/**
 * Documents - File uploads for users and contracts
 */
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  contractId: int("contractId"),
  category: mysqlEnum("category", ["kyc", "contracts", "payments", "general"]).notNull().default("general"),
  filename: varchar("filename", { length: 255 }).notNull(),
  originalName: varchar("originalName", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 128 }).notNull(),
  size: int("size").notNull(),
  filePath: varchar("filePath", { length: 500 }).notNull(),
  uploadedBy: int("uploadedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

// Import legacy customer schema
export * from './legacy-schema';
export * from './interest-schema';
