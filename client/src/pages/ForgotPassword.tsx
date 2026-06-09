import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const request = trpc.auth.requestPasswordReset.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await request.mutateAsync({ email: email.trim() });
    } catch {
      /* bewusst kein Fehler-Feedback — keine Account-Enumeration */
    } finally {
      setSent(true);
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
        {sent ? (
          <div className="text-center">
            <MailCheck className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold mb-2">E-Mail unterwegs</h1>
            <p className="text-sm text-muted-foreground">
              Falls ein Konto mit dieser Adresse existiert, haben wir einen Link zum
              Festlegen bzw. Zurücksetzen Ihres Passworts geschickt (1&nbsp;Stunde gültig).
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-semibold mb-1">Passwort vergessen</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Geben Sie Ihre E-Mail-Adresse ein. Wir senden Ihnen einen Link zum
              Festlegen eines neuen Passworts.
            </p>
            {request.isError && (
              <Alert variant="destructive" className="mb-5">
                <AlertDescription>Etwas ist schiefgelaufen. Bitte erneut versuchen.</AlertDescription>
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
                  required
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full gap-2" disabled={request.isPending}>
                {request.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {request.isPending ? "Wird gesendet..." : "Link senden"}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
