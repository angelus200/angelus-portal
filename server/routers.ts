import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { ENV } from "./_core/env";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    
    // Email/Password Registration
    register: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        // Check if email already exists
        const existingUser = await db.getUserByEmail(input.email);
        if (existingUser) {
          throw new TRPCError({ code: 'CONFLICT', message: 'E-Mail-Adresse bereits registriert' });
        }
        
        // Hash password
        const passwordHash = await bcrypt.hash(input.password, 12);
        
        // Generate verification token
        const emailVerificationToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
        
        // Create user
        const userId = await db.createUserWithPassword({
          email: input.email,
          passwordHash,
          name: input.name,
          emailVerificationToken,
        });
        
        await db.createAuditLog({
          userId,
          userEmail: input.email,
          action: "user.register",
          entityType: "user",
          entityId: userId,
          details: { method: "email" },
          ipAddress: ctx.req.ip,
        });
        
        return { success: true, message: 'Registrierung erfolgreich. Bitte bestätigen Sie Ihre E-Mail-Adresse.' };
      }),
    
    // Email/Password Login
    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const user = await db.getUserByEmail(input.email);
        
        if (!user || !user.passwordHash) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Ungültige E-Mail oder Passwort' });
        }
        
        const isValidPassword = await bcrypt.compare(input.password, user.passwordHash);
        if (!isValidPassword) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Ungültige E-Mail oder Passwort' });
        }
        
        // Update last signed in
        await db.updateLastSignedIn(user.id);
        
        // Create JWT token
        const secret = new TextEncoder().encode(ENV.jwtSecret);
        const token = await new SignJWT({ 
          sub: user.openId || '',
          email: user.email || undefined,
          name: user.name || undefined,
          role: user.role,
        })
          .setProtectedHeader({ alg: 'HS256' })
          .setIssuedAt()
          .setExpirationTime('7d')
          .sign(secret);
        
        // Set cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, {
          ...cookieOptions,
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
        
        await db.createAuditLog({
          userId: user.id,
          userEmail: user.email,
          action: "user.login",
          entityType: "user",
          entityId: user.id,
          details: { method: "email" },
          ipAddress: ctx.req.ip,
        });
        
        return { 
          success: true, 
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          }
        };
      }),
    
    // Request Password Reset
    requestPasswordReset: publicProcedure
      .input(z.object({
        email: z.string().email(),
      }))
      .mutation(async ({ input }) => {
        const user = await db.getUserByEmail(input.email);
        
        // Always return success to prevent email enumeration
        if (!user) {
          return { success: true, message: 'Falls ein Konto mit dieser E-Mail existiert, wurde ein Link zum Zurücksetzen gesendet.' };
        }
        
        const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
        const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        
        await db.setPasswordResetToken(input.email, token, expires);
        
        // TODO: Send email with reset link
        // For now, just log the token (in production, send email)
        console.log(`Password reset token for ${input.email}: ${token}`);
        
        return { success: true, message: 'Falls ein Konto mit dieser E-Mail existiert, wurde ein Link zum Zurücksetzen gesendet.' };
      }),
    
    // Reset Password
    resetPassword: publicProcedure
      .input(z.object({
        token: z.string(),
        newPassword: z.string().min(8),
      }))
      .mutation(async ({ input }) => {
        const passwordHash = await bcrypt.hash(input.newPassword, 12);
        const success = await db.resetPassword(input.token, passwordHash);
        
        if (!success) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Ungültiger oder abgelaufener Token' });
        }
        
        return { success: true, message: 'Passwort erfolgreich zurückgesetzt' };
      }),
  }),

  // ==================== BOND ROUTES ====================
  bonds: router({
    list: publicProcedure.query(async () => {
      return db.getActiveBonds();
    }),
    
    listAll: adminProcedure.query(async () => {
      return db.getAllBonds();
    }),
    
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getBondById(input.id);
      }),
    
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        isin: z.string().optional(),
        totalVolume: z.string(),
        availableVolume: z.string(),
        minSubscription: z.string().default("100000"),
        interestRate: z.string(),
        termMonths: z.number(),
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
        const id = await db.createBond(input);
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
  }),

  // ==================== SUBSCRIPTION ROUTES ====================
  subscriptions: router({
    mySubscriptions: protectedProcedure.query(async ({ ctx }) => {
      return db.getSubscriptionsByUser(ctx.user.id);
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
    
    // Update investor profile
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        // Personal data
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
        // Company data
        isCompany: z.boolean().optional(),
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
        kycStatus: z.enum(["pending", "in_progress", "verified", "rejected"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, dateOfBirth, ...rest } = input;
        
        const updateData: Record<string, unknown> = { ...rest };
        if (dateOfBirth) {
          updateData.dateOfBirth = new Date(dateOfBirth);
        }
        if (rest.firstName && rest.lastName) {
          updateData.name = `${rest.firstName} ${rest.lastName}`;
        }
        
        await db.updateUserProfile(id, updateData);
        
        await db.createAuditLog({
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          action: "investor.update",
          entityType: "user",
          entityId: id,
          details: { updatedFields: Object.keys(rest) },
          ipAddress: ctx.req.ip,
        });
        
        return { success: true };
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
    
    transactions: protectedProcedure.query(async ({ ctx }) => {
      return db.getTransactionsByUser(ctx.user.id);
    }),
    
    requestWithdrawal: protectedProcedure
      .input(z.object({
        walletId: z.number(),
        amount: z.string(),
        currency: z.string(),
        externalAddress: z.string().optional(),
        bankReference: z.string().optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createWalletTransaction({
          walletId: input.walletId,
          userId: ctx.user.id,
          type: "withdrawal",
          amount: input.amount,
          currency: input.currency,
          status: "pending",
          externalAddress: input.externalAddress,
          bankReference: input.bankReference,
          description: input.description,
        });
        
        await db.createAuditLog({
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          action: "wallet.withdrawalRequest",
          entityType: "walletTransaction",
          entityId: id,
          details: { amount: input.amount, currency: input.currency },
          ipAddress: ctx.req.ip,
        });
        
        return { id };
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

  // ==================== ADMIN DASHBOARD ROUTES ====================
  admin: router({
    stats: adminProcedure.query(async () => {
      return db.getDashboardStats();
    }),
    
    auditLogs: adminProcedure
      .input(z.object({ limit: z.number().default(100) }))
      .query(async ({ input }) => {
        return db.getAuditLogs(input.limit);
      }),
  }),

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
});

export type AppRouter = typeof appRouter;
