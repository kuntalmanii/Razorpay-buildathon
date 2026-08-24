/**
 * types/api.ts
 *
 * TypeScript types mirroring the backend API contracts.
 */

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  meta?: PaginationMeta;
  error?: {
    code: string;
    message: string;
    requestId?: string;
    fields?: Record<string, string>;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface DashboardSummary {
  totalRevenueAtRiskPaise: number;
  totalRecoveredPaise: number;
  totalOpenCases: number;
  totalRecoveredCases: number;
  recoveryRatePercent: number;
  activeAutomationsCount?: number;
  recentCases: RecoveryCaseSummary[];
  breakdownByFailureCategory: Record<string, number>;
}

export interface RecoveryCaseSummary {
  case_id: string;
  amount_at_risk: number;
  currency: string;
  failure_category: string;
  risk_score: number;
  recovery_probability: number;
  status: string;
  detected_at: string;
}

export interface RecoveryCase {
  case_id: string;
  merchant_id: string;
  customer_id?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  payment_id?: string | null;
  subscription_id?: string | null;
  amount_at_risk: number;
  currency: string;
  failure_category: string;
  risk_score: number;
  recovery_probability: number;
  status: 'open' | 'in_progress' | 'recovered' | 'unrecoverable' | 'closed' | 'escalated';
  detected_at: string;
  resolved_at?: string | null;
  recovered_amount: number;
  recovery_reason?: string | null;
}

export interface RecoveryAction {
  action_id: string;
  case_id: string;
  action_type: 'retry_payment' | 'create_payment_link' | 'notify_customer' | 'escalate_to_human' | 'pause_subscription';
  proposed_by: 'ai' | 'rule' | 'system' | 'merchant';
  policy_status: 'approved' | 'rejected' | 'pending';
  execution_status: 'scheduled' | 'executing' | 'completed' | 'failed' | 'cancelled' | 'skipped';
  idempotency_key: string;
  payload?: Record<string, unknown>;
  result?: Record<string, unknown>;
  failure_reason?: string | null;
  scheduled_at?: string | null;
  executed_at?: string | null;
  created_at: string;
}

export interface AiDecisionRecord {
  decision_id: string;
  case_id: string;
  decision: 'RETRY' | 'PAYMENT_LINK' | 'WAIT' | 'ESCALATE' | 'STOP';
  confidence: number;
  reasoning_summary: string;
  customer_message?: string;
  execution_payload?: Record<string, unknown>;
  risk_flags?: string[];
  created_at: string;
}

export interface AuditLog {
  log_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor_type: 'system' | 'ai' | 'merchant' | 'webhook' | 'worker' | 'simulation_engine';
  actor_id?: string | null;
  before_state?: Record<string, unknown> | null;
  after_state?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  ip_address?: string | null;
  created_at: string;
}

export interface WebhookEventItem {
  event_id: string;
  razorpay_event_id: string;
  event_type: string;
  signature_verified: boolean;
  processing_status: 'received' | 'processing' | 'processed' | 'duplicate' | 'skipped' | 'failed';
  error_message?: string | null;
  received_at: string;
  processed_at?: string | null;
}

export interface MetricsSummary {
  periodDays: number;
  revenueAtRiskPaise: number;
  revenueRecoveredPaise: number;
  recoveryRatePercent: number;
  totalCasesCount: number;
  recoveredCasesCount: number;
  averageRiskScore: number;
  failedCount?: number;
  dailyBreakdown?: Array<{
    date: string;
    riskPaise: number;
    recoveredPaise: number;
  }>;
}

export interface EvaluationReport {
  runId?: string;
  durationMs?: number;
  completedAt?: string;
  evaluatedAt: string;
  datasetSize: number;
  casesProcessed: number;

  // SYSTEM EVALUATION
  diagnosisAccuracyPercent: number;
  recoveryPrecisionPercent: number;
  recoveryRatePercent: number;
  falseInterventionRatePercent: number;
  averageRecoveryTimeHours: number;
  policyViolationAttemptsBlocked: number;
  duplicateActionsPrevented: number;
  humanEscalations: number;

  // BUSINESS IMPACT
  totalRevenueAtRiskPaise: number;
  totalRevenueRecoveredPaise: number;
  recoveryPercentage: number;
  averageRecoveredAmountPaise: number;
  successfulRecoveriesCount: number;

  // FAILURE RECOVERY
  webhookDuplicatesHandled: number;
  aiFailuresHandled: number;
  razorpayApiFailuresHandled: number;
  timeoutsHandled: number;
  retryAttemptsCount: number;
  recoveredAfterTechnicalFailureCount: number;

  // CATEGORY ACCURACY
  categoryBreakdown: Array<{
    category: string;
    totalCases: number;
    recoveredCases: number;
    accuracyPercent: number;
  }>;
}

export interface SystemHealthTelemetry {
  status: 'ok' | 'degraded';
  service: string;
  timestamp: string;
  environment: string;
  database: {
    status: string;
    latency_ms?: number;
    pool?: { total: number; idle: number; waiting: number };
    error?: string;
  };
  razorpay: {
    status: string;
    isTestMode: boolean;
    maskedKeyId?: string;
    error?: string;
  };
  ai: {
    status: string;
    engine: string;
    mode: string;
    fallback: string;
  };
  workers: {
    status: string;
    concurrency: string;
    zeroDoubleBilling: boolean;
    activeQueues: string[];
  };
}

export interface ScenarioRunResult {
  scenarioId: string;
  simulationType: string;
  startedAt: string;
  completedAt: string;
  steps: Array<{
    step: number;
    name: string;
    status: 'PASSED' | 'FAILED' | 'RECOVERED' | 'BLOCKED_BY_SAFETY';
    details: string;
    timestamp: string;
  }>;
  safetyGuaranteesEnforced: string[];
  finalOutcome: string;
  auditLogId?: string;
}
