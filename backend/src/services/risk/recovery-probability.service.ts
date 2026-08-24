/**
 * services/risk/recovery-probability.service.ts
 *
 * Deterministic calculation of Recovery Probability (0.00 - 1.00).
 * Estimates the likelihood that proactive recovery action will recover the lost revenue.
 */

import { RiskAssessmentContext } from './risk.types';

export class RecoveryProbabilityService {
  /**
   * Compute deterministic recovery probability between 0.00 and 1.00.
   */
  public static calculateProbability(ctx: RiskAssessmentContext): number {
    let prob = 0.65; // Baseline probability

    // 1. Failure Category Dynamics
    switch (ctx.failureCategory) {
      case 'NETWORK_FAILURE':
        prob += 0.25; // Transient, ~90% recoverable on automated retry
        break;
      case 'INSUFFICIENT_FUNDS':
        prob += 0.10; // ~75% recoverable after salary cycle or reminder
        break;
      case 'PAYMENT_EXPIRED':
        prob += 0.05; // ~70% recoverable with a fresh payment link
        break;
      case 'BANK_DECLINED':
        prob -= 0.15; // Requires alternate card or bank unblock
        break;
      case 'MANDATE_FAILURE':
        prob -= 0.10; // Requires customer re-authorization
        break;
      case 'CUSTOMER_ABANDONED':
        prob -= 0.20; // Lower purchase intent
        break;
      case 'UNKNOWN':
        prob -= 0.05;
        break;
    }

    // 2. Customer Track Record
    if (ctx.previousSuccessfulPayments >= 5) {
      prob += 0.15; // Proven loyal customer
    } else if (ctx.previousSuccessfulPayments >= 2) {
      prob += 0.08;
    } else if (ctx.previousSuccessfulPayments === 0) {
      prob -= 0.08;
    }

    if (ctx.previousFailures >= 3) {
      prob -= 0.20; // Chronic failure history
    } else if (ctx.previousFailures >= 1) {
      prob -= 0.05;
    }

    // 3. Time Decay
    if (ctx.hoursSinceFailure !== undefined) {
      if (ctx.hoursSinceFailure <= 6) {
        prob += 0.08; // High engagement window
      } else if (ctx.hoursSinceFailure > 72) {
        prob -= 0.18; // Stale failure decay
      } else if (ctx.hoursSinceFailure > 24) {
        prob -= 0.08;
      }
    }

    // 4. Repeated Failed Recovery Attempts
    if (ctx.previousRecoveryAttempts && ctx.previousRecoveryAttempts >= 2) {
      prob -= 0.15;
    }

    // Strict clamp between 0.05 and 0.98, rounded to 2 decimal places
    const clamped = Math.max(0.05, Math.min(0.98, prob));
    return Math.round(clamped * 100) / 100;
  }
}
