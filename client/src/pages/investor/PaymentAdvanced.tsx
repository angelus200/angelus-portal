import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function PaymentAdvanced() {
  const [paymentType, setPaymentType] = useState<"person" | "company">("person");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "sepa">("card");
  const [subscriptionId, setSubscriptionId] = useState("");
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Privatperson Felder
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // Firma Felder
  const [companyName, setCompanyName] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [registerNumber, setRegisterNumber] = useState("");

  // SEPA Felder
  const [iban, setIban] = useState("");
  const [bic, setBic] = useState("");
  const [accountHolder, setAccountHolder] = useState("");

  const createPaymentMutation = trpc.stripe.createPaymentIntent.useMutation();

  const handlePayment = async () => {
    if (!subscriptionId || !amount) {
      alert("Bitte füllen Sie alle erforderlichen Felder aus");
      return;
    }

    if (paymentType === "person" && (!firstName || !lastName)) {
      alert("Bitte geben Sie Vor- und Nachname ein");
      return;
    }

    if (paymentType === "company" && (!companyName || !taxNumber)) {
      alert("Bitte geben Sie Firmennamen und Steuernummer ein");
      return;
    }

    if (paymentMethod === "sepa" && (!iban || !accountHolder)) {
      alert("Bitte geben Sie IBAN und Kontoinhaber ein");
      return;
    }

    setIsLoading(true);
    try {
      const metadata = {
        subscriptionId,
        paymentType,
        paymentMethod,
        ...(paymentType === "person" && { firstName, lastName }),
        ...(paymentType === "company" && { companyName, taxNumber, registerNumber }),
        ...(paymentMethod === "sepa" && { iban, accountHolder }),
      };

      const result = await createPaymentMutation.mutateAsync({
        subscriptionId: parseInt(subscriptionId),
        amount,
        currency: "EUR",
      });

      if (result.clientSecret) {
        alert(`Zahlungsintention erstellt.\nPayment Intent ID: ${result.paymentIntentId}`);
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
          <CardDescription>Zahlen Sie Ihre Zeichnung als Privatperson oder Firma</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basis-Informationen */}
          <div className="space-y-4">
            <h3 className="font-semibold">Zeichnungsdetails</h3>
            <div className="grid grid-cols-2 gap-4">
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
            </div>
          </div>

          {/* Zahlungsart */}
          <Tabs value={paymentType} onValueChange={(v) => setPaymentType(v as "person" | "company")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="person">Privatperson</TabsTrigger>
              <TabsTrigger value="company">Firma</TabsTrigger>
            </TabsList>

            <TabsContent value="person" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">Vorname</Label>
                  <Input
                    id="firstName"
                    placeholder="Max"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Nachname</Label>
                  <Input
                    id="lastName"
                    placeholder="Mustermann"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="company" className="space-y-4">
              <div>
                <Label htmlFor="companyName">Firmenname</Label>
                <Input
                  id="companyName"
                  placeholder="Meine GmbH"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="taxNumber">Steuernummer</Label>
                  <Input
                    id="taxNumber"
                    placeholder="DE123456789"
                    value={taxNumber}
                    onChange={(e) => setTaxNumber(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="registerNumber">Handelsregisternummer</Label>
                  <Input
                    id="registerNumber"
                    placeholder="HRB 123456"
                    value={registerNumber}
                    onChange={(e) => setRegisterNumber(e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Zahlungsmethode */}
          <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as "card" | "sepa")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="card">Kreditkarte</TabsTrigger>
              <TabsTrigger value="sepa">SEPA-Lastschrift</TabsTrigger>
            </TabsList>

            <TabsContent value="card" className="text-sm text-gray-600">
              <p>Kreditkartenzahlung wird über Stripe Checkout verarbeitet.</p>
            </TabsContent>

            <TabsContent value="sepa" className="space-y-4">
              <div>
                <Label htmlFor="accountHolder">Kontoinhaber</Label>
                <Input
                  id="accountHolder"
                  placeholder="Max Mustermann"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="iban">IBAN</Label>
                <Input
                  id="iban"
                  placeholder="DE89370400440532013000"
                  value={iban}
                  onChange={(e) => setIban(e.target.value.toUpperCase())}
                />
              </div>
              <div>
                <Label htmlFor="bic">BIC (optional)</Label>
                <Input
                  id="bic"
                  placeholder="COBADEFFXXX"
                  value={bic}
                  onChange={(e) => setBic(e.target.value.toUpperCase())}
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* Submit Button */}
          <Button
            onClick={handlePayment}
            disabled={isLoading || !subscriptionId || !amount}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Wird verarbeitet...
              </>
            ) : (
              `EUR ${amount || "0"} bezahlen`
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
