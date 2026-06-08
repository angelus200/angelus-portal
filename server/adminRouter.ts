import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import * as invDb from "./invitations-db";
import { TRPCError } from "@trpc/server";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { sendInvitationEmail } from "./email/send-invitation";
import { berechneAuszahlungsplan } from "./tax-service";

// Admin-only procedure (admin or superadmin)
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin' && ctx.user.role !== 'superadmin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

// Superadmin-only procedure
const superadminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'superadmin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Superadmin access required' });
  }
  return next({ ctx });
});

export const adminRouter = router({
  // Get all users
  getUsers: adminProcedure.query(async () => {
    const allUsers = await db.getAllUsers();
    return allUsers;
  }),

  // Get all admin users
  getAdminUsers: adminProcedure.query(async () => {
    const adminUsers = await db.getAdminUsers();
    return adminUsers;
  }),

  // Promote user to admin
  promoteToAdmin: adminProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      // Check if user exists
      const existingUser = await db.getUserByEmail(input.email);

      if (!existingUser) {
        // Create new admin user
        return await db.createUser({
          email: input.email,
          role: "admin",
          name: input.email.split("@")[0],
        });
      }

      // Update existing user to admin
      return await db.updateUserRole(existingUser.id, "admin");
    }),

  // Demote admin to regular user
  demoteFromAdmin: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // Prevent demoting the current user
      if (ctx.user?.id === input.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Sie können sich selbst nicht zum Investor zurückstufen",
        });
      }

      // Prevent demoting the main admin
      const userToUpdate = await db.getUserById(input.userId);

      if (!userToUpdate) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Benutzer nicht gefunden",
        });
      }

      if (userToUpdate.email === "grossdigitalpartner@gmail.com") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Dieser Admin-Benutzer kann nicht zurückgestuft werden",
        });
      }

      return await db.updateUserRole(input.userId, "user");
    }),

  // Get dashboard statistics
  stats: adminProcedure.query(async () => {
    const totalInvestors = await db.getTotalInvestors();
    const totalBonds = await db.getTotalBonds();
    const totalSubscriptions = await db.getTotalSubscriptions();
    const pendingKyc = await db.getPendingKycCount();

    return {
      totalInvestors,
      totalBonds,
      totalSubscriptions,
      pendingKyc,
    };
  }),

  // Get audit logs
  auditLogs: adminProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ input }) => {
      return await db.getAuditLogs(input.limit);
    }),

  // Get all wallets with user info
  getAllWallets: adminProcedure.query(async () => {
    return await db.getAllWalletsWithUserInfo();
  }),

  // Adjust wallet balance
  adjustWalletBalance: adminProcedure
    .input(z.object({
      walletId: z.number(),
      newBalance: z.string(),
      reason: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });
      return await db.adjustWalletBalance(
        input.walletId,
        input.newBalance,
        input.reason,
        ctx.user.id
      );
    }),

  // Get pending withdrawals
  getPendingWithdrawals: adminProcedure.query(async () => {
    return await db.getPendingWithdrawals();
  }),

  // Approve withdrawal
  approveWithdrawal: adminProcedure
    .input(z.object({ transactionId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });
      return await db.approveWithdrawal(input.transactionId, ctx.user.id);
    }),

  // Reject withdrawal
  rejectWithdrawal: adminProcedure
    .input(z.object({
      transactionId: z.number(),
      reason: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });
      return await db.rejectWithdrawal(input.transactionId, input.reason, ctx.user.id);
    }),

  // Get wallet transactions for admin
  getWalletTransactions: adminProcedure
    .input(z.object({ limit: z.number().default(50) }))
    .query(async ({ input }) => {
      return await db.getWalletTransactionsForAdmin(input.limit);
    }),

  // Get all payments with investor and bond info
  getAllPayments: adminProcedure
    .input(z.object({
      limit: z.number().default(50),
      offset: z.number().default(0),
      status: z.enum(['pending', 'processing', 'completed', 'failed', 'refunded']).optional(),
    }))
    .query(async ({ input }) => {
      const subscriptions = await db.getAllSubscriptions();
      
      // Filter by payment status if provided
      let filtered = subscriptions;
      if (input.status) {
        filtered = subscriptions.filter(s => s.paymentStatus === input.status);
      }

      // Apply pagination
      const paginated = filtered.slice(input.offset, input.offset + input.limit);

      // Enrich with investor and bond info
      const enriched = await Promise.all(
        paginated.map(async (subscription) => {
          const investor = await db.getUserById(subscription.userId);
          const bond = await db.getBondById(subscription.bondId);
          return {
            ...subscription,
            investor,
            bond,
          };
        })
      );

      return {
        payments: enriched,
        total: filtered.length,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  // Get payment detail
  getPaymentDetail: adminProcedure
    .input(z.object({ subscriptionId: z.number() }))
    .query(async ({ input }) => {
      const subscription = await db.getSubscriptionWithPayment(input.subscriptionId);
      
      if (!subscription) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Zahlung nicht gefunden',
        });
      }

      const investor = await db.getUserById(subscription.userId);
      const bond = await db.getBondById(subscription.bondId);

      return {
        ...subscription,
        investor,
        bond,
      };
    }),

  // Get payments by status
  getPaymentsByStatus: adminProcedure
    .input(z.object({
      status: z.enum(['pending', 'processing', 'completed', 'failed', 'refunded']),
    }))
    .query(async ({ input }) => {
      const subscriptions = await db.getSubscriptionsByPaymentStatus(input.status);
      
      // Enrich with investor and bond info
      const enriched = await Promise.all(
        subscriptions.map(async (subscription) => {
          const investor = await db.getUserById(subscription.userId);
          const bond = await db.getBondById(subscription.bondId);
          return {
            ...subscription,
            investor,
            bond,
          };
        })
      );

      return enriched;
    }),

  // Get investor payment history
  getInvestorPayments: adminProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const payments = await db.getInvestorPayments(input.userId);
      
      // Enrich with bond info
      const enriched = await Promise.all(
        payments.map(async (subscription) => {
          const bond = await db.getBondById(subscription.bondId);
          return {
            ...subscription,
            bond,
          };
        })
      );

      return enriched;
    }),

  // Process refund
  refundPayment: adminProcedure
    .input(z.object({
      subscriptionId: z.number(),
      reason: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: 'UNAUTHORIZED' });

      const subscription = await db.getSubscriptionWithPayment(input.subscriptionId);
      
      if (!subscription) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Zahlung nicht gefunden',
        });
      }

      if (subscription.paymentStatus !== 'completed') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Nur abgeschlossene Zahlungen können rückgängig gemacht werden',
        });
      }

      // Update payment status to refunded
      await db.updateSubscriptionPaymentStatus(
        subscription.id,
        'refunded',
        subscription.stripePaymentIntentId || undefined,
        subscription.stripeCustomerId || undefined
      );

      // TODO: Log the refund (logAuditTrail not yet implemented)

      return { success: true, message: 'Rückerstattung verarbeitet' };
    }),

  // Get payment statistics
  getPaymentStats: adminProcedure.query(async () => {
    const allSubscriptions = await db.getAllSubscriptions();

    const stats = {
      total: allSubscriptions.length,
      completed: allSubscriptions.filter(s => s.paymentStatus === 'completed').length,
      failed: allSubscriptions.filter(s => s.paymentStatus === 'failed').length,
      refunded: allSubscriptions.filter(s => s.paymentStatus === 'refunded').length,
      processing: allSubscriptions.filter(s => s.paymentStatus === 'processing').length,
      pending: allSubscriptions.filter(s => s.paymentStatus === 'pending').length,
      completedAmount: allSubscriptions
        .filter(s => s.paymentStatus === 'completed')
        .reduce((sum, s) => sum + parseFloat(s.amount), 0),
      refundedAmount: allSubscriptions
        .filter(s => s.paymentStatus === 'refunded')
        .reduce((sum, s) => sum + parseFloat(s.amount), 0),
    };

    return stats;
  }),

  // ==================== SUPERADMIN ENDPOINTS ====================

  // Set user role (superadmin only)
  setUserRole: superadminProcedure
    .input(z.object({
      userId: z.number(),
      role: z.enum(['user', 'admin']),
    }))
    .mutation(async ({ input, ctx }) => {
      // Prevent changing own role
      if (ctx.user?.id === input.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Sie können Ihre eigene Rolle nicht ändern",
        });
      }

      const userToUpdate = await db.getUserById(input.userId);

      if (!userToUpdate) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Benutzer nicht gefunden",
        });
      }

      // Prevent changing superadmin role
      if (userToUpdate.role === 'superadmin') {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Superadmin-Rollen können nicht geändert werden",
        });
      }

      await db.updateUserRole(input.userId, input.role);

      // Create audit log
      await db.createAuditLog({
        userId: ctx.user.id,
        userEmail: ctx.user.email || null,
        action: "user.role_change",
        entityType: "user",
        entityId: input.userId,
        details: {
          oldRole: userToUpdate.role,
          newRole: input.role,
          targetUser: userToUpdate.email,
        },
        ipAddress: ctx.req.ip,
      });

      return { success: true };
    }),

  // ==================== COMPANY CRYPTO WALLETS ====================

  listCompanyWallets: adminProcedure.query(async () => {
    return db.getCompanyWallets();
  }),

  createCompanyWallet: adminProcedure
    .input(z.object({
      coin: z.string().min(2).max(16),
      network: z.string().min(2).max(64),
      address: z.string().min(10).max(255),
      label: z.string().max(128).optional(),
      isActive: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const id = await db.createCompanyWallet(input);
      await db.createAuditLog({
        userId: ctx.user.id,
        userEmail: ctx.user.email,
        action: "companyWallet.create",
        entityType: "companyWallet",
        entityId: id,
        details: { coin: input.coin, network: input.network },
        ipAddress: ctx.req.ip,
      });
      return { id };
    }),

  updateCompanyWallet: adminProcedure
    .input(z.object({
      id: z.number(),
      coin: z.string().min(2).max(16).optional(),
      network: z.string().min(2).max(64).optional(),
      address: z.string().min(10).max(255).optional(),
      label: z.string().max(128).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      await db.updateCompanyWallet(id, data);
      await db.createAuditLog({
        userId: ctx.user.id,
        userEmail: ctx.user.email,
        action: "companyWallet.update",
        entityType: "companyWallet",
        entityId: id,
        details: data,
        ipAddress: ctx.req.ip,
      });
      return { success: true };
    }),

  toggleCompanyWallet: adminProcedure
    .input(z.object({ id: z.number(), isActive: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      await db.toggleCompanyWallet(input.id, input.isActive);
      await db.createAuditLog({
        userId: ctx.user.id,
        userEmail: ctx.user.email,
        action: "companyWallet.toggle",
        entityType: "companyWallet",
        entityId: input.id,
        details: { isActive: input.isActive },
        ipAddress: ctx.req.ip,
      });
      return { success: true };
    }),

  deleteCompanyWallet: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await db.deleteCompanyWallet(input.id);
      await db.createAuditLog({
        userId: ctx.user.id,
        userEmail: ctx.user.email,
        action: "companyWallet.delete",
        entityType: "companyWallet",
        entityId: input.id,
        details: {},
        ipAddress: ctx.req.ip,
      });
      return { success: true };
    }),

  // ==================== CRYPTO DEPOSIT MANAGEMENT ====================

  pendingCryptoDeposits: adminProcedure.query(async () => {
    return db.getPendingCryptoDeposits();
  }),

  confirmCryptoDeposit: adminProcedure
    .input(z.object({
      txId: z.number(),
      eurAmount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Ungültiger EUR-Betrag"),
    }))
    .mutation(async ({ input, ctx }) => {
      await db.confirmCryptoDeposit(input.txId, input.eurAmount, ctx.user.id);
      await db.createAuditLog({
        userId: ctx.user.id,
        userEmail: ctx.user.email,
        action: "wallet.confirmCryptoDeposit",
        entityType: "walletTransaction",
        entityId: input.txId,
        details: { eurAmount: input.eurAmount },
        ipAddress: ctx.req.ip,
      });
      return { success: true };
    }),

  // ==================== GENERAL INVITATIONS ====================

  createGeneralInvitation: adminProcedure
    .input(z.object({
      email: z.string().email(),
      name: z.string().max(255).optional(),
      expiresInDays: z.number().int().min(1).max(365).default(30),
      sendEmail: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const inv = await invDb.createGeneralInvitation(
        input.email,
        input.name ?? null,
        ctx.user.id,
        input.expiresInDays,
        'angelus' // realer Standard-Emittent; von VITE_BRAND-Marke entkoppelt
      );
      if (input.sendEmail) {
        try {
          await sendInvitationEmail({
            email: inv.email,
            firstName: input.name ?? 'Mitglied',
            lastName: '',
            invitationToken: inv.token,
            expiresAt: inv.expiresAt,
            issuerKey: inv.issuerKey,
          });
        } catch (e) {
          console.error('[Invitations] Email send failed:', e);
          // Don't throw - invitation was created, email failure is non-fatal
        }
      }
      await db.createAuditLog({
        userId: ctx.user.id,
        userEmail: ctx.user.email,
        action: 'invitations.create',
        entityType: 'invitation',
        details: { email: inv.email, name: input.name },
        ipAddress: ctx.req.ip,
      });
      return { token: inv.token, email: inv.email, expiresAt: inv.expiresAt };
    }),

  listGeneralInvitations: adminProcedure.query(async () => {
    return invDb.listGeneralInvitations();
  }),

  cancelGeneralInvitation: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      await invDb.cancelGeneralInvitation(input.id);
      await db.createAuditLog({
        userId: ctx.user.id,
        userEmail: ctx.user.email,
        action: 'invitations.cancel',
        entityType: 'invitation',
        entityId: input.id,
        ipAddress: ctx.req.ip,
      });
      return { success: true };
    }),

  // ==================== PAYMENT SCHEDULE MANAGEMENT ====================

  getPaymentSchedules: adminProcedure.query(async () => {
    return db.getAllPaymentSchedulesForAdmin();
  }),

  markPaymentSchedulePaid: adminProcedure
    .input(z.object({
      id: z.number(),
      method: z.enum(["bank_transfer", "crypto"]),
      cryptoTxHash: z.string().max(128).optional(),
      cryptoCoin: z.string().max(16).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await db.markPaymentSchedulePaidWithMethod(
        input.id,
        input.method,
        input.cryptoTxHash,
        input.cryptoCoin,
      );
      await db.createAuditLog({
        userId: ctx.user.id,
        userEmail: ctx.user.email,
        action: "payment.markPaidWithMethod",
        entityType: "paymentSchedule",
        entityId: input.id,
        details: { method: input.method, cryptoTxHash: input.cryptoTxHash, cryptoCoin: input.cryptoCoin },
        ipAddress: ctx.req.ip,
      });
      return { success: true };
    }),

  // ==================== STEUER / TAX ====================

  getInvestorTax: adminProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const taxData = await db.getUserTaxData(input.userId);
      if (!taxData) throw new TRPCError({ code: 'NOT_FOUND', message: 'Investor nicht gefunden' });
      return taxData;
    }),

  updateInvestorTax: adminProcedure
    .input(z.object({
      userId: z.number(),
      kirchensteuer: z.enum(['keine', 'evangelisch', 'katholisch', 'andere']),
      kirchensteuerSatz: z.number().min(0).max(0.15),
      steuerNummer: z.string().max(50).optional(),
      steuerId: z.string().max(20).optional(),
      finanzamt: z.string().max(100).optional(),
      familienstand: z.enum(['ledig', 'verheiratet', 'geschieden', 'verwitwet']).optional(),
      freistellungsauftrag: z.number().min(0).max(2000),
    }))
    .mutation(async ({ input, ctx }) => {
      const { userId, kirchensteuerSatz, freistellungsauftrag, ...rest } = input;
      await db.updateUserTaxData(userId, {
        ...rest,
        kirchensteuerSatz: kirchensteuerSatz.toFixed(4),
        freistellungsauftrag: freistellungsauftrag.toFixed(2),
      });
      await db.createAuditLog({
        userId: ctx.user.id,
        userEmail: ctx.user.email,
        action: 'investor.updateTax',
        entityType: 'user',
        entityId: userId,
        details: { kirchensteuer: input.kirchensteuer, freistellungsauftrag },
        ipAddress: ctx.req.ip,
      });
      return { success: true };
    }),

  adminAuszahlungsplan: adminProcedure
    .input(z.object({ subscriptionId: z.number(), userId: z.number() }))
    .query(async ({ input }) => {
      const [taxData, schedules] = await Promise.all([
        db.getUserTaxData(input.userId),
        db.getPaymentSchedulesBySubscription(input.subscriptionId),
      ]);
      const kirchensteuerPflichtig = taxData?.kirchensteuer !== 'keine';
      const kirchensteuerSatz = Number(taxData?.kirchensteuerSatz ?? 0.09);
      const freistellungsauftrag = Number(taxData?.freistellungsauftrag ?? 0);
      return berechneAuszahlungsplan(
        schedules.map(s => ({
          id: s.id,
          dueDate: s.dueDate,
          amount: Number(s.amount),
          status: s.status,
        })),
        { kirchensteuerPflichtig, kirchensteuerSatz, freistellungsauftrag }
      );
    }),

  // ==================== EMITTENTEN-VERWALTUNG ====================

  listIssuers: adminProcedure.query(async () => {
    return db.getAllIssuers();
  }),

  createIssuer: adminProcedure
    .input(z.object({
      issuerKey: z.string().min(2).max(32).regex(/^[a-z0-9-]+$/, 'Nur Kleinbuchstaben, Zahlen, Bindestriche'),
      name: z.string().min(2).max(255),
      shortName: z.string().max(64).optional(),
      country: z.string().max(64).optional(),
      description: z.string().max(1000).optional(),
      logoUrl: z.string().max(500).optional(),
      badgeColor: z.enum(['yellow', 'purple', 'blue', 'green', 'orange', 'red', 'teal', 'gray']).default('yellow'),
      language: z.enum(['de', 'en']).default('en'),
      active: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const existing = await db.getIssuerByKey(input.issuerKey);
      if (existing) throw new TRPCError({ code: 'CONFLICT', message: 'issuerKey existiert bereits' });
      await db.createIssuer(input);
      await db.createAuditLog({
        userId: ctx.user.id,
        userEmail: ctx.user.email,
        action: 'issuer.create',
        entityType: 'issuer',
        details: { issuerKey: input.issuerKey, name: input.name },
        ipAddress: ctx.req.ip,
      });
      return { success: true };
    }),

  updateIssuer: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(2).max(255).optional(),
      shortName: z.string().max(64).optional(),
      country: z.string().max(64).optional(),
      description: z.string().max(1000).optional(),
      logoUrl: z.string().max(500).optional(),
      badgeColor: z.enum(['yellow', 'purple', 'blue', 'green', 'orange', 'red', 'teal', 'gray']).optional(),
      language: z.enum(['de', 'en']).optional(),
      active: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      await db.updateIssuer(id, data);
      await db.createAuditLog({
        userId: ctx.user.id,
        userEmail: ctx.user.email,
        action: 'issuer.update',
        entityType: 'issuer',
        entityId: id,
        details: data,
        ipAddress: ctx.req.ip,
      });
      return { success: true };
    }),

  // ==================== FREISCHALTUNGS-VERWALTUNG (Modell B) ====================

  listPendingAccessRequests: adminProcedure.query(async () => {
    return db.getPendingAccessRequests();
  }),

  listUserIssuerAccess: adminProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      return db.getUserIssuerAccess(input.userId);
    }),

  decideIssuerAccess: adminProcedure
    .input(z.object({
      userId: z.number(),
      issuerKey: z.string().min(2).max(32),
      status: z.enum(['approved', 'blocked']),
      note: z.string().max(500).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await db.decideIssuerAccess(input.userId, input.issuerKey, input.status, ctx.user.id, input.note);
      await db.createAuditLog({
        userId: ctx.user.id,
        userEmail: ctx.user.email,
        action: 'issuerAccess.decide',
        entityType: 'userIssuerAccess',
        entityId: input.userId,
        details: { issuerKey: input.issuerKey, status: input.status, note: input.note },
        ipAddress: ctx.req.ip,
      });
      return { success: true };
    }),

  // ==================== LEADS-VERWALTUNG ====================

  listLeads: adminProcedure.query(async () => {
    return db.getLeads();
  }),

  updateLeadStatus: adminProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(['new', 'contacted', 'qualified', 'converted', 'discarded']),
    }))
    .mutation(async ({ input, ctx }) => {
      await db.updateLeadStatus(input.id, input.status);
      await db.createAuditLog({
        userId: ctx.user.id,
        userEmail: ctx.user.email,
        action: 'lead.updateStatus',
        entityType: 'lead',
        entityId: input.id,
        details: { status: input.status },
        ipAddress: ctx.req.ip,
      });
      return { success: true };
    }),
});
