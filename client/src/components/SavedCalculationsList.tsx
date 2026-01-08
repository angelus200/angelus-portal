/**
 * SavedCalculationsList Komponente
 * 
 * Zeigt Liste der gespeicherten Zinsberechnungen an
 */

import React, { useEffect, useState } from 'react';
import { useLoadInterestCalculations } from '../hooks/useInterestCalculation';
import { formatCurrency, formatDate } from '../hooks/useInterestCalculation';

interface SavedCalculation {
  id: number;
  basicInterest: string;
  totalTaxes: string;
  totalPayable: string;
  createdAt: string;
  reference?: string;
  description?: string;
}

interface SavedCalculationsListProps {
  onSelectCalculation?: (id: number) => void;
  onDeleteCalculation?: (id: number) => Promise<void>;
}

export const SavedCalculationsList: React.FC<SavedCalculationsListProps> = ({
  onSelectCalculation,
  onDeleteCalculation,
}) => {
  const { calculations, loading, error, loadCalculations } = useLoadInterestCalculations();
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => {
    loadCalculations(50, 0);
  }, [loadCalculations]);

  const handleDelete = async (id: number) => {
    if (!onDeleteCalculation) return;

    setDeleting(id);
    try {
      await onDeleteCalculation(id);
      // Reload list nach Löschen
      await loadCalculations(50, 0);
    } catch (err) {
      console.error('Error deleting calculation:', err);
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-600">Laden...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800 font-semibold">Fehler beim Laden</p>
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  if (!calculations || calculations.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Keine gespeicherten Berechnungen vorhanden</p>
        <p className="text-gray-500 text-sm mt-2">Erstellen Sie eine neue Berechnung, um sie zu speichern</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Referenz</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Beschreibung</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Zinsen</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Steuern</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Gesamt</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Erstellt</th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {calculations.map((calc: SavedCalculation) => (
                <tr key={calc.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                    {calc.reference || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {calc.description || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-gray-900 font-medium">
                    €{formatCurrency(calc.basicInterest)}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-gray-900 font-medium">
                    €{formatCurrency(calc.totalTaxes)}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-gray-900 font-bold">
                    €{formatCurrency(calc.totalPayable)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {formatDate(calc.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => onSelectCalculation?.(calc.id)}
                        className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition"
                      >
                        Öffnen
                      </button>
                      {onDeleteCalculation && (
                        <button
                          onClick={() => handleDelete(calc.id)}
                          disabled={deleting === calc.id}
                          className="px-3 py-1 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100 transition disabled:opacity-50"
                        >
                          {deleting === calc.id ? 'Löschen...' : 'Löschen'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-sm text-gray-600">
        {calculations.length} Berechnung{calculations.length !== 1 ? 'en' : ''} gefunden
      </div>
    </div>
  );
};
