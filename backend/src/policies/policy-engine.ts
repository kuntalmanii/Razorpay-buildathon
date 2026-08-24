/**
 * policies/policy-engine.ts
 *
 * Core Policy Engine orchestrating deterministic safety evaluation,
 * database context retrieval, and immutable audit logging.
 */

import { getPool } from '../database/connection';
import {
  PolicyEvaluationContext,
  PolicyResult,
  ProposedActionContext,
  MerchantPolicyConstraints,
  ExistingActionSummary,
} from './policy.types';
import { PolicyValidator } from './policy-validator';
import { NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';

export class PolicyEngine {
  /**
   * Pure deterministic evaluation of policy context.
   */
  public static evaluate(ctx: PolicyEvaluationContext): PolicyResult {
    return PolicyValidator.evaluate(ctx);
  }

  /**
   * Evaluate a proposed recovery action for a case against active database policies and record audit logs.
   */
  public static async evaluateAndAudit(
    caseId: string,
    proposedAction: ProposedActionContext
  ): Promise<PolicyResult> {
    const pool = getPool();

    // 1. Fetch risk case, payment, and customer details
    const caseRes = await pool.query<{
      case_id: string;
      merchant_id: string;
      customer_id: string | null;
      payment_id: string | null;
      subscription_id: string | null;
      amount_at_risk: string;
      currency: string;
      failure_category: string;
      status: string;
      payment_status: string | null;
    }>(`
      SELECT
        c.case_id, c.merchant_id, c.customer_id, c.payment_id, c.subscription_id,
        c.amount_at_risk, c.currency, c.failure_category, c.status,
        p.status AS payment_status
      FROM revenue_risk_cases c
      LEFT JOIN payments p ON c.payment_id = p.payment_id
      WHERE c.case_id = $1;
    `, [caseId]);

    if (caseRes.rows.length === 0) {
      throw new NotFoundError(`Revenue risk case ${caseId}`);
    }

    const c = caseRes.rows[0];
    const amountPaise = parseInt(c.amount_at_risk, 10);

    // 2. Fetch existing recovery actions for this case
    const actionsRes = await pool.query<{
      action_type: string;
      execution_status: string;
      created_at: Date;
    }>(`
      SELECT action_type, execution_status, created_at
      FROM recovery_actions
      WHERE case_id = $1
      ORDER BY created_at DESC;
    `, [caseId]);

    const existingActions: ExistingActionSummary[] = actionsRes.rows.map((r) => ({
      actionType: r.action_type,
      executionStatus: r.execution_status,
      createdAt: r.created_at,
    }));

    const totalRecoveryAttempts = existingActions.length;
    const lastRecoveryAttemptAt = existingActions.length > 0 ? existingActions[0].createdAt : null;

    // 3. Fetch custom merchant constraints from `policy_rules` table
    const rulesRes = await pool.query<{
      constraints: {
        max_retries?: number;
        cooldown_hours?: number;
        high_value_threshold_paise?: number;
      };
    }>(`
      SELECT constraints
      FROM policy_rules
      WHERE is_active = TRUE
        AND (merchant_id = $1 OR merchant_id IS NULL)
      ORDER BY priority DESC, created_at DESC
      LIMIT 1;
    `, [c.merchant_id]);

    let customMerchantConstraints: MerchantPolicyConstraints | undefined;
    if (rulesRes.rows.length > 0 && rulesRes.rows[0].constraints) {
      const constraints = rulesRes.rows[0].constraints;
      customMerchantConstraints = {
        maxRecoveryAttempts: constraints.max_retries,
        retryCooldownHours: constraints.cooldown_hours,
        highValueThresholdPaise: constraints.high_value_threshold_paise,
      };
    }

    // 4. Assemble evaluation context
    const context: PolicyEvaluationContext = {
      caseId: c.case_id,
      merchantId: c.merchant_id,
      customerId: c.customer_id,
      paymentId: c.payment_id,
      subscriptionId: c.subscription_id,
      amountPaise,
      currency: c.currency,
      failureCategory: c.failure_category,
      caseStatus: c.status,
      paymentStatus: c.payment_status,
      customerOptedOut: false,
      totalRecoveryAttempts,
      lastRecoveryAttemptAt,
      existingActions,
      proposedAction,
      customMerchantConstraints,
    };

    // 5. Evaluate deterministic safety rules
    const result = this.evaluate(context);

    // 6. Record policy audit log
    const auditAction = result.allowed ? 'policy_evaluation_approved' : 'policy_evaluation_blocked';
    await pool.query(`
      INSERT INTO audit_logs (
        entity_type,
        entity_id,
        action,
        actor_type,
        actor_id,
        after_state,
        metadata
      ) VALUES ('revenue_risk_cases', $1, $2, 'system', 'policy_engine', $3, $4);
    `, [
      caseId,
      auditAction,
      JSON.stringify({
        allowed: result.allowed,
        proposedAction: proposedAction.actionType,
        requiredApproval: result.requiredApproval,
      }),
      JSON.stringify({
        reason: result.reason,
        violations: result.violations,
      }),
    ]);

    logger.info(`Policy evaluation for case ${caseId}: ${result.allowed ? 'ALLOWED' : 'BLOCKED'}`, {
      allowed: result.allowed,
      requiredApproval: result.requiredApproval,
      violations: result.violations,
      reason: result.reason,
    });

    return result;
  }
}
