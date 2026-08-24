# RecoverIQ — Razorpay Test Mode Integration

## Overview

RecoverIQ integrates directly with the **Razorpay REST API v1** in **TEST MODE ONLY** (`https://api.razorpay.com/v1`).

The integration is built with strong security boundaries:
1. **Strict Test Mode Guard**: Only key IDs starting with `rzp_test_` are permitted. Live credentials (`rzp_live_...`) are rejected at startup / client instantiation to prevent accidental production impact.
2. **Deterministic Service Layer**: AI agents never directly invoke Razorpay APIs. All recovery interactions route through typed backend services.
3. **Dedicated Recovery Mechanism**: Revenue recovery is handled using designated payment instruments (e.g. **Razorpay Payment Links**) rather than assuming simple fetch/capture queries collect money.
4. **Zero Secret Leakage**: `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` are never returned in API responses, never logged, and never sent to the frontend.

---

## Configuration

Set the following in `backend/.env`:

```env
# Razorpay Test Mode Credentials
# Generate at: https://dashboard.razorpay.com/app/keys (in Test Mode)
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_test_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
RAZORPAY_TIMEOUT_MS=10000
```

---

## Architecture & Services

```
backend/src/services/razorpay/
├── razorpay.types.ts           # Entity models, param interfaces, and error hierarchy
├── razorpay.client.ts          # Safe HTTP client, Basic Auth, timeout, masked logging
├── payment.service.ts          # Fetch payments, card details, order payment attempts
├── subscription.service.ts     # Fetch subscriptions and subscription invoices
├── payment-link.service.ts     # Create, fetch, cancel, and generate recovery payment links
└── index.ts                    # Module barrel export
```

---

## Service Operations

### 1. Payment Service (`RazorpayPaymentService`)

Provides read-only query operations for inspecting payment failures:

- `fetchPayment(paymentId: string)`:
  - `GET /v1/payments/{payment_id}`
  - Returns: `RazorpayPayment` (status, amount in paise, error codes, error reason)
- `fetchPaymentCard(paymentId: string)`:
  - `GET /v1/payments/{payment_id}/card`
  - Returns: `RazorpayCardDetails | null` (network, last4, type, issuer)
- `fetchPaymentsForOrder(orderId: string)`:
  - `GET /v1/orders/{order_id}/payments`
  - Returns: `RazorpayPayment[]` (all payment attempts for an order)

### 2. Subscription Service (`RazorpaySubscriptionService`)

Inspects recurring subscription billing status:

- `fetchSubscription(subscriptionId: string)`:
  - `GET /v1/subscriptions/{subscription_id}`
  - Returns: `RazorpaySubscription` (status: `active`, `halted`, `pending`, `cancelled`; cycle counters)
- `fetchSubscriptionInvoices(subscriptionId: string)`:
  - `GET /v1/invoices?subscription_id={subscription_id}`
  - Returns: `RazorpayInvoice[]` (unpaid or issued invoices for the subscription)

### 3. Payment Link Service (`RazorpayPaymentLinkService`)

Designated recovery mechanism for unpaid invoices and failed charges:

- `createPaymentLink(params: CreatePaymentLinkParams)`:
  - `POST /v1/payment_links`
  - Amount specified in **paise** (`50000` = ₹500.00)
  - Configures customer notification (SMS/Email), expiry timestamp, and reference ID.
- `fetchPaymentLink(linkId: string)`:
  - `GET /v1/payment_links/{link_id}`
  - Returns: `RazorpayPaymentLink` (status: `created`, `paid`, `partially_paid`, `cancelled`, `expired`)
- `cancelPaymentLink(linkId: string)`:
  - `POST /v1/payment_links/{link_id}/cancel`
  - Cancels an outstanding link if the case is resolved or expired.
- `createRecoveryPaymentLink(options: CreateRecoveryLinkOptions)`:
  - Tailored RecoverIQ helper attaching `reference_id: recov_<caseId>`, recovery notes, customer contact info, and 48-hour default expiry.

---

## Error Handling Hierarchy

All errors map deterministically to typed subclasses of `RazorpayError`:

| HTTP Status | Exception Class | Description |
|---|---|---|
| `401` | `RazorpayAuthError` | Invalid key ID or secret |
| `400`, `422` | `RazorpayValidationError` | Invalid parameters / schema errors with field breakdown |
| `429` | `RazorpayRateLimitError` | API rate limit exceeded |
| `504` (Timeout) | `RazorpayTimeoutError` | Request timed out after configured ms |
| `500..599` | `RazorpayApiError` | Upstream Razorpay server failure |
| — | `RazorpayConfigError` | Missing credentials or live key supplied in test mode |

---

## Health Check Endpoint

### `GET /api/health/razorpay`

Returns the integration readiness status without exposing raw credentials.

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "isTestMode": true,
    "maskedKeyId": "rzp_test...5678",
    "baseUrl": "https://api.razorpay.com/v1",
    "latencyMs": 12
  }
}
```

**Unconfigured Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "status": "unconfigured",
    "isTestMode": false,
    "maskedKeyId": "none",
    "baseUrl": "https://api.razorpay.com/v1",
    "error": "Razorpay credentials not configured or missing test prefix"
  }
}
```
