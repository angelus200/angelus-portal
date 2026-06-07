import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { issuerBadgeClass } from "@/lib/issuerBadge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Building2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

const BADGE_COLORS = ["yellow", "purple", "blue", "green", "orange", "red", "teal", "gray"] as const;

const EMPTY_FORM = {
  issuerKey: "",
  name: "",
  shortName: "",
  country: "",
  description: "",
  logoUrl: "",
  badgeColor: "yellow" as (typeof BADGE_COLORS)[number],
  language: "en" as "de" | "en",
  active: true,
};

type FormState = typeof EMPTY_FORM;

export default function IssuersManagement() {
  const utils = trpc.useUtils();
  const { data: issuers, isLoading } = trpc.admin.listIssuers.useQuery();

  const createMutation = trpc.admin.createIssuer.useMutation({
    onSuccess: () => {
      utils.admin.listIssuers.invalidate();
      utils.issuers.list.invalidate();
      toast.success("Emittent angelegt");
      setDialogOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.admin.updateIssuer.useMutation({
    onSuccess: () => {
      utils.admin.listIssuers.invalidate();
      utils.issuers.list.invalidate();
      toast.success("Emittent aktualisiert");
      setDialogOpen(false);
      setEditId(null);
      setForm(EMPTY_FORM);
    },
    onError: (e) => toast.error(e.message),
  });
  const toggleMutation = trpc.admin.updateIssuer.useMutation({
    onSuccess: () => {
      utils.admin.listIssuers.invalidate();
      utils.issuers.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (i: NonNullable<typeof issuers>[number]) => {
    setEditId(i.id);
    setForm({
      issuerKey: i.issuerKey,
      name: i.name,
      shortName: i.shortName ?? "",
      country: i.country ?? "",
      description: i.description ?? "",
      logoUrl: i.logoUrl ?? "",
      badgeColor: (i.badgeColor as FormState["badgeColor"]) ?? "yellow",
      language: (i.language as "de" | "en") ?? "en",
      active: i.active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editId !== null) {
      // issuerKey ist nicht editierbar
      await updateMutation.mutateAsync({
        id: editId,
        name: form.name,
        shortName: form.shortName || undefined,
        country: form.country || undefined,
        description: form.description || undefined,
        logoUrl: form.logoUrl || undefined,
        badgeColor: form.badgeColor,
        language: form.language,
        active: form.active,
      });
    } else {
      await createMutation.mutateAsync({
        issuerKey: form.issuerKey,
        name: form.name,
        shortName: form.shortName || undefined,
        country: form.country || undefined,
        description: form.description || undefined,
        logoUrl: form.logoUrl || undefined,
        badgeColor: form.badgeColor,
        language: form.language,
        active: form.active,
      });
    }
  };

  return (
    <DashboardLayout variant="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Emittenten</h1>
            <p className="text-muted-foreground">
              Verwalten Sie die Emittenten (Brands), unter denen Anleihen ausgegeben werden.
            </p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            Neuer Emittent
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Alle Emittenten
            </CardTitle>
            <CardDescription>
              Nur aktive Emittenten stehen beim Anlegen neuer Anleihen zur Auswahl und liefern Badge-Daten.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}</div>
            ) : !issuers || issuers.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Noch keine Emittenten angelegt.</p>
                <Button onClick={openCreate} className="mt-4 gap-2" variant="outline">
                  <Plus className="w-4 h-4" />
                  Ersten Emittenten anlegen
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Key</TableHead>
                    <TableHead>Land</TableHead>
                    <TableHead>Sprache</TableHead>
                    <TableHead>Badge</TableHead>
                    <TableHead>Aktiv</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {issuers.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">
                        {i.name}
                        {i.shortName && (
                          <span className="block text-xs text-muted-foreground">{i.shortName}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs font-mono bg-muted px-2 py-1 rounded">{i.issuerKey}</code>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{i.country ?? "–"}</TableCell>
                      <TableCell className="text-sm uppercase">{i.language}</TableCell>
                      <TableCell>
                        <Badge className={issuerBadgeClass(i.badgeColor)}>{i.badgeColor}</Badge>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={i.active}
                          onCheckedChange={(checked) => toggleMutation.mutate({ id: i.id, active: checked })}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(i)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
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
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Emittent bearbeiten" : "Neuer Emittent"}</DialogTitle>
            <DialogDescription>
              {editId
                ? "Daten aktualisieren. Der Key ist nach Anlage nicht mehr änderbar."
                : "Neuen Emittenten anlegen. Der Key wird für Anleihen-Zuordnung und Badges genutzt."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Key <span className="text-destructive">*</span></Label>
              <Input
                value={form.issuerKey}
                onChange={e => setForm(p => ({ ...p, issuerKey: e.target.value }))}
                placeholder="z.B. investizo-bond-1"
                className="font-mono text-sm"
                disabled={editId !== null}
              />
              <p className="text-xs text-muted-foreground">Nur Kleinbuchstaben, Zahlen, Bindestriche.</p>
            </div>

            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="z.B. Angelus Alpha Beteiligungen GmbH"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Kurzname <span className="text-xs text-muted-foreground">(optional)</span></Label>
              <Input
                value={form.shortName}
                onChange={e => setForm(p => ({ ...p, shortName: e.target.value }))}
                placeholder="z.B. Angelus Alpha"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Land</Label>
                <Input
                  value={form.country}
                  onChange={e => setForm(p => ({ ...p, country: e.target.value }))}
                  placeholder="z.B. St. Vincent"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Sprache</Label>
                <Select value={form.language} onValueChange={(v) => setForm(p => ({ ...p, language: v as "de" | "en" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="de">Deutsch</SelectItem>
                    <SelectItem value="en">Englisch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Beschreibung (EN, öffentlich) <span className="text-xs text-muted-foreground">(optional)</span></Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Kurzprofil des Emittenten, erscheint auf /bonds"
                rows={3}
                maxLength={1000}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Logo-URL <span className="text-xs text-muted-foreground">(optional)</span></Label>
              <Input
                value={form.logoUrl}
                onChange={e => setForm(p => ({ ...p, logoUrl: e.target.value }))}
                placeholder="z.B. /logo-alpha.png"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Badge-Farbe</Label>
              <Select value={form.badgeColor} onValueChange={(v) => setForm(p => ({ ...p, badgeColor: v as FormState["badgeColor"] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BADGE_COLORS.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="pt-1">
                <Badge className={issuerBadgeClass(form.badgeColor)}>{form.name || "Vorschau"}</Badge>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="issuer-active"
                checked={form.active}
                onCheckedChange={checked => setForm(p => ({ ...p, active: checked }))}
              />
              <Label htmlFor="issuer-active" className="cursor-pointer">Aktiv (für neue Anleihen verfügbar)</Label>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Abbrechen</Button>
              <Button
                type="submit"
                disabled={
                  !form.issuerKey || !form.name ||
                  createMutation.isPending || updateMutation.isPending
                }
              >
                {editId ? "Speichern" : "Anlegen"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
