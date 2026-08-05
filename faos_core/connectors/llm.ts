/**
 * FAOS v6.0 — Unified LLM connector (OpenRouter only; Claude/OpenAI via OpenRouter)
 * Server-side use. Never expose keys to the client.
 */

import {
  chatWithOpenRouter,
  getOpenRouterApiKey,
  type ChatMessage,
  type OpenRouterResult,
} from "@/lib/openrouter";

export type LlmProvider = "openrouter" | "openai_via_openrouter" | "claude_via_openrouter";

export type UnifiedLlmRequest = {
  messages: ChatMessage[];
  clientKey: string;
  model?: string;
  maxTokens?: number;
  provider?: LlmProvider;
};

export type UnifiedLlmResult = OpenRouterResult & {
  provider: LlmProvider;
  unified: true;
};

/** Single entry for all LLM calls in faos_core */
export async function callUnifiedLlm(
  req: UnifiedLlmRequest
): Promise<UnifiedLlmResult> {
  const provider = req.provider || "openrouter";
  const result = await chatWithOpenRouter(req.messages, {
    clientKey: req.clientKey,
    model: req.model,
    maxTokens: req.maxTokens,
  });
  return { ...result, provider, unified: true };
}

export function llmConnectorStatus() {
  return {
    connector: "faos_core/connectors/llm",
    providers: ["openrouter", "openai_via_openrouter", "claude_via_openrouter"] as LlmProvider[],
    openrouter_configured: Boolean(getOpenRouterApiKey()),
    note: "Claude and OpenAI models are routed through OpenRouter — no direct vendor SDKs.",
  };
}
