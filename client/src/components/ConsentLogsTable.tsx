import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Calendar, Filter } from "lucide-react";

interface ConsentLogsTableProps {
  bondId?: number;
}

export default function ConsentLogsTable({ bondId }: ConsentLogsTableProps) {
  const [selectedBondId, setSelectedBondId] = useState<string>(bondId?.toString() || "");
  const [selectedConsentType, setSelectedConsentType] = useState<string>("");
  const [selectedAction, setSelectedAction] = useState<string>("");
  const [searchEmail, setSearchEmail] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // Get all bonds for filter dropdown
  const { data: bonds } = trpc.bonds.list.useQuery();

  // Get logs for selected bond
  const { data: logs, isLoading } = trpc.consents.getLogsForBond.useQuery(
    { bondId: selectedBondId ? parseInt(selectedBondId) : 0 },
    { enabled: !!selectedBondId }
  );

  // Get user data for email lookup
  const { data: users } = trpc.admin.getUsers.useQuery();

  const consentTypes = [
    { value: "risk_disclosure", label: "Risikooffenlegung" },
    { value: "terms_conditions", label: "AGB" },
    { value: "subscription_agreement", label: "Zeichnungsvereinbarung" },
    { value: "kyc_confirmation", label: "KYC-Bestätigung" },
    { value: "prospectus_acknowledgment", label: "Prospekt-Bestätigung" },
  ];

  const actions = [
    { value: "accepted", label: "Akzeptiert", color: "bg-green-100 text-green-800" },
    { value: "rejected", label: "Abgelehnt", color: "bg-red-100 text-red-800" },
    { value: "revoked", label: "Widerrufen", color: "bg-yellow-100 text-yellow-800" },
  ];

  // Filter logs based on criteria
  const filteredLogs = useMemo(() => {
    if (!logs) return [];

    return logs.filter((log: any) => {
      // Filter by consent type
      if (selectedConsentType && log.consentType !== selectedConsentType) {
        return false;
      }

      // Filter by action
      if (selectedAction && log.action !== selectedAction) {
        return false;
      }

      // Filter by email
      if (searchEmail) {
        const user = users?.find((u: any) => u.id === log.userId);
        if (!user?.email?.toLowerCase().includes(searchEmail.toLowerCase())) {
          return false;
        }
      }

      // Filter by date range
      if (dateFrom) {
        const logDate = new Date(log.createdAt);
        const fromDate = new Date(dateFrom);
        if (logDate < fromDate) {
          return false;
        }
      }

      if (dateTo) {
        const logDate = new Date(log.createdAt);
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (logDate > toDate) {
          return false;
        }
      }

      return true;
    });
  }, [logs, selectedConsentType, selectedAction, searchEmail, dateFrom, dateTo, users]);

  const getConsentTypeLabel = (type: string) => {
    return consentTypes.find((ct) => ct.value === type)?.label || type;
  };

  const getActionBadge = (action: string) => {
    const actionConfig = actions.find((a) => a.value === action);
    return actionConfig ? { label: actionConfig.label, color: actionConfig.color } : { label: action, color: "" };
  };

  const getUserEmail = (userId: number) => {
    return users?.find((u: any) => u.id === userId)?.email || `User #${userId}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="w-5 h-5" />
          Consent-Audit-Logs
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
          {/* Bond Filter */}
          <div className="space-y-2">
            <Label>Beteiligung</Label>
            <Select value={selectedBondId} onValueChange={setSelectedBondId}>
              <SelectTrigger>
                <SelectValue placeholder="Wählen Sie eine Beteiligung" />
              </SelectTrigger>
              <SelectContent>
                {bonds?.map((bond) => (
                  <SelectItem key={bond.id} value={bond.id.toString()}>
                    {bond.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Consent Type Filter */}
          <div className="space-y-2">
            <Label>Zustimmungstyp</Label>
            <Select value={selectedConsentType} onValueChange={setSelectedConsentType}>
              <SelectTrigger>
                <SelectValue placeholder="Alle Typen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Alle Typen</SelectItem>
                {consentTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action Filter */}
          <div className="space-y-2">
            <Label>Aktion</Label>
            <Select value={selectedAction} onValueChange={setSelectedAction}>
              <SelectTrigger>
                <SelectValue placeholder="Alle Aktionen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Alle Aktionen</SelectItem>
                {actions.map((action) => (
                  <SelectItem key={action.value} value={action.value}>
                    {action.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Email Search */}
          <div className="space-y-2">
            <Label>Email-Suche</Label>
            <Input
              placeholder="Email eingeben..."
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
            />
          </div>

          {/* Date From */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Von
            </Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          {/* Date To */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Bis
            </Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>

        {/* Results Info */}
        <div className="text-sm text-muted-foreground">
          {filteredLogs.length} von {logs?.length || 0} Einträgen angezeigt
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Datum/Zeit</TableHead>
                <TableHead>Benutzer</TableHead>
                <TableHead>Zustimmungstyp</TableHead>
                <TableHead>Aktion</TableHead>
                <TableHead>IP-Adresse</TableHead>
                <TableHead>Browser</TableHead>
                <TableHead>Version</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Lädt...
                  </TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Keine Einträge gefunden
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log: any) => {
                  const actionBadge = getActionBadge(log.action);
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {format(new Date(log.createdAt), "dd.MM.yyyy HH:mm:ss", { locale: de })}
                      </TableCell>
                      <TableCell className="text-sm">{getUserEmail(log.userId)}</TableCell>
                      <TableCell className="text-sm">{getConsentTypeLabel(log.consentType)}</TableCell>
                      <TableCell>
                        <Badge className={actionBadge.color}>{actionBadge.label}</Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono">{log.ipAddress || "—"}</TableCell>
                      <TableCell className="text-xs truncate max-w-xs" title={log.userAgent || ""}>
                        {log.userAgent ? log.userAgent.substring(0, 40) + "..." : "—"}
                      </TableCell>
                      <TableCell className="text-sm">{log.consentVersion || "—"}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
