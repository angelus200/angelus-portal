// client/src/pages/admin/InvestorTaxSettings.tsx
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { TaxBreakdown } from '@/components/TaxBreakdown';

interface Props {
  userId: number;
}

export function InvestorTaxSettings({ userId }: Props) {
  const { data: taxData, isLoading, refetch } = trpc.admin.getInvestorTax.useQuery({ userId });
  const updateTax = trpc.admin.updateInvestorTax.useMutation({
    onSuccess: () => {
      toast.success('Steuerdaten gespeichert');
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const [kirchensteuer, setKirchensteuer] = useState<string>('');
  const [kirchensteuerSatz, setKirchensteuerSatz] = useState<string>('');
  const [finanzamt, setFinanzamt] = useState('');
  const [steuerNummer, setSteuerNummer] = useState('');
  const [steuerId, setSteuerId] = useState('');
  const [familienstand, setFamilienstand] = useState<string>('');
  const [freistellungsauftrag, setFreistellungsauftrag] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [previewBetrag, setPreviewBetrag] = useState('2750');

  // Initialize local state from loaded data (once)
  if (taxData && !initialized) {
    setKirchensteuer(taxData.kirchensteuer);
    setKirchensteuerSatz(Number(taxData.kirchensteuerSatz) === 0.08 ? '0.08' : '0.09');
    setFinanzamt(taxData.finanzamt ?? '');
    setSteuerNummer(taxData.steuerNummer ?? '');
    setSteuerId(taxData.steuerId ?? '');
    setFamilienstand(taxData.familienstand ?? 'ledig');
    setFreistellungsauftrag(taxData.freistellungsauftrag ?? '0');
    setInitialized(true);
  }

  const effKirchensteuer = kirchensteuer || taxData?.kirchensteuer || 'keine';
  const effKirchensteuerSatz = parseFloat(kirchensteuerSatz || '0.09');
  const effFreistellungsauftrag = parseFloat(freistellungsauftrag || '0');

  const { data: preview } = trpc.tax.berechne.useQuery(
    {
      kapitalertrag: parseFloat(previewBetrag) || 0,
      kirchensteuerPflichtig: effKirchensteuer !== 'keine',
      kirchensteuerSatz: effKirchensteuerSatz,
      freistellungsauftrag: effFreistellungsauftrag,
    },
    { enabled: (parseFloat(previewBetrag) || 0) > 0 }
  );

  if (isLoading) return <div className="p-4 text-muted-foreground">Lade Steuerdaten…</div>;

  const handleSave = () => {
    if (updateTax.isPending) return;
    updateTax.mutate({
      userId,
      kirchensteuer: effKirchensteuer as any,
      kirchensteuerSatz: effKirchensteuerSatz,
      steuerNummer: steuerNummer || undefined,
      steuerId: steuerId || undefined,
      finanzamt: finanzamt || undefined,
      familienstand: (familienstand || undefined) as any,
      freistellungsauftrag: effFreistellungsauftrag,
    });
  };

  return (
    <div className="space-y-6 p-4">
      <h3 className="text-lg font-semibold">Steuerliche Angaben</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Kirchensteuerpflicht</Label>
          <Select value={effKirchensteuer} onValueChange={setKirchensteuer}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="keine">Keine Kirchensteuer</SelectItem>
              <SelectItem value="evangelisch">Evangelisch</SelectItem>
              <SelectItem value="katholisch">Katholisch</SelectItem>
              <SelectItem value="andere">Andere</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {effKirchensteuer !== 'keine' && (
          <div className="space-y-2">
            <Label>Kirchensteuersatz</Label>
            <Select value={kirchensteuerSatz || '0.09'} onValueChange={setKirchensteuerSatz}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0.09">9% (Standard DE)</SelectItem>
                <SelectItem value="0.08">8% (Bayern / Baden-Württemberg)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label>Finanzamt</Label>
          <Input value={finanzamt} onChange={e => setFinanzamt(e.target.value)} placeholder="z.B. Stuttgart" />
        </div>

        <div className="space-y-2">
          <Label>Steuernummer</Label>
          <Input value={steuerNummer} onChange={e => setSteuerNummer(e.target.value)} placeholder="z.B. 95/193/20505" />
        </div>

        <div className="space-y-2">
          <Label>Steuer-ID</Label>
          <Input value={steuerId} onChange={e => setSteuerId(e.target.value)} placeholder="11-stellige Steuer-ID" maxLength={11} />
        </div>

        <div className="space-y-2">
          <Label>Familienstand</Label>
          <Select value={familienstand || 'ledig'} onValueChange={setFamilienstand}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ledig">Ledig</SelectItem>
              <SelectItem value="verheiratet">Verheiratet</SelectItem>
              <SelectItem value="geschieden">Geschieden</SelectItem>
              <SelectItem value="verwitwet">Verwitwet</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Freistellungsauftrag (€)</Label>
          <Input
            type="number"
            value={freistellungsauftrag}
            onChange={e => setFreistellungsauftrag(e.target.value)}
            placeholder="0"
            min="0"
            max="2000"
          />
          <p className="text-xs text-muted-foreground">Max. €1.000 (Einzelperson) / €2.000 (Ehepaar)</p>
        </div>
      </div>

      <Button onClick={handleSave} disabled={updateTax.isPending} className="w-full md:w-auto">
        {updateTax.isPending ? 'Speichern…' : 'Steuerdaten speichern'}
      </Button>

      <div className="border-t pt-4">
        <h4 className="font-medium mb-3">Live-Vorschau Steuerberechnung</h4>
        <div className="flex items-center gap-3 mb-4">
          <Label>Beispiel-Zinsbetrag (€)</Label>
          <Input
            type="number"
            value={previewBetrag}
            onChange={e => setPreviewBetrag(e.target.value)}
            className="w-32"
          />
        </div>
        {preview && <TaxBreakdown tax={preview} />}
      </div>
    </div>
  );
}
