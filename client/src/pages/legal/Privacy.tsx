import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicy() {
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
        <h1 className="text-4xl font-bold mb-8">Datenschutz</h1>

        <Card>
          <CardHeader>
            <CardTitle>Datenschutzerklärung (DSGVO)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-sm leading-relaxed">
            <div>
              <h3 className="font-semibold text-base mb-2">Allgemeine Hinweise</h3>
              <p className="text-muted-foreground">
                Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie unsere Website besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können. Ausführliche Informationen zum Thema Datenschutz entnehmen Sie unserer unter diesem Text aufgeführten Datenschutzerklärung.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">Datenerfassung auf unserer Website</h3>
              <p className="text-muted-foreground">
                Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Dessen Kontaktdaten können Sie dem Impressum dieser Website entnehmen.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">Wie erfassen wir Ihre Daten?</h3>
              <p className="text-muted-foreground">
                Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen. Hierbei kann es sich z.B. um Daten handeln, die Sie in ein Kontaktformular eingeben. Andere Daten werden automatisch beim Besuch der Website durch unsere IT-Systeme erfasst. Das sind vor allem technische Daten (z.B. Internetbrowser, Betriebssystem oder Uhrzeit des Seitenaufrufs). Die Erfassung dieser Daten erfolgt automatisch, sobald Sie unsere Website betreten.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">Wofür nutzen wir Ihre Daten?</h3>
              <p className="text-muted-foreground">
                Ein Teil der Daten wird erhoben, um eine fehlerfreie Bereitstellung der Website zu gewährleisten. Andere Daten können zur Analyse Ihres Nutzerverhaltens verwendet werden.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">Welche Rechte haben Sie bezüglich Ihrer Daten?</h3>
              <p className="text-muted-foreground">
                Sie haben jederzeit das Recht unentgeltlich Auskunft über Herkunft, Empfänger und Zweck Ihrer gespeicherten personenbezogenen Daten zu erhalten. Sie haben außerdem ein Recht, die Berichtigung, Sperrung oder Löschung dieser Daten zu verlangen. Hierzu sowie zu weiteren Fragen zum Thema Datenschutz können Sie sich jederzeit unter der im Impressum angegebenen Adresse an uns wenden. Des Weiteren steht Ihnen ein Beschwerderecht bei der zuständigen Aufsichtsbehörde zu.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">Verantwortliche Stelle</h3>
              <div className="text-muted-foreground space-y-1">
                <p><strong>Blue Globe Finance, LLC</strong></p>
                <p>Lower Bay Street, Browne's Building 1st Floor, Suite 2131</p>
                <p>Kingstown, St. Vincent and the Grenadines</p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">SSL- bzw. TLS-Verschlüsselung</h3>
              <p className="text-muted-foreground">
                Diese Seite nutzt aus Sicherheitsgründen und zum Schutz der Übertragung vertraulicher Inhalte eine SSL- bzw. TLS-Verschlüsselung. Eine verschlüsselte Verbindung erkennen Sie daran, dass die Adresszeile des Browsers von "http://" auf "https://" wechselt und an dem Schloss-Symbol in Ihrer Browserzeile. Wenn die SSL- bzw. TLS-Verschlüsselung aktiviert ist, können die Daten, die Sie an uns übermitteln, nicht von Dritten mitgelesen werden.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">Cookies</h3>
              <p className="text-muted-foreground">
                Die Internetseiten verwenden teilweise so genannte Cookies. Cookies richten auf Ihrem Rechner keinen Schaden an und enthalten keine Viren. Cookies dienen dazu, unser Angebot nutzerfreundlicher, effektiver und sicherer zu machen. Cookies sind kleine Textdateien, die auf Ihrem Rechner abgelegt werden und die Ihr Browser speichert.
              </p>
              <p className="text-muted-foreground mt-2">
                Sie können ihren Browser so einstellen, dass Sie über das Setzen von Cookies informiert werden und Cookies nur im Einzelfall erlauben, die Annahme von Cookies für bestimmte Fälle oder generell ausschließen sowie das automatische Löschen der Cookies beim Schließen des Browser aktivieren.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">Widerruf Ihrer Einwilligung</h3>
              <p className="text-muted-foreground">
                Viele Datenverarbeitungsvorgänge sind nur mit Ihrer ausdrücklichen Einwilligung möglich. Sie können eine bereits erteilte Einwilligung jederzeit widerrufen. Dazu reicht eine formlose Mitteilung per E-Mail an uns. Die Rechtmäßigkeit der bis zum Widerruf erfolgten Datenverarbeitung bleibt vom Widerruf unberührt.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">Auskunft, Sperrung, Löschung</h3>
              <p className="text-muted-foreground">
                Sie haben im Rahmen der geltenden gesetzlichen Bestimmungen jederzeit das Recht auf unentgeltliche Auskunft über Ihre gespeicherten personenbezogenen Daten, deren Herkunft und Empfänger und den Zweck der Datenverarbeitung und ggf. ein Recht auf Berichtigung, Sperrung oder Löschung dieser Daten. Hierzu sowie zu weiteren Fragen zum Thema personenbezogene Daten können Sie sich jederzeit unter der im Impressum angegebenen Adresse an uns wenden.
              </p>
            </div>

            <div className="border-t pt-4 mt-6">
              <p className="text-xs text-muted-foreground">
                Quelle: <a href="https://kg.angelus.group/datenschutz/" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">https://kg.angelus.group/datenschutz/</a>
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
