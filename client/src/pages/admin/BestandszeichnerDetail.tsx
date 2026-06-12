// Admin-Detailseite eines Bestandszeichners — LEGACY_CUSTOMERS-aware (Quelle der Wahrheit).
// Gekeyt auf legacy_customers.id (NICHT user_id -> verhindert die users-Verwechslung der alten Seite).
// Saldo/Perioden/Wording kommen aus adminVollzahlerKonto(id), das WOERTLICH dieselbe geteilte
// Funktion (buildVollzahlerKontoView) wie die Investor-Sicht ausfuehrt -> kein zweiter Rechenweg.
// offen-Weiche wie investor-seitig: Vollzahler (offen=0) -> Vollzahler-Block; Saeumiger (offen>0)
// -> Forderungskonto via adminKontokorrent. NUR LESEN (Bearbeiten = Etappe 4).
import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Upload, Loader2 } from "lucide-react";

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
  const { data: docs = [], refetch: refetchDocs } = trpc.legacyCustomer.documents.getByCustomerId.useQuery(
    { legacyCustomerId: legacyId },
    { enabled: legacyId > 0 }
  );

  // Upload (Admin) -> POST /api/legacy-document (legacy_customers-gekeyt, beliebiger Typ + Richtung).
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState("other");
  const [richtung, setRichtung] = useState("");
  const [uploading, setUploading] = useState(false);
  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("legacyCustomerId", String(legacyId));
      fd.append("documentType", docType);
      if (richtung) fd.append("richtung", richtung);
      const res = await fetch("/api/legacy-document", { method: "POST", body: fd });
      if (!res.ok) {
        // Robust: Response kann JSON (App-Fehler) ODER HTML/leer (502 Proxy) sein -> nicht blind res.json()
        const text = await res.text().catch(() => "");
        let detail = text;
        try { detail = JSON.parse(text).error || text; } catch { /* HTML/leer -> Rohtext */ }
        throw new Error(`Upload fehlgeschlagen (HTTP ${res.status})${detail ? ": " + String(detail).slice(0, 200) : ""}`);
      }
      setFile(null);
      await refetchDocs();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setUploading(false);
    }
  };

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

      {/* Forderungskonto-Block (offen>0, Säumiger) — kontinuierliche Engine via adminKontokorrent.
          Fall 3 (massgeblich='vfe'): VFE-Schlussabrechnung ist Hauptsaldo, Verzugszins nur historisch. */}
      {!vz && kk && kk.konfiguriert && (kk as any).massgeblich === "vfe" && (kk as any).vfe && (
        <Card>
          <CardHeader><CardTitle className="text-base">VFE-Schlussabrechnung (gekündigt)</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-3">
            <div className="space-y-0.5">
              <Row label={`VFE-Betrag (${pct(Number((kk as any).vfe.vfeBetrag) / Number(kk.gezeichnet) * 100)} v. Nennbetrag)`} value={eur((kk as any).vfe.vfeBetrag)} />
              <Row label="./. eingezahlte Einlage" value={eur((kk as any).vfe.einlage)} />
              <Row label="= Differenz" value={eur((kk as any).vfe.differenz)} />
              <Row label="+ Schadensersatz (offen × Coupon × 5 J.)" value={eur((kk as any).vfe.schadensersatzVoll)} />
              <div className="flex justify-between font-medium border-t pt-1">
                <span>Maßgeblicher Saldo (volle Forderung)</span>
                <span className="text-amber-700">{eur((kk as any).vfe.massgeblicherSaldo)}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Bei Zahlung bis {de((kk as any).vfe.vergleichsfrist)} → {eur((kk as any).vfe.vergleichsbetrag)} (Differenz {eur((kk as any).vfe.differenz)} + Schadensersatz-Teilbetrag {eur(Number((kk as any).vfe.vergleichsbetrag) - Number((kk as any).vfe.differenz))}), Verzicht auf {eur((kk as any).vfe.verzicht)} ohne Anerkennung einer Rechtspflicht.
            </p>
            <div className="rounded border bg-muted/30 p-2 text-xs text-muted-foreground">
              <p className="font-medium">Historischer Hinweis (nicht maßgeblich)</p>
              <p>Bis zur Kündigung ({de(c.kuendigungEingegangenAm)}) lief Verzugszins auf (Saldo {eur(kk.saldo)}, davon Verzugszins {eur(kk.negativzinsSumme)}); ab Kündigung gilt die VFE-Schlussabrechnung.</p>
            </div>
          </CardContent>
        </Card>
      )}
      {!vz && kk && kk.konfiguriert && (kk as any).massgeblich !== "vfe" && (
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

      {/* Dokumente (legacy_customers-Akte, gekeyt auf legacy_customers.id) */}
      <Card>
        <CardHeader><CardTitle className="text-base">Dokumente</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-4">
          {docs.length === 0 ? (
            <p className="text-muted-foreground">Keine Dokumente hinterlegt.</p>
          ) : (
            <div className="space-y-1">
              {docs.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between gap-3 border-b last:border-0 py-1">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{d.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.documentType}{d.richtung ? ` · ${d.richtung}` : ""}{(d.documentDate || d.uploadedAt) ? ` · ${de(d.documentDate || d.uploadedAt)}` : ""}
                    </p>
                  </div>
                  <a href={`/api/admin/legacy-document/${d.id}`} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="gap-1"><Download className="w-4 h-4" />Download</Button>
                  </a>
                </div>
              ))}
            </div>
          )}

          {/* Upload (Admin) */}
          <div className="border-t pt-3 flex flex-wrap items-center gap-2">
            <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-xs" />
            <select value={docType} onChange={(e) => setDocType(e.target.value)} className="text-xs border rounded px-2 py-1">
              <option value="other">Sonstiges</option>
              <option value="contract">Vertrag/Korrespondenz</option>
              <option value="bank_statement">Kontoauszug</option>
              <option value="tax_certificate">Steuerbescheinigung</option>
              <option value="payment_confirmation">Zahlungsbestätigung</option>
            </select>
            <select value={richtung} onChange={(e) => setRichtung(e.target.value)} className="text-xs border rounded px-2 py-1">
              <option value="">Richtung —</option>
              <option value="eingehend">eingehend</option>
              <option value="ausgehend">ausgehend</option>
            </select>
            <Button size="sm" className="gap-1" onClick={handleUpload} disabled={!file || uploading}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Hochladen
            </Button>
            {/* Sichtbare React-State-Bestätigung (Kandidat C): erscheint der Name -> setFile feuerte */}
            {file && <span className="text-xs text-muted-foreground">gewählt: {file.name}</span>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
