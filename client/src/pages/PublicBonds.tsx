import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { issuerBadgeClass } from "@/lib/issuerBadge";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";
import { Percent, Calendar, FileText, ArrowRight } from "lucide-react";
import { format } from "date-fns";

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

export default function PublicBonds() {
  const { data: bonds, isLoading } = trpc.bonds.publicList.useQuery();
  const { data: issuersList } = trpc.issuers.list.useQuery();
  const badgeByKey = new Map((issuersList || []).map(i => [i.issuerKey, i.badgeColor]));

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
            <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => <div key={i} className="h-72 animate-pulse rounded-lg bg-muted" />)}
            </div>
          ) : !bonds || bonds.length === 0 ? (
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
            <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2 lg:grid-cols-3">
              {bonds.map((b) => {
                const risk = RISK_LABEL[b.riskCategory || "high"] || RISK_LABEL.high;
                return (
                  <Card key={b.id} className="flex flex-col transition-colors hover:border-primary/50">
                    <CardContent className="flex flex-1 flex-col space-y-4 pt-6">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold">{b.name}</h3>
                          {b.isin && <p className="text-xs text-muted-foreground">ISIN: {b.isin}</p>}
                        </div>
                        <Badge className={risk.cls}>{risk.label}</Badge>
                      </div>

                      {b.issuer && (
                        <Badge className={`w-fit text-xs ${issuerBadgeClass(badgeByKey.get(b.issuerKey))}`}>
                          {b.issuer}
                        </Badge>
                      )}

                      <div className="flex items-center gap-2">
                        <Percent className="h-5 w-5 text-primary" />
                        <span className="text-3xl font-bold text-primary">{b.interestRate}%</span>
                        <span className="text-sm text-muted-foreground">p.a. fixed</span>
                      </div>

                      <div className="space-y-1.5 text-sm text-muted-foreground">
                        <p className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Term: {b.termMonths} months</p>
                        {b.couponPaymentFrequency && (
                          <p>Coupon: {FREQ_LABEL[b.couponPaymentFrequency] || b.couponPaymentFrequency}</p>
                        )}
                        <p>Min. investment: {b.currency} {parseFloat(b.minSubscription).toLocaleString("en-US")}</p>
                        {b.maturityDate && (
                          <p>Maturity: {format(new Date(b.maturityDate as any), "dd MMM yyyy")}</p>
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
              })}
            </div>
          )}
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
