/**
 * agents/recovery/prompts/prompt-builder.ts
 *
 * Sanitizes and structures input context into a clean, minimal user prompt for the AI model.
 * Implements strict defense against Prompt Injection and delimiter breakout attacks.
 */

import { AgentInputContext } from '../schemas/decision.schema';

/**
 * Sanitize untrusted user/customer strings to prevent prompt injection breakouts.
 */
export function sanitizePromptString(input?: string | null, maxLength = 60): string {
  if (!input || typeof input !== 'string') return 'Anonymous Customer';

  // Strip newlines, control characters, brackets, backticks, and common prompt injection markers
  const sanitized = input
    .replace(/[\r\n\t\f\v]/g, ' ')
    .replace(/[`${}[\]<>]/g, '')
    .replace(/\b(system|assistant|override|ignore|instructions?)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (sanitized.length === 0) return 'Anonymous Customer';
  return sanitized.slice(0, maxLength);
}

export class PromptBuilder {
  /**
   * Build a sanitized, token-efficient prompt string from the recovery context.
   */
  public static buildUserPrompt(ctx: AgentInputContext): string {
    const amountInRupees = (ctx.amountPaise / 100).toFixed(2);
    const sanitizedCustomerName = sanitizePromptString(ctx.customer.name, 50);

    const subscriptionSection = ctx.subscription
      ? `\nSubscription Details:\n- Status: ${sanitizePromptString(ctx.subscription.status, 20)}\n- Billing cycles paid: ${ctx.subscription.paidCount}`
      : '\nTransaction Type: One-time payment';

    const sanitizedRiskFactors = (ctx.riskFactors || [])
      .map((f) => `- ${sanitizePromptString(f, 60)}`)
      .join('\n');

    return `
Analyze the following revenue risk case and recommend the safest recovery intervention:

Case Information:
- Case Reference: ${sanitizePromptString(ctx.caseId, 40)}
- Amount at Risk: ₹${amountInRupees} ${ctx.currency}
- Classified Failure Category: ${sanitizePromptString(ctx.failureCategory, 40)}
- Risk Score: ${ctx.riskScore}/100
- Recovery Probability: ${(ctx.recoveryProbability * 100).toFixed(0)}%
- Hours Elapsed Since Failure: ${ctx.hoursSinceFailure.toFixed(1)}h
- Previous Recovery Interventions Tried: ${ctx.previousRecoveryAttempts}
${subscriptionSection}

Customer Profile:
- Customer Name: ${sanitizedCustomerName}
- Historical Successful Payments: ${ctx.customer.totalHistoricalPayments}
- Historical Failed Payments: ${ctx.customer.previousFailures}
- Reliability Status: ${ctx.customer.isReliableCustomer ? 'Reliable Historical Customer' : 'Unverified/New Customer'}

Risk Factors Identified:
${sanitizedRiskFactors || '- Standard payment failure'}

Respond ONLY with the JSON object conforming to the Recovery Decision schema.
`.trim();
  }
}
