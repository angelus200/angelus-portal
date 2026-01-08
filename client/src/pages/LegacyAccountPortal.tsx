/**
 * Legacy Account Portal Seite
 * 
 * Bestandskunden-Portalseite mit Zahlungsplan-Anzeige und Zinsübersicht
 */

import React, { useState } from 'react';
import { useInterestCalculation, InterestCalculationInput } from '../hooks/useInterestCalculation';
import { InterestCalculationForm } from '../components/InterestCalculationForm';
import { InterestSummary } from '../components/InterestSummary';
import { PaymentScheduleTable } from '../components/PaymentScheduleTable';

export const LegacyAccountPortal: React.FC = () => {
  const { data, loading, error, calculate } = useInterestCalculation();
  const [activeTab, setActiveTab] = useState<'form' | 'summary' | 'schedule'>('form');

  const handleFormSubmit = async (input: InterestCalculationInput) => {
    try {
      await calculate(input);
      setActiveTab('summary');
    } catch (err) {
      console.error('Calculation error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold mb-2">Investor Legacy Account Portal</h1>
          <p className="text-blue-100">
            Verwalten Sie Ihre Bestandsanleihen und berechnen Sie Zinsen, Steuern und Zahlungspläne
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-semibold">Fehler</p>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('form')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'form'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              Berechnung
            </button>
            {data && (
              <>
                <button
                  onClick={() => setActiveTab('summary')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'summary'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  Zinsübersicht
                </button>
                <button
                  onClick={() => setActiveTab('schedule')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'schedule'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  Zahlungsplan
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'form' && (
            <InterestCalculationForm onSubmit={handleFormSubmit} loading={loading} />
          )}

          {activeTab === 'summary' && data && (
            <div className="space-y-6">
              <InterestSummary result={data} loading={loading} />
              <button
                onClick={() => setActiveTab('form')}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Neue Berechnung
              </button>
            </div>
          )}

          {activeTab === 'schedule' && data && (
            <div className="space-y-6">
              <PaymentScheduleTable schedule={data.paymentSchedule} loading={loading} />
              <button
                onClick={() => setActiveTab('form')}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Neue Berechnung
              </button>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Über dieses Portal</h3>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 rounded-full bg-blue-600 mt-2 mr-3 flex-shrink-0"></span>
              <span>Berechnen Sie Zinsen, Steuern und Zahlungspläne für Ihre Bestandsanleihen</span>
            </li>
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 rounded-full bg-blue-600 mt-2 mr-3 flex-shrink-0"></span>
              <span>Unterstützte Zahlungsweisen: Monatlich, Jährlich, Thesaurierend (LINEAR)</span>
            </li>
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 rounded-full bg-blue-600 mt-2 mr-3 flex-shrink-0"></span>
              <span>Automatische Berechnung von KESt, SolZ und Kirchensteuer</span>
            </li>
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 rounded-full bg-blue-600 mt-2 mr-3 flex-shrink-0"></span>
              <span>Verzugszinsen (17% p.a.) für ausstehende Beträge</span>
            </li>
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 rounded-full bg-blue-600 mt-2 mr-3 flex-shrink-0"></span>
              <span>Geschäftsregeln: Keine Verzugszinsen für Unternehmensverbindlichkeiten</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
