import { router, protectedProcedure } from './_core/trpc';
import { TRPCError } from '@trpc/server';

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});
import { z } from 'zod';
import {
  createLegacyCustomer,
  getLegacyCustomerByContractNumber,
  getLegacyCustomerById,
  getAllLegacyCustomers,
  searchLegacyCustomers,
  updateLegacyCustomer,
  deleteLegacyCustomer,
  addLegacyCustomerDocument,
  getLegacyCustomerDocuments,
  deleteLegacyCustomerDocument,
  createInterestCalculation,
  getLegacyCustomerInterestCalculations,
  addPaymentToHistory,
  getLegacyCustomerPaymentHistory,
  updatePaymentStatus,
  getLegacyCustomersStatistics,
  getPendingPaymentsForCustomer,
  getUpcomingPayments,
} from './legacy-db';
import { Decimal } from 'decimal.js';

/**
 * Validation Schemas
 */
const createLegacyCustomerSchema = z.object({
  contractNumber: z.string().min(1, 'Vertragsnummer erforderlich'),
  firstName: z.string().min(1, 'Vorname erforderlich'),
  lastName: z.string().min(1, 'Nachname erforderlich'),
  email: z.string().email('Ungültige Email').optional(),
  phone: z.string().optional(),
  birthDate: z.date().optional(),
  street: z.string().optional(),
  houseNumber: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  iban: z.string().optional(),
  bic: z.string().optional(),
  accountHolder: z.string().optional(),
  bondId: z.number().optional(),
  bondNumber: z.string().optional(),
  contractDate: z.date().optional(),
  valueDate: z.date().optional(),
  investmentAmount: z.number().optional(),
  shareCount: z.number().optional(),
  shareValue: z.number().optional(),
  annualInterestRate: z.number().optional(),
  interestPaymentFrequency: z.enum(['monthly', 'quarterly', 'annual']).optional(),
  annualInterestDate: z.date().optional(),
  monthlyPaymentDay: z.number().optional(),
  maturityDate: z.date().optional(),
  termMonths: z.number().optional(),
  capitalGainsTax: z.number().optional(),
  solidaritySurcharge: z.number().optional(),
  churchTax: z.number().optional(),
  notes: z.string().optional(),
});

const updateLegacyCustomerSchema = z.object({
  id: z.number(),
  data: createLegacyCustomerSchema.partial(),
});

const documentUploadSchema = z.object({
  legacyCustomerId: z.number(),
  documentType: z.enum([
    'contract',
    'projection',
    'interest_calculation',
    'payment_confirmation',
    'tax_certificate',
    'bank_statement',
    'other',
  ]),
  fileName: z.string(),
  filePath: z.string(),
  fileSize: z.number().optional(),
  fileType: z.string().optional(),
  documentDate: z.date().optional(),
  description: z.string().optional(),
});

const interestCalculationSchema = z.object({
  legacyCustomerId: z.number(),
  calculationYear: z.number(),
  calculationMonth: z.number().optional(),
  periodStartDate: z.date(),
  periodEndDate: z.date(),
  annualInterest: z.number().optional(),
  monthlyInstallment: z.number().optional(),
  capitalGainsTaxAmount: z.number().optional(),
  solidaritySurchargeAmount: z.number().optional(),
  churchTaxAmount: z.number().optional(),
  totalTaxWithheld: z.number().optional(),
  netInterest: z.number().optional(),
  paymentDate: z.date(),
});

const paymentHistorySchema = z.object({
  legacyCustomerId: z.number(),
  interestCalculationId: z.number().optional(),
  paymentType: z.enum(['initial_investment', 'interest_payment', 'refund', 'adjustment']),
  paymentDate: z.date(),
  amount: z.number(),
  transactionReference: z.string().optional(),
  bankTransactionId: z.string().optional(),
  status: z.enum(['pending', 'confirmed', 'failed', 'cancelled']).optional(),
  notes: z.string().optional(),
});

/**
 * Legacy Customer Router
 */
export const legacyCustomerRouter = router({
  /**
   * Create a new legacy customer
   */
  create: adminProcedure.input(createLegacyCustomerSchema).mutation(async ({ input }) => {
    try {
      const result = await createLegacyCustomer(input);
      return {
        success: true,
        message: 'Bestandskunde erfolgreich erstellt',
        data: result,
      };
    } catch (error) {
      throw new Error(`Fehler beim Erstellen des Bestandskunden: ${error}`);
    }
  }),

  /**
   * Get legacy customer by contract number
   */
  getByContractNumber: adminProcedure
    .input(z.object({ contractNumber: z.string() }))
    .query(async ({ input }) => {
      try {
        const customer = await getLegacyCustomerByContractNumber(input.contractNumber);
        return customer;
      } catch (error) {
        throw new Error(`Fehler beim Abrufen des Bestandskunden: ${error}`);
      }
    }),

  /**
   * Get legacy customer by ID
   */
  getById: adminProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    try {
      const customer = await getLegacyCustomerById(input.id);
      return customer;
    } catch (error) {
      throw new Error(`Fehler beim Abrufen des Bestandskunden: ${error}`);
    }
  }),

  /**
   * Get all legacy customers with pagination
   */
  getAll: adminProcedure
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(50),
        status: z.enum(['pending', 'active', 'completed', 'cancelled']).optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const result = await getAllLegacyCustomers(input.page, input.limit, input.status);
        return result;
      } catch (error) {
        throw new Error(`Fehler beim Abrufen der Bestandskunden: ${error}`);
      }
    }),

  /**
   * Search legacy customers
   */
  search: adminProcedure
    .input(z.object({ query: z.string(), limit: z.number().default(20) }))
    .query(async ({ input }) => {
      try {
        const results = await searchLegacyCustomers(input.query, input.limit);
        return results;
      } catch (error) {
        throw new Error(`Fehler bei der Suche: ${error}`);
      }
    }),

  /**
   * Update legacy customer
   */
  update: adminProcedure.input(updateLegacyCustomerSchema).mutation(async ({ input }) => {
    try {
      const result = await updateLegacyCustomer(input.id, input.data);
      return {
        success: true,
        message: 'Bestandskunde erfolgreich aktualisiert',
        data: result,
      };
    } catch (error) {
      throw new Error(`Fehler beim Aktualisieren des Bestandskunden: ${error}`);
    }
  }),

  /**
   * Delete legacy customer
   */
  delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    try {
      const result = await deleteLegacyCustomer(input.id);
      return {
        success: true,
        message: 'Bestandskunde erfolgreich gelöscht',
        data: result,
      };
    } catch (error) {
      throw new Error(`Fehler beim Löschen des Bestandskunden: ${error}`);
    }
  }),

  /**
   * Document Management
   */
  documents: router({
    /**
     * Add document
     */
    add: adminProcedure.input(documentUploadSchema).mutation(async ({ input }) => {
      try {
        const result = await addLegacyCustomerDocument(input);
        return {
          success: true,
          message: 'Dokument erfolgreich hochgeladen',
          data: result,
        };
      } catch (error) {
        throw new Error(`Fehler beim Hochladen des Dokuments: ${error}`);
      }
    }),

    /**
     * Get documents for customer
     */
    getByCustomerId: adminProcedure
      .input(z.object({ legacyCustomerId: z.number() }))
      .query(async ({ input }) => {
        try {
          const documents = await getLegacyCustomerDocuments(input.legacyCustomerId);
          return documents;
        } catch (error) {
          throw new Error(`Fehler beim Abrufen der Dokumente: ${error}`);
        }
      }),

    /**
     * Delete document
     */
    delete: adminProcedure.input(z.object({ documentId: z.number() })).mutation(async ({ input }) => {
      try {
        const result = await deleteLegacyCustomerDocument(input.documentId);
        return {
          success: true,
          message: 'Dokument erfolgreich gelöscht',
          data: result,
        };
      } catch (error) {
        throw new Error(`Fehler beim Löschen des Dokuments: ${error}`);
      }
    }),
  }),

  /**
   * Interest Calculations
   */
  interestCalculations: router({
    /**
     * Create interest calculation
     */
    create: adminProcedure.input(interestCalculationSchema).mutation(async ({ input }) => {
      try {
        const result = await createInterestCalculation(input);
        return {
          success: true,
          message: 'Zinsberechnung erfolgreich erstellt',
          data: result,
        };
      } catch (error) {
        throw new Error(`Fehler beim Erstellen der Zinsberechnung: ${error}`);
      }
    }),

    /**
     * Get interest calculations for customer
     */
    getByCustomerId: adminProcedure
      .input(z.object({ legacyCustomerId: z.number() }))
      .query(async ({ input }) => {
        try {
          const calculations = await getLegacyCustomerInterestCalculations(input.legacyCustomerId);
          return calculations;
        } catch (error) {
          throw new Error(`Fehler beim Abrufen der Zinsberechnungen: ${error}`);
        }
      }),
  }),

  /**
   * Payment History
   */
  paymentHistory: router({
    /**
     * Add payment
     */
    add: adminProcedure.input(paymentHistorySchema).mutation(async ({ input }) => {
      try {
        const result = await addPaymentToHistory(input);
        return {
          success: true,
          message: 'Zahlung erfolgreich erfasst',
          data: result,
        };
      } catch (error) {
        throw new Error(`Fehler beim Erfassen der Zahlung: ${error}`);
      }
    }),

    /**
     * Get payment history for customer
     */
    getByCustomerId: adminProcedure
      .input(z.object({ legacyCustomerId: z.number() }))
      .query(async ({ input }) => {
        try {
          const history = await getLegacyCustomerPaymentHistory(input.legacyCustomerId);
          return history;
        } catch (error) {
          throw new Error(`Fehler beim Abrufen der Zahlungshistorie: ${error}`);
        }
      }),

    /**
     * Update payment status
     */
    updateStatus: adminProcedure
      .input(
        z.object({
          paymentId: z.number(),
          status: z.enum(['pending', 'confirmed', 'failed', 'cancelled']),
        })
      )
      .mutation(async ({ input }) => {
        try {
          const result = await updatePaymentStatus(input.paymentId, input.status);
          return {
            success: true,
            message: 'Zahlungsstatus erfolgreich aktualisiert',
            data: result,
          };
        } catch (error) {
          throw new Error(`Fehler beim Aktualisieren des Zahlungsstatus: ${error}`);
        }
      }),
  }),

  /**
   * Statistics
   */
  statistics: router({
    /**
     * Get overall statistics
     */
    getOverall: adminProcedure.query(async () => {
      try {
        const stats = await getLegacyCustomersStatistics();
        return stats;
      } catch (error) {
        throw new Error(`Fehler beim Abrufen der Statistiken: ${error}`);
      }
    }),

    /**
     * Get pending payments for customer
     */
    getPendingPayments: adminProcedure
      .input(z.object({ legacyCustomerId: z.number() }))
      .query(async ({ input }) => {
        try {
          const payments = await getPendingPaymentsForCustomer(input.legacyCustomerId);
          return payments;
        } catch (error) {
          throw new Error(`Fehler beim Abrufen der ausstehenden Zahlungen: ${error}`);
        }
      }),

    /**
     * Get upcoming payments
     */
    getUpcoming: adminProcedure
      .input(z.object({ legacyCustomerId: z.number(), daysAhead: z.number().default(30) }))
      .query(async ({ input }) => {
        try {
          const payments = await getUpcomingPayments(input.legacyCustomerId, input.daysAhead);
          return payments;
        } catch (error) {
          throw new Error(`Fehler beim Abrufen der bevorstehenden Zahlungen: ${error}`);
        }
      }),
  }),
});
