// server/tax-service.ts
// Kapitalertragsteuer-Berechnung nach deutschem Steuerrecht (§ 32d EStG)
// Steuersätze Stand 2026: KeSt 25%, Soli 5,5%, KiSt 8% (BY/BW) oder 9% (Rest)

export interface TaxInput {
  kapitalertrag: number;
  kirchensteuerPflichtig: boolean;
  kirchensteuerSatz?: number;  // 0.08 oder 0.09 (default: 0.09)
  freistellungsauftrag?: number;
}

export interface TaxResult {
  kapitalertrag: number;
  freistellungsauftrag: number;
  steuerpflichtigerBetrag: number;
  kest: number;
  soli: number;
  kirchensteuer: number;
  gesamtsteuer: number;
  nettoAuszahlung: number;
  effektiverSteuersatz: number;
}

const SOLI_SATZ = 0.055;

// Bei KiSt-Pflicht reduziert sich KeSt nach § 32d Abs. 1 EStG
function getReduziertenKestSatz(kirchensteuerSatz: number): number {
  return 0.25 / (1 + kirchensteuerSatz * 0.25);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function berechneKapitalertragsteuer(input: TaxInput): TaxResult {
  const {
    kapitalertrag,
    kirchensteuerPflichtig,
    kirchensteuerSatz = 0.09,
    freistellungsauftrag = 0,
  } = input;

  const tatsaecklicherFreibetrag = Math.min(freistellungsauftrag, kapitalertrag);
  const steuerpflichtigerBetrag = Math.max(0, kapitalertrag - tatsaecklicherFreibetrag);

  if (steuerpflichtigerBetrag === 0) {
    return {
      kapitalertrag: round2(kapitalertrag),
      freistellungsauftrag: round2(tatsaecklicherFreibetrag),
      steuerpflichtigerBetrag: 0,
      kest: 0,
      soli: 0,
      kirchensteuer: 0,
      gesamtsteuer: 0,
      nettoAuszahlung: round2(kapitalertrag),
      effektiverSteuersatz: 0,
    };
  }

  let kest: number;
  let kirchensteuer: number;

  if (kirchensteuerPflichtig) {
    const reduzierterKestSatz = getReduziertenKestSatz(kirchensteuerSatz);
    kest = steuerpflichtigerBetrag * reduzierterKestSatz;
    kirchensteuer = kest * kirchensteuerSatz;
  } else {
    kest = steuerpflichtigerBetrag * 0.25;
    kirchensteuer = 0;
  }

  const soli = kest * SOLI_SATZ;
  const gesamtsteuer = kest + soli + kirchensteuer;
  const nettoAuszahlung = kapitalertrag - gesamtsteuer;
  const effektiverSteuersatz = (gesamtsteuer / kapitalertrag) * 100;

  return {
    kapitalertrag: round2(kapitalertrag),
    freistellungsauftrag: round2(tatsaecklicherFreibetrag),
    steuerpflichtigerBetrag: round2(steuerpflichtigerBetrag),
    kest: round2(kest),
    soli: round2(soli),
    kirchensteuer: round2(kirchensteuer),
    gesamtsteuer: round2(gesamtsteuer),
    nettoAuszahlung: round2(nettoAuszahlung),
    effektiverSteuersatz: Math.round(effektiverSteuersatz * 100) / 100,
  };
}

export function berechneAuszahlungsplan(
  zinszahlungen: Array<{ id: number; dueDate: Date | string; amount: number; status: string }>,
  taxInput: Omit<TaxInput, 'kapitalertrag'>
): Array<{ id: number; dueDate: Date | string; brutto: number; tax: TaxResult; status: string }> {
  return zinszahlungen.map(z => ({
    id: z.id,
    dueDate: z.dueDate,
    brutto: z.amount,
    tax: berechneKapitalertragsteuer({ ...taxInput, kapitalertrag: z.amount }),
    status: z.status,
  }));
}
