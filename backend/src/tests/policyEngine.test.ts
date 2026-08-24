import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  PolicyEngine,
  PolicyRules,
  PolicyValidator,
  PolicyEvaluationContext,
} from '../policies';
import { setPool } from '../database/connection';
import { Pool } from 'pg';

describe('Deterministic Recovery Policy and Safety Engine', () => {
  const baseContext: PolicyEvaluationContext = {
    caseId: 'case_uuid_001',
    merchantId: 'merch_uuid_001',
    customerId: 'cust_uuid_001',
    paymentId: 'pay_uuid_001',
    subscriptionId: null,
    amountPaise: 250000, // ₹2,500
    currency: 'INR',
    failureCategory: 'bank_decline',
    caseStatus: 'open',
    paymentStatus: 'failed',
    customerOptedOut: false,
    totalRecoveryAttempts: 0,
    lastRecoveryAttemptAt: null,
    existingActions: [],
    proposedAction: {
      actionType: 'create_payment_link',
      decision: 'PAYMENT_LINK',
      confidence: 0.85,
      requiresHumanApproval: false,
    },
  };

  describe('1. Individual Safety Rules Verification', () => {
    it('Rule 1: Blocks when maximum recovery attempts (2) are exceeded', () => {
      const ctx: PolicyEvaluationContext = {
        ...baseContext,
        totalRecoveryAttempts: 2,
      };

      const result = PolicyValidator.evaluate(ctx);
      assert.equal(result.allowed, false);
      assert.ok(result.violations.includes('MAX_RECOVERY_ATTEMPTS_EXCEEDED'));
    });

    it('Rule 2: Blocks retry when cooldown period has not elapsed', () => {
      const ctx: PolicyEvaluationContext = {
        ...baseContext,
        proposedAction: {
          actionType: 'retry_payment',
          decision: 'RETRY',
        },
        totalRecoveryAttempts: 1,
        lastRecoveryAttemptAt: new Date(Date.now() - 2 * 3600 * 1000), // 2 hours ago (cooldown is 24h)
      };

      const result = PolicyValidator.evaluate(ctx);
      assert.equal(result.allowed, false);
      assert.ok(result.violations.includes('RETRY_COOLDOWN_NOT_ELAPSED'));
    });

    it('Rule 2 (Passed): Permits retry when cooldown period has elapsed', () => {
      const ctx: PolicyEvaluationContext = {
        ...baseContext,
        proposedAction: {
          actionType: 'retry_payment',
          decision: 'RETRY',
        },
        totalRecoveryAttempts: 1,
        lastRecoveryAttemptAt: new Date(Date.now() - 30 * 3600 * 1000), // 30 hours ago (> 24h)
      };

      const result = PolicyValidator.evaluate(ctx);
      assert.equal(result.allowed, true);
      assert.equal(result.violations.length, 0);
    });

    it('Rule 3: Blocks any action after successful payment capture or case recovery', () => {
      const capturedCtx: PolicyEvaluationContext = {
        ...baseContext,
        paymentStatus: 'captured',
      };
      assert.equal(PolicyValidator.evaluate(capturedCtx).allowed, false);
      assert.ok(PolicyValidator.evaluate(capturedCtx).violations.includes('PAYMENT_ALREADY_RECOVERED'));

      const recoveredCtx: PolicyEvaluationContext = {
        ...baseContext,
        caseStatus: 'recovered',
      };
      assert.equal(PolicyValidator.evaluate(recoveredCtx).allowed, false);
      assert.ok(PolicyValidator.evaluate(recoveredCtx).violations.includes('PAYMENT_ALREADY_RECOVERED'));
    });

    it('Rule 4: Blocks any action when customer has opted out', () => {
      const ctx: PolicyEvaluationContext = {
        ...baseContext,
        customerOptedOut: true,
      };

      const result = PolicyValidator.evaluate(ctx);
      assert.equal(result.allowed, false);
      assert.ok(result.violations.includes('CUSTOMER_OPTED_OUT'));
    });

    it('Rule 5: Blocks duplicate recovery action in progress', () => {
      const ctx: PolicyEvaluationContext = {
        ...baseContext,
        proposedAction: {
          actionType: 'create_payment_link',
          decision: 'PAYMENT_LINK',
        },
        existingActions: [
          {
            actionType: 'create_payment_link',
            executionStatus: 'executing',
            createdAt: new Date(),
          },
        ],
      };

      const result = PolicyValidator.evaluate(ctx);
      assert.equal(result.allowed, false);
      assert.ok(result.violations.includes('DUPLICATE_ACTION_IN_PROGRESS'));
    });

    it('Rule 6: Flags high-value recovery (>= ₹15,000) for mandatory human approval', () => {
      const ctx: PolicyEvaluationContext = {
        ...baseContext,
        amountPaise: 2500000, // ₹25,000
      };

      const result = PolicyValidator.evaluate(ctx);
      assert.equal(result.allowed, true);
      assert.equal(result.requiredApproval, true);
      assert.ok(result.reason.includes('requires merchant human approval'));
    });

    it('Rule 7: Restricts aggressive automation for UNKNOWN failure category', () => {
      const ctx: PolicyEvaluationContext = {
        ...baseContext,
        failureCategory: 'unknown',
        proposedAction: {
          actionType: 'retry_payment',
          decision: 'RETRY',
        },
      };

      const result = PolicyValidator.evaluate(ctx);
      assert.equal(result.allowed, false);
      assert.ok(result.violations.includes('UNKNOWN_CATEGORY_RESTRICTED'));
    });

    it('Rule 8 & 9: Blocks invalid AI decisions and out-of-range confidence scores', () => {
      const invalidDecisionCtx: PolicyEvaluationContext = {
        ...baseContext,
        proposedAction: {
          actionType: 'create_payment_link',
          decision: 'UNRECOGNIZED_CHAOTIC_ACTION',
        },
      };
      assert.equal(PolicyValidator.evaluate(invalidDecisionCtx).allowed, false);
      assert.ok(PolicyValidator.evaluate(invalidDecisionCtx).violations.includes('INVALID_AI_DECISION'));

      const invalidConfidenceCtx: PolicyEvaluationContext = {
        ...baseContext,
        proposedAction: {
          actionType: 'create_payment_link',
          decision: 'PAYMENT_LINK',
          confidence: 5.5,
        },
      };
      assert.equal(PolicyValidator.evaluate(invalidConfidenceCtx).allowed, false);
    });

    it('Rule 10: Blocks cases missing payment and subscription references', () => {
      const missingRefCtx: PolicyEvaluationContext = {
        ...baseContext,
        paymentId: null,
        subscriptionId: null,
      };

      const result = PolicyValidator.evaluate(missingRefCtx);
      assert.equal(result.allowed, false);
      assert.ok(result.violations.includes('MISSING_PAYMENT_OR_SUBSCRIPTION'));
    });
  });

  describe('2. Adversarial Scenarios: AI Recommends Unsafe Actions', () => {
    it('ADVERSARIAL: AI asks for unlimited retries -> Policy Engine firmly blocks', () => {
      const adversarialCtx: PolicyEvaluationContext = {
        ...baseContext,
        totalRecoveryAttempts: 4, // AI wants to retry despite 4 prior attempts
        proposedAction: {
          actionType: 'retry_payment',
          decision: 'RETRY',
          confidence: 0.99, // AI claims 99% confidence
        },
      };

      const result = PolicyValidator.evaluate(adversarialCtx);
      assert.equal(result.allowed, false);
      assert.ok(result.violations.includes('MAX_RECOVERY_ATTEMPTS_EXCEEDED'));
    });

    it('ADVERSARIAL: AI recommends payment link after successful payment -> Blocked', () => {
      const adversarialCtx: PolicyEvaluationContext = {
        ...baseContext,
        paymentStatus: 'captured',
        caseStatus: 'recovered',
        proposedAction: {
          actionType: 'create_payment_link',
          decision: 'PAYMENT_LINK',
        },
      };

      const result = PolicyValidator.evaluate(adversarialCtx);
      assert.equal(result.allowed, false);
      assert.ok(result.violations.includes('PAYMENT_ALREADY_RECOVERED'));
    });

    it('ADVERSARIAL: AI recommends immediate retry 5 minutes after failure -> Blocked by cooldown', () => {
      const adversarialCtx: PolicyEvaluationContext = {
        ...baseContext,
        totalRecoveryAttempts: 1,
        lastRecoveryAttemptAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        proposedAction: {
          actionType: 'retry_payment',
          decision: 'RETRY',
        },
      };

      const result = PolicyValidator.evaluate(adversarialCtx);
      assert.equal(result.allowed, false);
      assert.ok(result.violations.includes('RETRY_COOLDOWN_NOT_ELAPSED'));
    });
  });

  describe('3. Database Policy Engine & Audit Logging', () => {
    let mockPool: unknown;
    let loggedAuditEvents: Array<{ action: string; metadata: unknown }>;

    beforeEach(() => {
      loggedAuditEvents = [];
      mockPool = {
        query: async (sql: string, params?: unknown[]) => {
          // Fetch case
          if (sql.includes('revenue_risk_cases') && sql.includes('case_id = $1')) {
            return {
              rows: [
                {
                  case_id: 'case_audit_001',
                  merchant_id: 'merch_001',
                  customer_id: 'cust_001',
                  payment_id: 'pay_001',
                  subscription_id: null,
                  amount_at_risk: '500000',
                  currency: 'INR',
                  failure_category: 'bank_decline',
                  status: 'open',
                  payment_status: 'failed',
                },
              ],
            };
          }

          // Fetch actions
          if (sql.includes('recovery_actions') && sql.includes('case_id = $1')) {
            return { rows: [] };
          }

          // Fetch policy rules
          if (sql.includes('policy_rules')) {
            return {
              rows: [
                {
                  constraints: {
                    max_retries: 2,
                    cooldown_hours: 24,
                    high_value_threshold_paise: 1500000,
                  },
                },
              ],
            };
          }

          // Insert audit log
          if (sql.includes('INSERT INTO audit_logs')) {
            loggedAuditEvents.push({
              action: params?.[1] as string,
              metadata: params?.[4],
            });
            return { rows: [{ log_id: 'log_001' }] };
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

    it('evaluates case from database and logs audit entry on approval', async () => {
      const result = await PolicyEngine.evaluateAndAudit('case_audit_001', {
        actionType: 'create_payment_link',
        decision: 'PAYMENT_LINK',
        confidence: 0.85,
      });

      assert.equal(result.allowed, true);
      assert.equal(loggedAuditEvents.length, 1);
      assert.equal(loggedAuditEvents[0].action, 'policy_evaluation_approved');
    });

    it('evaluates case from database and logs audit entry with violation details on block', async () => {
      mockPool = {
        query: async (sql: string, params?: unknown[]) => {
          if (sql.includes('revenue_risk_cases') && sql.includes('case_id = $1')) {
            return {
              rows: [
                {
                  case_id: 'case_audit_002',
                  merchant_id: 'merch_001',
                  payment_id: 'pay_002',
                  amount_at_risk: '500000',
                  currency: 'INR',
                  failure_category: 'bank_decline',
                  status: 'open',
                  payment_status: 'failed',
                },
              ],
            };
          }
          if (sql.includes('recovery_actions') && sql.includes('case_id = $1')) {
            return {
              rows: [
                {
                  action_type: 'create_payment_link',
                  execution_status: 'scheduled',
                  created_at: new Date(),
                },
              ],
            };
          }
          if (sql.includes('policy_rules')) {
            return { rows: [] };
          }
          if (sql.includes('INSERT INTO audit_logs')) {
            loggedAuditEvents.push({
              action: params?.[1] as string,
              metadata: params?.[4],
            });
            return { rows: [{ log_id: 'log_002' }] };
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

      const result = await PolicyEngine.evaluateAndAudit('case_audit_002', {
        actionType: 'create_payment_link',
        decision: 'PAYMENT_LINK',
      });

      assert.equal(result.allowed, false);
      assert.ok(result.violations.includes('DUPLICATE_ACTION_IN_PROGRESS'));
      assert.equal(loggedAuditEvents.length, 1);
      assert.equal(loggedAuditEvents[0].action, 'policy_evaluation_blocked');
    });
  });
});
