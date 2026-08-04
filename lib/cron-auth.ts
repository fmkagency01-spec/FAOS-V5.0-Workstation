/**
 * Zero-Trust cron authentication for Vercel scheduled routes.
 * Accepts Authorization: Bearer <CRON_SECRET> or x-faos-cron-key header.
 * Edge-compatible (no Node crypto) — never logs the secret value.
 */

export function getCronSecret(): string | null {
  const key = process.env.CRON_SECRET?.trim() || process.env.FAOS_CRON_SECRET?.trim();
  return key ? key : null;
}

/** Constant-time string compare — works in Edge middleware. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i += 1) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

/**
 * Verify a cron/automation request.
 * - Production: CRON_SECRET required (fail closed).
 * - Local/dev without secret: allow only when not production.
 */
export function assertCronAuthorized(
  request: Request
): { ok: true } | { ok: false; status: number; error: string } {
  const expected = getCronSecret();
  const auth = request.headers.get("authorization") || "";
  const bearer = auth.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : "";
  const headerKey = (request.headers.get("x-faos-cron-key") || "").trim();
  const provided = bearer || headerKey;

  if (!expected) {
    if (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production") {
      return {
        ok: false,
        status: 503,
        error: "CRON_SECRET not configured — fail closed (Zero-Trust)",
      };
    }
    return { ok: true };
  }

  if (!provided || !safeEqual(provided, expected)) {
    return { ok: false, status: 401, error: "Unauthorized cron request" };
  }
  return { ok: true };
}

/** True when middleware should skip session auth for this cron path. */
export function isCronApiPath(pathname: string): boolean {
  return pathname === "/api/cron" || pathname.startsWith("/api/cron/");
}
