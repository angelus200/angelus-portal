import DashboardLayout from "@/components/DashboardLayout";
import { useIsBestandskunde } from "@/hooks/useIsBestandskunde";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Shield, CheckCircle, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function RiskProfile() {
  const { data: existingProfile, isLoading, refetch } = trpc.riskProfile.my.useQuery();
  const { isBestandskunde, isLoading: bkLoading } = useIsBestandskunde();
  
  const submitProfile = trpc.riskProfile.submit.useMutation({
    onSuccess: (data) => {
      toast.success(`Risikoprofil erstellt: ${
        data.category === "risk_seeking" ? "Risikoaffin" :
        data.category === "moderate" ? "Moderat" : "Konservativ"
      }`);
      refetch();
    },
    onError: (error) => {
      toast.error("Fehler: " + error.message);
    },
  });

  // Questionnaire state
  const [investmentExperience, setInvestmentExperience] = useState("");
  const [riskTolerance, setRiskTolerance] = useState("");
  const [investmentHorizon, setInvestmentHorizon] = useState("");
  const [financialKnowledge, setFinancialKnowledge] = useState("");
  const [lossCapacity, setLossCapacity] = useState("");

  // Compliance checkboxes
  const [riskWarningConfirmed, setRiskWarningConfirmed] = useState(false);
  const [professionalInvestorConfirmed, setProfessionalInvestorConfirmed] = useState(false);
  const [selfResponsibilityConfirmed, setSelfResponsibilityConfirmed] = useState(false);
  const [liquidityWaiverConfirmed, setLiquidityWaiverConfirmed] = useState(false);

  const allQuestionsAnswered = investmentExperience && riskTolerance && investmentHorizon && financialKnowledge && lossCapacity;
  const allCheckboxesChecked = riskWarningConfirmed && professionalInvestorConfirmed && selfResponsibilityConfirmed && liquidityWaiverConfirmed;

  const handleSubmit = async () => {
    if (!allQuestionsAnswered || !allCheckboxesChecked) return;

    await submitProfile.mutateAsync({
      questionnaireAnswers: {
        investmentExperience,
        riskTolerance,
        investmentHorizon,
        financialKnowledge,
        lossCapacity,
      },
      riskWarningConfirmed,
      professionalInvestorConfirmed,
      selfResponsibilityConfirmed,
      liquidityWaiverConfirmed,
      ipAddress: "0.0.0.0", // Would be captured server-side
    });
  };

  if (isLoading || bkLoading) {
    return (
      <DashboardLayout variant="investor">
        <div className="max-w-3xl mx-auto">
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
        </div>
      </DashboardLayout>
    );
  }

  // Bestandskunde: Risikoprofil stammt aus dem Zeichnungsschein — kein Formular, neutraler Hinweis.
  if (isBestandskunde) {
    return (
      <DashboardLayout variant="investor">
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Risikoprofil</h1>
          </div>
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Keine Eingabe erforderlich</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Ihr Risikoprofil wurde aus Ihrem Zeichnungsschein übernommen — keine Eingabe erforderlich.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Show existing profile
  if (existingProfile) {
    return (
      <DashboardLayout variant="investor">
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Risikoprofil</h1>
            <p className="text-muted-foreground">
              Ihr aktuelles Risikoprofil
            </p>
          </div>

          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-green-800">Profil abgeschlossen</h3>
                  <p className="text-green-700">
                    Risikokategorie: <strong>
                      {existingProfile.category === "risk_seeking" ? "Risikoaffin" :
                       existingProfile.category === "moderate" ? "Moderat" : "Konservativ"}
                    </strong>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bestätigte Hinweise</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {existingProfile.riskWarningConfirmed && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Risikohinweise bestätigt</span>
                </div>
              )}
              {existingProfile.professionalInvestorConfirmed && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Professioneller Investor / Unternehmer bestätigt</span>
                </div>
              )}
              {existingProfile.selfResponsibilityConfirmed && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Eigenverantwortung bestätigt</span>
                </div>
              )}
              {existingProfile.liquidityWaiverConfirmed && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Liquiditätsverzicht bestätigt</span>
                </div>
              )}
              {existingProfile.consentTimestamp && (
                <p className="text-xs text-muted-foreground mt-4">
                  Bestätigt am: {new Date(existingProfile.consentTimestamp).toLocaleString("de-DE")}
                </p>
              )}
            </CardContent>
          </Card>

          <Button 
            variant="outline" 
            onClick={() => {
              // Reset to allow re-submission
              // In production, you might want to add a confirmation dialog
              toast.info("Kontaktieren Sie uns, um Ihr Profil zu aktualisieren.");
            }}
          >
            Profil aktualisieren
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout variant="investor">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Risikoprofil erstellen</h1>
          <p className="text-muted-foreground">
            Beantworten Sie die folgenden Fragen, um Ihr Risikoprofil zu erstellen.
          </p>
        </div>

        {/* Info Box */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Warum ist das wichtig?</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Die Risikoprofilierung hilft uns sicherzustellen, dass die angebotenen Anleihen 
                  zu Ihrer Anlageerfahrung und Risikobereitschaft passen. Dies ist eine regulatorische 
                  Anforderung zum Schutz von Investoren.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Questionnaire */}
        <Card>
          <CardHeader>
            <CardTitle>Anlegerprofil-Fragebogen</CardTitle>
            <CardDescription>
              Bitte beantworten Sie alle Fragen wahrheitsgemäß.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Question 1 */}
            <div className="space-y-3">
              <Label className="text-base font-medium">
                1. Wie würden Sie Ihre Erfahrung mit Kapitalanlagen beschreiben?
              </Label>
              <RadioGroup value={investmentExperience} onValueChange={setInvestmentExperience}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="none" id="exp-none" />
                  <Label htmlFor="exp-none" className="font-normal cursor-pointer">Keine Erfahrung</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="basic" id="exp-basic" />
                  <Label htmlFor="exp-basic" className="font-normal cursor-pointer">Grundlegende Erfahrung (Aktien, Fonds)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="moderate" id="exp-moderate" />
                  <Label htmlFor="exp-moderate" className="font-normal cursor-pointer">Fortgeschrittene Erfahrung (inkl. Anleihen, Derivate)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="extensive" id="exp-extensive" />
                  <Label htmlFor="exp-extensive" className="font-normal cursor-pointer">Umfangreiche Erfahrung (professioneller Investor)</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Question 2 */}
            <div className="space-y-3">
              <Label className="text-base font-medium">
                2. Wie hoch ist Ihre Risikobereitschaft?
              </Label>
              <RadioGroup value={riskTolerance} onValueChange={setRiskTolerance}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="low" id="risk-low" />
                  <Label htmlFor="risk-low" className="font-normal cursor-pointer">Niedrig - Kapitalerhalt hat Priorität</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="medium" id="risk-medium" />
                  <Label htmlFor="risk-medium" className="font-normal cursor-pointer">Mittel - Ausgewogenes Verhältnis von Risiko und Rendite</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="high" id="risk-high" />
                  <Label htmlFor="risk-high" className="font-normal cursor-pointer">Hoch - Bereit für höhere Risiken für höhere Renditen</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Question 3 */}
            <div className="space-y-3">
              <Label className="text-base font-medium">
                3. Wie lange planen Sie, Ihr Kapital anzulegen?
              </Label>
              <RadioGroup value={investmentHorizon} onValueChange={setInvestmentHorizon}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="short" id="horizon-short" />
                  <Label htmlFor="horizon-short" className="font-normal cursor-pointer">Kurzfristig (unter 2 Jahre)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="medium" id="horizon-medium" />
                  <Label htmlFor="horizon-medium" className="font-normal cursor-pointer">Mittelfristig (2-5 Jahre)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="long" id="horizon-long" />
                  <Label htmlFor="horizon-long" className="font-normal cursor-pointer">Langfristig (über 5 Jahre)</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Question 4 */}
            <div className="space-y-3">
              <Label className="text-base font-medium">
                4. Wie schätzen Sie Ihre Kenntnisse über nachrangige Schuldverschreibungen ein?
              </Label>
              <RadioGroup value={financialKnowledge} onValueChange={setFinancialKnowledge}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="none" id="know-none" />
                  <Label htmlFor="know-none" className="font-normal cursor-pointer">Keine Kenntnisse</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="basic" id="know-basic" />
                  <Label htmlFor="know-basic" className="font-normal cursor-pointer">Grundlegende Kenntnisse</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="good" id="know-good" />
                  <Label htmlFor="know-good" className="font-normal cursor-pointer">Gute Kenntnisse</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="expert" id="know-expert" />
                  <Label htmlFor="know-expert" className="font-normal cursor-pointer">Expertenkenntnisse</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Question 5 */}
            <div className="space-y-3">
              <Label className="text-base font-medium">
                5. Könnten Sie einen Totalverlust des investierten Kapitals finanziell verkraften?
              </Label>
              <RadioGroup value={lossCapacity} onValueChange={setLossCapacity}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="loss-no" />
                  <Label htmlFor="loss-no" className="font-normal cursor-pointer">Nein, das wäre existenzbedrohend</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="partial" id="loss-partial" />
                  <Label htmlFor="loss-partial" className="font-normal cursor-pointer">Teilweise, es würde meine Lebensplanung beeinträchtigen</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="loss-yes" />
                  <Label htmlFor="loss-yes" className="font-normal cursor-pointer">Ja, ich investiere nur frei verfügbares Kapital</Label>
                </div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        {/* Compliance Checkboxes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-primary" />
              Pflichtbestätigungen
            </CardTitle>
            <CardDescription>
              Bitte lesen und bestätigen Sie die folgenden Hinweise.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Checkbox 
                id="risk-warning" 
                checked={riskWarningConfirmed}
                onCheckedChange={(checked) => setRiskWarningConfirmed(checked === true)}
              />
              <Label htmlFor="risk-warning" className="text-sm leading-relaxed cursor-pointer">
                <strong>Risikohinweis:</strong> Ich bin mir bewusst, dass die angebotenen Anleihen mit erheblichen 
                Risiken verbunden sind, einschließlich des <strong>vollständigen Verlustes des eingesetzten Kapitals</strong>. 
                Es besteht keine Garantie für Zinszahlungen oder Rückzahlung.
              </Label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox 
                id="professional" 
                checked={professionalInvestorConfirmed}
                onCheckedChange={(checked) => setProfessionalInvestorConfirmed(checked === true)}
              />
              <Label htmlFor="professional" className="text-sm leading-relaxed cursor-pointer">
                <strong>Qualifizierter Investor:</strong> Ich bestätige, dass ich <strong>kein Verbraucher</strong> im 
                Sinne des Verbraucherschutzrechts bin. Ich handle als professioneller Investor, Unternehmer oder 
                im Rahmen meiner gewerblichen Tätigkeit.
              </Label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox 
                id="self-responsibility" 
                checked={selfResponsibilityConfirmed}
                onCheckedChange={(checked) => setSelfResponsibilityConfirmed(checked === true)}
              />
              <Label htmlFor="self-responsibility" className="text-sm leading-relaxed cursor-pointer">
                <strong>Eigenverantwortung:</strong> Ich treffe meine Anlageentscheidungen eigenverantwortlich und 
                auf Basis eigener Recherche. Ich verstehe, dass keine Anlageberatung erfolgt.
              </Label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox 
                id="liquidity" 
                checked={liquidityWaiverConfirmed}
                onCheckedChange={(checked) => setLiquidityWaiverConfirmed(checked === true)}
              />
              <Label htmlFor="liquidity" className="text-sm leading-relaxed cursor-pointer">
                <strong>Liquiditätsverzicht:</strong> Ich verstehe, dass die Anleihen nicht an einer Börse gehandelt 
                werden und eine vorzeitige Veräußerung möglicherweise nicht oder nur mit erheblichen Verlusten möglich ist.
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Button 
            size="lg"
            onClick={handleSubmit}
            disabled={!allQuestionsAnswered || !allCheckboxesChecked || submitProfile.isPending}
          >
            {submitProfile.isPending ? "Wird verarbeitet..." : "Risikoprofil erstellen"}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
