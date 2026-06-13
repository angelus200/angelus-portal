// KYC/AML-Sorgfaltsmodul (Bestandszeichner, Angelus-only). Zweites Pflicht-Gate nach FAQ.
// IP/User-Agent SERVER-seitig aus ctx.req (nie vom Client). Feld-Validierung autoritativ über den
// shared-Katalog (validateKycFields). Dokumente laufen über die Express-Route /api/kyc-document
// (multipart + Magic-Byte + AES-256-GCM), NICHT über tRPC.
// APPEND-ONLY: submit erzeugt eine unveränderliche Einreichung; jede Admin-Aktion schreibt zusätzlich
// einen immutablen kyc_case_log-Eintrag (Entlastungs-Trail). Status wird fortgeschrieben + geloggt.
// Eigen-Identifizierung (Sumsub raus): recordIdentityCheck hält "Identität geprüft am/durch" fest —
// das ist der menschliche Prüfschritt, den der GwB verantwortet (Code dokumentiert ihn nur).
import { protectedProcedure, router } from './_core/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { BRAND } from '../shared/brand';
import { ACTIVE_KYC_VERSION } from '../shared/kyc-version';
import { REQUIRED_DOC_TYPES, validateKycFields, KYC_CATALOG } from '../shared/kyc-catalog';
import { getLegacyCustomerByUserId } from './legacy-db';
import * as kycDb from './kyc-db';

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin' && ctx.user.role !== 'superadmin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

function assertAngelus(): void {
  if (BRAND.key !== 'angelus') throw new TRPCError({ code: 'FORBIDDEN', message: 'KYC-Gate nur im Angelus-Kontext' });
}

function reqIp(ctx: any): string | null { return ((ctx.req?.ip as string) ?? '').slice(0, 64) || null; }
function reqUa(ctx: any): string | null { return ((ctx.req?.headers?.['user-agent'] as string) ?? '').slice(0, 255) || null; }

// Gate ist erfüllt, wenn eine vollständige Einreichung existiert und der Status den Zugang nicht sperrt.
// nachforderung -> erneut pflichtig; abgelehnt/verweigert -> gesperrt (Frontend zeigt Kontakt-Hinweis).
const GATE_OPEN_STATUSES = new Set(['eingereicht', 'in_pruefung', 'akzeptiert']);

async function buildStatusForUser(userId: number) {
  const sub = await kycDb.getLatestSubmission(userId);
  if (!sub) {
    return {
      applicable: true as const, version: ACTIVE_KYC_VERSION, hasSubmission: false,
      submissionId: null as number | null, status: null as kycDb.KycStatus | null,
      requiredDocs: REQUIRED_DOC_TYPES as string[], uploadedDocs: [] as string[], complete: false, gateSatisfied: false,
    };
  }
  const docs = await kycDb.getDocumentsBySubmission(sub.id);
  const uploadedDocs = Array.from(new Set(docs.map((d) => d.docType)));
  const complete = REQUIRED_DOC_TYPES.every((t) => uploadedDocs.includes(t));
  const gateSatisfied = complete && GATE_OPEN_STATUSES.has(sub.status);
  return {
    applicable: true as const, version: ACTIVE_KYC_VERSION, hasSubmission: true,
    submissionId: sub.id as number | null, status: sub.status as kycDb.KycStatus | null,
    requiredDocs: REQUIRED_DOC_TYPES as string[], uploadedDocs: uploadedDocs as string[], complete, gateSatisfied,
  };
}

export const kycRouter = router({
  // Gate-Status für den eingeloggten User. applicable nur für Bestandszeichner (legacy_customer).
  status: protectedProcedure.query(async ({ ctx }) => {
    assertAngelus();
    const c = await getLegacyCustomerByUserId(ctx.user.id);
    if (!c) {
      return {
        applicable: false as const, version: ACTIVE_KYC_VERSION, hasSubmission: false,
        submissionId: null as number | null, status: null as kycDb.KycStatus | null,
        requiredDocs: REQUIRED_DOC_TYPES as string[], uploadedDocs: [] as string[], complete: true, gateSatisfied: true,
      };
    }
    return buildStatusForUser(ctx.user.id);
  }),

  // Einreichung der Textfelder (append-only). Dokumente folgen über /api/kyc-document mit submissionId.
  // Idempotenz: läuft eine offene Einreichung (eingereicht/in_pruefung) noch ohne Endentscheid, wird
  // diese zurückgegeben statt eine Dublette anzulegen — verhindert Spam-Rows bei Doppel-Klick.
  submit: protectedProcedure
    .input(z.object({ fields: z.array(z.object({ key: z.string().min(1).max(64), value: z.string().max(8000) })) }))
    .mutation(async ({ ctx, input }) => {
      assertAngelus();
      const c = await getLegacyCustomerByUserId(ctx.user.id);
      if (!c) throw new TRPCError({ code: 'FORBIDDEN', message: 'KYC nur für Bestandszeichner' });

      const values: Record<string, string> = {};
      for (const f of input.fields) values[f.key] = f.value;
      const errors = validateKycFields(values);
      if (errors.length > 0) throw new TRPCError({ code: 'BAD_REQUEST', message: errors.join('; ') });

      // Idempotenz: offene Einreichung wiederverwenden (Doppel-Klick), sonst neue anlegen.
      const latest = await kycDb.getLatestSubmission(ctx.user.id);
      if (latest && (latest.status === 'eingereicht' || latest.status === 'in_pruefung')) {
        return { submissionId: latest.id, reused: true };
      }

      const submissionId = await kycDb.createSubmission({
        userId: ctx.user.id, kycVersion: ACTIVE_KYC_VERSION, ipAddress: reqIp(ctx), userAgent: reqUa(ctx),
      });
      // Nur Katalog-bekannte Feld-Keys persistieren (kein Fremd-Input in die Akte).
      const known = new Set(KYC_CATALOG.flatMap((b) => b.fields.map((f) => f.key)));
      const rows = input.fields
        .filter((f) => known.has(f.key))
        .map((f) => ({ submissionId, fieldKey: f.key, fieldValue: f.value }));
      await kycDb.addSubmissionFields(rows);
      await kycDb.addCaseLog({
        userId: ctx.user.id, submissionId, eventType: 'eingereicht',
        actor: `user:${ctx.user.id}`, note: `KYC ${ACTIVE_KYC_VERSION} eingereicht (${rows.length} Felder)`,
      });
      return { submissionId, reused: false };
    }),

  // ---- Admin ----

  // Vollständige Fallakte für die Admin-Review-Ansicht.
  review: adminProcedure
    .input(z.object({ userId: z.number().int().positive() }))
    .query(async ({ input }) => {
      assertAngelus();
      const submission = await kycDb.getLatestSubmission(input.userId);
      const fields = submission ? await kycDb.getSubmissionFields(submission.id) : [];
      const documents = submission ? await kycDb.getDocumentsBySubmission(submission.id) : [];
      const risk = await kycDb.getLatestRiskAssessment(input.userId);
      const escalation = await kycDb.getLatestEscalation(input.userId);
      const caseLog = await kycDb.getCaseLog(input.userId);
      const status = submission ? await buildStatusForUser(input.userId) : null;
      return { submission, fields, documents, risk, escalation, caseLog, status };
    }),

  setStatus: adminProcedure
    .input(z.object({
      submissionId: z.number().int().positive(),
      status: z.enum(['eingereicht', 'in_pruefung', 'akzeptiert', 'abgelehnt', 'nachforderung', 'verweigert']),
      note: z.string().max(2000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      assertAngelus();
      const sub = await kycDb.getSubmissionById(input.submissionId);
      if (!sub) throw new TRPCError({ code: 'NOT_FOUND', message: 'Einreichung nicht gefunden' });
      await kycDb.setSubmissionStatus(input.submissionId, input.status);
      await kycDb.addCaseLog({
        userId: sub.userId, submissionId: input.submissionId, eventType: 'status_geaendert',
        actor: `admin:${ctx.user.id}`, note: `Status -> ${input.status}${input.note ? ` — ${input.note}` : ''}`,
      });
      return { ok: true };
    }),

  setRiskAssessment: adminProcedure
    .input(z.object({
      userId: z.number().int().positive(),
      submissionId: z.number().int().positive().optional(),
      riskLevel: z.enum(['niedrig', 'mittel', 'hoch']),
      begruendung: z.string().max(4000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      assertAngelus();
      await kycDb.setRiskAssessment({
        userId: input.userId, submissionId: input.submissionId ?? null,
        riskLevel: input.riskLevel, begruendung: input.begruendung ?? null, assessedBy: ctx.user.id,
      });
      await kycDb.addCaseLog({
        userId: input.userId, submissionId: input.submissionId ?? null, eventType: 'risiko_gesetzt',
        actor: `admin:${ctx.user.id}`, note: `Risiko: ${input.riskLevel}${input.begruendung ? ` — ${input.begruendung}` : ''}`,
      });
      return { ok: true };
    }),

  // Identitäts-Prüfung festhalten (Eigen-Identifizierung): "Identität geprüft am (=Server-Zeit) / durch".
  recordIdentityCheck: adminProcedure
    .input(z.object({
      userId: z.number().int().positive(),
      submissionId: z.number().int().positive().optional(),
      verfahren: z.string().min(2).max(200),     // z.B. "persönliche Sichtprüfung", "VideoIdent"
      ergebnis: z.string().min(2).max(2000),     // z.B. "Ausweis echt, Person stimmt überein"
    }))
    .mutation(async ({ ctx, input }) => {
      assertAngelus();
      await kycDb.addCaseLog({
        userId: input.userId, submissionId: input.submissionId ?? null, eventType: 'identitaet_geprueft',
        actor: `admin:${ctx.user.id}`,
        note: `Identität geprüft — Verfahren: ${input.verfahren}; Ergebnis: ${input.ergebnis}`,
      });
      return { ok: true };
    }),

  // Verdachts-/Eskalationsflag (Meldeweg über Anwalt, kein eigenes goAML).
  flagEscalation: adminProcedure
    .input(z.object({ userId: z.number().int().positive(), grund: z.string().min(3).max(4000) }))
    .mutation(async ({ ctx, input }) => {
      assertAngelus();
      const escalationId = await kycDb.createEscalation({ userId: input.userId, flaggedBy: ctx.user.id, grund: input.grund });
      await kycDb.addCaseLog({
        userId: input.userId, submissionId: null, eventType: 'verdacht_geflaggt',
        actor: `admin:${ctx.user.id}`, note: `Eskalation #${escalationId}: ${input.grund}`,
      });
      return { escalationId };
    }),

  setEscalationStatus: adminProcedure
    .input(z.object({
      escalationId: z.number().int().positive(),
      userId: z.number().int().positive(),
      status: z.enum(['offen', 'an_anwalt_uebergeben', 'an_FIU_gemeldet', 'erledigt']),
      uebergebenAnAnwaltAm: z.string().optional(),
      anwaltReferenz: z.string().max(128).optional(),
      fiuAktenzeichen: z.string().max(128).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      assertAngelus();
      await kycDb.updateEscalation(input.escalationId, {
        status: input.status,
        uebergebenAnAnwaltAm: input.uebergebenAnAnwaltAm ? new Date(input.uebergebenAnAnwaltAm) : undefined,
        anwaltReferenz: input.anwaltReferenz,
        fiuAktenzeichen: input.fiuAktenzeichen,
      });
      await kycDb.addCaseLog({
        userId: input.userId, submissionId: null, eventType: 'eskalation_aktualisiert',
        actor: `admin:${ctx.user.id}`,
        note: `Eskalation #${input.escalationId} -> ${input.status}` +
          (input.anwaltReferenz ? `; Anwalt-Ref: ${input.anwaltReferenz}` : '') +
          (input.fiuAktenzeichen ? `; FIU-Az: ${input.fiuAktenzeichen}` : ''),
      });
      return { ok: true };
    }),
});
