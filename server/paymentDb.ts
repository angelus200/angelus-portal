import { getDb } from "./db";
import { subscriptions } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Update subscription payment status after successful payment
 */
export async function updateSubscriptionPaymentStatus(
  subscriptionId: number,
  paymentStatus: "pending" | "paid" | "failed" | "cancelled",
  stripePaymentIntentId: string,
  stripeCustomerId?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: any = {
    paymentStatus,
    stripePaymentIntentId,
    updatedAt: new Date(),
  };

  if (stripeCustomerId) {
    updateData.stripeCustomerId = stripeCustomerId;
  }

  const result = await db
    .update(subscriptions)
    .set(updateData)
    .where(eq(subscriptions.id, subscriptionId));

  return result;
}

/**
 * Get subscription with payment details
 */
export async function getSubscriptionWithPayment(subscriptionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, subscriptionId))
    .limit(1);

  return result[0] || null;
}

/**
 * Get all payments for an investor
 */
export async function getInvestorPayments(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId));

  return result;
}

/**
 * Get subscriptions by payment status
 */
export async function getSubscriptionsByPaymentStatus(
  paymentStatus: "pending" | "paid" | "failed" | "cancelled"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.paymentStatus, paymentStatus));

  return result;
}

/**
 * Get subscription by Stripe Payment Intent ID
 */
export async function getSubscriptionByStripePaymentIntentId(
  stripePaymentIntentId: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripePaymentIntentId, stripePaymentIntentId))
    .limit(1);

  return result[0] || null;
}
