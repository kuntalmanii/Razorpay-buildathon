/**
 * workers/recovery.worker.ts
 *
 * Background worker polling and processing pending recovery action dispatches.
 * Crash-resilient & strictly idempotent.
 */

import { getPool } from '../database/connection';
import { RecoveryExecutor } from '../services/recovery/recovery-executor';
import { ActionType, ProposedByType } from '../types/domain';
import { logger } from '../utils/logger';

export class RecoveryWorker {
  private isRunning = false;

  /**
   * Process a single batch of scheduled recovery actions.
   */
  public async processBatch(limit = 10): Promise<number> {
    const pool = getPool();

    const pendingRes = await pool.query<{
      action_id: string;
      case_id: string;
      action_type: ActionType;
      proposed_by: ProposedByType;
      idempotency_key: string;
      payload: Record<string, unknown> | null;
    }>(`
      SELECT
        action_id, case_id, action_type, proposed_by, idempotency_key, payload
      FROM recovery_actions
      WHERE execution_status = 'scheduled'
        AND policy_status = 'approved'
        AND (scheduled_at IS NULL OR scheduled_at <= NOW())
      ORDER BY created_at ASC
      LIMIT $1;
    `, [limit]);

    let processedCount = 0;

    for (const job of pendingRes.rows) {
      try {
        await RecoveryExecutor.executeAction({
          caseId: job.case_id,
          actionType: job.action_type,
          proposedBy: job.proposed_by,
          idempotencyKey: job.idempotency_key,
          customPayload: job.payload || undefined,
        });
        processedCount++;
      } catch (err) {
        logger.error(`RecoveryWorker failed processing action ${job.action_id}`, {
          error: (err as Error).message,
        });
      }
    }

    return processedCount;
  }
}

export const recoveryWorker = new RecoveryWorker();
