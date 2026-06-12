/**
 * P6/P7 — Jahreszins pro Laufzeitjahr + Kontokorrent-Saldo (Vollzahler-Sicht).
 *
 * Pures Modul (nur Engine + Decimal, KEIN DB-Import) -> wie interest-calculation.ts
 * direkt und seiteneffektfrei unit-testbar. Der Router (legacyCustomerRouter.ts)
 * mappt die DB-Row auf PeriodenInput und ruft buildVollzahlerPerioden()/computeVollzahlerSaldo().
 *
 * Modell (Thomas, Option A, 2026-06-11):
 *  - Zinsjahr laeuft vom Stichtag (annualInterestDate, nur MM-DD) bis Stichtag-1Tag.
 *  - Erstes (Rumpf-)Jahr: ab Wertstellung (valueDate) bis zum ersten Zinsjahr-Ende.
 *    Jahreszins ANTEILIG ueber die 30E/360-Engine (calculateInterestByDateRange, zinsbasis des Kunden).
 *  - Volle Folgejahre: Jahreszins = Nennbetrag x Satz (FLAT, §4(3) jaehrlich nachschuessig) —
 *    deckt sich mit der Steuerbescheinigung (volles Jahr @18% = 18.000), NICHT day-count
 *    (ein 06-01->05-31-Jahr ergaebe in 30E/360 nur 359 Tage = 17.950 -> waere falsch).
 *  - Generiert bis zum aktuell LAUFENDEN Jahr (erstes, dessen Faelligkeit in der Zukunft liegt).
 *
 * LEISTUNGSMONAT-ZUORDNUNG (massgeblich, §4(3)-konform): ein Abschlag vom (z.B.) 15. eines Monats
 * settlet den VORMONAT und gehoert damit der Zinsperiode, in die (Auszahlung − 1 Monat) faellt.
 * Diese EINE Zuordnung (periodIndexFor) gilt fuer Tabelle (erhaltenInPeriode/Status) UND Saldo
 * (Vorfin-Termin) -> keine zwei Sichten. Beispiel: der am 15.06. gezahlte Mai-Zins gehoert zum
 * Rumpfjahr (Termin 31.05.), nicht zum Folgejahr.
 *
 * Status DATENGETRIEBEN aus den Abschlaegen (KEIN hartes Flag):
 *  - Faelligkeit (Periodenende) in der Zukunft          -> 'offen'      (+ Vorbehalt §2/§3)
 *  - Faelligkeit vergangen & Abschlaege >= Periodenzins  -> 'erfuellt'
 *  - Faelligkeit vergangen & Abschlaege <  Periodenzins  -> 'teilweise' (Deckungsluecke ausgewiesen)
 */
import { Decimal } from 'decimal.js';
import { calculateInterestByDateRange, days30E360, type ZinsBasis } from './interest-calculation';

export type PeriodeStatus = 'erfuellt' | 'teilweise' | 'offen';

export interface VollzahlerPeriode {
  index: number;
  von: string; // ISO 'YYYY-MM-DD'
  bis: string; // ISO 'YYYY-MM-DD' (= Faelligkeit / Zinsjahr-Ende)
  faelligkeit: string;
  istRumpf: boolean;
  zins: number;
  erhaltenInPeriode: number;
  deckungsluecke: number; // nur bei 'teilweise' > 0
  status: PeriodeStatus;
  unterVorbehalt: boolean; // true NUR fuer offene (zukuenftige) Perioden
}

export interface PeriodenAbschlag {
  date: Date;
  amount: number | Decimal;
}

export interface PeriodenInput {
  valueDate: Date;
  annualInterestDate: Date; // nur Monat/Tag relevant
  nominal: number | Decimal;
  rate: number;
  basis: ZinsBasis;
  zinsAbschlaege: PeriodenAbschlag[]; // confirmed interest_payment (date + brutto)
  today: Date;
}

function utcMidnight(v: Date): Date {
  return new Date(Date.UTC(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate()));
}
const iso = (d: Date) => d.toISOString().slice(0, 10);
const EPS = new Decimal('0.005');

// Leistungsmonat-Zuordnung: Index der Periode, der ein Abschlag zugeordnet wird. Der Abschlag vom
// 15. settlet den VORMONAT -> Periode, in die (Auszahlung − 1 Monat) faellt; vor der ersten Periode
// -> Periode 0. EINE Quelle der Wahrheit fuer Tabelle und Saldo.
function periodIndexFor(pay: Date, vonList: Date[]): number {
  const shift = new Date(pay.getTime());
  shift.setUTCMonth(shift.getUTCMonth() - 1);
  let idx = 0;
  for (let i = 0; i < vonList.length; i++) if (vonList[i].getTime() <= shift.getTime()) idx = i;
  return idx;
}

interface PeriodeBound { von: Date; bis: Date; istVoll: boolean; zins: Decimal; past: boolean; }

// Phase 1: Periodengrenzen (von/bis/zins/istRumpf) bis zum laufenden Jahr — ohne Abschlags-Bezug.
function buildBounds(inp: PeriodenInput): PeriodeBound[] {
  const nominal = new Decimal(inp.nominal);
  const stich = utcMidnight(inp.annualInterestDate);
  const sm = stich.getUTCMonth();
  const sd = stich.getUTCDate();
  const today = utcMidnight(inp.today);

  const bounds: PeriodeBound[] = [];
  let von = utcMidnight(inp.valueDate);
  for (let guard = 0; guard < 100; guard++) {
    // Periodenende = erstes Stichtag-Jubilaeum STRIKT nach `von`, minus 1 Tag (Zinsjahr-Ende).
    let anniv = new Date(Date.UTC(von.getUTCFullYear(), sm, sd));
    if (anniv.getTime() <= von.getTime()) anniv = new Date(Date.UTC(von.getUTCFullYear() + 1, sm, sd));
    const bis = new Date(anniv.getTime());
    bis.setUTCDate(bis.getUTCDate() - 1);
    // Volle Periode = `von` liegt exakt auf dem Stichtag. Erste Teilperiode ab Wertstellung -> Rumpf.
    const istVoll = von.getUTCMonth() === sm && von.getUTCDate() === sd;
    const zins = istVoll
      ? nominal.times(inp.rate).dividedBy(100).toDecimalPlaces(2)
      : new Decimal(calculateInterestByDateRange(nominal, inp.rate, von, bis, inp.basis).interestAmount);
    const past = bis.getTime() < today.getTime();
    bounds.push({ von: new Date(von.getTime()), bis, istVoll, zins, past });
    if (!past) break; // laufendes Jahr erreicht -> Schluss
    von = new Date(anniv.getTime());
  }
  return bounds;
}

// Phase 2+3: Abschlaege per Leistungsmonat je Periode summieren, Status datengetrieben ableiten.
export function buildVollzahlerPerioden(inp: PeriodenInput): VollzahlerPeriode[] {
  const bounds = buildBounds(inp);
  const vonList = bounds.map((b) => b.von);
  const erhalten = bounds.map(() => new Decimal(0));
  for (const a of inp.zinsAbschlaege) {
    const i = periodIndexFor(utcMidnight(a.date), vonList);
    erhalten[i] = erhalten[i].plus(new Decimal(a.amount));
  }

  return bounds.map((b, i) => {
    let status: PeriodeStatus;
    if (!b.past) status = 'offen';
    else if (erhalten[i].gte(b.zins.minus(EPS))) status = 'erfuellt';
    else status = 'teilweise';
    const luecke = status === 'teilweise' ? Decimal.max(new Decimal(0), b.zins.minus(erhalten[i])) : new Decimal(0);
    return {
      index: i,
      von: iso(b.von),
      bis: iso(b.bis),
      faelligkeit: iso(b.bis),
      istRumpf: !b.istVoll,
      zins: Number(b.zins.toDecimalPlaces(2)),
      erhaltenInPeriode: Number(erhalten[i].toDecimalPlaces(2)),
      deckungsluecke: Number(luecke.toDecimalPlaces(2)),
      status,
      unterVorbehalt: !b.past,
    };
  });
}

// ============================================================
// P7 — Vollzahler-Kontokorrent (periodenbasierte Variante, NICHT die kontinuierliche
// computeKontokorrent-Engine der Saeumigen). Reproduziert die KG-Position fuer einen Vollzahler:
//   HABEN = Σ FAELLIGE Coupons (diskret, Coupon-Termin vergangen) − Σ ausgezahlte Abschlaege
//   SOLL  = Vorfinanzierungszins (Variante A, netto): je Abschlag refinancingRate% x
//           days30E360(Auszahlung -> Coupon-Termin der zugehoerigen Periode)/360. Auszahlung VOR
//           Termin = positiv (KG-Vorteil), NACH Termin = negativ (zugunsten Zeichner).
//   SALDO = SOLL − HABEN. >0 = KG-Forderung (Vorzeichen wie computeKontokorrent).
// KEINE Doppelzaehlung: HABEN nutzt diskrete faellige Coupons, NIE den kontinuierlichen Kupon.
// Der naechste (noch nicht faellige) Coupon ist SEPARAT (unter Vorbehalt §2/§3), NICHT im Saldo.
// Zuordnung Abschlag->Coupon-Termin = dieselbe periodIndexFor wie die Tabelle (Leistungsmonat).
// ============================================================
export interface VollzahlerSaldo {
  refinancingRate: number;
  faelligeCoupons: number;    // Σ Coupons faelliger Perioden
  ausgezahlt: number;         // Σ Abschlaege
  habenOffenerKupon: number;  // faelligeCoupons − ausgezahlt (>0 = KG schuldet noch)
  sollVorfinanzierung: number; // netto, signed
  saldo: number;              // SOLL − HABEN (>0 = KG-Forderung)
  naechsterCoupon: { datum: string; betrag: number } | null; // erste offene Periode (Vorbehalt)
}

export function computeVollzahlerSaldo(inp: PeriodenInput & { refinancingRate: number }): VollzahlerSaldo {
  const bounds = buildBounds(inp);
  const vonList = bounds.map((b) => b.von);
  const faelligeCoupons = bounds.filter((b) => b.past).reduce((s, b) => s.plus(b.zins), new Decimal(0));
  const ausgezahlt = inp.zinsAbschlaege.reduce((s, a) => s.plus(new Decimal(a.amount)), new Decimal(0));
  const habenOffenerKupon = faelligeCoupons.minus(ausgezahlt);

  let vorfin = new Decimal(0);
  if (bounds.length > 0) {
    for (const a of inp.zinsAbschlaege) {
      const pay = utcMidnight(a.date);
      const term = bounds[periodIndexFor(pay, vonList)].bis; // Coupon-Termin der zugeordneten Periode
      const tage = days30E360(pay, term); // negativ wenn Auszahlung NACH dem Termin
      vorfin = vorfin.plus(new Decimal(a.amount).times(inp.refinancingRate).times(tage).dividedBy(360).dividedBy(100));
    }
  }
  const saldo = vorfin.minus(habenOffenerKupon);
  const next = bounds.find((b) => !b.past);

  return {
    refinancingRate: inp.refinancingRate,
    faelligeCoupons: Number(faelligeCoupons.toDecimalPlaces(2)),
    ausgezahlt: Number(ausgezahlt.toDecimalPlaces(2)),
    habenOffenerKupon: Number(habenOffenerKupon.toDecimalPlaces(2)),
    sollVorfinanzierung: Number(vorfin.toDecimalPlaces(2)),
    saldo: Number(saldo.toDecimalPlaces(2)),
    naechsterCoupon: next ? { datum: iso(next.bis), betrag: Number(next.zins.toDecimalPlaces(2)) } : null,
  };
}
