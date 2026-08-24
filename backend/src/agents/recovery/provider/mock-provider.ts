/**
 * agents/recovery/provider/mock-provider.ts
 *
 * Deterministic Mock AI Provider for hermetic testing, local dev, and offline resilience.
 */

import { AIProvider, AICompletionResult } from './ai-provider.interface';
import { AgentInputContext, RecoveryDecision } from '../schemas/decision.schema';

export class MockAIProvider implements AIProvider {
  public readonly name = 'mock_recovery_engine';
  public readonly model = 'mock-recovery-v1';

  public simulatedError?: Error;
  public simulatedTimeoutMs?: number;
  public customDecisionOverride?: Partial<RecoveryDecision>;
  public malformedResponseText?: string;

  public async generateDecision(
    _prompt: string,
    _systemPrompt: string,
    context: AgentInputContext,
    timeoutMs = 5000
  ): Promise<AICompletionResult> {
    const startAt = Date.now();

    if (this.simulatedError) {
      throw this.simulatedError;
    }

    if (this.simulatedTimeoutMs && this.simulatedTimeoutMs > timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, timeoutMs + 50));
      const err = new Error('AI request timed out');
      err.name = 'AbortError';
      throw err;
    }

    if (this.malformedResponseText) {
      return {
        rawText: this.malformedResponseText,
        promptTokens: 120,
        completionTokens: 40,
        latencyMs: Date.now() - startAt,
      };
    }

    const decision = this.buildDeterministicMockDecision(context);

    if (this.customDecisionOverride) {
      Object.assign(decision, this.customDecisionOverride);
    }

    const rawText = JSON.stringify(decision);

    return {
      rawText,
      parsedJson: decision,
      promptTokens: 250,
      completionTokens: 85,
      latencyMs: Date.now() - startAt,
    };
  }

  private buildDeterministicMockDecision(ctx: AgentInputContext): RecoveryDecision {
    const amountInRupees = Math.round(ctx.amountPaise / 100);

    // Rule 1: High enterprise amount or chronic failures -> Escalate
    if (ctx.amountPaise > 5000000 || ctx.customer.previousFailures >= 4) {
      return {
        decision: 'ESCALATE',
        confidence: 0.85,
        reasoning_summary: `Critical revenue amount (₹${amountInRupees.toLocaleString('en-IN')}) or elevated failure history requires merchant account manager review.`,
        evidence: [
          `Transaction amount: ₹${amountInRupees.toLocaleString('en-IN')}`,
          `Customer failure count: ${ctx.customer.previousFailures}`,
        ],
        customer_message: `Hi ${ctx.customer.name || 'there'}, we encountered an issue processing your transaction. Our team is reviewing this to assist you directly.`,
        risk_flags: ['HIGH_VALUE_EXPOSURE', 'MANUAL_INTERVENTION_RECOMMENDED'],
        requires_human_approval: true,
      };
    }

    // Rule 2: Transient Network failure -> RETRY
    if (ctx.failureCategory === 'NETWORK_FAILURE') {
      return {
        decision: 'RETRY',
        confidence: 0.88,
        reasoning_summary: 'The payment failed due to a transient bank network glitch. An automated retry is safest and has a 90% recovery likelihood.',
        evidence: [
          'Failure categorized as NETWORK_FAILURE',
          'Customer has active payment record with 0 previous chronic failures',
        ],
        customer_message: '', // Internal retry needs no immediate customer ping
        risk_flags: [],
        requires_human_approval: false,
      };
    }

    // Rule 3: Bank Decline -> PAYMENT_LINK with alternative methods
    if (ctx.failureCategory === 'BANK_DECLINED') {
      return {
        decision: 'PAYMENT_LINK',
        confidence: 0.82,
        reasoning_summary: 'Card was declined by issuing bank. Generating a tailored Razorpay Payment Link allows the customer to complete payment using UPI or Netbanking.',
        evidence: [
          'Bank decline prevents repeated direct card retries',
          'Payment Link offers multiple payment methods (UPI, Cards, NetBanking)',
        ],
        customer_message: `Hi ${ctx.customer.name || 'there'}, your card was declined by your bank. Please use this secure link to retry with UPI or an alternative card.`,
        risk_flags: ['CARD_DECLINED'],
        requires_human_approval: false,
      };
    }

    // Rule 4: Insufficient Funds -> PAYMENT_LINK with reminder
    if (ctx.failureCategory === 'INSUFFICIENT_FUNDS') {
      return {
        decision: 'PAYMENT_LINK',
        confidence: 0.80,
        reasoning_summary: 'Customer experienced an insufficient balance failure. Sending a payment link with gentle reminder enables payment upon funds reload.',
        evidence: [
          'Failure category is INSUFFICIENT_FUNDS',
          `Customer historical payments: ${ctx.customer.totalHistoricalPayments}`,
        ],
        customer_message: `Hi ${ctx.customer.name || 'there'}, we noticed your recent payment could not be processed due to balance limits. You can complete it securely here.`,
        risk_flags: ['LOW_BALANCE'],
        requires_human_approval: false,
      };
    }

    // Default fallback -> PAYMENT_LINK
    return {
      decision: 'PAYMENT_LINK',
      confidence: 0.75,
      reasoning_summary: `Recommend issuing a Razorpay recovery payment link for ₹${amountInRupees.toLocaleString('en-IN')} to resolve the failed transaction.`,
      evidence: [
        `Amount at risk: ₹${amountInRupees.toLocaleString('en-IN')}`,
        `Failure category: ${ctx.failureCategory}`,
      ],
      customer_message: `Hi ${ctx.customer.name || 'there'}, please complete your payment of ₹${amountInRupees.toLocaleString('en-IN')} using our secure link.`,
      risk_flags: [],
      requires_human_approval: false,
    };
  }
}
