import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { X, Eye } from "lucide-react";
import { Streamdown } from "streamdown";

interface ContractTemplateViewerProps {
  template: {
    id: number;
    name: string;
    type: string;
    content: string;
  };
  isRequired: boolean;
  isAccepted: boolean;
  onAccept: (accepted: boolean) => void;
}

export function ContractTemplateViewer({
  template,
  isRequired,
  isAccepted,
  onAccept,
}: ContractTemplateViewerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const typeLabels: Record<string, string> = {
    subscription_agreement: "Zeichnungsvereinbarung",
    risk_disclosure: "Risikooffenlegung",
    terms_conditions: "AGB",
    kyc_confirmation: "KYC-Bestätigung",
    prospectus_acknowledgment: "Prospekt-Bestätigung",
  };

  return (
    <>
      <div className="flex items-start gap-3 p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
        <Checkbox
          id={`template-${template.id}`}
          checked={isAccepted}
          onCheckedChange={(checked) => onAccept(checked as boolean)}
          disabled={isOpen}
        />
        <div className="flex-1">
          <Label htmlFor={`template-${template.id}`} className="font-medium cursor-pointer">
            {template.name}
            {isRequired && <span className="text-destructive ml-1">*</span>}
          </Label>
          <p className="text-sm text-muted-foreground mt-1">
            {typeLabels[template.type] || template.type}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(true)}
          className="gap-2"
        >
          <Eye className="h-4 w-4" />
          Anzeigen
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{template.name}</DialogTitle>
            <DialogDescription>
              {typeLabels[template.type] || template.type}
            </DialogDescription>
          </DialogHeader>

          <div className="prose prose-sm dark:prose-invert max-w-none">
            <Streamdown>{template.content}</Streamdown>
          </div>

          <div className="flex items-start gap-3 p-4 bg-muted rounded-lg mt-6">
            <Checkbox
              id={`accept-${template.id}`}
              checked={isAccepted}
              onCheckedChange={(checked) => {
                onAccept(checked as boolean);
                if (checked) {
                  setIsOpen(false);
                }
              }}
            />
            <Label htmlFor={`accept-${template.id}`} className="cursor-pointer">
              Ich habe die {template.name.toLowerCase()} gelesen und akzeptiert
              {isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Schließen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
