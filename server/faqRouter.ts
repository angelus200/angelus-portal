// FAQ-Pflicht-Gate (Bestandszeichner, Angelus-only). Reine Lese-/Schreib-Procedures; IP/User-Agent
// SERVER-seitig aus ctx.req (wie authRouter), nie vom Client. content_hash server-seitig aus dem
// faq_versions-Archiv (Client-Hash wird NICHT vertraut). Append-only, idempotent pro (user, version).
import { protectedProcedure, router } from './_core/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { BRAND } from '../shared/brand';
import { ACTIVE_FAQ_VERSION, FAQ_CONFIRMATION_TEXT } from '../shared/faq-version';
import { getLegacyCustomerByUserId } from './legacy-db';
import {
  getFaqVersion,
  getFaqAcknowledgement,
  getFaqAcknowledgementsByUser,
  createFaqAcknowledgement,
} from './faq-db';

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin' && ctx.user.role !== 'superadmin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

// Gate: FAQ-Pflicht nur im Angelus-Kontext. MyBonds-User können das Gate nie auslösen.
function assertAngelus(): void {
  if (BRAND.key !== 'angelus') throw new TRPCError({ code: 'FORBIDDEN', message: 'FAQ-Gate nur im Angelus-Kontext' });
}

export const faqRouter = router({
  // Status für den eingeloggten User: applicable = Bestandszeichner (legacy_customer vorhanden).
  // acknowledged prüft gegen die AKTIVE Version (neue Version => erneut pflichtig).
  status: protectedProcedure.query(async ({ ctx }) => {
    assertAngelus();
    const c = await getLegacyCustomerByUserId(ctx.user.id);
    if (!c) return { applicable: false as const, acknowledged: true, version: ACTIVE_FAQ_VERSION };
    const ack = await getFaqAcknowledgement(ctx.user.id, ACTIVE_FAQ_VERSION);
    return { applicable: true as const, acknowledged: !!ack, version: ACTIVE_FAQ_VERSION };
  }),

  // Inhalt der aktiven Version AUS DEM ARCHIV (damit Anzeige == gehashter Volltext).
  content: protectedProcedure.query(async () => {
    assertAngelus();
    const v = await getFaqVersion(ACTIVE_FAQ_VERSION);
    if (!v) throw new TRPCError({ code: 'NOT_FOUND', message: 'FAQ-Version nicht hinterlegt' });
    return { version: v.faqVersion, content: v.content, contentHash: v.contentHash, confirmationText: FAQ_CONFIRMATION_TEXT };
  }),

  // Bestätigung schreiben (append-only, idempotent). content_hash + confirmation_text server-seitig.
  acknowledge: protectedProcedure
    .input(z.object({ scrolledToEnd: z.boolean(), gatingCompletedAt: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      assertAngelus();
      const v = await getFaqVersion(ACTIVE_FAQ_VERSION);
      if (!v) throw new TRPCError({ code: 'NOT_FOUND', message: 'FAQ-Version nicht hinterlegt' });
      const existing = await getFaqAcknowledgement(ctx.user.id, ACTIVE_FAQ_VERSION);
      if (existing) return { acknowledged: true, alreadyAcknowledged: true };
      await createFaqAcknowledgement({
        userId: ctx.user.id,
        faqVersion: v.faqVersion,
        faqContentHash: v.contentHash,            // aus dem Archiv, NICHT vom Client
        confirmationText: FAQ_CONFIRMATION_TEXT,  // Server-Konstante == angezeigter Wortlaut
        scrolledToEnd: input.scrolledToEnd,
        gatingCompletedAt: input.gatingCompletedAt ? new Date(input.gatingCompletedAt) : null,
        serverTimestamp: new Date(),
        ipAddress: ((ctx.req.ip as string) ?? '').slice(0, 64) || null,
        userAgent: ((ctx.req.headers['user-agent'] as string) ?? '').slice(0, 255) || null,
      });
      return { acknowledged: true, alreadyAcknowledged: false };
    }),

  // Nachweis-Export für die Akte: Ack-Datensätze + archivierter Volltext/Hash der bestätigten Version.
  adminAcknowledgement: adminProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      assertAngelus();
      const acks = await getFaqAcknowledgementsByUser(input.userId);
      const out = [];
      for (const a of acks) {
        const v = await getFaqVersion(a.faqVersion);
        out.push({ ...a, archivedContent: v?.content ?? null, archivedContentHash: v?.contentHash ?? null });
      }
      return out;
    }),
});
