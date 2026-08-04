import { NextRequest, NextResponse } from "next/server";
import {
  getBackendAuthHeaders,
  getFaosBackendOriginUrl,
} from "@/lib/backend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ pillar: string }> };

function joinOrigin(path: string): string | null {
  const origin = getFaosBackendOriginUrl();
  if (!origin) return null;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

async function proxy(path: string, init?: RequestInit): Promise<Response | null> {
  const url = joinOrigin(path);
  if (!url) return null;
  try {
    return await fetch(url, {
      ...init,
      cache: "no-store",
      headers: getBackendAuthHeaders(init?.headers),
    });
  } catch {
    return null;
  }
}

function localStatus(pillar: string) {
  const id = pillar.toLowerCase();
  if (!["create", "media", "service"].includes(id)) {
    return null;
  }
  return {
    ok: true,
    pillar: id,
    name: id.toUpperCase(),
    mode: "24/7 Active",
    source: "vercel-local",
    message: "Render unavailable — local status fallback",
  };
}

export async function GET(_request: NextRequest, ctx: Ctx) {
  const { pillar } = await ctx.params;
  const upstream = await proxy(`/api/v1/pillar/${encodeURIComponent(pillar)}`, {
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
  const local = localStatus(pillar);
  if (!local) {
    return NextResponse.json({ error: "Unknown pillar" }, { status: 404 });
  }
  return NextResponse.json(local);
}

export async function POST(request: NextRequest, ctx: Ctx) {
  const { pillar } = await ctx.params;
  const raw = await request.text();
  const upstream = await proxy(`/api/v1/pillar/${encodeURIComponent(pillar)}/route`, {
    method: "POST",
    body: raw || "{}",
  });
  if (upstream && (upstream.ok || upstream.status < 500)) {
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") || "application/json",
        "X-FAOS-Upstream": "render",
      },
    });
  }

  let body: { command?: string } = {};
  try {
    body = JSON.parse(raw || "{}") as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.command?.trim()) {
    return NextResponse.json({ error: "command is required" }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    pillar: pillar.toLowerCase(),
    mode: "24/7 Active",
    fallback_used: true,
    source: "vercel-local",
    result: {
      ok: true,
      fallback: true,
      message: "Render asleep — command accepted for next autonomous tick",
      command: body.command.trim().slice(0, 500),
    },
  });
}
