import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { assertApiRateLimit, resolveClientIp } from "@/lib/api-rate-limit";
import { ApiError } from "@/lib/api-errors";
import { toErrorResponse } from "@/lib/api-response";

export type ApiRouteContext = {
  params: Record<string, string>;
};

export type ApiRouteHandler = (
  request: NextRequest,
  ctx: ApiRouteContext
) => Promise<NextResponse>;

export type ApiRouteOptions = {
  /** Route key for rate limiting (defaults to pathname) */
  rateLimitKey?: string;
  /** Skip rate limit (e.g. health) */
  skipRateLimit?: boolean;
};

type NextRouteContext = {
  params: Promise<Record<string, string>>;
};

/**
 * Central API wrapper — validates once, catches once, returns immediately.
 * No retry loops; upstream failures surface as a single HTTP error.
 */
export function withApiRoute(
  handler: ApiRouteHandler,
  options: ApiRouteOptions = {}
): (request: NextRequest, ctx: NextRouteContext) => Promise<NextResponse> {
  return async (request, ctx) => {
    try {
      if (!options.skipRateLimit) {
        const ip = resolveClientIp(request.headers);
        const routeKey = options.rateLimitKey || new URL(request.url).pathname;
        assertApiRateLimit(ip, routeKey);
      }

      const params = await ctx.params;
      return await handler(request, { params });
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}

export async function parseJsonBody<T extends Record<string, unknown>>(
  request: NextRequest
): Promise<T> {
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    throw ApiError.badRequest("Could not read request body.");
  }
  if (!raw.trim()) return {} as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw ApiError.badRequest("Invalid JSON body.");
  }
}

export async function parseJsonBodyOrClone<T extends Record<string, unknown>>(
  request: NextRequest
): Promise<{ body: T; raw: string }> {
  const raw = await request.text();
  if (!raw.trim()) return { body: {} as T, raw: "{}" };
  try {
    return { body: JSON.parse(raw) as T, raw };
  } catch {
    throw ApiError.badRequest("Invalid JSON body.");
  }
}
