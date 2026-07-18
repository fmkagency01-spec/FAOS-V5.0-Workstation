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
};

const ROLE_MODULES: Record<string, string[]> = {
  owner: ["*"],
  manager: [
    "home", "tac", "jarvis", "crm", "projects", "agents", "inventory", "orders", "products",
    "command", "creative", "create-pillar", "status",
  ],
  sales: ["home", "crm", "projects", "orders", "command", "status"],
  finance: ["home", "invoicing", "inventory", "orders", "products", "status"],
  hr: ["home", "hr", "status"],
  creative: ["home", "creative", "agents", "command", "status"],
  viewer: ["home", "status"],
};

export function apiPathToModule(pathname: string): string | null {
  const clean = pathname.split("?")[0].replace(/\/$/, "") || "/";
  if (API_MODULE_MAP[clean]) return API_MODULE_MAP[clean];

  for (const [prefix, moduleId] of Object.entries(API_MODULE_MAP)) {
    if (clean.startsWith(prefix + "/")) return moduleId;
  }
  return null;
}

export function roleCanAccessApi(role: string, pathname: string): boolean {
  const moduleId = apiPathToModule(pathname);
  if (!moduleId) return role === "owner";
  const allowed = ROLE_MODULES[role] || ROLE_MODULES.viewer;
  if (allowed.includes("*")) return true;
  return allowed.includes(moduleId);
}
