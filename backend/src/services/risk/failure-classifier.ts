/**
 * services/risk/failure-classifier.ts
 *
 * Deterministic classifier mapping raw Razorpay errors, descriptions,
 * event types, and failure reasons into standardized failure categories.
 */

import { DeterministicFailureCategory } from './risk.types';

export interface RawFailureContext {
  errorCode?: string | null;
  errorDescription?: string | null;
  errorReason?: string | null;
  errorSource?: string | null;
  errorStep?: string | null;
  eventType?: string | null;
  paymentMethod?: string | null;
  status?: string | null;
}

export class FailureClassifier {
  /**
   * Classify raw failure signals into a single deterministic failure category.
   */
  public static classifyFailure(ctx: RawFailureContext): DeterministicFailureCategory {
    const code = (ctx.errorCode || '').toLowerCase().trim();
    const desc = (ctx.errorDescription || '').toLowerCase().trim();
    const reason = (ctx.errorReason || '').toLowerCase().trim();
    const event = (ctx.eventType || '').toLowerCase().trim();
    const combinedText = `${code} ${desc} ${reason} ${event}`.trim();

    // 1. Check Mandate / Subscription failure
    if (
      event.includes('subscription.halted') ||
      event.includes('subscription.pending') ||
      combinedText.includes('mandate') ||
      combinedText.includes('autopay') ||
      combinedText.includes('recurring') ||
      combinedText.includes('standing_instruction') ||
      combinedText.includes('auth_failed_subscription')
    ) {
      return 'MANDATE_FAILURE';
    }

    // 2. Check Insufficient Funds
    if (
      combinedText.includes('insufficient') ||
      combinedText.includes('low_balance') ||
      combinedText.includes('low balance') ||
      combinedText.includes('exceeded_limit') ||
      combinedText.includes('limit_exceeded') ||
      combinedText.includes('insufficient_funds') ||
      code === 'insufficient_funds'
    ) {
      return 'INSUFFICIENT_FUNDS';
    }

    // 3. Check Network / Gateway Failure (checked before generic bank terms to catch gateway timeouts)
    if (
      combinedText.includes('gateway_error') ||
      combinedText.includes('gateway error') ||
      combinedText.includes('network') ||
      combinedText.includes('timeout') ||
      combinedText.includes('timed out') ||
      combinedText.includes('connection') ||
      combinedText.includes('server_error') ||
      combinedText.includes('server error') ||
      combinedText.includes('503') ||
      combinedText.includes('504') ||
      combinedText.includes('service_unavailable') ||
      combinedText.includes('unavailable') ||
      ctx.errorSource === 'gateway'
    ) {
      return 'NETWORK_FAILURE';
    }

    // 4. Check Customer Abandoned
    if (
      combinedText.includes('cancelled_by_user') ||
      combinedText.includes('user_dropped') ||
      combinedText.includes('abandoned') ||
      combinedText.includes('back_button') ||
      combinedText.includes('window_closed') ||
      combinedText.includes('checkout_closed') ||
      combinedText.includes('cancelled by user')
    ) {
      return 'CUSTOMER_ABANDONED';
    }

    // 5. Check Payment / Link / Session Expired
    if (
      event.includes('payment_link.expired') ||
      event.includes('payment_link.cancelled') ||
      combinedText.includes('link_expired') ||
      combinedText.includes('link expired') ||
      combinedText.includes('session_expired') ||
      combinedText.includes('session expired') ||
      combinedText.includes('payment expired')
    ) {
      return 'PAYMENT_EXPIRED';
    }

    // 6. Check Bank Declined / Card & Authentication failures
    if (
      combinedText.includes('card_expired') ||
      combinedText.includes('card expired') ||
      combinedText.includes('card expiration') ||
      combinedText.includes('invalid_card') ||
      combinedText.includes('invalid card') ||
      combinedText.includes('security_code') ||
      combinedText.includes('cvv') ||
      combinedText.includes('otp') ||
      combinedText.includes('auth_failed') ||
      combinedText.includes('authentication') ||
      combinedText.includes('do_not_honor') ||
      combinedText.includes('decline') ||
      combinedText.includes('declined') ||
      combinedText.includes('issuer') ||
      combinedText.includes('blocked') ||
      combinedText.includes('bank') ||
      ctx.errorSource === 'bank' ||
      code === 'bad_request_error'
    ) {
      return 'BANK_DECLINED';
    }

    // 7. Fallback
    return 'UNKNOWN';
  }
}
