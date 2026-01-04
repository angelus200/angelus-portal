import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  bonds, InsertBond, Bond,
  subscriptions, InsertSubscription, Subscription,
  contracts, InsertContract, Contract,
  paymentSchedules, InsertPaymentSchedule, PaymentSchedule,
  wallets, InsertWallet, Wallet,
  walletTransactions, InsertWalletTransaction, WalletTransaction,
  news, InsertNews, News,
  riskProfiles, InsertRiskProfile, RiskProfile,
  auditLogs, InsertAuditLog,
  investorNotes, InsertInvestorNote, InvestorNote,
  profileChecks, InsertProfileCheck, ProfileCheck,
  consents, InsertConsent, Consent,
  consentLogs, InsertConsentLog, ConsentLog,
  contractTemplates, InsertContractTemplate, ContractTemplate,
  bondContractTemplates, InsertBondContractTemplate, BondContractTemplate
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ==================== USER FUNCTIONS ====================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "phone", "company", "address", "country"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllInvestors() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).where(eq(users.role, "user")).orderBy(desc(users.createdAt));
}

export async function updateUserKycStatus(userId: number, status: "pending" | "in_progress" | "verified" | "rejected", externalId?: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({
    kycStatus: status,
    kycExternalId: externalId,
    kycVerifiedAt: status === "verified" ? new Date() : undefined
  }).where(eq(users.id, userId));
}

export async function updateUserProfile(userId: number, data: Partial<InsertUser>) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(data).where(eq(users.id, userId));
}

// ==================== BOND FUNCTIONS ====================

export async function createBond(bond: InsertBond) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(bonds).values(bond);
  return result[0].insertId;
}

export async function updateBond(id: number, data: Partial<InsertBond>) {
  const db = await getDb();
  if (!db) return;
  await db.update(bonds).set(data).where(eq(bonds.id, id));
}

export async function getBondById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(bonds).where(eq(bonds.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllBonds() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(bonds).orderBy(desc(bonds.createdAt));
}

export async function getActiveBonds() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(bonds).where(eq(bonds.status, "active")).orderBy(desc(bonds.createdAt));
}

// ==================== SUBSCRIPTION FUNCTIONS ====================

export async function createSubscription(subscription: InsertSubscription) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(subscriptions).values(subscription);
  return result[0].insertId;
}

export async function getSubscriptionsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).orderBy(desc(subscriptions.createdAt));
}

export async function getSubscriptionsByBond(bondId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subscriptions).where(eq(subscriptions.bondId, bondId)).orderBy(desc(subscriptions.createdAt));
}

export async function getAllSubscriptions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subscriptions).orderBy(desc(subscriptions.createdAt));
}

export async function updateSubscriptionStatus(id: number, status: "pending" | "confirmed" | "active" | "completed" | "cancelled") {
  const db = await getDb();
  if (!db) return;
  await db.update(subscriptions).set({ status }).where(eq(subscriptions.id, id));
}

// ==================== CONTRACT FUNCTIONS ====================

export async function createContract(contract: InsertContract) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(contracts).values(contract);
  return result[0].insertId;
}

export async function getAllContracts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contracts).orderBy(desc(contracts.createdAt));
}

export async function getContractsByBond(bondId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contracts).where(eq(contracts.bondId, bondId)).orderBy(desc(contracts.createdAt));
}

export async function getContractsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contracts).where(eq(contracts.userId, userId)).orderBy(desc(contracts.createdAt));
}

// ==================== PAYMENT SCHEDULE FUNCTIONS ====================

export async function createPaymentSchedule(schedule: InsertPaymentSchedule) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(paymentSchedules).values(schedule);
  return result[0].insertId;
}

export async function getPaymentSchedulesBySubscription(subscriptionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(paymentSchedules).where(eq(paymentSchedules.subscriptionId, subscriptionId)).orderBy(paymentSchedules.dueDate);
}

export async function getUpcomingPayments(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const userSubscriptions = await getSubscriptionsByUser(userId);
  const subscriptionIds = userSubscriptions.map(s => s.id);
  
  if (subscriptionIds.length === 0) return [];
  
  const now = new Date();
  const results = [];
  
  for (const subId of subscriptionIds) {
    const payments = await db.select()
      .from(paymentSchedules)
      .where(and(
        eq(paymentSchedules.subscriptionId, subId),
        gte(paymentSchedules.dueDate, now),
        eq(paymentSchedules.status, "scheduled")
      ))
      .orderBy(paymentSchedules.dueDate);
    results.push(...payments);
  }
  
  return results.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
}

export async function markPaymentAsPaid(id: number, transactionId?: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(paymentSchedules).set({
    status: "paid",
    paidAt: new Date(),
    transactionId
  }).where(eq(paymentSchedules.id, id));
}

// ==================== WALLET FUNCTIONS ====================

export async function createWallet(wallet: InsertWallet) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(wallets).values(wallet);
  return result[0].insertId;
}

export async function getWalletsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(wallets).where(eq(wallets.userId, userId));
}

export async function getOrCreateWallet(userId: number, currency: string, currencyType: "fiat" | "crypto") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await db.select().from(wallets)
    .where(and(eq(wallets.userId, userId), eq(wallets.currency, currency)))
    .limit(1);
  
  if (existing.length > 0) return existing[0];
  
  const id = await createWallet({ userId, currency, currencyType });
  return { id, userId, currency, currencyType, balance: "0", availableBalance: "0" };
}

export async function updateWalletBalance(walletId: number, balance: string, availableBalance: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(wallets).set({ balance, availableBalance }).where(eq(wallets.id, walletId));
}

// ==================== WALLET TRANSACTION FUNCTIONS ====================

export async function createWalletTransaction(transaction: InsertWalletTransaction) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(walletTransactions).values(transaction);
  return result[0].insertId;
}

export async function getTransactionsByWallet(walletId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(walletTransactions).where(eq(walletTransactions.walletId, walletId)).orderBy(desc(walletTransactions.createdAt));
}

export async function getTransactionsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(walletTransactions).where(eq(walletTransactions.userId, userId)).orderBy(desc(walletTransactions.createdAt));
}

export async function getPendingWithdrawals() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(walletTransactions)
    .where(and(eq(walletTransactions.type, "withdrawal"), eq(walletTransactions.status, "pending")))
    .orderBy(walletTransactions.createdAt);
}

export async function approveWithdrawal(id: number, adminId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(walletTransactions).set({
    status: "processing",
    approvedBy: adminId,
    approvedAt: new Date()
  }).where(eq(walletTransactions.id, id));
}

// ==================== NEWS FUNCTIONS ====================

export async function createNews(newsItem: InsertNews) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(news).values(newsItem);
  return result[0].insertId;
}

export async function updateNews(id: number, data: Partial<InsertNews>) {
  const db = await getDb();
  if (!db) return;
  await db.update(news).set(data).where(eq(news.id, id));
}

export async function getPublishedNews() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(news).where(eq(news.status, "published")).orderBy(desc(news.publishedAt));
}

export async function getAllNews() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(news).orderBy(desc(news.createdAt));
}

// ==================== RISK PROFILE FUNCTIONS ====================

export async function createRiskProfile(profile: InsertRiskProfile) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(riskProfiles).values(profile);
  return result[0].insertId;
}

export async function getRiskProfileByUser(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(riskProfiles).where(eq(riskProfiles.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateRiskProfile(id: number, data: Partial<InsertRiskProfile>) {
  const db = await getDb();
  if (!db) return;
  await db.update(riskProfiles).set(data).where(eq(riskProfiles.id, id));
}

// ==================== AUDIT LOG FUNCTIONS ====================

export async function createAuditLog(log: InsertAuditLog) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLogs).values(log);
}

export async function getAuditLogs(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
}

// ==================== STATISTICS FUNCTIONS ====================

export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return { totalInvestors: 0, totalBonds: 0, totalSubscriptions: 0, pendingKyc: 0 };
  
  const [investorCount] = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, "user"));
  const [bondCount] = await db.select({ count: sql<number>`count(*)` }).from(bonds);
  const [subscriptionCount] = await db.select({ count: sql<number>`count(*)` }).from(subscriptions);
  const [pendingKycCount] = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.kycStatus, "pending"));
  
  return {
    totalInvestors: investorCount?.count || 0,
    totalBonds: bondCount?.count || 0,
    totalSubscriptions: subscriptionCount?.count || 0,
    pendingKyc: pendingKycCount?.count || 0
  };
}

// ==================== EMAIL/PASSWORD AUTH FUNCTIONS ====================

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createUserWithPassword(userData: {
  email: string;
  passwordHash: string;
  name?: string;
  emailVerificationToken?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Generate a unique openId for email users
  const openId = `email_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  const result = await db.insert(users).values({
    openId,
    email: userData.email,
    passwordHash: userData.passwordHash,
    name: userData.name,
    loginMethod: "email",
    emailVerified: false,
    emailVerificationToken: userData.emailVerificationToken,
    role: "user",
    lastSignedIn: new Date(),
  });
  
  return result[0].insertId;
}

export async function verifyUserEmail(token: string) {
  const db = await getDb();
  if (!db) return false;
  
  const result = await db.select().from(users)
    .where(eq(users.emailVerificationToken, token))
    .limit(1);
  
  if (result.length === 0) return false;
  
  await db.update(users).set({
    emailVerified: true,
    emailVerificationToken: null,
  }).where(eq(users.id, result[0].id));
  
  return true;
}

export async function setPasswordResetToken(email: string, token: string, expires: Date) {
  const db = await getDb();
  if (!db) return false;
  
  const result = await db.update(users).set({
    passwordResetToken: token,
    passwordResetExpires: expires,
  }).where(eq(users.email, email));
  
  return true;
}

export async function resetPassword(token: string, newPasswordHash: string) {
  const db = await getDb();
  if (!db) return false;
  
  const now = new Date();
  const result = await db.select().from(users)
    .where(and(
      eq(users.passwordResetToken, token),
      gte(users.passwordResetExpires, now)
    ))
    .limit(1);
  
  if (result.length === 0) return false;
  
  await db.update(users).set({
    passwordHash: newPasswordHash,
    passwordResetToken: null,
    passwordResetExpires: null,
  }).where(eq(users.id, result[0].id));
  
  return true;
}

export async function updateLastSignedIn(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, userId));
}

// ==================== INVESTOR DETAIL FUNCTIONS ====================

export async function getAuditLogsByUser(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditLogs)
    .where(eq(auditLogs.entityId, userId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}

export async function updateInvestor(id: number, data: Partial<{
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  taxNumber: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  country: string;
  isCompany: boolean;
  companyName: string;
  companyRegisterNumber: string;
  companyTaxNumber: string;
  companyStreet: string;
  companyHouseNumber: string;
  companyPostalCode: string;
  companyCity: string;
  companyCountry: string;
  bankAccountHolder: string;
  bankIban: string;
  bankBic: string;
  bankName: string;
  investorType: "professional" | "entrepreneur" | "institutional";
}>) {
  const db = await getDb();
  if (!db) return;
  
  const updateData: Record<string, any> = {};
  
  // Map all fields
  if (data.firstName !== undefined) updateData.firstName = data.firstName;
  if (data.lastName !== undefined) updateData.lastName = data.lastName;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.dateOfBirth !== undefined) updateData.dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth) : null;
  if (data.taxNumber !== undefined) updateData.taxNumber = data.taxNumber;
  if (data.street !== undefined) updateData.street = data.street;
  if (data.houseNumber !== undefined) updateData.houseNumber = data.houseNumber;
  if (data.postalCode !== undefined) updateData.postalCode = data.postalCode;
  if (data.city !== undefined) updateData.city = data.city;
  if (data.country !== undefined) updateData.country = data.country;
  if (data.isCompany !== undefined) updateData.isCompany = data.isCompany;
  if (data.companyName !== undefined) updateData.companyName = data.companyName;
  if (data.companyRegisterNumber !== undefined) updateData.companyRegisterNumber = data.companyRegisterNumber;
  if (data.companyTaxNumber !== undefined) updateData.companyTaxNumber = data.companyTaxNumber;
  if (data.companyStreet !== undefined) updateData.companyStreet = data.companyStreet;
  if (data.companyHouseNumber !== undefined) updateData.companyHouseNumber = data.companyHouseNumber;
  if (data.companyPostalCode !== undefined) updateData.companyPostalCode = data.companyPostalCode;
  if (data.companyCity !== undefined) updateData.companyCity = data.companyCity;
  if (data.companyCountry !== undefined) updateData.companyCountry = data.companyCountry;
  if (data.bankAccountHolder !== undefined) updateData.bankAccountHolder = data.bankAccountHolder;
  if (data.bankIban !== undefined) updateData.bankIban = data.bankIban;
  if (data.bankBic !== undefined) updateData.bankBic = data.bankBic;
  if (data.bankName !== undefined) updateData.bankName = data.bankName;
  if (data.investorType !== undefined) updateData.investorType = data.investorType;
  
  if (Object.keys(updateData).length > 0) {
    await db.update(users).set(updateData).where(eq(users.id, id));
  }
}

// ==================== INVESTOR NOTES FUNCTIONS ====================

export async function getInvestorNotes(investorId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(investorNotes)
    .where(eq(investorNotes.investorId, investorId))
    .orderBy(desc(investorNotes.isPinned), desc(investorNotes.createdAt));
}

export async function createInvestorNote(note: InsertInvestorNote) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(investorNotes).values(note);
  return result[0].insertId;
}

export async function updateInvestorNote(id: number, data: Partial<{
  title: string;
  content: string;
  category: "general" | "kyc" | "compliance" | "payment" | "communication" | "other";
  priority: "low" | "normal" | "high" | "urgent";
  isPinned: boolean;
}>) {
  const db = await getDb();
  if (!db) return;
  await db.update(investorNotes).set(data).where(eq(investorNotes.id, id));
}

export async function deleteInvestorNote(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(investorNotes).where(eq(investorNotes.id, id));
}

export async function getInvestorNoteById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(investorNotes).where(eq(investorNotes.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}


// ==================== PROFILE CHECK FUNCTIONS ====================

export async function createProfileCheck(data: InsertProfileCheck) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(profileChecks).values(data);
  return result[0].insertId;
}

export async function getProfileCheckBySessionId(sessionId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(profileChecks)
    .where(eq(profileChecks.sessionId, sessionId))
    .orderBy(desc(profileChecks.createdAt))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getProfileChecksByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(profileChecks)
    .where(eq(profileChecks.userId, userId))
    .orderBy(desc(profileChecks.createdAt));
}

export async function linkProfileCheckToUser(sessionId: string, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(profileChecks)
    .set({ userId })
    .where(eq(profileChecks.sessionId, sessionId));
}

export async function getAllProfileChecks() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(profileChecks).orderBy(desc(profileChecks.createdAt));
}

export async function getProfileCheckById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(profileChecks).where(eq(profileChecks.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getProfileCheckByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(profileChecks).where(eq(profileChecks.userId, userId)).orderBy(desc(profileChecks.createdAt)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}


// ==================== CONSENT FUNCTIONS ====================

export async function createConsent(data: InsertConsent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(consents).values(data);
  return result[0].insertId;
}

export async function getConsentsByUserAndBond(userId: number, bondId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(consents)
    .where(and(eq(consents.userId, userId), eq(consents.bondId, bondId)));
}

export async function updateConsent(id: number, data: Partial<InsertConsent>) {
  const db = await getDb();
  if (!db) return;
  await db.update(consents).set(data).where(eq(consents.id, id));
}

export async function getConsentByUserBondAndType(userId: number, bondId: number, consentType: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(consents)
    .where(and(
      eq(consents.userId, userId),
      eq(consents.bondId, bondId),
      eq(consents.consentType, consentType as any)
    ))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getConsentsByBond(bondId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(consents)
    .where(eq(consents.bondId, bondId))
    .orderBy(desc(consents.createdAt));
}

export async function getConsentsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(consents)
    .where(eq(consents.userId, userId))
    .orderBy(desc(consents.createdAt));
}


// Admin Helper Functions
export async function getAllUsers() {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  return database.query.users.findMany();
}

export async function getAdminStats() {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  const totalUsers = await database.query.users.findMany();
  const totalBonds = await database.query.bonds.findMany();
  const totalSubscriptions = await database.query.subscriptions.findMany();
  
  return {
    totalInvestors: totalUsers.length,
    totalBonds: totalBonds.length,
    totalSubscriptions: totalSubscriptions.length,
    pendingKyc: totalUsers.filter((u: any) => u.kycStatus === 'pending').length,
  };
}


// ==================== CONTRACT TEMPLATE FUNCTIONS ====================

export async function createContractTemplate(data: InsertContractTemplate) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const result = await database.insert(contractTemplates).values(data);
  // Return the inserted ID (MySQL returns insertId)
  return (result as any).insertId || result;
}

export async function getContractTemplate(id: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  return database.query.contractTemplates.findFirst({
    where: (templates: any, { eq }: any) => eq(templates.id, id),
  });
}

export async function getAllContractTemplates() {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  return database.query.contractTemplates.findMany({
    where: (templates: any, { eq }: any) => eq(templates.isActive, true),
    orderBy: (templates: any, { desc }: any) => [desc(templates.createdAt)],
  });
}

export async function updateContractTemplate(id: number, data: Partial<InsertContractTemplate>) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  return database.update(contractTemplates)
    .set({ ...data, updatedAt: new Date() })
    .where((t: any, { eq }: any) => eq(t.id, id));
}

export async function deleteContractTemplate(id: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  return database.delete(contractTemplates)
    .where((t: any, { eq }: any) => eq(t.id, id));
}

// Bond-Template associations
export async function linkTemplateToBond(bondId: number, templateId: number, isRequired: boolean = true, displayOrder: number = 0) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  return database.insert(bondContractTemplates).values({
    bondId,
    templateId,
    isRequired,
    displayOrder,
  });
}

export async function getTemplatesForBond(bondId: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const { eq } = require('drizzle-orm');
  return database.select().from(bondContractTemplates)
    .where(eq(bondContractTemplates.bondId, bondId))
    .orderBy(bondContractTemplates.displayOrder);
}

export async function removeTemplateFromBond(bondId: number, templateId: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const { and, eq } = require('drizzle-orm');
  return database.delete(bondContractTemplates)
    .where(and(
      eq(bondContractTemplates.bondId, bondId),
      eq(bondContractTemplates.templateId, templateId)
    ) as any);
}

// Consent Log Helpers
export async function createConsentLog(data: {
  userId: number;
  bondId: number;
  consentType: string;
  action: string;
  ipAddress?: string;
  userAgent?: string;
  consentVersion?: string;
  metadata: any;
}) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const result = await database.insert(consentLogs).values({
    userId: data.userId,
    bondId: data.bondId,
    consentType: data.consentType as any,
    action: data.action as any,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    consentVersion: data.consentVersion,
    metadata: data.metadata,
  });
  return result;
}

export async function getConsentLogsByBond(bondId: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const { eq, desc } = require('drizzle-orm');
  return database.select().from(consentLogs)
    .where(eq(consentLogs.bondId, bondId))
    .orderBy(desc(consentLogs.createdAt));
}

export async function getConsentLogsByUser(userId: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const { eq, desc } = require('drizzle-orm');
  return database.select().from(consentLogs)
    .where(eq(consentLogs.userId, userId))
    .orderBy(desc(consentLogs.createdAt));
}

export async function getAllConsentLogs() {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const { desc } = require('drizzle-orm');
  return database.select().from(consentLogs)
    .orderBy(desc(consentLogs.createdAt));
}
