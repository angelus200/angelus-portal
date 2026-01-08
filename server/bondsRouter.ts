import { router, adminProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { bonds } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export const bondsRouter = router({
  // ==================== BOND CRUD ====================
  
  list: adminProcedure.query(async () => {
    return db.getAllBonds();
  }),
  
  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.getBondById(input.id);
    }),
  
  create: adminProcedure
    .input(z.object({
      name: z.string(),
      description: z.string().optional(),
      bondNumber: z.string(),
      totalVolume: z.string(),
      availableVolume: z.string(),
      minSubscription: z.string(),
      interestRate: z.string(),
      termMonths: z.number(),
      cancellationNoticeMonths: z.number().optional(),
      cancellationNoticeDay: z.number().optional(),
      couponPaymentFrequency: z.enum(["monthly", "quarterly", "semi-annual", "annual"]).optional(),
      currency: z.string().optional(),
      issuer: z.string().optional(),
      sector: z.string().optional(),
      country: z.string().optional(),
      issueDate: z.date().optional(),
      maturityDate: z.date().optional(),
      subscriptionStartDate: z.date().optional(),
      subscriptionEndDate: z.date().optional(),
      status: z.enum(["draft", "active", "closed", "matured"]).optional(),
      riskCategory: z.enum(["low", "medium", "high"]).optional(),
    }))
    .mutation(async ({ input }) => {
      return db.createBond({
        ...input,
        totalVolume: input.totalVolume,
        availableVolume: input.availableVolume,
        minSubscription: input.minSubscription,
        interestRate: input.interestRate,
        termMonths: input.termMonths,
        bondNumber: input.bondNumber,
      });
    }),
  
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      data: z.object({
        name: z.string().optional(),
        description: z.string().optional(),
        bondNumber: z.string().optional(),
        totalVolume: z.string().optional(),
        availableVolume: z.string().optional(),
        minSubscription: z.string().optional(),
        interestRate: z.string().optional(),
        termMonths: z.number().optional(),
        cancellationNoticeMonths: z.number().optional(),
        cancellationNoticeDay: z.number().optional(),
        couponPaymentFrequency: z.enum(["monthly", "quarterly", "semi-annual", "annual"]).optional(),
        currency: z.string().optional(),
        issuer: z.string().optional(),
        sector: z.string().optional(),
        country: z.string().optional(),
        status: z.enum(["draft", "active", "closed", "matured"]).optional(),
        riskCategory: z.enum(["low", "medium", "high"]).optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      return db.updateBond(input.id, input.data);
    }),
  
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new Error('Database not available');
      return await database.delete(bonds).where(eq(bonds.id, input.id));
    }),
  
  // ==================== CONTRACT TEMPLATES ====================
  
  templates: router({
    list: adminProcedure.query(async () => {
      return db.getAllContractTemplates();
    }),
    
    getById: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getContractTemplate(input.id);
      }),
    
    create: adminProcedure
      .input(z.object({
        name: z.string(),
        type: z.enum(["subscription_agreement", "risk_disclosure", "terms_conditions", "prospectus", "other"]),
        content: z.string(),
        description: z.string().optional(),
        version: z.string().optional(),
        validFrom: z.date().optional(),
        validUntil: z.date().optional(),
        createdBy: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        return db.createContractTemplate({
          ...input,
          createdBy: ctx.user.id,
          isActive: true,
        });
      }),
    
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        data: z.object({
          name: z.string().optional(),
          content: z.string().optional(),
          description: z.string().optional(),
          version: z.string().optional(),
          validUntil: z.date().optional(),
          isActive: z.boolean().optional(),
        }),
      }))
      .mutation(async ({ input, ctx }) => {
        return db.updateContractTemplate(input.id, {
          ...input.data,
          updatedBy: ctx.user.id,
        });
      }),
    
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return db.deleteContractTemplate(input.id);
      }),
    
    // Link template to bond
    linkToBond: adminProcedure
      .input(z.object({
        bondId: z.number(),
        templateId: z.number(),
        isRequired: z.boolean().optional(),
        displayOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.linkTemplateToBond(
          input.bondId,
          input.templateId,
          input.isRequired ?? true,
          input.displayOrder ?? 0
        );
      }),
    
    // Get templates for a bond
    getForBond: adminProcedure
      .input(z.object({ bondId: z.number() }))
      .query(async ({ input }) => {
        return db.getTemplatesForBond(input.bondId);
      }),
    
    // Remove template from bond
    removeFromBond: adminProcedure
      .input(z.object({
        bondId: z.number(),
        templateId: z.number(),
      }))
      .mutation(async ({ input }) => {
        return db.removeTemplateFromBond(input.bondId, input.templateId);
      }),
  }),
});
