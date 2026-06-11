import { trpc } from "@/lib/trpc";
import { BRAND } from "@shared/brand";

/**
 * Zentrale, EINZIGE Quelle für "Ist der eingeloggte Nutzer ein KG-Bestandszeichner?".
 *
 * Bestandskunde = KG-Brand (angelus) UND ein verknüpfter legacy_customers-Datensatz
 * (legacyCustomer.myRecord, hart über ctx.user.id gegated). Bestandskunden haben ihr
 * Risikoprofil bereits aus dem Zeichnungsschein — sie füllen KEIN Onboarding- bzw.
 * Risikoprofil-Formular aus.
 *
 * WICHTIG: Jede Stelle, die diesen Status braucht, ruft AUSSCHLIESSLICH diesen Hook auf.
 * NICHT lokal `BRAND.key === "angelus" && !!legacyRecord` nachrechnen — genau diese
 * Fragmentierung hatte dazu geführt, dass einzelne Stellen (Subscribe, Onboarding) das
 * Gating vergessen haben. react-query dedupliziert die myRecord-Query über alle Aufrufer.
 */
export function useIsBestandskunde() {
  const isKG = BRAND.key === "angelus";
  const query = trpc.legacyCustomer.myRecord.useQuery(undefined, { enabled: isKG });
  return {
    isKG,
    legacyRecord: query.data ?? null,
    isBestandskunde: isKG && !!query.data,
    isLoading: isKG ? query.isLoading : false,
  };
}
