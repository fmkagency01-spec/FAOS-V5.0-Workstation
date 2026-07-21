import { NextRequest, NextResponse } from "next/server";
import {
  executeSeoGeoSquad,
  squadStatus,
  type SeoGeoExecuteRequest,
} from "@/lib/bulletseye-squad";
import {
  getFaosBackendBaseUrl,
  getBackendAuthHeaders,
  joinBackendUrl,
} from "@/lib/backend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RENDER_TIMEOUT_MS = 65000;

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

export async function GET() {
  const upstream = await fetchRender("bulletseye/seo-geo-execute", { method: "GET" });
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

  return NextResponse.json({ ...squadStatus(), source: "vercel-local" });
}

export async function POST(request: NextRequest) {
  const raw = await request.text();

  const upstream = await fetchRender("bulletseye/seo-geo-execute", {
    method: "POST",
    body: raw || "{}",
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

  let body: SeoGeoExecuteRequest;
  try {
    body = JSON.parse(raw || "{}") as SeoGeoExecuteRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.brand_name && !body.brand_id) {
    return NextResponse.json(
      { error: "Provide brand_name or brand_id." },
      { status: 400 }
    );
  }

  try {
    const result = await executeSeoGeoSquad(body);
    return NextResponse.json({
      ...result,
      source: upstream ? "vercel-local-render-fallback" : "vercel-local",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Squad execution failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
