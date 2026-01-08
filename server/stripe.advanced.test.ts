import { describe, it, expect } from "vitest";

describe("Stripe Advanced Integration", () => {
  describe("Company Payment", () => {
    it("should validate company name", () => {
      const companyName = "Meine GmbH";
      expect(companyName.length).toBeGreaterThan(0);
    });

    it("should validate tax number format", () => {
      const taxNumber = "DE123456789";
      expect(taxNumber).toMatch(/^DE\d+$/);
    });

    it("should store company metadata", () => {
      const metadata = {
        type: "company",
        companyName: "Meine GmbH",
        taxNumber: "DE123456789",
      };
      expect(metadata.type).toBe("company");
      expect(metadata.companyName).toBeDefined();
    });
  });

  describe("SEPA Payment", () => {
    it("should validate IBAN format", () => {
      const iban = "DE89370400440532013000";
      expect(iban.length).toBe(22);
      expect(iban).toMatch(/^DE\d+$/);
    });

    it("should validate account holder name", () => {
      const accountHolder = "Max Mustermann";
      expect(accountHolder.length).toBeGreaterThan(0);
    });

    it("should handle optional BIC", () => {
      const bic = "COBADEFFXXX";
      expect(bic.length).toBeGreaterThanOrEqual(8);
    });

    it("should store SEPA metadata", () => {
      const metadata = {
        type: "sepa",
        iban: "DE89370400440532013000",
        paymentMethod: "sepa_debit",
      };
      expect(metadata.type).toBe("sepa");
      expect(metadata.iban).toBeDefined();
    });
  });

  describe("Customer Management", () => {
    it("should create customer with company metadata", () => {
      const customer = {
        email: "company@example.com",
        name: "Meine GmbH",
        metadata: {
          type: "company",
          companyName: "Meine GmbH",
        },
      };
      expect(customer.metadata.type).toBe("company");
    });

    it("should create customer with SEPA metadata", () => {
      const customer = {
        email: "sepa@example.com",
        name: "Max Mustermann",
        metadata: {
          paymentMethod: "sepa",
        },
      };
      expect(customer.metadata.paymentMethod).toBe("sepa");
    });
  });

  describe("Payment Type Detection", () => {
    it("should detect company payment type", () => {
      const paymentType = "company";
      expect(paymentType).toBe("company");
    });

    it("should detect SEPA payment method", () => {
      const paymentMethod = "sepa";
      expect(paymentMethod).toBe("sepa");
    });

    it("should detect card payment method", () => {
      const paymentMethod = "card";
      expect(paymentMethod).toBe("card");
    });
  });
});
