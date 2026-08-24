/**
 * Migration: 20260824000002 — Create merchants table
 */

import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE TABLE merchants (
      merchant_id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
      razorpay_merchant_id  VARCHAR(50)   UNIQUE NOT NULL,
      name                  VARCHAR(255)  NOT NULL,
      email                 VARCHAR(255)  UNIQUE NOT NULL,
      phone                 VARCHAR(20),
      business_name         VARCHAR(255),
      status                merchant_status NOT NULL DEFAULT 'active',
      metadata              JSONB,
      created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
    );

    COMMENT ON TABLE  merchants IS 'Razorpay merchants using RecoverIQ';
    COMMENT ON COLUMN merchants.razorpay_merchant_id IS 'Razorpay-assigned merchant identifier (MID)';
    COMMENT ON COLUMN merchants.metadata IS 'Arbitrary key/value pairs for merchant-specific config';
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DROP TABLE IF EXISTS merchants;`);
}
