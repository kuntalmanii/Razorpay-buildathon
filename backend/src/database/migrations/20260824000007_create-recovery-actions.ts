/**
 * Migration: 20260824000007 — Create recovery_actions table
 *
 * idempotency_key is globally unique — prevents duplicate execution even if
 * the scheduler retries a failed action dispatch.
 */

import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE TABLE recovery_actions (
      action_id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
      case_id               UUID          NOT NULL
                              REFERENCES revenue_risk_cases(case_id) ON DELETE CASCADE,
      action_type           action_type   NOT NULL,
      proposed_by           proposed_by_type NOT NULL DEFAULT 'system',
      policy_status         policy_status NOT NULL DEFAULT 'pending',
      execution_status      execution_status NOT NULL DEFAULT 'scheduled',

      -- Globally unique key to prevent duplicate execution on retries
      idempotency_key       VARCHAR(255)  UNIQUE NOT NULL,

      -- Structured input/output for the action executor
      payload               JSONB,
      result                JSONB,
      failure_reason        TEXT,

      scheduled_at          TIMESTAMPTZ,
      executed_at           TIMESTAMPTZ,
      created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

      -- Cannot execute before policy approves
      CONSTRAINT chk_actions_approved_before_execution
        CHECK (
          execution_status NOT IN ('executing', 'completed', 'failed')
          OR policy_status = 'approved'
        )
    );

    COMMENT ON TABLE  recovery_actions IS 'Recovery actions proposed and executed per risk case';
    COMMENT ON COLUMN recovery_actions.idempotency_key IS 'Globally unique key preventing duplicate execution on retry';
    COMMENT ON COLUMN recovery_actions.payload IS 'Structured input for the action executor (e.g. retry params)';
    COMMENT ON COLUMN recovery_actions.result IS 'Structured output from the action executor after completion';
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DROP TABLE IF EXISTS recovery_actions;`);
}
