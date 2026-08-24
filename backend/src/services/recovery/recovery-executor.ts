/**
 * services/recovery/recovery-executor.ts
 *
 * Execution engine enforcing the rigorous 10-step Recovery Action Protocol:
 *  1. Check case state
 *  2. Check policy
 *  3. Check idempotency / existing actions
 *  4. Check payment status
 *  5. Check cooldown
 *  6. Execute approved action
 *  7. Record result
 *  8. Verify outcome
 *  9. Update case lifecycle state
 *  10. Write audit log
 */

import { getPool } from '../../database/connection';
import { ExecuteActionParams, ExecutionResult } from './recovery.types';
import { PolicyEngine } from '../../policies/policy-engine';
import { PaymentLinkRecovery } from './payment-link-recovery';
import { RetryRecovery } from './retry-recovery';
import { RecoveryVerifier } from './recovery-verifier';
import { RevenueRiskService } from '../risk/revenue-risk.service';
import { NotFoundError } from '../../utils/errors';
import { logger } from '../../utils/logger';

export class RecoveryExecutor {
  /**
   * Execute an approved recovery action enforcing all 10 safety checkpoints.
   */
  public static async executeAction(params: ExecuteActionParams): Promise<ExecutionResult> {
    const pool = getPool();
    const caseId = params.caseId;

    logger.info(`Initiating action execution for case ${caseId}`, {
      actionType: params.actionType,
      idempotencyKey: params.idempotencyKey,
    });

    // ─── Checkpoint 1 & 4: Check case state & payment status ──────────────────
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
      customer_name: string | null;
      customer_email: string | null;
      customer_contact: string | null;
    }>(`
      SELECT
        c.case_id, c.merchant_id, c.customer_id, c.payment_id, c.subscription_id,
        c.amount_at_risk, c.currency, c.failure_category, c.status,
        p.status AS payment_status,
        cust.name AS customer_name, cust.email AS customer_email, cust.phone AS customer_contact
      FROM revenue_risk_cases c
      LEFT JOIN payments p ON c.payment_id = p.payment_id
      LEFT JOIN customers cust ON c.customer_id = cust.customer_id
      WHERE c.case_id = $1;
    `, [caseId]);

    if (caseRes.rows.length === 0) {
      throw new NotFoundError(`Revenue risk case ${caseId}`);
    }

    const c = caseRes.rows[0];
    const amountPaise = parseInt(c.amount_at_risk, 10);

    // If payment already captured / case already recovered, stop immediately!
    if (c.payment_status === 'captured' || c.status === 'recovered') {
      logger.info(`Payment or case is already recovered. Stopping recovery action dispatch.`);
      return {
        success: true,
        actionId: 'none',
        caseId,
        actionType: params.actionType,
        executionStatus: 'skipped',
        policyStatus: 'rejected',
        idempotencyKey: params.idempotencyKey,
        details: { reason: 'Payment is already in captured/recovered state' },
      };
    }

    // ─── Checkpoint 3: Idempotency check ──────────────────────────────────────
    const existingActionRes = await pool.query<{
      action_id: string;
      execution_status: string;
      result: Record<string, unknown>;
    }>(`
      SELECT action_id, execution_status, result
      FROM recovery_actions
      WHERE idempotency_key = $1;
    `, [params.idempotencyKey]);

    if (existingActionRes.rows.length > 0) {
      const existing = existingActionRes.rows[0];
      logger.info(`Duplicate recovery action execution caught by idempotency key: ${params.idempotencyKey}`);
      return {
        success: true,
        actionId: existing.action_id,
        caseId,
        actionType: params.actionType,
        executionStatus: 'skipped',
        policyStatus: 'approved',
        idempotencyKey: params.idempotencyKey,
        details: { message: 'Action already processed previously', priorResult: existing.result },
      };
    }

    // ─── Checkpoint 2 & 5: Check Policy & Cooldown ───────────────────────────
    const policyResult = await PolicyEngine.evaluateAndAudit(caseId, {
      actionType: params.actionType,
      decision: params.customPayload?.decision as string || 'PAYMENT_LINK',
      requiresHumanApproval: params.bypassHumanApprovalForTesting ? false : undefined,
    });

    if (!policyResult.allowed) {
      logger.warn(`Action ${params.actionType} blocked by Policy Engine for case ${caseId}`, {
        violations: policyResult.violations,
        reason: policyResult.reason,
      });

      // Record rejected action
      const insertReject = await pool.query<{ action_id: string }>(`
        INSERT INTO recovery_actions (
          case_id, action_type, proposed_by, policy_status, execution_status,
          idempotency_key, failure_reason, payload
        ) VALUES ($1, $2, $3, 'rejected', 'skipped', $4, $5, $6)
        RETURNING action_id;
      `, [
        caseId,
        params.actionType,
        params.proposedBy,
        params.idempotencyKey,
        policyResult.reason,
        JSON.stringify(params.customPayload || {}),
      ]);

      return {
        success: false,
        actionId: insertReject.rows[0].action_id,
        caseId,
        actionType: params.actionType,
        executionStatus: 'skipped',
        policyStatus: 'rejected',
        idempotencyKey: params.idempotencyKey,
        details: { violations: policyResult.violations, reason: policyResult.reason },
        error: policyResult.reason,
      };
    }

    if (policyResult.requiredApproval && !params.bypassHumanApprovalForTesting) {
      // Action is valid under policy, but requires human approval before dispatch
      logger.info(`Action ${params.actionType} requires merchant human approval before execution.`);
      const insertPending = await pool.query<{ action_id: string }>(`
        INSERT INTO recovery_actions (
          case_id, action_type, proposed_by, policy_status, execution_status,
          idempotency_key, payload
        ) VALUES ($1, $2, $3, 'pending', 'scheduled', $4, $5)
        RETURNING action_id;
      `, [
        caseId,
        params.actionType,
        params.proposedBy,
        params.idempotencyKey,
        JSON.stringify(params.customPayload || {}),
      ]);

      return {
        success: true,
        actionId: insertPending.rows[0].action_id,
        caseId,
        actionType: params.actionType,
        executionStatus: 'scheduled',
        policyStatus: 'pending',
        idempotencyKey: params.idempotencyKey,
        details: { message: 'Action queued awaiting merchant approval', requiredApproval: true },
      };
    }

    // ─── Checkpoint 6 & 7: Execute Action & Record Result ─────────────────────
    let actionExecutionResult: Record<string, unknown> = {};
    let isVerificationPending = false;
    let executionStatus: 'completed' | 'scheduled' | 'failed' = 'completed';
    let failureReason: string | undefined;

    try {
      if (params.actionType === 'create_payment_link') {
        const linkRes = await PaymentLinkRecovery.issueRecoveryLink({
          caseId,
          amountPaise,
          currency: c.currency,
          customer: {
            name: c.customer_name || undefined,
            email: c.customer_email || undefined,
            contact: c.customer_contact || undefined,
          },
        });

        actionExecutionResult = { ...linkRes };
        isVerificationPending = Boolean(linkRes.verificationPending);
      } else if (params.actionType === 'retry_payment') {
        const retryRes = RetryRecovery.scheduleRetry({
          caseId,
          paymentId: c.payment_id,
          subscriptionId: c.subscription_id,
        });

        actionExecutionResult = { ...retryRes.details };
        executionStatus = 'scheduled';
      } else if (params.actionType === 'escalate_to_human') {
        actionExecutionResult = {
          escalatedTo: 'merchant_support',
          reason: params.customPayload?.reason || 'Escalated for human operator review',
        };
      } else if (params.actionType === 'cancel_subscription') {
        actionExecutionResult = {
          action: 'recovery_halted',
          reason: 'Customer opt-out or repeated failures',
        };
      } else {
        actionExecutionResult = { message: `Executed action type ${params.actionType}` };
      }
    } catch (err) {
      executionStatus = 'failed';
      failureReason = (err as Error).message;
      actionExecutionResult = { error: failureReason };
      logger.error(`Recovery action ${params.actionType} failed during execution`, { error: failureReason });
    }

    // Insert approved execution record into recovery_actions
    const insertActionRes = await pool.query<{ action_id: string }>(`
      INSERT INTO recovery_actions (
        case_id, action_type, proposed_by, policy_status, execution_status,
        idempotency_key, payload, result, failure_reason, scheduled_at, executed_at
      ) VALUES ($1, $2, $3, 'approved', $4, $5, $6, $7, $8, $9, $10)
      RETURNING action_id;
    `, [
      caseId,
      params.actionType,
      params.proposedBy,
      executionStatus,
      params.idempotencyKey,
      JSON.stringify(params.customPayload || {}),
      JSON.stringify(actionExecutionResult),
      failureReason || null,
      params.scheduledAt || new Date(),
      executionStatus === 'completed' ? new Date() : null,
    ]);

    const actionId = insertActionRes.rows[0].action_id;

    // ─── Checkpoint 8 & 9: Verify Outcome & Update Case ───────────────────────
    if (executionStatus === 'completed' && !isVerificationPending) {
      await RevenueRiskService.transitionCase(
        caseId,
        'ACTION_PENDING',
        'RECOVERING',
        `Recovery action ${params.actionType} executed (Action ID: ${actionId})`
      );

      // Verify if payment link was already fulfilled
      await RecoveryVerifier.verifyCase(caseId);
    }

    // ─── Checkpoint 10: Write Audit Log ───────────────────────────────────────
    await pool.query(`
      INSERT INTO audit_logs (
        entity_type, entity_id, action, actor_type, actor_id, after_state, metadata
      ) VALUES ('recovery_actions', $1, $2, 'system', 'recovery_executor', $3, $4);
    `, [
      actionId,
      `action_${executionStatus}`,
      JSON.stringify({ actionType: params.actionType, executionStatus }),
      JSON.stringify(actionExecutionResult),
    ]);

    return {
      success: executionStatus !== 'failed',
      actionId,
      caseId,
      actionType: params.actionType,
      executionStatus,
      policyStatus: 'approved',
      idempotencyKey: params.idempotencyKey,
      details: actionExecutionResult,
      verificationPending: isVerificationPending,
      error: failureReason,
    };
  }
}
