import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function Impressum() {
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
                className="w-10 h-10 object-contain"
              />
              <span className="font-semibold text-xl">Angelus</span>
            </div>
          </Link>
          <Link href="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Zurück
            </Button>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="pt-24 pb-16">
        <div className="container max-w-4xl">
          <h1 className="text-3xl md:text-4xl font-bold mb-8">Impressum</h1>
          
          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
            {/* Angaben gemäß §5 TMG */}
            <section>
              <h2 className="text-xl font-semibold mb-4 text-foreground">Angaben gemäß §5 TMG</h2>
              <div className="text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">Angelus Managementberatungs und Service KG</p>
                <p>Komplementär: Thomas Gross</p>
                <p>Konrad Zuse Platz 8</p>
                <p>81829 München</p>
                <p className="mt-4">Vertreten durch: Thomas Gross</p>
              </div>
            </section>

            {/* Kontakt */}
            <section>
              <h2 className="text-xl font-semibold mb-4 text-foreground">Kontakt</h2>
              <div className="text-muted-foreground space-y-1">
                <p>Telefon: <a href="tel:08001750770" className="text-primary hover:underline">0800 175 077 0</a></p>
                <p>Telefax: 0800 381 420 9</p>
                <p>E-Mail: <a href="mailto:office@angelus.group" className="text-primary hover:underline">office@angelus.group</a></p>
              </div>
            </section>

            {/* Registereintrag */}
            <section>
              <h2 className="text-xl font-semibold mb-4 text-foreground">Registereintrag</h2>
              <div className="text-muted-foreground space-y-1">
                <p>Amtsgericht München</p>
                <p>Registernummer: HRA 102 679</p>
              </div>
            </section>

            {/* Umsatzsteuer */}
            <section>
              <h2 className="text-xl font-semibold mb-4 text-foreground">Umsatzsteuer</h2>
              <div className="text-muted-foreground">
                <p>Umsatzsteuer-Identifikationsnummer gemäß §27a Umsatzsteuergesetz:</p>
                <p className="font-semibold text-foreground">DE 279 532 189</p>
              </div>
            </section>

            {/* Streitschlichtung */}
            <section>
              <h2 className="text-xl font-semibold mb-4 text-foreground">Streitschlichtung</h2>
              <div className="text-muted-foreground space-y-3">
                <p>
                  Die europäische Kommission stellt eine Plattform zur Streitbeilegung (OS) bereit:{" "}
                  <a 
                    href="https://ec.europa.eu/consumers/odr" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    https://ec.europa.eu/consumers/odr
                  </a>
                </p>
                <p>Unsere E-Mail-Adresse finden Sie oben im Impressum.</p>
                <p>
                  Wir sind nicht dazu bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer 
                  Verbraucherschlichtungsstelle teilzunehmen.
                </p>
              </div>
            </section>

            {/* Haftung für Inhalte */}
            <section>
              <h2 className="text-xl font-semibold mb-4 text-foreground">Haftung für Inhalte</h2>
              <div className="text-muted-foreground space-y-3">
                <p>
                  Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten 
                  nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als 
                  Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde 
                  Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige 
                  Tätigkeit hinweisen.
                </p>
                <p>
                  Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den 
                  allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch 
                  erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei 
                  Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.
                </p>
              </div>
            </section>

            {/* Haftung für Verlinkungen */}
            <section>
              <h2 className="text-xl font-semibold mb-4 text-foreground">Haftung für Verlinkungen</h2>
              <div className="text-muted-foreground space-y-3">
                <p>
                  Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen 
                  Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. 
                  Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der 
                  Seiten verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf 
                  mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der 
                  Verlinkung nicht erkennbar.
                </p>
                <p>
                  Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne konkrete 
                  Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von 
                  Rechtsverletzungen werden wir derartige Links umgehend entfernen.
                </p>
              </div>
            </section>

            {/* Urheberrecht */}
            <section>
              <h2 className="text-xl font-semibold mb-4 text-foreground">Urheberrecht</h2>
              <div className="text-muted-foreground space-y-3">
                <p>
                  Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen 
                  dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art 
                  der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen 
                  Zustimmung des jeweiligen Autors bzw. Erstellers. Downloads und Kopien dieser Seite sind 
                  nur für den privaten, nicht kommerziellen Gebrauch gestattet.
                </p>
                <p>
                  Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt wurden, werden die 
                  Urheberrechte Dritter beachtet. Insbesondere werden Inhalte Dritter als solche 
                  gekennzeichnet. Sollten Sie trotzdem auf eine Urheberrechtsverletzung aufmerksam werden, 
                  bitten wir um einen entsprechenden Hinweis. Bei Bekanntwerden von Rechtsverletzungen 
                  werden wir derartige Inhalte umgehend entfernen.
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 bg-secondary border-t border-border">
        <div className="container text-center text-sm text-secondary-foreground/60">
          <p>© {new Date().getFullYear()} Angelus Group. Alle Rechte vorbehalten.</p>
        </div>
      </footer>
    </div>
  );
}
