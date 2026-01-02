import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Users, Upload, Search, CheckCircle, XCircle, Clock, Eye, Plus, Mail, Lock, User, Building, Phone } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminInvestors() {
  const { data: investors, isLoading, refetch } = trpc.investors.list.useQuery();
  
  const updateKycStatus = trpc.investors.updateKycStatus.useMutation({
    onSuccess: () => {
      toast.success("KYC-Status aktualisiert");
      refetch();
    },
    onError: (error) => {
      toast.error("Fehler: " + error.message);
    },
  });

  const importInvestors = trpc.investors.import.useMutation({
    onSuccess: (result: { imported: number }) => {
      toast.success(`${result.imported} Investoren importiert`);
      refetch();
      setIsImportOpen(false);
    },
    onError: (error: { message: string }) => {
      toast.error("Fehler: " + error.message);
    },
  });

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [kycFilter, setKycFilter] = useState("all");
  const [importData, setImportData] = useState("");
  const [selectedInvestor, setSelectedInvestor] = useState<any>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  // Create investor form state
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createName, setCreateName] = useState("");
  const [createCompany, setCreateCompany] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createInvestorType, setCreateInvestorType] = useState<"professional" | "entrepreneur" | "institutional" | undefined>(undefined);
  const [createKycStatus, setCreateKycStatus] = useState<"pending" | "verified">("pending");
  
  const createInvestor = trpc.investors.create.useMutation({
    onSuccess: () => {
      toast.success("Investor erfolgreich angelegt");
      refetch();
      setIsCreateOpen(false);
      // Reset form
      setCreateEmail("");
      setCreatePassword("");
      setCreateName("");
      setCreateCompany("");
      setCreatePhone("");
      setCreateInvestorType(undefined);
      setCreateKycStatus("pending");
    },
    onError: (error) => {
      toast.error("Fehler: " + error.message);
    },
  });
  
  const handleCreateInvestor = () => {
    if (!createEmail || !createPassword || !createName) {
      toast.error("Bitte füllen Sie alle Pflichtfelder aus");
      return;
    }
    if (createPassword.length < 8) {
      toast.error("Passwort muss mindestens 8 Zeichen lang sein");
      return;
    }
    createInvestor.mutate({
      email: createEmail,
      password: createPassword,
      name: createName,
      company: createCompany || undefined,
      phone: createPhone || undefined,
      investorType: createInvestorType,
      kycStatus: createKycStatus,
    });
  };

  const filteredInvestors = investors?.filter((inv: { name?: string | null; email?: string | null; kycStatus?: string | null }) => {
    const matchesSearch = !searchTerm || 
      inv.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesKyc = kycFilter === "all" || inv.kycStatus === kycFilter;
    return matchesSearch && matchesKyc;
  });

  const getKycBadge = (status: string | null) => {
    const variants: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
      verified: { label: "Verifiziert", className: "bg-green-100 text-green-800", icon: <CheckCircle className="w-3 h-3" /> },
      in_progress: { label: "In Bearbeitung", className: "bg-yellow-100 text-yellow-800", icon: <Clock className="w-3 h-3" /> },
      rejected: { label: "Abgelehnt", className: "bg-red-100 text-red-800", icon: <XCircle className="w-3 h-3" /> },
      pending: { label: "Ausstehend", className: "bg-gray-100 text-gray-800", icon: <Clock className="w-3 h-3" /> },
    };
    const variant = variants[status || "pending"] || variants.pending;
    return (
      <Badge className={`${variant.className} gap-1`}>
        {variant.icon}
        {variant.label}
      </Badge>
    );
  };

  const handleImport = async () => {
    try {
      const data = JSON.parse(importData);
      await importInvestors.mutateAsync({ investors: data });
    } catch (e) {
      toast.error("Ungültiges JSON-Format");
    }
  };

  return (
    <DashboardLayout variant="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Investoren verwalten</h1>
            <p className="text-muted-foreground">
              Übersicht aller registrierten Investoren
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                  <Plus className="w-4 h-4" />
                  Neuer Investor
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Neuen Investor anlegen</DialogTitle>
                  <DialogDescription>
                    Erstellen Sie einen neuen Investor-Account mit E-Mail und Passwort.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="create-name">Name *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="create-name"
                        placeholder="Vollständiger Name"
                        value={createName}
                        onChange={(e) => setCreateName(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="create-email">E-Mail *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="create-email"
                        type="email"
                        placeholder="investor@example.com"
                        value={createEmail}
                        onChange={(e) => setCreateEmail(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="create-password">Passwort *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="create-password"
                        type="password"
                        placeholder="Mindestens 8 Zeichen"
                        value={createPassword}
                        onChange={(e) => setCreatePassword(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="create-company">Unternehmen</Label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="create-company"
                          placeholder="Firma GmbH"
                          value={createCompany}
                          onChange={(e) => setCreateCompany(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="create-phone">Telefon</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="create-phone"
                          placeholder="+41 79 123 4567"
                          value={createPhone}
                          onChange={(e) => setCreatePhone(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Investortyp</Label>
                      <Select value={createInvestorType || "none"} onValueChange={(v) => setCreateInvestorType(v === "none" ? undefined : v as any)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Typ wählen" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nicht angegeben</SelectItem>
                          <SelectItem value="professional">Professionell</SelectItem>
                          <SelectItem value="entrepreneur">Unternehmer</SelectItem>
                          <SelectItem value="institutional">Institutionell</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>KYC-Status</Label>
                      <Select value={createKycStatus} onValueChange={(v) => setCreateKycStatus(v as any)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Ausstehend</SelectItem>
                          <SelectItem value="verified">Verifiziert</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Abbrechen
                  </Button>
                  <Button 
                    onClick={handleCreateInvestor}
                    disabled={createInvestor.isPending}
                    className="bg-primary text-primary-foreground"
                  >
                    {createInvestor.isPending ? "Wird erstellt..." : "Investor anlegen"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Upload className="w-4 h-4" />
                  Importieren
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Investoren importieren</DialogTitle>
                <DialogDescription>
                  Importieren Sie bestehende Zeichner im JSON-Format.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>JSON-Daten</Label>
                  <textarea
                    className="w-full h-64 p-3 border rounded-lg font-mono text-sm"
                    placeholder={`[
  {
    "name": "Max Mustermann",
    "email": "max@example.com",
    "phone": "+41 79 123 4567",
    "address": "Musterstrasse 1, 8000 Zürich",
    "investorType": "professional"
  }
]`}
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                  />
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">Unterstützte Felder:</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• name (erforderlich)</li>
                    <li>• email (erforderlich)</li>
                    <li>• phone (optional)</li>
                    <li>• address (optional)</li>
                    <li>• investorType: "professional" | "entrepreneur" (optional)</li>
                    <li>• kycStatus: "pending" | "verified" (optional)</li>
                  </ul>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsImportOpen(false)}>
                  Abbrechen
                </Button>
                <Button 
                  onClick={handleImport}
                  disabled={!importData || importInvestors.isPending}
                >
                  {importInvestors.isPending ? "Wird importiert..." : "Importieren"}
                </Button>
              </DialogFooter>
            </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Suche nach Name oder E-Mail..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <Select value={kycFilter} onValueChange={setKycFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="KYC-Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Status</SelectItem>
                  <SelectItem value="verified">Verifiziert</SelectItem>
                  <SelectItem value="in_progress">In Bearbeitung</SelectItem>
                  <SelectItem value="pending">Ausstehend</SelectItem>
                  <SelectItem value="rejected">Abgelehnt</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Investors Table */}
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : filteredInvestors && filteredInvestors.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>E-Mail</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead>KYC-Status</TableHead>
                    
                    <TableHead>Registriert</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvestors.map((investor) => (
                    <TableRow key={investor.id}>
                      <TableCell className="font-medium">{investor.name || "-"}</TableCell>
                      <TableCell>{investor.email || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {investor.investorType === "professional" ? "Professionell" :
                           investor.investorType === "entrepreneur" ? "Unternehmer" : "Standard"}
                        </Badge>
                      </TableCell>
                      <TableCell>{getKycBadge(investor.kycStatus)}</TableCell>
                      
                      <TableCell>
                        {investor.createdAt ? format(new Date(investor.createdAt), "dd.MM.yyyy", { locale: de }) : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedInvestor(investor)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {investor.kycStatus !== "verified" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateKycStatus.mutateAsync({ 
                                userId: investor.id, 
                                status: "verified" 
                              })}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Verifizieren
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
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Keine Investoren gefunden</h3>
                <p className="text-muted-foreground">
                  {searchTerm || kycFilter !== "all" 
                    ? "Versuchen Sie andere Suchkriterien."
                    : "Es sind noch keine Investoren registriert."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Investor Detail Dialog */}
        <Dialog open={!!selectedInvestor} onOpenChange={() => setSelectedInvestor(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Investor Details</DialogTitle>
            </DialogHeader>
            {selectedInvestor && (
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Name</Label>
                    <p className="font-medium">{selectedInvestor.name || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">E-Mail</Label>
                    <p className="font-medium">{selectedInvestor.email || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Telefon</Label>
                    <p className="font-medium">{selectedInvestor.phone || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Investortyp</Label>
                    <p className="font-medium">
                      {selectedInvestor.investorType === "professional" ? "Professioneller Investor" :
                       selectedInvestor.investorType === "entrepreneur" ? "Unternehmer" : "Standard"}
                    </p>
                  </div>
                </div>
                
                <div>
                  <Label className="text-muted-foreground">Adresse</Label>
                  <p className="font-medium">{selectedInvestor.address || "-"}</p>
                </div>

                <div className="flex gap-4">
                  <div>
                    <Label className="text-muted-foreground">KYC-Status</Label>
                    <div className="mt-1">{getKycBadge(selectedInvestor.kycStatus)}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Risikoprofil</Label>
                    <p className="font-medium mt-1">
                      {selectedInvestor.riskCategory === "risk_seeking" ? "Risikoaffin" :
                       selectedInvestor.riskCategory === "moderate" ? "Moderat" :
                       selectedInvestor.riskCategory === "conservative" ? "Konservativ" : "-"}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Label className="text-muted-foreground">KYC-Status ändern</Label>
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant={selectedInvestor.kycStatus === "verified" ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        updateKycStatus.mutateAsync({ userId: selectedInvestor.id, status: "verified" });
                        setSelectedInvestor({ ...selectedInvestor, kycStatus: "verified" });
                      }}
                    >
                      Verifiziert
                    </Button>
                    <Button
                      variant={selectedInvestor.kycStatus === "in_progress" ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        updateKycStatus.mutateAsync({ userId: selectedInvestor.id, status: "in_progress" });
                        setSelectedInvestor({ ...selectedInvestor, kycStatus: "in_progress" });
                      }}
                    >
                      In Bearbeitung
                    </Button>
                    <Button
                      variant={selectedInvestor.kycStatus === "rejected" ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        updateKycStatus.mutateAsync({ userId: selectedInvestor.id, status: "rejected" });
                        setSelectedInvestor({ ...selectedInvestor, kycStatus: "rejected" });
                      }}
                    >
                      Abgelehnt
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
