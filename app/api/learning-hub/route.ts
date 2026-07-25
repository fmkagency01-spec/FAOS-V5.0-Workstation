import { NextRequest, NextResponse } from "next/server";
import {
  getFaosBackendBaseUrl,
  getBackendAuthHeaders,
  joinBackendUrl,
} from "@/lib/backend";
import {
  learningHubStatusLocal,
  listLearningHubLocal,
  pushLearningHubLocal,
} from "@/lib/learning-hub-store";
import { getSessionFromRequest } from "@/lib/auth";

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
  const limit = new URL(request.url).searchParams.get("limit") || "50";
  const upstream = await fetchRender(`learning-hub?limit=${encodeURIComponent(limit)}`, {
    method: "GET",
  });
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

  return NextResponse.json({
    ...learningHubStatusLocal(),
    items: listLearningHubLocal(Number(limit) || 50),
  });
}

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const upstream = await fetchRender("learning-hub", {
    method: "POST",
    body: raw || "{}",
  });
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

  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(raw || "{}") as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const session = await getSessionFromRequest(request);
  try {
    const item = pushLearningHubLocal({
      title: String(body.title || ""),
      kind: body.kind ? String(body.kind) : undefined,
      url: body.url ? String(body.url) : undefined,
      content: body.content ? String(body.content) : undefined,
      memory_namespace: body.memory_namespace
        ? String(body.memory_namespace)
        : undefined,
      pillar: body.pillar ? String(body.pillar) : undefined,
      tags: Array.isArray(body.tags)
        ? body.tags.map((t) => String(t))
        : undefined,
      submitted_by: session?.username || session?.name || "admin",
      auto_ingest: body.auto_ingest !== false,
    });
    return NextResponse.json({ ok: true, item, source: "vercel-local" }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 400 }
    );
  }
}
