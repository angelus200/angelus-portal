import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { Link } from "wouter";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  
  const requestResetMutation = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (error) => {
      toast.error(error.message || "Fehler beim Senden der Anfrage");
    },
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Bitte geben Sie Ihre E-Mail-Adresse ein");
      return;
    }
    requestResetMutation.mutate({ email });
  };
  
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
          <CardTitle className="text-2xl text-card-foreground">Passwort vergessen?</CardTitle>
          <CardDescription>
            {submitted 
              ? "Wir haben Ihnen eine E-Mail gesendet"
              : "Geben Sie Ihre E-Mail-Adresse ein, um Ihr Passwort zurückzusetzen"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div className="space-y-2">
                <p className="text-card-foreground">
                  Falls ein Konto mit der E-Mail-Adresse <strong>{email}</strong> existiert, 
                  haben wir Ihnen einen Link zum Zurücksetzen Ihres Passworts gesendet.
                </p>
                <p className="text-sm text-muted-foreground">
                  Bitte überprüfen Sie auch Ihren Spam-Ordner.
                </p>
              </div>
              <div className="pt-4 space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setSubmitted(false);
                    setEmail("");
                  }}
                >
                  Andere E-Mail-Adresse eingeben
                </Button>
                <Link href="/login">
                  <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                    Zurück zum Login
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail-Adresse</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="ihre@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={requestResetMutation.isPending}
              >
                {requestResetMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Wird gesendet...
                  </>
                ) : (
                  "Link zum Zurücksetzen senden"
                )}
              </Button>
              
              <div className="text-center">
                <Link href="/login" className="text-sm text-primary hover:underline">
                  Zurück zum Login
                </Link>
              </div>
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
