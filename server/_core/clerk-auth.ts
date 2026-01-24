import { clerkClient, getAuth } from '@clerk/express';
import type { Request } from 'express';
import type { User } from '../../drizzle/schema';
import * as db from '../db';

export async function authenticateRequest(req: Request): Promise<User | null> {
  // Use getAuth from @clerk/express to get auth info
  const auth = getAuth(req);

  if (!auth.userId) {
    return null;
  }

  const clerkUserId = auth.userId;
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
