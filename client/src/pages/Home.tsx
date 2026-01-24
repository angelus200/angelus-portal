import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Calculator, TrendingDown } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useEffect, useState } from "react";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  // Capital Calculator State
  const [capital, setCapital] = useState("500000");
  const [monthlyWithdrawal, setMonthlyWithdrawal] = useState("3000");
  const [expectedReturn, setExpectedReturn] = useState("5");
  const [yearsRemaining, setYearsRemaining] = useState<number | null>(null);

  // Inflation Calculator State
  const [amount, setAmount] = useState("100000");
  const [years, setYears] = useState("10");
  const [inflationRate, setInflationRate] = useState("3");
  const [futureValue, setFutureValue] = useState<number | null>(null);
  const [purchasingPowerLoss, setPurchasingPowerLoss] = useState<number | null>(null);

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

  // Calculate how long capital will last
  const calculateCapitalDuration = () => {
    const c = parseFloat(capital);
    const m = parseFloat(monthlyWithdrawal);
    const r = parseFloat(expectedReturn) / 100 / 12; // Monthly return rate

    if (isNaN(c) || isNaN(m) || isNaN(r) || c <= 0 || m <= 0) {
      setYearsRemaining(null);
      return;
    }

    if (r === 0) {
      // No return, simple division
      const months = c / m;
      setYearsRemaining(months / 12);
      return;
    }

    // Formula: n = -ln(1 - (C * r) / M) / ln(1 + r)
    // Where n = number of months
    const ratio = (c * r) / m;

    if (ratio >= 1) {
      // Capital grows indefinitely
      setYearsRemaining(Infinity);
      return;
    }

    const months = -Math.log(1 - ratio) / Math.log(1 + r);
    setYearsRemaining(months / 12);
  };

  // Calculate future purchasing power
  const calculateInflation = () => {
    const a = parseFloat(amount);
    const y = parseFloat(years);
    const i = parseFloat(inflationRate) / 100;

    if (isNaN(a) || isNaN(y) || isNaN(i) || a <= 0 || y < 0) {
      setFutureValue(null);
      setPurchasingPowerLoss(null);
      return;
    }

    // Future purchasing power: P = A / (1 + i)^y
    const future = a / Math.pow(1 + i, y);
    setFutureValue(future);
    setPurchasingPowerLoss(a - future);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Angelus Group"
              className="w-10 h-10 object-contain rounded bg-white/90 p-0.5"
            />
            <div>
              <span className="font-semibold text-lg">Angelus Group</span>
              <p className="text-xs text-muted-foreground">Investorenportal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {loading ? (
              <div className="w-24 h-10 bg-muted animate-pulse rounded-lg" />
            ) : (
              <>
                <Link href="/sign-in">
                  <Button variant="ghost">Anmelden</Button>
                </Link>
                <Link href="/sign-up">
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                    Registrieren
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-12">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Angelus Group – Investorenportal
            </h1>
            <p className="text-lg text-muted-foreground mb-2">
              Unternehmensgruppe mit Standorten in <strong>Deutschland</strong>, <strong>Österreich</strong>, <strong>Schweiz</strong>, <strong>Zypern</strong>, <strong>UK</strong>, <strong>Estland</strong>, <strong>Georgien</strong> und <strong>St. Vincent</strong>
            </p>
          </div>
        </div>
      </section>

      {/* Interactive Calculators Section */}
      <section className="py-12 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Finanzrechner</h2>
            <p className="text-muted-foreground">
              Nutzen Sie unsere Tools zur Finanzplanung
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* Capital Duration Calculator */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-primary" />
                  Kapitalrechner
                </CardTitle>
                <p className="text-sm text-muted-foreground">Wie lange reicht Ihr Kapital?</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="capital">Vorhandenes Kapital (€)</Label>
                  <Input
                    id="capital"
                    type="number"
                    value={capital}
                    onChange={(e) => setCapital(e.target.value)}
                    placeholder="500000"
                  />
                </div>
                <div>
                  <Label htmlFor="withdrawal">Monatliche Entnahme (€)</Label>
                  <Input
                    id="withdrawal"
                    type="number"
                    value={monthlyWithdrawal}
                    onChange={(e) => setMonthlyWithdrawal(e.target.value)}
                    placeholder="3000"
                  />
                </div>
                <div>
                  <Label htmlFor="return">Erwartete jährliche Rendite (%)</Label>
                  <Input
                    id="return"
                    type="number"
                    step="0.1"
                    value={expectedReturn}
                    onChange={(e) => setExpectedReturn(e.target.value)}
                    placeholder="5"
                  />
                </div>
                <Button onClick={calculateCapitalDuration} className="w-full">
                  Berechnen
                </Button>
                {yearsRemaining !== null && (
                  <div className="mt-4 p-4 bg-primary/10 border border-primary/20 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Ihr Kapital reicht für:</p>
                    <p className="text-2xl font-bold text-primary">
                      {yearsRemaining === Infinity
                        ? "Unbegrenzt"
                        : `${yearsRemaining.toFixed(1)} Jahre`}
                    </p>
                    {yearsRemaining !== Infinity && (
                      <p className="text-xs text-muted-foreground mt-2">
                        (ca. {Math.round(yearsRemaining * 12)} Monate)
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Inflation Calculator */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-primary" />
                  Inflationsrechner
                </CardTitle>
                <p className="text-sm text-muted-foreground">Was ist Ihr Geld in X Jahren wert?</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="amount">Betrag heute (€)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="100000"
                  />
                </div>
                <div>
                  <Label htmlFor="years">Zeitraum (Jahre)</Label>
                  <Input
                    id="years"
                    type="number"
                    value={years}
                    onChange={(e) => setYears(e.target.value)}
                    placeholder="10"
                  />
                </div>
                <div>
                  <Label htmlFor="inflation">Erwartete Inflation p.a. (%)</Label>
                  <Input
                    id="inflation"
                    type="number"
                    step="0.1"
                    value={inflationRate}
                    onChange={(e) => setInflationRate(e.target.value)}
                    placeholder="3"
                  />
                </div>
                <Button onClick={calculateInflation} className="w-full">
                  Berechnen
                </Button>
                {futureValue !== null && purchasingPowerLoss !== null && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Kaufkraft in {years} Jahren:</p>
                    <p className="text-2xl font-bold text-red-700">
                      €{futureValue.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                    </p>
                    <p className="text-sm text-red-600 mt-2">
                      Kaufkraftverlust: -€{purchasingPowerLoss.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      ({((purchasingPowerLoss / parseFloat(amount)) * 100).toFixed(1)}% weniger Kaufkraft)
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Target Audience Section */}
      <section className="py-16">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <AlertTriangle className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-semibold mb-3">Zielgruppe</h3>
                    <p className="text-muted-foreground mb-4">
                      Dieses Portal richtet sich ausschließlich an <strong className="text-foreground">professionelle und semiprofessionelle Investoren</strong> mit entsprechender Risikobereitschaft.
                    </p>
                    <div className="space-y-2">
                      <p className="text-sm">
                        <strong className="text-foreground">Mindestanlage:</strong> 100.000 €
                      </p>
                      <p className="text-sm">
                        <strong className="text-foreground">Zielgruppe:</strong> Unternehmer, Family Offices, Business Angels, institutionelle Investoren
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Nicht geeignet für Privatanleger, Verbraucher oder sicherheitsorientierte Anleger.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-secondary">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4 text-secondary-foreground">
              Bereit für exklusive Investitionsmöglichkeiten?
            </h2>
            <p className="text-secondary-foreground/70 mb-8">
              Registrieren Sie sich und erhalten Sie nach erfolgreicher KYC-Verifizierung Zugang zu unserem Investorenportal.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/sign-up">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto">
                  Jetzt registrieren
                </Button>
              </Link>
              <Link href="/sign-in">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Anmelden
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Risk Warning Section */}
      <section className="py-12 bg-muted/50">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-destructive" />
              <h3 className="text-lg font-semibold">Risikohinweis</h3>
            </div>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                Investitionen über dieses Portal sind mit <strong className="text-foreground">erheblichen Risiken</strong> verbunden und richten sich ausschließlich an professionelle Investoren.
              </p>
              <p>
                Es besteht die Möglichkeit eines <strong className="text-foreground">vollständigen Verlustes des eingesetzten Kapitals</strong>. Eine Rückzahlung oder Zinszahlung ist nicht garantiert.
              </p>
              <p>
                <strong className="text-foreground">Mindestzeichnung: 100.000 €</strong> – Prospektausnahme nach Art. 1 Abs. 4 lit. c EU-ProspektVO.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-secondary border-t border-border">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <img
                src="/logo.png"
                alt="Angelus Group"
                className="w-8 h-8 object-contain rounded bg-white/90 p-0.5"
              />
              <span className="font-semibold text-secondary-foreground">Angelus Group</span>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-secondary-foreground/60">
              <Link href="/impressum" className="hover:text-primary">Impressum</Link>
              <Link href="/datenschutz" className="hover:text-primary">Datenschutz</Link>
              <Link href="/aml" className="hover:text-primary">AML Richtlinie</Link>
            </div>
          </div>
          <div className="text-center text-xs text-secondary-foreground/60 mt-6">
            © {new Date().getFullYear()} Angelus Group. Alle Rechte vorbehalten.
          </div>
        </div>
      </footer>
    </div>
  );
}
