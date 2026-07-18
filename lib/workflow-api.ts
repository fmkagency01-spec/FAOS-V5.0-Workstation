import {
  joinBackendUrl,
  getFaosBackendBaseUrl,
  getBackendAuthHeaders,
} from "@/lib/backend";
import { ApiError } from "@/lib/api-errors";

const TIMEOUT_MS = 60000;

export type WorkflowFetchResult<T> = {
  data: T | null;
  upstream: boolean;
  status?: number;
  error?: string;
};

/**
 * Single-shot upstream call — no retries, no loops.
 * Always attaches FAOS_BACKEND_API_KEY as X-FAOS-Api-Key when configured.
 */
export async function fetchWorkflow<T>(
  path: string,
  init?: RequestInit
): Promise<WorkflowFetchResult<T>> {
  const base = getFaosBackendBaseUrl();
  if (!base) return { data: null, upstream: false };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(joinBackendUrl(path), {
      ...init,
      signal: controller.signal,
      cache: "no-store",
      headers: getBackendAuthHeaders(init?.headers),
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
  init?: RequestInit
): Promise<T> {
  const result = await fetchWorkflow<T>(path, init);
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
