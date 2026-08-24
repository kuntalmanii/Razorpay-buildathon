/**
 * services/recovery/recovery.types.ts
 *
 * Types, interfaces, and helpers for the Recovery Action Execution Engine.
 */

import { ActionType, ExecutionStatus, PolicyStatus, ProposedByType } from '../../types/domain';
import { DecisionAction } from '../../agents/recovery/schemas/decision.schema';

export interface ExecuteActionParams {
  caseId: string;
  actionType: ActionType;
  proposedBy: ProposedByType;
  idempotencyKey: string;
  customPayload?: Record<string, unknown>;
  scheduledAt?: Date;
  bypassHumanApprovalForTesting?: boolean;
}

export interface ExecutionResult {
  success: boolean;
  actionId: string;
  caseId: string;
  actionType: ActionType;
  executionStatus: ExecutionStatus;
  policyStatus: PolicyStatus;
  idempotencyKey: string;
  details: Record<string, unknown>;
  verificationPending?: boolean;
  error?: string;
}

export function mapDecisionToDbActionType(decision: DecisionAction): ActionType {
  switch (decision) {
    case 'RETRY':
      return 'retry_payment';
    case 'PAYMENT_LINK':
      return 'create_payment_link';
    case 'WAIT':
      return 'send_payment_reminder';
    case 'ESCALATE':
      return 'escalate_to_human';
    case 'STOP':
      return 'cancel_subscription';
  }
}

/**
 * Generate a deterministic idempotency key for a recovery action.
 */
export function generateActionIdempotencyKey(
  caseId: string,
  actionType: ActionType,
  attemptNumber: number
): string {
  return `recov_${caseId.slice(0, 8)}_${actionType}_att${attemptNumber}_${Math.floor(Date.now() / 60000)}`;
}

/**
 * Execute an asynchronous operation with bounded exponential backoff.
 * Strictly retries only transient network/gateway errors.
 */
export async function withTransientRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    backoffFactor?: number;
    isTransientError?: (err: Error) => boolean;
  } = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  let delay = options.initialDelayMs ?? 500;
  const factor = options.backoffFactor ?? 2;

  const defaultIsTransient = (err: Error): boolean => {
    const msg = err.message.toLowerCase();
    const name = err.name.toLowerCase();
    return (
      name.includes('timeout') ||
      name.includes('abort') ||
      msg.includes('503') ||
      msg.includes('504') ||
      msg.includes('network') ||
      msg.includes('econnreset') ||
      msg.includes('etimedout')
    );
  };

  const isTransient = options.isTransientError ?? defaultIsTransient;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err as Error;

      if (!isTransient(lastError) || attempt === maxRetries) {
        throw lastError;
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= factor;
    }
  }

  throw lastError || new Error('Transient retry exhausted');
}
