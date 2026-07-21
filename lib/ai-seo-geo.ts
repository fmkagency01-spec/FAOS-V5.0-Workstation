import namespaceDb from "@/data/fmk_bulletseye_core_namespace.json";
import { chatWithOpenRouter, getOpenRouterApiKey } from "@/lib/openrouter";
import { AI_MODELS } from "@/lib/ai-router";

export const BULLETSEYE_NAMESPACE = "fmk_bulletseye_core_namespace" as const;
export const AI_SEO_MODULE = "AI SEO & GEO Engine" as const;

export type FanOutAxisId =
  | "direct_intent"
  | "attribute_constraints"
  | "comparative_latent"
  | "trust_eeat";

export type FanOutQuery = {
  axis: FanOutAxisId;
  label: string;
  query: string;
  cluster_slug: string;
  recommended_h2: string;
  direct_answer: string;
  extractable_bullets: string[];
};

export type SchemaBlock = {
  type: "FAQPage" | "Organization" | "Product";
  json_ld: Record<string, unknown>;
};

export type AiSeoFanOutResult = {
  ok: true;
  source: "openrouter" | "deterministic";
  namespace: typeof BULLETSEYE_NAMESPACE;
  agency_wing: string;
  module: string;
  aigorithm_engine: string;
  brand_name: string;
  brand_id: string;
  client_topic: string;
  channel: "internal" | "external_b2b";
  fan_out_queries: FanOutQuery[];
  recommended_h2_headers: string[];
  pillar_page: {
    title: string;
    slug: string;
    summary: string;
  };
  cluster_plan: Array<{
    slug: string;
    title: string;
    axis: FanOutAxisId;
    target_query: string;
  }>;
  schema_blocks: SchemaBlock[];
  eeat_signals: string[];
  ugc_push_targets: string[];
  delivery: {
    internal: string[];
    external_b2b: string[];
  };
  openrouter_configured: boolean;
};

export type AiSeoRequest = {
  brand_name?: string;
  brand_id?: string;
  client_topic?: string;
  channel?: "internal" | "external_b2b";
  use_llm?: boolean;
};

type BrandMeta = {
  brand_name: string;
  channel: string;
  pillar_topic: string;
  primary_queries: string[];
  local_signals: string[];
  sub_brands?: string[];
};

function getNs() {
  return namespaceDb.fmk_bulletseye_core_namespace;
}

export function getBulletseyeNamespace() {
  return getNs();
}

export function listAiSeoBrands() {
  const brands = getNs().brands;
  return Object.entries(brands).map(([id, meta]) => ({
    id,
    brand_name: meta.brand_name,
    channel: meta.channel,
    pillar_topic: meta.pillar_topic,
    primary_queries: meta.primary_queries,
    local_signals: meta.local_signals,
    sub_brands: "sub_brands" in meta ? meta.sub_brands : undefined,
  }));
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function isQuestionLike(text: string): boolean {
  const t = text.trim();
  return (
    t.endsWith("?") ||
    /^(why|what|how|who|which|best|where)\b/i.test(t)
  );
}

function resolveBrand(input: AiSeoRequest): {
  brand_id: string;
  meta: BrandMeta;
} {
  const brands = getNs().brands as Record<string, BrandMeta>;
  if (input.brand_id && brands[input.brand_id]) {
    return { brand_id: input.brand_id, meta: brands[input.brand_id] };
  }

  const name = (input.brand_name || "").trim().toLowerCase();
  if (name) {
    const hit = Object.entries(brands).find(
      ([, meta]) => meta.brand_name.toLowerCase() === name
    );
    if (hit) return { brand_id: hit[0], meta: hit[1] };
  }

  // Default locked shell brand for internal runs
  return {
    brand_id: "fmk_wig_prosthetic_hair_agent",
    meta: brands.fmk_wig_prosthetic_hair_agent,
  };
}

function buildDeterministicFanOut(
  brandName: string,
  topic: string,
  localSignals: string[]
): FanOutQuery[] {
  const locale = localSignals[0] || "Bangladesh";
  const axes = getNs().fan_out_axes;
  const topicClean = topic.replace(/\?+$/, "");
  const directH2 = isQuestionLike(topic)
    ? `${topicClean}?`
    : `Why choose ${brandName} for ${topic}?`;
  const directQuery = isQuestionLike(topic)
    ? `${topicClean}?`
    : `What is the best ${topic} from ${brandName}?`;

  const templates: Record<FanOutAxisId, Omit<FanOutQuery, "axis" | "label">> = {
    direct_intent: {
      query: directQuery,
      cluster_slug: slugify(`${brandName}-best-${topic}`),
      recommended_h2: directH2,
      direct_answer: `${brandName} delivers ${topicClean} with clear product specs, local fulfilment in ${locale}, and extractable proof points AI engines can cite.`,
      extractable_bullets: [
        `Core offer: ${topicClean}`,
        `Brand: ${brandName}`,
        `Primary market: ${locale}`,
      ],
    },
    attribute_constraints: {
      query: `${brandName} ${topicClean} features materials specifications quality`,
      cluster_slug: slugify(`${brandName}-features-specs`),
      recommended_h2: `Key features & constraints of ${brandName} ${topicClean}`,
      direct_answer: `${brandName} focuses on measurable attributes (materials, fit, durability, fulfilment) so LLM retrieval can lift structured chunks instead of vague marketing copy.`,
      extractable_bullets: [
        "Feature-level H2/H3 hierarchy",
        "Spec tables preferred over long paragraphs",
        "Constraint language for long-tail fan-out matches",
      ],
    },
    comparative_latent: {
      query: `${brandName} vs alternatives for ${topicClean} in ${locale}`,
      cluster_slug: slugify(`${brandName}-vs-alternatives`),
      recommended_h2: `${brandName} vs alternatives — who should buy?`,
      direct_answer: `Buyers comparing options for ${topicClean} in ${locale} should weigh ${brandName}'s specialty positioning, fulfilment reliability, and post-purchase support against generic marketplaces.`,
      extractable_bullets: [
        "Comparison table ready",
        "Latent need: reliability + local support",
        "Decision criteria listed as bullets",
      ],
    },
    trust_eeat: {
      query: `${brandName} reviews ratings case studies ${locale} trust signals`,
      cluster_slug: slugify(`${brandName}-reviews-eeat`),
      recommended_h2: `${brandName} reviews, local proof & E-E-A-T signals`,
      direct_answer: `${brandName} strengthens AI citation trust via reviews, third-party mentions, and real ${locale} case studies that generative engines can attribute.`,
      extractable_bullets: [
        ...localSignals.slice(0, 3).map((s) => `Local signal: ${s}`),
        "Third-party / UGC mention targets armed",
      ],
    },
  };

  return axes.map((axis) => {
    const id = axis.id as FanOutAxisId;
    return {
      axis: id,
      label: axis.label,
      ...templates[id],
    };
  });
}

function buildSchemaBlocks(
  brandName: string,
  topic: string,
  fanOut: FanOutQuery[]
): SchemaBlock[] {
  const faqEntities = fanOut.map((q) => ({
    "@type": "Question",
    name: q.recommended_h2,
    acceptedAnswer: {
      "@type": "Answer",
      text: q.direct_answer,
    },
  }));

  return [
    {
      type: "Organization",
      json_ld: {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: brandName,
        description: topic,
        areaServed: "BD",
      },
    },
    {
      type: "FAQPage",
      json_ld: {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqEntities,
      },
    },
    {
      type: "Product",
      json_ld: {
        "@context": "https://schema.org",
        "@type": "Product",
        name: `${brandName} — ${topic}`,
        brand: { "@type": "Brand", name: brandName },
        description: fanOut[0]?.direct_answer || topic,
      },
    },
  ];
}

async function enrichWithLlm(
  brandName: string,
  topic: string,
  base: FanOutQuery[]
): Promise<FanOutQuery[] | null> {
  if (!getOpenRouterApiKey()) return null;

  const prompt = `You are FAOS BulletsEye AI SEO Engine (GEO / Generative Engine Optimization).
Analyze brand "${brandName}" and primary topic "${topic}".
Simulate LLM Query Fan-Out into exactly 4 sub-queries with axes:
1. direct_intent
2. attribute_constraints
3. comparative_latent
4. trust_eeat

Return ONLY valid JSON:
{
  "fan_out_queries": [
    {
      "axis": "direct_intent",
      "query": "...",
      "recommended_h2": "...",
      "direct_answer": "2-line answer",
      "extractable_bullets": ["...", "..."]
    }
  ],
  "recommended_h2_headers": ["...", "...", "...", "..."]
}

Seed context (improve, do not ignore brand lock):
${JSON.stringify(base.map((q) => ({ axis: q.axis, query: q.query, h2: q.recommended_h2 })))}`;

  try {
    const result = await chatWithOpenRouter(
      [
        {
          role: "system",
          content:
            "You are an expert GEO & AI SEO Architect for BulletsEye Agency. Reply with JSON only.",
        },
        { role: "user", content: prompt },
      ],
      {
        model: AI_MODELS.gpt4oMini,
        maxTokens: 900,
        temperature: 0.3,
        clientKey: "ai-seo-geo",
        intent: "strategy",
      }
    );

    const cleaned = result.reply
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const parsed = JSON.parse(cleaned) as {
      fan_out_queries?: Array<{
        axis?: string;
        query?: string;
        recommended_h2?: string;
        direct_answer?: string;
        extractable_bullets?: string[];
      }>;
    };

    if (!Array.isArray(parsed.fan_out_queries) || parsed.fan_out_queries.length < 4) {
      return null;
    }

    const labels = Object.fromEntries(
      getNs().fan_out_axes.map((a) => [a.id, a.label])
    ) as Record<FanOutAxisId, string>;

    return parsed.fan_out_queries.slice(0, 4).map((row, idx) => {
      const fallback = base[idx]!;
      const axis = (row.axis as FanOutAxisId) || fallback.axis;
      const query = row.query?.trim() || fallback.query;
      return {
        axis,
        label: labels[axis] || fallback.label,
        query,
        cluster_slug: slugify(query),
        recommended_h2: row.recommended_h2?.trim() || fallback.recommended_h2,
        direct_answer: row.direct_answer?.trim() || fallback.direct_answer,
        extractable_bullets:
          row.extractable_bullets?.filter(Boolean).slice(0, 6) ||
          fallback.extractable_bullets,
      };
    });
  } catch {
    return null;
  }
}

/**
 * Query Fan-Out simulator for BulletsEye AI SEO / GEO.
 * Always returns structured metadata; optionally upgrades via OpenRouter.
 */
export async function generateFanOutQueries(
  input: AiSeoRequest = {}
): Promise<AiSeoFanOutResult> {
  const ns = getNs();
  const { brand_id, meta } = resolveBrand(input);
  const brandName = input.brand_name?.trim() || meta.brand_name;
  const topic =
    input.client_topic?.trim() ||
    meta.pillar_topic ||
    `${brandName} product information`;
  const channel =
    input.channel ||
    (meta.channel === "internal" ? "internal" : "external_b2b");

  const deterministic = buildDeterministicFanOut(
    brandName,
    topic,
    meta.local_signals || []
  );

  let fanOut = deterministic;
  let source: "openrouter" | "deterministic" = "deterministic";

  if (input.use_llm !== false) {
    const enriched = await enrichWithLlm(brandName, topic, deterministic);
    if (enriched) {
      fanOut = enriched;
      source = "openrouter";
    }
  }

  const recommended_h2_headers = fanOut.map((q) => q.recommended_h2);
  const pillarSlug = slugify(`${brandName}-${topic}-pillar`);

  return {
    ok: true,
    source,
    namespace: BULLETSEYE_NAMESPACE,
    agency_wing: ns.agency_wing,
    module: ns.module,
    aigorithm_engine: ns.aigorithm_engine,
    brand_name: brandName,
    brand_id,
    client_topic: topic,
    channel,
    fan_out_queries: fanOut,
    recommended_h2_headers,
    pillar_page: {
      title: `${brandName}: ${topic}`,
      slug: pillarSlug,
      summary: `Pillar page for ${brandName} covering ${topic} with ${fanOut.length} fan-out cluster pages for AI citation coverage.`,
    },
    cluster_plan: fanOut.map((q) => ({
      slug: q.cluster_slug,
      title: q.recommended_h2,
      axis: q.axis,
      target_query: q.query,
    })),
    schema_blocks: buildSchemaBlocks(brandName, topic, fanOut),
    eeat_signals: [
      ...(meta.local_signals || []),
      "Third-party platform mentions",
      "Real-time case study lift",
      "Review / rating extractables",
    ],
    ugc_push_targets: [...ns.ugc_engines],
    delivery: {
      internal: [...ns.delivery_channels.internal_shell_brands],
      external_b2b: [...ns.delivery_channels.external_b2b],
    },
    openrouter_configured: Boolean(getOpenRouterApiKey()),
  };
}

export function getAiSeoModuleStatus() {
  const ns = getNs();
  return {
    ok: true,
    agency_wing: ns.agency_wing,
    namespace: BULLETSEYE_NAMESPACE,
    module: ns.module,
    status: ns.status,
    core_strategy: ns.core_strategy,
    aigorithm_engine: ns.aigorithm_engine,
    target_platforms: ns.target_platforms,
    fan_out_axes: ns.fan_out_axes,
    content_framework: ns.content_framework,
    delivery_channels: ns.delivery_channels,
    brands: listAiSeoBrands(),
    openrouter_configured: Boolean(getOpenRouterApiKey()),
  };
}
