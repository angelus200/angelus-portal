/**
 * Validierungsregeln für Zinsberechnung
 */

import { InterestCalculationInput } from '../hooks/useInterestCalculation';
import { ApiErrorHandler } from './errorHandler';

export interface ValidationError {
  field: string;
  message: string;
}

export class InterestCalculationValidator {
  /**
   * Validiert komplette Zinsberechnung Input
   */
  static validate(input: InterestCalculationInput): ValidationError[] {
    const errors: ValidationError[] = [];

    // Principal Validierung
    try {
      ApiErrorHandler.validatePositive(input.principal, 'Principal');
    } catch (err) {
      errors.push({
        field: 'principal',
        message: err instanceof Error ? err.message : 'Ungültiger Wert',
      });
    }

    // Annual Rate Validierung
    try {
      const rate = ApiErrorHandler.validateNumber(input.annualRate, 'Annual Rate', 0, 100);
      if (rate === 0) {
        throw new Error('Annual Rate muss größer als 0 sein');
      }
    } catch (err) {
      errors.push({
        field: 'annualRate',
        message: err instanceof Error ? err.message : 'Ungültiger Wert',
      });
    }

    // Subscription Amount Validierung
    try {
      ApiErrorHandler.validatePositive(input.subscriptionAmount, 'Subscription Amount');
    } catch (err) {
      errors.push({
        field: 'subscriptionAmount',
        message: err instanceof Error ? err.message : 'Ungültiger Wert',
      });
    }

    // Paid Amount Validierung
    try {
      const paid = ApiErrorHandler.validateNumber(input.paidAmount, 'Paid Amount', 0);
      const subscription = parseFloat(String(input.subscriptionAmount));

      if (paid > subscription) {
        throw new Error('Paid Amount kann nicht größer als Subscription Amount sein');
      }
    } catch (err) {
      errors.push({
        field: 'paidAmount',
        message: err instanceof Error ? err.message : 'Ungültiger Wert',
      });
    }

    // Start Date Validierung
    try {
      const date = ApiErrorHandler.validateDate(input.startDate, 'Start Date');
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (date > today) {
        throw new Error('Start Date kann nicht in der Zukunft liegen');
      }
    } catch (err) {
      errors.push({
        field: 'startDate',
        message: err instanceof Error ? err.message : 'Ungültiges Datum',
      });
    }

    // Periods Validierung
    try {
      const periods = ApiErrorHandler.validateNumber(input.periods, 'Periods', 1, 1200);
    } catch (err) {
      errors.push({
        field: 'periods',
        message: err instanceof Error ? err.message : 'Ungültiger Wert',
      });
    }

    // Tax Rates Validierung
    const taxFields = [
      { name: 'kestRate', label: 'KeSt Rate' },
      { name: 'solzRate', label: 'SolZ Rate' },
      { name: 'churchTaxRate', label: 'Church Tax Rate' },
    ];

    for (const field of taxFields) {
      try {
        const rate = input[field.name as keyof InterestCalculationInput];
        if (rate !== undefined) {
          ApiErrorHandler.validateNumber(rate, field.label, 0, 100);
        }
      } catch (err) {
        errors.push({
          field: field.name,
          message: err instanceof Error ? err.message : 'Ungültiger Wert',
        });
      }
    }

    // Default Rate Validierung
    try {
      if (input.defaultRate !== undefined) {
        ApiErrorHandler.validateNumber(input.defaultRate, 'Default Rate', 0, 100);
      }
    } catch (err) {
      errors.push({
        field: 'defaultRate',
        message: err instanceof Error ? err.message : 'Ungültiger Wert',
      });
    }

    // Payment Frequency Validierung
    const validFrequencies = ['monthly', 'annual', 'thesaurierend'];
    if (!validFrequencies.includes(input.paymentFrequency)) {
      errors.push({
        field: 'paymentFrequency',
        message: 'Ungültige Zahlungsweise',
      });
    }

    return errors;
  }

  /**
   * Gibt erste Validierungsfehler als String zurück
   */
  static getFirstError(input: InterestCalculationInput): string | null {
    const errors = this.validate(input);
    if (errors.length > 0) {
      return errors[0].message;
    }
    return null;
  }

  /**
   * Gibt alle Validierungsfehler als String zurück
   */
  static getAllErrors(input: InterestCalculationInput): string {
    const errors = this.validate(input);
    if (errors.length === 0) {
      return '';
    }
    return errors.map((e) => `${e.field}: ${e.message}`).join('\n');
  }
}
