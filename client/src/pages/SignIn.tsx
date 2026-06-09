import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [needsTotp, setNeedsTotp] = useState(false);
  const [error, setError] = useState("");

  const login = trpc.auth.login.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await login.mutateAsync({
        email: email.trim(),
        password,
        totpCode: needsTotp ? totpCode.trim() : undefined,
      });
      // Session-Cookie ist gesetzt → harter Reload, damit auth.me frisch lädt
      const isAdmin = res.role === "admin" || res.role === "superadmin";
      window.location.href = isAdmin ? "/admin" : "/investor";
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Anmeldung fehlgeschlagen";
      if (msg === "TOTP_REQUIRED") {
        setNeedsTotp(true);
        setError("");
      } else if (msg === "TOTP_INVALID") {
        setNeedsTotp(true);
        setError("Code ungültig — bitte erneut versuchen.");
      } else {
        setError(msg);
      }
    }
  };

  return (
    <div className="min-h-screen bg-secondary flex flex-col items-center justify-center p-4">
      <Link href="/" className="absolute top-4 left-4">
        <Button variant="ghost" className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Zurück
        </Button>
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-xl">A</span>
        </div>
        <span className="font-semibold text-2xl">Angelus</span>
      </div>

      <div className="w-full max-w-md bg-card border rounded-lg shadow-lg p-8">
        <h1 className="text-xl font-semibold mb-1">Anmelden</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Melden Sie sich mit Ihrer E-Mail-Adresse an.
        </p>

        {error && (
          <Alert variant="destructive" className="mb-5">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="name@firma.de"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={needsTotp || login.isPending}
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Passwort</Label>
              <Link href="/forgot-password" className="text-xs text-primary underline underline-offset-4">
                Passwort vergessen?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={needsTotp || login.isPending}
              required
            />
          </div>

          {needsTotp && (
            <div className="space-y-2">
              <Label htmlFor="totp">2FA-Code</Label>
              <Input
                id="totp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                maxLength={20}
                className="text-center text-xl tracking-widest font-mono"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                disabled={login.isPending}
                required
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Code aus Ihrer Authenticator-App oder ein Backup-Code.
              </p>
            </div>
          )}

          <Button type="submit" className="w-full gap-2" disabled={login.isPending}>
            {login.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {login.isPending ? "Wird geprüft..." : "Anmelden"}
          </Button>
        </form>
      </div>

      <p className="mt-8 text-sm text-muted-foreground text-center max-w-md">
        Dieses Portal richtet sich ausschließlich an professionelle Investoren.
      </p>
    </div>
  );
}
