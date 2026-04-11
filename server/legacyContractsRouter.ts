/**
 * Legacy Contracts tRPC Router
 * Bestandskunden-Verträge: Zeichnungsscheine, Einzahlungen, Zinszahlungen
 */

import { router, protectedProcedure, publicProcedure } from './_core/trpc';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import * as db from './db';
import { calculateContractStatus } from './legacy-calculation';

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin' && ctx.user.role !== 'superadmin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

const contractInput = z.object({
  userId: z.number().int().positive(),
  subscriptionId: z.number().int().positive().optional(),
  signedAmount: z.string().regex(/^\d+(\.\d+)?$/),
  interestRate: z.string().regex(/^\d+(\.\d+)?$/),
  penaltyRatePerDay: z.string().regex(/^\d+(\.\d+)?$/).default('0'),
  startDate: z.string(), // ISO date string YYYY-MM-DD
  endDate: z.string(),
  paymentInterval: z.enum(['monthly', 'quarterly', 'yearly', 'end_of_term']),
  currency: z.string().max(16).default('EUR'),
  status: z.enum(['active', 'completed', 'cancelled']).default('active'),
  notes: z.string().optional(),
});

export const legacyContractsRouter = router({
  // ==================== ADMIN ====================

  create: adminProcedure
    .input(contractInput)
    .mutation(async ({ input }) => {
      await db.createLegacyContract({
        userId: input.userId,
        subscriptionId: input.subscriptionId ?? null,
        signedAmount: input.signedAmount,
        paidAmount: '0',
        interestRate: input.interestRate,
        penaltyRatePerDay: input.penaltyRatePerDay,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        paymentInterval: input.paymentInterval,
        currency: input.currency,
        status: input.status,
        notes: input.notes ?? null,
      } as any);
      return { success: true };
    }),

  update: adminProcedure
    .input(z.object({
      id: z.number().int().positive(),
      data: contractInput.partial(),
    }))
    .mutation(async ({ input }) => {
      const patch: Record<string, unknown> = { ...input.data };
      if (input.data.startDate) patch.startDate = new Date(input.data.startDate);
      if (input.data.endDate) patch.endDate = new Date(input.data.endDate);
      await db.updateLegacyContract(input.id, patch as any);
      return { success: true };
    }),

  addPayment: adminProcedure
    .input(z.object({
      contractId: z.number().int().positive(),
      amount: z.string().regex(/^\d+(\.\d+)?$/),
      currency: z.string().max(16).default('EUR'),
      paidAt: z.string(), // YYYY-MM-DD
      txHash: z.string().max(128).optional(),
      bankReference: z.string().max(128).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const contract = await db.getLegacyContractById(input.contractId);
      if (!contract) throw new TRPCError({ code: 'NOT_FOUND', message: 'Vertrag nicht gefunden' });
      await db.addLegacyPayment({
        contractId: input.contractId,
        userId: contract.userId,
        amount: input.amount,
        currency: input.currency,
        paidAt: new Date(input.paidAt),
        txHash: input.txHash ?? null,
        bankReference: input.bankReference ?? null,
        notes: input.notes ?? null,
      } as any);
      return { success: true };
    }),

  addInterestPayment: adminProcedure
    .input(z.object({
      contractId: z.number().int().positive(),
      amount: z.string().regex(/^\d+(\.\d+)?$/),
      currency: z.string().max(16).default('EUR'),
      paidAt: z.string(),
      paymentMethod: z.enum(['bank_transfer', 'crypto']).default('bank_transfer'),
      txHash: z.string().max(128).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const contract = await db.getLegacyContractById(input.contractId);
      if (!contract) throw new TRPCError({ code: 'NOT_FOUND', message: 'Vertrag nicht gefunden' });
      await db.addLegacyInterestPayment({
        contractId: input.contractId,
        userId: contract.userId,
        amount: input.amount,
        currency: input.currency,
        paidAt: new Date(input.paidAt),
        paymentMethod: input.paymentMethod,
        txHash: input.txHash ?? null,
        notes: input.notes ?? null,
      } as any);
      return { success: true };
    }),

  calculateStatus: adminProcedure
    .input(z.object({ contractId: z.number().int().positive() }))
    .query(async ({ input }) => {
      return calculateContractStatus(input.contractId);
    }),

  list: adminProcedure.query(async () => {
    const contracts = await db.getAllLegacyContractsForAdmin();
    // Enrich with user info
    const enriched = await Promise.all(contracts.map(async (c) => {
      const user = await db.getUserById(c.userId);
      return {
        ...c,
        user: user ? { id: user.id, name: user.name, email: user.email } : null,
      };
    }));
    return enriched;
  }),

  // ==================== INVESTOR ====================

  myContracts: protectedProcedure.query(async ({ ctx }) => {
    return db.getLegacyContractsByUser(ctx.user.id);
  }),

  myStatus: protectedProcedure
    .input(z.object({ contractId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const contract = await db.getLegacyContractById(input.contractId);
      if (!contract) throw new TRPCError({ code: 'NOT_FOUND', message: 'Vertrag nicht gefunden' });
      if (contract.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });
      return calculateContractStatus(input.contractId);
    }),
});
