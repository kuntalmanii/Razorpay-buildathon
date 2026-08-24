/**
 * agents/recovery/decision-parser.ts
 *
 * Strict validation, domain safety enforcement, and deterministic fallbacks
 * for AI recovery decisions.
 */

import {
  RecoveryDecisionSchema,
  RecoveryDecision,
  AgentInputContext,
} from './schemas/decision.schema';
import { logger } from '../../utils/logger';

export interface ParseDecisionResult {
  isValid: boolean;
  decision: RecoveryDecision;
  validationError?: string;
  isFallback: boolean;
}

export class DecisionParser {
  /** Minimum confidence threshold required before requiring human review */
  public static readonly MIN_CONFIDENCE_THRESHOLD = 0.65;

  /**
   * Parse and strictly validate raw model output.
   */
  public static parseAndValidate(
    rawOutput: unknown,
    context: AgentInputContext
  ): ParseDecisionResult {
    let parsedJson = rawOutput;

    if (typeof rawOutput === 'string') {
      try {
        // Strip markdown fences if any were accidentally output
        const cleaned = rawOutput.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
        parsedJson = JSON.parse(cleaned);
      } catch (err) {
        logger.warn('AI output is not valid JSON, generating deterministic fallback', {
          error: (err as Error).message,
        });
        return {
          isValid: false,
          decision: this.createFallbackDecision(context, 'AI returned malformed JSON response'),
          validationError: 'Invalid JSON output from model',
          isFallback: true,
        };
      }
    }

    const validation = RecoveryDecisionSchema.safeParse(parsedJson);

    if (!validation.success) {
      const errorMsg = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
      logger.warn('AI output failed schema validation', { error: errorMsg });

      return {
        isValid: false,
        decision: this.createFallbackDecision(context, `Schema validation failed: ${errorMsg}`),
        validationError: errorMsg,
        isFallback: true,
      };
    }

    const decision = { ...validation.data };

    // ─── Post-Validation Domain Safety Checks ───────────────────────────────

    // 1. Low confidence guard
    if (decision.confidence < this.MIN_CONFIDENCE_THRESHOLD) {
      decision.requires_human_approval = true;
      decision.risk_flags = [...(decision.risk_flags || []), 'LOW_MODEL_CONFIDENCE'];
      decision.reasoning_summary = `[Low Confidence ${decision.confidence.toFixed(2)}] ${decision.reasoning_summary}`;
    }

    // 2. Retry limit guard: Prevent unlimited retries (> 3 attempts)
    if (decision.decision === 'RETRY' && context.previousRecoveryAttempts >= 3) {
      decision.decision = 'ESCALATE';
      decision.requires_human_approval = true;
      decision.risk_flags = [...(decision.risk_flags || []), 'MAX_RETRIES_EXCEEDED'];
      decision.reasoning_summary = 'Automated retry capped at 3 attempts. Escalating for manual review.';
    }

    // 3. Enterprise Value Guard: Transactions > ₹50,000 always require human confirmation
    if (context.amountPaise > 5000000 && !decision.requires_human_approval) {
      decision.requires_human_approval = true;
      decision.risk_flags = [...(decision.risk_flags || []), 'ENTERPRISE_HIGH_VALUE_TRANSACTION'];
    }

    return {
      isValid: true,
      decision,
      isFallback: false,
    };
  }

  /**
   * Deterministic, 100% safe fallback decision when AI is unavailable, times out, or fails validation.
   */
  public static createFallbackDecision(
    context: AgentInputContext,
    reason: string
  ): RecoveryDecision {
    const amountInRupees = Math.round(context.amountPaise / 100);

    // If transient network failure and fresh, safe default is RETRY
    if (context.failureCategory === 'NETWORK_FAILURE' && context.previousRecoveryAttempts === 0) {
      return {
        decision: 'RETRY',
        confidence: 0.70,
        reasoning_summary: `[Deterministic Fallback: ${reason}] Network timeout detected. Safe automated retry scheduled.`,
        evidence: [
          'Failure categorized as NETWORK_FAILURE',
          'First recovery attempt',
          `Fallback triggered due to: ${reason}`,
        ],
        customer_message: '',
        risk_flags: ['FALLBACK_RULE_APPLIED'],
        requires_human_approval: false,
      };
    }

    // Default safe fallback: ESCALATE or PAYMENT_LINK with human approval
    const isHighValue = context.amountPaise > 2000000;

    return {
      decision: isHighValue ? 'ESCALATE' : 'PAYMENT_LINK',
      confidence: 0.60,
      reasoning_summary: `[Deterministic Fallback: ${reason}] Safe recovery action recommended for ₹${amountInRupees.toLocaleString('en-IN')}.`,
      evidence: [
        `Transaction amount: ₹${amountInRupees.toLocaleString('en-IN')}`,
        `Failure category: ${context.failureCategory}`,
        `Fallback triggered due to: ${reason}`,
      ],
      customer_message: `Hi ${context.customer.name || 'there'}, please complete your payment of ₹${amountInRupees.toLocaleString('en-IN')} using our secure link.`,
      risk_flags: ['FALLBACK_RULE_APPLIED', 'REQUIRES_MERCHANT_VERIFICATION'],
      requires_human_approval: isHighValue || context.customer.previousFailures >= 2,
    };
  }
}
