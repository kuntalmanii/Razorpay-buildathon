/**
 * Migration: 20260824000005 — Create subscriptions table
 *
 * Mirrors Razorpay subscription fields. Billing cycle counts are tracked
 * to detect halted subscriptions early.
 */

import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE TABLE subscriptions (
      subscription_id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
      merchant_id               UUID          NOT NULL
                                  REFERENCES merchants(merchant_id) ON DELETE CASCADE,
      customer_id               UUID
                                  REFERENCES customers(customer_id) ON DELETE SET NULL,
      razorpay_subscription_id  VARCHAR(50)   UNIQUE NOT NULL,
      plan_id                   VARCHAR(50)   NOT NULL,
      status                    subscription_status NOT NULL DEFAULT 'created',
      quantity                  INTEGER       NOT NULL DEFAULT 1 CHECK (quantity > 0),
      total_count               INTEGER       CHECK (total_count IS NULL OR total_count > 0),
      paid_count                INTEGER       NOT NULL DEFAULT 0 CHECK (paid_count >= 0),
      remaining_count           INTEGER       CHECK (remaining_count IS NULL OR remaining_count >= 0),
      current_start             TIMESTAMPTZ,
      current_end               TIMESTAMPTZ,
      ended_at                  TIMESTAMPTZ,
      charge_at                 TIMESTAMPTZ,
      metadata                  JSONB,
      created_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      updated_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW()
    );

    COMMENT ON TABLE  subscriptions IS 'Razorpay subscription records';
    COMMENT ON COLUMN subscriptions.plan_id IS 'Razorpay plan identifier (plan_xxx)';
    COMMENT ON COLUMN subscriptions.total_count IS 'Total billing cycles; NULL means indefinite';
    COMMENT ON COLUMN subscriptions.charge_at IS 'Next scheduled charge timestamp from Razorpay';
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DROP TABLE IF EXISTS subscriptions;`);
}
