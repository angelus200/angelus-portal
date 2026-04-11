import { SignUp as ClerkSignUp } from "@clerk/clerk-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function SignUp() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Only allow sign-up if a valid invitation was pre-approved
    const flag = localStorage.getItem("angelus_valid_invitation");
    if (flag !== "1") {
      setLocation("/");
    }
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-secondary flex flex-col items-center justify-center p-4">
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
    </div>
  );
}
