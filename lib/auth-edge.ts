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

const ROUTE_MODULES: Record<string, string> = {
  "/": "home",
  "/tac": "tac",
  "/jarvis": "jarvis",
  "/clients": "crm",
  "/projects": "projects",
  "/invoicing": "invoicing",
  "/inventory": "inventory",
  "/hr": "hr",
  "/agents": "agents",
  "/dashboard/create-pillar": "create-pillar",
  "/creative": "creative",
  "/operations": "command",
  "/settings": "settings",
  "/team": "team",
  "/status": "status",
};

const ROLE_MODULES: Record<string, string[]> = {
  owner: ["*"],
  manager: [
    "home", "tac", "jarvis", "crm", "projects", "agents", "inventory",
    "command", "creative", "create-pillar", "status",
  ],
  sales: ["home", "crm", "projects", "command", "status"],
  finance: ["home", "invoicing", "inventory", "status"],
  hr: ["home", "hr", "status"],
  creative: ["home", "creative", "agents", "command", "status"],
  viewer: ["home", "status"],
};

export function roleCanAccessRouteEdge(role: string, pathname: string): boolean {
  const clean = pathname.split("?")[0].replace(/\/$/, "") || "/";
  const moduleId = ROUTE_MODULES[clean];
  const allowed = ROLE_MODULES[role] || ROLE_MODULES.viewer;
  if (allowed.includes("*")) return true;
  if (!moduleId) return role === "owner";
  return allowed.includes(moduleId);
}

export function isProtectedPage(pathname: string): boolean {
  if (pathname === "/login") return false;
  if (pathname === "/") return true;
  return [
    "/jarvis", "/tac", "/clients", "/projects", "/invoicing", "/inventory", "/hr",
    "/agents", "/creative", "/operations", "/settings", "/team", "/status", "/dashboard",
  ].some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function isProtectedApiEdge(pathname: string): boolean {
  if (pathname.startsWith("/api/auth")) return false;
  if (pathname === "/api/health") return false;
  return [
    "/api/tac", "/api/jarvis", "/api/chat", "/api/agent-workflow", "/api/clients", "/api/projects",
    "/api/invoices", "/api/inventory", "/api/hr", "/api/media", "/api/harvest",
    "/api/create-pillar", "/api/agent-trigger",
  ].some((p) => pathname === p || pathname.startsWith(p + "/"));
}
