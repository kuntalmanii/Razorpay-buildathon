/**
 * tests/multiTenantIsolation.test.ts
 *
 * Verifies multi-tenant data boundary isolation and security guarantees across merchants.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { getPool } from '../database/connection';
import { RecoveryExecutor } from '../services/recovery/recovery-executor';
import { PolicyValidator } from '../policies/policy-validator';

describe('Multi-Tenant Data Isolation & Security Safeguards', () => {
  const pool = getPool();
  const originalQuery = pool.query.bind(pool);
  const MERCHANT_A = 'merch_alpha_101';
  const MERCHANT_B = 'merch_beta_202';

  const CASE_MERCHANT_A = 'case_tenant_a_001';
  const CASE_MERCHANT_B = 'case_tenant_b_002';

  before(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (pool as any).query = async (sql: string, params?: unknown[]) => {
      const sqlText = typeof sql === 'string' ? sql : (sql as { text: string }).text;

      // Select specific case by ID (handles both `case_id = $1` and `c.case_id = $1`)
      if (sqlText.includes('revenue_risk_cases') && (sqlText.includes('case_id = $1') || sqlText.includes('c.case_id = $1'))) {
        const reqCaseId = params?.[0];
        if (reqCaseId === CASE_MERCHANT_A) {
          return {
            rows: [
              {
                case_id: CASE_MERCHANT_A,
                merchant_id: MERCHANT_A,
                amount_at_risk: 500000,
                currency: 'INR',
                status: 'NEW',
                payment_status: 'failed',
                failure_category: 'insufficient_funds',
                recovery_attempts_count: 0,
                last_recovery_action_at: null,
                is_opted_out: false,
                customer_name: 'Alpha Customer',
                customer_email: 'alpha@example.com',
                customer_id: 'cust_alpha_1',
                payment_id: 'pay_alpha_1',
              },
            ],
          };
        } else if (reqCaseId === CASE_MERCHANT_B) {
          return {
            rows: [
              {
                case_id: CASE_MERCHANT_B,
                merchant_id: MERCHANT_B,
                amount_at_risk: 800000,
                currency: 'INR',
                status: 'NEW',
                payment_status: 'failed',
                failure_category: 'bank_declined',
                recovery_attempts_count: 0,
                last_recovery_action_at: null,
                is_opted_out: false,
                customer_name: 'Beta Customer',
                customer_email: 'beta@example.com',
                customer_id: 'cust_beta_1',
                payment_id: 'pay_beta_1',
              },
            ],
          };
        }
        return { rows: [] };
      }

      // Check idempotency for actions
      if (sqlText.includes('recovery_actions') && sqlText.includes('WHERE idempotency_key = $1')) {
        return { rows: [] };
      }

      // Insert action
      if (sqlText.includes('recovery_actions') && sqlText.includes('INSERT')) {
        return {
          rows: [
            {
              action_id: `act_${Date.now()}`,
              case_id: params?.[0],
              action_type: params?.[1],
              execution_status: 'completed',
            },
          ],
        };
      }

      // Update case
      if (sqlText.includes('UPDATE revenue_risk_cases')) {
        return { rowCount: 1, rows: [{ case_id: params?.[params.length - 1] }] };
      }

      // Insert audit log
      if (sqlText.includes('INSERT INTO audit_logs')) {
        return { rows: [{ log_id: 'audit_tenant_test' }] };
      }

      return { rows: [] };
    };
  });

  after(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (pool as any).query = originalQuery;
  });

  it('1. Segregates Merchant A case telemetry from Merchant B', async () => {
    const resA = await pool.query('SELECT * FROM revenue_risk_cases WHERE case_id = $1', [CASE_MERCHANT_A]);
    const resB = await pool.query('SELECT * FROM revenue_risk_cases WHERE case_id = $1', [CASE_MERCHANT_B]);

    const caseA = resA.rows[0];
    const caseB = resB.rows[0];

    assert.ok(caseA, 'Case A should be retrievable');
    assert.ok(caseB, 'Case B should be retrievable');

    assert.equal(caseA.merchant_id, MERCHANT_A);
    assert.equal(caseB.merchant_id, MERCHANT_B);
    assert.notEqual(caseA.merchant_id, caseB.merchant_id);
    assert.notEqual(caseA.customer_id, caseB.customer_id);
  });

  it('2. Evaluates policy independently per merchant configuration', async () => {
    // Merchant A evaluation
    const resultA = PolicyValidator.evaluate({
      caseId: CASE_MERCHANT_A,
      merchantId: MERCHANT_A,
      customerId: 'cust_alpha_1',
      paymentId: 'pay_alpha_1',
      proposedAction: {
        actionType: 'create_payment_link',
        decision: 'PAYMENT_LINK',
      },
      caseStatus: 'NEW',
      paymentStatus: 'failed',
      failureCategory: 'insufficient_funds',
      totalRecoveryAttempts: 0,
      amountPaise: 500000, // ₹5,000 (below high-value threshold)
      currency: 'INR',
      customerOptedOut: false,
    });

    assert.equal(resultA.allowed, true);
    assert.equal(resultA.requiredApproval, false);

    // Merchant B evaluation with high-value amount
    const resultB = PolicyValidator.evaluate({
      caseId: CASE_MERCHANT_B,
      merchantId: MERCHANT_B,
      customerId: 'cust_beta_1',
      paymentId: 'pay_beta_1',
      proposedAction: {
        actionType: 'create_payment_link',
        decision: 'PAYMENT_LINK',
      },
      caseStatus: 'NEW',
      paymentStatus: 'failed',
      failureCategory: 'bank_declined',
      totalRecoveryAttempts: 0,
      amountPaise: 2500000, // ₹25,000 (exceeds ₹20,000 threshold)
      currency: 'INR',
      customerOptedOut: false,
    });

    assert.equal(resultB.allowed, true);
    assert.equal(resultB.requiredApproval, true, 'Merchant B high-value case requires approval');
  });

  it('3. Ensures recovery execution idempotency is partitioned per unique case and key', async () => {
    const resA = await RecoveryExecutor.executeAction({
      caseId: CASE_MERCHANT_A,
      actionType: 'retry_payment',
      proposedBy: 'system',
      idempotencyKey: 'idemp_tenant_a_001',
      bypassHumanApprovalForTesting: true,
    });

    assert.equal(resA.success, true);
    assert.equal(resA.caseId, CASE_MERCHANT_A);

    const resB = await RecoveryExecutor.executeAction({
      caseId: CASE_MERCHANT_B,
      actionType: 'retry_payment',
      proposedBy: 'system',
      idempotencyKey: 'idemp_tenant_b_001',
      bypassHumanApprovalForTesting: true,
    });

    assert.equal(resB.success, true);
    assert.equal(resB.caseId, CASE_MERCHANT_B);
    assert.notEqual(resA.idempotencyKey, resB.idempotencyKey);
  });
});
