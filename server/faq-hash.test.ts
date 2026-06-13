import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { resolve } from 'path';
import { EXPECTED_FAQ_HASH, ACTIVE_FAQ_VERSION } from '@shared/faq-version';

// Beweis-Anker / Regressions-Versicherung: der Soll-Hash ist HARTKODIERT (Fixture), NICHT aus der
// Datei selbst abgeleitet. Weicht die Seed-Datei je um ein Byte ab (EOL, Editor, Encoding), schlägt
// der Test fehl — denn das gleiche Gate steckt im Seed-cjs (Abbruch vor DB-Write).
describe('FAQ-Seed-Hash', () => {
  it('SHA-256 der Seed-Datei == hartkodierter Soll-Hash (Byte-Drift schlägt fehl)', () => {
    const buf = readFileSync(resolve(process.cwd(), 'scripts/faq', `Angelus_FAQ_${ACTIVE_FAQ_VERSION}.md`));
    const hash = createHash('sha256').update(buf).digest('hex');
    expect(hash).toBe('633f35953bfe79f9cd919aab905b93d0b2deccf30a1ff4199fcd6b554a753b66');
    expect(hash).toBe(EXPECTED_FAQ_HASH);                 // Konstante == Fixture (kein Auseinanderlaufen)
    expect(buf.length).toBe(33155);                       // Bytecount-Anker
    expect(buf.includes(Buffer.from('\r\n'))).toBe(false); // LF, kein CRLF
  });
});
