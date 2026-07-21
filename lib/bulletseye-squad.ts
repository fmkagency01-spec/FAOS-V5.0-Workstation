/**
 * BulletsEye SEO & GEO Autonomous Agent Squad
 * Namespace: fmk_bulletseye_core_namespace
 *
 * Agents (isolated sub-routines):
 *  - fmk_seo_lead_agent        → Fan-Out / H2 structure
 *  - fmk_geo_engine_agent      → JSON-LD fact schema packages
 *  - fmk_schema_backend_agent  → Next.js Metadata + head JSON-LD
 *  - fmk_website_injector_agent → Webhook / internal route push
 */

import {
  generateFanOutQueries,
  type AiSeoFanOutResult,
  type SchemaBlock,
} from "@/lib/ai-seo-geo";
import { sanitizeSchemaBlocks } from "@/lib/schema-sanitize";
import {
  loadLatestInjectionForBrand,
  newInjectionId,
  saveInjectionRecord,
  type StoredInjection,
} from "@/lib/bulletseye-store";

export const SQUAD_AGENTS = {
  seo_lead: "fmk_seo_lead_agent",
  geo_engine: "fmk_geo_engine_agent",
  schema_backend: "fmk_schema_backend_agent",
  website_injector: "fmk_website_injector_agent",
} as const;

export type SeoGeoExecuteRequest = {
  brand_name?: string;
  brand_id?: string;
  target_url?: string;
  query_type?: string;
  client_type?: "internal" | "external_b2b";
  auto_inject_flag?: boolean;
  client_topic?: string;
  use_llm?: boolean;
};

export type AgentStepResult = {
  agent: string;
  status: "completed" | "skipped" | "offline_fallback";
  summary: string;
  payload?: Record<string, unknown>;
};

export type SeoGeoExecuteResult = {
  ok: true;
  namespace: "fmk_bulletseye_core_namespace";
  execution_id: string;
  brand_name: string;
  brand_id: string;
  target_url: string;
  client_type: string;
  query_type: string;
  auto_inject_flag: boolean;
  squad_pipeline: AgentStepResult[];
  fan_out: AiSeoFanOutResult;
  schema_blocks: SchemaBlock[];
  next_metadata: StoredInjection["next_metadata"];
  direct_answers: StoredInjection["direct_answers"];
  storage: {
    record_id: string;
    path_hint: string;
    injection_status: StoredInjection["injection_status"];
    internal_route?: string;
  };
  injector?: {
    attempted: boolean;
    target: string;
    http_status?: number;
    message: string;
  };
};

/** Internal shell brand → FAOS page route for autonomous injection. */
const INTERNAL_ROUTES: Record<string, string> = {
  fmk_wig_prosthetic_hair_agent: "/products/fmk-wig",
  fmk_mk_clothing_lifestyle_agent: "/products",
  fmk_shoes_footwear_wing: "/products",
  takabachaw_fintech_agent: "/products",
};

function resolveTargetUrl(brandId: string, explicit?: string): string {
  if (explicit?.trim()) return explicit.trim();
  const internal = INTERNAL_ROUTES[brandId];
  if (internal) {
    const site =
      process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
      "https://faos-v5-0-workstation.vercel.app";
    return `${site.replace(/\/+$/, "")}${internal}`;
  }
  return "";
}

function buildNextMetadata(
  brandName: string,
  topic: string,
  fanOut: AiSeoFanOutResult
): StoredInjection["next_metadata"] {
  const description =
    fanOut.fan_out_queries[0]?.direct_answer ||
    `${brandName} — ${topic} · AI SEO / GEO optimized for generative search.`;
  const title = `${brandName} — ${topic} | FAOS BulletsEye`;
  return {
    title: title.slice(0, 120),
    description: description.slice(0, 300),
    openGraph: {
      title: title.slice(0, 120),
      description: description.slice(0, 300),
    },
  };
}

/** Agent 1 — fmk_seo_lead_agent */
async function runSeoLeadAgent(
  input: SeoGeoExecuteRequest
): Promise<{ fanOut: AiSeoFanOutResult; step: AgentStepResult }> {
  const fanOut = await generateFanOutQueries({
    brand_name: input.brand_name,
    brand_id: input.brand_id,
    client_topic: input.client_topic || input.query_type,
    channel: input.client_type,
    use_llm: input.use_llm,
  });
  return {
    fanOut,
    step: {
      agent: SQUAD_AGENTS.seo_lead,
      status: "completed",
      summary: `Generated ${fanOut.fan_out_queries.length} fan-out sub-queries and ${fanOut.recommended_h2_headers.length} H2 headers.`,
      payload: {
        recommended_h2_headers: fanOut.recommended_h2_headers,
        cluster_plan: fanOut.cluster_plan,
      },
    },
  };
}

/** Agent 2 — fmk_geo_engine_agent */
function runGeoEngineAgent(fanOut: AiSeoFanOutResult): AgentStepResult {
  const blocks = sanitizeSchemaBlocks(fanOut.schema_blocks);
  return {
    agent: SQUAD_AGENTS.geo_engine,
    status: "completed",
    summary: `Built ${blocks.length} JSON-LD blocks (Organization · FAQPage · Product) for generative engines.`,
    payload: {
      schema_types: blocks.map((b) => b.type),
      target_platforms: fanOut.delivery,
    },
  };
}

/** Agent 3 — fmk_schema_backend_agent */
function runSchemaBackendAgent(
  fanOut: AiSeoFanOutResult,
  record: StoredInjection
): AgentStepResult {
  return {
    agent: SQUAD_AGENTS.schema_backend,
    status: "completed",
    summary: "Prepared sanitized Next.js Metadata + JSON-LD head injection pack.",
    payload: {
      record_id: record.id,
      next_metadata: record.next_metadata,
      schema_block_count: record.schema_blocks.length,
      internal_route: record.internal_route,
    },
  };
}

/** Agent 4 — fmk_website_injector_agent */
async function runWebsiteInjectorAgent(
  record: StoredInjection,
  autoInject: boolean
): Promise<{ step: AgentStepResult; injector?: SeoGeoExecuteResult["injector"] }> {
  if (!autoInject) {
    return {
      step: {
        agent: SQUAD_AGENTS.website_injector,
        status: "skipped",
        summary: "auto_inject_flag=false — schema stored only; no remote push.",
      },
    };
  }

  const target = record.target_url;
  if (!target) {
    return {
      step: {
        agent: SQUAD_AGENTS.website_injector,
        status: "offline_fallback",
        summary: "No target_url — stored locally for manual pickup.",
      },
      injector: {
        attempted: false,
        target: "",
        message: "Missing target_url",
      },
    };
  }

  const webhookKey = process.env.BULLETSEYE_INJECT_WEBHOOK_KEY?.trim();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "FAOS-BulletsEye-Injector/5.0",
  };
  if (webhookKey) {
    headers["X-FAOS-Inject-Key"] = webhookKey;
  }

  const body = JSON.stringify({
    brand_name: record.brand_name,
    brand_id: record.brand_id,
    schema_blocks: record.schema_blocks,
    recommended_h2_headers: record.recommended_h2_headers,
    direct_answers: record.direct_answers,
    next_metadata: record.next_metadata,
    source: "fmk_bulletseye_core_namespace",
    record_id: record.id,
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);

  try {
    const res = await fetch(target, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      return {
        step: {
          agent: SQUAD_AGENTS.website_injector,
          status: "completed",
          summary: `Pushed schema pack to ${target} (HTTP ${res.status}).`,
        },
        injector: {
          attempted: true,
          target,
          http_status: res.status,
          message: "Remote injection accepted",
        },
      };
    }

    return {
      step: {
        agent: SQUAD_AGENTS.website_injector,
        status: "offline_fallback",
        summary: `Target responded ${res.status} — local JSON store retained.`,
      },
      injector: {
        attempted: true,
        target,
        http_status: res.status,
        message: "Target rejected payload; fallback to local store",
      },
    };
  } catch (err) {
    clearTimeout(timer);
    const message = err instanceof Error ? err.message : "Target unreachable";
    return {
      step: {
        agent: SQUAD_AGENTS.website_injector,
        status: "offline_fallback",
        summary: `Target offline or unreachable (${message}) — local store retained.`,
      },
      injector: {
        attempted: true,
        target,
        message: `Offline fallback: ${message}`,
      },
    };
  }
}

/**
 * Autonomous squad execution — runs all 4 agents sequentially.
 * Never returns secrets; schema is sanitized before storage/injection.
 */
export async function executeSeoGeoSquad(
  input: SeoGeoExecuteRequest = {}
): Promise<SeoGeoExecuteResult> {
  const { fanOut, step: leadStep } = await runSeoLeadAgent(input);
  const geoStep = runGeoEngineAgent(fanOut);

  const brandId = fanOut.brand_id;
  const brandName = fanOut.brand_name;
  const clientType = input.client_type || fanOut.channel;
  const queryType = input.query_type || fanOut.client_topic;
  const targetUrl = resolveTargetUrl(brandId, input.target_url);
  const autoInject = Boolean(input.auto_inject_flag);
  const internalRoute = INTERNAL_ROUTES[brandId];

  const schemaBlocks = sanitizeSchemaBlocks(fanOut.schema_blocks);
  const directAnswers = fanOut.fan_out_queries.map((q) => ({
    h2: q.recommended_h2,
    answer: q.direct_answer,
  }));
  const nextMetadata = buildNextMetadata(brandName, fanOut.client_topic, fanOut);

  const recordId = newInjectionId(brandName);
  let injectionStatus: StoredInjection["injection_status"] = "stored";

  const record: StoredInjection = {
    id: recordId,
    brand_name: brandName,
    brand_id: brandId,
    target_url: targetUrl,
    client_type: clientType,
    query_type: queryType,
    stored_at: new Date().toISOString(),
    schema_blocks: schemaBlocks,
    recommended_h2_headers: fanOut.recommended_h2_headers,
    direct_answers: directAnswers,
    next_metadata: nextMetadata,
    injection_status: injectionStatus,
    internal_route: internalRoute,
  };

  const schemaStep = runSchemaBackendAgent(fanOut, record);
  const storedPath = saveInjectionRecord(record);

  const { step: injectStep, injector } = await runWebsiteInjectorAgent(
    record,
    autoInject
  );

  if (injectStep.status === "completed") {
    injectionStatus = "pushed";
  } else if (injectStep.status === "offline_fallback" && autoInject) {
    injectionStatus = "offline_fallback";
  }

  record.injection_status = injectionStatus;
  saveInjectionRecord(record);

  return {
    ok: true,
    namespace: "fmk_bulletseye_core_namespace",
    execution_id: recordId,
    brand_name: brandName,
    brand_id: brandId,
    target_url: targetUrl,
    client_type: clientType,
    query_type: queryType,
    auto_inject_flag: autoInject,
    squad_pipeline: [leadStep, geoStep, schemaStep, injectStep],
    fan_out: { ...fanOut, schema_blocks: schemaBlocks },
    schema_blocks: schemaBlocks,
    next_metadata: nextMetadata,
    direct_answers: directAnswers,
    storage: {
      record_id: recordId,
      path_hint: storedPath.replace(process.cwd(), ""),
      injection_status: injectionStatus,
      internal_route: internalRoute,
    },
    injector,
  };
}

export function getStoredInjectionForPage(brandId: string): StoredInjection | null {
  return loadLatestInjectionForBrand(brandId);
}

export function squadStatus() {
  return {
    ok: true,
    namespace: "fmk_bulletseye_core_namespace",
    squad: "BulletsEye SEO & GEO Autonomous Agent Squad",
    agents: Object.values(SQUAD_AGENTS),
    endpoint: "/api/v5/bulletseye/seo-geo-execute",
    internal_routes: INTERNAL_ROUTES,
  };
}
