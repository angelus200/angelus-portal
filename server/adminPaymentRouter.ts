import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }: any) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

export const adminPaymentRouter = router({
  // Get all payments
  getAllPayments: adminProcedure
    .input(z.object({ limit: z.number().default(50) }))
    .query(async ({ input }: any) => {
      // In a real implementation, fetch from database
      return [];
    }),

  // Get payment details
  getPaymentDetails: adminProcedure
    .input(z.object({ paymentIntentId: z.string() }))
    .query(async ({ input }: any) => {
      const paymentIntent = await stripe.paymentIntents.retrieve(input.paymentIntentId);
      return {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        created: new Date(paymentIntent.created * 1000),
        metadata: paymentIntent.metadata,
      };
    }),

  // Refund payment
  refundPayment: adminProcedure
    .input(z.object({ paymentIntentId: z.string(), reason: z.string().optional() }))
    .mutation(async ({ input }: any) => {
      const paymentIntent = await stripe.paymentIntents.retrieve(input.paymentIntentId);
      
      if (!paymentIntent.charges.data[0]) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No charge found for this payment' });
      }

      const refund = await stripe.refunds.create({
        charge: paymentIntent.charges.data[0].id,
        reason: input.reason || 'requested_by_customer',
      });

      return {
        refundId: refund.id,
        status: refund.status,
        amount: refund.amount / 100,
      };
    }),

  // Get refunds
  getRefunds: adminProcedure
    .input(z.object({ limit: z.number().default(50) }))
    .query(async ({ input }: any) => {
      const refunds = await stripe.refunds.list({ limit: input.limit });
      return refunds.data.map((refund) => ({
        id: refund.id,
        chargeId: refund.charge,
        amount: refund.amount / 100,
        status: refund.status,
        reason: refund.reason,
        created: new Date(refund.created * 1000),
      }));
    }),
});
