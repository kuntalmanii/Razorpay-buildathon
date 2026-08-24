import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  RecoveryExecutor,
  RecoveryOrchestrator,
  PaymentLinkRecovery,
  RetryRecovery,
  withTransientRetry,
} from '../services/recovery';
import { RecoveryWorker, RetryWorker, VerificationWorker } from '../workers';
import { setPool } from '../database/connection';
import { paymentLinkService } from '../services/razorpay/payment-link.service';
import { paymentService } from '../services/razorpay/payment.service';
import { RazorpayTimeoutError, RazorpayValidationError } from '../services/razorpay/razorpay.types';
import { Pool } from 'pg';

describe('Recovery Action Execution Engine', () => {
  let mockPool: unknown;
  let storedActions: Map<string, Record<string, unknown>>;
  let loggedAuditEntries: unknown[];

  beforeEach(() => {
    storedActions = new Map();
    loggedAuditEntries = [];

    mockPool = {
      query: async (sql: string, params?: unknown[]) => {
        // Fetch case
        if (sql.includes('revenue_risk_cases') && sql.includes('case_id = $1') && sql.includes('SELECT')) {
          return {
            rows: [
              {
                case_id: 'case_exec_001',
                merchant_id: 'merch_001',
                customer_id: 'cust_001',
                payment_id: 'pay_001',
                subscription_id: null,
                amount_at_risk: '350000',
                currency: 'INR',
                failure_category: 'bank_decline',
                status: 'open',
                payment_status: 'failed',
                customer_name: 'Aditya Roy',
                customer_email: 'aditya@example.com',
                customer_contact: '+919876543210',
                recovered_amount: '0',
              },
            ],
          };
        }

        // Idempotency check on recovery_actions
        if (sql.includes('FROM recovery_actions') && sql.includes('idempotency_key = $1')) {
          const key = params?.[0] as string;
          const existing = storedActions.get(key);
          if (existing) {
            return {
              rows: [
                {
                  action_id: existing.action_id || 'act_001',
                  execution_status: existing.execution_status || 'completed',
                  result: existing.result || {},
                },
              ],
            };
          }
          return { rows: [] };
        }

        // Fetch policy rules
        if (sql.includes('FROM policy_rules')) {
          return {
            rows: [
              {
                constraints: {
                  max_retries: 2,
                  cooldown_hours: 24,
                  high_value_threshold_paise: 5000000,
                },
              },
            ],
          };
        }

        // Existing recovery actions query
        if (sql.includes('FROM recovery_actions') && sql.includes('case_id = $1') && sql.includes('SELECT')) {
          return { rows: [] };
        }

        // Insert recovery action
        if (sql.includes('INSERT INTO recovery_actions')) {
          const key = params?.[4] as string;
          storedActions.set(key, {
            action_id: `act_${Date.now()}`,
            execution_status: params?.[3],
            result: params?.[6],
          });
          return { rows: [{ action_id: `act_${Date.now()}` }] };
        }

        // Update case state
        if (sql.includes('UPDATE revenue_risk_cases')) {
          return { rows: [{ case_id: 'case_exec_001' }] };
        }

        // Insert audit log
        if (sql.includes('INSERT INTO audit_logs')) {
          loggedAuditEntries.push(params);
          return { rows: [{ log_id: `log_${Date.now()}` }] };
        }

        // Worker queries
        if (sql.includes('FROM recovery_actions') && sql.includes("execution_status = 'scheduled'")) {
          return { rows: [] };
        }
        if (sql.includes('FROM revenue_risk_cases') && sql.includes("status IN ('open', 'in_progress')")) {
          return { rows: [] };
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

  describe('1. 10-Step Execution Protocol & Payment Link Recovery', () => {
    it('successfully executes approved Payment Link action and writes audit logs', async () => {
      // Mock Razorpay payment link service
      const originalCreate = paymentLinkService.createPaymentLink;
      paymentLinkService.createPaymentLink = async (payload) => ({
        id: 'plink_test_exec_001',
        entity: 'payment_link',
        amount: payload.amount,
        currency: payload.currency || 'INR',
        status: 'created',
        short_url: 'https://rzp.io/i/testlink001',
        expire_by: payload.expire_by,
        created_at: 1700000000,
        customer: payload.customer,
      });

      try {
        const result = await RecoveryExecutor.executeAction({
          caseId: 'case_exec_001',
          actionType: 'create_payment_link',
          proposedBy: 'ai',
          idempotencyKey: 'recov_case_exec_001_plink_001',
          bypassHumanApprovalForTesting: true,
        });

        assert.equal(result.success, true);
        assert.equal(result.executionStatus, 'completed');
        assert.equal(result.actionType, 'create_payment_link');
        assert.ok(result.details.paymentLinkId);
        assert.ok(result.details.shortUrl);
        assert.ok(loggedAuditEntries.length >= 1);
      } finally {
        paymentLinkService.createPaymentLink = originalCreate;
      }
    });
  });

  describe('2. Failure Handling & Resiliency', () => {
    it('Razorpay Timeout: marks verification pending without blindly re-executing', async () => {
      const originalCreate = paymentLinkService.createPaymentLink;
      paymentLinkService.createPaymentLink = async () => {
        throw new RazorpayTimeoutError('Request to Razorpay timed out after 10000ms');
      };

      try {
        const result = await PaymentLinkRecovery.issueRecoveryLink({
          caseId: 'case_timeout_001',
          amountPaise: 250000,
        });

        assert.equal(result.status, 'verification_pending');
        assert.equal(result.verificationPending, true);
      } finally {
        paymentLinkService.createPaymentLink = originalCreate;
      }
    });

    it('Duplicate Delivery: caught by idempotency key and safely skipped', async () => {
      const idempotencyKey = 'recov_idempotent_key_unique_123';
      storedActions.set(idempotencyKey, {
        action_id: 'act_prior_001',
        execution_status: 'completed',
        result: { shortUrl: 'https://rzp.io/i/existing' },
      });

      const result = await RecoveryExecutor.executeAction({
        caseId: 'case_exec_001',
        actionType: 'create_payment_link',
        proposedBy: 'ai',
        idempotencyKey,
      });

      assert.equal(result.success, true);
      assert.equal(result.executionStatus, 'skipped');
      assert.equal(result.actionId, 'act_prior_001');
    });

    it('Payment Already Succeeded: halts recovery execution immediately', async () => {
      // Mock case as captured
      mockPool = {
        query: async (sql: string) => {
          if (sql.includes('revenue_risk_cases') && sql.includes('case_id = $1')) {
            return {
              rows: [
                {
                  case_id: 'case_already_paid',
                  amount_at_risk: '150000',
                  status: 'recovered',
                  payment_status: 'captured',
                },
              ],
            };
          }
          return { rows: [] };
        },
        connect: async () => ({ query: async () => ({ rows: [] }), release: () => {} }),
        totalCount: 1,
        idleCount: 1,
        waitingCount: 0,
        on: () => {},
      };
      setPool(mockPool as Pool);

      const result = await RecoveryExecutor.executeAction({
        caseId: 'case_already_paid',
        actionType: 'create_payment_link',
        proposedBy: 'ai',
        idempotencyKey: 'recov_already_paid_key',
      });

      assert.equal(result.success, true);
      assert.equal(result.executionStatus, 'skipped');
      assert.ok((result.details.reason as string).includes('already in captured/recovered state'));
    });

    it('Non-transient Business Error: fails immediately without endless retries', async () => {
      const originalCreate = paymentLinkService.createPaymentLink;
      paymentLinkService.createPaymentLink = async () => {
        throw new RazorpayValidationError('Invalid currency code provided');
      };

      try {
        let attempts = 0;
        await assert.rejects(
          async () => {
            await withTransientRetry(
              async () => {
                attempts++;
                return await paymentLinkService.createPaymentLink({
                  amount: 100,
                  currency: 'INVALID',
                });
              },
              { maxRetries: 3 }
            );
          },
          RazorpayValidationError
        );

        assert.equal(attempts, 1, 'Business validation errors must not be retried');
      } finally {
        paymentLinkService.createPaymentLink = originalCreate;
      }
    });

    it('Transient Technical Error: retries up to bounded limit', async () => {
      let attempts = 0;
      const result = await withTransientRetry(
        async () => {
          attempts++;
          if (attempts < 3) {
            const err = new Error('503 Service Unavailable');
            err.name = 'TimeoutError';
            throw err;
          }
          return 'success_after_retry';
        },
        { maxRetries: 3, initialDelayMs: 10 }
      );

      assert.equal(result, 'success_after_retry');
      assert.equal(attempts, 3);
    });
  });

  describe('3. Automated Retries Scheduling', () => {
    it('schedules retry with future cooldown timestamp', () => {
      const scheduled = RetryRecovery.scheduleRetry({
        caseId: 'case_retry_001',
        cooldownHours: 12,
      });

      assert.equal(scheduled.status, 'scheduled');
      assert.ok(scheduled.scheduledAt);
      assert.ok(scheduled.scheduledAt.getTime() > Date.now() + 11 * 3600 * 1000);
    });
  });

  describe('4. Background Workers Processing', () => {
    it('RecoveryWorker processes batch without crashing', async () => {
      const worker = new RecoveryWorker();
      const count = await worker.processBatch(5);
      assert.equal(typeof count, 'number');
    });

    it('RetryWorker processes scheduled retries without crashing', async () => {
      const worker = new RetryWorker();
      const count = await worker.processScheduledRetries(5);
      assert.equal(typeof count, 'number');
    });

    it('VerificationWorker verifies cases without crashing', async () => {
      const worker = new VerificationWorker();
      const count = await worker.verifyPendingCases(5);
      assert.equal(typeof count, 'number');
    });
  });
});
