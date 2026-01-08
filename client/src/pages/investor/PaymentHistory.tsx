import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, Eye } from "lucide-react";

export default function PaymentHistory() {
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // In a real app, this would be fetched from the API
  // For now, we'll use mock data
  useEffect(() => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setPayments([
        {
          id: 1,
          bondName: "Angelus Bond 2026",
          amount: 100000,
          currency: "EUR",
          status: "paid",
          date: new Date("2026-01-06"),
          paymentIntentId: "pi_1234567890",
          invoiceNumber: "INV-2026-001",
        },
      ]);
      setIsLoading(false);
    }, 500);
  }, []);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      paid: "default",
      pending: "secondary",
      failed: "destructive",
      cancelled: "outline",
    };

    const labels: Record<string, string> = {
      paid: "Bezahlt",
      pending: "Ausstehend",
      failed: "Fehlgeschlagen",
      cancelled: "Storniert",
    };

    return (
      <Badge variant={variants[status] || "secondary"}>
        {labels[status] || status}
      </Badge>
    );
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency,
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("de-DE");
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Zahlungshistorie</CardTitle>
          <CardDescription>Übersicht aller Ihre Zahlungen und Rechnungen</CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>Keine Zahlungen vorhanden</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Beteiligung</th>
                    <th className="text-left py-3 px-4 font-semibold">Betrag</th>
                    <th className="text-left py-3 px-4 font-semibold">Datum</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                    <th className="text-left py-3 px-4 font-semibold">Rechnungsnummer</th>
                    <th className="text-left py-3 px-4 font-semibold">Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{payment.bondName}</td>
                      <td className="py-3 px-4 font-semibold">
                        {formatCurrency(payment.amount, payment.currency)}
                      </td>
                      <td className="py-3 px-4">{formatDate(payment.date)}</td>
                      <td className="py-3 px-4">{getStatusBadge(payment.status)}</td>
                      <td className="py-3 px-4">{payment.invoiceNumber || "-"}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              alert(`Zahlungs-ID: ${payment.paymentIntentId}`);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {payment.invoiceNumber && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                alert(`Rechnung ${payment.invoiceNumber} wird heruntergeladen...`);
                              }}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Zusammenfassung</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Gesamtbetrag investiert</p>
              <p className="text-2xl font-bold">
                {formatCurrency(
                  payments.reduce((sum, p) => sum + p.amount, 0),
                  "EUR"
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Bezahlte Zahlungen</p>
              <p className="text-2xl font-bold">
                {payments.filter((p) => p.status === "paid").length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Ausstehende Zahlungen</p>
              <p className="text-2xl font-bold">
                {payments.filter((p) => p.status === "pending").length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
