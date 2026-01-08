/**
 * PaymentScheduleTable Komponente
 * 
 * Zeigt den Zahlungsplan in einer Tabelle an
 */

import React from 'react';
import { PaymentScheduleData, formatCurrency, formatDate } from '../hooks/useInterestCalculation';

interface PaymentScheduleTableProps {
  schedule: PaymentScheduleData;
  loading?: boolean;
}

export const PaymentScheduleTable: React.FC<PaymentScheduleTableProps> = ({ schedule, loading = false }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!schedule || schedule.schedule.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        Keine Zahlungsplan-Daten verfügbar
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100 border-b-2 border-gray-300">
            <th className="px-4 py-3 text-left font-semibold text-gray-700">Zahlung</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-700">Datum</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-700">Zinsen</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-700">Steuern</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-700">Verzugszinsen</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-700">Gesamtzahlung</th>
          </tr>
        </thead>
        <tbody>
          {schedule.schedule.map((payment, index) => (
            <tr
              key={index}
              className={`border-b border-gray-200 ${
                index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
              } hover:bg-blue-50 transition-colors`}
            >
              <td className="px-4 py-3 text-gray-900">
                {payment.paymentNumber}
              </td>
              <td className="px-4 py-3 text-gray-900">
                {formatDate(payment.paymentDate)}
              </td>
              <td className="px-4 py-3 text-right text-gray-900">
                €{formatCurrency(payment.interestAmount)}
              </td>
              <td className="px-4 py-3 text-right text-gray-900">
                €{formatCurrency(payment.taxAmount)}
              </td>
              <td className="px-4 py-3 text-right text-gray-900">
                €{formatCurrency(payment.defaultInterestAmount)}
              </td>
              <td className="px-4 py-3 text-right font-semibold text-blue-600">
                €{formatCurrency(payment.totalPayment)}
              </td>
            </tr>
          ))}
          <tr className="bg-gray-100 border-t-2 border-gray-300 font-semibold">
            <td colSpan={2} className="px-4 py-3 text-gray-900">
              Gesamtsumme
            </td>
            <td className="px-4 py-3 text-right text-gray-900">
              €{formatCurrency(schedule.totalInterest)}
            </td>
            <td className="px-4 py-3 text-right text-gray-900">
              €{formatCurrency(schedule.totalTaxes)}
            </td>
            <td className="px-4 py-3 text-right text-gray-900">
              €{formatCurrency(schedule.totalDefaultInterest)}
            </td>
            <td className="px-4 py-3 text-right text-blue-600">
              €{formatCurrency(schedule.totalPayable)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Zusammenfassung */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-sm text-gray-600 mb-1">Zahlungsweise</p>
          <p className="text-lg font-semibold text-gray-900 capitalize">
            {schedule.frequency === 'monthly' && 'Monatlich'}
            {schedule.frequency === 'annual' && 'Jährlich'}
            {schedule.frequency === 'thesaurierend' && 'Thesaurierend'}
          </p>
        </div>

        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <p className="text-sm text-gray-600 mb-1">Zahlungen</p>
          <p className="text-lg font-semibold text-gray-900">
            {schedule.totalPayments}
          </p>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <p className="text-sm text-gray-600 mb-1">Gesamtzinsen</p>
          <p className="text-lg font-semibold text-gray-900">
            €{formatCurrency(schedule.totalInterest)}
          </p>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <p className="text-sm text-gray-600 mb-1">Gesamtzahlung</p>
          <p className="text-lg font-semibold text-gray-900">
            €{formatCurrency(schedule.totalPayable)}
          </p>
        </div>
      </div>
    </div>
  );
};
