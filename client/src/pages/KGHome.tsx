import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Calculator, CalendarClock, CheckCircle2, XCircle, TrendingDown, Scale,
  CalendarCheck, ShieldCheck, ArrowRight, CalendarDays,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";

const CALENDLY = "https://calendly.com/carlotteherr/anleihen";
const eur = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

// ============ Rendite-Rechner (rein client-seitig, einfache Coupon-Logik, kein Zinseszins) ============
function RenditeRechner() {
  const [amount, setAmount] = useState(250000);
  const [rate, setRate] = useState(9);
  const [termMonths, setTermMonths] = useState(36);
  const [freq, setFreq] = useState<"monatlich" | "quartalsweise" | "jaehrlich">("monatlich");

  const annual = amount * (rate / 100);
  const monthly = annual / 12;
  const perPayout = freq === "monatlich" ? annual / 12 : freq === "quartalsweise" ? annual / 4 : annual;
  const total = annual * (termMonths / 12);
  const totalReturn = amount + total;
  const payoutLabel = freq === "monatlich" ? "Monat" : freq === "quartalsweise" ? "Quartal" : "Jahr";

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-8">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base">Anlagebetrag</Label>
            <span className="font-semibold tabular-nums text-slate-900">{eur.format(amount)}</span>
          </div>
          <Slider value={[amount]} min={100000} max={1000000} step={50000} onValueChange={(v) => setAmount(v[0])} />
          <div className="flex justify-between text-xs text-muted-foreground"><span>100.000 €</span><span>1.000.000 €</span></div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base">Zinssatz p.a.</Label>
            <span className="font-semibold tabular-nums text-slate-900">{rate.toFixed(1)} %</span>
          </div>
          <Slider value={[rate]} min={6} max={12} step={0.5} onValueChange={(v) => setRate(v[0])} />
          <div className="flex justify-between text-xs text-muted-foreground"><span>6 %</span><span>12 %</span></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Laufzeit</Label>
            <Select value={String(termMonths)} onValueChange={(v) => setTermMonths(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[12, 24, 36, 48, 60].map(m => <SelectItem key={m} value={String(m)}>{m} Monate</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Auszahlungsfrequenz</Label>
            <Select value={freq} onValueChange={(v) => setFreq(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monatlich">Monatlich</SelectItem>
                <SelectItem value="quartalsweise">Quartalsweise</SelectItem>
                <SelectItem value="jaehrlich">Jährlich</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-[#0A1628] p-8 text-white shadow-xl">
        <p className="text-sm uppercase tracking-wide text-amber-400">Geschätzte monatliche Rendite</p>
        <p className="mt-2 text-5xl font-bold tabular-nums text-amber-400">{eur.format(monthly)}</p>
        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <span className="text-slate-300">Rendite je {payoutLabel}</span>
            <span className="font-semibold tabular-nums">{eur.format(perPayout)}</span>
          </div>
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <span className="text-slate-300">Gesamtrendite über Laufzeit</span>
            <span className="font-semibold tabular-nums">{eur.format(total)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-300">Gesamtrückfluss bei Fälligkeit</span>
            <span className="font-semibold tabular-nums">{eur.format(totalReturn)}</span>
          </div>
        </div>
        <a href="#contact" className="mt-8 block">
          <Button size="lg" className="w-full bg-amber-500 text-slate-950 hover:bg-amber-400">Informationen anfordern</Button>
        </a>
        <p className="mt-4 text-xs text-slate-400">
          Nur zur Illustration. Angebote richten sich ausschließlich an juristische Personen. Kapitalverlustrisiko.
        </p>
      </div>
    </div>
  );
}

// ============ Selbstcheck (DE, client-seitig) ============
type Prefill = { companyType?: string; investmentRange?: string; selfCheck?: string };

function bewertung(horizont: string, prio: string): string {
  if (prio === "kapitalerhalt") {
    return horizont === "12m"
      ? "Kurzfristige festverzinsliche Anleihen mit jährlichem Coupon und konservativer Emittentenauswahl passen zu Ihrem Profil."
      : "Festverzinsliche Anleihen mit konservativer Emittentenauswahl über Ihre gewählte Laufzeit stellen Kapitalstabilität in den Vordergrund.";
  }
  if (prio === "rendite") {
    return horizont === "12m"
      ? "Kurzlaufende High-Yield-Anleihen bieten einen erhöhten Coupon bei kürzerer Bindung."
      : "Mehrjährige High-Yield-Unternehmensanleihen mit quartalsweisem oder monatlichem Coupon passen zu Ihrem Renditefokus.";
  }
  // cashflow
  return horizont === "12m"
    ? "Kurzfristige Anleihen mit monatlichem oder quartalsweisem Coupon liefern einen stetigen, kurzfristigen Cashflow."
    : "Mehrjährige Anleihen mit monatlichem oder quartalsweisem Coupon bauen einen planbaren, wiederkehrenden Cashflow für Ihre Treasury auf.";
}

function Selbstcheck({ onApply }: { onApply: (p: Prefill) => void }) {
  const [rechtsform, setRechtsform] = useState("");
  const [volumen, setVolumen] = useState("");
  const [horizont, setHorizont] = useState("");
  const [prio, setPrio] = useState("");
  const complete = !!(rechtsform && volumen && horizont && prio);
  const summary = `Rechtsform: ${rechtsform} · Volumen: ${volumen} · Horizont: ${horizont} · Priorität: ${prio}`;

  const fragen = [
    { label: "Welche Rechtsform haben Sie?", value: rechtsform, set: setRechtsform,
      options: [["corporate", "Unternehmen"], ["family_office", "Family Office"], ["institutional", "Institutioneller Investor"]] },
    { label: "Wie viel Liquidität könnten Sie allokieren?", value: volumen, set: setVolumen,
      options: [["100k-250k", "100k – 250k €"], ["250k-500k", "250k – 500k €"], ["500k-1m", "500k – 1 Mio. €"], ["1m+", "1 Mio. €+"]] },
    { label: "Was ist Ihr Anlagehorizont?", value: horizont, set: setHorizont,
      options: [["12m", "12 Monate"], ["24m", "24 Monate"], ["36m+", "36+ Monate"]] },
    { label: "Was ist Ihnen am wichtigsten?", value: prio, set: setPrio,
      options: [["rendite", "Maximale Rendite"], ["cashflow", "Planbarer Cashflow"], ["kapitalerhalt", "Kapitalerhalt"]] },
  ];

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-6">
        {fragen.map((f) => (
          <div key={f.label} className="space-y-2">
            <Label className="text-base">{f.label}</Label>
            <Select value={f.value} onValueChange={f.set}>
              <SelectTrigger><SelectValue placeholder="Bitte wählen" /></SelectTrigger>
              <SelectContent>
                {f.options.map(([val, lbl]) => <SelectItem key={val} value={val}>{lbl}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
      <div className="rounded-2xl bg-[#0A1628] p-8 text-white shadow-xl">
        {complete ? (
          <>
            <p className="text-sm uppercase tracking-wide text-amber-400">Ihre Einschätzung</p>
            <p className="mt-3 text-lg leading-relaxed">{bewertung(horizont, prio)}</p>
            <p className="mt-6 text-xs text-slate-400">
              Dies ist eine erste Einschätzung, keine Anlageberatung. Die konkreten Konditionen hängen von der
              jeweiligen Anleihe und der Verifizierung Ihres Unternehmens ab.
            </p>
            <Button
              size="lg"
              className="mt-8 w-full gap-2 bg-amber-500 text-slate-950 hover:bg-amber-400"
              onClick={() => onApply({ companyType: rechtsform, investmentRange: volumen, selfCheck: summary })}
            >
              Setup besprechen — Informationen anfordern <ArrowRight className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center py-12 text-center">
            <Scale className="mb-4 h-10 w-10 text-amber-400/70" />
            <p className="text-slate-300">Beantworten Sie alle vier Fragen, um eine passende Einschätzung zu erhalten.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ Lead-Formular (DE, juristische Personen) ============
const EMPTY_LEAD = {
  companyName: "", companyType: "", jobTitle: "",
  firstName: "", lastName: "", email: "", phone: "",
  investmentRange: "", message: "", selfCheck: "",
  website: "", // Honeypot
};

function LeadForm({ prefill }: { prefill: Prefill | null }) {
  const [form, setForm] = useState(EMPTY_LEAD);
  const [entityConfirm, setEntityConfirm] = useState(false);
  const [consent, setConsent] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!prefill) return;
    setForm(p => ({
      ...p,
      companyType: prefill.companyType ?? p.companyType,
      investmentRange: prefill.investmentRange ?? p.investmentRange,
      selfCheck: prefill.selfCheck ?? p.selfCheck,
    }));
  }, [prefill]);

  const submit = trpc.leads.submit.useMutation({
    onSuccess: () => setDone(true),
    onError: (e) => toast.error(e.message),
  });

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border bg-green-50/50 p-8 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-600" />
        <h3 className="text-xl font-semibold">Vielen Dank</h3>
        <p className="text-muted-foreground">Unser Team meldet sich innerhalb von 2 Werktagen bei Ihnen.</p>
      </div>
    );
  }

  const canSubmit =
    form.companyName.trim() && form.companyType && form.firstName.trim() && form.lastName.trim() &&
    form.email.trim() && entityConfirm && consent && !submit.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    submit.mutate({
      companyName: form.companyName,
      companyType: form.companyType as any,
      jobTitle: form.jobTitle || undefined,
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      phone: form.phone || undefined,
      investmentRange: (form.investmentRange || undefined) as any,
      message: form.message || undefined,
      selfCheck: form.selfCheck || undefined,
      entityConfirmation: true,
      website: form.website || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Firmenname *</Label>
          <Input value={form.companyName} onChange={(e) => setForm(p => ({ ...p, companyName: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Rechtsform *</Label>
          <Select value={form.companyType} onValueChange={(v) => setForm(p => ({ ...p, companyType: v }))}>
            <SelectTrigger><SelectValue placeholder="Bitte wählen" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="corporate">Unternehmen</SelectItem>
              <SelectItem value="family_office">Family Office</SelectItem>
              <SelectItem value="institutional">Institutioneller Investor</SelectItem>
              <SelectItem value="other">Sonstige</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Vorname (Ansprechpartner) *</Label>
          <Input value={form.firstName} onChange={(e) => setForm(p => ({ ...p, firstName: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Nachname (Ansprechpartner) *</Label>
          <Input value={form.lastName} onChange={(e) => setForm(p => ({ ...p, lastName: e.target.value }))} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Funktion <span className="text-xs text-muted-foreground">(z. B. CFO, Treasurer)</span></Label>
          <Input value={form.jobTitle} onChange={(e) => setForm(p => ({ ...p, jobTitle: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>E-Mail *</Label>
          <Input type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Telefon</Label>
          <Input value={form.phone} onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Geplantes Volumen</Label>
          <Select value={form.investmentRange} onValueChange={(v) => setForm(p => ({ ...p, investmentRange: v }))}>
            <SelectTrigger><SelectValue placeholder="Bitte wählen" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="100k-250k">100k – 250k €</SelectItem>
              <SelectItem value="250k-500k">250k – 500k €</SelectItem>
              <SelectItem value="500k-1m">500k – 1 Mio. €</SelectItem>
              <SelectItem value="1m+">1 Mio. €+</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Nachricht</Label>
        <Textarea value={form.message} onChange={(e) => setForm(p => ({ ...p, message: e.target.value }))} rows={3} />
      </div>

      {/* Honeypot */}
      <div className="hidden" aria-hidden="true">
        <Label>Website</Label>
        <Input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => setForm(p => ({ ...p, website: e.target.value }))} />
      </div>

      <div className="flex items-start gap-3">
        <Checkbox id="kg-entity" checked={entityConfirm} onCheckedChange={(c) => setEntityConfirm(!!c)} />
        <Label htmlFor="kg-entity" className="cursor-pointer text-sm font-normal leading-relaxed text-muted-foreground">
          Ich bestätige, dass ich im Namen einer juristischen Person handle (Unternehmen, Family Office oder institutioneller Investor).
        </Label>
      </div>
      <div className="flex items-start gap-3">
        <Checkbox id="kg-consent" checked={consent} onCheckedChange={(c) => setConsent(!!c)} />
        <Label htmlFor="kg-consent" className="cursor-pointer text-sm font-normal leading-relaxed text-muted-foreground">
          Ich bin damit einverstanden, dass meine Daten gespeichert und zur Kontaktaufnahme bezüglich Anlagemöglichkeiten verwendet werden.
        </Label>
      </div>

      <Button type="submit" size="lg" className="w-full bg-amber-500 text-slate-950 hover:bg-amber-400" disabled={!canSubmit}>
        {submit.isPending ? "Wird gesendet…" : "Informationen anfordern"}
      </Button>
    </form>
  );
}

export default function KGHome() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [prefill, setPrefill] = useState<Prefill | null>(null);

  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      if (user.role === "admin" || user.role === "superadmin") setLocation("/admin");
      else setLocation("/investor");
    }
  }, [loading, isAuthenticated, user, setLocation]);

  const applyFromSelfCheck = (p: Prefill) => {
    setPrefill(p);
    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
  };

  const why = [
    { icon: TrendingDown, title: "Liquidität verliert real an Wert", text: "Auf niedrig verzinsten Konten geparkte Reserven verlieren Jahr für Jahr Kaufkraft. Inflation besteuert jeden Euro, der nicht arbeitet." },
    { icon: Scale, title: "Opportunitätskosten sind echte Kosten", text: "Die Differenz zwischen 0 % und einem festen Coupon ist nicht abstrakt — sie ist messbarer Gewinn, auf den Ihr Unternehmen jedes Quartal verzichtet." },
    { icon: CalendarCheck, title: "Planbarkeit statt Spekulation", text: "Festverzinsliche Instrumente machen aus Reserven eine planbare Cashflow-Linie — ohne das Betriebskapital der Marktvolatilität auszusetzen." },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <PublicHeader />

      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-950">
        <img src="/img/hero-skyline.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-slate-950/85" />
        <div className="container relative mx-auto px-4 py-24 md:py-32">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-amber-400">Für Unternehmen &amp; Family Offices</p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-white md:text-6xl">Anleiheportal der Angelus KG</h1>
            <p className="mt-6 max-w-2xl text-lg text-slate-300">
              Die Angelus Managementberatungs und Service KG stellt Unternehmensanleihen für Unternehmen und
              Family Offices bereit — feste Zinsen, feste Laufzeiten, planbare Erträge auf Ihre Liquiditätsreserven.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#calculator">
                <Button size="lg" className="gap-2 bg-amber-500 text-slate-950 hover:bg-amber-400">
                  <Calculator className="h-4 w-4" /> Rendite berechnen
                </Button>
              </a>
              <a href={CALENDLY} target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="gap-2 border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white">
                  <CalendarDays className="h-4 w-4" /> Termin vereinbaren
                </Button>
              </a>
            </div>
            <div className="mt-12 grid max-w-2xl grid-cols-2 gap-6 sm:grid-cols-4">
              {["Feste Zinsen", "Laufzeiten ab 12 Monaten", "Mindestzeichnung 100.000 €", "Nur juristische Personen"].map((s) => (
                <div key={s} className="border-l-2 border-amber-400 pl-4"><p className="text-sm font-medium text-white">{s}</p></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Why */}
      <section className="bg-[#0A1628] text-white">
        <div className="container mx-auto px-4 py-20 md:py-28">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-amber-400">Treasury-Performance</p>
          <h2 className="mx-auto mt-3 max-w-3xl text-center text-3xl font-bold tracking-tight md:text-4xl">
            Ihre Reserven sind ein Profit-Center — oder ein stiller Verlust
          </h2>
          <div className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-3">
            {why.map((c) => (
              <div key={c.title} className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/15"><c.icon className="h-6 w-6 text-amber-400" /></div>
                <h3 className="mt-4 font-semibold text-white">{c.title}</h3>
                <p className="mt-2 text-sm text-slate-300">{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rechner */}
      <section id="calculator" className="bg-slate-50">
        <div className="container mx-auto px-4 py-20 md:py-28">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Rendite-Rechner</h2>
            <p className="mt-3 text-muted-foreground">Sehen Sie, was die ungenutzte Liquidität Ihres Unternehmens erwirtschaften könnte.</p>
          </div>
          <div className="mx-auto max-w-5xl"><RenditeRechner /></div>
        </div>
      </section>

      {/* Selbstcheck */}
      <section id="self-check" className="bg-white">
        <div className="container mx-auto px-4 py-20 md:py-28">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Das passende Instrument für Ihre Liquidität</h2>
            <p className="mt-3 text-muted-foreground">Beantworten Sie vier Fragen und erhalten Sie eine erste Einschätzung für Ihr Treasury-Profil.</p>
          </div>
          <div className="mx-auto max-w-5xl"><Selbstcheck onApply={applyFromSelfCheck} /></div>
        </div>
      </section>

      {/* Geeignet / nicht geeignet */}
      <section className="bg-slate-50">
        <div className="container mx-auto px-4 py-20 md:py-28">
          <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">Für wen die Angelus-Anleihen gedacht sind</h2>
          <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
            <Card className="border-green-200">
              <CardContent className="pt-6">
                <h3 className="mb-4 flex items-center gap-2 font-semibold text-green-700"><CheckCircle2 className="h-5 w-5" /> Geeignet für</h3>
                <ul className="space-y-3 text-sm">
                  {["Unternehmen (Corporate Treasury)", "Family Offices", "Institutionelle Investoren"].map(t => (
                    <li key={t} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" /><span>{t}</span></li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card className="border-red-200">
              <CardContent className="pt-6">
                <h3 className="mb-4 flex items-center gap-2 font-semibold text-red-700"><XCircle className="h-5 w-5" /> Nicht geeignet für</h3>
                <ul className="space-y-3 text-sm">
                  {["Natürliche Personen / Privatanleger", "Sicherheitsorientierte Anleger mit kurzfristigem Liquiditätsbedarf"].map(t => (
                    <li key={t} className="flex items-center gap-2"><XCircle className="h-4 w-4 shrink-0 text-red-600" /><span>{t}</span></li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Trust — Platzhalter; echte Logos in client/public/img/ ablegen */}
      <section className="bg-white">
        <div className="container mx-auto px-4 py-16">
          <p className="text-center text-sm uppercase tracking-widest text-muted-foreground">Bekannt aus / Auszeichnungen</p>
          <div className="mx-auto mt-8 grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3">
            {/* TODO: Logos als /img/trust-finanzennet.png, /img/trust-focus.png, /img/trust-dind.png ablegen und <img> einsetzen */}
            {[
              "finanzen.net — Angelus-Anleihen",
              "Focus — Leading Innovators 2026",
              "DIND — Anerkennung",
            ].map((t) => (
              <div key={t} className="flex h-24 items-center justify-center rounded-lg border border-dashed bg-slate-50 px-4 text-center text-sm text-muted-foreground">
                {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Calendly */}
      <section className="bg-[#0A1628] text-white">
        <div className="container mx-auto px-4 py-20 text-center md:py-24">
          <CalendarClock className="mx-auto mb-4 h-10 w-10 text-amber-400" />
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Persönliches Gespräch vereinbaren</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-300">
            Besprechen Sie Ihre Treasury-Ziele direkt mit unserem Team — unverbindlich und vertraulich.
          </p>
          <a href={CALENDLY} target="_blank" rel="noopener noreferrer" className="mt-8 inline-block">
            <Button size="lg" className="gap-2 bg-amber-500 text-slate-950 hover:bg-amber-400">
              <CalendarDays className="h-4 w-4" /> Termin buchen
            </Button>
          </a>
        </div>
      </section>

      {/* Lead-Formular */}
      <section id="contact" className="bg-slate-950">
        <div className="container mx-auto px-4 py-20 md:py-28">
          <div className="mx-auto max-w-2xl">
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">Informationen anfordern</h2>
              <p className="mt-3 text-slate-300">Schildern Sie uns Ihre Treasury-Ziele — unser Team meldet sich.</p>
            </div>
            <Card className="bg-white"><CardContent className="pt-6"><LeadForm prefill={prefill} /></CardContent></Card>
          </div>
        </div>
      </section>

      {/* Risikohinweis */}
      <section className="bg-white">
        <div className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-4xl rounded-lg border border-amber-200 bg-amber-50/40 p-6">
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-amber-800">
              <ShieldCheck className="h-5 w-5" /> Risikohinweis
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Die Beteiligungsformen sind mit erheblichen Risiken verbunden und richten sich ausschließlich an
              Unternehmen und professionelle Investoren im Sinne der EU-Prospektverordnung. Nicht geeignet für
              natürliche Personen/Privatanleger und sicherheitsorientierte Anleger mit kurzfristigem
              Liquiditätsbedarf. Möglichkeit des vollständigen Verlustes des eingesetzten Kapitals;
              Rückzahlung/Zinszahlung nicht garantiert. Zeichnungen ausschließlich ab 100.000 €; dadurch greift
              die Prospektausnahme nach Art. 1 Abs. 4 lit. c EU-Prospektverordnung — kein gebilligter
              Verkaufsprospekt. KYC/AML-Prüfung über zertifizierten Anbieter vor jeder Zeichnung. Keine
              Zusicherungen/Garantien zu Rückzahlung, Zins, Werterhalt.
            </p>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
