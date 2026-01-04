import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, TrendingUp, TrendingDown, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";

export default function WalletManagement() {
  const [selectedWalletId, setSelectedWalletId] = useState<number | null>(null);
  const [newBalance, setNewBalance] = useState("");
  const [reason, setReason] = useState("");
  const [withdrawalReason, setWithdrawalReason] = useState("");
  const [selectedWithdrawalId, setSelectedWithdrawalId] = useState<number | null>(null);

  // Queries
  const { data: wallets, isLoading: walletsLoading, refetch: refetchWallets } = trpc.admin.getAllWallets.useQuery();
  const { data: pendingWithdrawals, isLoading: withdrawalsLoading, refetch: refetchWithdrawals } = trpc.admin.getPendingWithdrawals.useQuery();
  const { data: transactions, isLoading: transactionsLoading, refetch: refetchTransactions } = trpc.admin.getWalletTransactions.useQuery({ limit: 100 });

  // Mutations
  const adjustBalanceMutation = trpc.admin.adjustWalletBalance.useMutation({
    onSuccess: () => {
      toast.success("Guthaben erfolgreich angepasst");
      setNewBalance("");
      setReason("");
      setSelectedWalletId(null);
      refetchWallets();
      refetchTransactions();
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });

  const approveWithdrawalMutation = trpc.admin.approveWithdrawal.useMutation({
    onSuccess: () => {
      toast.success("Auszahlung genehmigt");
      refetchWithdrawals();
      refetchTransactions();
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });

  const rejectWithdrawalMutation = trpc.admin.rejectWithdrawal.useMutation({
    onSuccess: () => {
      toast.success("Auszahlung abgelehnt");
      setWithdrawalReason("");
      setSelectedWithdrawalId(null);
      refetchWithdrawals();
      refetchTransactions();
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });

  const handleAdjustBalance = () => {
    if (!selectedWalletId || !newBalance || !reason) {
      toast.error("Bitte füllen Sie alle Felder aus");
      return;
    }

    adjustBalanceMutation.mutate({
      walletId: selectedWalletId,
      newBalance,
      reason,
    });
  };

  const handleApproveWithdrawal = (transactionId: number) => {
    approveWithdrawalMutation.mutate({ transactionId });
  };

  const handleRejectWithdrawal = () => {
    if (!selectedWithdrawalId || !withdrawalReason) {
      toast.error("Bitte geben Sie einen Grund an");
      return;
    }

    rejectWithdrawalMutation.mutate({
      transactionId: selectedWithdrawalId,
      reason: withdrawalReason,
    });
  };

  return (
    <DashboardLayout variant="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Wallet-Verwaltung</h1>
          <p className="text-muted-foreground">
            Verwalten Sie Investor-Wallets, passen Sie Guthaben an und genehmigen Sie Auszahlungen
          </p>
        </div>

        <Tabs defaultValue="wallets" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="wallets">Wallets</TabsTrigger>
            <TabsTrigger value="withdrawals">Auszahlungen ({pendingWithdrawals?.length || 0})</TabsTrigger>
            <TabsTrigger value="transactions">Transaktionen</TabsTrigger>
          </TabsList>

          {/* Wallets Tab */}
          <TabsContent value="wallets" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  Investor-Wallets
                </CardTitle>
              </CardHeader>
              <CardContent>
                {walletsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Wallets werden geladen...</div>
                ) : wallets && wallets.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Investor</TableHead>
                          <TableHead>Währung</TableHead>
                          <TableHead>Guthaben</TableHead>
                          <TableHead>Verfügbar</TableHead>
                          <TableHead>Erstellt</TableHead>
                          <TableHead>Aktion</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {wallets.map((wallet) => (
                          <TableRow key={wallet.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{wallet.name}</p>
                                <p className="text-xs text-muted-foreground">{wallet.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={wallet.currencyType === "fiat" ? "default" : "secondary"}>
                                {wallet.currency}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-semibold">
                              {parseFloat(wallet.balance).toLocaleString("de-DE", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </TableCell>
                            <TableCell>
                              {parseFloat(wallet.availableBalance).toLocaleString("de-DE", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(wallet.createdAt), "dd.MM.yyyy", { locale: de })}
                            </TableCell>
                            <TableCell>
                              <Dialog open={selectedWalletId === wallet.id} onOpenChange={(open) => {
                                if (!open) setSelectedWalletId(null);
                              }}>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setSelectedWalletId(wallet.id)}
                                  >
                                    Anpassen
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Guthaben anpassen</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <label className="text-sm font-medium">Investor</label>
                                      <p className="text-sm text-muted-foreground">{wallet.name} ({wallet.email})</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Aktuelles Guthaben</label>
                                      <p className="text-lg font-semibold">
                                        {parseFloat(wallet.balance).toLocaleString("de-DE", {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        })} {wallet.currency}
                                      </p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Neues Guthaben</label>
                                      <Input
                                        type="number"
                                        placeholder="z.B. 500000"
                                        value={newBalance}
                                        onChange={(e) => setNewBalance(e.target.value)}
                                        step="0.01"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Grund</label>
                                      <Input
                                        placeholder="z.B. Testguthaben, Korrektur, etc."
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                      />
                                    </div>
                                    <Button
                                      onClick={handleAdjustBalance}
                                      disabled={adjustBalanceMutation.isPending}
                                      className="w-full"
                                    >
                                      {adjustBalanceMutation.isPending ? "Wird angepasst..." : "Guthaben anpassen"}
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">Keine Wallets gefunden</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Withdrawals Tab */}
          <TabsContent value="withdrawals" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5" />
                  Ausstehende Auszahlungen
                </CardTitle>
              </CardHeader>
              <CardContent>
                {withdrawalsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Auszahlungen werden geladen...</div>
                ) : pendingWithdrawals && pendingWithdrawals.length > 0 ? (
                  <div className="space-y-3">
                    {pendingWithdrawals.map((withdrawal) => (
                      <div key={withdrawal.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                        <div className="flex-1">
                          <p className="font-medium">{withdrawal.userId}</p>
                          <p className="text-sm text-muted-foreground">{withdrawal.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(withdrawal.createdAt), "dd.MM.yyyy HH:mm", { locale: de })}
                          </p>
                        </div>
                        <div className="text-right mr-4">
                          <p className="font-semibold">
                            {parseFloat(withdrawal.amount).toLocaleString("de-DE", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })} {withdrawal.currency}
                          </p>
                          <Badge variant="outline" className="mt-1">
                            {withdrawal.status}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleApproveWithdrawal(withdrawal.id)}
                            disabled={approveWithdrawalMutation.isPending}
                            className="gap-1"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Genehmigen
                          </Button>
                          <Dialog open={selectedWithdrawalId === withdrawal.id} onOpenChange={(open) => {
                            if (!open) setSelectedWithdrawalId(null);
                          }}>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setSelectedWithdrawalId(withdrawal.id)}
                                className="gap-1"
                              >
                                <XCircle className="w-4 h-4" />
                                Ablehnen
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Auszahlung ablehnen</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <p className="text-sm font-medium">Betrag</p>
                                  <p className="text-lg font-semibold">
                                    {parseFloat(withdrawal.amount).toLocaleString("de-DE", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })} {withdrawal.currency}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Ablehnungsgrund</label>
                                  <Input
                                    placeholder="z.B. Unzureichende Dokumentation"
                                    value={withdrawalReason}
                                    onChange={(e) => setWithdrawalReason(e.target.value)}
                                  />
                                </div>
                                <Button
                                  onClick={handleRejectWithdrawal}
                                  disabled={rejectWithdrawalMutation.isPending}
                                  variant="destructive"
                                  className="w-full"
                                >
                                  {rejectWithdrawalMutation.isPending ? "Wird abgelehnt..." : "Ablehnen"}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">Keine ausstehenden Auszahlungen</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Transaktions-Historie
                </CardTitle>
              </CardHeader>
              <CardContent>
                {transactionsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Transaktionen werden geladen...</div>
                ) : transactions && transactions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Investor</TableHead>
                          <TableHead>Typ</TableHead>
                          <TableHead>Betrag</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Datum</TableHead>
                          <TableHead>Beschreibung</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{transaction.name}</p>
                                <p className="text-xs text-muted-foreground">{transaction.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{transaction.type}</Badge>
                            </TableCell>
                            <TableCell className="font-semibold">
                              {parseFloat(transaction.amount).toLocaleString("de-DE", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })} {transaction.currency}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  transaction.status === "completed"
                                    ? "default"
                                    : transaction.status === "pending"
                                    ? "secondary"
                                    : "destructive"
                                }
                              >
                                {transaction.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(transaction.createdAt), "dd.MM.yyyy HH:mm", { locale: de })}
                            </TableCell>
                            <TableCell className="text-sm max-w-xs truncate">
                              {transaction.description}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">Keine Transaktionen gefunden</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
