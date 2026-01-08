import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  createUser,
  createBond,
  createSubscription,
  updateSubscriptionPaymentStatus,
  getSubscriptionByStripePaymentIntentId,
  getSubscriptionsByPaymentStatus,
  getInvestorPayments,
  getSubscriptionWithPayment,
} from "./db";

describe("Payment Tracking Functions", () => {
  let userId: number;
  let bondId: number;
  let subscriptionId: number;

  beforeAll(async () => {
    // Create test user
    userId = await createUser({
      email: `test-payment-${Date.now()}@test.com`,
      name: "Test User",
      role: "user",
    });

    // Create test bond
    bondId = await createBond({
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
    subscriptionId = await createSubscription({
      userId,
      bondId,
      amount: "10000.00",
      currency: "EUR",
      status: "pending",
    } as any);
  });

  it("should update subscription payment status", async () => {
    await updateSubscriptionPaymentStatus(
      subscriptionId,
      "processing",
      "pi_test_123",
      "cus_test_456"
    );

    const subscription = await getSubscriptionWithPayment(subscriptionId);
    expect(subscription?.paymentStatus).toBe("processing");
    expect(subscription?.stripePaymentIntentId).toBe("pi_test_123");
    expect(subscription?.stripeCustomerId).toBe("cus_test_456");
  });

  it("should mark payment as completed with timestamp", async () => {
    const beforeUpdate = new Date(Date.now() - 1000); // Add 1 second buffer
    await updateSubscriptionPaymentStatus(subscriptionId, "completed");
    const afterUpdate = new Date(Date.now() + 1000); // Add 1 second buffer

    const subscription = await getSubscriptionWithPayment(subscriptionId);
    expect(subscription?.paymentStatus).toBe("completed");
    expect(subscription?.paymentCompletedAt).toBeDefined();

    if (subscription?.paymentCompletedAt) {
      const completedTime = new Date(subscription.paymentCompletedAt);
      expect(completedTime.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
      expect(completedTime.getTime()).toBeLessThanOrEqual(afterUpdate.getTime());
    }
  });

  it("should mark payment as failed with timestamp", async () => {
    // Create another subscription for this test
    const subscriptionId2 = await createSubscription({
      userId,
      bondId,
      amount: "5000.00",
      currency: "EUR",
      status: "pending",
    } as any);

    const beforeUpdate = new Date(Date.now() - 1000); // Add 1 second buffer
    await updateSubscriptionPaymentStatus(subscriptionId2, "failed");
    const afterUpdate = new Date(Date.now() + 1000); // Add 1 second buffer

    const subscription = await getSubscriptionWithPayment(subscriptionId2);
    expect(subscription?.paymentStatus).toBe("failed");
    expect(subscription?.paymentFailedAt).toBeDefined();

    if (subscription?.paymentFailedAt) {
      const failedTime = new Date(subscription.paymentFailedAt);
      expect(failedTime.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
      expect(failedTime.getTime()).toBeLessThanOrEqual(afterUpdate.getTime());
    }
  });

  it("should find subscription by Stripe Payment Intent ID", async () => {
    const stripePaymentIntentId = `pi_${Date.now()}`;
    await updateSubscriptionPaymentStatus(
      subscriptionId,
      "processing",
      stripePaymentIntentId
    );

    const subscription = await getSubscriptionByStripePaymentIntentId(
      stripePaymentIntentId
    );
    expect(subscription).toBeDefined();
    expect(subscription?.id).toBe(subscriptionId);
    expect(subscription?.stripePaymentIntentId).toBe(stripePaymentIntentId);
  });

  it("should return null for non-existent Payment Intent ID", async () => {
    const subscription = await getSubscriptionByStripePaymentIntentId(
      "pi_nonexistent"
    );
    expect(subscription).toBeNull();
  });

  it("should get subscriptions by payment status", async () => {
    // Create multiple subscriptions with different statuses
    const sub1 = await createSubscription({
      userId,
      bondId,
      amount: "2000.00",
      currency: "EUR",
      status: "pending",
    } as any);

    const sub2 = await createSubscription({
      userId,
      bondId,
      amount: "3000.00",
      currency: "EUR",
      status: "pending",
    } as any);

    // Set different payment statuses
    await updateSubscriptionPaymentStatus(sub1, "completed");
    await updateSubscriptionPaymentStatus(sub2, "failed");

    // Get completed payments
    const completedPayments = await getSubscriptionsByPaymentStatus("completed");
    const hasCompletedSub1 = completedPayments.some((s) => s.id === sub1);
    expect(hasCompletedSub1).toBe(true);

    // Get failed payments
    const failedPayments = await getSubscriptionsByPaymentStatus("failed");
    const hasFailedSub2 = failedPayments.some((s) => s.id === sub2);
    expect(hasFailedSub2).toBe(true);
  });

  it("should get investor payments ordered by completion date", async () => {
    const payments = await getInvestorPayments(userId);
    expect(payments.length).toBeGreaterThan(0);
    expect(payments.some((p) => p.id === subscriptionId)).toBe(true);

    // Verify ordering - completed payments should come first
    for (let i = 0; i < payments.length - 1; i++) {
      const current = payments[i].paymentCompletedAt;
      const next = payments[i + 1].paymentCompletedAt;
      if (current && next) {
        expect(new Date(current).getTime()).toBeGreaterThanOrEqual(
          new Date(next).getTime()
        );
      }
    }
  });

  it("should get subscription with payment details", async () => {
    const stripeCustomerId = `cus_${Date.now()}`;
    await updateSubscriptionPaymentStatus(
      subscriptionId,
      "completed",
      undefined,
      stripeCustomerId
    );

    const subscription = await getSubscriptionWithPayment(subscriptionId);
    expect(subscription).toBeDefined();
    expect(subscription?.id).toBe(subscriptionId);
    expect(subscription?.stripeCustomerId).toBe(stripeCustomerId);
    expect(subscription?.paymentStatus).toBe("completed");
  });

  it("should validate payment status enum values", async () => {
    // Test all valid payment statuses
    const validStatuses = ["pending", "processing", "completed", "failed", "refunded"] as const;

    for (const status of validStatuses) {
    const testSub = await createSubscription({
      userId,
      bondId,
      amount: "1000.00",
      currency: "EUR",
      status: "pending",
    } as any);

      await updateSubscriptionPaymentStatus(testSub, status);
      const subscription = await getSubscriptionWithPayment(testSub);
      expect(subscription?.paymentStatus).toBe(status);
    }
  });

  it("should handle refunded payment status", async () => {
    const testSub = await createSubscription({
      userId,
      bondId,
      amount: "1500.00",
      currency: "EUR",
      status: "pending",
    } as any);

    // First complete the payment
    await updateSubscriptionPaymentStatus(testSub, "completed");
    let subscription = await getSubscriptionWithPayment(testSub);
    expect(subscription?.paymentStatus).toBe("completed");
    expect(subscription?.paymentCompletedAt).toBeDefined();

    // Then refund it
    await updateSubscriptionPaymentStatus(testSub, "refunded");
    subscription = await getSubscriptionWithPayment(testSub);
    expect(subscription?.paymentStatus).toBe("refunded");
  });
});
