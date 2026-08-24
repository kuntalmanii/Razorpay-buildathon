/**
 * agents/recovery/prompts/prompt-builder.ts
 *
 * Sanitizes and structures input context into a clean, minimal user prompt for the AI model.
 */

import { AgentInputContext } from '../schemas/decision.schema';

export class PromptBuilder {
  /**
   * Build a sanitized, token-efficient prompt string from the recovery context.
   */
  public static buildUserPrompt(ctx: AgentInputContext): string {
    const amountInRupees = (ctx.amountPaise / 100).toFixed(2);

    const subscriptionSection = ctx.subscription
      ? `\nSubscription Details:\n- Status: ${ctx.subscription.status}\n- Billing cycles paid: ${ctx.subscription.paidCount}`
      : '\nTransaction Type: One-time payment';

    return `
Analyze the following revenue risk case and recommend the safest recovery intervention:

Case Information:
- Case Reference: ${ctx.caseId}
- Amount at Risk: ₹${amountInRupees} ${ctx.currency}
- Classified Failure Category: ${ctx.failureCategory}
- Risk Score: ${ctx.riskScore}/100
- Recovery Probability: ${(ctx.recoveryProbability * 100).toFixed(0)}%
- Hours Elapsed Since Failure: ${ctx.hoursSinceFailure.toFixed(1)}h
- Previous Recovery Interventions Tried: ${ctx.previousRecoveryAttempts}
${subscriptionSection}

Customer Profile:
- Customer Name: ${ctx.customer.name || 'Anonymous Customer'}
- Historical Successful Payments: ${ctx.customer.totalHistoricalPayments}
- Historical Failed Payments: ${ctx.customer.previousFailures}
- Reliability Status: ${ctx.customer.isReliableCustomer ? 'Reliable Historical Customer' : 'Unverified/New Customer'}

Risk Factors Identified:
${ctx.riskFactors.map((f) => `- ${f}`).join('\n')}

Respond ONLY with the JSON object conforming to the Recovery Decision schema.
`.trim();
  }
}
