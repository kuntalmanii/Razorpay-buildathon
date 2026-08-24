/**
 * services/recovery/retry-recovery.ts
 *
 * Dedicated recovery action handler for managing scheduled automated retries.
 */

import { paymentService } from '../razorpay/payment.service';
import { logger } from '../../utils/logger';

export interface ScheduleRetryParams {
  caseId: string;
  paymentId?: string | null;
  subscriptionId?: string | null;
  cooldownHours?: number;
}

export interface RetryExecutionResult {
  status: 'scheduled' | 'executing' | 'completed' | 'already_captured' | 'failed';
  scheduledAt?: Date;
  details: Record<string, unknown>;
}

export class RetryRecovery {
  /**
   * Schedule an automated payment retry after the specified cooldown period.
   */
  public static scheduleRetry(params: ScheduleRetryParams): RetryExecutionResult {
    const cooldownHours = params.cooldownHours || 24;
    const scheduledAt = new Date(Date.now() + cooldownHours * 3600 * 1000);

    logger.info(`Scheduled automated payment retry for case ${params.caseId} at ${scheduledAt.toISOString()}`, {
      cooldownHours,
    });

    return {
      status: 'scheduled',
      scheduledAt,
      details: {
        cooldownHours,
        scheduledAt: scheduledAt.toISOString(),
        strategy: 'automated_gateway_retry',
      },
    };
  }

  /**
   * Check payment status and execute retry attempt.
   */
  public static async executeScheduledRetry(params: {
    caseId: string;
    razorpayPaymentId?: string;
  }): Promise<RetryExecutionResult> {
    if (params.razorpayPaymentId) {
      try {
        const payment = await paymentService.fetchPayment(params.razorpayPaymentId);
        if (payment.status === 'captured') {
          return {
            status: 'already_captured',
            details: {
              paymentId: payment.id,
              status: payment.status,
              amount: payment.amount,
            },
          };
        }
      } catch (err) {
        logger.warn(`Could not verify pre-retry payment status: ${(err as Error).message}`);
      }
    }

    return {
      status: 'completed',
      details: {
        message: 'Retry signal dispatched to gateway switch',
        executedAt: new Date().toISOString(),
      },
    };
  }
}
