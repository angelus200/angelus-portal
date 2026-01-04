import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as db from "./db";

describe("Admin Subscription Management", () => {
  describe("getSubscriptionsForAdmin", () => {
    it("should return an array of subscriptions with user and bond info", async () => {
      const subscriptions = await db.getSubscriptionsForAdmin(100);
      expect(Array.isArray(subscriptions)).toBe(true);

      if (subscriptions.length > 0) {
        const subscription = subscriptions[0];
        expect(subscription).toHaveProperty("id");
        expect(subscription).toHaveProperty("userId");
        expect(subscription).toHaveProperty("email");
        expect(subscription).toHaveProperty("name");
        expect(subscription).toHaveProperty("bondId");
        expect(subscription).toHaveProperty("bondName");
        expect(subscription).toHaveProperty("amount");
        expect(subscription).toHaveProperty("currency");
        expect(subscription).toHaveProperty("status");
        expect(subscription).toHaveProperty("createdAt");
      }
    });

    it("should respect limit parameter", async () => {
      const limit = 10;
      const subscriptions = await db.getSubscriptionsForAdmin(limit);
      expect(subscriptions.length).toBeLessThanOrEqual(limit);
    });
  });

  describe("getSubscriptionDetailForAdmin", () => {
    it("should return subscription details with consents and payment schedule", async () => {
      const subscriptions = await db.getSubscriptionsForAdmin(1);
      if (subscriptions.length === 0) {
        console.log("Skipping test: No subscriptions found");
        return;
      }

      const detail = await db.getSubscriptionDetailForAdmin(subscriptions[0].id);
      expect(detail).not.toBeNull();

      if (detail) {
        expect(detail).toHaveProperty("id");
        expect(detail).toHaveProperty("email");
        expect(detail).toHaveProperty("bondName");
        expect(detail).toHaveProperty("amount");
        expect(detail).toHaveProperty("status");
        expect(detail).toHaveProperty("consents");
        expect(detail).toHaveProperty("paymentSchedule");
        expect(detail).toHaveProperty("kycStatus");
        expect(Array.isArray(detail.consents)).toBe(true);
        expect(Array.isArray(detail.paymentSchedule)).toBe(true);
      }
    });

    it("should return null for non-existent subscription", async () => {
      const detail = await db.getSubscriptionDetailForAdmin(999999);
      expect(detail).toBeNull();
    });
  });

  describe("getSubscriptionsByStatus", () => {
    it("should return subscriptions filtered by status", async () => {
      const subscriptions = await db.getSubscriptionsByStatus("pending", 100);
      expect(Array.isArray(subscriptions)).toBe(true);

      // All returned subscriptions should have pending status
      subscriptions.forEach((sub) => {
        expect(sub.status).toBe("pending");
      });
    });

    it("should respect limit parameter", async () => {
      const limit = 5;
      const subscriptions = await db.getSubscriptionsByStatus("active", limit);
      expect(subscriptions.length).toBeLessThanOrEqual(limit);
    });
  });

  describe("getSubscriptionsByBondForAdmin", () => {
    it("should return subscriptions for a specific bond", async () => {
      const allSubscriptions = await db.getSubscriptionsForAdmin(1);
      if (allSubscriptions.length === 0) {
        console.log("Skipping test: No subscriptions found");
        return;
      }

      const bondId = allSubscriptions[0].bondId;
      const subscriptions = await db.getSubscriptionsByBondForAdmin(bondId, 100);
      expect(Array.isArray(subscriptions)).toBe(true);

      // All returned subscriptions should have the specified bond
      subscriptions.forEach((sub) => {
        expect(sub.bondId).toBe(bondId);
      });
    });
  });

  describe("updateSubscriptionStatus", () => {
    it("should update subscription status", async () => {
      const subscriptions = await db.getSubscriptionsForAdmin(1);
      if (subscriptions.length === 0) {
        console.log("Skipping test: No subscriptions found");
        return;
      }

      const subscription = subscriptions[0];
      const newStatus = subscription.status === "pending" ? "confirmed" : "pending";

      // Update status
      await db.updateSubscriptionStatus(subscription.id, newStatus as any);

      // Verify status was updated
      const updated = await db.getSubscriptionDetailForAdmin(subscription.id);
      expect(updated?.status).toBe(newStatus);

      // Restore original status
      await db.updateSubscriptionStatus(subscription.id, subscription.status as any);
    });
  });
});
