import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Wallet, ArrowUpRight, CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminWallets() {
  const { data: pendingWithdrawals, isLoading: withdrawalsLoading, refetch: refetchWithdrawals } = trpc.wallet.pendingWithdrawals.useQuery();
  
  const approveWithdrawal = trpc.wallet.approveWithdrawal.useMutation({
    onSuccess: () => {
      toast.success("Auszahlung genehmigt");
      refetchWithdrawals();
      setSelectedWithdrawal(null);
    },
    onError: (error) => {
      toast.error("Fehler: " + error.message);
    },
  });

  const [selectedWithdrawal, setSelectedWithdrawal] = useState<{
    id: number;
    userId: number;
    amount: string;
    currency: string;
    externalAddress?: string | null;
  } | null>(null);

  const handleApproveWithdrawal = async () => {
    if (!selectedWithdrawal) return;
    await approveWithdrawal.mutateAsync({
      id: selectedWithdrawal.id,
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
      pending: { label: "Ausstehend", className: "bg-yellow-100 text-yellow-800", icon: <Clock className="w-3 h-3" /> },
      processing: { label: "In Bearbeitung", className: "bg-blue-100 text-blue-800", icon: <Clock className="w-3 h-3" /> },
      completed: { label: "Abgeschlossen", className: "bg-green-100 text-green-800", icon: <CheckCircle className="w-3 h-3" /> },
      failed: { label: "Fehlgeschlagen", className: "bg-red-100 text-red-800", icon: <XCircle className="w-3 h-3" /> },
    };
    const variant = variants[status] || variants.pending;
    return (
      <Badge className={`${variant.className} gap-1`}>
        {variant.icon}
        {variant.label}
      </Badge>
    );
  };

  return (
    <DashboardLayout variant="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Wallet-Verwaltung</h1>
            <p className="text-muted-foreground">
              Verwalten Sie Auszahlungsanträge
            </p>
          </div>
        </div>

        <Tabs defaultValue="withdrawals" className="space-y-4">
          <TabsList>
            <TabsTrigger value="withdrawals" className="gap-2">
              <ArrowUpRight className="w-4 h-4" />
              Auszahlungen
              {pendingWithdrawals && pendingWithdrawals.length > 0 && (
                <Badge className="ml-1 bg-yellow-500 text-white">{pendingWithdrawals.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="withdrawals">
            <Card>
              <CardHeader>
                <CardTitle>Ausstehende Auszahlungen</CardTitle>
              </CardHeader>
              <CardContent>
                {withdrawalsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : pendingWithdrawals && pendingWithdrawals.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Benutzer</TableHead>
                        <TableHead>Betrag</TableHead>
                        <TableHead>Währung</TableHead>
                        <TableHead>Zieladresse</TableHead>
                        <TableHead>Datum</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Aktionen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingWithdrawals.map((withdrawal) => (
                        <TableRow key={withdrawal.id}>
                          <TableCell>#{withdrawal.id}</TableCell>
                          <TableCell>User #{withdrawal.userId}</TableCell>
                          <TableCell className="font-semibold">
                            {parseFloat(withdrawal.amount).toLocaleString("de-DE")}
                          </TableCell>
                          <TableCell>{withdrawal.currency}</TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {withdrawal.externalAddress || "-"}
                          </TableCell>
                          <TableCell>
                            {format(new Date(withdrawal.createdAt), "dd.MM.yyyy HH:mm", { locale: de })}
                          </TableCell>
                          <TableCell>{getStatusBadge(withdrawal.status)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedWithdrawal({
                                id: withdrawal.id,
                                userId: withdrawal.userId,
                                amount: withdrawal.amount,
                                currency: withdrawal.currency,
                                externalAddress: withdrawal.externalAddress,
                              })}
                            >
                              Bearbeiten
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">Keine ausstehenden Auszahlungen</h3>
                    <p className="text-muted-foreground">
                      Alle Auszahlungsanträge wurden bearbeitet.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Process Withdrawal Dialog */}
        <Dialog open={!!selectedWithdrawal} onOpenChange={() => setSelectedWithdrawal(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Auszahlung bearbeiten</DialogTitle>
              <DialogDescription>
                Prüfen und verarbeiten Sie den Auszahlungsantrag.
              </DialogDescription>
            </DialogHeader>
            {selectedWithdrawal && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Benutzer</Label>
                    <p className="font-medium">User #{selectedWithdrawal.userId}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Betrag</Label>
                    <p className="font-medium text-lg">
                      {parseFloat(selectedWithdrawal.amount).toLocaleString("de-DE")} {selectedWithdrawal.currency}
                    </p>
                  </div>
                </div>
                {selectedWithdrawal.externalAddress && (
                  <div>
                    <Label className="text-muted-foreground">Zieladresse</Label>
                    <p className="font-mono text-sm bg-muted p-2 rounded break-all">
                      {selectedWithdrawal.externalAddress}
                    </p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setSelectedWithdrawal(null)}
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleApproveWithdrawal}
                disabled={approveWithdrawal.isPending}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Genehmigen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
