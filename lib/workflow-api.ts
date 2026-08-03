import {
  joinBackendUrl,
  getFaosBackendBaseUrl,
  getBackendAuthHeaders,
} from "@/lib/backend";
import { ApiError } from "@/lib/api-errors";

/** Default upstream wait — keep short so JARVIS never hangs on a sleeping Render free tier. */
const DEFAULT_TIMEOUT_MS = 8000;
const HEAVY_TIMEOUT_MS = 60000;

export type WorkflowFetchResult<T> = {
  data: T | null;
  upstream: boolean;
  status?: number;
  error?: string;
};

export type WorkflowFetchOptions = RequestInit & {
  /** Override upstream abort timeout (ms). */
  timeoutMs?: number;
};

/**
 * Single-shot upstream call — no retries, no loops.
 * Always attaches FAOS_BACKEND_API_KEY as X-FAOS-Api-Key when configured.
 */
export async function fetchWorkflow<T>(
  path: string,
  init?: WorkflowFetchOptions
): Promise<WorkflowFetchResult<T>> {
  const base = getFaosBackendBaseUrl();
  if (!base) return { data: null, upstream: false };

  const { timeoutMs, ...rest } = init || {};
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    timeoutMs ?? DEFAULT_TIMEOUT_MS
  );

  try {
    const res = await fetch(joinBackendUrl(path), {
      ...rest,
      signal: controller.signal,
      cache: "no-store",
      headers: getBackendAuthHeaders(rest.headers),
    });

    if (!res.ok) {
      let detail = `Backend responded ${res.status}`;
      try {
        const err = (await res.json()) as { error?: string; detail?: string };
        detail = err.error || err.detail || detail;
      } catch {
        /* ignore */
      }
      return { data: null, upstream: true, status: res.status, error: detail };
    }

    return { data: (await res.json()) as T, upstream: true, status: res.status };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Backend unreachable";
    return { data: null, upstream: true, error: message };
  } finally {
    clearTimeout(timer);
  }
}

/** Strict upstream — throws ApiError immediately on failure (no fallback path). */
export async function fetchWorkflowStrict<T>(
  path: string,
  init?: WorkflowFetchOptions
): Promise<T> {
  const result = await fetchWorkflow<T>(path, {
    ...init,
    timeoutMs: init?.timeoutMs ?? HEAVY_TIMEOUT_MS,
  });
  if (result.data) return result.data;
  if (!result.upstream) {
    throw ApiError.config("Backend URL is not configured.");
  }
  if (result.status === 401) {
    throw ApiError.unauthorized(
      "Backend rejected API key. Set the same FAOS_BACKEND_API_KEY on Vercel and Render."
    );
  }
  throw ApiError.upstream(
    result.error || "Backend request failed.",
    "Check Render backend status or FAOS_BACKEND_API_KEY."
  );
}
