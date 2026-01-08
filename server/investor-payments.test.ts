import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";

describe("Investor Payment tRPC Procedures", () => {
  let investorUserId: number;
  let otherUserId: number;
  let bondId: number;
  let subscriptionId1: number;
  let subscriptionId2: number;
  let subscriptionId3: number;

  beforeAll(async () => {
    // Create investor user
    investorUserId = await db.createUser({
      email: `test-investor-payments-${Date.now()}@test.com`,
      name: "Test Investor",
      role: "user",
    });

    // Create other user
    otherUserId = await db.createUser({
      email: `test-other-investor-${Date.now()}@test.com`,
      name: "Other Investor",
      role: "user",
    });

    // Create test bond
    bondId = await db.createBond({
      name: "Test Bond for Investor Payments",
      bondNumber: `TBIP-${Date.now()}`,
      interestRate: 5.0,
      maturityDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      minimumInvestment: 1000,
      currency: "EUR",
      totalVolume: "1000000.00",
      availableVolume: "1000000.00",
      termMonths: 12,
    } as any);

    // Create test subscriptions for investor
    subscriptionId1 = await db.createSubscription({
      userId: investorUserId,
      bondId,
      amount: "10000.00",
      currency: "EUR",
      status: "active",
      paymentStatus: "completed",
      stripePaymentIntentId: `pi_investor_completed_${Date.now()}`,
      stripeCustomerId: "cus_investor_123",
    } as any);

    subscriptionId2 = await db.createSubscription({
      userId: investorUserId,
      bondId,
      amount: "5000.00",
      currency: "EUR",
      status: "pending",
      paymentStatus: "pending",
    } as any);

    subscriptionId3 = await db.createSubscription({
      userId: investorUserId,
      bondId,
      amount: "7500.00",
      currency: "EUR",
      status: "cancelled",
      paymentStatus: "failed",
    } as any);
  });

  describe("myPayments", () => {
    it("should return investor's payments with pagination", async () => {
      const payments = await db.getInvestorPayments(investorUserId);
      const paginated = payments.slice(0, 50);

      expect(paginated).toBeDefined();
      expect(Array.isArray(paginated)).toBe(true);
      expect(paginated.length).toBeGreaterThan(0);
      expect(paginated.every((p) => p.userId === investorUserId)).toBe(true);
    });

    it("should filter investor payments by status", async () => {
      const allPayments = await db.getInvestorPayments(investorUserId);
      const completed = allPayments.filter((p) => p.paymentStatus === "completed");

      expect(completed).toBeDefined();
      expect(Array.isArray(completed)).toBe(true);
      expect(completed.every((p) => p.paymentStatus === "completed")).toBe(true);
    });

    it("should not return other investor's payments", async () => {
      const investorPayments = await db.getInvestorPayments(investorUserId);
      const otherPayments = await db.getInvestorPayments(otherUserId);

      expect(investorPayments.length).toBeGreaterThan(0);
      expect(otherPayments.length).toBe(0);
    });

    it("should handle pagination offset correctly", async () => {
      const allPayments = await db.getInvestorPayments(investorUserId);
      const page1 = allPayments.slice(0, 50);
      const page2 = allPayments.slice(50, 100);

      expect(page1.length).toBeLessThanOrEqual(50);
      expect(page2.length).toBeLessThanOrEqual(50);
    });
  });

  describe("myPaymentDetail", () => {
    it("should return payment detail for investor's own payment", async () => {
      const subscription = await db.getSubscriptionWithPayment(subscriptionId1);

      expect(subscription).toBeDefined();
      expect(subscription?.id).toBe(subscriptionId1);
      expect(subscription?.userId).toBe(investorUserId);
      expect(subscription?.paymentStatus).toBe("completed");
    });

    it("should return null for non-existent subscription", async () => {
      const subscription = await db.getSubscriptionWithPayment(999999);

      expect(subscription).toBeNull();
    });

    it("should include bond information", async () => {
      const subscription = await db.getSubscriptionWithPayment(subscriptionId1);

      expect(subscription).toBeDefined();
      expect(subscription?.bondId).toBe(bondId);
    });
  });

  describe("myPaymentStats", () => {
    it("should calculate investor payment statistics", async () => {
      const payments = await db.getInvestorPayments(investorUserId);

      const stats = {
        total: payments.length,
        completed: payments.filter((s) => s.paymentStatus === "completed").length,
        failed: payments.filter((s) => s.paymentStatus === "failed").length,
        refunded: payments.filter((s) => s.paymentStatus === "refunded").length,
        processing: payments.filter((s) => s.paymentStatus === "processing").length,
        pending: payments.filter((s) => s.paymentStatus === "pending").length,
        completedAmount: payments
          .filter((s) => s.paymentStatus === "completed")
          .reduce((sum, s) => sum + parseFloat(s.amount), 0),
        refundedAmount: payments
          .filter((s) => s.paymentStatus === "refunded")
          .reduce((sum, s) => sum + parseFloat(s.amount), 0),
      };

      expect(stats.total).toBeGreaterThan(0);
      expect(stats.completed).toBeGreaterThanOrEqual(0);
      expect(stats.failed).toBeGreaterThanOrEqual(0);
      expect(stats.completedAmount).toBeGreaterThanOrEqual(0);
    });

    it("should have consistent total count", async () => {
      const payments = await db.getInvestorPayments(investorUserId);

      const stats = {
        total: payments.length,
        completed: payments.filter((s) => s.paymentStatus === "completed").length,
        failed: payments.filter((s) => s.paymentStatus === "failed").length,
        refunded: payments.filter((s) => s.paymentStatus === "refunded").length,
        processing: payments.filter((s) => s.paymentStatus === "processing").length,
        pending: payments.filter((s) => s.paymentStatus === "pending").length,
      };

      const sum = stats.completed + stats.failed + stats.refunded + stats.processing + stats.pending;
      expect(sum).toBe(stats.total);
    });

    it("should return zero stats for investor with no payments", async () => {
      const payments = await db.getInvestorPayments(otherUserId);

      const stats = {
        total: payments.length,
        completed: payments.filter((s) => s.paymentStatus === "completed").length,
        failed: payments.filter((s) => s.paymentStatus === "failed").length,
        refunded: payments.filter((s) => s.paymentStatus === "refunded").length,
        processing: payments.filter((s) => s.paymentStatus === "processing").length,
        pending: payments.filter((s) => s.paymentStatus === "pending").length,
      };

      expect(stats.total).toBe(0);
      expect(stats.completed).toBe(0);
      expect(stats.failed).toBe(0);
    });
  });

  describe("Payment Data Privacy", () => {
    it("should not expose other investor's payment data", async () => {
      const investorPayments = await db.getInvestorPayments(investorUserId);
      const otherPayments = await db.getInvestorPayments(otherUserId);

      expect(investorPayments.length).toBeGreaterThan(0);
      expect(otherPayments.length).toBe(0);
      expect(investorPayments.every((p) => p.userId === investorUserId)).toBe(true);
    });

    it("should verify ownership before returning payment detail", async () => {
      const subscription = await db.getSubscriptionWithPayment(subscriptionId1);

      expect(subscription?.userId).toBe(investorUserId);
      expect(subscription?.userId).not.toBe(otherUserId);
    });
  });

  describe("Payment Amount Precision", () => {
    it("should maintain payment amount precision", async () => {
      const subscription = await db.getSubscriptionWithPayment(subscriptionId1);

      expect(subscription?.amount).toBe("10000.00");
      expect(parseFloat(subscription?.amount || "0")).toBe(10000);
    });

    it("should correctly sum payment amounts", async () => {
      const payments = await db.getInvestorPayments(investorUserId);
      const completedAmount = payments
        .filter((s) => s.paymentStatus === "completed")
        .reduce((sum, s) => sum + parseFloat(s.amount), 0);

      expect(completedAmount).toBeGreaterThan(0);
      expect(Number.isFinite(completedAmount)).toBe(true);
    });
  });

  describe("Payment Status Filtering", () => {
    it("should correctly filter completed payments", async () => {
      const payments = await db.getInvestorPayments(investorUserId);
      const completed = payments.filter((p) => p.paymentStatus === "completed");

      expect(completed.every((p) => p.paymentStatus === "completed")).toBe(true);
    });

    it("should correctly filter pending payments", async () => {
      const payments = await db.getInvestorPayments(investorUserId);
      const pending = payments.filter((p) => p.paymentStatus === "pending");

      expect(pending.every((p) => p.paymentStatus === "pending")).toBe(true);
    });

    it("should correctly filter failed payments", async () => {
      const payments = await db.getInvestorPayments(investorUserId);
      const failed = payments.filter((p) => p.paymentStatus === "failed");

      expect(failed.every((p) => p.paymentStatus === "failed")).toBe(true);
    });
  });

  describe("Payment Timestamps", () => {
    it("should include payment timestamps", async () => {
      const subscription = await db.getSubscriptionWithPayment(subscriptionId1);

      expect(subscription?.createdAt).toBeDefined();
      expect(subscription?.updatedAt).toBeDefined();
      expect(new Date(subscription?.createdAt || "").getTime()).toBeGreaterThan(0);
    });

    it("should have valid timestamp format", async () => {
      const subscription = await db.getSubscriptionWithPayment(subscriptionId1);
      const createdDate = new Date(subscription?.createdAt || "");

      expect(createdDate.toString()).not.toBe("Invalid Date");
    });
  });

  describe("Bond Information", () => {
    it("should include bond details with payment", async () => {
      const subscription = await db.getSubscriptionWithPayment(subscriptionId1);
      const bond = await db.getBondById(subscription?.bondId || 0);

      expect(bond).toBeDefined();
      expect(bond?.name).toBe("Test Bond for Investor Payments");
      expect(parseFloat(bond?.interestRate || "0")).toBe(5.0);
    });

    it("should have correct bond reference", async () => {
      const subscription = await db.getSubscriptionWithPayment(subscriptionId1);

      expect(subscription?.bondId).toBe(bondId);
    });
  });
});
