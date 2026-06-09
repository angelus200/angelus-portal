import { router, publicProcedure, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import * as OTPAuth from "otpauth";
import { Resend } from "resend";
import * as db from "./db";
import * as invDb from "./invitations-db";
import {
  generateSessionToken, hashSessionToken, generateOpaqueToken,
  encryptSecret, decryptSecret, generateBackupCodes, hashBackupCode,
} from "./_core/auth/crypto";
import { setSessionCookie, clearSessionCookie, readSessionToken, SESSION_TTL_MS } from "./_core/auth/cookie";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL || "noreply@angelus.group";
const ISSUER = "Angelus";

// --- Helpers ---------------------------------------------------------------

async function issueSession(ctx: any, userId: number) {
  const token = generateSessionToken();
  await db.createSession({
    userId,
    tokenHash: hashSessionToken(token),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    userAgent: ((ctx.req.headers["user-agent"] as string) ?? "").slice(0, 255) || null,
    ipAddress: (ctx.req.ip ?? "").slice(0, 64) || null,
  });
  setSessionCookie(ctx.req, ctx.res, token);
}

function baseUrl(ctx: any): string {
  const proto = ((ctx.req.headers["x-forwarded-proto"] as string)?.split(",")[0] || ctx.req.protocol || "https").trim();
  const host = ctx.req.headers.host;
  return `${proto}://${host}`;
}

function buildTotp(base32: string, label: string) {
  return new OTPAuth.TOTP({
    issuer: ISSUER, label, algorithm: "SHA1", digits: 6, period: 30,
    secret: OTPAuth.Secret.fromBase32(base32),
  });
}

// --- Router ----------------------------------------------------------------

export const authRouter = router({
  me: publicProcedure.query(({ ctx }) => ctx.user),

  // Registrierung über Einladung (E-Mail aus der Einladung beweist Mailbesitz → emailVerified=true)
  registerWithInvitation: publicProcedure
    .input(z.object({
      token: z.string().min(1),
      password: z.string().min(10).max(200),
      firstName: z.string().max(128).optional(),
      lastName: z.string().max(128).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const valid = await invDb.isGeneralInvitationValid(input.token);
      if (!valid) throw new TRPCError({ code: "BAD_REQUEST", message: "Einladung ungültig oder abgelaufen" });
      const inv = await invDb.getGeneralInvitationByToken(input.token);
      if (!inv) throw new TRPCError({ code: "NOT_FOUND", message: "Einladung nicht gefunden" });

      const passwordHash = await bcrypt.hash(input.password, 12);
      const name = [input.firstName, input.lastName].filter(Boolean).join(" ") || inv.name || inv.email;

      const existing = await db.getUserByEmail(inv.email);
      let userId: number;
      if (existing) {
        if (existing.passwordHash) {
          throw new TRPCError({ code: "CONFLICT", message: "Für diese E-Mail existiert bereits ein Passwort-Konto" });
        }
        // Bestehender (z.B. Clerk-)User ohne Passwort → Passwort setzen + verifizieren
        await db.setUserPassword(existing.id, passwordHash);
        await db.updateUserProfile(existing.id, { emailVerified: true, name } as any);
        userId = existing.id;
      } else {
        userId = await db.createUserWithPassword({
          email: inv.email, passwordHash, name, emailVerified: true, role: "user",
        });
      }

      await invDb.useGeneralInvitation(input.token);
      // Auto-Grant wie Etappe 2 (E-Mail-Match) — bei User-Anlage statt lazy in upsertUser
      try { await db.autoGrantInvitationAccess(inv.email); } catch (e) { console.error("[Auth] autoGrant fehlgeschlagen (non-fatal):", e); }

      await issueSession(ctx, userId);
      return { success: true };
    }),

  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(1),
      totpCode: z.string().max(20).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const user = await db.getUserByEmail(input.email);
      const GENERIC = new TRPCError({ code: "UNAUTHORIZED", message: "E-Mail oder Passwort ist falsch" });
      if (!user || !user.passwordHash) throw GENERIC;
      const ok = await bcrypt.compare(input.password, user.passwordHash);
      if (!ok) throw GENERIC;

      // 2FA-Pflicht für Admins, sofern eingerichtet
      const isAdmin = user.role === "admin" || user.role === "superadmin";
      if (isAdmin && user.totpEnabled && user.totpSecret) {
        const code = (input.totpCode ?? "").trim();
        if (!code) throw new TRPCError({ code: "UNAUTHORIZED", message: "TOTP_REQUIRED" });
        let totpOk = false;
        if (/^\d{6}$/.test(code)) totpOk = buildTotp(decryptSecret(user.totpSecret), user.email ?? "admin").validate({ token: code, window: 1 }) !== null;
        if (!totpOk) totpOk = await db.consumeBackupCode(user.id, hashBackupCode(code));
        if (!totpOk) throw new TRPCError({ code: "UNAUTHORIZED", message: "TOTP_INVALID" });
      }

      await db.updateLastSignedIn(user.id);
      await issueSession(ctx, user.id);
      return { success: true, role: user.role };
    }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    const token = readSessionToken(ctx.req);
    if (token) { try { await db.deleteSession(hashSessionToken(token)); } catch { /* AUTH_SECRET evtl. fehlend */ } }
    clearSessionCookie(ctx.req, ctx.res);
    ctx.res.clearCookie("__session"); // Clerk-Cookie im Übergang mit räumen
    return { success: true } as const;
  }),

  requestPasswordReset: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input, ctx }) => {
      const user = await db.getUserByEmail(input.email);
      if (user && user.passwordHash) {
        const token = generateOpaqueToken();
        await db.setPasswordResetToken(input.email, token, new Date(Date.now() + 1000 * 60 * 60)); // 1h
        const link = `${baseUrl(ctx)}/reset-password?token=${token}`;
        try {
          await resend.emails.send({
            from: `Angelus <${FROM}>`, to: input.email,
            subject: "Passwort zurücksetzen",
            text: `Setzen Sie Ihr Passwort zurück (Link 1 Stunde gültig):\n${link}\n\nFalls Sie das nicht angefordert haben, ignorieren Sie diese E-Mail.`,
          });
        } catch (e) { console.error("[Auth] Reset-Mail fehlgeschlagen:", e); }
      }
      return { success: true }; // keine Enumeration
    }),

  resetPassword: publicProcedure
    .input(z.object({ token: z.string().min(1), password: z.string().min(10).max(200) }))
    .mutation(async ({ input }) => {
      const passwordHash = await bcrypt.hash(input.password, 12);
      const userId = await db.resetPassword(input.token, passwordHash);
      if (!userId) throw new TRPCError({ code: "BAD_REQUEST", message: "Link ungültig oder abgelaufen" });
      await db.deleteUserSessions(userId); // alle Sessions widerrufen
      return { success: true };
    }),

  verifyEmail: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const ok = await db.verifyUserEmail(input.token);
      if (!ok) throw new TRPCError({ code: "BAD_REQUEST", message: "Verifizierungs-Link ungültig oder abgelaufen" });
      return { success: true };
    }),

  // ===== 2FA / TOTP =====
  totpEnrollStart: protectedProcedure.mutation(async ({ ctx }) => {
    const secret = new OTPAuth.Secret({ size: 20 });
    const totp = buildTotp(secret.base32, ctx.user.email ?? "admin");
    await db.setUserTotpSecret(ctx.user.id, encryptSecret(secret.base32)); // gespeichert, noch nicht aktiv
    return { uri: totp.toString(), secret: secret.base32 };
  }),

  totpEnrollVerify: protectedProcedure
    .input(z.object({ code: z.string().regex(/^\d{6}$/) }))
    .mutation(async ({ input, ctx }) => {
      const user = await db.getUserById(ctx.user.id);
      if (!user?.totpSecret) throw new TRPCError({ code: "BAD_REQUEST", message: "Kein TOTP-Setup gestartet" });
      const valid = buildTotp(decryptSecret(user.totpSecret), user.email ?? "admin").validate({ token: input.code, window: 1 }) !== null;
      if (!valid) throw new TRPCError({ code: "BAD_REQUEST", message: "Ungültiger Code" });
      const backupCodes = generateBackupCodes(10);
      await db.enableUserTotp(ctx.user.id, backupCodes.map(hashBackupCode));
      return { backupCodes }; // einmalig im Klartext
    }),

  totpDisable: protectedProcedure
    .input(z.object({ password: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const user = await db.getUserById(ctx.user.id);
      if (!user?.passwordHash || !(await bcrypt.compare(input.password, user.passwordHash))) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Passwort falsch" });
      }
      await db.disableUserTotp(ctx.user.id);
      return { success: true };
    }),
});
