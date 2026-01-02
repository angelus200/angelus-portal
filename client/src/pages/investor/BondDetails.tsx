import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, AlertTriangle, FileText, Calendar, Percent, Shield, CheckCircle } from "lucide-react";
import { Link, useParams } from "wouter";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useState } from "react";
import { toast } from "sonner";

export default function BondDetails() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const bondId = parseInt(id || "0");
  
  const { data: bond, isLoading } = trpc.bonds.getById.useQuery({ id: bondId });
  const { data: riskProfile } = trpc.riskProfile.my.useQuery();
  const { data: contracts } = trpc.contracts.byBond.useQuery({ bondId }, { enabled: !!bond });
  
  const createSubscription = trpc.subscriptions.create.useMutation({
    onSuccess: () => {
      toast.success("Zeichnung erfolgreich eingereicht!");
      setIsSubscribeOpen(false);
    },
    onError: (error) => {
      toast.error("Fehler: " + error.message);
    },
  });

  const [isSubscribeOpen, setIsSubscribeOpen] = useState(false);
  const [subscriptionAmount, setSubscriptionAmount] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [riskWarningAccepted, setRiskWarningAccepted] = useState(false);
  const [subordinationAccepted, setSubordinationAccepted] = useState(false);
  const [insolvencyAccepted, setInsolvencyAccepted] = useState(false);
  const [professionalInvestorConfirmed, setProfessionalInvestorConfirmed] = useState(false);

  const canSubscribe = user?.kycStatus === "verified" && riskProfile;
  const allCheckboxesChecked = termsAccepted && riskWarningAccepted && subordinationAccepted && insolvencyAccepted && professionalInvestorConfirmed;
  const minAmount = parseFloat(bond?.minSubscription || "100000");
  const isAmountValid = parseFloat(subscriptionAmount) >= minAmount;

  const handleSubscribe = async () => {
    if (!allCheckboxesChecked || !isAmountValid) return;
    
    await createSubscription.mutateAsync({
      bondId,
      amount: subscriptionAmount,
      currency: "EUR",
      termsAccepted,
      riskWarningAccepted,
      ipAddress: "0.0.0.0", // Would be captured server-side in production
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout variant="investor">
        <div className="space-y-6">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (!bond) {
    return (
      <DashboardLayout variant="investor">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Anleihe nicht gefunden</h2>
          <Link href="/investor/investments">
            <Button variant="outline">Zurück zur Übersicht</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout variant="investor">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/investor/investments">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{bond.name}</h1>
            {bond.isin && <p className="text-muted-foreground">ISIN: {bond.isin}</p>}
          </div>
          <Badge className={`ml-auto ${
            bond.riskCategory === "high" ? "bg-red-100 text-red-800" :
            bond.riskCategory === "medium" ? "bg-yellow-100 text-yellow-800" :
            "bg-green-100 text-green-800"
          }`}>
            {bond.riskCategory === "high" ? "Hohes Risiko" :
             bond.riskCategory === "medium" ? "Mittleres Risiko" :
             "Niedriges Risiko"}
          </Badge>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            {bond.description && (
              <Card>
                <CardHeader>
                  <CardTitle>Beschreibung</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{bond.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Key Terms */}
            <Card>
              <CardHeader>
                <CardTitle>Konditionen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Percent className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Zinssatz</p>
                      <p className="font-semibold text-lg">{bond.interestRate}% p.a.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Calendar className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Laufzeit</p>
                      <p className="font-semibold text-lg">{bond.termMonths} Monate</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <FileText className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Mindestzeichnung</p>
                      <p className="font-semibold text-lg">€{parseFloat(bond.minSubscription).toLocaleString("de-DE")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Shield className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Anwendbares Recht</p>
                      <p className="font-semibold text-lg">{bond.governingLaw}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Gesamtvolumen</span>
                    <span className="font-medium">€{parseFloat(bond.totalVolume).toLocaleString("de-DE")}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Verfügbares Volumen</span>
                    <span className="font-medium text-green-600">€{parseFloat(bond.availableVolume).toLocaleString("de-DE")}</span>
                  </div>
                  {bond.issueDate && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Emissionsdatum</span>
                      <span className="font-medium">{format(new Date(bond.issueDate), "dd.MM.yyyy", { locale: de })}</span>
                    </div>
                  )}
                  {bond.maturityDate && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Fälligkeitsdatum</span>
                      <span className="font-medium">{format(new Date(bond.maturityDate), "dd.MM.yyyy", { locale: de })}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Risk Warning */}
            <Card className="border-red-200 bg-red-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-800">
                  <AlertTriangle className="w-5 h-5" />
                  Risikohinweise
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-red-700 space-y-3">
                <p>
                  <strong>Totalverlustrisiko:</strong> Es besteht das Risiko eines vollständigen Verlustes des eingesetzten Kapitals.
                </p>
                {bond.hasSubordination && (
                  <p>
                    <strong>Rangrücktritt:</strong> Diese Anleihe ist qualifiziert nachrangig. Im Insolvenzfall werden andere Gläubiger vorrangig bedient.
                  </p>
                )}
                {bond.hasInsolvencyReservation && (
                  <p>
                    <strong>Insolvenzvorbehalt:</strong> Zahlungen erfolgen nur, wenn die Gesellschaft nicht in einen Insolvenzgrund gerät und über ausreichende Liquidität verfügt.
                  </p>
                )}
                <p>
                  <strong>Keine Einlagensicherung:</strong> Diese Anleihe unterliegt keiner Einlagensicherung.
                </p>
              </CardContent>
            </Card>

            {/* Documents */}
            {contracts && contracts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Dokumente</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {contracts.map((contract) => (
                      <a 
                        key={contract.id} 
                        href={contract.fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <FileText className="w-5 h-5 text-primary" />
                        <div>
                          <p className="font-medium">{contract.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {contract.type === "prospectus" ? "Prospekt" :
                             contract.type === "terms" ? "Anleihebedingungen" :
                             contract.type === "risk_disclosure" ? "Risikohinweise" :
                             "Dokument"}
                          </p>
                        </div>
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Subscribe */}
          <div className="space-y-6">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Anleihe zeichnen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!canSubscribe ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        Um diese Anleihe zu zeichnen, müssen Sie zunächst:
                      </p>
                      <ul className="mt-2 space-y-1 text-sm text-yellow-700">
                        {user?.kycStatus !== "verified" && (
                          <li className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            KYC-Verifizierung abschließen
                          </li>
                        )}
                        {!riskProfile && (
                          <li className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            Risikoprofil erstellen
                          </li>
                        )}
                      </ul>
                    </div>
                    <Link href="/investor/onboarding">
                      <Button className="w-full">Onboarding abschließen</Button>
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="text-center p-4 bg-primary/5 rounded-lg">
                      <p className="text-sm text-muted-foreground">Zinssatz</p>
                      <p className="text-3xl font-bold text-primary">{bond.interestRate}%</p>
                      <p className="text-xs text-muted-foreground">pro Jahr</p>
                    </div>

                    <Link href={`/investor/subscribe/${bond.id}`}>
                      <Button className="w-full" size="lg">
                        Jetzt zeichnen
                      </Button>
                    </Link>
                    
                    {/* Legacy Dialog - now using dedicated page */}
                    <Dialog open={false} onOpenChange={setIsSubscribeOpen}>
                      <DialogTrigger asChild>
                        <span className="hidden">
                          Jetzt zeichnen
                        </span>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Anleihe zeichnen: {bond.name}</DialogTitle>
                          <DialogDescription>
                            Bitte prüfen Sie alle Angaben sorgfältig und bestätigen Sie die erforderlichen Hinweise.
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-6 py-4">
                          {/* Amount */}
                          <div className="space-y-2">
                            <Label>Zeichnungsbetrag (EUR)</Label>
                            <Input
                              type="number"
                              placeholder={`Mindestens €${minAmount.toLocaleString("de-DE")}`}
                              value={subscriptionAmount}
                              onChange={(e) => setSubscriptionAmount(e.target.value)}
                              min={minAmount}
                              step="1000"
                            />
                            {subscriptionAmount && !isAmountValid && (
                              <p className="text-sm text-red-600">
                                Mindestzeichnungsbetrag: €{minAmount.toLocaleString("de-DE")}
                              </p>
                            )}
                          </div>

                          {/* Checkboxes - Swiss Law Compliance */}
                          <div className="space-y-4 border-t pt-4">
                            <h4 className="font-semibold">Pflichtbestätigungen (Schweizer Recht)</h4>
                            
                            <div className="flex items-start gap-3">
                              <Checkbox 
                                id="terms" 
                                checked={termsAccepted}
                                onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                              />
                              <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                                Ich habe die Anleihebedingungen und das Informationsmemorandum gelesen und verstanden.
                              </Label>
                            </div>

                            <div className="flex items-start gap-3">
                              <Checkbox 
                                id="risk" 
                                checked={riskWarningAccepted}
                                onCheckedChange={(checked) => setRiskWarningAccepted(checked === true)}
                              />
                              <Label htmlFor="risk" className="text-sm leading-relaxed cursor-pointer">
                                Ich bin mir bewusst, dass ein <strong>Totalverlust des eingesetzten Kapitals</strong> möglich ist 
                                und dass keine Garantie für Zinszahlungen oder Rückzahlung besteht.
                              </Label>
                            </div>

                            <div className="flex items-start gap-3">
                              <Checkbox 
                                id="subordination" 
                                checked={subordinationAccepted}
                                onCheckedChange={(checked) => setSubordinationAccepted(checked === true)}
                              />
                              <Label htmlFor="subordination" className="text-sm leading-relaxed cursor-pointer">
                                Ich verstehe und akzeptiere den <strong>qualifizierten Rangrücktritt</strong>. Im Insolvenzfall 
                                werden meine Ansprüche nachrangig zu anderen Gläubigern behandelt.
                              </Label>
                            </div>

                            <div className="flex items-start gap-3">
                              <Checkbox 
                                id="insolvency" 
                                checked={insolvencyAccepted}
                                onCheckedChange={(checked) => setInsolvencyAccepted(checked === true)}
                              />
                              <Label htmlFor="insolvency" className="text-sm leading-relaxed cursor-pointer">
                                Ich akzeptiere den <strong>Insolvenzvorbehalt</strong>: Die Gesellschaft ist nur zur Zahlung 
                                verpflichtet, wenn sie nicht in einen Insolvenzgrund gerät und über ausreichende Liquidität verfügt.
                              </Label>
                            </div>

                            <div className="flex items-start gap-3">
                              <Checkbox 
                                id="professional" 
                                checked={professionalInvestorConfirmed}
                                onCheckedChange={(checked) => setProfessionalInvestorConfirmed(checked === true)}
                              />
                              <Label htmlFor="professional" className="text-sm leading-relaxed cursor-pointer">
                                Ich bestätige, dass ich <strong>kein Verbraucher</strong> im Sinne des Verbraucherschutzrechts bin 
                                und als professioneller Investor oder Unternehmer handle.
                              </Label>
                            </div>
                          </div>

                          {/* Legal Notice */}
                          <div className="p-4 bg-muted rounded-lg text-xs text-muted-foreground">
                            <p>
                              Mit der Zeichnung bestätigen Sie, dass Sie die Anleihe auf eigene Rechnung und eigenes Risiko erwerben. 
                              Diese Zeichnung unterliegt Schweizer Recht. Der ordentliche Rechtsweg ist ausgeschlossen; 
                              Streitigkeiten werden durch ein Schiedsgericht entschieden.
                            </p>
                            <p className="mt-2">
                              Ihre Zustimmung wird mit Zeitstempel und IP-Adresse protokolliert.
                            </p>
                          </div>
                        </div>

                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsSubscribeOpen(false)}>
                            Abbrechen
                          </Button>
                          <Button 
                            onClick={handleSubscribe}
                            disabled={!allCheckboxesChecked || !isAmountValid || createSubscription.isPending}
                          >
                            {createSubscription.isPending ? "Wird verarbeitet..." : "Verbindlich zeichnen"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <p className="text-xs text-muted-foreground text-center">
                      Mindestzeichnung: €{parseFloat(bond.minSubscription).toLocaleString("de-DE")}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
