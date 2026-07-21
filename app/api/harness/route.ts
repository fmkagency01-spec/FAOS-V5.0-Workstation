import { NextRequest, NextResponse } from "next/server";
import { harnessStatus, runHarnessCycle, type HarnessWorkerId } from "@/lib/harness-agents";
import { syncFactoryInventoryToFmk } from "@/lib/b2b-wig-store";
import {
  getFaosBackendBaseUrl,
  getBackendAuthHeaders,
  joinBackendUrl,
} from "@/lib/backend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function fetchRender(path: string, init?: RequestInit): Promise<Response | null> {
  const base = getFaosBackendBaseUrl();
  if (!base) return null;
  try {
    return await fetch(joinBackendUrl(path), {
      ...init,
      cache: "no-store",
      headers: getBackendAuthHeaders(init?.headers),
    });
  } catch {
    return null;
  }
}

export async function GET() {
  const upstream = await fetchRender("harness", { method: "GET" });
  if (upstream?.ok) {
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") || "application/json",
        "X-FAOS-Upstream": "render",
      },
    });
  }
  return NextResponse.json({ ...harnessStatus(), source: "vercel-local" });
}

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const upstream = await fetchRender("harness/cycle", { method: "POST", body: raw });
  if (upstream?.ok) {
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") || "application/json",
        "X-FAOS-Upstream": "render",
      },
    });
  }

  let body: { workers?: HarnessWorkerId[]; action?: string } = {};
  try {
    body = JSON.parse(raw || "{}") as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "sync-inventory") {
    const sync = syncFactoryInventoryToFmk();
    return NextResponse.json({
      ok: true,
      worker: "harness_gamma_inventory_sync",
      ...sync,
      source: "vercel-local",
    });
  }

  const result = await runHarnessCycle(body.workers);
  return NextResponse.json({ ...result, source: "vercel-local" });
}
