import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RiskDisclosure() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <img
                src="/logo.png"
                alt="Angelus"
                className="w-10 h-10 object-contain rounded bg-white/90 p-0.5"
              />
              <span className="font-semibold text-xl">Angelus</span>
            </div>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="container max-w-4xl mx-auto px-4 pt-24 pb-16">
        <h1 className="text-4xl font-bold mb-8">Risk Disclosure</h1>

        <Card className="border-destructive/30 bg-destructive/5 mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-8 h-8 text-destructive flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold mb-3 text-destructive">Important Warning</h3>
                <p className="text-muted-foreground">
                  Investments through this portal involve <strong className="text-foreground">significant risks</strong> and are exclusively intended for professional investors with appropriate risk tolerance.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Risk Disclosure for Investors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-sm leading-relaxed">
            <div>
              <p className="text-muted-foreground mb-4">
                The following information serves to inform about the essential risks of capital investments through Blue Globe Finance, LLC.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-base mb-2">1. Total Loss Risk</h3>
                <p className="text-muted-foreground">
                  There is a possibility of <strong className="text-foreground">complete loss of invested capital</strong>. Investors must be aware that in the worst case, the entire investment amount may be lost.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-2">2. No Guarantees</h3>
                <p className="text-muted-foreground">
                  There is <strong className="text-foreground">no guarantee of repayment</strong> of invested capital or for the payment of interest or returns. Projected or expected returns are not binding commitments.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-2">3. Liquidity Risk</h3>
                <p className="text-muted-foreground">
                  Investments may be <strong className="text-foreground">non-transferable or only transferable to a limited extent</strong>. There is no regulated secondary market for the offered participations. Early termination of the investment may be impossible or only achievable with significant losses.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-2">4. Issuer Risk</h3>
                <p className="text-muted-foreground">
                  The repayment and interest on capital depends on the economic performance of the issuer. In case of <strong className="text-foreground">issuer insolvency</strong>, the invested capital may be completely lost.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-2">5. Entrepreneurial Risk</h3>
                <p className="text-muted-foreground">
                  Investors bear an <strong className="text-foreground">entrepreneurial risk</strong> and participate in the success and failure of financed projects. Market changes, economic developments, and operational risks can significantly impair the value of the investment.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-2">6. Currency Risk</h3>
                <p className="text-muted-foreground">
                  For investments in foreign currencies, there is a <strong className="text-foreground">currency risk</strong>. Exchange rate fluctuations can lead to losses even if the investment itself is successful.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-2">7. Regulatory Risks</h3>
                <p className="text-muted-foreground">
                  Changes in legislation, taxation, or regulatory requirements may negatively affect the investment. There is no statutory deposit protection.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-2">8. Prospectus Exemption</h3>
                <p className="text-muted-foreground">
                  The offered investments are subject to <strong className="text-foreground">prospectus exemption according to Art. 1 Para. 4 lit. c EU Prospectus Regulation</strong> due to the minimum investment amount of €100,000. Therefore, no prospectus approved by a supervisory authority has been prepared.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-2">9. No Investment Advice</h3>
                <p className="text-muted-foreground">
                  The information on this portal does not constitute <strong className="text-foreground">investment advice</strong>. Potential investors should seek independent professional advice (legal, tax, financial) before making an investment decision.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-2">10. Target Audience</h3>
                <div className="text-muted-foreground space-y-2">
                  <p>
                    This offering is exclusively directed at:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Professional and semi-professional investors</li>
                    <li>Entrepreneurs, family offices, business angels</li>
                    <li>Institutional investors</li>
                    <li>Persons with appropriate risk tolerance and financial capacity</li>
                  </ul>
                  <p className="mt-2">
                    <strong className="text-foreground">Not suitable for:</strong> Retail investors, consumers, security-oriented investors, or persons who depend on the repayment of invested capital.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-2">11. Minimum Investment</h3>
                <p className="text-muted-foreground">
                  The <strong className="text-foreground">minimum investment amount is €100,000</strong>. This high minimum investment underscores the professional nature of the investment and the associated significant risks.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-2">12. Information Obligation</h3>
                <p className="text-muted-foreground">
                  Investors are obligated to comprehensively inform themselves about the specific risks of each investment. The general risk disclosures do not replace the examination of specific investment conditions and documents.
                </p>
              </div>
            </div>

            <div className="border-t pt-6 mt-8 bg-muted/50 -mx-6 px-6 py-4 rounded-b-lg">
              <p className="text-sm font-semibold text-foreground mb-2">
                Investor Confirmation
              </p>
              <p className="text-xs text-muted-foreground">
                By registering and using this portal, you confirm that you have taken note of these risk disclosures, understand and accept the risks, and that you are not a consumer. You also confirm that you have the necessary experience and expertise to adequately assess the risks of these investments.
              </p>
            </div>

            <div className="border-t pt-4 mt-6">
              <p className="text-xs text-muted-foreground">
                Effective Date: May 1, 2024 | Blue Globe Finance, LLC
              </p>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="py-8 bg-secondary border-t border-border">
        <div className="container text-center text-sm text-secondary-foreground/60">
          © {new Date().getFullYear()} Blue Globe Finance, LLC. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
