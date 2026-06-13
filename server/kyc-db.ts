// KYC/AML — DB-Helper (eigener Zugriff via getDb, wie faq-db/legacy-db). Tabellen werden per
// scripts/kyc/migrate-kyc-tables.cjs auf Prod angelegt (nie drizzle push).
// APPEND-ONLY (nur insert/select, NIE update/delete): kyc_submissions (eingereichter Inhalt + Felder
//   + Dokumente sind unveränderlich), kyc_case_log (der lückenlose Entlastungs-Trail).
// Die WORKFLOW-Status-Spalte auf kyc_submissions wird vom Admin fortgeschrieben (eingereicht ->
//   in_pruefung -> akzeptiert/abgelehnt/nachforderung/verweigert); JEDE Statusänderung wird zusätzlich
//   immutabel in kyc_case_log protokolliert. kyc_escalation/kyc_risk_assessment sind fortschreibbar.
import { eq, and, desc } from 'drizzle-orm';
import { getDb } from './db';
import {
  kycSubmissions, kycSubmissionFields, kycDocuments, kycRiskAssessment, kycCaseLog, kycEscalation,
  type InsertKycSubmissionField, type InsertKycDocument, type InsertKycCaseLogEntry,
} from '../drizzle/schema';

export type KycStatus = 'eingereicht' | 'in_pruefung' | 'akzeptiert' | 'abgelehnt' | 'nachforderung' | 'verweigert';

// ---- Submissions (append-only Inhalt; Status fortschreibbar + im case_log gespiegelt) ----

export async function getLatestSubmission(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const r = await db.select().from(kycSubmissions).where(eq(kycSubmissions.userId, userId))
    .orderBy(desc(kycSubmissions.id)).limit(1).execute();
  return r[0] ?? null;
}

export async function getSubmissionById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const r = await db.select().from(kycSubmissions).where(eq(kycSubmissions.id, id)).limit(1).execute();
  return r[0] ?? null;
}

export async function createSubmission(data: {
  userId: number; kycVersion: string; ipAddress: string | null; userAgent: string | null;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const result = await db.insert(kycSubmissions).values({
    userId: data.userId,
    kycVersion: data.kycVersion,
    status: 'eingereicht',
    serverTimestamp: new Date(),
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    createdAt: new Date(),
  });
  return result[0].insertId;
}

// Status fortschreiben — NICHT für Inhalt/Felder/Dokumente (die bleiben unverändert).
export async function setSubmissionStatus(submissionId: number, status: KycStatus): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.update(kycSubmissions).set({ status }).where(eq(kycSubmissions.id, submissionId)).execute();
}

export async function addSubmissionFields(rows: InsertKycSubmissionField[]): Promise<void> {
  if (rows.length === 0) return;
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.insert(kycSubmissionFields).values(rows).execute();
}

export async function getSubmissionFields(submissionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(kycSubmissionFields).where(eq(kycSubmissionFields.submissionId, submissionId)).execute();
}

// ---- Dokumente (Metadaten; Datei liegt verschlüsselt auf dem Volume) ----

export async function addDocument(data: InsertKycDocument): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const result = await db.insert(kycDocuments).values(data);
  return result[0].insertId;
}

export async function getDocumentsBySubmission(submissionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(kycDocuments).where(eq(kycDocuments.submissionId, submissionId)).execute();
}

export async function getDocumentById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const r = await db.select().from(kycDocuments).where(eq(kycDocuments.id, id)).limit(1).execute();
  return r[0] ?? null;
}

// ---- Risiko-Einstufung (fortschreibbar; jede Einstufung wird zusätzlich im case_log geloggt) ----

export async function getLatestRiskAssessment(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const r = await db.select().from(kycRiskAssessment).where(eq(kycRiskAssessment.userId, userId))
    .orderBy(desc(kycRiskAssessment.id)).limit(1).execute();
  return r[0] ?? null;
}

export async function setRiskAssessment(data: {
  userId: number; submissionId: number | null; riskLevel: 'niedrig' | 'mittel' | 'hoch';
  begruendung: string | null; assessedBy: number | null;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const result = await db.insert(kycRiskAssessment).values({
    userId: data.userId,
    submissionId: data.submissionId,
    riskLevel: data.riskLevel,
    begruendung: data.begruendung,
    assessedBy: data.assessedBy,
    assessedAt: new Date(),
  });
  return result[0].insertId;
}

// ---- Case-Log (APPEND-ONLY — der Entlastungsnachweis) ----

export async function addCaseLog(data: InsertKycCaseLogEntry): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.insert(kycCaseLog).values({ ...data, createdAt: data.createdAt ?? new Date() }).execute();
}

export async function getCaseLog(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(kycCaseLog).where(eq(kycCaseLog.userId, userId))
    .orderBy(desc(kycCaseLog.id)).execute();
}

// ---- Eskalation / Verdachtsflag (fortschreibbar; Anwalts-/FIU-Weg) ----

export async function getLatestEscalation(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const r = await db.select().from(kycEscalation).where(eq(kycEscalation.userId, userId))
    .orderBy(desc(kycEscalation.id)).limit(1).execute();
  return r[0] ?? null;
}

export async function createEscalation(data: {
  userId: number; flaggedBy: number | null; grund: string | null;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const result = await db.insert(kycEscalation).values({
    userId: data.userId,
    flaggedBy: data.flaggedBy,
    flaggedAt: new Date(),
    grund: data.grund,
    status: 'offen',
  });
  return result[0].insertId;
}

export async function updateEscalation(id: number, data: {
  status?: 'offen' | 'an_anwalt_uebergeben' | 'an_FIU_gemeldet' | 'erledigt';
  uebergebenAnAnwaltAm?: Date | null; anwaltReferenz?: string | null; fiuAktenzeichen?: string | null;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.update(kycEscalation).set(data).where(eq(kycEscalation.id, id)).execute();
}
