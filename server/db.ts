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
  auditLogs, InsertAuditLog
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
