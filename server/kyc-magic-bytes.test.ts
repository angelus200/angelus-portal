import { describe, it, expect } from 'vitest';
import { sniffMime, verifyUpload } from './kyc-magic-bytes';

const PDF = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]); // %PDF-1.7
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const EXE = Buffer.from([0x4d, 0x5a, 0x90, 0x00]); // MZ (PE/EXE)
const HTML = Buffer.from('<html><script>alert(1)</script></html>', 'utf8');

describe('kyc-magic-bytes — sniffMime', () => {
  it('erkennt PDF/JPEG/PNG an den Magic-Bytes', () => {
    expect(sniffMime(PDF)).toBe('application/pdf');
    expect(sniffMime(JPEG)).toBe('image/jpeg');
    expect(sniffMime(PNG)).toBe('image/png');
  });
  it('lehnt getarnte/aktive Inhalte ab (EXE, HTML, leer)', () => {
    expect(sniffMime(EXE)).toBeNull();
    expect(sniffMime(HTML)).toBeNull();
    expect(sniffMime(Buffer.alloc(0))).toBeNull();
  });
});

describe('kyc-magic-bytes — verifyUpload (Defense-in-Depth)', () => {
  it('akzeptiert, wenn gemeldeter Typ zum echten Inhalt passt', () => {
    expect(verifyUpload(PDF, 'application/pdf')).toEqual({ mime: 'application/pdf', ext: 'pdf' });
    expect(verifyUpload(PNG, 'image/png')).toEqual({ mime: 'image/png', ext: 'png' });
  });
  it('toleriert image/jpg als Alias für image/jpeg', () => {
    expect(verifyUpload(JPEG, 'image/jpg')).toEqual({ mime: 'image/jpeg', ext: 'jpg' });
  });
  it('lehnt EXE-getarnt-als-PDF ab (Magic-Byte)', () => {
    const r = verifyUpload(EXE, 'application/pdf');
    expect('error' in r).toBe(true);
  });
  it('lehnt Typ-Mismatch ab (echtes PNG als PDF gemeldet)', () => {
    const r = verifyUpload(PNG, 'application/pdf');
    expect('error' in r).toBe(true);
  });
});
