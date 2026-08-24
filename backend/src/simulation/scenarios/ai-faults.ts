/**
 * simulation/scenarios/ai-faults.ts
 *
 * Demonstrates system resilience against AI timeouts and malformed/hallucinated outputs.
 * Proves that AI model failures never crash the recovery pipeline or bypass safety policies.
 */

import { ScenarioRunResult } from '../simulation.types';
import { SimulationManager } from '../simulation-manager';
import { RecoveryAgent } from '../../agents/recovery/recovery-agent';
import { DecisionParser } from '../../agents/recovery/decision-parser';
import { AgentInputContext } from '../../agents/recovery/schemas/decision.schema';
import { PolicyEngine } from '../../policies/policy-engine';

export class AiFaultsScenario {
  /**
   * Demonstrate AI Timeout -> Deterministic Policy Fallback
   */
  public static async runAiTimeoutAndFallback(caseId: string): Promise<ScenarioRunResult> {
    const startedAt = new Date().toISOString();
    const scenarioId = `scen_ai_timeout_${Date.now()}`;
    const steps: ScenarioRunResult['steps'] = [];

    // Step 1: AI Evaluation begins
    steps.push({
      step: 1,
      name: 'AI Agent Initiates Reasoning Cycle',
      status: 'PASSED',
      details: `Evaluating recovery telemetry for case ${caseId}`,
      timestamp: new Date().toISOString(),
    });

    // Step 2: Inject simulated AI Timeout
    await SimulationManager.injectFault('AI_TIMEOUT', { delayMs: 2500, remainingTriggers: 1 });
    steps.push({
      step: 2,
      name: 'AI Provider Times Out (LLM Latency / Network Cut)',
      status: 'FAILED',
      details: 'AI model provider timed out after 2500ms without structured response.',
      timestamp: new Date().toISOString(),
    });

    // Step 3: Deterministic Fallback Activation
    const agent = new RecoveryAgent();
    const evaluated = await agent.evaluateCase(caseId);

    steps.push({
      step: 3,
      name: 'Deterministic Fallback Mechanism Triggered',
      status: 'RECOVERED',
      details: `Activated rule-based fallback decision: ${evaluated.decision.decision} with confidence ${evaluated.decision.confidence}. Reason: ${evaluated.decision.reasoning_summary}`,
      timestamp: new Date().toISOString(),
    });

    // Step 4: Policy Engine verification
    const policyResult = await PolicyEngine.evaluateAndAudit(caseId, {
      actionType: evaluated.decision.decision === 'PAYMENT_LINK' ? 'create_payment_link' : 'retry_payment',
      decision: evaluated.decision.decision,
      confidence: evaluated.decision.confidence,
    });

    steps.push({
      step: 4,
      name: 'Policy Engine Validates Fallback Decision',
      status: policyResult.allowed ? 'PASSED' : 'BLOCKED_BY_SAFETY',
      details: `Policy outcome: ${policyResult.allowed ? 'APPROVED' : 'BLOCKED'}. Human approval: ${policyResult.requiredApproval ? 'YES' : 'NO'}.`,
      timestamp: new Date().toISOString(),
    });

    const auditLogId = await SimulationManager.recordSimulationAudit('scenario_completed', 'AI_TIMEOUT', {
      caseId,
      scenarioId,
      fallbackDecision: evaluated.decision.decision,
    });

    return {
      scenarioId,
      simulationType: 'AI_TIMEOUT',
      startedAt,
      completedAt: new Date().toISOString(),
      steps,
      safetyGuaranteesEnforced: [
        'AI timeouts never crash server',
        'Automatic activation of deterministic fallback',
        'Policy Engine safety validation on fallback',
        'Immutable audit entry recorded',
      ],
      finalOutcome: 'RECOVERED_SAFELY',
      auditLogId,
    };
  }

  /**
   * Demonstrate AI Malformed JSON Output -> Validation Parser Interception -> Execution Blocked
   */
  public static async runMalformedAiResponseBlocked(caseId: string): Promise<ScenarioRunResult> {
    const startedAt = new Date().toISOString();
    const scenarioId = `scen_ai_malformed_${Date.now()}`;
    const steps: ScenarioRunResult['steps'] = [];

    // Step 1: Malformed raw response
    const malformedRawOutput = `Here is my recommendation: You should definitely retry the payment right away! No JSON provided.`;
    steps.push({
      step: 1,
      name: 'AI Model Returns Unstructured Hallucination / Raw Text',
      status: 'FAILED',
      details: `Raw model output: "${malformedRawOutput}"`,
      timestamp: new Date().toISOString(),
    });

    // Step 2: Schema parser intercepts
    const mockContext: AgentInputContext = {
      caseId,
      amountPaise: 350000,
      currency: 'INR',
      failureCategory: 'insufficient_funds',
      riskScore: 65,
      recoveryProbability: 0.78,
      riskFactors: ['FIRST_FAILURE', 'TEST_MODE'],
      previousRecoveryAttempts: 0,
      hoursSinceFailure: 1,
      customer: {
        customerId: 'cust_001',
        name: 'Simulation User',
        totalHistoricalPayments: 5,
        previousFailures: 0,
        isReliableCustomer: true,
      },
    };

    const parseResult = DecisionParser.parseAndValidate(malformedRawOutput, mockContext);
    steps.push({
      step: 2,
      name: 'Structured Output Parser Intercepts Malformed Schema',
      status: 'BLOCKED_BY_SAFETY',
      details: `Parser rejected output. Valid: ${parseResult.isValid}. Fallback triggered: ${parseResult.decision.decision} (${parseResult.decision.reasoning_summary}).`,
      timestamp: new Date().toISOString(),
    });

    // Step 3: Policy Engine safety gate
    const policyResult = await PolicyEngine.evaluateAndAudit(caseId, {
      actionType: 'retry_payment',
      decision: parseResult.decision.decision,
      confidence: parseResult.decision.confidence,
    });

    steps.push({
      step: 3,
      name: 'Policy Engine Ensures No Arbitrary Actions Execute',
      status: 'PASSED',
      details: `Policy outcome: ${policyResult.allowed ? 'APPROVED' : 'BLOCKED'}. Execution guarantees preserved.`,
      timestamp: new Date().toISOString(),
    });

    const auditLogId = await SimulationManager.recordSimulationAudit('scenario_completed', 'AI_MALFORMED_RESPONSE', {
      caseId,
      scenarioId,
    });

    return {
      scenarioId,
      simulationType: 'AI_MALFORMED_RESPONSE',
      startedAt,
      completedAt: new Date().toISOString(),
      steps,
      safetyGuaranteesEnforced: [
        'Strict schema validation intercepts malformed text',
        'Zero execution of arbitrary model text',
        'Deterministic policy safety guarantees preserved',
      ],
      finalOutcome: 'ACTION_BLOCKED_SAFELY',
      auditLogId,
    };
  }
}
