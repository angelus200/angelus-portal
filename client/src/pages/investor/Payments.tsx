import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Download,
  Eye,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";

type PaymentStatus = "pending" | "processing" | "completed" | "failed" | "refunded";

export default function InvestorPaymentsPage() {
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "all">("all");
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [page, setPage] = useState(0);

  // Fetch investor payments
  const { data: paymentsData, isLoading } = useQuery({
    queryKey: ["payments.myPayments", statusFilter, page],
    queryFn: async () => {
      const result = await trpc.payments.myPayments.query({
        limit: 50,
        offset: page * 50,
        status: statusFilter === "all" ? undefined : (statusFilter as any),
      });
      return result;
    },
  });

  const payments = paymentsData?.payments || [];

  // Fetch payment statistics
  const { data: statsData } = useQuery({
    queryKey: ["payments.myPaymentStats"],
    queryFn: async () => {
      return await trpc.payments.myPaymentStats.query();
    },
  });

  const stats = statsData || {
    total: 0,
    completed: 0,
    failed: 0,
    refunded: 0,
    processing: 0,
    pending: 0,
    completedAmount: 0,
    refundedAmount: 0,
  };

  const getStatusIcon = (status: PaymentStatus) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "refunded":
        return <AlertCircle className="w-4 h-4 text-blue-600" />;
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

  return (
    <DashboardLayout variant="investor">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Meine Zahlungen</h1>
          <p className="text-gray-600 mt-2">Übersicht über alle Ihre Zahlungen und Investitionen</p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Gesamtzahlungen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-gray-500 mt-1">Alle Zahlungsvorgänge</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Abgeschlossen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                €{stats.completedAmount.toFixed(2)}
              </div>
              <p className="text-xs text-gray-500 mt-1">Erfolgreich verarbeitet</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Ausstehend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <p className="text-xs text-gray-500 mt-1">Zahlungen in Bearbeitung</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Rückerstattungen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                €{stats.refundedAmount.toFixed(2)}
              </div>
              <p className="text-xs text-gray-500 mt-1">Rückerstattete Beträge</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <div className="flex gap-4 flex-wrap">
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
                <TableHead>Beteiligung</TableHead>
                <TableHead>Betrag</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    Lädt...
                  </TableCell>
                </TableRow>
              ) : payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    Keine Zahlungen gefunden
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((payment: any) => (
                  <TableRow key={payment.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">
                      <div>
                        <p className="font-semibold">{payment.bond?.name}</p>
                        <p className="text-sm text-gray-500">{payment.bond?.bondNumber}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">€{parseFloat(payment.amount).toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(payment.paymentStatus)}
                        {getStatusBadge(payment.paymentStatus)}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {format(new Date(payment.createdAt), "dd.MM.yyyy", { locale: de })}
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
                Detaillierte Informationen zu Ihrer Zahlung
              </DialogDescription>
            </DialogHeader>

            {selectedPayment && (
              <div className="space-y-4">
                {/* Bond Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Beteiligung</p>
                    <p className="text-lg font-semibold">{selectedPayment.bond?.name}</p>
                    <p className="text-sm text-gray-500">{selectedPayment.bond?.bondNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Zinssatz</p>
                    <p className="text-lg font-semibold">{selectedPayment.bond?.interestRate}%</p>
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
                {selectedPayment.stripePaymentIntentId && (
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Payment Intent ID</p>
                      <p className="text-sm font-mono bg-gray-50 p-2 rounded">
                        {selectedPayment.stripePaymentIntentId}
                      </p>
                    </div>
                  </div>
                )}

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
                <div className="pt-4 border-t space-y-3">
                  <Button className="w-full" variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Rechnung herunterladen
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Pagination */}
        <div className="flex justify-between items-center mt-6">
          <p className="text-sm text-gray-600">
            Zeige {page * 50 + 1} bis {Math.min((page + 1) * 50, paymentsData?.total || 0)} von {paymentsData?.total || 0} Zahlungen
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
              disabled={!paymentsData || (page + 1) * 50 >= paymentsData.total}
            >
              Weiter
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
