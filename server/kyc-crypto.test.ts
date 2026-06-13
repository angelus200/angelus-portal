import { describe, it, expect, beforeAll } from 'vitest';
import { encryptBuffer, decryptBuffer } from './kyc-crypto';

// kycKey() liest KYC_ENC_SECRET lazy -> in beforeAll setzen genügt (Import ruft kein kycKey).
beforeAll(() => { process.env.KYC_ENC_SECRET = 'vitest-kyc-secret-0123456789abcdef'; });

describe('kyc-crypto — AES-256-GCM at rest', () => {
  it('round-trip: decrypt(encrypt(x)) == x; Ciphertext != Klartext (inkl. Binär + Umlaute/§/€)', () => {
    const plain = Buffer.from('Steuerbescheid 2025 — §, €, üöäß', 'utf8');
    const withBinary = Buffer.concat([plain, Buffer.from([0x00, 0x01, 0xff, 0x7f])]);
    const enc = encryptBuffer(withBinary);
    expect(enc.equals(withBinary)).toBe(false);          // verschlüsselt
    expect(enc.length).toBe(12 + 16 + withBinary.length); // iv+tag+ct
    expect(decryptBuffer(enc).equals(withBinary)).toBe(true);
  });

  it('manipulierter Ciphertext -> Auth-Tag-Fehler (Integritätsschutz)', () => {
    const enc = encryptBuffer(Buffer.from('vertraulich'));
    enc[enc.length - 1] ^= 0xff; // letztes Ciphertext-Byte kippen
    expect(() => decryptBuffer(enc)).toThrow();
  });

  it('ohne KYC_ENC_SECRET -> klarer Fehler', () => {
    const saved = process.env.KYC_ENC_SECRET;
    delete process.env.KYC_ENC_SECRET;
    expect(() => encryptBuffer(Buffer.from('x'))).toThrow(/KYC_ENC_SECRET/);
    process.env.KYC_ENC_SECRET = saved;
  });
});
