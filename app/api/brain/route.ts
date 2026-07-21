import { NextRequest, NextResponse } from "next/server";
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

export async function GET() {
  const upstream = await fetchRender("brain", { method: "GET" });
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
  return NextResponse.json({ ...brainStatus(), source: "vercel-local" });
}
