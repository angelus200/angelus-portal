import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AMLPolicy() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Zurück
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">AML Richtlinie</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Anti-Money Laundering (AML) Richtlinie</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-sm leading-relaxed">
            <div>
              <p className="text-muted-foreground mb-4">
                Anti-Money Laundering (AML) Richtlinie der Angelus Management Beratung und Service KG
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-base mb-2">1. Zielsetzung</h3>
                <p className="text-muted-foreground">
                  Die Angelus Management Beratung und Service KG (im Folgenden „das Unternehmen") verpflichtet sich zur Einhaltung aller gesetzlichen Anforderungen zur Bekämpfung von Geldwäsche und Terrorismusfinanzierung. Diese Richtlinie zielt darauf ab, die Risiken, die mit Geldwäsche und Terrorismusfinanzierung verbunden sind, zu minimieren und sicherzustellen, dass unser Unternehmen nicht zur Vortat dieser illegalen Aktivitäten wird.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-2">2. Geltungsbereich</h3>
                <p className="text-muted-foreground">
                  Diese Richtlinie gilt für alle Mitarbeiter, Abteilungen, und Geschäftsprozesse der Angelus Management Beratung und Service KG.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-2">3. Definitionen</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>
                    <strong>Geldwäsche:</strong> Der Prozess, durch den der illegale Ursprung von Vermögenswerten durch deren Überführung in den legalen Finanz- und Wirtschaftskreislauf verschleiert wird.
                  </li>
                  <li>
                    <strong>Terrorismusfinanzierung:</strong> Die Bereitstellung oder Sammlung von finanziellen Mitteln mit dem Wissen, dass diese zur Finanzierung terroristischer Aktivitäten verwendet werden.
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-2">4. Identifikation und Überprüfung von Kunden</h3>
                <p className="text-muted-foreground mb-2">
                  Das Unternehmen führt geeignete Maßnahmen zur Identifizierung und Überprüfung von Kunden durch, einschließlich:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Prüfung der Identität und Adressverifikation</li>
                  <li>Bewertung des Geschäftszwecks und der beabsichtigten Geschäftsbeziehung</li>
                  <li>Laufende Überwachung der Geschäftsbeziehung</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-2">5. Reporting von Verdachtsfällen</h3>
                <p className="text-muted-foreground">
                  Mitarbeiter sind verpflichtet, jegliche verdächtigen Aktivitäten, die auf Geldwäsche oder Terrorismusfinanzierung hinweisen könnten, unverzüglich zu melden. Die Meldungen werden intern durch den benannten Geldwäschebeauftragten geprüft und bei Bedarf an die zuständigen Behörden weitergeleitet.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-2">6. Schulung und Bewusstsein</h3>
                <p className="text-muted-foreground">
                  Das Unternehmen stellt sicher, dass alle Mitarbeiter durch regelmäßige Schulungen und Informationsmaterialien über die Risiken der Geldwäsche und Terrorismusfinanzierung sowie die gesetzlichen Verpflichtungen und internen Kontrollverfahren informiert werden.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-2">7. Überprüfung und Aktualisierung der Richtlinie</h3>
                <p className="text-muted-foreground">
                  Diese Richtlinie wird regelmäßig überprüft und bei Bedarf aktualisiert, um Änderungen in den gesetzlichen Anforderungen oder im Geschäftsumfeld Rechnung zu tragen.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-2">8. Schlussbestimmungen</h3>
                <p className="text-muted-foreground">
                  Diese Richtlinie tritt am 01.05.2024 in Kraft. Jeder Verstoß gegen diese Richtlinie kann disziplinarische Maßnahmen nach sich ziehen, einschließlich der möglichen Beendigung des Arbeitsverhältnisses.
                </p>
              </div>
            </div>

            <div className="border-t pt-4 mt-6">
              <p className="text-xs text-muted-foreground">
                Quelle: <a href="https://kg.angelus.group/aml/" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">https://kg.angelus.group/aml/</a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
