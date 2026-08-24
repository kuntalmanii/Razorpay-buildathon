/**
 * services/razorpay/razorpay.types.ts
 *
 * Typed definitions for Razorpay Test Mode integration,
 * response payloads, request parameters, and custom error classes.
 */

// ─── Custom Error Classes ───────────────────────────────────────────────────

export class RazorpayError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, code = 'RAZORPAY_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/** 401 — Invalid Key ID or Key Secret */
export class RazorpayAuthError extends RazorpayError {
  constructor(message = 'Invalid Razorpay credentials or unauthorized') {
    super(message, 401, 'RAZORPAY_AUTH_ERROR');
  }
}

/** 400 — Validation or parameter error from Razorpay API */
export class RazorpayValidationError extends RazorpayError {
  public readonly fields?: Record<string, string>;

  constructor(message: string, fields?: Record<string, string>) {
    super(message, 400, 'RAZORPAY_VALIDATION_ERROR');
    this.fields = fields;
  }
}

/** 429 — Rate limit exceeded on Razorpay API */
export class RazorpayRateLimitError extends RazorpayError {
  constructor(message = 'Razorpay rate limit exceeded. Please retry later.') {
    super(message, 429, 'RAZORPAY_RATE_LIMIT_ERROR');
  }
}

/** Network timeout reaching Razorpay API */
export class RazorpayTimeoutError extends RazorpayError {
  constructor(message = 'Razorpay request timed out') {
    super(message, 504, 'RAZORPAY_TIMEOUT_ERROR');
  }
}

/** 5xx or upstream Razorpay server failure */
export class RazorpayApiError extends RazorpayError {
  constructor(message = 'Razorpay API returned an internal server error', statusCode = 502) {
    super(message, statusCode, 'RAZORPAY_API_ERROR');
  }
}

/** Configuration / Setup Error (e.g. missing test keys, live keys in test mode) */
export class RazorpayConfigError extends RazorpayError {
  constructor(message: string) {
    super(message, 500, 'RAZORPAY_CONFIG_ERROR');
  }
}

// ─── Configuration & Health Types ───────────────────────────────────────────

export interface RazorpayClientConfig {
  keyId: string;
  keySecret: string;
  baseUrl?: string;
  timeoutMs?: number;
}

export interface RazorpayHealthStatus {
  status: 'ok' | 'unconfigured' | 'error';
  isTestMode: boolean;
  maskedKeyId: string;
  baseUrl: string;
  latencyMs?: number;
  error?: string;
}

// ─── Entity Definitions ───────────────────────────────────────────────────────

export interface RazorpayCardDetails {
  id?: string;
  entity?: 'card';
  name?: string;
  last4?: string;
  network?: string;
  type?: 'credit' | 'debit' | 'prepaid' | string;
  issuer?: string;
  international?: boolean;
  emi?: boolean;
  sub_type?: string;
}

export interface RazorpayPayment {
  id: string;
  entity: 'payment';
  amount: number; // in paise
  currency: string;
  status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed';
  order_id?: string | null;
  invoice_id?: string | null;
  international: boolean;
  method: 'card' | 'netbanking' | 'wallet' | 'emi' | 'upi' | string;
  amount_refunded: number;
  refund_status?: string | null;
  captured: boolean;
  description?: string | null;
  card_id?: string | null;
  card?: RazorpayCardDetails | null;
  bank?: string | null;
  wallet?: string | null;
  vpa?: string | null;
  email?: string | null;
  contact?: string | null;
  fee?: number | null;
  tax?: number | null;
  error_code?: string | null;
  error_description?: string | null;
  error_source?: string | null;
  error_step?: string | null;
  error_reason?: string | null;
  created_at: number; // Unix timestamp in seconds
}

export interface RazorpaySubscription {
  id: string;
  entity: 'subscription';
  plan_id: string;
  customer_id?: string | null;
  status: 'created' | 'authenticated' | 'active' | 'pending' | 'halted' | 'cancelled' | 'completed' | 'expired';
  current_start?: number | null;
  current_end?: number | null;
  ended_at?: number | null;
  quantity: number;
  notes?: Record<string, string> | null;
  charge_at?: number | null;
  start_at?: number | null;
  end_at?: number | null;
  total_count?: number | null;
  paid_count: number;
  remaining_count?: number | null;
  auth_attempts?: number;
  short_url?: string | null;
  has_scheduled_changes?: boolean;
  created_at: number;
}

export interface RazorpayPaymentLinkCustomer {
  name?: string;
  email?: string;
  contact?: string;
}

export interface RazorpayPaymentLinkNotify {
  sms?: boolean;
  email?: boolean;
  whatsapp?: boolean;
}

export interface RazorpayPaymentLink {
  id: string;
  entity: 'payment_link';
  short_url: string;
  amount: number; // in paise
  amount_paid?: number;
  currency: string;
  status: 'created' | 'partially_paid' | 'paid' | 'cancelled' | 'expired';
  accept_partial?: boolean;
  first_min_partial_amount?: number;
  expire_by?: number;
  expired_at?: number;
  reference_id?: string;
  description?: string;
  customer?: RazorpayPaymentLinkCustomer;
  notify?: RazorpayPaymentLinkNotify;
  reminder_enable?: boolean;
  notes?: Record<string, string>;
  payments?: RazorpayPayment[] | null;
  created_at: number;
  updated_at?: number;
}

export interface CreatePaymentLinkParams {
  amount: number; // in paise (e.g. 50000 = ₹500.00)
  currency?: string; // defaults to INR
  accept_partial?: boolean;
  first_min_partial_amount?: number;
  description?: string;
  customer?: RazorpayPaymentLinkCustomer;
  notify?: RazorpayPaymentLinkNotify;
  reminder_enable?: boolean;
  expire_by?: number; // Unix timestamp in seconds
  reference_id?: string;
  notes?: Record<string, string>;
}

export interface RazorpayInvoice {
  id: string;
  entity: 'invoice';
  subscription_id?: string | null;
  payment_id?: string | null;
  status: 'draft' | 'issued' | 'paid' | 'cancelled' | 'expired';
  amount: number;
  currency: string;
  description?: string;
  created_at: number;
}
