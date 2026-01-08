import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Users, TrendingUp, FileText, AlertCircle, Wallet, Clock } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = trpc.admin.stats.useQuery();
  const { data: auditLogs, isLoading: logsLoading } = trpc.admin.auditLogs.useQuery({ limit: 10 });
  const { data: pendingWithdrawals } = trpc.wallet.pendingWithdrawals.useQuery();

  return (
    <DashboardLayout variant="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Übersicht und Verwaltung des Investorenportals
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Investoren</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? "..." : (stats?.totalInvestors || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Registrierte Anleger
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Beteiligungen</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? "..." : (stats?.totalBonds || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Aktive Angebote
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Zeichnungen</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? "..." : (stats?.totalSubscriptions || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Gesamte Zeichnungen
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">KYC ausstehend</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? "..." : (stats?.pendingKyc || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Offene Verifizierungen
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Pending Withdrawals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                Ausstehende Auszahlungen
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingWithdrawals && pendingWithdrawals.length > 0 ? (
                <div className="space-y-3">
                  {pendingWithdrawals.slice(0, 5).map((withdrawal) => (
                    <div key={withdrawal.id} className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div>
                        <p className="font-medium">User #{withdrawal.userId}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(withdrawal.createdAt), "dd.MM.yyyy HH:mm", { locale: de })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {parseFloat(withdrawal.amount).toLocaleString("de-DE")} {withdrawal.currency}
                        </p>
                        <p className="text-xs text-yellow-600">Ausstehend</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Keine ausstehenden Auszahlungen
                </p>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Letzte Aktivitäten
              </CardTitle>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : auditLogs && auditLogs.length > 0 ? (
                <div className="space-y-3">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 p-2 border-b last:border-0">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {log.action}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {log.userEmail || `User #${log.userId}`} • {format(new Date(log.createdAt), "dd.MM. HH:mm", { locale: de })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Keine Aktivitäten
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
            <div className="grid gap-4 md:grid-cols-4">
              <a href="/admin/bonds" className="p-4 border rounded-lg hover:bg-muted/50 transition-colors text-center">
                <TrendingUp className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="font-medium">Angebote verwalten</p>
              </a>
              <a href="/admin/investors" className="p-4 border rounded-lg hover:bg-muted/50 transition-colors text-center">
                <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="font-medium">Investoren</p>
              </a>
              <a href="/admin/wallets" className="p-4 border rounded-lg hover:bg-muted/50 transition-colors text-center">
                <Wallet className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="font-medium">Wallets</p>
              </a>
              <a href="/admin/news" className="p-4 border rounded-lg hover:bg-muted/50 transition-colors text-center">
                <FileText className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="font-medium">News erstellen</p>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
