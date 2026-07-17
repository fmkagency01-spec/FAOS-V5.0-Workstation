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
