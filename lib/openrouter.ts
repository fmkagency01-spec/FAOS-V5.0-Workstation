import {
  classifyIntent,
  routeQuery,
  systemPromptForIntent,
  type AiIntent,
  type AiRoute,
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
    throw new Error(formatOpenRouterError(detail, response.status));
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

/**
 * Safety wrapper for automation / harvest — daily cap + low-token loop breaker.
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

  try {
    const result = await callOpenRouterApi(messages, options);
    recordOpenRouterRequest(clientKey);
    assertHealthyCompletionTokens(result.usage, clientKey);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown OpenRouter error";
    console.error("API Error caught in safety wrapper:", message);
    throw error;
  }
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
