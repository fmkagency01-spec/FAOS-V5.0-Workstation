import type { NextRequest } from "next/server";
import policyData from "@/data/faos_access_policy.json";
import {
  createSignedToken,
  verifySignedToken,
  type SessionPayload,
} from "@/lib/auth-crypto";

export const SESSION_COOKIE = "faos_session";
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7;

export type FaosRole = keyof typeof policyData.roles;

export type AuthUser = {
  username: string;
  name: string;
  role: FaosRole;
  /** Isolates external B2B clients to a portal tenant (e.g. rr_wigs). */
  tenant_id?: string;
};

export type StoredUser = AuthUser & {
  password: string;
};

const ROLES = policyData.roles as Record<
  string,
  { label: string; description: string; modules: string[]; can_manage_team: boolean }
>;

/** Resolve owner password from Vercel env — supports common typo FAOS_OWNER_PASSWRD. */
export function resolveOwnerPassword(): string | null {
  const correct = process.env.FAOS_OWNER_PASSWORD?.trim();
  if (correct) return correct;

  const typo = process.env.FAOS_OWNER_PASSWRD?.trim();
  if (typo) return typo;

  return null;
}

export function loadAuthUsers(): StoredUser[] {
  const raw = process.env.FAOS_AUTH_USERS?.trim();
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as StoredUser[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      /* fall through */
    }
  }

  const ownerPass = resolveOwnerPassword();
  if (ownerPass) {
    return [
      {
        username: "fahim",
        password: ownerPass,
        name: "Fahim Mahmud Khan",
        role: "owner",
      },
    ];
  }

  // No hardcoded credentials — set FAOS_OWNER_PASSWORD or FAOS_AUTH_USERS in env.
  return [];
}

export function authenticateUser(username: string, password: string): AuthUser | null {
  const users = loadAuthUsers();
  const found = users.find(
    (u) => u.username.toLowerCase() === username.toLowerCase() && u.password === password
  );
  if (!found) return null;
  return {
    username: found.username,
    name: found.name,
    role: found.role,
    tenant_id: found.tenant_id,
  };
}

export async function createSessionToken(user: AuthUser): Promise<string> {
  const payload: SessionPayload = {
    ...user,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SEC,
  };
  return createSignedToken(payload);
}

export async function verifySessionToken(
  token: string | undefined | null
): Promise<SessionPayload | null> {
  return verifySignedToken(token);
}

export async function getSessionFromRequest(
  request: NextRequest
): Promise<SessionPayload | null> {
  return verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
}

export function getRolePolicy(role: string) {
  return ROLES[role] || ROLES.viewer;
}

export function roleCanAccessModule(role: string, moduleId: string): boolean {
  const policy = getRolePolicy(role);
  if (policy.modules.includes("*")) return true;
  return policy.modules.includes(moduleId);
}

export function roleCanAccessRoute(role: string, pathname: string): boolean {
  const map = policyData.route_module_map as Record<string, string>;
  const clean = pathname.split("?")[0].replace(/\/$/, "") || "/";
  const moduleId = map[clean];
  if (!moduleId) return role === "owner";
  return roleCanAccessModule(role, moduleId);
}

export function modulesForRole(role: string): string[] {
  return getRolePolicy(role).modules;
}

export function canManageTeam(role: string): boolean {
  return getRolePolicy(role).can_manage_team;
}

export function getAccessPolicy() {
  return policyData;
}

export function sessionCookieOptions(token: string) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  };
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export async function requireApiSession(request: NextRequest): Promise<SessionPayload> {
  const session = await getSessionFromRequest(request);
  if (!session) throw new AuthError("Authentication required", 401);
  return session;
}

export { type SessionPayload };
