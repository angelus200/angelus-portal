import { SignUp as ClerkSignUp } from "@clerk/clerk-react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SignUp() {
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

      <ClerkSignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        afterSignUpUrl="/investor/onboarding"
        appearance={{
          elements: {
            rootBox: "w-full max-w-md",
            card: "shadow-lg",
          },
        }}
      />

      <p className="mt-8 text-sm text-muted-foreground text-center max-w-md">
        Mit der Registrierung bestätigen Sie, dass Sie kein Verbraucher sind.
      </p>
    </div>
  );
}
