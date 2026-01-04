import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, CheckCircle, Clock, AlertCircle, User, Wallet, FileCheck } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";

export default function AdminSubscriptions() {
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Queries
  const { data: subscriptions, isLoading: subscriptionsLoading, refetch: refetchSubscriptions } = trpc.admin.getSubscriptions.useQuery({ limit: 200 });
  const { data: selectedSubscription, isLoading: detailLoading } = trpc.admin.getSubscriptionDetail.useQuery(
    { subscriptionId: selectedSubscriptionId! },
    { enabled: !!selectedSubscriptionId }
  );

  // Mutations
  const updateStatusMutation = trpc.admin.updateSubscriptionStatus.useMutation({
    onSuccess: () => {
      toast.success("Status aktualisiert");
      refetchSubscriptions();
      setSelectedSubscriptionId(null);
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });

  const filteredSubscriptions = subscriptions?.filter((sub) => {
    if (statusFilter === "all") return true;
    return sub.status === statusFilter;
  }) || [];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      confirmed: "outline",
      active: "default",
      completed: "default",
      cancelled: "destructive",
    };
    return variants[status] || "outline";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "confirmed":
        return <CheckCircle className="w-4 h-4" />;
      case "active":
        return <CheckCircle className="w-4 h-4" />;
      case "completed":
        return <CheckCircle className="w-4 h-4" />;
      case "cancelled":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const statusLabels: Record<string, string> = {
    pending: "Ausstehend",
    confirmed: "Bestätigt",
    active: "Aktiv",
    completed: "Abgeschlossen",
    cancelled: "Storniert",
  };

  return (
    <DashboardLayout variant="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Zeichnungen</h1>
          <p className="text-muted-foreground">
            Verwalten Sie alle Investor-Zeichnungen mit Details und Zustimmungsstatus
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Alle Zeichnungen
              </CardTitle>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status filtern" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Status</SelectItem>
                  <SelectItem value="pending">Ausstehend</SelectItem>
                  <SelectItem value="confirmed">Bestätigt</SelectItem>
                  <SelectItem value="active">Aktiv</SelectItem>
                  <SelectItem value="completed">Abgeschlossen</SelectItem>
                  <SelectItem value="cancelled">Storniert</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {subscriptionsLoading ? (
              <div className="text-center py-8 text-muted-foreground">Zeichnungen werden geladen...</div>
            ) : filteredSubscriptions.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Investor</TableHead>
                      <TableHead>Beteiligung</TableHead>
                      <TableHead>Betrag</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Datum</TableHead>
                      <TableHead>Aktion</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubscriptions.map((subscription) => (
                      <TableRow key={subscription.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{subscription.name}</p>
                            <p className="text-xs text-muted-foreground">{subscription.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{subscription.bondName}</TableCell>
                        <TableCell className="font-semibold">
                          {parseFloat(subscription.amount).toLocaleString("de-DE", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })} {subscription.currency}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadge(subscription.status)} className="gap-1">
                            {getStatusIcon(subscription.status)}
                            {statusLabels[subscription.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(subscription.createdAt), "dd.MM.yyyy", { locale: de })}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedSubscriptionId(subscription.id)}
                          >
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">Keine Zeichnungen gefunden</div>
            )}
          </CardContent>
        </Card>

        {/* Detail Modal */}
        <Dialog open={!!selectedSubscriptionId} onOpenChange={(open) => {
          if (!open) setSelectedSubscriptionId(null);
        }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Zeichnungs-Details</DialogTitle>
            </DialogHeader>

            {detailLoading ? (
              <div className="text-center py-8">Wird geladen...</div>
            ) : selectedSubscription ? (
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Übersicht</TabsTrigger>
                  <TabsTrigger value="consents">Zustimmungen</TabsTrigger>
                  <TabsTrigger value="payment">Zahlung</TabsTrigger>
                  <TabsTrigger value="kyc">KYC</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Investor</label>
                      <p className="font-semibold">{selectedSubscription.name}</p>
                      <p className="text-sm text-muted-foreground">{selectedSubscription.email}</p>
                      {selectedSubscription.phone && (
                        <p className="text-sm text-muted-foreground">{selectedSubscription.phone}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Beteiligung</label>
                      <p className="font-semibold">{selectedSubscription.bondName}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Zeichnungsbetrag</label>
                      <p className="text-2xl font-bold">
                        {parseFloat(selectedSubscription.amount).toLocaleString("de-DE", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })} {selectedSubscription.currency}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Status</label>
                      <Badge variant={getStatusBadge(selectedSubscription.status)} className="w-fit gap-1">
                        {getStatusIcon(selectedSubscription.status)}
                        {statusLabels[selectedSubscription.status]}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Zeichnungsdatum</label>
                      <p className="text-sm">
                        {format(new Date(selectedSubscription.createdAt), "dd.MM.yyyy HH:mm", { locale: de })}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Aktualisiert</label>
                      <p className="text-sm">
                        {format(new Date(selectedSubscription.updatedAt), "dd.MM.yyyy HH:mm", { locale: de })}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t">
                    <label className="text-sm font-medium">Status aktualisieren</label>
                    <div className="flex gap-2">
                      {(["pending", "confirmed", "active", "completed", "cancelled"] as const).map((status) => (
                        <Button
                          key={status}
                          size="sm"
                          variant={selectedSubscription.status === status ? "default" : "outline"}
                          onClick={() => {
                            updateStatusMutation.mutate({
                              subscriptionId: selectedSubscription.id,
                              status,
                            });
                          }}
                          disabled={updateStatusMutation.isPending}
                        >
                          {statusLabels[status]}
                        </Button>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* Consents Tab */}
                <TabsContent value="consents" className="space-y-4">
                  <div className="space-y-3">
                    {selectedSubscription.consents && selectedSubscription.consents.length > 0 ? (
                      selectedSubscription.consents.map((consent, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileCheck className="w-5 h-5" />
                            <div>
                              <p className="font-medium capitalize">{consent.consentType.replace(/_/g, " ")}</p>
                              <p className="text-sm text-muted-foreground">
                                {consent.acceptedAt
                                  ? format(new Date(consent.acceptedAt), "dd.MM.yyyy HH:mm", { locale: de })
                                  : "Nicht akzeptiert"}
                              </p>
                            </div>
                          </div>
                          <Badge variant={consent.accepted ? "default" : "secondary"}>
                            {consent.accepted ? "Akzeptiert" : "Ausstehend"}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-center py-8 text-muted-foreground">Keine Zustimmungen gefunden</p>
                    )}
                  </div>
                </TabsContent>

                {/* Payment Tab */}
                <TabsContent value="payment" className="space-y-4">
                  {selectedSubscription.paymentSchedule && selectedSubscription.paymentSchedule.length > 0 ? (
                    <div className="space-y-3">
                      {selectedSubscription.paymentSchedule.map((payment, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Wallet className="w-5 h-5" />
                            <div>
                              <p className="font-medium">
                                {parseFloat(payment.amount).toLocaleString("de-DE", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })} {payment.currency}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Fällig: {format(new Date(payment.dueDate), "dd.MM.yyyy", { locale: de })}
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant={
                              payment.status === "paid"
                                ? "default"
                                : payment.status === "overdue"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {payment.status === "paid"
                              ? "Bezahlt"
                              : payment.status === "overdue"
                              ? "Überfällig"
                              : "Ausstehend"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">Kein Zahlungsplan vorhanden</p>
                  )}
                </TabsContent>

                {/* KYC Tab */}
                <TabsContent value="kyc" className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">KYC-Status</p>
                        <p className="text-sm text-muted-foreground">
                          Know Your Customer Verifizierung
                        </p>
                      </div>
                      <Badge
                        variant={
                          selectedSubscription.kycStatus?.status === "verified"
                            ? "default"
                            : selectedSubscription.kycStatus?.status === "rejected"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {selectedSubscription.kycStatus?.status === "verified"
                          ? "Verifiziert"
                          : selectedSubscription.kycStatus?.status === "rejected"
                          ? "Abgelehnt"
                          : "Ausstehend"}
                      </Badge>
                    </div>
                    {selectedSubscription.kycStatus?.verifiedAt && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Verifiziert am: {format(new Date(selectedSubscription.kycStatus.verifiedAt), "dd.MM.yyyy HH:mm", { locale: de })}
                      </p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
