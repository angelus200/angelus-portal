import { Link } from "wouter";
import { Separator } from "@/components/ui/separator";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-background/50 backdrop-blur-sm mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Company Info */}
          <div>
            <h3 className="font-semibold mb-4">Angelus Portal</h3>
            <p className="text-sm text-muted-foreground">
              Ihre Plattform für sichere und transparente Beteiligungen.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-sm mb-4">Navigation</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
                  Startseite
                </Link>
              </li>
              <li>
                <Link href="/impressum" className="text-muted-foreground hover:text-foreground transition-colors">
                  Impressum
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-sm mb-4">Rechtliches</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/datenschutz" className="text-muted-foreground hover:text-foreground transition-colors">
                  Datenschutz
                </Link>
              </li>
              <li>
                <Link href="/aml" className="text-muted-foreground hover:text-foreground transition-colors">
                  AML Richtlinie
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-sm mb-4">Kontakt</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Angelus Managementberatungs und Service KG</li>
              <li>Konrad Zuse Platz 8</li>
              <li>81829 München</li>
              <li>
                <a href="mailto:office@angelusgroup.de" className="hover:text-foreground transition-colors">
                  office@angelusgroup.de
                </a>
              </li>
              <li>
                <a href="tel:+498001750770" className="hover:text-foreground transition-colors">
                  0800 175 077 0
                </a>
              </li>
            </ul>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground">
          <p>© {currentYear} Angelus Group. Alle Rechte vorbehalten.</p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <Link href="/datenschutz" className="hover:text-foreground transition-colors">
              Datenschutz
            </Link>
            <Link href="/impressum" className="hover:text-foreground transition-colors">
              Impressum
            </Link>
            <Link href="/aml" className="hover:text-foreground transition-colors">
              AML
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
