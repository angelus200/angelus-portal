import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Plus, Edit2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/RichTextEditor";

export default function ProductsAndContracts() {
  const [activeTab, setActiveTab] = useState("products");
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [editingTemplateIds, setEditingTemplateIds] = useState<number[]>([]);

  const [productForm, setProductForm] = useState({
    name: "",
    bondNumber: "",
    description: "",
    totalVolume: "",
    availableVolume: "",
    minSubscription: "",
    interestRate: "",
    termMonths: "",
    couponFrequency: "annual",
    currency: "EUR",
    issuer: "",
    sector: "",
    status: "draft",
  });

  const [templateForm, setTemplateForm] = useState({
    name: "",
    type: "subscription_agreement" as const,
    content: "",
    validFrom: new Date().toISOString().split("T")[0],
  });

  const { data: products, refetch: refetchProducts } = trpc.bonds.listAll.useQuery();
  const { data: templates } = trpc.contractTemplates.getAll.useQuery();
  const { data: bondTemplates } = trpc.bonds.getBondTemplates.useQuery(
    { bondId: editingProductId || 0 },
    { enabled: !!editingProductId }
  );

  const createProduct = trpc.bonds.create.useMutation({
    onSuccess: () => {
      toast.success("Produkt erstellt");
      setIsProductDialogOpen(false);
      setProductForm({
        name: "",
        bondNumber: "",
        description: "",
        totalVolume: "",
        availableVolume: "",
        minSubscription: "",
        interestRate: "",
        termMonths: "",
        couponFrequency: "annual",
        currency: "EUR",
        issuer: "",
        sector: "",
        status: "draft",
      });
      refetchProducts();
    },
    onError: (error: any) => toast.error(error.message),
  });

  const linkTemplates = trpc.bonds.linkTemplates.useMutation({
    onSuccess: () => {
      toast.success("Vertragsvorlagen verknüpft");
      setIsEditDialogOpen(false);
      refetchProducts();
    },
    onError: (error: any) => toast.error(error.message),
  });

  const createTemplate = trpc.contractTemplates.create.useMutation({
    onSuccess: () => {
      toast.success("Vertragsvorlage erstellt");
      setIsTemplateDialogOpen(false);
      setTemplateForm({
        name: "",
        type: "subscription_agreement",
        content: "",
        validFrom: new Date().toISOString().split("T")[0],
      });
    },
    onError: (error: any) => toast.error(error.message),
  });

  const handleCreateProduct = () => {
    createProduct.mutate({
      name: productForm.name,
      bondNumber: productForm.bondNumber,
      description: productForm.description,
      totalVolume: productForm.totalVolume,
      availableVolume: productForm.availableVolume,
      minSubscription: productForm.minSubscription,
      interestRate: productForm.interestRate,
      termMonths: parseInt(productForm.termMonths),
      couponFrequency: productForm.couponFrequency,
      currency: productForm.currency,
      issuer: productForm.issuer,
      sector: productForm.sector,
      status: productForm.status as any,
    });
  };

  const handleEditProduct = (product: any) => {
    setEditingProductId(product.id);
    setEditingTemplateIds(bondTemplates?.map((t: any) => t.templateId) || []);
    setIsEditDialogOpen(true);
  };

  const handleSaveTemplateLinks = () => {
    if (!editingProductId) return;
    linkTemplates.mutate({
      bondId: editingProductId,
      templateIds: editingTemplateIds,
    });
  };

  const handleCreateTemplate = () => {
    createTemplate.mutate({
      name: templateForm.name,
      type: templateForm.type,
      content: templateForm.content,
      validFrom: templateForm.validFrom,
    });
  };

  return (
    <DashboardLayout variant="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Produkte & Verträge</h1>
          <p className="text-muted-foreground">Verwaltung von Beteiligungen und Vertragsvorlagen</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="products">Produkte (Beteiligungen)</TabsTrigger>
            <TabsTrigger value="templates">Vertragsvorlagen</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-4">
            <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Neues Produkt
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Neues Produkt erstellen</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Name</Label>
                      <Input
                        value={productForm.name}
                        onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                        placeholder="z.B. Angelus Bond 2026"
                      />
                    </div>
                    <div>
                      <Label>Nummer</Label>
                      <Input
                        value={productForm.bondNumber}
                        onChange={(e) => setProductForm({ ...productForm, bondNumber: e.target.value })}
                        placeholder="z.B. AB-2026-001"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Beschreibung</Label>
                    <Textarea
                      value={productForm.description}
                      onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                      placeholder="Produktbeschreibung"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Gesamtvolumen (EUR)</Label>
                      <Input
                        type="number"
                        value={productForm.totalVolume}
                        onChange={(e) => setProductForm({ ...productForm, totalVolume: e.target.value })}
                        placeholder="3000000"
                      />
                    </div>
                    <div>
                      <Label>Verfügbares Volumen (EUR)</Label>
                      <Input
                        type="number"
                        value={productForm.availableVolume}
                        onChange={(e) => setProductForm({ ...productForm, availableVolume: e.target.value })}
                        placeholder="3000000"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Mindestzeichnung (EUR)</Label>
                      <Input
                        type="number"
                        value={productForm.minSubscription}
                        onChange={(e) => setProductForm({ ...productForm, minSubscription: e.target.value })}
                        placeholder="100000"
                      />
                    </div>
                    <div>
                      <Label>Zinssatz (%)</Label>
                      <Input
                        type="number"
                        value={productForm.interestRate}
                        onChange={(e) => setProductForm({ ...productForm, interestRate: e.target.value })}
                        placeholder="12"
                        step="0.01"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Laufzeit (Monate)</Label>
                      <Input
                        type="number"
                        value={productForm.termMonths}
                        onChange={(e) => setProductForm({ ...productForm, termMonths: e.target.value })}
                        placeholder="48"
                      />
                    </div>
                    <div>
                      <Label>Kuponfrequenz</Label>
                      <Select value={productForm.couponFrequency} onValueChange={(v) => setProductForm({ ...productForm, couponFrequency: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="annual">Jährlich</SelectItem>
                          <SelectItem value="semi_annual">Halbjährlich</SelectItem>
                          <SelectItem value="quarterly">Vierteljährlich</SelectItem>
                          <SelectItem value="monthly">Monatlich</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Währung</Label>
                      <Input value={productForm.currency} disabled />
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Select value={productForm.status} onValueChange={(v) => setProductForm({ ...productForm, status: v })}>
                        <SelectTrigger>
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
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Emittent</Label>
                      <Input
                        value={productForm.issuer}
                        onChange={(e) => setProductForm({ ...productForm, issuer: e.target.value })}
                        placeholder="Angelus Group"
                      />
                    </div>
                    <div>
                      <Label>Sektor</Label>
                      <Input
                        value={productForm.sector}
                        onChange={(e) => setProductForm({ ...productForm, sector: e.target.value })}
                        placeholder="Finanzdienstleistungen"
                      />
                    </div>
                  </div>

                  <Button onClick={handleCreateProduct} disabled={createProduct.isPending} className="w-full">
                    {createProduct.isPending ? "Erstelle..." : "Produkt erstellen"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <div className="grid gap-4">
              {products?.map((product: any) => (
                <div key={product.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{product.name}</h3>
                      <p className="text-sm text-muted-foreground">{product.bondNumber}</p>
                      {product.description && <p className="text-sm mt-2">{product.description}</p>}
                    </div>
                    <div className="flex gap-2">
                      <Badge>{product.status}</Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditProduct(product)}
                        className="gap-2"
                      >
                        <Edit2 className="w-4 h-4" />
                        Bearbeiten
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4 mt-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Volumen</span>
                      <p className="font-semibold">{product.totalVolume?.toLocaleString()} EUR</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Zinssatz</span>
                      <p className="font-semibold">{product.interestRate}%</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Laufzeit</span>
                      <p className="font-semibold">{product.termMonths} Monate</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Min. Zeichnung</span>
                      <p className="font-semibold">{product.minSubscription?.toLocaleString()} EUR</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Neue Vorlage
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Vertragsvorlage erstellen</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={templateForm.name}
                      onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                      placeholder="z.B. Zeichnungsvereinbarung"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Typ</Label>
                      <Select value={templateForm.type} onValueChange={(v: any) => setTemplateForm({ ...templateForm, type: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="subscription_agreement">Zeichnungsvereinbarung</SelectItem>
                          <SelectItem value="risk_disclosure">Risikooffenlegung</SelectItem>
                          <SelectItem value="terms_conditions">AGB</SelectItem>
                          <SelectItem value="kyc_aml">KYC/AML-Vereinbarung</SelectItem>
                          <SelectItem value="prospectus">Prospekt</SelectItem>
                          <SelectItem value="other">Sonstiges</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Gültig ab</Label>
                      <Input
                        type="date"
                        value={templateForm.validFrom}
                        onChange={(e) => setTemplateForm({ ...templateForm, validFrom: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Inhalt</Label>
                    <RichTextEditor
                      value={templateForm.content}
                      onChange={(content) => setTemplateForm({ ...templateForm, content })}
                      placeholder="Vertragstext eingeben..."
                    />
                  </div>

                  <Button onClick={handleCreateTemplate} disabled={createTemplate.isPending} className="w-full">
                    {createTemplate.isPending ? "Erstelle..." : "Vorlage erstellen"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <div className="grid gap-4">
              {templates?.map((template: any) => (
                <div key={template.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{template.name}</h3>
                      <p className="text-sm text-muted-foreground">{template.type}</p>
                    </div>
                    <Badge variant="outline">{template.type}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Vertragsvorlagen verknüpfen</DialogTitle>
              <DialogDescription>Wählen Sie die Vertragsvorlagen für dieses Produkt aus</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-3">
                {templates?.map((template: any) => (
                  <div key={template.id} className="flex items-center gap-3 p-3 border rounded">
                    <Checkbox
                      checked={editingTemplateIds.includes(template.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setEditingTemplateIds([...editingTemplateIds, template.id]);
                        } else {
                          setEditingTemplateIds(editingTemplateIds.filter((id) => id !== template.id));
                        }
                      }}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{template.name}</p>
                      <p className="text-sm text-muted-foreground">{template.type}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button onClick={handleSaveTemplateLinks} disabled={linkTemplates.isPending} className="w-full">
                {linkTemplates.isPending ? "Speichern..." : "Vertragsvorlagen verknüpfen"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
