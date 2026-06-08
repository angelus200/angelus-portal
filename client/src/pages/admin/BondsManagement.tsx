import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

export function BondsManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBond, setEditingBond] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    bondNumber: "",
    totalVolume: "",
    availableVolume: "",
    minSubscription: "",
    interestRate: "",
    termMonths: "",
    cancellationNoticeMonths: "",
    cancellationNoticeDay: "",
    couponPaymentFrequency: "annual",
    currency: "EUR",
    issuer: "",
    issuerKey: "",
    sector: "",
    country: "Switzerland",
    status: "draft",
    riskCategory: "medium",
  });

  const { data: bonds, isLoading, refetch } = trpc.bonds.list.useQuery();
  const { data: issuersList } = trpc.issuers.list.useQuery();
  const createMutation = trpc.bonds.create.useMutation();
  const updateMutation = trpc.bonds.update.useMutation();
  const deleteMutation = trpc.bonds.delete.useMutation();

  const handleOpenDialog = (bond?: any) => {
    if (bond) {
      setEditingBond(bond);
      setFormData({
        name: bond.name,
        description: bond.description || "",
        bondNumber: bond.bondNumber || "",
        totalVolume: bond.totalVolume || "",
        availableVolume: bond.availableVolume || "",
        minSubscription: bond.minSubscription || "",
        interestRate: bond.interestRate || "",
        termMonths: bond.termMonths?.toString() || "",
        cancellationNoticeMonths: "",
        cancellationNoticeDay: "",
        couponPaymentFrequency: bond.couponFrequency || "annual",
        currency: bond.currency || "EUR",
        issuer: bond.issuer || "",
        issuerKey: bond.issuerKey || "",
        sector: bond.sector || "",
        country: bond.country || "Switzerland",
        status: bond.status || "draft",
        riskCategory: bond.riskCategory || "medium",
      });
    } else {
      setEditingBond(null);
      setFormData({
        name: "",
        description: "",
        bondNumber: "",
        totalVolume: "",
        availableVolume: "",
        minSubscription: "",
        interestRate: "",
        termMonths: "",
        cancellationNoticeMonths: "",
        cancellationNoticeDay: "",
        couponPaymentFrequency: "annual",
        currency: "EUR",
        // Emittent wird im Dropdown gewählt (BRAND.key kann ein Marken-Key wie "mybonds" ohne Emittent sein)
        issuer: "",
        issuerKey: "",
        sector: "",
        country: "Switzerland",
        status: "draft",
        riskCategory: "medium",
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingBond(null);
  };

  const handleSave = async () => {
    try {
      if (editingBond) {
        await updateMutation.mutateAsync({
          id: editingBond.id,
          data: {
            name: formData.name,
            description: formData.description,
            status: formData.status as any,
            availableVolume: formData.availableVolume,
          },
        });
      } else {
        await createMutation.mutateAsync({
          name: formData.name,
          bondNumber: formData.bondNumber,
          totalVolume: formData.totalVolume,
          availableVolume: formData.availableVolume,
          interestRate: formData.interestRate,
          termMonths: parseInt(formData.termMonths),
          description: formData.description,
          isin: "",
          minSubscription: formData.minSubscription,
          couponFrequency: formData.couponPaymentFrequency as any,
          currency: formData.currency,
          issuer: formData.issuer,
          issuerKey: formData.issuerKey || "angelus",
          sector: formData.sector,
          status: formData.status as any,
          riskCategory: formData.riskCategory as any,
        });
      }
      refetch();
      handleCloseDialog();
    } catch (error) {
      console.error("Error saving bond:", error);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Möchten Sie diese Beteiligung wirklich löschen?")) {
      try {
        await deleteMutation.mutateAsync({ id });
        refetch();
      } catch (error) {
        console.error("Error deleting bond:", error);
      }
    }
  };

  return (
    <DashboardLayout variant="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Beteiligungen verwalten</h1>
            <p className="text-muted-foreground">Erstellen und bearbeiten Sie Beteiligungen</p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="h-4 w-4" />
            Neue Beteiligung
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Alle Beteiligungen</CardTitle>
            <CardDescription>Übersicht aller verfügbaren Beteiligungen</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p>Wird geladen...</p>
            ) : bonds && bonds.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Nummer</TableHead>
                      <TableHead>Zinssatz</TableHead>
                      <TableHead>Laufzeit (Monate)</TableHead>
                      <TableHead>Mindestanlage</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bonds.map((bond: any) => (
                      <TableRow key={bond.id}>
                        <TableCell className="font-medium">{bond.name}</TableCell>
                        <TableCell>{bond.bondNumber}</TableCell>
                        <TableCell>{bond.interestRate}%</TableCell>
                        <TableCell>{bond.termMonths}</TableCell>
                        <TableCell>{bond.minSubscription} {bond.currency}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            bond.status === 'active' ? 'bg-green-100 text-green-800' :
                            bond.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                            bond.status === 'closed' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {bond.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenDialog(bond)}
                              className="gap-1"
                            >
                              <Edit2 className="h-4 w-4" />
                              Bearbeiten
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(bond.id)}
                              className="gap-1"
                            >
                              <Trash2 className="h-4 w-4" />
                              Löschen
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Keine Beteiligungen vorhanden</p>
            )}
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingBond ? "Beteiligung bearbeiten" : "Neue Beteiligung"}</DialogTitle>
              <DialogDescription>
                {editingBond ? "Bearbeiten Sie die Details der Beteiligung" : "Erstellen Sie eine neue Beteiligung"}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="z.B. Anleihe 2024-01"
                />
              </div>

              <div>
                <Label htmlFor="bondNumber">Beteiligungsnummer *</Label>
                <Input
                  id="bondNumber"
                  value={formData.bondNumber}
                  onChange={(e) => setFormData({ ...formData, bondNumber: e.target.value })}
                  placeholder="z.B. ANG-2024-001"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="description">Beschreibung</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Beschreiben Sie die Beteiligung..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="totalVolume">Gesamtvolumen *</Label>
                <Input
                  id="totalVolume"
                  value={formData.totalVolume}
                  onChange={(e) => setFormData({ ...formData, totalVolume: e.target.value })}
                  placeholder="z.B. 1000000"
                />
              </div>

              <div>
                <Label htmlFor="availableVolume">Verfügbares Volumen *</Label>
                <Input
                  id="availableVolume"
                  value={formData.availableVolume}
                  onChange={(e) => setFormData({ ...formData, availableVolume: e.target.value })}
                  placeholder="z.B. 500000"
                />
              </div>

              <div>
                <Label htmlFor="minSubscription">Mindestanlage *</Label>
                <Input
                  id="minSubscription"
                  value={formData.minSubscription}
                  onChange={(e) => setFormData({ ...formData, minSubscription: e.target.value })}
                  placeholder="z.B. 10000"
                />
              </div>

              <div>
                <Label htmlFor="interestRate">Zinssatz (%) *</Label>
                <Input
                  id="interestRate"
                  value={formData.interestRate}
                  onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                  placeholder="z.B. 5.5"
                />
              </div>

              <div>
                <Label htmlFor="termMonths">Laufzeit (Monate) *</Label>
                <Input
                  id="termMonths"
                  type="number"
                  value={formData.termMonths}
                  onChange={(e) => setFormData({ ...formData, termMonths: e.target.value })}
                  placeholder="z.B. 24"
                />
              </div>

              <div>
                <Label htmlFor="cancellationNoticeMonths">Kündigungsfrist (Monate)</Label>
                <Input
                  id="cancellationNoticeMonths"
                  type="number"
                  value={formData.cancellationNoticeMonths}
                  onChange={(e) => setFormData({ ...formData, cancellationNoticeMonths: e.target.value })}
                  placeholder="z.B. 3"
                />
              </div>

              <div>
                <Label htmlFor="cancellationNoticeDay">Kündigungstermin (Tag des Monats)</Label>
                <Input
                  id="cancellationNoticeDay"
                  type="number"
                  value={formData.cancellationNoticeDay}
                  onChange={(e) => setFormData({ ...formData, cancellationNoticeDay: e.target.value })}
                  placeholder="z.B. 15"
                  min="1"
                  max="31"
                />
              </div>

              <div>
                <Label htmlFor="couponPaymentFrequency">Coupon-Zahlungsfrequenz</Label>
                <Select value={formData.couponPaymentFrequency} onValueChange={(value) => setFormData({ ...formData, couponPaymentFrequency: value })}>
                  <SelectTrigger id="couponPaymentFrequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monatlich</SelectItem>
                    <SelectItem value="quarterly">Quartalsweise</SelectItem>
                    <SelectItem value="semi-annual">Halbjährlich</SelectItem>
                    <SelectItem value="annual">Jährlich</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="currency">Währung</Label>
                <Input
                  id="currency"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  placeholder="z.B. EUR"
                />
              </div>

              <div>
                <Label htmlFor="issuer">Emittent</Label>
                <Select
                  value={formData.issuerKey}
                  onValueChange={(v) => {
                    const issuer = (issuersList || []).find(i => i.issuerKey === v);
                    setFormData({ ...formData, issuerKey: v, issuer: issuer?.name || "" });
                  }}
                >
                  <SelectTrigger id="issuer">
                    <SelectValue placeholder="Emittent wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {(issuersList || []).map(i => (
                      <SelectItem key={i.issuerKey} value={i.issuerKey}>{i.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="sector">Sektor</Label>
                <Input
                  id="sector"
                  value={formData.sector}
                  onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                  placeholder="z.B. Immobilien"
                />
              </div>

              <div>
                <Label htmlFor="country">Land</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="z.B. Switzerland"
                />
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Entwurf</SelectItem>
                    <SelectItem value="active">Aktiv</SelectItem>
                    <SelectItem value="closed">Geschlossen</SelectItem>
                    <SelectItem value="matured">Fällig</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="riskCategory">Risikokategorie</Label>
                <Select value={formData.riskCategory} onValueChange={(value) => setFormData({ ...formData, riskCategory: value })}>
                  <SelectTrigger id="riskCategory">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Niedrig</SelectItem>
                    <SelectItem value="medium">Mittel</SelectItem>
                    <SelectItem value="high">Hoch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={handleCloseDialog}>
                Abbrechen
              </Button>
              <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                {editingBond ? "Aktualisieren" : "Erstellen"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
