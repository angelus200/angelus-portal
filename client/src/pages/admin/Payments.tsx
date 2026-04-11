import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  RotateCcw,
  Eye,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Bitcoin,
  Banknote,
  CalendarCheck,
} from "lucide-react";

type PaymentStatus = "pending" | "processing" | "completed" | "failed" | "refunded";
type ScheduleStatus = "scheduled" | "pending" | "paid" | "overdue";

export default function PaymentsPage() {
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "all">("all");
  const [searchEmail, setSearchEmail] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [page, setPage] = useState(0);

  // Payment Schedules (Zins & Rückzahlungen)
  const utils = trpc.useUtils();
  const { data: paymentSchedules, isLoading: schedulesLoading } = trpc.admin.getPaymentSchedules.useQuery();
  const [scheduleFilter, setScheduleFilter] = useState<ScheduleStatus | "all">("all");
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [payMethod, setPayMethod] = useState<"bank_transfer" | "crypto">("bank_transfer");
  const [cryptoTxHash, setCryptoTxHash] = useState("");
  const [cryptoCoin, setCryptoCoin] = useState("");

  const markSchedulePaid = trpc.admin.markPaymentSchedulePaid.useMutation({
    onSuccess: () => {
      utils.admin.getPaymentSchedules.invalidate();
      setSelectedSchedule(null);
      setCryptoTxHash("");
      setCryptoCoin("");
    },
  });

  // Fetch all payments
  const { data: paymentsData, isLoading, refetch } = useQuery({
    queryKey: ["admin.getAllPayments", statusFilter, page],
    queryFn: async () => {
      const result = await trpc.admin.getAllPayments.useQuery({
        limit: 50,
        offset: page * 50,
        status: statusFilter === "all" ? undefined : (statusFilter as any),
      });
      return result;
    },
  });

  const payments = Array.isArray(paymentsData) ? paymentsData : (paymentsData as any)?.payments || [];

  // Fetch payment statistics
  const { data: statsData } = useQuery({
    queryKey: ["admin.getPaymentStats"],
    queryFn: async () => {
      return await trpc.admin.getPaymentStats.useQuery();
    },
  });

  // Refund mutation
  const refundMutation = useMutation({
    mutationFn: async (variables: { subscriptionId: number; reason: string }) => {
      return await trpc.admin.refundPayment.useMutation().mutate(variables);
    },
    onSuccess: () => {
      refetch();
      setShowDetails(false);
    },
  });

  // Filter payments by email search
  const filteredPayments = payments.filter((payment: any) => {
    const matchesEmail = payment.investor?.email?.toLowerCase().includes(searchEmail.toLowerCase());
    return matchesEmail;
  });

  // Use stats from query or calculate fallback
  const stats = statsData || {
    total: 0,
    completed: 0,
    completedAmount: 0,
    failed: 0,
    refunded: 0,
    refundedAmount: 0,
    processing: 0,
    pending: 0,
  };

  const getStatusIcon = (status: PaymentStatus) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "refunded":
        return <RotateCcw className="w-4 h-4 text-blue-600" />;
      case "processing":
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: PaymentStatus) => {
    const variants: Record<PaymentStatus, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      failed: "destructive",
      refunded: "secondary",
      processing: "outline",
      pending: "outline",
    };

    const labels: Record<PaymentStatus, string> = {
      completed: "Abgeschlossen",
      failed: "Fehlgeschlagen",
      refunded: "Rückerstattung",
      processing: "Verarbeitung",
      pending: "Ausstehend",
    };

    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  const filteredSchedules = (paymentSchedules ?? []).filter((s: any) => {
    if (scheduleFilter === "all") return true;
    return s.status === scheduleFilter;
  });

  const getScheduleStatusBadge = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      scheduled: { label: "Geplant", className: "bg-blue-100 text-blue-800" },
      pending:   { label: "Ausstehend", className: "bg-yellow-100 text-yellow-800" },
      paid:      { label: "Bezahlt", className: "bg-green-100 text-green-800" },
      overdue:   { label: "Überfällig", className: "bg-red-100 text-red-800" },
    };
    const v = map[status] ?? map.pending;
    return <Badge className={v.className}>{v.label}</Badge>;
  };

  return (
    <DashboardLayout variant="admin">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Zahlungen</h1>
          <p className="text-gray-600 mt-2">Verwalten und überwachen Sie alle Investorenzahlungen</p>
        </div>

        <Tabs defaultValue="subscriptions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="subscriptions">Zeichnungen (Stripe)</TabsTrigger>
            <TabsTrigger value="schedules" className="gap-2">
              <CalendarCheck className="w-4 h-4" />
              Zins & Rückzahlungen
              {(paymentSchedules ?? []).filter((s: any) => s.status !== "paid").length > 0 && (
                <Badge className="ml-1 bg-yellow-500 text-white text-xs">
                  {(paymentSchedules ?? []).filter((s: any) => s.status !== "paid").length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="subscriptions" className="space-y-4">

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Gesamtzahlungen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats as any)?.total || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Alle Zahlungsvorgänge</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Abgeschlossen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              €{((stats as any)?.completedAmount || 0).toFixed(2)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Erfolgreich verarbeitet</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Fehlgeschlagen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{(stats as any)?.failed || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Zahlungen mit Fehler</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Rückerstattungen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              €{((stats as any)?.refundedAmount || 0).toFixed(2)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Rückerstattete Beträge</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-64">
          <Input
            placeholder="Nach E-Mail suchen..."
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            className="w-full"
          />
        </div>
        <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Status filtern" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            <SelectItem value="pending">Ausstehend</SelectItem>
            <SelectItem value="processing">Verarbeitung</SelectItem>
            <SelectItem value="completed">Abgeschlossen</SelectItem>
            <SelectItem value="failed">Fehlgeschlagen</SelectItem>
            <SelectItem value="refunded">Rückerstattung</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Payments Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Investor</TableHead>
              <TableHead>Beteiligung</TableHead>
              <TableHead>Betrag</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Stripe Intent ID</TableHead>
              <TableHead>Datum</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  Lädt...
                </TableCell>
              </TableRow>
            ) : filteredPayments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  {searchEmail ? "Keine Zahlungen mit dieser E-Mail gefunden" : "Keine Zahlungen gefunden"}
                </TableCell>
              </TableRow>
            ) : (
              filteredPayments.map((payment: any) => (
                <TableRow key={payment.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">
                    <div>
                      <p className="font-semibold">{payment.investor?.name}</p>
                      <p className="text-sm text-gray-500">{payment.investor?.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>{payment.bond?.name}</TableCell>
                  <TableCell className="font-semibold">€{parseFloat(payment.amount).toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(payment.paymentStatus)}
                      {getStatusBadge(payment.paymentStatus)}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600 font-mono">
                    {payment.stripePaymentIntentId?.substring(0, 20)}...
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {format(new Date(payment.createdAt), "dd.MM.yyyy HH:mm", { locale: de })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedPayment(payment);
                        setShowDetails(true);
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Payment Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Zahlungsdetails</DialogTitle>
            <DialogDescription>
              Detaillierte Informationen zur Zahlung
            </DialogDescription>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-4">
              {/* Investor Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Investor</p>
                  <p className="text-lg font-semibold">{selectedPayment.investor?.name}</p>
                  <p className="text-sm text-gray-500">{selectedPayment.investor?.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Beteiligung</p>
                  <p className="text-lg font-semibold">{selectedPayment.bond?.name}</p>
                </div>
              </div>

              {/* Payment Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Betrag</p>
                  <p className="text-lg font-semibold">€{parseFloat(selectedPayment.amount).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Status</p>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusIcon(selectedPayment.paymentStatus)}
                    {getStatusBadge(selectedPayment.paymentStatus)}
                  </div>
                </div>
              </div>

              {/* Stripe Info */}
              <div className="space-y-2">
                <div>
                  <p className="text-sm font-medium text-gray-600">Payment Intent ID</p>
                  <p className="text-sm font-mono bg-gray-50 p-2 rounded">
                    {selectedPayment.stripePaymentIntentId || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Customer ID</p>
                  <p className="text-sm font-mono bg-gray-50 p-2 rounded">
                    {selectedPayment.stripeCustomerId || "N/A"}
                  </p>
                </div>
              </div>

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Erstellt am</p>
                  <p className="text-sm">
                    {format(new Date(selectedPayment.createdAt), "dd.MM.yyyy HH:mm:ss", { locale: de })}
                  </p>
                </div>
                {selectedPayment.paymentCompletedAt && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">Abgeschlossen am</p>
                    <p className="text-sm">
                      {format(new Date(selectedPayment.paymentCompletedAt), "dd.MM.yyyy HH:mm:ss", { locale: de })}
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              {selectedPayment.paymentStatus === "completed" && (
                <div className="pt-4 border-t space-y-3">
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => {
                      const reason = prompt("Grund für Rückerstattung:");
                      if (reason) {
                        refundMutation.mutate({
                          subscriptionId: selectedPayment.id,
                          reason,
                        });
                      }
                    }}
                    disabled={refundMutation.isPending}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    {refundMutation.isPending ? "Wird verarbeitet..." : "Rückerstattung verarbeiten"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-6">
        <p className="text-sm text-gray-600">
          Zeige {page * 50 + 1} bis {Math.min((page + 1) * 50, payments.length)} von {payments.length} Zahlungen
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
          >
            Zurück
          </Button>
          <Button
            variant="outline"
            onClick={() => setPage(page + 1)}
            disabled={!paymentsData || (page + 1) * 50 >= payments.length}
          >
            Weiter
          </Button>
        </div>
      </div>

          </TabsContent>

          {/* Zins & Rückzahlungen Tab */}
          <TabsContent value="schedules" className="space-y-4">
            <div className="flex items-center gap-3">
              <Select value={scheduleFilter} onValueChange={(v) => setScheduleFilter(v as ScheduleStatus | "all")}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Status</SelectItem>
                  <SelectItem value="scheduled">Geplant</SelectItem>
                  <SelectItem value="pending">Ausstehend</SelectItem>
                  <SelectItem value="overdue">Überfällig</SelectItem>
                  <SelectItem value="paid">Bezahlt</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">{filteredSchedules.length} Einträge</span>
            </div>

            <Card>
              <CardContent className="pt-4">
                {schedulesLoading ? (
                  <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}</div>
                ) : filteredSchedules.length === 0 ? (
                  <div className="text-center py-12">
                    <CalendarCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Keine Zahlungsplaneinträge gefunden.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Investor</TableHead>
                        <TableHead>Bond</TableHead>
                        <TableHead>Typ</TableHead>
                        <TableHead>Betrag</TableHead>
                        <TableHead>Fälligkeit</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Zahlungsart</TableHead>
                        <TableHead className="text-right">Aktion</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSchedules.map((s: any) => (
                        <TableRow key={s.id}>
                          <TableCell>#{s.id}</TableCell>
                          <TableCell>
                            <p className="font-medium">{s.investor?.name ?? `User #${s.subscription?.userId}`}</p>
                            <p className="text-xs text-muted-foreground">{s.investor?.email}</p>
                          </TableCell>
                          <TableCell className="text-sm">{s.bond?.name ?? `Bond #${s.subscription?.bondId}`}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {s.type === "interest" ? "Zinsen" : s.type === "principal" ? "Rückzahlung" : "Kombiniert"}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold">
                            {parseFloat(s.amount).toLocaleString("de-DE", { minimumFractionDigits: 2 })} {s.currency}
                          </TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(s.dueDate), "dd.MM.yyyy", { locale: de })}
                          </TableCell>
                          <TableCell>{getScheduleStatusBadge(s.status)}</TableCell>
                          <TableCell>
                            {s.paymentMethod === "crypto" ? (
                              <span className="flex items-center gap-1 text-xs">
                                <Bitcoin className="w-3 h-3" /> {s.cryptoCoin ?? "Crypto"}
                              </span>
                            ) : s.paymentMethod === "bank_transfer" ? (
                              <span className="flex items-center gap-1 text-xs">
                                <Banknote className="w-3 h-3" /> EUR
                              </span>
                            ) : "–"}
                          </TableCell>
                          <TableCell className="text-right">
                            {s.status !== "paid" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedSchedule(s);
                                  setPayMethod("bank_transfer");
                                  setCryptoTxHash("");
                                  setCryptoCoin("");
                                }}
                              >
                                Als bezahlt markieren
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Mark Schedule Paid Dialog */}
        <Dialog open={!!selectedSchedule} onOpenChange={(o) => { if (!o) setSelectedSchedule(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Zahlung als bezahlt markieren</DialogTitle>
              <DialogDescription>
                Wählen Sie die Zahlungsart. Bei Crypto bitte TX-Hash und Coin eintragen.
              </DialogDescription>
            </DialogHeader>
            {selectedSchedule && (
              <div className="space-y-4 py-2">
                <div className="border rounded-lg divide-y text-sm">
                  <div className="flex justify-between px-4 py-2">
                    <span className="text-muted-foreground">Investor</span>
                    <span className="font-medium">{selectedSchedule.investor?.name ?? `#${selectedSchedule.subscription?.userId}`}</span>
                  </div>
                  <div className="flex justify-between px-4 py-2">
                    <span className="text-muted-foreground">Betrag</span>
                    <span className="font-semibold">{parseFloat(selectedSchedule.amount).toLocaleString("de-DE", { minimumFractionDigits: 2 })} {selectedSchedule.currency}</span>
                  </div>
                  <div className="flex justify-between px-4 py-2">
                    <span className="text-muted-foreground">Fälligkeit</span>
                    <span>{format(new Date(selectedSchedule.dueDate), "dd.MM.yyyy", { locale: de })}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Zahlungsart</Label>
                  <Select value={payMethod} onValueChange={(v) => setPayMethod(v as "bank_transfer" | "crypto")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank_transfer">
                        <span className="flex items-center gap-2"><Banknote className="w-4 h-4" /> EUR Überweisung</span>
                      </SelectItem>
                      <SelectItem value="crypto">
                        <span className="flex items-center gap-2"><Bitcoin className="w-4 h-4" /> Crypto</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {payMethod === "crypto" && (
                  <>
                    <div className="space-y-1.5">
                      <Label>Coin <span className="text-destructive">*</span></Label>
                      <Select value={cryptoCoin} onValueChange={setCryptoCoin}>
                        <SelectTrigger>
                          <SelectValue placeholder="Coin auswählen…" />
                        </SelectTrigger>
                        <SelectContent>
                          {["BTC","ETH","USDT","USDC","USDT-TRC20"].map(c => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>TX-Hash <span className="text-destructive">*</span></Label>
                      <Input
                        placeholder="0x… oder txid…"
                        value={cryptoTxHash}
                        onChange={e => setCryptoTxHash(e.target.value)}
                        className="font-mono text-sm"
                      />
                    </div>
                  </>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedSchedule(null)}>Abbrechen</Button>
              <Button
                onClick={() => markSchedulePaid.mutateAsync({
                  id: selectedSchedule.id,
                  method: payMethod,
                  cryptoTxHash: payMethod === "crypto" ? cryptoTxHash : undefined,
                  cryptoCoin: payMethod === "crypto" ? cryptoCoin : undefined,
                })}
                disabled={markSchedulePaid.isPending || (payMethod === "crypto" && (!cryptoTxHash || !cryptoCoin))}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {markSchedulePaid.isPending ? "Wird gespeichert…" : "Als bezahlt markieren"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  );
}
