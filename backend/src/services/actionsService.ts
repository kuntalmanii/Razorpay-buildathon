/**
 * services/actionsService.ts — Business logic for recovery actions.
 */

import { getPool } from '../database/connection';
import { RecoveryAction } from '../types/domain';
import { ActionsFilter } from '../validators/cases';
import { ParsedPagination } from '../validators/pagination';

export class ActionsService {
  /**
   * List recovery actions with filtering and pagination.
   */
  public static async listActions(
    filter: ActionsFilter,
    pagination: ParsedPagination
  ): Promise<{ actions: RecoveryAction[]; total: number }> {
    const pool = getPool();
    const whereClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (filter.execution_status) {
      whereClauses.push(`execution_status = $${paramIndex++}`);
      values.push(filter.execution_status);
    }

    if (filter.case_id) {
      whereClauses.push(`case_id = $${paramIndex++}`);
      values.push(filter.case_id);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM recovery_actions
      ${whereSql};
    `;
    const countResult = await pool.query<{ total: number }>(countQuery, values);
    const total = countResult.rows[0]?.total ?? 0;

    const itemsQuery = `
      SELECT
        action_id,
        case_id,
        action_type,
        proposed_by,
        policy_status,
        execution_status,
        idempotency_key,
        payload,
        result,
        failure_reason,
        scheduled_at,
        executed_at,
        created_at,
        updated_at
      FROM recovery_actions
      ${whereSql}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++};
    `;

    const itemsResult = await pool.query<RecoveryAction>(itemsQuery, [
      ...values,
      pagination.limit,
      pagination.offset,
    ]);

    return {
      actions: itemsResult.rows,
      total,
    };
  }
}
