/**
 * Migration: 20260824000004 — Create payments table
 *
 * Amounts stored in the smallest currency unit (paise for INR) as BIGINT
 * to avoid floating-point rounding errors in financial calculations.
 */

import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE TABLE payments (
      payment_id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
      merchant_id           UUID          NOT NULL
                              REFERENCES merchants(merchant_id) ON DELETE CASCADE,
      customer_id           UUID
                              REFERENCES customers(customer_id) ON DELETE SET NULL,
      razorpay_payment_id   VARCHAR(50)   UNIQUE NOT NULL,
      razorpay_order_id     VARCHAR(50),
      amount                BIGINT        NOT NULL CHECK (amount >= 0),
      currency              CHAR(3)       NOT NULL DEFAULT 'INR',
      status                payment_status NOT NULL DEFAULT 'created',
      method                VARCHAR(50),
      description           TEXT,
      error_code            VARCHAR(100),
      error_description     TEXT,
      metadata              JSONB,
      authorized_at         TIMESTAMPTZ,
      captured_at           TIMESTAMPTZ,
      failed_at             TIMESTAMPTZ,
      created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
    );

    COMMENT ON TABLE  payments IS 'Individual Razorpay payment records';
    COMMENT ON COLUMN payments.amount IS 'Amount in smallest currency unit (paise for INR)';
    COMMENT ON COLUMN payments.method IS 'Payment method: card, netbanking, upi, wallet, emi, etc.';
    COMMENT ON COLUMN payments.error_code IS 'Razorpay error code on failure (e.g. BAD_REQUEST_ERROR)';
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DROP TABLE IF EXISTS payments;`);
}
