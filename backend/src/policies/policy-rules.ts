/**
 * policies/policy-rules.ts
 *
 * Pure deterministic rule functions implementing RecoverIQ's core safety guardrails.
 * NEVER uses an LLM to evaluate policy compliance.
 */

import {
  PolicyEvaluationContext,
  RuleEvaluationSummary,
} from './policy.types';

export class PolicyRules {
  public static readonly DEFAULT_MAX_ATTEMPTS = 2;
  public static readonly DEFAULT_COOLDOWN_HOURS = 24;
  public static readonly DEFAULT_HIGH_VALUE_THRESHOLD_PAISE = 1500000; // ₹15,000

  /**
   * Rule 1: Maximum recovery attempts per case (default 2).
   */
  public static checkMaxRecoveryAttempts(ctx: PolicyEvaluationContext): RuleEvaluationSummary {
    const maxAttempts = ctx.customMerchantConstraints?.maxRecoveryAttempts ?? this.DEFAULT_MAX_ATTEMPTS;
    const isPassiveAction = ctx.proposedAction.decision === 'ESCALATE' || ctx.proposedAction.decision === 'STOP';

    if (!isPassiveAction && ctx.totalRecoveryAttempts >= maxAttempts) {
      return {
        ruleName: 'MaxRecoveryAttempts',
        passed: false,
        details: `Case has already undergone ${ctx.totalRecoveryAttempts} recovery attempt(s) (maximum allowed: ${maxAttempts})`,
        violationCode: 'MAX_RECOVERY_ATTEMPTS_EXCEEDED',
      };
    }

    return { ruleName: 'MaxRecoveryAttempts', passed: true };
  }

  /**
   * Rule 2: Minimum retry cooldown (default 24 hours).
   */
  public static checkRetryCooldown(ctx: PolicyEvaluationContext): RuleEvaluationSummary {
    if (ctx.proposedAction.actionType !== 'retry_payment') {
      return { ruleName: 'RetryCooldown', passed: true };
    }

    if (!ctx.lastRecoveryAttemptAt) {
      return { ruleName: 'RetryCooldown', passed: true };
    }

    const cooldownHours = ctx.customMerchantConstraints?.retryCooldownHours ?? this.DEFAULT_COOLDOWN_HOURS;
    const hoursSinceLastAttempt = (Date.now() - new Date(ctx.lastRecoveryAttemptAt).getTime()) / (1000 * 60 * 60);

    if (hoursSinceLastAttempt < cooldownHours) {
      const remainingHours = (cooldownHours - hoursSinceLastAttempt).toFixed(1);
      return {
        ruleName: 'RetryCooldown',
        passed: false,
        details: `Retry cooldown active: ${remainingHours}h remaining before next retry is permitted (${cooldownHours}h cooldown)`,
        violationCode: 'RETRY_COOLDOWN_NOT_ELAPSED',
      };
    }

    return { ruleName: 'RetryCooldown', passed: true };
  }

  /**
   * Rule 3: No action after successful payment or recovery.
   */
  public static checkPaymentAlreadyRecovered(ctx: PolicyEvaluationContext): RuleEvaluationSummary {
    if (ctx.paymentStatus === 'captured' || ctx.caseStatus === 'recovered' || ctx.caseStatus === 'closed') {
      return {
        ruleName: 'PaymentAlreadyRecovered',
        passed: false,
        details: `Payment is already in terminal resolved state (payment: ${ctx.paymentStatus || 'unknown'}, case: ${ctx.caseStatus})`,
        violationCode: 'PAYMENT_ALREADY_RECOVERED',
      };
    }

    return { ruleName: 'PaymentAlreadyRecovered', passed: true };
  }

  /**
   * Rule 4: No action after customer opt-out.
   */
  public static checkCustomerOptOut(ctx: PolicyEvaluationContext): RuleEvaluationSummary {
    if (ctx.customerOptedOut) {
      return {
        ruleName: 'CustomerOptOut',
        passed: false,
        details: 'Customer has explicitly opted out or requested cancellation of communications',
        violationCode: 'CUSTOMER_OPTED_OUT',
      };
    }

    return { ruleName: 'CustomerOptOut', passed: true };
  }

  /**
   * Rule 5: No duplicate recovery action in progress.
   */
  public static checkDuplicateAction(ctx: PolicyEvaluationContext): RuleEvaluationSummary {
    if (!ctx.existingActions || ctx.existingActions.length === 0) {
      return { ruleName: 'NoDuplicateAction', passed: true };
    }

    const proposedType = ctx.proposedAction.actionType;
    const hasActiveAction = ctx.existingActions.some(
      (a) => a.actionType === proposedType && (a.executionStatus === 'scheduled' || a.executionStatus === 'executing')
    );

    if (hasActiveAction) {
      return {
        ruleName: 'NoDuplicateAction',
        passed: false,
        details: `An identical action (${proposedType}) is currently pending execution or in-progress`,
        violationCode: 'DUPLICATE_ACTION_IN_PROGRESS',
      };
    }

    return { ruleName: 'NoDuplicateAction', passed: true };
  }

  /**
   * Rule 6: High-value recovery requires human approval.
   */
  public static checkHighValueApproval(ctx: PolicyEvaluationContext): RuleEvaluationSummary {
    const threshold = ctx.customMerchantConstraints?.highValueThresholdPaise ?? this.DEFAULT_HIGH_VALUE_THRESHOLD_PAISE;

    if (ctx.amountPaise >= threshold) {
      const amountRupees = (ctx.amountPaise / 100).toLocaleString('en-IN');
      const thresholdRupees = (threshold / 100).toLocaleString('en-IN');
      return {
        ruleName: 'HighValueApproval',
        passed: true, // Passed, but flags approval required
        details: `High-value transaction (₹${amountRupees} >= ₹${thresholdRupees}) requires human merchant approval`,
        violationCode: 'HIGH_VALUE_REQUIRES_APPROVAL',
      };
    }

    return { ruleName: 'HighValueApproval', passed: true };
  }

  /**
   * Rule 7: Unknown failure categories should not trigger aggressive automation.
   */
  public static checkUnknownCategoryAutomation(ctx: PolicyEvaluationContext): RuleEvaluationSummary {
    const category = ctx.failureCategory.toLowerCase();
    const isUnknown = category === 'unknown' || category === 'payment_failure';

    if (isUnknown && ctx.proposedAction.actionType === 'retry_payment') {
      return {
        ruleName: 'UnknownCategoryRestriction',
        passed: false,
        details: 'Automated card retries are blocked for unclassified failure reasons without prior diagnostic verification',
        violationCode: 'UNKNOWN_CATEGORY_RESTRICTED',
      };
    }

    return { ruleName: 'UnknownCategoryRestriction', passed: true };
  }

  /**
   * Rule 8: Valid AI Decision and Action Type.
   */
  public static checkValidDecision(ctx: PolicyEvaluationContext): RuleEvaluationSummary {
    const validDecisions = ['RETRY', 'PAYMENT_LINK', 'WAIT', 'ESCALATE', 'STOP'];
    if (!validDecisions.includes(ctx.proposedAction.decision)) {
      return {
        ruleName: 'ValidAIDecision',
        passed: false,
        details: `Invalid or unrecognized AI decision: "${ctx.proposedAction.decision}"`,
        violationCode: 'INVALID_AI_DECISION',
      };
    }

    if (ctx.proposedAction.confidence !== undefined && (ctx.proposedAction.confidence < 0 || ctx.proposedAction.confidence > 1)) {
      return {
        ruleName: 'ValidAIDecision',
        passed: false,
        details: `Invalid AI confidence score: ${ctx.proposedAction.confidence} (must be between 0 and 1)`,
        violationCode: 'INVALID_AI_DECISION',
      };
    }

    return { ruleName: 'ValidAIDecision', passed: true };
  }

  /**
   * Rule 9: Mandatory References & Data Integrity.
   */
  public static checkMandatoryReferences(ctx: PolicyEvaluationContext): RuleEvaluationSummary {
    if (!ctx.paymentId && !ctx.subscriptionId) {
      return {
        ruleName: 'MandatoryReferences',
        passed: false,
        details: 'Case must be referenced to at least one valid payment or subscription ID',
        violationCode: 'MISSING_PAYMENT_OR_SUBSCRIPTION',
      };
    }

    if (!ctx.amountPaise || ctx.amountPaise <= 0) {
      return {
        ruleName: 'MandatoryReferences',
        passed: false,
        details: `Invalid transaction amount: ${ctx.amountPaise} (must be > 0)`,
        violationCode: 'POLICY_RULE_VIOLATION',
      };
    }

    return { ruleName: 'MandatoryReferences', passed: true };
  }
}
