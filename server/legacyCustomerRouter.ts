import { router, protectedProcedure } from './_core/trpc';
import { TRPCError } from '@trpc/server';

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin' && ctx.user.role !== 'superadmin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});
import { z } from 'zod';
import {
  createLegacyCustomer,
  getLegacyCustomerByContractNumber,
  getLegacyCustomerById,
  getLegacyCustomerByUserId,
  getAllLegacyCustomers,
  searchLegacyCustomers,
  updateLegacyCustomer,
  deleteLegacyCustomer,
  addLegacyCustomerDocument,
  getLegacyCustomerDocuments,
  deleteLegacyCustomerDocument,
  createInterestCalculation,
  getLegacyCustomerInterestCalculations,
  addPaymentToHistory,
  getLegacyCustomerPaymentHistory,
  updatePaymentStatus,
  getLegacyCustomerStats,
  getPendingPaymentsForCustomer,
  getUpcomingPayments,
} from './legacy-db';
import { Decimal } from 'decimal.js';
import { ENV } from './_core/env';
import { computeKontokorrent, type KontoBooking, type KontoInput } from './legacy-claim';

// Normalisiert ein DB-Datum (Date oder 'YYYY-MM-DD'-String) TZ-robust auf UTC-Kalendertag-Mitternacht.
// Verhindert Off-by-one bei Tages-Arithmetik, egal in welcher Zeitzone der Prozess laeuft.
function toUtcCalendarMidnight(v: any): Date {
  if (typeof v === 'string') {
    const [y, m, d] = v.slice(0, 10).split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }
  const dt = new Date(v);
  return new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()));
}

// Naechste jaehrliche Zinsfaelligkeit = Ende des Zinsjahres = (naechster Jahrestag des
// Vertragsstichtags annualInterestDate nach heute) MINUS 1 Tag. DATENGETRIEBEN aus
// annualInterestDate (z.B. 01.06. -> Faelligkeit 31.05.); KEIN anleihe-spezifisches Hardcoding.
function nextZinsFaelligkeit(annualInterestDate: any, today: Date): Date {
  const stich = toUtcCalendarMidnight(annualInterestDate); // liefert Monat/Tag des Vertragsstichtags
  const m = stich.getUTCMonth();
  const dday = stich.getUTCDate();
  let anniv = new Date(Date.UTC(today.getUTCFullYear(), m, dday));
  if (anniv.getTime() <= today.getTime()) {
    anniv = new Date(Date.UTC(today.getUTCFullYear() + 1, m, dday));
  }
  anniv.setUTCDate(anniv.getUTCDate() - 1); // Ende des Zinsjahres = Tag vor dem Stichtag
  return anniv;
}

// Baut KontoInput aus DB-Rows (Kunde + payment_history) fuer das Kontokorrent-Forderungsmodul.
// Faelligkeit = Zeichnungsdatum (contractDate) + 14 Tage. null = nicht konfiguriert (kein Refi-Satz / Stammdaten fehlen).
// Alle Datumswerte auf UTC-Kalendertag normalisiert -> taggenaue, TZ-unabhaengige Berechnung.
function buildKontoInput(c: any, payments: any[], stichtag: Date): KontoInput | null {
  if (c.refinancingRate == null || c.contractDate == null || c.investmentAmount == null || c.annualInterestRate == null) {
    return null;
  }
  const faelligkeit = toUtcCalendarMidnight(c.contractDate);
  faelligkeit.setUTCDate(faelligkeit.getUTCDate() + 14);
  const bookings: KontoBooking[] = payments
    .filter((p: any) => (p.status ?? 'confirmed') === 'confirmed')
    .filter((p: any) => p.paymentType === 'initial_investment' || p.paymentType === 'interest_payment')
    .map((p: any) => ({
      date: toUtcCalendarMidnight(p.paymentDate),
      type: p.paymentType === 'initial_investment' ? ('einzahlung' as const) : ('zinsabschlag' as const),
      amount: Number(p.amount),
    }));
  return {
    investmentAmount: Number(c.investmentAmount),
    refinancingRate: Number(c.refinancingRate),
    couponRate: Number(c.annualInterestRate),
    faelligkeit,
    stichtag: toUtcCalendarMidnight(stichtag),
    bookings,
    zinsbasis: ((c as any).zinsbasis as 'act/365' | '30E/360' | null) ?? 'act/365',
  };
}

/**
 * Validation Schemas
 */
const createLegacyCustomerSchema = z.object({
  contractNumber: z.string().min(1, 'Vertragsnummer erforderlich'),
  firstName: z.string().min(1, 'Vorname erforderlich'),
  lastName: z.string().min(1, 'Nachname erforderlich'),
  email: z.string().email('Ungültige Email').optional(),
  phone: z.string().optional(),
  birthDate: z.date().optional(),
  street: z.string().optional(),
  houseNumber: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  iban: z.string().optional(),
  bic: z.string().optional(),
  accountHolder: z.string().optional(),
  bondId: z.number().optional(),
  bondNumber: z.string().optional(),
  contractDate: z.date().optional(),
  valueDate: z.date().optional(),
  investmentAmount: z.number().optional(),
  shareCount: z.number().optional(),
  shareValue: z.number().optional(),
  annualInterestRate: z.number().optional(),
  interestPaymentFrequency: z.enum(['monthly', 'quarterly', 'annual']).optional(),
  annualInterestDate: z.date().optional(),
  monthlyPaymentDay: z.number().optional(),
  maturityDate: z.date().optional(),
  termMonths: z.number().optional(),
  capitalGainsTax: z.number().optional(),
  solidaritySurcharge: z.number().optional(),
  churchTax: z.number().optional(),
  refinancingRate: z.number().optional(),
  riskClassification: z.string().optional(),
  zinsbasis: z.enum(['act/365', '30E/360']).optional(),
  kuendigungEingegangenAm: z.date().optional(),
  kuendigungStatus: z.enum(['eingereicht', 'zurueckgewiesen', 'wirksam']).optional(),
  naechsterKuendigungstermin: z.date().optional(),
  notes: z.string().optional(),
});

const updateLegacyCustomerSchema = z.object({
  id: z.number(),
  data: createLegacyCustomerSchema.partial(),
});

const documentUploadSchema = z.object({
  legacyCustomerId: z.number(),
  documentType: z.enum([
    'contract',
    'projection',
    'interest_calculation',
    'payment_confirmation',
    'tax_certificate',
    'bank_statement',
    'zeichnungsschein',
    'other',
  ]),
  fileName: z.string(),
  filePath: z.string(),
  fileSize: z.number().optional(),
  fileType: z.string().optional(),
  documentDate: z.date().optional(),
  description: z.string().optional(),
});

const interestCalculationSchema = z.object({
  legacyCustomerId: z.number(),
  calculationYear: z.number(),
  calculationMonth: z.number().optional(),
  periodStartDate: z.date(),
  periodEndDate: z.date(),
  annualInterest: z.number().optional(),
  monthlyInstallment: z.number().optional(),
  capitalGainsTaxAmount: z.number().optional(),
  solidaritySurchargeAmount: z.number().optional(),
  churchTaxAmount: z.number().optional(),
  totalTaxWithheld: z.number().optional(),
  netInterest: z.number().optional(),
  paymentDate: z.date(),
});

const paymentHistorySchema = z.object({
  legacyCustomerId: z.number(),
  interestCalculationId: z.number().optional(),
  paymentType: z.enum(['initial_investment', 'interest_payment', 'refund', 'adjustment']),
  paymentDate: z.date(),
  amount: z.number(),
  transactionReference: z.string().optional(),
  bankTransactionId: z.string().optional(),
  status: z.enum(['pending', 'confirmed', 'failed', 'cancelled']).optional(),
  notes: z.string().optional(),
});

/**
 * Legacy Customer Router
 */
export const legacyCustomerRouter = router({
  /**
   * Create a new legacy customer
   */
  create: adminProcedure.input(createLegacyCustomerSchema).mutation(async ({ input }) => {
    try {
      const result = await createLegacyCustomer(input);
      return {
        success: true,
        message: 'Bestandskunde erfolgreich erstellt',
        data: result,
      };
    } catch (error) {
      throw new Error(`Fehler beim Erstellen des Bestandskunden: ${error}`);
    }
  }),

  /**
   * Get legacy customer by contract number
   */
  getByContractNumber: adminProcedure
    .input(z.object({ contractNumber: z.string() }))
    .query(async ({ input }) => {
      try {
        const customer = await getLegacyCustomerByContractNumber(input.contractNumber);
        return customer;
      } catch (error) {
        throw new Error(`Fehler beim Abrufen des Bestandskunden: ${error}`);
      }
    }),

  /**
   * Get legacy customer by ID
   */
  getById: adminProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    try {
      const customer = await getLegacyCustomerById(input.id);
      return customer;
    } catch (error) {
      throw new Error(`Fehler beim Abrufen des Bestandskunden: ${error}`);
    }
  }),

  /**
   * Get all legacy customers with pagination
   */
  getAll: adminProcedure
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(50),
        status: z.enum(['pending', 'active', 'completed', 'cancelled']).optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const result = await getAllLegacyCustomers(input.page, input.limit, input.status);
        return result;
      } catch (error) {
        throw new Error(`Fehler beim Abrufen der Bestandskunden: ${error}`);
      }
    }),

  /**
   * Search legacy customers
   */
  search: adminProcedure
    .input(z.object({ query: z.string(), limit: z.number().default(20) }))
    .query(async ({ input }) => {
      try {
        const results = await searchLegacyCustomers(input.query, input.limit);
        return results;
      } catch (error) {
        throw new Error(`Fehler bei der Suche: ${error}`);
      }
    }),

  /**
   * Update legacy customer
   */
  update: adminProcedure.input(updateLegacyCustomerSchema).mutation(async ({ input }) => {
    try {
      const result = await updateLegacyCustomer(input.id, input.data);
      return {
        success: true,
        message: 'Bestandskunde erfolgreich aktualisiert',
        data: result,
      };
    } catch (error) {
      throw new Error(`Fehler beim Aktualisieren des Bestandskunden: ${error}`);
    }
  }),

  /**
   * Delete legacy customer
   */
  delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    try {
      const result = await deleteLegacyCustomer(input.id);
      return {
        success: true,
        message: 'Bestandskunde erfolgreich gelöscht',
        data: result,
      };
    } catch (error) {
      throw new Error(`Fehler beim Löschen des Bestandskunden: ${error}`);
    }
  }),

  // ==================== KI-EXTRAKTION (Admin) ====================
  // Liest einen Zeichnungsschein/Vertrag und mappt die Felder auf legacy_customers
  // (Vorausfuellung des Import-Formulars). Quelle umgezogen vom legacyContractsRouter (Etappe C).
  extractFromDocument: adminProcedure
    .input(z.object({
      base64: z.string().min(1),
      mediaType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
    }))
    .mutation(async ({ input }) => {
      if (!ENV.anthropicApiKey) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'ANTHROPIC_API_KEY nicht konfiguriert' });
      }

      const contentBlock = input.mediaType === 'application/pdf'
        ? { type: 'document', source: { type: 'base64', media_type: input.mediaType, data: input.base64 } }
        : { type: 'image', source: { type: 'base64', media_type: input.mediaType, data: input.base64 } };

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ENV.anthropicApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1500,
          messages: [{
            role: 'user',
            content: [
              contentBlock,
              {
                type: 'text',
                text: `Du extrahierst Stammdaten aus einem Anleihe-Zeichnungsschein/Vertrag eines Bestandskunden. Gib AUSSCHLIESSLICH ein JSON-Objekt mit exakt diesen Keys zurueck. Wenn ein Feld im Dokument nicht steht, setze null. Erfinde nichts.

WICHTIG zum Betrag: "investmentAmount" ist die GEZEICHNETE Gesamt-/Zeichnungssumme (z.B. Gesamtkaufbetrag = Anzahl Teilschuldverschreibungen x Nennwert) — NICHT bereits gezahlte Teilbetraege. Es muss gelten: shareCount x shareValue = investmentAmount.

Keys:
- contractNumber: Vertrags-/Zeichnungsnummer (string)
- firstName: Vorname des Anlegers (string)
- lastName: Nachname des Anlegers (string)
- birthDate: Geburtsdatum (YYYY-MM-DD)
- email: E-Mail (string)
- phone: Telefon (string)
- street: Strasse ohne Hausnummer (string)
- houseNumber: Hausnummer (string)
- postalCode: PLZ (string)
- city: Ort (string)
- iban: IBAN des Anlegers ohne Leerzeichen (string)
- bic: BIC des Anlegers (string)
- accountHolder: Kontoinhaber (string)
- bondNumber: Anleihe-/Serien-Bezeichnung, z.B. "LevV-10-2022" (string)
- investmentAmount: gezeichnete Gesamtsumme als Zahl-String, z.B. "100000.00"
- shareCount: Anzahl Teilschuldverschreibungen als Ganzzahl-String, z.B. "100"
- shareValue: Nennwert je Stueck als Zahl-String, z.B. "1000.00"
- annualInterestRate: Zinssatz p.a. in Prozent als Zahl-String, z.B. "15"
- interestPaymentFrequency: genau eines von "monthly" | "quarterly" | "annual" (jaehrlich nachschuessig = "annual")
- contractDate: Zeichnungsdatum / Unterschrift des Anlegers (YYYY-MM-DD)
- valueDate: Datum der Annahmeerklaerung der Emittentin (YYYY-MM-DD)
- maturityDate: Faelligkeit/Laufzeitende falls angegeben (YYYY-MM-DD)
- termMonths: Laufzeit in Monaten als Ganzzahl-String, z.B. "60"
- capitalGainsTax: Kapitalertragsteuer-Satz in Prozent als Zahl-String, z.B. "25.00"
- solidaritySurcharge: Solidaritaetszuschlag-Satz in Prozent als Zahl-String, sonst null
- churchTax: Kirchensteuer-Satz in Prozent als Zahl-String, sonst null

Antworte NUR mit dem JSON-Objekt, keine Erklaerungen, kein Markdown.`,
              },
            ],
          }],
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Anthropic API Fehler: ${err}` });
      }

      const result = await response.json() as { content: Array<{ type: string; text: string }> };
      const text = result.content.find(b => b.type === 'text')?.text ?? '{}';

      try {
        const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const e = JSON.parse(cleaned);
        return {
          contractNumber: e.contractNumber ?? null,
          firstName: e.firstName ?? null,
          lastName: e.lastName ?? null,
          birthDate: e.birthDate ?? null,
          email: e.email ?? null,
          phone: e.phone ?? null,
          street: e.street ?? null,
          houseNumber: e.houseNumber ?? null,
          postalCode: e.postalCode ?? null,
          city: e.city ?? null,
          iban: e.iban ?? null,
          bic: e.bic ?? null,
          accountHolder: e.accountHolder ?? null,
          bondNumber: e.bondNumber ?? null,
          investmentAmount: e.investmentAmount ?? null,
          shareCount: e.shareCount ?? null,
          shareValue: e.shareValue ?? null,
          annualInterestRate: e.annualInterestRate ?? null,
          interestPaymentFrequency: e.interestPaymentFrequency ?? null,
          contractDate: e.contractDate ?? null,
          valueDate: e.valueDate ?? null,
          maturityDate: e.maturityDate ?? null,
          termMonths: e.termMonths ?? null,
          capitalGainsTax: e.capitalGainsTax ?? null,
          solidaritySurcharge: e.solidaritySurcharge ?? null,
          churchTax: e.churchTax ?? null,
        };
      } catch {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'KI-Antwort konnte nicht geparst werden' });
      }
    }),

  // ==================== INVESTOR (Self-Service) ====================
  // Hartes Gating: Der eigene Datensatz wird IMMER über ctx.user.id aufgelöst,
  // NIE über eine Input-ID -> kein IDOR, ein Zeichner sieht ausschliesslich eigene Daten.

  /**
   * Eigener Bestandskunden-Datensatz des eingeloggten Zeichners (Whitelist, ohne interne Felder).
   */
  myRecord: protectedProcedure.query(async ({ ctx }) => {
    const c = await getLegacyCustomerByUserId(ctx.user.id);
    if (!c) return null;
    return {
      contractNumber: c.contractNumber,
      status: c.status,
      firstName: c.firstName,
      lastName: c.lastName,
      iban: c.iban,
      bondNumber: c.bondNumber,
      contractDate: c.contractDate,
      valueDate: c.valueDate,
      maturityDate: c.maturityDate,
      termMonths: c.termMonths,
      investmentAmount: c.investmentAmount,
      shareCount: c.shareCount,
      shareValue: c.shareValue,
      annualInterestRate: c.annualInterestRate,
      interestPaymentFrequency: c.interestPaymentFrequency,
      annualInterestDate: c.annualInterestDate,
      monthlyPaymentDay: c.monthlyPaymentDay,
      capitalGainsTax: c.capitalGainsTax,
      solidaritySurcharge: c.solidaritySurcharge,
      churchTax: c.churchTax,
      riskClassification: c.riskClassification,
    };
  }),

  /**
   * Zahlungshistorie des eigenen Datensatzes. legacyCustomerId aus userId abgeleitet.
   */
  myPaymentHistory: protectedProcedure.query(async ({ ctx }) => {
    const c = await getLegacyCustomerByUserId(ctx.user.id);
    if (!c) return [];
    return getLegacyCustomerPaymentHistory(c.id);
  }),

  /**
   * Zinsberechnungen inkl. KeSt-Aufschluesselung des eigenen Datensatzes. Gating wie myRecord.
   */
  myInterestCalculations: protectedProcedure.query(async ({ ctx }) => {
    const c = await getLegacyCustomerByUserId(ctx.user.id);
    if (!c) return [];
    return getLegacyCustomerInterestCalculations(c.id);
  }),

  /**
   * Kontokorrent-Forderung des EIGENEN Datensatzes. HART ueber ctx.user.id gegated
   * (Lookup via getLegacyCustomerByUserId, KEIN Input-ID) -> IDOR konstruktiv unmoeglich.
   * Ein Zeichner sieht ausschliesslich sein eigenes Kontokorrent.
   */
  myKontokorrent: protectedProcedure.query(async ({ ctx }) => {
    const c = await getLegacyCustomerByUserId(ctx.user.id);
    if (!c) return null;
    const payments = await getLegacyCustomerPaymentHistory(c.id);
    const ki = buildKontoInput(c, payments, new Date());
    if (!ki) return { konfiguriert: false as const };
    const r = computeKontokorrent(ki);
    return {
      konfiguriert: true as const,
      stichtag: ki.stichtag.toISOString().slice(0, 10),
      faelligkeit: ki.faelligkeit.toISOString().slice(0, 10),
      refinancingRate: Number(c.refinancingRate),
      couponRate: Number(c.annualInterestRate),
      ...r,
    };
  }),

  /**
   * Kontokorrent-Forderung eines Bestandskunden (Admin, by id + optionaler Stichtag).
   * adminProcedure (role-gated), explizite Input-ID -> nur fuer Admin-Verwaltung.
   */
  adminKontokorrent: adminProcedure
    .input(z.object({ id: z.number(), stichtag: z.date().optional() }))
    .query(async ({ input }) => {
      const c = await getLegacyCustomerById(input.id);
      if (!c) throw new TRPCError({ code: 'NOT_FOUND', message: 'Bestandskunde nicht gefunden' });
      const payments = await getLegacyCustomerPaymentHistory(c.id);
      const ki = buildKontoInput(c, payments, input.stichtag ?? new Date());
      if (!ki) return { konfiguriert: false as const };
      const r = computeKontokorrent(ki);
      return {
        konfiguriert: true as const,
        stichtag: ki.stichtag.toISOString().slice(0, 10),
        faelligkeit: ki.faelligkeit.toISOString().slice(0, 10),
        refinancingRate: Number(c.refinancingRate),
        couponRate: Number(c.annualInterestRate),
        ...r,
      };
    }),

  /**
   * Vollzahler-Sicht (no-id, HART ueber ctx.user.id). Greift datengetrieben NUR wenn die offene
   * Einlage = 0 ist (gezeichnet - Summe Einzahlungen). Bei offen > 0 -> null (Forderungskonto-Fall,
   * siehe myKontokorrent). Keine refinancingRate noetig. Liefert auch den Kuendigungsstatus (Anzeige).
   */
  myVollzahlerKonto: protectedProcedure.query(async ({ ctx }) => {
    const c = await getLegacyCustomerByUserId(ctx.user.id);
    if (!c || c.investmentAmount == null) return null;
    const payments = await getLegacyCustomerPaymentHistory(c.id);
    const conf = payments.filter((p: any) => (p.status ?? 'confirmed') === 'confirmed');
    const sumOf = (t: string) => conf
      .filter((p: any) => p.paymentType === t)
      .reduce((s: Decimal, p: any) => s.plus(new Decimal(p.amount)), new Decimal(0));
    const gezeichnet = new Decimal(c.investmentAmount);
    const eingezahlt = sumOf('initial_investment');
    const offen = gezeichnet.minus(eingezahlt);
    if (offen.gt(new Decimal('0.005'))) return null; // offene Einlage > 0 -> Forderungskonto
    const bereitsErhalten = sumOf('interest_payment');

    // P4: voraussichtliche Faelligkeiten (IMMER unter Vorbehalt §2/§3 - Anzeige im Frontend).
    // Zins: naechste jaehrliche Faelligkeit (Stichtag annualInterestDate, generisch). Betrag =
    // Jahreszins = Nennbetrag x Satz (volle Periode = Jahreszins, Option A). Rueckzahlung:
    // fruehestens zum naechsten Kuendigungstermin, Nennbetrag. Nur wenn die Datenbasis gesetzt ist.
    const today = toUtcCalendarMidnight(new Date());
    const naechsteZinsfaelligkeit = (c.annualInterestDate != null && c.annualInterestRate != null)
      ? {
          datum: nextZinsFaelligkeit(c.annualInterestDate, today).toISOString().slice(0, 10),
          betrag: Number(gezeichnet.times(new Decimal(c.annualInterestRate)).dividedBy(100).toDecimalPlaces(2)),
        }
      : null;
    const rueckzahlung = (c as any).naechsterKuendigungstermin != null
      ? {
          datum: toUtcCalendarMidnight((c as any).naechsterKuendigungstermin).toISOString().slice(0, 10),
          betrag: Number(gezeichnet.toDecimalPlaces(2)),
        }
      : null;

    return {
      gezeichnet: Number(gezeichnet.toDecimalPlaces(2)),
      eingezahlt: Number(eingezahlt.toDecimalPlaces(2)),
      offen: 0,
      couponRate: c.annualInterestRate != null ? Number(c.annualInterestRate) : null,
      zinsbasis: ((c as any).zinsbasis as 'act/365' | '30E/360' | null) ?? 'act/365',
      bereitsErhalten: Number(bereitsErhalten.toDecimalPlaces(2)),
      naechsteZinsfaelligkeit,
      rueckzahlung,
      contractDate: c.contractDate ?? null,
      valueDate: c.valueDate ?? null,
      maturityDate: c.maturityDate ?? null,
      kuendigungEingegangenAm: (c as any).kuendigungEingegangenAm ?? null,
      kuendigungStatus: ((c as any).kuendigungStatus as string | null) ?? null,
      naechsterKuendigungstermin: (c as any).naechsterKuendigungstermin ?? null,
    };
  }),

  /**
   * Metadaten des EIGENEN Zeichnungsscheins (no-id, HART ueber ctx.user.id).
   * Liefert nur, OB ein Schein hinterlegt ist + Dateiname — die Datei selbst kommt
   * ueber GET /api/zeichnungsschein (ebenfalls no-id). Kein Input -> kein IDOR moeglich.
   */
  myZeichnungsschein: protectedProcedure.query(async ({ ctx }) => {
    const c = await getLegacyCustomerByUserId(ctx.user.id);
    if (!c) return null;
    const docs = await getLegacyCustomerDocuments(c.id);
    const schein = docs.find((d) => d.documentType === 'zeichnungsschein');
    if (!schein) return null;
    return { fileName: schein.fileName, uploadedAt: schein.uploadedAt };
  }),

  /**
   * Document Management
   */
  documents: router({
    /**
     * Add document
     */
    add: adminProcedure.input(documentUploadSchema).mutation(async ({ input }) => {
      try {
        const result = await addLegacyCustomerDocument(input);
        return {
          success: true,
          message: 'Dokument erfolgreich hochgeladen',
          data: result,
        };
      } catch (error) {
        throw new Error(`Fehler beim Hochladen des Dokuments: ${error}`);
      }
    }),

    /**
     * Get documents for customer
     */
    getByCustomerId: adminProcedure
      .input(z.object({ legacyCustomerId: z.number() }))
      .query(async ({ input }) => {
        try {
          const documents = await getLegacyCustomerDocuments(input.legacyCustomerId);
          return documents;
        } catch (error) {
          throw new Error(`Fehler beim Abrufen der Dokumente: ${error}`);
        }
      }),

    /**
     * Delete document
     */
    delete: adminProcedure.input(z.object({ documentId: z.number() })).mutation(async ({ input }) => {
      try {
        const result = await deleteLegacyCustomerDocument(input.documentId);
        return {
          success: true,
          message: 'Dokument erfolgreich gelöscht',
          data: result,
        };
      } catch (error) {
        throw new Error(`Fehler beim Löschen des Dokuments: ${error}`);
      }
    }),
  }),

  /**
   * Interest Calculations
   */
  interestCalculations: router({
    /**
     * Create interest calculation
     */
    create: adminProcedure.input(interestCalculationSchema).mutation(async ({ input }) => {
      try {
        const result = await createInterestCalculation(input);
        return {
          success: true,
          message: 'Zinsberechnung erfolgreich erstellt',
          data: result,
        };
      } catch (error) {
        throw new Error(`Fehler beim Erstellen der Zinsberechnung: ${error}`);
      }
    }),

    /**
     * Get interest calculations for customer
     */
    getByCustomerId: adminProcedure
      .input(z.object({ legacyCustomerId: z.number() }))
      .query(async ({ input }) => {
        try {
          const calculations = await getLegacyCustomerInterestCalculations(input.legacyCustomerId);
          return calculations;
        } catch (error) {
          throw new Error(`Fehler beim Abrufen der Zinsberechnungen: ${error}`);
        }
      }),
  }),

  /**
   * Payment History
   */
  paymentHistory: router({
    /**
     * Add payment
     */
    add: adminProcedure.input(paymentHistorySchema).mutation(async ({ input }) => {
      try {
        const result = await addPaymentToHistory(input);
        return {
          success: true,
          message: 'Zahlung erfolgreich erfasst',
          data: result,
        };
      } catch (error) {
        throw new Error(`Fehler beim Erfassen der Zahlung: ${error}`);
      }
    }),

    /**
     * Get payment history for customer
     */
    getByCustomerId: adminProcedure
      .input(z.object({ legacyCustomerId: z.number() }))
      .query(async ({ input }) => {
        try {
          const history = await getLegacyCustomerPaymentHistory(input.legacyCustomerId);
          return history;
        } catch (error) {
          throw new Error(`Fehler beim Abrufen der Zahlungshistorie: ${error}`);
        }
      }),

    /**
     * Update payment status
     */
    updateStatus: adminProcedure
      .input(
        z.object({
          paymentId: z.number(),
          status: z.enum(['pending', 'confirmed', 'failed', 'cancelled']),
        })
      )
      .mutation(async ({ input }) => {
        try {
          const result = await updatePaymentStatus(input.paymentId, input.status);
          return {
            success: true,
            message: 'Zahlungsstatus erfolgreich aktualisiert',
            data: result,
          };
        } catch (error) {
          throw new Error(`Fehler beim Aktualisieren des Zahlungsstatus: ${error}`);
        }
      }),
  }),

  /**
   * Statistics
   */
  statistics: router({
    /**
     * Get overall statistics
     */
    getOverall: adminProcedure.query(async () => {
      try {
        const stats = await getLegacyCustomerStats();
        return stats;
      } catch (error) {
        throw new Error(`Fehler beim Abrufen der Statistiken: ${error}`);
      }
    }),

    /**
     * Get pending payments for customer
     */
    getPendingPayments: adminProcedure
      .input(z.object({ legacyCustomerId: z.number() }))
      .query(async ({ input }) => {
        try {
          const payments = await getPendingPaymentsForCustomer(input.legacyCustomerId);
          return payments;
        } catch (error) {
          throw new Error(`Fehler beim Abrufen der ausstehenden Zahlungen: ${error}`);
        }
      }),

    /**
     * Get upcoming payments
     */
    getUpcoming: adminProcedure
      .input(z.object({ legacyCustomerId: z.number(), daysAhead: z.number().default(30) }))
      .query(async ({ input }) => {
        try {
          const payments = await getUpcomingPayments(input.legacyCustomerId, input.daysAhead);
          return payments;
        } catch (error) {
          throw new Error(`Fehler beim Abrufen der bevorstehenden Zahlungen: ${error}`);
        }
      }),
  }),
});
