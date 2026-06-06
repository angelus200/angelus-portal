import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InvestorTaxSettings } from "./InvestorTaxSettings";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { useParams, useLocation, Link } from "wouter";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { 
  ArrowLeft, User, Building2, CreditCard, FileText, Wallet, 
  History, Shield, Edit, Save, X, CheckCircle, Clock, AlertCircle,
  Download, Eye, Trash2, Plus, TrendingUp, Calendar, Mail, Phone,
  MapPin, Briefcase, BadgeCheck, FileWarning, StickyNote, Pin, PinOff,
  MessageSquare, AlertTriangle, Info
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";



export default function InvestorDetails() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const investorId = parseInt(params.id || "0");
  
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, any>>({});
  
  const { data: details, isLoading, refetch } = trpc.investors.getDetails.useQuery(
    { id: investorId },
    { enabled: investorId > 0 }
  );
  
  const updateMutation = trpc.investors.update.useMutation({
    onSuccess: () => {
      toast.success("Investordaten aktualisiert");
      setIsEditing(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const updateKycMutation = trpc.investors.updateKycStatus.useMutation({
    onSuccess: () => {
      toast.success("KYC-Status aktualisiert");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  useEffect(() => {
    if (details?.user) {
      setEditData({
        firstName: details.user.firstName || "",
        lastName: details.user.lastName || "",
        email: details.user.email || "",
        phone: details.user.phone || "",
        dateOfBirth: details.user.dateOfBirth ? new Date(details.user.dateOfBirth).toISOString().split('T')[0] : "",
        taxNumber: details.user.taxNumber || "",
        street: details.user.street || "",
        houseNumber: details.user.houseNumber || "",
        postalCode: details.user.postalCode || "",
        city: details.user.city || "",
        country: details.user.country || "",
        isCompany: details.user.isCompany || false,
        companyName: details.user.companyName || "",
        companyRegisterNumber: details.user.companyRegisterNumber || "",
        companyTaxNumber: details.user.companyTaxNumber || "",
        companyStreet: details.user.companyStreet || "",
        companyHouseNumber: details.user.companyHouseNumber || "",
        companyPostalCode: details.user.companyPostalCode || "",
        companyCity: details.user.companyCity || "",
        companyCountry: details.user.companyCountry || "",
        bankAccountHolder: details.user.bankAccountHolder || "",
        bankIban: details.user.bankIban || "",
        bankBic: details.user.bankBic || "",
        bankName: details.user.bankName || "",
        investorType: details.user.investorType || "professional",
      });
    }
  }, [details]);
  
  const handleSave = () => {
    updateMutation.mutate({
      id: investorId,
      data: editData,
    });
  };
  
  const getKycBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Verifiziert</Badge>;
      case "in_progress":
        return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" />In Bearbeitung</Badge>;
      case "rejected":
        return <Badge className="bg-red-500"><AlertCircle className="w-3 h-3 mr-1" />Abgelehnt</Badge>;
      default:
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Ausstehend</Badge>;
    }
  };
  
  const getSubscriptionStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-500">Bestätigt</Badge>;
      case "paid":
        return <Badge className="bg-blue-500">Bezahlt</Badge>;
      case "cancelled":
        return <Badge className="bg-red-500">Storniert</Badge>;
      default:
        return <Badge variant="outline">Ausstehend</Badge>;
    }
  };
  
  const formatCurrency = (amount: string | number, currency = "EUR") => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("de-DE", { style: "currency", currency }).format(num);
  };
  
  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("de-DE");
  };
  
  const formatDateTime = (date: Date | string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleString("de-DE");
  };
  
  if (isLoading) {
    return (
      <DashboardLayout variant="admin">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }
  
  if (!details) {
    return (
      <DashboardLayout variant="admin">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Investor nicht gefunden</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/admin/investors")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück zur Übersicht
          </Button>
        </div>
      </DashboardLayout>
    );
  }
  
  const { user, subscriptions, wallets, contracts, riskProfile, auditLogs } = details;
  
  // Calculate totals
  const totalInvested = subscriptions.reduce((sum, s) => sum + parseFloat(s.amount || "0"), 0);
  const totalWalletBalance = wallets.reduce((sum, w) => sum + parseFloat(w.balance || "0"), 0);
  
  return (
    <DashboardLayout variant="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate("/admin/investors")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                {user.firstName} {user.lastName || user.name || "Unbekannt"}
              </h1>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getKycBadge(user.kycStatus || "pending")}
            <Badge variant="outline">{user.investorType || "professional"}</Badge>
            <Link href={`/admin/bestandskunden/${investorId}`}>
              <Button variant="outline" size="sm">
                <FileText className="w-4 h-4 mr-2" />
                Bestandsvertrag
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Investiert</p>
                  <p className="text-xl font-bold">{formatCurrency(totalInvested)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Wallet-Guthaben</p>
                  <p className="text-xl font-bold">{formatCurrency(totalWalletBalance)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Zeichnungen</p>
                  <p className="text-xl font-bold">{subscriptions.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Registriert</p>
                  <p className="text-xl font-bold">{formatDate(user.createdAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Tabs */}
        <Tabs defaultValue="personal" className="space-y-4">
          <TabsList className="grid grid-cols-9 w-full max-w-5xl">
            <TabsTrigger value="personal" className="flex items-center gap-1">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Persönlich</span>
            </TabsTrigger>
            <TabsTrigger value="company" className="flex items-center gap-1">
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Firma</span>
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Zeichnungen</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Dokumente</span>
            </TabsTrigger>
            <TabsTrigger value="wallet" className="flex items-center gap-1">
              <Wallet className="w-4 h-4" />
              <span className="hidden sm:inline">Wallet</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-1">
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">Aktivität</span>
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center gap-1">
              <StickyNote className="w-4 h-4" />
              <span className="hidden sm:inline">Notizen</span>
            </TabsTrigger>
            <TabsTrigger value="steuer" className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Steuer</span>
            </TabsTrigger>
            <TabsTrigger value="access" className="flex items-center gap-1">
              <BadgeCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Freischaltungen</span>
            </TabsTrigger>
          </TabsList>
          
          {/* Personal Data Tab */}
          <TabsContent value="personal">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Persönliche Daten</CardTitle>
                  <CardDescription>Kontaktdaten und persönliche Informationen</CardDescription>
                </div>
                {isEditing ? (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                      <X className="w-4 h-4 mr-1" />
                      Abbrechen
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
                      <Save className="w-4 h-4 mr-1" />
                      Speichern
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit className="w-4 h-4 mr-1" />
                    Bearbeiten
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {/* KYC Status */}
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium">KYC-Verifizierung</p>
                      <p className="text-sm text-muted-foreground">Status der Identitätsprüfung</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getKycBadge(user.kycStatus || "pending")}
                    <Select
                      value={user.kycStatus || "pending"}
                      onValueChange={(value) => updateKycMutation.mutate({ userId: user.id, status: value as any })}
                    >
                      <SelectTrigger className="w-40">
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
                </div>
                
                <Separator />
                
                {/* Personal Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-medium flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Kontaktdaten
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Vorname</Label>
                        {isEditing ? (
                          <Input
                            value={editData.firstName}
                            onChange={(e) => setEditData({ ...editData, firstName: e.target.value })}
                          />
                        ) : (
                          <p className="mt-1">{user.firstName || "-"}</p>
                        )}
                      </div>
                      <div>
                        <Label>Nachname</Label>
                        {isEditing ? (
                          <Input
                            value={editData.lastName}
                            onChange={(e) => setEditData({ ...editData, lastName: e.target.value })}
                          />
                        ) : (
                          <p className="mt-1">{user.lastName || "-"}</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label>E-Mail</Label>
                      {isEditing ? (
                        <Input
                          type="email"
                          value={editData.email}
                          onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                        />
                      ) : (
                        <p className="mt-1 flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          {user.email || "-"}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label>Telefon</Label>
                      {isEditing ? (
                        <Input
                          value={editData.phone}
                          onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                        />
                      ) : (
                        <p className="mt-1 flex items-center gap-2">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          {user.phone || "-"}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label>Geburtsdatum</Label>
                      {isEditing ? (
                        <Input
                          type="date"
                          value={editData.dateOfBirth}
                          onChange={(e) => setEditData({ ...editData, dateOfBirth: e.target.value })}
                        />
                      ) : (
                        <p className="mt-1">{formatDate(user.dateOfBirth)}</p>
                      )}
                    </div>
                    <div>
                      <Label>Steuernummer</Label>
                      {isEditing ? (
                        <Input
                          value={editData.taxNumber}
                          onChange={(e) => setEditData({ ...editData, taxNumber: e.target.value })}
                        />
                      ) : (
                        <p className="mt-1">{user.taxNumber || "-"}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="font-medium flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Adresse
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2">
                        <Label>Straße</Label>
                        {isEditing ? (
                          <Input
                            value={editData.street}
                            onChange={(e) => setEditData({ ...editData, street: e.target.value })}
                          />
                        ) : (
                          <p className="mt-1">{user.street || "-"}</p>
                        )}
                      </div>
                      <div>
                        <Label>Hausnr.</Label>
                        {isEditing ? (
                          <Input
                            value={editData.houseNumber}
                            onChange={(e) => setEditData({ ...editData, houseNumber: e.target.value })}
                          />
                        ) : (
                          <p className="mt-1">{user.houseNumber || "-"}</p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>PLZ</Label>
                        {isEditing ? (
                          <Input
                            value={editData.postalCode}
                            onChange={(e) => setEditData({ ...editData, postalCode: e.target.value })}
                          />
                        ) : (
                          <p className="mt-1">{user.postalCode || "-"}</p>
                        )}
                      </div>
                      <div className="col-span-2">
                        <Label>Ort</Label>
                        {isEditing ? (
                          <Input
                            value={editData.city}
                            onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                          />
                        ) : (
                          <p className="mt-1">{user.city || "-"}</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label>Land</Label>
                      {isEditing ? (
                        <Input
                          value={editData.country}
                          onChange={(e) => setEditData({ ...editData, country: e.target.value })}
                        />
                      ) : (
                        <p className="mt-1">{user.country || "-"}</p>
                      )}
                    </div>
                    
                    <Separator className="my-4" />
                    
                    <h3 className="font-medium flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Bankverbindung
                    </h3>
                    <div>
                      <Label>Kontoinhaber</Label>
                      {isEditing ? (
                        <Input
                          value={editData.bankAccountHolder}
                          onChange={(e) => setEditData({ ...editData, bankAccountHolder: e.target.value })}
                        />
                      ) : (
                        <p className="mt-1">{user.bankAccountHolder || "-"}</p>
                      )}
                    </div>
                    <div>
                      <Label>IBAN</Label>
                      {isEditing ? (
                        <Input
                          value={editData.bankIban}
                          onChange={(e) => setEditData({ ...editData, bankIban: e.target.value })}
                        />
                      ) : (
                        <p className="mt-1 font-mono">{user.bankIban || "-"}</p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>BIC</Label>
                        {isEditing ? (
                          <Input
                            value={editData.bankBic}
                            onChange={(e) => setEditData({ ...editData, bankBic: e.target.value })}
                          />
                        ) : (
                          <p className="mt-1 font-mono">{user.bankBic || "-"}</p>
                        )}
                      </div>
                      <div>
                        <Label>Bank</Label>
                        {isEditing ? (
                          <Input
                            value={editData.bankName}
                            onChange={(e) => setEditData({ ...editData, bankName: e.target.value })}
                          />
                        ) : (
                          <p className="mt-1">{user.bankName || "-"}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Company Tab */}
          <TabsContent value="company">
            <Card>
              <CardHeader>
                <CardTitle>Firmendaten</CardTitle>
                <CardDescription>Unternehmensinformationen (falls zutreffend)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium">Firmeninvestor</p>
                      <p className="text-sm text-muted-foreground">Investiert als Unternehmen</p>
                    </div>
                  </div>
                  {isEditing ? (
                    <Switch
                      checked={editData.isCompany}
                      onCheckedChange={(checked) => setEditData({ ...editData, isCompany: checked })}
                    />
                  ) : (
                    <Badge variant={user.isCompany ? "default" : "outline"}>
                      {user.isCompany ? "Ja" : "Nein"}
                    </Badge>
                  )}
                </div>
                
                {(user.isCompany || editData.isCompany) && (
                  <>
                    <Separator />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <Label>Firmenname</Label>
                          {isEditing ? (
                            <Input
                              value={editData.companyName}
                              onChange={(e) => setEditData({ ...editData, companyName: e.target.value })}
                            />
                          ) : (
                            <p className="mt-1">{user.companyName || "-"}</p>
                          )}
                        </div>
                        <div>
                          <Label>Handelsregister-Nr.</Label>
                          {isEditing ? (
                            <Input
                              value={editData.companyRegisterNumber}
                              onChange={(e) => setEditData({ ...editData, companyRegisterNumber: e.target.value })}
                            />
                          ) : (
                            <p className="mt-1">{user.companyRegisterNumber || "-"}</p>
                          )}
                        </div>
                        <div>
                          <Label>USt-IdNr.</Label>
                          {isEditing ? (
                            <Input
                              value={editData.companyTaxNumber}
                              onChange={(e) => setEditData({ ...editData, companyTaxNumber: e.target.value })}
                            />
                          ) : (
                            <p className="mt-1">{user.companyTaxNumber || "-"}</p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="col-span-2">
                            <Label>Straße</Label>
                            {isEditing ? (
                              <Input
                                value={editData.companyStreet}
                                onChange={(e) => setEditData({ ...editData, companyStreet: e.target.value })}
                              />
                            ) : (
                              <p className="mt-1">{user.companyStreet || "-"}</p>
                            )}
                          </div>
                          <div>
                            <Label>Hausnr.</Label>
                            {isEditing ? (
                              <Input
                                value={editData.companyHouseNumber}
                                onChange={(e) => setEditData({ ...editData, companyHouseNumber: e.target.value })}
                              />
                            ) : (
                              <p className="mt-1">{user.companyHouseNumber || "-"}</p>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label>PLZ</Label>
                            {isEditing ? (
                              <Input
                                value={editData.companyPostalCode}
                                onChange={(e) => setEditData({ ...editData, companyPostalCode: e.target.value })}
                              />
                            ) : (
                              <p className="mt-1">{user.companyPostalCode || "-"}</p>
                            )}
                          </div>
                          <div className="col-span-2">
                            <Label>Ort</Label>
                            {isEditing ? (
                              <Input
                                value={editData.companyCity}
                                onChange={(e) => setEditData({ ...editData, companyCity: e.target.value })}
                              />
                            ) : (
                              <p className="mt-1">{user.companyCity || "-"}</p>
                            )}
                          </div>
                        </div>
                        <div>
                          <Label>Land</Label>
                          {isEditing ? (
                            <Input
                              value={editData.companyCountry}
                              onChange={(e) => setEditData({ ...editData, companyCountry: e.target.value })}
                            />
                          ) : (
                            <p className="mt-1">{user.companyCountry || "-"}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Subscriptions Tab */}
          <TabsContent value="subscriptions">
            <Card>
              <CardHeader>
                <CardTitle>Zeichnungen</CardTitle>
                <CardDescription>Alle Anleihenzeichnungen dieses Investors</CardDescription>
              </CardHeader>
              <CardContent>
                {subscriptions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Keine Zeichnungen vorhanden</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Anleihe</TableHead>
                        <TableHead>Betrag</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Datum</TableHead>
                        <TableHead>IP-Adresse</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subscriptions.map((sub: any) => (
                        <TableRow key={sub.id}>
                          <TableCell className="font-medium">
                            Anleihe #{sub.bondId}
                          </TableCell>
                          <TableCell>{formatCurrency(sub.amount, sub.currency)}</TableCell>
                          <TableCell>{getSubscriptionStatusBadge(sub.status)}</TableCell>
                          <TableCell>{formatDateTime(sub.createdAt)}</TableCell>
                          <TableCell className="font-mono text-sm">{sub.ipAddress || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
            
            {/* Risk Profile */}
            {riskProfile && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Risikoprofil
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label>Kategorie</Label>
                      <p className="mt-1">
                        <Badge className={
                          riskProfile.category === "conservative" ? "bg-green-500" :
                          riskProfile.category === "moderate" ? "bg-yellow-500" : "bg-red-500"
                        }>
                          {riskProfile.category === "conservative" ? "Konservativ" :
                           riskProfile.category === "moderate" ? "Moderat" : "Risikoaffin"}
                        </Badge>
                      </p>
                    </div>
                    <div>
                      <Label>Risiko-Score</Label>
                      <p className="mt-1 text-lg font-bold">-</p>
                    </div>
                    <div>
                      <Label>Erstellt</Label>
                      <p className="mt-1">{formatDate(riskProfile.createdAt)}</p>
                    </div>
                    <div>
                      <Label>Aktualisiert</Label>
                      <p className="mt-1">{formatDate(riskProfile.updatedAt)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          {/* Documents Tab */}
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle>Dokumente & Verträge</CardTitle>
                <CardDescription>Alle Verträge und Dokumente dieses Investors</CardDescription>
              </CardHeader>
              <CardContent>
                {contracts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Keine Dokumente vorhanden</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dokument</TableHead>
                        <TableHead>Typ</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Datum</TableHead>
                        <TableHead>Aktionen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contracts.map((contract: any) => (
                        <TableRow key={contract.id}>
                          <TableCell className="font-medium">{contract.name}</TableCell>
                          <TableCell>{contract.type}</TableCell>
                          <TableCell>
                            <Badge variant={contract.status === "signed" ? "default" : "outline"}>
                              {contract.status === "signed" ? "Unterzeichnet" : "Ausstehend"}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(contract.createdAt)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {contract.fileUrl && (
                                <Button variant="outline" size="sm" asChild>
                                  <a href={contract.fileUrl} target="_blank" rel="noopener noreferrer">
                                    <Download className="w-4 h-4" />
                                  </a>
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
          </TabsContent>
          
          {/* Wallet Tab */}
          <TabsContent value="wallet">
            <Card>
              <CardHeader>
                <CardTitle>Wallets & Transaktionen</CardTitle>
                <CardDescription>Alle Wallets und Transaktionen dieses Investors</CardDescription>
              </CardHeader>
              <CardContent>
                {wallets.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Keine Wallets vorhanden</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {wallets.map((wallet: any) => (
                      <Card key={wallet.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant={wallet.currencyType === "fiat" ? "default" : "secondary"}>
                              {wallet.currency}
                            </Badge>
                            <span className="text-sm text-muted-foreground">{wallet.currencyType}</span>
                          </div>
                          <p className="text-2xl font-bold">
                            {wallet.currencyType === "fiat" 
                              ? formatCurrency(wallet.balance, wallet.currency)
                              : `${wallet.balance} ${wallet.currency}`
                            }
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Verfügbar: {wallet.currencyType === "fiat" 
                              ? formatCurrency(wallet.availableBalance, wallet.currency)
                              : `${wallet.availableBalance} ${wallet.currency}`
                            }
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Activity Tab */}
          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Aktivitätsprotokoll</CardTitle>
                <CardDescription>Alle Aktivitäten und Änderungen</CardDescription>
              </CardHeader>
              <CardContent>
                {auditLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Keine Aktivitäten vorhanden</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {auditLogs.map((log: any) => (
                      <div key={log.id} className="flex items-start gap-4 p-4 border rounded-lg">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <History className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium">{log.action}</p>
                            <span className="text-sm text-muted-foreground">{formatDateTime(log.createdAt)}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{log.userEmail}</p>
                          {log.ipAddress && (
                            <p className="text-xs text-muted-foreground font-mono">IP: {log.ipAddress}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Notes Tab */}
          <TabsContent value="notes">
            <NotesTab investorId={investorId} />
          </TabsContent>

          {/* Steuer Tab */}
          <TabsContent value="steuer">
            <Card>
              <CardHeader>
                <CardTitle>Steuerdaten</CardTitle>
                <CardDescription>Kapitalertragsteuer-Einstellungen für diesen Investor</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <InvestorTaxSettings userId={investorId} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Freischaltungen Tab */}
          <TabsContent value="access">
            <FreischaltungenTab userId={investorId} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

// Notes Tab Component
function NotesTab({ investorId }: { investorId: number }) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingNote, setEditingNote] = useState<number | null>(null);
  const [newNote, setNewNote] = useState({
    title: "",
    content: "",
    category: "general" as const,
    priority: "normal" as const,
    isPinned: false,
  });
  const [editData, setEditData] = useState<Record<string, any>>({});
  
  const { data: notes = [], refetch } = trpc.notes.list.useQuery({ investorId });
  
  const createMutation = trpc.notes.create.useMutation({
    onSuccess: () => {
      toast.success("Notiz erstellt");
      setIsCreating(false);
      setNewNote({ title: "", content: "", category: "general", priority: "normal", isPinned: false });
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const updateMutation = trpc.notes.update.useMutation({
    onSuccess: () => {
      toast.success("Notiz aktualisiert");
      setEditingNote(null);
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const deleteMutation = trpc.notes.delete.useMutation({
    onSuccess: () => {
      toast.success("Notiz gelöscht");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const togglePinMutation = trpc.notes.togglePin.useMutation({
    onSuccess: () => refetch(),
    onError: (error) => toast.error(error.message),
  });
  
  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      general: "bg-gray-500",
      kyc: "bg-blue-500",
      compliance: "bg-purple-500",
      payment: "bg-green-500",
      communication: "bg-yellow-500",
      other: "bg-gray-400",
    };
    const labels: Record<string, string> = {
      general: "Allgemein",
      kyc: "KYC",
      compliance: "Compliance",
      payment: "Zahlung",
      communication: "Kommunikation",
      other: "Sonstiges",
    };
    return <Badge className={colors[category]}>{labels[category]}</Badge>;
  };
  
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case "high":
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case "normal":
        return <Info className="w-4 h-4 text-blue-500" />;
      default:
        return <Info className="w-4 h-4 text-gray-400" />;
    }
  };
  
  const formatDateTime = (date: Date | string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleString("de-DE");
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Notizen</CardTitle>
          <CardDescription>Interne Notizen zu diesem Investor</CardDescription>
        </div>
        <Button onClick={() => setIsCreating(true)} disabled={isCreating}>
          <Plus className="w-4 h-4 mr-2" />
          Neue Notiz
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Create Note Form */}
        {isCreating && (
          <Card className="border-primary">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Neue Notiz erstellen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Titel (optional)</Label>
                <Input
                  value={newNote.title}
                  onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                  placeholder="Titel der Notiz..."
                />
              </div>
              <div>
                <Label>Inhalt *</Label>
                <Textarea
                  value={newNote.content}
                  onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                  placeholder="Notizinhalt..."
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Kategorie</Label>
                  <Select
                    value={newNote.category}
                    onValueChange={(v) => setNewNote({ ...newNote, category: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">Allgemein</SelectItem>
                      <SelectItem value="kyc">KYC</SelectItem>
                      <SelectItem value="compliance">Compliance</SelectItem>
                      <SelectItem value="payment">Zahlung</SelectItem>
                      <SelectItem value="communication">Kommunikation</SelectItem>
                      <SelectItem value="other">Sonstiges</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priorität</Label>
                  <Select
                    value={newNote.priority}
                    onValueChange={(v) => setNewNote({ ...newNote, priority: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Niedrig</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">Hoch</SelectItem>
                      <SelectItem value="urgent">Dringend</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={newNote.isPinned}
                  onCheckedChange={(v) => setNewNote({ ...newNote, isPinned: v })}
                />
                <Label>Notiz anheften</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreating(false)}>
                  Abbrechen
                </Button>
                <Button
                  onClick={() => createMutation.mutate({ investorId, ...newNote })}
                  disabled={!newNote.content.trim() || createMutation.isPending}
                >
                  {createMutation.isPending ? "Speichern..." : "Speichern"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Notes List */}
        {notes.length === 0 && !isCreating ? (
          <div className="text-center py-8 text-muted-foreground">
            <StickyNote className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Keine Notizen vorhanden</p>
            <p className="text-sm">Erstellen Sie die erste Notiz zu diesem Investor</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notes.map((note: any) => (
              <Card key={note.id} className={note.isPinned ? "border-primary bg-primary/5" : ""}>
                <CardContent className="pt-4">
                  {editingNote === note.id ? (
                    // Edit Mode
                    <div className="space-y-4">
                      <div>
                        <Label>Titel</Label>
                        <Input
                          value={editData.title || ""}
                          onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Inhalt</Label>
                        <Textarea
                          value={editData.content || ""}
                          onChange={(e) => setEditData({ ...editData, content: e.target.value })}
                          rows={4}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Kategorie</Label>
                          <Select
                            value={editData.category}
                            onValueChange={(v) => setEditData({ ...editData, category: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="general">Allgemein</SelectItem>
                              <SelectItem value="kyc">KYC</SelectItem>
                              <SelectItem value="compliance">Compliance</SelectItem>
                              <SelectItem value="payment">Zahlung</SelectItem>
                              <SelectItem value="communication">Kommunikation</SelectItem>
                              <SelectItem value="other">Sonstiges</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Priorität</Label>
                          <Select
                            value={editData.priority}
                            onValueChange={(v) => setEditData({ ...editData, priority: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Niedrig</SelectItem>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="high">Hoch</SelectItem>
                              <SelectItem value="urgent">Dringend</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setEditingNote(null)}>
                          Abbrechen
                        </Button>
                        <Button
                          onClick={() => updateMutation.mutate({ id: note.id, data: editData })}
                          disabled={updateMutation.isPending}
                        >
                          Speichern
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {note.isPinned && <Pin className="w-4 h-4 text-primary" />}
                          {getPriorityIcon(note.priority)}
                          {note.title && <h4 className="font-semibold">{note.title}</h4>}
                          {getCategoryBadge(note.category)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => togglePinMutation.mutate({ id: note.id })}
                            title={note.isPinned ? "Loslösen" : "Anheften"}
                          >
                            {note.isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingNote(note.id);
                              setEditData({
                                title: note.title || "",
                                content: note.content,
                                category: note.category,
                                priority: note.priority,
                              });
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Notiz löschen?</DialogTitle>
                                <DialogDescription>
                                  Möchten Sie diese Notiz wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <Button variant="outline">Abbrechen</Button>
                                <Button
                                  variant="destructive"
                                  onClick={() => deleteMutation.mutate({ id: note.id })}
                                >
                                  Löschen
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                      <p className="text-sm whitespace-pre-wrap mb-3">{note.content}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Von: {note.authorName}</span>
                        <span>{formatDateTime(note.createdAt)}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Freischaltungen Tab Component (Modell B — Zugang je Emittent)
function FreischaltungenTab({ userId }: { userId: number }) {
  const utils = trpc.useUtils();
  const { data: issuersList } = trpc.issuers.list.useQuery();
  const { data: access, isLoading } = trpc.admin.listUserIssuerAccess.useQuery({ userId });

  const decide = trpc.admin.decideIssuerAccess.useMutation({
    onSuccess: () => {
      utils.admin.listUserIssuerAccess.invalidate({ userId });
      utils.admin.listPendingAccessRequests.invalidate();
      toast.success("Freischaltung aktualisiert");
    },
    onError: (e) => toast.error(e.message),
  });

  const accessByKey = new Map((access || []).map(a => [a.issuerKey, a]));

  const statusBadge = (status?: string) => {
    switch (status) {
      case "approved": return <Badge className="bg-green-500">Freigeschaltet</Badge>;
      case "requested": return <Badge className="bg-yellow-500">Angefragt</Badge>;
      case "blocked": return <Badge className="bg-red-500">Blockiert</Badge>;
      default: return <Badge variant="outline">Kein Zugang</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Freischaltungen je Emittent</CardTitle>
        <CardDescription>
          Steuert, bei welchen Emittenten dieser Investor zeichnen darf (Modell B).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}</div>
        ) : !issuersList || issuersList.length === 0 ? (
          <p className="text-muted-foreground text-sm">Keine aktiven Emittenten vorhanden.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Emittent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {issuersList.map((i) => {
                const a = accessByKey.get(i.issuerKey);
                return (
                  <TableRow key={i.issuerKey}>
                    <TableCell className="font-medium">{i.name}</TableCell>
                    <TableCell>{statusBadge(a?.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          disabled={decide.isPending || a?.status === "approved"}
                          onClick={() => decide.mutate({ userId, issuerKey: i.issuerKey, status: "approved" })}
                        >
                          Freischalten
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          disabled={decide.isPending || a?.status === "blocked"}
                          onClick={() => decide.mutate({ userId, issuerKey: i.issuerKey, status: "blocked" })}
                        >
                          Blockieren
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
