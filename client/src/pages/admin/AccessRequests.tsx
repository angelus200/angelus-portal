import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserCheck, Check, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export default function AccessRequests() {
  const utils = trpc.useUtils();
  const { data: requests, isLoading } = trpc.admin.listPendingAccessRequests.useQuery();
  const { data: issuersList } = trpc.issuers.list.useQuery();
  const issuerName = (key: string) =>
    (issuersList || []).find(i => i.issuerKey === key)?.name || key;

  const decide = trpc.admin.decideIssuerAccess.useMutation({
    onSuccess: () => {
      utils.admin.listPendingAccessRequests.invalidate();
      toast.success("Entscheidung gespeichert");
      setRejectTarget(null);
      setNote("");
    },
    onError: (e) => toast.error(e.message),
  });

  const [rejectTarget, setRejectTarget] = useState<{ userId: number; issuerKey: string } | null>(null);
  const [note, setNote] = useState("");

  return (
    <DashboardLayout variant="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Freischaltungen</h1>
          <p className="text-muted-foreground">
            Offene Zugangsanfragen von Investoren je Emittent (Modell B).
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5" />
              Offene Anfragen
            </CardTitle>
            <CardDescription>
              „Freischalten" erlaubt dem Investor das Zeichnen bei diesem Emittenten. „Ablehnen" blockiert ihn.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}</div>
            ) : !requests || requests.length === 0 ? (
              <div className="text-center py-12">
                <UserCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Keine offenen Anfragen.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Investor</TableHead>
                    <TableHead>Emittent</TableHead>
                    <TableHead>Angefragt am</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-medium">{r.userName || "—"}</div>
                        <div className="text-xs text-muted-foreground">{r.userEmail}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{issuerName(r.issuerKey)}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.requestedAt ? format(new Date(r.requestedAt), "dd.MM.yyyy HH:mm", { locale: de }) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            disabled={decide.isPending}
                            onClick={() => decide.mutate({ userId: r.userId, issuerKey: r.issuerKey, status: "approved" })}
                            className="gap-1"
                          >
                            <Check className="w-4 h-4" /> Freischalten
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-destructive hover:text-destructive"
                            onClick={() => setRejectTarget({ userId: r.userId, issuerKey: r.issuerKey })}
                          >
                            <X className="w-4 h-4" /> Ablehnen
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ablehnen-Dialog (optional mit Notiz) */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => { if (!o) { setRejectTarget(null); setNote(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zugang ablehnen</DialogTitle>
            <DialogDescription>
              Der Investor wird für diesen Emittenten blockiert. Eine optionale Notiz wird gespeichert.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Grund / Notiz (optional)…"
            rows={3}
          />
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => { setRejectTarget(null); setNote(""); }}>Abbrechen</Button>
            <Button
              variant="destructive"
              disabled={decide.isPending}
              onClick={() => rejectTarget && decide.mutate({
                userId: rejectTarget.userId,
                issuerKey: rejectTarget.issuerKey,
                status: "blocked",
                note: note || undefined,
              })}
            >
              Ablehnen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
