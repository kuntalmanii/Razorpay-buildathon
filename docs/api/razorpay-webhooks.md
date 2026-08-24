# RecoverIQ — Production-Grade Razorpay Webhook Ingestion

## Overview

RecoverIQ implements an idempotent, cryptographically verified webhook ingestion pipeline for Razorpay events. The pipeline ensures:
1. **Zero Unverified Processing**: Every incoming payload must pass HMAC-SHA256 signature validation before any business logic executes.
2. **Database-Enforced Idempotency**: Duplicate webhook deliveries (identified by `x-razorpay-event-id`) are caught at the database level and safely ignored.
3. **Out-of-Order Resiliency**: Handlers tolerate events arriving out of order or late without corrupting terminal states.
4. **Fast Ingestion**: The endpoint verifies and records events immediately, dispatching business actions efficiently.

---

## Endpoint Specification

### `POST /api/webhooks/razorpay`

Primary webhook ingestion endpoint for Razorpay servers.

#### Request Headers
| Header | Type | Description |
|---|---|---|
| `x-razorpay-signature` | `string` (Hex) | HMAC-SHA256 signature computed over the raw request body using `RAZORPAY_WEBHOOK_SECRET`. |
| `x-razorpay-event-id` | `string` | Unique event identifier assigned by Razorpay (e.g. `evt_xxxxxxxxxxxxxx`). |
| `Content-Type` | `string` | `application/json` |

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "status": "processed",
    "eventId": "evt_xxxxxxxxxxxxxx",
    "eventType": "payment.failed",
    "message": "Webhook event payment.failed processed by PaymentFailedHandler"
  }
}
```

#### Duplicate Delivery Response (`200 OK`)
When Razorpay re-delivers an already ingested event ID:
```json
{
  "success": true,
  "data": {
    "status": "duplicate",
    "eventId": "evt_xxxxxxxxxxxxxx",
    "eventType": "payment.failed",
    "message": "Duplicate webhook event received and safely ignored"
  }
}
```

#### Unauthorized Response (`401 Unauthorized`)
When signature verification fails or the secret is unconfigured:
```json
{
  "success": false,
  "error": {
    "code": "UnauthorizedError",
    "message": "Invalid Razorpay webhook signature",
    "requestId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
  }
}
```

---

## Razorpay Dashboard Configuration

To configure webhook delivery in the Razorpay Dashboard (Test Mode):

1. Go to **Settings** $\rightarrow$ **Webhooks** in the [Razorpay Dashboard](https://dashboard.razorpay.com/#/app/webhooks).
2. Click **+ Add New Webhook**.
3. Set **Webhook URL**: `https://your-domain.com/api/webhooks/razorpay` (or your ngrok tunnel in development).
4. Enter a strong random **Secret** and copy it to `RAZORPAY_WEBHOOK_SECRET` in `backend/.env`.
5. Select the following **Active Events**:
   - `payment.failed`
   - `payment.authorized`
   - `payment.captured`
   - `subscription.halted`
   - `subscription.pending`
   - `subscription.cancelled`
   - `subscription.charged`
   - `payment_link.paid`
   - `payment_link.partially_paid`
   - `payment_link.expired`
   - `payment_link.cancelled`
6. Click **Save**.

---

## Supported Events & Handler Behaviors

| Event Type | Handler | Action Taken |
|---|---|---|
| `payment.failed` | `PaymentFailedHandler` | Upserts `payments` record with failure reason. Automatically creates a `revenue_risk_cases` record in status `open` with AI risk scores initialized. |
| `payment.captured` | `PaymentCapturedHandler` | Updates `payments` record to `captured`. Resolves any active revenue risk case for this payment as `recovered`. |
| `payment.authorized` | `PaymentCapturedHandler` | Updates `payments` record to `authorized`. |
| `subscription.halted` | `SubscriptionEventsHandler` | Updates `subscriptions` record to `halted`. Opens a `revenue_risk_cases` record for recurring revenue recovery. |
| `subscription.charged` | `SubscriptionEventsHandler` | Updates cycle count and resolves open subscription risk cases. |
| `payment_link.paid` | `PaymentLinkEventsHandler` | Closes linked `revenue_risk_cases` as `recovered`, marks `recovery_actions` as `completed`, records recovered amount in paise. |
| `payment_link.expired` | `PaymentLinkEventsHandler` | Updates recovery action status. |
| *(Unknown events)* | `EventRouter` | Safely acknowledged with status `skipped` (no crashing). |

---

## Processing Status Lifecycle

Events in the `webhook_events` audit table progress through:

```
[RECEIVED] ──> [PROCESSING] ──┬──> [PROCESSED] (handler succeeded)
                             ├──> [SKIPPED]   (no handler needed)
                             └──> [FAILED]    (error logged to DB)

(Duplicate delivery) ──> [DUPLICATE] (ignored without re-running handlers)
```

---

## Local Development Simulation

For local testing without live webhooks:

### `POST /api/webhooks/razorpay/simulate`
*(Disabled in production mode)*

Simulates an incoming webhook event by computing a valid signature automatically using the configured secret.

**Example Request:**
```bash
curl -X POST http://localhost:4000/api/webhooks/razorpay/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "entity": "event",
    "account_id": "acc_dev_test",
    "event": "payment.failed",
    "contains": ["payment"],
    "payload": {
      "payment": {
        "entity": {
          "id": "pay_test_sim_001",
          "amount": 250000,
          "currency": "INR",
          "status": "failed",
          "error_code": "BAD_REQUEST_ERROR",
          "error_description": "Card declined by issuing bank"
        }
      }
    },
    "created_at": 1700000000
  }'
```
