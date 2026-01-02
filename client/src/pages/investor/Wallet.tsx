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
import { Wallet, ArrowUpRight, ArrowDownLeft, Bitcoin, DollarSign, Copy, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useState } from "react";
import { toast } from "sonner";

export default function InvestorWallet() {
  const { data: wallets, isLoading: walletsLoading, refetch: refetchWallets } = trpc.wallet.myWallets.useQuery();
  const { data: transactions, isLoading: transactionsLoading } = trpc.wallet.transactions.useQuery();
  
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

  const fiatWallets = wallets?.filter(w => w.currencyType === "fiat") || [];
  const cryptoWallets = wallets?.filter(w => w.currencyType === "crypto") || [];

  const handleCreateWallet = async (currency: string, type: "fiat" | "crypto") => {
    await getOrCreateWallet.mutateAsync({ currency, currencyType: type });
    toast.success(`${currency} Wallet erstellt`);
  };

  const handleWithdraw = async () => {
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
          <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
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
                  Beantragen Sie eine Auszahlung aus Ihrem Wallet. Auszahlungen werden nach Prüfung durch unser Team bearbeitet.
                </DialogDescription>
              </DialogHeader>
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
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                  />
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
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsWithdrawOpen(false)}>
                  Abbrechen
                </Button>
                <Button onClick={handleWithdraw} disabled={!withdrawAmount || parseFloat(withdrawAmount) <= 0}>
                  Auszahlung beantragen
                </Button>
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
            <div className="grid gap-4 md:grid-cols-3">
              {["BTC", "ETH", "USDT"].map((currency) => {
                const wallet = cryptoWallets.find(w => w.currency === currency);
                return (
                  <Card key={currency}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Bitcoin className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold">{currency}</p>
                            <p className="text-xs text-muted-foreground">Krypto Wallet</p>
                          </div>
                        </div>
                      </div>
                      {wallet ? (
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Guthaben</span>
                            <span className="font-semibold">
                              {parseFloat(wallet.balance || "0").toLocaleString("de-DE", { minimumFractionDigits: 8 })}
                            </span>
                          </div>
                          {wallet.depositAddress && (
                            <div className="mt-4">
                              <p className="text-xs text-muted-foreground mb-1">Einzahlungsadresse</p>
                              <div className="flex items-center gap-2">
                                <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                                  {wallet.depositAddress}
                                </code>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => {
                                    navigator.clipboard.writeText(wallet.depositAddress || "");
                                    toast.success("Adresse kopiert");
                                  }}
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground mb-2">Nicht aktiviert</p>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleCreateWallet(currency, "crypto")}
                          >
                            Aktivieren
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card className="border-yellow-200 bg-yellow-50/50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Bitcoin className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-800">Hinweis zu Krypto-Einzahlungen</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      Krypto-Einzahlungen werden nach Netzwerkbestätigung gutgeschrieben. 
                      Die Bearbeitungszeit kann je nach Netzwerkauslastung variieren.
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
    </DashboardLayout>
  );
}
