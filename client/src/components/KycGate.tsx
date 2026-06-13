// KYC/AML-Pflicht-Gate (Investor, blockierend) — zweites Gate NACH FAQ. Rendert den shared-Katalog
// (KYC_CATALOG), sammelt Felder + 4 Pflicht-Uploads (inkl. Ausweis) AUSSCHLIESSLICH im flüchtigen
// React-State (NIE localStorage/sessionStorage — Ausweisdaten!), wirft Dateien nach erfolgreichem
// Upload aus dem State. WICHTIG: Das Gate entsperrt NICHT clientseitig — die Wahrheit ist
// s.gateSatisfied (Server bestätigt: Einreichung + alle 4 Dokumente verschlüsselt auf Volume).
// Ehrlicher Upload-Status: schlägt ein Upload fehl, bleibt das Gate zu und der Zeichner sieht, welcher.
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "./ui/button";
import { Loader2, CheckCircle2, XCircle, Upload, AlertTriangle } from "lucide-react";
import {
  KYC_CATALOG, REQUIRED_DOC_TYPES, validateKycFields,
  type KycFieldDef, type KycBlockDef,
} from "@shared/kyc-catalog";

type UploadStatus = "idle" | "uploading" | "done" | "error";

function FieldInput({ field, value, onChange, values }: {
  field: KycFieldDef; value: string; onChange: (v: string) => void; values: Record<string, string>;
}) {
  // Conditional-Felder nur zeigen, wenn die Bedingung erfüllt ist.
  if (field.conditionalOn && (values[field.conditionalOn.key] ?? "") !== field.conditionalOn.equals) return null;
  const base = "w-full border rounded px-3 py-2 text-sm bg-background";

  if (field.type === "checkbox") {
    return (
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-0.5" checked={value === "true"} onChange={(e) => onChange(e.target.checked ? "true" : "false")} />
        <span>{field.label}</span>
      </label>
    );
  }
  if (field.type === "multiselect") {
    let sel: string[] = [];
    try { sel = JSON.parse(value || "[]"); } catch { sel = []; }
    const toggle = (v: string) => {
      const next = sel.includes(v) ? sel.filter((x) => x !== v) : [...sel, v];
      onChange(JSON.stringify(next));
    };
    return (
      <div className="space-y-1">
        <label className="text-sm font-medium">{field.label}</label>
        <div className="grid sm:grid-cols-2 gap-1">
          {field.options?.map((o) => (
            <label key={o.value} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={sel.includes(o.value)} onChange={() => toggle(o.value)} />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{field.label}</label>
      {field.type === "textarea" ? (
        <textarea className={base} rows={3} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : field.type === "select" ? (
        <select className={base} value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">— bitte wählen —</option>
          {field.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input
          className={base}
          type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

const ACCEPT = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";

export function KycGate({ onCompleted }: { onCompleted: () => void }) {
  const { data: status, isLoading, refetch } = trpc.kyc.status.useQuery();
  const submit = trpc.kyc.submit.useMutation();

  const [values, setValues] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);
  const [uploadState, setUploadState] = useState<Record<string, { status: UploadStatus; error?: string }>>({});
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (isLoading || !status) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Lädt…</div>;
  }
  // Nach dem Guard in eine narrowte Konstante kapseln — TS behält das Narrowing in Closures (handleSubmit) bei.
  const s = status;

  // Gesperrt: abgelehnt/verweigert -> Sackgasse vermeiden, Kontakt-Hinweis.
  if (s.status === "abgelehnt" || s.status === "verweigert") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <div className="w-full max-w-lg bg-background rounded-lg border shadow-sm p-6 space-y-3 text-center">
          <XCircle className="w-10 h-10 text-destructive mx-auto" />
          <h1 className="text-xl font-bold">Identitäts-/Herkunftsprüfung nicht abgeschlossen</h1>
          <p className="text-sm text-muted-foreground">
            Ihre Angaben konnten derzeit nicht freigegeben werden. Bitte wenden Sie sich an uns, damit wir
            das gemeinsam klären — der Zugang wird nach Klärung freigeschaltet.
          </p>
          <p className="text-sm">Kontakt: <a className="underline" href="mailto:office@angelus.group">office@angelus.group</a></p>
        </div>
      </div>
    );
  }

  // Resume-Modus: Felder bereits eingereicht (offener Status), nur Dokumente fehlen -> nur fehlende Uploads.
  const resumeMode = s.hasSubmission && (s.status === "eingereicht" || s.status === "in_pruefung") && !s.complete;
  const missingDocs = REQUIRED_DOC_TYPES.filter((t) => !s.uploadedDocs.includes(t));
  const docDefs = KYC_CATALOG.filter((b) => b.doc?.required).map((b) => b.doc!);

  const setVal = (k: string, v: string) => setValues((p) => ({ ...p, [k]: v }));

  async function uploadOne(submissionId: number, docType: string, file: File): Promise<boolean> {
    setUploadState((p) => ({ ...p, [docType]: { status: "uploading" } }));
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("submissionId", String(submissionId));
      fd.append("docType", docType);
      const res = await fetch("/api/kyc-document", { method: "POST", body: fd });
      if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try { detail = (await res.json()).error || detail; } catch { /* ignore */ }
        setUploadState((p) => ({ ...p, [docType]: { status: "error", error: String(detail).slice(0, 300) } }));
        return false;
      }
      setUploadState((p) => ({ ...p, [docType]: { status: "done" } }));
      return true;
    } catch (e: any) {
      setUploadState((p) => ({ ...p, [docType]: { status: "error", error: e?.message ?? "Netzwerkfehler" } }));
      return false;
    }
  }

  async function handleSubmit() {
    setSubmitError(null);
    setFieldErrors([]);

    // Welche Docs müssen JETZT hochgeladen werden?
    const docsToUpload = resumeMode ? missingDocs : REQUIRED_DOC_TYPES;

    // Client-Vorabprüfung (UX) — Server validiert autoritativ erneut.
    if (!resumeMode) {
      const errs = validateKycFields(values);
      if (errs.length > 0) { setFieldErrors(errs); return; }
    }
    const missingFiles = docsToUpload.filter((t) => !files[t]);
    if (missingFiles.length > 0) {
      // Lesbare Labels statt doc_type-Keys (ein Anleger versteht "sow_nachweis" nicht).
      const labelOf = (t: string) => docDefs.find((d) => d.docType === t)?.label ?? t;
      setSubmitError(`Bitte alle Pflicht-Nachweise auswählen: ${missingFiles.map(labelOf).join(", ")}`);
      return;
    }

    setBusy(true);
    try {
      // submissionId beschaffen: Resume nutzt die bestehende; sonst neu einreichen (Server validiert).
      let submissionId: number;
      if (resumeMode && s.submissionId) {
        submissionId = s.submissionId;
      } else {
        const fields = Object.entries(values).map(([key, value]) => ({ key, value }));
        const r = await submit.mutateAsync({ fields });
        submissionId = r.submissionId;
      }

      // Alle (fehlenden) Dokumente hochladen; jeder Upload einzeln nachverfolgt.
      const results = await Promise.all(docsToUpload.map((t) => uploadOne(submissionId, t, files[t]!)));
      const allOk = results.every(Boolean);

      // Server ist die Wahrheit: Status neu laden. Gate entsperrt nur, wenn Server gateSatisfied meldet.
      const fresh = await refetch();
      if (allOk && fresh.data?.gateSatisfied) {
        setFiles({});          // sensible Dateien aus dem State werfen
        onCompleted();
      } else if (!allOk) {
        setSubmitError("Mindestens ein Nachweis konnte nicht hochgeladen werden. Bitte unten korrigieren und erneut senden.");
      }
    } catch (e: any) {
      setSubmitError(e?.message ?? "Einreichung fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4">
      <div className="mx-auto max-w-3xl bg-background rounded-lg border shadow-sm p-6 space-y-6 my-6">
        <div>
          <h1 className="text-xl font-bold">Identifizierung & Mittelherkunft (gesetzliche Sorgfaltspflicht)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Zur Erfüllung der geldwäscherechtlichen Sorgfaltspflichten benötigen wir die folgenden Angaben
            und Nachweise. Erst nach Eingang können Sie auf Ihren Bereich zugreifen. (Fassung {s.version})
          </p>
        </div>

        {s.status === "nachforderung" && (
          <div className="flex items-start gap-2 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>Wir benötigen ergänzende Angaben/Nachweise. Bitte reichen Sie die Daten erneut ein.</span>
          </div>
        )}

        {resumeMode && (
          <div className="flex items-start gap-2 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>Ihre Angaben liegen vor, aber es fehlen noch Nachweise. Bitte laden Sie die markierten Dokumente hoch.</span>
          </div>
        )}

        {/* Felder (nur wenn nicht Resume) */}
        {!resumeMode && KYC_CATALOG.map((block: KycBlockDef) => (
          <div key={block.key} className="space-y-3 border-t pt-4 first:border-t-0 first:pt-0">
            <h2 className="font-semibold">{block.title}</h2>
            {block.fields.map((f) => (
              <FieldInput key={f.key} field={f} value={values[f.key] ?? ""} values={values} onChange={(v) => setVal(f.key, v)} />
            ))}
          </div>
        ))}

        {/* Pflicht-Uploads */}
        <div className="space-y-3 border-t pt-4">
          <h2 className="font-semibold">Pflicht-Nachweise (PDF, JPG oder PNG, max. 10 MB)</h2>
          {docDefs.map((d) => {
            const alreadyUp = resumeMode && !missingDocs.includes(d.docType);
            const st = uploadState[d.docType]?.status ?? "idle";
            return (
              <div key={d.docType} className="space-y-1">
                <label className="text-sm font-medium flex items-center gap-2">
                  {d.label}
                  {alreadyUp && <span className="text-green-700 inline-flex items-center gap-1 text-xs"><CheckCircle2 className="w-3.5 h-3.5" /> bereits hochgeladen</span>}
                </label>
                {!alreadyUp && (
                  <>
                    <input
                      type="file" accept={ACCEPT}
                      className="block w-full text-sm file:mr-3 file:rounded file:border file:px-3 file:py-1.5 file:bg-muted"
                      onChange={(e) => setFiles((p) => ({ ...p, [d.docType]: e.target.files?.[0] ?? null }))}
                    />
                    {st === "uploading" && <p className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> wird verschlüsselt & hochgeladen…</p>}
                    {st === "done" && <p className="text-xs text-green-700 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> hochgeladen</p>}
                    {st === "error" && <p className="text-xs text-destructive flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> {uploadState[d.docType]?.error}</p>}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {fieldErrors.length > 0 && (
          <div className="rounded border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive space-y-0.5">
            {fieldErrors.map((e, i) => <p key={i}>• {e}</p>)}
          </div>
        )}
        {submitError && <p className="text-destructive text-sm">{submitError}</p>}

        <div className="flex justify-end border-t pt-4">
          <Button disabled={busy} onClick={handleSubmit}>
            {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Wird übermittelt…</> : <><Upload className="w-4 h-4 mr-2" /> Angaben & Nachweise übermitteln</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
