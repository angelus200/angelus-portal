import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, FileText, Package } from "lucide-react";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/RichTextEditor";

export default function ProductsAndContracts() {
  const [activeTab, setActiveTab] = useState("products");
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);

  // Form states
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
    noticePeriod: "",
    noticeDate: "",
    selectedTemplates: [] as number[],
  });

  const [templateForm, setTemplateForm] = useState({
    name: "",
    type: "subscription_agreement",
    content: "",
    validFrom: new Date().toISOString().split("T")[0],
  });

  // Queries
  const { data: products } = trpc.bonds.getAll.useQuery();
  const { data: templates } = trpc.contractTemplates.getAll.useQuery();

  // Mutations
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
        noticePeriod: "",
        noticeDate: "",
        selectedTemplates: [],
      });
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
    if (!productForm.name || !productForm.bondNumber) {
      toast.error("Name und Bondnummer sind erforderlich");
      return;
    }

    createProduct.mutate({
      name: productForm.name,
      bondNumber: productForm.bondNumber,
      description: productForm.description,
      totalVolume: productForm.totalVolume,
      availableVolume: productForm.availableVolume,
      minSubscription: productForm.minSubscription,
      interestRate: parseFloat(productForm.interestRate),
      termMonths: parseInt(productForm.termMonths),
      couponFrequency: productForm.couponFrequency,
      currency: productForm.currency,
      issuer: productForm.issuer,
      sector: productForm.sector,
      status: productForm.status as any,
      noticePeriod: productForm.noticePeriod,
      noticeDate: productForm.noticeDate ? new Date(productForm.noticeDate) : undefined,
    });
  };

  const handleCreateTemplate = () => {
    if (!templateForm.name || !templateForm.content) {
      toast.error("Name und Inhalt sind erforderlich");
      return;
    }

    createTemplate.mutate({
      name: templateForm.name,
      type: templateForm.type,
      content: templateForm.content,
      validFrom: new Date(templateForm.validFrom),
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Produkte & Verträge</h1>
          <p className="text-muted-foreground mt-2">
            Verwalten Sie Anleiheprodukte und Vertragsvorlagen
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="products" className="gap-2">
              <Package className="h-4 w-4" />
              Produkte (Bonds)
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <FileText className="h-4 w-4" />
              Vertragsvorlagen
            </TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={isProductDialogOpen} onValueChange={setIsProductDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Neues Produkt
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Neues Produkt erstellen</DialogTitle>
                    <DialogDescription>
                      Geben Sie die Produktdetails und erforderlichen Vertragsvorlagen ein
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Produktname *</Label>
                        <Input
                          value={productForm.name}
                          onChange={(e) =>
                            setProductForm({ ...productForm, name: e.target.value })
                          }
                          placeholder="z.B. Anleihe 2024"
                        />
                      </div>
                      <div>
                        <Label>Bondnummer *</Label>
                        <Input
                          value={productForm.bondNumber}
                          onChange={(e) =>
                            setProductForm({ ...productForm, bondNumber: e.target.value })
                          }
                          placeholder="z.B. BOND-2024-001"
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Beschreibung</Label>
                      <Textarea
                        value={productForm.description}
                        onChange={(e) =>
                          setProductForm({ ...productForm, description: e.target.value })
                        }
                        placeholder="Produktbeschreibung"
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Gesamtvolumen (EUR)</Label>
                        <Input
                          type="number"
                          value={productForm.totalVolume}
                          onChange={(e) =>
                            setProductForm({ ...productForm, totalVolume: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label>Verfügbares Volumen (EUR)</Label>
                        <Input
                          type="number"
                          value={productForm.availableVolume}
                          onChange={(e) =>
                            setProductForm({ ...productForm, availableVolume: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Mindestanlage (EUR)</Label>
                        <Input
                          type="number"
                          value={productForm.minSubscription}
                          onChange={(e) =>
                            setProductForm({ ...productForm, minSubscription: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label>Zinssatz (%)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={productForm.interestRate}
                          onChange={(e) =>
                            setProductForm({ ...productForm, interestRate: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Laufzeit (Monate)</Label>
                        <Input
                          type="number"
                          value={productForm.termMonths}
                          onChange={(e) =>
                            setProductForm({ ...productForm, termMonths: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label>Coupon-Zahlungsfrequenz</Label>
                        <Select
                          value={productForm.couponFrequency}
                          onValueChange={(value) =>
                            setProductForm({ ...productForm, couponFrequency: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="annual">Jährlich</SelectItem>
                            <SelectItem value="semi-annual">Halbjährlich</SelectItem>
                            <SelectItem value="quarterly">Vierteljährlich</SelectItem>
                            <SelectItem value="monthly">Monatlich</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Emittent</Label>
                        <Input
                          value={productForm.issuer}
                          onChange={(e) =>
                            setProductForm({ ...productForm, issuer: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label>Sektor</Label>
                        <Input
                          value={productForm.sector}
                          onChange={(e) =>
                            setProductForm({ ...productForm, sector: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Kündigungsfrist</Label>
                        <Input
                          value={productForm.noticePeriod}
                          onChange={(e) =>
                            setProductForm({ ...productForm, noticePeriod: e.target.value })
                          }
                          placeholder="z.B. 3 Monate"
                        />
                      </div>
                      <div>
                        <Label>Kündigungstermin</Label>
                        <Input
                          type="date"
                          value={productForm.noticeDate}
                          onChange={(e) =>
                            setProductForm({ ...productForm, noticeDate: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    {/* Template Selection */}
                    <div>
                      <Label className="mb-3 block">Erforderliche Vertragsvorlagen</Label>
                      <div className="space-y-2 border rounded-lg p-3 max-h-40 overflow-y-auto">
                        {templates?.map((template) => (
                          <div key={template.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`template-${template.id}`}
                              checked={productForm.selectedTemplates.includes(template.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setProductForm({
                                    ...productForm,
                                    selectedTemplates: [
                                      ...productForm.selectedTemplates,
                                      template.id,
                                    ],
                                  });
                                } else {
                                  setProductForm({
                                    ...productForm,
                                    selectedTemplates: productForm.selectedTemplates.filter(
                                      (id) => id !== template.id
                                    ),
                                  });
                                }
                              }}
                            />
                            <Label htmlFor={`template-${template.id}`} className="cursor-pointer">
                              {template.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button
                      onClick={handleCreateProduct}
                      disabled={createProduct.isPending}
                      className="w-full"
                    >
                      {createProduct.isPending ? "Wird erstellt..." : "Produkt erstellen"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {products?.map((product) => (
                <Card key={product.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{product.name}</CardTitle>
                        <CardDescription>{product.bondNumber}</CardDescription>
                      </div>
                      <Badge>{product.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-muted-foreground">Zinssatz:</span>
                        <p className="font-medium">{product.interestRate}% p.a.</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Laufzeit:</span>
                        <p className="font-medium">{product.termMonths} Monate</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Neue Vorlage
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Neue Vertragsvorlage erstellen</DialogTitle>
                    <DialogDescription>
                      Erstellen Sie eine neue Vertragsvorlage mit Rich-Text-Editor
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div>
                      <Label>Vorlagenname *</Label>
                      <Input
                        value={templateForm.name}
                        onChange={(e) =>
                          setTemplateForm({ ...templateForm, name: e.target.value })
                        }
                        placeholder="z.B. Zeichnungsvereinbarung"
                      />
                    </div>

                    <div>
                      <Label>Typ</Label>
                      <Select
                        value={templateForm.type}
                        onValueChange={(value) =>
                          setTemplateForm({ ...templateForm, type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="subscription_agreement">
                            Zeichnungsvereinbarung
                          </SelectItem>
                          <SelectItem value="risk_disclosure">Risikooffenlegung</SelectItem>
                          <SelectItem value="terms_conditions">AGB</SelectItem>
                          <SelectItem value="kyc_confirmation">KYC-Bestätigung</SelectItem>
                          <SelectItem value="prospectus_acknowledgment">
                            Prospekt-Bestätigung
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Gültig ab</Label>
                      <Input
                        type="date"
                        value={templateForm.validFrom}
                        onChange={(e) =>
                          setTemplateForm({ ...templateForm, validFrom: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <Label>Vertragstext *</Label>
                      <RichTextEditor
                        content={templateForm.content}
                        onChange={(content) =>
                          setTemplateForm({ ...templateForm, content })
                        }
                      />
                    </div>

                    <Button
                      onClick={handleCreateTemplate}
                      disabled={createTemplate.isPending}
                      className="w-full"
                    >
                      {createTemplate.isPending ? "Wird erstellt..." : "Vorlage erstellen"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {templates?.map((template) => (
                <Card key={template.id}>
                  <CardHeader>
                    <CardTitle>{template.name}</CardTitle>
                    <CardDescription>{template.type}</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <p className="text-muted-foreground">
                      Gültig ab: {new Date(template.validFrom).toLocaleDateString("de-DE")}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
