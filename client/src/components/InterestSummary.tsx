/**
 * InterestSummary Komponente
 * 
 * Zeigt die Zinsübersicht mit Steuern und Verzugszinsen an
 */

import React from 'react';
import { InterestCalculationResult, formatCurrency } from '../hooks/useInterestCalculation';

interface InterestSummaryProps {
  result: InterestCalculationResult;
  loading?: boolean;
}

export const InterestSummary: React.FC<InterestSummaryProps> = ({ result, loading = false }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="p-8 text-center text-gray-500">
        Keine Zinsübersicht-Daten verfügbar
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hauptübersicht */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
          <p className="text-sm text-gray-600 mb-2">Basis-Zinsen</p>
          <p className="text-3xl font-bold text-blue-600">
            €{formatCurrency(result.basicInterest)}
          </p>
          <p className="text-xs text-gray-500 mt-2">Jährliche Zinsberechnung</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-lg border border-orange-200">
          <p className="text-sm text-gray-600 mb-2">Gesamtsteuern</p>
          <p className="text-3xl font-bold text-orange-600">
            €{formatCurrency(result.totalTaxes)}
          </p>
          <p className="text-xs text-gray-500 mt-2">KESt, SolZ, Kirchensteuer</p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-lg border border-red-200">
          <p className="text-sm text-gray-600 mb-2">Verzugszinsen</p>
          <p className="text-3xl font-bold text-red-600">
            €{formatCurrency(result.appliedDefaultInterest)}
          </p>
          <p className="text-xs text-gray-500 mt-2">17% p.a. auf ausstehende Beträge</p>
        </div>
      </div>

      {/* Steuern-Breakdown */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Steuern-Übersicht</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center pb-3 border-b border-gray-100">
            <span className="text-gray-700">KESt (25%)</span>
            <span className="font-semibold text-gray-900">€{formatCurrency(result.kest)}</span>
          </div>
          <div className="flex justify-between items-center pb-3 border-b border-gray-100">
            <span className="text-gray-700">SolZ (5,5% auf KESt)</span>
            <span className="font-semibold text-gray-900">€{formatCurrency(result.solz)}</span>
          </div>
          {parseFloat(result.churchTax) > 0 && (
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <span className="text-gray-700">Kirchensteuer</span>
              <span className="font-semibold text-gray-900">€{formatCurrency(result.churchTax)}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-3 bg-gray-50 px-3 py-2 rounded">
            <span className="font-semibold text-gray-900">Gesamtsteuern</span>
            <span className="font-bold text-lg text-orange-600">€{formatCurrency(result.totalTaxes)}</span>
          </div>
        </div>
      </div>

      {/* Netto-Zinsen */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Netto-Zinsen</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center pb-3 border-b border-gray-100">
            <span className="text-gray-700">Basis-Zinsen</span>
            <span className="font-semibold text-gray-900">€{formatCurrency(result.basicInterest)}</span>
          </div>
          <div className="flex justify-between items-center pb-3 border-b border-gray-100">
            <span className="text-gray-700">Abzüglich Steuern</span>
            <span className="font-semibold text-gray-900">-€{formatCurrency(result.totalTaxes)}</span>
          </div>
          {parseFloat(result.appliedDefaultInterest) > 0 && (
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <span className="text-gray-700">Plus Verzugszinsen</span>
              <span className="font-semibold text-gray-900">+€{formatCurrency(result.appliedDefaultInterest)}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-3 bg-green-50 px-3 py-2 rounded">
            <span className="font-semibold text-gray-900">Netto-Zinsen</span>
            <span className="font-bold text-lg text-green-600">€{formatCurrency(result.netInterest)}</span>
          </div>
        </div>
      </div>

      {/* Geschäftsregeln */}
      {result.businessRulesApplied && result.businessRulesApplied.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Angewendete Geschäftsregeln</h3>
          <ul className="space-y-2">
            {result.businessRulesApplied.map((rule, index) => (
              <li key={index} className="flex items-start">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-600 mt-2 mr-3 flex-shrink-0"></span>
                <span className="text-gray-700">{rule}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Gesamtzahlung */}
      <div className="bg-gradient-to-r from-purple-50 to-purple-100 border-2 border-purple-300 rounded-lg p-6">
        <p className="text-sm text-gray-600 mb-2">Gesamtzahlung (Principal + Zinsen + Steuern)</p>
        <p className="text-4xl font-bold text-purple-600">
          €{formatCurrency(result.totalPayable)}
        </p>
      </div>
    </div>
  );
};
