/**
 * Hook für Interest Calculation API
 * 
 * Nutzt die neuen REST-Endpoints für Zinsberechnung und Zahlungsplan-Generierung
 */

import { useState, useCallback } from 'react';
import Decimal from 'decimal.js';
import { ApiErrorHandler, retryFetch } from '../utils/errorHandler';
import { InterestCalculationValidator } from '../utils/validationRules';

export interface InterestCalculationInput {
  principal: number;
  annualRate: number;
  subscriptionAmount: number;
  paidAmount: number;
  startDate: string; // ISO 8601 Format
  periods: number;
  kestRate?: number;
  solzRate?: number;
  churchTaxRate?: number;
  defaultRate?: number;
  isCompanyLiability?: boolean;
  enableInsolvencyHold?: boolean;
  paymentFrequency: 'monthly' | 'annual' | 'thesaurierend';
}

export interface PaymentScheduleItem {
  paymentNumber: number;
  paymentDate: string;
  principalAmount: string;
  interestAmount: string;
  taxAmount: string;
  defaultInterestAmount: string;
  totalPayment: string;
  frequency: string;
}

export interface PaymentScheduleData {
  frequency: string;
  totalPayments: number;
  schedule: PaymentScheduleItem[];
  totalInterest: string;
  totalTaxes: string;
  totalDefaultInterest: string;
  totalPayable: string;
}

export interface InterestCalculationResult {
  basicInterest: string;
  kest: string;
  solz: string;
  churchTax: string;
  totalTaxes: string;
  defaultInterest: string;
  appliedDefaultInterest: string;
  isCompanyLiability: boolean;
  enableInsolvencyHold: boolean;
  businessRulesApplied: string[];
  paymentFrequency: string;
  totalInterestAndTaxes: string;
  netInterest: string;
  totalPayable: string;
  paymentSchedule: PaymentScheduleData;
}

export interface UseInterestCalculationState {
  data: InterestCalculationResult | null;
  loading: boolean;
  error: string | null;
  calculationId?: number;
  scheduleId?: number;
}

/**
 * Hook für Zinsberechnung
 * 
 * @returns Object mit calculate Funktion und State
 */
export function useInterestCalculation() {
  const [state, setState] = useState<UseInterestCalculationState>({
    data: null,
    loading: false,
    error: null,
  });

  const calculate = useCallback(async (input: InterestCalculationInput) => {
    setState({ data: null, loading: true, error: null });

    try {
      // Validiere Input
      const validationError = InterestCalculationValidator.getFirstError(input);
      if (validationError) {
        throw new Error(validationError);
      }

      const response = await retryFetch('/api/interest-calculation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Zinsberechnung fehlgeschlagen');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Zinsberechnung fehlgeschlagen');
      }

      setState({ data: result.data, loading: false, error: null });
      return result.data;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setState({ data: null, loading: false, error });
      throw err;
    }
  }, []);

  return {
    ...state,
    calculate,
  };
}

/**
 * Hook für Zahlungsplan-Generierung
 * 
 * @returns Object mit generateSchedule Funktion und State
 */
export function usePaymentSchedule() {
  const [state, setState] = useState<{
    data: PaymentScheduleData | null;
    loading: boolean;
    error: string | null;
  }>({
    data: null,
    loading: false,
    error: null,
  });

  const generateSchedule = useCallback(async (input: InterestCalculationInput) => {
    setState({ data: null, loading: true, error: null });

    try {
      const response = await fetch('/api/payment-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Zahlungsplan-Generierung fehlgeschlagen');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Zahlungsplan-Generierung fehlgeschlagen');
      }

      setState({ data: result.data, loading: false, error: null });
      return result.data;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setState({ data: null, loading: false, error });
      throw err;
    }
  }, []);

  return {
    ...state,
    generateSchedule,
  };
}

/**
 * Konvertiert Dezimal-Strings zu Zahlen für Anzeige
 */
export function formatCurrency(value: string, decimals: number = 2): string {
  try {
    const decimal = new Decimal(value);
    return decimal.toFixed(decimals);
  } catch {
    return value;
  }
}

/**
 * Konvertiert ISO-Datum zu deutschem Format
 */
export function formatDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    return date.toLocaleDateString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return isoDate;
  }
}


/**
 * Hook zum Speichern und Laden von Zinsberechnungen
 */
export function useSaveInterestCalculation() {
  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
    calculationId?: number;
    scheduleId?: number;
  }>({
    loading: false,
    error: null,
  });

  const save = useCallback(async (input: InterestCalculationInput & { description?: string; reference?: string }) => {
    setState({ loading: true, error: null });

    try {
      const response = await fetch('/api/interest-calculation/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Speichern fehlgeschlagen');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Speichern fehlgeschlagen');
      }

      setState({
        loading: false,
        error: null,
        calculationId: result.data.calculationId,
        scheduleId: result.data.scheduleId,
      });

      return result.data;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setState({ loading: false, error });
      throw err;
    }
  }, []);

  return {
    ...state,
    save,
  };
}

/**
 * Hook zum Laden von gespeicherten Zinsberechnungen
 */
export function useLoadInterestCalculations() {
  const [state, setState] = useState<{
    calculations: any[];
    loading: boolean;
    error: string | null;
  }>({
    calculations: [],
    loading: false,
    error: null,
  });

  const loadCalculations = useCallback(async (limit: number = 50, offset: number = 0) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch(`/api/interest-calculations/user?limit=${limit}&offset=${offset}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Laden fehlgeschlagen');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Laden fehlgeschlagen');
      }

      setState({
        calculations: result.data.calculations,
        loading: false,
        error: null,
      });

      return result.data;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setState((prev) => ({ ...prev, loading: false, error }));
      throw err;
    }
  }, []);

  return {
    ...state,
    loadCalculations,
  };
}
