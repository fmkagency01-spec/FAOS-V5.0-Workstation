import { NextRequest, NextResponse } from "next/server";
import {
  generateFanOutQueries,
  getAiSeoModuleStatus,
  type AiSeoRequest,
} from "@/lib/ai-seo-geo";
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

export async function GET() {
  const upstream = await fetchRender("ai-seo", { method: "GET" });
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

  return NextResponse.json({
    ...getAiSeoModuleStatus(),
    source: "vercel-local",
  });
}

export async function POST(request: NextRequest) {
  const raw = await request.text();

  const upstream = await fetchRender("ai-seo", {
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

  let body: AiSeoRequest & { action?: string };
  try {
    body = JSON.parse(raw || "{}") as AiSeoRequest & { action?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const action = body.action || "fan-out";

  if (action === "status") {
    return NextResponse.json({
      ...getAiSeoModuleStatus(),
      source: "vercel-local",
      action,
    });
  }

  if (action === "fan-out" || action === "process") {
    const result = await generateFanOutQueries(body);
    return NextResponse.json({
      ...result,
      source: result.source === "openrouter" ? "vercel-openrouter" : "vercel-local",
      action,
    });
  }

  return NextResponse.json(
    { error: "Unknown action. Use action=fan-out|status." },
    { status: 400 }
  );
}
