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
import {
  Download,
  RotateCcw,
  Eye,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";

type PaymentStatus = "pending" | "processing" | "completed" | "failed" | "refunded";

export default function PaymentsPage() {
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "all">("all");
  const [searchEmail, setSearchEmail] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Fetch all payments
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["admin.payments"],
    queryFn: async () => {
      // This would be a tRPC call to get all payments
      // For now, we'll use a placeholder
      return [];
    },
  });

  // Filter payments
  const filteredPayments = payments.filter((payment: any) => {
    const matchesStatus = statusFilter === "all" || payment.paymentStatus === statusFilter;
    const matchesEmail = payment.investor?.email?.toLowerCase().includes(searchEmail.toLowerCase());
    return matchesStatus && matchesEmail;
  });

  // Calculate statistics
  const stats = {
    totalPayments: payments.length,
    completedAmount: payments
      .filter((p: any) => p.paymentStatus === "completed")
      .reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0),
    failedPayments: payments.filter((p: any) => p.paymentStatus === "failed").length,
    refundedAmount: payments
      .filter((p: any) => p.paymentStatus === "refunded")
      .reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0),
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Zahlungen</h1>
        <p className="text-gray-600 mt-2">Verwalten und überwachen Sie alle Investorenzahlungen</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Gesamtzahlungen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPayments}</div>
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
            <CardTitle className="text-sm font-medium text-gray-600">Fehlgeschlagen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.failedPayments}</div>
            <p className="text-xs text-gray-500 mt-1">Zahlungen mit Fehler</p>
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
                  Keine Zahlungen gefunden
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
                <div className="pt-4 border-t">
                  <Button variant="destructive" className="w-full">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Rückerstattung verarbeiten
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
