/**
 * types/domain.ts — Domain entity types matching the PostgreSQL schema.
 *
 * These are read-only view types used in API responses.
 * They do NOT need to match every DB column — only what we expose via API.
 */

// ─── Enums (matching DB enum values) ─────────────────────────────────────────

export type UserRole = 'user' | 'admin';

export type MerchantStatus = 'active' | 'suspended' | 'inactive';

export type PaymentStatus =
  | 'created' | 'authorized' | 'captured'
  | 'failed' | 'refunded' | 'partially_refunded';

export type SubscriptionStatus =
  | 'created' | 'authenticated' | 'active' | 'pending'
  | 'halted' | 'cancelled' | 'completed' | 'expired';

export type FailureCategory =
  | 'payment_failure' | 'subscription_halt' | 'chargeback'
  | 'refund_dispute' | 'authentication_failure' | 'bank_decline'
  | 'network_error' | 'insufficient_funds' | 'card_expired' | 'do_not_honor';

export type RiskCaseStatus =
  | 'open' | 'in_progress' | 'recovered' | 'unrecoverable' | 'closed' | 'escalated';

export type ActionType =
  | 'retry_payment' | 'send_notification' | 'pause_subscription'
  | 'cancel_subscription' | 'apply_offer' | 'escalate_to_human'
  | 'update_payment_method' | 'create_payment_link' | 'send_payment_reminder';

export type ProposedByType = 'ai' | 'system' | 'human';

export type PolicyStatus = 'pending' | 'approved' | 'rejected' | 'overridden';

export type ExecutionStatus =
  | 'scheduled' | 'executing' | 'completed' | 'failed' | 'cancelled' | 'skipped';

export type WebhookProcessingStatus =
  | 'received' | 'processing' | 'processed' | 'failed' | 'skipped' | 'duplicate';

export type NotificationChannel = 'email' | 'sms' | 'whatsapp' | 'push';

export type ActorType = 'system' | 'ai' | 'human' | 'webhook';

// ─── Domain entities ──────────────────────────────────────────────────────────

export interface Merchant {
  merchant_id: string;
  razorpay_merchant_id: string;
  name: string;
  email: string;
  phone: string | null;
  business_name: string | null;
  status: MerchantStatus;
  created_at: Date;
  updated_at: Date;
}

export interface Customer {
  customer_id: string;
  merchant_id: string;
  razorpay_customer_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface RiskCase {
  case_id: string;
  merchant_id: string;
  customer_id: string | null;
  payment_id: string | null;
  subscription_id: string | null;
  amount_at_risk: string;       // BIGINT comes back as string from pg
  currency: string;
  failure_category: FailureCategory;
  risk_score: string;           // NUMERIC comes back as string from pg
  recovery_probability: string | null;
  status: RiskCaseStatus;
  detected_at: Date;
  resolved_at: Date | null;
  recovered_amount: string;
  recovery_reason: string | null;
  created_at: Date;
  updated_at: Date;
  // Joined fields (optional — only in detail view)
  merchant_name?: string;
  customer_name?: string;
  customer_email?: string;
}

export interface RecoveryAction {
  action_id: string;
  case_id: string;
  action_type: ActionType;
  proposed_by: ProposedByType;
  policy_status: PolicyStatus;
  execution_status: ExecutionStatus;
  idempotency_key: string;
  payload: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  failure_reason: string | null;
  scheduled_at: Date | null;
  executed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface AuditLog {
  log_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor_type: ActorType;
  actor_id: string | null;
  before_state: Record<string, unknown> | null;
  after_state: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: Date;
}

export interface WebhookEvent {
  event_id: string;
  razorpay_event_id: string;
  event_type: string;
  signature_verified: boolean;
  processing_status: WebhookProcessingStatus;
  error_message: string | null;
  received_at: Date;
  processed_at: Date | null;
  created_at: Date;
  // raw_payload excluded from API response — can be large + sensitive
}

// ─── Aggregate / view types ───────────────────────────────────────────────────

export interface DashboardSummary {
  cases: {
    total: number;
    open: number;
    in_progress: number;
    recovered: number;
    unrecoverable: number;
    closed: number;
    escalated: number;
  };
  revenue: {
    total_at_risk_paise: string;
    total_recovered_paise: string;
    recovery_rate_pct: number;
  };
}

export interface MetricsSummary {
  cases_by_failure_category: Record<FailureCategory, number>;
  actions_by_type: Partial<Record<ActionType, number>>;
  actions_by_execution_status: Partial<Record<ExecutionStatus, number>>;
  webhooks_by_status: Partial<Record<WebhookProcessingStatus, number>>;
  period_days: number;
}

// ─── Auth / Users ─────────────────────────────────────────────────────────────

export interface User {
  user_id: string;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
