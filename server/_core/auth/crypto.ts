import crypto from "crypto";
import { ENV } from "../env";

function requireSecret(s: string, name: string): string {
  if (!s) throw new Error(`${name} ist nicht gesetzt — Custom-Auth-Crypto nicht verfügbar`);
  return s;
}

// ===== Session-Token (opaque) — im Cookie Klartext, in der DB nur HMAC-Hash =====
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}
export function hashSessionToken(token: string): string {
  // HMAC mit AUTH_SECRET: DB-Leak des token_hash erlaubt KEINE Token-Fälschung ohne AUTH_SECRET
  return crypto.createHmac("sha256", requireSecret(ENV.authSecret, "AUTH_SECRET")).update(token).digest("hex"); // 64 hex
}

// ===== AES-256-GCM für totpSecret at rest (Schlüssel = SHA-256 von TOTP_ENC_SECRET) =====
function totpKey(): Buffer {
  return crypto.createHash("sha256").update(requireSecret(ENV.totpEncSecret, "TOTP_ENC_SECRET")).digest(); // 32 Byte
}
export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", totpKey(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), ct.toString("base64")].join(":");
}
export function decryptSecret(payload: string): string {
  const [ivB, tagB, ctB] = payload.split(":");
  const decipher = crypto.createDecipheriv("aes-256-gcm", totpKey(), Buffer.from(ivB, "base64"));
  decipher.setAuthTag(Buffer.from(tagB, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ctB, "base64")), decipher.final()]).toString("utf8");
}

// ===== Backup-Codes — Klartext einmal an den User, in der DB nur HMAC-Hash =====
export function generateBackupCodes(count = 10): string[] {
  return Array.from({ length: count }, () =>
    crypto.randomBytes(5).toString("hex").toUpperCase().replace(/^(.{4})(.{4})(.{2})$/, "$1-$2-$3")
  );
}
export function hashBackupCode(code: string): string {
  return crypto.createHmac("sha256", requireSecret(ENV.authSecret, "AUTH_SECRET"))
    .update(code.trim().toUpperCase().replace(/-/g, "")).digest("hex");
}

// ===== Einmal-Tokens (E-Mail-Verifizierung / Passwort-Reset) =====
export function generateOpaqueToken(): string {
  return crypto.randomBytes(32).toString("hex"); // 64 hex, passt in varchar(128)
}
