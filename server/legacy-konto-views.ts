// Geteilte Konto-Sichten der Bestandszeichner (Vollzahler / Forderung / VFE / Per-Bond-Weiche).
// PURES Modul: nur Engines (legacy-claim, vollzahler-perioden) + Decimal, KEIN DB-/Router-Import —
// damit Engine-Code (z. B. kontoauszug-engine.ts) und Tests es ohne Router-Seiteneffekte laden.
// Extrahiert aus legacyCustomerRouter.ts (Etappe K1); Verhalten unveraendert (Anker-Tests beweisen es).
import { Decimal } from 'decimal.js';
import { computeKontokorrent, computeVfeSchlussabrechnung, type KontoBooking, type KontoInput } from './legacy-claim';
import { buildVollzahlerPerioden, computeVollzahlerSaldo, buildVollzahlerWording } from './vollzahler-perioden';

// Normalisiert ein DB-Datum (Date oder 'YYYY-MM-DD'-String) TZ-robust auf UTC-Kalendertag-Mitternacht.
// Verhindert Off-by-one bei Tages-Arithmetik, egal in welcher Zeitzone der Prozess laeuft.
export function toUtcCalendarMidnight(v: any): Date {
  if (typeof v === 'string') {
    const [y, m, d] = v.slice(0, 10).split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }
  const dt = new Date(v);
  return new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()));
}

// Baut KontoInput aus DB-Rows (Kunde + payment_history) fuer das Kontokorrent-Forderungsmodul.
// Faelligkeit = Zeichnungsdatum (contractDate) + 14 Tage. null = nicht konfiguriert (kein Refi-Satz / Stammdaten fehlen).
// Alle Datumswerte auf UTC-Kalendertag normalisiert -> taggenaue, TZ-unabhaengige Berechnung.
export function buildKontoInput(c: any, payments: any[], stichtag: Date): KontoInput | null {
  if (c.refinancingRate == null || c.contractDate == null || c.investmentAmount == null || c.annualInterestRate == null) {
    return null;
  }
  // WEICHE: kontinuierliches Forderungs-Kontokorrent NUR bei offener Einlage (offen > 0). Vollzahler
  // (offen = 0) niemals durch diese Engine, auch wenn refinancingRate gesetzt ist — bei ihnen steuert
  // refinancingRate den Vorfinanzierungssatz (computeVollzahlerSaldo), nicht den Negativzins.
  const eingezahltSum = payments
    .filter((p: any) => (p.status ?? 'confirmed') === 'confirmed' && p.paymentType === 'initial_investment')
    .reduce((s: number, p: any) => s + Number(p.amount), 0);
  if (Number(c.investmentAmount) - eingezahltSum <= 0.005) return null; // Vollzahler -> kein Forderungs-Kontokorrent
  const faelligkeit = toUtcCalendarMidnight(c.contractDate);
  faelligkeit.setUTCDate(faelligkeit.getUTCDate() + 14);
  const bookings: KontoBooking[] = payments
    .filter((p: any) => (p.status ?? 'confirmed') === 'confirmed')
    .filter((p: any) => p.paymentType === 'initial_investment' || p.paymentType === 'interest_payment')
    .map((p: any) => ({
      date: toUtcCalendarMidnight(p.paymentDate),
      type: p.paymentType === 'initial_investment' ? ('einzahlung' as const) : ('zinsabschlag' as const),
      amount: Number(p.amount),
    }));
  return {
    investmentAmount: Number(c.investmentAmount),
    refinancingRate: Number(c.refinancingRate),
    couponRate: Number(c.annualInterestRate),
    faelligkeit,
    stichtag: toUtcCalendarMidnight(stichtag),
    bookings,
    zinsbasis: ((c as any).zinsbasis as 'act/365' | '30E/360' | null) ?? 'act/365',
  };
}

// Geteilte Vollzahler-Kontosicht (P6/P7/P8): aus legacy_customer-Row + payment_history. EINE Quelle
// fuer myVollzahlerKonto (self) UND die kuenftige Admin-Sicht (adminVollzahlerKonto by id) -> Admin-
// und Investor-Sicht sind konstruktiv identisch, KEIN zweiter Rechenweg. null = kein Vollzahler
// (kein Datensatz / kein investmentAmount / offene Einlage > 0 -> Forderungskonto via myKontokorrent).
export function buildVollzahlerKontoView(c: any, payments: any[], today: Date) {
  if (!c || c.investmentAmount == null) return null;
  const conf = payments.filter((p: any) => (p.status ?? 'confirmed') === 'confirmed');
  const sumOf = (t: string) => conf
    .filter((p: any) => p.paymentType === t)
    .reduce((s: Decimal, p: any) => s.plus(new Decimal(p.amount)), new Decimal(0));
  const gezeichnet = new Decimal(c.investmentAmount);
  const eingezahlt = sumOf('initial_investment');
  const offen = gezeichnet.minus(eingezahlt);
  if (offen.gt(new Decimal('0.005'))) return null; // offene Einlage > 0 -> Forderungskonto
  const bereitsErhalten = sumOf('interest_payment');

  const hatPeriodenBasis = c.valueDate != null && c.annualInterestDate != null && c.annualInterestRate != null;
  const periodenInput = hatPeriodenBasis
    ? {
        valueDate: toUtcCalendarMidnight(c.valueDate),
        annualInterestDate: toUtcCalendarMidnight(c.annualInterestDate),
        nominal: gezeichnet,
        rate: Number(c.annualInterestRate),
        basis: ((c as any).zinsbasis as 'act/365' | '30E/360' | null) ?? 'act/365',
        zinsAbschlaege: conf
          .filter((p: any) => p.paymentType === 'interest_payment')
          .map((p: any) => ({ date: toUtcCalendarMidnight(p.paymentDate), amount: Number(p.amount) })),
        today,
      }
    : null;
  // P7-Saldo nur wenn refinancingRate (Vorfinanzierungssatz) gesetzt; offen=0 -> Weiche verhindert die kontinuierliche Engine.
  const saldo = (periodenInput && c.refinancingRate != null)
    ? computeVollzahlerSaldo({ ...periodenInput, refinancingRate: Number(c.refinancingRate) })
    : null;
  // P8: abgelaufene Periodenluecken, die der Vorfinanzierungssaldo traegt, als "bedient" markieren.
  const perioden = periodenInput
    ? buildVollzahlerPerioden({ ...periodenInput, ausgleichBudget: saldo?.sollVorfinanzierung ?? 0 })
    : [];
  const wording = c.annualInterestDate != null
    ? buildVollzahlerWording({
        annualInterestDate: toUtcCalendarMidnight(c.annualInterestDate),
        maturityDate: c.maturityDate != null ? toUtcCalendarMidnight(c.maturityDate) : null,
        kuendigungStatus: ((c as any).kuendigungStatus as string | null) ?? null,
        kuendigungEingegangenAm: (c as any).kuendigungEingegangenAm != null ? toUtcCalendarMidnight((c as any).kuendigungEingegangenAm) : null,
        naechsterKuendigungstermin: (c as any).naechsterKuendigungstermin != null ? toUtcCalendarMidnight((c as any).naechsterKuendigungstermin) : null,
      })
    : null;
  const rueckzahlung = (c as any).naechsterKuendigungstermin != null
    ? {
        datum: toUtcCalendarMidnight((c as any).naechsterKuendigungstermin).toISOString().slice(0, 10),
        betrag: Number(gezeichnet.toDecimalPlaces(2)),
      }
    : null;

  return {
    gezeichnet: Number(gezeichnet.toDecimalPlaces(2)),
    eingezahlt: Number(eingezahlt.toDecimalPlaces(2)),
    offen: 0,
    couponRate: c.annualInterestRate != null ? Number(c.annualInterestRate) : null,
    zinsbasis: ((c as any).zinsbasis as 'act/365' | '30E/360' | null) ?? 'act/365',
    bereitsErhalten: Number(bereitsErhalten.toDecimalPlaces(2)),
    perioden,
    saldo,
    wording,
    rueckzahlung,
    contractDate: c.contractDate ?? null,
    valueDate: c.valueDate ?? null,
    maturityDate: c.maturityDate ?? null,
    kuendigungEingegangenAm: (c as any).kuendigungEingegangenAm ?? null,
    kuendigungStatus: ((c as any).kuendigungStatus as string | null) ?? null,
    naechsterKuendigungstermin: (c as any).naechsterKuendigungstermin ?? null,
  };
}

// Geteilte Forderungskonto-Sicht (Säumiger, offen>0) — EINE Quelle für myKontokorrent (self) UND
// adminKontokorrent (by id), kein zweiter Rechenweg. Drei-Fälle-Weiche zusammen mit
// buildVollzahlerKontoView (offen=0): hier offen>0; bei kuendigungStatus='wirksam' + vfeSatz gesetzt
// ist die VFE-Schlussabrechnung der MASSGEBLICHE Saldo, der kontinuierliche Verzugszins bleibt nur
// historischer Hinweis (massgeblich='vfe'); sonst laufendes Forderungskonto (massgeblich='verzugszins').
export function buildForderungskontoView(c: any, payments: any[], today: Date) {
  const ki = buildKontoInput(c, payments, today);
  if (!ki) return { konfiguriert: false as const };
  const r = computeKontokorrent(ki);
  const base = {
    konfiguriert: true as const,
    stichtag: ki.stichtag.toISOString().slice(0, 10),
    faelligkeit: ki.faelligkeit.toISOString().slice(0, 10),
    refinancingRate: Number(c.refinancingRate),
    couponRate: Number(c.annualInterestRate),
    ...r,
  };
  // Fall 3: wirksame Kündigung + VFE-Satz gesetzt -> VFE-Schlussabrechnung ist maßgeblich.
  if ((c as any).kuendigungStatus === 'wirksam' && (c as any).vfeSatz != null) {
    const vfe = computeVfeSchlussabrechnung({
      investmentAmount: Number(c.investmentAmount),
      eingezahlt: r.eingezahlt,
      annualInterestRate: Number(c.annualInterestRate),
      vfeSatz: Number((c as any).vfeSatz),
      schadensersatzTeilbetrag: Number((c as any).schadensersatzTeilbetrag ?? 0),
      vergleichsfrist: (c as any).vergleichsfrist != null
        ? toUtcCalendarMidnight((c as any).vergleichsfrist).toISOString().slice(0, 10)
        : null,
    });
    return { ...base, massgeblich: 'vfe' as const, vfe };
  }
  return { ...base, massgeblich: 'verzugszins' as const };
}

// E3: Per-Bond-Sicht (1:n). Kombiniert die Weiche: Vollzahler (offen=0) ODER Forderung/VFE (offen>0)
// — DIESELBEN geteilten Engines wie self/admin (kein zweiter Rechenweg). Payments sind bond-eigen.
export function buildBondView(bond: any, payments: any[], today: Date) {
  const vollzahler = buildVollzahlerKontoView(bond, payments, today); // null wenn offen>0 / keine Anleihedaten
  const forderung = vollzahler ? null : buildForderungskontoView(bond, payments, today);
  return {
    bondId: bond.id,
    contractNumber: bond.contractNumber,
    bondNumber: bond.bondNumber,
    status: bond.status,
    // Anleihe-Metadaten fuer die "Vertrag"-Karte je Bond (UI). Regressionsneutral (Saldo = vollzahler/forderung).
    meta: {
      investmentAmount: bond.investmentAmount != null ? Number(bond.investmentAmount) : null,
      annualInterestRate: bond.annualInterestRate != null ? Number(bond.annualInterestRate) : null,
      zinsbasis: bond.zinsbasis ?? null,
      refinancingRate: bond.refinancingRate != null ? Number(bond.refinancingRate) : null,
      contractDate: bond.contractDate ?? null,
      valueDate: bond.valueDate ?? null,
      maturityDate: bond.maturityDate ?? null,
      kuendigungEingegangenAm: bond.kuendigungEingegangenAm ?? null,
      kuendigungStatus: bond.kuendigungStatus ?? null,
      naechsterKuendigungstermin: bond.naechsterKuendigungstermin ?? null,
    },
    vollzahler,
    forderung,
  };
}
