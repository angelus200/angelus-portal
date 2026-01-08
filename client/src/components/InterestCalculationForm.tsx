/**
 * InterestCalculationForm Komponente
 * 
 * Formular zur Eingabe von Zinsberechnung-Parametern
 */

import React, { useState } from 'react';
import { InterestCalculationInput } from '../hooks/useInterestCalculation';

interface InterestCalculationFormProps {
  onSubmit: (input: InterestCalculationInput) => Promise<void>;
  loading?: boolean;
}

export const InterestCalculationForm: React.FC<InterestCalculationFormProps> = ({ onSubmit, loading = false }) => {
  const [formData, setFormData] = useState<InterestCalculationInput>({
    principal: 100000,
    annualRate: 6,
    subscriptionAmount: 100000,
    paidAmount: 100000,
    startDate: new Date().toISOString().split('T')[0],
    periods: 12,
    kestRate: 25,
    solzRate: 5.5,
    churchTaxRate: 0,
    defaultRate: 17,
    isCompanyLiability: false,
    enableInsolvencyHold: false,
    paymentFrequency: 'monthly',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseFloat(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Zinsberechnung</h2>

      {/* Basis-Parameter */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Principal (€)
          </label>
          <input
            type="number"
            name="principal"
            value={formData.principal}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            step="1000"
            min="0"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Jährlicher Zinssatz (%)
          </label>
          <input
            type="number"
            name="annualRate"
            value={formData.annualRate}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            step="0.1"
            min="0"
            max="100"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Zeichnungsbetrag (€)
          </label>
          <input
            type="number"
            name="subscriptionAmount"
            value={formData.subscriptionAmount}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            step="1000"
            min="0"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Eingezahlter Betrag (€)
          </label>
          <input
            type="number"
            name="paidAmount"
            value={formData.paidAmount}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            step="1000"
            min="0"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Startdatum
          </label>
          <input
            type="date"
            name="startDate"
            value={formData.startDate}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Zeitraum (Monate/Jahre)
          </label>
          <input
            type="number"
            name="periods"
            value={formData.periods}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            step="1"
            min="1"
            required
          />
        </div>
      </div>

      {/* Zahlungsweise */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Zahlungsweise
        </label>
        <select
          name="paymentFrequency"
          value={formData.paymentFrequency}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        >
          <option value="monthly">Monatlich (12 Zahlungen/Jahr)</option>
          <option value="annual">Jährlich (1 Zahlung/Jahr)</option>
          <option value="thesaurierend">Thesaurierend (LINEAR, KEINE Zinseszinsen)</option>
        </select>
      </div>

      {/* Steuersätze */}
      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Steuersätze</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              KESt (%)
            </label>
            <input
              type="number"
              name="kestRate"
              value={formData.kestRate}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              step="0.1"
              min="0"
              max="100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SolZ (%)
            </label>
            <input
              type="number"
              name="solzRate"
              value={formData.solzRate}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              step="0.1"
              min="0"
              max="100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kirchensteuer (%)
            </label>
            <input
              type="number"
              name="churchTaxRate"
              value={formData.churchTaxRate}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              step="0.1"
              min="0"
              max="100"
            />
          </div>
        </div>
      </div>

      {/* Geschäftsregeln */}
      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Geschäftsregeln</h3>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="isCompanyLiability"
              checked={formData.isCompanyLiability}
              onChange={handleChange}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="ml-3 text-gray-700">
              Unternehmensverbindlichkeit (KEINE Verzugszinsen)
            </span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              name="enableInsolvencyHold"
              checked={formData.enableInsolvencyHold}
              onChange={handleChange}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="ml-3 text-gray-700">
              Insolvenzvorhalt aktiv (Zahlungen suspendiert)
            </span>
          </label>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex gap-4 pt-4 border-t border-gray-200">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          {loading ? 'Wird berechnet...' : 'Berechnen'}
        </button>
      </div>
    </form>
  );
};
