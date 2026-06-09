import type { Request, Response } from "express";
import { parse } from "cookie";

// Eigenes Session-Cookie pro Domain (HttpOnly; Secure; SameSite=Lax) — kein Cross-Domain.
export const SESSION_COOKIE = "angelus_session";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 Tage

export function readSessionToken(req: Request): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  const cookies = parse(header);
  return cookies[SESSION_COOKIE] ?? null;
}

function isSecure(req: Request): boolean {
  if (req.protocol === "https") return true;
  const xf = req.headers["x-forwarded-proto"];
  const list = Array.isArray(xf) ? xf : (xf?.split(",") ?? []);
  return list.some(p => p.trim().toLowerCase() === "https");
}

export function setSessionCookie(req: Request, res: Response, token: string): void {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isSecure(req),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS,
  });
}

export function clearSessionCookie(req: Request, res: Response): void {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: isSecure(req),
    sameSite: "lax",
    path: "/",
  });
}
