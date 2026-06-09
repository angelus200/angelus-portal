import { useEffect } from "react";

/**
 * Registrierung ist einladungsbasiert und läuft jetzt vollständig über /register
 * (eigenes Custom-Auth-Formular). Diese Route bleibt nur als Weiterleitung erhalten,
 * damit alte Links/Lesezeichen nicht ins Leere laufen.
 */
export default function SignUp() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("invitation");
    window.location.replace(token ? `/register?invitation=${encodeURIComponent(token)}` : "/");
  }, []);

  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center p-4">
      <p className="text-muted-foreground text-sm">Weiterleitung...</p>
    </div>
  );
}
