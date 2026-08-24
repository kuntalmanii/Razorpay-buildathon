/**
 * services/metricsService.ts — Business logic for recovery system metrics.
 */

import { getPool } from '../database/connection';
import { MetricsSummary, FailureCategory, ActionType, ExecutionStatus, WebhookProcessingStatus } from '../types/domain';

export class MetricsService {
  /**
   * Retrieves operational metrics across cases, actions, and webhook events.
   */
  public static async getMetrics(days = 30): Promise<MetricsSummary> {
    const pool = getPool();
    const intervalSql = `${Math.max(1, Math.min(days, 365))} days`;

    // 1. Cases by failure category
    const categoryQuery = `
      SELECT
        failure_category,
        COUNT(*)::int AS count
      FROM revenue_risk_cases
      WHERE detected_at >= NOW() - INTERVAL '${intervalSql}'
      GROUP BY failure_category;
    `;
    const categoryResult = await pool.query<{ failure_category: FailureCategory; count: number }>(categoryQuery);
    const casesByCategory: Record<string, number> = {};
    for (const row of categoryResult.rows) {
      casesByCategory[row.failure_category] = row.count;
    }

    // 2. Actions by action_type
    const actionTypeQuery = `
      SELECT
        action_type,
        COUNT(*)::int AS count
      FROM recovery_actions
      WHERE created_at >= NOW() - INTERVAL '${intervalSql}'
      GROUP BY action_type;
    `;
    const actionTypeResult = await pool.query<{ action_type: ActionType; count: number }>(actionTypeQuery);
    const actionsByType: Partial<Record<ActionType, number>> = {};
    for (const row of actionTypeResult.rows) {
      actionsByType[row.action_type] = row.count;
    }

    // 3. Actions by execution_status
    const execStatusQuery = `
      SELECT
        execution_status,
        COUNT(*)::int AS count
      FROM recovery_actions
      WHERE created_at >= NOW() - INTERVAL '${intervalSql}'
      GROUP BY execution_status;
    `;
    const execStatusResult = await pool.query<{ execution_status: ExecutionStatus; count: number }>(execStatusQuery);
    const actionsByStatus: Partial<Record<ExecutionStatus, number>> = {};
    for (const row of execStatusResult.rows) {
      actionsByStatus[row.execution_status] = row.count;
    }

    // 4. Webhook events by processing_status
    const webhookStatusQuery = `
      SELECT
        processing_status,
        COUNT(*)::int AS count
      FROM webhook_events
      WHERE received_at >= NOW() - INTERVAL '${intervalSql}'
      GROUP BY processing_status;
    `;
    const webhookResult = await pool.query<{ processing_status: WebhookProcessingStatus; count: number }>(
      webhookStatusQuery
    );
    const webhooksByStatus: Partial<Record<WebhookProcessingStatus, number>> = {};
    for (const row of webhookResult.rows) {
      webhooksByStatus[row.processing_status] = row.count;
    }

    return {
      cases_by_failure_category: casesByCategory as Record<FailureCategory, number>,
      actions_by_type: actionsByType,
      actions_by_execution_status: actionsByStatus,
      webhooks_by_status: webhooksByStatus,
      period_days: days,
    };
  }
}
