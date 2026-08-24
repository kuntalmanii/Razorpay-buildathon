/**
 * agents/recovery/provider/ai-provider.interface.ts
 *
 * Pluggable AI Provider interface allowing seamless switching between LLM providers
 * (OpenAI, Anthropic, Gemini, Local models, or Mock testing providers).
 */

import { AgentInputContext } from '../schemas/decision.schema';

export interface AICompletionResult {
  rawText: string;
  parsedJson?: unknown;
  promptTokens?: number;
  completionTokens?: number;
  latencyMs: number;
}

export interface AIProvider {
  readonly name: string;
  readonly model: string;

  /**
   * Request structured decision reasoning from the LLM.
   */
  generateDecision(
    prompt: string,
    systemPrompt: string,
    context: AgentInputContext,
    timeoutMs?: number
  ): Promise<AICompletionResult>;
}
