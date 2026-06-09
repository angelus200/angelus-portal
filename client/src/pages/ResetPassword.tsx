import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ResetPassword() {
  // Token AUSSCHLIESSLICH aus der echten Browser-URL (wouter liefert kein ?param — Bug dd80531)
  const token = new URLSearchParams(window.location.search).get("token") || "";

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const reset = trpc.auth.resetPassword.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 10) { setError("Das Passwort muss mindestens 10 Zeichen lang sein"); return; }
    if (password !== passwordConfirm) { setError("Die Passwörter stimmen nicht überein"); return; }
    try {
      await reset.mutateAsync({ token, password });
      setDone(true);
      setTimeout(() => { window.location.href = "/sign-in"; }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Link ungültig oder abgelaufen");
    }
  };

  return (
    <div className="min-h-screen bg-secondary flex flex-col items-center justify-center p-4">
      <Link href="/sign-in" className="absolute top-4 left-4">
        <Button variant="ghost" className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Zur Anmeldung
        </Button>
      </Link>

      <div className="w-full max-w-md bg-card border rounded-lg shadow-lg p-8">
        {done ? (
          <div className="text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold mb-2">Passwort gesetzt</h1>
            <p className="text-sm text-muted-foreground">Sie werden zur Anmeldung weitergeleitet...</p>
          </div>
        ) : !token ? (
          <div className="text-center">
            <h1 className="text-xl font-semibold mb-2">Ungültiger Link</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Dieser Link ist unvollständig. Fordern Sie einen neuen an.
            </p>
            <Link href="/forgot-password">
              <Button className="w-full">Neuen Link anfordern</Button>
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-semibold mb-1">Neues Passwort festlegen</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Wählen Sie ein sicheres Passwort (mindestens 10 Zeichen).
            </p>
            {error && (
              <Alert variant="destructive" className="mb-5">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Neues Passwort</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-confirm">Passwort bestätigen</Label>
                <Input
                  id="password-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full gap-2" disabled={reset.isPending}>
                {reset.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {reset.isPending ? "Wird gespeichert..." : "Passwort speichern"}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
