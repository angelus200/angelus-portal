import { describe, it, expect } from 'vitest';
import { computeKontokorrent, type KontoBooking } from './legacy-claim';

const d = (s: string) => new Date(s + 'T00:00:00.000Z');

describe('Kontokorrent-Forderungsmodul', () => {
  // --- Struktureller Selbsttest: Vollzahler MUSS exakt 0 ergeben ---
  // 100k voll eingezahlt am Faelligkeitstag -> kein Negativzins.
  // Kupon 15% auf 100k = 15.000 nach 1 Jahr, voll ausgezahlt -> Anspruch und Auszahlung heben sich exakt auf.
  it('Vollzahler: Saldo = exakt 0 (Negativzins 0, Kupon aufgelaufen = ausgezahlt)', () => {
    const bookings: KontoBooking[] = [
      { date: d('2023-01-01'), type: 'einzahlung', amount: 100000 },
      { date: d('2024-01-01'), type: 'zinsabschlag', amount: 15000 },
    ];
    const r = computeKontokorrent({
      investmentAmount: 100000, refinancingRate: 20, couponRate: 15,
      faelligkeit: d('2023-01-01'), stichtag: d('2024-01-01'), bookings,
    });
    expect(r.negativzinsSumme).toBe(0);
    expect(r.kuponAufgelaufen).toBe(15000);
    expect(r.ausgezahlt).toBe(15000);
    expect(r.saldo).toBe(0); // <-- der Beweis
  });

  // --- Teilzahler: exakter Erwartungswert, beweist das +Tilgung-Vorzeichen ---
  // 50k eingezahlt am Faelligkeitstag -> offen 50k. Negativzins 20% auf 50k = 10.000 (1 Jahr).
  // Kupon 15% auf 50k = 7.500 aufgelaufen, voll ausgezahlt -> Kupon-Wash.
  // Saldo = 10.000 (Neg) - 7.500 (Kupon) + 7.500 (Tilgung) = 10.000.
  // Mit falschem Vorzeichen (-Tilgung) waere es -5.000 -> Doppelzaehlung. Wir erwarten 10.000.
  it('Teilzahler: Saldo = 10.000 (Kupon-Wash, reiner Negativzins auf 50k bleibt)', () => {
    const bookings: KontoBooking[] = [
      { date: d('2023-01-01'), type: 'einzahlung', amount: 50000 },
      { date: d('2024-01-01'), type: 'zinsabschlag', amount: 7500 },
    ];
    const r = computeKontokorrent({
      investmentAmount: 100000, refinancingRate: 20, couponRate: 15,
      faelligkeit: d('2023-01-01'), stichtag: d('2024-01-01'), bookings,
    });
    expect(r.negativzinsSumme).toBe(10000);
    expect(r.kuponAufgelaufen).toBe(7500);
    expect(r.ausgezahlt).toBe(7500);
    expect(r.saldo).toBe(10000); // <-- +Tilgung korrekt; -Tilgung waere -5000
  });

  // --- Brenner: echter Pilotfall (refinancingRate ANNAHME 20% fuer den Test) ---
  it('Brenner: KG-Forderung in plausibler Groessenordnung + Breakdown', () => {
    const REFI_ANNAHME = 20; // Thomas gibt den echten Satz beim Pilot ein
    const bookings: KontoBooking[] = [
      { date: d('2022-11-15'), type: 'einzahlung', amount: 5000 },
      { date: d('2023-01-27'), type: 'einzahlung', amount: 1000 },
      { date: d('2023-06-26'), type: 'einzahlung', amount: 1000 },
      { date: d('2023-10-12'), type: 'einzahlung', amount: 1000 },
      { date: d('2023-12-14'), type: 'einzahlung', amount: 1000 },
      { date: d('2024-03-11'), type: 'einzahlung', amount: 1000 },
      { date: d('2024-06-11'), type: 'einzahlung', amount: 1000 },
      { date: d('2024-10-10'), type: 'einzahlung', amount: 1000 },
      { date: d('2024-10-11'), type: 'einzahlung', amount: 1000 },
    ];
    const r = computeKontokorrent({
      investmentAmount: 100000, refinancingRate: REFI_ANNAHME, couponRate: 15,
      faelligkeit: d('2022-11-25'), stichtag: d('2026-06-10'), bookings,
    });

    // Breakdown ausgeben fuer den manuellen Abgleich gegen die Falldatei
    console.log('\n===== BRENNER KONTOKORRENT (refinancingRate ANNAHME ' + REFI_ANNAHME + '%, Stichtag 2026-06-10) =====');
    console.log('Negativzins-Summe (SOLL):  ', r.negativzinsSumme.toLocaleString('de-DE'), 'EUR');
    console.log('Kupon aufgelaufen (HABEN): ', r.kuponAufgelaufen.toLocaleString('de-DE'), 'EUR');
    console.log('Ausgezahlte Abschlaege:    ', r.ausgezahlt.toLocaleString('de-DE'), 'EUR');
    console.log('NETTO-FORDERUNG KG:        ', r.saldo.toLocaleString('de-DE'), 'EUR');
    console.log('\n--- Kontoauszug (Buchungen + Zinssegmente) ---');
    for (const l of r.kontoauszug) {
      console.log(`${l.date} | ${l.art.padEnd(34)} | SOLL ${l.soll.toFixed(2).padStart(10)} | HABEN ${l.haben.toFixed(2).padStart(8)} | offen ${l.offenesKapital.toFixed(0).padStart(7)} | gezahlt ${l.gezahltesKapital.toFixed(0).padStart(6)} | Saldo ${l.saldoNachher.toFixed(2).padStart(10)}`);
    }
    console.log('=====\n');

    expect(r.ausgezahlt).toBe(0);              // keine Zinsabschlaege ausgezahlt
    expect(r.kuponAufgelaufen).toBeGreaterThan(0);
    expect(r.saldo).toBeGreaterThan(50000);    // klare KG-Forderung
    expect(r.saldo).toBeLessThan(70000);       // Plausibilitaetsband bei 20%
    expect(r.saldo).toBeCloseTo(r.negativzinsSumme - r.kuponAufgelaufen, 2); // Identitaet (ausgezahlt=0)
  });
});
