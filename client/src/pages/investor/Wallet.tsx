import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Wallet, ArrowUpRight, ArrowDownLeft, Bitcoin, DollarSign, Copy, CheckCircle, CreditCard, QrCode } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { StripeDepositDialog } from "@/components/wallet/StripeDepositDialog";
import { QRCodeSVG } from "qrcode.react";

export default function InvestorWallet() {
  const { data: wallets, isLoading: walletsLoading, refetch: refetchWallets } = trpc.wallet.myWallets.useQuery();
  const { data: transactions, isLoading: transactionsLoading } = trpc.wallet.transactions.useQuery();
  const { data: companyWallets } = trpc.wallet.companyWallets.useQuery();

  const getOrCreateWallet = trpc.wallet.getOrCreate.useMutation({
    onSuccess: () => refetchWallets(),
  });
  
  const requestWithdrawal = trpc.wallet.requestWithdrawal.useMutation({
    onSuccess: () => {
      toast.success("Auszahlungsantrag eingereicht");
      refetchWallets();
    },
    onError: (error) => {
      toast.error("Fehler: " + error.message);
    },
  });

  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawCurrency, setWithdrawCurrency] = useState("EUR");
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [withdrawStep, setWithdrawStep] = useState<"input" | "confirm">("input");

  const PENALTY_RATE = 0.20;
  const parsedWithdrawAmount = parseFloat(withdrawAmount) || 0;
  const penaltyPreview = parsedWithdrawAmount * PENALTY_RATE;
  const netAmountPreview = parsedWithdrawAmount - penaltyPreview;

  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [selectedWalletForDeposit, setSelectedWalletForDeposit] = useState<NonNullable<typeof wallets>[number] | null>(null);

  // Crypto deposit reporting state
  const [cryptoReportWalletId, setCryptoReportWalletId] = useState<number | null>(null);
  const [cryptoReportCurrency, setCryptoReportCurrency] = useState("");
  const [cryptoReportTxHash, setCryptoReportTxHash] = useState("");
  const [cryptoReportAmount, setCryptoReportAmount] = useState("");
  const [cryptoReportOpen, setCryptoReportOpen] = useState(false);
  const [cryptoQrAddress, setCryptoQrAddress] = useState<string | null>(null);

  const reportCryptoDeposit = trpc.wallet.reportCryptoDeposit.useMutation({
    onSuccess: () => {
      toast.success("Einzahlung gemeldet – der Admin wird sie prüfen und gutschreiben.");
      setCryptoReportOpen(false);
      setCryptoReportTxHash("");
      setCryptoReportAmount("");
      refetchWallets();
    },
    onError: (e) => toast.error("Fehler: " + e.message),
  });

  const handleReportCryptoDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cryptoReportWalletId) return;
    await reportCryptoDeposit.mutateAsync({
      walletId: cryptoReportWalletId,
      txHash: cryptoReportTxHash.trim(),
      amount: cryptoReportAmount,
      currency: cryptoReportCurrency,
    });
  };

  const openCryptoReport = (walletId: number, currency: string) => {
    setCryptoReportWalletId(walletId);
    setCryptoReportCurrency(currency);
    setCryptoReportTxHash("");
    setCryptoReportAmount("");
    setCryptoReportOpen(true);
  };

  // Handle deposit success/cancelled query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const depositStatus = params.get("deposit");

    if (depositStatus === "success") {
      toast.success("Einzahlung erfolgreich! Ihr Wallet wird aktualisiert.");
      refetchWallets();
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
    } else if (depositStatus === "cancelled") {
      toast.info("Einzahlung abgebrochen.");
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [refetchWallets]);

  const fiatWallets = wallets?.filter(w => w.currencyType === "fiat") || [];
  const cryptoWallets = wallets?.filter(w => w.currencyType === "crypto") || [];

  const handleCreateWallet = async (currency: string, type: "fiat" | "crypto") => {
    await getOrCreateWallet.mutateAsync({ currency, currencyType: type });
    toast.success(`${currency} Wallet erstellt`);
  };

  const handleWithdrawConfirm = async () => {
    const wallet = wallets?.find(w => w.currency === withdrawCurrency);
    if (!wallet) return;

    await requestWithdrawal.mutateAsync({
      walletId: wallet.id,
      amount: withdrawAmount,
      currency: withdrawCurrency,
      externalAddress: withdrawAddress || undefined,
    });

    setIsWithdrawOpen(false);
    setWithdrawAmount("");
    setWithdrawAddress("");
    setWithdrawStep("input");
  };

  const handleWithdrawDialogClose = (open: boolean) => {
    setIsWithdrawOpen(open);
    if (!open) {
      setWithdrawStep("input");
      setWithdrawAmount("");
      setWithdrawAddress("");
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "deposit":
      case "credit":
        return <ArrowDownLeft className="w-4 h-4 text-green-600" />;
      case "withdrawal":
      case "debit":
        return <ArrowUpRight className="w-4 h-4 text-red-600" />;
      default:
        return <Wallet className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      pending: { label: "Ausstehend", className: "bg-yellow-100 text-yellow-800" },
      processing: { label: "In Bearbeitung", className: "bg-blue-100 text-blue-800" },
      completed: { label: "Abgeschlossen", className: "bg-green-100 text-green-800" },
      failed: { label: "Fehlgeschlagen", className: "bg-red-100 text-red-800" },
      cancelled: { label: "Storniert", className: "bg-gray-100 text-gray-800" },
    };
    const variant = variants[status] || variants.pending;
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  const totalEurBalance = fiatWallets.reduce((sum, w) => sum + parseFloat(w.balance || "0"), 0);

  return (
    <DashboardLayout variant="investor">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">E-Wallet</h1>
            <p className="text-muted-foreground">
              Verwalten Sie Ihre Einlagen in Fiat und Kryptowährungen
            </p>
          </div>
          <Dialog open={isWithdrawOpen} onOpenChange={handleWithdrawDialogClose}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <ArrowUpRight className="w-4 h-4" />
                Auszahlung beantragen
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Auszahlung beantragen</DialogTitle>
                <DialogDescription>
                  {withdrawStep === "input"
                    ? "Beantragen Sie eine Auszahlung aus Ihrem Wallet."
                    : "Bitte bestätigen Sie die Auszahlung inkl. Penalty-Gebühr."}
                </DialogDescription>
              </DialogHeader>

              {withdrawStep === "input" && (
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Währung</Label>
                    <Select value={withdrawCurrency} onValueChange={setWithdrawCurrency}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {wallets?.map(w => (
                          <SelectItem key={w.currency} value={w.currency}>
                            {w.currency} (Verfügbar: {parseFloat(w.availableBalance || "0").toLocaleString("de-DE")})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Betrag</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                      <Input
                        type="number"
                        placeholder="0.00"
                        className="pl-8"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        min="0"
                        step="100"
                      />
                    </div>
                  </div>
                  {cryptoWallets.some(w => w.currency === withdrawCurrency) && (
                    <div className="space-y-2">
                      <Label>Zieladresse (Wallet)</Label>
                      <Input
                        placeholder="Ihre externe Wallet-Adresse"
                        value={withdrawAddress}
                        onChange={(e) => setWithdrawAddress(e.target.value)}
                      />
                    </div>
                  )}
                  {parsedWithdrawAmount > 0 && (
                    <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Penalty (20%):</span>
                        <span className="text-destructive">−€{penaltyPreview.toLocaleString("de-DE", { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between font-semibold border-t pt-1">
                        <span>Sie erhalten:</span>
                        <span>€{netAmountPreview.toLocaleString("de-DE", { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {withdrawStep === "confirm" && (
                <div className="py-4 space-y-4">
                  <div className="border rounded-lg divide-y">
                    <div className="flex justify-between px-4 py-3">
                      <span className="text-muted-foreground">Auszahlungsbetrag</span>
                      <span className="font-semibold">€{parsedWithdrawAmount.toLocaleString("de-DE", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between px-4 py-3">
                      <span className="text-muted-foreground">Penalty (20%)</span>
                      <span className="font-semibold text-destructive">−€{penaltyPreview.toLocaleString("de-DE", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between px-4 py-3 bg-muted/30">
                      <span className="font-semibold">Sie erhalten</span>
                      <span className="font-bold text-lg">€{netAmountPreview.toLocaleString("de-DE", { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Mit Klick auf "Verbindlich bestätigen" wird der Auszahlungsantrag eingereicht
                    und der Betrag aus Ihrem Wallet reserviert.
                  </p>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => handleWithdrawDialogClose(false)}>
                  Abbrechen
                </Button>
                {withdrawStep === "input" ? (
                  <Button
                    onClick={() => setWithdrawStep("confirm")}
                    disabled={!withdrawAmount || parsedWithdrawAmount <= 0}
                  >
                    Weiter
                  </Button>
                ) : (
                  <Button
                    onClick={handleWithdrawConfirm}
                    disabled={requestWithdrawal.isPending}
                    variant="destructive"
                  >
                    {requestWithdrawal.isPending ? "Wird eingereicht..." : "Verbindlich bestätigen"}
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Total Balance */}
        <Card className="bg-gradient-to-r from-secondary to-secondary/90">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-secondary-foreground/70 text-sm">Gesamtguthaben (EUR)</p>
                <p className="text-4xl font-bold text-secondary-foreground">
                  €{totalEurBalance.toLocaleString("de-DE", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <Wallet className="w-12 h-12 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="fiat" className="space-y-4">
          <TabsList>
            <TabsTrigger value="fiat" className="gap-2">
              <DollarSign className="w-4 h-4" />
              Fiat
            </TabsTrigger>
            <TabsTrigger value="crypto" className="gap-2">
              <Bitcoin className="w-4 h-4" />
              Krypto
            </TabsTrigger>
            <TabsTrigger value="transactions">
              Transaktionen
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fiat" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {fiatWallets.length > 0 ? (
                fiatWallets.map((wallet) => (
                  <Card key={wallet.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold">{wallet.currency}</p>
                            <p className="text-xs text-muted-foreground">Fiat Wallet</p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Guthaben</span>
                          <span className="font-semibold">
                            {parseFloat(wallet.balance || "0").toLocaleString("de-DE", { minimumFractionDigits: 2 })} {wallet.currency}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Verfügbar</span>
                          <span className="font-semibold text-green-600">
                            {parseFloat(wallet.availableBalance || "0").toLocaleString("de-DE", { minimumFractionDigits: 2 })} {wallet.currency}
                          </span>
                        </div>
                      </div>
                      <Button
                        className="w-full mt-4 gap-2"
                        variant="outline"
                        onClick={() => {
                          setSelectedWalletForDeposit(wallet);
                          setIsDepositOpen(true);
                        }}
                      >
                        <CreditCard className="w-4 h-4" />
                        Mit Kreditkarte einzahlen
                      </Button>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="col-span-2">
                  <CardContent className="pt-6 text-center">
                    <p className="text-muted-foreground mb-4">Kein Fiat-Wallet vorhanden</p>
                    <Button onClick={() => handleCreateWallet("EUR", "fiat")}>
                      EUR Wallet erstellen
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Deposit Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Einzahlung</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Für Einzahlungen überweisen Sie bitte den gewünschten Betrag auf folgendes Konto:
                </p>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Bank</span>
                    <span className="text-sm font-medium">Beispiel Bank AG</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">IBAN</span>
                    <span className="text-sm font-medium">CH00 0000 0000 0000 0000 0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">BIC</span>
                    <span className="text-sm font-medium">EXAMPLEXXX</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Verwendungszweck</span>
                    <span className="text-sm font-medium">Ihre Investor-ID</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="crypto" className="space-y-4">
            {/* Company cold wallet addresses per coin */}
            {companyWallets && companyWallets.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {companyWallets.map((cw) => {
                  const myWallet = cryptoWallets.find(w => w.currency === cw.coin);
                  return (
                    <Card key={cw.id}>
                      <CardContent className="pt-6 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Bitcoin className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold">{cw.coin}</p>
                            <p className="text-xs text-muted-foreground">{cw.network}</p>
                          </div>
                          {myWallet && (
                            <div className="ml-auto text-right">
                              <p className="text-xs text-muted-foreground">Guthaben</p>
                              <p className="font-semibold text-sm">
                                {parseFloat(myWallet.balance || "0").toLocaleString("de-DE", { minimumFractionDigits: 8 })} {cw.coin}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Deposit address */}
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Einzahlungsadresse ({cw.coin})</p>
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-muted px-2 py-1.5 rounded flex-1 truncate font-mono">
                              {cw.address}
                            </code>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { navigator.clipboard.writeText(cw.address); toast.success("Adresse kopiert"); }}>
                              <Copy className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setCryptoQrAddress(cw.address)}>
                              <QrCode className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                          {cw.label && <p className="text-xs text-muted-foreground">{cw.label}</p>}
                        </div>

                        {/* Report deposit button */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full gap-2"
                          onClick={() => {
                            const w = cryptoWallets.find(w => w.currency === cw.coin);
                            if (w) {
                              openCryptoReport(w.id, cw.coin);
                            } else {
                              handleCreateWallet(cw.coin, "crypto").then(() => {
                                refetchWallets();
                                toast.info("Wallet aktiviert – bitte erneut auf 'Einzahlung melden' klicken.");
                              });
                            }
                          }}
                        >
                          <CheckCircle className="w-4 h-4" />
                          Einzahlung melden
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <Bitcoin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Derzeit sind keine Crypto-Einzahlungsadressen verfügbar.<br />
                    Bitte kontaktieren Sie uns unter <a href="mailto:office@angelus.group" className="text-primary">office@angelus.group</a>.
                  </p>
                </CardContent>
              </Card>
            )}

            <Card className="border-yellow-200 bg-yellow-50/50">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <Bitcoin className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-800">Hinweis zu Krypto-Einzahlungen</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      Senden Sie Ihre Kryptowährung an die oben angezeigte Adresse und melden Sie die Einzahlung mit dem TX-Hash.
                      Nach manueller Prüfung wird der EUR-Gegenwert in Ihrem Wallet gutgeschrieben.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle>Transaktionshistorie</CardTitle>
              </CardHeader>
              <CardContent>
                {transactionsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : transactions && transactions.length > 0 ? (
                  <div className="space-y-3">
                    {transactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            {getTransactionIcon(tx.type)}
                          </div>
                          <div>
                            <p className="font-medium">
                              {tx.type === "deposit" ? "Einzahlung" :
                               tx.type === "withdrawal" ? "Auszahlung" :
                               tx.type === "credit" ? "Gutschrift" :
                               tx.type === "debit" ? "Abbuchung" : "Transfer"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(tx.createdAt), "dd.MM.yyyy HH:mm", { locale: de })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className={`font-semibold ${
                              tx.type === "deposit" || tx.type === "credit" ? "text-green-600" : "text-red-600"
                            }`}>
                              {tx.type === "deposit" || tx.type === "credit" ? "+" : "-"}
                              {parseFloat(tx.amount).toLocaleString("de-DE")} {tx.currency}
                            </p>
                          </div>
                          {getStatusBadge(tx.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Keine Transaktionen vorhanden
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Stripe Deposit Dialog */}
      {selectedWalletForDeposit && (
        <StripeDepositDialog
          wallet={selectedWalletForDeposit}
          open={isDepositOpen}
          onOpenChange={setIsDepositOpen}
        />
      )}

      {/* Crypto Deposit Report Dialog */}
      <Dialog open={cryptoReportOpen} onOpenChange={(o) => { setCryptoReportOpen(o); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crypto Einzahlung melden</DialogTitle>
            <DialogDescription>
              Geben Sie den TX-Hash und den gesendeten Betrag an. Der Admin prüft die Transaktion und schreibt den EUR-Gegenwert gut.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReportCryptoDeposit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Coin</Label>
              <Input value={cryptoReportCurrency} disabled className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label>TX-Hash <span className="text-destructive">*</span></Label>
              <Input
                placeholder="0x… oder txid…"
                value={cryptoReportTxHash}
                onChange={e => setCryptoReportTxHash(e.target.value)}
                className="font-mono text-sm"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">Den TX-Hash finden Sie in Ihrer Wallet oder auf dem Blockchain Explorer.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Gesendeter Betrag <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0.00"
                  value={cryptoReportAmount}
                  onChange={e => setCryptoReportAmount(e.target.value)}
                  className="pr-16"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-mono">{cryptoReportCurrency}</span>
              </div>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
              ⚠️ Melden Sie nur Einzahlungen, die Sie tatsächlich an unsere Wallet-Adresse gesendet haben.
              Der EUR-Gegenwert wird nach manueller Prüfung durch einen Admin gutgeschrieben.
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCryptoReportOpen(false)}>Abbrechen</Button>
              <Button
                type="submit"
                disabled={!cryptoReportTxHash.trim() || !cryptoReportAmount || reportCryptoDeposit.isPending}
              >
                {reportCryptoDeposit.isPending ? "Wird gemeldet…" : "Einzahlung melden"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={!!cryptoQrAddress} onOpenChange={(o) => { if (!o) setCryptoQrAddress(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>QR-Code scannen</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="p-4 bg-white border rounded-lg">
              {cryptoQrAddress && <QRCodeSVG value={cryptoQrAddress} size={200} />}
            </div>
            <code className="text-xs font-mono bg-muted px-3 py-2 rounded break-all text-center">
              {cryptoQrAddress}
            </code>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => { navigator.clipboard.writeText(cryptoQrAddress ?? ""); toast.success("Adresse kopiert"); }}>
              <Copy className="w-4 h-4" />
              Adresse kopieren
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
