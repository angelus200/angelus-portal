// Admin-Review-Block für das KYC/AML-Modul (auf /admin/bestandszeichner/:id). Zeigt die Fallakte:
// Angaben (lesbar, Labels aus dem shared-Katalog), Dokumente (Admin-Download = im Stream entschlüsselt),
// Risiko-Einstufung, Eigen-Identifizierung (recordIdentityCheck), Eskalation/Verdacht (Anwalts-/FIU-
// Felder), Status — und den SICHTBAREN Case-Log (der Entlastungs-Trail muss im Alltag greifbar sein).
// Kein-Account-Fall (Kirsten, user_id=NULL): kein Crash, klarer Hinweis.
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2, ShieldAlert, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { KYC_CATALOG } from "@shared/kyc-catalog";

const de = (d: any) => (d ? new Date(d).toLocaleString("de-DE") : "—");

// key -> { label, options } aus dem Katalog (für lesbare Anzeige der gespeicherten Felder).
const FIELD_MAP = new Map(KYC_CATALOG.flatMap((b) => b.fields.map((f) => [f.key, f] as const)));
function renderFieldValue(key: string, value: string | null): string {
  const def = FIELD_MAP.get(key);
  if (!value) return "—";
  if (def?.type === "multiselect") {
    try {
      const arr: string[] = JSON.parse(value);
      return arr.map((v) => def.options?.find((o) => o.value === v)?.label ?? v).join(", ");
    } catch { return value; }
  }
  if (def?.type === "select") return def.options?.find((o) => o.value === value)?.label ?? value;
  if (def?.type === "checkbox") return value === "true" ? "ja" : "nein";
  return value;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex justify-between gap-4 py-0.5"><span className="text-muted-foreground">{label}</span><span className="font-medium text-right">{value}</span></div>;
}

const STATUS_OPTIONS = ["eingereicht", "in_pruefung", "akzeptiert", "abgelehnt", "nachforderung", "verweigert"] as const;
const ESC_STATUS_OPTIONS = ["offen", "an_anwalt_uebergeben", "an_FIU_gemeldet", "erledigt"] as const;

export function KycAdminBlock({ userId }: { userId: number | null }) {
  const enabled = !!userId;
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.kyc.review.useQuery({ userId: userId ?? 0 }, { enabled });

  const invalidate = () => utils.kyc.review.invalidate({ userId: userId ?? 0 });
  const setStatus = trpc.kyc.setStatus.useMutation({ onSuccess: () => { invalidate(); toast.success("Status gesetzt"); } });
  const setRisk = trpc.kyc.setRiskAssessment.useMutation({ onSuccess: () => { invalidate(); toast.success("Risiko-Einstufung gespeichert"); } });
  const recordId = trpc.kyc.recordIdentityCheck.useMutation({ onSuccess: () => { invalidate(); toast.success("Identitätsprüfung dokumentiert"); } });
  const flagEsc = trpc.kyc.flagEscalation.useMutation({ onSuccess: () => { invalidate(); toast.success("Eskalation angelegt"); } });
  const setEscStatus = trpc.kyc.setEscalationStatus.useMutation({ onSuccess: () => { invalidate(); toast.success("Eskalation aktualisiert"); } });

  // lokale Formularzustände
  const [statusVal, setStatusVal] = useState<string>("");
  const [statusNote, setStatusNote] = useState("");
  const [riskLevel, setRiskLevel] = useState("");
  const [riskBegr, setRiskBegr] = useState("");
  const [idVerfahren, setIdVerfahren] = useState("");
  const [idErgebnis, setIdErgebnis] = useState("");
  const [escGrund, setEscGrund] = useState("");
  const [escStatusVal, setEscStatusVal] = useState("");
  const [anwaltRef, setAnwaltRef] = useState("");
  const [fiuAz, setFiuAz] = useState("");
  const [anwaltAm, setAnwaltAm] = useState("");

  if (!enabled) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">KYC / Geldwäsche-Sorgfalt</CardTitle></CardHeader>
        <CardContent className="text-sm"><p className="text-amber-700">Kein Account verknüpft — KYC-Erfassung erst nach Account-Anlage/Verknüpfung möglich.</p></CardContent>
      </Card>
    );
  }
  if (isLoading) return <Card><CardHeader><CardTitle className="text-base">KYC / Geldwäsche-Sorgfalt</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Lädt…</CardContent></Card>;

  const sub = data?.submission;
  const sel = "text-sm border rounded px-2 py-1 bg-background";
  const inp = "text-sm border rounded px-2 py-1 bg-background w-full";

  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldAlert className="w-4 h-4" /> KYC / Geldwäsche-Sorgfalt</CardTitle></CardHeader>
      <CardContent className="text-sm space-y-5">
        {!sub ? (
          <p className="text-amber-700">Noch keine KYC-Einreichung des Zeichners.</p>
        ) : (
          <>
            {/* Status der Einreichung */}
            <div className="space-y-0.5">
              <Row label="Status" value={sub.status} />
              <Row label="Version" value={sub.kycVersion} />
              <Row label="Eingereicht (Server)" value={de(sub.serverTimestamp)} />
              <Row label="IP-Adresse" value={sub.ipAddress ?? "—"} />
              <Row label="Vollständig (alle 4 Nachweise)" value={data?.status?.complete ? <span className="text-green-700">ja</span> : <span className="text-amber-700">nein</span>} />
            </div>

            {/* Angaben */}
            <div className="border-t pt-3">
              <p className="font-medium mb-1">Angaben</p>
              <div className="space-y-0.5">
                {(data?.fields ?? []).map((f: any) => (
                  <Row key={f.id} label={FIELD_MAP.get(f.fieldKey)?.label ?? f.fieldKey} value={<span className="text-right break-words">{renderFieldValue(f.fieldKey, f.fieldValue)}</span>} />
                ))}
                {(data?.fields ?? []).length === 0 && <p className="text-muted-foreground">Keine Felder.</p>}
              </div>
            </div>

            {/* Dokumente (entschlüsselter Admin-Download) */}
            <div className="border-t pt-3">
              <p className="font-medium mb-1">Nachweise</p>
              {(data?.documents ?? []).length === 0 ? <p className="text-muted-foreground">Keine Dokumente.</p> : (
                <div className="space-y-1">
                  {(data?.documents ?? []).map((d: any) => (
                    <div key={d.id} className="flex items-center justify-between gap-3 border-b last:border-0 py-1">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{d.docType}</p>
                        <p className="text-xs text-muted-foreground">{d.originalFilename} · {d.mimeType} · {de(d.uploadedAt)}</p>
                      </div>
                      <a href={`/api/kyc-document/${d.id}`} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="gap-1"><Download className="w-4 h-4" />Öffnen</Button>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Risiko-Einstufung */}
        <div className="border-t pt-3 space-y-2">
          <p className="font-medium">Risiko-Einstufung {data?.risk && <span className="text-xs text-muted-foreground">(aktuell: {data.risk.riskLevel}, {de(data.risk.assessedAt)})</span>}</p>
          <div className="flex flex-wrap items-center gap-2">
            <select className={sel} value={riskLevel} onChange={(e) => setRiskLevel(e.target.value)}>
              <option value="">— Stufe —</option><option value="niedrig">niedrig</option><option value="mittel">mittel</option><option value="hoch">hoch</option>
            </select>
            <input className={inp + " flex-1 min-w-[200px]"} placeholder="Begründung" value={riskBegr} onChange={(e) => setRiskBegr(e.target.value)} />
            <Button size="sm" disabled={!riskLevel || setRisk.isPending} onClick={() => setRisk.mutate({ userId: userId!, submissionId: sub?.id, riskLevel: riskLevel as any, begruendung: riskBegr || undefined })}>
              {setRisk.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Speichern"}
            </Button>
          </div>
        </div>

        {/* Eigen-Identifizierung */}
        <div className="border-t pt-3 space-y-2">
          <p className="font-medium">Identitätsprüfung dokumentieren <span className="text-xs text-muted-foreground">(Eigen-Identifizierung — Verfahren verantwortet der GwB)</span></p>
          <div className="grid sm:grid-cols-2 gap-2">
            <input className={inp} placeholder="Verfahren (z. B. persönliche Sichtprüfung, VideoIdent)" value={idVerfahren} onChange={(e) => setIdVerfahren(e.target.value)} />
            <input className={inp} placeholder="Ergebnis (z. B. Ausweis echt, Person stimmt überein)" value={idErgebnis} onChange={(e) => setIdErgebnis(e.target.value)} />
          </div>
          <Button size="sm" disabled={idVerfahren.length < 2 || idErgebnis.length < 2 || recordId.isPending}
            onClick={() => recordId.mutate({ userId: userId!, submissionId: sub?.id, verfahren: idVerfahren, ergebnis: idErgebnis })}>
            {recordId.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Identität geprüft festhalten"}
          </Button>
        </div>

        {/* Status setzen (nur wenn Einreichung existiert) */}
        {sub && (
          <div className="border-t pt-3 space-y-2">
            <p className="font-medium">Status setzen</p>
            <div className="flex flex-wrap items-center gap-2">
              <select className={sel} value={statusVal} onChange={(e) => setStatusVal(e.target.value)}>
                <option value="">— Status —</option>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <input className={inp + " flex-1 min-w-[200px]"} placeholder="Notiz (optional)" value={statusNote} onChange={(e) => setStatusNote(e.target.value)} />
              <Button size="sm" disabled={!statusVal || setStatus.isPending} onClick={() => setStatus.mutate({ submissionId: sub.id, status: statusVal as any, note: statusNote || undefined })}>
                {setStatus.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Setzen"}
              </Button>
            </div>
          </div>
        )}

        {/* Eskalation / Verdacht */}
        <div className="border-t pt-3 space-y-2">
          <p className="font-medium">Eskalation / Verdachtsflag {data?.escalation && <span className="text-xs text-muted-foreground">(aktuell: {data.escalation.status})</span>}</p>
          {!data?.escalation ? (
            <div className="flex flex-wrap items-center gap-2">
              <input className={inp + " flex-1 min-w-[200px]"} placeholder="Grund der Eskalation" value={escGrund} onChange={(e) => setEscGrund(e.target.value)} />
              <Button size="sm" variant="destructive" disabled={escGrund.length < 3 || flagEsc.isPending} onClick={() => flagEsc.mutate({ userId: userId!, grund: escGrund })}>
                {flagEsc.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Flaggen"}
              </Button>
            </div>
          ) : (() => {
            const esc = data.escalation;
            return (
            <div className="space-y-2 rounded border p-2 bg-muted/20">
              <Row label="Grund" value={<span className="text-right break-words">{esc.grund}</span>} />
              <Row label="Geflaggt am" value={de(esc.flaggedAt)} />
              <Row label="An Anwalt übergeben am" value={de(esc.uebergebenAnAnwaltAm)} />
              <Row label="Anwalts-Referenz" value={esc.anwaltReferenz ?? "—"} />
              <Row label="FIU-Aktenzeichen" value={esc.fiuAktenzeichen ?? "—"} />
              <div className="border-t pt-2 space-y-2">
                <div className="grid sm:grid-cols-2 gap-2">
                  <select className={sel} value={escStatusVal} onChange={(e) => setEscStatusVal(e.target.value)}>
                    <option value="">— Status —</option>
                    {ESC_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <input className={inp} type="date" value={anwaltAm} onChange={(e) => setAnwaltAm(e.target.value)} title="An Anwalt übergeben am" />
                  <input className={inp} placeholder="Anwalts-Referenz" value={anwaltRef} onChange={(e) => setAnwaltRef(e.target.value)} />
                  <input className={inp} placeholder="FIU-Aktenzeichen" value={fiuAz} onChange={(e) => setFiuAz(e.target.value)} />
                </div>
                <Button size="sm" disabled={!escStatusVal || setEscStatus.isPending}
                  onClick={() => setEscStatus.mutate({
                    escalationId: esc.id, userId: userId!, status: escStatusVal as any,
                    uebergebenAnAnwaltAm: anwaltAm || undefined, anwaltReferenz: anwaltRef || undefined, fiuAktenzeichen: fiuAz || undefined,
                  })}>
                  {setEscStatus.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Eskalation aktualisieren"}
                </Button>
              </div>
            </div>
            );
          })()}
        </div>

        {/* Case-Log (Entlastungs-Trail, append-only) */}
        <div className="border-t pt-3">
          <p className="font-medium mb-1 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Fall-Protokoll (lückenlos, unveränderlich)</p>
          {(data?.caseLog ?? []).length === 0 ? <p className="text-muted-foreground">Noch keine Einträge.</p> : (
            <div className="space-y-1">
              {(data?.caseLog ?? []).map((l: any) => (
                <div key={l.id} className="text-xs border-b last:border-0 py-1">
                  <span className="text-muted-foreground">{de(l.createdAt)} · {l.actor ?? "—"} · </span>
                  <span className="font-medium">{l.eventType}</span>
                  {l.note && <span className="text-muted-foreground"> — {l.note}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
