import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Link, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Percent, UserCheck, CheckCircle2, ShieldCheck,
  FileText, Briefcase, Lock, CalendarClock, Coins, Calculator,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";

const eur = new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

// ============ Income Calculator (client-only, simple coupon logic, no compounding) ============
function IncomeCalculator() {
  const [amount, setAmount] = useState(250000);
  const [rate, setRate] = useState(9);
  const [termMonths, setTermMonths] = useState(36);
  const [freq, setFreq] = useState<"monthly" | "quarterly" | "annually">("monthly");

  const annualInterest = amount * (rate / 100);
  const monthlyIncome = annualInterest / 12;
  const perPayout = freq === "monthly" ? annualInterest / 12 : freq === "quarterly" ? annualInterest / 4 : annualInterest;
  const totalInterest = annualInterest * (termMonths / 12);
  const totalReturn = amount + totalInterest;

  const freqLabel = freq === "monthly" ? "month" : freq === "quarterly" ? "quarter" : "year";

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Inputs */}
      <div className="space-y-8">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base">Investment amount</Label>
            <span className="font-semibold tabular-nums text-slate-900">{eur.format(amount)}</span>
          </div>
          <Slider value={[amount]} min={100000} max={1000000} step={50000} onValueChange={(v) => setAmount(v[0])} />
          <div className="flex justify-between text-xs text-muted-foreground"><span>€100,000</span><span>€1,000,000</span></div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base">Annual interest rate</Label>
            <span className="font-semibold tabular-nums text-slate-900">{rate.toFixed(1)}%</span>
          </div>
          <Slider value={[rate]} min={6} max={12} step={0.5} onValueChange={(v) => setRate(v[0])} />
          <div className="flex justify-between text-xs text-muted-foreground"><span>6%</span><span>12%</span></div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Term</Label>
            <Select value={String(termMonths)} onValueChange={(v) => setTermMonths(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[12, 24, 36, 48, 60].map(m => <SelectItem key={m} value={String(m)}>{m} months</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Payout frequency</Label>
            <Select value={freq} onValueChange={(v) => setFreq(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="annually">Annually</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Result card (dark) */}
      <div className="rounded-2xl bg-[#0A1628] p-8 text-white shadow-xl">
        <p className="text-sm uppercase tracking-wide text-amber-400">Estimated monthly income</p>
        <p className="mt-2 text-5xl font-bold tabular-nums text-amber-400">{eur.format(monthlyIncome)}</p>

        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <span className="text-slate-300">Income per {freqLabel}</span>
            <span className="font-semibold tabular-nums">{eur.format(perPayout)}</span>
          </div>
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <span className="text-slate-300">Total interest over term</span>
            <span className="font-semibold tabular-nums">{eur.format(totalInterest)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-300">Total return at maturity</span>
            <span className="font-semibold tabular-nums">{eur.format(totalReturn)}</span>
          </div>
        </div>

        <a href="#contact" className="mt-8 block">
          <Button size="lg" className="w-full bg-amber-500 text-slate-950 hover:bg-amber-400">
            Request Information
          </Button>
        </a>
        <p className="mt-4 text-xs text-slate-400">
          For illustration only. Actual returns depend on the specific bond terms. Capital at risk.
        </p>
      </div>
    </div>
  );
}

// ============ Lead form (logic unchanged from Etappe 3) ============
const EMPTY_LEAD = {
  firstName: "", lastName: "", email: "", phone: "",
  continent: "", currency: "", investmentRange: "", message: "",
  website: "", // honeypot
};

function LeadForm() {
  const [form, setForm] = useState(EMPTY_LEAD);
  const [consent, setConsent] = useState(false);
  const [done, setDone] = useState(false);

  const submit = trpc.leads.submit.useMutation({
    onSuccess: () => setDone(true),
    onError: (e) => toast.error(e.message),
  });

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border bg-green-50/50 p-8 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-600" />
        <h3 className="text-xl font-semibold">Thank you</h3>
        <p className="text-muted-foreground">Our team will contact you within 2 business days.</p>
      </div>
    );
  }

  const canSubmit =
    form.firstName.trim() && form.lastName.trim() && form.email.trim() && consent && !submit.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    submit.mutate({
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      phone: form.phone || undefined,
      continent: form.continent || undefined,
      currency: (form.currency || undefined) as any,
      investmentRange: (form.investmentRange || undefined) as any,
      message: form.message || undefined,
      website: form.website || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>First name *</Label>
          <Input value={form.firstName} onChange={(e) => setForm(p => ({ ...p, firstName: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Last name *</Label>
          <Input value={form.lastName} onChange={(e) => setForm(p => ({ ...p, lastName: e.target.value }))} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Email *</Label>
          <Input type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Phone</Label>
          <Input value={form.phone} onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Continent</Label>
          <Select value={form.continent} onValueChange={(v) => setForm(p => ({ ...p, continent: v }))}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Europe">Europe</SelectItem>
              <SelectItem value="Asia">Asia</SelectItem>
              <SelectItem value="North America">North America</SelectItem>
              <SelectItem value="South America">South America</SelectItem>
              <SelectItem value="Africa">Africa</SelectItem>
              <SelectItem value="Oceania">Oceania</SelectItem>
              <SelectItem value="Middle East">Middle East</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Preferred currency</Label>
          <Select value={form.currency} onValueChange={(v) => setForm(p => ({ ...p, currency: v }))}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="GBP">GBP</SelectItem>
              <SelectItem value="CHF">CHF</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Intended investment</Label>
          <Select value={form.investmentRange} onValueChange={(v) => setForm(p => ({ ...p, investmentRange: v }))}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="100k-250k">€100k – €250k</SelectItem>
              <SelectItem value="250k-500k">€250k – €500k</SelectItem>
              <SelectItem value="500k-1m">€500k – €1M</SelectItem>
              <SelectItem value="1m+">€1M+</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Message</Label>
        <Textarea value={form.message} onChange={(e) => setForm(p => ({ ...p, message: e.target.value }))} rows={3} />
      </div>

      {/* Honeypot — hidden from humans */}
      <div className="hidden" aria-hidden="true">
        <Label>Website</Label>
        <Input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => setForm(p => ({ ...p, website: e.target.value }))} />
      </div>

      <div className="flex items-start gap-3">
        <Checkbox id="lead-consent" checked={consent} onCheckedChange={(c) => setConsent(!!c)} />
        <Label htmlFor="lead-consent" className="cursor-pointer text-sm font-normal leading-relaxed text-muted-foreground">
          I agree that my data will be stored and used to contact me regarding investment opportunities.
        </Label>
      </div>

      <Button type="submit" size="lg" className="w-full bg-amber-500 text-slate-950 hover:bg-amber-400" disabled={!canSubmit}>
        {submit.isPending ? "Sending…" : "Request Information"}
      </Button>
    </form>
  );
}

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  // Eingeloggte User: direkt ins jeweilige Portal (Bestands-Investoren/Admins)
  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      if (user.role === "admin" || user.role === "superadmin") setLocation("/admin");
      else setLocation("/investor");
    }
  }, [loading, isAuthenticated, user, setLocation]);

  const steps = ["Request Information", "Personal Consultation", "Verification (KYC)", "Invest & Earn"];

  const trust = [
    { icon: Briefcase, text: "Established corporate issuers" },
    { icon: FileText, text: "Transparent terms — fixed rate, fixed term" },
    { icon: UserCheck, text: "Dedicated account management" },
    { icon: ShieldCheck, text: "Secure investor portal" },
  ];

  const faqs = [
    { q: "What is the minimum investment?", a: "€100,000 per bond subscription." },
    { q: "How do I get access?", a: "Access is by invitation after a personal consultation and KYC verification." },
    { q: "When do I receive interest payments?", a: "According to the coupon schedule of the bond — monthly, quarterly or annually." },
    { q: "What happens at maturity?", a: "The issuer repays the principal in full at the end of the term." },
    { q: "What are the risks?", a: "Corporate bonds carry issuer default risk. High-yield bonds offer higher rates to compensate for elevated risk. Capital is at risk." },
    { q: "Can I sell my bond early?", a: "Our bonds are designed to be held to maturity. Early redemption options depend on the specific bond terms." },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <PublicHeader />

      {/* 3a Hero */}
      <section className="relative overflow-hidden bg-slate-950">
        <img src="/img/hero-skyline.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-slate-950/80" />
        <div className="container relative mx-auto px-4 py-28 md:py-36">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-amber-400">Fixed-Income Investments</p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-white md:text-6xl">
              Earn Predictable Passive Income with Corporate Bonds
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-slate-300">
              Fixed interest rates. Fixed terms. Professional investors earn reliable returns with
              high-yield corporate bonds from international issuers.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#calculator">
                <Button size="lg" className="gap-2 bg-amber-500 text-slate-950 hover:bg-amber-400">
                  <Calculator className="h-4 w-4" /> Calculate Your Income
                </Button>
              </a>
              <Link href="/bonds">
                <Button size="lg" variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white">
                  View Current Bonds
                </Button>
              </Link>
            </div>
            <div className="mt-12 grid max-w-xl grid-cols-1 gap-6 sm:grid-cols-3">
              {["Fixed rates", "Terms from 12 months", "Minimum €100,000"].map((s) => (
                <div key={s} className="border-l-2 border-amber-400 pl-4">
                  <p className="text-sm font-medium text-white">{s}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3b Calculator */}
      <section id="calculator" className="bg-slate-50">
        <div className="container mx-auto px-4 py-20 md:py-28">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Calculate Your Passive Income</h2>
            <p className="mt-3 text-muted-foreground">
              See what fixed-rate corporate bonds could generate for your portfolio.
            </p>
          </div>
          <div className="mx-auto max-w-5xl">
            <IncomeCalculator />
          </div>
        </div>
      </section>

      {/* 3c Education: What are corporate bonds */}
      <section id="about" className="bg-[#0A1628] text-white">
        <div className="container mx-auto grid items-center gap-12 px-4 py-20 md:grid-cols-2 md:py-28">
          <div className="overflow-hidden rounded-2xl">
            <img src="/img/education-meeting.jpg" alt="Investor consultation" className="h-full w-full object-cover" />
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">What Are Corporate Bonds?</h2>
            <div className="mt-6 space-y-4 text-slate-300">
              <p>
                A corporate bond is a loan you provide to a company. In return, the issuer pays you a fixed
                rate of interest — the coupon — over a defined term, and repays your capital in full when the
                bond reaches maturity.
              </p>
              <p>
                Unlike shares, bonds are not about chasing price appreciation. Your return is defined by
                contract from the outset: a known interest rate, a known schedule, and a known maturity date.
              </p>
              <p>
                This makes bonds a cornerstone of income-oriented portfolios for investors who value
                predictability over speculation.
              </p>
            </div>
            <ul className="mt-8 space-y-3">
              {[
                { icon: Coins, text: "Fixed coupon payments" },
                { icon: CalendarClock, text: "Defined maturity date" },
                { icon: ShieldCheck, text: "Contractual repayment of principal" },
              ].map((b) => (
                <li key={b.text} className="flex items-center gap-3">
                  <b.icon className="h-5 w-5 shrink-0 text-amber-400" />
                  <span className="text-white">{b.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 3d High-yield income */}
      <section className="bg-slate-50">
        <div className="container mx-auto px-4 py-20 md:py-28">
          <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">How High-Yield Bonds Generate Income</h2>
          <div className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-3">
            {[
              { icon: Percent, title: "Higher Coupons", text: "High-yield issuers pay above-average interest to compensate investors for elevated risk." },
              { icon: CalendarClock, title: "Regular Payouts", text: "Coupons are paid on a fixed schedule — monthly, quarterly or annually — creating a predictable income stream." },
              { icon: ShieldCheck, title: "Principal at Maturity", text: "At the end of the term, the issuer repays the full principal amount." },
            ].map((c) => (
              <Card key={c.title} className="border-slate-200">
                <CardContent className="space-y-3 pt-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100">
                    <c.icon className="h-6 w-6 text-amber-600" />
                  </div>
                  <h3 className="font-semibold">{c.title}</h3>
                  <p className="text-sm text-muted-foreground">{c.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="mx-auto mt-10 max-w-3xl text-center text-sm text-muted-foreground">
            High-yield bonds carry elevated default risk compared to investment-grade securities. They are
            intended for professional investors who understand and can bear this risk.
          </p>
        </div>
      </section>

      {/* 3e How it works */}
      <section className="relative overflow-hidden bg-slate-950">
        <img src="/img/growth-chart.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />
        <div className="container relative mx-auto px-4 py-20 md:py-28">
          <h2 className="text-center text-3xl font-bold tracking-tight text-white md:text-4xl">How It Works</h2>
          <div className="mx-auto mt-12 grid max-w-4xl gap-8 md:grid-cols-4">
            {steps.map((s, i) => (
              <div key={s} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500 text-lg font-bold text-slate-950">
                  {i + 1}
                </div>
                <p className="text-sm font-medium text-white">{s}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3f Why MyBonds */}
      <section className="bg-slate-50">
        <div className="container mx-auto px-4 py-20 md:py-28">
          <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">Why MyBonds</h2>
          <div className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {trust.map((t) => (
              <Card key={t.text} className="border-slate-200">
                <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100">
                    <t.icon className="h-6 w-6 text-amber-600" />
                  </div>
                  <p className="text-sm font-medium">{t.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 3g FAQ */}
      <section className="bg-[#0A1628] text-white">
        <div className="container mx-auto px-4 py-20 md:py-28">
          <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">Frequently Asked Questions</h2>
          <div className="mx-auto mt-10 max-w-3xl">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((f, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="border-white/10">
                  <AccordionTrigger className="text-left text-white hover:no-underline">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-slate-300">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* 3h Lead form */}
      <section id="contact" className="bg-slate-950">
        <div className="container mx-auto px-4 py-20 md:py-28">
          <div className="mx-auto max-w-2xl">
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">Request Information</h2>
              <p className="mt-3 text-slate-300">
                Tell us about your investment goals and our team will get in touch.
              </p>
            </div>
            <Card className="bg-white">
              <CardContent className="pt-6">
                <LeadForm />
              </CardContent>
            </Card>
            <div className="mt-8 text-center">
              <Link href="/sign-in">
                <Button variant="outline" className="gap-2 border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white">
                  <Lock className="h-4 w-4" /> Already an investor? Sign in
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
