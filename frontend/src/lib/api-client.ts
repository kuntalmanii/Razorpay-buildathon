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
} from '../types/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
    return fetchJson<DashboardSummary>('/api/dashboard/summary');
  },

  /**
   * Fetch paginated list of revenue risk cases
   */
  async getRecoveryCases(params?: {
    page?: number;
    limit?: number;
    status?: string;
    failureCategory?: string;
  }): Promise<{ cases: RecoveryCase[]; meta: PaginationMeta }> {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', params.page.toString());
    if (params?.limit) q.set('limit', params.limit.toString());
    if (params?.status) q.set('status', params.status);
    if (params?.failureCategory) q.set('failureCategory', params.failureCategory);

    const queryStr = q.toString() ? `?${q.toString()}` : '';
    const res = await fetchPaginated<RecoveryCase>(`/api/recovery-cases${queryStr}`);
    return { cases: res.items, meta: res.meta };
  },

  /**
   * Fetch a single recovery case by ID
   */
  async getRecoveryCase(caseId: string): Promise<RecoveryCase> {
    return fetchJson<RecoveryCase>(`/api/recovery-cases/${encodeURIComponent(caseId)}`);
  },

  /**
   * Fetch audit trail logs for a specific case
   */
  async getCaseAudit(caseId: string): Promise<AuditLog[]> {
    return fetchJson<AuditLog[]>(`/api/recovery-cases/${encodeURIComponent(caseId)}/audit`);
  },

  /**
   * Fetch recovery actions
   */
  async getRecoveryActions(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<{ actions: RecoveryAction[]; meta: PaginationMeta }> {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', params.page.toString());
    if (params?.limit) q.set('limit', params.limit.toString());
    if (params?.status) q.set('status', params.status);

    const queryStr = q.toString() ? `?${q.toString()}` : '';
    const res = await fetchPaginated<RecoveryAction>(`/api/recovery-actions${queryStr}`);
    return { actions: res.items, meta: res.meta };
  },

  /**
   * Fetch historical revenue recovery analytics
   */
  async getMetrics(days = 14): Promise<MetricsSummary> {
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
};
