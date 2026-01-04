import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { 
  AlertTriangle, 
  CheckCircle, 
  FileText, 
  ArrowLeft,
  ArrowRight,
  Shield,
  Scale,
  Clock
} from "lucide-react";
import { Link, useParams, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export default function Subscribe() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  
  const bondId = parseInt(id || "0");
  const { data: bond, isLoading: bondLoading } = trpc.bonds.getById.useQuery(
    { id: bondId },
    { enabled: bondId > 0 }
  );
  const { data: riskProfile } = trpc.riskProfile.my.useQuery();
  const { data: wallets } = trpc.wallet.myWallets.useQuery();

  const subscribe = trpc.subscriptions.create.useMutation({
    onSuccess: (result) => {
      toast.success("Zeichnung erfolgreich eingereicht");
      setLocation(`/investor/investments`);
    },
    onError: (error: { message: string }) => {
      toast.error("Fehler: " + error.message);
    },
  });

  // Form state
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState("");
  
  // Compliance checkboxes - all required
  const [confirmations, setConfirmations] = useState({
    riskWarning: false,
    noConsumer: false,
    professionalInvestor: false,
    swissLaw: false,
    noGuarantee: false,
    totalLossRisk: false,
    liquidityRisk: false,
    subordination: false,
    ownResearch: false,
    noAdvice: false,
    dataProcessing: false,
    arbitration: false,
  });

  // Consent state - will be populated from bond data
  const [requiredConsents, setRequiredConsents] = useState<{
    [key: string]: boolean;
  }>({});
  
  // Fetch consents for this bond
  const { data: consents } = trpc.consents.getByBond.useQuery(
    { bondId },
    { enabled: bondId > 0 }
  );
  
  // Initialize required consents from bond
  useEffect(() => {
    if (consents) {
      const consentMap: { [key: string]: boolean } = {};
      consents.forEach(c => {
        consentMap[c.consentType] = false; // Start unchecked
      });
      setRequiredConsents(consentMap);
    }
  }, [consents]);

  // Check eligibility
  const isKycVerified = user?.kycStatus === "verified";
  const hasRiskProfile = !!riskProfile;
  const isEligible = isKycVerified && hasRiskProfile;

  // Get EUR wallet balance
  const eurWallet = wallets?.find(w => w.currency === "EUR");
  const availableBalance = parseFloat(eurWallet?.balance || "0");

  // Validation
  const parsedAmount = parseFloat(amount) || 0;
  const minAmount = bond?.minSubscription ? parseFloat(bond.minSubscription) : 100000;
  const maxAmount = bond?.totalVolume ? parseFloat(bond.totalVolume) : 10000000;
  const isAmountValid = parsedAmount >= minAmount && parsedAmount <= maxAmount;
  const hasSufficientFunds = parsedAmount <= availableBalance;
  
  const allConfirmationsChecked = Object.values(confirmations).every(v => v);
  const allConsentsChecked = Object.values(requiredConsents).every(v => v);
  const canSubmit = isEligible && isAmountValid && hasSufficientFunds && allConfirmationsChecked && allConsentsChecked;

  const handleConfirmationChange = (key: keyof typeof confirmations) => {
    setConfirmations(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async () => {
    if (!canSubmit || !bond) return;

    // Collect IP address (in production, this would be done server-side)
    const ipAddress = "client-ip"; // Placeholder - server will capture actual IP

    await subscribe.mutateAsync({
      bondId: bond.id,
      amount: amount,
      termsAccepted: true,
      riskWarningAccepted: true,
      ipAddress,
      currency: "EUR",
    });
  };

  if (bondLoading) {
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
        <Card>
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Anleihe nicht gefunden</h2>
            <p className="text-muted-foreground mb-4">
              Die angeforderte Anleihe existiert nicht oder ist nicht mehr verfügbar.
            </p>
            <Link href="/investor/investments">
              <Button>Zurück zu Anleihen</Button>
            </Link>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout variant="investor">
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href={`/investor/bond/${bond.id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Anleihe zeichnen</h1>
            <p className="text-muted-foreground">{bond.name}</p>
          </div>
        </div>

        {/* Eligibility Check */}
        {!isEligible && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Zeichnung nicht möglich</AlertTitle>
            <AlertDescription>
              {!isKycVerified && (
                <p>Ihre KYC-Verifizierung ist noch nicht abgeschlossen. <Link href="/investor/onboarding" className="underline">Jetzt verifizieren</Link></p>
              )}
              {isKycVerified && !hasRiskProfile && (
                <p>Bitte füllen Sie zuerst Ihr Risikoprofil aus. <Link href="/investor/risk-profile" className="underline">Zum Risikoprofil</Link></p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {step > s ? <CheckCircle className="w-4 h-4" /> : s}
              </div>
              <span className={`text-sm ${step >= s ? "text-foreground" : "text-muted-foreground"}`}>
                {s === 1 ? "Betrag" : s === 2 ? "Bestätigungen" : "Abschluss"}
              </span>
              {s < 3 && <div className={`w-12 h-0.5 ${step > s ? "bg-primary" : "bg-muted"}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Amount */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Zeichnungsbetrag festlegen
              </CardTitle>
              <CardDescription>
                Geben Sie den Betrag ein, den Sie in diese Anleihe investieren möchten.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Bond Summary */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Anleihe:</span>
                  <span className="font-medium">{bond.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Zinssatz:</span>
                  <span className="font-medium text-primary">{bond.interestRate}% p.a.</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Laufzeit:</span>
                  <span className="font-medium">{bond.termMonths} Monate</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mindestzeichnung:</span>
                  <span className="font-medium">€{minAmount.toLocaleString("de-DE")}</span>
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <Label htmlFor="amount">Zeichnungsbetrag (EUR)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="100.000"
                    className="pl-8 text-lg"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min={minAmount}
                    max={maxAmount}
                    step="1000"
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Verfügbar: €{availableBalance.toLocaleString("de-DE", { minimumFractionDigits: 2 })}
                  </span>
                  {parsedAmount > 0 && !hasSufficientFunds && (
                    <span className="text-destructive">Nicht genügend Guthaben</span>
                  )}
                </div>
              </div>

              {/* Expected Returns */}
              {parsedAmount > 0 && isAmountValid && (
                <div className="p-4 border border-primary/20 bg-primary/5 rounded-lg">
                  <h4 className="font-medium mb-3">Erwartete Erträge</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Jährliche Zinsen</p>
                      <p className="text-lg font-semibold text-primary">
                        €{(parsedAmount * parseFloat(bond.interestRate) / 100).toLocaleString("de-DE", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Gesamtertrag (bei Laufzeitende)</p>
                      <p className="text-lg font-semibold text-primary">
                        €{(parsedAmount * parseFloat(bond.interestRate) / 100 * (bond.termMonths / 12)).toLocaleString("de-DE", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button 
                  onClick={() => setStep(2)} 
                  disabled={!isAmountValid || !hasSufficientFunds || !isEligible}
                  className="gap-2"
                >
                  Weiter
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Confirmations */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Zustimmungen & Bestätigungen
              </CardTitle>
              <CardDescription>
                Gemäß Schweizer Recht und EU-Prospektverordnung müssen Sie folgende Punkte bestätigen.
                Alle Bestätigungen sind erforderlich.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Required Consents */}
              {Object.keys(requiredConsents).length > 0 && (
                <>
                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      Erforderliche Zustimmungen
                    </h4>
                    
                    <div className="space-y-3 pl-6">
                      {Object.entries(requiredConsents).map(([type, checked]) => {
                        const consentLabels: { [key: string]: string } = {
                          risk_disclosure: "Ich bestätige die Risikooffenlegung gelesen zu haben",
                          terms_conditions: "Ich akzeptiere die Allgemeinen Geschäftsbedingungen",
                          subscription_agreement: "Ich akzeptiere die Zeichnungsvereinbarung",
                          kyc_confirmation: "Ich bestätige die KYC-Anforderungen erfüllt zu haben",
                          prospectus_acknowledgment: "Ich bestätige den Prospekt zur Kenntnis genommen zu haben",
                        };
                        
                        return (
                          <div key={type} className="flex items-start gap-3">
                            <Checkbox
                              id={`consent_${type}`}
                              checked={checked}
                              onCheckedChange={() => setRequiredConsents({
                                ...requiredConsents,
                                [type]: !checked
                              })}
                            />
                            <Label htmlFor={`consent_${type}`} className="text-sm leading-relaxed cursor-pointer">
                              {consentLabels[type] || type}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  <Separator />
                </>
              )}
              {/* Risk Warnings */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  Risikohinweise
                </h4>
                
                <div className="space-y-3 pl-6">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="riskWarning"
                      checked={confirmations.riskWarning}
                      onCheckedChange={() => handleConfirmationChange("riskWarning")}
                    />
                    <Label htmlFor="riskWarning" className="text-sm leading-relaxed cursor-pointer">
                      Ich habe die Risikohinweise vollständig gelesen und verstanden. Mir ist bewusst, dass es sich um eine 
                      <strong> risikoreiche Anlageform</strong> handelt.
                    </Label>
                  </div>

                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="totalLossRisk"
                      checked={confirmations.totalLossRisk}
                      onCheckedChange={() => handleConfirmationChange("totalLossRisk")}
                    />
                    <Label htmlFor="totalLossRisk" className="text-sm leading-relaxed cursor-pointer">
                      Ich bin mir bewusst, dass ein <strong>Totalverlust des eingesetzten Kapitals</strong> möglich ist und 
                      ich dieses Risiko tragen kann.
                    </Label>
                  </div>

                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="noGuarantee"
                      checked={confirmations.noGuarantee}
                      onCheckedChange={() => handleConfirmationChange("noGuarantee")}
                    />
                    <Label htmlFor="noGuarantee" className="text-sm leading-relaxed cursor-pointer">
                      Mir ist bekannt, dass <strong>keine Garantie</strong> für Zinszahlungen oder Kapitalrückzahlung besteht.
                    </Label>
                  </div>

                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="liquidityRisk"
                      checked={confirmations.liquidityRisk}
                      onCheckedChange={() => handleConfirmationChange("liquidityRisk")}
                    />
                    <Label htmlFor="liquidityRisk" className="text-sm leading-relaxed cursor-pointer">
                      Ich verstehe, dass die Anleihe <strong>nicht börsengehandelt</strong> ist und eine vorzeitige 
                      Veräußerung möglicherweise nicht oder nur mit erheblichen Verlusten möglich ist.
                    </Label>
                  </div>

                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="subordination"
                      checked={confirmations.subordination}
                      onCheckedChange={() => handleConfirmationChange("subordination")}
                    />
                    <Label htmlFor="subordination" className="text-sm leading-relaxed cursor-pointer">
                      Mir ist bekannt, dass es sich um eine <strong>qualifiziert nachrangige Schuldverschreibung</strong> handelt 
                      und meine Forderungen im Insolvenzfall nachrangig bedient werden.
                    </Label>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Investor Status */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Scale className="w-4 h-4 text-primary" />
                  Investorenstatus
                </h4>
                
                <div className="space-y-3 pl-6">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="noConsumer"
                      checked={confirmations.noConsumer}
                      onCheckedChange={() => handleConfirmationChange("noConsumer")}
                    />
                    <Label htmlFor="noConsumer" className="text-sm leading-relaxed cursor-pointer">
                      Ich bestätige, dass ich <strong>kein Verbraucher</strong> im Sinne des Verbraucherschutzrechts bin 
                      und diese Investition im Rahmen meiner gewerblichen oder selbständigen beruflichen Tätigkeit tätige.
                    </Label>
                  </div>

                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="professionalInvestor"
                      checked={confirmations.professionalInvestor}
                      onCheckedChange={() => handleConfirmationChange("professionalInvestor")}
                    />
                    <Label htmlFor="professionalInvestor" className="text-sm leading-relaxed cursor-pointer">
                      Ich bestätige, dass ich ein <strong>professioneller Investor, Unternehmer oder institutioneller Anleger</strong> bin 
                      und über ausreichende Erfahrung und Kenntnisse verfüge, um die Risiken dieser Anlage einzuschätzen.
                    </Label>
                  </div>

                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="ownResearch"
                      checked={confirmations.ownResearch}
                      onCheckedChange={() => handleConfirmationChange("ownResearch")}
                    />
                    <Label htmlFor="ownResearch" className="text-sm leading-relaxed cursor-pointer">
                      Ich habe meine <strong>eigene Prüfung und Recherche</strong> durchgeführt und treffe diese 
                      Anlageentscheidung auf Basis meiner eigenen Einschätzung.
                    </Label>
                  </div>

                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="noAdvice"
                      checked={confirmations.noAdvice}
                      onCheckedChange={() => handleConfirmationChange("noAdvice")}
                    />
                    <Label htmlFor="noAdvice" className="text-sm leading-relaxed cursor-pointer">
                      Mir ist bewusst, dass die Angelus KG <strong>keine Anlageberatung</strong> erbringt und die 
                      bereitgestellten Informationen keine Empfehlung darstellen.
                    </Label>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Legal Framework */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Rechtlicher Rahmen
                </h4>
                
                <div className="space-y-3 pl-6">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="swissLaw"
                      checked={confirmations.swissLaw}
                      onCheckedChange={() => handleConfirmationChange("swissLaw")}
                    />
                    <Label htmlFor="swissLaw" className="text-sm leading-relaxed cursor-pointer">
                      Ich akzeptiere, dass diese Anleihe dem <strong>Schweizer Recht</strong> unterliegt und 
                      Streitigkeiten nach Schweizer Recht beurteilt werden.
                    </Label>
                  </div>

                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="arbitration"
                      checked={confirmations.arbitration}
                      onCheckedChange={() => handleConfirmationChange("arbitration")}
                    />
                    <Label htmlFor="arbitration" className="text-sm leading-relaxed cursor-pointer">
                      Ich akzeptiere die <strong>Schiedsgerichtsvereinbarung</strong>. Alle Streitigkeiten werden 
                      durch ein Schiedsgericht nach den Regeln der Schweizerischen Handelskammer entschieden.
                    </Label>
                  </div>

                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="dataProcessing"
                      checked={confirmations.dataProcessing}
                      onCheckedChange={() => handleConfirmationChange("dataProcessing")}
                    />
                    <Label htmlFor="dataProcessing" className="text-sm leading-relaxed cursor-pointer">
                      Ich stimme der <strong>Verarbeitung meiner Daten</strong> gemäß der Datenschutzerklärung zu, 
                      einschließlich der Weitergabe an Dienstleister für KYC/AML-Prüfungen.
                    </Label>
                  </div>
                </div>
              </div>

              {/* Progress indicator */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex justify-between text-sm mb-2">
                  <span>Zustimmungen & Bestätigungen</span>
                  <span>
                    {Object.values(confirmations).filter(Boolean).length + Object.values(requiredConsents).filter(Boolean).length} / 
                    {Object.keys(confirmations).length + Object.keys(requiredConsents).length}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ 
                      width: `${((Object.values(confirmations).filter(Boolean).length + Object.values(requiredConsents).filter(Boolean).length) / (Object.keys(confirmations).length + Object.keys(requiredConsents).length)) * 100}%` 
                    }}
                  />
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Zurück
                </Button>
                <Button 
                  onClick={() => setStep(3)} 
                  disabled={!allConfirmationsChecked || !allConsentsChecked}
                  className="gap-2"
                >
                  Weiter
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Summary & Submit */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary" />
                Zusammenfassung & Abschluss
              </CardTitle>
              <CardDescription>
                Bitte überprüfen Sie Ihre Zeichnung vor dem Abschluss.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary */}
              <div className="p-6 bg-muted/50 rounded-lg space-y-4">
                <h4 className="font-semibold">Zeichnungsdetails</h4>
                <div className="grid gap-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Anleihe:</span>
                    <span className="font-medium">{bond.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ISIN:</span>
                    <span className="font-medium">{bond.isin || "—"}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Zeichnungsbetrag:</span>
                    <span className="font-semibold text-lg">€{parsedAmount.toLocaleString("de-DE", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Zinssatz:</span>
                    <span className="font-medium text-primary">{bond.interestRate}% p.a.</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Laufzeit:</span>
                    <span className="font-medium">{bond.termMonths} Monate</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Zinszahlung:</span>
                    <span className="font-medium">Gemäß Anleihebedingungen</span>
                  </div>
                </div>
              </div>

              {/* Confirmation Summary */}
              <div className="p-4 border border-green-200 bg-green-50/50 rounded-lg">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Alle erforderlichen Bestätigungen erteilt</span>
                </div>
                <p className="text-sm text-green-700 mt-2">
                  Ihre Bestätigungen werden mit Zeitstempel und IP-Adresse protokolliert.
                </p>
              </div>

              {/* Legal Notice */}
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertTitle>Hinweis zur Bearbeitung</AlertTitle>
                <AlertDescription>
                  Nach Absenden Ihrer Zeichnung wird diese von unserem Team geprüft. 
                  Sie erhalten eine Bestätigung per E-Mail. Die Abbuchung erfolgt nach Bestätigung 
                  von Ihrem Wallet-Guthaben.
                </AlertDescription>
              </Alert>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Zurück
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={!canSubmit || subscribe.isPending}
                  className="gap-2 bg-primary"
                >
                  {subscribe.isPending ? (
                    <>Wird eingereicht...</>
                  ) : (
                    <>
                      Zeichnung verbindlich abschließen
                      <CheckCircle className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
