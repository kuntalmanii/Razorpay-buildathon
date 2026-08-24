/**
 * Migration: 20260824000001 — Create all PostgreSQL ENUMs
 *
 * All enums are defined before any table so foreign key and column references
 * compile correctly. Adding new values to an enum in a later migration is safe
 * and does not require a table rewrite.
 */

import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Merchant lifecycle
  pgm.sql(`
    CREATE TYPE merchant_status AS ENUM (
      'active',
      'suspended',
      'inactive'
    );
  `);

  // Payment lifecycle (mirrors Razorpay payment states)
  pgm.sql(`
    CREATE TYPE payment_status AS ENUM (
      'created',
      'authorized',
      'captured',
      'failed',
      'refunded',
      'partially_refunded'
    );
  `);

  // Subscription lifecycle (mirrors Razorpay subscription states)
  pgm.sql(`
    CREATE TYPE subscription_status AS ENUM (
      'created',
      'authenticated',
      'active',
      'pending',
      'halted',
      'cancelled',
      'completed',
      'expired'
    );
  `);

  // Why a payment/subscription is at risk
  pgm.sql(`
    CREATE TYPE failure_category AS ENUM (
      'payment_failure',
      'subscription_halt',
      'chargeback',
      'refund_dispute',
      'authentication_failure',
      'bank_decline',
      'network_error',
      'insufficient_funds',
      'card_expired',
      'do_not_honor'
    );
  `);

  // Revenue risk case workflow state
  pgm.sql(`
    CREATE TYPE risk_case_status AS ENUM (
      'open',
      'in_progress',
      'recovered',
      'unrecoverable',
      'closed',
      'escalated'
    );
  `);

  // What action the system can take to recover revenue
  pgm.sql(`
    CREATE TYPE action_type AS ENUM (
      'retry_payment',
      'send_notification',
      'pause_subscription',
      'cancel_subscription',
      'apply_offer',
      'escalate_to_human',
      'update_payment_method',
      'create_payment_link',
      'send_payment_reminder'
    );
  `);

  // Who proposed a recovery action
  pgm.sql(`
    CREATE TYPE proposed_by_type AS ENUM (
      'ai',
      'system',
      'human'
    );
  `);

  // Policy engine verdict on a proposed action
  pgm.sql(`
    CREATE TYPE policy_status AS ENUM (
      'pending',
      'approved',
      'rejected',
      'overridden'
    );
  `);

  // Execution lifecycle of a recovery action
  pgm.sql(`
    CREATE TYPE execution_status AS ENUM (
      'scheduled',
      'executing',
      'completed',
      'failed',
      'cancelled',
      'skipped'
    );
  `);

  // What kind of decision the AI made
  pgm.sql(`
    CREATE TYPE decision_type AS ENUM (
      'risk_assessment',
      'action_recommendation',
      'customer_communication',
      'recovery_probability'
    );
  `);

  // Webhook event processing lifecycle
  pgm.sql(`
    CREATE TYPE webhook_processing_status AS ENUM (
      'received',
      'processing',
      'processed',
      'failed',
      'skipped',
      'duplicate'
    );
  `);

  // Customer notification channels
  pgm.sql(`
    CREATE TYPE notification_channel AS ENUM (
      'email',
      'sms',
      'whatsapp',
      'push'
    );
  `);

  // Notification delivery states
  pgm.sql(`
    CREATE TYPE notification_status AS ENUM (
      'pending',
      'sent',
      'delivered',
      'failed',
      'bounced'
    );
  `);

  // Who performed an audited action
  pgm.sql(`
    CREATE TYPE actor_type AS ENUM (
      'system',
      'ai',
      'human',
      'webhook'
    );
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Drop in reverse dependency order
  pgm.sql(`
    DROP TYPE IF EXISTS actor_type;
    DROP TYPE IF EXISTS notification_status;
    DROP TYPE IF EXISTS notification_channel;
    DROP TYPE IF EXISTS webhook_processing_status;
    DROP TYPE IF EXISTS decision_type;
    DROP TYPE IF EXISTS execution_status;
    DROP TYPE IF EXISTS policy_status;
    DROP TYPE IF EXISTS proposed_by_type;
    DROP TYPE IF EXISTS action_type;
    DROP TYPE IF EXISTS risk_case_status;
    DROP TYPE IF EXISTS failure_category;
    DROP TYPE IF EXISTS subscription_status;
    DROP TYPE IF EXISTS payment_status;
    DROP TYPE IF EXISTS merchant_status;
  `);
}
