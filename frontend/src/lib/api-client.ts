/**
 * lib/api-client.ts
 *
 * Centralized, typed API client communicates ONLY with the backend REST endpoints.
 * Never performs direct payment gateway operations or embeds secrets.
 */

import {
  ApiResponse,
  DashboardSummary,
  RecoveryCase,
  RecoveryAction,
  AuditLog,
  MetricsSummary,
  WebhookEventItem,
  PaginationMeta,
  EvaluationReport,
  SystemHealthTelemetry,
  ScenarioRunResult,
} from '../types/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

if (typeof window !== 'undefined' && !process.env.NEXT_PUBLIC_API_URL && process.env.NODE_ENV === 'development') {
  console.info('[RecoverIQ Frontend] NEXT_PUBLIC_API_URL unset — using default http://localhost:3001');
}

class ApiClientError extends Error {
  public statusCode?: number;
  public code?: string;

  constructor(message: string, statusCode?: number, code?: string) {
    super(message);
    this.name = 'ApiClientError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  try {
    const res = await fetch(url, {
      credentials: 'include',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(options?.headers || {}),
      },
    });

    const json: ApiResponse<T> = await res.json();

    if (!res.ok || !json.success) {
      const errorMsg = json.error?.message || `HTTP ${res.status}: ${res.statusText}`;
      throw new ApiClientError(errorMsg, res.status, json.error?.code);
    }

    return json.data as T;
  } catch (err) {
    if (err instanceof ApiClientError) {
      throw err;
    }
    throw new ApiClientError((err as Error).message || 'Network request failed');
  }
}

async function fetchPaginated<T>(
  path: string
): Promise<{ items: T[]; meta: PaginationMeta }> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  });

  const json: ApiResponse<T[]> = await res.json();

  if (!res.ok || !json.success) {
    throw new ApiClientError(
      json.error?.message || `HTTP ${res.status}`,
      res.status,
      json.error?.code
    );
  }

  return {
    items: json.data || [],
    meta: json.meta || { page: 1, limit: 10, total: 0, totalPages: 0 },
  };
}

export const apiClient = {
  /**
   * Fetch aggregated dashboard statistics
   */
  async getDashboardSummary(): Promise<DashboardSummary> {
    const raw = await fetchJson<Record<string, unknown>>('/api/dashboard/summary');

    // If returned in domain structure { cases, revenue }
    if (raw && ('cases' in raw || 'revenue' in raw)) {
      const casesObj = (raw.cases || {}) as Record<string, number>;
      const revObj = (raw.revenue || {}) as Record<string, string | number>;

      const atRisk = Number(revObj.total_at_risk_paise || 0);
      const recovered = Number(revObj.total_recovered_paise || 0);
      const openCases = (casesObj.open || 0) + (casesObj.in_progress || 0);
      const recoveredCases = casesObj.recovered || 0;
      const rate = Number(revObj.recovery_rate_pct ?? (atRisk > 0 ? (recovered / atRisk) * 100 : 0));

      return {
        totalRevenueAtRiskPaise: atRisk,
        totalRecoveredPaise: recovered,
        totalOpenCases: openCases,
        totalRecoveredCases: recoveredCases,
        recoveryRatePercent: rate,
        activeAutomationsCount: casesObj.in_progress || 0,
        recentCases: (raw.recentCases as DashboardSummary['recentCases']) || [],
        breakdownByFailureCategory:
          (raw.breakdownByFailureCategory as Record<string, number>) || {},
      };
    }

    const typed = raw as unknown as DashboardSummary;
    return {
      totalRevenueAtRiskPaise: Number(typed.totalRevenueAtRiskPaise || 0),
      totalRecoveredPaise: Number(typed.totalRecoveredPaise || 0),
      totalOpenCases: Number(typed.totalOpenCases || 0),
      totalRecoveredCases: Number(typed.totalRecoveredCases || 0),
      recoveryRatePercent: Number(typed.recoveryRatePercent || 0),
      activeAutomationsCount: Number(typed.activeAutomationsCount || 0),
      recentCases: typed.recentCases || [],
      breakdownByFailureCategory: typed.breakdownByFailureCategory || {},
    };
  },

  /**
   * Fetch paginated list of revenue risk cases
   */
  async getRecoveryCases(params?: {
    page?: number;
    limit?: number;
    status?: string;
    failureCategory?: string;
    failure_category?: string;
  }): Promise<{ cases: RecoveryCase[]; meta: PaginationMeta }> {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', params.page.toString());
    if (params?.limit) q.set('limit', params.limit.toString());
    if (params?.status && params.status !== 'all') q.set('status', params.status);

    const cat = params?.failureCategory || params?.failure_category;
    if (cat && cat !== 'all') q.set('failure_category', cat);

    const queryStr = q.toString() ? `?${q.toString()}` : '';
    const res = await fetchPaginated<RecoveryCase>(`/api/recovery-cases${queryStr}`);
    return { cases: res.items, meta: res.meta };
  },

  /**
   * Fetch a single recovery case by ID
   */
  async getRecoveryCaseById(id: string): Promise<RecoveryCase> {
    return fetchJson<RecoveryCase>(`/api/recovery-cases/${id}`);
  },

  /**
   * Alias for getRecoveryCaseById
   */
  async getRecoveryCase(id: string): Promise<RecoveryCase> {
    return fetchJson<RecoveryCase>(`/api/recovery-cases/${id}`);
  },

  /**
   * Fetch recovery actions (accepts either caseId string or params object)
   */
  async getRecoveryActions(
    arg?:
      | string
      | {
          page?: number;
          limit?: number;
          caseId?: string;
          case_id?: string;
          status?: string;
          execution_status?: string;
        }
  ): Promise<{ actions: RecoveryAction[]; meta: PaginationMeta } & RecoveryAction[]> {
    if (typeof arg === 'string') {
      const actions = await fetchJson<RecoveryAction[]>(`/api/recovery-cases/${arg}/actions`);
      const meta = { page: 1, limit: actions.length, total: actions.length, totalPages: 1 };
      const res = Object.assign(actions, { actions, meta });
      return res;
    }

    const q = new URLSearchParams();
    if (arg?.page) q.set('page', arg.page.toString());
    if (arg?.limit) q.set('limit', arg.limit.toString());
    const caseId = arg?.caseId || arg?.case_id;
    if (caseId) q.set('case_id', caseId);
    const status = arg?.status || arg?.execution_status;
    if (status && status !== 'all') q.set('execution_status', status);

    const queryStr = q.toString() ? `?${q.toString()}` : '';
    const res = await fetchPaginated<RecoveryAction>(`/api/recovery-actions${queryStr}`);
    const arrayResult = Object.assign(res.items, { actions: res.items, meta: res.meta });
    return arrayResult;
  },

  /**
   * Fetch case-specific audit logs
   */
  async getCaseAudit(caseId: string): Promise<AuditLog[] & { logs: AuditLog[]; meta: PaginationMeta }> {
    try {
      const res = await fetchJson<AuditLog[]>(`/api/recovery-cases/${caseId}/audit`);
      const logs = Array.isArray(res) ? res : [];
      return Object.assign(logs, { logs, meta: { page: 1, limit: logs.length, total: logs.length, totalPages: 1 } });
    } catch {
      const paginated = await fetchPaginated<AuditLog>(`/api/dashboard/audit?entity_id=${caseId}`);
      const items = paginated.items || [];
      return Object.assign(items, { logs: items, meta: paginated.meta });
    }
  },

  /**
   * Fetch audit trail logs with optional filtering
   */
  async getAuditLogs(params?: {
    page?: number;
    limit?: number;
    entity_type?: string;
    entity_id?: string;
  }): Promise<{ logs: AuditLog[]; meta: PaginationMeta } & AuditLog[]> {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', params.page.toString());
    if (params?.limit) q.set('limit', params.limit.toString());
    if (params?.entity_type) q.set('entity_type', params.entity_type);
    if (params?.entity_id) q.set('entity_id', params.entity_id);

    const queryStr = q.toString() ? `?${q.toString()}` : '';
    const res = await fetchPaginated<AuditLog>(`/api/dashboard/audit${queryStr}`);
    const items = res.items || [];
    return Object.assign(items, { logs: items, meta: res.meta });
  },

  /**
   * Fetch time-windowed metrics for charts
   */
  async getMetrics(days = 30): Promise<MetricsSummary> {
    return fetchJson<MetricsSummary>(`/api/metrics?days=${days}`);
  },

  /**
   * Fetch ingested webhook events
   */
  async getWebhookEvents(params?: {
    page?: number;
    limit?: number;
  }): Promise<{ events: WebhookEventItem[]; meta: PaginationMeta }> {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', params.page.toString());
    if (params?.limit) q.set('limit', params.limit.toString());

    const queryStr = q.toString() ? `?${q.toString()}` : '';
    const res = await fetchPaginated<WebhookEventItem>(`/api/webhooks/events${queryStr}`);
    return { events: res.items, meta: res.meta };
  },

  /**
   * Simulate a test webhook event (dev-only backend route)
   */
  async simulateWebhook(eventType: string, payload?: Record<string, unknown>): Promise<void> {
    await fetchJson('/api/webhooks/razorpay/simulate', {
      method: 'POST',
      body: JSON.stringify({ event: eventType, payload }),
    });
  },

  /**
   * Health status check
   */
  async getHealth(): Promise<{ status: string; timestamp: string }> {
    return fetchJson<{ status: string; timestamp: string }>('/api/health');
  },

  /**
   * Detailed system subsystem health telemetry
   */
  async getSystemHealth(): Promise<SystemHealthTelemetry> {
    return fetchJson<SystemHealthTelemetry>('/api/health');
  },

  /**
   * Fetch the latest benchmark evaluation report
   */
  async getEvaluation(): Promise<EvaluationReport | null> {
    return fetchJson<EvaluationReport | null>('/api/evaluation');
  },

  /**
   * Execute an authoritative benchmark evaluation run
   */
  async runEvaluation(): Promise<EvaluationReport> {
    return fetchJson<EvaluationReport>('/api/evaluation/run', {
      method: 'POST',
    });
  },

  /**
   * Run a live failure simulation scenario for judges
   */
  async runSimulationScenario(scenario: string, caseId?: string): Promise<ScenarioRunResult> {
    return fetchJson<ScenarioRunResult>('/api/simulation/run-scenario', {
      method: 'POST',
      body: JSON.stringify({ scenario, caseId }),
    });
  },

  /**
   * Manually create a new revenue risk case
   */
  async createCase(payload: {
    customer_name?: string;
    customer_email?: string;
    customer_id?: string;
    payment_id?: string;
    subscription_id?: string;
    amount_at_risk: number;
    currency?: string;
    failure_category: string;
    risk_score: number;
    recovery_probability?: number;
    recovery_reason?: string;
  }): Promise<RecoveryCase> {
    return fetchJson<RecoveryCase>('/api/recovery-cases', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Update mutable fields of an existing recovery case
   */
  async updateCase(
    id: string,
    payload: {
      status?: string;
      risk_score?: number;
      recovery_probability?: number;
      recovery_reason?: string | null;
      recovered_amount?: number | null;
      resolved_at?: string | null;
      customer_name?: string;
      customer_email?: string;
    }
  ): Promise<RecoveryCase> {
    return fetchJson<RecoveryCase>(`/api/recovery-cases/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
};
