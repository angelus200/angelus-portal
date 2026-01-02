import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
      ip: "127.0.0.1",
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user",
    email: "user@example.com",
    name: "Regular User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
      ip: "127.0.0.1",
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Investor Import", () => {
  describe("validateImport", () => {
    it("should validate investor data and return results", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.investors.validateImport({
        investors: [
          {
            email: "valid@example.com",
            firstName: "Max",
            lastName: "Mustermann",
          },
          {
            email: "invalid-email",
            firstName: "Hans",
          },
        ],
      });

      expect(result.total).toBe(2);
      expect(result.valid).toBe(1);
      expect(result.invalid).toBe(1);
      expect(result.results).toHaveLength(2);
      
      // First investor should be valid
      expect(result.results[0].valid).toBe(true);
      expect(result.results[0].errors).toHaveLength(0);
      
      // Second investor should be invalid (bad email)
      expect(result.results[1].valid).toBe(false);
      expect(result.results[1].errors.length).toBeGreaterThan(0);
    });

    it("should warn about missing names", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.investors.validateImport({
        investors: [
          {
            email: "noname@example.com",
          },
        ],
      });

      expect(result.results[0].valid).toBe(true);
      expect(result.results[0].warnings.length).toBeGreaterThan(0);
      expect(result.results[0].warnings[0]).toContain("Name");
    });

    it("should validate IBAN format", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.investors.validateImport({
        investors: [
          {
            email: "bank@example.com",
            firstName: "Test",
            lastName: "User",
            bankIban: "CH12", // Too short
          },
        ],
      });

      expect(result.results[0].valid).toBe(false);
      expect(result.results[0].errors.some(e => e.includes("IBAN"))).toBe(true);
    });

    it("should validate subscription data", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.investors.validateImport({
        investors: [
          {
            email: "investor@example.com",
            firstName: "Test",
            lastName: "User",
            subscriptions: [
              {
                bondName: "", // Empty bond name
                amount: 0, // Invalid amount
              },
            ],
          },
        ],
      });

      expect(result.results[0].valid).toBe(false);
      expect(result.results[0].errors.some(e => e.includes("Anleihen-Name") || e.includes("Betrag"))).toBe(true);
    });
  });

  describe("Access Control", () => {
    it("should deny access to non-admin users for validateImport", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.investors.validateImport({
          investors: [{ email: "test@example.com" }],
        })
      ).rejects.toThrow();
    });

    it("should deny access to non-admin users for import", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.investors.import({
          investors: [{ email: "test@example.com" }],
          updateExisting: false,
        })
      ).rejects.toThrow();
    });
  });
});
