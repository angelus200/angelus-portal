import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Copy, X, Mail, Link as LinkIcon } from "lucide-react";

const BASE_URL = typeof window !== "undefined" ? window.location.origin : "";

function statusBadge(status: string, expiresAt: Date | string) {
  const expired = new Date(expiresAt) < new Date();
  if (status === "accepted") return <Badge className="bg-green-100 text-green-800">Angenommen</Badge>;
  if (status === "cancelled") return <Badge variant="outline" className="text-muted-foreground">Storniert</Badge>;
  if (expired) return <Badge className="bg-orange-100 text-orange-800">Abgelaufen</Badge>;
  return <Badge className="bg-blue-100 text-blue-800">Ausstehend</Badge>;
}

export default function Invitations() {
  const utils = trpc.useUtils();

  const { data: invitations = [], isLoading } = trpc.admin.listGeneralInvitations.useQuery();

  const createMutation = trpc.admin.createGeneralInvitation.useMutation({
    onSuccess: () => {
      utils.admin.listGeneralInvitations.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const cancelMutation = trpc.admin.cancelGeneralInvitation.useMutation({
    onSuccess: () => {
      utils.admin.listGeneralInvitations.invalidate();
      toast.success("Einladung storniert");
    },
    onError: (e) => toast.error(e.message),
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [newTokenDialog, setNewTokenDialog] = useState<{ token: string; email: string } | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [sendEmail, setSendEmail] = useState(true);

  const handleCreate = async () => {
    if (!email) { toast.error("E-Mail-Adresse erforderlich"); return; }
    const result = await createMutation.mutateAsync({ email, name: name || undefined, expiresInDays, sendEmail });
    setNewTokenDialog({ token: result.token, email: result.email });
    setCreateOpen(false);
    setEmail("");
    setName("");
    setExpiresInDays(30);
    setSendEmail(true);
    toast.success(sendEmail ? "Einladung erstellt und E-Mail versandt" : "Einladung erstellt");
  };

  const invitationLink = (token: string) => `${BASE_URL}/register?invitation=${token}`;

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(invitationLink(token));
    toast.success("Link kopiert");
  };

  return (
    <DashboardLayout variant="admin">
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Einladungen</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Generieren Sie Einladungslinks für neue Mitglieder.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Neue Einladung
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Alle Einladungen ({invitations.length})</CardTitle>
            <CardDescription>Übersicht aller generierten Einladungslinks</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-10 bg-muted animate-pulse rounded" />)}
              </div>
            ) : invitations.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Noch keine Einladungen erstellt.</p>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name / E-Mail</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Gültig bis</TableHead>
                      <TableHead>Erstellt</TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitations.map((inv: any) => (
                      <TableRow key={inv.id}>
                        <TableCell>
                          <p className="font-medium">{inv.name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{inv.email}</p>
                        </TableCell>
                        <TableCell>{statusBadge(inv.status, inv.expiresAt)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(inv.expiresAt).toLocaleDateString("de-DE")}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(inv.createdAt).toLocaleDateString("de-DE")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {inv.status === "pending" && new Date(inv.expiresAt) >= new Date() && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyLink(inv.token)}
                                title="Link kopieren"
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                            )}
                            {inv.status === "pending" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => cancelMutation.mutate({ id: inv.id })}
                                disabled={cancelMutation.isPending}
                                title="Stornieren"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Neue Einladung erstellen
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="inv-email">E-Mail *</Label>
              <Input
                id="inv-email"
                type="email"
                placeholder="name@beispiel.de"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inv-name">Name (optional)</Label>
              <Input
                id="inv-name"
                placeholder="Vor- und Nachname"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inv-days">Gültigkeitsdauer (Tage)</Label>
              <Input
                id="inv-days"
                type="number"
                min={1}
                max={365}
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(Number(e.target.value))}
              />
            </div>
            <div className="flex items-center justify-between py-1">
              <Label htmlFor="inv-send-email" className="cursor-pointer">
                Einladungs-E-Mail versenden
              </Label>
              <Switch
                id="inv-send-email"
                checked={sendEmail}
                onCheckedChange={setSendEmail}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)} className="flex-1">
                Abbrechen
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending || !email}
                className="flex-1 gap-2"
              >
                {createMutation.isPending ? "Wird erstellt..." : "Erstellen"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Token Dialog */}
      <Dialog open={!!newTokenDialog} onOpenChange={() => setNewTokenDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <LinkIcon className="w-5 h-5" />
              Einladungslink
            </DialogTitle>
          </DialogHeader>
          {newTokenDialog && (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                Einladung für <strong>{newTokenDialog.email}</strong> erstellt.
                Kopieren Sie den Link und leiten Sie ihn weiter:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-muted px-3 py-2 rounded break-all font-mono">
                  {invitationLink(newTokenDialog.token)}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyLink(newTokenDialog.token)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <Button onClick={() => setNewTokenDialog(null)} className="w-full">
                Schließen
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
