import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "wouter";
import { ChevronRight, FileText, AlertTriangle } from "lucide-react";

function fmt(v: unknown, decimals = 2): string {
  const n = parseFloat(String(v ?? "0"));
  return isNaN(n) ? "0,00" : n.toLocaleString("de-DE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function statusBadge(status: string) {
  if (status === "active") return <Badge className="bg-green-100 text-green-800">Aktiv</Badge>;
  if (status === "completed") return <Badge className="bg-blue-100 text-blue-800">Abgeschlossen</Badge>;
  return <Badge variant="outline">Storniert</Badge>;
}

export default function Bestandskunden() {
  const { data: contracts = [], isLoading } = trpc.legacyContracts.list.useQuery();

  const grouped = contracts.reduce<Record<number, typeof contracts>>((acc, c) => {
    const uid = c.userId;
    if (!acc[uid]) acc[uid] = [];
    acc[uid].push(c);
    return acc;
  }, {});

  return (
    <DashboardLayout variant="admin">
      <div className="space-y-6 max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Bestandsverträge</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Übersicht aller Bestandskunden mit laufenden oder abgeschlossenen Verträgen.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Alle Verträge ({contracts.length})</CardTitle>
            <CardDescription>Klicken Sie auf einen Investor, um Vertrag, Einzahlungen und Berechnungen zu verwalten.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}
              </div>
            ) : contracts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Noch keine Bestandsverträge erfasst.</p>
                <p className="text-xs mt-1">Öffnen Sie einen Investor und legen Sie einen Vertrag an.</p>
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Investor</TableHead>
                      <TableHead className="text-right">Gezeichnet</TableHead>
                      <TableHead className="text-right">Eingezahlt</TableHead>
                      <TableHead className="text-right">Fehlbetrag</TableHead>
                      <TableHead>Zinssatz</TableHead>
                      <TableHead>Laufzeit</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contracts.map((c: any) => {
                      const signed = parseFloat(c.signedAmount ?? "0");
                      const paid = parseFloat(c.paidAmount ?? "0");
                      const shortfall = Math.max(0, signed - paid);
                      return (
                        <TableRow key={c.id}>
                          <TableCell>
                            <p className="font-medium">{c.user?.name ?? `User #${c.userId}`}</p>
                            <p className="text-xs text-muted-foreground">{c.user?.email ?? ""}</p>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {fmt(c.signedAmount)} {c.currency}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {fmt(c.paidAmount)} {c.currency}
                          </TableCell>
                          <TableCell className="text-right">
                            {shortfall > 0 ? (
                              <span className="flex items-center justify-end gap-1 text-orange-600 font-mono text-sm">
                                <AlertTriangle className="w-3 h-3" />
                                {fmt(shortfall)}
                              </span>
                            ) : (
                              <span className="text-green-600 text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">{fmt(c.interestRate, 2)} %</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {c.startDate ? new Date(c.startDate).toLocaleDateString("de-DE") : "—"}
                            {" – "}
                            {c.endDate ? new Date(c.endDate).toLocaleDateString("de-DE") : "—"}
                          </TableCell>
                          <TableCell>{statusBadge(c.status)}</TableCell>
                          <TableCell>
                            <Link href={`/admin/bestandskunden/${c.userId}`}>
                              <Button variant="ghost" size="sm">
                                <ChevronRight className="w-4 h-4" />
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
