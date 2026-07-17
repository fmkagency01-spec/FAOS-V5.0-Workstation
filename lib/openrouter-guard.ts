/**
 * OpenRouter abuse guard — rate limiting, request caps, and low-token circuit breaker.
 * Prevents automation loops from draining tokens (e.g. localhost/harvest retries).
 */

export type OpenRouterUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

export class OpenRouterGuardError extends Error {
  readonly code: "RATE_LIMIT" | "MAX_CAP" | "CIRCUIT_BREAKER";

  constructor(code: OpenRouterGuardError["code"], message: string) {
    super(message);
    this.name = "OpenRouterGuardError";
    this.code = code;
  }
}

type ClientState = {
  timestamps: number[];
  hourlyTimestamps: number[];
  totalRequests: number;
  lowTokenStrikes: number;
  circuitOpenUntil: number;
};

const clients = new Map<string, ClientState>();

function envInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const OPENROUTER_GUARD_CONFIG = {
  maxPerMinute: envInt("OPENROUTER_MAX_REQUESTS_PER_MINUTE", 6),
  maxPerHour: envInt("OPENROUTER_MAX_REQUESTS_PER_HOUR", 60),
  maxTotalPerClient: envInt("OPENROUTER_MAX_REQUESTS_TOTAL", 100),
  minCompletionTokens: envInt("OPENROUTER_MIN_COMPLETION_TOKENS", 10),
  lowTokenStrikeLimit: envInt("OPENROUTER_LOW_TOKEN_STRIKE_LIMIT", 3),
  circuitBreakerCooldownMs: envInt("OPENROUTER_CIRCUIT_COOLDOWN_MS", 300_000),
  minuteWindowMs: 60_000,
  hourWindowMs: 3_600_000,
} as const;

function getClientState(clientKey: string): ClientState {
  let state = clients.get(clientKey);
  if (!state) {
    state = {
      timestamps: [],
      hourlyTimestamps: [],
      totalRequests: 0,
      lowTokenStrikes: 0,
      circuitOpenUntil: 0,
    };
    clients.set(clientKey, state);
  }
  return state;
}

function pruneWindow(timestamps: number[], windowMs: number, now: number): number[] {
  return timestamps.filter((ts) => now - ts < windowMs);
}

/** Call immediately before each OpenRouter HTTP request. */
export function assertOpenRouterRequestAllowed(clientKey = "global"): void {
  const now = Date.now();
  const state = getClientState(clientKey);

  if (state.circuitOpenUntil > now) {
    throw new OpenRouterGuardError(
      "CIRCUIT_BREAKER",
      `OpenRouter circuit breaker open until ${new Date(state.circuitOpenUntil).toISOString()}. ` +
        "Repeated low-token responses detected — automation loop aborted to prevent token drain."
    );
  }

  state.timestamps = pruneWindow(state.timestamps, OPENROUTER_GUARD_CONFIG.minuteWindowMs, now);
  state.hourlyTimestamps = pruneWindow(
    state.hourlyTimestamps,
    OPENROUTER_GUARD_CONFIG.hourWindowMs,
    now
  );

  if (state.totalRequests >= OPENROUTER_GUARD_CONFIG.maxTotalPerClient) {
    throw new OpenRouterGuardError(
      "MAX_CAP",
      `OpenRouter max request cap reached (${OPENROUTER_GUARD_CONFIG.maxTotalPerClient}). Further calls blocked.`
    );
  }

  if (state.timestamps.length >= OPENROUTER_GUARD_CONFIG.maxPerMinute) {
    throw new OpenRouterGuardError(
      "RATE_LIMIT",
      `OpenRouter rate limit exceeded (${OPENROUTER_GUARD_CONFIG.maxPerMinute}/min). Retry later.`
    );
  }

  if (state.hourlyTimestamps.length >= OPENROUTER_GUARD_CONFIG.maxPerHour) {
    throw new OpenRouterGuardError(
      "RATE_LIMIT",
      `OpenRouter hourly cap exceeded (${OPENROUTER_GUARD_CONFIG.maxPerHour}/hour). Retry later.`
    );
  }

  state.timestamps.push(now);
  state.hourlyTimestamps.push(now);
  state.totalRequests += 1;
}

/** Call after each OpenRouter response with token usage metadata. */
export function recordOpenRouterResponse(
  usage: OpenRouterUsage | undefined,
  clientKey = "global"
): void {
  const state = getClientState(clientKey);
  const completionTokens = usage?.completion_tokens ?? 0;

  if (completionTokens >= OPENROUTER_GUARD_CONFIG.minCompletionTokens) {
    state.lowTokenStrikes = 0;
    return;
  }

  state.lowTokenStrikes += 1;

  if (state.lowTokenStrikes >= OPENROUTER_GUARD_CONFIG.lowTokenStrikeLimit) {
    state.circuitOpenUntil = Date.now() + OPENROUTER_GUARD_CONFIG.circuitBreakerCooldownMs;
    throw new OpenRouterGuardError(
      "CIRCUIT_BREAKER",
      `OpenRouter returned fewer than ${OPENROUTER_GUARD_CONFIG.minCompletionTokens} completion tokens ` +
        `${state.lowTokenStrikes} times in a row. Circuit breaker tripped — loop aborted to prevent token drain.`
    );
  }
}

export function resolveClientKeyFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = headers.get("x-real-ip")?.trim();
  return forwarded || realIp || "anonymous";
}

/** Test helper — reset in-memory guard state. */
export function resetOpenRouterGuardForTests(clientKey?: string): void {
  if (clientKey) {
    clients.delete(clientKey);
    return;
  }
  clients.clear();
}
