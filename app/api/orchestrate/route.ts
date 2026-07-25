import { NextRequest, NextResponse } from "next/server";
import {
  getFaosBackendBaseUrl,
  getBackendAuthHeaders,
  joinBackendUrl,
} from "@/lib/backend";
import { orchestrateStatusLocal, runOrchestrateTickLocal } from "@/lib/orchestrate";

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
  const upstream = await fetchRender("orchestrate", { method: "GET" });
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
  return NextResponse.json(orchestrateStatusLocal());
}

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const upstream = await fetchRender("orchestrate/tick", {
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

  let body: { jobs?: string[]; use_llm?: boolean } = {};
  try {
    body = JSON.parse(raw || "{}") as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = await runOrchestrateTickLocal(body);
  return NextResponse.json(result);
}
