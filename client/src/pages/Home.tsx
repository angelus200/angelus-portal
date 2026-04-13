import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useEffect } from "react";
import { Lock } from "lucide-react";
import { BRAND } from '@shared/brand';

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      if (user.role === "admin" || user.role === "superadmin") {
        setLocation("/admin");
      } else {
        setLocation("/investor");
      }
    }
  }, [loading, isAuthenticated, user, setLocation]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-center">
            Exklusives Mitgliederportal
          </h1>
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            Dieser Bereich ist ausschließlich für eingeladene Mitglieder zugänglich.
          </p>
        </div>

        {loading ? (
          <div className="w-full h-11 bg-muted animate-pulse rounded-lg" />
        ) : isAuthenticated ? (
          <Link href={user?.role === "admin" || user?.role === "superadmin" ? "/admin" : "/investor"}>
            <Button size="lg" className="w-full">
              Zum Dashboard
            </Button>
          </Link>
        ) : (
          <Link href="/sign-in">
            <Button size="lg" className="w-full">
              Anmelden
            </Button>
          </Link>
        )}

        <p className="text-xs text-muted-foreground text-center">
          Fragen?{" "}
          <a
            href={`mailto:${BRAND.contactEmail}`}
            className="underline underline-offset-4 hover:text-foreground transition-colors"
          >
            {BRAND.contactEmail}
          </a>
        </p>
      </div>
    </div>
  );
}
