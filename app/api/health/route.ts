import { NextResponse } from "next/server";
import { getCreatePillarNamespace } from "@/lib/create-pillar";
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

export async function GET() {
  const hasOpenRouterKey = Boolean(getOpenRouterApiKey());
  const openrouterProbe = await probeOpenRouterKey();
  const ownerPassword = resolveOwnerPassword();
  const createPillar = getCreatePillarNamespace();
  const render = await probeRenderBackend();

  return NextResponse.json({
    ok: true,
    service: "faos-v5-workstation-api",
    version: "5.3.0",
    status: "operational",
    timestamp: new Date().toISOString(),
    tac: { pillars: 3, brain: "TAC Central Command", jarvis_agents: 25 },
    jarvis: {
      shell_agents: 25,
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
