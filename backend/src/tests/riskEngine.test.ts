import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  FailureClassifier,
  RevenueRiskService,
  isValidStateTransition,
  assertValidStateTransition,
  InvalidStateTransitionError,
  DeterministicFailureCategory,
} from '../services/risk';
import { setPool } from '../database/connection';
import { Pool } from 'pg';

describe('Deterministic Revenue Risk Engine', () => {
  describe('1. Failure Classification', () => {
    it('classifies insufficient funds correctly', () => {
      const cat = FailureClassifier.classifyFailure({
        errorCode: 'BAD_REQUEST_ERROR',
        errorDescription: 'The customer account has insufficient balance for transaction',
      });
      assert.equal(cat, 'INSUFFICIENT_FUNDS');
    });

    it('classifies bank declines and card expired correctly', () => {
      const cat1 = FailureClassifier.classifyFailure({
        errorCode: 'BAD_REQUEST_ERROR',
        errorDescription: 'Card declined by issuing bank (do_not_honor)',
      });
      assert.equal(cat1, 'BANK_DECLINED');

      const cat2 = FailureClassifier.classifyFailure({
        errorCode: 'BAD_REQUEST_ERROR',
        errorDescription: 'The card expiration date is invalid or card expired',
      });
      assert.equal(cat2, 'BANK_DECLINED');
    });

    it('classifies transient network/gateway errors', () => {
      const cat = FailureClassifier.classifyFailure({
        errorCode: 'GATEWAY_ERROR',
        errorDescription: 'Network timeout communication with NPCI/Bank switch (504)',
      });
      assert.equal(cat, 'NETWORK_FAILURE');
    });

    it('classifies subscription and mandate halts', () => {
      const cat = FailureClassifier.classifyFailure({
        eventType: 'subscription.halted',
        errorDescription: 'AutoPay mandate debit attempt failed on scheduled date',
      });
      assert.equal(cat, 'MANDATE_FAILURE');
    });

    it('classifies customer abandonment', () => {
      const cat = FailureClassifier.classifyFailure({
        errorDescription: 'Payment cancelled_by_user on checkout modal',
      });
      assert.equal(cat, 'CUSTOMER_ABANDONED');
    });

    it('falls back to UNKNOWN for unrecognized patterns', () => {
      const cat = FailureClassifier.classifyFailure({
        errorCode: 'CUSTOM_UNMAPPED_ERROR',
        errorDescription: 'Something unspecified happened',
      });
      assert.equal(cat, 'UNKNOWN');
    });
  });

  describe('2. Deterministic Risk Scoring & Explanations', () => {
    it('scores first failure for a loyal customer (Low Risk, High Recovery)', () => {
      const context = {
        amountPaise: 150000, // ₹1,500
        failureCategory: 'INSUFFICIENT_FUNDS' as DeterministicFailureCategory,
        previousSuccessfulPayments: 6,
        previousFailures: 0,
        hoursSinceFailure: 1,
      };

      const result = RevenueRiskService.assessRisk(context);

      assert.ok(result.riskScore < 50, `Expected risk score < 50, got ${result.riskScore}`);
      assert.ok(result.recoveryProbability >= 0.75, `Expected probability >= 0.75, got ${result.recoveryProbability}`);
      assert.ok(result.factors.some((f) => f.includes('strong payment reliability')));
      assert.ok(result.factors.some((f) => f.includes('Fresh failure')));
    });

    it('scores chronic repeated failures (High Risk, Low Recovery)', () => {
      const context = {
        amountPaise: 450000, // ₹4,500
        failureCategory: 'BANK_DECLINED' as DeterministicFailureCategory,
        previousSuccessfulPayments: 0,
        previousFailures: 4,
        hoursSinceFailure: 80,
      };

      const result = RevenueRiskService.assessRisk(context);

      assert.ok(result.riskScore >= 75, `Expected risk score >= 75, got ${result.riskScore}`);
      assert.ok(result.recoveryProbability <= 0.40, `Expected probability <= 0.40, got ${result.recoveryProbability}`);
      assert.equal(result.recommendedUrgency, 'critical');
      assert.ok(result.factors.some((f) => f.includes('high failure history')));
      assert.ok(result.factors.some((f) => f.includes('Aging failure')));
    });

    it('scores high-value enterprise transaction with high urgency', () => {
      const context = {
        amountPaise: 7500000, // ₹75,000
        failureCategory: 'NETWORK_FAILURE' as DeterministicFailureCategory,
        previousSuccessfulPayments: 2,
        previousFailures: 0,
      };

      const result = RevenueRiskService.assessRisk(context);

      assert.ok(result.factors.some((f) => f.includes('High-value enterprise transaction')));
      assert.ok(result.recoveryProbability >= 0.85); // Network failure is highly recoverable
    });

    it('scores low-value micro-transaction with low financial exposure', () => {
      const context = {
        amountPaise: 29900, // ₹299
        failureCategory: 'INSUFFICIENT_FUNDS' as DeterministicFailureCategory,
        previousSuccessfulPayments: 1,
        previousFailures: 0,
      };

      const result = RevenueRiskService.assessRisk(context);
      assert.ok(result.factors.some((f) => f.includes('Low-value transaction')));
      assert.ok(result.riskScore < 45);
    });

    it('guarantees deterministic output for identical inputs', () => {
      const context = {
        amountPaise: 500000,
        failureCategory: 'MANDATE_FAILURE' as DeterministicFailureCategory,
        previousSuccessfulPayments: 3,
        previousFailures: 1,
        isSubscription: true,
      };

      const res1 = RevenueRiskService.assessRisk(context);
      const res2 = RevenueRiskService.assessRisk(context);

      assert.equal(res1.riskScore, res2.riskScore);
      assert.equal(res1.recoveryProbability, res2.recoveryProbability);
      assert.deepEqual(res1.factors, res2.factors);
    });
  });

  describe('3. Case Lifecycle State Transitions', () => {
    it('allows valid state machine progressions', () => {
      assert.equal(isValidStateTransition('DETECTED', 'DIAGNOSED'), true);
      assert.equal(isValidStateTransition('DIAGNOSED', 'ACTION_PENDING'), true);
      assert.equal(isValidStateTransition('ACTION_PENDING', 'ACTION_SCHEDULED'), true);
      assert.equal(isValidStateTransition('ACTION_SCHEDULED', 'RECOVERING'), true);
      assert.equal(isValidStateTransition('RECOVERING', 'RECOVERED'), true);
      assert.equal(isValidStateTransition('RECOVERED', 'CLOSED'), true);
      assert.equal(isValidStateTransition('RECOVERING', 'FAILED'), true);
      assert.equal(isValidStateTransition('FAILED', 'ESCALATED'), true);
    });

    it('blocks and rejects invalid state machine progressions', () => {
      // Cannot jump from DETECTED straight to RECOVERED
      assert.equal(isValidStateTransition('DETECTED', 'RECOVERED'), false);
      assert.throws(
        () => assertValidStateTransition('DETECTED', 'RECOVERED'),
        InvalidStateTransitionError
      );

      // Cannot reopen CLOSED cases back to DETECTED
      assert.equal(isValidStateTransition('CLOSED', 'DETECTED'), false);
      assert.throws(
        () => assertValidStateTransition('CLOSED', 'DETECTED'),
        InvalidStateTransitionError
      );

      // Cannot transition from RECOVERED back to DIAGNOSED
      assert.equal(isValidStateTransition('RECOVERED', 'DIAGNOSED'), false);
    });
  });

  describe('4. Idempotent Case Processing & Audit Trail', () => {
    let mockPool: unknown;
    let storedCases: Map<string, { status: string; risk_score: number }>;

    beforeEach(() => {
      storedCases = new Map();

      mockPool = {
        query: async (sql: string, params?: unknown[]) => {
          // Payments customer history check
          if (sql.includes('FROM payments') && sql.includes('GROUP BY status')) {
            return {
              rows: [
                { status: 'captured', count: 3 },
                { status: 'failed', count: 0 },
              ],
            };
          }

          // Case existence check
          if (sql.includes('FROM revenue_risk_cases WHERE payment_id = $1')) {
            const paymentId = params?.[0] as string;
            const existing = storedCases.get(paymentId);
            if (existing) {
              return { rows: [{ case_id: `case_${paymentId}`, status: existing.status }] };
            }
            return { rows: [] };
          }

          // Insert new case
          if (sql.includes('INSERT INTO revenue_risk_cases')) {
            const paymentId = params?.[2] as string;
            storedCases.set(paymentId, { status: 'open', risk_score: 0.45 });
            return { rows: [{ case_id: `case_${paymentId}` }] };
          }

          // Update existing case
          if (sql.includes('UPDATE revenue_risk_cases')) {
            return { rows: [{ case_id: 'case_pay_test_001' }] };
          }

          // Audit log
          if (sql.includes('INSERT INTO audit_logs')) {
            return { rows: [{ log_id: 'audit_001' }] };
          }

          return { rows: [] };
        },
        connect: async () => ({
          query: async (sql: string, params?: unknown[]) => (mockPool as { query: (s: string, p?: unknown[]) => Promise<unknown> }).query(sql, params),
          release: () => {},
        }),
        totalCount: 1,
        idleCount: 1,
        waitingCount: 0,
        on: () => {},
      };

      setPool(mockPool as Pool);
    });

    afterEach(() => {
      setPool(null);
    });

    it('creates new case on first failure and avoids duplicating on repeat event', async () => {
      const eventParams = {
        merchantId: 'merch_001',
        customerId: 'cust_001',
        paymentId: 'pay_idemp_001',
        amountPaise: 250000,
        rawFailure: {
          errorCode: 'BAD_REQUEST_ERROR',
          errorDescription: 'Card declined (do_not_honor)',
        },
      };

      // 1st processing
      const res1 = await RevenueRiskService.processFailureEvent(eventParams);
      assert.equal(res1.isNewCase, true);
      assert.equal(res1.caseId, 'case_pay_idemp_001');

      // 2nd processing (same payment ID)
      const res2 = await RevenueRiskService.processFailureEvent(eventParams);
      assert.equal(res2.isNewCase, false);
      assert.equal(res2.caseId, 'case_pay_idemp_001');
    });

    it('preserves already RECOVERED case without reopening or overwriting', async () => {
      // Pre-seed an already recovered payment
      storedCases.set('pay_recovered_999', { status: 'recovered', risk_score: 0.1 });

      const eventParams = {
        merchantId: 'merch_001',
        paymentId: 'pay_recovered_999',
        amountPaise: 500000,
        rawFailure: {
          errorCode: 'BAD_REQUEST_ERROR',
          errorDescription: 'Late delivery error',
        },
      };

      const res = await RevenueRiskService.processFailureEvent(eventParams);
      assert.equal(res.isNewCase, false);
      assert.equal(res.caseId, 'case_pay_recovered_999');
    });
  });
});
