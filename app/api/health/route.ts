import { NextResponse } from "next/server";
import { getCreatePillarNamespace } from "@/lib/create-pillar";
import { getOpenRouterApiKey } from "@/lib/openrouter";
import { probeOpenRouterKey } from "@/lib/openrouter-probe";
import {
  getBackendRootUrl,
  getFaosBackendBaseUrl,
  getBackendDocsUrl,
} from "@/lib/backend";
import { OPENROUTER_GUARD_CONFIG } from "@/lib/openrouter-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function probeRenderBackend(): Promise<{
  configured: boolean;
  status: "online" | "offline" | "not_configured";
  message?: string;
  docs_url?: string;
}> {
  const base = getFaosBackendBaseUrl();
  if (!base) {
    return { configured: false, status: "not_configured" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);

  try {
    const res = await fetch(getBackendRootUrl(), {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) {
      return {
        configured: true,
        status: "offline",
        message: `Render responded ${res.status}`,
        docs_url: getBackendDocsUrl() || undefined,
      };
    }
    const data = (await res.json()) as { status?: string; message?: string };
    return {
      configured: true,
      status: data.status === "active" ? "online" : "offline",
      message: data.message,
      docs_url: getBackendDocsUrl() || undefined,
    };
  } catch (err) {
    return {
      configured: true,
      status: "offline",
      message: err instanceof Error ? err.message : "Render unreachable",
      docs_url: getBackendDocsUrl() || undefined,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function GET() {
  const hasOpenRouterKey = Boolean(getOpenRouterApiKey());
  const openrouterProbe = await probeOpenRouterKey();
  const createPillar = getCreatePillarNamespace();
  const render = await probeRenderBackend();

  return NextResponse.json({
    ok: true,
    service: "faos-v5-workstation-api",
    version: "5.3.0",
    status: "operational",
    timestamp: new Date().toISOString(),
    tac: { pillars: 3, brain: "TAC Central Command", jarvis_agents: 25 },
    jarvis: { shell_agents: 25, voice: true, erp_modules: ["invoicing", "inventory", "hr"] },
    gateway: {
      openrouter: hasOpenRouterKey ? "configured" : "missing_key",
      openrouter_status: openrouterProbe.status,
      openrouter_message: openrouterProbe.message ?? null,
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
    safety: {
      status: "active",
      max_daily_requests: OPENROUTER_GUARD_CONFIG.maxDailyRequests,
      max_per_minute: OPENROUTER_GUARD_CONFIG.maxPerMinute,
      abort_completion_tokens_at_or_below:
        OPENROUTER_GUARD_CONFIG.abortCompletionTokensAtOrBelow,
    },
  });
}
