import { clerkClient, verifyToken } from '@clerk/clerk-sdk-node';
import type { Request } from 'express';
import { parse as parseCookieHeader } from 'cookie';
import type { User } from '../../drizzle/schema';
import * as db from '../db';
import { ENV } from './env';

export async function verifyClerkSession(sessionToken: string | undefined): Promise<{
  userId: string;
  sessionId: string;
} | null> {
  if (!sessionToken) {
    return null;
  }

  try {
    const payload = await verifyToken(sessionToken, {
      secretKey: ENV.clerkSecretKey,
    });

    return {
      userId: payload.sub,
      sessionId: payload.sid,
    };
  } catch (error) {
    console.warn('[Clerk] Session verification failed:', error);
    return null;
  }
}

export async function authenticateRequest(req: Request): Promise<User | null> {
  // Extract session token from cookie or Authorization header
  const cookies = parseCookieHeader(req.headers.cookie || '');
  const sessionToken = cookies['__session'] ||
                      req.headers.authorization?.replace('Bearer ', '');

  const session = await verifyClerkSession(sessionToken);

  if (!session) {
    return null;
  }

  const clerkUserId = session.userId;
  let user = await db.getUserByClerkId(clerkUserId);

  // If user not in DB, fetch from Clerk and sync
  if (!user) {
    try {
      const clerkUser = await clerkClient.users.getUser(clerkUserId);

      const primaryEmail = clerkUser.emailAddresses.find(
        e => e.id === clerkUser.primaryEmailAddressId
      );

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

      user = await db.getUserByClerkId(clerkUserId);
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
