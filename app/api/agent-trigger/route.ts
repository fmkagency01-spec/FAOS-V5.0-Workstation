import { NextRequest, NextResponse } from "next/server";
import { joinBackendUrl, getFaosBackendBaseUrl } from "@/lib/backend";
import {
  processSupplyCommand,
  triggerGatekeeperProtocol,
} from "@/lib/create-pillar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const base = getFaosBackendBaseUrl();
  if (base) {
    try {
      const upstream = await fetch(joinBackendUrl("api/v5/agent-trigger"), {
        cache: "no-store",
      });
      if (upstream.ok) {
        return new NextResponse(await upstream.text(), {
          status: upstream.status,
          headers: {
            "Content-Type":
              upstream.headers.get("Content-Type") || "application/json",
          },
        });
      }
    } catch {
      /* fall through */
    }
  }

  return NextResponse.json({
    ok: true,
    endpoint: "/api/agent-trigger",
    status: "ready",
    message: "FAOS agent trigger channel online (Vercel local)",
    backend: base || null,
  });
}

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const base = getFaosBackendBaseUrl();

  if (base) {
    try {
      const upstream = await fetch(joinBackendUrl("api/v5/agent-trigger"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: raw,
        cache: "no-store",
      });
      if (upstream.ok) {
        return new NextResponse(await upstream.text(), {
          status: upstream.status,
          headers: {
            "Content-Type":
              upstream.headers.get("Content-Type") || "application/json",
          },
        });
      }
    } catch {
      /* fall through to local */
    }
  }

  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(raw || "{}") as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const target =
    (typeof body.target_brand === "string" && body.target_brand) ||
    (typeof body.agent === "string" && body.agent) ||
    "fmk_wig_prosthetic_hair_agent";

  const routing = processSupplyCommand({
    target_brand: target,
    request_type:
      (typeof body.request_type === "string" && body.request_type) ||
      "Production_Request",
    sku_details:
      typeof body.sku_details === "object" && body.sku_details
        ? (body.sku_details as Record<string, unknown>)
        : {},
  });

  const action = typeof body.action === "string" ? body.action : "process";
  const gatekeeper =
    action === "gatekeeper" || action === "deploy" || action === "live"
      ? triggerGatekeeperProtocol({ target_brand: target })
      : null;

  return NextResponse.json({
    ok: true,
    source: "vercel-local",
    endpoint: "/api/agent-trigger",
    action,
    routing,
    gatekeeper,
  });
}
