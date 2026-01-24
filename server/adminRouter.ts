import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

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
});
