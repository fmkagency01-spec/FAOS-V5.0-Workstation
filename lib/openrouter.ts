const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

export type ChatRole = "system" | "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type OpenRouterResult = {
  reply: string;
  model: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
};

const STRATEGY_TRIGGERS = [
  "/strategy",
  "/plan",
  "/analyze",
  "strategy",
  "roadmap",
  "forecast",
  "vision",
  "acquisition",
];

const MODEL_ROUTES = {
  automation: "nousresearch/hermes-3-llama-3.1-405b",
  strategy: "anthropic/claude-sonnet-4.5",
} as const;

export function resolveModel(query: string): string {
  const q = query.toLowerCase();
  return STRATEGY_TRIGGERS.some((t) => q.includes(t))
    ? MODEL_ROUTES.strategy
    : MODEL_ROUTES.automation;
}

export function getOpenRouterApiKey(): string | null {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  return key ? key : null;
}

export async function chatWithOpenRouter(
  messages: ChatMessage[],
  options?: { model?: string; maxTokens?: number; temperature?: number }
): Promise<OpenRouterResult> {
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY is not configured on the server. Set it in Vercel Environment Variables."
    );
  }

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const model = options?.model || resolveModel(lastUser?.content || "");

  const response = await fetch(OPENROUTER_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer":
        process.env.NEXT_PUBLIC_SITE_URL || "https://faos-v5-0-workstation.vercel.app",
      "X-Title": "FAOSV 5.0 Central ERP Workstation",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: options?.maxTokens ?? 700,
      temperature: options?.temperature ?? 0.4,
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
    throw new Error(detail);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: OpenRouterResult["usage"];
  };

  const reply = data?.choices?.[0]?.message?.content?.trim();
  if (!reply) throw new Error("Empty gateway payload received.");

  return { reply, model, usage: data.usage };
}
