// Magic-Byte-Prüfung für KYC-Uploads — prüft den TATSÄCHLICHEN Dateiinhalt, nicht die Endung/den
// vom Client gemeldeten MIME-Type. Ohne das könnte jemand eine ausführbare/aktive Datei als ".pdf"
// getarnt über die öffentlich erreichbare Upload-Route schieben. Whitelist NUR PDF/JPG/PNG.
// Selbst implementiert (keine externe file-type-Dependency) — bewusst minimal & auditierbar.

export type SniffedMime = 'application/pdf' | 'image/jpeg' | 'image/png' | null;

export function sniffMime(buf: Buffer): SniffedMime {
  // PDF: "%PDF-" (25 50 44 46 2D)
  if (buf.length >= 5 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46 && buf[4] === 0x2d) {
    return 'application/pdf';
  }
  // JPEG: FF D8 FF
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'image/jpeg';
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) {
    return 'image/png';
  }
  return null;
}

const EXT: Record<NonNullable<SniffedMime>, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

/**
 * Verifiziert eine hochgeladene Datei. Liefert die echte (gesniffte) MIME + sichere Endung, ODER
 * eine Fehlermeldung. Der vom Client gemeldete declaredMime muss zur gesnifften Realität passen
 * (Defense-in-Depth — verhindert getarnte Dateien).
 */
export function verifyUpload(buf: Buffer, declaredMime: string): { mime: NonNullable<SniffedMime>; ext: string } | { error: string } {
  const sniffed = sniffMime(buf);
  if (!sniffed) return { error: 'Dateiinhalt ist weder PDF, JPG noch PNG (Magic-Byte-Prüfung fehlgeschlagen)' };
  // image/jpg ist ein verbreiteter, nicht-kanonischer Client-Wert für image/jpeg — tolerieren.
  const normalizedDeclared = declaredMime === 'image/jpg' ? 'image/jpeg' : declaredMime;
  if (normalizedDeclared !== sniffed) {
    return { error: `Gemeldeter Typ (${declaredMime}) passt nicht zum echten Inhalt (${sniffed})` };
  }
  return { mime: sniffed, ext: EXT[sniffed] };
}
