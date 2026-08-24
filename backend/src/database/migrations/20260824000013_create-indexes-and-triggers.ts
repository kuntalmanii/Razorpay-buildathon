/**
 * Migration: 20260824000013 — Create indexes and updated_at trigger
 *
 * This final migration adds:
 * 1. A reusable trigger function that auto-updates the updated_at column
 * 2. Triggers on every table that has updated_at
 * 3. All performance indexes (FKs + query-pattern-specific)
 *
 * Indexes are separated from table creation so that:
 * - Table migrations remain focused on structure
 * - Index strategy can be tuned without altering table migrations
 * - Rollback of just indexes is possible without dropping tables
 */

import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // ─── Auto-updated_at trigger function ─────────────────────────────────────
  pgm.sql(`
    CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Apply trigger to every table with an updated_at column
  const tablesWithUpdatedAt = [
    'merchants',
    'customers',
    'payments',
    'subscriptions',
    'revenue_risk_cases',
    'recovery_actions',
    'policy_rules',
    'notification_attempts',
  ];

  for (const table of tablesWithUpdatedAt) {
    pgm.sql(`
      CREATE TRIGGER trg_${table}_updated_at
        BEFORE UPDATE ON ${table}
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    `);
  }

  // ─── merchants ────────────────────────────────────────────────────────────
  pgm.sql(`
    CREATE INDEX idx_merchants_status ON merchants (status);
    CREATE INDEX idx_merchants_email  ON merchants (email);
  `);

  // ─── customers ───────────────────────────────────────────────────────────
  pgm.sql(`
    CREATE INDEX idx_customers_merchant_id           ON customers (merchant_id);
    CREATE INDEX idx_customers_razorpay_customer_id  ON customers (razorpay_customer_id)
      WHERE razorpay_customer_id IS NOT NULL;
  `);

  // ─── payments ────────────────────────────────────────────────────────────
  pgm.sql(`
    CREATE INDEX idx_payments_merchant_id     ON payments (merchant_id);
    CREATE INDEX idx_payments_customer_id     ON payments (customer_id)
      WHERE customer_id IS NOT NULL;
    CREATE INDEX idx_payments_status          ON payments (status);
    CREATE INDEX idx_payments_merchant_status ON payments (merchant_id, status);
    CREATE INDEX idx_payments_created_at      ON payments (created_at DESC);
    -- Partial index: only failed payments — used by risk detection
    CREATE INDEX idx_payments_failed          ON payments (merchant_id, failed_at DESC)
      WHERE status = 'failed';
  `);

  // ─── subscriptions ───────────────────────────────────────────────────────
  pgm.sql(`
    CREATE INDEX idx_subscriptions_merchant_id  ON subscriptions (merchant_id);
    CREATE INDEX idx_subscriptions_customer_id  ON subscriptions (customer_id)
      WHERE customer_id IS NOT NULL;
    CREATE INDEX idx_subscriptions_status       ON subscriptions (status);
    -- Partial index: halted subscriptions need urgent attention
    CREATE INDEX idx_subscriptions_halted       ON subscriptions (merchant_id, charge_at)
      WHERE status = 'halted';
  `);

  // ─── revenue_risk_cases ──────────────────────────────────────────────────
  pgm.sql(`
    CREATE INDEX idx_cases_merchant_id       ON revenue_risk_cases (merchant_id);
    CREATE INDEX idx_cases_customer_id       ON revenue_risk_cases (customer_id)
      WHERE customer_id IS NOT NULL;
    CREATE INDEX idx_cases_payment_id        ON revenue_risk_cases (payment_id)
      WHERE payment_id IS NOT NULL;
    CREATE INDEX idx_cases_subscription_id   ON revenue_risk_cases (subscription_id)
      WHERE subscription_id IS NOT NULL;
    CREATE INDEX idx_cases_status            ON revenue_risk_cases (status);
    CREATE INDEX idx_cases_detected_at       ON revenue_risk_cases (detected_at DESC);
    CREATE INDEX idx_cases_failure_category  ON revenue_risk_cases (failure_category);
    -- Composite: dashboard query — merchant's open cases by recency
    CREATE INDEX idx_cases_merchant_status_detected
      ON revenue_risk_cases (merchant_id, status, detected_at DESC);
  `);

  // ─── recovery_actions ────────────────────────────────────────────────────
  pgm.sql(`
    CREATE INDEX idx_actions_case_id          ON recovery_actions (case_id);
    CREATE INDEX idx_actions_execution_status ON recovery_actions (execution_status);
    CREATE INDEX idx_actions_scheduled_at     ON recovery_actions (scheduled_at)
      WHERE execution_status = 'scheduled';
    -- Composite: job runner query — pending approved actions
    CREATE INDEX idx_actions_case_exec_status
      ON recovery_actions (case_id, execution_status);
  `);

  // ─── ai_decisions ────────────────────────────────────────────────────────
  pgm.sql(`
    CREATE INDEX idx_ai_decisions_case_id       ON ai_decisions (case_id);
    CREATE INDEX idx_ai_decisions_decision_type ON ai_decisions (decision_type);
    CREATE INDEX idx_ai_decisions_created_at    ON ai_decisions (created_at DESC);
  `);

  // ─── webhook_events ──────────────────────────────────────────────────────
  pgm.sql(`
    CREATE INDEX idx_webhooks_event_type        ON webhook_events (event_type);
    CREATE INDEX idx_webhooks_processing_status ON webhook_events (processing_status);
    CREATE INDEX idx_webhooks_received_at       ON webhook_events (received_at DESC);
    -- Composite: queue worker — unprocessed events by arrival order
    CREATE INDEX idx_webhooks_pending_queue
      ON webhook_events (processing_status, received_at)
      WHERE processing_status IN ('received', 'processing');
  `);

  // ─── audit_logs ──────────────────────────────────────────────────────────
  pgm.sql(`
    -- Primary audit query: all events for a specific entity
    CREATE INDEX idx_audit_entity ON audit_logs (entity_type, entity_id, created_at DESC);
    CREATE INDEX idx_audit_created_at ON audit_logs (created_at DESC);
    CREATE INDEX idx_audit_actor      ON audit_logs (actor_type, actor_id)
      WHERE actor_id IS NOT NULL;
  `);

  // ─── policy_rules ────────────────────────────────────────────────────────
  pgm.sql(`
    CREATE INDEX idx_policy_merchant_id  ON policy_rules (merchant_id)
      WHERE merchant_id IS NOT NULL;
    CREATE INDEX idx_policy_action_type  ON policy_rules (action_type);
    -- Policy engine lookup: active rules for an action type, sorted by priority
    CREATE INDEX idx_policy_active_lookup
      ON policy_rules (action_type, priority DESC, created_at)
      WHERE is_active = TRUE;
  `);

  // ─── notification_attempts ───────────────────────────────────────────────
  pgm.sql(`
    CREATE INDEX idx_notif_case_id     ON notification_attempts (case_id);
    CREATE INDEX idx_notif_action_id   ON notification_attempts (action_id)
      WHERE action_id IS NOT NULL;
    CREATE INDEX idx_notif_customer_id ON notification_attempts (customer_id)
      WHERE customer_id IS NOT NULL;
    CREATE INDEX idx_notif_status      ON notification_attempts (status);
    CREATE INDEX idx_notif_channel     ON notification_attempts (channel);
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Drop triggers first
  const tablesWithUpdatedAt = [
    'merchants', 'customers', 'payments', 'subscriptions',
    'revenue_risk_cases', 'recovery_actions', 'policy_rules', 'notification_attempts',
  ];
  for (const table of tablesWithUpdatedAt) {
    pgm.sql(`DROP TRIGGER IF EXISTS trg_${table}_updated_at ON ${table};`);
  }
  pgm.sql(`DROP FUNCTION IF EXISTS set_updated_at();`);

  // Drop all indexes (tables still exist — only this migration rolled back)
  pgm.sql(`
    DROP INDEX IF EXISTS idx_merchants_status;
    DROP INDEX IF EXISTS idx_merchants_email;
    DROP INDEX IF EXISTS idx_customers_merchant_id;
    DROP INDEX IF EXISTS idx_customers_razorpay_customer_id;
    DROP INDEX IF EXISTS idx_payments_merchant_id;
    DROP INDEX IF EXISTS idx_payments_customer_id;
    DROP INDEX IF EXISTS idx_payments_status;
    DROP INDEX IF EXISTS idx_payments_merchant_status;
    DROP INDEX IF EXISTS idx_payments_created_at;
    DROP INDEX IF EXISTS idx_payments_failed;
    DROP INDEX IF EXISTS idx_subscriptions_merchant_id;
    DROP INDEX IF EXISTS idx_subscriptions_customer_id;
    DROP INDEX IF EXISTS idx_subscriptions_status;
    DROP INDEX IF EXISTS idx_subscriptions_halted;
    DROP INDEX IF EXISTS idx_cases_merchant_id;
    DROP INDEX IF EXISTS idx_cases_customer_id;
    DROP INDEX IF EXISTS idx_cases_payment_id;
    DROP INDEX IF EXISTS idx_cases_subscription_id;
    DROP INDEX IF EXISTS idx_cases_status;
    DROP INDEX IF EXISTS idx_cases_detected_at;
    DROP INDEX IF EXISTS idx_cases_failure_category;
    DROP INDEX IF EXISTS idx_cases_merchant_status_detected;
    DROP INDEX IF EXISTS idx_actions_case_id;
    DROP INDEX IF EXISTS idx_actions_execution_status;
    DROP INDEX IF EXISTS idx_actions_scheduled_at;
    DROP INDEX IF EXISTS idx_actions_case_exec_status;
    DROP INDEX IF EXISTS idx_ai_decisions_case_id;
    DROP INDEX IF EXISTS idx_ai_decisions_decision_type;
    DROP INDEX IF EXISTS idx_ai_decisions_created_at;
    DROP INDEX IF EXISTS idx_webhooks_event_type;
    DROP INDEX IF EXISTS idx_webhooks_processing_status;
    DROP INDEX IF EXISTS idx_webhooks_received_at;
    DROP INDEX IF EXISTS idx_webhooks_pending_queue;
    DROP INDEX IF EXISTS idx_audit_entity;
    DROP INDEX IF EXISTS idx_audit_created_at;
    DROP INDEX IF EXISTS idx_audit_actor;
    DROP INDEX IF EXISTS idx_policy_merchant_id;
    DROP INDEX IF EXISTS idx_policy_action_type;
    DROP INDEX IF EXISTS idx_policy_active_lookup;
    DROP INDEX IF EXISTS idx_notif_case_id;
    DROP INDEX IF EXISTS idx_notif_action_id;
    DROP INDEX IF EXISTS idx_notif_customer_id;
    DROP INDEX IF EXISTS idx_notif_status;
    DROP INDEX IF EXISTS idx_notif_channel;
  `);
}
