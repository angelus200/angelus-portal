import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export interface UploadedFile {
  id: number;
  filePath: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
}

interface FileUploadProps {
  contractId: number;
  category?: "kyc" | "contracts" | "payments" | "general";
  onUploaded?: (file: UploadedFile) => void;
}

export function FileUpload({ contractId, category = "payments", onUploaded }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const handleUpload = async (file: File) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", category);
      formData.append("contractId", String(contractId));

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload fehlgeschlagen" }));
        throw new Error(err.error || "Upload fehlgeschlagen");
      }
      const data: UploadedFile = await res.json();
      toast.success(`${file.name} hochgeladen`);
      onUploaded?.(data);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
        dragging ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50"
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleUpload(file);
      }}
      onClick={() => !loading && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.docx"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
          e.target.value = "";
        }}
      />
      {loading ? (
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Wird hochgeladen…</span>
        </div>
      ) : (
        <>
          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground mb-2">
            Datei hier ablegen oder klicken
          </p>
          <p className="text-xs text-muted-foreground/60">PDF, JPG, PNG, DOCX · max. 10 MB</p>
        </>
      )}
    </div>
  );
}

interface DocumentListProps {
  docs: Array<{
    id: number;
    originalName: string;
    filePath: string;
    size: number;
    mimeType: string;
    createdAt: Date | string;
  }>;
}

function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentList({ docs }: DocumentListProps) {
  if (docs.length === 0) return null;
  return (
    <div className="space-y-2">
      {docs.map((doc) => (
        <div key={doc.id} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
          <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{doc.originalName}</p>
            <p className="text-xs text-muted-foreground">
              {fmtBytes(doc.size)} · {new Date(doc.createdAt).toLocaleDateString("de-DE")}
            </p>
          </div>
          <a
            href={`/api/files/${doc.filePath}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <ExternalLink className="w-4 h-4" />
            </Button>
          </a>
        </div>
      ))}
    </div>
  );
}
