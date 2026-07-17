import { NextResponse } from "next/server";
import { getCreatePillarNamespace } from "@/lib/create-pillar";
import { getOpenRouterApiKey } from "@/lib/openrouter";
import { getBackendRootUrl, getFaosBackendBaseUrl } from "@/lib/backend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function probeRenderBackend(): Promise<{
  configured: boolean;
  status: "online" | "offline" | "not_configured";
  message?: string;
}> {
  const base = getFaosBackendBaseUrl();
  if (!base) {
    return { configured: false, status: "not_configured" };
  }

  try {
    const res = await fetch(getBackendRootUrl(), { cache: "no-store" });
    if (!res.ok) {
      return {
        configured: true,
        status: "offline",
        message: `Render responded ${res.status}`,
      };
    }
    const data = (await res.json()) as { status?: string; message?: string };
    return {
      configured: true,
      status: data.status === "active" ? "online" : "offline",
      message: data.message,
    };
  } catch (err) {
    return {
      configured: true,
      status: "offline",
      message: err instanceof Error ? err.message : "Render unreachable",
    };
  }
}

export async function GET() {
  const hasOpenRouterKey = Boolean(getOpenRouterApiKey());
  const createPillar = getCreatePillarNamespace();
  const render = await probeRenderBackend();

  return NextResponse.json({
    ok: true,
    service: "faos-v5-workstation-api",
    status: "operational",
    timestamp: new Date().toISOString(),
    gateway: {
      openrouter: hasOpenRouterKey ? "configured" : "missing_key",
    },
    backend: {
      url: getFaosBackendBaseUrl() || null,
      render,
    },
    pillars: {
      create: {
        namespace: "fmk_create_pillar_retail_core",
        parent_hub: createPillar.parent_hub,
        entities: Object.keys(createPillar.entities).length,
        status: "mounted",
      },
    },
  });
}
