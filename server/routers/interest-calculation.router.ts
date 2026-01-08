/**
 * Interest Calculation API Router
 * 
 * Endpoints für Zinsberechnung und Zahlungsplan-Generierung
 * 
 * POST /api/interest-calculation - Komplette Zinsberechnung
 * POST /api/payment-schedule - Zahlungsplan-Generierung
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuthMiddleware, getUserIdFromRequest } from '../_core/auth-middleware';
import Decimal from 'decimal.js';
import {
  calculateCompleteInterest,
  validateCompleteInterestCalculation,
} from '../interest-calculation';
import {
  saveInterestCalculation,
  getInterestCalculationById,
  listUserInterestCalculations,
  savePaymentSchedule,
  getPaymentScheduleById,
  listUserPaymentSchedules,
  savePaymentScheduleItems,
  getPaymentScheduleItems,
  getUserInterestCalculationStats,
  deleteInterestCalculation,
} from '../db-interest-calculations';

const router = Router();

// Verwende zentrale Auth-Middleware
const requireAuth = requireAuthMiddleware;

// Hilfsfunktion zum Extrahieren der User ID
function getUserId(req: Request): number {
  return getUserIdFromRequest(req);
}

/**
 * Request Body für Zinsberechnung
 */
interface InterestCalculationRequest {
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
  description?: string;
  reference?: string;
}

/**
 * Response für Zinsberechnung
 */
interface InterestCalculationResponse {
  success: boolean;
  data?: {
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
    paymentSchedule: {
      frequency: string;
      totalPayments: number;
      schedule: Array<{
        paymentNumber: number;
        paymentDate: string;
        principalAmount: string;
        interestAmount: string;
        taxAmount: string;
        defaultInterestAmount: string;
        totalPayment: string;
        frequency: string;
      }>;
      totalInterest: string;
      totalTaxes: string;
      totalDefaultInterest: string;
      totalPayable: string;
    };
  };
  error?: string;
}

/**
 * POST /api/interest-calculation
 * 
 * Berechnet die komplette Zinsberechnung mit allen 5 Schritten
 * 
 * @param req - Request mit InterestCalculationRequest Body
 * @param res - Response mit InterestCalculationResponse
 */
router.post('/interest-calculation', (req: Request<{}, {}, InterestCalculationRequest>, res: Response<InterestCalculationResponse>) => {
  try {
    // Validiere Request Body
    const { principal, annualRate, subscriptionAmount, paidAmount, startDate, periods, paymentFrequency } = req.body;

    if (!principal || principal <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Principal muss größer als 0 sein',
      });
    }

    if (!annualRate || annualRate < 0 || annualRate > 100) {
      return res.status(400).json({
        success: false,
        error: 'Annual rate muss zwischen 0 und 100 liegen',
      });
    }

    if (!subscriptionAmount || subscriptionAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Subscription amount muss größer als 0 sein',
      });
    }

    if (paidAmount === undefined || paidAmount < 0 || paidAmount > subscriptionAmount) {
      return res.status(400).json({
        success: false,
        error: 'Paid amount muss zwischen 0 und subscription amount liegen',
      });
    }

    if (!startDate) {
      return res.status(400).json({
        success: false,
        error: 'Start date ist erforderlich',
      });
    }

    if (!periods || periods <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Periods muss größer als 0 sein',
      });
    }

    if (!['monthly', 'annual', 'thesaurierend'].includes(paymentFrequency)) {
      return res.status(400).json({
        success: false,
        error: 'Payment frequency muss "monthly", "annual" oder "thesaurierend" sein',
      });
    }

    // Berechne Zinsberechnung
    const result = calculateCompleteInterest({
      principal,
      annualRate,
      subscriptionAmount,
      paidAmount,
      startDate: new Date(startDate),
      periods,
      kestRate: req.body.kestRate ?? 25,
      solzRate: req.body.solzRate ?? 5.5,
      churchTaxRate: req.body.churchTaxRate ?? 0,
      defaultRate: req.body.defaultRate ?? 17,
      isCompanyLiability: req.body.isCompanyLiability ?? false,
      enableInsolvencyHold: req.body.enableInsolvencyHold ?? false,
      paymentFrequency,
    });

    // Validiere Ergebnis
    if (!validateCompleteInterestCalculation(result)) {
      return res.status(500).json({
        success: false,
        error: 'Zinsberechnung konnte nicht validiert werden',
      });
    }

    // Konvertiere Decimal zu String für JSON
    return res.status(200).json({
      success: true,
      data: {
        basicInterest: result.basicInterest.toString(),
        kest: result.kest.toString(),
        solz: result.solz.toString(),
        churchTax: result.churchTax.toString(),
        totalTaxes: result.totalTaxes.toString(),
        defaultInterest: result.defaultInterest.toString(),
        appliedDefaultInterest: result.appliedDefaultInterest.toString(),
        isCompanyLiability: result.isCompanyLiability,
        enableInsolvencyHold: result.enableInsolvencyHold,
        businessRulesApplied: result.businessRulesApplied,
        paymentFrequency: result.paymentFrequency,
        totalInterestAndTaxes: result.totalInterestAndTaxes.toString(),
        netInterest: result.netInterest.toString(),
        totalPayable: result.totalPayable.toString(),
        paymentSchedule: {
          frequency: result.paymentSchedule.frequency,
          totalPayments: result.paymentSchedule.totalPayments,
          schedule: result.paymentSchedule.schedule.map((payment) => ({
            paymentNumber: payment.paymentNumber,
            paymentDate: payment.paymentDate.toISOString(),
            principalAmount: payment.principalAmount.toString(),
            interestAmount: payment.interestAmount.toString(),
            taxAmount: payment.taxAmount.toString(),
            defaultInterestAmount: payment.defaultInterestAmount.toString(),
            totalPayment: payment.totalPayment.toString(),
            frequency: payment.frequency,
          })),
          totalInterest: result.paymentSchedule.totalInterest.toString(),
          totalTaxes: result.paymentSchedule.totalTaxes.toString(),
          totalDefaultInterest: result.paymentSchedule.totalDefaultInterest.toString(),
          totalPayable: result.paymentSchedule.totalPayable.toString(),
        },
      },
    });
  } catch (error) {
    console.error('Error in interest-calculation endpoint:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
    });
  }
});

/**
 * POST /api/payment-schedule
 * 
 * Generiert einen Zahlungsplan basierend auf Zahlungsweise
 * 
 * @param req - Request mit PaymentScheduleRequest Body
 * @param res - Response mit PaymentScheduleResponse
 */
router.post('/payment-schedule', (req: Request<{}, {}, InterestCalculationRequest>, res: Response) => {
  try {
    // Validiere Request Body (gleich wie interest-calculation)
    const { principal, annualRate, subscriptionAmount, paidAmount, startDate, periods, paymentFrequency } = req.body;

    if (!principal || principal <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Principal muss größer als 0 sein',
      });
    }

    if (!periods || periods <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Periods muss größer als 0 sein',
      });
    }

    if (!['monthly', 'annual', 'thesaurierend'].includes(paymentFrequency)) {
      return res.status(400).json({
        success: false,
        error: 'Payment frequency muss "monthly", "annual" oder "thesaurierend" sein',
      });
    }

    // Berechne Zinsberechnung (um Zahlungsplan zu erhalten)
    const result = calculateCompleteInterest({
      principal,
      annualRate,
      subscriptionAmount,
      paidAmount,
      startDate: new Date(startDate),
      periods,
      kestRate: req.body.kestRate ?? 25,
      solzRate: req.body.solzRate ?? 5.5,
      churchTaxRate: req.body.churchTaxRate ?? 0,
      defaultRate: req.body.defaultRate ?? 17,
      isCompanyLiability: req.body.isCompanyLiability ?? false,
      enableInsolvencyHold: req.body.enableInsolvencyHold ?? false,
      paymentFrequency,
    });

    // Extrahiere Zahlungsplan
    const paymentSchedule = result.paymentSchedule;

    return res.status(200).json({
      success: true,
      data: {
        frequency: paymentSchedule.frequency,
        totalPayments: paymentSchedule.totalPayments,
        schedule: paymentSchedule.schedule.map((payment) => ({
          paymentNumber: payment.paymentNumber,
          paymentDate: payment.paymentDate.toISOString(),
          principalAmount: payment.principalAmount.toString(),
          interestAmount: payment.interestAmount.toString(),
          taxAmount: payment.taxAmount.toString(),
          defaultInterestAmount: payment.defaultInterestAmount.toString(),
          totalPayment: payment.totalPayment.toString(),
          frequency: payment.frequency,
        })),
        totalInterest: paymentSchedule.totalInterest.toString(),
        totalTaxes: paymentSchedule.totalTaxes.toString(),
        totalDefaultInterest: paymentSchedule.totalDefaultInterest.toString(),
        totalPayable: paymentSchedule.totalPayable.toString(),
      },
    });
  } catch (error) {
    console.error('Error in payment-schedule endpoint:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
    });
  }
});

/**
 * POST /api/interest-calculation/save
 * 
 * Speichert eine Zinsberechnung in der Datenbank
 */
router.post('/interest-calculation/save', requireAuth, async (req: Request<{}, {}, InterestCalculationRequest>, res: Response) => {
  try {
    const userId = getUserId(req);
    
    // Berechne Zinsberechnung
    const { principal, annualRate, subscriptionAmount, paidAmount, startDate, periods, paymentFrequency } = req.body;
    
    const result = calculateCompleteInterest({
      principal,
      annualRate,
      subscriptionAmount,
      paidAmount,
      startDate: new Date(startDate),
      periods,
      kestRate: req.body.kestRate ?? 25,
      solzRate: req.body.solzRate ?? 5.5,
      churchTaxRate: req.body.churchTaxRate ?? 0,
      defaultRate: req.body.defaultRate ?? 17,
      isCompanyLiability: req.body.isCompanyLiability ?? false,
      enableInsolvencyHold: req.body.enableInsolvencyHold ?? false,
      paymentFrequency,
    });
    
    // Speichere Zinsberechnung
    const calculationId = await saveInterestCalculation(userId, {
      principal: principal.toString(),
      annualRate: annualRate.toString(),
      subscriptionAmount: subscriptionAmount.toString(),
      paidAmount: paidAmount.toString(),
      startDate,
      periods,
      kestRate: (req.body.kestRate ?? 25).toString(),
      solzRate: (req.body.solzRate ?? 5.5).toString(),
      churchTaxRate: (req.body.churchTaxRate ?? 0).toString(),
      defaultRate: (req.body.defaultRate ?? 17).toString(),
      isCompanyLiability: req.body.isCompanyLiability ?? false,
      enableInsolvencyHold: req.body.enableInsolvencyHold ?? false,
      paymentFrequency,
      basicInterest: result.basicInterest.toString(),
      kest: result.kest.toString(),
      solz: result.solz.toString(),
      churchTax: result.churchTax.toString(),
      totalTaxes: result.totalTaxes.toString(),
      defaultInterest: result.defaultInterest.toString(),
      appliedDefaultInterest: result.appliedDefaultInterest.toString(),
      totalInterestAndTaxes: result.totalInterestAndTaxes.toString(),
      netInterest: result.netInterest.toString(),
      totalPayable: result.totalPayable.toString(),
      businessRulesApplied: result.businessRulesApplied,
      description: req.body.description,
      reference: req.body.reference,
    });
    
    // Speichere Zahlungsplan
    const scheduleId = await savePaymentSchedule(userId, calculationId, {
      frequency: result.paymentSchedule.frequency,
      totalPayments: result.paymentSchedule.totalPayments,
      totalInterest: result.paymentSchedule.totalInterest.toString(),
      totalTaxes: result.paymentSchedule.totalTaxes.toString(),
      totalDefaultInterest: result.paymentSchedule.totalDefaultInterest.toString(),
      totalPayable: result.paymentSchedule.totalPayable.toString(),
      scheduleData: result.paymentSchedule.schedule.map((payment) => ({
        paymentNumber: payment.paymentNumber,
        paymentDate: payment.paymentDate.toISOString(),
        principalAmount: payment.principalAmount.toString(),
        interestAmount: payment.interestAmount.toString(),
        taxAmount: payment.taxAmount.toString(),
        defaultInterestAmount: payment.defaultInterestAmount.toString(),
        totalPayment: payment.totalPayment.toString(),
        frequency: payment.frequency,
      })),
    });
    
    // Speichere Zahlungsplan-Items
    await savePaymentScheduleItems(
      userId,
      scheduleId,
      calculationId,
      result.paymentSchedule.schedule.map((payment) => ({
        paymentNumber: payment.paymentNumber,
        paymentDate: payment.paymentDate.toISOString(),
        principalAmount: payment.principalAmount.toString(),
        interestAmount: payment.interestAmount.toString(),
        taxAmount: payment.taxAmount.toString(),
        defaultInterestAmount: payment.defaultInterestAmount.toString(),
        totalPayment: payment.totalPayment.toString(),
      }))
    );
    
    return res.status(201).json({
      success: true,
      data: {
        calculationId,
        scheduleId,
        message: 'Zinsberechnung und Zahlungsplan erfolgreich gespeichert',
      },
    });
  } catch (error) {
    console.error('Error saving interest calculation:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Speichern',
    });
  }
});

/**
 * GET /api/interest-calculation/:id
 * 
 * Ruft eine gespeicherte Zinsberechnung ab
 */
router.get('/interest-calculation/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const id = parseInt(req.params.id);
    
    const calculation = await getInterestCalculationById(id, userId);
    
    if (!calculation) {
      return res.status(404).json({
        success: false,
        error: 'Zinsberechnung nicht gefunden',
      });
    }
    
    return res.status(200).json({
      success: true,
      data: calculation,
    });
  } catch (error) {
    console.error('Error getting interest calculation:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Abrufen',
    });
  }
});

/**
 * GET /api/interest-calculations/user
 * 
 * Listet alle Zinsberechnungen des Benutzers auf
 */
router.get('/interest-calculations/user', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    
    const calculations = await listUserInterestCalculations(userId, limit, offset);
    const stats = await getUserInterestCalculationStats(userId);
    
    return res.status(200).json({
      success: true,
      data: {
        calculations,
        stats,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error('Error listing interest calculations:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Abrufen',
    });
  }
});

/**
 * GET /api/payment-schedule/:id
 * 
 * Ruft einen gespeicherten Zahlungsplan ab
 */
router.get('/payment-schedule/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const id = parseInt(req.params.id);
    
    const schedule = await getPaymentScheduleById(id, userId);
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: 'Zahlungsplan nicht gefunden',
      });
    }
    
    // Hole auch die Zahlungsplan-Items
    const items = await getPaymentScheduleItems(id, userId);
    
    return res.status(200).json({
      success: true,
      data: {
        ...schedule,
        items,
      },
    });
  } catch (error) {
    console.error('Error getting payment schedule:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Abrufen',
    });
  }
});

/**
 * GET /api/payment-schedules/user
 * 
 * Listet alle Zahlungspläne des Benutzers auf
 */
router.get('/payment-schedules/user', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    
    const schedules = await listUserPaymentSchedules(userId, limit, offset);
    
    return res.status(200).json({
      success: true,
      data: {
        schedules,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error('Error listing payment schedules:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Abrufen',
    });
  }
});

/**
 * DELETE /api/interest-calculation/:id
 * 
 * Löscht eine Zinsberechnung und ihre Zahlungspläne
 */
router.delete('/interest-calculation/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const id = parseInt(req.params.id);
    
    const success = await deleteInterestCalculation(id, userId);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Zinsberechnung nicht gefunden',
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Zinsberechnung erfolgreich gelöscht',
    });
  } catch (error) {
    console.error('Error deleting interest calculation:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Löschen',
    });
  }
});

export default router;
