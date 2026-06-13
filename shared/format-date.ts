// Reine Datums-Formatierung, geteilt Client/Server. ISO YYYY-MM-DD -> TT.MM.JJJJ per String-Split:
// KEIN new Date (-> kein TZ-Drift, kein englischer Wochentag wie "Tue Jul 15"). Eingabe ist der ISO-
// Sortierschluessel (z.B. aus der Kontoauszug-Engine); Nicht-ISO/leer wird unveraendert zurueckgegeben.
export function isoToDe(iso: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  return m ? `${m[3]}.${m[2]}.${m[1]}` : (iso ?? "");
}
