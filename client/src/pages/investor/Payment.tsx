import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
export default function Payment() {
  const [subscriptionId, setSubscriptionId] = useState("");
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const createPaymentMutation = trpc.stripe.createPaymentIntent.useMutation();

  const handlePayment = async () => {
    if (!subscriptionId || !amount) {
      alert("Bitte füllen Sie alle Felder aus");
      return;
    }

    setIsLoading(true);
    try {
      const result = await createPaymentMutation.mutateAsync({
        subscriptionId: parseInt(subscriptionId),
        amount,
        currency: "EUR",
      });

      // Redirect to Stripe Checkout
      if (result.clientSecret) {
        // In a real implementation, you would use Stripe.js here
        alert("Zahlungsintention erstellt. Leiten Sie zur Zahlung weiter.");
      }
    } catch (error: any) {
      alert(error.message || "Zahlung konnte nicht verarbeitet werden");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Zeichnung bezahlen</CardTitle>
          <CardDescription>Zahlen Sie Ihre Zeichnung mit Kreditkarte</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="subscriptionId">Zeichnungs-ID</Label>
            <Input
              id="subscriptionId"
              type="number"
              placeholder="z.B. 1"
              value={subscriptionId}
              onChange={(e) => setSubscriptionId(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="amount">Betrag (EUR)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="z.B. 100000"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <Button
            onClick={handlePayment}
            disabled={isLoading || !subscriptionId || !amount}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Wird verarbeitet...
              </>
            ) : (
              "Jetzt bezahlen"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
