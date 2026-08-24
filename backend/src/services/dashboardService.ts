/**
 * services/dashboardService.ts — Business logic for dashboard aggregates.
 */

import { getPool } from '../database/connection';
import { DashboardSummary } from '../types/domain';

export class DashboardService {
  /**
   * Retrieves high-level dashboard metrics for a merchant or system-wide.
   */
  public static async getSummary(merchantId?: string): Promise<DashboardSummary> {
    const pool = getPool();

    // Query case status counts
    const statusQuery = `
      SELECT
        status,
        COUNT(*)::int AS count
      FROM revenue_risk_cases
      ${merchantId ? 'WHERE merchant_id = $1' : ''}
      GROUP BY status;
    `;
    const statusParams = merchantId ? [merchantId] : [];
    const statusResult = await pool.query<{ status: string; count: number }>(statusQuery, statusParams);

    const counts: Record<string, number> = {
      open: 0,
      in_progress: 0,
      recovered: 0,
      unrecoverable: 0,
      closed: 0,
      escalated: 0,
    };

    let total = 0;
    for (const row of statusResult.rows) {
      if (counts[row.status] !== undefined) {
        counts[row.status] = row.count;
      }
      total += row.count;
    }

    // Query financial totals
    const financialQuery = `
      SELECT
        COALESCE(SUM(amount_at_risk), 0)::text AS total_at_risk,
        COALESCE(SUM(recovered_amount), 0)::text AS total_recovered
      FROM revenue_risk_cases
      ${merchantId ? 'WHERE merchant_id = $1' : ''};
    `;
    const financialResult = await pool.query<{ total_at_risk: string; total_recovered: string }>(
      financialQuery,
      statusParams
    );

    const totalAtRisk = BigInt(financialResult.rows[0]?.total_at_risk || '0');
    const totalRecovered = BigInt(financialResult.rows[0]?.total_recovered || '0');

    let recoveryRate = 0;
    if (totalAtRisk > 0n) {
      recoveryRate = Number((totalRecovered * 10000n) / totalAtRisk) / 100;
    }

    return {
      cases: {
        total,
        open: counts.open,
        in_progress: counts.in_progress,
        recovered: counts.recovered,
        unrecoverable: counts.unrecoverable,
        closed: counts.closed,
        escalated: counts.escalated,
      },
      revenue: {
        total_at_risk_paise: totalAtRisk.toString(),
        total_recovered_paise: totalRecovered.toString(),
        recovery_rate_pct: recoveryRate,
      },
    };
  }
}
