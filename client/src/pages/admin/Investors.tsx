import DashboardLayout from "@/components/DashboardLayout";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Users, Upload, Search, CheckCircle, XCircle, Clock, Eye, Plus, Mail, Lock, User, Building, Phone, MapPin, CreditCard, Calendar, Download, AlertTriangle, FileText, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useState } from "react";
import { toast } from "sonner";

// CSV Template for download
const CSV_TEMPLATE = `email,firstName,lastName,dateOfBirth,taxNumber,phone,street,houseNumber,postalCode,city,country,isCompany,companyName,companyRegisterNumber,companyTaxNumber,bankAccountHolder,bankIban,bankBic,bankName,investorType,kycStatus,subscription_bondName,subscription_amount,subscription_status
max.mustermann@example.com,Max,Mustermann,1980-05-15,CHE-123.456.789,+41 79 123 45 67,Bahnhofstrasse,10,8001,Zürich,Schweiz,false,,,,,Max Mustermann,CH93 0076 2011 6238 5295 7,UBSWCHZH80A,UBS,professional,verified,Angelus Bond 2024,100000,confirmed
firma@example.com,Hans,Meier,1975-03-20,CHE-987.654.321,+41 44 123 45 67,Industriestrasse,25,8005,Zürich,Schweiz,true,Meier AG,CHE-123.456.789 HR,CHE-123.456.789 MWST,Meier AG,CH93 0076 2011 6238 5295 8,CRESCHZZ80A,Credit Suisse,institutional,verified,Angelus Bond 2024,500000,confirmed`;

interface ImportValidationResult {
  row: number;
  email: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface ImportResult {
  email: string;
  success: boolean;
  action: 'created' | 'updated' | 'skipped';
  error?: string;
  subscriptionsImported: number;
}

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

  const validateImport = trpc.investors.validateImport.useMutation();
  
  const importInvestors = trpc.investors.import.useMutation({
    onSuccess: (result) => {
      toast.success(`Import abgeschlossen: ${result.created} erstellt, ${result.updated} aktualisiert, ${result.skipped} übersprungen`);
      refetch();
      setImportStep('results');
      setImportResults(result.results);
    },
    onError: (error: { message: string }) => {
      toast.error("Fehler: " + error.message);
    },
  });

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [kycFilter, setKycFilter] = useState("all");
  const [selectedInvestor, setSelectedInvestor] = useState<any>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  
  // Import wizard state
  const [importStep, setImportStep] = useState<'upload' | 'preview' | 'importing' | 'results'>('upload');
  const [importCsvData, setImportCsvData] = useState("");
  const [parsedInvestors, setParsedInvestors] = useState<any[]>([]);
  const [validationResults, setValidationResults] = useState<ImportValidationResult[]>([]);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  
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
  
  const resetImportWizard = () => {
    setImportStep('upload');
    setImportCsvData("");
    setParsedInvestors([]);
    setValidationResults([]);
    setImportResults([]);
    setUpdateExisting(false);
    setImportProgress(0);
  };

  // Parse CSV data
  const parseCSV = (csvText: string) => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim());
    const investors: any[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const investor: any = {};
      
      headers.forEach((header, index) => {
        const value = values[index] || '';
        if (header === 'isCompany') {
          investor[header] = value.toLowerCase() === 'true';
        } else if (header.startsWith('subscription_')) {
          // Handle subscriptions
          if (!investor.subscriptions) investor.subscriptions = [];
          const subField = header.replace('subscription_', '');
          if (investor.subscriptions.length === 0) {
            investor.subscriptions.push({});
          }
          const lastSub = investor.subscriptions[investor.subscriptions.length - 1];
          if (subField === 'amount') {
            lastSub[subField] = parseFloat(value) || 0;
          } else {
            lastSub[subField] = value;
          }
        } else {
          investor[header] = value;
        }
      });
      
      // Clean up empty subscriptions
      if (investor.subscriptions) {
        investor.subscriptions = investor.subscriptions.filter((s: any) => s.bondName && s.amount > 0);
        if (investor.subscriptions.length === 0) delete investor.subscriptions;
      }
      
      if (investor.email) {
        investors.push(investor);
      }
    }
    
    return investors;
  };

  // Handle CSV file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setImportCsvData(text);
      };
      reader.readAsText(file);
    }
  };

  // Download CSV template
  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'investoren_import_vorlage.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Validate and preview import
  const handleValidateImport = async () => {
    const parsed = parseCSV(importCsvData);
    if (parsed.length === 0) {
      toast.error("Keine gültigen Daten gefunden");
      return;
    }
    
    setParsedInvestors(parsed);
    
    try {
      const result = await validateImport.mutateAsync({ investors: parsed });
      setValidationResults(result.results);
      setImportStep('preview');
    } catch (error) {
      toast.error("Validierung fehlgeschlagen");
    }
  };

  // Execute import
  const handleExecuteImport = async () => {
    setImportStep('importing');
    setImportProgress(0);
    
    try {
      await importInvestors.mutateAsync({
        investors: parsedInvestors,
        updateExisting,
      });
    } catch (error) {
      setImportStep('preview');
    }
  };

  const filteredInvestors = investors?.filter(inv => {
    const matchesSearch = 
      inv.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.company?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesKyc = kycFilter === "all" || inv.kycStatus === kycFilter;
    
    return matchesSearch && matchesKyc;
  });

  const getKycBadge = (status: string | null) => {
    switch (status) {
      case "verified":
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Verifiziert</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Abgelehnt</Badge>;
      case "in_progress":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> In Bearbeitung</Badge>;
      default:
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" /> Ausstehend</Badge>;
    }
  };

  const getInvestorTypeBadge = (type: string | null) => {
    switch (type) {
      case "professional":
        return <Badge variant="outline">Professionell</Badge>;
      case "entrepreneur":
        return <Badge variant="outline">Unternehmer</Badge>;
      case "institutional":
        return <Badge variant="outline">Institutionell</Badge>;
      default:
        return <Badge variant="outline">-</Badge>;
    }
  };

  return (
    <DashboardLayout variant="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Investoren</h1>
            <p className="text-muted-foreground">Verwaltung aller registrierten Anleger</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isImportOpen} onOpenChange={(open) => {
              setIsImportOpen(open);
              if (!open) resetImportWizard();
            }}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="w-4 h-4 mr-2" />
                  Importieren
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle>Investoren importieren</DialogTitle>
                  <DialogDescription>
                    Importieren Sie bestehende Investoren und deren Zeichnungen aus einer CSV-Datei
                  </DialogDescription>
                </DialogHeader>
                
                <div className="flex-1 overflow-auto">
                  {importStep === 'upload' && (
                    <div className="space-y-6 py-4">
                      <Alert>
                        <FileText className="h-4 w-4" />
                        <AlertTitle>CSV-Format</AlertTitle>
                        <AlertDescription>
                          Laden Sie die Vorlage herunter, um das korrekte Format zu sehen. 
                          Die erste Zeile muss die Spaltenüberschriften enthalten.
                        </AlertDescription>
                      </Alert>
                      
                      <div className="flex gap-4">
                        <Button variant="outline" onClick={downloadTemplate}>
                          <Download className="w-4 h-4 mr-2" />
                          Vorlage herunterladen
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>CSV-Datei hochladen</Label>
                        <Input 
                          type="file" 
                          accept=".csv"
                          onChange={handleFileUpload}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Oder CSV-Daten einfügen</Label>
                        <Textarea
                          placeholder="CSV-Daten hier einfügen..."
                          value={importCsvData}
                          onChange={(e) => setImportCsvData(e.target.value)}
                          className="min-h-[200px] font-mono text-sm"
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="updateExisting"
                          checked={updateExisting}
                          onCheckedChange={(checked) => setUpdateExisting(checked as boolean)}
                        />
                        <Label htmlFor="updateExisting">
                          Bestehende Investoren aktualisieren (wenn E-Mail bereits existiert)
                        </Label>
                      </div>
                    </div>
                  )}
                  
                  {importStep === 'preview' && (
                    <div className="space-y-4 py-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h3 className="font-semibold">Validierungsergebnis</h3>
                          <p className="text-sm text-muted-foreground">
                            {validationResults.filter(r => r.valid).length} von {validationResults.length} Einträgen gültig
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="outline" className="bg-green-50">
                            <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
                            {validationResults.filter(r => r.valid).length} Gültig
                          </Badge>
                          <Badge variant="outline" className="bg-red-50">
                            <XCircle className="w-3 h-3 mr-1 text-red-500" />
                            {validationResults.filter(r => !r.valid).length} Ungültig
                          </Badge>
                          <Badge variant="outline" className="bg-yellow-50">
                            <AlertTriangle className="w-3 h-3 mr-1 text-yellow-500" />
                            {validationResults.filter(r => r.warnings.length > 0).length} Warnungen
                          </Badge>
                        </div>
                      </div>
                      
                      <ScrollArea className="h-[400px] border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">Zeile</TableHead>
                              <TableHead>E-Mail</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Fehler / Warnungen</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {validationResults.map((result) => (
                              <TableRow key={result.row} className={!result.valid ? 'bg-red-50' : result.warnings.length > 0 ? 'bg-yellow-50' : ''}>
                                <TableCell>{result.row}</TableCell>
                                <TableCell className="font-mono text-sm">{result.email}</TableCell>
                                <TableCell>
                                  {result.valid ? (
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-red-500" />
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="space-y-1">
                                    {result.errors.map((err, i) => (
                                      <div key={i} className="text-sm text-red-600 flex items-center gap-1">
                                        <XCircle className="w-3 h-3" /> {err}
                                      </div>
                                    ))}
                                    {result.warnings.map((warn, i) => (
                                      <div key={i} className="text-sm text-yellow-600 flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" /> {warn}
                                      </div>
                                    ))}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                      
                      {parsedInvestors.some(inv => inv.subscriptions?.length > 0) && (
                        <Alert>
                          <FileText className="h-4 w-4" />
                          <AlertTitle>Zeichnungen gefunden</AlertTitle>
                          <AlertDescription>
                            {parsedInvestors.reduce((sum, inv) => sum + (inv.subscriptions?.length || 0), 0)} Zeichnungen werden ebenfalls importiert
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                  
                  {importStep === 'importing' && (
                    <div className="space-y-6 py-8">
                      <div className="text-center space-y-4">
                        <RefreshCw className="w-12 h-12 mx-auto animate-spin text-primary" />
                        <h3 className="font-semibold text-lg">Import läuft...</h3>
                        <p className="text-muted-foreground">Bitte warten Sie, während die Daten importiert werden.</p>
                      </div>
                      <Progress value={importProgress} className="w-full" />
                    </div>
                  )}
                  
                  {importStep === 'results' && (
                    <div className="space-y-4 py-4">
                      <Alert className="bg-green-50 border-green-200">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <AlertTitle>Import abgeschlossen</AlertTitle>
                        <AlertDescription>
                          {importResults.filter(r => r.action === 'created').length} erstellt, 
                          {importResults.filter(r => r.action === 'updated').length} aktualisiert, 
                          {importResults.filter(r => r.action === 'skipped').length} übersprungen
                        </AlertDescription>
                      </Alert>
                      
                      <ScrollArea className="h-[400px] border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>E-Mail</TableHead>
                              <TableHead>Aktion</TableHead>
                              <TableHead>Zeichnungen</TableHead>
                              <TableHead>Details</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {importResults.map((result, i) => (
                              <TableRow key={i} className={!result.success ? 'bg-red-50' : ''}>
                                <TableCell className="font-mono text-sm">{result.email}</TableCell>
                                <TableCell>
                                  {result.action === 'created' && <Badge className="bg-green-500">Erstellt</Badge>}
                                  {result.action === 'updated' && <Badge className="bg-blue-500">Aktualisiert</Badge>}
                                  {result.action === 'skipped' && <Badge variant="secondary">Übersprungen</Badge>}
                                </TableCell>
                                <TableCell>{result.subscriptionsImported}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {result.error || '-'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </div>
                  )}
                </div>
                
                <DialogFooter className="border-t pt-4">
                  {importStep === 'upload' && (
                    <>
                      <Button variant="outline" onClick={() => setIsImportOpen(false)}>
                        Abbrechen
                      </Button>
                      <Button 
                        onClick={handleValidateImport}
                        disabled={!importCsvData.trim() || validateImport.isPending}
                      >
                        {validateImport.isPending ? 'Validiere...' : 'Weiter zur Vorschau'}
                      </Button>
                    </>
                  )}
                  {importStep === 'preview' && (
                    <>
                      <Button variant="outline" onClick={() => setImportStep('upload')}>
                        Zurück
                      </Button>
                      <Button 
                        onClick={handleExecuteImport}
                        disabled={validationResults.filter(r => r.valid).length === 0 || importInvestors.isPending}
                      >
                        {validationResults.filter(r => r.valid).length} Investoren importieren
                      </Button>
                    </>
                  )}
                  {importStep === 'results' && (
                    <Button onClick={() => {
                      setIsImportOpen(false);
                      resetImportWizard();
                    }}>
                      Schließen
                    </Button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Neuer Investor
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Neuen Investor anlegen</DialogTitle>
                  <DialogDescription>
                    Erstellen Sie einen neuen Investor mit E-Mail und Passwort
                  </DialogDescription>
                </DialogHeader>
                
                <Tabs defaultValue="personal" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="personal">Persönlich</TabsTrigger>
                    <TabsTrigger value="address">Adresse</TabsTrigger>
                    <TabsTrigger value="company">Firma</TabsTrigger>
                    <TabsTrigger value="bank">Bank</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="personal" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email"><Mail className="w-4 h-4 inline mr-1" />E-Mail *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={createEmail}
                          onChange={(e) => setCreateEmail(e.target.value)}
                          placeholder="investor@example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password"><Lock className="w-4 h-4 inline mr-1" />Passwort *</Label>
                        <Input
                          id="password"
                          type="password"
                          value={createPassword}
                          onChange={(e) => setCreatePassword(e.target.value)}
                          placeholder="Min. 8 Zeichen"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName"><User className="w-4 h-4 inline mr-1" />Vorname *</Label>
                        <Input
                          id="firstName"
                          value={createFirstName}
                          onChange={(e) => setCreateFirstName(e.target.value)}
                          placeholder="Max"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Nachname *</Label>
                        <Input
                          id="lastName"
                          value={createLastName}
                          onChange={(e) => setCreateLastName(e.target.value)}
                          placeholder="Mustermann"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="dateOfBirth"><Calendar className="w-4 h-4 inline mr-1" />Geburtsdatum</Label>
                        <Input
                          id="dateOfBirth"
                          type="date"
                          value={createDateOfBirth}
                          onChange={(e) => setCreateDateOfBirth(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="taxNumber">Steuernummer</Label>
                        <Input
                          id="taxNumber"
                          value={createTaxNumber}
                          onChange={(e) => setCreateTaxNumber(e.target.value)}
                          placeholder="CHE-123.456.789"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone"><Phone className="w-4 h-4 inline mr-1" />Telefon</Label>
                        <Input
                          id="phone"
                          value={createPhone}
                          onChange={(e) => setCreatePhone(e.target.value)}
                          placeholder="+41 79 123 45 67"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="investorType">Investortyp</Label>
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
                      <Label htmlFor="kycStatus">KYC-Status</Label>
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
                  
                  <TabsContent value="address" className="space-y-4 mt-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2 space-y-2">
                        <Label htmlFor="street"><MapPin className="w-4 h-4 inline mr-1" />Straße</Label>
                        <Input
                          id="street"
                          value={createStreet}
                          onChange={(e) => setCreateStreet(e.target.value)}
                          placeholder="Bahnhofstrasse"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="houseNumber">Hausnummer</Label>
                        <Input
                          id="houseNumber"
                          value={createHouseNumber}
                          onChange={(e) => setCreateHouseNumber(e.target.value)}
                          placeholder="10"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="postalCode">PLZ</Label>
                        <Input
                          id="postalCode"
                          value={createPostalCode}
                          onChange={(e) => setCreatePostalCode(e.target.value)}
                          placeholder="8001"
                        />
                      </div>
                      <div className="col-span-2 space-y-2">
                        <Label htmlFor="city">Ort</Label>
                        <Input
                          id="city"
                          value={createCity}
                          onChange={(e) => setCreateCity(e.target.value)}
                          placeholder="Zürich"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="country">Land</Label>
                      <Input
                        id="country"
                        value={createCountry}
                        onChange={(e) => setCreateCountry(e.target.value)}
                        placeholder="Schweiz"
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="company" className="space-y-4 mt-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <Checkbox
                        id="isCompany"
                        checked={createIsCompany}
                        onCheckedChange={(checked) => setCreateIsCompany(checked as boolean)}
                      />
                      <Label htmlFor="isCompany" className="font-medium">
                        <Building className="w-4 h-4 inline mr-1" />
                        Investor ist eine Firma
                      </Label>
                    </div>
                    
                    {createIsCompany && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="companyName">Firmenname</Label>
                          <Input
                            id="companyName"
                            value={createCompanyName}
                            onChange={(e) => setCreateCompanyName(e.target.value)}
                            placeholder="Muster AG"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="companyRegisterNumber">Handelsregisternummer</Label>
                            <Input
                              id="companyRegisterNumber"
                              value={createCompanyRegisterNumber}
                              onChange={(e) => setCreateCompanyRegisterNumber(e.target.value)}
                              placeholder="CHE-123.456.789 HR"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="companyTaxNumber">Firmen-Steuernummer</Label>
                            <Input
                              id="companyTaxNumber"
                              value={createCompanyTaxNumber}
                              onChange={(e) => setCreateCompanyTaxNumber(e.target.value)}
                              placeholder="CHE-123.456.789 MWST"
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4">
                          <div className="col-span-2 space-y-2">
                            <Label htmlFor="companyStreet">Firmenadresse - Straße</Label>
                            <Input
                              id="companyStreet"
                              value={createCompanyStreet}
                              onChange={(e) => setCreateCompanyStreet(e.target.value)}
                              placeholder="Industriestrasse"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="companyHouseNumber">Hausnummer</Label>
                            <Input
                              id="companyHouseNumber"
                              value={createCompanyHouseNumber}
                              onChange={(e) => setCreateCompanyHouseNumber(e.target.value)}
                              placeholder="25"
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="companyPostalCode">PLZ</Label>
                            <Input
                              id="companyPostalCode"
                              value={createCompanyPostalCode}
                              onChange={(e) => setCreateCompanyPostalCode(e.target.value)}
                              placeholder="8005"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="companyCity">Ort</Label>
                            <Input
                              id="companyCity"
                              value={createCompanyCity}
                              onChange={(e) => setCreateCompanyCity(e.target.value)}
                              placeholder="Zürich"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="companyCountry">Land</Label>
                            <Input
                              id="companyCountry"
                              value={createCompanyCountry}
                              onChange={(e) => setCreateCompanyCountry(e.target.value)}
                              placeholder="Schweiz"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="bank" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="bankAccountHolder"><CreditCard className="w-4 h-4 inline mr-1" />Kontoinhaber</Label>
                      <Input
                        id="bankAccountHolder"
                        value={createBankAccountHolder}
                        onChange={(e) => setCreateBankAccountHolder(e.target.value)}
                        placeholder="Max Mustermann"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="bankIban">IBAN</Label>
                      <Input
                        id="bankIban"
                        value={createBankIban}
                        onChange={(e) => setCreateBankIban(e.target.value)}
                        placeholder="CH93 0076 2011 6238 5295 7"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="bankBic">BIC/SWIFT</Label>
                        <Input
                          id="bankBic"
                          value={createBankBic}
                          onChange={(e) => setCreateBankBic(e.target.value)}
                          placeholder="UBSWCHZH80A"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bankName">Bankname</Label>
                        <Input
                          id="bankName"
                          value={createBankName}
                          onChange={(e) => setCreateBankName(e.target.value)}
                          placeholder="UBS"
                        />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
                
                <DialogFooter className="mt-6">
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Abbrechen
                  </Button>
                  <Button 
                    onClick={() => createInvestor.mutate({
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
                    })}
                    disabled={!createEmail || !createPassword || !createFirstName || !createLastName || createInvestor.isPending}
                  >
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
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Suchen nach Name, E-Mail oder Firma..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={kycFilter} onValueChange={setKycFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="KYC-Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Status</SelectItem>
                  <SelectItem value="pending">Ausstehend</SelectItem>
                  <SelectItem value="in_progress">In Bearbeitung</SelectItem>
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
              <Users className="w-5 h-5" />
              Investorenliste
            </CardTitle>
            <CardDescription>
              {filteredInvestors?.length || 0} Investoren gefunden
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Laden...</div>
            ) : (
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
                  {filteredInvestors?.map((investor) => (
                    <TableRow key={investor.id}>
                      <TableCell className="font-medium">
                        {investor.firstName && investor.lastName 
                          ? `${investor.firstName} ${investor.lastName}`
                          : investor.name || '-'}
                        {investor.isCompany && investor.companyName && (
                          <div className="text-sm text-muted-foreground">{investor.companyName}</div>
                        )}
                      </TableCell>
                      <TableCell>{investor.email}</TableCell>
                      <TableCell>{getInvestorTypeBadge(investor.investorType)}</TableCell>
                      <TableCell>{getKycBadge(investor.kycStatus)}</TableCell>
                      <TableCell>
                        {investor.createdAt ? format(new Date(investor.createdAt), "dd.MM.yyyy", { locale: de }) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedInvestor(investor);
                              setIsViewOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Select
                            value={investor.kycStatus || "pending"}
                            onValueChange={(value) => updateKycStatus.mutate({ 
                              userId: investor.id, 
                              status: value as any 
                            })}
                          >
                            <SelectTrigger className="w-[140px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Ausstehend</SelectItem>
                              <SelectItem value="in_progress">In Bearbeitung</SelectItem>
                              <SelectItem value="verified">Verifiziert</SelectItem>
                              <SelectItem value="rejected">Abgelehnt</SelectItem>
                            </SelectContent>
                          </Select>
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
                    <Label className="text-muted-foreground">Name</Label>
                    <p className="font-medium">
                      {selectedInvestor.firstName && selectedInvestor.lastName 
                        ? `${selectedInvestor.firstName} ${selectedInvestor.lastName}`
                        : selectedInvestor.name || '-'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">E-Mail</Label>
                    <p className="font-medium">{selectedInvestor.email}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Telefon</Label>
                    <p className="font-medium">{selectedInvestor.phone || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Geburtsdatum</Label>
                    <p className="font-medium">
                      {selectedInvestor.dateOfBirth 
                        ? format(new Date(selectedInvestor.dateOfBirth), "dd.MM.yyyy", { locale: de })
                        : '-'}
                    </p>
                  </div>
                </div>
                
                <div>
                  <Label className="text-muted-foreground">Adresse</Label>
                  <p className="font-medium">
                    {selectedInvestor.street && selectedInvestor.houseNumber
                      ? `${selectedInvestor.street} ${selectedInvestor.houseNumber}, ${selectedInvestor.postalCode} ${selectedInvestor.city}, ${selectedInvestor.country}`
                      : '-'}
                  </p>
                </div>
                
                {selectedInvestor.isCompany && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Building className="w-4 h-4" /> Firmendaten
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground">Firmenname</Label>
                        <p className="font-medium">{selectedInvestor.companyName || '-'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Handelsregister</Label>
                        <p className="font-medium">{selectedInvestor.companyRegisterNumber || '-'}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" /> Bankverbindung
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">IBAN</Label>
                      <p className="font-medium font-mono">{selectedInvestor.bankIban || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">BIC</Label>
                      <p className="font-medium">{selectedInvestor.bankBic || '-'}</p>
                    </div>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Investortyp</Label>
                      <p>{getInvestorTypeBadge(selectedInvestor.investorType)}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">KYC-Status</Label>
                      <p>{getKycBadge(selectedInvestor.kycStatus)}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Registriert</Label>
                      <p className="font-medium">
                        {selectedInvestor.createdAt 
                          ? format(new Date(selectedInvestor.createdAt), "dd.MM.yyyy HH:mm", { locale: de })
                          : '-'}
                      </p>
                    </div>
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
