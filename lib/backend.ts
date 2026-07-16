/**
 * FAOS frontend → Render Python backend URL calibration.
 * Prefer NEXT_PUBLIC_FAOS_BACKEND_URL when set; otherwise use same-origin Next API.
 */

export function getFaosBackendBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_FAOS_BACKEND_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return "";
}

export function getCreatePillarApiUrl(path = ""): string {
  const base = getFaosBackendBaseUrl();
  const normalized = path.startsWith("/") ? path : path ? `/${path}` : "";
  if (base) {
    return `${base}/api/v5/create-pillar${normalized}`;
  }
  // Same-origin Next.js fallback when Render URL is not configured.
  if (!normalized || normalized === "/") return "/api/create-pillar";
  return `/api/create-pillar${normalized}`;
}

export function getBackendRootUrl(): string {
  const base = getFaosBackendBaseUrl();
  return base || "/api/health";
}
