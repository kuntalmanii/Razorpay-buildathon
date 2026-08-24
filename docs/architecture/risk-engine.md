# RecoverIQ — Deterministic Revenue Risk Engine

## Overview

The **Deterministic Revenue Risk Engine** converts payment and subscription failure events into structured, explainable revenue-risk cases.

The engine operates on strict deterministic principles:
1. **Explainable Risk Scoring (0–100)**: Transparent formulas calculating the loss risk of failed transactions with human-readable contributing factors.
2. **Recovery Probability (0.00–1.00)**: Quantitative estimation of recovery feasibility.
3. **Structured Failure Classification**: Standardized failure categories mapping heterogeneous Razorpay error signals.
4. **Lifecycle State Machine**: Strict enforcement of valid state transitions to guarantee consistency.

---

## 1. Deterministic Failure Categories

Razorpay error signals (error codes, error descriptions, failure reasons, sources, and step metadata) are classified into 7 deterministic failure categories:

| Category | Typical Triggers | Recovery Strategy |
|---|---|---|
| `INSUFFICIENT_FUNDS` | `insufficient_funds`, `low_balance`, `limit_exceeded` | Smart retry scheduled around salary cycles + SMS/WhatsApp notification |
| `BANK_DECLINED` | `do_not_honor`, `card_expired`, `invalid_card`, `issuer_declined` | Payment link offering alternative payment methods (UPI/Netbanking) |
| `NETWORK_FAILURE` | `gateway_error`, `timeout`, `503`, `504`, `connection_error` | Fast automated retry (15m - 2h) |
| `PAYMENT_EXPIRED` | `payment_link.expired`, `session_expired`, `timed_out` | Regenerate payment link with extended validity |
| `MANDATE_FAILURE` | `subscription.halted`, `autopay_failed`, `recurring_auth_failed` | Customer notification to update mandate / alternative card |
| `CUSTOMER_ABANDONED` | `cancelled_by_user`, `user_dropped`, `window_closed` | Cart recovery reminder + offer/discount link |
| `UNKNOWN` | Unrecognized diagnostic signals | Diagnostic inspection & human escalation fallback |

---

## 2. Risk Score & Recovery Probability

### Output Schema

```json
{
  "riskScore": 78,
  "riskScoreNormalized": 0.78,
  "recoveryProbability": 0.72,
  "factors": [
    "High-value enterprise transaction (₹45,000) represents critical revenue risk",
    "Bank decline requires alternative payment method or customer authorization",
    "Customer has strong payment reliability with 4 previous successful payment(s)",
    "Fresh failure (< 2h): optimal recovery window"
  ],
  "failureCategory": "BANK_DECLINED",
  "recommendedUrgency": "critical"
}
```

### Contributing Factors & Weights

1. **Transaction Value**:
   - Micro (< ₹500): `-10`
   - Moderate (₹2,000 – ₹10,000): `+5`
   - High (₹10,000 – ₹50,000): `+15`
   - Enterprise (> ₹50,000): `+25`
2. **Failure Category**:
   - `NETWORK_FAILURE`: `-15` (high baseline recovery)
   - `INSUFFICIENT_FUNDS`: `+5`
   - `BANK_DECLINED`: `+15`
   - `MANDATE_FAILURE`: `+20` (threatens recurring LTV)
3. **Customer History**:
   - First failure for loyal customer ($\ge 5$ successful payments): `-20`
   - Chronic failure history ($\ge 3$ failures): `+25`
   - First-time buyer with no track record: `+10`
4. **Time Elapsed Since Failure**:
   - Fresh (< 2 hours): `-5`
   - Aging (24 – 72 hours): `+8`
   - Stale (> 72 hours): `+15`

---

## 3. Case Lifecycle State Machine

```
[DETECTED] ──> [DIAGNOSED] ──> [ACTION_PENDING] ──> [ACTION_SCHEDULED] ──> [RECOVERING] ──┬──> [RECOVERED] ──> [CLOSED]
     │              │                  │                      │                   │       ├──> [FAILED] ──> [ESCALATED]
     │              │                  │                      │                   │       └──> [ESCALATED]
     └──────────────┴──────────────────┴──────────────────────┴───────────────────┴──────────> [CLOSED]
```

### State Definitions

| State | DB Status | Description |
|---|---|---|
| `DETECTED` | `open` | Initial event recorded from webhook or ingestion. |
| `DIAGNOSED` | `open` | Failure categorized and risk score / factors computed. |
| `ACTION_PENDING` | `in_progress` | Recovery action formulated by policy/AI engine. |
| `ACTION_SCHEDULED` | `in_progress` | Action queued (e.g. smart retry timer or scheduled reminder). |
| `RECOVERING` | `in_progress` | Action executed (e.g. payment link sent, retry initiated). |
| `RECOVERED` | `recovered` | Payment verified as successfully captured/paid. |
| `FAILED` | `unrecoverable` | Recovery attempts exhausted without payment. |
| `ESCALATED` | `escalated` | Handed over for merchant human review. |
| `CLOSED` | `closed` | Terminal state — case archived. |

Invalid transitions (such as transitioning from `CLOSED` back to `DETECTED`, or from `DETECTED` straight to `RECOVERED`) throw an `InvalidStateTransitionError` (HTTP 400).
