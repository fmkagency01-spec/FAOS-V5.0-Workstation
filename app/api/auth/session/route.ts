import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, getRolePolicy, getAccessPolicy } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Current multi-tenant session + role tier for workstation UI. */
export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ ok: false, authenticated: false }, { status: 401 });
  }

  const policy = getRolePolicy(session.role);
  const access = getAccessPolicy() as {
    tenant_tiers?: Record<string, { label?: string; access?: string }>;
    roles?: Record<string, { tier?: string; read_only?: boolean }>;
  };
  const roleMeta = access.roles?.[session.role];
  const tierId = roleMeta?.tier || "team_leads";
  const tier = access.tenant_tiers?.[tierId];

  return NextResponse.json({
    ok: true,
    authenticated: true,
    user: {
      username: session.username,
      name: session.name,
      role: session.role,
    },
    role_policy: {
      label: policy.label,
      description: policy.description,
      modules: policy.modules,
      can_manage_team: policy.can_manage_team,
      tier: tierId,
      tier_label: tier?.label,
      tier_access: tier?.access,
      read_only: Boolean(roleMeta?.read_only),
    },
    auth_provider: "faos_signed_session",
  });
}
