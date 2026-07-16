/**
 * FAOS frontend → Render Python backend URL calibration.
 *
 * Supports both:
 *   NEXT_PUBLIC_BACKEND_URL
 *   NEXT_PUBLIC_FAOS_BACKEND_URL
 *
 * CRITICAL: trailing slashes are always stripped to prevent
 * `https://host.onrender.com//api/...` 404 mismatches.
 */

function stripTrailingSlashes(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

export function getFaosBackendBaseUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_BACKEND_URL?.trim() ||
    process.env.NEXT_PUBLIC_FAOS_BACKEND_URL?.trim() ||
    "";

  if (!configured) return "";
  return stripTrailingSlashes(configured);
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
      ? joinBackendUrl("api/v5/create-pillar", normalized)
      : joinBackendUrl("api/v5/create-pillar");
  }

  // Same-origin Next.js fallback when Render URL is not configured.
  return normalized ? `/api/create-pillar/${normalized}` : "/api/create-pillar";
}

export function getAgentTriggerApiUrl(): string {
  const base = getFaosBackendBaseUrl();
  if (base) return joinBackendUrl("api/v5/agent-trigger");
  return "/api/agent-trigger";
}

export function getBackendRootUrl(): string {
  const base = getFaosBackendBaseUrl();
  return base || "/api/health";
}

export function getApiVersion(): string {
  return process.env.NEXT_PUBLIC_API_VERSION?.trim() || "v5.0";
}
