import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
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
});
