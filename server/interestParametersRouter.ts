import { router, protectedProcedure } from './_core/trpc';
import { z } from 'zod';
import {
  getActiveInterestParameters,
  getInterestParametersById,
  getAllInterestParameters,
  getEffectiveInterestParameters,
  createInterestParameters,
  updateInterestParameters,
  deleteInterestParameters,
  activateInterestParameters,
  createParameterVersion,
  getParameterHistory,
  validateInterestParameters,
} from './interest-db';

/**
 * Validation schemas
 */
const createInterestParametersSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().optional(),
  annualInterestRate: z.coerce.number().min(0).max(100),
  defaultInterestRate: z.coerce.number().min(0).max(100),
  latePaymentInterestRate: z.coerce.number().min(0).max(100).optional().default(0),
  capitalGainsTax: z.coerce.number().min(0).max(100),
  solidaritySurcharge: z.coerce.number().min(0).max(100),
  churchTax: z.coerce.number().min(0).max(100).optional().default(0),
  noDefaultInterestForCompany: z.boolean().optional().default(true),
  enableInsolvencyHold: z.boolean().optional().default(true),
  enableCompoundInterest: z.boolean().optional().default(false),
  roundInterestToCent: z.boolean().optional().default(true),
  daysPerYear: z.number().int().min(360).max(366).optional().default(365),
  minimumInterestAmount: z.coerce.number().min(0).optional().default(0.01),
  graceperiodDays: z.number().int().min(0).max(365).optional().default(0),
  defaultPaymentFrequency: z
    .enum(['monthly', 'quarterly', 'annual', 'thesaurierend'])
    .optional()
    .default('monthly'),
  monthlyPaymentDay: z.number().int().min(1).max(31).optional().default(15),
  annualPaymentDay: z.number().int().min(1).max(365).optional().default(365),
  isActive: z.boolean().optional().default(false),
  version: z.number().int().optional().default(1),
  effectiveFrom: z.date().optional(),
  effectiveUntil: z.date().optional(),
});

const updateInterestParametersSchema = createInterestParametersSchema.partial();

/**
 * Interest Parameters Router
 * Handles all interest parameter management operations
 */
export const interestParametersRouter = router({
  /**
   * Get the currently active interest parameters
   */
  getActive: protectedProcedure.query(async () => {
    try {
      const params = await getActiveInterestParameters();
      return {
        success: true,
        data: params,
      };
    } catch (error) {
      throw new Error(`Fehler beim Abrufen der aktiven Zinsparameter: ${error}`);
    }
  }),

  /**
   * Get interest parameters by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      try {
        const params = await getInterestParametersById(input.id);
        return {
          success: true,
          data: params,
        };
      } catch (error) {
        throw new Error(`Fehler beim Abrufen der Zinsparameter: ${error}`);
      }
    }),

  /**
   * Get all interest parameter sets
   */
  getAll: protectedProcedure.query(async () => {
    try {
      const params = await getAllInterestParameters();
      return {
        success: true,
        data: params,
      };
    } catch (error) {
      throw new Error(`Fehler beim Abrufen aller Zinsparameter: ${error}`);
    }
  }),

  /**
   * Get effective interest parameters for a specific date
   */
  getEffective: protectedProcedure
    .input(z.object({ date: z.date() }))
    .query(async ({ input }) => {
      try {
        const params = await getEffectiveInterestParameters(input.date);
        return {
          success: true,
          data: params,
        };
      } catch (error) {
        throw new Error(`Fehler beim Abrufen der gültigen Zinsparameter: ${error}`);
      }
    }),

  /**
   * Create new interest parameters
   */
  create: protectedProcedure
    .input(createInterestParametersSchema)
    .mutation(async ({ input }) => {
      try {
        // Validate input
        const validation = validateInterestParameters(input);
        if (!validation.valid) {
          throw new Error(`Validierungsfehler: ${validation.errors.join(', ')}`);
        }

        const result = await createInterestParameters(input);
        return {
          success: true,
          message: 'Zinsparameter erfolgreich erstellt',
          data: result,
        };
      } catch (error) {
        throw new Error(`Fehler beim Erstellen der Zinsparameter: ${error}`);
      }
    }),

  /**
   * Update interest parameters
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        data: updateInterestParametersSchema,
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Validate input
        const validation = validateInterestParameters(input.data);
        if (!validation.valid) {
          throw new Error(`Validierungsfehler: ${validation.errors.join(', ')}`);
        }

        await updateInterestParameters(input.id, input.data);
        const updated = await getInterestParametersById(input.id);

        return {
          success: true,
          message: 'Zinsparameter erfolgreich aktualisiert',
          data: updated,
        };
      } catch (error) {
        throw new Error(`Fehler beim Aktualisieren der Zinsparameter: ${error}`);
      }
    }),

  /**
   * Delete interest parameters
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      try {
        await deleteInterestParameters(input.id);
        return {
          success: true,
          message: 'Zinsparameter erfolgreich gelöscht',
        };
      } catch (error) {
        throw new Error(`Fehler beim Löschen der Zinsparameter: ${error}`);
      }
    }),

  /**
   * Activate a specific parameter set
   */
  activate: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      try {
        await activateInterestParameters(input.id);
        const activated = await getInterestParametersById(input.id);

        return {
          success: true,
          message: 'Zinsparameter erfolgreich aktiviert',
          data: activated,
        };
      } catch (error) {
        throw new Error(`Fehler beim Aktivieren der Zinsparameter: ${error}`);
      }
    }),

  /**
   * Create a new version of interest parameters
   */
  createVersion: protectedProcedure
    .input(
      z.object({
        baseId: z.number(),
        name: z.string().min(3),
        effectiveFrom: z.date(),
        effectiveUntil: z.date().optional(),
        changes: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await createParameterVersion(input.baseId, {
          name: input.name,
          effectiveFrom: input.effectiveFrom,
          effectiveUntil: input.effectiveUntil,
          ...input.changes,
        });

        return {
          success: true,
          message: 'Neue Zinsparameter-Version erstellt',
          data: result,
        };
      } catch (error) {
        throw new Error(`Fehler beim Erstellen der neuen Version: ${error}`);
      }
    }),

  /**
   * Get parameter history
   */
  getHistory: protectedProcedure
    .input(z.object({ limit: z.number().optional().default(10) }))
    .query(async ({ input }) => {
      try {
        const history = await getParameterHistory(input.limit);
        return {
          success: true,
          data: history,
        };
      } catch (error) {
        throw new Error(`Fehler beim Abrufen der Versionshistorie: ${error}`);
      }
    }),

  /**
   * Validate interest parameters
   */
  validate: protectedProcedure
    .input(z.record(z.any()))
    .mutation(async ({ input }) => {
      try {
        const validation = validateInterestParameters(input);
        return {
          success: validation.valid,
          errors: validation.errors,
        };
      } catch (error) {
        throw new Error(`Fehler bei der Validierung: ${error}`);
      }
    }),
});
