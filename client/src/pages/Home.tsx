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
              <p className="text-xs text-muted-foreground">Investor Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {loading ? (
              <div className="w-24 h-10 bg-muted animate-pulse rounded-lg" />
            ) : (
              <>
                <Link href="/sign-in">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link href="/sign-up">
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                    Register
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
              Angelus Group – Investor Portal
            </h1>
            <p className="text-lg text-muted-foreground mb-2">
              International corporate group with offices in <strong>Germany</strong>, <strong>Austria</strong>, <strong>Switzerland</strong>, <strong>Cyprus</strong>, <strong>United Kingdom</strong>, <strong>Estonia</strong>, <strong>Georgia</strong>, and <strong>St. Vincent and the Grenadines</strong>
            </p>
          </div>
        </div>
      </section>

      {/* Interactive Calculators Section */}
      <section className="py-12 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Financial Calculators</h2>
            <p className="text-muted-foreground">
              Use our tools for financial planning
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* Capital Duration Calculator */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-primary" />
                  Capital Calculator
                </CardTitle>
                <p className="text-sm text-muted-foreground">How long will your capital last?</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="capital">Available Capital (€)</Label>
                  <Input
                    id="capital"
                    type="number"
                    value={capital}
                    onChange={(e) => setCapital(e.target.value)}
                    placeholder="500000"
                  />
                </div>
                <div>
                  <Label htmlFor="withdrawal">Monthly Withdrawal (€)</Label>
                  <Input
                    id="withdrawal"
                    type="number"
                    value={monthlyWithdrawal}
                    onChange={(e) => setMonthlyWithdrawal(e.target.value)}
                    placeholder="3000"
                  />
                </div>
                <div>
                  <Label htmlFor="return">Expected Annual Return (%)</Label>
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
                  Calculate
                </Button>
                {yearsRemaining !== null && (
                  <div className="mt-4 p-4 bg-primary/10 border border-primary/20 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Your capital will last:</p>
                    <p className="text-2xl font-bold text-primary">
                      {yearsRemaining === Infinity
                        ? "Indefinitely"
                        : `${yearsRemaining.toFixed(1)} Years`}
                    </p>
                    {yearsRemaining !== Infinity && (
                      <p className="text-xs text-muted-foreground mt-2">
                        (approx. {Math.round(yearsRemaining * 12)} months)
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
                  Inflation Calculator
                </CardTitle>
                <p className="text-sm text-muted-foreground">What will your money be worth in X years?</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="amount">Amount Today (€)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="100000"
                  />
                </div>
                <div>
                  <Label htmlFor="years">Time Period (Years)</Label>
                  <Input
                    id="years"
                    type="number"
                    value={years}
                    onChange={(e) => setYears(e.target.value)}
                    placeholder="10"
                  />
                </div>
                <div>
                  <Label htmlFor="inflation">Expected Inflation p.a. (%)</Label>
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
                  Calculate
                </Button>
                {futureValue !== null && purchasingPowerLoss !== null && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Purchasing power in {years} years:</p>
                    <p className="text-2xl font-bold text-red-700">
                      €{futureValue.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                    </p>
                    <p className="text-sm text-red-600 mt-2">
                      Purchasing power loss: -€{purchasingPowerLoss.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      ({((purchasingPowerLoss / parseFloat(amount)) * 100).toFixed(1)}% less purchasing power)
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
                    <h3 className="text-xl font-semibold mb-3">Target Audience</h3>
                    <p className="text-muted-foreground mb-4">
                      This portal is exclusively for <strong className="text-foreground">professional and semi-professional investors</strong> with appropriate risk tolerance.
                    </p>
                    <div className="space-y-2">
                      <p className="text-sm">
                        <strong className="text-foreground">Minimum Investment:</strong> €100,000
                      </p>
                      <p className="text-sm">
                        <strong className="text-foreground">Target Group:</strong> Entrepreneurs, family offices, business angels, institutional investors
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Not suitable for retail investors, consumers, or security-oriented investors.
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
              Ready for Exclusive Investment Opportunities?
            </h2>
            <p className="text-secondary-foreground/70 mb-8">
              Register now and gain access to our investor portal after successful KYC verification.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/sign-up">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto">
                  Register Now
                </Button>
              </Link>
              <Link href="/sign-in">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Sign In
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
              <h3 className="text-lg font-semibold">Risk Warning</h3>
            </div>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                Investments through this portal involve <strong className="text-foreground">significant risks</strong> and are exclusively intended for professional investors.
              </p>
              <p>
                There is a possibility of <strong className="text-foreground">total loss of invested capital</strong>. Repayment or interest payment is not guaranteed.
              </p>
              <p>
                <strong className="text-foreground">Minimum subscription: €100,000</strong> – Prospectus exemption according to Art. 1 Para. 4 lit. c EU Prospectus Regulation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-secondary border-t border-border">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
            <div className="flex items-center gap-2">
              <img
                src="/logo.png"
                alt="Angelus Group"
                className="w-8 h-8 object-contain rounded bg-white/90 p-0.5"
              />
              <span className="font-semibold text-secondary-foreground">Angelus Group</span>
            </div>
            <div className="flex flex-wrap gap-6 text-sm text-secondary-foreground/60">
              <Link href="/privacy" className="hover:text-primary">Privacy Policy</Link>
              <Link href="/aml" className="hover:text-primary">AML Policy</Link>
              <Link href="/risk-disclosure" className="hover:text-primary">Risk Disclosure</Link>
            </div>
          </div>

          <div className="border-t border-border/50 pt-6">
            <div className="text-sm text-secondary-foreground/60 space-y-2">
              <p className="font-semibold text-secondary-foreground">Operator:</p>
              <p>
                <strong>Blue Globe Finance, LLC</strong><br />
                Lower Bay Street, Browne's Building 1st Floor, Suite 2131<br />
                Kingstown, St. Vincent and the Grenadines
              </p>
            </div>
          </div>

          <div className="text-center text-xs text-secondary-foreground/60 mt-6 pt-6 border-t border-border/50">
            © {new Date().getFullYear()} Blue Globe Finance, LLC. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
