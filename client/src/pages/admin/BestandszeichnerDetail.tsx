// Admin-Detailseite eines Bestandszeichners (1:n, E4). Stammdaten + Steuer + Dokumente EINMAL oben
// am Kunden (legacy_customers); je Anleihe eine BondSection aus adminLegacyBonds (legacy_bonds) mit
// ihrer Vollzahler-/VFE-/Forderungs-Karte. Sektions-Header nur bei n>1 -> n=1 (Brendel/Brenner)
// sieht aus wie vor E4. Saldo/Perioden/Wording aus den geteilten Engines (kein zweiter Rechenweg).
import { useState, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Upload, Loader2, Trash2 } from "lucide-react";
import { KontoauszugView, KonsolidierungView } from "@/components/KontoauszugView";

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

function laufzeitSatzOf(w: any): string {
  if (!w) return "";
  return [
    w.mindestlaufzeitEnde ? `Die Mindestlaufzeit (§ 4 Abs. 2) endete am ${w.mindestlaufzeitEnde}. ` : "",
    `Die Anleihe läuft seither unbefristet weiter und ist ordentlich nur zu den 12-Monats-Terminen (jeweils ${w.couponTerminMMDD}) mit einer Frist von 3 Monaten kündbar (§ 5 Abs. 1). `,
    w.verfristeterTermin ? `Die Kündigung vom ${w.kuendigungDatum} war für den Termin ${w.verfristeterTermin} verfristet (Eingang erforderlich bis ${w.verfristeterEingangBis}). ` : "",
    w.naechsterTermin ? `Nächstmöglicher Termin: ${w.naechsterTermin}, Eingang bis ${w.naechsterEingangBis}.` : "",
  ].join("");
}

// Eine Anleihe-Sektion (1:n). Karten-Inhalte byte-gleich zur Vor-E4-Sicht; showHeader nur bei n>1.
function BondSection({ bond, showHeader }: { bond: any; showHeader: boolean }) {
  const m = bond.meta;
  const vz = bond.vollzahler;
  const kk = bond.forderung;
  const laufzeitSatz = laufzeitSatzOf(vz?.wording);
  return (
    <div className="space-y-5">
      {showHeader && (
        <h2 className="text-base font-semibold border-b pb-1">Anleihe {bond.bondNumber ?? "—"} · Vertrag {bond.contractNumber}</h2>
      )}
      <Card>
        <CardHeader><CardTitle className="text-base">Vertrag / Anleihe</CardTitle></CardHeader>
        <CardContent className="text-sm grid sm:grid-cols-2 gap-x-8 gap-y-0.5">
          <Row label="Zeichnungssumme" value={eur(m.investmentAmount)} />
          <Row label="Zinssatz p.a." value={pct(m.annualInterestRate)} />
          <Row label="Zinsbasis" value={m.zinsbasis ?? "—"} />
          <Row label="Vorfinanzierungs-/Verzugszins p.a." value={pct(m.refinancingRate)} />
          <Row label="Zeichnungsdatum" value={de(m.contractDate)} />
          <Row label="Wertstellung" value={de(m.valueDate)} />
          <Row label="Mindestlaufzeit bis" value={de(m.maturityDate)} />
          <Row label="Kündigung eingegangen" value={de(m.kuendigungEingegangenAm)} />
          <Row label="Kündigungsstatus" value={m.kuendigungStatus ?? "—"} />
          <Row label="Nächster Kündigungstermin" value={de(m.naechsterKuendigungstermin)} />
        </CardContent>
      </Card>

      {/* Vollzahler-Block (offen=0) */}
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
                    {vz.perioden.map((p: any) => (
                      <tr key={p.index} className="border-b last:border-0">
                        <td className="py-1.5 pr-2">{de(p.von)}–{de(p.bis)}{p.istRumpf && <span className="ml-1 text-xs text-muted-foreground">(Rumpfjahr)</span>}</td>
                        <td className="text-right py-1.5 px-2 font-medium">{eur(p.zins)}</td>
                        <td className="text-right py-1.5 px-2 text-muted-foreground">{de(p.faelligkeit)}{p.unterVorbehalt ? " *" : ""}</td>
                        <td className="text-right py-1.5 pl-2">
                          {p.status === "erfuellt" && <span className="text-green-700">Erfüllt</span>}
                          {p.status === "bedient" && <span className="text-green-700">bedient (Saldo-Ausgleich)</span>}
                          {p.status === "getragen" && <span className="text-green-700">durch Vorfinanzierung getragen (Restguthaben {eur(p.restguthaben)})</span>}
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
                    {eur(Math.abs(vz.saldo.saldo))} {vz.saldo.saldo > 0 ? "(KG-Forderung)" : "(Guthaben Zeichner)"}
                  </span>
                </div>
              </div>
            )}
            {laufzeitSatz && <p className="text-xs text-muted-foreground border-t pt-2">{laufzeitSatz}</p>}
          </CardContent>
        </Card>
      )}

      {/* Forderungskonto/VFE-Block (offen>0) */}
      {kk && kk.konfiguriert && kk.massgeblich === "vfe" && kk.vfe && (
        <Card>
          <CardHeader><CardTitle className="text-base">VFE-Schlussabrechnung (gekündigt)</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-3">
            <div className="space-y-0.5">
              <Row label={`VFE-Betrag (${pct(Number(kk.vfe.vfeBetrag) / Number(kk.gezeichnet) * 100)} v. Nennbetrag)`} value={eur(kk.vfe.vfeBetrag)} />
              <Row label="./. eingezahlte Einlage" value={eur(kk.vfe.einlage)} />
              <Row label="= Differenz" value={eur(kk.vfe.differenz)} />
              <Row label="+ Schadensersatz (offen × Coupon × 5 J.)" value={eur(kk.vfe.schadensersatzVoll)} />
              <div className="flex justify-between font-medium border-t pt-1">
                <span>Maßgeblicher Saldo (volle Forderung)</span>
                <span className="text-amber-700">{eur(kk.vfe.massgeblicherSaldo)}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Bei Zahlung bis {de(kk.vfe.vergleichsfrist)} → {eur(kk.vfe.vergleichsbetrag)} (Differenz {eur(kk.vfe.differenz)} + Schadensersatz-Teilbetrag {eur(Number(kk.vfe.vergleichsbetrag) - Number(kk.vfe.differenz))}), Verzicht auf {eur(kk.vfe.verzicht)} ohne Anerkennung einer Rechtspflicht.
            </p>
            <div className="rounded border bg-muted/30 p-2 text-xs text-muted-foreground">
              <p className="font-medium">Historischer Hinweis (nicht maßgeblich)</p>
              <p>Bis zur Kündigung ({de(m.kuendigungEingegangenAm)}) lief Verzugszins auf (Saldo {eur(kk.saldo)}, davon Verzugszins {eur(kk.negativzinsSumme)}); ab Kündigung gilt die VFE-Schlussabrechnung.</p>
            </div>
          </CardContent>
        </Card>
      )}
      {kk && kk.konfiguriert && kk.massgeblich !== "vfe" && (
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

export default function BestandszeichnerDetail() {
  const [, params] = useRoute("/admin/bestandszeichner/:legacyId");
  const [, navigate] = useLocation();
  const legacyId = parseInt(params?.legacyId ?? "0", 10);

  const { data: c, isLoading } = trpc.legacyCustomer.getById.useQuery({ id: legacyId }, { enabled: legacyId > 0 });
  const { data: bonds = [] } = trpc.legacyCustomer.adminLegacyBonds.useQuery({ legacyCustomerId: legacyId }, { enabled: legacyId > 0 });
  const { data: ka, isLoading: kaLoading, error: kaError } = trpc.legacyCustomer.adminZeichnerKontoauszug.useQuery(
    { legacyCustomerId: legacyId },
    { enabled: legacyId > 0 }
  );
  const { data: docs = [], refetch: refetchDocs } = trpc.legacyCustomer.documents.getByCustomerId.useQuery(
    { legacyCustomerId: legacyId },
    { enabled: legacyId > 0 }
  );
  const deleteDoc = trpc.legacyCustomer.documents.delete.useMutation({ onSuccess: () => refetchDocs() });

  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
        const text = await res.text().catch(() => "");
        let detail = text;
        try { detail = JSON.parse(text).error || text; } catch { /* HTML/leer -> Rohtext */ }
        throw new Error(`Upload fehlgeschlagen (HTTP ${res.status})${detail ? ": " + String(detail).slice(0, 500) : ""}`);
      }
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
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

  const subtitle = bonds.length === 1
    ? `Vertrag ${bonds[0].contractNumber} · Anleihe ${bonds[0].bondNumber ?? "—"}`
    : `${bonds.length} Anleihen`;

  return (
    <div className="p-6 max-w-4xl space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => navigate("/admin/bestandskunden")}><ArrowLeft className="w-4 h-4" /></Button>
        <div>
          <h1 className="text-xl font-bold">{c.firstName} {c.lastName}</h1>
          <p className="text-sm text-muted-foreground">Bestandszeichner #{c.id} · {subtitle}</p>
        </div>
      </div>

      {/* Stammdaten + Steuer EINMAL am Kunden (Person, nicht pro Anleihe) */}
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
      </div>

      {/* Je Anleihe eine Sektion (Header nur bei n>1) */}
      {bonds.map((bond: any) => (
        <BondSection key={bond.bondId} bond={bond} showHeader={bonds.length > 1} />
      ))}

      {/* K3: Kontoauszug — je Bond das Journal + §387-Konsolidierung (adminZeichnerKontoauszug) */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold border-b pb-1">Kontoauszug</h2>
        {kaLoading ? (
          <p className="text-muted-foreground text-sm">Lädt…</p>
        ) : kaError ? (
          <p className="text-destructive text-sm">Kontoauszug konnte nicht geladen werden: {kaError.message}</p>
        ) : (
          <div className="space-y-5">
            {(ka?.bonds ?? []).map((a: any, i: number) => <KontoauszugView key={i} auszug={a} />)}
            {ka?.konsolidierung && <KonsolidierungView konsolidierung={ka.konsolidierung} />}
          </div>
        )}
      </div>

      {/* Dokumente (legacy_customers-Akte, am Kunden — kombinierte Steuerbescheinigung gehoert hierher) */}
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
                  <div className="flex items-center gap-2 shrink-0">
                    <a href={`/api/admin/legacy-document/${d.id}`} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="gap-1"><Download className="w-4 h-4" />Download</Button>
                    </a>
                    <Button
                      variant="ghost" size="sm" className="text-red-600 hover:text-red-700"
                      disabled={deleteDoc.isPending}
                      onClick={() => { if (window.confirm(`„${d.fileName}" löschen?`)) deleteDoc.mutate({ documentId: d.id }); }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="border-t pt-3 space-y-2">
            <p className="text-[10px] text-muted-foreground">Upload v2 (Drag&Drop)</p>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) setFile(f); }}
              className="border-2 border-dashed rounded p-4 text-center text-xs text-muted-foreground"
            >
              Datei hierher ziehen — oder{" "}
              <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              <Button type="button" variant="outline" size="sm" className="mx-1" onClick={() => fileInputRef.current?.click()}>Datei wählen</Button>
              {file && <span className="text-foreground"> · gewählt: {file.name}</span>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select value={docType} onChange={(e) => setDocType(e.target.value)} className="text-xs border rounded px-2 py-1">
                <option value="other">Sonstiges</option>
                <option value="contract">Vertrag/Korrespondenz</option>
                <option value="bank_statement">Kontoauszug</option>
                <option value="tax_certificate">Steuerbescheinigung</option>
                <option value="payment_confirmation">Zahlungsbestätigung</option>
              </select>
              <select value={richtung} onChange={(e) => setRichtung(e.target.value)} className="text-xs border rounded px-2 py-1">
                <option value="">Richtung wählen *</option>
                <option value="eingehend">eingehend</option>
                <option value="ausgehend">ausgehend</option>
              </select>
              <Button size="sm" className="gap-1" onClick={handleUpload} disabled={!file || !richtung || uploading}>
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Hochladen
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
