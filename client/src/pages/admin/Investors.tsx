import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { Users, Upload, Search, CheckCircle, XCircle, Clock, Eye, Plus, Mail, Lock, User, Building, Phone, MapPin, CreditCard, Calendar } from "lucide-react";
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
  const [isViewOpen, setIsViewOpen] = useState(false);
  
  // Create investor form state - Personal data
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createFirstName, setCreateFirstName] = useState("");
  const [createLastName, setCreateLastName] = useState("");
  const [createDateOfBirth, setCreateDateOfBirth] = useState("");
  const [createTaxNumber, setCreateTaxNumber] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  
  // Address
  const [createStreet, setCreateStreet] = useState("");
  const [createHouseNumber, setCreateHouseNumber] = useState("");
  const [createPostalCode, setCreatePostalCode] = useState("");
  const [createCity, setCreateCity] = useState("");
  const [createCountry, setCreateCountry] = useState("Schweiz");
  
  // Company data
  const [createIsCompany, setCreateIsCompany] = useState(false);
  const [createCompanyName, setCreateCompanyName] = useState("");
  const [createCompanyRegisterNumber, setCreateCompanyRegisterNumber] = useState("");
  const [createCompanyTaxNumber, setCreateCompanyTaxNumber] = useState("");
  const [createCompanyStreet, setCreateCompanyStreet] = useState("");
  const [createCompanyHouseNumber, setCreateCompanyHouseNumber] = useState("");
  const [createCompanyPostalCode, setCreateCompanyPostalCode] = useState("");
  const [createCompanyCity, setCreateCompanyCity] = useState("");
  const [createCompanyCountry, setCreateCompanyCountry] = useState("Schweiz");
  
  // Bank details
  const [createBankAccountHolder, setCreateBankAccountHolder] = useState("");
  const [createBankIban, setCreateBankIban] = useState("");
  const [createBankBic, setCreateBankBic] = useState("");
  const [createBankName, setCreateBankName] = useState("");
  
  // Other
  const [createInvestorType, setCreateInvestorType] = useState<"professional" | "entrepreneur" | "institutional" | undefined>(undefined);
  const [createKycStatus, setCreateKycStatus] = useState<"pending" | "verified">("pending");
  
  const createInvestor = trpc.investors.create.useMutation({
    onSuccess: () => {
      toast.success("Investor erfolgreich angelegt");
      refetch();
      setIsCreateOpen(false);
      resetCreateForm();
    },
    onError: (error) => {
      toast.error("Fehler: " + error.message);
    },
  });
  
  const resetCreateForm = () => {
    setCreateEmail("");
    setCreatePassword("");
    setCreateFirstName("");
    setCreateLastName("");
    setCreateDateOfBirth("");
    setCreateTaxNumber("");
    setCreatePhone("");
    setCreateStreet("");
    setCreateHouseNumber("");
    setCreatePostalCode("");
    setCreateCity("");
    setCreateCountry("Schweiz");
    setCreateIsCompany(false);
    setCreateCompanyName("");
    setCreateCompanyRegisterNumber("");
    setCreateCompanyTaxNumber("");
    setCreateCompanyStreet("");
    setCreateCompanyHouseNumber("");
    setCreateCompanyPostalCode("");
    setCreateCompanyCity("");
    setCreateCompanyCountry("Schweiz");
    setCreateBankAccountHolder("");
    setCreateBankIban("");
    setCreateBankBic("");
    setCreateBankName("");
    setCreateInvestorType(undefined);
    setCreateKycStatus("pending");
  };
  
  const handleCreateInvestor = () => {
    if (!createEmail || !createPassword || !createFirstName || !createLastName) {
      toast.error("Bitte füllen Sie alle Pflichtfelder aus (E-Mail, Passwort, Vorname, Nachname)");
      return;
    }
    if (createPassword.length < 8) {
      toast.error("Passwort muss mindestens 8 Zeichen lang sein");
      return;
    }
    createInvestor.mutate({
      email: createEmail,
      password: createPassword,
      firstName: createFirstName,
      lastName: createLastName,
      dateOfBirth: createDateOfBirth || undefined,
      taxNumber: createTaxNumber || undefined,
      phone: createPhone || undefined,
      street: createStreet || undefined,
      houseNumber: createHouseNumber || undefined,
      postalCode: createPostalCode || undefined,
      city: createCity || undefined,
      country: createCountry || undefined,
      isCompany: createIsCompany,
      companyName: createCompanyName || undefined,
      companyRegisterNumber: createCompanyRegisterNumber || undefined,
      companyTaxNumber: createCompanyTaxNumber || undefined,
      companyStreet: createCompanyStreet || undefined,
      companyHouseNumber: createCompanyHouseNumber || undefined,
      companyPostalCode: createCompanyPostalCode || undefined,
      companyCity: createCompanyCity || undefined,
      companyCountry: createCompanyCountry || undefined,
      bankAccountHolder: createBankAccountHolder || undefined,
      bankIban: createBankIban || undefined,
      bankBic: createBankBic || undefined,
      bankName: createBankName || undefined,
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

  const getKycBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" /> Verifiziert</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" /> Abgelehnt</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" /> In Prüfung</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" /> Ausstehend</Badge>;
    }
  };

  const handleImport = () => {
    try {
      const lines = importData.trim().split("\n");
      const parsedInvestors = lines.map(line => {
        const [email, name, company, phone] = line.split(",").map(s => s.trim());
        return { email, name, company, phone };
      }).filter(inv => inv.email && inv.name);
      
      if (parsedInvestors.length === 0) {
        toast.error("Keine gültigen Daten gefunden");
        return;
      }
      
      importInvestors.mutate({ investors: parsedInvestors });
    } catch {
      toast.error("Fehler beim Parsen der Daten");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Investoren</h1>
          <p className="text-muted-foreground">Verwalten Sie registrierte Anleger</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Upload className="w-4 h-4" />
                Importieren
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Investoren importieren</DialogTitle>
                <DialogDescription>
                  Fügen Sie CSV-Daten ein (E-Mail, Name, Firma, Telefon)
                </DialogDescription>
              </DialogHeader>
              <textarea
                className="w-full h-40 p-2 border rounded-md font-mono text-sm"
                placeholder="email@example.com, Max Mustermann, Firma GmbH, +41..."
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsImportOpen(false)}>Abbrechen</Button>
                <Button onClick={handleImport} disabled={importInvestors.isPending}>
                  {importInvestors.isPending ? "Importiere..." : "Importieren"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary text-primary-foreground">
                <Plus className="w-4 h-4" />
                Neuer Investor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>Neuen Investor anlegen</DialogTitle>
                <DialogDescription>
                  Erstellen Sie einen neuen Investor-Account mit allen erforderlichen Daten
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh] pr-4">
                <Tabs defaultValue="personal" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="personal">Persönlich</TabsTrigger>
                    <TabsTrigger value="address">Adresse</TabsTrigger>
                    <TabsTrigger value="company">Firma</TabsTrigger>
                    <TabsTrigger value="bank">Bank</TabsTrigger>
                  </TabsList>
                  
                  {/* Personal Data Tab */}
                  <TabsContent value="personal" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
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
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="create-firstName">Vorname *</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="create-firstName"
                            placeholder="Max"
                            value={createFirstName}
                            onChange={(e) => setCreateFirstName(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="create-lastName">Nachname *</Label>
                        <Input
                          id="create-lastName"
                          placeholder="Mustermann"
                          value={createLastName}
                          onChange={(e) => setCreateLastName(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="create-dateOfBirth">Geburtsdatum</Label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="create-dateOfBirth"
                            type="date"
                            value={createDateOfBirth}
                            onChange={(e) => setCreateDateOfBirth(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="create-taxNumber">Steuernummer</Label>
                        <Input
                          id="create-taxNumber"
                          placeholder="CHE-123.456.789"
                          value={createTaxNumber}
                          onChange={(e) => setCreateTaxNumber(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="create-phone">Telefon</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="create-phone"
                            placeholder="+41 79 123 45 67"
                            value={createPhone}
                            onChange={(e) => setCreatePhone(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="create-investorType">Investortyp</Label>
                        <Select value={createInvestorType || ""} onValueChange={(v) => setCreateInvestorType(v as any)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Auswählen..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="professional">Professioneller Anleger</SelectItem>
                            <SelectItem value="entrepreneur">Unternehmer</SelectItem>
                            <SelectItem value="institutional">Institutioneller Anleger</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="create-kycStatus">KYC-Status</Label>
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
                  </TabsContent>
                  
                  {/* Address Tab */}
                  <TabsContent value="address" className="space-y-4 mt-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2 space-y-2">
                        <Label htmlFor="create-street">Straße</Label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="create-street"
                            placeholder="Bahnhofstrasse"
                            value={createStreet}
                            onChange={(e) => setCreateStreet(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="create-houseNumber">Hausnummer</Label>
                        <Input
                          id="create-houseNumber"
                          placeholder="123"
                          value={createHouseNumber}
                          onChange={(e) => setCreateHouseNumber(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="create-postalCode">PLZ</Label>
                        <Input
                          id="create-postalCode"
                          placeholder="8001"
                          value={createPostalCode}
                          onChange={(e) => setCreatePostalCode(e.target.value)}
                        />
                      </div>
                      <div className="col-span-2 space-y-2">
                        <Label htmlFor="create-city">Ort</Label>
                        <Input
                          id="create-city"
                          placeholder="Zürich"
                          value={createCity}
                          onChange={(e) => setCreateCity(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="create-country">Land</Label>
                      <Input
                        id="create-country"
                        placeholder="Schweiz"
                        value={createCountry}
                        onChange={(e) => setCreateCountry(e.target.value)}
                      />
                    </div>
                  </TabsContent>
                  
                  {/* Company Tab */}
                  <TabsContent value="company" className="space-y-4 mt-4">
                    <div className="flex items-center space-x-2 p-4 border rounded-lg bg-muted/50">
                      <Checkbox
                        id="create-isCompany"
                        checked={createIsCompany}
                        onCheckedChange={(checked) => setCreateIsCompany(checked === true)}
                      />
                      <Label htmlFor="create-isCompany" className="font-medium">
                        Investor handelt im Namen einer Firma
                      </Label>
                    </div>
                    
                    {createIsCompany && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="create-companyName">Firmenname</Label>
                            <div className="relative">
                              <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input
                                id="create-companyName"
                                placeholder="Muster AG"
                                value={createCompanyName}
                                onChange={(e) => setCreateCompanyName(e.target.value)}
                                className="pl-10"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="create-companyRegisterNumber">Handelsregisternummer</Label>
                            <Input
                              id="create-companyRegisterNumber"
                              placeholder="CHE-123.456.789"
                              value={createCompanyRegisterNumber}
                              onChange={(e) => setCreateCompanyRegisterNumber(e.target.value)}
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="create-companyTaxNumber">Firmen-Steuernummer</Label>
                          <Input
                            id="create-companyTaxNumber"
                            placeholder="CHE-123.456.789 MWST"
                            value={createCompanyTaxNumber}
                            onChange={(e) => setCreateCompanyTaxNumber(e.target.value)}
                          />
                        </div>
                        
                        <div className="border-t pt-4 mt-4">
                          <h4 className="font-medium mb-4">Firmenadresse</h4>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-2 space-y-2">
                              <Label htmlFor="create-companyStreet">Straße</Label>
                              <Input
                                id="create-companyStreet"
                                placeholder="Industriestrasse"
                                value={createCompanyStreet}
                                onChange={(e) => setCreateCompanyStreet(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="create-companyHouseNumber">Nr.</Label>
                              <Input
                                id="create-companyHouseNumber"
                                placeholder="10"
                                value={createCompanyHouseNumber}
                                onChange={(e) => setCreateCompanyHouseNumber(e.target.value)}
                              />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 mt-4">
                            <div className="space-y-2">
                              <Label htmlFor="create-companyPostalCode">PLZ</Label>
                              <Input
                                id="create-companyPostalCode"
                                placeholder="8001"
                                value={createCompanyPostalCode}
                                onChange={(e) => setCreateCompanyPostalCode(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="create-companyCity">Ort</Label>
                              <Input
                                id="create-companyCity"
                                placeholder="Zürich"
                                value={createCompanyCity}
                                onChange={(e) => setCreateCompanyCity(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="create-companyCountry">Land</Label>
                              <Input
                                id="create-companyCountry"
                                placeholder="Schweiz"
                                value={createCompanyCountry}
                                onChange={(e) => setCreateCompanyCountry(e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </TabsContent>
                  
                  {/* Bank Tab */}
                  <TabsContent value="bank" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="create-bankAccountHolder">Kontoinhaber</Label>
                      <div className="relative">
                        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="create-bankAccountHolder"
                          placeholder="Max Mustermann"
                          value={createBankAccountHolder}
                          onChange={(e) => setCreateBankAccountHolder(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="create-bankIban">IBAN</Label>
                      <Input
                        id="create-bankIban"
                        placeholder="CH93 0076 2011 6238 5295 7"
                        value={createBankIban}
                        onChange={(e) => setCreateBankIban(e.target.value)}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="create-bankBic">BIC/SWIFT</Label>
                        <Input
                          id="create-bankBic"
                          placeholder="UBSWCHZH80A"
                          value={createBankBic}
                          onChange={(e) => setCreateBankBic(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="create-bankName">Bankname</Label>
                        <Input
                          id="create-bankName"
                          placeholder="UBS Switzerland AG"
                          value={createBankName}
                          onChange={(e) => setCreateBankName(e.target.value)}
                        />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </ScrollArea>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => { setIsCreateOpen(false); resetCreateForm(); }}>
                  Abbrechen
                </Button>
                <Button onClick={handleCreateInvestor} disabled={createInvestor.isPending} className="bg-primary text-primary-foreground">
                  {createInvestor.isPending ? "Wird angelegt..." : "Investor anlegen"}
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
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Suche nach Name oder E-Mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={kycFilter} onValueChange={setKycFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="KYC-Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
                <SelectItem value="pending">Ausstehend</SelectItem>
                <SelectItem value="in_progress">In Prüfung</SelectItem>
                <SelectItem value="verified">Verifiziert</SelectItem>
                <SelectItem value="rejected">Abgelehnt</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Investors Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Registrierte Investoren ({filteredInvestors?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Lade Investoren...</div>
          ) : filteredInvestors?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Keine Investoren gefunden</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>E-Mail</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Firma</TableHead>
                  <TableHead>KYC-Status</TableHead>
                  <TableHead>Registriert</TableHead>
                  <TableHead>Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvestors?.map((investor: any) => (
                  <TableRow key={investor.id}>
                    <TableCell className="font-medium">
                      {investor.firstName && investor.lastName 
                        ? `${investor.firstName} ${investor.lastName}`
                        : investor.name || "-"}
                    </TableCell>
                    <TableCell>{investor.email}</TableCell>
                    <TableCell>{investor.phone || "-"}</TableCell>
                    <TableCell>
                      {investor.isCompany ? (
                        <span className="flex items-center gap-1">
                          <Building className="w-3 h-3" />
                          {investor.companyName || "-"}
                        </span>
                      ) : "-"}
                    </TableCell>
                    <TableCell>{getKycBadge(investor.kycStatus)}</TableCell>
                    <TableCell>
                      {investor.createdAt ? format(new Date(investor.createdAt), "dd.MM.yyyy", { locale: de }) : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setSelectedInvestor(investor); setIsViewOpen(true); }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {investor.kycStatus !== "verified" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateKycStatus.mutate({
                              userId: investor.id,
                              status: "verified",
                            })}
                          >
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Investor Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Investor Details</DialogTitle>
          </DialogHeader>
          {selectedInvestor && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-2">Persönliche Daten</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-muted-foreground">Name:</span> {selectedInvestor.firstName} {selectedInvestor.lastName}</p>
                    <p><span className="text-muted-foreground">E-Mail:</span> {selectedInvestor.email}</p>
                    <p><span className="text-muted-foreground">Telefon:</span> {selectedInvestor.phone || "-"}</p>
                    <p><span className="text-muted-foreground">Geburtsdatum:</span> {selectedInvestor.dateOfBirth ? format(new Date(selectedInvestor.dateOfBirth), "dd.MM.yyyy") : "-"}</p>
                    <p><span className="text-muted-foreground">Steuernummer:</span> {selectedInvestor.taxNumber || "-"}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-2">Adresse</h4>
                  <div className="space-y-1 text-sm">
                    <p>{selectedInvestor.street} {selectedInvestor.houseNumber}</p>
                    <p>{selectedInvestor.postalCode} {selectedInvestor.city}</p>
                    <p>{selectedInvestor.country}</p>
                  </div>
                </div>
              </div>
              
              {selectedInvestor.isCompany && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-sm text-muted-foreground mb-2">Firmendaten</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><span className="text-muted-foreground">Firma:</span> {selectedInvestor.companyName}</p>
                      <p><span className="text-muted-foreground">Register:</span> {selectedInvestor.companyRegisterNumber || "-"}</p>
                      <p><span className="text-muted-foreground">Steuernr.:</span> {selectedInvestor.companyTaxNumber || "-"}</p>
                    </div>
                    <div>
                      <p>{selectedInvestor.companyStreet} {selectedInvestor.companyHouseNumber}</p>
                      <p>{selectedInvestor.companyPostalCode} {selectedInvestor.companyCity}</p>
                      <p>{selectedInvestor.companyCountry}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="border-t pt-4">
                <h4 className="font-semibold text-sm text-muted-foreground mb-2">Bankverbindung</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><span className="text-muted-foreground">Kontoinhaber:</span> {selectedInvestor.bankAccountHolder || "-"}</p>
                    <p><span className="text-muted-foreground">IBAN:</span> {selectedInvestor.bankIban || "-"}</p>
                  </div>
                  <div>
                    <p><span className="text-muted-foreground">BIC:</span> {selectedInvestor.bankBic || "-"}</p>
                    <p><span className="text-muted-foreground">Bank:</span> {selectedInvestor.bankName || "-"}</p>
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-semibold text-sm text-muted-foreground mb-2">Status</h4>
                <div className="flex gap-4">
                  {getKycBadge(selectedInvestor.kycStatus)}
                  {selectedInvestor.investorType && (
                    <Badge variant="outline">
                      {selectedInvestor.investorType === "professional" ? "Professioneller Anleger" :
                       selectedInvestor.investorType === "entrepreneur" ? "Unternehmer" : "Institutionell"}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
