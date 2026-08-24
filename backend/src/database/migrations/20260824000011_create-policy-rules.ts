/**
 * Migration: 20260824000011 — Create policy_rules table
 *
 * merchant_id is nullable — NULL means the rule is global (applies to all merchants).
 * Merchant-specific rules override global rules when action_type matches.
 *
 * conditions and constraints are stored as JSONB to allow the policy engine
 * to evaluate arbitrary rule trees without schema changes.
 */

import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE TABLE policy_rules (
      rule_id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

      -- NULL = global rule applying to all merchants
      merchant_id       UUID
                          REFERENCES merchants(merchant_id) ON DELETE CASCADE,

      name              VARCHAR(255)  NOT NULL,
      description       TEXT,
      action_type       action_type   NOT NULL,

      -- JSON rule tree evaluated by the policy engine
      -- e.g. {"field": "amount_at_risk", "operator": "gte", "value": 100000}
      conditions        JSONB         NOT NULL DEFAULT '{}',

      -- JSON safety constraints
      -- e.g. {"max_retries": 3, "cooldown_hours": 24, "require_human_approval": false}
      constraints       JSONB         NOT NULL DEFAULT '{}',

      -- Higher priority rules are evaluated first
      priority          INTEGER       NOT NULL DEFAULT 0,
      is_active         BOOLEAN       NOT NULL DEFAULT TRUE,

      effective_from    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      effective_until   TIMESTAMPTZ,

      created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

      CONSTRAINT chk_policy_effective_range
        CHECK (effective_until IS NULL OR effective_until > effective_from)
    );

    COMMENT ON TABLE  policy_rules IS 'Policy rules governing when recovery actions are permitted';
    COMMENT ON COLUMN policy_rules.merchant_id IS 'NULL = global rule; non-NULL = merchant-specific override';
    COMMENT ON COLUMN policy_rules.conditions IS 'JSON rule tree evaluated by the policy engine against case data';
    COMMENT ON COLUMN policy_rules.constraints IS 'Safety constraints (max retries, cooldowns, approval requirements)';
    COMMENT ON COLUMN policy_rules.priority IS 'Higher values evaluated first; ties broken by created_at';
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DROP TABLE IF EXISTS policy_rules;`);
}
