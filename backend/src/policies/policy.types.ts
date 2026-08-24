/**
 * policies/policy.types.ts
 *
 * Types and interfaces for the Deterministic Recovery Policy and Safety Engine.
 */

import { ActionType } from '../types/domain';

export type PolicyViolationCode =
  | 'MAX_RECOVERY_ATTEMPTS_EXCEEDED'
  | 'RETRY_COOLDOWN_NOT_ELAPSED'
  | 'PAYMENT_ALREADY_RECOVERED'
  | 'CUSTOMER_OPTED_OUT'
  | 'DUPLICATE_ACTION_IN_PROGRESS'
  | 'HIGH_VALUE_REQUIRES_APPROVAL'
  | 'UNKNOWN_CATEGORY_RESTRICTED'
  | 'EXPIRED_LINK_REUSE_BLOCKED'
  | 'INVALID_AI_DECISION'
  | 'UNSUPPORTED_ACTION_TYPE'
  | 'MISSING_PAYMENT_OR_SUBSCRIPTION'
  | 'MISSING_CUSTOMER_CONTEXT'
  | 'POLICY_RULE_VIOLATION';

export interface RuleEvaluationSummary {
  ruleName: string;
  passed: boolean;
  details?: string;
  violationCode?: PolicyViolationCode;
}

export interface PolicyResult {
  /** True only if all safety policies allow the action */
  allowed: boolean;
  /** Primary human-readable verdict explanation */
  reason: string;
  /** True if human merchant confirmation is required before execution */
  requiredApproval: boolean;
  /** Array of specific policy violation codes */
  violations: PolicyViolationCode[];
  /** Detailed breakdown of all evaluated safety rules */
  ruleEvaluations: RuleEvaluationSummary[];
}

export interface ExistingActionSummary {
  actionType: string;
  executionStatus: string;
  createdAt: Date;
}

export interface ProposedActionContext {
  actionType: ActionType;
  decision: string; // 'RETRY' | 'PAYMENT_LINK' | 'WAIT' | 'ESCALATE' | 'STOP'
  confidence?: number;
  customerMessage?: string;
  requiresHumanApproval?: boolean;
}

export interface MerchantPolicyConstraints {
  maxRecoveryAttempts?: number;
  retryCooldownHours?: number;
  highValueThresholdPaise?: number;
  requireApprovalForUnknown?: boolean;
}

export interface PolicyEvaluationContext {
  caseId: string;
  merchantId: string;
  customerId?: string | null;
  paymentId?: string | null;
  subscriptionId?: string | null;
  amountPaise: number;
  currency: string;
  failureCategory: string;
  caseStatus: string;
  paymentStatus?: string | null;
  customerOptedOut?: boolean;
  totalRecoveryAttempts: number;
  lastRecoveryAttemptAt?: Date | null;
  existingActions?: ExistingActionSummary[];
  proposedAction: ProposedActionContext;
  customMerchantConstraints?: MerchantPolicyConstraints;
}
