import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, AlertTriangle, FileText, Calendar, Percent, Shield, Building2 } from "lucide-react";
import { Link, useParams } from "wouter";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";
import { useIsBestandskunde } from "@/hooks/useIsBestandskunde";

export default function BondDetails() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const bondId = parseInt(id || "0");

  const utils = trpc.useUtils();
  const { data: bond, isLoading } = trpc.bonds.getById.useQuery({ id: bondId });
  const { data: riskProfile } = trpc.riskProfile.my.useQuery();
  const { isBestandskunde } = useIsBestandskunde();
  const { data: contracts } = trpc.contracts.byBond.useQuery({ bondId }, { enabled: !!bond });
  const { data: myAccess } = trpc.issuerAccess.mine.useQuery();

  const requestAccess = trpc.issuerAccess.request.useMutation({
    onSuccess: () => {
      toast.success("Anfrage gesendet — Sie werden freigeschaltet.");
      utils.issuerAccess.mine.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const bondIssuerKey = (bond as any)?.issuerKey || "angelus";
  const access = (myAccess || []).find(a => a.issuerKey === bondIssuerKey);

  const canSubscribe = user?.kycStatus === "verified" && riskProfile;
  const minAmount = parseFloat(bond?.minSubscription || "100000");

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
            {bond.issuer && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <Building2 className="w-3 h-3" />
                {bond.issuer}
              </p>
            )}
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

                {bond.issuer && (
                  <div className="mt-4 flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Building2 className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Emittent</p>
                      <p className="font-semibold">{bond.issuer}</p>
                    </div>
                  </div>
                )}
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
                {isBestandskunde ? (
                  <div className="p-4 bg-muted/40 border rounded-lg text-sm text-muted-foreground">
                    Sie sind Bestandskunde — Ihr Bestandsvertrag wird von Angelus verwaltet. Für neue Zeichnungen kontaktieren Sie uns bitte direkt.
                  </div>
                ) : !canSubscribe ? (
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
                    {access?.status === "approved" ? (
                      <Link href={`/investor/subscribe/${bond.id}`}>
                        <Button className="w-full" size="lg">
                          Jetzt zeichnen
                        </Button>
                      </Link>
                    ) : access?.status === "requested" ? (
                      <Button disabled className="w-full" size="lg">
                        Freischaltung angefragt — wird geprüft
                      </Button>
                    ) : access?.status === "blocked" ? (
                      <Button disabled variant="outline" className="w-full" size="lg">
                        Zeichnung für diesen Emittenten nicht verfügbar
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        size="lg"
                        disabled={requestAccess.isPending}
                        onClick={() => requestAccess.mutate({ issuerKey: bondIssuerKey })}
                      >
                        {requestAccess.isPending ? "Sende Anfrage…" : "Zugang anfragen"}
                      </Button>
                    )}
                    <p className="text-xs text-muted-foreground text-center">
                      Mindestzeichnung: €{minAmount.toLocaleString("de-DE")}
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
