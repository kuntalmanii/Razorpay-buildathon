/**
 * Migration: 20260824000012 — Create notification_attempts table
 *
 * Tracks every attempt to contact a customer through any channel.
 * A single recovery action may trigger multiple notification attempts
 * (e.g. email → SMS fallback).
 */

import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE TABLE notification_attempts (
      attempt_id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
      case_id               UUID          NOT NULL
                              REFERENCES revenue_risk_cases(case_id) ON DELETE CASCADE,
      action_id             UUID
                              REFERENCES recovery_actions(action_id) ON DELETE SET NULL,
      customer_id           UUID
                              REFERENCES customers(customer_id) ON DELETE SET NULL,

      channel               notification_channel NOT NULL,
      status                notification_status  NOT NULL DEFAULT 'pending',

      -- Recipient address (email, phone number, device token, etc.)
      recipient             VARCHAR(255)  NOT NULL,
      subject               VARCHAR(500),
      content               TEXT,

      -- Message ID from the notification provider (SendGrid, Twilio, etc.)
      provider_message_id   VARCHAR(255),
      error_message         TEXT,

      sent_at               TIMESTAMPTZ,
      delivered_at          TIMESTAMPTZ,
      created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
    );

    COMMENT ON TABLE  notification_attempts IS 'Customer notification attempts across all channels';
    COMMENT ON COLUMN notification_attempts.recipient IS 'Channel-specific recipient: email address, E.164 phone, etc.';
    COMMENT ON COLUMN notification_attempts.provider_message_id IS 'Delivery tracking ID from the external notification provider';
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DROP TABLE IF EXISTS notification_attempts;`);
}
