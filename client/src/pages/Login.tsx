import { getLoginUrl } from "@/const";
import { useEffect } from "react";

export default function Login() {
  useEffect(() => {
    window.location.href = getLoginUrl();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center mx-auto mb-4">
          <span className="text-primary-foreground font-bold text-2xl">A</span>
        </div>
        <p className="text-muted-foreground">Weiterleitung zur Anmeldung...</p>
      </div>
    </div>
  );
}
