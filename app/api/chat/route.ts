import { NextRequest, NextResponse } from "next/server";
import {
  chatWithOpenRouter,
  routeQuery,
  type ChatMessage,
} from "@/lib/openrouter";
import {
  OpenRouterGuardError,
  resolveClientKeyFromHeaders,
} from "@/lib/openrouter-guard";
import type { AiIntent } from "@/lib/ai-router";
import { isTokenSavingMode } from "@/lib/token-saving";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatBody = {
  message?: string;
  messages?: ChatMessage[];
  /** Force intent override (optional) */
  intent?: string;
};

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const msg = value as ChatMessage;
  return (
    (msg.role === "system" || msg.role === "user" || msg.role === "assistant") &&
    typeof msg.content === "string"
  );
}

export async function POST(request: NextRequest) {
  let body: ChatBody;
  try {
    body = (await request.json()) as ChatBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  let messages: ChatMessage[] = [];
  if (Array.isArray(body.messages) && body.messages.every(isChatMessage)) {
    messages = body.messages
      .map((m) => ({ role: m.role, content: m.content.trim() }))
      .filter((m) => m.content.length > 0);
  } else if (typeof body.message === "string" && body.message.trim()) {
    messages = [{ role: "user", content: body.message.trim() }];
  }

  if (messages.length === 0) {
    return NextResponse.json(
      { error: "Provide `message` or non-empty `messages`." },
      { status: 400 }
    );
  }

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const previewRoute = routeQuery(lastUser?.content || "", isTokenSavingMode());

  try {
    const clientKey = resolveClientKeyFromHeaders(request.headers);
    const result = await chatWithOpenRouter(messages, {
      clientKey,
      intent: body.intent as AiIntent | undefined,
    });

    return NextResponse.json({
      ok: true,
      reply: result.reply,
      model: result.model,
      intent: result.intent,
      task_type: result.route.taskType,
      provider: result.route.provider,
      route_label: result.route.label,
      route_reason: result.route.reason,
      token_saving_mode: isTokenSavingMode(),
      usage: result.usage ?? null,
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
          error: err.message,
          code: err.code,
          intent: previewRoute.intent,
          route_label: previewRoute.label,
          hint: "Automation loops are blocked. Do not poll /api/chat in a retry loop.",
        },
        { status }
      );
    }

    const message =
      err instanceof Error ? err.message : "Gateway request failed.";
    const status = message.includes("not configured") ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/chat",
    description: "Unified FAOS AI gateway — auto-routes to Claude, GPT, or Gemini",
    token_saving_mode: isTokenSavingMode(),
    intents: [
      "strategy → Claude Sonnet",
      "code → GPT-4o",
      "creative → Claude Sonnet",
      "video → Gemini Flash",
      "analysis → GPT-4o Mini",
      "bengali → Gemini Flash",
      "chat → Gemini Flash",
      "automation → Hermes 405B",
    ],
  });
}
