import { clerkClient, getAuth } from '@clerk/express';
import type { Request } from 'express';
import type { User } from '../../drizzle/schema';
import * as db from '../db';
import { readSessionToken } from './auth/cookie';
import { hashSessionToken } from './auth/crypto';

/**
 * CONTRACT (eingefroren): (req) => Promise<User | null>.
 * Bei fehlender Auth → null (kein throw). Erfolg → volle DB-User-Zeile.
 * context.ts + auth-middleware.ts koppeln ausschließlich an diese Signatur — NICHT ändern.
 *
 * Dual-Auth (Etappe B): eigene Session ZUERST, NUR bei fehlender/ungültiger eigener
 * Session Clerk-Fallback (bis Clerk in Etappe D entfernt wird).
 */
export async function authenticateRequest(req: Request): Promise<User | null> {
  // 1) Eigene Session (Custom Auth) zuerst
  const sessionToken = readSessionToken(req);
  if (sessionToken) {
    try {
      const sessionUser = await db.getUserBySessionTokenHash(hashSessionToken(sessionToken));
      if (sessionUser) return sessionUser;
    } catch (err) {
      console.error('[Auth] Eigener Session-Lookup fehlgeschlagen, Clerk-Fallback:', err);
    }
  }

  // 2) Clerk-Fallback
  const auth = getAuth(req);

  console.log('[Clerk Auth] getAuth result:', {
    userId: auth.userId,
    sessionId: auth.sessionId,
    path: req.path
  });

  if (!auth.userId) {
    console.log('[Clerk Auth] No userId in auth, returning null');
    return null;
  }

  const clerkUserId = auth.userId;
  let user = await db.getUserByClerkId(clerkUserId);

  console.log('[Clerk Auth] User lookup:', {
    clerkUserId,
    foundInDb: !!user
  });

  // If user not in DB, fetch from Clerk and sync
  if (!user) {
    console.log('[Clerk Auth] User not in DB, syncing from Clerk...');
    try {
      const clerkUser = await clerkClient.users.getUser(clerkUserId);

      const primaryEmail = clerkUser.emailAddresses.find(
        e => e.id === clerkUser.primaryEmailAddressId
      );

      console.log('[Clerk Auth] Fetched Clerk user:', {
        id: clerkUser.id,
        email: primaryEmail?.emailAddress,
        name: clerkUser.fullName
      });

      await db.upsertUser({
        clerkId: clerkUserId,
        email: primaryEmail?.emailAddress || null,
        name: clerkUser.fullName ||
              `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() ||
              null,
        loginMethod: 'clerk',
        emailVerified: primaryEmail?.verification?.status === 'verified',
        lastSignedIn: new Date(),
      });

      console.log('[Clerk Auth] User upserted successfully');

      user = await db.getUserByClerkId(clerkUserId);
      console.log('[Clerk Auth] User after upsert:', !!user);
    } catch (error) {
      console.error('[Clerk] Failed to sync user from Clerk:', error);
      return null;
    }
  }

  if (!user) {
    return null;
  }

  // Update last signed in
  await db.updateLastSignedIn(user.id);

  return user;
}
