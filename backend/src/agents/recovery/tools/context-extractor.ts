/**
 * agents/recovery/tools/context-extractor.ts
 *
 * Read-only context extractor querying database state to build an AgentInputContext.
 * STRICTLY READ-ONLY — Contains ZERO mutation or execution methods.
 */

import { getPool } from '../../../database/connection';
import { AgentInputContext } from '../schemas/decision.schema';
import { NotFoundError } from '../../../utils/errors';

export class CaseContextExtractor {
  /**
   * Fetch all relevant, sanitized context for an AI decision evaluation.
   */
  public static async extractContext(caseId: string): Promise<AgentInputContext> {
    const pool = getPool();

    // 1. Fetch risk case
    const caseRes = await pool.query<{
      case_id: string;
      merchant_id: string;
      customer_id: string | null;
      payment_id: string | null;
      subscription_id: string | null;
      amount_at_risk: string;
      currency: string;
      failure_category: string;
      risk_score: string;
      recovery_probability: string | null;
      detected_at: Date;
    }>(`
      SELECT
        case_id, merchant_id, customer_id, payment_id, subscription_id,
        amount_at_risk, currency, failure_category, risk_score, recovery_probability,
        detected_at
      FROM revenue_risk_cases
      WHERE case_id = $1;
    `, [caseId]);

    if (caseRes.rows.length === 0) {
      throw new NotFoundError(`Revenue risk case ${caseId}`);
    }

    const c = caseRes.rows[0];
    const amountPaise = parseInt(c.amount_at_risk, 10);
    const riskScore = Math.round(parseFloat(c.risk_score) * 100);
    const recoveryProbability = c.recovery_probability ? parseFloat(c.recovery_probability) : 0.5;
    const hoursSinceFailure = (Date.now() - new Date(c.detected_at).getTime()) / (1000 * 60 * 60);

    // 2. Fetch customer history
    let customerName = 'Customer';
    let totalSuccessful = 0;
    let totalFailed = 0;

    if (c.customer_id) {
      const custRes = await pool.query<{ name: string | null }>(`
        SELECT name FROM customers WHERE customer_id = $1;
      `, [c.customer_id]);

      if (custRes.rows.length > 0 && custRes.rows[0].name) {
        customerName = custRes.rows[0].name;
      }

      const paymentsRes = await pool.query<{ status: string; count: number }>(`
        SELECT status, COUNT(*)::int AS count
        FROM payments
        WHERE customer_id = $1
        GROUP BY status;
      `, [c.customer_id]);

      for (const row of paymentsRes.rows) {
        if (row.status === 'captured') totalSuccessful += row.count;
        if (row.status === 'failed') totalFailed += row.count;
      }
    }

    // 3. Fetch subscription details if applicable
    let subscriptionInfo: AgentInputContext['subscription'] = undefined;
    if (c.subscription_id) {
      const subRes = await pool.query<{
        subscription_id: string;
        status: string;
        paid_count: number;
      }>(`
        SELECT subscription_id, status, paid_count
        FROM subscriptions
        WHERE subscription_id = $1;
      `, [c.subscription_id]);

      if (subRes.rows.length > 0) {
        const sub = subRes.rows[0];
        subscriptionInfo = {
          subscriptionId: sub.subscription_id,
          status: sub.status,
          paidCount: sub.paid_count,
        };
      }
    }

    // 4. Fetch previous recovery attempts count
    const actionsRes = await pool.query<{ count: number }>(`
      SELECT COUNT(*)::int AS count
      FROM recovery_actions
      WHERE case_id = $1;
    `, [caseId]);
    const previousRecoveryAttempts = actionsRes.rows[0]?.count ?? 0;

    // 5. Fetch audit logs for risk factors
    const auditRes = await pool.query<{ metadata: { factors?: string[] } }>(`
      SELECT metadata
      FROM audit_logs
      WHERE entity_id = $1 AND action = 'case_detected'
      ORDER BY created_at DESC
      LIMIT 1;
    `, [caseId]);
    const riskFactors = auditRes.rows[0]?.metadata?.factors || [
      `Failure category: ${c.failure_category}`,
      `Risk score: ${riskScore}/100`,
    ];

    return {
      caseId: c.case_id,
      amountPaise,
      currency: c.currency,
      failureCategory: c.failure_category,
      riskScore,
      recoveryProbability,
      riskFactors,
      customer: {
        customerId: c.customer_id || undefined,
        name: customerName,
        totalHistoricalPayments: totalSuccessful,
        previousFailures: totalFailed,
        isReliableCustomer: totalSuccessful > 0 && totalFailed === 0,
      },
      subscription: subscriptionInfo,
      previousRecoveryAttempts,
      hoursSinceFailure: Math.max(0, hoursSinceFailure),
    };
  }
}
