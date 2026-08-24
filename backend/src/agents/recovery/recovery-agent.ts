/**
 * agents/recovery/recovery-agent.ts
 *
 * Core AI Recovery Decision Agent orchestrating:
 *  - Read-only context gathering (zero credentials exposed to LLM)
 *  - Pluggable AI reasoning execution with timeout guards
 *  - Strict schema validation & domain safety policy checks
 *  - Immutable decision persistence to `ai_decisions`
 *  - Deterministic fallbacks for rate limits, timeouts, and malformed outputs
 */

import { AIProvider } from './provider/ai-provider.interface';
import { MockAIProvider } from './provider/mock-provider';
import { OpenAICompatibleProvider } from './provider/openai-compatible.provider';
import { CaseContextExtractor } from './tools/context-extractor';
import { PromptBuilder } from './prompts/prompt-builder';
import { RECOVERY_AGENT_SYSTEM_PROMPT } from './prompts/recovery-system.prompt';
import { DecisionParser, ParseDecisionResult } from './decision-parser';
import { AgentInputContext, RecoveryDecision } from './schemas/decision.schema';
import { getPool } from '../../database/connection';
import { RevenueRiskService } from '../../services/risk/revenue-risk.service';
import { logger } from '../../utils/logger';

export interface AgentEvaluationResponse {
  decisionId: string;
  caseId: string;
  decision: RecoveryDecision;
  isFallback: boolean;
  modelProvider: string;
  modelName: string;
  latencyMs: number;
  tokens?: {
    prompt?: number;
    completion?: number;
  };
}

export class RecoveryAgent {
  private readonly provider: AIProvider;

  constructor(provider?: AIProvider) {
    if (provider) {
      this.provider = provider;
    } else {
      const openAiProvider = new OpenAICompatibleProvider();
      this.provider = openAiProvider.isConfigured() ? openAiProvider : new MockAIProvider();
    }
  }

  /**
   * Evaluate a revenue risk case and generate a validated, audited recovery recommendation.
   */
  public async evaluateCase(caseId: string): Promise<AgentEvaluationResponse> {
    const startAt = Date.now();
    logger.info(`Starting AI recovery evaluation for case ${caseId}`);

    // Step 1: Read-only context extraction
    const context: AgentInputContext = await CaseContextExtractor.extractContext(caseId);

    // Step 2: Assemble sanitized prompt (no credentials or internal secrets)
    const userPrompt = PromptBuilder.buildUserPrompt(context);

    // Step 3: Execute AI inference with fallback handling
    let rawOutput: unknown;
    let latencyMs = 0;
    let promptTokens: number | undefined;
    let completionTokens: number | undefined;
    let parseResult: ParseDecisionResult;

    try {
      const completion = await this.provider.generateDecision(
        userPrompt,
        RECOVERY_AGENT_SYSTEM_PROMPT,
        context,
        10000 // 10s timeout
      );

      rawOutput = completion.rawText;
      latencyMs = completion.latencyMs;
      promptTokens = completion.promptTokens;
      completionTokens = completion.completionTokens;

      // Step 4: Parse & validate model response against strict schema
      parseResult = DecisionParser.parseAndValidate(rawOutput, context);
    } catch (err) {
      const errorMsg = (err as Error).message;
      logger.warn(`AI Provider failed for case ${caseId} — applying deterministic fallback: ${errorMsg}`);

      latencyMs = Date.now() - startAt;
      parseResult = {
        isValid: false,
        decision: DecisionParser.createFallbackDecision(context, `AI Provider error: ${errorMsg}`),
        validationError: errorMsg,
        isFallback: true,
      };
      rawOutput = { error: errorMsg, fallbackTriggered: true };
    }

    // Step 5: Save immutable decision record in PostgreSQL `ai_decisions`
    const pool = getPool();
    const insertRes = await pool.query<{ decision_id: string }>(`
      INSERT INTO ai_decisions (
        case_id,
        model_provider,
        model_name,
        decision_type,
        structured_input,
        structured_output,
        confidence,
        prompt_tokens,
        completion_tokens,
        latency_ms
      ) VALUES ($1, $2, $3, 'action_recommendation', $4, $5, $6, $7, $8, $9)
      RETURNING decision_id;
    `, [
      caseId,
      this.provider.name,
      this.provider.model,
      JSON.stringify(context),
      JSON.stringify(parseResult.decision),
      parseResult.decision.confidence,
      promptTokens || null,
      completionTokens || null,
      latencyMs,
    ]);

    const decisionId = insertRes.rows[0].decision_id;

    // Step 6: Advance case state to ACTION_PENDING
    try {
      await RevenueRiskService.transitionCase(
        caseId,
        'DIAGNOSED',
        'ACTION_PENDING',
        `AI recommended action: ${parseResult.decision.decision} (confidence: ${parseResult.decision.confidence})`,
        'ai_recovery_agent'
      );
    } catch (stateErr) {
      logger.debug(`Case state transition note: ${(stateErr as Error).message}`);
    }

    logger.info(`AI evaluation complete for case ${caseId}`, {
      decision: parseResult.decision.decision,
      confidence: parseResult.decision.confidence,
      isFallback: parseResult.isFallback,
      decisionId,
    });

    return {
      decisionId,
      caseId,
      decision: parseResult.decision,
      isFallback: parseResult.isFallback,
      modelProvider: this.provider.name,
      modelName: this.provider.model,
      latencyMs,
      tokens: {
        prompt: promptTokens,
        completion: completionTokens,
      },
    };
  }
}
