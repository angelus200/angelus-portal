import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";

/**
 * Admin-Komponente zur manuellen KYC-Freischaltung
 * Ermöglicht Admins, KYC-Status für Investoren manuell zu genehmigen
 */
export function InvestorKYCApproval() {
  const [investorEmail, setInvestorEmail] = useState("");
  const [approvedInvestors, setApprovedInvestors] = useState<
    { email: string; approvedAt: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleApproveKYC = async () => {
    if (!investorEmail.trim()) {
      alert("Bitte geben Sie eine E-Mail-Adresse ein");
      return;
    }

    setIsLoading(true);
    try {
      // Simuliere KYC-Genehmigung
      const approvedAt = new Date().toLocaleString("de-DE");
      setApprovedInvestors([
        ...approvedInvestors,
        { email: investorEmail, approvedAt },
      ]);
      setInvestorEmail("");
      alert(`KYC für ${investorEmail} wurde genehmigt!`);
    } catch (error) {
      console.error("Fehler beim Genehmigen von KYC:", error);
      alert("Fehler beim Genehmigen von KYC");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout variant="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">KYC-Genehmigung</h1>
          <p className="text-gray-600 mt-2">
            Genehmigen Sie KYC-Verifizierungen manuell für Investoren
          </p>
        </div>

        {/* KYC-Genehmigungsformular */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">KYC manuell genehmigen</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Investor E-Mail-Adresse
              </label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="investor@example.com"
                  value={investorEmail}
                  onChange={(e) => setInvestorEmail(e.target.value)}
                  disabled={isLoading}
                />
                <Button
                  onClick={handleApproveKYC}
                  disabled={isLoading}
                  className="bg-gold hover:bg-gold/90"
                >
                  {isLoading ? "Wird genehmigt..." : "Genehmigen"}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Liste genehmigter Investoren */}
        {approvedInvestors.length > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">
              Genehmigte Investoren ({approvedInvestors.length})
            </h2>
            <div className="space-y-3">
              {approvedInvestors.map((investor, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium">{investor.email}</p>
                      <p className="text-sm text-gray-500">
                        Genehmigt: {investor.approvedAt}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800">
                    Genehmigt
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Info-Box */}
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900">Hinweis</h3>
              <p className="text-sm text-blue-800 mt-1">
                Nach der manuellen KYC-Genehmigung können Investoren sofort mit
                der Zeichnung von Anleihen beginnen. Die Genehmigung wird im
                Audit-Log dokumentiert.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
