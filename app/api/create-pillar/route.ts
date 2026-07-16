import { NextRequest, NextResponse } from "next/server";
import {
  getCreatePillarNamespace,
  listCreatePillarEntities,
  processSupplyCommand,
  triggerGatekeeperProtocol,
  type CreatePillarPayload,
} from "@/lib/create-pillar";
import { getFaosBackendBaseUrl } from "@/lib/backend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function proxyToRender(request: NextRequest, method: "GET" | "POST") {
  const base = getFaosBackendBaseUrl();
  if (!base) return null;

  const target = `${base}/api/v5/create-pillar`;
  const init: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  };
  if (method === "POST") {
    init.body = await request.text();
  }

  const upstream = await fetch(target, init);
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") || "application/json",
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const proxied = await proxyToRender(request, "GET");
    if (proxied) return proxied;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Render proxy failed";
    return NextResponse.json(
      { error: `Backend proxy error: ${message}` },
      { status: 502 }
    );
  }

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
  // Clone-safe: read body once for local processing if proxy unavailable.
  const raw = await request.text();

  const base = getFaosBackendBaseUrl();
  if (base) {
    try {
      const upstream = await fetch(`${base}/api/v5/create-pillar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: raw,
        cache: "no-store",
      });
      const text = await upstream.text();
      return new NextResponse(text, {
        status: upstream.status,
        headers: {
          "Content-Type":
            upstream.headers.get("Content-Type") || "application/json",
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Render proxy failed";
      return NextResponse.json(
        { error: `Backend proxy error: ${message}` },
        { status: 502 }
      );
    }
  }

  let body: CreatePillarPayload & { action?: string };
  try {
    body = JSON.parse(raw) as CreatePillarPayload & { action?: string };
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
