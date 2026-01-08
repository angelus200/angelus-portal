/**
 * Tests für Interest Calculation API Router
 * 
 * Testet alle API-Endpoints für Zinsberechnung und Zahlungsplan-Generierung
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import interestCalculationRouter from './interest-calculation.router';

// Erstelle Express App für Tests
const app = express();
app.use(express.json());
app.use('/api', interestCalculationRouter);

describe('Interest Calculation API Router', () => {
  /**
   * TESTFALL 1: POST /api/interest-calculation - Erfolgreiche Berechnung
   */
  it('Testfall 1: POST /api/interest-calculation - Erfolgreiche Berechnung', async () => {
    const response = await request(app)
      .post('/api/interest-calculation')
      .send({
        principal: 100000,
        annualRate: 6,
        subscriptionAmount: 100000,
        paidAmount: 80000,
        startDate: '2024-01-01',
        periods: 12,
        kestRate: 25,
        solzRate: 5.5,
        churchTaxRate: 0,
        defaultRate: 17,
        isCompanyLiability: false,
        enableInsolvencyHold: false,
        paymentFrequency: 'monthly',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data?.basicInterest).toBeDefined();
    expect(response.body.data?.totalPayable).toBeDefined();
    expect(response.body.data?.paymentSchedule).toBeDefined();
    expect(response.body.data?.paymentSchedule.totalPayments).toBe(12);
  });

  /**
   * TESTFALL 2: POST /api/interest-calculation - Ungültiger Principal
   */
  it('Testfall 2: POST /api/interest-calculation - Ungültiger Principal', async () => {
    const response = await request(app)
      .post('/api/interest-calculation')
      .send({
        principal: -100000, // Negativ!
        annualRate: 6,
        subscriptionAmount: 100000,
        paidAmount: 80000,
        startDate: '2024-01-01',
        periods: 12,
        paymentFrequency: 'monthly',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });

  /**
   * TESTFALL 3: POST /api/interest-calculation - Ungültiger Annual Rate
   */
  it('Testfall 3: POST /api/interest-calculation - Ungültiger Annual Rate', async () => {
    const response = await request(app)
      .post('/api/interest-calculation')
      .send({
        principal: 100000,
        annualRate: 150, // Zu hoch!
        subscriptionAmount: 100000,
        paidAmount: 80000,
        startDate: '2024-01-01',
        periods: 12,
        paymentFrequency: 'monthly',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  /**
   * TESTFALL 4: POST /api/interest-calculation - Ungültige Zahlungsweise
   */
  it('Testfall 4: POST /api/interest-calculation - Ungültige Zahlungsweise', async () => {
    const response = await request(app)
      .post('/api/interest-calculation')
      .send({
        principal: 100000,
        annualRate: 6,
        subscriptionAmount: 100000,
        paidAmount: 80000,
        startDate: '2024-01-01',
        periods: 12,
        paymentFrequency: 'invalid', // Ungültig!
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  /**
   * TESTFALL 5: POST /api/interest-calculation - Company mit Zahlungsweisen
   */
  it('Testfall 5: POST /api/interest-calculation - Company mit Zahlungsweisen', async () => {
    const response = await request(app)
      .post('/api/interest-calculation')
      .send({
        principal: 100000,
        annualRate: 6,
        subscriptionAmount: 100000,
        paidAmount: 50000,
        startDate: '2024-01-01',
        periods: 3,
        kestRate: 25,
        solzRate: 5.5,
        churchTaxRate: 0,
        defaultRate: 17,
        isCompanyLiability: true,
        enableInsolvencyHold: false,
        paymentFrequency: 'annual',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data?.appliedDefaultInterest).toBe('0'); // KEINE Verzugszinsen
    expect(response.body.data?.businessRulesApplied).toContain('Unternehmensverbindlichkeit: Keine Verzugszinsen');
  });

  /**
   * TESTFALL 6: POST /api/interest-calculation - Thesaurierende Zahlungen
   */
  it('Testfall 6: POST /api/interest-calculation - Thesaurierende Zahlungen', async () => {
    const response = await request(app)
      .post('/api/interest-calculation')
      .send({
        principal: 100000,
        annualRate: 6,
        subscriptionAmount: 100000,
        paidAmount: 100000,
        startDate: '2024-01-01',
        periods: 5,
        kestRate: 25,
        solzRate: 5.5,
        churchTaxRate: 9,
        defaultRate: 17,
        isCompanyLiability: false,
        enableInsolvencyHold: false,
        paymentFrequency: 'thesaurierend',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data?.paymentSchedule.totalPayments).toBe(1); // Nur eine Zahlung
  });

  /**
   * TESTFALL 7: POST /api/payment-schedule - Erfolgreiche Zahlungsplan-Generierung
   */
  it('Testfall 7: POST /api/payment-schedule - Erfolgreiche Zahlungsplan-Generierung', async () => {
    const response = await request(app)
      .post('/api/payment-schedule')
      .send({
        principal: 100000,
        annualRate: 6,
        subscriptionAmount: 100000,
        paidAmount: 100000,
        startDate: '2024-01-01',
        periods: 12,
        kestRate: 25,
        solzRate: 5.5,
        churchTaxRate: 0,
        defaultRate: 17,
        isCompanyLiability: false,
        enableInsolvencyHold: false,
        paymentFrequency: 'monthly',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.frequency).toBe('monthly');
    expect(response.body.data.totalPayments).toBe(12);
    expect(response.body.data.schedule).toHaveLength(12);
  });

  /**
   * TESTFALL 8: POST /api/payment-schedule - Ungültige Zahlungsweise
   */
  it('Testfall 8: POST /api/payment-schedule - Ungültige Zahlungsweise', async () => {
    const response = await request(app)
      .post('/api/payment-schedule')
      .send({
        principal: 100000,
        annualRate: 6,
        subscriptionAmount: 100000,
        paidAmount: 100000,
        startDate: '2024-01-01',
        periods: 12,
        paymentFrequency: 'invalid',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  /**
   * TESTFALL 9: POST /api/interest-calculation - Große Beträge
   */
  it('Testfall 9: POST /api/interest-calculation - Große Beträge', async () => {
    const response = await request(app)
      .post('/api/interest-calculation')
      .send({
        principal: 1000000,
        annualRate: 6,
        subscriptionAmount: 1000000,
        paidAmount: 500000,
        startDate: '2024-01-01',
        periods: 10,
        kestRate: 25,
        solzRate: 5.5,
        churchTaxRate: 9,
        defaultRate: 17,
        isCompanyLiability: false,
        enableInsolvencyHold: false,
        paymentFrequency: 'annual',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data?.totalPayable).toBeDefined();
    expect(response.body.data?.paymentSchedule.totalPayments).toBe(10);
  });

  /**
   * TESTFALL 10: POST /api/interest-calculation - Insolvenzvorhalt
   */
  it('Testfall 10: POST /api/interest-calculation - Insolvenzvorhalt', async () => {
    const response = await request(app)
      .post('/api/interest-calculation')
      .send({
        principal: 100000,
        annualRate: 6,
        subscriptionAmount: 100000,
        paidAmount: 60000,
        startDate: '2024-01-01',
        periods: 12,
        kestRate: 25,
        solzRate: 5.5,
        churchTaxRate: 0,
        defaultRate: 17,
        isCompanyLiability: false,
        enableInsolvencyHold: true,
        paymentFrequency: 'monthly',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data?.appliedDefaultInterest).toBe('0'); // KEINE Verzugszinsen
    expect(response.body.data?.businessRulesApplied).toContain('Insolvenzvorhalt aktiv: Zahlungen suspendiert, keine Verzugszinsen');
  });
});
