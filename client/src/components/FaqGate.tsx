// FAQ-Pflicht-Gate (Investor, blockierend). Wird von DashboardLayout statt der Dashboard-Inhalte
// gerendert, solange der Bestandszeichner die AKTIVE FAQ-Version nicht bestätigt hat.
// Beweissicherheit: Checkbox-Text == data.confirmationText (Server-Konstante FAQ_CONFIRMATION_TEXT,
// genau der Wortlaut, der serverseitig in confirmation_text protokolliert wird) — nie ein UI-Literal.
import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { FaqContent } from "./FaqContent";
import { Button } from "./ui/button";
import { Loader2 } from "lucide-react";

export function FaqGate({ onAcknowledged }: { onAcknowledged: () => void }) {
  const { data, isLoading, error } = trpc.faq.content.useQuery();
  const acknowledge = trpc.faq.acknowledge.useMutation();
  const [checked, setChecked] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [scrollTs, setScrollTs] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Echtes Scroll-Ende ODER Inhalt kürzer als der Container (großer Monitor, kein Scrollbedarf)
  // -> sofort als gelesen werten, sonst sperrt sich ein Desktop-Nutzer aus.
  const checkScrollEnd = () => {
    const el = scrollRef.current;
    if (!el || scrolled) return;
    const atEnd = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
    const noScrollNeeded = el.scrollHeight <= el.clientHeight + 1;
    if (atEnd || noScrollNeeded) {
      setScrolled(true);
      setScrollTs(new Date().toISOString());
    }
  };
  // Nach dem Render (Inhalt geladen) einmal prüfen — deckt den „kürzer als Viewport"-Fall ab.
  useEffect(() => { checkScrollEnd(); /* eslint-disable-next-line */ }, [data]);

  const submit = async () => {
    try {
      await acknowledge.mutateAsync({ scrolledToEnd: true, gatingCompletedAt: scrollTs ?? new Date().toISOString() });
      onAcknowledged();
    } catch { /* Fehler unten via acknowledge.error angezeigt */ }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-3xl bg-background rounded-lg border shadow-sm p-6 space-y-4">
        <div>
          <h1 className="text-xl font-bold">Häufige Fragen (FAQ) — bitte bestätigen</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Bitte lesen Sie die folgenden Häufigen Fragen vollständig. Erst danach können Sie fortfahren.
            {data ? ` (Fassung ${data.version})` : ""}
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-8"><Loader2 className="w-4 h-4 animate-spin" /> Lädt…</div>
        ) : error || !data ? (
          <p className="text-destructive text-sm py-8">FAQ konnte nicht geladen werden. Bitte laden Sie die Seite neu.</p>
        ) : (
          <>
            <div
              ref={scrollRef}
              onScroll={checkScrollEnd}
              className="overflow-y-auto max-h-[55vh] rounded border bg-muted/20 px-4 py-3"
            >
              <FaqContent content={data.content} />
            </div>

            {!scrolled && (
              <p className="text-xs text-amber-700">Bitte bis zum Ende lesen, um fortzufahren.</p>
            )}

            <label className={`flex items-start gap-2 text-sm ${scrolled ? "" : "opacity-50"}`}>
              <input
                type="checkbox"
                className="mt-0.5"
                checked={checked}
                disabled={!scrolled}
                onChange={(e) => setChecked(e.target.checked)}
              />
              <span>{data.confirmationText}</span>
            </label>

            {acknowledge.error && (
              <p className="text-destructive text-sm">Bestätigung fehlgeschlagen: {acknowledge.error.message}</p>
            )}

            <div className="flex justify-end">
              <Button disabled={!scrolled || !checked || acknowledge.isPending} onClick={submit}>
                {acknowledge.isPending ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Wird gespeichert…</>) : "Bestätigen und fortfahren"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
