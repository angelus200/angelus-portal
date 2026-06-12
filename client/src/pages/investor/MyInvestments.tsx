import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { issuerBadgeClass } from "@/lib/issuerBadge";
import { TaxBreakdown } from "@/components/TaxBreakdown";
import { TrendingUp, Calendar, ArrowRight, FileText, ChevronDown, ChevronUp, Download, Info } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { BRAND } from "@shared/brand";

function AuszahlungsplanRow({ subscriptionId }: { subscriptionId: number }) {
  const { data, isLoading } = trpc.tax.auszahlungsplan.useQuery({ subscriptionId });

  if (isLoading) {
    return (
      <div className="p-4 text-sm text-muted-foreground animate-pulse">
        Lade Auszahlungsplan…
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Kein Auszahlungsplan vorhanden.
      </div>
    );
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);

  const sumBrutto = data.reduce((s, z) => s + z.brutto, 0);
  const sumSteuer = data.reduce((s, z) => s + z.tax.gesamtsteuer, 0);
  const sumNetto = data.reduce((s, z) => s + z.tax.nettoAuszahlung, 0);

  const statusLabel: Record<string, { label: string; className: string }> = {
    scheduled: { label: "Geplant",    className: "bg-gray-100 text-gray-700" },
    pending:   { label: "Ausstehend", className: "bg-yellow-100 text-yellow-800" },
    paid:      { label: "Bezahlt",    className: "bg-green-100 text-green-800" },
    overdue:   { label: "Überfällig", className: "bg-red-100 text-red-800" },
  };

  return (
    <div className="border-t mt-2">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-muted-foreground">
              <th className="px-3 py-2 text-left font-medium">Fälligkeit</th>
              <th className="px-3 py-2 text-right font-medium">Brutto</th>
              <th className="px-3 py-2 text-right font-medium text-red-500">Steuer</th>
              <th className="px-3 py-2 text-right font-medium text-green-600">Netto</th>
              <th className="px-3 py-2 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map((zahlung) => {
              const s = statusLabel[zahlung.status] || statusLabel.scheduled;
              return (
                <tr key={zahlung.id} className="border-b border-muted/50 hover:bg-muted/30">
                  <td className="px-3 py-2">
                    {format(new Date(zahlung.dueDate), "dd.MM.yyyy", { locale: de })}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{fmt(zahlung.brutto)}</td>
                  <td className="px-3 py-2 text-right font-mono text-red-500">
                    − {fmt(zahlung.tax.gesamtsteuer)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-green-600">
                    {fmt(zahlung.tax.nettoAuszahlung)}
                  </td>
                  <td className="px-3 py-2">
                    <Badge className={s.className}>{s.label}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-muted/50 font-semibold border-t-2">
              <td className="px-3 py-2">Gesamt</td>
              <td className="px-3 py-2 text-right font-mono">{fmt(sumBrutto)}</td>
              <td className="px-3 py-2 text-right font-mono text-red-500">− {fmt(sumSteuer)}</td>
              <td className="px-3 py-2 text-right font-mono text-green-600">{fmt(sumNetto)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {data[0] && (
        <div className="p-4">
          <p className="text-xs text-muted-foreground mb-2">
            Steueraufschlüsselung (je Zinszahlung):
          </p>
          <TaxBreakdown tax={data[0].tax} />
        </div>
      )}
    </div>
  );
}

export default function MyInvestments() {
  const { data: subscriptions, isLoading: subscriptionsLoading } = trpc.subscriptions.mySubscriptions.useQuery();
  const { data: bonds, isLoading: bondsLoading } = trpc.bonds.list.useQuery();
  const { data: issuersList } = trpc.issuers.list.useQuery();
  const issuerByKey = new Map((issuersList || []).map(i => [i.issuerKey, i]));
  const isKG = BRAND.key === "angelus";
  const { data: kontokorrent } = trpc.legacyCustomer.myKontokorrent.useQuery(undefined, { enabled: isKG });
  const { data: zeichnungsschein } = trpc.legacyCustomer.myZeichnungsschein.useQuery(undefined, { enabled: isKG });
  const { data: vollzahler } = trpc.legacyCustomer.myVollzahlerKonto.useQuery(undefined, { enabled: isKG });
  const eur = (n: number) => "€ " + n.toLocaleString("de-DE", { minimumFractionDigits: 2 });
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      pending:   { label: "Ausstehend",    className: "bg-yellow-100 text-yellow-800" },
      confirmed: { label: "Bestätigt",     className: "bg-blue-100 text-blue-800" },
      active:    { label: "Aktiv",         className: "bg-green-100 text-green-800" },
      completed: { label: "Abgeschlossen", className: "bg-gray-100 text-gray-800" },
      cancelled: { label: "Storniert",     className: "bg-red-100 text-red-800" },
    };
    const variant = variants[status] || variants.pending;
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  return (
    <DashboardLayout variant="investor">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Meine Investments</h1>
            <p className="text-muted-foreground">Übersicht Ihrer gezeichneten Anleihen</p>
          </div>
        </div>

        {/* Forderungskonto (KG-Bestandszeichner) — verschoben aus dem Dashboard */}
        {isKG && kontokorrent && kontokorrent.konfiguriert && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Forderungskonto</span>
                <span className="text-xs font-normal text-muted-foreground">Stand {new Date(kontokorrent.stichtag).toLocaleDateString("de-DE")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Stufe 1: Klartext-Zusammenfassung (roter Faden) */}
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Gezeichnete Summe</span><span className="font-medium">{eur(kontokorrent.gezeichnet)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Davon eingezahlt</span><span className="font-medium">− {eur(kontokorrent.eingezahlt)}</span></div>
                <div className="flex justify-between border-b pb-2"><span>Offene Einlage</span><span className="font-semibold">{eur(kontokorrent.offen)}</span></div>
                <div className="flex justify-between pt-1"><span className="text-muted-foreground">Verzugszins auf die offene Einlage ({kontokorrent.refinancingRate.toLocaleString("de-DE")} % p.a., seit {new Date(kontokorrent.faelligkeit).toLocaleDateString("de-DE")})</span><span className="font-medium">+ {eur(kontokorrent.negativzinsSumme)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Zinsgutschrift auf Ihr eingezahltes Kapital ({kontokorrent.couponRate.toLocaleString("de-DE")} % p.a.)</span><span className="font-medium">− {eur(kontokorrent.kuponAufgelaufen)}</span></div>
              </div>
              {/* Ergebnis */}
              <div className="rounded-lg bg-muted/40 p-4 flex items-center justify-between">
                <span className="text-sm font-medium">{kontokorrent.saldo >= 0 ? "Offene Forderung" : "Ihr Guthaben"}</span>
                <span className={`text-2xl font-bold ${kontokorrent.saldo >= 0 ? "" : "text-emerald-600"}`}>{eur(Math.abs(kontokorrent.saldo))}</span>
              </div>
              {/* Stufe 2: Schritt-für-Schritt-Verlauf (ausklappbar) */}
              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Schritt-für-Schritt-Verlauf anzeigen</summary>
                <div className="mt-2 divide-y rounded border">
                  {kontokorrent.kontoauszug.map((l: any, i: number) => (
                    <div key={i} className="flex items-start justify-between gap-3 px-3 py-2">
                      <div className="min-w-0">
                        <span className="text-muted-foreground tabular-nums">{new Date(l.date).toLocaleDateString("de-DE")}</span>
                        <span className="ml-2">
                          {l.kind === "einzahlung" ? `Einzahlung ${eur(l.betrag)} (verringert die offene Einlage)`
                            : l.kind === "verzugszins" ? `Verzugszins auf ${eur(l.basis)} offene Einlage`
                            : l.kind === "zinsgutschrift" ? `Zinsgutschrift auf ${eur(l.basis)} eingezahltes Kapital`
                            : `Auszahlung Zinsabschlag`}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={l.kind === "zinsgutschrift" ? "text-emerald-600" : l.kind === "einzahlung" ? "text-muted-foreground" : ""}>
                          {l.kind === "verzugszins" || l.kind === "auszahlung" ? "+ " : l.kind === "zinsgutschrift" ? "− " : ""}{eur(l.betrag)}
                        </div>
                        <div className="text-xs text-muted-foreground">Saldo {eur(l.saldoNachher)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
              {/* FAQ-Entwurf */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900">
                <p className="font-semibold mb-1">⚠ ENTWURF — Erläuterung (wird von Angelus final geprüft)</p>
                <p>
                  Ihr Forderungskonto wird taggenau fortgeschrieben. Auf den noch nicht eingezahlten Teil Ihrer
                  Zeichnungssumme (die offene Einlage) fällt ab Verzugsbeginn ({new Date(kontokorrent.faelligkeit).toLocaleDateString("de-DE")} = Zeichnung + 14 Tage)
                  ein Verzugszins von {kontokorrent.refinancingRate.toLocaleString("de-DE")} % p.a. an. Gegengerechnet wird eine
                  Zinsgutschrift von {kontokorrent.couponRate.toLocaleString("de-DE")} % p.a. auf Ihr tatsächlich eingezahltes Kapital.
                  Beide werden ohne Zinseszins berechnet und tagesaktuell fortgeschrieben. [Platzhalter: rechtliche
                  Begründung des Verzugszinssatzes — durch Angelus zu ergänzen.]
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Vollzahler-Sicht (KG-Bestandszeichner, offene Einlage = 0) — datengetrieben statt Forderungskonto */}
        {isKG && vollzahler && (
          <Card>
            <CardHeader>
              <CardTitle>Meine Beteiligung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Gezeichnet & voll eingezahlt</span><span className="font-medium">{eur(vollzahler.eingezahlt)}</span></div>
                {vollzahler.couponRate != null && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Zinssatz</span><span className="font-medium">{vollzahler.couponRate.toLocaleString("de-DE")} % p.a.</span></div>
                )}
                <div className="flex justify-between"><span className="text-muted-foreground">Bereits erhaltene Zinsen (brutto)</span><span className="font-medium">{eur(vollzahler.bereitsErhalten)}</span></div>
                {vollzahler.maturityDate && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Mindestlaufzeit bis</span><span className="font-medium">{new Date(vollzahler.maturityDate).toLocaleDateString("de-DE")}</span></div>
                )}
              </div>

              {/* Jahreszins pro Laufzeitjahr (P6) — Status datengetrieben; Vorbehalt (*) NUR für offene Perioden */}
              {((vollzahler.perioden && vollzahler.perioden.length > 0) || vollzahler.rueckzahlung) && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Zinsperioden je Laufzeitjahr</p>
                  {vollzahler.perioden && vollzahler.perioden.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-muted-foreground border-b">
                            <th className="text-left font-normal py-1.5 pr-2">Zeitraum</th>
                            <th className="text-right font-normal py-1.5 px-2">Jahreszins</th>
                            <th className="text-right font-normal py-1.5 px-2">Fällig</th>
                            <th className="text-right font-normal py-1.5 pl-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vollzahler.perioden.map((p) => (
                            <tr key={p.index} className="border-b last:border-0">
                              <td className="py-1.5 pr-2">
                                {new Date(p.von).toLocaleDateString("de-DE")}–{new Date(p.bis).toLocaleDateString("de-DE")}
                                {p.istRumpf && <span className="ml-1 text-xs text-muted-foreground">(Rumpfjahr)</span>}
                              </td>
                              <td className="text-right py-1.5 px-2 font-medium">{eur(p.zins)}</td>
                              <td className="text-right py-1.5 px-2 text-muted-foreground">
                                {new Date(p.faelligkeit).toLocaleDateString("de-DE")}{p.unterVorbehalt ? " *" : ""}
                              </td>
                              <td className="text-right py-1.5 pl-2">
                                {p.status === "erfuellt" && <span className="text-green-700">Erfüllt</span>}
                                {p.status === "teilweise" && (
                                  <span className="text-amber-700">Teilweise (offen {eur(p.deckungsluecke)})</span>
                                )}
                                {p.status === "offen" && <span className="text-amber-700">Offen *</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {/* Kontokorrent-Saldo (P7) — periodenbasiert, NUR fällige Coupons (kein kontinuierlicher Kupon) */}
                  {vollzahler.saldo && (
                    <div className="rounded-lg border p-3 text-sm space-y-1 bg-muted/30">
                      <p className="font-medium">Kontokorrent (Stichtag heute)</p>
                      <div className="flex justify-between"><span className="text-muted-foreground">Offener fälliger Kupon (HABEN)</span><span>{eur(vollzahler.saldo.habenOffenerKupon)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Vorfinanzierungszins (SOLL, {vollzahler.saldo.refinancingRate.toLocaleString("de-DE")} %)</span><span>{eur(vollzahler.saldo.sollVorfinanzierung)}</span></div>
                      <div className="flex justify-between font-medium border-t pt-1">
                        <span>Saldo</span>
                        <span className={vollzahler.saldo.saldo > 0 ? "text-amber-700" : "text-green-700"}>
                          {eur(vollzahler.saldo.saldo)} {vollzahler.saldo.saldo > 0 ? "(KG-Forderung)" : "(Guthaben)"}
                        </span>
                      </div>
                      {vollzahler.saldo.naechsterCoupon && (
                        <p className="text-xs text-muted-foreground pt-1">
                          Gleicht sich zur nächsten Coupon-Fälligkeit ({new Date(vollzahler.saldo.naechsterCoupon.datum).toLocaleDateString("de-DE")}, {eur(vollzahler.saldo.naechsterCoupon.betrag)}) aus — dieser ist separat und unter Vorbehalt (*), nicht im Saldo enthalten.
                        </p>
                      )}
                    </div>
                  )}
                  {vollzahler.rueckzahlung && (
                    <div className="flex justify-between text-sm pt-1">
                      <span className="text-muted-foreground">Rückzahlung frühestens ({new Date(vollzahler.rueckzahlung.datum).toLocaleDateString("de-DE")}) *</span>
                      <span className="font-medium">{eur(vollzahler.rueckzahlung.betrag)}</span>
                    </div>
                  )}
                  {/* Vorbehalt — ENTWURF, finaler Wortlaut durch Angelus (NICHT von CC final formuliert) */}
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900">
                    <p className="font-semibold mb-1">⚠ ENTWURF — Vorbehalt (finaler Wortlaut durch Angelus)</p>
                    <p>* Vorbehaltlich vorinsolvenzlichem Zahlungsverbot (§2) und qualifiziertem Rangrücktritt (§3) — keine unbedingte Zahlungszusage; gilt für offene Perioden und die Rückzahlung. Erfüllte Perioden sind dem Vorbehalt nicht unterworfen. [Platzhalter: finaler rechtlicher Wortlaut durch Angelus]</p>
                  </div>
                </div>
              )}

              {/* Kündigungsstatus (dokumentiert die Position der KG) */}
              {vollzahler.kuendigungStatus && (
                <div className="rounded-lg border p-4 text-sm space-y-1 bg-muted/30">
                  <p className="font-medium flex items-center gap-2"><Info className="w-4 h-4" /> Kündigungsstatus</p>
                  {vollzahler.kuendigungEingegangenAm && (
                    <p className="text-muted-foreground">Kündigung eingegangen am {new Date(vollzahler.kuendigungEingegangenAm).toLocaleDateString("de-DE")}</p>
                  )}
                  <p className="font-medium">
                    {vollzahler.kuendigungStatus === "zurueckgewiesen" ? "Zurückgewiesen (verfristet)"
                      : vollzahler.kuendigungStatus === "wirksam" ? "Wirksam"
                      : "Eingereicht"}
                  </p>
                  {vollzahler.naechsterKuendigungstermin && (
                    <p className="text-muted-foreground">Nächster möglicher Kündigungstermin: {new Date(vollzahler.naechsterKuendigungstermin).toLocaleDateString("de-DE")}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Mein Zeichnungsschein (KG-Bestandszeichner) — Download via no-id Route /api/zeichnungsschein */}
        {isKG && zeichnungsschein && (
          <Card>
            <CardHeader>
              <CardTitle>Mein Zeichnungsschein</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{zeichnungsschein.fileName}</p>
                  <p className="text-xs text-muted-foreground">Ihr unterschriebener Zeichnungsschein</p>
                </div>
                <a href="/api/zeichnungsschein" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="w-4 h-4" /> Herunterladen
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Meine Zeichnungen</CardTitle>
          </CardHeader>
          <CardContent>
            {subscriptionsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : subscriptions && subscriptions.length > 0 ? (
              <div className="space-y-4">
                {subscriptions.map((sub) => (
                  <div key={sub.id} className="border rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                          <TrendingUp className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{(sub as any).bond?.name || `Anleihe #${sub.bondId}`}</p>
                          <p className="text-sm text-muted-foreground">
                            {(sub as any).bond?.issuer && (
                              <span className="text-xs">{(sub as any).bond.issuer} · </span>
                            )}
                            Gezeichnet am {format(new Date(sub.createdAt), "dd.MM.yyyy", { locale: de })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold">
                            €{parseFloat(sub.amount).toLocaleString("de-DE", { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs text-muted-foreground">{sub.currency}</p>
                        </div>
                        {getStatusBadge(sub.status)}
                        {(sub.status === "confirmed" || sub.status === "active") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExpand(sub.id)}
                            className="gap-1 text-muted-foreground"
                          >
                            {expandedIds.has(sub.id) ? (
                              <><ChevronUp className="w-4 h-4" /> Zuklappen</>
                            ) : (
                              <><ChevronDown className="w-4 h-4" /> Auszahlungsplan</>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>

                    {expandedIds.has(sub.id) && (
                      <AuszahlungsplanRow subscriptionId={sub.id} />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Keine Zeichnungen vorhanden</h3>
                <p className="text-muted-foreground mb-4">
                  Sie haben noch keine Anleihen gezeichnet.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Verfügbare Anleihen</CardTitle>
          </CardHeader>
          <CardContent>
            {bondsLoading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[1, 2].map(i => (
                  <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : bonds && bonds.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {bonds.map((bond) => (
                  <Card key={bond.id} className="border-border hover:border-primary/50 transition-colors">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold">{bond.name}</h3>
                          {bond.isin && (
                            <p className="text-xs text-muted-foreground">ISIN: {bond.isin}</p>
                          )}
                          {bond.issuer && (
                            <Badge className={`mt-1 text-xs ${issuerBadgeClass(issuerByKey.get((bond as any).issuerKey)?.badgeColor)}`}>
                              {issuerByKey.get((bond as any).issuerKey)?.name || bond.issuer}
                            </Badge>
                          )}
                        </div>
                        <Badge className={
                          bond.riskCategory === "high"   ? "bg-red-100 text-red-800" :
                          bond.riskCategory === "medium" ? "bg-yellow-100 text-yellow-800" :
                          "bg-green-100 text-green-800"
                        }>
                          {bond.riskCategory === "high"   ? "Hohes Risiko" :
                           bond.riskCategory === "medium" ? "Mittleres Risiko" :
                           "Niedriges Risiko"}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Zinssatz</p>
                          <p className="font-semibold text-primary">{bond.interestRate}% p.a.</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Laufzeit</p>
                          <p className="font-semibold">{bond.termMonths} Monate</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Mindestzeichnung</p>
                          <p className="font-semibold">€{parseFloat(bond.minSubscription).toLocaleString("de-DE")}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Verfügbar</p>
                          <p className="font-semibold">€{parseFloat(bond.availableVolume).toLocaleString("de-DE")}</p>
                        </div>
                      </div>

                      <Link href={`/investor/bond/${bond.id}`}>
                        <Button className="w-full gap-2">
                          Details ansehen
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Keine Anleihen verfügbar</h3>
                <p className="text-muted-foreground">
                  Derzeit sind keine Anleihen zur Zeichnung verfügbar.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
