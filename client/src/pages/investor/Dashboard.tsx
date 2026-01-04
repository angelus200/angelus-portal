import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { 
  Wallet, 
  TrendingUp, 
  Calendar, 
  FileText,
  ArrowRight,
  AlertCircle
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export default function InvestorDashboard() {
  const { user } = useAuth();
  const { data: wallets, isLoading: walletsLoading } = trpc.wallet.myWallets.useQuery();
  const { data: subscriptions, isLoading: subscriptionsLoading } = trpc.subscriptions.mySubscriptions.useQuery();
  const { data: upcomingPayments, isLoading: paymentsLoading } = trpc.payments.upcoming.useQuery();
  const { data: riskProfile } = trpc.riskProfile.my.useQuery();
  const { data: news } = trpc.news.published.useQuery();

  const totalBalance = wallets?.reduce((sum, w) => {
    if (w.currency === "EUR") {
      return sum + parseFloat(w.balance || "0");
    }
    return sum;
  }, 0) || 0;

  const totalInvested = subscriptions?.reduce((sum, s) => {
    if (s.status === "active" || s.status === "confirmed") {
      return sum + parseFloat(s.amount || "0");
    }
    return sum;
  }, 0) || 0;

  const needsOnboarding = user?.kycStatus !== "verified" || !riskProfile;

  return (
    <DashboardLayout variant="investor">
      <div className="space-y-6">
        {/* Onboarding Alert */}
        {needsOnboarding && (
          <Card className="border-primary bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-primary flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Onboarding abschließen</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {user?.kycStatus !== "verified" 
                      ? "Bitte vervollständigen Sie Ihre KYC-Verifizierung, um investieren zu können."
                      : "Bitte füllen Sie Ihr Risikoprofil aus, um investieren zu können."}
                  </p>
                  <Link href="/investor/onboarding">
                    <Button size="sm" className="gap-2">
                      Jetzt abschließen
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Wallet-Guthaben</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {walletsLoading ? "..." : `€${totalBalance.toLocaleString("de-DE", { minimumFractionDigits: 2 })}`}
              </div>
              <p className="text-xs text-muted-foreground">
                Verfügbares Guthaben
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Investiert</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {subscriptionsLoading ? "..." : `€${totalInvested.toLocaleString("de-DE", { minimumFractionDigits: 2 })}`}
              </div>
              <p className="text-xs text-muted-foreground">
                Aktive Investments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Beteiligungen</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {subscriptionsLoading ? "..." : subscriptions?.filter(s => s.status === "active").length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Aktive Zeichnungen
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Nächste Zahlung</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {paymentsLoading ? "..." : upcomingPayments?.[0] 
                  ? format(new Date(upcomingPayments[0].dueDate), "dd.MM.yy", { locale: de })
                  : "—"}
              </div>
              <p className="text-xs text-muted-foreground">
                {upcomingPayments?.[0] 
                  ? `€${parseFloat(upcomingPayments[0].amount).toLocaleString("de-DE", { minimumFractionDigits: 2 })}`
                  : "Keine anstehenden Zahlungen"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Upcoming Payments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Anstehende Zahlungen</span>
                <Link href="/investor/investments">
                  <Button variant="ghost" size="sm">Alle anzeigen</Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {paymentsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : upcomingPayments && upcomingPayments.length > 0 ? (
                <div className="space-y-3">
                  {upcomingPayments.slice(0, 5).map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">
                          {payment.type === "interest" ? "Zinszahlung" : payment.type === "principal" ? "Rückzahlung" : "Zahlung"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(payment.dueDate), "dd. MMMM yyyy", { locale: de })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-primary">
                          €{parseFloat(payment.amount).toLocaleString("de-DE", { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-muted-foreground">{payment.currency}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Keine anstehenden Zahlungen
                </p>
              )}
            </CardContent>
          </Card>

          {/* News */}
          <Card>
            <CardHeader>
              <CardTitle>Neuigkeiten</CardTitle>
            </CardHeader>
            <CardContent>
              {news && news.length > 0 ? (
                <div className="space-y-4">
                  {news.slice(0, 3).map((item) => (
                    <div key={item.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                      <h4 className="font-medium mb-1">{item.title}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {item.excerpt || item.content.substring(0, 150)}...
                      </p>
                      {item.publishedAt && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(item.publishedAt), "dd.MM.yyyy", { locale: de })}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Keine Neuigkeiten verfügbar
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Schnellzugriff</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <Link href="/investor/investments">
                <Button variant="outline" className="w-full justify-start gap-2 h-auto py-4">
                  <TrendingUp className="w-5 h-5" />
                  <div className="text-left">
                    <p className="font-medium">Angebote ansehen</p>
                    <p className="text-xs text-muted-foreground">Verfügbare Investments</p>
                  </div>
                </Button>
              </Link>
              <Link href="/investor/wallet">
                <Button variant="outline" className="w-full justify-start gap-2 h-auto py-4">
                  <Wallet className="w-5 h-5" />
                  <div className="text-left">
                    <p className="font-medium">Wallet verwalten</p>
                    <p className="text-xs text-muted-foreground">Ein- und Auszahlungen</p>
                  </div>
                </Button>
              </Link>
              <Link href="/investor/risk-profile">
                <Button variant="outline" className="w-full justify-start gap-2 h-auto py-4">
                  <FileText className="w-5 h-5" />
                  <div className="text-left">
                    <p className="font-medium">Risikoprofil</p>
                    <p className="text-xs text-muted-foreground">Profil aktualisieren</p>
                  </div>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
