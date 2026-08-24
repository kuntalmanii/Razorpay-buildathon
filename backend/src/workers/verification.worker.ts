/**
 * workers/verification.worker.ts
 *
 * Background worker periodically polling and verifying outstanding recovery cases.
 */

import { getPool } from '../database/connection';
import { RecoveryVerifier } from '../services/recovery/recovery-verifier';
import { logger } from '../utils/logger';

export class VerificationWorker {
  /**
   * Periodically check open/in_progress cases for successful payment resolution.
   */
  public async verifyPendingCases(limit = 15): Promise<number> {
    const pool = getPool();

    const casesRes = await pool.query<{ case_id: string }>(`
      SELECT case_id
      FROM revenue_risk_cases
      WHERE status IN ('open', 'in_progress')
      ORDER BY updated_at ASC
      LIMIT $1;
    `, [limit]);

    let resolvedCount = 0;

    for (const row of casesRes.rows) {
      try {
        const outcome = await RecoveryVerifier.verifyCase(row.case_id);
        if (outcome.isRecovered) {
          resolvedCount++;
        }
      } catch (err) {
        logger.warn(`VerificationWorker error verifying case ${row.case_id}: ${(err as Error).message}`);
      }
    }

    return resolvedCount;
  }
}

export const verificationWorker = new VerificationWorker();
