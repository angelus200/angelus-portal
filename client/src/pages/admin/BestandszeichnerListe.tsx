// Bestandszeichner-Liste (legacy_customers = Quelle der Wahrheit). Verlinkt jede Zeile auf die
// legacy_customers-aware Detailseite /admin/bestandszeichner/:id (Etappe 1). Ersetzt fuer den
// Bestandszeichner-Zugang die alte, auf legacy_contracts/users basierende "Bestandsvertraege"-Liste.
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

const eur = (n: any) => (n == null ? "—" : "€ " + Number(n).toLocaleString("de-DE", { minimumFractionDigits: 2 }));

export default function BestandszeichnerListe() {
  const { data, isLoading } = trpc.legacyCustomer.getAll.useQuery({ page: 1, limit: 200 });
  const customers = data?.customers ?? [];

  return (
    <div className="p-6 max-w-5xl space-y-4">
      <div>
        <h1 className="text-xl font-bold">Bestandszeichner</h1>
        <p className="text-sm text-muted-foreground">Quelle: legacy_customers · {data?.total ?? 0} Einträge</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Alle Bestandszeichner</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground py-6">Lädt…</p>
          ) : customers.length === 0 ? (
            <p className="text-muted-foreground py-6">Keine Bestandszeichner.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Vertrag</TableHead>
                  <TableHead>Anleihe</TableHead>
                  <TableHead className="text-right">Zeichnungssumme</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      <Link href={`/admin/bestandszeichner/${c.id}`} className="hover:underline">
                        {c.firstName} {c.lastName}
                      </Link>
                    </TableCell>
                    <TableCell>{c.contractNumber}</TableCell>
                    <TableCell>{c.bondNumber ?? "—"}</TableCell>
                    <TableCell className="text-right">{eur(c.investmentAmount)}</TableCell>
                    <TableCell>{c.status ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/bestandszeichner/${c.id}`}><ExternalLink className="w-4 h-4" /></Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
