import { useAuth } from "@/_core/hooks/useAuth";
import { useIsBestandskunde } from "@/hooks/useIsBestandskunde";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { CheckCircle, Circle, AlertCircle, ExternalLink } from "lucide-react";
import { Link } from "wouter";

export default function InvestorOnboarding() {
  const { user } = useAuth();
  const { data: riskProfile } = trpc.riskProfile.my.useQuery();
  const { isBestandskunde, isLoading: bkLoading } = useIsBestandskunde();

  const steps = [
    {
      id: 1,
      title: "Profil vervollständigen",
      description: "Grundlegende Informationen zu Ihrer Person",
      completed: !!user?.name && !!user?.email,
      href: "/investor/risk-profile",
    },
    {
      id: 2,
      title: "KYC-Verifizierung",
      description: "Identitätsprüfung gemäß regulatorischen Anforderungen",
      completed: user?.kycStatus === "verified",
      inProgress: user?.kycStatus === "in_progress",
      href: "#kyc",
    },
    {
      id: 3,
      title: "Risikoprofil erstellen",
      description: "Bewertung Ihrer Anlageerfahrung und Risikobereitschaft",
      completed: !!riskProfile,
      href: "/investor/risk-profile",
    },
    {
      id: 4,
      title: "Compliance-Bestätigungen",
      description: "Bestätigung der Risikohinweise und Anlegerqualifikation",
      completed: riskProfile?.riskWarningConfirmed && riskProfile?.professionalInvestorConfirmed,
      href: "/investor/risk-profile",
    },
  ];

  const completedSteps = steps.filter(s => s.completed).length;
  const progress = (completedSteps / steps.length) * 100;

  // Bestandskunde: kein Onboarding nötig — Risikoprofil kommt aus dem Zeichnungsschein.
  if (bkLoading) {
    return (
      <DashboardLayout variant="investor">
        <div className="max-w-3xl mx-auto">
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
        </div>
      </DashboardLayout>
    );
  }
  if (isBestandskunde) {
    return (
      <DashboardLayout variant="investor">
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Onboarding</h1>
          </div>
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Kein Onboarding erforderlich</p>
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

  return (
    <DashboardLayout variant="investor">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Onboarding</h1>
          <p className="text-muted-foreground">
            Vervollständigen Sie die folgenden Schritte, um Anleihen zeichnen zu können.
          </p>
        </div>

        {/* Progress */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Fortschritt</span>
              <span className="text-sm text-muted-foreground">{completedSteps} von {steps.length} abgeschlossen</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Steps */}
        <div className="space-y-4">
          {steps.map((step, index) => (
            <Card key={step.id} className={step.completed ? "border-green-200 bg-green-50/30" : ""}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {step.completed ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : step.inProgress ? (
                      <AlertCircle className="w-6 h-6 text-yellow-600" />
                    ) : (
                      <Circle className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">
                          Schritt {step.id}: {step.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {step.description}
                        </p>
                      </div>
                      {!step.completed && (
                        step.id === 2 ? (
                          <Button 
                            variant={step.inProgress ? "outline" : "default"}
                            size="sm"
                            onClick={() => {
                              // KYC integration placeholder - would open Sumsub widget
                              alert("KYC-Verifizierung wird in Kürze verfügbar sein. (Sumsub Integration)");
                            }}
                          >
                            {step.inProgress ? "Status prüfen" : "Starten"}
                            <ExternalLink className="w-4 h-4 ml-2" />
                          </Button>
                        ) : (
                          <Link href={step.href}>
                            <Button variant="default" size="sm">
                              {index === 0 || steps[index - 1]?.completed ? "Fortfahren" : "Ausstehend"}
                            </Button>
                          </Link>
                        )
                      )}
                    </div>
                    
                    {/* KYC Status Details */}
                    {step.id === 2 && (
                      <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium">KYC-Status:</span>
                          <span className={`text-sm px-2 py-0.5 rounded ${
                            user?.kycStatus === "verified" ? "bg-green-100 text-green-800" :
                            user?.kycStatus === "in_progress" ? "bg-yellow-100 text-yellow-800" :
                            user?.kycStatus === "rejected" ? "bg-red-100 text-red-800" :
                            "bg-gray-100 text-gray-800"
                          }`}>
                            {user?.kycStatus === "verified" ? "Verifiziert" :
                             user?.kycStatus === "in_progress" ? "In Bearbeitung" :
                             user?.kycStatus === "rejected" ? "Abgelehnt" :
                             "Ausstehend"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Die KYC-Verifizierung erfolgt über unseren Partner Sumsub und umfasst 
                          die Überprüfung Ihrer Identität gemäß den regulatorischen Anforderungen.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Info Box */}
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg">Wichtiger Hinweis</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Dieses Portal richtet sich ausschließlich an <strong>professionelle Investoren und Unternehmer</strong>. 
              Privatanleger (Verbraucher) sind von der Nutzung ausgeschlossen. Die Mindestzeichnungssumme beträgt 100.000 €.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Mit der Vervollständigung des Onboardings bestätigen Sie, dass Sie kein Verbraucher im Sinne 
              des Verbraucherschutzrechts sind und über ausreichende Erfahrung mit komplexen Finanzprodukten verfügen.
            </p>
          </CardContent>
        </Card>

        {completedSteps === steps.length && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div>
                  <h3 className="font-semibold text-green-800">Onboarding abgeschlossen!</h3>
                  <p className="text-sm text-green-700">
                    Sie können jetzt Anleihen zeichnen.
                  </p>
                </div>
                <Link href="/investor/investments" className="ml-auto">
                  <Button>Anleihen ansehen</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
