# RecoverIQ System Architecture

## Architectural Philosophy: Three-Tier Decoupled Separation

RecoverIQ is built on the strict architectural premise that **AI models should reason and recommend, deterministic policy engines must govern and enforce, and idempotent workers should execute.**

```
                               ┌─────────────────────────────┐
                               │   Razorpay Payment Gateway  │
                               └──────────────┬──────────────┘
                                              │ Webhooks / API
                                              ▼
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │ 1. INGESTION & RISK LAYER                                                               │
 │   • Webhook Verification (HMAC-SHA256 Timing-Safe)                                      │
 │   • Database Deduplication (Unique razorpay_event_id)                                   │
 │   • Deterministic Failure Classification & Explainable Risk Scoring (0-100)            │
 └────────────────────────────────────────────┬───────────────────────────────────────────┘
                                              │ Revenue Risk Case
                                              ▼
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │ 2. AI REASONING LAYER (Strictly Advisory)                                              │
 │   • Recovery Decision Agent                                                             │
 │   • Prompt Sanitization & Injection Defense                                             │
 │   • Structured Output Schema Validation (Zod)                                           │
 │   • Zero Payment API / Money Execution Access                                          │
 └────────────────────────────────────────────┬───────────────────────────────────────────┘
                                              │ Candidate Recommendation
                                              ▼
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │ 3. DETERMINISTIC POLICY & SAFETY ENGINE (Strictly Enforced)                             │
 │   • Attempt Limits (Max 2 attempts per case)                                            │
 │   • Retry Cooldown Enforcement (Configurable window, default 24h)                       │
 │   • Terminal State Protection (No action after settlement or closure)                   │
 │   • High-Value Human Approval Guard (> ₹20,000)                                         │
 │   • Low-Aggression Rules for Unknown Failure Categories                                 │
 └────────────────────────────────────────────┬───────────────────────────────────────────┘
                                              │ Approved Action
                                              ▼
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │ 4. IDEMPOTENT EXECUTION & VERIFICATION LAYER                                            │
 │   • Recovery Orchestrator & Workers                                                     │
 │   • Unique Idempotency Key Constraint (`idempotency_key`)                              │
 │   • Bounded Exponential Backoff on Transient 500s                                       │
 │   • Authoritative State Reconciliation (`GET /payments/{id}`)                          │
 │   • Immutable Audit Logging (`audit_logs`)                                              │
 └────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Deep Dive

### 1. Webhook Ingestion Engine (`backend/src/webhooks/`)
- **HMAC Signature Validation**: `SignatureService.validateSignature` computes HMAC-SHA256 across the raw request body buffer using `crypto.timingSafeEqual` to prevent timing attacks.
- **Database Idempotency**: Inserts into `webhook_events` with `ON CONFLICT (razorpay_event_id) DO NOTHING`. Duplicate deliveries return HTTP 200 OK immediately without triggering downstream handlers.
- **Replay Defense**: Validates that webhook timestamps are within a fresh time window.

### 2. Revenue Risk Engine (`backend/src/services/risk/`)
- **Failure Classification**: Deterministically categorizes failures into:
  - `INSUFFICIENT_FUNDS`
  - `BANK_DECLINED`
  - `NETWORK_FAILURE`
  - `PAYMENT_EXPIRED`
  - `MANDATE_FAILURE`
  - `CUSTOMER_ABANDONED`
  - `UNKNOWN`
- **Explainable Risk Scoring**: Computes a normalized score (0–100) and recovery probability (0.0–1.0) using explainable mathematical weights based on customer lifetime value, historical success rate, failure frequency, and amount at risk.

### 3. AI Recovery Decision Agent (`backend/src/agents/recovery/`)
- **Zero Financial Execution Capability**: The agent has no access to Razorpay credentials, payment dispatch tools, or database mutation endpoints.
- **Prompt Hardening**: `PromptBuilder` sanitizes customer names and context telemetry, neutralizing prompt injection and delimiter breakout attempts.
- **Strict Schema Parsing**: LLM output is validated via `DecisionParser` with Zod schemas. Malformed responses or hallucinations trigger deterministic policy fallbacks automatically.

### 4. Deterministic Policy & Safety Engine (`backend/src/policies/`)
- Aggregates 9 hard financial safety rules.
- Computes `allowed: boolean`, `requiredApproval: boolean`, `violations: PolicyViolationCode[]`, and detailed rule evaluation breakdowns.
- Database Schema Check Constraint (`chk_actions_approved_before_execution`) ensures PostgreSQL itself rejects unapproved actions.

### 5. Recovery Execution & Verification Workers (`backend/src/workers/` & `backend/src/services/recovery/`)
- Dispatches tailored Razorpay Payment Links and scheduled gateway retries.
- Every action carries a cryptographically unique `idempotency_key`.
- Handles 504 Gateway Timeouts by entering `VERIFICATION_PENDING` and verifying true gateway status before retrying, eliminating double billing.
- Writes an immutable record to `audit_logs` for every state transition.

### 6. Modern Frontend Dashboard (`frontend/src/`)
- Built with **Next.js 16.3.2 App Router**, **TypeScript**, **Tailwind CSS**, and **Recharts**.
- Warm off-white / charcoal dark mode aesthetic with subtle Razorpay gold accents.
- Strict 3-Tier Visual Differentiation between AI Recommendation, Policy Decision, and Execution Result.
