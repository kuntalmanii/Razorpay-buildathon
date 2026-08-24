/**
 * services/risk/risk-score.service.ts
 *
 * Deterministic calculation of Revenue Risk Score (0-100)
 * with explainable, human-readable risk factors.
 */

import { RiskAssessmentContext } from './risk.types';

export class RiskScoreService {
  /**
   * Compute deterministic risk score (0-100) and list of contributing factors.
   */
  public static calculateRiskScore(ctx: RiskAssessmentContext): { score: number; factors: string[] } {
    let score = 50; // Neutral baseline
    const factors: string[] = [];

    const amountInRupees = Math.round(ctx.amountPaise / 100);

    // 1. Transaction Amount Impact
    if (ctx.amountPaise > 5000000) {
      // > ₹50,000
      score += 25;
      factors.push(`High-value enterprise transaction (₹${amountInRupees.toLocaleString('en-IN')}) represents critical revenue risk`);
    } else if (ctx.amountPaise >= 1000000) {
      // ₹10,000 - ₹50,000
      score += 15;
      factors.push(`Significant transaction value (₹${amountInRupees.toLocaleString('en-IN')}) warrants prioritized recovery`);
    } else if (ctx.amountPaise >= 200000) {
      // ₹2,000 - ₹10,000
      score += 5;
      factors.push(`Moderate transaction value (₹${amountInRupees.toLocaleString('en-IN')})`);
    } else if (ctx.amountPaise < 50000) {
      // < ₹500
      score -= 10;
      factors.push(`Low-value transaction (₹${amountInRupees.toLocaleString('en-IN')}): low financial exposure`);
    }

    // 2. Failure Category Impact
    switch (ctx.failureCategory) {
      case 'NETWORK_FAILURE':
        score -= 15;
        factors.push('Transient network/gateway error typically recovers on subsequent automated retry');
        break;
      case 'INSUFFICIENT_FUNDS':
        score += 5;
        factors.push('Insufficient funds error: recoverable via smart retry timing or customer notification');
        break;
      case 'BANK_DECLINED':
        score += 15;
        factors.push('Bank decline requires alternative payment method or customer authorization');
        break;
      case 'MANDATE_FAILURE':
        score += 20;
        factors.push('Recurring mandate halt threatens ongoing customer lifetime revenue');
        break;
      case 'PAYMENT_EXPIRED':
        score += 10;
        factors.push('Payment window expired without completion');
        break;
      case 'CUSTOMER_ABANDONED':
        score += 15;
        factors.push('Customer abandoned checkout session');
        break;
      case 'UNKNOWN':
        score += 10;
        factors.push('Unclassified failure reason requires diagnostic verification');
        break;
    }

    // 3. Customer History Impact
    if (ctx.previousFailures === 0 && ctx.previousSuccessfulPayments > 0) {
      score -= 20;
      factors.push(`Customer has strong payment reliability with ${ctx.previousSuccessfulPayments} previous successful payment(s)`);
    } else if (ctx.previousSuccessfulPayments >= 5) {
      score -= 10;
      factors.push(`Long-term loyal customer (${ctx.previousSuccessfulPayments} historical payments)`);
    }

    if (ctx.previousFailures >= 3) {
      score += 25;
      factors.push(`Customer has high failure history (${ctx.previousFailures} recent failures)`);
    } else if (ctx.previousFailures > 0) {
      score += 10;
      factors.push(`Customer experienced ${ctx.previousFailures} previous failure(s)`);
    }

    if (ctx.previousSuccessfulPayments === 0 && ctx.previousFailures === 0) {
      score += 10;
      factors.push('First-time transaction with no historical customer baseline');
    }

    // 4. Time Elapsed Since Failure
    if (ctx.hoursSinceFailure !== undefined) {
      if (ctx.hoursSinceFailure > 72) {
        score += 15;
        factors.push(`Aging failure (${Math.round(ctx.hoursSinceFailure)}h elapsed) reduces spontaneous recovery likelihood`);
      } else if (ctx.hoursSinceFailure > 24) {
        score += 8;
        factors.push(`Failure occurred ${Math.round(ctx.hoursSinceFailure)}h ago`);
      } else if (ctx.hoursSinceFailure <= 2) {
        score -= 5;
        factors.push('Fresh failure (< 2h): optimal recovery window');
      }
    }

    // 5. Prior Recovery Attempts
    if (ctx.previousRecoveryAttempts && ctx.previousRecoveryAttempts >= 2) {
      score += 15;
      factors.push(`${ctx.previousRecoveryAttempts} previous recovery attempts did not succeed`);
    }

    // 6. Subscription Context
    if (ctx.isSubscription) {
      score += 5;
      factors.push('Recurring subscription renewal cycle at stake');
    }

    // Clamp score to [0, 100]
    const clampedScore = Math.max(0, Math.min(100, score));

    return {
      score: clampedScore,
      factors,
    };
  }
}
