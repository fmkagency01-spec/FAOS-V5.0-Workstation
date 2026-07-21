import { NextResponse } from "next/server";
import { getCreatePillarNamespace } from "@/lib/create-pillar";
import { getAiSeoModuleStatus } from "@/lib/ai-seo-geo";
import { getOpenRouterApiKey } from "@/lib/openrouter";
import { probeOpenRouterKey } from "@/lib/openrouter-probe";
import { resolveOwnerPassword } from "@/lib/auth";
import { isAuthSecretConfigured } from "@/lib/auth-crypto";
import {
  getBackendRootUrl,
  getFaosBackendBaseUrl,
  getBackendDocsUrl,
  isBackendApiKeyConfigured,
} from "@/lib/backend";
import { OPENROUTER_GUARD_CONFIG } from "@/lib/openrouter-guard";
import { erpModuleCountsLocal } from "@/lib/erp-store";
import { tacLocalHealth } from "@/lib/tac-events";
import { cachedProbe, warmBackend } from "@/lib/health-cache";
import { buildTacSyncStatus } from "@/lib/tac-ecosystem";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Bundle health probes — keep init work parallel + cached to cut cold-start latency. */
export const preferredRegion = "iad1";

type ModuleState = {
  status: "operational" | "degraded" | "offline";
  records: number;
  source: "render" | "vercel-local" | "unknown";
};

async function probeRenderBackend(): Promise<{
  configured: boolean;
  status: "online" | "offline" | "not_configured";
  message?: string;
  docs_url?: string;
  modules?: Record<string, { status?: string; records?: number }>;
  tac?: {
    status?: string;
    last_sync?: string | null;
    commands?: number;
    intelligence_logs?: number;
  };
}> {
  const base = getFaosBackendBaseUrl();
  if (!base) {
    return { configured: false, status: "not_configured" };
  }

  return cachedProbe("render-health", 20_000, async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);

    try {
      // Prefer versioned health (module broadcast); fall back to root.
      const healthUrl = `${base.replace(/\/+$/, "")}/health`;
      let res = await fetch(healthUrl, {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!res.ok) {
        res = await fetch(getBackendRootUrl(), {
          cache: "no-store",
          signal: controller.signal,
        });
      }
      if (!res.ok) {
        return {
          configured: true,
          status: "offline" as const,
          message: `Render responded ${res.status}`,
          docs_url: getBackendDocsUrl() || undefined,
        };
      }
      const data = (await res.json()) as {
        status?: string;
        message?: string;
        modules?: Record<string, { status?: string; records?: number }>;
        tac?: {
          status?: string;
          last_sync?: string | null;
          commands?: number;
          intelligence_logs?: number;
        };
      };
      return {
        configured: true,
        status: data.status === "active" ? ("online" as const) : ("offline" as const),
        message: data.message,
        docs_url: getBackendDocsUrl() || undefined,
        modules: data.modules,
        tac: data.tac,
      };
    } catch (err) {
      return {
        configured: true,
        status: "offline" as const,
        message: err instanceof Error ? err.message : "Render unreachable",
        docs_url: getBackendDocsUrl() || undefined,
      };
    } finally {
      clearTimeout(timer);
    }
  });
}

function notificationStatus(): {
  resend: "configured" | "missing";
  default_to: "configured" | "missing";
  fallback: "outbox";
} {
  return {
    resend: process.env.RESEND_API_KEY?.trim() ? "configured" : "missing",
    default_to: process.env.FAOS_NOTIFY_DEFAULT_TO?.trim() ? "configured" : "missing",
    fallback: "outbox",
  };
}

function buildModuleStates(
  render: Awaited<ReturnType<typeof probeRenderBackend>>,
  localCounts: ReturnType<typeof erpModuleCountsLocal>
): Record<string, ModuleState> {
  const keys = ["invoicing", "inventory", "hr", "orders", "products"] as const;
  const localKey: Record<(typeof keys)[number], keyof typeof localCounts> = {
    invoicing: "invoices",
    inventory: "inventory",
    hr: "employees",
    orders: "orders",
    products: "products",
  };

  const modules: Record<string, ModuleState> = {};
  for (const key of keys) {
    const remote = render.modules?.[key];
    if (render.status === "online" && remote) {
      modules[key] = {
        status: (remote.status as ModuleState["status"]) || "operational",
        records: Number(remote.records ?? 0),
        source: "render",
      };
    } else {
      modules[key] = {
        status: render.status === "offline" ? "degraded" : "operational",
        records: localCounts[localKey[key]],
        source: render.status === "online" ? "render" : "vercel-local",
      };
    }
  }
  return modules;
}

export async function GET() {
  const root = getBackendRootUrl();
  if (root) warmBackend(root);

  const hasOpenRouterKey = Boolean(getOpenRouterApiKey());
  const createPillar = getCreatePillarNamespace();
  const aiSeo = getAiSeoModuleStatus();
  const localCounts = erpModuleCountsLocal();
  const localTac = tacLocalHealth();

  const [openrouterProbe, render] = await Promise.all([
    cachedProbe("openrouter-probe", 30_000, () => probeOpenRouterKey()),
    probeRenderBackend(),
  ]);

  const modules = buildModuleStates(render, localCounts);
  const tacStatus = buildTacSyncStatus(render.status === "online");
  const ownerPassword = resolveOwnerPassword();

  const moduleStatuses = Object.values(modules).map((m) => m.status);
  const overall =
    render.status === "offline" && !hasOpenRouterKey
      ? "degraded"
      : moduleStatuses.includes("offline")
        ? "degraded"
        : "operational";

  return NextResponse.json(
    {
      ok: true,
      service: "faos-v5-workstation-api",
      version: "5.3.0",
      status: overall,
      timestamp: new Date().toISOString(),
      modules: {
        ...modules,
        tac: {
          status:
            render.status === "online"
              ? render.tac?.status || "operational"
              : localTac.status,
          records:
            render.tac?.intelligence_logs ?? localTac.intelligence_logs,
          source: render.status === "online" ? "render" : "vercel-local",
          last_sync: render.tac?.last_sync ?? localTac.last_event,
          commands: render.tac?.commands ?? 0,
          pillars: tacStatus.pillars.length,
        },
      },
      tac: {
        pillars: tacStatus.pillars.length,
        brain: "TAC Central Command",
        jarvis_agents: tacStatus.jarvis.agents,
        intelligence_logs:
          render.tac?.intelligence_logs ?? localTac.intelligence_logs,
        sync: tacStatus.pillars.map((p) => ({
          id: p.id,
          name: p.name,
          sync: p.sync,
        })),
      },
      jarvis: {
        shell_agents: 26,
        voice: true,
        erp_modules: ["invoicing", "inventory", "hr", "orders", "products"],
      },
      gateway: {
        openrouter: hasOpenRouterKey ? "configured" : "missing_key",
        openrouter_status: openrouterProbe.status,
        openrouter_message: openrouterProbe.message ?? null,
      },
      auth: {
        owner_password_configured: Boolean(ownerPassword),
        owner_password_env: process.env.FAOS_OWNER_PASSWORD?.trim()
          ? "FAOS_OWNER_PASSWORD"
          : process.env.FAOS_OWNER_PASSWRD?.trim()
            ? "FAOS_OWNER_PASSWRD"
            : null,
        auth_secret_configured: isAuthSecretConfigured(),
      },
      notifications: notificationStatus(),
      backend: {
        url: getFaosBackendBaseUrl() || null,
        api_key_configured: isBackendApiKeyConfigured(),
        render: {
          configured: render.configured,
          status: render.status,
          message: render.message,
          docs_url: render.docs_url,
        },
      },
      pillars: {
        create: {
          namespace: "fmk_create_pillar_retail_core",
          parent_hub: createPillar.parent_hub,
          entities: Object.keys(createPillar.entities).length,
          status: "mounted",
        },
        bulletseye_ai_seo: {
          namespace: "fmk_bulletseye_core_namespace",
          module: aiSeo.module,
          status: aiSeo.status,
          brands: aiSeo.brands.length,
          core_strategy: aiSeo.core_strategy,
        },
      },
      safety: {
        status: "active",
        max_daily_requests: OPENROUTER_GUARD_CONFIG.maxDailyRequests,
        max_per_minute: OPENROUTER_GUARD_CONFIG.maxPerMinute,
        abort_completion_tokens_at_or_below:
          OPENROUTER_GUARD_CONFIG.abortCompletionTokensAtOrBelow,
      },
      performance: {
        probe_cache_ttl_ms: { render: 20_000, openrouter: 30_000 },
        warm_backend: Boolean(root),
      },
    },
    {
      headers: {
        // Short private cache for edge/CDN between serverless instances of the same region.
        "Cache-Control": "private, max-age=5, stale-while-revalidate=15",
      },
    }
  );
}
