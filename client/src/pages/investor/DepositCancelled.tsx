/**
 * DepositCancelled - Cancelled page when user cancels Stripe payment
 * Phase 1: Stripe Wallet Deposits
 */

import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle, ArrowLeft, Wallet } from "lucide-react";

export default function DepositCancelled() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
              <XCircle className="w-10 h-10 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <CardTitle>Einzahlung abgebrochen</CardTitle>
          <CardDescription>
            Sie haben die Zahlung abgebrochen
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="bg-muted rounded-lg p-4">
            <p className="text-sm text-muted-foreground">
              Es wurde keine Zahlung durchgeführt. Ihr Wallet-Guthaben bleibt unverändert.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Link href="/investor/wallet">
              <Button className="w-full">
                <Wallet className="w-4 h-4 mr-2" />
                Zurück zum Wallet
              </Button>
            </Link>
            <Link href="/investor">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Zum Dashboard
              </Button>
            </Link>
          </div>

          <div className="text-center text-xs text-muted-foreground space-y-1">
            <p>Sie können die Einzahlung jederzeit erneut versuchen.</p>
            <p>Bei Fragen kontaktieren Sie bitte unseren Support.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
