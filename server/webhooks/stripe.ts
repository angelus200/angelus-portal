import Stripe from "stripe";
import { Request, Response } from "express";
import * as db from "../db";
import { ENV } from "../_core/env";

let stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripe) {
    if (!ENV.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }
    stripe = new Stripe(ENV.STRIPE_SECRET_KEY, {
      apiVersion: "2025-12-15.clover",
    });
  }
  return stripe;
}

/**
 * Verifies Stripe webhook signature
 * @param req Express request
 * @param secret Webhook signing secret
 * @returns Parsed event or null if verification fails
 */
export function verifyStripeWebhookSignature(
  req: Request,
  secret: string
): Stripe.Event | null {
  const signature = req.headers["stripe-signature"];

  if (!signature || typeof signature !== "string") {
    console.error("Missing Stripe signature header");
    return null;
  }

  try {
    const stripeClient = getStripe();
    const event = stripeClient.webhooks.constructEvent(
      req.body,
      signature,
      secret
    );
    return event;
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return null;
  }
}

/**
 * Handles payment_intent.succeeded event
 */
export async function handlePaymentIntentSucceeded(
  event: Stripe.Event
): Promise<void> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  console.log(`[Stripe Webhook] Payment Intent Succeeded: ${paymentIntent.id}`);

  // Find subscription by Stripe Payment Intent ID
  const subscription = await db.getSubscriptionByStripePaymentIntentId(
    paymentIntent.id
  );

  if (!subscription) {
    console.warn(
      `[Stripe Webhook] No subscription found for Payment Intent: ${paymentIntent.id}`
    );
    return;
  }

  // Update subscription payment status
  await db.updateSubscriptionPaymentStatus(
    subscription.id,
    "completed",
    paymentIntent.id,
    paymentIntent.customer as string | undefined
  );

  // Update subscription status to "active" if payment is completed
  await db.updateSubscriptionStatus(subscription.id, "active");

  console.log(
    `[Stripe Webhook] Subscription ${subscription.id} marked as paid and active`
  );

  // TODO: Send confirmation email to investor
  // TODO: Log audit trail for payment completion
}

/**
 * Handles payment_intent.payment_failed event
 */
export async function handlePaymentIntentPaymentFailed(
  event: Stripe.Event
): Promise<void> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  console.log(
    `[Stripe Webhook] Payment Intent Failed: ${paymentIntent.id}, Error: ${paymentIntent.last_payment_error?.message}`
  );

  // Find subscription by Stripe Payment Intent ID
  const subscription = await db.getSubscriptionByStripePaymentIntentId(
    paymentIntent.id
  );

  if (!subscription) {
    console.warn(
      `[Stripe Webhook] No subscription found for Payment Intent: ${paymentIntent.id}`
    );
    return;
  }

  // Update subscription payment status to failed
  await db.updateSubscriptionPaymentStatus(
    subscription.id,
    "failed",
    paymentIntent.id,
    paymentIntent.customer as string | undefined
  );

  // Update subscription status to "cancelled" if payment failed
  await db.updateSubscriptionStatus(subscription.id, "cancelled");

  console.log(
    `[Stripe Webhook] Subscription ${subscription.id} marked as failed and cancelled`
  );

  // TODO: Send failure notification email to investor
  // TODO: Log audit trail for payment failure
}

/**
 * Handles charge.refunded event
 */
export async function handleChargeRefunded(event: Stripe.Event): Promise<void> {
  const charge = event.data.object as Stripe.Charge;

  console.log(`[Stripe Webhook] Charge Refunded: ${charge.id}`);

  if (!charge.payment_intent || typeof charge.payment_intent !== "string") {
    console.warn(`[Stripe Webhook] Charge has no payment_intent: ${charge.id}`);
    return;
  }

  // Find subscription by Stripe Payment Intent ID
  const subscription = await db.getSubscriptionByStripePaymentIntentId(
    charge.payment_intent
  );

  if (!subscription) {
    console.warn(
      `[Stripe Webhook] No subscription found for Charge: ${charge.id}`
    );
    return;
  }

  // Update subscription payment status to refunded
  await db.updateSubscriptionPaymentStatus(
    subscription.id,
    "refunded",
    charge.payment_intent,
    charge.customer as string | undefined
  );

  console.log(
    `[Stripe Webhook] Subscription ${subscription.id} marked as refunded`
  );

  // TODO: Send refund notification email to investor
  // TODO: Log audit trail for refund
}

/**
 * Handles checkout.session.completed event
 * Phase 1: Wallet deposits via Stripe Checkout
 */
export async function handleCheckoutSessionCompleted(
  event: Stripe.Event
): Promise<void> {
  const session = event.data.object as Stripe.Checkout.Session;

  console.log(`[Stripe Webhook] Checkout Session Completed: ${session.id}`);

  // Extract metadata
  const walletId = session.metadata?.walletId;
  const userId = session.metadata?.userId;
  const transactionId = session.metadata?.transactionId;
  const depositAmount = session.metadata?.depositAmount;
  const currency = session.metadata?.currency;

  if (!walletId || !userId || !transactionId || !depositAmount || !currency) {
    console.error(
      `[Stripe Webhook] Missing metadata in Checkout Session: ${session.id}`,
      session.metadata
    );
    return;
  }

  // Get payment intent ID
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;

  if (!paymentIntentId) {
    console.error(
      `[Stripe Webhook] No payment_intent in Checkout Session: ${session.id}`
    );
    return;
  }

  try {
    // Credit wallet balance
    await db.creditWalletBalance(
      parseInt(walletId),
      depositAmount,
      parseInt(transactionId),
      paymentIntentId
    );

    console.log(
      `[Stripe Webhook] Wallet ${walletId} credited with ${depositAmount} ${currency}`
    );

    // TODO: Send deposit confirmation email to investor
    // TODO: Log audit trail for wallet deposit
  } catch (error) {
    console.error(
      `[Stripe Webhook] Error processing Checkout Session ${session.id}:`,
      error
    );
    // Don't throw - we've already received the event
    // Manual reconciliation will be needed
  }
}

/**
 * Main webhook handler
 */
export async function handleStripeWebhook(
  req: Request,
  res: Response
): Promise<void> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    res.status(500).json({ error: "Webhook secret not configured" });
    return;
  }

  // Verify webhook signature
  const event = verifyStripeWebhookSignature(req, webhookSecret);

  if (!event) {
    console.error("Invalid webhook signature");
    res.status(400).json({ error: "Invalid signature" });
    return;
  }

  try {
    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event);
        break;

      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentIntentPaymentFailed(event);
        break;

      case "charge.refunded":
        await handleChargeRefunded(event);
        break;

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    // Return success response to Stripe
    res.json({ received: true });
  } catch (error) {
    console.error("[Stripe Webhook] Error processing webhook:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
