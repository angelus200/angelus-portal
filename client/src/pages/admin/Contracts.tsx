import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Plus, FileText, Upload, Download, Eye } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminContracts() {
  const { data: contracts, isLoading, refetch } = trpc.contracts.listAll.useQuery();
  const { data: bonds } = trpc.bonds.list.useQuery();
  
  const uploadContract = trpc.contracts.upload.useMutation({
    onSuccess: () => {
      toast.success("Vertrag erstellt");
      refetch();
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error: { message: string }) => {
      toast.error("Fehler: " + error.message);
    },
  });

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [bondId, setBondId] = useState("");
  const [documentType, setDocumentType] = useState("subscription_agreement");
  const [fileUrl, setFileUrl] = useState("");
  const [version, setVersion] = useState("1.0");

  const resetForm = () => {
    setName("");
    setBondId("");
    setDocumentType("subscription_agreement");
    setFileUrl("");
    setVersion("1.0");
  };

  const handleCreate = async () => {
    if (!name) {
      toast.error("Name ist erforderlich");
      return;
    }
    await uploadContract.mutateAsync({
      name,
      bondId: bondId ? parseInt(bondId) : undefined,
      type: documentType as "subscription_agreement" | "risk_disclosure" | "terms" | "prospectus" | "other",
      fileUrl: fileUrl || "pending",
    });
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      subscription_agreement: "Zeichnungsvereinbarung",
      risk_disclosure: "Risikohinweise",
      terms_conditions: "AGB",
      prospectus: "Prospekt",
      kyc_form: "KYC-Formular",
      other: "Sonstiges",
    };
    return labels[type] || type;
  };

  return (
    <DashboardLayout variant="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Verträge & Dokumente</h1>
            <p className="text-muted-foreground">
              Verwalten Sie Vertragsvorlagen und Dokumente
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Neues Dokument
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Neues Dokument erstellen</DialogTitle>
                <DialogDescription>
                  Erstellen Sie eine neue Vertragsvorlage oder laden Sie ein Dokument hoch.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    placeholder="z.B. Zeichnungsvereinbarung Angelus Bond 2026"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dokumenttyp *</Label>
                  <Select value={documentType} onValueChange={setDocumentType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="subscription_agreement">Zeichnungsvereinbarung</SelectItem>
                      <SelectItem value="risk_disclosure">Risikohinweise</SelectItem>
                      <SelectItem value="terms_conditions">AGB</SelectItem>
                      <SelectItem value="prospectus">Prospekt</SelectItem>
                      <SelectItem value="kyc_form">KYC-Formular</SelectItem>
                      <SelectItem value="other">Sonstiges</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Zugehörige Anleihe (optional)</Label>
                  <Select value={bondId} onValueChange={setBondId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Keine Zuordnung" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Keine Zuordnung</SelectItem>
                      {bonds?.map((bond) => (
                        <SelectItem key={bond.id} value={bond.id.toString()}>
                          {bond.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Dokument-URL (optional)</Label>
                  <Input
                    placeholder="https://..."
                    value={fileUrl}
                    onChange={(e) => setFileUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    URL zum hochgeladenen Dokument (PDF, etc.)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Version</Label>
                  <Input
                    placeholder="1.0"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Abbrechen
                </Button>
                <Button 
                  onClick={handleCreate}
                  disabled={!name || uploadContract.isPending}
                >
                  {uploadContract.isPending ? "Wird erstellt..." : "Dokument erstellen"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Contracts Table */}
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : contracts && contracts.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead>Anleihe</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Erstellt</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.map((contract) => (
                    <TableRow key={contract.id}>
                      <TableCell className="font-medium">{contract.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getDocumentTypeLabel(contract.type)}</Badge>
                      </TableCell>
                      <TableCell>
                        {contract.bondId ? `Bond #${contract.bondId}` : "-"}
                      </TableCell>
                      <TableCell>{contract.version || 1}</TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-800">
                          Aktiv
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(contract.createdAt), "dd.MM.yyyy", { locale: de })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {contract.fileUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(contract.fileUrl!, "_blank")}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Keine Dokumente vorhanden</h3>
                <p className="text-muted-foreground mb-4">
                  Erstellen Sie Ihre erste Vertragsvorlage.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
