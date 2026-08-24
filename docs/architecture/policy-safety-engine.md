# RecoverIQ — Deterministic Recovery Policy & Safety Engine

## Overview

The **Deterministic Recovery Policy & Safety Engine** forms the immutable safety boundary of RecoverIQ.

### Core Philosophy
> **"The AI recommends. The Policy Engine decides."**

No recommendation from an AI model or external event is ever executed directly. Every proposed action must pass through a 100% deterministic, rule-based verification matrix before any recovery action can be scheduled or dispatched.

---

## 1. Core Deterministic Safety Rules

| Rule # | Rule Name | Description | Policy Violation Code |
|---|---|---|---|
| 1 | **Max Recovery Attempts** | Active interventions (retries, payment links) are capped at 2 attempts per case (configurable). Passive actions (`ESCALATE`, `STOP`) are permitted. | `MAX_RECOVERY_ATTEMPTS_EXCEEDED` |
| 2 | **Retry Cooldown** | Automated payment retries (`retry_payment`) must respect a minimum cooldown period (default 24h) between attempts. | `RETRY_COOLDOWN_NOT_ELAPSED` |
| 3 | **Terminal State Protection** | No action is ever permitted on payments that are already `captured` or cases that are `recovered` or `closed`. | `PAYMENT_ALREADY_RECOVERED` |
| 4 | **Customer Opt-Out** | All actions are immediately blocked if the customer has opted out of recovery communications. | `CUSTOMER_OPTED_OUT` |
| 5 | **Duplicate Action In-Progress** | Blocks proposing an action if an identical action type is currently in `scheduled` or `executing` status for that case. | `DUPLICATE_ACTION_IN_PROGRESS` |
| 6 | **High-Value Approval Threshold** | Transactions $\ge$ ₹15,000 (1,500,000 paise) automatically require human merchant approval before execution. | `HIGH_VALUE_REQUIRES_APPROVAL` |
| 7 | **Unknown Category Restriction** | Unclassified failures (`UNKNOWN` / `payment_failure`) cannot trigger aggressive automated retries without prior diagnostic verification. | `UNKNOWN_CATEGORY_RESTRICTED` |
| 8 | **Expired Link Reuse Protection** | Expired payment links must never be re-used; a new link must be created. | `EXPIRED_LINK_REUSE_BLOCKED` |
| 9 | **Valid AI Decision Integrity** | AI output must strictly match permitted actions (`RETRY`, `PAYMENT_LINK`, `WAIT`, `ESCALATE`, `STOP`) and confidence in $[0, 1]$. | `INVALID_AI_DECISION` |
| 10 | **Mandatory Reference Integrity** | Case must reference a valid `payment_id` or `subscription_id`, and have an amount $> 0$. | `MISSING_PAYMENT_OR_SUBSCRIPTION` |

---

## 2. Policy Result Schema

### Allowed Action (with human approval required):
```json
{
  "allowed": true,
  "reason": "Action permitted under policy, but requires merchant human approval prior to execution",
  "requiredApproval": true,
  "violations": [],
  "ruleEvaluations": [...]
}
```

### Blocked Action:
```json
{
  "allowed": false,
  "reason": "Retry cooldown active: 22.0h remaining before next retry is permitted (24h cooldown)",
  "requiredApproval": true,
  "violations": [
    "RETRY_COOLDOWN_NOT_ELAPSED"
  ],
  "ruleEvaluations": [...]
}
```

---

## 3. Adversarial Test Coverage

The policy engine is validated against malicious or hallucinated AI recommendations:

1. **Unlimited Retries**: AI requests a 4th automated retry with 99% confidence $\rightarrow$ Blocked with `MAX_RECOVERY_ATTEMPTS_EXCEEDED`.
2. **Action After Capture**: AI recommends sending a payment link for an already captured payment $\rightarrow$ Blocked with `PAYMENT_ALREADY_RECOVERED`.
3. **Rapid Retries**: AI recommends immediate retry 5 minutes after failure $\rightarrow$ Blocked with `RETRY_COOLDOWN_NOT_ELAPSED`.
4. **Duplicate Actions**: AI recommends a payment link when one is already executing $\rightarrow$ Blocked with `DUPLICATE_ACTION_IN_PROGRESS`.
5. **High-Value Exposure**: AI recommends automatic dispatch for a ₹50,000 transaction $\rightarrow$ Trapped and flagged with `requiredApproval: true`.

---

## 4. Immutable Audit Trail

Every policy evaluation is logged to the `audit_logs` table with action `policy_evaluation_approved` or `policy_evaluation_blocked`, storing:
- `case_id`
- `actor_type: 'system'`, `actor_id: 'policy_engine'`
- Proposed action & approval requirement
- Full list of policy violations and human-readable explanation
