import { NextRequest, NextResponse } from "next/server";
import {
  addB2bLead,
  fmkWigB2bSummary,
  getMigrations,
  loadFmkWigB2bDb,
} from "@/lib/b2b-wig-store";
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
    `apps/fmk-wig?resource=${encodeURIComponent(resource)}`,
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

  const db = loadFmkWigB2bDb();
  if (resource === "leads") {
    return NextResponse.json({ ok: true, leads: db.b2b_leads, source: "vercel-local" });
  }
  if (resource === "orders") {
    return NextResponse.json({ ok: true, orders: db.salon_orders, source: "vercel-local" });
  }
  if (resource === "catalog") {
    return NextResponse.json({
      ok: true,
      export_catalog: db.export_catalog,
      import_catalog: db.import_catalog,
      source: "vercel-local",
    });
  }
  if (resource === "buyers") {
    return NextResponse.json({ ok: true, buyers: db.global_buyers, source: "vercel-local" });
  }
  if (resource === "migrations") {
    return NextResponse.json({ ok: true, migrations: getMigrations(), source: "vercel-local" });
  }

  return NextResponse.json({
    ok: true,
    brain_node: "fmk_wig_internal_engine",
    summary: fmkWigB2bSummary(),
    brain: brainStatus(),
    source: "vercel-local",
  });
}

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const upstream = await fetchRender("apps/fmk-wig", { method: "POST", body: raw });
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

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw || "{}") as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.company || !body.email) {
    return NextResponse.json({ error: "company and email required" }, { status: 400 });
  }

  const lead = addB2bLead({
    company: String(body.company),
    contact_name: String(body.contact_name || ""),
    email: String(body.email),
    phone: String(body.phone || ""),
    country: String(body.country || ""),
    lead_source: String(body.lead_source || "api"),
    pipeline_stage: "new",
    estimated_value_usd: Number(body.estimated_value_usd || 0),
    assigned_agent: "fmk_wig_prosthetic_hair_agent",
  });

  return NextResponse.json({ ok: true, lead, source: "vercel-local" }, { status: 201 });
}
