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
        <h1 className="text-4xl font-bold mb-8">Risikohinweise</h1>

        <Card className="border-destructive/30 bg-destructive/5 mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-8 h-8 text-destructive flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold mb-3 text-destructive">Wichtige Warnung</h3>
                <p className="text-muted-foreground">
                  Investitionen über dieses Portal sind mit <strong className="text-foreground">erheblichen Risiken</strong> verbunden und ausschließlich für professionelle Investoren mit entsprechender Risikobereitschaft bestimmt.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Risikoaufklärung für Anleger</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-sm leading-relaxed">
            <div>
              <p className="text-muted-foreground mb-4">
                Die nachfolgenden Hinweise dienen der Aufklärung über die wesentlichen Risiken von Kapitalanlagen über die Blue Globe Finance, LLC.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-base mb-2">1. Totalverlustrisiko</h3>
                <p className="text-muted-foreground">
                  Es besteht die Möglichkeit des <strong className="text-foreground">vollständigen Verlusts des investierten Kapitals</strong>. Anleger müssen sich bewusst sein, dass im ungünstigsten Fall die gesamte Investitionssumme verloren gehen kann.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-2">2. Keine Garantien</h3>
                <p className="text-muted-foreground">
                  Es gibt <strong className="text-foreground">keine Garantie für Rückzahlung</strong> des eingesetzten Kapitals oder für die Zahlung von Zinsen bzw. Renditen. Prognostizierte oder erwartete Renditen sind keine verbindlichen Zusagen.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-2">3. Liquiditätsrisiko</h3>
                <p className="text-muted-foreground">
                  Investitionen können <strong className="text-foreground">nicht oder nur eingeschränkt veräußerbar</strong> sein. Es besteht kein geregelter Sekundärmarkt für die angebotenen Beteiligungen. Eine vorzeitige Beendigung der Kapitalanlage kann unmöglich oder nur mit erheblichen Verlusten realisierbar sein.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-2">4. Emittentenrisiko</h3>
                <p className="text-muted-foreground">
                  Die Rückzahlung und Verzinsung des Kapitals ist abhängig von der wirtschaftlichen Leistungsfähigkeit des Emittenten. Bei <strong className="text-foreground">Insolvenz des Emittenten</strong> kann das investierte Kapital vollständig verloren gehen.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-2">5. Unternehmerisches Risiko</h3>
                <p className="text-muted-foreground">
                  Anleger tragen ein <strong className="text-foreground">unternehmerisches Risiko</strong> und partizipieren an Erfolg und Misserfolg der finanzierten Projekte. Marktveränderungen, wirtschaftliche Entwicklungen und operative Risiken können den Wert der Investition erheblich beeinträchtigen.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-2">6. Währungsrisiko</h3>
                <p className="text-muted-foreground">
                  Bei Investitionen in Fremdwährungen besteht ein <strong className="text-foreground">Währungsrisiko</strong>. Wechselkursschwankungen können zu Verlusten führen, auch wenn die Investition selbst erfolgreich verläuft.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-2">7. Regulatorische Risiken</h3>
                <p className="text-muted-foreground">
                  Änderungen der Gesetzgebung, Besteuerung oder aufsichtsrechtlicher Vorgaben können die Investition negativ beeinflussen. Es besteht kein gesetzlicher Einlagenschutz.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-2">8. Prospektbefreiung</h3>
                <p className="text-muted-foreground">
                  Die angebotenen Investitionen unterliegen der <strong className="text-foreground">Prospektbefreiung gemäß Art. 1 Abs. 4 lit. c EU-ProspektVO</strong> aufgrund der Mindestanlagesumme von €100.000. Es wurde daher kein von einer Aufsichtsbehörde gebilligter Prospekt erstellt.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-2">9. Keine Anlageberatung</h3>
                <p className="text-muted-foreground">
                  Die Informationen auf diesem Portal stellen <strong className="text-foreground">keine Anlageberatung</strong> dar. Potenzielle Anleger sollten vor einer Investitionsentscheidung unabhängigen professionellen Rat (rechtlich, steuerlich, finanziell) einholen.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-2">10. Zielgruppe</h3>
                <div className="text-muted-foreground space-y-2">
                  <p>
                    Dieses Angebot richtet sich ausschließlich an:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Professionelle und semiprofessionelle Investoren</li>
                    <li>Unternehmer, Family Offices, Business Angels</li>
                    <li>Institutionelle Investoren</li>
                    <li>Personen mit entsprechender Risikobereitschaft und finanzieller Leistungsfähigkeit</li>
                  </ul>
                  <p className="mt-2">
                    <strong className="text-foreground">Nicht geeignet für:</strong> Privatanleger, Verbraucher, sicherheitsorientierte Anleger oder Personen, die auf die Rückzahlung des investierten Kapitals angewiesen sind.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-2">11. Mindestanlage</h3>
                <p className="text-muted-foreground">
                  Die <strong className="text-foreground">Mindestanlagesumme beträgt €100.000</strong>. Diese hohe Mindestanlage unterstreicht den professionellen Charakter der Investition und die damit verbundenen erheblichen Risiken.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-2">12. Informationspflicht</h3>
                <p className="text-muted-foreground">
                  Anleger sind verpflichtet, sich umfassend über die spezifischen Risiken der jeweiligen Investition zu informieren. Die allgemeinen Risikohinweise ersetzen nicht die Prüfung der konkreten Investitionsbedingungen und -dokumente.
                </p>
              </div>
            </div>

            <div className="border-t pt-6 mt-8 bg-muted/50 -mx-6 px-6 py-4 rounded-b-lg">
              <p className="text-sm font-semibold text-foreground mb-2">
                Bestätigung durch Anleger
              </p>
              <p className="text-xs text-muted-foreground">
                Durch die Registrierung und Nutzung dieses Portals bestätigen Sie, dass Sie diese Risikohinweise zur Kenntnis genommen haben, die Risiken verstehen und akzeptieren, und dass Sie kein Verbraucher im Sinne des BGB sind. Sie bestätigen außerdem, dass Sie über die erforderliche Erfahrung und Sachkenntnis verfügen, um die Risiken dieser Investments angemessen beurteilen zu können.
              </p>
            </div>

            <div className="border-t pt-4 mt-6">
              <p className="text-xs text-muted-foreground">
                Stand: 01.05.2024 | Blue Globe Finance, LLC
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
