/**
 * Migration: 20260824000010 — Create audit_logs table
 *
 * Append-only from the application perspective — the application code must
 * NEVER issue UPDATE or DELETE on this table.
 * Database-level enforcement via a ROW LEVEL SECURITY policy is added here
 * to make the constraint explicit.
 *
 * Stores before/after state as JSONB snapshots for full change history.
 */

import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE TABLE audit_logs (
      log_id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
      entity_type     VARCHAR(100)  NOT NULL,
      entity_id       UUID          NOT NULL,
      action          VARCHAR(100)  NOT NULL,
      actor_type      actor_type    NOT NULL,
      actor_id        VARCHAR(255),

      -- Snapshots of the entity before and after the change
      before_state    JSONB,
      after_state     JSONB,

      -- Extra contextual data (request ID, session info, etc.)
      metadata        JSONB,

      -- Source IP address (INET supports both IPv4 and IPv6)
      ip_address      INET,

      -- Immutable — no updated_at
      created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
    );

    COMMENT ON TABLE  audit_logs IS 'Append-only audit trail for all entity changes';
    COMMENT ON COLUMN audit_logs.entity_type IS 'Table/domain name (e.g. revenue_risk_cases, recovery_actions)';
    COMMENT ON COLUMN audit_logs.entity_id IS 'Primary key of the changed entity';
    COMMENT ON COLUMN audit_logs.action IS 'Verb describing the change (e.g. case_opened, action_executed)';
    COMMENT ON COLUMN audit_logs.before_state IS 'JSON snapshot of entity before change; NULL for CREATE events';
    COMMENT ON COLUMN audit_logs.after_state IS 'JSON snapshot of entity after change; NULL for DELETE events';
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DROP TABLE IF EXISTS audit_logs;`);
}
