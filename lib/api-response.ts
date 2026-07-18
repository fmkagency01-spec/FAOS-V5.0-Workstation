import { NextResponse } from "next/server";
import { ApiError, isApiError } from "@/lib/api-errors";
import { OpenRouterGuardError } from "@/lib/openrouter-guard";

export type ApiSuccess<T> = { ok: true } & T;

export type ApiFailure = {
  ok: false;
  error: string;
  code?: string;
  hint?: string;
};

export function jsonOk<T extends Record<string, unknown>>(data: T, status = 200) {
  return NextResponse.json({ ok: true, ...data } satisfies ApiSuccess<T>, { status });
}

export function jsonError(
  status: number,
  error: string,
  code?: string,
  hint?: string
) {
  const body: ApiFailure = { ok: false, error };
  if (code) body.code = code;
  if (hint) body.hint = hint;
  return NextResponse.json(body, { status });
}

export function toErrorResponse(err: unknown): NextResponse {
  if (isApiError(err)) {
    return jsonError(err.status, err.message, err.code, err.hint);
  }

  if (err instanceof OpenRouterGuardError) {
    const status =
      err.code === "CIRCUIT_BREAKER"
        ? 503
        : err.code === "DAILY_CAP" || err.code === "RATE_LIMIT"
          ? 429
          : 429;
    return jsonError(status, err.message, err.code, "Do not retry in a loop.");
  }

  const message = err instanceof Error ? err.message : "Internal server error";
  if (message.includes("not configured")) {
    return jsonError(503, message, "CONFIG");
  }

  console.error("[api]", message);
  return jsonError(500, message, "INTERNAL");
}
