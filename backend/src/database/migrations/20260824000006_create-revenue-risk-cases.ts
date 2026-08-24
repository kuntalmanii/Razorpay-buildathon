/**
 * Migration: 20260824000006 — Create revenue_risk_cases table
 *
 * Central table — every recovery workflow starts here.
 * Enforces that a case is linked to at least one of: payment OR subscription.
 * risk_score and recovery_probability are stored as 0.0000–1.0000 decimals.
 */

import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE TABLE revenue_risk_cases (
      case_id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
      merchant_id           UUID          NOT NULL
                              REFERENCES merchants(merchant_id) ON DELETE CASCADE,
      customer_id           UUID
                              REFERENCES customers(customer_id) ON DELETE SET NULL,
      payment_id            UUID
                              REFERENCES payments(payment_id) ON DELETE SET NULL,
      subscription_id       UUID
                              REFERENCES subscriptions(subscription_id) ON DELETE SET NULL,

      amount_at_risk        BIGINT        NOT NULL CHECK (amount_at_risk > 0),
      currency              CHAR(3)       NOT NULL DEFAULT 'INR',
      failure_category      failure_category NOT NULL,

      -- Scores from AI assessment: 0.0000 (lowest) to 1.0000 (highest)
      risk_score            NUMERIC(5,4)  NOT NULL
                              CHECK (risk_score >= 0 AND risk_score <= 1),
      recovery_probability  NUMERIC(5,4)
                              CHECK (recovery_probability IS NULL OR
                                     (recovery_probability >= 0 AND recovery_probability <= 1)),

      status                risk_case_status NOT NULL DEFAULT 'open',
      detected_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      resolved_at           TIMESTAMPTZ,
      recovered_amount      BIGINT        NOT NULL DEFAULT 0 CHECK (recovered_amount >= 0),
      recovery_reason       TEXT,

      created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

      -- Every case must reference a payment, a subscription, or both
      CONSTRAINT chk_cases_payment_or_subscription
        CHECK (payment_id IS NOT NULL OR subscription_id IS NOT NULL),

      -- Cannot resolve without a resolved timestamp
      CONSTRAINT chk_cases_resolved_consistency
        CHECK (
          (status IN ('recovered', 'unrecoverable', 'closed') AND resolved_at IS NOT NULL)
          OR status NOT IN ('recovered', 'unrecoverable', 'closed')
        )
    );

    COMMENT ON TABLE  revenue_risk_cases IS 'Central revenue recovery workflow record';
    COMMENT ON COLUMN revenue_risk_cases.amount_at_risk IS 'Amount in smallest currency unit (paise for INR)';
    COMMENT ON COLUMN revenue_risk_cases.risk_score IS 'AI-assessed risk: 1.0 = certain loss if no action';
    COMMENT ON COLUMN revenue_risk_cases.recovery_probability IS 'AI-assessed probability of successful recovery';
    COMMENT ON COLUMN revenue_risk_cases.recovered_amount IS 'Actual amount recovered after actions; 0 until confirmed';
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DROP TABLE IF EXISTS revenue_risk_cases;`);
}
