import { NextResponse } from "next/server";

/**
 * FAOS uses signed-session cookie auth (`/api/auth/login`), not NextAuth.
 * This catch-all exists so docs/links expecting `[...nextauth]` resolve cleanly
 * and point integrators at the native multi-tenant RBAC endpoints.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function payload() {
  return {
    ok: true,
    provider: "faos_signed_session",
    nextauth: false,
    message:
      "FAOS v5 uses HMAC-signed session cookies with multi-tenant RBAC (owner/executive, team_lead, client). NextAuth is not installed — use /api/auth/login and /api/auth/session.",
    endpoints: {
      login: "POST /api/auth/login",
      logout: "POST /api/auth/logout",
      session: "GET /api/auth/session",
    },
    roles: {
      executive_alpha: ["owner", "executive"],
      team_leads: ["manager", "team_lead", "sales", "finance", "hr", "creative"],
      external_b2b: ["client", "viewer"],
    },
  };
}

export async function GET() {
  return NextResponse.json(payload());
}

export async function POST() {
  return NextResponse.json(payload(), { status: 501 });
}
