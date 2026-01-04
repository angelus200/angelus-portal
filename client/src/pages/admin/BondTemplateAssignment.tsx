import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Check } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface SortableTemplateItemProps {
  id: string;
  template: any;
  isRequired: boolean;
  onToggleRequired: (id: number, required: boolean) => void;
  onRemove: (id: number) => void;
}

function SortableTemplateItem({
  id,
  template,
  isRequired,
  onToggleRequired,
  onRemove,
}: SortableTemplateItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const typeLabels: Record<string, string> = {
    subscription_agreement: "Zeichnungsvereinbarung",
    risk_disclosure: "Risikooffenlegung",
    terms_conditions: "AGB",
    kyc_confirmation: "KYC-Bestätigung",
    prospectus_acknowledgment: "Prospekt-Bestätigung",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-4 bg-card border rounded-lg hover:bg-accent/50 transition-colors"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </button>

      <div className="flex-1">
        <h4 className="font-medium">{template.name}</h4>
        <p className="text-sm text-muted-foreground">{typeLabels[template.type] || template.type}</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id={`required-${template.id}`}
            checked={isRequired}
            onCheckedChange={(checked) => onToggleRequired(template.id, checked as boolean)}
          />
          <Label htmlFor={`required-${template.id}`} className="text-sm cursor-pointer">
            Erforderlich
          </Label>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(template.id)}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function BondTemplateAssignment() {
  const [selectedBondId, setSelectedBondId] = useState<number | null>(null);
  const [assignedTemplates, setAssignedTemplates] = useState<any[]>([]);
  const [templateRequirements, setTemplateRequirements] = useState<Record<number, boolean>>({});

  const { data: bonds } = trpc.bonds.list.useQuery();
  const { data: templates } = trpc.contractTemplates.list.useQuery();
  const { data: bondTemplates } = trpc.bondTemplates.getByBond.useQuery(
    { bondId: selectedBondId || 0 },
    { enabled: !!selectedBondId }
  );

  const saveMutation = trpc.bondTemplates.assignTemplates.useMutation();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      distance: 8,
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const availableTemplates = useMemo(() => {
    if (!templates) return [];
    const assignedIds = assignedTemplates.map((t) => t.id);
    return templates.filter((t: any) => !assignedIds.includes(t.id));
  }, [templates, assignedTemplates]);

  const handleSelectBond = (bondId: number) => {
    setSelectedBondId(bondId);
    if (bondTemplates) {
      setAssignedTemplates(bondTemplates.map((bt: any) => bt.contractTemplate));
      const requirements: Record<number, boolean> = {};
      bondTemplates.forEach((bt: any) => {
        requirements[bt.contractTemplate.id] = bt.isRequired;
      });
      setTemplateRequirements(requirements);
    } else {
      setAssignedTemplates([]);
      setTemplateRequirements({});
    }
  };

  const handleAddTemplate = (templateId: number) => {
    const template = templates?.find((t: any) => t.id === templateId);
    if (template) {
      setAssignedTemplates([...assignedTemplates, template]);
      setTemplateRequirements({ ...templateRequirements, [templateId]: false });
    }
  };

  const handleRemoveTemplate = (templateId: number) => {
    setAssignedTemplates(assignedTemplates.filter((t) => t.id !== templateId));
    const newRequirements = { ...templateRequirements };
    delete newRequirements[templateId];
    setTemplateRequirements(newRequirements);
  };

  const handleToggleRequired = (templateId: number, required: boolean) => {
    setTemplateRequirements({ ...templateRequirements, [templateId]: required });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = assignedTemplates.findIndex((t) => t.id === Number(active.id));
      const newIndex = assignedTemplates.findIndex((t) => t.id === Number(over.id));

      if (oldIndex !== -1 && newIndex !== -1) {
        setAssignedTemplates(arrayMove(assignedTemplates, oldIndex, newIndex));
      }
    }
  };

  const handleSave = async () => {
    if (!selectedBondId) return;

    try {
      await saveMutation.mutateAsync({
        bondId: selectedBondId,
        templates: assignedTemplates.map((t, index) => ({
          templateId: t.id,
          order: index,
          isRequired: templateRequirements[t.id] || false,
        })),
      });
      alert("Vertragsvorlagen erfolgreich zugeordnet!");
    } catch (error) {
      console.error("Error saving templates:", error);
      alert("Fehler beim Speichern der Vertragsvorlagen");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Bond-Vertragsvorlagen-Zuordnung</h1>
          <p className="text-muted-foreground">
            Ordnen Sie Vertragsvorlagen zu Bonds zu und definieren Sie deren Reihenfolge
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bond Selection */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Beteiligung auswählen</CardTitle>
              <CardDescription>Wählen Sie eine Beteiligung aus</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedBondId?.toString() || ""} onValueChange={(val) => handleSelectBond(Number(val))}>
                <SelectTrigger>
                  <SelectValue placeholder="Beteiligung auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {bonds?.map((bond: any) => (
                    <SelectItem key={bond.id} value={bond.id.toString()}>
                      {bond.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedBondId && (
                <div className="pt-4 border-t">
                  <h3 className="font-semibold mb-3">Verfügbare Vorlagen</h3>
                  <div className="space-y-2">
                    {availableTemplates.length > 0 ? (
                      availableTemplates.map((template: any) => (
                        <Button
                          key={template.id}
                          variant="outline"
                          className="w-full justify-start text-left"
                          onClick={() => handleAddTemplate(template.id)}
                        >
                          <span className="flex-1 truncate">{template.name}</span>
                          <span className="text-xs">+</span>
                        </Button>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Alle Vorlagen zugeordnet</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Templates Assignment */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Zugeordnete Vertragsvorlagen</CardTitle>
              <CardDescription>
                {selectedBondId
                  ? "Ziehen Sie die Vorlagen, um die Reihenfolge zu ändern"
                  : "Wählen Sie eine Beteiligung aus"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedBondId ? (
                <>
                  {assignedTemplates.length > 0 ? (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={assignedTemplates.map((t) => t.id.toString())}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-3">
                          {assignedTemplates.map((template: any) => (
                            <SortableTemplateItem
                              key={template.id}
                              id={template.id.toString()}
                              template={template}
                              isRequired={templateRequirements[template.id] || false}
                              onToggleRequired={handleToggleRequired}
                              onRemove={handleRemoveTemplate}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Keine Vertragsvorlagen zugeordnet</p>
                      <p className="text-sm">Wählen Sie verfügbare Vorlagen von links aus</p>
                    </div>
                  )}

                  <div className="pt-4 border-t flex gap-2 justify-end">
                    <Button variant="outline">Abbrechen</Button>
                    <Button onClick={handleSave} disabled={saveMutation.isPending} className="gap-2">
                      <Check className="h-4 w-4" />
                      Speichern
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Wählen Sie eine Beteiligung aus, um Vertragsvorlagen zuzuordnen</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
