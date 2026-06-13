// FAQ-Pflicht-Gate — zentrale Konstanten (Client + Server). Neue Fassung => ACTIVE_FAQ_VERSION
// hochsetzen: faqStatus prüft gegen die AKTIVE Version, nicht „je bestätigt" -> erzwingt erneute
// Bestätigung; der alte Ack-Datensatz bleibt append-only erhalten.
export const ACTIVE_FAQ_VERSION = '2026-06';

// Soll-Hash der Seed-Datei scripts/faq/Angelus_FAQ_2026-06.md (33.155 Bytes, LF). Das Seed-cjs bricht
// ab, wenn die Datei davon abweicht (kein DB-Write); der Hash-Test verankert exakt diesen Wert
// (Regressions-Versicherung gegen versehentliche EOL-/Editor-Änderungen). Aenderung am Text => neue
// Datei, neuer Hash, neue ACTIVE_FAQ_VERSION.
export const EXPECTED_FAQ_HASH = '633f35953bfe79f9cd919aab905b93d0b2deccf30a1ff4199fcd6b554a753b66';

// Exakter Bestätigungs-Wortlaut. Der angezeigte Checkbox-Text MUSS byte-identisch hierzu sein, da
// genau dieser String als confirmation_text protokolliert wird (Anzeige == Protokoll).
export const FAQ_CONFIRMATION_TEXT =
  'Ich habe die vorstehenden Häufigen Fragen (FAQ) vollständig gelesen und verstanden.';
