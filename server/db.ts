import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from 'mysql2/promise';
import {
  InsertUser, User, users,
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
  bondContractTemplates, InsertBondContractTemplate, BondContractTemplate,
  companyWallets, InsertCompanyWallet, CompanyWallet,
  legacyContracts, InsertLegacyContract, LegacyContract,
  legacyPayments, InsertLegacyPayment, LegacyPayment,
  legacyInterestPayments, InsertLegacyInterestPayment, LegacyInterestPayment,
  documents, InsertDocument,
  issuers,
  userIssuerAccess,
  invitations,
  leads, InsertLead,
} from "../drizzle/schema";
import {
  legacyCustomers,
  legacyCustomerDocuments,
  legacyCustomerInterestCalculations,
  legacyCustomerPaymentHistory,
} from "../drizzle/legacy-schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: mysql.Pool | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      console.log('[DB] Creating mysql2 connection pool');
      _pool = mysql.createPool({
        uri: process.env.DATABASE_URL,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _db = drizzle(_pool) as any;
      console.log('[DB] Drizzle initialized with connection pool');
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
      _pool = null;
    }
  }
  return _db;
}

// ==================== USER FUNCTIONS ====================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.clerkId) {
    throw new Error("User clerkId is required for upsert");
  }

  console.log('[DB] upsertUser called with:', {
    clerkId: user.clerkId,
    email: user.email,
    name: user.name
  });

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      clerkId: user.clerkId,
    };
    const updateSet: Record<string, unknown> = {
      // CRITICAL: Must update clerkId on duplicate key (e.g., email match)
      clerkId: user.clerkId,
    };

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
    }

    if (user.emailVerified !== undefined) {
      values.emailVerified = user.emailVerified;
      updateSet.emailVerified = user.emailVerified;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    // Always update lastSignedIn on duplicate
    if (!updateSet.lastSignedIn) {
      updateSet.lastSignedIn = new Date();
    }

    console.log('[DB] Executing upsert with values:', {
      clerkId: values.clerkId,
      email: values.email,
      name: values.name,
      hasUpdateSet: Object.keys(updateSet).length > 0
    });

    const result = await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });

    console.log('[DB] Upsert result:', {
      affectedRows: result?.[0]?.affectedRows,
      insertId: result?.[0]?.insertId
    });

    // Neuer User (affectedRows===1 = INSERT, 2 = UPDATE) → Einladungs-Auto-Freischaltung.
    // Best-effort: darf den Login niemals brechen.
    if (result?.[0]?.affectedRows === 1 && values.email) {
      try {
        await autoGrantInvitationAccess(values.email);
      } catch (e) {
        console.error('[DB] autoGrantInvitationAccess failed (non-fatal):', e);
      }
    }
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByClerkId(clerkId: string): Promise<User | undefined> {
  console.log('[DB] getUserByClerkId called with:', clerkId);

  const db = await getDb();
  if (!db) {
    console.log('[DB] getUserByClerkId: DB not available');
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);

  console.log('[DB] getUserByClerkId result:', {
    found: result.length > 0,
    userId: result[0]?.id,
    email: result[0]?.email,
    clerkIdFromDb: result[0]?.clerkId
  });

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

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function getAdminUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).where(eq(users.role, "admin")).orderBy(desc(users.createdAt));
}

export async function createUser(data: Omit<InsertUser, 'createdAt' | 'updatedAt'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(users).values({
    email: data.email,
    name: data.name,
    role: data.role || "user",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return result[0].insertId;
}

export async function updateUserRole(userId: number, role: "admin" | "user") {
  const db = await getDb();
  if (!db) return undefined;
  await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, userId));
  return getUserById(userId);
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

// ==================== ISSUER (EMITTENTEN) FUNCTIONS ====================

export async function getActiveIssuers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(issuers).where(eq(issuers.active, true));
}

export async function getAllIssuers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(issuers);
}

export async function getIssuerByKey(issuerKey: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(issuers).where(eq(issuers.issuerKey, issuerKey)).limit(1);
  return rows[0] ?? null;
}

export async function createIssuer(data: {
  issuerKey: string; name: string; shortName?: string; country?: string;
  logoUrl?: string; badgeColor?: string; language?: string; active?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.insert(issuers).values(data);
}

export async function updateIssuer(id: number, data: Partial<{
  name: string; shortName: string; country: string;
  logoUrl: string; badgeColor: string; language: string; active: boolean;
}>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.update(issuers).set(data).where(eq(issuers.id, id));
}

// ==================== USER-ISSUER-ACCESS (Freischaltung je Emittent) ====================

export async function getUserIssuerAccess(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(userIssuerAccess).where(eq(userIssuerAccess.userId, userId));
}

export async function hasIssuerAccess(userId: number, issuerKey: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db.select().from(userIssuerAccess)
    .where(and(
      eq(userIssuerAccess.userId, userId),
      eq(userIssuerAccess.issuerKey, issuerKey),
      eq(userIssuerAccess.status, 'approved'),
    )).limit(1);
  return rows.length > 0;
}

export async function requestIssuerAccess(userId: number, issuerKey: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  // Existiert schon ein Eintrag (egal welcher Status) → Status NICHT überschreiben, nur touchen
  await db.insert(userIssuerAccess)
    .values({ userId, issuerKey, status: 'requested' })
    .onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });
}

export async function decideIssuerAccess(
  userId: number, issuerKey: string,
  status: 'approved' | 'blocked', adminId: number, note?: string
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.insert(userIssuerAccess)
    .values({ userId, issuerKey, status, decidedAt: new Date(), decidedByAdminId: adminId, note })
    .onDuplicateKeyUpdate({
      set: { status, decidedAt: new Date(), decidedByAdminId: adminId, note },
    });
}

export async function getPendingAccessRequests() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: userIssuerAccess.id,
    userId: userIssuerAccess.userId,
    issuerKey: userIssuerAccess.issuerKey,
    status: userIssuerAccess.status,
    requestedAt: userIssuerAccess.requestedAt,
    userName: users.name,
    userEmail: users.email,
  }).from(userIssuerAccess)
    .innerJoin(users, eq(userIssuerAccess.userId, users.id))
    .where(eq(userIssuerAccess.status, 'requested'))
    .orderBy(desc(userIssuerAccess.requestedAt));
}

// Sprache
export async function updateUserLanguage(userId: number, language: 'de' | 'en') {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.update(users).set({ language }).where(eq(users.id, userId));
}

// ==================== LEADS (Landingpage) ====================

export async function createLead(data: Omit<InsertLead, 'id' | 'createdAt' | 'updatedAt' | 'status'>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.insert(leads).values(data);
}

export async function getLeads() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(leads).orderBy(desc(leads.createdAt));
}

export async function updateLeadStatus(
  id: number,
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'discarded'
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.update(leads).set({ status }).where(eq(leads.id, id));
}

/**
 * Auto-Freischaltung beim ersten Anlegen eines Users:
 * Matcht offene/angenommene Einladung per E-Mail und schaltet den Emittenten
 * der Einladung frei (approved) — nur wenn noch KEIN Access-Eintrag existiert
 * (überschreibt also nie eine Admin-Entscheidung). Setzt zugleich die Sprache
 * aus dem Emittenten. Best-effort: Fehler werden geschluckt (Login darf nie brechen).
 */
export async function autoGrantInvitationAccess(email: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const user = await getUserByEmail(email);
  if (!user) return;

  const invRows = await db.select().from(invitations)
    .where(eq(invitations.email, email))
    .orderBy(desc(invitations.createdAt))
    .limit(1);
  const inv = invRows[0];
  if (!inv) return;
  const issuerKey = inv.issuerKey || 'angelus';

  const existing = await db.select().from(userIssuerAccess)
    .where(and(
      eq(userIssuerAccess.userId, user.id),
      eq(userIssuerAccess.issuerKey, issuerKey),
    )).limit(1);
  if (existing.length > 0) return;

  await db.insert(userIssuerAccess).values({
    userId: user.id,
    issuerKey,
    status: 'approved',
    decidedAt: new Date(),
    decidedByAdminId: inv.sentByAdminId,
    note: 'Auto-Freischaltung über Einladung',
  });

  // Sprache aus dem Emittenten übernehmen (de für KG, en für Auslandsfirmen)
  const issuer = await getIssuerByKey(issuerKey);
  if (issuer?.language) {
    await db.update(users).set({ language: issuer.language }).where(eq(users.id, user.id));
  }
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

export async function updateSubscriptionPaymentStatus(
  id: number,
  paymentStatus: "pending" | "processing" | "completed" | "failed" | "refunded",
  stripePaymentIntentId?: string,
  stripeCustomerId?: string
) {
  const db = await getDb();
  if (!db) return;
  const updates: any = { paymentStatus };
  if (stripePaymentIntentId) updates.stripePaymentIntentId = stripePaymentIntentId;
  if (stripeCustomerId) updates.stripeCustomerId = stripeCustomerId;
  if (paymentStatus === "completed") updates.paymentCompletedAt = new Date();
  if (paymentStatus === "failed") updates.paymentFailedAt = new Date();
  await db.update(subscriptions).set(updates).where(eq(subscriptions.id, id));
}

export async function getSubscriptionByStripePaymentIntentId(stripePaymentIntentId: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripePaymentIntentId, stripePaymentIntentId))
    .limit(1);
  return result[0] || null;
}

export async function getSubscriptionsByPaymentStatus(
  paymentStatus: "pending" | "processing" | "completed" | "failed" | "refunded"
) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.paymentStatus, paymentStatus))
    .orderBy(desc(subscriptions.createdAt));
}

export async function getInvestorPayments(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .orderBy(desc(subscriptions.paymentCompletedAt));
}

export async function getSubscriptionWithPayment(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, id))
    .limit(1);
  return result[0] || null;
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

export async function getWalletById(walletId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(wallets).where(eq(wallets.id, walletId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateWalletStripeCustomer(walletId: number, stripeCustomerId: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(wallets).set({ stripeCustomerId }).where(eq(wallets.id, walletId));
}

export async function creditWalletBalance(
  walletId: number,
  amount: string,
  transactionId: number,
  stripePaymentIntentId: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Use transaction for atomic update
  await db.transaction(async (tx) => {
    // Get current wallet balance
    const wallet = await tx.select().from(wallets).where(eq(wallets.id, walletId)).limit(1);
    if (wallet.length === 0) throw new Error(`Wallet ${walletId} not found`);

    const currentBalance = parseFloat(wallet[0].balance);
    const currentAvailable = parseFloat(wallet[0].availableBalance);
    const currentDeposited = parseFloat(wallet[0].totalDeposited);
    const amountNum = parseFloat(amount);

    const newBalance = (currentBalance + amountNum).toFixed(8);
    const newAvailable = (currentAvailable + amountNum).toFixed(8);
    const newDeposited = (currentDeposited + amountNum).toFixed(8);

    // Update wallet balance
    await tx.update(wallets).set({
      balance: newBalance,
      availableBalance: newAvailable,
      totalDeposited: newDeposited,
      lastDepositAt: new Date(),
    }).where(eq(wallets.id, walletId));

    // Update transaction status
    await tx.update(walletTransactions).set({
      status: "completed",
      stripePaymentIntentId,
    }).where(eq(walletTransactions.id, transactionId));
  });
}

export async function debitWalletBalance(walletId: number, amount: string, transactionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Use transaction for atomic update
  await db.transaction(async (tx) => {
    // Get current wallet balance with row lock
    const wallet = await tx.select().from(wallets).where(eq(wallets.id, walletId)).limit(1);
    if (wallet.length === 0) throw new Error(`Wallet ${walletId} not found`);

    const currentBalance = parseFloat(wallet[0].balance);
    const currentAvailable = parseFloat(wallet[0].availableBalance);
    const amountNum = parseFloat(amount);

    if (currentAvailable < amountNum) {
      throw new Error("Insufficient available balance");
    }

    const newBalance = (currentBalance - amountNum).toFixed(8);
    const newAvailable = (currentAvailable - amountNum).toFixed(8);

    // Update wallet balance
    await tx.update(wallets).set({
      balance: newBalance,
      availableBalance: newAvailable,
    }).where(eq(wallets.id, walletId));

    // Update transaction status
    await tx.update(walletTransactions).set({
      status: "completed",
    }).where(eq(walletTransactions.id, transactionId));
  });
}

export async function reserveWalletBalance(walletId: number, amount: string, subscriptionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Phase 2: Reserve balance for pending approval
  // Only reduces availableBalance, not total balance
  await db.transaction(async (tx) => {
    const wallet = await tx.select().from(wallets).where(eq(wallets.id, walletId)).limit(1);
    if (wallet.length === 0) throw new Error(`Wallet ${walletId} not found`);

    const currentAvailable = parseFloat(wallet[0].availableBalance);
    const amountNum = parseFloat(amount);

    if (currentAvailable < amountNum) {
      throw new Error("Insufficient available balance to reserve");
    }

    const newAvailable = (currentAvailable - amountNum).toFixed(8);

    await tx.update(wallets).set({
      availableBalance: newAvailable,
    }).where(eq(wallets.id, walletId));
  });
}

export async function confirmReservedWalletBalance(walletId: number, amount: string, transactionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Phase 2: Confirm reservation and actually debit balance
  await db.transaction(async (tx) => {
    const wallet = await tx.select().from(wallets).where(eq(wallets.id, walletId)).limit(1);
    if (wallet.length === 0) throw new Error(`Wallet ${walletId} not found`);

    const currentBalance = parseFloat(wallet[0].balance);
    const amountNum = parseFloat(amount);
    const newBalance = (currentBalance - amountNum).toFixed(8);

    await tx.update(wallets).set({
      balance: newBalance,
    }).where(eq(wallets.id, walletId));

    await tx.update(walletTransactions).set({
      status: "completed",
    }).where(eq(walletTransactions.id, transactionId));
  });
}

export async function releaseReservedWalletBalance(walletId: number, amount: string, subscriptionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Phase 2: Release reservation and restore availableBalance
  await db.transaction(async (tx) => {
    const wallet = await tx.select().from(wallets).where(eq(wallets.id, walletId)).limit(1);
    if (wallet.length === 0) throw new Error(`Wallet ${walletId} not found`);

    const currentAvailable = parseFloat(wallet[0].availableBalance);
    const amountNum = parseFloat(amount);
    const newAvailable = (currentAvailable + amountNum).toFixed(8);

    await tx.update(wallets).set({
      availableBalance: newAvailable,
    }).where(eq(wallets.id, walletId));
  });
}

// ==================== WALLET TRANSACTION FUNCTIONS ====================

export async function createWalletTransaction(transaction: InsertWalletTransaction) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(walletTransactions).values(transaction);
  return result[0].insertId;
}

export async function updateWalletTransactionStripeIds(
  transactionId: number,
  ids: { stripeCheckoutSessionId?: string; stripePaymentIntentId?: string }
) {
  const db = await getDb();
  if (!db) return;
  await db.update(walletTransactions).set(ids).where(eq(walletTransactions.id, transactionId));
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
  return db.select({
    id: walletTransactions.id,
    walletId: walletTransactions.walletId,
    userId: walletTransactions.userId,
    type: walletTransactions.type,
    amount: walletTransactions.amount,
    currency: walletTransactions.currency,
    status: walletTransactions.status,
    penaltyAmount: walletTransactions.penaltyAmount,
    externalAddress: walletTransactions.externalAddress,
    bankReference: walletTransactions.bankReference,
    description: walletTransactions.description,
    createdAt: walletTransactions.createdAt,
  }).from(walletTransactions)
    .where(and(eq(walletTransactions.type, "withdrawal"), eq(walletTransactions.status, "pending")))
    .orderBy(walletTransactions.createdAt);
}

export async function requestWithdrawalWithPenalty(
  walletId: number,
  userId: number,
  amount: string,
  currency: string,
  externalAddress?: string,
  bankReference?: string
): Promise<{ transactionId: number; penalty: string; netAmount: string }> {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database not available");

  const PENALTY_RATE = 0.20;
  const amountNum = parseFloat(amount);
  if (isNaN(amountNum) || amountNum <= 0) throw new Error("Ungültiger Betrag");

  const penalty = (amountNum * PENALTY_RATE).toFixed(8);
  const netAmount = (amountNum - parseFloat(penalty)).toFixed(8);

  let transactionId: number;

  await dbConn.transaction(async (tx) => {
    // Wallet holen und Balance prüfen
    const walletRows = await tx.select().from(wallets).where(eq(wallets.id, walletId)).limit(1);
    if (walletRows.length === 0) throw new Error("Wallet nicht gefunden");

    const wallet = walletRows[0];
    const available = parseFloat(wallet.availableBalance);
    if (available < amountNum) {
      throw new Error(
        `Nicht genügend Guthaben. Verfügbar: €${available.toFixed(2)}, Benötigt: €${amountNum.toFixed(2)}`
      );
    }

    // availableBalance sperren (Gesamtbetrag inkl. Penalty reservieren)
    const newAvailable = (available - amountNum).toFixed(8);
    await tx.update(wallets).set({ availableBalance: newAvailable }).where(eq(wallets.id, walletId));

    // Transaktion erstellen
    const result = await tx.insert(walletTransactions).values({
      walletId,
      userId,
      type: "withdrawal",
      amount,
      currency,
      status: "pending",
      penaltyAmount: penalty,
      externalAddress: externalAddress ?? null,
      bankReference: bankReference ?? null,
      description: `Auszahlungsantrag: €${netAmount} (nach 20% Penalty)`,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    transactionId = result[0].insertId;
  });

  return { transactionId: transactionId!, penalty, netAmount };
}

export async function approveWithdrawal(id: number, adminId: number) {
  const dbConn = await getDb();
  if (!dbConn) return;

  await dbConn.transaction(async (tx) => {
    // Transaktion holen
    const txRows = await tx.select().from(walletTransactions).where(eq(walletTransactions.id, id)).limit(1);
    if (txRows.length === 0) throw new Error("Transaktion nicht gefunden");
    const withdrawal = txRows[0];

    // balance abziehen (availableBalance wurde bereits bei requestWithdrawal gesperrt)
    const walletRows = await tx.select().from(wallets).where(eq(wallets.id, withdrawal.walletId)).limit(1);
    if (walletRows.length === 0) throw new Error("Wallet nicht gefunden");

    const currentBalance = parseFloat(walletRows[0].balance);
    const withdrawalAmount = parseFloat(withdrawal.amount);
    const newBalance = (currentBalance - withdrawalAmount).toFixed(8);

    await tx.update(wallets)
      .set({ balance: newBalance })
      .where(eq(wallets.id, withdrawal.walletId));

    // Status auf processing setzen
    await tx.update(walletTransactions).set({
      status: "processing",
      approvedBy: adminId,
      approvedAt: new Date(),
    }).where(eq(walletTransactions.id, id));
  });
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
  
  // @ts-ignore — Legacy email/password fields (openId, passwordHash, emailVerificationToken)
  // removed from schema after Clerk migration. Functions kept for legacy import compatibility.
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
  } as any);
  
  return result[0].insertId;
}

export async function verifyUserEmail(token: string) {
  const db = await getDb();
  if (!db) return false;
  
  // @ts-ignore — emailVerificationToken removed from schema after Clerk migration
  const result = await db.select().from(users)
    .where(eq((users as any).emailVerificationToken, token))
    .limit(1);

  if (result.length === 0) return false;

  // @ts-ignore
  await db.update(users).set({
    emailVerified: true,
    emailVerificationToken: null,
  } as any).where(eq(users.id, result[0].id));
  
  return true;
}

export async function setPasswordResetToken(email: string, token: string, expires: Date) {
  const db = await getDb();
  if (!db) return false;
  
  // @ts-ignore — passwordResetToken/passwordResetExpires removed from schema after Clerk migration
  const result = await db.update(users).set({
    passwordResetToken: token,
    passwordResetExpires: expires,
  } as any).where(eq(users.email, email));
  
  return true;
}

export async function resetPassword(token: string, newPasswordHash: string) {
  const db = await getDb();
  if (!db) return false;
  
  const now = new Date();
  // @ts-ignore — passwordResetToken/passwordResetExpires/passwordHash removed from schema after Clerk migration
  const result = await db.select().from(users)
    .where(and(
      eq((users as any).passwordResetToken, token),
      gte((users as any).passwordResetExpires, now)
    ))
    .limit(1);

  if (result.length === 0) return false;

  // @ts-ignore
  await db.update(users).set({
    passwordHash: newPasswordHash,
    passwordResetToken: null,
    passwordResetExpires: null,
  } as any).where(eq(users.id, result[0].id));
  
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
export async function getAdminStats() {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  const totalUsers = await database.select().from(users).execute();
  const totalBonds = await database.select().from(bonds).execute();
  const totalSubscriptions = await database.select().from(subscriptions).execute();
  
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
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(contractTemplates).where(eq(contractTemplates.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllContractTemplates() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(contractTemplates).where(eq(contractTemplates.isActive, true)).orderBy(desc(contractTemplates.createdAt));
}

export async function updateContractTemplate(id: number, data: Partial<InsertContractTemplate>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(contractTemplates).set({ ...data, updatedAt: new Date() }).where(eq(contractTemplates.id, id));
}

export async function deleteContractTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(contractTemplates).where(eq(contractTemplates.id, id));
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


// ==================== BOND-TEMPLATE LINKING ====================
export async function getBondTemplates(bondId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db
    .select()
    .from(bondContractTemplates)
    .where(eq(bondContractTemplates.bondId, bondId));
  return result;
}


export async function linkBondTemplates(bondId: number, templateIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // First, delete all existing links
  await db.delete(bondContractTemplates).where(eq(bondContractTemplates.bondId, bondId));
  
  // Then insert new links
  for (const templateId of templateIds) {
    await db.insert(bondContractTemplates).values({
      bondId,
      templateId,
      createdAt: new Date(),
    });
  }
}

export async function unlinkBondTemplate(bondId: number, templateId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(bondContractTemplates).where(
    and(
      eq(bondContractTemplates.bondId, bondId),
      eq(bondContractTemplates.templateId, templateId)
    )
  );
}

// ==================== ADMIN DASHBOARD FUNCTIONS ====================

export async function getTotalInvestors() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db
    .select({ count: sql`COUNT(*)` })
    .from(users)
    .where(eq(users.role, "user"));
  
  return result[0]?.count || 0;
}

export async function getTotalBonds() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db
    .select({ count: sql`COUNT(*)` })
    .from(bonds);
  
  return result[0]?.count || 0;
}

export async function getTotalSubscriptions() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db
    .select({ count: sql`COUNT(*)` })
    .from(subscriptions);
  
  return result[0]?.count || 0;
}

export async function getPendingKycCount() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db
    .select({ count: sql`COUNT(*)` })
    .from(users)
    .where(eq(users.kycStatus, "pending"));
  
  return result[0]?.count || 0;
}



// ==================== ADMIN WALLET MANAGEMENT FUNCTIONS ====================

export async function getAllWalletsWithUserInfo() {
  const db = await getDb();
  if (!db) return [];
  
  return db.select({
    id: wallets.id,
    userId: wallets.userId,
    email: users.email,
    name: users.name,
    currency: wallets.currency,
    currencyType: wallets.currencyType,
    balance: wallets.balance,
    availableBalance: wallets.availableBalance,
    createdAt: wallets.createdAt,
  })
  .from(wallets)
  .innerJoin(users, eq(wallets.userId, users.id))
  .orderBy(desc(wallets.createdAt));
}

export async function adjustWalletBalance(walletId: number, newBalance: string, reason: string, adminId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Update wallet balance
  await db.update(wallets).set({
    balance: newBalance,
    availableBalance: newBalance,
  }).where(eq(wallets.id, walletId));
  
  // Log the transaction
  const wallet = await db.select().from(wallets).where(eq(wallets.id, walletId)).limit(1);
  if (wallet.length > 0) {
    await createWalletTransaction({
      walletId,
      userId: wallet[0].userId,
      type: "credit",
      amount: newBalance,
      currency: wallet[0].currency,
      status: "completed",
      description: `Admin adjustment: ${reason}`,
      approvedBy: adminId,
      approvedAt: new Date(),
    });
  }
}

export async function rejectWithdrawal(id: number, reason: string, adminId: number) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(walletTransactions).set({
    status: "cancelled",
    description: `Rejected: ${reason}`,
    approvedBy: adminId,
    approvedAt: new Date()
  }).where(eq(walletTransactions.id, id));
}

export async function getWalletTransactionsForAdmin(limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select({
    id: walletTransactions.id,
    userId: walletTransactions.userId,
    email: users.email,
    name: users.name,
    type: walletTransactions.type,
    amount: walletTransactions.amount,
    currency: walletTransactions.currency,
    status: walletTransactions.status,
    description: walletTransactions.description,
    createdAt: walletTransactions.createdAt,
    approvedAt: walletTransactions.approvedAt,
  })
  .from(walletTransactions)
  .innerJoin(users, eq(walletTransactions.userId, users.id))
  .orderBy(desc(walletTransactions.createdAt))
  .limit(limit);
}

// ==================== PHASE 2: WALLET DEBIT FOR INVESTMENT ====================

export async function debitWalletForInvestment(
  userId: number,
  amount: string,
  subscriptionId: number
): Promise<void> {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database not available");

  // EUR Wallet holen
  const userWallets = await dbConn
    .select()
    .from(wallets)
    .where(and(eq(wallets.userId, userId), eq(wallets.currency, "EUR")))
    .limit(1);

  if (userWallets.length === 0) {
    throw new Error("Kein EUR-Wallet gefunden");
  }

  const wallet = userWallets[0];
  const currentBalance = parseFloat(wallet.balance ?? "0");
  const debitAmount = parseFloat(amount);

  // Balance-Check (zweite Absicherung nach Frontend)
  if (currentBalance < debitAmount) {
    throw new Error(
      `Nicht genügend Guthaben. Verfügbar: €${currentBalance.toFixed(2)}, Benötigt: €${debitAmount.toFixed(2)}`
    );
  }

  const newBalance = (currentBalance - debitAmount).toFixed(8);

  // Balance abziehen
  await dbConn
    .update(wallets)
    .set({
      balance: newBalance,
      availableBalance: newBalance,
      updatedAt: new Date(),
    })
    .where(eq(wallets.id, wallet.id));

  // Transaktion protokollieren
  await dbConn.insert(walletTransactions).values({
    walletId: wallet.id,
    userId,
    type: "debit",
    amount,
    currency: "EUR",
    status: "completed",
    relatedSubscriptionId: subscriptionId,
    description: `Investment Zeichnung #${subscriptionId}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

// ==================== COMPANY WALLET FUNCTIONS ====================

export async function getCompanyWallets() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(companyWallets).orderBy(companyWallets.coin, companyWallets.network);
}

export async function getActiveCompanyWallets() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(companyWallets)
    .where(eq(companyWallets.isActive, true))
    .orderBy(companyWallets.coin, companyWallets.network);
}

export async function getCompanyWalletByCoin(coin: string) {
  const db = await getDb();
  if (!db) return null;
  const results = await db.select().from(companyWallets)
    .where(and(eq(companyWallets.coin, coin), eq(companyWallets.isActive, true)))
    .limit(1);
  return results[0] ?? null;
}

export async function createCompanyWallet(data: InsertCompanyWallet) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(companyWallets).values(data);
  return result[0].insertId;
}

export async function updateCompanyWallet(id: number, data: Partial<InsertCompanyWallet>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(companyWallets).set({ ...data, updatedAt: new Date() }).where(eq(companyWallets.id, id));
}

export async function toggleCompanyWallet(id: number, isActive: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(companyWallets).set({ isActive, updatedAt: new Date() }).where(eq(companyWallets.id, id));
}

export async function deleteCompanyWallet(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(companyWallets).where(eq(companyWallets.id, id));
}

// ==================== CRYPTO DEPOSIT FUNCTIONS ====================

export async function reportCryptoDeposit(
  userId: number,
  walletId: number,
  txHash: string,
  amount: string,
  currency: string,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Check for duplicate txHash
  const existing = await db.select().from(walletTransactions)
    .where(eq(walletTransactions.externalTxHash, txHash)).limit(1);
  if (existing.length > 0) throw new Error("Dieser TX-Hash wurde bereits gemeldet.");

  const result = await db.insert(walletTransactions).values({
    walletId,
    userId,
    type: "deposit",
    amount,
    currency,
    status: "pending",
    externalTxHash: txHash,
    description: `Crypto Einzahlung gemeldet (${currency})`,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return result[0].insertId;
}

export async function getPendingCryptoDeposits() {
  const db = await getDb();
  if (!db) return [];
  const txs = await db.select().from(walletTransactions)
    .where(and(
      eq(walletTransactions.type, "deposit"),
      eq(walletTransactions.status, "pending"),
      sql`${walletTransactions.externalTxHash} IS NOT NULL`
    ))
    .orderBy(desc(walletTransactions.createdAt));

  // Enrich with user info
  const enriched = await Promise.all(txs.map(async (tx) => {
    const user = await getUserById(tx.userId);
    return { ...tx, user: user ? { id: user.id, name: user.name, email: user.email } : null };
  }));
  return enriched;
}

export async function confirmCryptoDeposit(
  txId: number,
  eurAmount: string,
  adminId: number,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get the pending transaction
  const txList = await db.select().from(walletTransactions)
    .where(eq(walletTransactions.id, txId)).limit(1);
  if (txList.length === 0) throw new Error("Transaktion nicht gefunden");
  const tx = txList[0];
  if (tx.status !== "pending") throw new Error("Transaktion ist nicht mehr ausstehend");

  // Get or create EUR wallet for this user
  const eurWalletObj = await getOrCreateWallet(tx.userId, "EUR", "fiat");
  const eurWalletId = eurWalletObj.id;

  // Credit EUR wallet directly (no Stripe, manual confirmation)
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database not available");
  const eurWalletRows = await dbConn.select().from(wallets).where(eq(wallets.id, eurWalletId)).limit(1);
  if (eurWalletRows.length === 0) throw new Error("EUR-Wallet nicht gefunden");
  const eurWallet = eurWalletRows[0];
  const newBalance = (parseFloat(eurWallet.balance ?? "0") + parseFloat(eurAmount)).toFixed(8);
  const newAvailable = (parseFloat(eurWallet.availableBalance ?? "0") + parseFloat(eurAmount)).toFixed(8);
  const newDeposited = (parseFloat(eurWallet.totalDeposited ?? "0") + parseFloat(eurAmount)).toFixed(8);
  await dbConn.update(wallets).set({
    balance: newBalance,
    availableBalance: newAvailable,
    totalDeposited: newDeposited,
    lastDepositAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(wallets.id, eurWalletId));
  // Record EUR credit transaction
  await dbConn.insert(walletTransactions).values({
    walletId: eurWalletId,
    userId: tx.userId,
    type: "credit",
    amount: eurAmount,
    currency: "EUR",
    status: "completed",
    description: `Crypto-Einzahlung (${tx.currency}) in EUR gutgeschrieben`,
    approvedBy: adminId,
    approvedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Update the original tx: mark completed + store EUR amount
  await db.update(walletTransactions).set({
    status: "completed",
    approvedBy: adminId,
    approvedAt: new Date(),
    description: `Crypto Einzahlung bestätigt – ${eurAmount} EUR gutgeschrieben`,
    updatedAt: new Date(),
  }).where(eq(walletTransactions.id, txId));
}

// ==================== PAYMENT SCHEDULE (ADMIN) FUNCTIONS ====================

export async function getAllPaymentSchedulesForAdmin() {
  const db = await getDb();
  if (!db) return [];

  const schedules = await db.select().from(paymentSchedules)
    .orderBy(desc(paymentSchedules.dueDate));

  // Enrich with subscription + investor + bond info
  const enriched = await Promise.all(schedules.map(async (s) => {
    const subList = await db.select().from(subscriptions)
      .where(eq(subscriptions.id, s.subscriptionId)).limit(1);
    const sub = subList[0] ?? null;
    const investor = sub ? await getUserById(sub.userId) : null;
    const bond = sub ? await getBondById(sub.bondId) : null;
    return {
      ...s,
      subscription: sub,
      investor: investor ? { id: investor.id, name: investor.name, email: investor.email } : null,
      bond: bond ? { id: bond.id, name: bond.name } : null,
    };
  }));
  return enriched;
}

export async function markPaymentSchedulePaidWithMethod(
  id: number,
  method: "bank_transfer" | "crypto",
  cryptoTxHash?: string,
  cryptoCoin?: string,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(paymentSchedules).set({
    status: "paid",
    paidAt: new Date(),
    paymentMethod: method,
    cryptoTxHash: cryptoTxHash ?? null,
    cryptoCoin: cryptoCoin ?? null,
    updatedAt: new Date(),
  }).where(eq(paymentSchedules.id, id));
}

// ==================== LEGACY CONTRACTS ====================

export async function createLegacyContract(data: InsertLegacyContract): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(legacyContracts).values(data);
}

export async function getLegacyContractById(id: number): Promise<LegacyContract | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(legacyContracts).where(eq(legacyContracts.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getLegacyContractsByUser(userId: number): Promise<LegacyContract[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(legacyContracts)
    .where(eq(legacyContracts.userId, userId))
    .orderBy(desc(legacyContracts.startDate));
}

export async function updateLegacyContract(id: number, data: Partial<InsertLegacyContract>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(legacyContracts).set({ ...data, updatedAt: new Date() }).where(eq(legacyContracts.id, id));
}

export async function getAllLegacyContractsForAdmin(): Promise<LegacyContract[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(legacyContracts).orderBy(desc(legacyContracts.createdAt));
}

// ==================== LEGACY PAYMENTS ====================

export async function addLegacyPayment(data: InsertLegacyPayment): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(legacyPayments).values(data);
  // Update paidAmount on contract
  const existing = await db.select().from(legacyPayments)
    .where(eq(legacyPayments.contractId, data.contractId));
  const total = existing.reduce((s, p) => s + parseFloat(p.amount as string), 0);
  await db.update(legacyContracts)
    .set({ paidAmount: total.toFixed(8), updatedAt: new Date() })
    .where(eq(legacyContracts.id, data.contractId));
}

export async function getLegacyPaymentsByContract(contractId: number): Promise<LegacyPayment[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(legacyPayments)
    .where(eq(legacyPayments.contractId, contractId))
    .orderBy(desc(legacyPayments.paidAt));
}

// ==================== LEGACY INTEREST PAYMENTS ====================

export async function addLegacyInterestPayment(data: InsertLegacyInterestPayment): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(legacyInterestPayments).values(data);
}

export async function getLegacyInterestPaymentsByContract(contractId: number): Promise<LegacyInterestPayment[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(legacyInterestPayments)
    .where(eq(legacyInterestPayments.contractId, contractId))
    .orderBy(desc(legacyInterestPayments.paidAt));
}


// ==================== DOCUMENTS ====================

export async function createDocument(data: InsertDocument): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(documents).values(data);
  return result[0].insertId;
}

export async function getDocumentsByContract(contractId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(documents)
    .where(eq(documents.contractId, contractId))
    .orderBy(desc(documents.createdAt));
}

export async function getDocumentByPath(filePath: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(documents)
    .where(eq(documents.filePath, filePath))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getDocumentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(documents)
    .where(eq(documents.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ==================== STEUER / TAX ====================

export async function getUserTaxData(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select({
    kirchensteuer: users.kirchensteuer,
    kirchensteuerSatz: users.kirchensteuerSatz,
    steuerNummer: users.steuerNummer,
    steuerId: users.steuerId,
    finanzamt: users.finanzamt,
    familienstand: users.familienstand,
    freistellungsauftrag: users.freistellungsauftrag,
  }).from(users).where(eq(users.id, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserTaxData(userId: number, data: {
  kirchensteuer: "keine" | "evangelisch" | "katholisch" | "andere";
  kirchensteuerSatz: string;
  steuerNummer?: string | null;
  steuerId?: string | null;
  finanzamt?: string | null;
  familienstand?: "ledig" | "verheiratet" | "geschieden" | "verwitwet" | null;
  freistellungsauftrag: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set(data).where(eq(users.id, userId));
}
