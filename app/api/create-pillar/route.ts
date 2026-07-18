import { NextRequest, NextResponse } from "next/server";
import {
  getCreatePillarNamespace,
  listCreatePillarEntities,
  processSupplyCommand,
  triggerGatekeeperProtocol,
  type CreatePillarPayload,
} from "@/lib/create-pillar";
import { joinBackendUrl, getFaosBackendBaseUrl, getBackendAuthHeaders } from "@/lib/backend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RENDER_TIMEOUT_MS = 60000;

async function fetchRender(path: string, init?: RequestInit): Promise<Response | null> {
  const base = getFaosBackendBaseUrl();
  if (!base) return null;

  const target = joinBackendUrl(path);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RENDER_TIMEOUT_MS);

  try {
    return await fetch(target, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
      headers: getBackendAuthHeaders(init?.headers),
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function localCreatePillarGet() {
  const pillar = getCreatePillarNamespace();
  return NextResponse.json({
    ok: true,
    source: "vercel-local",
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

export async function GET() {
  const upstream = await fetchRender("create-pillar", { method: "GET" });
  if (upstream && upstream.ok) {
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") || "application/json",
        "X-FAOS-Upstream": "render",
      },
    });
  }

  // Render free-tier may be asleep / not provisioned yet — keep dashboard online.
  return localCreatePillarGet();
}

export async function POST(request: NextRequest) {
  const raw = await request.text();

  const upstream = await fetchRender("create-pillar", {
    method: "POST",
    body: raw,
  });

  if (upstream && upstream.ok) {
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") || "application/json",
        "X-FAOS-Upstream": "render",
      },
    });
  }

  let body: CreatePillarPayload & { action?: string };
  try {
    body = JSON.parse(raw || "{}") as CreatePillarPayload & { action?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const action = body.action || "process";

  if (action === "gatekeeper") {
    const result = triggerGatekeeperProtocol(body);
    return NextResponse.json({ ok: true, source: "vercel-local", action, ...result });
  }

  if (action === "process") {
    const result = processSupplyCommand(body);
    return NextResponse.json({ ok: true, source: "vercel-local", action, ...result });
  }

  return NextResponse.json(
    { error: "Unknown action. Use action=process|gatekeeper." },
    { status: 400 }
  );
}
