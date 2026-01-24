import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AMLPolicy() {
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
        <h1 className="text-4xl font-bold mb-8">AML Policy</h1>

        <Card>
          <CardHeader>
            <CardTitle>Anti-Money Laundering (AML) Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-sm leading-relaxed">
            <div>
              <p className="text-muted-foreground mb-4">
                Anti-Money Laundering (AML) Policy of Blue Globe Finance, LLC
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-base mb-2">1. Objective</h3>
                <p className="text-muted-foreground">
                  Blue Globe Finance, LLC (hereinafter "the Company") is committed to complying with all legal requirements to combat money laundering and terrorist financing. This policy aims to minimize the risks associated with money laundering and terrorist financing and to ensure that our company does not become involved in these illegal activities.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-2">2. Scope</h3>
                <p className="text-muted-foreground">
                  This policy applies to all employees, departments, and business processes of Blue Globe Finance, LLC.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-2">3. Definitions</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>
                    <strong>Money Laundering:</strong> The process by which the illegal origin of assets is concealed by transferring them into the legal financial and economic cycle.
                  </li>
                  <li>
                    <strong>Terrorist Financing:</strong> The provision or collection of financial means with the knowledge that they will be used to finance terrorist activities.
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-2">4. Customer Identification and Verification</h3>
                <p className="text-muted-foreground mb-2">
                  The Company implements appropriate measures for customer identification and verification, including:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Identity verification and address confirmation</li>
                  <li>Assessment of business purpose and intended business relationship</li>
                  <li>Ongoing monitoring of the business relationship</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-2">5. Reporting of Suspicious Cases</h3>
                <p className="text-muted-foreground">
                  Employees are obligated to immediately report any suspicious activities that may indicate money laundering or terrorist financing. Reports are reviewed internally by the designated Money Laundering Officer and forwarded to the relevant authorities when necessary.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-2">6. Training and Awareness</h3>
                <p className="text-muted-foreground">
                  The Company ensures that all employees are informed about the risks of money laundering and terrorist financing, as well as legal obligations and internal control procedures, through regular training and information materials.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-2">7. Policy Review and Updates</h3>
                <p className="text-muted-foreground">
                  This policy is regularly reviewed and updated as necessary to reflect changes in legal requirements or the business environment.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-2">8. Final Provisions</h3>
                <p className="text-muted-foreground">
                  This policy comes into effect on May 1, 2024. Any violation of this policy may result in disciplinary action, including possible termination of employment.
                </p>
              </div>
            </div>

            <div className="border-t pt-4 mt-6">
              <p className="text-xs text-muted-foreground">
                Source: <a href="https://kg.angelus.group/aml/" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">https://kg.angelus.group/aml/</a>
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
