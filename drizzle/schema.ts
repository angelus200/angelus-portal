import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, json, date } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extended for Angelus bond investor portal.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).unique(),
  email: varchar("email", { length: 320 }).unique(),
  loginMethod: varchar("loginMethod", { length: 64 }),
  
  // Password auth fields
  passwordHash: varchar("passwordHash", { length: 255 }),
  emailVerified: boolean("emailVerified").default(false),
  emailVerificationToken: varchar("emailVerificationToken", { length: 128 }),
  passwordResetToken: varchar("passwordResetToken", { length: 128 }),
  passwordResetExpires: timestamp("passwordResetExpires"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  
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
  
  // Documents
  prospectusUrl: text("prospectusUrl"),
  termsUrl: text("termsUrl"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Bond = typeof bonds.$inferSelect;
export type InsertBond = typeof bonds.$inferInsert;

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
  
  // Consent logging (Swiss law compliance)
  termsAccepted: boolean("termsAccepted").default(false),
  riskWarningAccepted: boolean("riskWarningAccepted").default(false),
  consentTimestamp: timestamp("consentTimestamp"),
  consentIpAddress: varchar("consentIpAddress", { length: 64 }),
  
  // Contract
  contractId: int("contractId"),
  
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
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PaymentSchedule = typeof paymentSchedules.$inferSelect;
export type InsertPaymentSchedule = typeof paymentSchedules.$inferInsert;

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
