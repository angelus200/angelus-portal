import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Shield,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  Copy,
  CheckCircle,
  AlertTriangle,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";

type SetupStep = "idle" | "qr" | "verify" | "backup" | "done" | "disable";

export default function SecuritySettings() {
  const { user, loading, refresh } = useAuth();

  const [step, setStep] = useState<SetupStep>("idle");
  const [totpUri, setTotpUri] = useState("");
  const [totpSecret, setTotpSecret] = useState("");
  const [password, setPassword] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState("");

  const enrollStart = trpc.auth.totpEnrollStart.useMutation();
  const enrollVerify = trpc.auth.totpEnrollVerify.useMutation();
  const disableTotp = trpc.auth.totpDisable.useMutation();

  const busy = enrollStart.isPending || enrollVerify.isPending || disableTotp.isPending;
  const isEnabled = user?.totpEnabled ?? false;

  const handleStartSetup = async () => {
    setError("");
    try {
      const res = await enrollStart.mutateAsync();
      setTotpUri(res.uri);
      setTotpSecret(res.secret);
      setStep("qr");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "2FA konnte nicht gestartet werden");
    }
  };

  const handleVerify = async () => {
    if (verifyCode.length !== 6) {
      setError("Bitte geben Sie einen 6-stelligen Code ein");
      return;
    }
    setError("");
    try {
      const res = await enrollVerify.mutateAsync({ code: verifyCode });
      setBackupCodes(res.backupCodes);
      setStep("backup");
      await refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ungültiger Code — bitte erneut versuchen");
    }
  };

  const handleDisable = async () => {
    if (!password) {
      setError("Bitte geben Sie Ihr Passwort ein");
      return;
    }
    setError("");
    try {
      await disableTotp.mutateAsync({ password });
      setPassword("");
      setStep("idle");
      await refresh();
      toast.success("2FA wurde deaktiviert");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fehler beim Deaktivieren");
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(totpSecret);
    toast.success("Secret kopiert");
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join("\n"));
    toast.success("Backup-Codes kopiert");
  };

  if (loading) {
    return (
      <DashboardLayout variant="admin">
        <div className="h-32 bg-muted animate-pulse rounded-lg" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout variant="admin">
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold">Sicherheitseinstellungen</h1>
          <p className="text-muted-foreground">
            Verwalten Sie die Zwei-Faktor-Authentifizierung für Ihren Admin-Account.
          </p>
        </div>

        {/* Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {isEnabled ? (
                  <ShieldCheck className="w-5 h-5 text-green-600" />
                ) : (
                  <Shield className="w-5 h-5 text-yellow-600" />
                )}
                Zwei-Faktor-Authentifizierung
              </CardTitle>
              <Badge className={isEnabled
                ? "bg-green-100 text-green-800"
                : "bg-yellow-100 text-yellow-800"
              }>
                {isEnabled ? "Aktiv" : "Nicht aktiv"}
              </Badge>
            </div>
            <CardDescription>
              {isEnabled
                ? "Ihr Account ist durch TOTP-basierte 2FA geschützt."
                : "Schützen Sie Ihren Admin-Account mit Google Authenticator oder Authy."}
            </CardDescription>
          </CardHeader>

          {!isEnabled && step === "idle" && (
            <CardContent>
              <Alert className="mb-4 border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  Als Admin-Account ist 2FA dringend empfohlen. Ohne 2FA ist Ihr Account weniger geschützt.
                </AlertDescription>
              </Alert>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button onClick={handleStartSetup} disabled={busy} className="gap-2">
                <Smartphone className="w-4 h-4" />
                {busy ? "Wird vorbereitet..." : "2FA jetzt einrichten"}
              </Button>
            </CardContent>
          )}

          {isEnabled && step === "idle" && (
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Bei jedem Login wird nach Ihrem Passwort ein TOTP-Code aus Ihrer Authenticator-App abgefragt.
              </p>
              <Button
                variant="destructive"
                onClick={() => { setStep("disable"); setError(""); setPassword(""); }}
                disabled={busy}
                className="gap-2"
              >
                <ShieldOff className="w-4 h-4" />
                2FA deaktivieren
              </Button>
            </CardContent>
          )}
        </Card>

        {/* Step: Disable (Passwort-Bestätigung) */}
        {step === "disable" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="w-5 h-5" />
                2FA deaktivieren
              </CardTitle>
              <CardDescription>
                Geben Sie Ihr Passwort ein, um die Zwei-Faktor-Authentifizierung zu deaktivieren.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="disable-password">Aktuelles Passwort</Label>
                <Input
                  id="disable-password"
                  type="password"
                  placeholder="Ihr Passwort"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleDisable()}
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setStep("idle"); setError(""); setPassword(""); }}>
                  Abbrechen
                </Button>
                <Button variant="destructive" onClick={handleDisable} disabled={busy || !password} className="gap-2">
                  <ShieldOff className="w-4 h-4" />
                  {busy ? "Wird deaktiviert..." : "Deaktivieren"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: QR Code */}
        {step === "qr" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                Schritt 1: QR-Code scannen
              </CardTitle>
              <CardDescription>
                Scannen Sie den QR-Code mit Google Authenticator, Authy oder einer anderen TOTP-App.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-white border rounded-lg">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(totpUri)}`}
                    alt="2FA QR Code"
                    width={200}
                    height={200}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Kein QR-Code Scanner? Geben Sie den Secret manuell ein:
                </p>
                <div className="flex items-center gap-2 w-full max-w-sm">
                  <code className="flex-1 text-xs bg-muted px-3 py-2 rounded break-all font-mono">
                    {totpSecret}
                  </code>
                  <Button variant="outline" size="sm" onClick={copySecret}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <Separator />
              <Button onClick={() => { setStep("verify"); setError(""); }} className="w-full gap-2">
                QR-Code gescannt — Weiter
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step: Verify */}
        {step === "verify" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="w-5 h-5" />
                Schritt 2: Code bestätigen
              </CardTitle>
              <CardDescription>
                Geben Sie den 6-stelligen Code aus Ihrer Authenticator-App ein, um die Einrichtung abzuschließen.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="totp-code">TOTP-Code</Label>
                <Input
                  id="totp-code"
                  type="text"
                  inputMode="numeric"
                  placeholder="123456"
                  maxLength={6}
                  className="text-center text-2xl tracking-widest font-mono w-48"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("qr")}>
                  Zurück
                </Button>
                <Button
                  onClick={handleVerify}
                  disabled={busy || verifyCode.length !== 6}
                  className="gap-2"
                >
                  {busy ? "Wird verifiziert..." : "Code bestätigen"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Backup Codes */}
        {step === "backup" && (
          <Card className="border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <CheckCircle className="w-5 h-5 text-green-600" />
                2FA erfolgreich aktiviert!
              </CardTitle>
              <CardDescription>
                Speichern Sie diese Backup-Codes sicher. Jeder Code kann einmalig verwendet werden,
                falls Sie keinen Zugriff auf Ihre Authenticator-App haben.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-orange-200 bg-orange-50">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  Diese Codes werden nur einmal angezeigt. Bitte jetzt speichern oder kopieren.
                </AlertDescription>
              </Alert>
              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((code, i) => (
                  <code key={i} className="text-sm bg-muted px-3 py-2 rounded font-mono text-center">
                    {code}
                  </code>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={copyBackupCodes} className="gap-2">
                  <Copy className="w-4 h-4" />
                  Alle kopieren
                </Button>
                <Button onClick={() => setStep("done")} className="gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Fertig
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Done */}
        {step === "done" && (
          <Alert className="border-green-200 bg-green-50">
            <ShieldCheck className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Ihr Account ist jetzt mit 2FA gesichert. Beim nächsten Login wird nach Ihrem TOTP-Code gefragt.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </DashboardLayout>
  );
}
