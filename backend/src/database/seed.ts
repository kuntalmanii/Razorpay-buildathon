/**
 * database/seed.ts — Development seed data.
 *
 * SAFETY GUARD: This script refuses to run outside NODE_ENV=development.
 * It is intentionally destructive — it truncates all tables before inserting
 * to ensure a clean, reproducible state on every run.
 *
 * Run with: npm run seed:dev
 */

import 'dotenv/config';
import { getPool, closePool } from './connection';
import { logger } from '../utils/logger';

// ─── Safety guard ────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'development') {
  console.error('[Seed] Refusing to run outside NODE_ENV=development. Aborting.');
  process.exit(1);
}

async function seed(): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    logger.info('Truncating all tables...');

    // Truncate in reverse dependency order; CASCADE handles FK references
    await client.query(`
      TRUNCATE
        notification_attempts,
        ai_decisions,
        recovery_actions,
        revenue_risk_cases,
        audit_logs,
        webhook_events,
        policy_rules,
        payments,
        subscriptions,
        customers,
        merchants
      RESTART IDENTITY CASCADE;
    `);

    // ─── Merchants ──────────────────────────────────────────────────────────
    logger.info('Seeding merchants...');
    const merchantResult = await client.query<{ merchant_id: string }>(`
      INSERT INTO merchants (razorpay_merchant_id, name, email, phone, business_name, status)
      VALUES
        ('MID_DEV_001', 'Acme Corp', 'admin@acmecorp.dev', '+911234567890', 'Acme Corporation Pvt Ltd', 'active'),
        ('MID_DEV_002', 'TechStart India', 'billing@techstart.dev', '+919876543210', 'TechStart India LLP', 'active')
      RETURNING merchant_id;
    `);
    const [merchantA] = merchantResult.rows;

    // ─── Customers ──────────────────────────────────────────────────────────
    logger.info('Seeding customers...');
    const customerResult = await client.query<{ customer_id: string }>(`
      INSERT INTO customers (merchant_id, razorpay_customer_id, name, email, phone)
      VALUES
        ($1, 'cust_dev_001', 'Rohit Sharma', 'rohit.sharma@example.dev', '+911111111111'),
        ($1, 'cust_dev_002', 'Priya Mehta',  'priya.mehta@example.dev',  '+912222222222'),
        ($2, 'cust_dev_003', 'Arjun Kapoor', 'arjun.kapoor@example.dev', '+913333333333')
      RETURNING customer_id;
    `, [merchantA.merchant_id]);

    const [cust1, cust2, cust3] = customerResult.rows;

    // ─── Payments ───────────────────────────────────────────────────────────
    logger.info('Seeding payments...');
    const paymentResult = await client.query<{ payment_id: string }>(`
      INSERT INTO payments (
        merchant_id, customer_id, razorpay_payment_id, razorpay_order_id,
        amount, currency, status, method, error_code, error_description,
        captured_at, failed_at
      ) VALUES
        ($1, $2, 'pay_dev_001', 'order_dev_001', 250000, 'INR', 'captured',  'upi',        NULL,                  NULL, NOW() - INTERVAL '2 days', NULL),
        ($1, $3, 'pay_dev_002', 'order_dev_002', 500000, 'INR', 'failed',    'card',       'BAD_REQUEST_ERROR',   'Card declined by issuing bank', NULL, NOW() - INTERVAL '1 day'),
        ($1, $2, 'pay_dev_003', 'order_dev_003', 150000, 'INR', 'failed',    'netbanking', 'GATEWAY_ERROR',       'Net banking session timed out', NULL, NOW() - INTERVAL '6 hours'),
        ($1, $3, 'pay_dev_004', 'order_dev_004', 999900, 'INR', 'captured',  'card',       NULL,                  NULL, NOW() - INTERVAL '5 days', NULL),
        ($1, $2, 'pay_dev_005', 'order_dev_005', 75000,  'INR', 'created',   'upi',        NULL,                  NULL, NULL, NULL)
      RETURNING payment_id;
    `, [merchantA.merchant_id, cust1.customer_id, cust2.customer_id]);

    const [, failedPay1, failedPay2] = paymentResult.rows;

    // ─── Subscriptions ──────────────────────────────────────────────────────
    logger.info('Seeding subscriptions...');
    const subResult = await client.query<{ subscription_id: string }>(`
      INSERT INTO subscriptions (
        merchant_id, customer_id, razorpay_subscription_id, plan_id,
        status, quantity, total_count, paid_count, remaining_count,
        current_start, current_end, charge_at
      ) VALUES
        ($1, $2, 'sub_dev_001', 'plan_monthly_pro', 'active',  1, 12, 3,  9,  NOW() - INTERVAL '3 months', NOW() + INTERVAL '1 month', NOW() + INTERVAL '1 month'),
        ($1, $3, 'sub_dev_002', 'plan_monthly_pro', 'halted',  1, 12, 5,  7,  NOW() - INTERVAL '5 months', NOW() - INTERVAL '3 days',  NOW() - INTERVAL '3 days')
      RETURNING subscription_id;
    `, [merchantA.merchant_id, cust2.customer_id, cust3.customer_id]);

    const [, haltedSub] = subResult.rows;

    // ─── Revenue Risk Cases ─────────────────────────────────────────────────
    logger.info('Seeding revenue_risk_cases...');
    const caseResult = await client.query<{ case_id: string }>(`
      INSERT INTO revenue_risk_cases (
        merchant_id, customer_id, payment_id, subscription_id,
        amount_at_risk, currency, failure_category,
        risk_score, recovery_probability, status, detected_at
      ) VALUES
        ($1, $3, $4, NULL,  500000, 'INR', 'bank_decline',      0.8500, 0.7200, 'open',        NOW() - INTERVAL '1 day'),
        ($1, $2, $5, NULL,  150000, 'INR', 'network_error',     0.6000, 0.8500, 'in_progress', NOW() - INTERVAL '6 hours'),
        ($1, $3, NULL, $6,  999900, 'INR', 'subscription_halt', 0.9200, 0.6000, 'open',        NOW() - INTERVAL '3 days')
      RETURNING case_id;
    `, [
      merchantA.merchant_id,
      cust2.customer_id,
      cust3.customer_id,
      failedPay1.payment_id,
      failedPay2.payment_id,
      haltedSub.subscription_id,
    ]);

    const [case1, case2, case3] = caseResult.rows;

    // ─── Policy Rules ───────────────────────────────────────────────────────
    logger.info('Seeding policy_rules...');
    await client.query(`
      INSERT INTO policy_rules (merchant_id, name, description, action_type, conditions, constraints, priority, is_active)
      VALUES
        (NULL, 'Global: Allow payment retry',
          'Allow retry for failed payments under ₹10,000 without human approval',
          'retry_payment',
          '{"field": "amount_at_risk", "operator": "lte", "value": 1000000}',
          '{"max_retries": 3, "cooldown_hours": 24, "require_human_approval": false}',
          10, TRUE),

        (NULL, 'Global: High-value requires approval',
          'Payments over ₹10,000 require human approval before retry',
          'retry_payment',
          '{"field": "amount_at_risk", "operator": "gt", "value": 1000000}',
          '{"max_retries": 1, "cooldown_hours": 48, "require_human_approval": true}',
          20, TRUE),

        (NULL, 'Global: Send payment reminder notification',
          'Always allowed — send notification for any open case',
          'send_notification',
          '{}',
          '{"max_attempts_per_case": 3, "cooldown_hours": 12}',
          5, TRUE),

        (NULL, 'Global: Create payment link for high-risk cases',
          'Offer payment link when risk_score >= 0.8',
          'create_payment_link',
          '{"field": "risk_score", "operator": "gte", "value": 0.8}',
          '{"max_retries": 1, "require_human_approval": false, "expiry_hours": 48}',
          15, TRUE)
      ;
    `);

    // ─── Recovery Actions ───────────────────────────────────────────────────
    logger.info('Seeding recovery_actions...');
    await client.query(`
      INSERT INTO recovery_actions (
        case_id, action_type, proposed_by, policy_status, execution_status,
        idempotency_key, payload, scheduled_at
      ) VALUES
        ($1, 'retry_payment',     'system', 'approved',  'scheduled',
          'idm_case1_retry_001',
          '{"payment_id": "pay_dev_002", "retry_after_seconds": 3600}',
          NOW() + INTERVAL '1 hour'),
        ($2, 'send_notification', 'system', 'approved',  'completed',
          'idm_case2_notif_001',
          '{"channel": "email", "template": "payment_failed"}',
          NOW() - INTERVAL '5 hours'),
        ($3, 'create_payment_link', 'ai',   'pending',   'scheduled',
          'idm_case3_paylink_001',
          '{"amount": 999900, "description": "Subscription renewal", "expiry_hours": 48}',
          NOW() + INTERVAL '30 minutes')
      ;
    `, [case1.case_id, case2.case_id, case3.case_id]);

    // ─── Audit Logs ─────────────────────────────────────────────────────────
    logger.info('Seeding audit_logs...');
    await client.query(`
      INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, actor_id, after_state)
      VALUES
        ('revenue_risk_cases', $1, 'case_opened',    'system', 'risk-detector-v1', '{"status": "open"}'),
        ('revenue_risk_cases', $2, 'case_opened',    'system', 'risk-detector-v1', '{"status": "open"}'),
        ('revenue_risk_cases', $2, 'action_started', 'system', 'recovery-engine',  '{"execution_status": "in_progress"}'),
        ('revenue_risk_cases', $3, 'case_opened',    'webhook', 'razorpay-webhook', '{"status": "open", "trigger": "subscription.halted"}')
      ;
    `, [case1.case_id, case2.case_id, case3.case_id]);

    await client.query('COMMIT');

    logger.info('✅ Seed completed successfully', {
      merchants: 2,
      customers: 3,
      payments: 5,
      subscriptions: 2,
      risk_cases: 3,
      policy_rules: 4,
      recovery_actions: 3,
      audit_logs: 4,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Seed failed — rolled back', {
      message: err instanceof Error ? err.message : String(err),
    });
    throw err;
  } finally {
    client.release();
    await closePool();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
