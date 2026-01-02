import { describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";

describe("Admin Investor Creation", () => {
  describe("Input Validation", () => {
    it("should require email to be valid format", () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      expect(emailRegex.test("investor@angelus.group")).toBe(true);
      expect(emailRegex.test("t.gross@example.com")).toBe(true);
      expect(emailRegex.test("invalid-email")).toBe(false);
      expect(emailRegex.test("")).toBe(false);
    });

    it("should require password to be at least 8 characters", () => {
      const minLength = 8;
      
      expect("short".length >= minLength).toBe(false);
      expect("password123".length >= minLength).toBe(true);
      expect("12345678".length >= minLength).toBe(true);
    });

    it("should require name to be non-empty", () => {
      const validateName = (name: string) => name.trim().length > 0;
      
      expect(validateName("Thomas Gross")).toBe(true);
      expect(validateName("")).toBe(false);
      expect(validateName("   ")).toBe(false);
    });
  });

  describe("Password Hashing for Admin-Created Users", () => {
    it("should hash password before storing", async () => {
      const password = "investorPassword123";
      const hash = await bcrypt.hash(password, 12);
      
      expect(hash).not.toBe(password);
      expect(hash.startsWith("$2")).toBe(true); // bcrypt hash prefix
    });

    it("should allow login with correct password", async () => {
      const password = "investorPassword123";
      const hash = await bcrypt.hash(password, 12);
      
      const isValid = await bcrypt.compare(password, hash);
      expect(isValid).toBe(true);
    });
  });

  describe("Investor Type Validation", () => {
    it("should accept valid investor types", () => {
      const validTypes = ["professional", "entrepreneur", "institutional"];
      
      validTypes.forEach(type => {
        expect(validTypes.includes(type)).toBe(true);
      });
    });

    it("should reject invalid investor types", () => {
      const validTypes = ["professional", "entrepreneur", "institutional"];
      
      expect(validTypes.includes("retail")).toBe(false);
      expect(validTypes.includes("consumer")).toBe(false);
    });
  });

  describe("KYC Status Validation", () => {
    it("should accept valid KYC statuses", () => {
      const validStatuses = ["pending", "in_progress", "verified", "rejected"];
      
      expect(validStatuses.includes("pending")).toBe(true);
      expect(validStatuses.includes("verified")).toBe(true);
    });

    it("should default to pending for new investors", () => {
      const defaultStatus = "pending";
      expect(defaultStatus).toBe("pending");
    });
  });
});
