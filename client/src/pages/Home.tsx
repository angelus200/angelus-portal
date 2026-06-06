import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Percent, Globe, UserCheck, ArrowRight, CheckCircle2, ShieldCheck,
  FileText, Briefcase, Lock,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { issuerBadgeClass } from "@/lib/issuerBadge";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";

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
        <Input
          tabIndex={-1}
          autoComplete="off"
          value={form.website}
          onChange={(e) => setForm(p => ({ ...p, website: e.target.value }))}
        />
      </div>

      <div className="flex items-start gap-3">
        <Checkbox id="lead-consent" checked={consent} onCheckedChange={(c) => setConsent(!!c)} />
        <Label htmlFor="lead-consent" className="cursor-pointer text-sm font-normal leading-relaxed text-muted-foreground">
          I agree that my data will be stored and used to contact me regarding investment opportunities.
        </Label>
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={!canSubmit}>
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

  const { data: bonds } = trpc.bonds.publicList.useQuery();
  const { data: issuersList } = trpc.issuers.list.useQuery();
  const badgeByKey = new Map((issuersList || []).map(i => [i.issuerKey, i.badgeColor]));
  const teaser = (bonds || []).slice(0, 3);

  const usps = [
    { icon: Percent, title: "Fixed Interest Rates", text: "Predictable, contractually fixed returns over a defined term — no market volatility." },
    { icon: Globe, title: "International Issuers", text: "Corporate bonds from established issuers across multiple jurisdictions." },
    { icon: UserCheck, title: "Personal Onboarding", text: "Dedicated account management from first enquiry through to investment." },
  ];

  const steps = [
    "Request Information",
    "Personal Consultation",
    "Verification (KYC)",
    "Invest & Earn",
  ];

  const trust = [
    { icon: Briefcase, text: "Established corporate issuers" },
    { icon: FileText, text: "Transparent terms — fixed rate, fixed term" },
    { icon: UserCheck, text: "Dedicated account management" },
    { icon: ShieldCheck, text: "Secure investor portal" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader />

      {/* Hero */}
      <section className="border-b bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 py-20 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
              Fixed-Rate Corporate Bonds for Professional Investors
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              Earn predictable returns with fixed-income investments from international issuers.
              Minimum investment €100,000. Access by invitation.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/bonds">
                <Button size="lg" className="gap-2">
                  View Current Bonds <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#contact">
                <Button size="lg" variant="outline">Request Information</Button>
              </a>
            </div>
          </div>

          <div className="mx-auto mt-16 grid max-w-4xl gap-6 md:grid-cols-3">
            {usps.map((u) => (
              <div key={u.title} className="rounded-lg border bg-card p-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <u.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">{u.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{u.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bond teaser */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-center text-3xl font-bold tracking-tight">Current Bond Offerings</h2>
        {teaser.length > 0 ? (
          <div className="mx-auto mt-10 grid max-w-5xl gap-6 md:grid-cols-3">
            {teaser.map((b) => (
              <Card key={b.id} className="transition-colors hover:border-primary/50">
                <CardContent className="space-y-4 pt-6">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold">{b.name}</h3>
                    {b.issuer && (
                      <Badge className={`text-xs ${issuerBadgeClass(badgeByKey.get(b.issuerKey))}`}>{b.issuer}</Badge>
                    )}
                  </div>
                  <p className="text-3xl font-bold text-primary">{b.interestRate}% <span className="text-base font-normal text-muted-foreground">p.a. fixed</span></p>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>Term: {b.termMonths} months</p>
                    <p>Min. investment: {b.currency} {parseFloat(b.minSubscription).toLocaleString("en-US")}</p>
                  </div>
                  <Link href="/bonds">
                    <Button variant="outline" className="w-full gap-2">View Details <ArrowRight className="h-4 w-4" /></Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="mt-8 text-center text-muted-foreground">
            New offerings are announced to registered investors first.
          </p>
        )}
      </section>

      {/* How it works */}
      <section id="about" className="border-y bg-muted/30">
        <div className="container mx-auto px-4 py-20">
          <h2 className="text-center text-3xl font-bold tracking-tight">How It Works</h2>
          <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-4">
            {steps.map((s, i) => (
              <div key={s} className="text-center">
                <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {i + 1}
                </div>
                <p className="text-sm font-medium">{s}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lead form */}
      <section id="contact" className="container mx-auto px-4 py-20">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold tracking-tight">Request Information</h2>
            <p className="mt-3 text-muted-foreground">
              Tell us about your investment goals and our team will get in touch.
            </p>
          </div>
          <Card>
            <CardContent className="pt-6">
              <LeadForm />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Trust */}
      <section className="border-t bg-muted/30">
        <div className="container mx-auto px-4 py-20">
          <h2 className="text-center text-3xl font-bold tracking-tight">Why MyBonds</h2>
          <div className="mx-auto mt-10 grid max-w-4xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {trust.map((t) => (
              <div key={t.text} className="flex flex-col items-center gap-3 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <t.icon className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm font-medium">{t.text}</p>
              </div>
            ))}
          </div>
          <div className="mx-auto mt-12 max-w-md">
            <Link href="/sign-in">
              <Button variant="outline" className="w-full gap-2">
                <Lock className="h-4 w-4" /> Investor Login
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
