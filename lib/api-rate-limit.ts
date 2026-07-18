import { ApiError } from "@/lib/api-errors";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitRule = {
  key: string;
  max: number;
  windowMs: number;
};

function envInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const API_RATE_DEFAULTS = {
  maxPerMinute: envInt("FAOS_API_MAX_PER_MINUTE", 30),
  maxPerHour: envInt("FAOS_API_MAX_PER_HOUR", 300),
  windowMinuteMs: 60_000,
  windowHourMs: 3_600_000,
} as const;

function pruneAndCount(key: string, windowMs: number, max: number, now: number): void {
  const bucketKey = `${key}:${windowMs}`;
  let bucket = buckets.get(bucketKey);
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(bucketKey, bucket);
  }
  if (bucket.count >= max) {
    throw ApiError.rateLimit(
      `Rate limit exceeded (${max} requests per ${Math.round(windowMs / 1000)}s). Retry later.`
    );
  }
  bucket.count += 1;
}

/** Single-shot rate check — fails fast, no retry loop. */
export function assertApiRateLimit(clientKey: string, routeKey: string): void {
  const now = Date.now();
  const base = `${clientKey}:${routeKey}`;
  pruneAndCount(base, API_RATE_DEFAULTS.windowMinuteMs, API_RATE_DEFAULTS.maxPerMinute, now);
  pruneAndCount(base, API_RATE_DEFAULTS.windowHourMs, API_RATE_DEFAULTS.maxPerHour, now);
}

export function resolveClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    "anonymous"
  );
}

/** Test helper */
export function resetApiRateLimitsForTests(): void {
  buckets.clear();
}
