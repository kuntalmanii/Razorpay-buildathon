/**
 * agents/recovery/provider/openai-compatible.provider.ts
 *
 * Real LLM Provider using standard JSON-mode chat completion REST API.
 * Compatible with OpenAI, Gemini OpenAI endpoint, Azure, or local Ollama/vLLM.
 */

import { AIProvider, AICompletionResult } from './ai-provider.interface';
import { AgentInputContext } from '../schemas/decision.schema';
import { logger } from '../../../utils/logger';

export interface OpenAIProviderConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  defaultTimeoutMs?: number;
}

export class OpenAICompatibleProvider implements AIProvider {
  public readonly name = 'openai_compatible_engine';
  public readonly model: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultTimeoutMs: number;

  constructor(customConfig?: Partial<OpenAIProviderConfig>) {
    this.apiKey = customConfig?.apiKey ?? process.env.OPENAI_API_KEY ?? '';
    this.model = customConfig?.model ?? process.env.AI_MODEL_NAME ?? 'gpt-4o-mini';
    this.baseUrl = (customConfig?.baseUrl ?? process.env.AI_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/+$/, '');
    this.defaultTimeoutMs = customConfig?.defaultTimeoutMs ?? 15000;
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  public async generateDecision(
    prompt: string,
    systemPrompt: string,
    _context: AgentInputContext,
    timeoutMs?: number
  ): Promise<AICompletionResult> {
    if (!this.isConfigured()) {
      throw new Error('OpenAICompatibleProvider is not configured with an API key');
    }

    const timeout = timeoutMs ?? this.defaultTimeoutMs;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const startAt = Date.now();

    try {
      logger.debug('Executing AI Decision Request', {
        provider: this.name,
        model: this.model,
      });

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0.1, // Near deterministic
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
        }),
        signal: controller.signal,
      });

      const latencyMs = Date.now() - startAt;

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('AI provider returned error', {
          status: response.status,
          latencyMs,
        });
        throw new Error(`AI Provider HTTP ${response.status}: ${errorText.slice(0, 300)}`);
      }

      const json = await response.json() as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };

      const rawText = json.choices?.[0]?.message?.content || '{}';
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(rawText);
      } catch {
        parsedJson = undefined;
      }

      return {
        rawText,
        parsedJson,
        promptTokens: json.usage?.prompt_tokens,
        completionTokens: json.usage?.completion_tokens,
        latencyMs,
      };
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`AI request timed out after ${timeout}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}
