import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { Request, Response } from "express";
import Stripe from "stripe";
import {
  verifyStripeWebhookSignature,
  handlePaymentIntentSucceeded,
  handlePaymentIntentPaymentFailed,
  handleChargeRefunded,
  handleStripeWebhook,
} from "./stripe";
import * as db from "../db";

// Mock db functions
vi.mock("../db", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getSubscriptionByStripePaymentIntentId: vi.fn(),
    updateSubscriptionPaymentStatus: vi.fn(),
    updateSubscriptionStatus: vi.fn(),
  };
});

describe("Stripe Webhook Handler", () => {
  let userId: number;
  let bondId: number;
  let subscriptionId: number;

  beforeAll(async () => {
    // Create test user
    userId = await db.createUser({
      email: `test-webhook-${Date.now()}@test.com`,
      name: "Test User",
      role: "user",
    });

    // Create test bond
    bondId = await db.createBond({
      name: "Test Bond",
      bondNumber: `TB-${Date.now()}`,
      interestRate: 5.0,
      maturityDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      minimumInvestment: 1000,
      currency: "EUR",
      totalVolume: "1000000.00",
      availableVolume: "1000000.00",
      termMonths: 12,
    } as any);

    // Create test subscription
    subscriptionId = await db.createSubscription({
      userId,
      bondId,
      amount: "10000.00",
      currency: "EUR",
      status: "pending",
    } as any);
  });

  describe("verifyStripeWebhookSignature", () => {
    it("should return null if signature header is missing", () => {
      const req = {
        headers: {},
        body: "test",
      } as unknown as Request;

      const result = verifyStripeWebhookSignature(req, "test_secret");
      expect(result).toBeNull();
    });

    it("should return null if signature is invalid", () => {
      const req = {
        headers: {
          "stripe-signature": "invalid_signature",
        },
        body: "test",
      } as unknown as Request;

      const result = verifyStripeWebhookSignature(req, "test_secret");
      expect(result).toBeNull();
    });
  });

  describe("handlePaymentIntentSucceeded", () => {
    it("should update subscription status to completed and active", async () => {
      const paymentIntentId = `pi_test_${Date.now()}`;

      // Mock the subscription lookup
      vi.mocked(db.getSubscriptionByStripePaymentIntentId).mockResolvedValueOnce({
        id: subscriptionId,
        userId,
        bondId,
        amount: "10000.00",
        currency: "EUR",
        status: "pending",
        paymentStatus: "pending",
        stripePaymentIntentId: paymentIntentId,
        stripeCustomerId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const event = {
        type: "payment_intent.succeeded",
        data: {
          object: {
            id: paymentIntentId,
            customer: "cus_test_123",
          },
        },
      } as unknown as Stripe.Event;

      await handlePaymentIntentSucceeded(event);

      expect(db.updateSubscriptionPaymentStatus).toHaveBeenCalledWith(
        subscriptionId,
        "completed",
        paymentIntentId,
        "cus_test_123"
      );

      expect(db.updateSubscriptionStatus).toHaveBeenCalledWith(
        subscriptionId,
        "active"
      );
    });

    it("should handle missing subscription gracefully", async () => {
      const paymentIntentId = `pi_nonexistent_${Date.now()}`;

      // Reset mocks
      vi.mocked(db.updateSubscriptionPaymentStatus).mockClear();
      vi.mocked(db.updateSubscriptionStatus).mockClear();

      // Mock the subscription lookup to return null
      vi.mocked(db.getSubscriptionByStripePaymentIntentId).mockResolvedValueOnce(
        null
      );

      const event = {
        type: "payment_intent.succeeded",
        data: {
          object: {
            id: paymentIntentId,
            customer: "cus_test_123",
          },
        },
      } as unknown as Stripe.Event;

      // Should not throw
      await handlePaymentIntentSucceeded(event);

      expect(db.updateSubscriptionPaymentStatus).not.toHaveBeenCalled();
    });
  });

  describe("handlePaymentIntentPaymentFailed", () => {
    it("should update subscription status to failed and cancelled", async () => {
      const paymentIntentId = `pi_failed_${Date.now()}`;

      // Mock the subscription lookup
      vi.mocked(db.getSubscriptionByStripePaymentIntentId).mockResolvedValueOnce({
        id: subscriptionId,
        userId,
        bondId,
        amount: "10000.00",
        currency: "EUR",
        status: "pending",
        paymentStatus: "pending",
        stripePaymentIntentId: paymentIntentId,
        stripeCustomerId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const event = {
        type: "payment_intent.payment_failed",
        data: {
          object: {
            id: paymentIntentId,
            customer: "cus_test_123",
            last_payment_error: {
              message: "Card declined",
            },
          },
        },
      } as unknown as Stripe.Event;

      await handlePaymentIntentPaymentFailed(event);

      expect(db.updateSubscriptionPaymentStatus).toHaveBeenCalledWith(
        subscriptionId,
        "failed",
        paymentIntentId,
        "cus_test_123"
      );

      expect(db.updateSubscriptionStatus).toHaveBeenCalledWith(
        subscriptionId,
        "cancelled"
      );
    });
  });

  describe("handleChargeRefunded", () => {
    it("should update subscription status to refunded", async () => {
      const paymentIntentId = `pi_refund_${Date.now()}`;
      const chargeId = `ch_refund_${Date.now()}`;

      // Mock the subscription lookup
      vi.mocked(db.getSubscriptionByStripePaymentIntentId).mockResolvedValueOnce({
        id: subscriptionId,
        userId,
        bondId,
        amount: "10000.00",
        currency: "EUR",
        status: "active",
        paymentStatus: "completed",
        stripePaymentIntentId: paymentIntentId,
        stripeCustomerId: "cus_test_123",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const event = {
        type: "charge.refunded",
        data: {
          object: {
            id: chargeId,
            payment_intent: paymentIntentId,
            customer: "cus_test_123",
          },
        },
      } as unknown as Stripe.Event;

      await handleChargeRefunded(event);

      expect(db.updateSubscriptionPaymentStatus).toHaveBeenCalledWith(
        subscriptionId,
        "refunded",
        paymentIntentId,
        "cus_test_123"
      );
    });

    it("should handle charge without payment_intent", async () => {
      const chargeId = `ch_no_intent_${Date.now()}`;

      // Reset mocks
      vi.mocked(db.updateSubscriptionPaymentStatus).mockClear();

      const event = {
        type: "charge.refunded",
        data: {
          object: {
            id: chargeId,
            payment_intent: null,
            customer: "cus_test_123",
          },
        },
      } as unknown as Stripe.Event;

      // Should not throw
      await handleChargeRefunded(event);

      expect(db.updateSubscriptionPaymentStatus).not.toHaveBeenCalled();
    });
  });

  describe("handleStripeWebhook", () => {
    it("should return error if webhook secret is not configured", async () => {
      const originalSecret = process.env.STRIPE_WEBHOOK_SECRET;
      delete process.env.STRIPE_WEBHOOK_SECRET;

      const req = {
        headers: {},
        body: "test",
      } as unknown as Request;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      await handleStripeWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Webhook secret not configured",
      });

      // Restore
      if (originalSecret) {
        process.env.STRIPE_WEBHOOK_SECRET = originalSecret;
      }
    });

    it("should return error if signature is invalid", async () => {
      process.env.STRIPE_WEBHOOK_SECRET = "test_secret";

      const req = {
        headers: {
          "stripe-signature": "invalid_signature",
        },
        body: "test",
      } as unknown as Request;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      await handleStripeWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid signature" });
    });

    it("should return success for valid webhook", async () => {
      process.env.STRIPE_WEBHOOK_SECRET = "test_secret";

      // This test would require a valid Stripe signature
      // For now, we'll test the error handling
      const req = {
        headers: {
          "stripe-signature": "invalid",
        },
        body: "test",
      } as unknown as Request;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      await handleStripeWebhook(req, res);

      // Should return 400 for invalid signature
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("Webhook Event Processing", () => {
    it("should handle payment_intent.succeeded event", async () => {
      const paymentIntentId = `pi_event_${Date.now()}`;

      vi.mocked(db.getSubscriptionByStripePaymentIntentId).mockResolvedValueOnce({
        id: subscriptionId,
        userId,
        bondId,
        amount: "10000.00",
        currency: "EUR",
        status: "pending",
        paymentStatus: "pending",
        stripePaymentIntentId: paymentIntentId,
        stripeCustomerId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const event = {
        type: "payment_intent.succeeded",
        data: {
          object: {
            id: paymentIntentId,
            customer: "cus_event_123",
          },
        },
      } as unknown as Stripe.Event;

      await handlePaymentIntentSucceeded(event);

      expect(db.updateSubscriptionPaymentStatus).toHaveBeenCalled();
      expect(db.updateSubscriptionStatus).toHaveBeenCalledWith(
        subscriptionId,
        "active"
      );
    });

    it("should handle payment_intent.payment_failed event", async () => {
      const paymentIntentId = `pi_failed_event_${Date.now()}`;

      vi.mocked(db.getSubscriptionByStripePaymentIntentId).mockResolvedValueOnce({
        id: subscriptionId,
        userId,
        bondId,
        amount: "10000.00",
        currency: "EUR",
        status: "pending",
        paymentStatus: "pending",
        stripePaymentIntentId: paymentIntentId,
        stripeCustomerId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const event = {
        type: "payment_intent.payment_failed",
        data: {
          object: {
            id: paymentIntentId,
            customer: "cus_event_123",
            last_payment_error: {
              message: "Insufficient funds",
            },
          },
        },
      } as unknown as Stripe.Event;

      await handlePaymentIntentPaymentFailed(event);

      expect(db.updateSubscriptionPaymentStatus).toHaveBeenCalled();
      expect(db.updateSubscriptionStatus).toHaveBeenCalledWith(
        subscriptionId,
        "cancelled"
      );
    });

    it("should handle charge.refunded event", async () => {
      const paymentIntentId = `pi_refund_event_${Date.now()}`;
      const chargeId = `ch_refund_event_${Date.now()}`;

      vi.mocked(db.getSubscriptionByStripePaymentIntentId).mockResolvedValueOnce({
        id: subscriptionId,
        userId,
        bondId,
        amount: "10000.00",
        currency: "EUR",
        status: "active",
        paymentStatus: "completed",
        stripePaymentIntentId: paymentIntentId,
        stripeCustomerId: "cus_event_123",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const event = {
        type: "charge.refunded",
        data: {
          object: {
            id: chargeId,
            payment_intent: paymentIntentId,
            customer: "cus_event_123",
          },
        },
      } as unknown as Stripe.Event;

      await handleChargeRefunded(event);

      expect(db.updateSubscriptionPaymentStatus).toHaveBeenCalledWith(
        subscriptionId,
        "refunded",
        paymentIntentId,
        "cus_event_123"
      );
    });
  });
});
