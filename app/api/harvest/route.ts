import { NextRequest, NextResponse } from "next/server";
import { chatWithOpenRouter, type ChatMessage } from "@/lib/openrouter";
import {
  OpenRouterGuardError,
  OPENROUTER_GUARD_CONFIG,
  getDailyRequestCount,
  resolveClientKeyFromHeaders,
} from "@/lib/openrouter-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One-shot automation harvest endpoint.
 * NEVER polls OpenRouter internally — external scripts must not retry in a loop.
 * Rate limits + low-token circuit breaker are enforced via lib/openrouter-guard.ts
 */
type HarvestBody = {
  prompt?: string;
  messages?: Array<{ role?: string; content?: string }>;
  max_tokens?: number;
};

function toMessages(body: HarvestBody): ChatMessage[] {
  if (Array.isArray(body.messages)) {
    return body.messages
      .filter(
        (m): m is ChatMessage =>
          (m.role === "system" || m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string" &&
          m.content.trim().length > 0
      )
      .map((m) => ({ role: m.role, content: m.content.trim() }));
  }

  if (typeof body.prompt === "string" && body.prompt.trim()) {
    return [{ role: "user", content: body.prompt.trim() }];
  }

  return [];
}

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      endpoint: "/api/harvest",
      error: "Method not allowed. POST once — do not poll or loop this endpoint.",
      limits: {
        max_daily_requests: OPENROUTER_GUARD_CONFIG.maxDailyRequests,
        max_per_minute: OPENROUTER_GUARD_CONFIG.maxPerMinute,
        max_per_hour: OPENROUTER_GUARD_CONFIG.maxPerHour,
        abort_completion_tokens_at_or_below:
          OPENROUTER_GUARD_CONFIG.abortCompletionTokensAtOrBelow,
        low_token_strike_limit: OPENROUTER_GUARD_CONFIG.lowTokenStrikeLimit,
      },
      hint: "Use POST with { \"prompt\": \"...\" }. If you receive CIRCUIT_BREAKER, stop automation immediately.",
    },
    { status: 405 }
  );
}

export async function POST(request: NextRequest) {
  let body: HarvestBody;
  try {
    body = (await request.json()) as HarvestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const messages = toMessages(body);
  if (messages.length === 0) {
    return NextResponse.json(
      { error: "Provide `prompt` or non-empty `messages`." },
      { status: 400 }
    );
  }

  const clientKey = `harvest:${resolveClientKeyFromHeaders(request.headers)}`;

  try {
    const result = await chatWithOpenRouter(messages, {
      clientKey,
      maxTokens: body.max_tokens ?? 700,
    });

    return NextResponse.json({
      ok: true,
      endpoint: "/api/harvest",
      reply: result.reply,
      model: result.model,
      usage: result.usage ?? null,
      requests_today: getDailyRequestCount(clientKey),
      warning:
        "Single-shot only. Polling this endpoint will hit the daily cap (100) and trip the circuit breaker.",
    });
  } catch (err) {
    if (err instanceof OpenRouterGuardError) {
      const status =
        err.code === "DAILY_CAP" || err.code === "RATE_LIMIT"
          ? 429
          : err.code === "CIRCUIT_BREAKER"
            ? 503
            : 429;
      return NextResponse.json(
        {
          ok: false,
          error: err.message,
          code: err.code,
          abort: true,
          requests_today: getDailyRequestCount(clientKey),
          hint: "Stop the automation script immediately. Do not retry until reset/cooldown.",
        },
        { status }
      );
    }

    const message = err instanceof Error ? err.message : "Harvest request failed.";
    const status = message.includes("not configured") ? 503 : 502;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
