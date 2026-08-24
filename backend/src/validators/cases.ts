/**
 * validators/cases.ts — Validates query parameters for recovery case endpoints.
 */

import { ValidationError } from '../utils/errors';
import { RiskCaseStatus, FailureCategory } from '../types/domain';

const VALID_STATUSES: RiskCaseStatus[] = [
  'open', 'in_progress', 'recovered', 'unrecoverable', 'closed', 'escalated',
];

const VALID_CATEGORIES: FailureCategory[] = [
  'payment_failure', 'subscription_halt', 'chargeback', 'refund_dispute',
  'authentication_failure', 'bank_decline', 'network_error',
  'insufficient_funds', 'card_expired', 'do_not_honor',
];

export interface CasesFilter {
  status?: RiskCaseStatus;
  failure_category?: FailureCategory;
  merchant_id?: string;
}

export function parseCasesFilter(
  query: Record<string, unknown>
): CasesFilter | ValidationError {
  const errors: Record<string, string> = {};
  const filter: CasesFilter = {};

  if (query.status !== undefined) {
    const s = query.status as string;
    if (!VALID_STATUSES.includes(s as RiskCaseStatus)) {
      errors.status = `Must be one of: ${VALID_STATUSES.join(', ')}`;
    } else {
      filter.status = s as RiskCaseStatus;
    }
  }

  if (query.failure_category !== undefined) {
    const fc = query.failure_category as string;
    if (!VALID_CATEGORIES.includes(fc as FailureCategory)) {
      errors.failure_category = `Must be one of: ${VALID_CATEGORIES.join(', ')}`;
    } else {
      filter.failure_category = fc as FailureCategory;
    }
  }

  if (query.merchant_id !== undefined) {
    const mid = query.merchant_id as string;
    // Basic UUID-like check: non-empty string
    if (!mid || mid.trim().length === 0) {
      errors.merchant_id = 'Must be a non-empty string';
    } else {
      filter.merchant_id = mid.trim();
    }
  }

  if (Object.keys(errors).length > 0) {
    return new ValidationError('Invalid filter parameters', errors);
  }

  return filter;
}

export interface ActionsFilter {
  execution_status?: string;
  case_id?: string;
}

export function parseActionsFilter(
  query: Record<string, unknown>
): ActionsFilter | ValidationError {
  const errors: Record<string, string> = {};
  const filter: ActionsFilter = {};

  const VALID_EXEC_STATUSES = ['scheduled', 'executing', 'completed', 'failed', 'cancelled', 'skipped'];

  if (query.execution_status !== undefined) {
    const s = query.execution_status as string;
    if (!VALID_EXEC_STATUSES.includes(s)) {
      errors.execution_status = `Must be one of: ${VALID_EXEC_STATUSES.join(', ')}`;
    } else {
      filter.execution_status = s;
    }
  }

  if (query.case_id !== undefined) {
    const cid = query.case_id as string;
    if (!cid || cid.trim().length === 0) {
      errors.case_id = 'Must be a non-empty string';
    } else {
      filter.case_id = cid.trim();
    }
  }

  if (Object.keys(errors).length > 0) {
    return new ValidationError('Invalid filter parameters', errors);
  }

  return filter;
}
