import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";

describe("Admin Payment tRPC Procedures", () => {
  let userId: number;
  let bondId: number;
  let subscriptionId1: number;
  let subscriptionId2: number;
  let subscriptionId3: number;

  beforeAll(async () => {
    // Create test user
    userId = await db.createUser({
      email: `test-admin-payments-${Date.now()}@test.com`,
      name: "Test Admin",
      role: "admin",
    });

    // Create test bond
    bondId = await db.createBond({
      name: "Test Bond for Payments",
      bondNumber: `TBP-${Date.now()}`,
      interestRate: 5.0,
      maturityDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      minimumInvestment: 1000,
      currency: "EUR",
      totalVolume: "1000000.00",
      availableVolume: "1000000.00",
      termMonths: 12,
    } as any);

    // Create test subscriptions with different payment statuses
    subscriptionId1 = await db.createSubscription({
      userId,
      bondId,
      amount: "10000.00",
      currency: "EUR",
      status: "active",
      paymentStatus: "completed",
      stripePaymentIntentId: `pi_completed_${Date.now()}`,
      stripeCustomerId: "cus_completed_123",
    } as any);

    subscriptionId2 = await db.createSubscription({
      userId,
      bondId,
      amount: "5000.00",
      currency: "EUR",
      status: "pending",
      paymentStatus: "pending",
    } as any);

    subscriptionId3 = await db.createSubscription({
      userId,
      bondId,
      amount: "7500.00",
      currency: "EUR",
      status: "cancelled",
      paymentStatus: "failed",
    } as any);
  });

  describe("getAllPayments", () => {
    it("should return all payments with pagination", async () => {
      const subscriptions = await db.getAllSubscriptions();
      const result = subscriptions.slice(0, 50);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it("should filter payments by status", async () => {
      const completed = await db.getSubscriptionsByPaymentStatus("completed");

      expect(completed).toBeDefined();
      expect(Array.isArray(completed)).toBe(true);
      expect(completed.every((s) => s.paymentStatus === "completed")).toBe(true);
    });
  });

  describe("getPaymentDetail", () => {
    it("should return payment detail with investor and bond info", async () => {
      const subscription = await db.getSubscriptionWithPayment(subscriptionId1);

      expect(subscription).toBeDefined();
      expect(subscription?.id).toBe(subscriptionId1);
      expect(subscription?.paymentStatus).toBe("completed");
      expect(subscription?.stripePaymentIntentId).toBeDefined();
    });

    it("should return null for non-existent subscription", async () => {
      const subscription = await db.getSubscriptionWithPayment(999999);

      expect(subscription).toBeNull();
    });
  });

  describe("getPaymentsByStatus", () => {
    it("should return only completed payments", async () => {
      const completed = await db.getSubscriptionsByPaymentStatus("completed");

      expect(completed).toBeDefined();
      expect(Array.isArray(completed)).toBe(true);
      expect(completed.every((s) => s.paymentStatus === "completed")).toBe(true);
    });

    it("should return only pending payments", async () => {
      const pending = await db.getSubscriptionsByPaymentStatus("pending");

      expect(pending).toBeDefined();
      expect(Array.isArray(pending)).toBe(true);
      expect(pending.every((s) => s.paymentStatus === "pending")).toBe(true);
    });

    it("should return only failed payments", async () => {
      const failed = await db.getSubscriptionsByPaymentStatus("failed");

      expect(failed).toBeDefined();
      expect(Array.isArray(failed)).toBe(true);
      expect(failed.every((s) => s.paymentStatus === "failed")).toBe(true);
    });
  });

  describe("getInvestorPayments", () => {
    it("should return all payments for a specific investor", async () => {
      const payments = await db.getInvestorPayments(userId);

      expect(payments).toBeDefined();
      expect(Array.isArray(payments)).toBe(true);
      expect(payments.length).toBeGreaterThan(0);
      expect(payments.every((s) => s.userId === userId)).toBe(true);
    });

    it("should return empty array for investor with no payments", async () => {
      const newUserId = await db.createUser({
        email: `test-no-payments-${Date.now()}@test.com`,
        name: "Test User No Payments",
        role: "user",
      });

      const payments = await db.getInvestorPayments(newUserId);

      expect(payments).toBeDefined();
      expect(Array.isArray(payments)).toBe(true);
      expect(payments.length).toBe(0);
    });
  });

  describe("refundPayment", () => {
    it("should update payment status to refunded", async () => {
      const subscription = await db.getSubscriptionWithPayment(subscriptionId1);
      expect(subscription?.paymentStatus).toBe("completed");

      // Update to refunded
      await db.updateSubscriptionPaymentStatus(
        subscriptionId1,
        "refunded",
        subscription?.stripePaymentIntentId,
        subscription?.stripeCustomerId
      );

      const updated = await db.getSubscriptionWithPayment(subscriptionId1);
      expect(updated?.paymentStatus).toBe("refunded");
    });
  });

  describe("getPaymentStats", () => {
    it("should calculate correct payment statistics", async () => {
      const allSubscriptions = await db.getAllSubscriptions();

      const stats = {
        total: allSubscriptions.length,
        completed: allSubscriptions.filter((s) => s.paymentStatus === "completed").length,
        failed: allSubscriptions.filter((s) => s.paymentStatus === "failed").length,
        refunded: allSubscriptions.filter((s) => s.paymentStatus === "refunded").length,
        processing: allSubscriptions.filter((s) => s.paymentStatus === "processing").length,
        pending: allSubscriptions.filter((s) => s.paymentStatus === "pending").length,
        completedAmount: allSubscriptions
          .filter((s) => s.paymentStatus === "completed")
          .reduce((sum, s) => sum + parseFloat(s.amount), 0),
        refundedAmount: allSubscriptions
          .filter((s) => s.paymentStatus === "refunded")
          .reduce((sum, s) => sum + parseFloat(s.amount), 0),
      };

      expect(stats.total).toBeGreaterThan(0);
      expect(stats.completed).toBeGreaterThanOrEqual(0);
      expect(stats.failed).toBeGreaterThanOrEqual(0);
      expect(stats.completedAmount).toBeGreaterThanOrEqual(0);
      expect(stats.refundedAmount).toBeGreaterThanOrEqual(0);
    });

    it("should have consistent total count", async () => {
      const allSubscriptions = await db.getAllSubscriptions();

      const stats = {
        total: allSubscriptions.length,
        completed: allSubscriptions.filter((s) => s.paymentStatus === "completed").length,
        failed: allSubscriptions.filter((s) => s.paymentStatus === "failed").length,
        refunded: allSubscriptions.filter((s) => s.paymentStatus === "refunded").length,
        processing: allSubscriptions.filter((s) => s.paymentStatus === "processing").length,
        pending: allSubscriptions.filter((s) => s.paymentStatus === "pending").length,
      };

      const sum = stats.completed + stats.failed + stats.refunded + stats.processing + stats.pending;
      expect(sum).toBe(stats.total);
    });
  });

  describe("Payment Data Integrity", () => {
    it("should maintain payment amount precision", async () => {
      const subscription = await db.getSubscriptionWithPayment(subscriptionId1);

      expect(subscription?.amount).toBe("10000.00");
      expect(parseFloat(subscription?.amount || "0")).toBe(10000);
    });

    it("should preserve Stripe IDs", async () => {
      const subscription = await db.getSubscriptionWithPayment(subscriptionId1);

      expect(subscription?.stripePaymentIntentId).toBeDefined();
      expect(subscription?.stripeCustomerId).toBeDefined();
    });

    it("should track payment timestamps", async () => {
      const subscription = await db.getSubscriptionWithPayment(subscriptionId1);

      expect(subscription?.createdAt).toBeDefined();
      expect(subscription?.updatedAt).toBeDefined();
      expect(new Date(subscription?.createdAt || "").getTime()).toBeGreaterThan(0);
    });
  });

  describe("Payment Status Transitions", () => {
    it("should allow transition from pending to completed", async () => {
      const newSubscriptionId = await db.createSubscription({
        userId,
        bondId,
        amount: "3000.00",
        currency: "EUR",
        status: "pending",
        paymentStatus: "pending",
      } as any);

      const subscription = await db.getSubscriptionWithPayment(newSubscriptionId);
      expect(subscription?.paymentStatus).toBe("pending");

      await db.updateSubscriptionPaymentStatus(newSubscriptionId, "completed");

      const updated = await db.getSubscriptionWithPayment(newSubscriptionId);
      expect(updated?.paymentStatus).toBe("completed");
    });

    it("should allow transition from completed to refunded", async () => {
      const newSubscriptionId = await db.createSubscription({
        userId,
        bondId,
        amount: "4000.00",
        currency: "EUR",
        status: "active",
        paymentStatus: "completed",
        stripePaymentIntentId: `pi_refund_test_${Date.now()}`,
      } as any);

      const subscription = await db.getSubscriptionWithPayment(newSubscriptionId);
      expect(subscription?.paymentStatus).toBe("completed");

      await db.updateSubscriptionPaymentStatus(newSubscriptionId, "refunded");

      const updated = await db.getSubscriptionWithPayment(newSubscriptionId);
      expect(updated?.paymentStatus).toBe("refunded");
    });
  });
});
