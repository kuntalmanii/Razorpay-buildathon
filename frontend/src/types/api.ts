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
  action_type: string;
  proposed_by: string;
  policy_status: string;
  execution_status: string;
  idempotency_key?: string;
  payload?: Record<string, unknown> | null;
  result?: Record<string, unknown> | null;
  failure_reason?: string | null;
  created_at: string;
}

export interface AuditLog {
  log_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor_type: string;
  actor_id: string;
  before_state?: Record<string, unknown> | null;
  after_state?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface MetricsSummary {
  periodDays: number;
  recoveredAmountPaise: number;
  recoveredCount: number;
  failedCount: number;
  totalCases: number;
  dailyBreakdown: Array<{
    date: string;
    recoveredPaise: number;
    riskPaise: number;
  }>;
}

export interface WebhookEventItem {
  event_id: string;
  razorpay_event_id: string;
  event_type: string;
  signature_verified: boolean;
  processing_status: string;
  received_at: string;
}

export interface EvaluationReport {
  runId: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
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
