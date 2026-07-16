import { NextResponse } from "next/server";
import { getOpenRouterApiKey } from "@/lib/openrouter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const hasOpenRouterKey = Boolean(getOpenRouterApiKey());

  return NextResponse.json({
    ok: true,
    service: "faos-v5-workstation-api",
    status: "operational",
    timestamp: new Date().toISOString(),
    gateway: {
      openrouter: hasOpenRouterKey ? "configured" : "missing_key",
    },
  });
}
