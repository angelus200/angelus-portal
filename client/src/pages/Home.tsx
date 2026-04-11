import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { getLoginUrl } from "@/const";
import { 
  Shield, 
  TrendingUp, 
  Users, 
  FileText, 
  Wallet,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Award,
  Newspaper,
  ExternalLink,
  HelpCircle,
  Target
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import InvestorProfileCheck from "@/components/InvestorProfileCheck";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [profileCheckOpen, setProfileCheckOpen] = useState(false);

  // Redirect authenticated users to their dashboard
  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      if (user.role === "admin" || user.role === "superadmin") {
        setLocation("/admin");
      } else {
        setLocation("/investor");
      }
    }
  }, [loading, isAuthenticated, user, setLocation]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <img 
              src="/logo.png" 
              alt="Angelus" 
              className="w-10 h-10 object-contain"
            />
            <span className="font-semibold text-xl">Angelus</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#investors" className="text-muted-foreground hover:text-foreground transition-colors">Für Startups & KMU</a>
            <a href="#press" className="text-muted-foreground hover:text-foreground transition-colors">Presse</a>
            <a href="#faq" className="text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
            <a href="#risk" className="text-muted-foreground hover:text-foreground transition-colors">Risikohinweise</a>
          </nav>
          <div className="flex items-center gap-4">
            {loading ? (
              <div className="w-24 h-10 bg-muted animate-pulse rounded-lg" />
            ) : isAuthenticated ? (
              <Link href={user?.role === "admin" ? "/admin" : "/investor"}>
                <Button>Dashboard</Button>
              </Link>
            ) : (
              <a href={getLoginUrl()}>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Anmelden
                </Button>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-gradient-to-b from-secondary to-secondary/95">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-secondary-foreground mb-6">
              Investorenportal der{" "}
              <span className="text-primary">Angelus Group</span>
            </h1>
            <p className="text-lg md:text-xl text-secondary-foreground/80 mb-8">
              Exklusive Investitionsmöglichkeiten für professionelle Investoren und Unternehmer. 
              Prospektfreie Angebote und individuelle Vereinbarungen mit attraktiven Konditionen.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {!isAuthenticated && (
                <>
                  <a href={getLoginUrl()}>
                    <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
                      Jetzt registrieren
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </a>
<Dialog open={profileCheckOpen} onOpenChange={setProfileCheckOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-primary/20 text-primary hover:bg-primary/30 border border-primary/50 gap-2 font-semibold">
                        <Target className="w-4 h-4" />
                        Bin ich geeignet?
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
                      <InvestorProfileCheck onClose={() => setProfileCheckOpen(false)} />
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-12 bg-muted/50">
        <div className="container">
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary" />
              <span>KYC-verifiziert</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary" />
              <span>International tätig</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary" />
              <span>Sichere Plattform</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary" />
              <span>Professionelle Investoren</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ihre Vorteile auf einen Blick
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Unser Portal bietet Ihnen alle Werkzeuge für eine professionelle Anlageverwaltung.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-border hover:border-primary/50 transition-colors">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Attraktive Beteiligungen</h3>
                <p className="text-muted-foreground">
                  Zugang zu exklusiven Investitionsmöglichkeiten mit überdurchschnittlichen Renditen für qualifizierte Investoren.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border hover:border-primary/50 transition-colors">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Wallet className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">E-Wallet System</h3>
                <p className="text-muted-foreground">
                  Verwalten Sie Ihre Vermögenswerte in EUR und Kryptowährungen (BTC, ETH, USDT) an einem Ort.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border hover:border-primary/50 transition-colors">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Höchste Sicherheit</h3>
                <p className="text-muted-foreground">
                  KYC-Verifizierung, 2FA und modernste Verschlüsselung schützen Ihre Investitionen.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border hover:border-primary/50 transition-colors">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Dokumentenverwaltung</h3>
                <p className="text-muted-foreground">
                  Alle Verträge und Dokumente zentral verfügbar und jederzeit abrufbar.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border hover:border-primary/50 transition-colors">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Persönliches Dashboard</h3>
                <p className="text-muted-foreground">
                  Übersichtliche Darstellung Ihrer Investments, Zahlungspläne und Renditen.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border hover:border-primary/50 transition-colors">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <CheckCircle className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Transparente Prozesse</h3>
                <p className="text-muted-foreground">
                  Klare Zahlungspläne und vollständige Nachverfolgbarkeit aller Transaktionen.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Press & Awards Section */}
      <section id="press" className="py-20 bg-gradient-to-b from-background to-muted/30">
        <div className="container">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Award className="w-8 h-8 text-primary" />
              <h2 className="text-3xl md:text-4xl font-bold">
                Auszeichnungen & Presse
              </h2>
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Die Angelus Group ist Teil eines innovativen Netzwerks für digitalen Markenaufbau und wurde für ihre zukunftsorientierte Unternehmensführung ausgezeichnet.
            </p>
          </div>

          {/* Award Section */}
          <div className="mb-16">
            <Card className="max-w-4xl mx-auto border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 overflow-hidden">
              <CardContent className="p-0">
                <div className="grid md:grid-cols-2 gap-0">
                  <div className="p-8 flex flex-col justify-center">
                    <div className="flex items-center gap-2 text-primary mb-4">
                      <Award className="w-6 h-6" />
                      <span className="font-semibold uppercase tracking-wide text-sm">Auszeichnung</span>
                    </div>
                    <h3 className="text-2xl font-bold mb-4">Unternehmen der Zukunft</h3>
                    <p className="text-muted-foreground mb-4">
                      Das Deutsche Innovationsinstitut für Nachhaltigkeit und Digitalisierung (diind) hat die 
                      <strong className="text-foreground"> Angelus Managementberatung und Service KG</strong> als 
                      "Unternehmen der Zukunft" ausgezeichnet.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-medium">proaktiv</span>
                      <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-medium">engagiert</span>
                      <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-medium">zukunftsfähig</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-4">
                      In Kooperation mit DUP UNTERNEHMER
                    </p>
                  </div>
                  <div className="bg-white p-4 flex items-center justify-center">
                    <img 
                      src="/urkunde-unternehmen-zukunft.png" 
                      alt="Urkunde - Unternehmen der Zukunft - Angelus Managementberatung und Service KG" 
                      className="max-h-80 w-auto object-contain"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Press Articles */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-2 mb-8">
              <Newspaper className="w-6 h-6 text-primary" />
              <h3 className="text-2xl font-semibold">Presseartikel</h3>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Forbes Article */}
            <Card className="border-border hover:border-primary/50 transition-all hover:shadow-lg group">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg italic">F</span>
                  </div>
                  <div>
                    <span className="font-semibold text-lg">Forbes Österreich</span>
                    <p className="text-sm text-muted-foreground">25. August 2025</p>
                  </div>
                </div>
                <h4 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">
                  Markenaufbau im Amazon-Zeitalter
                </h4>
                <p className="text-muted-foreground text-sm mb-4">
                  "Das Netzwerk um commercehelden, digiPULS, Brands-Wanted und <strong className="text-foreground">Angelus Group</strong> nutzt Amazon nicht nur als Absatzkanal, sondern als systemische Infrastruktur für digitalen Markenaufbau."
                </p>
                <a 
                  href="https://www.forbes.at/artikel/markenaufbau-im-amazon-zeitalter" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
                >
                  Artikel lesen
                  <ExternalLink className="w-4 h-4" />
                </a>
              </CardContent>
            </Card>

            {/* Focus Article */}
            <Card className="border-border hover:border-primary/50 transition-all hover:shadow-lg group">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">F</span>
                  </div>
                  <div>
                    <span className="font-semibold text-lg">Focus Online</span>
                    <p className="text-sm text-muted-foreground">2. September 2025</p>
                  </div>
                </div>
                <h4 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">
                  Amazon Markenaufbau: Diese Firmen setzen auf datengetriebenes Wachstum
                </h4>
                <p className="text-muted-foreground text-sm mb-4">
                  "Hinter diesen Marken stehen Unternehmen wie commercehelden, toolmacher und digiPULS – ergänzt durch die operative Betreuung durch die <strong className="text-foreground">Angelus Group</strong>."
                </p>
                <a 
                  href="https://unternehmen.focus.de/amazon-markenaufbau.html" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
                >
                  Artikel lesen
                  <ExternalLink className="w-4 h-4" />
                </a>
              </CardContent>
            </Card>

            {/* Scoredex Article */}
            <Card className="border-border hover:border-primary/50 transition-all hover:shadow-lg group">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-700 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">S</span>
                  </div>
                  <div>
                    <span className="font-semibold text-lg">Scoredex</span>
                    <p className="text-sm text-muted-foreground">24. September 2025</p>
                  </div>
                </div>
                <h4 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">
                  Angelus Group – Start-up-Finanzierung
                </h4>
                <p className="text-muted-foreground text-sm mb-4">
                  "Die <strong className="text-foreground">Angelus Group</strong> positioniert sich als vielseitiger Finanzpartner für Unternehmen und Start-ups mit maßgeschneiderten Lösungen jenseits klassischer Bankfinanzierungen."
                </p>
                <a 
                  href="https://www.scoredex.com/blog/angelus-group-start-up-finanzierung/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
                >
                  Artikel lesen
                  <ExternalLink className="w-4 h-4" />
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Investor Types Section */}
      <section id="investors" className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Für wen ist dieses Portal?
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="pt-6">
                <h3 className="text-xl font-semibold mb-4 text-green-800">Geeignet für</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Professionelle Investoren gemäß MiFID II</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Unternehmer und Business Angels</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Family Offices</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Institutionelle Investoren</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Erfahrene Anleger mit hoher Risikobereitschaft</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-red-50/50">
              <CardContent className="pt-6">
                <h3 className="text-xl font-semibold mb-4 text-red-800">Nicht geeignet für</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <span>Privatanleger / Verbraucher</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <span>Sicherheitsorientierte Anleger</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <span>Anleger ohne Erfahrung mit komplexen Finanzprodukten</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <span>Personen, die kurzfristige Liquidität benötigen</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <span>Anleger, die auf Kapitalerhalt angewiesen sind</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Risk Warning Section */}
      <section id="risk" className="py-20 bg-secondary">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <AlertTriangle className="w-8 h-8 text-primary" />
              <h2 className="text-2xl md:text-3xl font-bold text-secondary-foreground">
                Wichtiger Risikohinweis
              </h2>
            </div>
            
            <div className="space-y-4 text-secondary-foreground/80">
              <p>
                Die auf dieser Plattform angebotenen Beteiligungsformen sind mit <strong className="text-secondary-foreground">erheblichen Risiken</strong> verbunden 
                und richten sich ausschließlich an Unternehmer und professionelle Investoren im Sinne der EU-Prospektverordnung.
              </p>
              <p>
                Es besteht die Möglichkeit eines <strong className="text-secondary-foreground">vollständigen Verlustes des eingesetzten Kapitals</strong>. 
                Eine Rückzahlung oder Zinszahlung ist nicht garantiert und kann im Insolvenz- oder Krisenfall dauerhaft ausgeschlossen sein.
              </p>
              <p>
                <strong className="text-secondary-foreground">Mindestzeichnungssumme:</strong> 100.000 € — Aufgrund dieser Mindestzeichnungssumme 
                greift die Prospektausnahme nach Art. 1 Abs. 4 lit. c EU-ProspektVO.
              </p>
              <p>
                Jede Zeichnung unterliegt einem vollumfänglichen KYC/AML-Prüfprozess. 
                Erst nach erfolgreicher Prüfung ist eine Investition möglich.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-4">
              <HelpCircle className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Häufig gestellte Fragen
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Hier finden Sie Antworten auf die wichtigsten Fragen rund um Investitionen bei der Angelus Group.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1" className="border border-border rounded-lg mb-4 px-6 bg-card">
                <AccordionTrigger className="text-base font-semibold hover:no-underline">
                  Was ist die Mindestinvestitionssumme?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Die Mindestinvestitionssumme beträgt in der Regel <strong className="text-foreground">100.000 €</strong>. 
                  Wir bieten ausschließlich <strong className="text-foreground">prospektfreie Angebote</strong> oder 
                  <strong className="text-foreground"> individuelle Vereinbarungen</strong> an. Die genauen Konditionen 
                  werden für jedes Angebot separat festgelegt.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="border border-border rounded-lg mb-4 px-6 bg-card">
                <AccordionTrigger className="text-base font-semibold hover:no-underline">
                  Wer kann investieren?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Unsere Investitionsmöglichkeiten richten sich ausschließlich an <strong className="text-foreground">qualifizierte Investoren</strong> und 
                  <strong className="text-foreground"> professionelle Anleger</strong> im Sinne der EU-Prospektverordnung. Dazu zählen 
                  institutionelle Investoren, vermögende Privatpersonen und Unternehmer mit entsprechender Erfahrung 
                  im Finanzbereich.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3" className="border border-border rounded-lg mb-4 px-6 bg-card">
                <AccordionTrigger className="text-base font-semibold hover:no-underline">
                  Wie läuft der KYC-Prozess ab?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Nach der Registrierung durchlaufen Sie einen vollumfänglichen <strong className="text-foreground">KYC/AML-Prüfprozess</strong>. 
                  Dieser umfasst die Verifizierung Ihrer Identität, die Prüfung Ihrer Investoreneigenschaft sowie 
                  die Einhaltung aller regulatorischen Anforderungen. Erst nach erfolgreicher Prüfung ist eine 
                  Investition möglich.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4" className="border border-border rounded-lg mb-4 px-6 bg-card">
                <AccordionTrigger className="text-base font-semibold hover:no-underline">
                  Welche Risiken bestehen bei der Investition?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Alle Investitionen sind mit <strong className="text-foreground">erheblichen Risiken</strong> verbunden. 
                  Es besteht die Möglichkeit eines vollständigen Verlustes des eingesetzten Kapitals. Eine Rückzahlung 
                  oder Rendite ist nicht garantiert und kann im Insolvenz- oder Krisenfall dauerhaft ausgeschlossen sein. 
                  Bitte lesen Sie die detaillierten Risikohinweise vor einer Investition sorgfältig.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5" className="border border-border rounded-lg mb-4 px-6 bg-card">
                <AccordionTrigger className="text-base font-semibold hover:no-underline">
                  Wie werden Erträge ausgezahlt?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Die Auszahlungen erfolgen gemäß den jeweiligen <strong className="text-foreground">Vertragsbedingungen</strong>. 
                  In der Regel werden Erträge jährlich oder halbjährlich auf Ihr hinterlegtes Bankkonto oder 
                  in Ihr E-Wallet überwiesen. Den genauen Zahlungsplan finden Sie in Ihrem Investoren-Dashboard.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6" className="border border-border rounded-lg mb-4 px-6 bg-card">
                <AccordionTrigger className="text-base font-semibold hover:no-underline">
                  Welches Recht gilt für die Verträge?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Die Verträge unterliegen dem jeweils in den Vertragsbedingungen festgelegten Recht. 
                  Neue Vereinbarungen werden nach <strong className="text-foreground">Schweizer Recht</strong> geschlossen. 
                  Die genauen rechtlichen Rahmenbedingungen entnehmen Sie bitte den jeweiligen Vertragsdokumenten.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-7" className="border border-border rounded-lg mb-4 px-6 bg-card">
                <AccordionTrigger className="text-base font-semibold hover:no-underline">
                  Wie kann ich meine Investition überwachen?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Nach erfolgreicher Registrierung und KYC-Prüfung erhalten Sie Zugang zu Ihrem persönlichen 
                  <strong className="text-foreground"> Investoren-Dashboard</strong>. Dort können Sie alle Ihre Investitionen, 
                  Erträge, Dokumente und Transaktionen in Echtzeit einsehen und verwalten.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-8" className="border border-border rounded-lg mb-4 px-6 bg-card">
                <AccordionTrigger className="text-base font-semibold hover:no-underline">
                  In welchen Geschäftsbereichen ist die Angelus Group aktiv?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Die Angelus Group ist in verschiedenen Geschäftsbereichen tätig:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li><strong className="text-foreground">Unternehmensberatung</strong> – Strategische Beratung für Unternehmen</li>
                    <li><strong className="text-foreground">Distressed Debt & Sanierungen</strong> – Restrukturierung und Turnaround-Management</li>
                    <li><strong className="text-foreground">Immobilien</strong> – Immobilieninvestments und -entwicklung</li>
                    <li><strong className="text-foreground">Spezialdienstleistungen</strong> – Prozessfinanzierungen und Mietgarantien</li>
                    <li><strong className="text-foreground">Startup-Begleitung & Incubator</strong> – Förderung und Begleitung von Gründungen</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-9" className="border border-border rounded-lg px-6 bg-card">
                <AccordionTrigger className="text-base font-semibold hover:no-underline">
                  Wie ist die Angelus Group strukturiert?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Die Angelus Group setzt sich aus <strong className="text-foreground">verschiedenen Unternehmen</strong> zusammen, 
                  die je nach Projekt und Anforderung eingesetzt werden. Für bestimmte Investitionen arbeiten wir auch 
                  über <strong className="text-foreground">Zweckgesellschaften (SPVs)</strong>. Die Gruppe wird von 
                  <strong className="text-foreground"> diversen Banken und Finanzdienstleistern</strong> in verschiedenen 
                  Jurisdiktionen betreut, um eine optimale Struktur für jedes Projekt zu gewährleisten.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!isAuthenticated && (
        <section className="py-20">
          <div className="container">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Bereit zu investieren?
              </h2>
              <p className="text-muted-foreground mb-8">
                Registrieren Sie sich jetzt und erhalten Sie Zugang zu exklusiven Investitionsmöglichkeiten nach erfolgreicher KYC-Verifizierung.
              </p>
              <a href={getLoginUrl()}>
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
                  Jetzt starten
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </a>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="py-12 bg-secondary border-t border-border">
        <div className="container">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img 
                  src="/logo.png" 
                  alt="Angelus" 
                  className="w-8 h-8 object-contain"
                />
                <span className="font-semibold text-secondary-foreground">Angelus Group</span>
              </div>
              <p className="text-sm text-secondary-foreground/60">
                Professionelle Investitionsmöglichkeiten für qualifizierte Investoren.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-secondary-foreground">Rechtliches</h4>
              <ul className="space-y-2 text-sm text-secondary-foreground/60">
                <li><Link href="/impressum" className="hover:text-primary">Impressum</Link></li>
                <li><a href="#" className="hover:text-primary">Datenschutz</a></li>
                <li><a href="#" className="hover:text-primary">AGB</a></li>
                <li><a href="#" className="hover:text-primary">Risikohinweise</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-secondary-foreground">Kontakt</h4>
              <ul className="space-y-2 text-sm text-secondary-foreground/60">
                <li><a href="mailto:office@angelus.group" className="hover:text-primary">office@angelus.group</a></li>
                <li><a href="tel:08001750770" className="hover:text-primary">0800 175 077 0</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-secondary-foreground">Compliance</h4>
              <ul className="space-y-2 text-sm text-secondary-foreground/60">
                <li>Deutsches Recht (KG)</li>
                <li>KYC/AML-konform</li>
                <li>DSGVO-konform</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-border/50 mt-8 pt-8 text-center text-sm text-secondary-foreground/60">
            <p>© {new Date().getFullYear()} Angelus Group. Alle Rechte vorbehalten.</p>
          </div>
        </div>
      </footer>

      {/* Chatbot Placeholder */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button 
          size="lg" 
          className="rounded-full w-14 h-14 bg-primary text-primary-foreground shadow-lg hover:bg-primary/90"
          onClick={() => {
            // Chatbot integration placeholder
            alert("Chatbot wird in Kürze verfügbar sein.");
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </Button>
      </div>
    </div>
  );
}
