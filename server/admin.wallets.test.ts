import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import * as db from "./db";

describe("Admin Wallet Management", () => {
  describe("getAllWalletsWithUserInfo", () => {
    it("should return an array of wallets with user info", async () => {
      const wallets = await db.getAllWalletsWithUserInfo();
      expect(Array.isArray(wallets)).toBe(true);
      
      if (wallets.length > 0) {
        const wallet = wallets[0];
        expect(wallet).toHaveProperty("id");
        expect(wallet).toHaveProperty("userId");
        expect(wallet).toHaveProperty("email");
        expect(wallet).toHaveProperty("name");
        expect(wallet).toHaveProperty("currency");
        expect(wallet).toHaveProperty("balance");
        expect(wallet).toHaveProperty("availableBalance");
      }
    });
  });

  describe("adjustWalletBalance", () => {
    it("should update wallet balance and create transaction", async () => {
      // Get first wallet
      const wallets = await db.getAllWalletsWithUserInfo();
      if (wallets.length === 0) {
        console.log("Skipping test: No wallets found");
        return;
      }

      const wallet = wallets[0];
      const newBalance = "750000";
      const reason = "Test adjustment";
      const adminId = 1;

      // Adjust balance
      await db.adjustWalletBalance(wallet.id, newBalance, reason, adminId);

      // Verify balance was updated
      const updatedWallets = await db.getAllWalletsWithUserInfo();
      const updatedWallet = updatedWallets.find((w) => w.id === wallet.id);
      
      // Decimal values are stored with 8 decimal places
      expect(updatedWallet?.balance).toContain(newBalance);
      expect(updatedWallet?.availableBalance).toContain(newBalance);
    });
  });

  describe("getPendingWithdrawals", () => {
    it("should return array of pending withdrawals", async () => {
      const withdrawals = await db.getPendingWithdrawals();
      expect(Array.isArray(withdrawals)).toBe(true);
      
      // All returned withdrawals should have pending status
      withdrawals.forEach((withdrawal) => {
        expect(withdrawal.status).toBe("pending");
        expect(withdrawal.type).toBe("withdrawal");
      });
    });
  });

  describe("approveWithdrawal", () => {
    it("should update withdrawal status to processing", async () => {
      const withdrawals = await db.getPendingWithdrawals();
      if (withdrawals.length === 0) {
        console.log("Skipping test: No pending withdrawals found");
        return;
      }

      const withdrawal = withdrawals[0];
      const adminId = 1;

      // Approve withdrawal
      await db.approveWithdrawal(withdrawal.id, adminId);

      // Verify status was updated
      const transactions = await db.getWalletTransactionsForAdmin(100);
      const updatedTransaction = transactions.find((t) => t.id === withdrawal.id);
      
      expect(updatedTransaction?.status).toBe("processing");
      expect(updatedTransaction?.approvedBy).toBe(adminId);
    });
  });

  describe("rejectWithdrawal", () => {
    it("should update withdrawal status to cancelled with reason", async () => {
      const withdrawals = await db.getPendingWithdrawals();
      if (withdrawals.length === 0) {
        console.log("Skipping test: No pending withdrawals found");
        return;
      }

      const withdrawal = withdrawals[0];
      const reason = "Insufficient documentation";
      const adminId = 1;

      // Reject withdrawal
      await db.rejectWithdrawal(withdrawal.id, reason, adminId);

      // Verify status was updated
      const transactions = await db.getWalletTransactionsForAdmin(100);
      const updatedTransaction = transactions.find((t) => t.id === withdrawal.id);
      
      expect(updatedTransaction?.status).toBe("cancelled");
      expect(updatedTransaction?.description).toContain("Rejected");
      expect(updatedTransaction?.description).toContain(reason);
    });
  });

  describe("getWalletTransactionsForAdmin", () => {
    it("should return transactions with user info", async () => {
      const transactions = await db.getWalletTransactionsForAdmin(50);
      expect(Array.isArray(transactions)).toBe(true);
      
      if (transactions.length > 0) {
        const transaction = transactions[0];
        expect(transaction).toHaveProperty("id");
        expect(transaction).toHaveProperty("userId");
        expect(transaction).toHaveProperty("email");
        expect(transaction).toHaveProperty("name");
        expect(transaction).toHaveProperty("type");
        expect(transaction).toHaveProperty("amount");
        expect(transaction).toHaveProperty("status");
      }
    });

    it("should respect limit parameter", async () => {
      const limit = 10;
      const transactions = await db.getWalletTransactionsForAdmin(limit);
      expect(transactions.length).toBeLessThanOrEqual(limit);
    });
  });
});
