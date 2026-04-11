/**
 * Wallet Service - Handles all wallet operations including Stripe integration
 * Phase 1: Stripe Wallet Deposits
 */

import Stripe from "stripe";
import * as db from "./db";
import type { Wallet, InsertWallet, InsertWalletTransaction } from "../drizzle/schema";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-12-15.clover",
});

/**
 * Get or create wallet for user and currency
 * If wallet doesn't exist, creates it with 0 balance
 */
export async function getOrCreateWallet(
  userId: number,
  currency: string,
  currencyType: "fiat" | "crypto"
): Promise<Wallet> {
  const existingWallet = await db.getWalletsByUser(userId);
  const wallet = existingWallet.find(
    (w) => w.currency === currency && w.currencyType === currencyType
  );

  if (wallet) {
    return wallet;
  }

  // Create new wallet
  const newWallet: InsertWallet = {
    userId,
    currency,
    currencyType,
    balance: "0",
    availableBalance: "0",
    totalDeposited: "0",
    totalWithdrawn: "0",
  };

  const walletId = await db.createWallet(newWallet);
  const created = await db.getWalletById(walletId);

  if (!created) {
    throw new Error("Failed to create wallet");
  }

  return created;
}

/**
 * Get or create Stripe Customer for user's wallet
 * Links Stripe Customer ID to wallet for future reference
 */
export async function getOrCreateStripeCustomer(
  userId: number,
  wallet: Wallet
): Promise<string> {
  // Check if wallet already has Stripe Customer ID
  if (wallet.stripeCustomerId) {
    // Verify customer still exists in Stripe
    try {
      await stripe.customers.retrieve(wallet.stripeCustomerId);
      return wallet.stripeCustomerId;
    } catch (error) {
      console.warn(
        `[Wallet Service] Stripe customer ${wallet.stripeCustomerId} not found, creating new one`
      );
    }
  }

  // Get user details
  const user = await db.getUserById(userId);
  if (!user) {
    throw new Error(`User ${userId} not found`);
  }

  // Create Stripe Customer
  const customer = await stripe.customers.create({
    email: user.email || undefined,
    name: user.name || undefined,
    metadata: {
      userId: userId.toString(),
      walletId: wallet.id.toString(),
      currency: wallet.currency,
    },
  });

  // Update wallet with Stripe Customer ID
  await db.updateWalletStripeCustomer(wallet.id, customer.id);

  return customer.id;
}

/**
 * Create Stripe Checkout Session for wallet deposit
 * Returns session ID and URL for frontend redirect
 */
export async function createStripeCheckoutSession(
  userId: number,
  walletId: number,
  amount: number,
  currency: string,
  successUrl: string,
  cancelUrl: string
): Promise<{ sessionId: string; url: string }> {
  // Get wallet
  const wallet = await db.getWalletById(walletId);
  if (!wallet) {
    throw new Error(`Wallet ${walletId} not found`);
  }

  // Verify wallet belongs to user
  if (wallet.userId !== userId) {
    throw new Error("Wallet does not belong to user");
  }

  // Verify currency matches
  if (wallet.currency !== currency.toUpperCase()) {
    throw new Error(
      `Wallet currency ${wallet.currency} does not match requested currency ${currency}`
    );
  }

  // Get or create Stripe Customer
  const customerId = await getOrCreateStripeCustomer(userId, wallet);

  // Calculate Stripe fees (customer pays)
  // Card: 1.5% + €0.25
  // SEPA: 0.8%
  const isCardPayment = true; // Default to card, SEPA is opt-in
  const stripeFeePercent = isCardPayment ? 0.015 : 0.008;
  const stripeFeeFixed = isCardPayment ? 0.25 : 0;
  const totalFee = amount * stripeFeePercent + stripeFeeFixed;
  const totalAmount = amount + totalFee;

  // Convert to cents for Stripe (EUR only for now)
  const amountInCents = Math.round(totalAmount * 100);

  // Create pending wallet transaction
  const transactionId = await db.createWalletTransaction({
    walletId: wallet.id,
    userId,
    type: "deposit",
    amount: amount.toString(),
    currency,
    status: "pending",
    description: `Stripe Checkout Session deposit (includes €${totalFee.toFixed(2)} fee)`,
  } as InsertWalletTransaction);

  // Create Stripe Checkout Session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    payment_method_types: ["card", "sepa_debit"],
    line_items: [
      {
        price_data: {
          currency: currency.toLowerCase(),
          unit_amount: amountInCents,
          product_data: {
            name: "Wallet Deposit",
            description: `Deposit €${amount.toFixed(2)} to ${wallet.currency} wallet (includes processing fee)`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      userId: userId.toString(),
      walletId: wallet.id.toString(),
      transactionId: transactionId.toString(),
      depositAmount: amount.toString(),
      currency,
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  // Update transaction with Stripe Checkout Session ID
  await db.updateWalletTransactionStripeIds(transactionId, {
    stripeCheckoutSessionId: session.id,
  });

  return {
    sessionId: session.id,
    url: session.url!,
  };
}

/**
 * Credit wallet balance after successful payment
 * Called from Stripe webhook: checkout.session.completed
 */
export async function creditWallet(
  walletId: number,
  amount: string,
  transactionId: number,
  stripePaymentIntentId: string
): Promise<void> {
  const wallet = await db.getWalletById(walletId);
  if (!wallet) {
    throw new Error(`Wallet ${walletId} not found`);
  }

  // Use database transaction for atomic update
  await db.creditWalletBalance(walletId, amount, transactionId, stripePaymentIntentId);

  console.log(
    `[Wallet Service] Credited wallet ${walletId} with ${amount} ${wallet.currency}`
  );
}

/**
 * Debit wallet balance for investment
 * Throws error if insufficient balance
 * Phase 2 implementation
 */
export async function debitWallet(
  walletId: number,
  amount: string,
  subscriptionId: number,
  description: string
): Promise<number> {
  const wallet = await db.getWalletById(walletId);
  if (!wallet) {
    throw new Error(`Wallet ${walletId} not found`);
  }

  // Check sufficient balance
  const amountNum = parseFloat(amount);
  const availableBalanceNum = parseFloat(wallet.availableBalance);

  if (availableBalanceNum < amountNum) {
    throw new Error(
      `Insufficient balance: ${wallet.availableBalance} ${wallet.currency} available, ${amount} ${wallet.currency} required`
    );
  }

  // Create debit transaction
  const transactionId = await db.createWalletTransaction({
    walletId: wallet.id,
    userId: wallet.userId,
    type: "debit",
    amount: amount,
    currency: wallet.currency,
    status: "pending",
    relatedSubscriptionId: subscriptionId,
    description,
  } as InsertWalletTransaction);

  // Debit wallet balance (atomic operation)
  await db.debitWalletBalance(walletId, amount, transactionId);

  console.log(
    `[Wallet Service] Debited wallet ${walletId} with ${amount} ${wallet.currency} for subscription ${subscriptionId}`
  );

  return transactionId;
}

/**
 * Reserve balance for pending investment approval
 * Reduces availableBalance but not total balance
 * Phase 2 implementation
 */
export async function reserveBalance(
  walletId: number,
  amount: string,
  subscriptionId: number
): Promise<void> {
  const wallet = await db.getWalletById(walletId);
  if (!wallet) {
    throw new Error(`Wallet ${walletId} not found`);
  }

  // Check sufficient available balance
  const amountNum = parseFloat(amount);
  const availableBalanceNum = parseFloat(wallet.availableBalance);

  if (availableBalanceNum < amountNum) {
    throw new Error(
      `Insufficient available balance: ${wallet.availableBalance} ${wallet.currency} available, ${amount} ${wallet.currency} required`
    );
  }

  // Reserve balance (atomic operation)
  await db.reserveWalletBalance(walletId, amount, subscriptionId);

  console.log(
    `[Wallet Service] Reserved ${amount} ${wallet.currency} in wallet ${walletId} for subscription ${subscriptionId}`
  );
}

/**
 * Confirm reserved balance after admin approval
 * Actually debits the balance
 * Phase 2 implementation
 */
export async function confirmReservedBalance(
  walletId: number,
  amount: string,
  subscriptionId: number
): Promise<number> {
  const wallet = await db.getWalletById(walletId);
  if (!wallet) {
    throw new Error(`Wallet ${walletId} not found`);
  }

  // Create debit transaction
  const transactionId = await db.createWalletTransaction({
    walletId: wallet.id,
    userId: wallet.userId,
    type: "debit",
    amount: amount,
    currency: wallet.currency,
    status: "completed",
    relatedSubscriptionId: subscriptionId,
    description: `Investment approved: Subscription #${subscriptionId}`,
  } as InsertWalletTransaction);

  // Confirm reserved balance (atomic operation)
  await db.confirmReservedWalletBalance(walletId, amount, transactionId);

  console.log(
    `[Wallet Service] Confirmed reserved balance ${amount} ${wallet.currency} in wallet ${walletId} for subscription ${subscriptionId}`
  );

  return transactionId;
}

/**
 * Release reserved balance after admin rejection
 * Restores availableBalance
 * Phase 2 implementation
 */
export async function releaseReservedBalance(
  walletId: number,
  amount: string,
  subscriptionId: number
): Promise<void> {
  const wallet = await db.getWalletById(walletId);
  if (!wallet) {
    throw new Error(`Wallet ${walletId} not found`);
  }

  // Release reserved balance (atomic operation)
  await db.releaseReservedWalletBalance(walletId, amount, subscriptionId);

  console.log(
    `[Wallet Service] Released reserved balance ${amount} ${wallet.currency} in wallet ${walletId} for subscription ${subscriptionId}`
  );
}

/**
 * Calculate available balance considering reservations
 * Phase 2 implementation
 */
export async function calculateAvailableBalance(walletId: number): Promise<string> {
  const wallet = await db.getWalletById(walletId);
  if (!wallet) {
    throw new Error(`Wallet ${walletId} not found`);
  }

  return wallet.availableBalance;
}
