# RecoverIQ — AI Recovery Decision Agent

## Overview

The **AI Recovery Decision Agent** provides bounded, structured reasoning for diagnosing revenue risk cases and recommending the safest next recovery action.

The agent adheres to a strict zero-execution architecture:
1. **Advisory Role Only**: The AI model recommends actions (`RETRY`, `PAYMENT_LINK`, `WAIT`, `ESCALATE`, `STOP`). It cannot execute payments, call Razorpay APIs, move money, or mutate customer records.
2. **Zero Credential Exposure**: The model operates strictly on sanitized, read-only case context. No Razorpay API keys or secrets are ever exposed to the LLM.
3. **Strict Structured Output**: All responses are validated against a rigid JSON schema via Zod.
4. **Deterministic Fallbacks**: If the AI model times out, fails schema validation, is rate-limited, or reports low confidence, the agent immediately applies deterministic, human-approved safety rules.
5. **Immutable Audit Trail**: Every prompt context, response, latency metric, and token count is stored in the `ai_decisions` PostgreSQL table.

---

## 1. Decision Schema

```json
{
  "decision": "RETRY | PAYMENT_LINK | WAIT | ESCALATE | STOP",
  "confidence": 0.82,
  "reasoning_summary": "Card declined by issuing bank. Generating a tailored Razorpay Payment Link allows the customer to complete payment using UPI or Netbanking.",
  "evidence": [
    "Bank decline prevents repeated direct card retries",
    "Payment Link offers multiple payment methods (UPI, Cards, NetBanking)"
  ],
  "customer_message": "Hi Rohan Sharma, your card was declined by your bank. Please use this secure link to retry with UPI or an alternative card.",
  "risk_flags": ["CARD_DECLINED"],
  "requires_human_approval": false
}
```

### Action Semantics

| Action | When Recommended | Safety Guard |
|---|---|---|
| `RETRY` | Transient network or gateway timeouts (`NETWORK_FAILURE`). | Strictly capped at $\le 3$ automated retries. |
| `PAYMENT_LINK` | Bank declines, insufficient funds, expired links, mandate halts. | Amount is locked to original transaction; no arbitrary amounts. |
| `WAIT` | Active bank batch maintenance or awaiting salary credit. | Requires scheduling metadata. |
| `ESCALATE` | High-value enterprise accounts (> ₹50,000) or chronic failure histories. | Requires human merchant review. |
| `STOP` | Customer explicit cancellation or fraud risk. | Halts all automated workflows. |

---

## 2. Safety Guards & Domain Policies

The `DecisionParser` executes automated safety checks on every model output before persistence:

1. **Low Confidence Guard**: If model confidence is below `0.65`, `requires_human_approval` is automatically forced to `true`, and the decision is flagged with `LOW_MODEL_CONFIDENCE`.
2. **Retry Cap Guard**: If the model recommends `RETRY` but the case has already experienced 3 recovery attempts, the action is escalated to `ESCALATE` with `requires_human_approval: true` to prevent infinite retry loops.
3. **Enterprise Transaction Guard**: Transactions above ₹50,000 (5,000,000 paise) automatically require human confirmation before action dispatch.

---

## 3. Pluggable AI Provider Architecture

```
backend/src/agents/recovery/
├── provider/
│   ├── ai-provider.interface.ts     # Generic provider interface
│   ├── mock-provider.ts            # Fast, deterministic offline provider for tests & local dev
│   └── openai-compatible.provider.ts # REST client for OpenAI, Gemini, or local models
├── schemas/
│   └── decision.schema.ts          # Zod schema + TypeScript interfaces
├── prompts/
│   ├── recovery-system.prompt.ts   # System prompt defining AI boundaries & constraints
│   └── prompt-builder.ts           # Token-efficient, sanitized case context formatter
├── tools/
│   └── context-extractor.ts        # Strictly read-only case & customer history assembler
├── decision-parser.ts              # Strict validation, domain safety, and fallback generator
└── recovery-agent.ts               # Core orchestrator
```

---

## 4. Deterministic Fallbacks

When AI inference encounters an issue:

| Trigger | Agent Behavior | Resulting Decision |
|---|---|---|
| Network Timeout (> 10s) | Aborts request safely, logs warning | Fallback `PAYMENT_LINK` or `RETRY` with `FALLBACK_RULE_APPLIED` |
| Malformed JSON output | Strips non-JSON, validates schema | Fallback safe intervention with human approval flag |
| Rate Limit (HTTP 429) / Provider 503 | Catches exception, prevents crash | Fallback decision recorded in `ai_decisions` |
| Schema violation | Rejects invalid fields | Fallback decision with validation details logged |
