import { useRef, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { FileText, Upload, Loader2, CheckCircle2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

// Schlanker Start von F5b: pro Bestandskunde den Zeichnungsschein hoch-/runterladen.
// Volles F5b (Stammdaten-Edit, Refi-Satz, Risikoprofil, Kontokorrent-Panel) kommt als eigener Schritt.

function ZeichnungsscheinPanel({ legacyCustomerId, name }: { legacyCustomerId: number; name: string }) {
  const utils = trpc.useUtils();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { data: docs, isLoading } = trpc.legacyCustomer.documents.getByCustomerId.useQuery({ legacyCustomerId });
  const schein = (docs || []).find((d: any) => d.documentType === "zeichnungsschein");

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("legacyCustomerId", String(legacyCustomerId));
      fd.append("category", "zeichnungsschein");
      fd.append("file", file);
      const res = await fetch("/api/legacy-zeichnungsschein", { method: "POST", body: fd });
      if (!res.ok) {
        const e = await res.json().catch(() => ({ error: "Upload fehlgeschlagen" }));
        throw new Error(e.error || "Upload fehlgeschlagen");
      }
      toast.success("Zeichnungsschein hochgeladen");
      utils.legacyCustomer.documents.getByCustomerId.invalidate({ legacyCustomerId });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Zeichnungsschein — {name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="h-12 bg-muted animate-pulse rounded" />
        ) : schein ? (
          <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="flex-1 text-sm truncate">{schein.fileName}</span>
            <a
              href={`/api/admin/legacy-zeichnungsschein/${legacyCustomerId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ExternalLink className="w-4 h-4" />
              </Button>
            </a>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Noch kein Zeichnungsschein hinterlegt.</p>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
            e.target.value = "";
          }}
        />
        <Button
          variant="outline"
          className="gap-2"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {schein ? "Ersetzen (neuen hochladen)" : "Zeichnungsschein hochladen"}
        </Button>
        <p className="text-xs text-muted-foreground">Nur PDF · max. 10 MB · der unterschriebene Schein</p>
      </CardContent>
    </Card>
  );
}

export default function LegacyCustomerDocuments() {
  const { data, isLoading } = trpc.legacyCustomer.getAll.useQuery({ page: 1, limit: 100 });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const customers = (data?.customers || []) as any[];
  const selected = customers.find((c) => c.id === selectedId) || null;

  return (
    <DashboardLayout variant="admin">
      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="text-2xl font-bold">Bestandskunden-Dokumente</h1>
          <p className="text-muted-foreground text-sm">Zeichnungsscheine pro Bestandskunde verwalten</p>
        </div>

        <div className="grid md:grid-cols-[320px_1fr] gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bestandskunden</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {isLoading ? (
                [1, 2, 3].map((i) => <div key={i} className="h-10 bg-muted animate-pulse rounded" />)
              ) : customers.length === 0 ? (
                <p className="text-sm text-muted-foreground">Keine Bestandskunden.</p>
              ) : (
                customers.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                      selectedId === c.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
                    }`}
                  >
                    <span className="block text-sm font-medium">
                      {c.firstName} {c.lastName}
                    </span>
                    <span className="block text-xs text-muted-foreground">{c.contractNumber || "—"}</span>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          <div>
            {selected ? (
              <ZeichnungsscheinPanel
                legacyCustomerId={selected.id}
                name={`${selected.firstName} ${selected.lastName}`}
              />
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  Wählen Sie links einen Bestandskunden.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
