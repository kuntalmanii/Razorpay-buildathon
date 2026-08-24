/**
 * Migration: 20260824000003 — Create customers table
 */

import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE TABLE customers (
      customer_id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
      merchant_id           UUID          NOT NULL
                              REFERENCES merchants(merchant_id) ON DELETE CASCADE,
      razorpay_customer_id  VARCHAR(50),
      name                  VARCHAR(255)  NOT NULL,
      email                 VARCHAR(255)  NOT NULL,
      phone                 VARCHAR(20),
      metadata              JSONB,
      created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

      -- A customer email is unique per merchant
      CONSTRAINT uq_customers_merchant_email UNIQUE (merchant_id, email)
    );

    COMMENT ON TABLE  customers IS 'End-customers of a merchant';
    COMMENT ON COLUMN customers.razorpay_customer_id IS 'Razorpay customer ID (cust_xxx), nullable if not yet synced';
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DROP TABLE IF EXISTS customers;`);
}
