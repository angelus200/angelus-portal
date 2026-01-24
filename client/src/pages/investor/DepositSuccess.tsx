/**
 * DepositSuccess - Success page after Stripe payment
 * Phase 1: Stripe Wallet Deposits
 */

import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, ArrowLeft, Wallet } from "lucide-react";

export default function DepositSuccess() {
  const [_, navigate] = useLocation();

  useEffect(() => {
    // Clear any deposit-related query params after 5 seconds
    const timer = setTimeout(() => {
      navigate("/investor/wallet", { replace: true });
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <CardTitle>Einzahlung erfolgreich!</CardTitle>
          <CardDescription>
            Ihre Zahlung wurde erfolgreich verarbeitet
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="bg-muted rounded-lg p-4 space-y-2">
            <p className="text-sm text-muted-foreground">
              Ihr Wallet-Guthaben wird innerhalb der nächsten 10 Sekunden aktualisiert.
            </p>
            <p className="text-sm text-muted-foreground">
              Sie erhalten eine Bestätigungs-E-Mail mit den Transaktionsdetails.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Link href="/investor/wallet">
              <Button className="w-full">
                <Wallet className="w-4 h-4 mr-2" />
                Zum Wallet
              </Button>
            </Link>
            <Link href="/investor">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Zum Dashboard
              </Button>
            </Link>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Sie werden automatisch in 5 Sekunden weitergeleitet...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
