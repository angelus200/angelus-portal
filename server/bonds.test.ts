import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database module
vi.mock("./db", () => ({
  getAllBonds: vi.fn().mockResolvedValue([
    {
      id: 1,
      name: "Test Bond",
      description: "Test Description",
      isin: "CH0000000001",
      totalVolume: "1000000.00",
      availableVolume: "500000.00",
      minSubscription: "100000.00",
      interestRate: "8.00",
      termMonths: 36,
      status: "active",
      riskCategory: "high",
      governingLaw: "Swiss",
      hasSubordination: true,
      hasInsolvencyReservation: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  getActiveBonds: vi.fn().mockResolvedValue([
    {
      id: 1,
      name: "Test Bond",
      status: "active",
      interestRate: "8.00",
      termMonths: 36,
      minSubscription: "100000.00",
      totalVolume: "1000000.00",
      availableVolume: "500000.00",
      riskCategory: "high",
      governingLaw: "Swiss",
      hasSubordination: true,
      hasInsolvencyReservation: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  getBondById: vi.fn().mockResolvedValue({
    id: 1,
    name: "Test Bond",
    description: "Test Description",
    isin: "CH0000000001",
    totalVolume: "1000000.00",
    availableVolume: "500000.00",
    minSubscription: "100000.00",
    interestRate: "8.00",
    termMonths: 36,
    status: "active",
    riskCategory: "high",
    governingLaw: "Swiss",
    hasSubordination: true,
    hasInsolvencyReservation: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    phone: null,
    company: null,
    address: null,
    country: null,
    kycStatus: "verified",
    kycVerifiedAt: null,
    kycExternalId: null,
    investorType: null,
    isAccredited: false,
    riskProfileId: null,
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

function createInvestorContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "investor-user",
    email: "investor@example.com",
    name: "Investor User",
    loginMethod: "manus",
    role: "user",
    phone: null,
    company: null,
    address: null,
    country: null,
    kycStatus: "verified",
    kycVerifiedAt: null,
    kycExternalId: null,
    investorType: "professional",
    isAccredited: true,
    riskProfileId: 1,
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

function createPublicContext(): TrpcContext {
  return {
    user: null,
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

describe("bonds.list", () => {
  it("returns active bonds for admin users", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.bonds.list();

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("bonds.listAll", () => {
  it("returns all bonds for admin users", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.bonds.listAll();

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("bonds.getById", () => {
  it("returns bond details for authenticated users", async () => {
    const ctx = createInvestorContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.bonds.getById({ id: 1 });

    expect(result).toBeDefined();
    expect(result?.id).toBe(1);
    expect(result?.name).toBe("Test Bond");
    expect(result?.governingLaw).toBe("Swiss");
  });
});
