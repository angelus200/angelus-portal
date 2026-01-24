/**
 * Authentication Middleware für Express
 *
 * Integriert Clerk-Authentifizierung mit Express Request
 */

import { Request, Response, NextFunction } from 'express';
import { authenticateRequest } from './clerk-auth';
import type { User } from '../../drizzle/schema';

/**
 * Erweitere Express Request um user Property
 */
declare global {
  namespace Express {
    interface Request {
      user?: User | null;
      userId?: number;
    }
  }
}

/**
 * Authentifizierungs-Middleware
 * Authentifiziert Benutzer basierend auf Clerk Session
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const user = await authenticateRequest(req);
  req.user = user;
  req.userId = user?.id;
  next();
}

/**
 * Optionale Authentifizierungs-Middleware
 * Authentifiziert Benutzer, aber erlaubt unauthentifizierte Requests
 */
export async function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const user = await authenticateRequest(req);
  req.user = user;
  req.userId = user?.id;
  next();
}

/**
 * Erforderliche Authentifizierungs-Middleware
 * Gibt 401 Fehler zurück wenn Benutzer nicht authentifiziert ist
 */
export async function requireAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const user = await authenticateRequest(req);

  if (!user || !user.id) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  req.user = user;
  req.userId = user.id;
  next();
}

/**
 * Hilfsfunktion zum Extrahieren der User ID aus Request
 */
export function getUserIdFromRequest(req: Request): number {
  if (!req.user || !req.user.id) {
    throw new Error('User not authenticated');
  }
  return req.user.id;
}

/**
 * Hilfsfunktion zum Prüfen ob Benutzer authentifiziert ist
 */
export function isAuthenticated(req: Request): boolean {
  return !!req.user && !!req.user.id;
}

/**
 * Hilfsfunktion zum Prüfen ob Benutzer eine bestimmte ID hat
 */
export function isUser(req: Request, userId: number): boolean {
  return req.user?.id === userId;
}
