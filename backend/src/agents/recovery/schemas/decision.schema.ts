/**
 * agents/recovery/schemas/decision.schema.ts
 *
 * Zod schema and TypeScript interfaces for structured AI Recovery Decisions.
 */

import { z } from 'zod';

export const DecisionActionEnum = z.enum([
  'RETRY',
  'PAYMENT_LINK',
  'WAIT',
  'ESCALATE',
  'STOP',
]);

export type DecisionAction = z.infer<typeof DecisionActionEnum>;

export const RecoveryDecisionSchema = z.object({
  decision: DecisionActionEnum,
  confidence: z
    .number()
    .min(0, 'Confidence must be between 0 and 1')
    .max(1, 'Confidence must be between 0 and 1'),
  reasoning_summary: z
    .string()
    .min(10, 'Reasoning summary must be at least 10 characters')
    .max(1000, 'Reasoning summary must be under 1000 characters'),
  evidence: z
    .array(z.string())
    .min(1, 'At least one piece of evidence must be cited'),
  customer_message: z
    .string()
    .max(1000, 'Customer message must be under 1000 characters')
    .optional()
    .default(''),
  risk_flags: z
    .array(z.string())
    .optional()
    .default([]),
  requires_human_approval: z
    .boolean()
    .default(false),
});

export type RecoveryDecision = z.infer<typeof RecoveryDecisionSchema>;

export interface AgentInputContext {
  caseId: string;
  amountPaise: number;
  currency: string;
  failureCategory: string;
  riskScore: number;
  recoveryProbability: number;
  riskFactors: string[];
  customer: {
    customerId?: string;
    name?: string;
    totalHistoricalPayments: number;
    previousFailures: number;
    isReliableCustomer: boolean;
  };
  subscription?: {
    subscriptionId: string;
    status: string;
    paidCount: number;
  };
  previousRecoveryAttempts: number;
  hoursSinceFailure: number;
}
