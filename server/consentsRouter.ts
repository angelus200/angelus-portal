import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

export const consentsRouter = router({
  upsert: protectedProcedure
    .input(z.object({
      bondId: z.number(),
      consentType: z.enum(["risk_disclosure", "terms_conditions", "subscription_agreement", "kyc_confirmation", "prospectus_acknowledgment"]),
      accepted: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      const existing = await db.getConsentByUserBondAndType(ctx.user.id, input.bondId, input.consentType);
      if (existing) {
        await db.updateConsent(existing.id, {
          accepted: input.accepted,
          acceptedAt: input.accepted ? new Date() : null,
        });
        return existing;
      } else {
        const id = await db.createConsent({
          userId: ctx.user.id,
          bondId: input.bondId,
          consentType: input.consentType as any,
          accepted: input.accepted,
          acceptedAt: input.accepted ? new Date() : null,
        });
        return { id, userId: ctx.user.id, bondId: input.bondId, consentType: input.consentType, accepted: input.accepted };
      }
    }),
  
  getByBond: protectedProcedure
    .input(z.object({ bondId: z.number() }))
    .query(async ({ input, ctx }) => {
      return db.getConsentsByUserAndBond(ctx.user.id, input.bondId);
    }),
  
  getAllByBond: adminProcedure
    .input(z.object({ bondId: z.number() }))
    .query(async ({ input }) => {
      return db.getConsentsByBond(input.bondId);
    }),

  // Log consent action for audit trail
  logConsentAction: publicProcedure
    .input(
      z.object({
        userId: z.number(),
        bondId: z.number(),
        consentType: z.enum([
          "risk_disclosure",
          "terms_conditions",
          "subscription_agreement",
          "kyc_confirmation",
          "prospectus_acknowledgment"
        ]),
        action: z.enum(["accepted", "rejected", "revoked"]),
        ipAddress: z.string().optional(),
        userAgent: z.string().optional(),
        consentVersion: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return db.createConsentLog({
        userId: input.userId,
        bondId: input.bondId,
        consentType: input.consentType as any,
        action: input.action as any,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        consentVersion: input.consentVersion,
        metadata: {},
      });
    }),

  // Get consent logs for a bond
  getLogsForBond: adminProcedure
    .input(z.object({ bondId: z.number() }))
    .query(async ({ input }) => {
      return db.getConsentLogsByBond(input.bondId);
    }),

  // Get all consent logs for a user
  getLogsForUser: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.id !== input.userId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return db.getConsentLogsByUser(input.userId);
    }),

  // Export consent logs for compliance
  exportLogs: adminProcedure
    .input(z.object({ bondId: z.number().optional() }))
    .query(async ({ input }) => {
      if (input.bondId) {
        return db.getConsentLogsByBond(input.bondId);
      }
      return db.getAllConsentLogs();
    }),
});
