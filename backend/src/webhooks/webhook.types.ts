/**
 * webhooks/webhook.types.ts
 *
 * Types for Razorpay webhook payloads, headers, processing states, and handlers.
 */

import { RazorpayPayment, RazorpaySubscription, RazorpayPaymentLink } from '../services/razorpay';

export interface RazorpayWebhookPayload {
  payment?: {
    entity: RazorpayPayment;
  };
  subscription?: {
    entity: RazorpaySubscription;
  };
  payment_link?: {
    entity: RazorpayPaymentLink;
  };
  order?: {
    entity: Record<string, unknown>;
  };
  [key: string]: unknown;
}

export interface RazorpayWebhookEvent<T = RazorpayWebhookPayload> {
  entity: 'event';
  account_id: string;
  event: string;
  contains: string[];
  payload: T;
  created_at: number; // Unix timestamp
}

export type WebhookStatus = 'received' | 'processing' | 'processed' | 'duplicate' | 'skipped' | 'failed';

export interface WebhookIngestParams {
  rawBody: string;
  signature?: string;
  eventId?: string;
  payload: Record<string, unknown>;
}

export interface WebhookProcessingResult {
  status: WebhookStatus;
  eventId: string;
  eventType: string;
  message?: string;
  details?: Record<string, unknown>;
}

export interface WebhookEventHandler {
  readonly supportedEvents: string[];
  handle(event: RazorpayWebhookEvent): Promise<void>;
}
