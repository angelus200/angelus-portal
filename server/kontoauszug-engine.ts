// K1 — Kontoauszug-Engine (pur, server-only). Leitet aus den BESTEHENDEN Engines
// (buildVollzahlerKontoView / buildForderungskontoView / computeVfeSchlussabrechnung über
// buildForderungskontoView) ein Per-Bond-Journal + eine §387-Konsolidierung ab.
// KEIN zweiter Rechenweg: endsaldo == <engine>.saldo (byte-identisch by construction); das Journal
// ist die saldo-tragende Aufschlüsselung. Einzahlung & Steuer sind MEMO-Zeilen (soll=haben=0), damit
// der Engine-Saldo (brutto/brutto, ohne Kapital, ohne Steuerterm) unangetastet bleibt.
// Datumswerte als Strings (YYYY-MM-DD), keine DB-Zugriffe.
import { Decimal } from 'decimal.js';
import {
  buildVollzahlerKontoView,
  buildForderungskontoView,
  toUtcCalendarMidnight,
} from './legacy-konto-views';

const r2 = (d: Decimal): number => Number(d.toDecimalPlaces(2, Decimal.ROUND_HALF_UP));

export type KontoauszugTyp =
  | 'einzahlung'
  | 'coupon_gutschrift'
  | 'steuer_abfuehrung'
  | 'abschlag'
  | 'vorfinanzierungszins'
  | 'verzugszins'
  | 'vfe_position'
  | 'saldo';

export type FallTyp = 'vollzahler' | 'verzugszins' | 'vfe';

export interface KontoauszugZeile {
  datum: string;          // YYYY-MM-DD
  buchungstext: string;
  soll: number;           // >0 erhöht KG-Forderung; Memo-Zeilen = 0
  haben: number;          // >0 senkt KG-Forderung (Guthaben Zeichner); Memo-Zeilen = 0
  saldoLaufend: number;   // kumuliert (Σsoll − Σhaben); Memo-Zeilen unverändert
  typ: KontoauszugTyp;
}

export interface KontoauszugBondMeta {
  contractNumber: string | null;
  bondNumber: string | null;
  investmentAmount: number | null;
  annualInterestRate: number | null;
  zinsbasis: string | null;
  refinancingRate: number | null;
  couponTerminMMDD: string | null;
}

export interface Kontoauszug {
  zeilen: KontoauszugZeile[];
  endsaldo: number;       // byte-identisch zum Engine-Saldo (>0 KG-Forderung, <0 Guthaben Zeichner)
  fallTyp: FallTyp;
  bondMeta: KontoauszugBondMeta;
}

export interface SteuerSaetze {
  kapitalertragsteuer: number; // % (i.d.R. 25)
  soli: number;                // % auf die KeSt (i.d.R. 5,5)
  kirchensteuer: number;       // % (0 wenn keine)
}

// §32d Abs.1 EStG: bei Kirchensteuerpflicht reduzierter KeSt-Satz. NUR Memo (kein Saldo-Effekt).
function steuerAufCoupon(brutto: number, s: SteuerSaetze): number {
  const kiStSatz = new Decimal(s.kirchensteuer).dividedBy(100);
  const kestSatz = new Decimal(s.kapitalertragsteuer).dividedBy(100);
  const reduz = s.kirchensteuer > 0 ? kestSatz.dividedBy(new Decimal(1).plus(kiStSatz.times(kestSatz))) : kestSatz;
  const kest = new Decimal(brutto).times(reduz);
  const kirche = kest.times(kiStSatz);
  const soli = kest.times(new Decimal(s.soli).dividedBy(100));
  return r2(kest.plus(kirche).plus(soli));
}

const eur = (n: number) => n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

function bondMetaOf(bond: any, couponTerminMMDD: string | null): KontoauszugBondMeta {
  return {
    contractNumber: bond.contractNumber ?? null,
    bondNumber: bond.bondNumber ?? null,
    investmentAmount: bond.investmentAmount != null ? Number(bond.investmentAmount) : null,
    annualInterestRate: bond.annualInterestRate != null ? Number(bond.annualInterestRate) : null,
    zinsbasis: bond.zinsbasis ?? null,
    refinancingRate: bond.refinancingRate != null ? Number(bond.refinancingRate) : null,
    couponTerminMMDD,
  };
}

// Akkumuliert saldoLaufend (Memo-Zeilen lassen das Laufende unverändert) und hängt eine Abschluss-
// Saldo-Zeile an. Gibt {zeilen, endsaldoJournal} zurück — endsaldoJournal = Σsoll − Σhaben.
function finalisiere(roh: Omit<KontoauszugZeile, 'saldoLaufend'>[], stichtag: string): { zeilen: KontoauszugZeile[]; journalSaldo: number } {
  let running = new Decimal(0);
  const zeilen: KontoauszugZeile[] = roh.map((z) => {
    running = running.plus(z.soll).minus(z.haben);
    return { ...z, saldoLaufend: r2(running) };
  });
  zeilen.push({ datum: stichtag, buchungstext: 'Saldo zum Stichtag', soll: 0, haben: 0, saldoLaufend: r2(running), typ: 'saldo' });
  return { zeilen, journalSaldo: r2(running) };
}

// ============================================================
// FUNKTION 1 — Per-Bond-Kontoauszug. Ruft die bestehende Engine, leitet das Journal ab.
// ============================================================
export function buildKontoauszug(bond: any, payments: any[], stichtag: string, opts?: { steuerSaetze?: SteuerSaetze }): Kontoauszug {
  const today = toUtcCalendarMidnight(stichtag);
  const vz: any = buildVollzahlerKontoView(bond, payments, today);

  // ---- Fall 1: Vollzahler (offen=0) ----
  if (vz) {
    const roh: Omit<KontoauszugZeile, 'saldoLaufend'>[] = [];

    // Einzahlungen (Memo — Kapital steht nicht im Zins-Kontokorrent)
    for (const p of payments.filter((x: any) => (x.status ?? 'confirmed') === 'confirmed' && x.paymentType === 'initial_investment')) {
      roh.push({ datum: String(p.paymentDate).slice(0, 10), buchungstext: `Einzahlung Kapital ${eur(Number(p.amount))}`, soll: 0, haben: 0, typ: 'einzahlung' });
    }
    // Coupon-Gutschriften je FÄLLIGER Periode (brutto, HABEN) + optionales Steuer-Memo
    for (const per of (vz.perioden ?? []).filter((per: any) => !per.unterVorbehalt)) {
      roh.push({
        datum: per.faelligkeit,
        buchungstext: `Coupon-Gutschrift ${per.von}–${per.bis}${per.istRumpf ? ' (Rumpfjahr)' : ''} (brutto)`,
        soll: 0, haben: r2(new Decimal(per.zins)), typ: 'coupon_gutschrift',
      });
      if (opts?.steuerSaetze) {
        const st = steuerAufCoupon(Number(per.zins), opts.steuerSaetze);
        roh.push({ datum: per.faelligkeit, buchungstext: `davon Steuerabführung (KeSt/SolZ/KiSt) ${eur(st)} — Teil-Erfüllung`, soll: 0, haben: 0, typ: 'steuer_abfuehrung' });
      }
    }
    // Monatliche Abschläge (SOLL)
    for (const p of payments.filter((x: any) => (x.status ?? 'confirmed') === 'confirmed' && x.paymentType === 'interest_payment')) {
      roh.push({ datum: String(p.paymentDate).slice(0, 10), buchungstext: `Zinsabschlag (Vorauszahlung, brutto)`, soll: r2(new Decimal(p.amount)), haben: 0, typ: 'abschlag' });
    }
    // Vorfinanzierungszins (Aggregat zum Stichtag; refinancing_rate pro Bond) — signiert
    const vorfin = new Decimal(vz.saldo?.sollVorfinanzierung ?? 0);
    roh.push({
      datum: stichtag,
      buchungstext: `Vorfinanzierungszins (${vz.saldo?.refinancingRate ?? bond.refinancingRate}% p.a., Σ zum Stichtag)`,
      soll: vorfin.gte(0) ? r2(vorfin) : 0,
      haben: vorfin.lt(0) ? r2(vorfin.negated()) : 0,
      typ: 'vorfinanzierungszins',
    });

    // chronologisch stabil sortieren (Datum, dann fixe Typ-Reihenfolge)
    const order: Record<KontoauszugTyp, number> = { einzahlung: 0, coupon_gutschrift: 1, steuer_abfuehrung: 2, abschlag: 3, vorfinanzierungszins: 4, verzugszins: 4, vfe_position: 5, saldo: 9 };
    roh.sort((a, b) => (a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : order[a.typ] - order[b.typ]));

    const { zeilen } = finalisiere(roh, stichtag);
    return { zeilen, endsaldo: r2(new Decimal(vz.saldo?.saldo ?? 0)), fallTyp: 'vollzahler', bondMeta: bondMetaOf(bond, vz.wording?.couponTerminMMDD ?? null) };
  }

  // ---- Fall 2/3: Forderung (offen>0) ----
  const fo: any = buildForderungskontoView(bond, payments, today);
  if (!fo || fo.konfiguriert === false) {
    return { zeilen: [], endsaldo: 0, fallTyp: 'verzugszins', bondMeta: bondMetaOf(bond, null) };
  }

  // ---- Fall 3: VFE-Schlussabrechnung maßgeblich ----
  if (fo.massgeblich === 'vfe' && fo.vfe) {
    const v = fo.vfe;
    const quote = v.vfeBetrag && bond.investmentAmount ? (Number(v.vfeBetrag) / Number(bond.investmentAmount)) * 100 : 0;
    const roh: Omit<KontoauszugZeile, 'saldoLaufend'>[] = [
      { datum: stichtag, buchungstext: `VFE-Betrag (${quote.toLocaleString('de-DE', { maximumFractionDigits: 2 })} % v. Nennbetrag)`, soll: r2(new Decimal(v.vfeBetrag)), haben: 0, typ: 'vfe_position' },
      { datum: stichtag, buchungstext: `./. eingezahlte Einlage`, soll: 0, haben: r2(new Decimal(v.einlage)), typ: 'vfe_position' },
      { datum: stichtag, buchungstext: `+ Schadensersatz (offen × Coupon × 5 J.)`, soll: r2(new Decimal(v.schadensersatzVoll)), haben: 0, typ: 'vfe_position' },
    ];
    const { zeilen } = finalisiere(roh, stichtag);
    return { zeilen, endsaldo: r2(new Decimal(v.massgeblicherSaldo)), fallTyp: 'vfe', bondMeta: bondMetaOf(bond, null) };
  }

  // ---- Fall 2: laufendes Forderungskonto (Verzugszins) — bestehendes Engine-Journal mappen ----
  const kindMap: Record<string, { typ: KontoauszugTyp; seite: 'soll' | 'haben' | 'memo' }> = {
    einzahlung: { typ: 'einzahlung', seite: 'memo' },
    verzugszins: { typ: 'verzugszins', seite: 'soll' },
    zinsgutschrift: { typ: 'coupon_gutschrift', seite: 'haben' },
    auszahlung: { typ: 'abschlag', seite: 'soll' },
  };
  const zeilen: KontoauszugZeile[] = (fo.kontoauszug ?? []).map((l: any) => {
    const m = kindMap[l.kind] ?? { typ: 'saldo' as KontoauszugTyp, seite: 'memo' as const };
    const text =
      l.kind === 'einzahlung' ? `Einzahlung Kapital ${eur(l.betrag)}`
      : l.kind === 'verzugszins' ? `Verzugszins (${fo.refinancingRate}% p.a.${l.vonDatum ? ', seit ' + l.vonDatum : ''})`
      : l.kind === 'zinsgutschrift' ? `Zinsgutschrift auf eingezahltes Kapital (${fo.couponRate}% p.a.)`
      : `Zinsabschlag (Auszahlung, brutto)`;
    return {
      datum: l.date,
      buchungstext: text,
      soll: m.seite === 'soll' ? r2(new Decimal(l.betrag)) : 0,
      haben: m.seite === 'haben' ? r2(new Decimal(l.betrag)) : 0,
      saldoLaufend: r2(new Decimal(l.saldoNachher)),
      typ: m.typ,
    };
  });
  zeilen.push({ datum: stichtag, buchungstext: 'Saldo zum Stichtag', soll: 0, haben: 0, saldoLaufend: r2(new Decimal(fo.saldo)), typ: 'saldo' });
  return { zeilen, endsaldo: r2(new Decimal(fo.saldo)), fallTyp: 'verzugszins', bondMeta: bondMetaOf(bond, null) };
}

// ============================================================
// FUNKTION 2 — §387-Konsolidierung (Aufrechnung Forderungen ggn. Guthaben über alle Bonds eines Zeichners).
// Ein-Bond-Zeichner durchlaufen denselben Pfad (gesamtsaldo = bondsaldo), KEIN Sonderpfad.
// ============================================================
export interface KonsolidierungPosition {
  bond: KontoauszugBondMeta;
  saldo: number;          // = endsaldo des Bonds (VFE-Bonds: VFE-Endbetrag)
  fallTyp: FallTyp;
  label: string;          // 'Forderung KG' | 'Guthaben Zeichner' | 'ausgeglichen'
}
export interface Konsolidierung {
  positionen: KonsolidierungPosition[];
  gesamtsaldo: number;    // §387: Σ endsaldi; >0 Forderung KG, <0 Guthaben Zeichner
}

export function buildZeichnerKonsolidierung(
  bondErgebnisse: Array<{ endsaldo: number; bondMeta: KontoauszugBondMeta; fallTyp: FallTyp }>,
): Konsolidierung {
  let gesamt = new Decimal(0);
  const positionen: KonsolidierungPosition[] = bondErgebnisse.map((b) => {
    gesamt = gesamt.plus(new Decimal(b.endsaldo));
    const label = b.endsaldo > 0.005 ? 'Forderung KG' : b.endsaldo < -0.005 ? 'Guthaben Zeichner' : 'ausgeglichen';
    return { bond: b.bondMeta, saldo: r2(new Decimal(b.endsaldo)), fallTyp: b.fallTyp, label };
  });
  return { positionen, gesamtsaldo: r2(gesamt) };
}
