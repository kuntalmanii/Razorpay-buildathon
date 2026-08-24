/**
 * services/recovery/recovery-orchestrator.ts
 *
 * End-to-end recovery orchestrator coordinating:
 *  AI Decision -> Policy Evaluation -> Approved Execution -> Verification -> Audit
 */

import { RecoveryAgent } from '../../agents/recovery/recovery-agent';
import { RecoveryExecutor } from './recovery-executor';
import { mapDecisionToDbActionType, generateActionIdempotencyKey, ExecutionResult } from './recovery.types';
import { logger } from '../../utils/logger';

export interface OrchestrationResult {
  caseId: string;
  decisionId: string;
  aiDecision: {
    decision: string;
    confidence: number;
    reasoning_summary: string;
    customer_message?: string;
  };
  execution: ExecutionResult;
}

export class RecoveryOrchestrator {
  private readonly agent: RecoveryAgent;

  constructor(agent?: RecoveryAgent) {
    this.agent = agent || new RecoveryAgent();
  }

  /**
   * Run the full AI -> Policy -> Execution -> Verification recovery cycle on a case.
   */
  public async orchestrateCaseRecovery(caseId: string): Promise<OrchestrationResult> {
    logger.info(`Starting end-to-end recovery orchestration for case ${caseId}`);

    // Step 1: AI reasoning & action recommendation
    const aiResponse = await this.agent.evaluateCase(caseId);
    const proposedDecision = aiResponse.decision;

    // Step 2: Map to database action type
    const actionType = mapDecisionToDbActionType(proposedDecision.decision);

    // Step 3: Generate deterministic idempotency key
    const idempotencyKey = generateActionIdempotencyKey(caseId, actionType, 1);

    // Step 4: Execute through the 10-step Policy & Safety Executor
    const execution = await RecoveryExecutor.executeAction({
      caseId,
      actionType,
      proposedBy: 'ai',
      idempotencyKey,
      customPayload: {
        decision: proposedDecision.decision,
        confidence: proposedDecision.confidence,
        customerMessage: proposedDecision.customer_message,
        reasoningSummary: proposedDecision.reasoning_summary,
      },
    });

    logger.info(`Recovery orchestration finished for case ${caseId}`, {
      actionType,
      status: execution.executionStatus,
      success: execution.success,
    });

    return {
      caseId,
      decisionId: aiResponse.decisionId,
      aiDecision: {
        decision: proposedDecision.decision,
        confidence: proposedDecision.confidence,
        reasoning_summary: proposedDecision.reasoning_summary,
        customer_message: proposedDecision.customer_message,
      },
      execution,
    };
  }
}
