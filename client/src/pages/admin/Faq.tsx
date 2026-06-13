// Admin-Vorschau der aktiven FAQ (read-only) — Wortlaut prüfen, den der Zeichner im Gate sieht.
// Kein Scroll-Gate, keine Checkbox, kein acknowledge. Quelle = faq.content (assertAngelus-gated);
// Version + Hash sichtbar (= der content_hash, gegen den Bestätigungen protokolliert werden).
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FaqContent } from "@/components/FaqContent";

export default function AdminFaq() {
  const { data, isLoading, error } = trpc.faq.content.useQuery();
  return (
    <DashboardLayout variant="admin">
      <div className="p-2 max-w-3xl space-y-4">
        <div>
          <h1 className="text-xl font-bold">FAQ — Vorschau</h1>
          <p className="text-sm text-muted-foreground">
            Read-only-Ansicht des Wortlauts, den Bestandszeichner im Pflicht-Gate bestätigen.
          </p>
        </div>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Lädt…</p>
        ) : error || !data ? (
          <p className="text-destructive text-sm">FAQ konnte nicht geladen werden: {error?.message}</p>
        ) : (
          <>
            <div className="text-xs text-muted-foreground font-mono break-all">
              Version {data.version} · content_hash {data.contentHash}
            </div>
            <Card>
              <CardHeader><CardTitle className="text-base">Angezeigter Wortlaut</CardTitle></CardHeader>
              <CardContent><FaqContent content={data.content} /></CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
