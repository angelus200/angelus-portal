// Kontokorrent-Forderungsmodul fuer saeumige KG-Bestandszeichner.
// Einfacher Staffelzins (kein Zinseszins, beidseitig §289):
//   SOLL  = Negativzins auf das jeweils offene Kapital (investmentAmount - bisher gezahlt), ab Faelligkeit, refinancingRate% p.a.
//   HABEN = aufgelaufener Kupon auf das jeweils gezahlte Kapital, ab jeweiligem Zahlungsdatum, couponRate% p.a.
//   Tilgung = real ausgezahlte Zinsabschlaege (brutto) -> saldo += Betrag (erfuellt einen Teil des Kupon-Anspruchs; +, NICHT -, sonst Doppelzaehlung)
//   SALDO = SOLL - HABEN + Tilgung, zum Stichtag.  >0 = KG-Forderung, <0 = Zeichner-Guthaben.
// Segment-Primitiv wiederverwendet aus interest-calculation.ts (Decimal-praezise, getestet).
import { Decimal } from 'decimal.js';
import { calculateInterestByDateRange, type ZinsBasis } from './interest-calculation';

export type KontoBookingType = 'einzahlung' | 'zinsabschlag';
export interface KontoBooking { date: Date; type: KontoBookingType; amount: number; }

export type KontoLineKind = 'einzahlung' | 'verzugszins' | 'zinsgutschrift' | 'auszahlung';
export interface KontoLine {
  date: string;            // Buchungsdatum (YYYY-MM-DD)
  kind: KontoLineKind;
  betrag: number;          // immer positiv; Vorzeichenwirkung ergibt sich aus kind
  basis?: number;          // Bezugsbasis: offene Einlage (verzugszins) bzw. eingezahltes Kapital (zinsgutschrift)
  vonDatum?: string;       // Beginn des Zinszeitraums (nur Zins-Zeilen)
  saldoNachher: number;    // laufender Saldo nach dieser Buchung
}

export interface KontoResult {
  saldo: number;             // >0 = KG-Forderung, <0 = Zeichner-Guthaben
  negativzinsSumme: number;  // Summe SOLL
  kuponAufgelaufen: number;  // Summe HABEN (Anspruch, auch unausgezahlt)
  ausgezahlt: number;        // Summe real ausgezahlter Zinsabschlaege
  gezeichnet: number;        // Zeichnungssumme
  eingezahlt: number;        // Summe der Einzahlungen
  offen: number;             // gezeichnet - eingezahlt
  kontoauszug: KontoLine[];
}

export interface KontoInput {
  investmentAmount: number;   // gezeichnet
  refinancingRate: number;    // % p.a. (SOLL) - MUSS gesetzt sein (Guard)
  couponRate: number;         // % p.a. (HABEN) = annualInterestRate
  faelligkeit: Date;          // Unterschrift + 14 Tage
  stichtag: Date;
  bookings: KontoBooking[];   // einzahlungen + zinsabschlaege
  zinsbasis?: ZinsBasis;      // Tageszählung pro Anleihe; Default 'act/365' (Brenner unveraendert)
}

const r2 = (d: Decimal): number => Number(d.toDecimalPlaces(2, Decimal.ROUND_HALF_UP));
const iso = (t: number): string => new Date(t).toISOString().slice(0, 10);

export function computeKontokorrent(input: KontoInput): KontoResult {
  const { investmentAmount, refinancingRate, couponRate, faelligkeit, stichtag } = input;
  const zinsbasis = input.zinsbasis ?? 'act/365';
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
        lines.push({ date: iso(t), kind: 'einzahlung', betrag: b.amount, saldoNachher: r2(saldo) });
      } else {
        saldo = saldo.plus(b.amount);          // Tilgung: +saldo (erfuellter Kupon-Teil)
        ausgezahlt = ausgezahlt.plus(b.amount);
        lines.push({ date: iso(t), kind: 'auszahlung', betrag: b.amount, saldoNachher: r2(saldo) });
      }
    }
  };

  applyAt(times[0]);

  for (let i = 0; i < times.length - 1; i++) {
    const a = times[i], b = times[i + 1];
    // SOLL: Negativzins nur ab Faelligkeit und nur auf positives offenes Kapital
    const negInt = (a >= faelligT && offen.gt(0))
      ? calculateInterestByDateRange(offen, refinancingRate, new Date(a), new Date(b), zinsbasis).interestAmount
      : new Decimal(0);
    // HABEN: Kupon auf gezahltes Kapital (ab jeweiligem Zahlungsdatum, auch vor Faelligkeit)
    const kuponInt = gezahlt.gt(0)
      ? calculateInterestByDateRange(gezahlt, couponRate, new Date(a), new Date(b), zinsbasis).interestAmount
      : new Decimal(0);
    negSum = negSum.plus(negInt);
    kuponSum = kuponSum.plus(kuponInt);
    // Pro Segment getrennte Buchungen: Verzugszins (SOLL, +) und Zinsgutschrift (HABEN, -).
    if (negInt.gt(0)) {
      saldo = saldo.plus(negInt);
      lines.push({ date: iso(b), kind: 'verzugszins', betrag: r2(negInt), basis: r2(offen), vonDatum: iso(a), saldoNachher: r2(saldo) });
    }
    if (kuponInt.gt(0)) {
      saldo = saldo.minus(kuponInt);
      lines.push({ date: iso(b), kind: 'zinsgutschrift', betrag: r2(kuponInt), basis: r2(gezahlt), vonDatum: iso(a), saldoNachher: r2(saldo) });
    }
    applyAt(b);
  }

  const eingezahlt = bookings.filter(b => b.type === 'einzahlung').reduce((s, b) => s.plus(b.amount), new Decimal(0));
  return {
    saldo: r2(saldo),
    negativzinsSumme: r2(negSum),
    kuponAufgelaufen: r2(kuponSum),
    ausgezahlt: r2(ausgezahlt),
    gezeichnet: r2(new Decimal(investmentAmount)),
    eingezahlt: r2(eingezahlt),
    offen: r2(new Decimal(investmentAmount).minus(eingezahlt)),
    kontoauszug: lines,
  };
}
