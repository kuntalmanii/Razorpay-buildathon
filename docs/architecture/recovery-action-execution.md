# RecoverIQ — Recovery Action Execution Engine

## Overview

The **Recovery Action Execution Engine** executes approved recovery actions through Razorpay in Test Mode, enforces deterministic idempotency, handles network/gateway timeouts safely, and authoritatively verifies revenue recovery.

```
AI Reasoning ──> Decision ──> Policy Engine ──> Approved Action ──> Execution Worker ──> Razorpay Service ──> Verification ──> Audit
```

---

## 1. The 10-Step Execution Safety Protocol

Before and during action dispatch, the `RecoveryExecutor` enforces a 10-checkpoint protocol:

```
[1. Check Case State] ───────> Rejects if already recovered or closed
[2. Check Policy] ───────────> Evaluates deterministic PolicyEngine rules
[3. Check Idempotency] ──────> Prevents duplicate execution via unique idempotency_key
[4. Check Payment Status] ───> Halts immediately if payment was already captured
[5. Check Cooldown] ─────────> Enforces retry cooldown timers
[6. Execute Action] ─────────> Dispatches to PaymentLinkRecovery, RetryRecovery, or Escalation
[7. Record Result] ──────────> Persists payload and outcome to recovery_actions table
[8. Verify Outcome] ─────────> Authoritatively verifies resolution with Razorpay/DB
[9. Update Case State] ──────> Advances state machine (ACTION_PENDING -> RECOVERING -> RECOVERED)
[10. Write Audit Log] ───────> Appends immutable audit record to audit_logs
```

---

## 2. Supported Recovery Actions

| Action | DB Action Type | Handler | Execution Behavior |
|---|---|---|---|
| `PAYMENT_LINK` | `create_payment_link` | `PaymentLinkRecovery` | Creates a tailored Razorpay Payment Link locked to the exact amount at risk with automated SMS/email reminders. |
| `RETRY` | `retry_payment` | `RetryRecovery` | Schedules an automated gateway retry following the 24h cooldown timer. |
| `WAIT` | `send_payment_reminder` | `RetryRecovery` | Waits for banking maintenance or salary cycle before triggering communication. |
| `ESCALATE` | `escalate_to_human` | `RecoveryExecutor` | Queues case for merchant account manager review. |
| `STOP` | `cancel_subscription` | `RecoveryExecutor` | Halts recovery workflows due to customer opt-out or exhausted retries. |

---

## 3. Resiliency & Failure Handling Matrix

| Fault Scenario | Engine Handling | Safety Guarantee |
|---|---|---|
| **Razorpay API Timeout** | Catches `RazorpayTimeoutError`, marks status as `verification_pending`. Does NOT blindly re-issue payment links. | Prevents double-billing / duplicate links. |
| **Worker Crash** | Worker resumes by inspecting `scheduled_at` and `idempotency_key`. | Idempotent, safe resumption. |
| **Duplicate Job Arrival** | Caught by `UNIQUE(idempotency_key)` constraint. Returns `{ executionStatus: 'skipped' }`. | Zero duplicate recovery actions. |
| **Pre-captured Payment** | Detects captured status before API call; stops recovery immediately. | Never charges a customer who already paid. |
| **Transient Errors (503/504)** | Bounded exponential backoff retry (max 3 attempts: 500ms, 1s, 2s). | Resilient against temporary switch blips. |
| **Business Rule Failures** | Fails immediately on first attempt without retry. | No endless loops on invalid data. |

---

## 4. Background Workers

```
backend/src/workers/
├── recovery.worker.ts     # Polls approved recovery actions in scheduled state and executes them
├── retry.worker.ts        # Executes scheduled payment retries whose cooldown timers have elapsed
└── verification.worker.ts # Periodically verifies outstanding payment links and captures
```
