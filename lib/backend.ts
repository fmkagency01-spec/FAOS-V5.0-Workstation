/**
 * FAOS frontend → Render Python backend URL calibration.
 *
 * Production base URL (include /api/v5):
 *   NEXT_PUBLIC_BACKEND_URL=https://faos-backend.onrender.com/api/v5
 *
 * Host-only URLs are still accepted and normalized to .../api/v5.
 * CRITICAL: trailing slashes are always stripped.
 */

const API_V5_SUFFIX = "/api/v5";

function stripTrailingSlashes(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

function readConfiguredBackendUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BACKEND_URL?.trim() ||
    process.env.NEXT_PUBLIC_FAOS_BACKEND_URL?.trim() ||
    ""
  );
}

/** Normalize env value to the v5 API base: https://host.onrender.com/api/v5 */
function normalizeToV5Base(url: string): string {
  const stripped = stripTrailingSlashes(url);
  if (!stripped) return "";
  if (stripped.endsWith(API_V5_SUFFIX)) return stripped;
  return `${stripped}${API_V5_SUFFIX}`;
}

/** v5 API base used for all production network requests */
export function getFaosBackendBaseUrl(): string {
  const configured = readConfiguredBackendUrl();
  if (!configured) return "";
  return normalizeToV5Base(configured);
}

/** Render service origin (health, docs) — without /api/v5 */
export function getFaosBackendOriginUrl(): string {
  const base = getFaosBackendBaseUrl();
  if (!base) return "";
  return base.endsWith(API_V5_SUFFIX)
    ? base.slice(0, -API_V5_SUFFIX.length)
    : stripTrailingSlashes(base);
}

export function joinBackendUrl(...parts: string[]): string {
  const base = getFaosBackendBaseUrl();
  if (!base) return "";

  const path = parts
    .filter(Boolean)
    .map((part) => part.replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/");

  return path ? `${base}/${path}` : base;
}

export function getCreatePillarApiUrl(path = ""): string {
  const base = getFaosBackendBaseUrl();
  const normalized = path.replace(/^\/+|\/+$/g, "");

  if (base) {
    return normalized
      ? joinBackendUrl("create-pillar", normalized)
      : joinBackendUrl("create-pillar");
  }

  return normalized ? `/api/create-pillar/${normalized}` : "/api/create-pillar";
}

export function getAgentTriggerApiUrl(): string {
  const base = getFaosBackendBaseUrl();
  if (base) return joinBackendUrl("agent-trigger");
  return "/api/agent-trigger";
}

export function getAiSeoApiUrl(): string {
  const base = getFaosBackendBaseUrl();
  if (base) return joinBackendUrl("ai-seo");
  return "/api/ai-seo";
}

export function getBulletseyeExecuteApiUrl(): string {
  const base = getFaosBackendBaseUrl();
  if (base) return joinBackendUrl("bulletseye", "seo-geo-execute");
  return "/api/bulletseye/seo-geo-execute";
}

/** Root health probe — lives at service origin `/`, not under /api/v5 */
export function getBackendRootUrl(): string {
  const origin = getFaosBackendOriginUrl();
  return origin ? `${origin}/` : "/api/health";
}

export function getBackendDocsUrl(): string {
  const origin = getFaosBackendOriginUrl();
  return origin ? `${origin}/docs` : "";
}

export function getApiVersion(): string {
  return process.env.NEXT_PUBLIC_API_VERSION?.trim() || "v5.0";
}

/** Server-only headers for Render /api/v5 calls (never expose to browser). */
export function getBackendAuthHeaders(
  extra?: HeadersInit
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (extra) {
    const merged = new Headers(extra);
    merged.forEach((value, key) => {
      headers[key] = value;
    });
  }

  const key = process.env.FAOS_BACKEND_API_KEY?.trim();
  if (key) {
    headers["X-FAOS-Api-Key"] = key;
  }

  return headers;
}

/** True when Vercel has FAOS_BACKEND_API_KEY configured (value never returned). */
export function isBackendApiKeyConfigured(): boolean {
  return Boolean(process.env.FAOS_BACKEND_API_KEY?.trim());
}
