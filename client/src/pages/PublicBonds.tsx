import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { issuerBadgeClass } from "@/lib/issuerBadge";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";
import { Percent, Calendar, FileText, ArrowRight, Building2 } from "lucide-react";
import { format } from "date-fns";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";

const RISK_LABEL: Record<string, { label: string; cls: string }> = {
  low: { label: "Low Risk", cls: "bg-green-100 text-green-800" },
  medium: { label: "Medium Risk", cls: "bg-yellow-100 text-yellow-800" },
  high: { label: "High Risk", cls: "bg-red-100 text-red-800" },
};

const FREQ_LABEL: Record<string, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  "semi-annual": "Semi-annual",
  annual: "Annual",
};

type CatalogIssuer = inferRouterOutputs<AppRouter>["bonds"]["publicCatalog"][number];

function BondCard({ bond }: { bond: CatalogIssuer["bonds"][number] }) {
  const risk = RISK_LABEL[bond.riskCategory || "high"] || RISK_LABEL.high;
  return (
    <Card className="flex flex-col transition-colors hover:border-primary/50">
      <CardContent className="flex flex-1 flex-col space-y-4 pt-6">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold">{bond.name}</h3>
            {bond.isin && <p className="text-xs text-muted-foreground">ISIN: {bond.isin}</p>}
          </div>
          <Badge className={risk.cls}>{risk.label}</Badge>
        </div>

        <div className="flex items-center gap-2">
          <Percent className="h-5 w-5 text-primary" />
          <span className="text-3xl font-bold text-primary">{bond.interestRate}%</span>
          <span className="text-sm text-muted-foreground">p.a. fixed</span>
        </div>

        <div className="space-y-1.5 text-sm text-muted-foreground">
          <p className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Term: {bond.termMonths} months</p>
          {bond.couponPaymentFrequency && (
            <p>Coupon: {FREQ_LABEL[bond.couponPaymentFrequency] || bond.couponPaymentFrequency}</p>
          )}
          <p>Min. investment: {bond.currency} {parseFloat(bond.minSubscription).toLocaleString("en-US")}</p>
          {bond.maturityDate && (
            <p>Maturity: {format(new Date(bond.maturityDate as any), "dd MMM yyyy")}</p>
          )}
        </div>

        <div className="mt-auto space-y-2 pt-2">
          <a href="/#contact">
            <Button className="w-full gap-2">Request Access <ArrowRight className="h-4 w-4" /></Button>
          </a>
          <Link href="/sign-in">
            <Button variant="ghost" size="sm" className="w-full text-muted-foreground">
              Already an investor? Sign in
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PublicBonds() {
  const { data: catalog, isLoading } = trpc.bonds.publicCatalog.useQuery();

  // Emittenten mit Bonds zuerst
  const issuers = [...(catalog || [])].sort((a, b) => b.bonds.length - a.bonds.length);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader />

      <main className="flex-1">
        <section className="border-b bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto px-4 py-16 text-center">
            <h1 className="text-4xl font-bold tracking-tight">Current Bond Offerings</h1>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Fixed-rate corporate bonds from international issuers. Subscription requires a registered
              investor account and issuer approval.
            </p>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16">
          {isLoading ? (
            <div className="mx-auto max-w-5xl space-y-10">
              {[1, 2].map(i => <div key={i} className="h-80 animate-pulse rounded-lg bg-muted" />)}
            </div>
          ) : issuers.length === 0 ? (
            <div className="mx-auto max-w-xl rounded-lg border bg-muted/30 p-10 text-center">
              <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">
                New offerings are announced to registered investors first.
              </p>
              <a href="/#contact" className="mt-4 inline-block">
                <Button className="gap-2">Request Information <ArrowRight className="h-4 w-4" /></Button>
              </a>
            </div>
          ) : (
            <div className="mx-auto max-w-5xl space-y-12">
              {issuers.map((issuer) => (
                <div key={issuer.issuerKey} className="space-y-6">
                  {/* Emittenten-Kopf */}
                  <div className="flex items-start gap-4 border-b pb-6">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-card">
                      {issuer.logoUrl ? (
                        <img src={issuer.logoUrl} alt={issuer.name} className="h-full w-full object-contain p-1" />
                      ) : (
                        <Building2 className="h-7 w-7 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-bold">{issuer.shortName || issuer.name}</h2>
                        {issuer.country && (
                          <Badge className={`text-xs ${issuerBadgeClass(issuer.badgeColor)}`}>{issuer.country}</Badge>
                        )}
                      </div>
                      {issuer.description && (
                        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{issuer.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Bonds oder Coming-soon */}
                  {issuer.bonds.length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {issuer.bonds.map((b) => <BondCard key={b.id} bond={b} />)}
                    </div>
                  ) : (
                    <p className="rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
                      New offerings coming soon.
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
