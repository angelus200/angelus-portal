import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

export const stripeAdvancedRouter = router({
  // Create payment intent with company details
  createCompanyPayment: protectedProcedure
    .input(
      z.object({
        subscriptionId: z.number(),
        amount: z.string(),
        currency: z.string().default("EUR"),
        companyName: z.string(),
        taxNumber: z.string(),
        registerNumber: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }: any) => {
      if (!ctx.user?.id) throw new Error("Unauthorized");

      // Create or update customer with company details
      const customer = await stripe.customers.create({
        email: ctx.user.email,
        name: input.companyName,
        metadata: {
          userId: ctx.user.id.toString(),
          companyName: input.companyName,
          taxNumber: input.taxNumber,
          registerNumber: input.registerNumber || "",
          type: "company",
        },
      });

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(parseFloat(input.amount) * 100),
        currency: input.currency.toLowerCase(),
        customer: customer.id,
        metadata: {
          subscriptionId: input.subscriptionId.toString(),
          userId: ctx.user.id.toString(),
          type: "company",
          companyName: input.companyName,
        },
      });

      return {
        clientSecret: paymentIntent.client_secret || "",
        paymentIntentId: paymentIntent.id,
        customerId: customer.id,
      };
    }),

  // Create SEPA mandate and payment
  createSepaPayment: protectedProcedure
    .input(
      z.object({
        subscriptionId: z.number(),
        amount: z.string(),
        currency: z.string().default("EUR"),
        iban: z.string(),
        accountHolder: z.string(),
        bic: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }: any) => {
      if (!ctx.user?.id) throw new Error("Unauthorized");

      // Create or update customer
      const customer = await stripe.customers.create({
        email: ctx.user.email,
        name: input.accountHolder,
        metadata: {
          userId: ctx.user.id.toString(),
          paymentMethod: "sepa",
        },
      });

      // Create bank account token
      const bankAccount = await stripe.customers.createSource(customer.id, {
        source: {
          object: "bank_account",
          country: "DE", // Could be made dynamic
          currency: input.currency.toLowerCase(),
          account_holder_name: input.accountHolder,
          account_holder_type: "individual",
          routing_number: input.bic || "",
          account_number: input.iban,
        },
      });

      // Create payment intent with SEPA debit
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(parseFloat(input.amount) * 100),
        currency: input.currency.toLowerCase(),
        customer: customer.id,
        payment_method_types: ["sepa_debit"],
        metadata: {
          subscriptionId: input.subscriptionId.toString(),
          userId: ctx.user.id.toString(),
          type: "sepa",
          iban: input.iban,
        },
      });

      return {
        clientSecret: paymentIntent.client_secret || "",
        paymentIntentId: paymentIntent.id,
        customerId: customer.id,
        bankAccountId: bankAccount.id,
      };
    }),

  // Get SEPA mandate status
  getSepaStatus: protectedProcedure
    .input(z.object({ customerId: z.string() }))
    .query(async ({ input }: any) => {
      const sources = await stripe.customers.listSources(input.customerId, {
        object: "bank_account",
      });

      return sources.data.map((source: any) => ({
        id: source.id,
        accountHolder: source.account_holder_name,
        last4: source.last4,
        status: source.status,
        mandate: source.mandate,
      }));
    }),
});
