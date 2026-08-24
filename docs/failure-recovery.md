# Failure Recovery & Resilience Architecture

## Zero Double-Billing & Fault-Tolerant Execution

In automated payment systems, the worst possible failure mode is **charging a customer twice due to a network timeout or duplicate webhook.** RecoverIQ treats failure recovery as a core architectural discipline.

---

## Handled Failure Scenarios & Safeguards

### 1. Duplicate Webhooks (Replay & At-Least-Once Delivery)
- **Failure Mode**: Razorpay's webhook delivery system retries events until an HTTP 200 is acknowledged. High network jitter can result in concurrent identical webhook deliveries.
- **Safeguard**: PostgreSQL unique constraint on `webhook_events.razorpay_event_id`.
- **Behavior**: The first event acquires the database row and processes. The duplicate hits `ON CONFLICT (razorpay_event_id) DO NOTHING`, returning `{ status: 'duplicate' }` and HTTP 200 OK immediately without triggering duplicate case creation or duplicate action execution.

---

### 2. External Gateway 504 Timeouts
- **Failure Mode**: The worker dispatches a payment link or retry request to Razorpay, but the connection times out after 10 seconds with HTTP 504.
- **Safeguard**: **Uncertainty Detection & Two-Phase Verification**.
- **Behavior**:
  1. The worker catches `RazorpayTimeoutError`.
  2. The system does **not** naively re-issue a second charge.
  3. Case is marked with `VERIFICATION_PENDING`.
  4. The `RecoveryVerifier` queries the authoritative gateway resource (`GET /v1/payments/{id}` or `GET /v1/payment_links/{id}`).
  5. Only if confirmed as truly missing is a new idempotent action dispatched.

---

### 3. External Gateway 500 Internal Server Errors
- **Failure Mode**: Transient infrastructure hiccups from bank partners or payment processors.
- **Safeguard**: Bounded exponential backoff with jitter (`withTransientRetry`).
- **Behavior**: Transient errors (500, 502, 503) retry up to 3 times with exponentially increasing delays (500ms $\rightarrow$ 1000ms $\rightarrow$ 2000ms). Fatal errors (400 Bad Request, 401 Unauthorized, 403 Forbidden) fail immediately without wasteful retries.

---

### 4. AI Provider Outage / Latency
- **Failure Mode**: The LLM API times out (> 2500ms) or experiences an upstream service degradation.
- **Safeguard**: **Instant Deterministic Policy Fallback**.
- **Behavior**: The AI call is wrapped in a strict timeout. If exceeded, the engine activates the deterministic recovery matrix instantly. The recovery pipeline never stalls.

---

### 5. AI Malformed Schema / Hallucinations
- **Failure Mode**: Model produces markdown wrappers, commentary, or unparseable JSON.
- **Safeguard**: Strict Zod Schema Parsing in `DecisionParser`.
- **Behavior**: Unparseable text is rejected before reaching the execution layer. A safe rule-based decision is substituted, and an audit warning is recorded.

---

### 6. Payment Captured Out-of-Band During Recovery
- **Failure Mode**: While a payment link is active or a retry is queued, the customer logs into the merchant website and pays via an alternative method.
- **Safeguard**: **Terminal State Defense**.
- **Behavior**: Before executing any scheduled action, `RecoveryExecutor` queries the database and gateway for current payment status. If `payment_status === 'captured'` or `case.status === 'recovered'`, execution is halted immediately with status `skipped`.

---

### 7. Worker Crash & Process Restart
- **Failure Mode**: Worker container is restarted by Kubernetes / orchestrator in the middle of executing a batch of actions.
- **Safeguard**: Transactional State Persistence.
- **Behavior**: Every action is saved with state `executing` and a unique `idempotency_key`. Upon restart, the worker queries unfinished actions, reconciles state with Razorpay, and resumes without duplicate dispatches.

---

## Summary of Guarantees

| Invariant | Guarantee | Enforcement Layer |
|---|---|---|
| **Zero Double-Billing** | A customer is never charged twice for the same debt | Unique `idempotency_key` + Two-Phase Verification |
| **Zero Orphaned Cases** | Every payment failure reaches a verified terminal state | State Machine Engine + Periodic Reconciliation |
| **Immutable Traceability** | Every system action and failure injection is recorded | PostgreSQL `audit_logs` table |
