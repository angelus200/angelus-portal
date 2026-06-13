// KYC-Datei-Verschlüsselung at rest (AES-256-GCM) — spiegelt das vorhandene TOTP-Muster
// (_core/auth/crypto.ts) für Binärdateien. SoF/SoW-Nachweise (Vermögens-/Steuerbelege) liegen NIE im
// Klartext auf dem Volume: Upload -> encryptBuffer -> Ciphertext-Datei; Admin-Download -> decryptBuffer
// in-memory -> direkt streamen (keine Klartext-Temp-Datei). Datei-Layout: [12 IV][16 GCM-Tag][Ciphertext].
// KYC_ENC_SECRET ist RUNTIME-ONLY (kein VITE_-Prefix), lazy aus process.env (auf BEIDEN Instanzen
// setzen, BEVOR Code deployt; Verlust/Rotation => alte Dateien unentschlüsselbar).
import crypto from 'crypto';

function kycKey(): Buffer {
  const s = process.env.KYC_ENC_SECRET;
  if (!s) throw new Error('KYC_ENC_SECRET nicht gesetzt — KYC-Datei-Crypto nicht verfügbar');
  return crypto.createHash('sha256').update(s).digest(); // 32 Byte
}

export function encryptBuffer(plain: Buffer): Buffer {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', kycKey(), iv);
  const ct = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag(); // 16 Byte
  return Buffer.concat([iv, tag, ct]);
}

export function decryptBuffer(blob: Buffer): Buffer {
  if (blob.length < 28) throw new Error('KYC-Datei zu kurz / kein gültiges GCM-Blob');
  const iv = blob.subarray(0, 12);
  const tag = blob.subarray(12, 28);
  const ct = blob.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', kycKey(), iv);
  decipher.setAuthTag(tag); // wirft bei Manipulation (Integritätsschutz)
  return Buffer.concat([decipher.update(ct), decipher.final()]);
}
