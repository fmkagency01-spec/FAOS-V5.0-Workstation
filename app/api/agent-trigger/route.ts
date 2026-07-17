import { NextRequest, NextResponse } from "next/server";
import { joinBackendUrl, getFaosBackendBaseUrl } from "@/lib/backend";
import {
  processSupplyCommand,
  triggerGatekeeperProtocol,
} from "@/lib/create-pillar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RENDER_TIMEOUT_MS = 60000;

async function fetchRender(
  path: string,
  init?: RequestInit
): Promise<Response | null> {
  const base = getFaosBackendBaseUrl();
  if (!base) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RENDER_TIMEOUT_MS);

  try {
    return await fetch(joinBackendUrl(path), {
      ...init,
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function GET() {
  const base = getFaosBackendBaseUrl();
  if (base) {
    const upstream = await fetchRender("api/v5/agent-trigger", { method: "GET" });
    if (upstream?.ok) {
      return new NextResponse(await upstream.text(), {
        status: upstream.status,
        headers: {
          "Content-Type":
            upstream.headers.get("Content-Type") || "application/json",
          "X-FAOS-Upstream": "render",
        },
      });
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
    const upstream = await fetchRender("api/v5/agent-trigger", {
      method: "POST",
      body: raw,
    });
    if (upstream?.ok) {
      return new NextResponse(await upstream.text(), {
        status: upstream.status,
        headers: {
          "Content-Type":
            upstream.headers.get("Content-Type") || "application/json",
          "X-FAOS-Upstream": "render",
        },
      });
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
