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
 *  - Faelligkeit (Periodenende) in der Zukunft           -> 'offen'      (+ Vorbehalt §2/§3)
 *  - Faelligkeit vergangen & Abschlaege >= Periodenzins   -> 'erfuellt'
 *  - Faelligkeit vergangen, nominale Luecke <= ausgleichBudget (Vorfinanzierungssaldo)
 *                                                         -> 'bedient'    (Saldo-Ausgleich; P8)
 *  - Faelligkeit vergangen, Luecke >  Budget              -> 'teilweise'  (Deckungsluecke ausgewiesen)
 * Die nominale deckungsluecke wird bei 'bedient' UND 'teilweise' ausgewiesen (Transparenz);
 * 'bedient' heisst nur, dass die Luecke vom Vorfinanzierungssaldo getragen wird. ausgleichBudget
 * wird ueber die abgelaufenen Perioden der Reihe nach VERBRAUCHT (keine Doppelnutzung).
 */
import { Decimal } from 'decimal.js';
import { calculateInterestByDateRange, days30E360, type ZinsBasis } from './interest-calculation';

export type PeriodeStatus = 'erfuellt' | 'bedient' | 'teilweise' | 'offen';

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
  ausgleichBudget?: number | Decimal; // P8: Vorfinanzierungssaldo, der nominale Periodenluecken deckt -> 'bedient'
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

  let remaining = new Decimal(inp.ausgleichBudget ?? 0); // wird der Reihe nach verbraucht
  return bounds.map((b, i) => {
    let status: PeriodeStatus;
    let luecke = new Decimal(0);
    if (!b.past) {
      status = 'offen';
    } else if (erhalten[i].gte(b.zins.minus(EPS))) {
      status = 'erfuellt';
    } else {
      luecke = Decimal.max(new Decimal(0), b.zins.minus(erhalten[i])); // nominale Luecke, immer ausgewiesen
      if (luecke.lte(remaining.plus(EPS))) {
        status = 'bedient';                  // durch Vorfinanzierungssaldo getragen (P8)
        remaining = remaining.minus(luecke);
      } else {
        status = 'teilweise';
      }
    }
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

// ============================================================
// Wording-Datumswerte fuer die Vollzahler-Karte (P8/parametrisiert) — generisch aus Feldern,
// damit KEINE kunden-spezifischen Literale in der UI stehen (sonst saehe der naechste Zeichner
// fremde Kuendigungsdaten). Liefert vorformatierte DE-Strings; die Saetze stehen statisch im
// Frontend (§§-Wortlaut), nur die Daten kommen hierher.
//   - Coupon-Termin MM-DD = Stichtag (annualInterestDate) − 1 Tag (Zinsjahr-Ende), z.B. 01.06. -> "31.05."
//   - Eingangsfrist = Termin − 3 Monate (Monatsende-geklemmt: 31.05. -> 28.02.)
//   - verfristeter Termin = erster Coupon-Termin >= Kuendigungseingang (nur bei status 'zurueckgewiesen')
// ============================================================
export interface VollzahlerWording {
  couponTerminMMDD: string;                 // "31.05."
  mindestlaufzeitEnde: string | null;       // "31.05.2026" (maturityDate)
  kuendigungDatum: string | null;           // "19.05.2026"
  verfristeterTermin: string | null;        // "31.05.2026" (nur bei zurueckgewiesen)
  verfristeterEingangBis: string | null;    // "28.02.2026"
  naechsterTermin: string | null;           // "31.05.2027"
  naechsterEingangBis: string | null;       // "28.02.2027"
}

function fmtDE(d: Date): string {
  return `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${d.getUTCFullYear()}`;
}
// Datum − n Monate, Tag auf das Monatsende des Zielmonats geklemmt (31.05. − 3M -> 28.02.).
function minusMonths(d: Date, n: number): Date {
  const total = d.getUTCFullYear() * 12 + d.getUTCMonth() - n;
  const y = Math.floor(total / 12);
  const m = ((total % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(d.getUTCDate(), lastDay)));
}

export function buildVollzahlerWording(inp: {
  annualInterestDate: Date;
  maturityDate: Date | null;
  kuendigungStatus: string | null;
  kuendigungEingegangenAm: Date | null;
  naechsterKuendigungstermin: Date | null;
}): VollzahlerWording {
  const stich = utcMidnight(inp.annualInterestDate);
  const term1 = new Date(stich.getTime());
  term1.setUTCDate(term1.getUTCDate() - 1); // Coupon-Termin = Zinsjahr-Ende = Stichtag − 1 Tag
  const tm = term1.getUTCMonth();
  const td = term1.getUTCDate();
  const couponTerminMMDD = `${String(td).padStart(2, '0')}.${String(tm + 1).padStart(2, '0')}.`;

  let kuendigungDatum: string | null = null;
  let verfristeterTermin: string | null = null;
  let verfristeterEingangBis: string | null = null;
  if (inp.kuendigungStatus === 'zurueckgewiesen' && inp.kuendigungEingegangenAm) {
    const k = utcMidnight(inp.kuendigungEingegangenAm);
    kuendigungDatum = fmtDE(k);
    let cand = new Date(Date.UTC(k.getUTCFullYear(), tm, td)); // erster Coupon-Termin >= Kuendigung
    if (cand.getTime() < k.getTime()) cand = new Date(Date.UTC(k.getUTCFullYear() + 1, tm, td));
    verfristeterTermin = fmtDE(cand);
    verfristeterEingangBis = fmtDE(minusMonths(cand, 3));
  }

  let naechsterTermin: string | null = null;
  let naechsterEingangBis: string | null = null;
  if (inp.naechsterKuendigungstermin) {
    const nt = utcMidnight(inp.naechsterKuendigungstermin);
    naechsterTermin = fmtDE(nt);
    naechsterEingangBis = fmtDE(minusMonths(nt, 3));
  }

  return {
    couponTerminMMDD,
    mindestlaufzeitEnde: inp.maturityDate ? fmtDE(utcMidnight(inp.maturityDate)) : null,
    kuendigungDatum,
    verfristeterTermin,
    verfristeterEingangBis,
    naechsterTermin,
    naechsterEingangBis,
  };
}
