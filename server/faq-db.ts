// FAQ-Pflicht-Gate — DB-Helper (eigener Zugriff via getDb wie legacy-db). faq_acknowledgements ist
// APPEND-ONLY: nur lesen + einfügen, NIE update/delete. Tabellen werden per scripts/faq/*.cjs auf
// Prod angelegt (information_schema/IF NOT EXISTS), nicht per drizzle push.
import { eq, and, desc } from 'drizzle-orm';
import { getDb } from './db';
import { faqVersions, faqAcknowledgements, type InsertFaqAcknowledgement } from '../drizzle/schema';

export async function getFaqVersion(version: string) {
  const db = await getDb();
  if (!db) return null;
  const r = await db.select().from(faqVersions).where(eq(faqVersions.faqVersion, version)).limit(1).execute();
  return r[0] ?? null;
}

export async function getFaqAcknowledgement(userId: number, version: string) {
  const db = await getDb();
  if (!db) return null;
  const r = await db.select().from(faqAcknowledgements)
    .where(and(eq(faqAcknowledgements.userId, userId), eq(faqAcknowledgements.faqVersion, version)))
    .limit(1).execute();
  return r[0] ?? null;
}

export async function getFaqAcknowledgementsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(faqAcknowledgements).where(eq(faqAcknowledgements.userId, userId))
    .orderBy(desc(faqAcknowledgements.serverTimestamp)).execute();
}

export async function createFaqAcknowledgement(data: InsertFaqAcknowledgement) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.insert(faqAcknowledgements).values(data).execute();
}
