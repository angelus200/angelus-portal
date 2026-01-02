import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { TrendingUp, Calendar, ArrowRight, FileText } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export default function MyInvestments() {
  const { data: subscriptions, isLoading: subscriptionsLoading } = trpc.subscriptions.mySubscriptions.useQuery();
  const { data: bonds, isLoading: bondsLoading } = trpc.bonds.list.useQuery();

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      pending: { label: "Ausstehend", className: "bg-yellow-100 text-yellow-800" },
      confirmed: { label: "Bestätigt", className: "bg-blue-100 text-blue-800" },
      active: { label: "Aktiv", className: "bg-green-100 text-green-800" },
      completed: { label: "Abgeschlossen", className: "bg-gray-100 text-gray-800" },
      cancelled: { label: "Storniert", className: "bg-red-100 text-red-800" },
    };
    const variant = variants[status] || variants.pending;
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  return (
    <DashboardLayout variant="investor">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Meine Investments</h1>
            <p className="text-muted-foreground">
              Übersicht Ihrer gezeichneten Anleihen
            </p>
          </div>
        </div>

        {/* My Subscriptions */}
        <Card>
          <CardHeader>
            <CardTitle>Meine Zeichnungen</CardTitle>
          </CardHeader>
          <CardContent>
            {subscriptionsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : subscriptions && subscriptions.length > 0 ? (
              <div className="space-y-4">
                {subscriptions.map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Anleihe #{sub.bondId}</p>
                        <p className="text-sm text-muted-foreground">
                          Gezeichnet am {format(new Date(sub.createdAt), "dd.MM.yyyy", { locale: de })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="font-semibold">
                          €{parseFloat(sub.amount).toLocaleString("de-DE", { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-muted-foreground">{sub.currency}</p>
                      </div>
                      {getStatusBadge(sub.status)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Keine Zeichnungen vorhanden</h3>
                <p className="text-muted-foreground mb-4">
                  Sie haben noch keine Anleihen gezeichnet.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Available Bonds */}
        <Card>
          <CardHeader>
            <CardTitle>Verfügbare Anleihen</CardTitle>
          </CardHeader>
          <CardContent>
            {bondsLoading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[1, 2].map(i => (
                  <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : bonds && bonds.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {bonds.map((bond) => (
                  <Card key={bond.id} className="border-border hover:border-primary/50 transition-colors">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold">{bond.name}</h3>
                          {bond.isin && (
                            <p className="text-xs text-muted-foreground">ISIN: {bond.isin}</p>
                          )}
                        </div>
                        <Badge className={
                          bond.riskCategory === "high" ? "bg-red-100 text-red-800" :
                          bond.riskCategory === "medium" ? "bg-yellow-100 text-yellow-800" :
                          "bg-green-100 text-green-800"
                        }>
                          {bond.riskCategory === "high" ? "Hohes Risiko" :
                           bond.riskCategory === "medium" ? "Mittleres Risiko" :
                           "Niedriges Risiko"}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Zinssatz</p>
                          <p className="font-semibold text-primary">{bond.interestRate}% p.a.</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Laufzeit</p>
                          <p className="font-semibold">{bond.termMonths} Monate</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Mindestzeichnung</p>
                          <p className="font-semibold">€{parseFloat(bond.minSubscription).toLocaleString("de-DE")}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Verfügbar</p>
                          <p className="font-semibold">€{parseFloat(bond.availableVolume).toLocaleString("de-DE")}</p>
                        </div>
                      </div>
                      
                      <Link href={`/investor/bond/${bond.id}`}>
                        <Button className="w-full gap-2">
                          Details ansehen
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Keine Anleihen verfügbar</h3>
                <p className="text-muted-foreground">
                  Derzeit sind keine Anleihen zur Zeichnung verfügbar.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
