import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Inbox, Eye } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const STATUS = [
  { value: "new", label: "Neu", cls: "bg-blue-100 text-blue-800" },
  { value: "contacted", label: "Kontaktiert", cls: "bg-yellow-100 text-yellow-800" },
  { value: "qualified", label: "Qualifiziert", cls: "bg-purple-100 text-purple-800" },
  { value: "converted", label: "Konvertiert", cls: "bg-green-100 text-green-800" },
  { value: "discarded", label: "Verworfen", cls: "bg-gray-100 text-gray-700" },
] as const;

const statusMeta = (s: string) => STATUS.find(x => x.value === s) ?? STATUS[0];

const RANGE_LABEL: Record<string, string> = {
  "100k-250k": "€100k – €250k",
  "250k-500k": "€250k – €500k",
  "500k-1m": "€500k – €1M",
  "1m+": "€1M+",
};

const COMPANY_TYPE: Record<string, { label: string; cls: string }> = {
  corporate: { label: "Unternehmen", cls: "bg-blue-100 text-blue-800" },
  family_office: { label: "Family Office", cls: "bg-purple-100 text-purple-800" },
  institutional: { label: "Institutionell", cls: "bg-teal-100 text-teal-800" },
  other: { label: "Sonstige", cls: "bg-gray-100 text-gray-700" },
};
const companyTypeMeta = (t?: string | null) => (t ? COMPANY_TYPE[t] : undefined);

export default function LeadsManagement() {
  const utils = trpc.useUtils();
  const { data: leads, isLoading } = trpc.admin.listLeads.useQuery();
  const updateStatus = trpc.admin.updateLeadStatus.useMutation({
    onSuccess: () => { utils.admin.listLeads.invalidate(); toast.success("Status aktualisiert"); },
    onError: (e) => toast.error(e.message),
  });

  const [detail, setDetail] = useState<NonNullable<typeof leads>[number] | null>(null);

  return (
    <DashboardLayout variant="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-muted-foreground">Anfragen über die Landingpage (mybonds.net).</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Inbox className="h-5 w-5" /> Eingegangene Leads</CardTitle>
            <CardDescription>Status pflegen und Details einsehen. Es erfolgt kein automatischer Versand.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-12 animate-pulse rounded bg-muted" />)}</div>
            ) : !leads || leads.length === 0 ? (
              <div className="py-12 text-center">
                <Inbox className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">Noch keine Leads eingegangen.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Firma</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>E-Mail</TableHead>
                    <TableHead>Telefon</TableHead>
                    <TableHead>Kontinent</TableHead>
                    <TableHead>Währung</TableHead>
                    <TableHead>Betrag</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.companyName || "–"}</TableCell>
                      <TableCell>
                        {companyTypeMeta(l.companyType)
                          ? <Badge className={companyTypeMeta(l.companyType)!.cls}>{companyTypeMeta(l.companyType)!.label}</Badge>
                          : <span className="text-sm text-muted-foreground">–</span>}
                      </TableCell>
                      <TableCell>{l.firstName} {l.lastName}</TableCell>
                      <TableCell className="text-sm">{l.email}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{l.phone || "–"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{l.continent || "–"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{l.currency || "–"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {l.investmentRange ? (RANGE_LABEL[l.investmentRange] || l.investmentRange) : "–"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {l.createdAt ? format(new Date(l.createdAt), "dd.MM.yyyy", { locale: de }) : "–"}
                      </TableCell>
                      <TableCell>
                        <Select value={l.status} onValueChange={(v) => updateStatus.mutate({ id: l.id, status: v as any })}>
                          <SelectTrigger className="h-8 w-36">
                            <SelectValue>
                              <Badge className={statusMeta(l.status).cls}>{statusMeta(l.status).label}</Badge>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setDetail(l)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!detail} onOpenChange={(o) => { if (!o) setDetail(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{detail?.firstName} {detail?.lastName}</DialogTitle>
            <DialogDescription>Lead-Details</DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Firma</span><span>{detail.companyName || "–"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Typ</span><span>{companyTypeMeta(detail.companyType)?.label || "–"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Funktion</span><span>{detail.jobTitle || "–"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">E-Mail</span><span>{detail.email}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Telefon</span><span>{detail.phone || "–"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Kontinent</span><span>{detail.continent || "–"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Währung</span><span>{detail.currency || "–"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Betragsspanne</span><span>{detail.investmentRange ? (RANGE_LABEL[detail.investmentRange] || detail.investmentRange) : "–"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Quelle</span><span>{detail.source}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge className={statusMeta(detail.status).cls}>{statusMeta(detail.status).label}</Badge></div>
              {detail.message && (
                <div className="pt-2">
                  <p className="mb-1 text-muted-foreground">Nachricht</p>
                  <p className="whitespace-pre-wrap rounded-md bg-muted p-3">{detail.message}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
