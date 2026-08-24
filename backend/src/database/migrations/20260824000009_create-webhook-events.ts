/**
 * Migration: 20260824000009 — Create webhook_events table
 *
 * razorpay_event_id has a UNIQUE constraint to enforce idempotent processing —
 * if Razorpay sends the same event twice, the second INSERT will fail with a
 * unique violation which the webhook handler uses to detect and skip duplicates.
 *
 * raw_payload is stored as-is for audit purposes. Processing should never
 * modify this field.
 */

import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE TABLE webhook_events (
      event_id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

      -- Razorpay's own event ID — used for deduplication
      razorpay_event_id       VARCHAR(100)  UNIQUE NOT NULL,
      event_type              VARCHAR(100)  NOT NULL,

      -- Immutable copy of the raw Razorpay payload
      raw_payload             JSONB         NOT NULL,

      -- Whether the HMAC-SHA256 signature was valid
      signature_verified      BOOLEAN       NOT NULL DEFAULT FALSE,

      processing_status       webhook_processing_status NOT NULL DEFAULT 'received',

      -- Error information if processing failed
      error_message           TEXT,
      error_stack             TEXT,

      -- Timestamps for SLA tracking
      received_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      processed_at            TIMESTAMPTZ,

      -- Immutable record — no updated_at
      created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW()
    );

    COMMENT ON TABLE  webhook_events IS 'Razorpay webhook events — idempotent, append-only';
    COMMENT ON COLUMN webhook_events.razorpay_event_id IS 'Razorpay event.id — UNIQUE for dedup; second delivery is rejected at DB level';
    COMMENT ON COLUMN webhook_events.raw_payload IS 'Immutable copy of the raw webhook payload — never modified after insert';
    COMMENT ON COLUMN webhook_events.signature_verified IS 'True only if HMAC-SHA256 verified against RAZORPAY_KEY_SECRET';
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DROP TABLE IF EXISTS webhook_events;`);
}
