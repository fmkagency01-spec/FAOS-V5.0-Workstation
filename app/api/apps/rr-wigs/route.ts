import { NextRequest, NextResponse } from "next/server";
import { loadRrWigsWorkspaceDb, rrWigsWorkspaceSummary } from "@/lib/b2b-wig-store";
import { brainStatus } from "@/lib/jarvis-brain";
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

export async function GET(request: NextRequest) {
  const resource = request.nextUrl.searchParams.get("resource") || "summary";

  const upstream = await fetchRender(
    `apps/rr-wigs?resource=${encodeURIComponent(resource)}`,
    { method: "GET" }
  );
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

  const db = loadRrWigsWorkspaceDb();
  if (resource === "analytics") {
    return NextResponse.json({
      ok: true,
      web_analytics: db.web_analytics,
      ad_spend: db.ad_spend,
      source: "vercel-local",
    });
  }
  if (resource === "linkedin") {
    return NextResponse.json({ ok: true, leads: db.linkedin_leads, source: "vercel-local" });
  }
  if (resource === "seo") {
    return NextResponse.json({ ok: true, rankings: db.seo_rankings, source: "vercel-local" });
  }
  if (resource === "inventory") {
    return NextResponse.json({
      ok: true,
      factory_inventory: db.factory_inventory,
      source: "vercel-local",
    });
  }
  if (resource === "inquiries") {
    return NextResponse.json({ ok: true, inquiries: db.b2b_inquiries, source: "vercel-local" });
  }

  return NextResponse.json({
    ok: true,
    brain_node: "rr_wigs_client_workspace",
    tenant_id: db.tenant_id,
    summary: rrWigsWorkspaceSummary(),
    brain: brainStatus(),
    source: "vercel-local",
  });
}
