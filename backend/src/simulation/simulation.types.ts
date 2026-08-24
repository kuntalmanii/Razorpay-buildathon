/**
 * simulation/simulation.types.ts
 *
 * Types for development-only failure simulation and recovery verification.
 * STRICTLY DISABLED IN PRODUCTION ENVIRONMENTS.
 */

export type SimulationType =
  | 'RAZORPAY_TIMEOUT'
  | 'RAZORPAY_500_ERROR'
  | 'AI_TIMEOUT'
  | 'AI_MALFORMED_RESPONSE'
  | 'DUPLICATE_WEBHOOK'
  | 'WEBHOOK_PROCESSING_DELAY'
  | 'WORKER_CRASH_RESTART'
  | 'PAYMENT_ALREADY_SUCCESSFUL'
  | 'RECOVERY_ACTION_DUPLICATED';

export interface ActiveFaultConfig {
  type: SimulationType;
  enabled: boolean;
  delayMs?: number;
  remainingTriggers?: number;
  metadata?: Record<string, unknown>;
  injectedAt: string;
}

export interface ScenarioRunResult {
  scenarioId: string;
  simulationType: SimulationType;
  startedAt: string;
  completedAt: string;
  steps: Array<{
    step: number;
    name: string;
    status: 'PASSED' | 'FAILED' | 'RECOVERED' | 'BLOCKED_BY_SAFETY';
    details: string;
    timestamp: string;
  }>;
  safetyGuaranteesEnforced: string[];
  finalOutcome: 'RECOVERED_SAFELY' | 'ACTION_BLOCKED_SAFELY' | 'DUPLICATE_PREVENTED';
  auditLogId?: string;
}
