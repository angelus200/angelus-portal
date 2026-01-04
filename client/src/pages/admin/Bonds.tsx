import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Plus, Edit, Trash2, TrendingUp, FileText, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminBonds() {
  const { data: bonds, isLoading, refetch } = trpc.bonds.listAll.useQuery();
  
  const createBond = trpc.bonds.create.useMutation({
    onSuccess: () => {
      toast.success("Beteiligung erstellt");
      refetch();
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Fehler: " + error.message);
    },
  });

  const updateBond = trpc.bonds.update.useMutation({
    onSuccess: () => {
      toast.success("Beteiligung aktualisiert");
      refetch();
      setIsEditOpen(false);
    },
    onError: (error) => {
      toast.error("Fehler: " + error.message);
    },
  });

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingBond, setEditingBond] = useState<any>(null);
  const [selectedBondForConsents, setSelectedBondForConsents] = useState<number | null>(null);
  
  // Fetch consents for selected bond
  const { data: consents } = trpc.consents.getByBond.useQuery(
    { bondId: selectedBondForConsents || 0 },
    { enabled: selectedBondForConsents !== null }
  );

  // Form state
  const [name, setName] = useState("");
  const [isin, setIsin] = useState("");
  const [description, setDescription] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [termMonths, setTermMonths] = useState("");
  const [totalVolume, setTotalVolume] = useState("");
  const [minSubscription, setMinSubscription] = useState("100000");
  const [riskCategory, setRiskCategory] = useState("medium");
  const [governingLaw, setGoverningLaw] = useState("Swiss");
  const [status, setStatus] = useState("draft");
  
  // Consent state
  const [requiredConsents, setRequiredConsents] = useState({
    risk_disclosure: true,
    terms_conditions: true,
    subscription_agreement: true,
    kyc_confirmation: false,
    prospectus_acknowledgment: false,
  });

  const resetForm = () => {
    setName("");
    setIsin("");
    setDescription("");
    setInterestRate("");
    setTermMonths("");
    setTotalVolume("");
    setMinSubscription("100000");
    setRiskCategory("medium");
    setGoverningLaw("Swiss");
    setRequiredConsents({
      risk_disclosure: true,
      terms_conditions: true,
      subscription_agreement: true,
      kyc_confirmation: false,
      prospectus_acknowledgment: false,
    });
  };

  const handleCreate = async () => {
    const newBond = await createBond.mutateAsync({
      name,
      isin: isin || undefined,
      description: description || undefined,
      interestRate,
      termMonths: parseInt(termMonths),
      totalVolume,
      availableVolume: totalVolume,
      minSubscription,
      riskCategory: riskCategory as "low" | "medium" | "high",
      governingLaw,
      hasSubordination: true,
      hasInsolvencyReservation: true,
    });
    
    resetForm();
    setIsCreateOpen(false);
  };

  const handleEdit = (bond: any) => {
    setEditingBond(bond);
    setName(bond.name);
    setIsin(bond.isin || "");
    setDescription(bond.description || "");
    setInterestRate(bond.interestRate);
    setTermMonths(bond.termMonths.toString());
    setTotalVolume(bond.totalVolume);
    setMinSubscription(bond.minSubscription);
    setRiskCategory(bond.riskCategory);
    setGoverningLaw(bond.governingLaw);
    setStatus(bond.status);
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingBond) return;
    await updateBond.mutateAsync({
      id: editingBond.id,
      data: {
        name,
        description: description || undefined,
        status: status as "draft" | "active" | "closed" | "matured",
        availableVolume: editingBond.availableVolume,
      },
    });
  };

  return (
    <DashboardLayout variant="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Beteiligungen verwalten</h1>
            <p className="text-muted-foreground">
              Erstellen und verwalten Sie Investitionsangebote
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Neues Angebot
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Neues Angebot erstellen</DialogTitle>
                <DialogDescription>
                  Erstellen Sie ein neues Investitionsangebot für Investoren.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input
                      placeholder="z.B. Angelus Bond 2026"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>ISIN (optional)</Label>
                    <Input
                      placeholder="z.B. CH0123456789"
                      value={isin}
                      onChange={(e) => setIsin(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Beschreibung</Label>
                  <Textarea
                    placeholder="Beschreibung des Angebots..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Zinssatz (% p.a.) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="z.B. 8.5"
                      value={interestRate}
                      onChange={(e) => setInterestRate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Laufzeit (Monate) *</Label>
                    <Input
                      type="number"
                      placeholder="z.B. 36"
                      value={termMonths}
                      onChange={(e) => setTermMonths(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Gesamtvolumen (EUR) *</Label>
                    <Input
                      type="number"
                      placeholder="z.B. 5000000"
                      value={totalVolume}
                      onChange={(e) => setTotalVolume(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Mindestzeichnung (EUR) *</Label>
                    <Input
                      type="number"
                      placeholder="z.B. 100000"
                      value={minSubscription}
                      onChange={(e) => setMinSubscription(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Risikokategorie *</Label>
                    <Select value={riskCategory} onValueChange={setRiskCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Niedrig</SelectItem>
                        <SelectItem value="medium">Mittel</SelectItem>
                        <SelectItem value="high">Hoch</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Anwendbares Recht *</Label>
                    <Select value={governingLaw} onValueChange={setGoverningLaw}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Swiss">Schweizer Recht</SelectItem>
                        <SelectItem value="German">Deutsches Recht</SelectItem>
                        <SelectItem value="Austrian">Österreichisches Recht</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Consent Requirements */}
                <div className="space-y-3 border-t pt-4">
                  <Label className="font-semibold">Erforderliche Zustimmungen</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="risk_disclosure"
                        checked={requiredConsents.risk_disclosure}
                        onChange={(e) => setRequiredConsents({
                          ...requiredConsents,
                          risk_disclosure: e.target.checked
                        })}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <Label htmlFor="risk_disclosure" className="font-normal cursor-pointer">
                        Risikooffenlegung
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="terms_conditions"
                        checked={requiredConsents.terms_conditions}
                        onChange={(e) => setRequiredConsents({
                          ...requiredConsents,
                          terms_conditions: e.target.checked
                        })}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <Label htmlFor="terms_conditions" className="font-normal cursor-pointer">
                        Allgemeine Geschäftsbedingungen
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="subscription_agreement"
                        checked={requiredConsents.subscription_agreement}
                        onChange={(e) => setRequiredConsents({
                          ...requiredConsents,
                          subscription_agreement: e.target.checked
                        })}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <Label htmlFor="subscription_agreement" className="font-normal cursor-pointer">
                        Zeichnungsvereinbarung
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="kyc_confirmation"
                        checked={requiredConsents.kyc_confirmation}
                        onChange={(e) => setRequiredConsents({
                          ...requiredConsents,
                          kyc_confirmation: e.target.checked
                        })}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <Label htmlFor="kyc_confirmation" className="font-normal cursor-pointer">
                        KYC-Bestätigung
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="prospectus_acknowledgment"
                        checked={requiredConsents.prospectus_acknowledgment}
                        onChange={(e) => setRequiredConsents({
                          ...requiredConsents,
                          prospectus_acknowledgment: e.target.checked
                        })}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <Label htmlFor="prospectus_acknowledgment" className="font-normal cursor-pointer">
                        Prospekt-Bestätigung
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Abbrechen
                </Button>
                <Button 
                  onClick={handleCreate}
                  disabled={!name || !interestRate || !termMonths || !totalVolume || createBond.isPending}
                >
                  {createBond.isPending ? "Wird erstellt..." : "Angebot erstellen"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Bonds Table */}
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : bonds && bonds.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>ISIN</TableHead>
                    <TableHead>Zinssatz</TableHead>
                    <TableHead>Laufzeit</TableHead>
                    <TableHead>Volumen</TableHead>
                    <TableHead>Verfügbar</TableHead>
                    <TableHead>Risiko</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Zustimmungen</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bonds.map((bond) => (
                    <TableRow key={bond.id}>
                      <TableCell className="font-medium">{bond.name}</TableCell>
                      <TableCell>{bond.isin || "-"}</TableCell>
                      <TableCell>{bond.interestRate}%</TableCell>
                      <TableCell>{bond.termMonths} Mo.</TableCell>
                      <TableCell>€{parseFloat(bond.totalVolume).toLocaleString("de-DE")}</TableCell>
                      <TableCell className="text-green-600">
                        €{parseFloat(bond.availableVolume).toLocaleString("de-DE")}
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          bond.riskCategory === "high" ? "bg-red-100 text-red-800" :
                          bond.riskCategory === "medium" ? "bg-yellow-100 text-yellow-800" :
                          "bg-green-100 text-green-800"
                        }>
                          {bond.riskCategory === "high" ? "Hoch" :
                           bond.riskCategory === "medium" ? "Mittel" : "Niedrig"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          bond.status === "active" ? "bg-green-100 text-green-800" :
                          bond.status === "closed" ? "bg-gray-100 text-gray-800" :
                          "bg-blue-100 text-blue-800"
                        }>
                          {bond.status === "active" ? "Aktiv" :
                           bond.status === "closed" ? "Geschlossen" : "Entwurf"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedBondForConsents(bond.id)}
                          className="gap-2"
                        >
                          <FileText className="w-4 h-4" />
                          <span className="text-xs">
                            {selectedBondForConsents === bond.id && consents 
                              ? `${consents.length} Typ${consents.length !== 1 ? 'en' : ''}`
                              : 'Zeigen'
                            }
                          </span>
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(bond)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Keine Angebote vorhanden</h3>
                <p className="text-muted-foreground mb-4">
                  Erstellen Sie Ihr erstes Angebot.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Consents Detail Card */}
        {selectedBondForConsents && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Erforderliche Zustimmungen
              </CardTitle>
            </CardHeader>
            <CardContent>
              {consents && consents.length > 0 ? (
                <div className="space-y-3">
                  {consents.map((consent) => {
                    const consentLabels: { [key: string]: string } = {
                      risk_disclosure: "Risikooffenlegung",
                      terms_conditions: "Allgemeine Geschäftsbedingungen",
                      subscription_agreement: "Zeichnungsvereinbarung",
                      kyc_confirmation: "KYC-Bestätigung",
                      prospectus_acknowledgment: "Prospekt-Bestätigung",
                    };
                    
                    return (
                      <div key={consent.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                          <span className="font-medium">{consentLabels[consent.consentType] || consent.consentType}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          Erstellt: {new Date(consent.createdAt).toLocaleDateString("de-DE")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Keine Zustimmungen erforderlich</p>
                </div>
              )}
              <Button 
                variant="outline" 
                className="mt-4 w-full"
                onClick={() => setSelectedBondForConsents(null)}
              >
                Schließen
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Angebot bearbeiten</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>ISIN</Label>
                  <Input
                    value={isin}
                    onChange={(e) => setIsin(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Beschreibung</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Zinssatz (% p.a.)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Laufzeit (Monate)</Label>
                  <Input
                    type="number"
                    value={termMonths}
                    onChange={(e) => setTermMonths(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Gesamtvolumen (EUR)</Label>
                  <Input
                    type="number"
                    value={totalVolume}
                    onChange={(e) => setTotalVolume(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mindestzeichnung (EUR)</Label>
                  <Input
                    type="number"
                    value={minSubscription}
                    onChange={(e) => setMinSubscription(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Entwurf</SelectItem>
                      <SelectItem value="active">Aktiv</SelectItem>
                      <SelectItem value="closed">Geschlossen</SelectItem>
                      <SelectItem value="matured">Ausgelaufen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Risikokategorie</Label>
                  <Select value={riskCategory} onValueChange={setRiskCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Niedrig</SelectItem>
                      <SelectItem value="medium">Mittel</SelectItem>
                      <SelectItem value="high">Hoch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Anwendbares Recht</Label>
                  <Select value={governingLaw} onValueChange={setGoverningLaw}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Swiss">Schweizer Recht</SelectItem>
                      <SelectItem value="German">Deutsches Recht</SelectItem>
                      <SelectItem value="Austrian">Österreichisches Recht</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Abbrechen
              </Button>
              <Button 
                onClick={handleUpdate}
                disabled={updateBond.isPending}
              >
                {updateBond.isPending ? "Wird gespeichert..." : "Speichern"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
