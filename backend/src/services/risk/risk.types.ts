/**
 * services/risk/risk.types.ts
 *
 * Types for the Deterministic Revenue Risk Engine:
 *  - Failure categories
 *  - Case lifecycle state machine & transition validator
 *  - Risk assessment context & results
 */

import { FailureCategory, RiskCaseStatus } from '../../types/domain';
import { AppError } from '../../utils/errors';

export type DeterministicFailureCategory =
  | 'INSUFFICIENT_FUNDS'
  | 'BANK_DECLINED'
  | 'NETWORK_FAILURE'
  | 'PAYMENT_EXPIRED'
  | 'MANDATE_FAILURE'
  | 'CUSTOMER_ABANDONED'
  | 'UNKNOWN';

export type CaseLifecycleState =
  | 'DETECTED'
  | 'DIAGNOSED'
  | 'ACTION_PENDING'
  | 'ACTION_SCHEDULED'
  | 'RECOVERING'
  | 'RECOVERED'
  | 'FAILED'
  | 'ESCALATED'
  | 'CLOSED';

// ─── State Transition Matrix ──────────────────────────────────────────────────

export const VALID_LIFECYCLE_TRANSITIONS: Record<CaseLifecycleState, readonly CaseLifecycleState[]> = {
  DETECTED: ['DIAGNOSED', 'CLOSED'],
  DIAGNOSED: ['ACTION_PENDING', 'ESCALATED', 'CLOSED'],
  ACTION_PENDING: ['ACTION_SCHEDULED', 'RECOVERING', 'ESCALATED', 'CLOSED'],
  ACTION_SCHEDULED: ['RECOVERING', 'ESCALATED', 'CLOSED'],
  RECOVERING: ['RECOVERED', 'FAILED', 'ESCALATED', 'ACTION_PENDING', 'CLOSED'],
  FAILED: ['ESCALATED', 'ACTION_PENDING', 'CLOSED'],
  ESCALATED: ['ACTION_PENDING', 'CLOSED', 'RECOVERED', 'FAILED'],
  RECOVERED: ['CLOSED'],
  CLOSED: [], // Terminal state
} as const;

export class InvalidStateTransitionError extends AppError {
  constructor(fromState: CaseLifecycleState, toState: CaseLifecycleState) {
    super(
      `Invalid risk case state transition: cannot transition from ${fromState} to ${toState}`,
      400
    );
  }
}

export function isValidStateTransition(
  fromState: CaseLifecycleState,
  toState: CaseLifecycleState
): boolean {
  if (fromState === toState) return true; // Idempotent no-op
  const allowed = VALID_LIFECYCLE_TRANSITIONS[fromState];
  return allowed ? allowed.includes(toState) : false;
}

export function assertValidStateTransition(
  fromState: CaseLifecycleState,
  toState: CaseLifecycleState
): void {
  if (!isValidStateTransition(fromState, toState)) {
    throw new InvalidStateTransitionError(fromState, toState);
  }
}

// ─── DB Enum Mapping ──────────────────────────────────────────────────────────

export function mapLifecycleStateToDbStatus(state: CaseLifecycleState): RiskCaseStatus {
  switch (state) {
    case 'DETECTED':
    case 'DIAGNOSED':
      return 'open';
    case 'ACTION_PENDING':
    case 'ACTION_SCHEDULED':
    case 'RECOVERING':
      return 'in_progress';
    case 'RECOVERED':
      return 'recovered';
    case 'FAILED':
      return 'unrecoverable';
    case 'ESCALATED':
      return 'escalated';
    case 'CLOSED':
      return 'closed';
  }
}

export function mapDeterministicCategoryToDbCategory(
  category: DeterministicFailureCategory
): FailureCategory {
  switch (category) {
    case 'INSUFFICIENT_FUNDS':
      return 'insufficient_funds';
    case 'BANK_DECLINED':
      return 'bank_decline';
    case 'NETWORK_FAILURE':
      return 'network_error';
    case 'PAYMENT_EXPIRED':
      return 'card_expired';
    case 'MANDATE_FAILURE':
      return 'subscription_halt';
    case 'CUSTOMER_ABANDONED':
      return 'authentication_failure';
    case 'UNKNOWN':
      return 'payment_failure';
  }
}

// ─── Context & Assessment Types ───────────────────────────────────────────────

export interface RiskAssessmentContext {
  amountPaise: number;
  currency?: string;
  failureCategory: DeterministicFailureCategory;
  previousSuccessfulPayments: number;
  previousFailures: number;
  customerTenureDays?: number;
  isSubscription?: boolean;
  subscriptionState?: string;
  hoursSinceFailure?: number;
  previousRecoveryAttempts?: number;
  paymentMethod?: string;
}

export interface RiskAssessmentResult {
  /** Risk score from 0 to 100 (higher = greater loss risk) */
  riskScore: number;
  /** Normalized risk score for PostgreSQL numeric column (0.0000 - 1.0000) */
  riskScoreNormalized: number;
  /** Recovery probability between 0.00 and 1.00 (higher = easier to recover) */
  recoveryProbability: number;
  /** Transparent, human-readable explanations of every factor influencing the score */
  factors: string[];
  failureCategory: DeterministicFailureCategory;
  recommendedUrgency: 'low' | 'medium' | 'high' | 'critical';
}
