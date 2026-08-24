# RecoverIQ — Backend API Reference

## Overview

The RecoverIQ backend exposes a RESTful JSON API for the frontend and internal orchestration services. All responses follow a standardized response envelope.

**Base URL**: `http://localhost:4000` (development) or configured `PORT`.

---

## Standard Response Envelopes

### Success Response (`200 OK`, `207 Multi-Status`)

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "total": 120,
    "page": 1,
    "limit": 20,
    "pages": 6
  }
}
```
*Note: `meta` is included on all paginated listing endpoints.*

### Error Response (`400`, `401`, `403`, `404`, `409`, `422`, `429`, `500`)

```json
{
  "success": false,
  "error": {
    "code": "ValidationError",
    "message": "Invalid pagination parameters",
    "requestId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "fields": {
      "page": "Must be a positive integer"
    }
  }
}
```

---

## Security & Reliability Principles

1. **Request Tracing (`X-Request-ID`)**: Every incoming request receives a unique UUID v4 (or inherits an upstream gateway ID). The ID is returned in response headers as `X-Request-ID` and included in the `error.requestId` payload.
2. **Zero Information Leakage**:
   - Internal database credentials and connection strings are never returned.
   - Stack traces are omitted in responses across all environments.
   - Internal file system paths and third-party API keys are never exposed.
3. **Deterministic Financial Amounts**: All monetary values are represented as integer amounts in **paise** (`BIGINT` serialized as strings in JSON) to prevent IEEE-754 floating-point rounding errors.

---

## Endpoints

### 1. Health Check

#### `GET /api/health`
Lightweight process health and non-blocking database connectivity check.

**Response (`200 OK` or `207 Multi-Status`):**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "recoveriq-backend",
    "timestamp": "2026-08-24T06:30:00.000Z",
    "environment": "development",
    "database": {
      "status": "ok",
      "latency_ms": 3,
      "pool": {
        "total": 5,
        "idle": 4,
        "waiting": 0
      }
    }
  }
}
```

---

### 2. Dashboard Summary

#### `GET /api/dashboard/summary`
Returns high-level recovery metrics and revenue impact summaries.

**Query Parameters:**
- `merchant_id` *(optional, string)*: Filter metrics to a specific merchant.

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "cases": {
      "total": 42,
      "open": 12,
      "in_progress": 8,
      "recovered": 18,
      "unrecoverable": 2,
      "closed": 1,
      "escalated": 1
    },
    "revenue": {
      "total_at_risk_paise": "12500000",
      "total_recovered_paise": "8500000",
      "recovery_rate_pct": 68.00
    }
  }
}
```

---

### 3. Recovery Cases

#### `GET /api/recovery-cases`
List revenue risk cases with filtering and pagination.

**Query Parameters:**
- `page` *(optional, integer, default: `1`)*: Page number (≥ 1).
- `limit` *(optional, integer, default: `20`)*: Items per page (1–100).
- `status` *(optional, enum)*: `open`, `in_progress`, `recovered`, `unrecoverable`, `closed`, `escalated`.
- `failure_category` *(optional, enum)*: `payment_failure`, `subscription_halt`, `bank_decline`, `network_error`, `insufficient_funds`, `card_expired`, `authentication_failure`, `chargeback`, `refund_dispute`, `do_not_honor`.
- `merchant_id` *(optional, string)*: Filter by merchant UUID.

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": [
    {
      "case_id": "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
      "merchant_id": "m1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
      "customer_id": "u1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
      "payment_id": "p1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
      "subscription_id": null,
      "amount_at_risk": "500000",
      "currency": "INR",
      "failure_category": "bank_decline",
      "risk_score": "0.8500",
      "recovery_probability": "0.7200",
      "status": "open",
      "detected_at": "2026-08-23T14:30:00.000Z",
      "resolved_at": null,
      "recovered_amount": "0",
      "recovery_reason": null,
      "created_at": "2026-08-23T14:30:00.000Z",
      "updated_at": "2026-08-23T14:30:00.000Z",
      "merchant_name": "Acme Corp Pvt Ltd",
      "customer_name": "Rohit Sharma",
      "customer_email": "rohit.sharma@example.dev"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "pages": 1
  }
}
```

---

#### `GET /api/recovery-cases/:id`
Retrieve detailed information for a single revenue risk case.

**Path Parameters:**
- `id` *(required, UUID)*: The case ID.

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "case_id": "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
    "merchant_id": "m1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
    "customer_id": "u1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
    "payment_id": "p1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
    "subscription_id": null,
    "amount_at_risk": "500000",
    "currency": "INR",
    "failure_category": "bank_decline",
    "risk_score": "0.8500",
    "recovery_probability": "0.7200",
    "status": "open",
    "detected_at": "2026-08-23T14:30:00.000Z",
    "resolved_at": null,
    "recovered_amount": "0",
    "recovery_reason": null,
    "created_at": "2026-08-23T14:30:00.000Z",
    "updated_at": "2026-08-23T14:30:00.000Z",
    "merchant_name": "Acme Corp Pvt Ltd",
    "customer_name": "Rohit Sharma",
    "customer_email": "rohit.sharma@example.dev"
  }
}
```

**Error (`404 Not Found`):**
```json
{
  "success": false,
  "error": {
    "code": "NotFoundError",
    "message": "Recovery case c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c not found",
    "requestId": "6d39d732-cfff-4aac-bcca-11f20b5f4045"
  }
}
```

---

#### `GET /api/recovery-cases/:id/audit`
Retrieve the complete immutable audit trail for a specific recovery case.

**Path Parameters:**
- `id` *(required, UUID)*: The case ID.

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": [
    {
      "log_id": "l1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
      "entity_type": "revenue_risk_cases",
      "entity_id": "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
      "action": "case_opened",
      "actor_type": "system",
      "actor_id": "risk-detector-v1",
      "before_state": null,
      "after_state": {
        "status": "open"
      },
      "metadata": null,
      "ip_address": null,
      "created_at": "2026-08-23T14:30:00.000Z"
    }
  ]
}
```

---

### 4. Recovery Actions

#### `GET /api/recovery-actions`
List actions proposed and executed across cases.

**Query Parameters:**
- `page` *(optional, integer, default: `1`)*: Page number (≥ 1).
- `limit` *(optional, integer, default: `20`)*: Items per page (1–100).
- `execution_status` *(optional, enum)*: `scheduled`, `executing`, `completed`, `failed`, `cancelled`, `skipped`.
- `case_id` *(optional, UUID)*: Filter actions to a specific case.

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": [
    {
      "action_id": "a1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
      "case_id": "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
      "action_type": "retry_payment",
      "proposed_by": "system",
      "policy_status": "approved",
      "execution_status": "scheduled",
      "idempotency_key": "idm_case1_retry_001",
      "payload": {
        "payment_id": "pay_dev_002",
        "retry_after_seconds": 3600
      },
      "result": null,
      "failure_reason": null,
      "scheduled_at": "2026-08-24T15:30:00.000Z",
      "executed_at": null,
      "created_at": "2026-08-24T14:30:00.000Z",
      "updated_at": "2026-08-24T14:30:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "pages": 1
  }
}
```

---

### 5. Metrics

#### `GET /api/metrics`
Retrieve operational breakdowns over a rolling window.

**Query Parameters:**
- `days` *(optional, integer, default: `30`, min: `1`, max: `365`)*: Aggregation window.

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "cases_by_failure_category": {
      "bank_decline": 5,
      "network_error": 2,
      "subscription_halt": 1
    },
    "actions_by_type": {
      "retry_payment": 6,
      "send_notification": 4,
      "create_payment_link": 2
    },
    "actions_by_execution_status": {
      "scheduled": 3,
      "completed": 8,
      "failed": 1
    },
    "webhooks_by_status": {
      "processed": 25,
      "duplicate": 2
    },
    "period_days": 30
  }
}
```

---

### 6. Webhook Event Logs

#### `GET /api/webhooks/events`
Audit log of received webhook events (payload contents excluded for security).

**Query Parameters:**
- `page` *(optional, integer, default: `1`)*: Page number.
- `limit` *(optional, integer, default: `20`)*: Items per page.
- `event_type` *(optional, string)*: Filter by event name (e.g. `payment.failed`).
- `processing_status` *(optional, enum)*: `received`, `processing`, `processed`, `failed`, `skipped`, `duplicate`.

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": [
    {
      "event_id": "e1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
      "razorpay_event_id": "event_dev_001",
      "event_type": "payment.failed",
      "signature_verified": true,
      "processing_status": "processed",
      "error_message": null,
      "received_at": "2026-08-24T10:00:00.000Z",
      "processed_at": "2026-08-24T10:00:01.000Z",
      "created_at": "2026-08-24T10:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "pages": 1
  }
}
```
