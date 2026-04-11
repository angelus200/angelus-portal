/**
 * General Invitations Database Functions
 * Admin-generated invite links for new investors (not tied to legacy customers)
 */

import { getDb } from './db';
import { invitations } from '../drizzle/schema';
import { eq, desc } from 'drizzle-orm';
import { randomBytes, createHash } from 'crypto';

export function generateInvitationToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashInvitationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createGeneralInvitation(
  email: string,
  name: string | null,
  adminId: number,
  expiresInDays: number = 30
) {
  const token = generateInvitationToken();
  const tokenHash = hashInvitationToken(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db.insert(invitations).values({
    token,
    tokenHash,
    email,
    name: name || null,
    sentByAdminId: adminId,
    status: 'pending',
    expiresAt,
  });

  return { token, email, name, expiresAt };
}

export async function getGeneralInvitationByToken(token: string) {
  const tokenHash = hashInvitationToken(token);
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const result = await db
    .select()
    .from(invitations)
    .where(eq(invitations.tokenHash, tokenHash))
    .limit(1);

  return result[0] || null;
}

export async function isGeneralInvitationValid(token: string): Promise<boolean> {
  const inv = await getGeneralInvitationByToken(token);
  if (!inv) return false;
  return inv.status === 'pending' && inv.expiresAt > new Date() && !inv.usedAt;
}

export async function useGeneralInvitation(token: string) {
  const tokenHash = hashInvitationToken(token);
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db
    .update(invitations)
    .set({ status: 'accepted', usedAt: new Date() })
    .where(eq(invitations.tokenHash, tokenHash));
}

export async function listGeneralInvitations() {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  return await db
    .select()
    .from(invitations)
    .orderBy(desc(invitations.createdAt));
}

export async function cancelGeneralInvitation(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db
    .update(invitations)
    .set({ status: 'cancelled' })
    .where(eq(invitations.id, id));
}
