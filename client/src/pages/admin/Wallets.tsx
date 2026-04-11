import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Wallet, ArrowUpRight, CheckCircle, XCircle, Clock, Bitcoin, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useState } from "react";
import { toast } from "sonner";

const EXPLORER_URLS: Record<string, string> = {
  BTC: "https://mempool.space/tx/",
  ETH: "https://etherscan.io/tx/",
  USDT: "https://etherscan.io/tx/",
  USDC: "https://etherscan.io/tx/",
  "USDT-TRC20": "https://tronscan.org/#/transaction/",
};

function getExplorerUrl(currency: string, txHash: string) {
  const base = EXPLORER_URLS[currency] ?? "https://blockchair.com/search?q=";
  return `${base}${txHash}`;
}

export default function AdminWallets() {
  const utils = trpc.useUtils();
  const { data: pendingWithdrawals, isLoading: withdrawalsLoading, refetch: refetchWithdrawals } = trpc.wallet.pendingWithdrawals.useQuery();
  const { data: pendingCryptoDeposits, isLoading: depositsLoading } = trpc.admin.pendingCryptoDeposits.useQuery();

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
    penaltyAmount: string | null;
    externalAddress?: string | null;
  } | null>(null);

  const handleApproveWithdrawal = async () => {
    if (!selectedWithdrawal) return;
    await approveWithdrawal.mutateAsync({
      id: selectedWithdrawal.id,
    });
  };

  // Crypto deposit confirm state
  const [selectedDeposit, setSelectedDeposit] = useState<{
    id: number;
    currency: string;
    externalTxHash: string | null;
    amount: string;
    user: { id: number; name: string | null; email: string | null } | null;
  } | null>(null);
  const [eurAmount, setEurAmount] = useState("");

  const confirmDeposit = trpc.admin.confirmCryptoDeposit.useMutation({
    onSuccess: () => {
      toast.success("Einzahlung bestätigt und EUR-Wallet gutgeschrieben");
      utils.admin.pendingCryptoDeposits.invalidate();
      setSelectedDeposit(null);
      setEurAmount("");
    },
    onError: (e) => toast.error("Fehler: " + e.message),
  });

  const handleConfirmDeposit = async () => {
    if (!selectedDeposit || !eurAmount) return;
    await confirmDeposit.mutateAsync({ txId: selectedDeposit.id, eurAmount });
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
            <TabsTrigger value="crypto-deposits" className="gap-2">
              <Bitcoin className="w-4 h-4" />
              Crypto Einzahlungen
              {pendingCryptoDeposits && pendingCryptoDeposits.length > 0 && (
                <Badge className="ml-1 bg-orange-500 text-white">{pendingCryptoDeposits.length}</Badge>
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
                        <TableHead>Brutto</TableHead>
                        <TableHead>Penalty (20%)</TableHead>
                        <TableHead>Netto</TableHead>
                        <TableHead>Währung</TableHead>
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
                            {parseFloat(withdrawal.amount).toLocaleString("de-DE")} {withdrawal.currency}
                          </TableCell>
                          <TableCell className="text-destructive font-medium">
                            −{parseFloat(withdrawal.penaltyAmount || "0").toLocaleString("de-DE")} {withdrawal.currency}
                          </TableCell>
                          <TableCell className="font-semibold text-green-700">
                            {(parseFloat(withdrawal.amount) - parseFloat(withdrawal.penaltyAmount || "0")).toLocaleString("de-DE")} {withdrawal.currency}
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
                                penaltyAmount: withdrawal.penaltyAmount,
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

          {/* Crypto Deposits Tab */}
          <TabsContent value="crypto-deposits">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bitcoin className="w-5 h-5" />
                  Ausstehende Crypto Einzahlungen
                </CardTitle>
              </CardHeader>
              <CardContent>
                {depositsLoading ? (
                  <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}</div>
                ) : pendingCryptoDeposits && pendingCryptoDeposits.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Investor</TableHead>
                        <TableHead>Coin</TableHead>
                        <TableHead>Gemeldeter Betrag</TableHead>
                        <TableHead>TX-Hash</TableHead>
                        <TableHead>Datum</TableHead>
                        <TableHead className="text-right">Aktion</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingCryptoDeposits.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell>#{d.id}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{d.user?.name ?? `User #${d.userId}`}</p>
                              <p className="text-xs text-muted-foreground">{d.user?.email ?? ""}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono">{d.currency}</Badge>
                          </TableCell>
                          <TableCell className="font-semibold">
                            {parseFloat(d.amount).toLocaleString("de-DE", { minimumFractionDigits: 8 })} {d.currency}
                          </TableCell>
                          <TableCell>
                            {d.externalTxHash ? (
                              <a
                                href={getExplorerUrl(d.currency, d.externalTxHash)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-primary hover:underline font-mono text-xs"
                              >
                                {d.externalTxHash.slice(0, 16)}…
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : "–"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(d.createdAt), "dd.MM.yyyy HH:mm", { locale: de })}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedDeposit({
                                  id: d.id,
                                  currency: d.currency,
                                  externalTxHash: d.externalTxHash ?? null,
                                  amount: d.amount,
                                  user: d.user,
                                });
                                setEurAmount("");
                              }}
                            >
                              EUR gutschreiben
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <Bitcoin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Keine ausstehenden Crypto-Einzahlungen.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Confirm Crypto Deposit Dialog */}
        <Dialog open={!!selectedDeposit} onOpenChange={(o) => { if (!o) { setSelectedDeposit(null); setEurAmount(""); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crypto Einzahlung bestätigen</DialogTitle>
              <DialogDescription>
                Prüfen Sie die Blockchain-Transaktion und geben Sie den EUR-Gegenwert ein, der dem Investor gutgeschrieben werden soll.
              </DialogDescription>
            </DialogHeader>
            {selectedDeposit && (
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <Label className="text-muted-foreground text-xs">Investor</Label>
                    <p className="font-medium">{selectedDeposit.user?.name ?? `User #${selectedDeposit.id}`}</p>
                    <p className="text-xs text-muted-foreground">{selectedDeposit.user?.email}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Gemeldeter Betrag</Label>
                    <p className="font-medium font-mono">{parseFloat(selectedDeposit.amount).toLocaleString("de-DE", { minimumFractionDigits: 8 })} {selectedDeposit.currency}</p>
                  </div>
                </div>
                {selectedDeposit.externalTxHash && (
                  <div>
                    <Label className="text-muted-foreground text-xs">TX-Hash</Label>
                    <a
                      href={getExplorerUrl(selectedDeposit.currency, selectedDeposit.externalTxHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline font-mono text-xs break-all mt-1"
                    >
                      {selectedDeposit.externalTxHash}
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>EUR-Gegenwert <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      className="pl-7"
                      value={eurAmount}
                      onChange={e => setEurAmount(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Dieser Betrag wird dem EUR-Wallet des Investors gutgeschrieben.</p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => { setSelectedDeposit(null); setEurAmount(""); }}>Abbrechen</Button>
              <Button
                onClick={handleConfirmDeposit}
                disabled={!eurAmount || confirmDeposit.isPending}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {confirmDeposit.isPending ? "Wird gutgeschrieben…" : "EUR gutschreiben"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Process Withdrawal Dialog */}
        <Dialog open={!!selectedWithdrawal} onOpenChange={() => setSelectedWithdrawal(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Auszahlung bearbeiten</DialogTitle>
              <DialogDescription>
                Prüfen und verarbeiten Sie den Auszahlungsantrag.
              </DialogDescription>
            </DialogHeader>
            {selectedWithdrawal && (() => {
              const gross = parseFloat(selectedWithdrawal.amount);
              const penalty = parseFloat(selectedWithdrawal.penaltyAmount || "0");
              const net = gross - penalty;
              return (
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <Label className="text-muted-foreground">Benutzer</Label>
                      <p className="font-medium">User #{selectedWithdrawal.userId}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Währung</Label>
                      <p className="font-medium">{selectedWithdrawal.currency}</p>
                    </div>
                  </div>
                  <div className="border rounded-lg divide-y">
                    <div className="flex justify-between px-4 py-3">
                      <span className="text-muted-foreground">Bruttobetrag</span>
                      <span className="font-semibold">{gross.toLocaleString("de-DE", { minimumFractionDigits: 2 })} {selectedWithdrawal.currency}</span>
                    </div>
                    <div className="flex justify-between px-4 py-3">
                      <span className="text-muted-foreground">Penalty (20%)</span>
                      <span className="font-semibold text-destructive">−{penalty.toLocaleString("de-DE", { minimumFractionDigits: 2 })} {selectedWithdrawal.currency}</span>
                    </div>
                    <div className="flex justify-between px-4 py-3 bg-muted/30">
                      <span className="font-semibold">Auszahlung an Investor</span>
                      <span className="font-bold text-lg">{net.toLocaleString("de-DE", { minimumFractionDigits: 2 })} {selectedWithdrawal.currency}</span>
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
              );
            })()}
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
