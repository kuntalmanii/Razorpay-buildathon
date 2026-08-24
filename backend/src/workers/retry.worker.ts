/**
 * workers/retry.worker.ts
 *
 * Background worker executing scheduled payment retries whose cooldown timers have elapsed.
 */

import { getPool } from '../database/connection';
import { RetryRecovery } from '../services/recovery/retry-recovery';
import { logger } from '../utils/logger';

export class RetryWorker {
  /**
   * Process retries whose scheduled_at timestamp has arrived.
   */
  public async processScheduledRetries(limit = 10): Promise<number> {
    const pool = getPool();

    const retriesRes = await pool.query<{
      action_id: string;
      case_id: string;
      idempotency_key: string;
      payment_id: string | null;
      razorpay_payment_id: string | null;
    }>(`
      SELECT
        a.action_id, a.case_id, a.idempotency_key,
        c.payment_id, p.razorpay_payment_id
      FROM recovery_actions a
      JOIN revenue_risk_cases c ON a.case_id = c.case_id
      LEFT JOIN payments p ON c.payment_id = p.payment_id
      WHERE a.action_type = 'retry_payment'
        AND a.execution_status = 'scheduled'
        AND a.policy_status = 'approved'
        AND a.scheduled_at <= NOW()
      ORDER BY a.scheduled_at ASC
      LIMIT $1;
    `, [limit]);

    let count = 0;

    for (const job of retriesRes.rows) {
      try {
        const result = await RetryRecovery.executeScheduledRetry({
          caseId: job.case_id,
          razorpayPaymentId: job.razorpay_payment_id || undefined,
        });

        const newStatus = result.status === 'already_captured' ? 'completed' : 'completed';

        await pool.query(`
          UPDATE recovery_actions
          SET
            execution_status = $1,
            result = $2,
            executed_at = NOW(),
            updated_at = NOW()
          WHERE action_id = $3;
        `, [newStatus, JSON.stringify(result.details), job.action_id]);

        count++;
      } catch (err) {
        logger.error(`RetryWorker failed on action ${job.action_id}`, {
          error: (err as Error).message,
        });
      }
    }

    return count;
  }
}

export const retryWorker = new RetryWorker();
