import { normalizeRole } from "@/lib/auth-edge";

/** Super Admin (Mahirul / Executive Alpha) — sole viewers of internal JARVIS chat logs. */
export function isSuperAdmin(role: string): boolean {
  const r = normalizeRole(role);
  return r === "owner";
}

/** Default home route after login based on tenant role. */
export function postLoginRedirect(role: string, tenantId?: string | null): string {
  const r = normalizeRole(role);
  if (r === "client") {
    if (tenantId === "rr_wigs" || !tenantId) return "/portal/rr-wigs";
    return `/portal/${tenantId}`;
  }
  return "/";
}

/** Client roles must stay inside their portal — block master dashboard surfaces. */
export function isClientPortalPath(pathname: string): boolean {
  return pathname === "/portal" || pathname.startsWith("/portal/");
}

export const CLIENT_BLOCKED_MODULES = [
  "tac",
  "jarvis",
  "jarvis-history",
  "crm",
  "invoicing",
  "hr",
  "team",
  "settings",
  "create-pillar",
  "ai-seo",
  "fmk-wig-b2b",
  "command",
  "creative",
  "agents",
  "brain",
] as const;
