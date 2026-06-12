// Admin-Detailseite eines Bestandszeichners — LEGACY_CUSTOMERS-aware (Quelle der Wahrheit).
// Gekeyt auf legacy_customers.id (NICHT user_id -> verhindert die users-Verwechslung der alten Seite).
// Saldo/Perioden/Wording kommen aus adminVollzahlerKonto(id), das WOERTLICH dieselbe geteilte
// Funktion (buildVollzahlerKontoView) wie die Investor-Sicht ausfuehrt -> kein zweiter Rechenweg.
// offen-Weiche wie investor-seitig: Vollzahler (offen=0) -> Vollzahler-Block; Saeumiger (offen>0)
// -> Forderungskonto via adminKontokorrent. NUR LESEN (Bearbeiten = Etappe 4).
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const eur = (n: number | null | undefined) =>
  n == null ? "—" : "€ " + Number(n).toLocaleString("de-DE", { minimumFractionDigits: 2 });
const pct = (v: any) => (v == null ? "—" : `${Number(v).toLocaleString("de-DE")} %`);
const de = (d: any) => (d ? new Date(d).toLocaleDateString("de-DE") : "—");

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

export default function BestandszeichnerDetail() {
  const [, params] = useRoute("/admin/bestandszeichner/:legacyId");
  const [, navigate] = useLocation();
  const legacyId = parseInt(params?.legacyId ?? "0", 10);

  const { data: c, isLoading } = trpc.legacyCustomer.getById.useQuery({ id: legacyId }, { enabled: legacyId > 0 });
  const { data: vz } = trpc.legacyCustomer.adminVollzahlerKonto.useQuery({ id: legacyId }, { enabled: legacyId > 0 });
  const { data: kk } = trpc.legacyCustomer.adminKontokorrent.useQuery({ id: legacyId }, { enabled: legacyId > 0 });

  if (!legacyId) return null;
  if (isLoading) return <div className="p-8 text-muted-foreground">Lädt…</div>;
  if (!c) return (
    <div className="p-8">
      <p className="text-muted-foreground mb-4">Bestandszeichner nicht gefunden (id={legacyId}).</p>
      <Button variant="outline" onClick={() => navigate("/admin/bestandskunden")}><ArrowLeft className="w-4 h-4 mr-2" />Zurück</Button>
    </div>
  );

  // Kündigungs-/Laufzeit-Satz parametrisiert (gleiche Logik wie Investor-Sicht).
  const w = vz?.wording;
  const laufzeitSatz = w
    ? [
        w.mindestlaufzeitEnde ? `Die Mindestlaufzeit (§ 4 Abs. 2) endete am ${w.mindestlaufzeitEnde}. ` : "",
        `Die Anleihe läuft seither unbefristet weiter und ist ordentlich nur zu den 12-Monats-Terminen (jeweils ${w.couponTerminMMDD}) mit einer Frist von 3 Monaten kündbar (§ 5 Abs. 1). `,
        w.verfristeterTermin ? `Die Kündigung vom ${w.kuendigungDatum} war für den Termin ${w.verfristeterTermin} verfristet (Eingang erforderlich bis ${w.verfristeterEingangBis}). ` : "",
        w.naechsterTermin ? `Nächstmöglicher Termin: ${w.naechsterTermin}, Eingang bis ${w.naechsterEingangBis}.` : "",
      ].join("")
    : "";

  return (
    <div className="p-6 max-w-4xl space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => navigate("/admin/bestandskunden")}><ArrowLeft className="w-4 h-4" /></Button>
        <div>
          <h1 className="text-xl font-bold">{c.firstName} {c.lastName}</h1>
          <p className="text-sm text-muted-foreground">Bestandszeichner #{c.id} · Vertrag {c.contractNumber} · Anleihe {c.bondNumber ?? "—"}</p>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Persönlich</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-0.5">
            <Row label="Name" value={`${c.firstName} ${c.lastName}`} />
            <Row label="Geburtsdatum" value={de(c.birthDate)} />
            <Row label="E-Mail" value={c.email ?? "—"} />
            <Row label="Telefon" value={c.phone ?? "—"} />
            <Row label="Adresse" value={`${c.street ?? ""} ${c.houseNumber ?? ""}`.trim() || "—"} />
            <Row label="PLZ / Ort" value={`${c.postalCode ?? ""} ${c.city ?? ""}`.trim() || "—"} />
            <Row label="IBAN" value={c.iban ?? "—"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Steuer</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-0.5">
            <Row label="Kapitalertragsteuer" value={pct(c.capitalGainsTax)} />
            <Row label="Solidaritätszuschlag" value={pct(c.solidaritySurcharge)} />
            <Row label="Kirchensteuer" value={pct(c.churchTax)} />
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="text-base">Vertrag / Anleihe</CardTitle></CardHeader>
          <CardContent className="text-sm grid sm:grid-cols-2 gap-x-8 gap-y-0.5">
            <Row label="Zeichnungssumme" value={eur(Number(c.investmentAmount))} />
            <Row label="Zinssatz p.a." value={pct(c.annualInterestRate)} />
            <Row label="Zinsbasis" value={c.zinsbasis ?? "—"} />
            <Row label="Vorfinanzierungs-/Verzugszins p.a." value={pct(c.refinancingRate)} />
            <Row label="Zeichnungsdatum" value={de(c.contractDate)} />
            <Row label="Wertstellung" value={de(c.valueDate)} />
            <Row label="Mindestlaufzeit bis" value={de(c.maturityDate)} />
            <Row label="Kündigung eingegangen" value={de(c.kuendigungEingegangenAm)} />
            <Row label="Kündigungsstatus" value={c.kuendigungStatus ?? "—"} />
            <Row label="Nächster Kündigungstermin" value={de(c.naechsterKuendigungstermin)} />
          </CardContent>
        </Card>
      </div>

      {/* Vollzahler-Block (offen=0) — Saldo/Perioden/Wording aus der geteilten Engine */}
      {vz && (
        <Card>
          <CardHeader><CardTitle className="text-base">Vollzahler-Konto</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-4">
            <div className="space-y-0.5">
              <Row label="Gezeichnet & eingezahlt" value={eur(vz.eingezahlt)} />
              <Row label="Offene Einlage" value={eur(vz.offen)} />
              <Row label="Bereits erhaltene Zinsen (brutto)" value={eur(vz.bereitsErhalten)} />
            </div>

            {vz.perioden && vz.perioden.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground border-b">
                      <th className="text-left font-normal py-1.5 pr-2">Zeitraum</th>
                      <th className="text-right font-normal py-1.5 px-2">Jahreszins</th>
                      <th className="text-right font-normal py-1.5 px-2">Fällig</th>
                      <th className="text-right font-normal py-1.5 pl-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vz.perioden.map((p) => (
                      <tr key={p.index} className="border-b last:border-0">
                        <td className="py-1.5 pr-2">{de(p.von)}–{de(p.bis)}{p.istRumpf && <span className="ml-1 text-xs text-muted-foreground">(Rumpfjahr)</span>}</td>
                        <td className="text-right py-1.5 px-2 font-medium">{eur(p.zins)}</td>
                        <td className="text-right py-1.5 px-2 text-muted-foreground">{de(p.faelligkeit)}{p.unterVorbehalt ? " *" : ""}</td>
                        <td className="text-right py-1.5 pl-2">
                          {p.status === "erfuellt" && <span className="text-green-700">Erfüllt</span>}
                          {p.status === "bedient" && <span className="text-green-700">bedient (Saldo-Ausgleich)</span>}
                          {p.status === "teilweise" && <span className="text-amber-700">Teilweise (offen {eur(p.deckungsluecke)})</span>}
                          {p.status === "offen" && <span className="text-amber-700">Offen *</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {vz.saldo && (
              <div className="rounded-lg border p-3 space-y-1 bg-muted/30">
                <p className="font-medium">Kontokorrent (Stichtag heute)</p>
                <Row label="Offener fälliger Kupon (HABEN)" value={eur(vz.saldo.habenOffenerKupon)} />
                <Row label={`Vorfinanzierungszins (SOLL, ${pct(vz.saldo.refinancingRate)})`} value={eur(vz.saldo.sollVorfinanzierung)} />
                <div className="flex justify-between font-medium border-t pt-1">
                  <span>Saldo</span>
                  <span className={vz.saldo.saldo > 0 ? "text-amber-700" : "text-green-700"}>
                    {eur(vz.saldo.saldo)} {vz.saldo.saldo > 0 ? "(KG-Forderung)" : "(Guthaben)"}
                  </span>
                </div>
              </div>
            )}

            {laufzeitSatz && <p className="text-xs text-muted-foreground border-t pt-2">{laufzeitSatz}</p>}
          </CardContent>
        </Card>
      )}

      {/* Forderungskonto-Block (offen>0, Säumiger) — kontinuierliche Engine via adminKontokorrent */}
      {!vz && kk && kk.konfiguriert && (
        <Card>
          <CardHeader><CardTitle className="text-base">Forderungskonto (Säumiger)</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-0.5">
            <Row label="Gezeichnet" value={eur(kk.gezeichnet)} />
            <Row label="Eingezahlt" value={eur(kk.eingezahlt)} />
            <Row label="Offene Einlage" value={eur(kk.offen)} />
            <Row label="Verzugszins (SOLL)" value={eur(kk.negativzinsSumme)} />
            <Row label="Kupon aufgelaufen (HABEN)" value={eur(kk.kuponAufgelaufen)} />
            <Row label="Ausgezahlte Abschläge" value={eur(kk.ausgezahlt)} />
            <div className="flex justify-between font-medium border-t pt-1">
              <span>Saldo (KG-Forderung)</span>
              <span className="text-amber-700">{eur(kk.saldo)}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
