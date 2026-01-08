/**
 * Legacy Customer Invitations Database Functions
 * Handles CRUD operations for legacy customer invitations
 */

import { getDb } from './db';
import { legacyCustomerInvitations, legacyCustomers } from '../drizzle/legacy-schema';
import { eq, and, gt, lt, desc } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { createHash } from 'crypto';

/**
 * Generate a secure invitation token
 */
export function generateInvitationToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Hash an invitation token for storage
 */
export function hashInvitationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Create a new invitation for a legacy customer
 */
export async function createInvitation(
  legacyCustomerId: number,
  email: string,
  sentByAdminId: number,
  expiresInDays: number = 7
) {
  const token = generateInvitationToken();
  const tokenHash = hashInvitationToken(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db
    .insert(legacyCustomerInvitations)
    .values({
      legacyCustomerId,
      token,
      tokenHash,
      email,
      sentByAdminId,
      expiresAt,
      status: 'pending',
    });

  return {
    token,
    email,
    expiresAt,
  };
}

/**
 * Get invitation by token
 */
export async function getInvitationByToken(token: string) {
  const tokenHash = hashInvitationToken(token);
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const result = await db
    .select()
    .from(legacyCustomerInvitations)
    .where(eq(legacyCustomerInvitations.tokenHash, tokenHash))
    .limit(1);

  return result[0] || null;
}

/**
 * Get invitation by ID
 */
export async function getInvitationById(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const result = await db
    .select()
    .from(legacyCustomerInvitations)
    .where(eq(legacyCustomerInvitations.id, id))
    .limit(1);

  return result[0] || null;
}

/**
 * List all invitations for a legacy customer
 */
export async function listInvitationsByLegacyCustomer(legacyCustomerId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  return await db
    .select()
    .from(legacyCustomerInvitations)
    .where(eq(legacyCustomerInvitations.legacyCustomerId, legacyCustomerId))
    .orderBy(desc(legacyCustomerInvitations.createdAt));
}

/**
 * List all pending invitations
 */
export async function listPendingInvitations() {
  const now = new Date();
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  return await db
    .select()
    .from(legacyCustomerInvitations)
    .where(
      and(
        eq(legacyCustomerInvitations.status, 'pending'),
        gt(legacyCustomerInvitations.expiresAt, now)
      )
    )
    .orderBy(desc(legacyCustomerInvitations.createdAt));
}

/**
 * Accept an invitation
 */
export async function acceptInvitation(invitationId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  return await db
    .update(legacyCustomerInvitations)
    .set({
      status: 'accepted',
      acceptedAt: new Date(),
    })
    .where(eq(legacyCustomerInvitations.id, invitationId));
}

/**
 * Use an invitation (mark as used after registration)
 */
export async function useInvitation(invitationId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  return await db
    .update(legacyCustomerInvitations)
    .set({
      status: 'accepted',
      usedAt: new Date(),
    })
    .where(eq(legacyCustomerInvitations.id, invitationId));
}

/**
 * Cancel an invitation
 */
export async function cancelInvitation(invitationId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  return await db
    .update(legacyCustomerInvitations)
    .set({
      status: 'cancelled',
    })
    .where(eq(legacyCustomerInvitations.id, invitationId));
}

/**
 * Resend an invitation
 */
export async function resendInvitation(invitationId: number, expiresInDays: number = 7) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const currentInvitation = await getInvitationById(invitationId);
  const newResendCount = (currentInvitation?.resendCount || 0) + 1;

  return await db
    .update(legacyCustomerInvitations)
    .set({
      status: 'pending',
      expiresAt,
      resendCount: newResendCount,
      lastResendAt: new Date(),
    })
    .where(eq(legacyCustomerInvitations.id, invitationId));
}

/**
 * Get legacy customer with invitation
 */
export async function getLegacyCustomerWithInvitation(invitationId: number) {
  const invitation = await getInvitationById(invitationId);
  if (!invitation) return null;

  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const customer = await db
    .select()
    .from(legacyCustomers)
    .where(eq(legacyCustomers.id, invitation.legacyCustomerId))
    .limit(1);

  return {
    invitation,
    customer: customer[0] || null,
  };
}

/**
 * Check if invitation is valid
 */
export async function isInvitationValid(invitationId: number): Promise<boolean> {
  const invitation = await getInvitationById(invitationId);
  if (!invitation) return false;

  const now = new Date();
  return (
    invitation.status === 'pending' &&
    invitation.expiresAt > now &&
    !invitation.usedAt
  );
}
