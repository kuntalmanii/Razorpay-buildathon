/**
 * Migration: 20260824000008 — Create ai_decisions table
 *
 * Stores the full input/output of every AI inference call.
 * This serves as the AI audit trail — we can always replay what the model
 * saw and what it decided. Token counts and latency are tracked for cost
 * analysis and SLA monitoring.
 */

import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE TABLE ai_decisions (
      decision_id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
      case_id               UUID          NOT NULL
                              REFERENCES revenue_risk_cases(case_id) ON DELETE CASCADE,
      model_provider        VARCHAR(100)  NOT NULL,
      model_name            VARCHAR(100)  NOT NULL,
      decision_type         decision_type NOT NULL,

      -- Full structured input sent to the model (sanitised, no secrets)
      structured_input      JSONB         NOT NULL,
      -- Full structured output received from the model
      structured_output     JSONB         NOT NULL,

      confidence            NUMERIC(5,4)
                              CHECK (confidence IS NULL OR
                                     (confidence >= 0 AND confidence <= 1)),

      -- Token usage for cost tracking
      prompt_tokens         INTEGER       CHECK (prompt_tokens IS NULL OR prompt_tokens >= 0),
      completion_tokens     INTEGER       CHECK (completion_tokens IS NULL OR completion_tokens >= 0),

      -- End-to-end latency of the AI call in milliseconds
      latency_ms            INTEGER       CHECK (latency_ms IS NULL OR latency_ms >= 0),

      -- AI decisions are immutable — no updated_at
      created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
    );

    COMMENT ON TABLE  ai_decisions IS 'Immutable AI inference audit log per risk case';
    COMMENT ON COLUMN ai_decisions.structured_input IS 'Sanitised context sent to the AI model — no secrets';
    COMMENT ON COLUMN ai_decisions.structured_output IS 'Parsed, validated output from the AI model';
    COMMENT ON COLUMN ai_decisions.confidence IS 'Model self-reported confidence in the decision (0–1)';
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DROP TABLE IF EXISTS ai_decisions;`);
}
