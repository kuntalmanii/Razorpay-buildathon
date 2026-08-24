/**
 * services/recovery/payment-link-recovery.ts
 *
 * Dedicated recovery action handler for creating and managing Razorpay Payment Links.
 */

import { paymentLinkService } from '../razorpay/payment-link.service';
import { RazorpayTimeoutError } from '../razorpay/razorpay.types';
import { withTransientRetry } from './recovery.types';
import { logger } from '../../utils/logger';

export interface CreateRecoveryLinkParams {
  caseId: string;
  amountPaise: number;
  currency?: string;
  customer?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  description?: string;
  expireInHours?: number;
}

export interface RecoveryLinkResult {
  paymentLinkId?: string;
  shortUrl?: string;
  amount: number;
  currency: string;
  status: string;
  expireBy?: number;
  verificationPending?: boolean;
}

export class PaymentLinkRecovery {
  /**
   * Issue a tailored Razorpay Payment Link for revenue recovery.
   */
  public static async issueRecoveryLink(
    params: CreateRecoveryLinkParams
  ): Promise<RecoveryLinkResult> {
    logger.info(`Issuing recovery Payment Link for case ${params.caseId}`, {
      amountPaise: params.amountPaise,
    });

    try {
      // Execute with bounded transient retry (max 2 attempts)
      const link = await withTransientRetry(
        async () => {
          return await paymentLinkService.createRecoveryPaymentLink(
            params.caseId,
            params.amountPaise,
            params.customer,
            {
              description: params.description || `Recovery payment for case ${params.caseId}`,
              expireInHours: params.expireInHours || 72,
            }
          );
        },
        { maxRetries: 2, initialDelayMs: 300 }
      );

      logger.info(`Recovery Payment Link issued: ${link.id}`, {
        shortUrl: link.short_url,
      });

      return {
        paymentLinkId: link.id,
        shortUrl: link.short_url,
        amount: link.amount,
        currency: link.currency,
        status: link.status,
        expireBy: link.expire_by,
        verificationPending: false,
      };
    } catch (err) {
      if (err instanceof RazorpayTimeoutError) {
        logger.warn(`Razorpay timed out creating Payment Link for case ${params.caseId} — marking verification pending`, {
          error: (err as Error).message,
        });

        return {
          amount: params.amountPaise,
          currency: params.currency || 'INR',
          status: 'verification_pending',
          verificationPending: true,
        };
      }

      throw err;
    }
  }

  /**
   * Cancel an outstanding recovery payment link.
   */
  public static async cancelRecoveryLink(linkId: string): Promise<boolean> {
    try {
      const result = await paymentLinkService.cancelPaymentLink(linkId);
      return result.status === 'cancelled';
    } catch (err) {
      logger.warn(`Failed to cancel payment link ${linkId}: ${(err as Error).message}`);
      return false;
    }
  }
}
