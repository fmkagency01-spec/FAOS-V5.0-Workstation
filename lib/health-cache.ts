/**
 * Short-TTL in-memory cache for expensive health probes.
 * Mitigates serverless cold-start amplification when /api/health is polled often.
 */

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const store = new Map<string, CacheEntry<unknown>>();

export async function cachedProbe<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>
): Promise<T> {
  const hit = store.get(key) as CacheEntry<T> | undefined;
  if (hit && hit.expiresAt > Date.now()) {
    return hit.value;
  }
  const value = await loader();
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}

export function warmBackend(url: string): void {
  // Fire-and-forget wake for Render free-tier spin-up — never blocks the response.
  if (!url) return;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  void fetch(url, { cache: "no-store", signal: controller.signal })
    .catch(() => undefined)
    .finally(() => clearTimeout(timer));
}
