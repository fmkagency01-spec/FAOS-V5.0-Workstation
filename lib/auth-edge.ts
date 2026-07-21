import { verifySignedToken, type SessionPayload } from "@/lib/auth-crypto";

const SESSION_COOKIE = "faos_session";

export async function getSessionFromCookieHeader(
  cookieHeader: string | null
): Promise<SessionPayload | null> {
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  if (!match) return null;
  const token = decodeURIComponent(match.slice(SESSION_COOKIE.length + 1));
  return verifySignedToken(token);
}

/** Normalize tenant-tier aliases (executive → owner privileges). */
export function normalizeRole(role: string): string {
  if (role === "executive") return "owner";
  return role;
}

const ROUTE_MODULES: Record<string, string> = {
  "/": "home",
  "/tac": "tac",
  "/jarvis": "jarvis",
  "/clients": "crm",
  "/projects": "projects",
  "/invoicing": "invoicing",
  "/inventory": "inventory",
  "/orders": "orders",
  "/products": "products",
  "/hr": "hr",
  "/agents": "agents",
  "/dashboard/create-pillar": "create-pillar",
  "/dashboard/ai-seo": "ai-seo",
  "/apps/fmk-wig": "fmk-wig-b2b",
  "/apps/rr-wigs": "rr-wigs-workspace",
  "/portal/rr-wigs": "rr-wigs-portal",
  "/dashboard": "home",
  "/creative": "creative",
  "/operations": "command",
  "/settings": "settings",
  "/team": "team",
  "/status": "status",
};

const ROLE_MODULES: Record<string, string[]> = {
  owner: ["*"],
  executive: ["*"],
  manager: [
    "home", "tac", "jarvis", "crm", "projects", "agents", "inventory",
    "orders", "products", "command", "creative", "create-pillar", "ai-seo",
    "fmk-wig-b2b", "rr-wigs-workspace", "status",
  ],
  team_lead: [
    "home", "tac", "jarvis", "crm", "projects", "agents",
    "command", "creative", "create-pillar", "ai-seo", "fmk-wig-b2b", "status",
  ],
  sales: ["home", "crm", "projects", "orders", "command", "status", "fmk-wig-b2b"],
  finance: ["home", "invoicing", "inventory", "status"],
  hr: ["home", "hr", "status"],
  creative: ["home", "creative", "agents", "command", "ai-seo", "status"],
  client: ["rr-wigs-portal"],
  viewer: ["home", "status"],
};

export function roleCanAccessRouteEdge(role: string, pathname: string): boolean {
  const clean = pathname.split("?")[0].replace(/\/$/, "") || "/";
  const moduleId = ROUTE_MODULES[clean];
  const normalized = normalizeRole(role);
  const allowed = ROLE_MODULES[role] || ROLE_MODULES[normalized] || ROLE_MODULES.viewer;
  if (allowed.includes("*")) return true;
  if (!moduleId) return normalized === "owner";
  return allowed.includes(moduleId);
}

export function isProtectedPage(pathname: string): boolean {
  if (pathname === "/login") return false;
  if (pathname === "/") return true;
  return [
    "/jarvis", "/tac", "/clients", "/projects", "/invoicing", "/inventory", "/orders", "/products", "/hr",
    "/agents", "/creative", "/operations", "/settings", "/team", "/status", "/dashboard", "/apps", "/portal",
  ].some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function isProtectedApiEdge(pathname: string): boolean {
  if (pathname.startsWith("/api/auth")) return false;
  if (pathname === "/api/health") return false;
  if (pathname === "/api/manifest" || pathname === "/manifest.webmanifest") return false;
  return [
    "/api/tac", "/api/jarvis", "/api/chat", "/api/agent-workflow", "/api/clients", "/api/projects",
    "/api/invoices", "/api/inventory", "/api/hr", "/api/orders", "/api/products", "/api/users",
    "/api/notifications", "/api/media", "/api/harvest",
    "/api/create-pillar", "/api/agent-trigger", "/api/ai-seo", "/api/bulletseye",
    "/api/brain", "/api/harness", "/api/apps", "/api/attachments", "/api/jarvis/sessions",
  ].some((p) => pathname === p || pathname.startsWith(p + "/"));
}
