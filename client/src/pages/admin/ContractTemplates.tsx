import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit2, Trash2, History } from "lucide-react";
import { trpc } from "@/lib/trpc";

export function ContractTemplates() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "subscription_agreement",
    content: "",
    validFrom: new Date().toISOString().split("T")[0],
  });

  const { data: templates, isLoading, refetch } = trpc.contractTemplates.list.useQuery();
  const { data: history } = trpc.contractTemplates.getHistory.useQuery(
    { templateId: selectedTemplateId || 0 },
    { enabled: !!selectedTemplateId }
  );
  const createMutation = trpc.contractTemplates.create.useMutation();
  const updateMutation = trpc.contractTemplates.update.useMutation();
  const deleteMutation = trpc.contractTemplates.delete.useMutation();

  const handleOpenDialog = (template?: any) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        type: template.type,
        content: template.content,
        validFrom: template.validFrom ? new Date(template.validFrom).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        name: "",
        type: "subscription_agreement",
        content: "",
        validFrom: new Date().toISOString().split("T")[0],
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTemplate(null);
  };

  const handleSave = async () => {
    try {
      if (editingTemplate) {
        await updateMutation.mutateAsync({
          id: editingTemplate.id,
          data: {
            name: formData.name,
            type: formData.type as any,
            content: formData.content,
            validFrom: new Date(formData.validFrom),
          },
        });
      } else {
        await createMutation.mutateAsync({
          name: formData.name,
          type: formData.type as any,
          content: formData.content,
          validFrom: new Date(formData.validFrom),
        });
      }
      refetch();
      handleCloseDialog();
    } catch (error) {
      console.error("Error saving template:", error);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Möchten Sie diese Vertragsvorlage wirklich löschen?")) {
      try {
        await deleteMutation.mutateAsync({ id });
        refetch();
      } catch (error) {
        console.error("Error deleting template:", error);
      }
    }
  };

  const typeLabels: Record<string, string> = {
    subscription_agreement: "Zeichnungsvereinbarung",
    risk_disclosure: "Risikooffenlegung",
    terms_conditions: "AGB",
    kyc_confirmation: "KYC-Bestätigung",
    prospectus_acknowledgment: "Prospekt-Bestätigung",
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Vertragsvorlagen</h1>
            <p className="text-muted-foreground">Verwalten Sie Vertragsvorlagen und deren Versionen</p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="h-4 w-4" />
            Neue Vorlage
          </Button>
        </div>

        <Tabs defaultValue="templates" className="w-full">
          <TabsList>
            <TabsTrigger value="templates">Vorlagen</TabsTrigger>
            <TabsTrigger value="history">Versionshistorie</TabsTrigger>
          </TabsList>

          <TabsContent value="templates">
            <Card>
              <CardHeader>
                <CardTitle>Alle Vertragsvorlagen</CardTitle>
                <CardDescription>Übersicht aller verfügbaren Vertragsvorlagen</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p>Wird geladen...</p>
                ) : templates && templates.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Typ</TableHead>
                          <TableHead>Gültig ab</TableHead>
                          <TableHead>Erstellt</TableHead>
                          <TableHead>Aktionen</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {templates.map((template: any) => (
                          <TableRow key={template.id}>
                            <TableCell className="font-medium">{template.name}</TableCell>
                            <TableCell>{typeLabels[template.type] || template.type}</TableCell>
                            <TableCell>{new Date(template.validFrom).toLocaleDateString("de-DE")}</TableCell>
                            <TableCell>{new Date(template.createdAt).toLocaleDateString("de-DE")}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedTemplateId(template.id);
                                    setShowHistory(true);
                                  }}
                                  className="gap-1"
                                >
                                  <History className="h-4 w-4" />
                                  Versionen
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenDialog(template)}
                                  className="gap-1"
                                >
                                  <Edit2 className="h-4 w-4" />
                                  Bearbeiten
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDelete(template.id)}
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
                  <p className="text-center text-muted-foreground py-8">Keine Vertragsvorlagen vorhanden</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Versionshistorie</CardTitle>
                <CardDescription>
                  {selectedTemplateId ? "Alle Versionen der ausgewählten Vorlage" : "Wählen Sie eine Vorlage aus der Vorlagen-Tabelle"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {history && history.length > 0 ? (
                  <div className="space-y-4">
                    {history.map((version: any, index: number) => (
                      <div key={version.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold">Version {history.length - index}</h3>
                            <p className="text-sm text-muted-foreground">
                              Gültig ab: {new Date(version.validFrom).toLocaleDateString("de-DE")}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Erstellt: {new Date(version.createdAt).toLocaleString("de-DE")}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 p-3 bg-muted rounded text-sm max-h-[200px] overflow-y-auto">
                          <div dangerouslySetInnerHTML={{ __html: version.content }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Keine Versionen vorhanden</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTemplate ? "Vertragsvorlage bearbeiten" : "Neue Vertragsvorlage"}</DialogTitle>
              <DialogDescription>
                {editingTemplate ? "Bearbeiten Sie die Vertragsvorlage" : "Erstellen Sie eine neue Vertragsvorlage"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="z.B. Zeichnungsvereinbarung 2024"
                />
              </div>

              <div>
                <Label htmlFor="type">Typ *</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="subscription_agreement">Zeichnungsvereinbarung</SelectItem>
                    <SelectItem value="risk_disclosure">Risikooffenlegung</SelectItem>
                    <SelectItem value="terms_conditions">AGB</SelectItem>
                    <SelectItem value="kyc_confirmation">KYC-Bestätigung</SelectItem>
                    <SelectItem value="prospectus_acknowledgment">Prospekt-Bestätigung</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="validFrom">Gültig ab *</Label>
                <Input
                  id="validFrom"
                  type="date"
                  value={formData.validFrom}
                  onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="content">Inhalt *</Label>
                <RichTextEditor
                  value={formData.content}
                  onChange={(value) => setFormData({ ...formData, content: value })}
                  placeholder="Geben Sie den Vertragstext ein..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={handleCloseDialog}>
                Abbrechen
              </Button>
              <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                {editingTemplate ? "Aktualisieren" : "Erstellen"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
