import { describe, it, expect } from 'vitest';
import { computeKontokorrent, type KontoBooking } from './legacy-claim';
import { days30E360 } from './interest-calculation';
import { buildVollzahlerPerioden, computeVollzahlerSaldo, buildVollzahlerWording } from './vollzahler-perioden';

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
    console.log('\n--- Kontoauszug (Buchungen) ---');
    for (const l of r.kontoauszug) {
      console.log(`${l.date} | ${l.kind.padEnd(14)} | Betrag ${l.betrag.toFixed(2).padStart(10)} | Basis ${(l.basis ?? 0).toFixed(0).padStart(7)} | Saldo ${l.saldoNachher.toFixed(2).padStart(10)}`);
    }
    console.log('=====\n');

    expect(r.ausgezahlt).toBe(0);              // keine Zinsabschlaege ausgezahlt
    expect(r.kuponAufgelaufen).toBeGreaterThan(0);
    expect(r.saldo).toBeGreaterThan(50000);    // klare KG-Forderung
    expect(r.saldo).toBeLessThan(70000);       // Plausibilitaetsband bei 20%
    expect(r.saldo).toBeCloseTo(r.negativzinsSumme - r.kuponAufgelaufen, 2); // Identitaet (ausgezahlt=0)
  });

  // ============================================================
  // 30E/360 (Anleihe 60-2023, §4(6), Option A) — Brendel-Fall-Typ
  // ============================================================

  // Reine Tageszählung (Standard-30E/360, Tag auf 30 gekappt)
  it('days30E360: volles Jahr (18.10.→18.10.) = exakt 360 Tage', () => {
    expect(days30E360(d('2024-10-18'), d('2025-10-18'))).toBe(360);
  });
  it('days30E360: Stub 18.10.2024 → 01.01.2025 = 73 Tage (Okt 12 + Nov 30 + Dez 30 + 1)', () => {
    expect(days30E360(d('2024-10-18'), d('2025-01-01'))).toBe(73);
  });

  // INVARIANTE: volles Jahr 30E/360 = exakt der Jahreszins = 18.000,00 (deckungsgleich
  // Steuerbescheinigung 2025). Vollzahlerin: 100k voll eingezahlt, offen=0 -> kein Negativzins.
  it('Brendel-Invariante: Kupon volles Jahr @18% 30E/360 = exakt 18.000,00', () => {
    const bookings: KontoBooking[] = [
      { date: d('2024-10-18'), type: 'einzahlung', amount: 100000 },
    ];
    const r = computeKontokorrent({
      investmentAmount: 100000, refinancingRate: 18, couponRate: 18,
      faelligkeit: d('2024-10-18'), stichtag: d('2025-10-18'), bookings,
      zinsbasis: '30E/360',
    });
    expect(r.offen).toBe(0);
    expect(r.negativzinsSumme).toBe(0);       // Vollzahlerin -> kein Verzugszins
    expect(r.kuponAufgelaufen).toBe(18000);   // <-- die Invariante (= Bescheinigung 2025)
  });

  // Stub: erste angebrochene Periode ab Wertstellung -> 73 Tage / 360 * 18% * 100k = 3.650,00
  it('Brendel-Stub: 18.10.2024 → 01.01.2025 @18% 30E/360 = 3.650,00', () => {
    const bookings: KontoBooking[] = [
      { date: d('2024-10-18'), type: 'einzahlung', amount: 100000 },
    ];
    const r = computeKontokorrent({
      investmentAmount: 100000, refinancingRate: 18, couponRate: 18,
      faelligkeit: d('2024-10-18'), stichtag: d('2025-01-01'), bookings,
      zinsbasis: '30E/360',
    });
    expect(r.kuponAufgelaufen).toBe(3650);
  });

  // ============================================================
  // P6 — Vollzahler-Perioden (Jahreszins pro Laufzeitjahr), Brendel-Fall
  // Stichtag 01.06. (Zinsjahr -> 31.05.), Wertstellung 18.10.2024, 19 Abschläge à 1.500
  // (28.500), heute 12.06.2026. Erwartung: Rumpfjahr teilweise, 1. Jahr erfüllt, laufend offen.
  // ============================================================
  it('Brendel-Perioden: Leistungsmonat-Zuordnung -> Rumpfjahr erfüllt, 1.Jahr teilweise', () => {
    // Korrigierte Daten: erster Abschlag 600 (anteiliger Okt), Rest 1.500. Zuordnung per Leistungsmonat:
    // der am 15.06.2025 gezahlte Mai-Zins gehört zum Rumpfjahr (Termin 31.05.2025), nicht zum Folgejahr.
    const raw = ['2024-11-15','2024-12-15','2025-01-15','2025-02-15','2025-03-15','2025-04-15','2025-05-15','2025-06-15','2025-07-15','2025-08-15','2025-09-15','2025-10-15','2025-11-15','2025-12-15','2026-01-15','2026-02-15','2026-03-15','2026-04-15','2026-05-15'];
    const abschlaege = raw.map((s, i) => ({ date: d(s), amount: i === 0 ? 600 : 1500 }));

    const p = buildVollzahlerPerioden({
      valueDate: d('2024-10-18'),
      annualInterestDate: d('2024-06-01'), // nur MM-DD relevant
      nominal: 100000,
      rate: 18,
      basis: '30E/360',
      zinsAbschlaege: abschlaege,
      today: d('2026-06-12'),
    });

    expect(p).toHaveLength(3);

    // Rumpfjahr 2024-10-18 -> 2025-05-31: Engine 30E/360 = 222 Tage = 11.100,00.
    // Leistungsmonat: 8 Abschläge (Okt..Mai, inkl. 15.06.) = 600 + 7×1.500 = 11.100 -> ERFÜLLT.
    expect(p[0]).toMatchObject({
      von: '2024-10-18', bis: '2025-05-31', istRumpf: true,
      zins: 11100, erhaltenInPeriode: 11100, status: 'erfuellt', deckungsluecke: 0, unterVorbehalt: false,
    });
    // Rumpfjahr-Zins MUSS exakt der Engine entsprechen (nicht geschätzt)
    expect(p[0].zins).toBe(100000 * 18 * days30E360(d('2024-10-18'), d('2025-05-31')) / 360 / 100);

    // 1. volles Jahr 2025-06-01 -> 2026-05-31: 18.000 (flat, Option A); 11 Abschläge (Jun..Apr) = 16.500 -> TEILWEISE, offen 1.500
    expect(p[1]).toMatchObject({
      von: '2025-06-01', bis: '2026-05-31', istRumpf: false,
      zins: 18000, erhaltenInPeriode: 16500, status: 'teilweise', deckungsluecke: 1500, unterVorbehalt: false,
    });

    // Laufendes Jahr 2026-06-01 -> 2027-05-31: 18.000, fällig in Zukunft -> offen + Vorbehalt
    expect(p[2]).toMatchObject({
      von: '2026-06-01', bis: '2027-05-31', istRumpf: false,
      zins: 18000, erhaltenInPeriode: 0, status: 'offen', unterVorbehalt: true,
    });
  });

  // P7 — Vollzahler-Kontokorrent: periodenbasierter Saldo MUSS +313,50 treffen (Zielzahl).
  // Korrigierte Daten: erster Abschlag 600 (anteiliger Okt), Rest 1.500 -> Σ 27.600.
  // Variante A (netto): der am 15.06.2025 gezahlte Mai-Zins faellt auf Termin 31.05.2025 -> verspaetet (-11,25).
  it('Brendel-Saldo: SOLL 1.813,50 − HABEN 1.500 = +313,50 (KG-Forderung)', () => {
    const raw = ['2024-11-15','2024-12-15','2025-01-15','2025-02-15','2025-03-15','2025-04-15','2025-05-15','2025-06-15','2025-07-15','2025-08-15','2025-09-15','2025-10-15','2025-11-15','2025-12-15','2026-01-15','2026-02-15','2026-03-15','2026-04-15','2026-05-15'];
    const zinsAbschlaege = raw.map((s, i) => ({ date: d(s), amount: i === 0 ? 600 : 1500 }));

    const s = computeVollzahlerSaldo({
      valueDate: d('2024-10-18'),
      annualInterestDate: d('2024-06-01'),
      nominal: 100000,
      rate: 18,
      basis: '30E/360',
      zinsAbschlaege,
      today: d('2026-06-12'),
      refinancingRate: 18,
    });

    expect(s.faelligeCoupons).toBe(29100);      // 11.100 + 18.000
    expect(s.ausgezahlt).toBe(27600);           // 600 + 18×1.500
    expect(s.habenOffenerKupon).toBe(1500);     // HABEN
    expect(s.sollVorfinanzierung).toBe(1813.5); // Variante A (netto)
    expect(s.saldo).toBe(313.5);                // ZIEL: +313,50 = KG-Forderung
    expect(s.naechsterCoupon).toEqual({ datum: '2027-05-31', betrag: 18000 }); // separat, Vorbehalt
  });

  // P8 — abgelaufene Lücke <= Vorfinanzierungssaldo -> 'bedient (Saldo-Ausgleich)' statt 'teilweise'.
  it('Brendel-Perioden mit ausgleichBudget: 1.Jahr "bedient", nominale Lücke 1.500 bleibt sichtbar', () => {
    const raw = ['2024-11-15','2024-12-15','2025-01-15','2025-02-15','2025-03-15','2025-04-15','2025-05-15','2025-06-15','2025-07-15','2025-08-15','2025-09-15','2025-10-15','2025-11-15','2025-12-15','2026-01-15','2026-02-15','2026-03-15','2026-04-15','2026-05-15'];
    const zinsAbschlaege = raw.map((s, i) => ({ date: d(s), amount: i === 0 ? 600 : 1500 }));
    const base = { valueDate: d('2024-10-18'), annualInterestDate: d('2024-06-01'), nominal: 100000, rate: 18, basis: '30E/360' as const, zinsAbschlaege, today: d('2026-06-12') };

    // Budget = SOLL Vorfinanzierung (1.813,50) deckt die 1.500-Lücke -> bedient.
    const p = buildVollzahlerPerioden({ ...base, ausgleichBudget: 1813.5 });
    expect(p[0].status).toBe('erfuellt');                       // Rumpfjahr unverändert
    expect(p[1]).toMatchObject({ status: 'bedient', deckungsluecke: 1500, erhaltenInPeriode: 16500, zins: 18000 });
    expect(p[2]).toMatchObject({ status: 'offen', unterVorbehalt: true });

    // Ohne Budget bleibt es 'teilweise' (Default-Verhalten unverändert -> P6-Test bleibt gültig).
    const p0 = buildVollzahlerPerioden(base);
    expect(p0[1].status).toBe('teilweise');
  });

  // Wording parametrisiert: die Datumswerte MÜSSEN byte-identisch zu Brendels freigegebenen
  // Literalen sein (Regressions-Check) — 12-Monats-Rhythmus + Termin−3M (Monatsende-geklemmt).
  it('Brendel-Wording: Datumswerte byte-identisch zu den freigegebenen Literalen', () => {
    const w = buildVollzahlerWording({
      annualInterestDate: d('2024-06-01'),
      maturityDate: d('2026-05-31'),
      kuendigungStatus: 'zurueckgewiesen',
      kuendigungEingegangenAm: d('2026-05-19'),
      naechsterKuendigungstermin: d('2027-05-31'),
    });
    expect(w).toEqual({
      couponTerminMMDD: '31.05.',
      mindestlaufzeitEnde: '31.05.2026',
      kuendigungDatum: '19.05.2026',
      verfristeterTermin: '31.05.2026',
      verfristeterEingangBis: '28.02.2026', // 31.05.2026 − 3M, auf Monatsende geklemmt
      naechsterTermin: '31.05.2027',
      naechsterEingangBis: '28.02.2027',
    });

    // Voller Satz, exakt wie im Frontend zusammengesetzt -> muss dem freigegebenen Wortlaut entsprechen.
    const satz = [
      `Die Mindestlaufzeit (§ 4 Abs. 2) endete am ${w.mindestlaufzeitEnde}. `,
      `Die Anleihe läuft seither unbefristet weiter und ist ordentlich nur zu den 12-Monats-Terminen (jeweils ${w.couponTerminMMDD}) mit einer Frist von 3 Monaten kündbar (§ 5 Abs. 1). `,
      `Die Kündigung vom ${w.kuendigungDatum} war für den Termin ${w.verfristeterTermin} verfristet (Eingang erforderlich bis ${w.verfristeterEingangBis}). `,
      `Nächstmöglicher Termin: ${w.naechsterTermin}, Eingang bis ${w.naechsterEingangBis}.`,
    ].join('');
    expect(satz).toBe('Die Mindestlaufzeit (§ 4 Abs. 2) endete am 31.05.2026. Die Anleihe läuft seither unbefristet weiter und ist ordentlich nur zu den 12-Monats-Terminen (jeweils 31.05.) mit einer Frist von 3 Monaten kündbar (§ 5 Abs. 1). Die Kündigung vom 19.05.2026 war für den Termin 31.05.2026 verfristet (Eingang erforderlich bis 28.02.2026). Nächstmöglicher Termin: 31.05.2027, Eingang bis 28.02.2027.');
  });
});
