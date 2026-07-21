import { normalizeRole } from "@/lib/auth-edge";

/** Map API paths to FAOS modules for role-based API access. */
const API_MODULE_MAP: Record<string, string> = {
  "/api/tac": "tac",
  "/api/jarvis": "jarvis",
  "/api/chat": "command",
  "/api/clients": "crm",
  "/api/projects": "projects",
  "/api/invoices": "invoicing",
  "/api/inventory": "inventory",
  "/api/hr": "hr",
  "/api/orders": "orders",
  "/api/products": "products",
  "/api/users": "team",
  "/api/notifications": "command",
  "/api/agent-workflow": "agents",
  "/api/media": "creative",
  "/api/harvest": "command",
  "/api/create-pillar": "create-pillar",
  "/api/agent-trigger": "agents",
  "/api/ai-seo": "ai-seo",
  "/api/bulletseye": "ai-seo",
  "/api/brain": "jarvis",
  "/api/harness": "agents",
  "/api/apps/fmk-wig": "fmk-wig-b2b",
  "/api/apps/rr-wigs": "rr-wigs-workspace",
  "/api/attachments": "command",
};

const ROLE_MODULES: Record<string, string[]> = {
  owner: ["*"],
  executive: ["*"],
  manager: [
    "home", "tac", "jarvis", "crm", "projects", "agents", "inventory", "orders", "products",
    "command", "creative", "create-pillar", "ai-seo", "fmk-wig-b2b", "rr-wigs-workspace", "status",
  ],
  team_lead: [
    "home", "tac", "jarvis", "crm", "projects", "agents",
    "command", "creative", "create-pillar", "ai-seo", "fmk-wig-b2b", "status",
  ],
  sales: ["home", "crm", "projects", "orders", "command", "status"],
  finance: ["home", "invoicing", "inventory", "orders", "products", "status"],
  hr: ["home", "hr", "status"],
  creative: ["home", "creative", "agents", "command", "ai-seo", "status"],
  client: ["home", "projects", "status", "rr-wigs-workspace"],
  viewer: ["home", "status"],
};

/** Roles that may only GET (no POST/PATCH/DELETE) on allowed modules. */
const READ_ONLY_ROLES = new Set(["client", "viewer"]);

export function apiPathToModule(pathname: string): string | null {
  const clean = pathname.split("?")[0].replace(/\/$/, "") || "/";
  if (API_MODULE_MAP[clean]) return API_MODULE_MAP[clean];

  for (const [prefix, moduleId] of Object.entries(API_MODULE_MAP)) {
    if (clean.startsWith(prefix + "/")) return moduleId;
  }
  return null;
}

export function roleCanAccessApi(role: string, pathname: string, method = "GET"): boolean {
  const moduleId = apiPathToModule(pathname);
  const normalized = normalizeRole(role);
  if (!moduleId) return normalized === "owner";
  const allowed = ROLE_MODULES[role] || ROLE_MODULES[normalized] || ROLE_MODULES.viewer;
  if (allowed.includes("*")) return true;
  if (!allowed.includes(moduleId)) return false;

  if (READ_ONLY_ROLES.has(role) && method.toUpperCase() !== "GET") {
    return false;
  }
  return true;
}
