/**
 * OpenRouter abuse guard — daily cap, rate limits, and low-token loop breaker.
 * Matches safeOpenRouterCall safety rules for /api/harvest automation.
 */

export type OpenRouterUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

export class OpenRouterGuardError extends Error {
  readonly code: "RATE_LIMIT" | "MAX_CAP" | "DAILY_CAP" | "CIRCUIT_BREAKER";

  constructor(code: OpenRouterGuardError["code"], message: string) {
    super(message);
    this.name = "OpenRouterGuardError";
    this.code = code;
  }
}

type ClientState = {
  timestamps: number[];
  hourlyTimestamps: number[];
  dailyDateKey: string;
  apiRequestCountToday: number;
  lowTokenStrikes: number;
  circuitOpenUntil: number;
  aborted: boolean;
};

const clients = new Map<string, ClientState>();

function envInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const OPENROUTER_GUARD_CONFIG = {
  /** একদিনে ১০০ বারের বেশি automatic request যাবে না */
  maxDailyRequests: envInt("OPENROUTER_MAX_DAILY_REQUESTS", 100),
  maxPerMinute: envInt("OPENROUTER_MAX_REQUESTS_PER_MINUTE", 6),
  maxPerHour: envInt("OPENROUTER_MAX_REQUESTS_PER_HOUR", 60),
  /** ২-টোকেন বাগ প্রোটেকশন: <= 5 completion tokens = immediate abort */
  abortCompletionTokensAtOrBelow: envInt("OPENROUTER_ABORT_COMPLETION_TOKENS", 5),
  lowTokenStrikeLimit: envInt("OPENROUTER_LOW_TOKEN_STRIKE_LIMIT", 3),
  circuitBreakerCooldownMs: envInt("OPENROUTER_CIRCUIT_COOLDOWN_MS", 300_000),
  minuteWindowMs: 60_000,
  hourWindowMs: 3_600_000,
} as const;

function utcDayKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function getClientState(clientKey: string): ClientState {
  let state = clients.get(clientKey);
  if (!state) {
    state = {
      timestamps: [],
      hourlyTimestamps: [],
      dailyDateKey: utcDayKey(),
      apiRequestCountToday: 0,
      lowTokenStrikes: 0,
      circuitOpenUntil: 0,
      aborted: false,
    };
    clients.set(clientKey, state);
  }
  return state;
}

function resetDailyCounterIfNeeded(state: ClientState, now: Date): void {
  const today = utcDayKey(now);
  if (state.dailyDateKey !== today) {
    state.dailyDateKey = today;
    state.apiRequestCountToday = 0;
  }
}

function pruneWindow(timestamps: number[], windowMs: number, now: number): number[] {
  return timestamps.filter((ts) => now - ts < windowMs);
}

function tripCircuitBreaker(state: ClientState, message: string): never {
  state.aborted = true;
  state.circuitOpenUntil = Date.now() + OPENROUTER_GUARD_CONFIG.circuitBreakerCooldownMs;
  throw new OpenRouterGuardError("CIRCUIT_BREAKER", message);
}

/** ১. ম্যাক্স ডেইলি রিকোয়েস্ট লিমিট চেক — call before each OpenRouter HTTP request */
export function assertOpenRouterRequestAllowed(clientKey = "global"): void {
  const now = Date.now();
  const nowDate = new Date(now);
  const state = getClientState(clientKey);

  resetDailyCounterIfNeeded(state, nowDate);

  if (state.aborted || state.circuitOpenUntil > now) {
    tripCircuitBreaker(
      state,
      "OpenRouter safety wrapper aborted further calls. Reset required or wait for cooldown."
    );
  }

  if (state.apiRequestCountToday >= OPENROUTER_GUARD_CONFIG.maxDailyRequests) {
    console.error(
      "❌ CRITICAL: Safety cap reached! Blocking API call to prevent token drain."
    );
    state.aborted = true;
    throw new OpenRouterGuardError(
      "DAILY_CAP",
      "API Limit exceeded for safety. Reset required."
    );
  }

  state.timestamps = pruneWindow(state.timestamps, OPENROUTER_GUARD_CONFIG.minuteWindowMs, now);
  state.hourlyTimestamps = pruneWindow(
    state.hourlyTimestamps,
    OPENROUTER_GUARD_CONFIG.hourWindowMs,
    now
  );

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
}

/** Increment daily counter after a successful upstream HTTP call */
export function recordOpenRouterRequest(clientKey = "global"): void {
  const state = getClientState(clientKey);
  resetDailyCounterIfNeeded(state, new Date());
  state.apiRequestCountToday += 1;
}

/**
 * ২. ২-টোকেন বাগ প্রোটেকশন — <= 5 completion tokens breaks the loop immediately
 */
export function assertHealthyCompletionTokens(
  usage: OpenRouterUsage | undefined,
  clientKey = "global"
): void {
  const state = getClientState(clientKey);
  const completionTokens = usage?.completion_tokens ?? 0;
  const threshold = OPENROUTER_GUARD_CONFIG.abortCompletionTokensAtOrBelow;

  if (completionTokens > threshold) {
    state.lowTokenStrikes = 0;
    return;
  }

  console.warn(
    "⚠️ Warning: Empty or extremely short response detected. Stopping loop."
  );

  state.lowTokenStrikes += 1;

  if (
    completionTokens <= threshold ||
    state.lowTokenStrikes >= OPENROUTER_GUARD_CONFIG.lowTokenStrikeLimit
  ) {
    tripCircuitBreaker(
      state,
      "Suspected infinite loop or failed response structure. Aborting."
    );
  }
}

export function resolveClientKeyFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = headers.get("x-real-ip")?.trim();
  return forwarded || realIp || "anonymous";
}

export function getDailyRequestCount(clientKey = "global"): number {
  const state = getClientState(clientKey);
  resetDailyCounterIfNeeded(state, new Date());
  return state.apiRequestCountToday;
}

/** Test helper — reset in-memory guard state */
export function resetOpenRouterGuardForTests(clientKey?: string): void {
  if (clientKey) {
    clients.delete(clientKey);
    return;
  }
  clients.clear();
}
