import { protectedProcedure, router } from "./_core/trpc";
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
});
