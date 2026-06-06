import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { berechneKapitalertragsteuer, berechneAuszahlungsplan } from "./tax-service";
import * as db from "./db";
import * as invDb from "./invitations-db";
import bcrypt from "bcryptjs";
import { consentsRouter } from "./consentsRouter";
import { adminRouter } from "./adminRouter";
import { legacyCustomerRouter } from "./legacyCustomerRouter";
import { legacyInvitationsRouter } from "./legacyInvitationsRouter";
import { interestParametersRouter } from "./interestParametersRouter";
import { legacyContractsRouter } from "./legacyContractsRouter";
import interestCalculationRouter from "./routers/interest-calculation.router";

// Admin-only procedure (admin or superadmin)
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin' && ctx.user.role !== 'superadmin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  admin: adminRouter,
  legacyCustomer: legacyCustomerRouter,
  legacyInvitations: legacyInvitationsRouter,
  interestParameters: interestParametersRouter,
  legacyContracts: legacyContractsRouter,

  invitations: router({
    getByToken: publicProcedure
      .input(z.object({ token: z.string().min(1) }))
      .query(async ({ input }) => {
        const inv = await invDb.getGeneralInvitationByToken(input.token);
        if (!inv) throw new TRPCError({ code: 'NOT_FOUND', message: 'Einladung nicht gefunden' });
        const isValid = await invDb.isGeneralInvitationValid(input.token);
        if (!isValid) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Einladung ungültig oder abgelaufen' });
        return {
          id: inv.id,
          email: inv.email,
          name: inv.name,
          expiresAt: inv.expiresAt,
          status: inv.status,
        };
      }),

    accept: publicProcedure
      .input(z.object({ token: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const isValid = await invDb.isGeneralInvitationValid(input.token);
        if (!isValid) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Einladung ungültig oder abgelaufen' });
        await invDb.useGeneralInvitation(input.token);
        return { success: true };
      }),
  }),
  
  auth: router({
    // Get current user
    me: publicProcedure.query(opts => opts.ctx.user),

    // Logout - Clerk handles session, just clear local cookie if any
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie('__session');
      return { success: true } as const;
    }),
  }),

  // ==================== ISSUER ROUTES ====================
  issuers: router({
    // Aktive Emittenten — public, damit Badges + Bond-Karten die Daten ziehen können
    list: publicProcedure.query(async () => {
      return db.getActiveIssuers();
    }),
  }),

  // ==================== BOND ROUTES ====================
  bonds: router({
    list: publicProcedure.query(async () => {
      return db.getActiveBonds();
    }),

    listAll: adminProcedure.query(async () => {
      const brandKey = process.env.VITE_BRAND || 'angelus';
      const allBonds = await db.getAllBonds();
      return allBonds.filter(b => (b.issuerKey || 'angelus') === brandKey);
    }),
    
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getBondById(input.id);
      }),
    
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        bondNumber: z.string().min(1),
        description: z.string().optional(),
        isin: z.string().optional(),
        totalVolume: z.string(),
        availableVolume: z.string(),
        minSubscription: z.string().default("100000"),
        interestRate: z.string(),
        termMonths: z.number(),
        couponFrequency: z.string().optional(),
        currency: z.string().optional(),
        issuer: z.string().optional(),
        issuerKey: z.string().optional(),
        sector: z.string().optional(),
        noticePeriod: z.string().optional(),
        noticeDate: z.date().optional(),
        issueDate: z.date().optional(),
        maturityDate: z.date().optional(),
        subscriptionStartDate: z.date().optional(),
        subscriptionEndDate: z.date().optional(),
        status: z.enum(["draft", "active", "closed", "matured"]).default("draft"),
        riskCategory: z.enum(["low", "medium", "high"]).default("high"),
        governingLaw: z.string().default("Swiss"),
        hasSubordination: z.boolean().default(true),
        hasInsolvencyReservation: z.boolean().default(true),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createBond({
          ...input,
          issuerKey: input.issuerKey || process.env.VITE_BRAND || 'angelus',
        });
        await db.createAuditLog({
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          action: "bond.create",
          entityType: "bond",
          entityId: id,
          details: { name: input.name },
          ipAddress: ctx.req.ip,
        });
        return { id };
      }),
    
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        data: z.object({
          name: z.string().optional(),
          description: z.string().optional(),
          status: z.enum(["draft", "active", "closed", "matured"]).optional(),
          availableVolume: z.string().optional(),
        }),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.updateBond(input.id, input.data);
        await db.createAuditLog({
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          action: "bond.update",
          entityType: "bond",
          entityId: input.id,
          details: input.data,
          ipAddress: ctx.req.ip,
        });
        return { success: true };
      }),
    
    getBondTemplates: adminProcedure
      .input(z.object({ bondId: z.number() }))
      .query(async ({ input }) => {
        return db.getBondTemplates(input.bondId);
      }),
    
    linkTemplates: adminProcedure
      .input(z.object({
        bondId: z.number(),
        templateIds: z.array(z.number()),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.linkBondTemplates(input.bondId, input.templateIds);
        await db.createAuditLog({
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          action: "bond.linkTemplates",
          entityType: "bond",
          entityId: input.bondId,
          details: { templateIds: input.templateIds },
          ipAddress: ctx.req.ip,
        });
        return { success: true };
      }),
    
    unlinkTemplate: adminProcedure
      .input(z.object({
        bondId: z.number(),
        templateId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.unlinkBondTemplate(input.bondId, input.templateId);
        await db.createAuditLog({
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          action: "bond.unlinkTemplate",
          entityType: "bond",
          entityId: input.bondId,
          details: { templateId: input.templateId },
          ipAddress: ctx.req.ip,
        });
        return { success: true };
      }),
    
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const { bonds } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const database = await db.getDb();
        if (!database) throw new Error('Database not available');
        await db.createAuditLog({
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          action: "bond.delete",
          entityType: "bond",
          entityId: input.id,
          details: { bondId: input.id },
          ipAddress: ctx.req.ip,
        });
        return await database.delete(bonds).where(eq(bonds.id, input.id));
      }),
  }),

  // ==================== SUBSCRIPTION ROUTES ====================
  subscriptions: router({
    mySubscriptions: protectedProcedure.query(async ({ ctx }) => {
      const subs = await db.getSubscriptionsByUser(ctx.user.id);
      const enriched = await Promise.all(
        subs.map(async (sub) => {
          const bond = await db.getBondById(sub.bondId);
          return { ...sub, bond };
        })
      );
      return enriched;
    }),
    
    listAll: adminProcedure.query(async () => {
      return db.getAllSubscriptions();
    }),
    
    byBond: adminProcedure
      .input(z.object({ bondId: z.number() }))
      .query(async ({ input }) => {
        return db.getSubscriptionsByBond(input.bondId);
      }),
    
    create: protectedProcedure
      .input(z.object({
        bondId: z.number(),
        amount: z.string(),
        currency: z.string().default("EUR"),
        termsAccepted: z.boolean(),
        riskWarningAccepted: z.boolean(),
        ipAddress: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Verify user has completed KYC and risk profile
        if (ctx.user.kycStatus !== "verified") {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'KYC verification required' });
        }
        
        const riskProfile = await db.getRiskProfileByUser(ctx.user.id);
        if (!riskProfile || riskProfile.category === "conservative") {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Risk profile assessment required' });
        }
        
        const id = await db.createSubscription({
          userId: ctx.user.id,
          bondId: input.bondId,
          amount: input.amount,
          currency: input.currency,
          termsAccepted: input.termsAccepted,
          riskWarningAccepted: input.riskWarningAccepted,
          consentTimestamp: new Date(),
          consentIpAddress: input.ipAddress,
          status: "pending",
        });

        // Phase 2: Wallet-Betrag abbuchen
        try {
          await db.debitWalletForInvestment(ctx.user.id, input.amount, id);
        } catch (err) {
          // Subscription zurückrollen
          await db.updateSubscriptionStatus(id, "cancelled");
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: err instanceof Error ? err.message : 'Wallet-Abbuchung fehlgeschlagen',
          });
        }

        await db.createAuditLog({
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          action: "subscription.create",
          entityType: "subscription",
          entityId: id,
          details: { bondId: input.bondId, amount: input.amount },
          ipAddress: input.ipAddress,
        });
        
        return { id };
      }),
    
    updateStatus: adminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending", "confirmed", "active", "completed", "cancelled"]),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.updateSubscriptionStatus(input.id, input.status);
        await db.createAuditLog({
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          action: "subscription.updateStatus",
          entityType: "subscription",
          entityId: input.id,
          details: { status: input.status },
          ipAddress: ctx.req.ip,
        });
        return { success: true };
      }),
  }),

  // ==================== INVESTOR ROUTES ====================
  investors: router({
    list: adminProcedure.query(async () => {
      return db.getAllInvestors();
    }),
    
    getById: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getUserById(input.id);
      }),
    
    // Get detailed investor info with subscriptions, wallets, documents
    getDetails: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const user = await db.getUserById(input.id);
        if (!user) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Investor nicht gefunden' });
        }
        
        const [subscriptionsList, walletsList, contractsList, riskProfile, auditLogsList] = await Promise.all([
          db.getSubscriptionsByUser(input.id),
          db.getWalletsByUser(input.id),
          db.getContractsByUser(input.id),
          db.getRiskProfileByUser(input.id),
          db.getAuditLogsByUser(input.id),
        ]);
        
        return {
          user,
          subscriptions: subscriptionsList,
          wallets: walletsList,
          contracts: contractsList,
          riskProfile,
          auditLogs: auditLogsList,
        };
      }),
    
    // Update investor data
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        data: z.object({
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          email: z.string().email().optional(),
          phone: z.string().optional(),
          dateOfBirth: z.string().optional(),
          taxNumber: z.string().optional(),
          street: z.string().optional(),
          houseNumber: z.string().optional(),
          postalCode: z.string().optional(),
          city: z.string().optional(),
          country: z.string().optional(),
          isCompany: z.boolean().optional(),
          companyName: z.string().optional(),
          companyRegisterNumber: z.string().optional(),
          companyTaxNumber: z.string().optional(),
          companyStreet: z.string().optional(),
          companyHouseNumber: z.string().optional(),
          companyPostalCode: z.string().optional(),
          companyCity: z.string().optional(),
          companyCountry: z.string().optional(),
          bankAccountHolder: z.string().optional(),
          bankIban: z.string().optional(),
          bankBic: z.string().optional(),
          bankName: z.string().optional(),
          investorType: z.enum(["professional", "entrepreneur", "institutional"]).optional(),
        }),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.updateInvestor(input.id, input.data);
        await db.createAuditLog({
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          action: "investor.update",
          entityType: "user",
          entityId: input.id,
          details: input.data,
          ipAddress: ctx.req.ip,
        });
        return { success: true };
      }),
    
    updateKycStatus: adminProcedure
      .input(z.object({
        userId: z.number(),
        status: z.enum(["pending", "in_progress", "verified", "rejected"]),
        externalId: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.updateUserKycStatus(input.userId, input.status, input.externalId);
        await db.createAuditLog({
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          action: "investor.updateKyc",
          entityType: "user",
          entityId: input.userId,
          details: { status: input.status },
          ipAddress: ctx.req.ip,
        });
        return { success: true };
      }),
    
    // CSV Export for accounting
    exportCsv: adminProcedure
      .input(z.object({
        kycStatus: z.enum(["all", "pending", "in_progress", "verified", "rejected"]).optional(),
        investorType: z.enum(["all", "professional", "entrepreneur", "institutional"]).optional(),
        includeSubscriptions: z.boolean().optional(),
        includeWallets: z.boolean().optional(),
      }).optional())
      .query(async ({ input }) => {
        const filters = input || {};
        const investors = await db.getAllInvestors();
        
        // Filter investors based on criteria
        let filteredInvestors = investors;
        if (filters.kycStatus && filters.kycStatus !== "all") {
          filteredInvestors = filteredInvestors.filter((i: any) => i.kycStatus === filters.kycStatus);
        }
        if (filters.investorType && filters.investorType !== "all") {
          filteredInvestors = filteredInvestors.filter((i: any) => i.investorType === filters.investorType);
        }
        
        // Get subscriptions and wallets if requested
        const exportData = await Promise.all(
          filteredInvestors.map(async (investor: any) => {
            let subscriptions: any[] = [];
            let wallets: any[] = [];
            let totalInvested = 0;
            let walletBalance = 0;
            
            if (filters.includeSubscriptions) {
              subscriptions = await db.getSubscriptionsByUser(investor.id);
              totalInvested = subscriptions
                .filter((s: any) => s.status === "confirmed")
                .reduce((sum: number, s: any) => sum + Number(s.amount || 0), 0);
            }
            
            if (filters.includeWallets) {
              wallets = await db.getWalletsByUser(investor.id);
              walletBalance = wallets.reduce((sum: number, w: any) => sum + Number(w.balance || 0), 0);
            }
            
            return {
              // ID
              id: investor.id,
              
              // Personal Data
              email: investor.email || "",
              firstName: investor.firstName || "",
              lastName: investor.lastName || "",
              dateOfBirth: investor.dateOfBirth ? new Date(investor.dateOfBirth).toLocaleDateString("de-DE") : "",
              phone: investor.phone || "",
              taxNumber: investor.taxNumber || "",
              
              // Address
              street: investor.street || "",
              houseNumber: investor.houseNumber || "",
              postalCode: investor.postalCode || "",
              city: investor.city || "",
              country: investor.country || "",
              
              // Company Data
              isCompany: investor.isCompany ? "Ja" : "Nein",
              companyName: investor.companyName || "",
              companyRegisterNumber: investor.companyRegisterNumber || "",
              companyTaxNumber: investor.companyTaxNumber || "",
              companyStreet: investor.companyStreet || "",
              companyHouseNumber: investor.companyHouseNumber || "",
              companyPostalCode: investor.companyPostalCode || "",
              companyCity: investor.companyCity || "",
              companyCountry: investor.companyCountry || "",
              
              // Bank Data
              bankAccountHolder: investor.bankAccountHolder || "",
              bankIban: investor.bankIban || "",
              bankBic: investor.bankBic || "",
              bankName: investor.bankName || "",
              
              // Status
              investorType: investor.investorType || "",
              kycStatus: investor.kycStatus || "",
              role: investor.role || "",
              
              // Financial Summary
              totalInvested: totalInvested.toFixed(2),
              walletBalance: walletBalance.toFixed(2),
              subscriptionCount: subscriptions.length,
              
              // Dates
              createdAt: investor.createdAt ? new Date(investor.createdAt).toLocaleDateString("de-DE") : "",
              lastSignedIn: investor.lastSignedIn ? new Date(investor.lastSignedIn).toLocaleDateString("de-DE") : "",
            };
          })
        );
        
        return {
          data: exportData,
          count: exportData.length,
          exportedAt: new Date().toISOString(),
        };
      }),

    // Validate import data without saving
    validateImport: adminProcedure
      .input(z.object({
        investors: z.array(z.object({
          // Personal data
          email: z.string(),
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          dateOfBirth: z.string().optional(),
          taxNumber: z.string().optional(),
          phone: z.string().optional(),
          // Address
          street: z.string().optional(),
          houseNumber: z.string().optional(),
          postalCode: z.string().optional(),
          city: z.string().optional(),
          country: z.string().optional(),
          // Company
          isCompany: z.boolean().optional(),
          companyName: z.string().optional(),
          companyRegisterNumber: z.string().optional(),
          companyTaxNumber: z.string().optional(),
          // Bank
          bankAccountHolder: z.string().optional(),
          bankIban: z.string().optional(),
          bankBic: z.string().optional(),
          bankName: z.string().optional(),
          // Other
          investorType: z.enum(["professional", "entrepreneur", "institutional"]).optional(),
          kycStatus: z.enum(["pending", "in_progress", "verified", "rejected"]).optional(),
          // Subscriptions
          subscriptions: z.array(z.object({
            bondName: z.string(),
            amount: z.number(),
            subscribedAt: z.string().optional(),
            status: z.enum(["pending", "confirmed", "paid", "cancelled"]).optional(),
          })).optional(),
        })),
      }))
      .mutation(async ({ input }) => {
        const results: Array<{
          row: number;
          email: string;
          valid: boolean;
          errors: string[];
          warnings: string[];
        }> = [];
        
        for (let i = 0; i < input.investors.length; i++) {
          const inv = input.investors[i];
          const errors: string[] = [];
          const warnings: string[] = [];
          
          // Validate email
          if (!inv.email || !inv.email.includes('@')) {
            errors.push('Ungültige E-Mail-Adresse');
          } else {
            // Check if email already exists
            const existing = await db.getUserByEmail(inv.email);
            if (existing) {
              warnings.push('E-Mail bereits registriert - Daten werden aktualisiert');
            }
          }
          
          // Validate required fields
          if (!inv.firstName && !inv.lastName) {
            warnings.push('Kein Name angegeben');
          }
          
          // Validate IBAN format (basic)
          if (inv.bankIban && inv.bankIban.length < 15) {
            errors.push('IBAN zu kurz');
          }
          
          // Validate subscriptions
          if (inv.subscriptions && inv.subscriptions.length > 0) {
            for (const sub of inv.subscriptions) {
              if (!sub.bondName) {
                errors.push('Zeichnung ohne Anleihen-Name');
              }
              if (!sub.amount || sub.amount <= 0) {
                errors.push('Zeichnung ohne gültigen Betrag');
              }
            }
          }
          
          results.push({
            row: i + 1,
            email: inv.email || '(leer)',
            valid: errors.length === 0,
            errors,
            warnings,
          });
        }
        
        return {
          total: input.investors.length,
          valid: results.filter(r => r.valid).length,
          invalid: results.filter(r => !r.valid).length,
          results,
        };
      }),
    
    // Full import with all data
    import: adminProcedure
      .input(z.object({
        investors: z.array(z.object({
          // Personal data
          email: z.string().email(),
          password: z.string().optional(), // Optional - will generate if not provided
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          dateOfBirth: z.string().optional(),
          taxNumber: z.string().optional(),
          phone: z.string().optional(),
          // Address
          street: z.string().optional(),
          houseNumber: z.string().optional(),
          postalCode: z.string().optional(),
          city: z.string().optional(),
          country: z.string().optional(),
          // Company
          isCompany: z.boolean().optional(),
          companyName: z.string().optional(),
          companyRegisterNumber: z.string().optional(),
          companyTaxNumber: z.string().optional(),
          companyStreet: z.string().optional(),
          companyHouseNumber: z.string().optional(),
          companyPostalCode: z.string().optional(),
          companyCity: z.string().optional(),
          companyCountry: z.string().optional(),
          // Bank
          bankAccountHolder: z.string().optional(),
          bankIban: z.string().optional(),
          bankBic: z.string().optional(),
          bankName: z.string().optional(),
          // Other
          investorType: z.enum(["professional", "entrepreneur", "institutional"]).optional(),
          kycStatus: z.enum(["pending", "in_progress", "verified", "rejected"]).optional(),
          // Subscriptions
          subscriptions: z.array(z.object({
            bondName: z.string(),
            amount: z.number(),
            subscribedAt: z.string().optional(),
            status: z.enum(["pending", "confirmed", "paid", "cancelled"]).optional(),
          })).optional(),
        })),
        updateExisting: z.boolean().default(false),
      }))
      .mutation(async ({ input, ctx }) => {
        const results: Array<{
          email: string;
          success: boolean;
          action: 'created' | 'updated' | 'skipped';
          error?: string;
          subscriptionsImported: number;
        }> = [];
        
        // Get all bonds for matching
        const allBonds = await db.getAllBonds();
        
        for (const inv of input.investors) {
          try {
            // Check if user exists
            const existingUser = await db.getUserByEmail(inv.email);
            let userId: number;
            let action: 'created' | 'updated' | 'skipped' = 'created';
            
            if (existingUser) {
              if (!input.updateExisting) {
                results.push({
                  email: inv.email,
                  success: false,
                  action: 'skipped',
                  error: 'Benutzer existiert bereits',
                  subscriptionsImported: 0,
                });
                continue;
              }
              userId = existingUser.id;
              action = 'updated';
              
              // Update existing user
              await db.updateUserProfile(userId, {
                firstName: inv.firstName,
                lastName: inv.lastName,
                name: inv.firstName && inv.lastName ? `${inv.firstName} ${inv.lastName}` : undefined,
                dateOfBirth: inv.dateOfBirth ? new Date(inv.dateOfBirth) : undefined,
                taxNumber: inv.taxNumber,
                phone: inv.phone,
                street: inv.street,
                houseNumber: inv.houseNumber,
                postalCode: inv.postalCode,
                city: inv.city,
                country: inv.country,
                isCompany: inv.isCompany,
                companyName: inv.companyName,
                companyRegisterNumber: inv.companyRegisterNumber,
                companyTaxNumber: inv.companyTaxNumber,
                companyStreet: inv.companyStreet,
                companyHouseNumber: inv.companyHouseNumber,
                companyPostalCode: inv.companyPostalCode,
                companyCity: inv.companyCity,
                companyCountry: inv.companyCountry,
                bankAccountHolder: inv.bankAccountHolder,
                bankIban: inv.bankIban,
                bankBic: inv.bankBic,
                bankName: inv.bankName,
                investorType: inv.investorType,
                kycStatus: inv.kycStatus,
              });
            } else {
              // Create new user
              const password = inv.password || Math.random().toString(36).slice(-12);
              const passwordHash = await bcrypt.hash(password, 12);
              const fullName = inv.firstName && inv.lastName ? `${inv.firstName} ${inv.lastName}` : inv.email;
              
              userId = await db.createUserWithPassword({
                email: inv.email,
                passwordHash,
                name: fullName,
              });
              
              // Update all fields
              await db.updateUserProfile(userId, {
                firstName: inv.firstName,
                lastName: inv.lastName,
                dateOfBirth: inv.dateOfBirth ? new Date(inv.dateOfBirth) : undefined,
                taxNumber: inv.taxNumber,
                phone: inv.phone,
                street: inv.street,
                houseNumber: inv.houseNumber,
                postalCode: inv.postalCode,
                city: inv.city,
                country: inv.country,
                isCompany: inv.isCompany,
                companyName: inv.companyName,
                companyRegisterNumber: inv.companyRegisterNumber,
                companyTaxNumber: inv.companyTaxNumber,
                companyStreet: inv.companyStreet,
                companyHouseNumber: inv.companyHouseNumber,
                companyPostalCode: inv.companyPostalCode,
                companyCity: inv.companyCity,
                companyCountry: inv.companyCountry,
                bankAccountHolder: inv.bankAccountHolder,
                bankIban: inv.bankIban,
                bankBic: inv.bankBic,
                bankName: inv.bankName,
                investorType: inv.investorType,
                kycStatus: inv.kycStatus || 'pending',
              });
            }
            
            // Import subscriptions
            let subscriptionsImported = 0;
            if (inv.subscriptions && inv.subscriptions.length > 0) {
              for (const sub of inv.subscriptions) {
                // Find bond by name
                const bond = allBonds.find(b => 
                  b.name.toLowerCase() === sub.bondName.toLowerCase() ||
                  b.isin === sub.bondName
                );
                
                if (bond) {
                  await db.createSubscription({
                    userId,
                    bondId: bond.id,
                    amount: sub.amount.toString(),
                    status: (sub.status === 'paid' ? 'confirmed' : sub.status) || 'confirmed',
                    consentTimestamp: sub.subscribedAt ? new Date(sub.subscribedAt) : new Date(),
                    consentIpAddress: ctx.req.ip || 'import',
                  });
                  subscriptionsImported++;
                }
              }
            }
            
            results.push({
              email: inv.email,
              success: true,
              action,
              subscriptionsImported,
            });
          } catch (error) {
            results.push({
              email: inv.email,
              success: false,
              action: 'skipped',
              error: error instanceof Error ? error.message : 'Unbekannter Fehler',
              subscriptionsImported: 0,
            });
          }
        }
        
        await db.createAuditLog({
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          action: "investor.import",
          entityType: "user",
          details: { 
            total: input.investors.length,
            created: results.filter(r => r.action === 'created').length,
            updated: results.filter(r => r.action === 'updated').length,
            skipped: results.filter(r => r.action === 'skipped').length,
          },
          ipAddress: ctx.req.ip,
        });
        
        return {
          total: input.investors.length,
          created: results.filter(r => r.action === 'created').length,
          updated: results.filter(r => r.action === 'updated').length,
          skipped: results.filter(r => r.action === 'skipped').length,
          totalSubscriptions: results.reduce((sum, r) => sum + r.subscriptionsImported, 0),
          results,
        };
      }),
    
    // Admin creates investor with email/password
    create: adminProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(8),
        // Personal data
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        dateOfBirth: z.string().optional(), // ISO date string
        taxNumber: z.string().optional(),
        phone: z.string().optional(),
        // Address
        street: z.string().optional(),
        houseNumber: z.string().optional(),
        postalCode: z.string().optional(),
        city: z.string().optional(),
        country: z.string().optional(),
        // Company data
        isCompany: z.boolean().default(false),
        companyName: z.string().optional(),
        companyRegisterNumber: z.string().optional(),
        companyTaxNumber: z.string().optional(),
        companyStreet: z.string().optional(),
        companyHouseNumber: z.string().optional(),
        companyPostalCode: z.string().optional(),
        companyCity: z.string().optional(),
        companyCountry: z.string().optional(),
        // Bank details
        bankAccountHolder: z.string().optional(),
        bankIban: z.string().optional(),
        bankBic: z.string().optional(),
        bankName: z.string().optional(),
        // Other
        investorType: z.enum(["professional", "entrepreneur", "institutional"]).optional(),
        kycStatus: z.enum(["pending", "in_progress", "verified", "rejected"]).default("pending"),
      }))
      .mutation(async ({ input, ctx }) => {
        // Check if email already exists
        const existingUser = await db.getUserByEmail(input.email);
        if (existingUser) {
          throw new TRPCError({ code: 'CONFLICT', message: 'E-Mail-Adresse bereits registriert' });
        }
        
        // Hash password
        const passwordHash = await bcrypt.hash(input.password, 12);
        
        // Create user with full name
        const fullName = `${input.firstName} ${input.lastName}`;
        const userId = await db.createUserWithPassword({
          email: input.email,
          passwordHash,
          name: fullName,
        });
        
        // Update all additional fields
        await db.updateUserProfile(userId, {
          firstName: input.firstName,
          lastName: input.lastName,
          dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : undefined,
          taxNumber: input.taxNumber,
          phone: input.phone,
          street: input.street,
          houseNumber: input.houseNumber,
          postalCode: input.postalCode,
          city: input.city,
          country: input.country,
          isCompany: input.isCompany,
          companyName: input.companyName,
          companyRegisterNumber: input.companyRegisterNumber,
          companyTaxNumber: input.companyTaxNumber,
          companyStreet: input.companyStreet,
          companyHouseNumber: input.companyHouseNumber,
          companyPostalCode: input.companyPostalCode,
          companyCity: input.companyCity,
          companyCountry: input.companyCountry,
          bankAccountHolder: input.bankAccountHolder,
          bankIban: input.bankIban,
          bankBic: input.bankBic,
          bankName: input.bankName,
          investorType: input.investorType,
          kycStatus: input.kycStatus,
        });
        
        await db.createAuditLog({
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          action: "investor.create",
          entityType: "user",
          entityId: userId,
          details: { email: input.email, name: fullName, createdByAdmin: true },
          ipAddress: ctx.req.ip,
        });
        
        return { success: true, userId };
      }),
    
  }),

  // ==================== WALLET ROUTES ====================
  wallet: router({
    myWallets: protectedProcedure.query(async ({ ctx }) => {
      return db.getWalletsByUser(ctx.user.id);
    }),
    
    getOrCreate: protectedProcedure
      .input(z.object({
        currency: z.string(),
        currencyType: z.enum(["fiat", "crypto"]),
      }))
      .mutation(async ({ input, ctx }) => {
        return db.getOrCreateWallet(ctx.user.id, input.currency, input.currencyType);
      }),

    depositWithStripe: protectedProcedure
      .input(z.object({
        walletId: z.number(),
        amount: z.number().min(1000).max(1000000), // €1,000 - €1,000,000
        currency: z.string().default("EUR"),
        successUrl: z.string(),
        cancelUrl: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const walletService = await import("./wallet-service");

        const { sessionId, url } = await walletService.createStripeCheckoutSession(
          ctx.user.id,
          input.walletId,
          input.amount,
          input.currency,
          input.successUrl,
          input.cancelUrl
        );

        await db.createAuditLog({
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          action: "wallet.depositInitiated",
          entityType: "wallet",
          entityId: input.walletId,
          details: { amount: input.amount, currency: input.currency, sessionId },
          ipAddress: ctx.req.ip,
        });

        return { sessionId, url };
      }),

    transactions: protectedProcedure.query(async ({ ctx }) => {
      return db.getTransactionsByUser(ctx.user.id);
    }),
    
    requestWithdrawal: protectedProcedure
      .input(z.object({
        walletId: z.number(),
        amount: z.string().regex(/^\d+(\.\d+)?$/, "Ungültiger Betrag"),
        currency: z.string(),
        externalAddress: z.string().optional(),
        bankReference: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { transactionId, penalty, netAmount } = await db.requestWithdrawalWithPenalty(
          input.walletId,
          ctx.user.id,
          input.amount,
          input.currency,
          input.externalAddress,
          input.bankReference,
        );

        await db.createAuditLog({
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          action: "wallet.withdrawalRequest",
          entityType: "walletTransaction",
          entityId: transactionId,
          details: { amount: input.amount, currency: input.currency, penalty, netAmount },
          ipAddress: ctx.req.ip,
        });

        return { id: transactionId, penalty, netAmount };
      }),
    
    pendingWithdrawals: adminProcedure.query(async () => {
      return db.getPendingWithdrawals();
    }),

    approveWithdrawal: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await db.approveWithdrawal(input.id, ctx.user.id);
        await db.createAuditLog({
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          action: "wallet.approveWithdrawal",
          entityType: "walletTransaction",
          entityId: input.id,
          ipAddress: ctx.req.ip,
        });
        return { success: true };
      }),

    // Investor: report a crypto deposit (TX hash + amount)
    reportCryptoDeposit: protectedProcedure
      .input(z.object({
        walletId: z.number(),
        txHash: z.string().min(10).max(128),
        amount: z.string().regex(/^\d+(\.\d+)?$/, "Ungültiger Betrag"),
        currency: z.string().min(2).max(16),
      }))
      .mutation(async ({ input, ctx }) => {
        const txId = await db.reportCryptoDeposit(
          ctx.user.id,
          input.walletId,
          input.txHash,
          input.amount,
          input.currency,
        );
        await db.createAuditLog({
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          action: "wallet.reportCryptoDeposit",
          entityType: "walletTransaction",
          entityId: txId,
          details: { txHash: input.txHash, amount: input.amount, currency: input.currency },
          ipAddress: ctx.req.ip,
        });
        return { id: txId };
      }),

    // Get active company cold wallet addresses (for investor deposit UI)
    companyWallets: protectedProcedure.query(async () => {
      return db.getActiveCompanyWallets();
    }),
  }),

  // ==================== PAYMENT SCHEDULE ROUTES ====================
  payments: router({
    upcoming: protectedProcedure.query(async ({ ctx }) => {
      return db.getUpcomingPayments(ctx.user.id);
    }),
    
    bySubscription: protectedProcedure
      .input(z.object({ subscriptionId: z.number() }))
      .query(async ({ input }) => {
        return db.getPaymentSchedulesBySubscription(input.subscriptionId);
      }),
    
    create: adminProcedure
      .input(z.object({
        subscriptionId: z.number(),
        dueDate: z.date(),
        amount: z.string(),
        currency: z.string().default("EUR"),
        type: z.enum(["interest", "principal", "combined"]),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createPaymentSchedule(input);
        await db.createAuditLog({
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          action: "payment.create",
          entityType: "paymentSchedule",
          entityId: id,
          details: input,
          ipAddress: ctx.req.ip,
        });
        return { id };
      }),
    
    markPaid: adminProcedure
      .input(z.object({ id: z.number(), transactionId: z.number().optional() }))
      .mutation(async ({ input, ctx }) => {
        await db.markPaymentAsPaid(input.id, input.transactionId);
        await db.createAuditLog({
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          action: "payment.markPaid",
          entityType: "paymentSchedule",
          entityId: input.id,
          ipAddress: ctx.req.ip,
        });
        return { success: true };
      }),

    // Investor payment history
    myPayments: protectedProcedure
      .input(z.object({
        limit: z.number().default(50),
        offset: z.number().default(0),
        status: z.enum(['pending', 'processing', 'completed', 'failed', 'refunded']).optional(),
      }))
      .query(async ({ input, ctx }) => {
        const payments = await db.getInvestorPayments(ctx.user.id);
        
        let filtered = payments;
        if (input.status) {
          filtered = payments.filter(s => s.paymentStatus === input.status);
        }

        const paginated = filtered.slice(input.offset, input.offset + input.limit);

        const enriched = await Promise.all(
          paginated.map(async (subscription) => {
            const bond = await db.getBondById(subscription.bondId);
            return { ...subscription, bond };
          })
        );

        return { payments: enriched, total: filtered.length, limit: input.limit, offset: input.offset };
      }),

    myPaymentDetail: protectedProcedure
      .input(z.object({ subscriptionId: z.number() }))
      .query(async ({ input, ctx }) => {
        const subscription = await db.getSubscriptionWithPayment(input.subscriptionId);
        
        if (!subscription) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Zahlung nicht gefunden' });
        }

        if (subscription.userId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Zugriff verweigert' });
        }

        const bond = await db.getBondById(subscription.bondId);
        return { ...subscription, bond };
      }),

    myPaymentStats: protectedProcedure.query(async ({ ctx }) => {
      const payments = await db.getInvestorPayments(ctx.user.id);
      
      return {
        total: payments.length,
        completed: payments.filter(s => s.paymentStatus === 'completed').length,
        failed: payments.filter(s => s.paymentStatus === 'failed').length,
        refunded: payments.filter(s => s.paymentStatus === 'refunded').length,
        processing: payments.filter(s => s.paymentStatus === 'processing').length,
        pending: payments.filter(s => s.paymentStatus === 'pending').length,
        completedAmount: payments.filter(s => s.paymentStatus === 'completed').reduce((sum, s) => sum + parseFloat(s.amount), 0),
        refundedAmount: payments.filter(s => s.paymentStatus === 'refunded').reduce((sum, s) => sum + parseFloat(s.amount), 0),
      };
    }),
  }),

  // ==================== NEWS ROUTES ====================
  news: router({
    published: publicProcedure.query(async () => {
      return db.getPublishedNews();
    }),
    
    listAll: adminProcedure.query(async () => {
      return db.getAllNews();
    }),
    
    create: adminProcedure
      .input(z.object({
        title: z.string().min(1),
        content: z.string().min(1),
        excerpt: z.string().optional(),
        status: z.enum(["draft", "published", "archived"]).default("draft"),
        isPublic: z.boolean().default(false),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createNews({
          ...input,
          authorId: ctx.user.id,
          publishedAt: input.status === "published" ? new Date() : undefined,
        });
        await db.createAuditLog({
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          action: "news.create",
          entityType: "news",
          entityId: id,
          details: { title: input.title },
          ipAddress: ctx.req.ip,
        });
        return { id };
      }),
    
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        data: z.object({
          title: z.string().optional(),
          content: z.string().optional(),
          excerpt: z.string().optional(),
          status: z.enum(["draft", "published", "archived"]).optional(),
          isPublic: z.boolean().optional(),
        }),
      }))
      .mutation(async ({ input, ctx }) => {
        const updateData = {
          ...input.data,
          publishedAt: input.data.status === "published" ? new Date() : undefined,
        };
        await db.updateNews(input.id, updateData);
        await db.createAuditLog({
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          action: "news.update",
          entityType: "news",
          entityId: input.id,
          details: input.data,
          ipAddress: ctx.req.ip,
        });
        return { success: true };
      }),
  }),

  // ==================== RISK PROFILE ROUTES ====================
  riskProfile: router({
    my: protectedProcedure.query(async ({ ctx }) => {
      return db.getRiskProfileByUser(ctx.user.id);
    }),
    
    submit: protectedProcedure
      .input(z.object({
        questionnaireAnswers: z.record(z.string(), z.any()),
        riskWarningConfirmed: z.boolean(),
        professionalInvestorConfirmed: z.boolean(),
        selfResponsibilityConfirmed: z.boolean(),
        liquidityWaiverConfirmed: z.boolean(),
        ipAddress: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Calculate risk category based on answers
        const answers = input.questionnaireAnswers;
        let score = 0;
        
        // Simple scoring logic (would be more sophisticated in production)
        if (answers.investmentExperience === "extensive") score += 3;
        else if (answers.investmentExperience === "moderate") score += 2;
        else score += 1;
        
        if (answers.riskTolerance === "high") score += 3;
        else if (answers.riskTolerance === "medium") score += 2;
        else score += 1;
        
        if (answers.investmentHorizon === "long") score += 2;
        else score += 1;
        
        let category: "conservative" | "moderate" | "risk_seeking" = "conservative";
        if (score >= 7) category = "risk_seeking";
        else if (score >= 4) category = "moderate";
        
        // Check if all confirmations are true
        if (!input.riskWarningConfirmed || !input.professionalInvestorConfirmed || 
            !input.selfResponsibilityConfirmed || !input.liquidityWaiverConfirmed) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: 'All compliance confirmations are required' 
          });
        }
        
        const existing = await db.getRiskProfileByUser(ctx.user.id);
        
        if (existing) {
          await db.updateRiskProfile(existing.id, {
            category,
            questionnaireAnswers: input.questionnaireAnswers,
            riskWarningConfirmed: input.riskWarningConfirmed,
            professionalInvestorConfirmed: input.professionalInvestorConfirmed,
            selfResponsibilityConfirmed: input.selfResponsibilityConfirmed,
            liquidityWaiverConfirmed: input.liquidityWaiverConfirmed,
            consentTimestamp: new Date(),
            consentIpAddress: input.ipAddress,
          });
          return { id: existing.id, category };
        }
        
        const id = await db.createRiskProfile({
          userId: ctx.user.id,
          category,
          questionnaireAnswers: input.questionnaireAnswers,
          riskWarningConfirmed: input.riskWarningConfirmed,
          professionalInvestorConfirmed: input.professionalInvestorConfirmed,
          selfResponsibilityConfirmed: input.selfResponsibilityConfirmed,
          liquidityWaiverConfirmed: input.liquidityWaiverConfirmed,
          consentTimestamp: new Date(),
          consentIpAddress: input.ipAddress,
        });
        
        await db.createAuditLog({
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          action: "riskProfile.submit",
          entityType: "riskProfile",
          entityId: id,
          details: { category },
          ipAddress: input.ipAddress,
        });
        
        return { id, category };
      }),
  }),

  // ==================== ADMIN DASHBOARD ROUTES (MOVED TO adminRouter) ====================

  // ==================== CONTRACT ROUTES ====================
  contracts: router({
    listAll: adminProcedure.query(async () => {
      return db.getAllContracts();
    }),
    
    byBond: adminProcedure
      .input(z.object({ bondId: z.number() }))
      .query(async ({ input }) => {
        return db.getContractsByBond(input.bondId);
      }),
    
    myContracts: protectedProcedure.query(async ({ ctx }) => {
      return db.getContractsByUser(ctx.user.id);
    }),
    
    upload: adminProcedure
      .input(z.object({
        name: z.string(),
        type: z.enum(["subscription_agreement", "risk_disclosure", "terms", "prospectus", "other"]),
        fileUrl: z.string(),
        fileKey: z.string().optional(),
        mimeType: z.string().optional(),
        fileSize: z.number().optional(),
        bondId: z.number().optional(),
        userId: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createContract({
          name: input.name,
          type: input.type,
          fileUrl: input.fileUrl,
          fileKey: input.fileKey,
          mimeType: input.mimeType,
          fileSize: input.fileSize,
          bondId: input.bondId,
          userId: input.userId,
        });
        await db.createAuditLog({
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          action: "contract.upload",
          entityType: "contract",
          entityId: id,
          details: { name: input.name, type: input.type },
          ipAddress: ctx.req.ip,
        });
        return { id };
      }),
  }),
  
  // ==================== INVESTOR NOTES ROUTES ====================
  notes: router({
    // Get all notes for an investor (admin only)
    list: adminProcedure
      .input(z.object({ investorId: z.number() }))
      .query(async ({ input }) => {
        return db.getInvestorNotes(input.investorId);
      }),
    
    // Create a new note
    create: adminProcedure
      .input(z.object({
        investorId: z.number(),
        title: z.string().optional(),
        content: z.string().min(1),
        category: z.enum(["general", "kyc", "compliance", "payment", "communication", "other"]).default("general"),
        priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
        isPinned: z.boolean().default(false),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createInvestorNote({
          investorId: input.investorId,
          authorId: ctx.user.id,
          authorName: ctx.user.name || ctx.user.email || 'Admin',
          title: input.title,
          content: input.content,
          category: input.category,
          priority: input.priority,
          isPinned: input.isPinned,
        });
        
        await db.createAuditLog({
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          action: "note.create",
          entityType: "investorNote",
          entityId: id,
          details: { investorId: input.investorId, category: input.category },
          ipAddress: ctx.req.ip,
        });
        
        return { id };
      }),
    
    // Update a note
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        data: z.object({
          title: z.string().optional(),
          content: z.string().optional(),
          category: z.enum(["general", "kyc", "compliance", "payment", "communication", "other"]).optional(),
          priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
          isPinned: z.boolean().optional(),
        }),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.updateInvestorNote(input.id, input.data);
        
        await db.createAuditLog({
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          action: "note.update",
          entityType: "investorNote",
          entityId: input.id,
          ipAddress: ctx.req.ip,
        });
        
        return { success: true };
      }),
    
    // Delete a note
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await db.deleteInvestorNote(input.id);
        
        await db.createAuditLog({
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          action: "note.delete",
          entityType: "investorNote",
          entityId: input.id,
          ipAddress: ctx.req.ip,
        });
        
        return { success: true };
      }),
    
    // Toggle pin status
    togglePin: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const note = await db.getInvestorNoteById(input.id);
        if (!note) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Notiz nicht gefunden' });
        }
        
        await db.updateInvestorNote(input.id, { isPinned: !note.isPinned });
        return { success: true, isPinned: !note.isPinned };
      }),
  }),
  
  // ==================== PROFILE CHECK ====================
  profileCheck: router({
    // Save profile check result (public - before registration)
    save: publicProcedure
      .input(z.object({
        sessionId: z.string(),
        profileCategory: z.enum(["conservative", "balanced", "growth", "professional"]),
        riskScore: z.number(),
        answers: z.array(z.object({
          questionId: z.string(),
          value: z.union([z.string(), z.array(z.string())]),
        })),
        // Individual answer fields
        expectedReturn: z.string().optional(),
        returnVsSecurity: z.string().optional(),
        capitalAvailability: z.string().optional(),
        investmentHorizon: z.string().optional(),
        distributionPreference: z.string().optional(),
        liquidityNeed: z.string().optional(),
        lossToleranceMax: z.string().optional(),
        lossReaction: z.string().optional(),
        currentAssets: z.array(z.string()).optional(),
        experienceLevel: z.string().optional(),
        plannedVolume: z.string().optional(),
        portfolioShare: z.string().optional(),
        informationNeed: z.string().optional(),
        decisionProcess: z.string().optional(),
        interestedBusinessAreas: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createProfileCheck({
          sessionId: input.sessionId,
          profileCategory: input.profileCategory,
          riskScore: input.riskScore,
          answers: input.answers,
          expectedReturn: input.expectedReturn,
          returnVsSecurity: input.returnVsSecurity,
          capitalAvailability: input.capitalAvailability,
          investmentHorizon: input.investmentHorizon,
          distributionPreference: input.distributionPreference,
          liquidityNeed: input.liquidityNeed,
          lossToleranceMax: input.lossToleranceMax,
          lossReaction: input.lossReaction,
          currentAssets: input.currentAssets,
          experienceLevel: input.experienceLevel,
          plannedVolume: input.plannedVolume,
          portfolioShare: input.portfolioShare,
          informationNeed: input.informationNeed,
          decisionProcess: input.decisionProcess,
          interestedBusinessAreas: input.interestedBusinessAreas,
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers["user-agent"],
        });
        
        return { success: true, id };
      }),
    
    // Get profile check by session ID (public)
    getBySession: publicProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ input }) => {
        return db.getProfileCheckBySessionId(input.sessionId);
      }),
    
    // Link profile check to user after registration
    linkToUser: protectedProcedure
      .input(z.object({ sessionId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        await db.linkProfileCheckToUser(input.sessionId, ctx.user.id);
        return { success: true };
      }),
    
    // Get profile checks for current user
    getMine: protectedProcedure
      .query(async ({ ctx }) => {
        return db.getProfileChecksByUserId(ctx.user.id);
      }),
    
    // Admin: Get all profile checks
    getAll: adminProcedure
      .query(async () => {
        return db.getAllProfileChecks();
      }),
    
    // Admin: Get profile check by ID
    getById: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getProfileCheckById(input.id);
      }),
    
    // User: Get own profile check
    getMyProfileCheck: protectedProcedure
      .query(async ({ ctx }) => {
        return db.getProfileCheckByUserId(ctx.user.id);
      }),
  }),
  
  consents: consentsRouter,

  tax: router({
    berechne: publicProcedure
      .input(z.object({
        kapitalertrag: z.number().positive(),
        kirchensteuerPflichtig: z.boolean(),
        kirchensteuerSatz: z.number().min(0).max(0.2).optional(),
        freistellungsauftrag: z.number().min(0).optional(),
      }))
      .query(({ input }) => {
        return berechneKapitalertragsteuer(input);
      }),

    auszahlungsplan: protectedProcedure
      .input(z.object({ subscriptionId: z.number() }))
      .query(async ({ input, ctx }) => {
        const [taxData, schedules] = await Promise.all([
          db.getUserTaxData(ctx.user.id),
          db.getPaymentSchedulesBySubscription(input.subscriptionId),
        ]);
        const kirchensteuerPflichtig = taxData?.kirchensteuer !== 'keine';
        const kirchensteuerSatz = Number(taxData?.kirchensteuerSatz ?? 0.09);
        const freistellungsauftrag = Number(taxData?.freistellungsauftrag ?? 0);
        return berechneAuszahlungsplan(
          schedules.map(s => ({
            id: s.id,
            dueDate: s.dueDate,
            amount: Number(s.amount),
            status: s.status,
          })),
          { kirchensteuerPflichtig, kirchensteuerSatz, freistellungsauftrag }
        );
      }),
  }),
  
  // ==================== CONTRACT TEMPLATES ====================
  contractTemplates: router({
    getAll: adminProcedure.query(async () => {
      return db.getAllContractTemplates();
    }),
    
    getById: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getContractTemplate(input.id);
      }),
    
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        type: z.enum(["subscription_agreement", "risk_disclosure", "terms_conditions", "kyc_aml", "prospectus", "other"]),
        content: z.string(),
        validFrom: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createContractTemplate({
          name: input.name,
          type: input.type as any,
          content: input.content,
          validFrom: new Date(input.validFrom),
          version: "1.0",
          createdBy: ctx.user.id,
        });
        const insertId = typeof id === 'number' ? id : (id as any).insertId;
        await db.createAuditLog({
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          action: "contractTemplate.create",
          entityType: "contractTemplate",
          entityId: insertId,
          details: { name: input.name, type: input.type },
          ipAddress: ctx.req.ip,
        });
        return { id: insertId };
      }),
    
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1),
        type: z.enum(["subscription_agreement", "risk_disclosure", "terms_conditions", "kyc_aml", "prospectus", "other"]),
        content: z.string(),
        validFrom: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.updateContractTemplate(input.id, {
          name: input.name,
          type: input.type as any,
          content: input.content,
          validFrom: new Date(input.validFrom),
          updatedBy: ctx.user.id,
        });
        await db.createAuditLog({
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          action: "contractTemplate.update",
          entityType: "contractTemplate",
          entityId: input.id,
          details: { name: input.name },
          ipAddress: ctx.req.ip,
        });
        return { success: true };
      }),
    
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await db.deleteContractTemplate(input.id);
        await db.createAuditLog({
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          action: "contractTemplate.delete",
          entityType: "contractTemplate",
          entityId: input.id,
          details: {},
          ipAddress: ctx.req.ip,
        });
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
