import policyData from "@/data/faos_access_policy.json";
import type { FaosModule } from "@/lib/modules-registry";

export type RoleInfo = {
  label: string;
  description: string;
  modules: string[];
  can_manage_team: boolean;
};

export function getRoleInfo(role: string): RoleInfo {
  const roles = policyData.roles as Record<string, RoleInfo>;
  return roles[role] || roles.viewer;
}

export function filterModulesForRole(modules: FaosModule[], role: string): FaosModule[] {
  const allowed = getRoleInfo(role).modules;
  if (allowed.includes("*")) return modules;
  return modules.filter((m) => allowed.includes(m.id));
}

export function canAccessModule(role: string, moduleId: string): boolean {
  const allowed = getRoleInfo(role).modules;
  if (allowed.includes("*")) return true;
  return allowed.includes(moduleId);
}

export function getAccessPolicyClient() {
  return policyData;
}
