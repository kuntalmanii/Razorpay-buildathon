/**
 * policies/policy-validator.ts
 *
 * Deterministic policy validator aggregating all safety rules and building a PolicyResult.
 */

import { PolicyEvaluationContext, PolicyResult, PolicyViolationCode, RuleEvaluationSummary } from './policy.types';
import { PolicyRules } from './policy-rules';

export class PolicyValidator {
  /**
   * Deterministically evaluate all policy rules against the given context.
   */
  public static evaluate(ctx: PolicyEvaluationContext): PolicyResult {
    const evaluations: RuleEvaluationSummary[] = [
      PolicyRules.checkMandatoryReferences(ctx),
      PolicyRules.checkValidDecision(ctx),
      PolicyRules.checkPaymentAlreadyRecovered(ctx),
      PolicyRules.checkCustomerOptOut(ctx),
      PolicyRules.checkMaxRecoveryAttempts(ctx),
      PolicyRules.checkRetryCooldown(ctx),
      PolicyRules.checkDuplicateAction(ctx),
      PolicyRules.checkUnknownCategoryAutomation(ctx),
      PolicyRules.checkHighValueApproval(ctx),
    ];

    const violations: PolicyViolationCode[] = [];
    let requiredApproval = Boolean(ctx.proposedAction.requiresHumanApproval);

    for (const ev of evaluations) {
      if (!ev.passed && ev.violationCode) {
        violations.push(ev.violationCode);
      }
      if (ev.violationCode === 'HIGH_VALUE_REQUIRES_APPROVAL') {
        requiredApproval = true;
      }
    }

    const isAllowed = violations.length === 0;

    let reason = 'All deterministic safety policies satisfied';
    if (!isAllowed) {
      const primaryFail = evaluations.find((e) => !e.passed);
      reason = primaryFail?.details || `Action blocked due to policy violations: ${violations.join(', ')}`;
    } else if (requiredApproval) {
      reason = 'Action permitted under policy, but requires merchant human approval prior to execution';
    }

    return {
      allowed: isAllowed,
      reason,
      requiredApproval: isAllowed ? requiredApproval : true,
      violations,
      ruleEvaluations: evaluations,
    };
  }
}
