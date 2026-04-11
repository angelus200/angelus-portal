import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { QRCodeSVG } from "qrcode.react";
import { Bitcoin, Copy, Pencil, Plus, QrCode, Trash2 } from "lucide-react";
import { toast } from "sonner";

const COIN_OPTIONS = [
  { value: "BTC", label: "Bitcoin (BTC)", network: "Bitcoin" },
  { value: "ETH", label: "Ethereum (ETH)", network: "Ethereum" },
  { value: "USDT", label: "Tether (USDT)", network: "Ethereum (ERC-20)" },
  { value: "USDC", label: "USD Coin (USDC)", network: "Ethereum (ERC-20)" },
  { value: "USDT-TRC20", label: "Tether TRC-20 (USDT)", network: "Tron (TRC-20)" },
];

const EMPTY_FORM = { coin: "", network: "", address: "", label: "", isActive: true };

type FormState = typeof EMPTY_FORM;

export default function CryptoWallets() {
  const utils = trpc.useUtils();
  const { data: wallets, isLoading } = trpc.admin.listCompanyWallets.useQuery();

  const createMutation = trpc.admin.createCompanyWallet.useMutation({
    onSuccess: () => { utils.admin.listCompanyWallets.invalidate(); toast.success("Wallet hinzugefügt"); setDialogOpen(false); setForm(EMPTY_FORM); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.admin.updateCompanyWallet.useMutation({
    onSuccess: () => { utils.admin.listCompanyWallets.invalidate(); toast.success("Wallet aktualisiert"); setDialogOpen(false); setEditId(null); setForm(EMPTY_FORM); },
    onError: (e) => toast.error(e.message),
  });
  const toggleMutation = trpc.admin.toggleCompanyWallet.useMutation({
    onSuccess: () => { utils.admin.listCompanyWallets.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.admin.deleteCompanyWallet.useMutation({
    onSuccess: () => { utils.admin.listCompanyWallets.invalidate(); toast.success("Wallet gelöscht"); },
    onError: (e) => toast.error(e.message),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [qrAddress, setQrAddress] = useState<string | null>(null);

  const handleCoinChange = (coin: string) => {
    const opt = COIN_OPTIONS.find(c => c.value === coin);
    setForm(p => ({ ...p, coin, network: opt?.network ?? "" }));
  };

  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (w: NonNullable<typeof wallets>[number]) => {
    setEditId(w.id);
    setForm({ coin: w.coin, network: w.network, address: w.address, label: w.label ?? "", isActive: w.isActive });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editId !== null) {
      await updateMutation.mutateAsync({ id: editId, ...form });
    } else {
      await createMutation.mutateAsync(form);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Wallet-Adresse wirklich löschen?")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <DashboardLayout variant="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Crypto Cold Wallets</h1>
            <p className="text-muted-foreground">
              Verwalten Sie die Empfangsadressen für Crypto-Einzahlungen von Investoren.
            </p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            Neue Adresse
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bitcoin className="w-5 h-5" />
              Cold Wallet Adressen
            </CardTitle>
            <CardDescription>
              Diese Adressen werden Investoren zur Einzahlung angezeigt. Nur aktive Adressen sind sichtbar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}</div>
            ) : !wallets || wallets.length === 0 ? (
              <div className="text-center py-12">
                <Bitcoin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Noch keine Wallet-Adressen hinterlegt.</p>
                <Button onClick={openCreate} className="mt-4 gap-2" variant="outline">
                  <Plus className="w-4 h-4" />
                  Erste Adresse hinzufügen
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Coin</TableHead>
                    <TableHead>Netzwerk</TableHead>
                    <TableHead>Adresse</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Aktiv</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wallets.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono font-semibold">
                          {w.coin}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{w.network}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono bg-muted px-2 py-1 rounded max-w-[220px] truncate block">
                            {w.address}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => { navigator.clipboard.writeText(w.address); toast.success("Adresse kopiert"); }}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => setQrAddress(w.address)}
                          >
                            <QrCode className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{w.label ?? "–"}</TableCell>
                      <TableCell>
                        <Switch
                          checked={w.isActive}
                          onCheckedChange={(checked) => toggleMutation.mutate({ id: w.id, isActive: checked })}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(w)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(w.id)}
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditId(null); setForm(EMPTY_FORM); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Wallet bearbeiten" : "Neue Wallet-Adresse"}</DialogTitle>
            <DialogDescription>
              {editId ? "Adresse aktualisieren." : "Cold Wallet Empfangsadresse hinterlegen."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Coin <span className="text-destructive">*</span></Label>
              <Select value={form.coin} onValueChange={handleCoinChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Coin auswählen…" />
                </SelectTrigger>
                <SelectContent>
                  {COIN_OPTIONS.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Netzwerk <span className="text-destructive">*</span></Label>
              <Input
                value={form.network}
                onChange={e => setForm(p => ({ ...p, network: e.target.value }))}
                placeholder="z.B. Ethereum (ERC-20)"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Wallet-Adresse <span className="text-destructive">*</span></Label>
              <Input
                value={form.address}
                onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                placeholder="0x… oder bc1…"
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Label <span className="text-xs text-muted-foreground">(optional)</span></Label>
              <Input
                value={form.label}
                onChange={e => setForm(p => ({ ...p, label: e.target.value }))}
                placeholder="z.B. Hauptadresse Cold Storage"
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="cw-active"
                checked={form.isActive}
                onCheckedChange={checked => setForm(p => ({ ...p, isActive: checked }))}
              />
              <Label htmlFor="cw-active" className="cursor-pointer">Aktiv (für Investoren sichtbar)</Label>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Abbrechen</Button>
              <Button
                type="submit"
                disabled={!form.coin || !form.network || !form.address || createMutation.isPending || updateMutation.isPending}
              >
                {editId ? "Speichern" : "Hinzufügen"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={!!qrAddress} onOpenChange={(o) => { if (!o) setQrAddress(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>QR-Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="p-4 bg-white border rounded-lg">
              {qrAddress && <QRCodeSVG value={qrAddress} size={200} />}
            </div>
            <code className="text-xs font-mono bg-muted px-3 py-2 rounded break-all text-center">
              {qrAddress}
            </code>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => { navigator.clipboard.writeText(qrAddress ?? ""); toast.success("Adresse kopiert"); }}
            >
              <Copy className="w-4 h-4" />
              Adresse kopieren
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
