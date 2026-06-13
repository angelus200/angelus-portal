import { describe, it, expect } from 'vitest';
import { isoToDe } from '@shared/format-date';

// Schliesst die K4a-Testluecke: K4a prueft nur den ISO-Sortierschluessel + Monotonie, NICHT die
// angezeigte Ausgabe. Hier wird der Anzeige-Formatter (KontoauszugView nutzt isoToDe) direkt
// verankert -> ein gruener Test kann nie wieder bei ISO-Anzeige durchgehen.
describe('isoToDe — Kontoauszug-Datumsanzeige ISO -> TT.MM.JJJJ', () => {
  it('formatiert ISO nach deutsch MIT Jahr', () => {
    expect(isoToDe('2025-06-26')).toBe('26.06.2025');
    expect(isoToDe('2026-05-31')).toBe('31.05.2026');
    expect(isoToDe('2026-06-13')).toBe('13.06.2026');
  });

  it('Ausgabe enthaelt KEIN ISO-Muster mehr (Anzeige-Guard)', () => {
    for (const iso of ['2025-06-26', '2022-11-03', '2024-01-15']) {
      const out = isoToDe(iso);
      expect(out).not.toMatch(/\d{4}-\d{2}-\d{2}/); // kein ISO in der Anzeige
      expect(out).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);  // sauberes TT.MM.JJJJ
    }
  });

  it('robust: leere/ungueltige Eingabe -> unveraendert, kein Crash', () => {
    expect(isoToDe('')).toBe('');
    expect(isoToDe(null)).toBe('');
    expect(isoToDe(undefined)).toBe('');
    expect(isoToDe('foo')).toBe('foo');
  });
});
