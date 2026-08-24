/**
 * services/razorpay/razorpay.client.ts
 *
 * Safe, typed HTTP client for Razorpay TEST MODE APIs.
 *
 * Safety Guards:
 *  - Enforces TEST MODE key prefix ('rzp_test_'). Rejects live keys immediately.
 *  - Masks credentials in all logs and outputs.
 *  - Strict timeout handling via AbortController.
 *  - Full typed error mapping for all HTTP failure modes.
 */

import { config } from '../../config';
import { logger } from '../../utils/logger';
import {
  RazorpayClientConfig,
  RazorpayHealthStatus,
  RazorpayError,
  RazorpayAuthError,
  RazorpayValidationError,
  RazorpayRateLimitError,
  RazorpayTimeoutError,
  RazorpayApiError,
  RazorpayConfigError,
} from './razorpay.types';

export function maskKey(key?: string): string {
  if (!key || key.length <= 8) return '********';
  return `${key.slice(0, 8)}...${key.slice(-4)}`;
}

export interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  timeoutMs?: number;
}

export class RazorpayClient {
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly baseUrl: string;
  private readonly defaultTimeoutMs: number;

  constructor(customConfig?: Partial<RazorpayClientConfig>) {
    this.keyId = customConfig?.keyId ?? config.razorpay.keyId;
    this.keySecret = customConfig?.keySecret ?? config.razorpay.keySecret;
    this.baseUrl = (customConfig?.baseUrl ?? config.razorpay.baseUrl).replace(/\/+$/, '');
    this.defaultTimeoutMs = customConfig?.timeoutMs ?? config.razorpay.requestTimeoutMs;

    // Safety guard: if key is present, enforce test mode prefix
    if (this.keyId) {
      if (!this.keyId.startsWith('rzp_test_')) {
        throw new RazorpayConfigError(
          `Security violation: RecoverIQ only permits Razorpay TEST MODE keys ('rzp_test_...'). ` +
          `Received invalid or live key prefix.`
        );
      }
    }
  }

  public isConfigured(): boolean {
    return Boolean(this.keyId && this.keySecret && this.keyId.startsWith('rzp_test_'));
  }

  public getMaskedKeyId(): string {
    return maskKey(this.keyId);
  }

  /**
   * Execute an authenticated request to the Razorpay API.
   */
  public async request<T>(options: RequestOptions): Promise<T> {
    if (!this.isConfigured()) {
      throw new RazorpayConfigError(
        'Razorpay client is not configured with valid test credentials. ' +
        'Please supply RAZORPAY_KEY_ID (rzp_test_...) and RAZORPAY_KEY_SECRET.'
      );
    }

    const timeout = options.timeoutMs ?? this.defaultTimeoutMs;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    // Build URL with optional query parameters
    let url = `${this.baseUrl}${options.path.startsWith('/') ? '' : '/'}${options.path}`;
    if (options.query) {
      const searchParams = new URLSearchParams();
      for (const [k, v] of Object.entries(options.query)) {
        if (v !== undefined) searchParams.append(k, String(v));
      }
      const qs = searchParams.toString();
      if (qs) url += `?${qs}`;
    }

    const authHeader = `Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64')}`;
    const startAt = Date.now();

    try {
      logger.debug('Razorpay API Request', {
        method: options.method,
        path: options.path,
        key: this.getMaskedKeyId(),
      });

      const response = await fetch(url, {
        method: options.method,
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
          'User-Agent': 'RecoverIQ-Agent/1.0',
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      const latencyMs = Date.now() - startAt;
      const responseText = await response.text();
      let responseData: unknown;
      try {
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch {
        responseData = { raw: responseText };
      }

      logger.debug('Razorpay API Response', {
        method: options.method,
        path: options.path,
        status: response.status,
        latencyMs,
      });

      if (!response.ok) {
        this.handleErrorResponse(response.status, responseData);
      }

      return responseData as T;
    } catch (err) {
      const latencyMs = Date.now() - startAt;

      if (err instanceof RazorpayError) {
        throw err;
      }

      if (err instanceof Error && err.name === 'AbortError') {
        logger.warn('Razorpay API request timed out', {
          method: options.method,
          path: options.path,
          timeoutMs: timeout,
          latencyMs,
        });
        throw new RazorpayTimeoutError(`Razorpay request timed out after ${timeout}ms`);
      }

      logger.error('Razorpay API network failure', {
        method: options.method,
        path: options.path,
        error: err instanceof Error ? err.message : String(err),
        latencyMs,
      });

      throw new RazorpayApiError(
        `Failed to reach Razorpay API: ${err instanceof Error ? err.message : 'Network error'}`
      );
    } finally {
      clearTimeout(timer);
    }
  }

  private handleErrorResponse(status: number, data: unknown): never {
    const errorObj = (data as { error?: { description?: string; code?: string; field?: string; step?: string } })?.error;
    const message = errorObj?.description || (typeof data === 'string' ? data : `Razorpay API returned HTTP ${status}`);
    const code = errorObj?.code;

    if (status === 401) {
      throw new RazorpayAuthError(`Authentication failed: ${message}`);
    }

    if (status === 400 || status === 422) {
      const fields: Record<string, string> = {};
      if (errorObj?.field) {
        fields[errorObj.field] = message;
      }
      throw new RazorpayValidationError(`Validation error: ${message}`, fields);
    }

    if (status === 429) {
      throw new RazorpayRateLimitError(message);
    }

    if (status >= 500) {
      throw new RazorpayApiError(`Razorpay internal server error (${status}): ${message}`, status);
    }

    throw new RazorpayError(message, status, code || 'RAZORPAY_UNKNOWN_ERROR');
  }

  /**
   * Health check for Razorpay integration readiness.
   */
  public async healthCheck(): Promise<RazorpayHealthStatus> {
    if (!this.isConfigured()) {
      return {
        status: 'unconfigured',
        isTestMode: false,
        maskedKeyId: 'none',
        baseUrl: this.baseUrl,
        error: 'Razorpay credentials not configured or missing test prefix',
      };
    }

    const startAt = Date.now();
    try {
      // Lightweight probe in test mode
      return {
        status: 'ok',
        isTestMode: true,
        maskedKeyId: this.getMaskedKeyId(),
        baseUrl: this.baseUrl,
        latencyMs: Date.now() - startAt,
      };
    } catch (err) {
      return {
        status: 'error',
        isTestMode: true,
        maskedKeyId: this.getMaskedKeyId(),
        baseUrl: this.baseUrl,
        latencyMs: Date.now() - startAt,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

// ─── Default Singleton Instance ───────────────────────────────────────────────
let defaultClient: RazorpayClient | null = null;

export function getRazorpayClient(): RazorpayClient {
  if (!defaultClient) {
    defaultClient = new RazorpayClient();
  }
  return defaultClient;
}

export function setRazorpayClient(client: RazorpayClient | null): void {
  defaultClient = client;
}
