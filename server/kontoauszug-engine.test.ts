import { describe, it, expect } from 'vitest';
import { Decimal } from 'decimal.js';
import { buildKontoauszug, buildZeichnerKonsolidierung } from './kontoauszug-engine';
import { buildVollzahlerKontoView } from './legacy-konto-views';
import { BONDS } from './__fixtures__/bestandszeichner-bonds';

const STICHTAG = '2026-06-13';

// Summenprobe: Σsoll − Σhaben über alle Journalzeilen MUSS dem Endsaldo entsprechen.
function sollMinusHaben(zeilen: { soll: number; haben: number }[]): number {
  const s = zeilen.reduce((a, z) => a.plus(z.soll).minus(z.haben), new Decimal(0));
  return Number(s.toDecimalPlaces(2));
}

describe('buildKontoauszug — Anker (byte-identisch zur Engine)', () => {
  it('Brendel (Vollzahler, 1 Bond): endsaldo +313,50; Periodenbild unverändert', () => {
    const k = buildKontoauszug(BONDS.brendel.meta, BONDS.brendel.payments as any[], STICHTAG);
    expect(k.fallTyp).toBe('vollzahler');
    expect(k.endsaldo).toBe(313.5);
    expect(sollMinusHaben(k.zeilen)).toBe(313.5); // Summenprobe
    // Periodenstatus unverändert (Anker): nur erfuellt/bedient/offen, KEIN getragen/teilweise
    const vz: any = buildVollzahlerKontoView(BONDS.brendel.meta, BONDS.brendel.payments as any[], new Date(Date.UTC(2026, 5, 13)));
    expect(vz.perioden.map((p: any) => p.status).sort()).toEqual(['bedient', 'erfuellt', 'offen']);
  });

  it('Kirsten A1 (Coupon-Termin 31.05.): endsaldo −312,50; Rumpfjahr "getragen" (Restguthaben 312,50)', () => {
    const k = buildKontoauszug(BONDS.kirstenA1.meta, BONDS.kirstenA1.payments as any[], STICHTAG);
    expect(k.endsaldo).toBe(-312.5);
    expect(sollMinusHaben(k.zeilen)).toBe(-312.5);
    const vz: any = buildVollzahlerKontoView(BONDS.kirstenA1.meta, BONDS.kirstenA1.payments as any[], new Date(Date.UTC(2026, 5, 13)));
    const rumpf = vz.perioden.find((p: any) => p.istRumpf);
    expect(rumpf.status).toBe('getragen');
    expect(rumpf.restguthaben).toBe(312.5);
  });

  it('Kirsten A2: endsaldo +28.856,04', () => {
    const k = buildKontoauszug(BONDS.kirstenA2.meta, BONDS.kirstenA2.payments as any[], STICHTAG);
    expect(k.endsaldo).toBe(28856.04);
    expect(sollMinusHaben(k.zeilen)).toBe(28856.04);
  });

  it('Kirsten A3: endsaldo +23.842,39', () => {
    const k = buildKontoauszug(BONDS.kirstenA3.meta, BONDS.kirstenA3.payments as any[], STICHTAG);
    expect(k.endsaldo).toBe(23842.39);
    expect(sollMinusHaben(k.zeilen)).toBe(23842.39);
  });

  it('Brenner (VFE-Schlussabrechnung): endsaldo 72.250 als vfe_position-Journal', () => {
    const k = buildKontoauszug(BONDS.brenner.meta, BONDS.brenner.payments as any[], STICHTAG);
    expect(k.fallTyp).toBe('vfe');
    expect(k.endsaldo).toBe(72250);
    expect(sollMinusHaben(k.zeilen)).toBe(72250);
    expect(k.zeilen.filter((z) => z.typ === 'vfe_position').length).toBe(3);
  });
});

describe('buildKontoauszug — Memo-Zeilen lassen Saldo unangetastet', () => {
  it('Brendel mit Steuerkontext: steuer_abfuehrung-Memo erscheint, endsaldo unverändert +313,50', () => {
    const k = buildKontoauszug(BONDS.brendel.meta, BONDS.brendel.payments as any[], STICHTAG, {
      steuerSaetze: { kapitalertragsteuer: 25, soli: 5.5, kirchensteuer: 8 },
    });
    expect(k.zeilen.some((z) => z.typ === 'steuer_abfuehrung')).toBe(true);
    expect(k.endsaldo).toBe(313.5);
    expect(sollMinusHaben(k.zeilen)).toBe(313.5); // Steuer-/Einzahlungs-Memos = 0/0
  });
});

describe('buildZeichnerKonsolidierung — §387-Aufrechnung', () => {
  it('Kirsten (3 Bonds): −312,50 + 28.856,04 + 23.842,39 = +52.385,93 Forderung KG', () => {
    const ergebnisse = [BONDS.kirstenA1, BONDS.kirstenA2, BONDS.kirstenA3].map((b) =>
      buildKontoauszug(b.meta, b.payments as any[], STICHTAG),
    );
    const kons = buildZeichnerKonsolidierung(ergebnisse);
    expect(kons.gesamtsaldo).toBe(52385.93);
    expect(kons.positionen.map((p) => p.label)).toEqual(['Guthaben Zeichner', 'Forderung KG', 'Forderung KG']);
  });

  it('Ein-Bond-Zeichner (Brenner) durchläuft denselben Pfad: gesamtsaldo = VFE-Endbetrag 72.250', () => {
    const k = buildKontoauszug(BONDS.brenner.meta, BONDS.brenner.payments as any[], STICHTAG);
    const kons = buildZeichnerKonsolidierung([k]);
    expect(kons.gesamtsaldo).toBe(72250);
    expect(kons.positionen).toHaveLength(1);
  });
});

describe('Coupon-Termin-Quelle: §4-Termin (annual_interest_date), NICHT value_date', () => {
  it('A1 mit korrektem Termin 01.06. → −312,50; mit Termin = value_date (26.06., der Bug) → +33.511,11', () => {
    // Korrekt: annual_interest_date 2025-06-01 (Serien-Termin 31.05.)
    const korrekt = buildKontoauszug(BONDS.kirstenA1.meta, BONDS.kirstenA1.payments as any[], STICHTAG);
    expect(korrekt.endsaldo).toBe(-312.5);
    // Falsche Quelle: Termin aus value_date abgeleitet (26.06.) -> faelligeCoupons=0 -> +33.511,11.
    // Beweist, dass die Engine annual_interest_date nutzt; eine value_date-Ableitung gäbe ein völlig
    // anderes Ergebnis. Der echte Bond trägt 01.06. -> der korrekte Wert oben gilt.
    const buggyMeta = { ...BONDS.kirstenA1.meta, annualInterestDate: '2025-06-26' };
    const buggy = buildKontoauszug(buggyMeta, BONDS.kirstenA1.payments as any[], STICHTAG);
    expect(buggy.endsaldo).toBe(33511.11);
    expect(buggy.endsaldo).not.toBe(korrekt.endsaldo);
  });
});

describe('Journal-Sortierung K4a — ISO-Datum + chronologisch (drizzle Date-Objekte)', () => {
  it('Date-Objekt-paymentDate → ISO-Datum, chronologisch monoton, Einzahlung zuerst, Endsaldo unberührt', () => {
    // drizzle liefert payment_history.paymentDate als Date-Objekt (lokale Mitternacht wie mysql2).
    // Bewusst in verkehrter Reihenfolge -> der Fix MUSS auf ISO normalisieren UND sortieren.
    const dated = [...BONDS.kirstenA1.payments]
      .map((p) => { const [y, m, d] = p.paymentDate.split('-').map(Number); return { ...p, paymentDate: new Date(y, m - 1, d) }; })
      .reverse();
    const k = buildKontoauszug(BONDS.kirstenA1.meta, dated as any[], STICHTAG);
    for (const z of k.zeilen) expect(z.datum).toMatch(/^\d{4}-\d{2}-\d{2}$/);            // ISO, kein "Tue Jul 15"
    for (let i = 1; i < k.zeilen.length; i++) expect(k.zeilen[i].datum >= k.zeilen[i - 1].datum).toBe(true); // monoton
    expect(k.zeilen[0].typ).toBe('einzahlung');                                          // erster Vorgang oben
    expect(k.endsaldo).toBe(-312.5);                                                     // Anker unberührt
    expect(sollMinusHaben(k.zeilen)).toBe(-312.5);
  });
});
