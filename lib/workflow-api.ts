import { joinBackendUrl, getFaosBackendBaseUrl } from "@/lib/backend";

const TIMEOUT_MS = 60000;

export async function fetchWorkflow<T>(
  path: string,
  init?: RequestInit
): Promise<{ data: T | null; upstream: boolean }> {
  const base = getFaosBackendBaseUrl();
  if (!base) return { data: null, upstream: false };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(joinBackendUrl(path), {
      ...init,
      signal: controller.signal,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    });
    if (!res.ok) return { data: null, upstream: true };
    return { data: (await res.json()) as T, upstream: true };
  } catch {
    return { data: null, upstream: true };
  } finally {
    clearTimeout(timer);
  }
}
