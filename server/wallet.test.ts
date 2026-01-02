import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: "user" | "admin" = "user"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: role,
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

function createUnauthenticatedContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("wallet procedures", () => {
  describe("wallet.myWallets", () => {
    it("returns empty array for user without wallets", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.wallet.myWallets();

      expect(Array.isArray(result)).toBe(true);
    });

    it("throws UNAUTHORIZED for unauthenticated users", async () => {
      const ctx = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.wallet.myWallets()).rejects.toThrow();
    });
  });

  describe("wallet.transactions", () => {
    it("returns empty array for user without transactions", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.wallet.transactions();

      expect(Array.isArray(result)).toBe(true);
    });
  });
});

describe("subscription procedures", () => {
  describe("subscriptions.mySubscriptions", () => {
    it("returns empty array for user without subscriptions", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.subscriptions.mySubscriptions();

      expect(Array.isArray(result)).toBe(true);
    });

    it("throws UNAUTHORIZED for unauthenticated users", async () => {
      const ctx = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.subscriptions.mySubscriptions()).rejects.toThrow();
    });
  });
});

describe("risk profile procedures", () => {
  describe("riskProfile.my", () => {
    it("returns null for user without risk profile", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.riskProfile.my();

      expect(result).toBeUndefined();
    });
  });
});
