// K3/K4 — gemeinsame, rein darstellende Kontoauszug-Anzeige. Bekommt das K2-Journal als Prop
// (kennt KEINE Procedure). Admin- und Investor-Seite rufen je ihre Procedure und reichen das
// Ergebnis hier rein. Betraege kommen aus K2 schon als Number -> nur formatieren; Datum als String
// anzeigen (kein new Date()-TZ-Shift). Vorzeichen-Konvention: >0 Forderung KG, <0 Guthaben Zeichner.
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { isoToDe } from "@shared/format-date"; // ISO -> TT.MM.JJJJ (pur, getestet, kein TZ-Drift)

const eur = (n: number) => "€ " + Number(n).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const FALL_LABEL: Record<string, string> = {
  vollzahler: "Vollzahler",
  verzugszins: "Säumiger (Verzugszins)",
  vfe: "VFE-Schlussabrechnung",
};
const saldoLabel = (s: number) => (s > 0.005 ? "Forderung KG" : s < -0.005 ? "Guthaben Zeichner" : "ausgeglichen");
const saldoColor = (s: number) => (s > 0.005 ? "text-amber-700" : s < -0.005 ? "text-green-700" : "");

interface Zeile { datum: string; buchungstext: string; soll: number; haben: number; saldoLaufend: number; typ: string; }
interface BondMeta {
  contractNumber: string | null; bondNumber: string | null; zinsbasis: string | null;
  refinancingRate: number | null; couponTerminMMDD: string | null;
  annualInterestRate: number | null; investmentAmount: number | null;
}
export interface Auszug { zeilen: Zeile[]; endsaldo: number; fallTyp: string; bondMeta: BondMeta; }
export interface Konsolidierung {
  positionen: { bond: BondMeta; saldo: number; fallTyp: string; label: string }[];
  gesamtsaldo: number;
}

// Ein Bond-Journal (Vollzahler / Säumiger / VFE).
export function KontoauszugView({ auszug }: { auszug: Auszug }) {
  const m = auszug.bondMeta;
  const stichtag = auszug.zeilen.find((z) => z.typ === "saldo")?.datum ?? "";
  const body = auszug.zeilen.filter((z) => z.typ !== "saldo"); // Abschluss-Zeile wandert in den Fuss
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Kontoauszug — Anleihe {m.bondNumber ?? "—"} · Vertrag {m.contractNumber ?? "—"}</CardTitle>
        <p className="text-xs text-muted-foreground">{FALL_LABEL[auszug.fallTyp] ?? auszug.fallTyp} · Stichtag {isoToDe(stichtag)}</p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b">
                <th className="text-left font-normal py-1.5 pr-2">Datum</th>
                <th className="text-left font-normal py-1.5 px-2">Buchungstext</th>
                <th className="text-right font-normal py-1.5 px-2">Soll</th>
                <th className="text-right font-normal py-1.5 px-2">Haben</th>
                <th className="text-right font-normal py-1.5 pl-2">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {body.map((z, i) => {
                const memo = z.soll === 0 && z.haben === 0; // Einzahlung / Steuer -> optisch abgesetzt
                return (
                  <tr key={i} className={`border-b last:border-0 ${memo ? "text-muted-foreground italic" : ""}`}>
                    <td className="py-1.5 pr-2 whitespace-nowrap">{isoToDe(z.datum)}</td>
                    <td className="py-1.5 px-2">{z.buchungstext}</td>
                    <td className="text-right py-1.5 px-2 whitespace-nowrap">{z.soll ? eur(z.soll) : ""}</td>
                    <td className="text-right py-1.5 px-2 whitespace-nowrap">{z.haben ? eur(z.haben) : ""}</td>
                    <td className="text-right py-1.5 pl-2 whitespace-nowrap">{eur(z.saldoLaufend)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex justify-between font-medium border-t pt-2 mt-1">
          <span>Endsaldo</span>
          <span className={saldoColor(auszug.endsaldo)}>{eur(Math.abs(auszug.endsaldo))} ({saldoLabel(auszug.endsaldo)})</span>
        </div>
      </CardContent>
    </Card>
  );
}

// §387-Verrechnungsblock — nur bei Mehrfach-Zeichnern (≥2 Bonds); Ein-Bond zeigt nichts (Saldo steht schon im Auszug).
export function KonsolidierungView({ konsolidierung }: { konsolidierung: Konsolidierung }) {
  const k = konsolidierung;
  if (!k || (k.positionen?.length ?? 0) < 2) return null;
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Verrechnung (§ 387 BGB)</CardTitle></CardHeader>
      <CardContent className="text-sm space-y-1">
        {k.positionen.map((p, i) => (
          <div key={i} className="flex justify-between gap-4 py-0.5">
            <span className="text-muted-foreground">Anleihe {p.bond.bondNumber ?? "—"} · Vertrag {p.bond.contractNumber ?? "—"}</span>
            <span className={`text-right whitespace-nowrap ${saldoColor(p.saldo)}`}>{eur(Math.abs(p.saldo))} ({p.label})</span>
          </div>
        ))}
        <div className="flex justify-between font-medium border-t pt-1 mt-1">
          <span>Gesamtsaldo</span>
          <span className={saldoColor(k.gesamtsaldo)}>{eur(Math.abs(k.gesamtsaldo))} ({saldoLabel(k.gesamtsaldo)})</span>
        </div>
      </CardContent>
    </Card>
  );
}
