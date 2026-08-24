# RecoverIQ — Database Architecture

## Overview

RecoverIQ uses **PostgreSQL** as its primary data store. The schema is designed around a central workflow: detecting revenue at risk → diagnosing the cause → proposing and executing a recovery action → recording the outcome.

All monetary amounts are stored as **BIGINT in the smallest currency unit** (paise for INR) to avoid floating-point rounding errors.

---

## Technology Stack

| Component | Choice | Reason |
|---|---|---|
| Database | PostgreSQL 15+ | JSONB, ENUMs, CTEs, partial indexes, INET type |
| Driver | `pg` (node-postgres) v8 | Standard, typed, Pool support |
| Migrations | `node-pg-migrate` v9 | Up/down, state tracking via `pgmigrations` |
| Migration files | TypeScript `.ts` with `pgm.sql()` | Raw SQL inside TS = explicit + rollback |

---

## Entity Relationship Overview

```
merchants ──┬── customers ──┬── payments
            │               └── subscriptions
            │
            └── revenue_risk_cases ──┬── recovery_actions ──── notification_attempts
                                     ├── ai_decisions
                                     └── audit_logs (via entity_type + entity_id)

webhook_events ──── (triggers case creation)
policy_rules  ──── (governs recovery_actions approval)
```

---

## Tables

### 1. `merchants`
Top-level entity. Every other table is scoped to a merchant.

| Column | Type | Notes |
|---|---|---|
| `merchant_id` | UUID PK | Internal ID |
| `razorpay_merchant_id` | VARCHAR(50) UNIQUE | Razorpay MID |
| `name` | VARCHAR(255) | Contact name |
| `email` | VARCHAR(255) UNIQUE | Login/contact email |
| `phone` | VARCHAR(20) | Optional |
| `business_name` | VARCHAR(255) | Legal business name |
| `status` | `merchant_status` | `active` \| `suspended` \| `inactive` |
| `metadata` | JSONB | Arbitrary config |
| `created_at` | TIMESTAMPTZ | Immutable |
| `updated_at` | TIMESTAMPTZ | Auto-updated by trigger |

---

### 2. `customers`
End-customers belonging to a merchant. Email is unique per merchant.

| Column | Type | Notes |
|---|---|---|
| `customer_id` | UUID PK | Internal ID |
| `merchant_id` | UUID FK → merchants | CASCADE delete |
| `razorpay_customer_id` | VARCHAR(50) | Razorpay `cust_xxx`, nullable |
| `name` | VARCHAR(255) | Customer name |
| `email` | VARCHAR(255) | Unique per merchant |
| `phone` | VARCHAR(20) | Optional |
| `metadata` | JSONB | Extra attributes |

**Constraints:** `UNIQUE(merchant_id, email)`

---

### 3. `payments`
Individual Razorpay payment records. Amount in paise (BIGINT).

| Column | Type | Notes |
|---|---|---|
| `payment_id` | UUID PK | Internal ID |
| `merchant_id` | UUID FK → merchants | CASCADE delete |
| `customer_id` | UUID FK → customers | SET NULL on delete |
| `razorpay_payment_id` | VARCHAR(50) UNIQUE | `pay_xxx` |
| `razorpay_order_id` | VARCHAR(50) | `order_xxx`, optional |
| `amount` | BIGINT | Paise; CHECK ≥ 0 |
| `currency` | CHAR(3) | ISO 4217, default `INR` |
| `status` | `payment_status` | Mirrors Razorpay states |
| `method` | VARCHAR(50) | `card`, `upi`, `netbanking`, etc. |
| `error_code` | VARCHAR(100) | Razorpay error code on failure |
| `error_description` | TEXT | Human-readable error |

**Status enum:** `created → authorized → captured` or `created → failed`

---

### 4. `subscriptions`
Razorpay subscription records with billing cycle tracking.

| Column | Type | Notes |
|---|---|---|
| `subscription_id` | UUID PK | Internal ID |
| `razorpay_subscription_id` | VARCHAR(50) UNIQUE | `sub_xxx` |
| `plan_id` | VARCHAR(50) | Razorpay plan ID |
| `status` | `subscription_status` | Mirrors Razorpay states |
| `total_count` | INTEGER | NULL = indefinite |
| `paid_count` | INTEGER | Billing cycles completed |
| `charge_at` | TIMESTAMPTZ | Next scheduled charge |

**Status enum:** `created → authenticated → active → halted/cancelled/completed/expired`

---

### 5. `revenue_risk_cases` ⭐ Core Table

Central workflow record. Every recovery action traces back to a case.

| Column | Type | Notes |
|---|---|---|
| `case_id` | UUID PK | Internal ID |
| `merchant_id` | UUID FK → merchants | Required |
| `customer_id` | UUID FK → customers | Optional (SET NULL) |
| `payment_id` | UUID FK → payments | At least one of payment or sub required |
| `subscription_id` | UUID FK → subscriptions | At least one of payment or sub required |
| `amount_at_risk` | BIGINT | Paise; CHECK > 0 |
| `failure_category` | `failure_category` | Why revenue is at risk |
| `risk_score` | NUMERIC(5,4) | 0.0000–1.0000 (AI-assessed) |
| `recovery_probability` | NUMERIC(5,4) | 0.0000–1.0000 (AI-assessed) |
| `status` | `risk_case_status` | `open → in_progress → recovered/unrecoverable` |
| `detected_at` | TIMESTAMPTZ | When the risk was first detected |
| `resolved_at` | TIMESTAMPTZ | Required when status is terminal |
| `recovered_amount` | BIGINT | Actual amount recovered (paise) |
| `recovery_reason` | TEXT | Human-readable recovery summary |

**Check constraints:**
- `payment_id IS NOT NULL OR subscription_id IS NOT NULL`
- `resolved_at IS NOT NULL` when `status IN ('recovered', 'unrecoverable', 'closed')`

---

### 6. `recovery_actions`

Actions proposed and executed to recover revenue for a case.

| Column | Type | Notes |
|---|---|---|
| `action_id` | UUID PK | Internal ID |
| `case_id` | UUID FK → revenue_risk_cases | CASCADE delete |
| `action_type` | `action_type` | What to do |
| `proposed_by` | `proposed_by_type` | `ai` \| `system` \| `human` |
| `policy_status` | `policy_status` | Policy engine verdict |
| `execution_status` | `execution_status` | Executor progress |
| `idempotency_key` | VARCHAR(255) UNIQUE | Prevents duplicate execution on retry |
| `payload` | JSONB | Executor input parameters |
| `result` | JSONB | Executor output after completion |
| `failure_reason` | TEXT | Set on `execution_status = failed` |

**Check constraint:** `execution_status NOT IN ('executing', 'completed', 'failed') OR policy_status = 'approved'`

---

### 7. `ai_decisions`

Immutable AI inference audit trail. No `updated_at`.

| Column | Type | Notes |
|---|---|---|
| `decision_id` | UUID PK | |
| `case_id` | UUID FK → revenue_risk_cases | |
| `model_provider` | VARCHAR(100) | e.g. `openai` |
| `model_name` | VARCHAR(100) | e.g. `gpt-4o` |
| `decision_type` | `decision_type` | What kind of decision |
| `structured_input` | JSONB | Sanitised context (no secrets) |
| `structured_output` | JSONB | Validated model output |
| `confidence` | NUMERIC(5,4) | 0–1, nullable |
| `prompt_tokens` | INTEGER | Cost tracking |
| `completion_tokens` | INTEGER | Cost tracking |
| `latency_ms` | INTEGER | SLA monitoring |

---

### 8. `webhook_events`

Razorpay webhook events with deduplication at the DB level.

| Column | Type | Notes |
|---|---|---|
| `event_id` | UUID PK | Internal ID |
| `razorpay_event_id` | VARCHAR(100) UNIQUE | **Dedup key** — duplicate sends rejected by DB |
| `event_type` | VARCHAR(100) | e.g. `payment.failed` |
| `raw_payload` | JSONB | Immutable copy of raw webhook body |
| `signature_verified` | BOOLEAN | HMAC-SHA256 verified against KEY_SECRET |
| `processing_status` | `webhook_processing_status` | Processing lifecycle |
| `error_message` | TEXT | Processing error if failed |
| `received_at` | TIMESTAMPTZ | Arrival timestamp |
| `processed_at` | TIMESTAMPTZ | Completion timestamp |

**Deduplication:** A second delivery of the same Razorpay event raises a unique constraint violation, which the handler catches and marks as `duplicate`.

---

### 9. `audit_logs` (Append-Only)

Complete audit trail for all entity state changes.

> **Append-only policy:** Application code must never issue `UPDATE` or `DELETE` on this table. Write once, read forever.

| Column | Type | Notes |
|---|---|---|
| `log_id` | UUID PK | |
| `entity_type` | VARCHAR(100) | Table name (e.g. `revenue_risk_cases`) |
| `entity_id` | UUID | PK of the changed entity |
| `action` | VARCHAR(100) | Verb (e.g. `case_opened`, `action_executed`) |
| `actor_type` | `actor_type` | `system` \| `ai` \| `human` \| `webhook` |
| `actor_id` | VARCHAR(255) | Service name, user ID, webhook source |
| `before_state` | JSONB | Snapshot before change (NULL for creates) |
| `after_state` | JSONB | Snapshot after change (NULL for deletes) |
| `ip_address` | INET | Supports IPv4 and IPv6 |

---

### 10. `policy_rules`

Rules governing when and how recovery actions are permitted.

| Column | Type | Notes |
|---|---|---|
| `rule_id` | UUID PK | |
| `merchant_id` | UUID FK → merchants | **NULL = global rule** |
| `action_type` | `action_type` | Which action this rule governs |
| `conditions` | JSONB | Rule tree evaluated against case data |
| `constraints` | JSONB | Safety limits (max retries, cooldowns, approval) |
| `priority` | INTEGER | Higher = evaluated first |
| `is_active` | BOOLEAN | Soft disable without deletion |
| `effective_from` | TIMESTAMPTZ | Rule activation time |
| `effective_until` | TIMESTAMPTZ | Expiry time (NULL = no expiry) |

**Merchant-specific rules override global rules** for the same `action_type`.

---

### 11. `notification_attempts`

Every attempt to contact a customer through any channel.

| Column | Type | Notes |
|---|---|---|
| `attempt_id` | UUID PK | |
| `case_id` | UUID FK → revenue_risk_cases | |
| `action_id` | UUID FK → recovery_actions | Optional (SET NULL) |
| `customer_id` | UUID FK → customers | Optional (SET NULL) |
| `channel` | `notification_channel` | `email` \| `sms` \| `whatsapp` \| `push` |
| `status` | `notification_status` | `pending → sent → delivered / failed / bounced` |
| `recipient` | VARCHAR(255) | Email, E.164 phone, device token |
| `provider_message_id` | VARCHAR(255) | Delivery tracking ID from provider |

---

## Enums

| Enum | Values |
|---|---|
| `merchant_status` | `active`, `suspended`, `inactive` |
| `payment_status` | `created`, `authorized`, `captured`, `failed`, `refunded`, `partially_refunded` |
| `subscription_status` | `created`, `authenticated`, `active`, `pending`, `halted`, `cancelled`, `completed`, `expired` |
| `failure_category` | `payment_failure`, `subscription_halt`, `chargeback`, `refund_dispute`, `authentication_failure`, `bank_decline`, `network_error`, `insufficient_funds`, `card_expired`, `do_not_honor` |
| `risk_case_status` | `open`, `in_progress`, `recovered`, `unrecoverable`, `closed`, `escalated` |
| `action_type` | `retry_payment`, `send_notification`, `pause_subscription`, `cancel_subscription`, `apply_offer`, `escalate_to_human`, `update_payment_method`, `create_payment_link`, `send_payment_reminder` |
| `proposed_by_type` | `ai`, `system`, `human` |
| `policy_status` | `pending`, `approved`, `rejected`, `overridden` |
| `execution_status` | `scheduled`, `executing`, `completed`, `failed`, `cancelled`, `skipped` |
| `decision_type` | `risk_assessment`, `action_recommendation`, `customer_communication`, `recovery_probability` |
| `webhook_processing_status` | `received`, `processing`, `processed`, `failed`, `skipped`, `duplicate` |
| `notification_channel` | `email`, `sms`, `whatsapp`, `push` |
| `notification_status` | `pending`, `sent`, `delivered`, `failed`, `bounced` |
| `actor_type` | `system`, `ai`, `human`, `webhook` |

---

## Indexes

### Strategy
- All foreign keys are indexed
- Partial indexes used where `WHERE` clause dramatically reduces size (e.g. failed payments only, halted subscriptions only)
- Composite indexes aligned to the most common query patterns

### Key Composite Indexes

| Index | Table | Purpose |
|---|---|---|
| `idx_cases_merchant_status_detected` | `revenue_risk_cases` | Dashboard: merchant's open cases by recency |
| `idx_payments_failed` | `payments` | Risk detection: failed payments per merchant |
| `idx_subscriptions_halted` | `subscriptions` | Risk detection: halted subscriptions |
| `idx_actions_case_exec_status` | `recovery_actions` | Job runner: pending actions per case |
| `idx_webhooks_pending_queue` | `webhook_events` | Queue worker: unprocessed events by arrival |
| `idx_policy_active_lookup` | `policy_rules` | Policy engine: active rules by action type, priority |
| `idx_audit_entity` | `audit_logs` | Audit trail: all events for a specific entity |

---

## Triggers

A single reusable `set_updated_at()` function (created in migration 13) is applied as a `BEFORE UPDATE` trigger on every table with an `updated_at` column:

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

Tables with trigger: `merchants`, `customers`, `payments`, `subscriptions`, `revenue_risk_cases`, `recovery_actions`, `policy_rules`, `notification_attempts`

Tables intentionally **without** `updated_at` (immutable): `ai_decisions`, `webhook_events`, `audit_logs`

---

## Migration Commands

```bash
# Apply all pending migrations
npm run migrate:up

# Roll back the most recent migration
npm run migrate:down

# Check which migrations have been applied
npm run db:status

# Seed development database (dev only — guard enforced)
npm run seed:dev
```

---

## Development Setup

```bash
# 1. Create the database
createdb recoveriq_dev

# 2. Copy and fill env
cp .env.example .env
# Edit .env: DATABASE_URL=postgresql://postgres:password@localhost:5432/recoveriq_dev

# 3. Run migrations
npm run migrate:up

# 4. Seed
npm run seed:dev

# 5. Start server
npm run dev
```
