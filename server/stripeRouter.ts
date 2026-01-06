import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

export const stripeRouter = router({
  // Create payment intent for subscription
  createPaymentIntent: protectedProcedure
    .input(
      z.object({
        subscriptionId: z.number(),
        amount: z.string(),
        currency: z.string().default("EUR"),
      })
    )
    .mutation(async ({ input, ctx }: any) => {
      if (!ctx.user?.id) throw new Error("Unauthorized");

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(parseFloat(input.amount) * 100), // Convert to cents
        currency: input.currency.toLowerCase(),
        metadata: {
          subscriptionId: input.subscriptionId.toString(),
          userId: ctx.user.id.toString(),
          email: ctx.user.email,
        },
        receipt_email: ctx.user.email,
      });

      return {
        clientSecret: paymentIntent.client_secret || "",
        paymentIntentId: paymentIntent.id,
      };
    }),

  // Get payment status
  getPaymentStatus: protectedProcedure
    .input(z.object({ paymentIntentId: z.string() }))
    .query(async ({ input }: any) => {
      const paymentIntent = await stripe.paymentIntents.retrieve(input.paymentIntentId);
      return {
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100, // Convert from cents
        currency: paymentIntent.currency,
        created: paymentIntent.created,
      };
    }),
});
