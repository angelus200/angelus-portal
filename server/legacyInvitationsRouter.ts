/**
 * Legacy Customer Invitations Router
 * tRPC procedures for managing legacy customer invitations
 */

import { router, adminProcedure, publicProcedure } from './_core/trpc';
import { z } from 'zod';
import {
  createInvitation,
  getInvitationByToken,
  getInvitationById,
  listInvitationsByLegacyCustomer,
  listPendingInvitations,
  acceptInvitation,
  useInvitation,
  cancelInvitation,
  resendInvitation,
  getLegacyCustomerWithInvitation,
  isInvitationValid,
} from './legacy-invitations-db';
import { sendInvitationEmail } from './email/send-invitation';

const sendInvitationSchema = z.object({
  legacyCustomerId: z.number().int().positive(),
  email: z.string().email(),
});

const getInvitationSchema = z.object({
  token: z.string().min(1),
});

const acceptInvitationSchema = z.object({
  token: z.string().min(1),
});

const resendInvitationSchema = z.object({
  invitationId: z.number().int().positive(),
});

export const legacyInvitationsRouter = router({
  /**
   * Send invitation to a legacy customer (Admin only)
   */
  send: adminProcedure
    .input(sendInvitationSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const invitation = await createInvitation(
          input.legacyCustomerId,
          input.email,
          ctx.user.id
        );

        // Get customer data for email
        const customerData = await getLegacyCustomerWithInvitation(
          input.legacyCustomerId
        );

        if (!customerData?.customer) {
          throw new Error('Legacy customer not found');
        }

        // Send invitation email
        await sendInvitationEmail({
          email: input.email,
          firstName: customerData.customer.firstName,
          lastName: customerData.customer.lastName,
          invitationToken: invitation.token,
          expiresAt: invitation.expiresAt,
        });

        return {
          success: true,
          message: 'Invitation sent successfully',
          email: input.email,
        };
      } catch (error) {
        console.error('Error sending invitation:', error);
        throw new Error('Failed to send invitation');
      }
    }),

  /**
   * Get invitation details by token (Public - for registration page)
   */
  getByToken: publicProcedure
    .input(getInvitationSchema)
    .query(async ({ input }) => {
      const invitation = await getInvitationByToken(input.token);

      if (!invitation) {
        throw new Error('Invitation not found');
      }

      // Check if invitation is valid
      const isValid = await isInvitationValid(invitation.id);
      if (!isValid) {
        throw new Error('Invitation is invalid or expired');
      }

      // Get customer data
      const customerData = await getLegacyCustomerWithInvitation(invitation.id);

      return {
        invitation: {
          id: invitation.id,
          email: invitation.email,
          status: invitation.status,
          expiresAt: invitation.expiresAt,
        },
        customer: customerData?.customer
          ? {
              id: customerData.customer.id,
              firstName: customerData.customer.firstName,
              lastName: customerData.customer.lastName,
              email: customerData.customer.email,
              birthDate: customerData.customer.birthDate,
              street: customerData.customer.street,
              houseNumber: customerData.customer.houseNumber,
              postalCode: customerData.customer.postalCode,
              city: customerData.customer.city,
              country: customerData.customer.country,
              iban: customerData.customer.iban,
              bic: customerData.customer.bic,
              accountHolder: customerData.customer.accountHolder,
            }
          : null,
      };
    }),

  /**
   * Accept invitation (mark as accepted when user registers)
   */
  accept: publicProcedure
    .input(acceptInvitationSchema)
    .mutation(async ({ input }) => {
      const invitation = await getInvitationByToken(input.token);

      if (!invitation) {
        throw new Error('Invitation not found');
      }

      // Check if invitation is valid
      const isValid = await isInvitationValid(invitation.id);
      if (!isValid) {
        throw new Error('Invitation is invalid or expired');
      }

      // Mark as used
      await useInvitation(invitation.id);

      return {
        success: true,
        message: 'Invitation accepted',
      };
    }),

  /**
   * List all invitations for a legacy customer (Admin only)
   */
  listByCustomer: adminProcedure
    .input(z.object({ legacyCustomerId: z.number().int().positive() }))
    .query(async ({ input }) => {
      return await listInvitationsByLegacyCustomer(input.legacyCustomerId);
    }),

  /**
   * List all pending invitations (Admin only)
   */
  listPending: adminProcedure.query(async () => {
    return await listPendingInvitations();
  }),

  /**
   * Resend invitation (Admin only)
   */
  resend: adminProcedure
    .input(resendInvitationSchema)
    .mutation(async ({ input }) => {
      try {
        const invitation = await getInvitationById(input.invitationId);

        if (!invitation) {
          throw new Error('Invitation not found');
        }

        // Resend invitation
        await resendInvitation(input.invitationId);

        // Get customer data for email
        const customerData = await getLegacyCustomerWithInvitation(
          input.invitationId
        );

        if (!customerData?.customer) {
          throw new Error('Legacy customer not found');
        }

        // Send invitation email again
        await sendInvitationEmail({
          email: invitation.email,
          firstName: customerData.customer.firstName,
          lastName: customerData.customer.lastName,
          invitationToken: invitation.token,
          expiresAt: invitation.expiresAt,
        });

        return {
          success: true,
          message: 'Invitation resent successfully',
        };
      } catch (error) {
        console.error('Error resending invitation:', error);
        throw new Error('Failed to resend invitation');
      }
    }),

  /**
   * Cancel invitation (Admin only)
   */
  cancel: adminProcedure
    .input(z.object({ invitationId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const invitation = await getInvitationById(input.invitationId);

      if (!invitation) {
        throw new Error('Invitation not found');
      }

      await cancelInvitation(input.invitationId);

      return {
        success: true,
        message: 'Invitation cancelled',
      };
    }),
});
