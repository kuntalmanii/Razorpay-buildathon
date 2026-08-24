/**
 * services/risk/revenue-risk.service.ts
 *
 * Core Revenue Risk Engine orchestrating:
 *  - Deterministic failure classification
 *  - Explainable risk scoring (0-100) and recovery probability (0.00-1.00)
 *  - State machine transition validation
 *  - Idempotent case creation & audit trail logging
 */

import { getPool } from '../../database/connection';
import { FailureClassifier, RawFailureContext } from './failure-classifier';
import { RiskScoreService } from './risk-score.service';
import { RecoveryProbabilityService } from './recovery-probability.service';
import {
  RiskAssessmentContext,
  RiskAssessmentResult,
  CaseLifecycleState,
  assertValidStateTransition,
  mapLifecycleStateToDbStatus,
  mapDeterministicCategoryToDbCategory,
} from './risk.types';
import { NotFoundError } from '../../utils/errors';
import { logger } from '../../utils/logger';

export interface ProcessEventRiskParams {
  merchantId: string;
  customerId?: string | null;
  paymentId?: string | null;
  subscriptionId?: string | null;
  amountPaise: number;
  currency?: string;
  rawFailure: RawFailureContext;
  hoursSinceFailure?: number;
}

export class RevenueRiskService {
  /**
   * Deterministically evaluate risk score, recovery probability, and explanatory factors.
   */
  public static assessRisk(ctx: RiskAssessmentContext): RiskAssessmentResult {
    const { score: riskScore, factors } = RiskScoreService.calculateRiskScore(ctx);
    const recoveryProbability = RecoveryProbabilityService.calculateProbability(ctx);

    let recommendedUrgency: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    if (riskScore >= 75) {
      recommendedUrgency = 'critical';
    } else if (riskScore >= 55) {
      recommendedUrgency = 'high';
    } else if (riskScore < 35) {
      recommendedUrgency = 'low';
    }

    return {
      riskScore,
      riskScoreNormalized: Math.round((riskScore / 100) * 10000) / 10000,
      recoveryProbability,
      factors,
      failureCategory: ctx.failureCategory,
      recommendedUrgency,
    };
  }

  /**
   * Idempotently create or update a revenue risk case from payment/subscription failure signals.
   */
  public static async processFailureEvent(params: ProcessEventRiskParams): Promise<{
    caseId: string;
    isNewCase: boolean;
    assessment: RiskAssessmentResult;
  }> {
    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Classify failure category deterministically
      const failureCategory = FailureClassifier.classifyFailure(params.rawFailure);
      const dbFailureCategory = mapDeterministicCategoryToDbCategory(failureCategory);

      // 2. Fetch customer history metrics for explainable scoring
      let previousSuccessfulPayments = 0;
      let previousFailures = 0;

      if (params.customerId) {
        const historyRes = await client.query<{ status: string; count: number }>(`
          SELECT status, COUNT(*)::int AS count
          FROM payments
          WHERE customer_id = $1
          GROUP BY status;
        `, [params.customerId]);

        for (const row of historyRes.rows) {
          if (row.status === 'captured') {
            previousSuccessfulPayments += row.count;
          } else if (row.status === 'failed') {
            previousFailures += row.count;
          }
        }
      }

      // 3. Compute deterministic risk assessment
      const assessmentContext: RiskAssessmentContext = {
        amountPaise: params.amountPaise,
        currency: params.currency || 'INR',
        failureCategory,
        previousSuccessfulPayments,
        previousFailures,
        isSubscription: Boolean(params.subscriptionId),
        hoursSinceFailure: params.hoursSinceFailure ?? 0,
      };

      const assessment = this.assessRisk(assessmentContext);

      // 4. Idempotency Check: check if open case already exists for this payment or subscription
      let existingCaseQuery = '';
      const queryParams: unknown[] = [];

      if (params.paymentId) {
        existingCaseQuery = 'SELECT case_id, status FROM revenue_risk_cases WHERE payment_id = $1;';
        queryParams.push(params.paymentId);
      } else if (params.subscriptionId) {
        existingCaseQuery = `
          SELECT case_id, status
          FROM revenue_risk_cases
          WHERE subscription_id = $1 AND status IN ('open', 'in_progress');
        `;
        queryParams.push(params.subscriptionId);
      }

      let existingCase: { case_id: string; status: string } | null = null;
      if (existingCaseQuery) {
        const existingRes = await client.query<{ case_id: string; status: string }>(
          existingCaseQuery,
          queryParams
        );
        if (existingRes.rows.length > 0) {
          existingCase = existingRes.rows[0];
        }
      }

      // If already resolved (recovered or closed), do not reopen or duplicate
      if (existingCase && (existingCase.status === 'recovered' || existingCase.status === 'closed')) {
        await client.query('COMMIT');
        return {
          caseId: existingCase.case_id,
          isNewCase: false,
          assessment,
        };
      }

      let caseId: string;
      let isNewCase = false;

      if (existingCase) {
        // Update existing case
        caseId = existingCase.case_id;
        await client.query(`
          UPDATE revenue_risk_cases
          SET
            failure_category = $1,
            risk_score = $2,
            recovery_probability = $3,
            updated_at = NOW()
          WHERE case_id = $4;
        `, [
          dbFailureCategory,
          assessment.riskScoreNormalized,
          assessment.recoveryProbability,
          caseId,
        ]);
      } else {
        // Create new risk case in DETECTED status (DB: 'open')
        isNewCase = true;
        const insertSql = `
          INSERT INTO revenue_risk_cases (
            merchant_id,
            customer_id,
            payment_id,
            subscription_id,
            amount_at_risk,
            currency,
            failure_category,
            risk_score,
            recovery_probability,
            status,
            detected_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'open', NOW())
          RETURNING case_id;
        `;

        const insertRes = await client.query<{ case_id: string }>(insertSql, [
          params.merchantId,
          params.customerId || null,
          params.paymentId || null,
          params.subscriptionId || null,
          params.amountPaise,
          params.currency || 'INR',
          dbFailureCategory,
          assessment.riskScoreNormalized,
          assessment.recoveryProbability,
        ]);

        caseId = insertRes.rows[0].case_id;

        // Log audit event
        await client.query(`
          INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, actor_id, after_state, metadata)
          VALUES ('revenue_risk_cases', $1, 'case_detected', 'system', 'risk_engine', $2, $3);
        `, [
          caseId,
          JSON.stringify({ status: 'open', riskScore: assessment.riskScore, failureCategory }),
          JSON.stringify({ factors: assessment.factors }),
        ]);
      }

      await client.query('COMMIT');
      return { caseId, isNewCase, assessment };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Transition case state enforcing state machine rules.
   */
  public static async transitionCase(
    caseId: string,
    fromState: CaseLifecycleState,
    toState: CaseLifecycleState,
    reason?: string,
    actorId = 'system'
  ): Promise<void> {
    assertValidStateTransition(fromState, toState);

    const pool = getPool();
    const dbStatus = mapLifecycleStateToDbStatus(toState);
    const isResolved = toState === 'RECOVERED' || toState === 'CLOSED' || toState === 'FAILED';

    const updateSql = `
      UPDATE revenue_risk_cases
      SET
        status = $1,
        resolved_at = CASE WHEN $2 THEN NOW() ELSE resolved_at END,
        recovery_reason = COALESCE($3, recovery_reason),
        updated_at = NOW()
      WHERE case_id = $4
      RETURNING case_id;
    `;

    const res = await pool.query(updateSql, [dbStatus, isResolved, reason || null, caseId]);
    if (res.rows.length === 0) {
      throw new NotFoundError(`Revenue risk case ${caseId}`);
    }

    // Write audit log
    await pool.query(`
      INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, actor_id, before_state, after_state)
      VALUES ('revenue_risk_cases', $1, $2, 'system', $3, $4, $5);
    `, [
      caseId,
      `transition_${fromState.toLowerCase()}_to_${toState.toLowerCase()}`,
      actorId,
      JSON.stringify({ state: fromState }),
      JSON.stringify({ state: toState, reason }),
    ]);

    logger.info(`Risk case ${caseId} transitioned from ${fromState} to ${toState}`);
  }
}
