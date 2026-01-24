/**
 * StripeDepositDialog - Dialog for initiating Stripe wallet deposits
 * Phase 1: Stripe Wallet Deposits
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreditCard, Info, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import type { Wallet } from "../../../../../drizzle/schema";

interface StripeDepositDialogProps {
  wallet: Wallet;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StripeDepositDialog({
  wallet,
  open,
  onOpenChange,
}: StripeDepositDialogProps) {
  const [amount, setAmount] = useState<string>("");
  const [error, setError] = useState<string>("");

  const depositMutation = trpc.wallet.depositWithStripe.useMutation({
    onSuccess: (data) => {
      // Redirect to Stripe Checkout
      window.location.href = data.url;
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const handleSubmit = () => {
    setError("");

    const amountNum = parseFloat(amount);

    // Validation
    if (isNaN(amountNum)) {
      setError("Bitte geben Sie einen gültigen Betrag ein");
      return;
    }

    if (amountNum < 1000) {
      setError("Mindesteinzahlung: €1.000");
      return;
    }

    if (amountNum > 1000000) {
      setError("Maximale Einzahlung: €1.000.000");
      return;
    }

    // Calculate fees
    const cardFeePercent = 0.015;
    const cardFeeFixed = 0.25;
    const totalFee = amountNum * cardFeePercent + cardFeeFixed;

    const successUrl = `${window.location.origin}/investor/wallet?deposit=success`;
    const cancelUrl = `${window.location.origin}/investor/wallet?deposit=cancelled`;

    depositMutation.mutate({
      walletId: wallet.id,
      amount: amountNum,
      currency: wallet.currency,
      successUrl,
      cancelUrl,
    });
  };

  const amountNum = parseFloat(amount) || 0;
  const cardFeePercent = 0.015;
  const cardFeeFixed = 0.25;
  const totalFee = amountNum * cardFeePercent + cardFeeFixed;
  const totalAmount = amountNum + totalFee;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Wallet mit Kreditkarte aufladen
          </DialogTitle>
          <DialogDescription>
            Laden Sie Ihr {wallet.currency} Wallet per Kreditkarte oder SEPA-Lastschrift auf
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Einzahlungsbetrag (€)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="1000"
              min={1000}
              max={1000000}
              step={100}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={depositMutation.isPending}
            />
            <p className="text-xs text-muted-foreground">
              Mindestens €1.000, maximal €1.000.000
            </p>
          </div>

          {amountNum >= 1000 && (
            <div className="space-y-2 rounded-lg border p-4 bg-muted/50">
              <div className="flex justify-between text-sm">
                <span>Einzahlungsbetrag:</span>
                <span className="font-medium">€{amountNum.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Kreditkartengebühr (1,5% + €0,25):</span>
                <span>€{totalFee.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span className="text-xs">Alternative: SEPA-Lastschrift (0,8%):</span>
                <span className="text-xs">
                  €{((amountNum * 0.008)).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between font-semibold pt-2 border-t">
                <span>Gesamt zu zahlen:</span>
                <span>€{totalAmount.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          )}

          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription className="text-xs">
              Sie werden zu Stripe weitergeleitet, um die Zahlung sicher abzuschließen.
              Ihr Wallet wird innerhalb von 10 Sekunden nach erfolgreicher Zahlung aufgeladen.
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={depositMutation.isPending}
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={depositMutation.isPending || !amount || parseFloat(amount) < 1000}
          >
            {depositMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Weiterleitung...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                Zu Stripe
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
