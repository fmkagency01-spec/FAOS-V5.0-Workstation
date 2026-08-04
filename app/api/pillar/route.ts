import { NextRequest, NextResponse } from "next/server";
import {
  getBackendAuthHeaders,
  getFaosBackendOriginUrl,
} from "@/lib/backend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Next → Render proxy for FAOS multi-agent pillar router (/api/v1/pillar/*).
 * Falls back to a local catalog if Render is asleep.
 */

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

const LOCAL_CATALOG = {
  ok: true,
  framework: "FAOS Multi-Agent Pillar Router",
  version: "5.3.0",
  mode: "24/7 Active",
  source: "vercel-local",
  pillars: [
    {
      id: "create",
      name: "CREATE",
      routes: { status: "/api/pillar/create", route: "/api/pillar/create/route" },
    },
    {
      id: "media",
      name: "MEDIA",
      routes: { status: "/api/pillar/media", route: "/api/pillar/media/route" },
    },
    {
      id: "service",
      name: "SERVICE",
      routes: { status: "/api/pillar/service", route: "/api/pillar/service/route" },
    },
  ],
  locks: {
    fmk_wig: "fmk_wig_prosthetic_hair_agent",
    bulletseye: "fmk_bulletseye_core_namespace",
  },
};

export async function GET() {
  const upstream = await proxy("/api/v1/pillar", { method: "GET" });
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
  return NextResponse.json(LOCAL_CATALOG);
}
