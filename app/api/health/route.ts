import { NextResponse } from "next/server";
import { getCreatePillarNamespace } from "@/lib/create-pillar";
import { getOpenRouterApiKey } from "@/lib/openrouter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const hasOpenRouterKey = Boolean(getOpenRouterApiKey());
  const createPillar = getCreatePillarNamespace();

  return NextResponse.json({
    ok: true,
    service: "faos-v5-workstation-api",
    status: "operational",
    timestamp: new Date().toISOString(),
    gateway: {
      openrouter: hasOpenRouterKey ? "configured" : "missing_key",
    },
    pillars: {
      create: {
        namespace: "fmk_create_pillar_retail_core",
        parent_hub: createPillar.parent_hub,
        entities: Object.keys(createPillar.entities).length,
        status: "mounted",
      },
    },
  });
}
