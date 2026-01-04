import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Eye, FileText, Download } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useState } from "react";
import { toast } from "sonner";

interface ProfileCheckWithUser {
  id: number;
  sessionId: string;
  userId: number | null;
  profileCategory: string;
  riskScore: number;
  createdAt: Date;
  updatedAt: Date;
  // Answer fields
  expectedReturn: string | null;
  returnVsSecurity: string | null;
  capitalAvailability: string | null;
  investmentHorizon: string | null;
  distributionPreference: string | null;
  liquidityNeed: string | null;
  lossToleranceMax: string | null;
  lossReaction: string | null;
  currentAssets: unknown;
  answers: unknown;
  experienceLevel: string | null;
  plannedVolume: string | null;
  portfolioShare: string | null;
  informationNeed: string | null;
  decisionProcess: string | null;
  interestedBusinessAreas: unknown;
}

const categoryLabels: Record<string, { label: string; color: string }> = {
  conservative: { label: "Konservativ", color: "bg-blue-100 text-blue-800" },
  balanced: { label: "Ausgewogen", color: "bg-green-100 text-green-800" },
  growth: { label: "Wachstumsorientiert", color: "bg-orange-100 text-orange-800" },
  professional: { label: "Professionell", color: "bg-purple-100 text-purple-800" },
};

export default function AdminProfileChecks() {
  const { data: profileChecks, isLoading, refetch } = trpc.profileCheck.getAll.useQuery();
  const [selectedCheck, setSelectedCheck] = useState<ProfileCheckWithUser | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredChecks = profileChecks?.filter((check) => {
    const matchesCategory = categoryFilter === "all" || check.profileCategory === categoryFilter;
    const matchesSearch = 
      check.sessionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      check.userId?.toString().includes(searchTerm);
    return matchesCategory && matchesSearch;
  }) || [];

  const getCategoryBadge = (category: string) => {
    const info = categoryLabels[category] || { label: category, color: "bg-gray-100 text-gray-800" };
    return <Badge className={info.color}>{info.label}</Badge>;
  };

  const handleExportCSV = () => {
    if (!profileChecks || profileChecks.length === 0) {
      toast.error("Keine Daten zum Exportieren");
      return;
    }

    const headers = [
      "ID",
      "Session ID",
      "User ID",
      "Kategorie",
      "Risiko Score",
      "Erwartete Rendite",
      "Kapitalverfügbarkeit",
      "Anlagehorizont",
      "Erfahrung",
      "Geplantes Volumen",
      "Erstellt am",
    ];

    const rows = profileChecks.map((check) => [
      check.id,
      check.sessionId,
      check.userId || "-",
      check.profileCategory,
      check.riskScore,
      check.expectedReturn || "-",
      check.capitalAvailability || "-",
      check.investmentHorizon || "-",
      check.experienceLevel || "-",
      check.plannedVolume || "-",
      format(new Date(check.createdAt), "dd.MM.yyyy HH:mm", { locale: de }),
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `profil-checks-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    toast.success("CSV exportiert");
  };

  return (
    <DashboardLayout variant="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Profil-Checks</h1>
            <p className="text-muted-foreground">
              Übersicht aller ausgefüllten Investoren-Profil Checks
            </p>
          </div>
          <Button onClick={handleExportCSV} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            CSV exportieren
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Kategorie</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Kategorien</SelectItem>
                    <SelectItem value="conservative">Konservativ</SelectItem>
                    <SelectItem value="balanced">Ausgewogen</SelectItem>
                    <SelectItem value="growth">Wachstumsorientiert</SelectItem>
                    <SelectItem value="professional">Professionell</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Suche (Session ID oder User ID)</Label>
                <Input
                  placeholder="Suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setCategoryFilter("all");
                    setSearchTerm("");
                  }}
                >
                  Filter zurücksetzen
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Checks Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Profil-Checks ({filteredChecks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : filteredChecks.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Session ID</TableHead>
                      <TableHead>User ID</TableHead>
                      <TableHead>Kategorie</TableHead>
                      <TableHead>Risiko Score</TableHead>
                      <TableHead>Erstellt am</TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredChecks.map((check) => (
                      <TableRow key={check.id}>
                        <TableCell className="font-mono text-sm">
                          {check.sessionId.substring(0, 12)}...
                        </TableCell>
                        <TableCell>
                          {check.userId ? (
                            <Badge variant="outline">#{check.userId}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {getCategoryBadge(check.profileCategory)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-muted rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full"
                                style={{ width: `${check.riskScore}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">{check.riskScore}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(check.createdAt), "dd.MM.yyyy HH:mm", { locale: de })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedCheck(check)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Keine Profil-Checks vorhanden</h3>
                <p className="text-muted-foreground">
                  Es wurden noch keine Profil-Checks ausgefüllt.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedCheck} onOpenChange={(open) => !open && setSelectedCheck(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedCheck && (
            <>
              <DialogHeader>
                <DialogTitle>Profil-Check Details</DialogTitle>
                <DialogDescription>
                  Session ID: {selectedCheck.sessionId}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Kategorie</p>
                    <p className="font-semibold">{categoryLabels[selectedCheck.profileCategory]?.label}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Risiko Score</p>
                    <p className="font-semibold">{selectedCheck.riskScore}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">User ID</p>
                    <p className="font-semibold">{selectedCheck.userId || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Erstellt am</p>
                    <p className="font-semibold">
                      {format(new Date(selectedCheck.createdAt), "dd.MM.yyyy HH:mm", { locale: de })}
                    </p>
                  </div>
                </div>

                {/* Answers */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Antworten</h3>
                  <div className="space-y-3">
                    {selectedCheck.expectedReturn && (
                      <div>
                        <p className="text-sm text-muted-foreground">Erwartete Rendite</p>
                        <p>{selectedCheck.expectedReturn}</p>
                      </div>
                    )}
                    {selectedCheck.returnVsSecurity && (
                      <div>
                        <p className="text-sm text-muted-foreground">Rendite vs. Sicherheit</p>
                        <p>{selectedCheck.returnVsSecurity}</p>
                      </div>
                    )}
                    {selectedCheck.capitalAvailability && (
                      <div>
                        <p className="text-sm text-muted-foreground">Kapitalverfügbarkeit</p>
                        <p>{selectedCheck.capitalAvailability}</p>
                      </div>
                    )}
                    {selectedCheck.investmentHorizon && (
                      <div>
                        <p className="text-sm text-muted-foreground">Anlagehorizont</p>
                        <p>{selectedCheck.investmentHorizon}</p>
                      </div>
                    )}
                    {selectedCheck.distributionPreference && (
                      <div>
                        <p className="text-sm text-muted-foreground">Ausschüttungspräferenz</p>
                        <p>{selectedCheck.distributionPreference}</p>
                      </div>
                    )}
                    {selectedCheck.liquidityNeed && (
                      <div>
                        <p className="text-sm text-muted-foreground">Liquiditätsbedarf</p>
                        <p>{selectedCheck.liquidityNeed}</p>
                      </div>
                    )}
                    {selectedCheck.lossToleranceMax && (
                      <div>
                        <p className="text-sm text-muted-foreground">Maximale Verlusttoleranz</p>
                        <p>{selectedCheck.lossToleranceMax}</p>
                      </div>
                    )}
                    {selectedCheck.lossReaction && (
                      <div>
                        <p className="text-sm text-muted-foreground">Reaktion auf Verluste</p>
                        <p>{selectedCheck.lossReaction}</p>
                      </div>
                    )}
                    {selectedCheck.experienceLevel && (
                      <div>
                        <p className="text-sm text-muted-foreground">Erfahrungslevel</p>
                        <p>{selectedCheck.experienceLevel}</p>
                      </div>
                    )}
                    {selectedCheck.plannedVolume && (
                      <div>
                        <p className="text-sm text-muted-foreground">Geplantes Volumen</p>
                        <p>{selectedCheck.plannedVolume}</p>
                      </div>
                    )}
                    {selectedCheck.portfolioShare && (
                      <div>
                        <p className="text-sm text-muted-foreground">Portfolio-Anteil</p>
                        <p>{selectedCheck.portfolioShare}</p>
                      </div>
                    )}
                    {selectedCheck.informationNeed && (
                      <div>
                        <p className="text-sm text-muted-foreground">Informationsbedarf</p>
                        <p>{selectedCheck.informationNeed}</p>
                      </div>
                    )}
                    {selectedCheck.decisionProcess && (
                      <div>
                        <p className="text-sm text-muted-foreground">Entscheidungsprozess</p>
                        <p>{selectedCheck.decisionProcess}</p>
                      </div>
                    )}
                    {selectedCheck.interestedBusinessAreas ? (
                      <div>
                        <p className="text-sm text-muted-foreground">Interessierte Geschäftsbereiche</p>
                        <p>{String(selectedCheck.interestedBusinessAreas)}</p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
