import { NextRequest, NextResponse } from "next/server";
import {
  getCreatePillarNamespace,
  listCreatePillarEntities,
  processSupplyCommand,
  triggerGatekeeperProtocol,
  type CreatePillarPayload,
} from "@/lib/create-pillar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const pillar = getCreatePillarNamespace();
  return NextResponse.json({
    ok: true,
    namespace: "fmk_create_pillar_retail_core",
    parent_hub: pillar.parent_hub,
    holding_umbrella: pillar.holding_umbrella,
    parent_manufacturing_anchor: pillar.parent_manufacturing_anchor,
    gatekeeper_protocol: pillar.gatekeeper_protocol,
    entities: listCreatePillarEntities(),
    future_extensions: pillar.future_extensions,
    cross_pillar_routes: pillar.cross_pillar_routes,
  });
}

export async function POST(request: NextRequest) {
  let body: CreatePillarPayload & { action?: string };
  try {
    body = (await request.json()) as CreatePillarPayload & { action?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const action = body.action || "process";

  if (action === "gatekeeper") {
    const result = triggerGatekeeperProtocol(body);
    return NextResponse.json({ ok: true, action, ...result });
  }

  if (action === "process") {
    const result = processSupplyCommand(body);
    return NextResponse.json({ ok: true, action, ...result });
  }

  return NextResponse.json(
    { error: "Unknown action. Use action=process|gatekeeper." },
    { status: 400 }
  );
}
