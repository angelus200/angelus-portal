import { useState, useRef } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  FileText, Plus, Upload, Loader2, AlertTriangle,
  TrendingUp, Wallet, Calendar, CheckCircle2, Link2,
  Banknote, ArrowUpRight, Paperclip
} from "lucide-react";
import { FileUpload, DocumentList } from "@/components/FileUpload";

const BASE_URL = typeof window !== "undefined" ? window.location.origin : "";

function fmt(v: unknown, dec = 2) {
  const n = parseFloat(String(v ?? "0"));
  return isNaN(n) ? "0,00" : n.toLocaleString("de-DE", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function fmtDate(d: Date | string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("de-DE");
}

const INTERVALS = [
  { value: "monthly", label: "Monatlich" },
  { value: "quarterly", label: "Quartalsweise" },
  { value: "yearly", label: "Jährlich" },
  { value: "end_of_term", label: "Am Laufzeitende" },
];

const CURRENCIES = ["EUR", "BTC", "ETH", "USDT", "USDC"];

// ============================================================
// Contract Form
// ============================================================
const EMPTY_CONTRACT = {
  signedAmount: "", interestRate: "", penaltyRatePerDay: "0",
  startDate: "", endDate: "",
  paymentInterval: "yearly" as const,
  currency: "EUR", status: "active" as const, notes: "",
};

function ContractTab({ userId, contract, onSaved }: {
  userId: number;
  contract: any;
  onSaved: () => void;
}) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState(() => contract
    ? {
      signedAmount: contract.signedAmount,
      interestRate: contract.interestRate,
      penaltyRatePerDay: contract.penaltyRatePerDay ?? "0",
      startDate: contract.startDate ? new Date(contract.startDate).toISOString().split("T")[0] : "",
      endDate: contract.endDate ? new Date(contract.endDate).toISOString().split("T")[0] : "",
      paymentInterval: contract.paymentInterval,
      currency: contract.currency,
      status: contract.status,
      notes: contract.notes ?? "",
    }
    : EMPTY_CONTRACT
  );

  const createMutation = trpc.legacyContracts.create.useMutation({
    onSuccess: () => { utils.legacyContracts.list.invalidate(); toast.success("Vertrag gespeichert"); onSaved(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.legacyContracts.update.useMutation({
    onSuccess: () => { utils.legacyContracts.list.invalidate(); toast.success("Vertrag aktualisiert"); onSaved(); },
    onError: (e) => toast.error(e.message),
  });

  const handleSave = () => {
    if (!form.signedAmount || !form.interestRate || !form.startDate || !form.endDate) {
      toast.error("Bitte alle Pflichtfelder ausfüllen");
      return;
    }
    if (contract) {
      updateMutation.mutate({ id: contract.id, data: { ...form, userId } });
    } else {
      createMutation.mutate({ ...form, userId });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Zeichnungsbetrag *</Label>
          <Input placeholder="100000" value={form.signedAmount}
            onChange={e => setForm(f => ({ ...f, signedAmount: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Währung</Label>
          <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Zinssatz % p.a. *</Label>
          <Input placeholder="8.5" value={form.interestRate}
            onChange={e => setForm(f => ({ ...f, interestRate: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Strafzins % pro Tag</Label>
          <Input placeholder="0.1" value={form.penaltyRatePerDay}
            onChange={e => setForm(f => ({ ...f, penaltyRatePerDay: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Zeichnungsdatum *</Label>
          <Input type="date" value={form.startDate}
            onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Laufzeitende *</Label>
          <Input type="date" value={form.endDate}
            onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Zahlungsintervall</Label>
          <Select value={form.paymentInterval} onValueChange={v => setForm(f => ({ ...f, paymentInterval: v as any }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{INTERVALS.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as any }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Aktiv</SelectItem>
              <SelectItem value="completed">Abgeschlossen</SelectItem>
              <SelectItem value="cancelled">Storniert</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Notizen</Label>
        <Textarea value={form.notes} rows={3}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
      </div>
      <Button onClick={handleSave} disabled={isPending} className="gap-2">
        {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
        {contract ? "Aktualisieren" : "Vertrag anlegen"}
      </Button>
    </div>
  );
}

// ============================================================
// Payments Tab
// ============================================================
function PaymentsTab({ contract }: { contract: any }) {
  const utils = trpc.useUtils();
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: payments = [] } = trpc.legacyContracts.listPayments.useQuery(
    { contractId: contract.id }, { enabled: !!contract }
  );

  const { data: docs = [], refetch: refetchDocs } = trpc.legacyContracts.listDocuments.useQuery(
    { contractId: contract.id }, { enabled: !!contract }
  );

  const addMutation = trpc.legacyContracts.addPayment.useMutation({
    onSuccess: () => { utils.legacyContracts.listPayments.invalidate(); toast.success("Einzahlung gespeichert"); setOpen(false); resetForm(); },
    onError: (e) => toast.error(e.message),
  });

  const extractMutation = trpc.legacyContracts.extractFromDocument.useMutation({
    onSuccess: (data) => {
      if (data.amount) setForm(f => ({ ...f, amount: data.amount! }));
      if (data.date) setForm(f => ({ ...f, paidAt: data.date! }));
      if (data.iban) setForm(f => ({ ...f, bankReference: data.iban! }));
      if (data.txHash) setForm(f => ({ ...f, txHash: data.txHash! }));
      toast.success("KI-Extraktion erfolgreich — bitte Daten prüfen");
    },
    onError: (e) => toast.error(`KI-Extraktion: ${e.message}`),
  });

  const [open, setOpen] = useState(false);
  const EMPTY = { amount: "", currency: contract.currency, paidAt: "", txHash: "", bankReference: "", notes: "" };
  const [form, setForm] = useState(EMPTY);
  const resetForm = () => setForm(EMPTY);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = (reader.result as string).split(",")[1];
      const mediaType = file.type as any;
      extractMutation.mutate({ base64: b64, mediaType });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  if (!contract) {
    return <Alert><AlertDescription>Bitte zuerst einen Vertrag anlegen.</AlertDescription></Alert>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{payments.length} Einzahlung(en) · Gesamt: <strong>{fmt(contract.paidAmount)} {contract.currency}</strong></p>
        <Button onClick={() => { resetForm(); setOpen(true); }} className="gap-2" size="sm">
          <Plus className="w-4 h-4" /> Einzahlung
        </Button>
      </div>

      {payments.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground border rounded-lg">
          <Banknote className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>Noch keine Einzahlungen erfasst.</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Datum</TableHead>
                <TableHead className="text-right">Betrag</TableHead>
                <TableHead>Referenz</TableHead>
                <TableHead>Notiz</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="text-sm">{fmtDate(p.paidAt)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{fmt(p.amount)} {p.currency}</TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">{p.txHash || p.bankReference || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.notes || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Documents Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm font-medium">Dokumente ({docs.length})</p>
        </div>
        <FileUpload
          contractId={contract.id}
          category="payments"
          onUploaded={() => refetchDocs()}
        />
        <DocumentList docs={docs as any} />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="w-5 h-5" /> Einzahlung erfassen
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="flex items-center gap-2 p-3 bg-muted/40 rounded-lg text-sm text-muted-foreground">
              <Upload className="w-4 h-4 shrink-0" />
              <span>Dokument hochladen → KI füllt Felder automatisch vor</span>
              <Button variant="outline" size="sm" className="ml-auto shrink-0 gap-1"
                onClick={() => fileRef.current?.click()}
                disabled={extractMutation.isPending}
              >
                {extractMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                Upload
              </Button>
              <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFile} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Betrag *</Label>
                <Input placeholder="50000" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Währung</Label>
                <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Einzahlungsdatum *</Label>
              <Input type="date" value={form.paidAt} onChange={e => setForm(f => ({ ...f, paidAt: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>TX-Hash (Crypto)</Label>
              <Input placeholder="0x..." value={form.txHash} onChange={e => setForm(f => ({ ...f, txHash: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Bankreferenz / IBAN</Label>
              <Input placeholder="DE89..." value={form.bankReference} onChange={e => setForm(f => ({ ...f, bankReference: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Notizen</Label>
              <Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">Abbrechen</Button>
              <Button
                onClick={() => addMutation.mutate({ contractId: contract.id, ...form })}
                disabled={addMutation.isPending || !form.amount || !form.paidAt}
                className="flex-1 gap-2"
              >
                {addMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Speichern
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// Interest Payments Tab
// ============================================================
function InterestTab({ contract }: { contract: any }) {
  const utils = trpc.useUtils();

  const { data: interestPayments = [] } = trpc.legacyContracts.listInterestPayments.useQuery(
    { contractId: contract.id }, { enabled: !!contract }
  );

  const addMutation = trpc.legacyContracts.addInterestPayment.useMutation({
    onSuccess: () => { utils.legacyContracts.listInterestPayments.invalidate(); toast.success("Zinszahlung gespeichert"); setOpen(false); resetForm(); },
    onError: (e) => toast.error(e.message),
  });

  const [open, setOpen] = useState(false);
  const EMPTY = { amount: "", currency: contract.currency, paidAt: "", paymentMethod: "bank_transfer" as "bank_transfer" | "crypto", txHash: "", notes: "" };
  const [form, setForm] = useState(EMPTY);
  const resetForm = () => setForm(EMPTY);

  const total = interestPayments.reduce((s: number, p: any) => s + parseFloat(p.amount ?? "0"), 0);

  if (!contract) {
    return <Alert><AlertDescription>Bitte zuerst einen Vertrag anlegen.</AlertDescription></Alert>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{interestPayments.length} Zahlung(en) · Gesamt ausgezahlt: <strong>{fmt(total)} {contract.currency}</strong></p>
        <Button onClick={() => { resetForm(); setOpen(true); }} className="gap-2" size="sm">
          <Plus className="w-4 h-4" /> Zinszahlung
        </Button>
      </div>

      {interestPayments.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground border rounded-lg">
          <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>Noch keine Zinszahlungen erfasst.</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Datum</TableHead>
                <TableHead className="text-right">Betrag</TableHead>
                <TableHead>Methode</TableHead>
                <TableHead>TX-Hash</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {interestPayments.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="text-sm">{fmtDate(p.paidAt)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{fmt(p.amount)} {p.currency}</TableCell>
                  <TableCell className="text-xs">{p.paymentMethod === "crypto" ? "Crypto" : "Überweisung"}</TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">{p.txHash || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" /> Zinszahlung erfassen
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Betrag *</Label>
                <Input placeholder="4250" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Währung</Label>
                <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Ausgezahlt am *</Label>
              <Input type="date" value={form.paidAt} onChange={e => setForm(f => ({ ...f, paidAt: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Zahlungsart</Label>
              <Select value={form.paymentMethod} onValueChange={v => setForm(f => ({ ...f, paymentMethod: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Banküberweisung</SelectItem>
                  <SelectItem value="crypto">Crypto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.paymentMethod === "crypto" && (
              <div className="space-y-1.5">
                <Label>TX-Hash</Label>
                <Input placeholder="0x..." value={form.txHash} onChange={e => setForm(f => ({ ...f, txHash: e.target.value }))} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Notizen</Label>
              <Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">Abbrechen</Button>
              <Button
                onClick={() => addMutation.mutate({ contractId: contract.id, ...form })}
                disabled={addMutation.isPending || !form.amount || !form.paidAt}
                className="flex-1 gap-2"
              >
                {addMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Speichern
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// Calculation Tab
// ============================================================
function CalcTab({ contract, userId }: { contract: any; userId: number }) {
  const utils = trpc.useUtils();
  const { data: status, isLoading, refetch } = trpc.legacyContracts.calculateStatus.useQuery(
    { contractId: contract.id }, { enabled: !!contract }
  );

  const createInvitation = trpc.admin.createGeneralInvitation.useMutation({
    onSuccess: (data) => {
      const link = `${BASE_URL}/register?invitation=${data.token}`;
      navigator.clipboard.writeText(link);
      toast.success("Einladungslink kopiert!");
    },
    onError: (e) => toast.error(e.message),
  });

  const { data: userInfo } = trpc.admin.getUsers.useQuery();
  const user = userInfo?.find((u: any) => u.id === userId);

  if (!contract) return <Alert><AlertDescription>Kein Vertrag vorhanden.</AlertDescription></Alert>;

  if (isLoading) return <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded" />)}</div>;

  if (!status) return null;

  const statCards = [
    {
      label: "Aufgelaufene Zinsen", value: `${fmt(status.totalInterestAccrued)} ${contract.currency}`,
      icon: <TrendingUp className="w-4 h-4" />, color: "text-blue-600",
    },
    {
      label: "Bereits ausgezahlt", value: `${fmt(status.totalInterestPaid)} ${contract.currency}`,
      icon: <CheckCircle2 className="w-4 h-4" />, color: "text-green-600",
    },
    {
      label: "Fällige Zinsen", value: `${fmt(status.interestDue)} ${contract.currency}`,
      icon: <Wallet className="w-4 h-4" />, color: status.interestDue > 0 ? "text-orange-600" : "text-muted-foreground",
    },
    {
      label: "Nächste Zinszahlung",
      value: status.nextInterestPayment ? `${fmtDate(status.nextInterestPayment)} · ${fmt(status.nextInterestAmount)} ${contract.currency}` : "—",
      icon: <Calendar className="w-4 h-4" />, color: "text-primary",
    },
    {
      label: "Fehlbetrag", value: `${fmt(status.shortfall)} ${contract.currency}`,
      icon: <AlertTriangle className="w-4 h-4" />, color: status.shortfall > 0 ? "text-red-600" : "text-muted-foreground",
    },
    {
      label: `Strafzinsen (${status.penaltyDaysCount} Tage)`, value: `${fmt(status.totalPenalty)} ${contract.currency}`,
      icon: <AlertTriangle className="w-4 h-4" />, color: status.totalPenalty > 0 ? "text-red-600" : "text-muted-foreground",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {statCards.map((s, i) => (
          <div key={i} className="flex items-start gap-3 p-4 border rounded-lg bg-card">
            <span className={s.color}>{s.icon}</span>
            <div>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`font-semibold ${s.color}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border rounded-lg bg-card flex items-center justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Nettoposition</p>
          <p className={`text-lg font-bold ${status.netPosition >= 0 ? "text-green-600" : "text-red-600"}`}>
            {status.netPosition >= 0 ? "+" : ""}{fmt(status.netPosition)} {contract.currency}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {status.netPosition >= 0 ? "Wir schulden dem Investor Zinsen" : "Investor schuldet Strafzinsen"}
          </p>
        </div>
        <div className="flex gap-2">
          {!status.isInDefault && (
            <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" />Vollständig eingezahlt</Badge>
          )}
          {status.isInDefault && (
            <Badge className="bg-red-100 text-red-800"><AlertTriangle className="w-3 h-3 mr-1" />Fehlbetrag</Badge>
          )}
        </div>
      </div>

      <Button
        variant="outline"
        className="gap-2"
        disabled={createInvitation.isPending}
        onClick={() => {
          if (!user?.email) { toast.error("Keine E-Mail-Adresse für diesen Investor"); return; }
          createInvitation.mutate({ email: user.email, name: user.name ?? undefined, sendEmail: false });
        }}
      >
        {createInvitation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
        Einladungslink generieren & kopieren
      </Button>
    </div>
  );
}

// ============================================================
// Main Page
// ============================================================
export default function BestandskundenDetail() {
  const [, params] = useRoute("/admin/bestandskunden/:userId");
  const userId = parseInt(params?.userId ?? "0", 10);

  const utils = trpc.useUtils();
  const { data: contracts = [], isLoading } = trpc.legacyContracts.list.useQuery();
  const userContracts = contracts.filter((c: any) => c.userId === userId);
  const contract = userContracts[0] ?? null;
  const user = contract?.user ?? null;

  if (!userId) return null;

  return (
    <DashboardLayout variant="admin">
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold">
            {user?.name ?? `Investor #${userId}`}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">{user?.email ?? ""}</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded" />)}</div>
        ) : (
          <Tabs defaultValue="contract">
            <TabsList className="grid grid-cols-4 w-full max-w-lg">
              <TabsTrigger value="contract">Zeichnungsschein</TabsTrigger>
              <TabsTrigger value="payments" disabled={!contract}>Einzahlungen</TabsTrigger>
              <TabsTrigger value="interest" disabled={!contract}>Zinsabschläge</TabsTrigger>
              <TabsTrigger value="calc" disabled={!contract}>Berechnung</TabsTrigger>
            </TabsList>

            <TabsContent value="contract" className="mt-6">
              <ContractTab
                userId={userId}
                contract={contract}
                onSaved={() => utils.legacyContracts.list.invalidate()}
              />
            </TabsContent>

            <TabsContent value="payments" className="mt-6">
              {contract && <PaymentsTab contract={contract} />}
            </TabsContent>

            <TabsContent value="interest" className="mt-6">
              {contract && <InterestTab contract={contract} />}
            </TabsContent>

            <TabsContent value="calc" className="mt-6">
              {contract && <CalcTab contract={contract} userId={userId} />}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
