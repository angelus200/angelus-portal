import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import { Loader2, Lock, ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { Link } from "wouter";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const token = new URLSearchParams(search).get("token") || "";
  
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [success, setSuccess] = useState(false);
  
  const resetMutation = trpc.auth.resetPassword.useMutation({
    onSuccess: () => {
      setSuccess(true);
      toast.success("Passwort erfolgreich zurückgesetzt!");
    },
    onError: (error) => {
      toast.error(error.message || "Fehler beim Zurücksetzen des Passworts");
    },
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !passwordConfirm) {
      toast.error("Bitte füllen Sie alle Felder aus");
      return;
    }
    
    if (password !== passwordConfirm) {
      toast.error("Passwörter stimmen nicht überein");
      return;
    }
    
    if (password.length < 8) {
      toast.error("Passwort muss mindestens 8 Zeichen lang sein");
      return;
    }
    
    resetMutation.mutate({ token, newPassword: password });
  };
  
  // Redirect to forgot password if no token
  useEffect(() => {
    if (!token) {
      setLocation("/forgot-password");
    }
  }, [token, setLocation]);
  
  if (!token) {
    return null;
  }
  
  return (
    <div className="min-h-screen bg-secondary flex flex-col items-center justify-center p-4">
      {/* Back to Login */}
      <Link href="/login" className="absolute top-4 left-4">
        <Button variant="ghost" className="gap-2 text-secondary-foreground hover:text-primary">
          <ArrowLeft className="w-4 h-4" />
          Zurück zum Login
        </Button>
      </Link>
      
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-xl">A</span>
        </div>
        <span className="font-semibold text-2xl text-secondary-foreground">Angelus</span>
      </div>
      
      <Card className="w-full max-w-md bg-card border-border">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-card-foreground">
            {success ? "Passwort zurückgesetzt" : "Neues Passwort festlegen"}
          </CardTitle>
          <CardDescription>
            {success 
              ? "Ihr Passwort wurde erfolgreich geändert"
              : "Geben Sie Ihr neues Passwort ein"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div className="space-y-2">
                <p className="text-card-foreground">
                  Ihr Passwort wurde erfolgreich zurückgesetzt. 
                  Sie können sich jetzt mit Ihrem neuen Passwort anmelden.
                </p>
              </div>
              <div className="pt-4">
                <Link href="/login">
                  <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                    Zum Login
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Neues Passwort</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mindestens 8 Zeichen"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password-confirm">Passwort bestätigen</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password-confirm"
                    type="password"
                    placeholder="Passwort wiederholen"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              {/* Password requirements */}
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-medium">Passwort-Anforderungen:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li className={password.length >= 8 ? "text-green-600" : ""}>
                    Mindestens 8 Zeichen
                  </li>
                  <li className={password === passwordConfirm && password.length > 0 ? "text-green-600" : ""}>
                    Passwörter stimmen überein
                  </li>
                </ul>
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={resetMutation.isPending}
              >
                {resetMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Wird gespeichert...
                  </>
                ) : (
                  "Passwort speichern"
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
      
      {/* Footer */}
      <p className="mt-8 text-sm text-muted-foreground text-center">
        Dieses Portal richtet sich ausschließlich an professionelle Investoren und Unternehmer.
      </p>
    </div>
  );
}
