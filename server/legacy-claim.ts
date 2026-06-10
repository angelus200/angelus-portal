// Kontokorrent-Forderungsmodul fuer saeumige KG-Bestandszeichner.
// Einfacher Staffelzins (kein Zinseszins, beidseitig §289):
//   SOLL  = Negativzins auf das jeweils offene Kapital (investmentAmount - bisher gezahlt), ab Faelligkeit, refinancingRate% p.a.
//   HABEN = aufgelaufener Kupon auf das jeweils gezahlte Kapital, ab jeweiligem Zahlungsdatum, couponRate% p.a.
//   Tilgung = real ausgezahlte Zinsabschlaege (brutto) -> saldo += Betrag (erfuellt einen Teil des Kupon-Anspruchs; +, NICHT -, sonst Doppelzaehlung)
//   SALDO = SOLL - HABEN + Tilgung, zum Stichtag.  >0 = KG-Forderung, <0 = Zeichner-Guthaben.
// Segment-Primitiv wiederverwendet aus interest-calculation.ts (Decimal-praezise, getestet).
import { Decimal } from 'decimal.js';
import { calculateInterestByDateRange } from './interest-calculation';

export type KontoBookingType = 'einzahlung' | 'zinsabschlag';
export interface KontoBooking { date: Date; type: KontoBookingType; amount: number; }

export interface KontoLine {
  date: string;
  art: string;
  soll: number;            // Negativzins-Segment (KG-Forderung)
  haben: number;           // Kupon-Segment (Zeichner-Anspruch)
  tilgung: number;         // ausgezahlter Zinsabschlag
  saldoNachher: number;
  offenesKapital: number;
  gezahltesKapital: number;
}

export interface KontoResult {
  saldo: number;             // >0 = KG-Forderung, <0 = Zeichner-Guthaben
  negativzinsSumme: number;  // Summe SOLL
  kuponAufgelaufen: number;  // Summe HABEN (Anspruch, auch unausgezahlt)
  ausgezahlt: number;        // Summe real ausgezahlter Zinsabschlaege
  kontoauszug: KontoLine[];
}

export interface KontoInput {
  investmentAmount: number;   // gezeichnet
  refinancingRate: number;    // % p.a. (SOLL) - MUSS gesetzt sein (Guard)
  couponRate: number;         // % p.a. (HABEN) = annualInterestRate
  faelligkeit: Date;          // Unterschrift + 14 Tage
  stichtag: Date;
  bookings: KontoBooking[];   // einzahlungen + zinsabschlaege
}

const r2 = (d: Decimal): number => Number(d.toDecimalPlaces(2, Decimal.ROUND_HALF_UP));
const iso = (t: number): string => new Date(t).toISOString().slice(0, 10);

export function computeKontokorrent(input: KontoInput): KontoResult {
  const { investmentAmount, refinancingRate, couponRate, faelligkeit, stichtag } = input;
  if (refinancingRate === null || refinancingRate === undefined) {
    throw new Error('refinancingRate nicht gesetzt - Kontokorrent kann nicht berechnet werden');
  }
  const bookings = [...input.bookings].sort((a, b) => a.date.getTime() - b.date.getTime());
  const firstPayment = bookings.length ? bookings[0].date : faelligkeit;
  const startT = Math.min(firstPayment.getTime(), faelligkeit.getTime());
  const stichT = stichtag.getTime();
  const faelligT = faelligkeit.getTime();

  // Ereignis-Zeitachse: Start, Faelligkeit, jede Buchung, Stichtag (eindeutig, sortiert)
  const tset = new Set<number>([startT, faelligT, stichT]);
  for (const b of bookings) {
    const t = b.date.getTime();
    if (t >= startT && t <= stichT) tset.add(t);
  }
  const times = Array.from(tset).filter(t => t >= startT && t <= stichT).sort((a, b) => a - b);

  let offen = new Decimal(investmentAmount);
  let gezahlt = new Decimal(0);
  let saldo = new Decimal(0);
  let negSum = new Decimal(0), kuponSum = new Decimal(0), ausgezahlt = new Decimal(0);
  const lines: KontoLine[] = [];

  const applyAt = (t: number): void => {
    for (const b of bookings.filter(x => x.date.getTime() === t)) {
      if (b.type === 'einzahlung') {
        offen = offen.minus(b.amount);
        gezahlt = gezahlt.plus(b.amount);
        lines.push({ date: iso(t), art: `Einzahlung ${b.amount.toFixed(2)}`, soll: 0, haben: 0, tilgung: 0, saldoNachher: r2(saldo), offenesKapital: r2(offen), gezahltesKapital: r2(gezahlt) });
      } else {
        saldo = saldo.plus(b.amount);          // Tilgung: +saldo (erfuellter Kupon-Teil)
        ausgezahlt = ausgezahlt.plus(b.amount);
        lines.push({ date: iso(t), art: `Zinsabschlag-Auszahlung ${b.amount.toFixed(2)} (HABEN-Tilgung)`, soll: 0, haben: 0, tilgung: b.amount, saldoNachher: r2(saldo), offenesKapital: r2(offen), gezahltesKapital: r2(gezahlt) });
      }
    }
  };

  applyAt(times[0]);

  for (let i = 0; i < times.length - 1; i++) {
    const a = times[i], b = times[i + 1];
    // SOLL: Negativzins nur ab Faelligkeit und nur auf positives offenes Kapital
    const negInt = (a >= faelligT && offen.gt(0))
      ? calculateInterestByDateRange(offen, refinancingRate, new Date(a), new Date(b)).interestAmount
      : new Decimal(0);
    // HABEN: Kupon auf gezahltes Kapital (ab jeweiligem Zahlungsdatum, auch vor Faelligkeit)
    const kuponInt = gezahlt.gt(0)
      ? calculateInterestByDateRange(gezahlt, couponRate, new Date(a), new Date(b)).interestAmount
      : new Decimal(0);
    saldo = saldo.plus(negInt).minus(kuponInt);
    negSum = negSum.plus(negInt);
    kuponSum = kuponSum.plus(kuponInt);
    const days = Math.round((b - a) / 86400000);
    lines.push({
      date: iso(b),
      art: `Zinssegment ${days}d`,
      soll: r2(negInt), haben: r2(kuponInt), tilgung: 0,
      saldoNachher: r2(saldo), offenesKapital: r2(offen), gezahltesKapital: r2(gezahlt),
    });
    applyAt(b);
  }

  return {
    saldo: r2(saldo),
    negativzinsSumme: r2(negSum),
    kuponAufgelaufen: r2(kuponSum),
    ausgezahlt: r2(ausgezahlt),
    kontoauszug: lines,
  };
}
