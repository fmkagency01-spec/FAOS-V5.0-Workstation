import {
  classifyIntent,
  routeQuery,
  systemPromptForIntent,
  type AiIntent,
  type AiRoute,
  AI_MODELS,
  MULTI_MODEL_FALLBACK_CHAIN,
} from "@/lib/ai-router";
import {
  getTokenSavingDefaults,
  isTokenSavingMode,
  trimMessagesForTokenSaving,
} from "@/lib/token-saving";
import {
  assertHealthyCompletionTokens,
  assertOpenRouterRequestAllowed,
  OpenRouterGuardError,
  recordOpenRouterRequest,
} from "@/lib/openrouter-guard";
import { formatOpenRouterError } from "@/lib/openrouter-errors";

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

export type ChatRole = "system" | "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type OpenRouterResult = {
  reply: string;
  model: string;
  intent: AiIntent;
  route: AiRoute;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
};

export { classifyIntent, routeQuery, systemPromptForIntent };
export type { AiIntent, AiRoute };

/** @deprecated Use routeQuery() — kept for backward compatibility */
export function resolveModel(query: string): string {
  return routeQuery(query, isTokenSavingMode()).model;
}

export function getOpenRouterApiKey(): string | null {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  return key ? key : null;
}

/** Raw OpenRouter HTTP call — use safeOpenRouterCall() for automation/harvest paths */
async function callOpenRouterApi(
  messages: ChatMessage[],
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    intent?: AiIntent;
  }
): Promise<OpenRouterResult> {
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY is not configured on the server. Set it in Vercel Environment Variables."
    );
  }

  const saving = getTokenSavingDefaults();
  let prepared = trimMessagesForTokenSaving(messages);

  const lastUser = [...prepared].reverse().find((m) => m.role === "user");
  const queryText = lastUser?.content || "";
  const route = routeQuery(queryText, saving.tokenSavingMode);
  const intent = options?.intent || route.intent;

  if (!prepared.some((m) => m.role === "system")) {
    prepared = [{ role: "system", content: systemPromptForIntent(intent) }, ...prepared];
  }

  const model = options?.model || route.model;
  const maxTokens = options?.maxTokens ?? route.maxTokens ?? saving.maxTokens;

  const response = await fetch(OPENROUTER_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer":
        process.env.NEXT_PUBLIC_SITE_URL ||
        "https://faos-v5-0-workstation.vercel.app",
      "X-Title": "FAOSV 5.0 Central ERP Workstation",
    },
    body: JSON.stringify({
      model,
      messages: prepared,
      max_tokens: maxTokens,
      temperature: options?.temperature ?? saving.temperature,
    }),
  });

  if (!response.ok) {
    let detail = `OpenRouter gateway responded ${response.status}`;
    try {
      const errData = (await response.json()) as {
        error?: { message?: string };
      };
      if (errData?.error?.message) detail = errData.error.message;
    } catch {
      /* ignore non-JSON */
    }
    const err = new Error(formatOpenRouterError(detail, response.status));
    (err as Error & { openrouter_status?: number; openrouter_detail?: string }).openrouter_status =
      response.status;
    (err as Error & { openrouter_detail?: string }).openrouter_detail = detail;
    throw err;
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: OpenRouterResult["usage"];
  };

  const reply = data?.choices?.[0]?.message?.content?.trim();
  if (!reply) throw new Error("Empty gateway payload received.");

  return {
    reply,
    model,
    intent,
    route: { ...route, model },
    usage: data.usage,
  };
}

function isMissingEndpointError(message: string): boolean {
  return /no endpoints found/i.test(message) || /model .+ not found/i.test(message);
}

function isTransientProviderError(message: string, status?: number): boolean {
  if (status && status >= 500) return true;
  if (status === 429) return true;
  return /timeout|temporar|unavailable|overloaded|rate.?limit|502|503|504/i.test(
    message
  );
}

function isTokenQuotaError(message: string, status?: number): boolean {
  if (status === 402) return true;
  return /insufficient.*(credit|fund|quota)|quota.?exceeded|billing|out of credits/i.test(
    message
  );
}

function buildFallbackChain(primary: string): string[] {
  const ordered = [primary, ...MULTI_MODEL_FALLBACK_CHAIN, AI_MODELS.safeFallback];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of ordered) {
    if (!m || seen.has(m)) continue;
    seen.add(m);
    out.push(m);
  }
  return out;
}

/**
 * Safety wrapper — daily cap + low-token breaker + multi-model cascade.
 * Ladder: primary → Gemini Pro → Claude 3.5 Sonnet → GPT-4o → GPT-4o Mini.
 */
export async function safeOpenRouterCall(
  messages: ChatMessage[],
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    clientKey?: string;
    intent?: AiIntent;
  }
): Promise<OpenRouterResult> {
  const clientKey = options?.clientKey || "global";

  assertOpenRouterRequestAllowed(clientKey);

  const saving = getTokenSavingDefaults();
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const route = routeQuery(lastUser?.content || "", saving.tokenSavingMode);
  const primary = options?.model || route.model;
  const chain = buildFallbackChain(primary);

  let lastError: unknown = null;

  for (let i = 0; i < chain.length; i += 1) {
    const model = chain[i];
    try {
      const result = await callOpenRouterApi(messages, { ...options, model });
      recordOpenRouterRequest(clientKey);
      assertHealthyCompletionTokens(result.usage, clientKey);
      if (i > 0) {
        console.warn(
          `OpenRouter multi-model fallback succeeded with ${model} (after ${chain[0]})`
        );
      }
      return result;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : "Unknown OpenRouter error";
      console.error("API Error caught in safety wrapper:", message);

      if (error instanceof OpenRouterGuardError) throw error;
      if (/not configured/i.test(message) || /invalid.?api.?key/i.test(message)) {
        throw error;
      }

      const status = (error as Error & { openrouter_status?: number }).openrouter_status;
      const retryable =
        isMissingEndpointError(message) ||
        isTransientProviderError(message, status) ||
        isTokenQuotaError(message, status);

      if (!retryable || i === chain.length - 1) {
        throw error;
      }
      console.warn(`OpenRouter retrying next model in chain (failed: ${model})`);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("All OpenRouter models in fallback chain failed");
}

export async function chatWithOpenRouter(
  messages: ChatMessage[],
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    clientKey?: string;
    intent?: AiIntent;
  }
): Promise<OpenRouterResult> {
  return safeOpenRouterCall(messages, options);
}

export { OpenRouterGuardError };
