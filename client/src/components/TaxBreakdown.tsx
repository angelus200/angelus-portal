// client/src/components/TaxBreakdown.tsx
import type { TaxResult } from '../../../server/tax-service';

interface TaxBreakdownProps {
  tax: TaxResult;
  compact?: boolean;
}

export function TaxBreakdown({ tax, compact = false }: TaxBreakdownProps) {
  const fmt = (n: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n);

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground line-through">{fmt(tax.kapitalertrag)}</span>
        <span className="font-semibold text-green-600">{fmt(tax.nettoAuszahlung)}</span>
        <span className="text-xs text-muted-foreground">({tax.effektiverSteuersatz}% Steuer)</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
      <div className="font-semibold text-base mb-3">Steueraufschlüsselung</div>

      <div className="flex justify-between">
        <span className="text-muted-foreground">Kapitalertrag (brutto)</span>
        <span className="font-medium">{fmt(tax.kapitalertrag)}</span>
      </div>

      {tax.freistellungsauftrag > 0 && (
        <div className="flex justify-between text-green-600">
          <span>Freistellungsauftrag</span>
          <span>− {fmt(tax.freistellungsauftrag)}</span>
        </div>
      )}

      <div className="border-t pt-2 space-y-1">
        <div className="flex justify-between text-red-500">
          <span>Kapitalertragsteuer (25%)</span>
          <span>− {fmt(tax.kest)}</span>
        </div>
        <div className="flex justify-between text-red-400">
          <span>Solidaritätszuschlag (5,5%)</span>
          <span>− {fmt(tax.soli)}</span>
        </div>
        {tax.kirchensteuer > 0 && (
          <div className="flex justify-between text-red-400">
            <span>Kirchensteuer</span>
            <span>− {fmt(tax.kirchensteuer)}</span>
          </div>
        )}
      </div>

      <div className="border-t pt-2 flex justify-between font-bold text-base">
        <span>Netto-Auszahlung</span>
        <span className="text-green-600">{fmt(tax.nettoAuszahlung)}</span>
      </div>

      <div className="text-xs text-muted-foreground text-right">
        Effektiver Steuersatz: {tax.effektiverSteuersatz}%
      </div>
    </div>
  );
}
