# RecoverIQ — Live Judge Demonstration Script

**Event:** Razorpay Buildathon  
**Product:** RecoverIQ (Autonomous Revenue Recovery Agent)  
**Target Persona:** Razorpay merchants losing revenue to involuntary churn, mandate halts, and transient network dropoffs.

---

## Executive Pitch (60 Seconds)

> "Every day, subscription and e-commerce merchants lose **10% to 25% of their revenue** to involuntary payment failures—insufficient funds on salary day, mandate dropoffs, expired cards, and transient banking outages.
>
> Today, merchants either do **nothing** (and lose the customer), or use **dumb cron retries** (which annoy customers, trigger bank fraud blocks, and cause accidental double-charging).
>
> **RecoverIQ is the autonomous revenue recovery platform built on Razorpay.** It treats every failed transaction as a revenue-risk case. An AI Reasoning Agent analyzes customer reliability, transaction history, and failure telemetry to recommend optimal interventions. A **Deterministic Policy Safety Engine** enforces strict financial rules—guaranteeing zero double-billing and full regulatory compliance. And background workers execute idempotent recovery actions across Razorpay APIs and Payment Links."

---

## 4 Live Judge Demonstration Scenarios

RecoverIQ includes an interactive **Live Demo Bar** (accessible at the bottom right of every screen) allowing judges to execute and verify these 4 scenarios in real-time.

---

### Scenario 1: End-to-End Recovery Flow
**Goal:** Show autonomous detection, AI reasoning, policy approval, and payment recovery.

1. **Trigger:** Click **Scenario 1: Full Recovery Lifecycle** in the Demo Bar or simulate a `payment.failed` event from the Command Center.
2. **Observe:**
   - Webhook Ingestion engine cryptographically verifies HMAC signature and deduplicates event.
   - Revenue Risk Engine creates Case with deterministic score (e.g. 55/100, 85% recovery probability).
   - AI Reasoning Agent diagnoses failure category (`insufficient_funds` on reliable customer) and recommends `PAYMENT_LINK` with personalized, empathetic messaging copy.
   - Policy Engine validates constraints (attempts $\le 2$, cooldown met, amount below high-value threshold) $\rightarrow$ **APPROVED**.
   - Worker dispatches tailored Razorpay Payment Link.
   - Webhook `payment_link.paid` triggers verified resolution $\rightarrow$ Case transitions to `RECOVERED` with immutable audit log.

---

### Scenario 2: Unsafe AI Recommendation Blocked by Policy
**Goal:** Prove that AI is strictly advisory and can NEVER execute illegal or unsafe financial operations.

1. **Trigger:** Click **Scenario 2: Unsafe AI Recommendation Blocked** in the Demo Bar.
2. **Observe:**
   - AI model attempts to return raw unstructured text / hallucinated action or an aggressive immediate retry violating the 24-hour cooldown rule.
   - Strict Zod Schema Parser catches malformed output and safely falls back to conservative rules.
   - Policy Engine evaluates candidate action against safety rule matrix:
     - Violation Flag: `RETRY_COOLDOWN_NOT_ELAPSED` / `UNKNOWN_CATEGORY_RESTRICTED`.
   - Execution status: `BLOCKED_BY_SAFETY` — **No API call is made to Razorpay, no money moved.**
   - Immutable audit record written with safety violation codes.

---

### Scenario 3: Gateway Timeout & Safe State Verification
**Goal:** Prove resilience against external 504 Gateway Timeouts without double-billing.

1. **Trigger:** Click **Scenario 3: Gateway Timeout & Safe Retry** in the Demo Bar.
2. **Observe:**
   - Recovery worker dispatches action; Razorpay API simulation injects a 504 Gateway Timeout.
   - Zero Double-Charging Guard prevents naive immediate retry.
   - Case enters `VERIFICATION_PENDING` state.
   - Recovery Verifier queries true authoritative state from Razorpay (`GET /payments/{id}`).
   - Once state is verified as truly unsettled, a safe retry is dispatched with a unique `idempotency_key`.
   - Result: Successful recovery without double-charging the customer.

---

### Scenario 4: Duplicate Webhook Delivery Handled Idempotently
**Goal:** Prove database-level deduplication and replay attack defense.

1. **Trigger:** Click **Scenario 4: Duplicate Webhook Defense** in the Demo Bar.
2. **Observe:**
   - Razorpay delivers identical webhook event (`x-razorpay-event-id`) twice in rapid succession.
   - First delivery is ingested and processed.
   - Second delivery hits PostgreSQL unique constraint `ON CONFLICT (razorpay_event_id) DO NOTHING`.
   - Webhook controller returns HTTP 200 OK without spawning duplicate cases or double-dispatching recovery actions.

---

## 5-Minute Guided Tour of the Interface

1. **Command Center (`/dashboard`)**:
   - Real-time KPI Ribbon: Revenue At Risk (₹), Revenue Recovered (₹), Recovery Rate (%), Active Cases, Failed Actions.
   - Recovery Velocity & Revenue Trend Recharts graphs.
   - Critical Case feed with risk scores.
2. **Risk Cases (`/recovery-cases` & `/recovery-cases/[id]`)**:
   - Search, filter by failure category (`insufficient_funds`, `bank_declined`, etc.) and status.
   - 30-second Case Comprehension Detail View showing telemetry, customer reliability, and the 3-Tier Visual Distinction.
3. **AI Decisions & Safety Engine (`/ai-decisions`)**:
   - Real-time decision stream with confidence scores, risk flags, and customer message copy.
   - Explicit visual badges separating: `AI RECOMMENDATION (Advisory)` vs `POLICY DECISION (Enforced)` vs `EXECUTION RESULT (Worker)`.
4. **Audit Trail (`/audit`)**:
   - Immutable chronological ledger tracing every lifecycle event from webhook verification to final payment settlement with correlation IDs and metadata.
5. **Benchmark & Evaluation (`/evaluation`)**:
   - Live empirical benchmark engine with "Run Evaluation" button computing diagnosis accuracy, recovery precision, technical failure resilience, and business impact.
