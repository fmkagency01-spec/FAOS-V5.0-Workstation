/**
 * Jarvis Client Hunting pipeline
 * Ingest Brief → Identify Brand → Lead/Hook Matrix → Draft Assets → JSON delivery
 */

import {
  getHuntingBrand,
  identifyHuntingBrand,
  type HuntingBrand,
  type HuntingBrandId,
} from "@/faos_core/config/brands";
import { runProspector } from "@/faos_core/agents/hunting/prospector";
import { runCopywriter } from "@/faos_core/agents/hunting/copywriter";
import { runOutreachManager } from "@/faos_core/agents/hunting/outreach_manager";
import { runSocialMediaAgent } from "@/faos_core/agents/hunting/social_media";
import { FAOS_V6_VERSION } from "@/faos_core/types";
import { appendCoreMemory } from "@/lib/core-memory";
import { HERMES_COFOUNDER_ID } from "@/lib/hermes-cofounder";
import { buildConnectivityPlan } from "@/lib/agent-connectivity";

export type ClientHuntingResult = {
  brand: string;
  brand_id: HuntingBrandId;
  task_id: string;
  prospects_targeted: ReturnType<typeof runProspector>;
  content_assets: ReturnType<typeof runCopywriter>;
  action_items: Array<{ id: string; label: string; status: string }>;
  status: "COMPLETED" | "FAILED";
  version: typeof FAOS_V6_VERSION;
  hub: string;
  lead_agent_id: string;
  namespace: string;
  outreach: ReturnType<typeof runOutreachManager>;
  connectivity: ReturnType<typeof buildConnectivityPlan>;
  ok: boolean;
  error?: string;
};

export async function runClientHuntingPipeline(input: {
  brand?: string;
  brief?: string;
  limit?: number;
}): Promise<ClientHuntingResult> {
  const task_id = `hunt_${Date.now().toString(36)}`;
  const brief =
    input.brief?.trim() ||
    `Client hunting funnel for ${input.brand || "auto-detected brand"}`;

  let brand: HuntingBrand | null = input.brand
    ? getHuntingBrand(input.brand)
    : identifyHuntingBrand(brief);

  if (!brand && input.brand) {
    brand = identifyHuntingBrand(`${input.brand} ${brief}`);
  }
  if (!brand) {
    return {
      brand: input.brand || "unknown",
      brand_id: "bulletseye",
      task_id,
      prospects_targeted: [],
      content_assets: [],
      action_items: [],
      status: "FAILED",
      version: FAOS_V6_VERSION,
      hub: "agency_outreach_hub",
      lead_agent_id: "agency_outreach_agent",
      namespace: "unknown",
      outreach: { sequences: [], formatted_messages: [] },
      connectivity: buildConnectivityPlan(brief, { path: "hub" }),
      ok: false,
      error: "Unknown brand. Use fmk_agency | bulletseye | fmk_wig",
    };
  }

  // Hard lock — FMK WIG namespace only
  if (brand.id === "fmk_wig" && brand.namespace !== "fmk_wig_prosthetic_hair_agent") {
    throw new Error("FMK WIG brand lock violated");
  }

  const prospects = runProspector(brand, { limit: input.limit, brief });
  const copyAssets = runCopywriter(brand, prospects, { brief });
  const socialAssets = runSocialMediaAgent(brand, { brief });
  const content_assets = [...copyAssets, ...socialAssets];
  const outreach = runOutreachManager(brand, prospects, content_assets);

  const action_items = [
    {
      id: `${task_id}_queue_outreach`,
      label: `Queue ${outreach.sequences.filter((s) => s.step === "day_0_send").length} day-0 sends via ${brand.outreach_channels.join("/")}`,
      status: "queued",
    },
    {
      id: `${task_id}_review_assets`,
      label: `Hermes QA ${content_assets.length} content assets before publish`,
      status: "queued",
    },
    {
      id: `${task_id}_crm_sync`,
      label: `Sync ${prospects.length} prospects into CRM / RR workspace trackers`,
      status: "queued",
    },
  ];

  const connectivity = buildConnectivityPlan(
    `${brand.display_name} ${brief} outreach lead acquisition`,
    {
      path: "hub",
      primary_id: brand.lead_agent_id,
      supporting_ids: [
        HERMES_COFOUNDER_ID,
        "crm_client_agent",
        "sales_pipeline_agent",
      ],
    }
  );

  appendCoreMemory("fmk_aigorithm_ai_brain", {
    kind: "client_hunting",
    content: `Jarvis hunting completed for ${brand.display_name}: ${prospects.length} prospects · ${content_assets.length} assets`,
    source: "client_hunting_pipeline",
    meta: {
      task_id,
      brand_id: brand.id,
      hub: brand.hub,
      prospects: prospects.length,
      assets: content_assets.length,
    },
  });

  return {
    brand: brand.display_name,
    brand_id: brand.id,
    task_id,
    prospects_targeted: prospects,
    content_assets,
    action_items,
    status: "COMPLETED",
    version: FAOS_V6_VERSION,
    hub: brand.hub,
    lead_agent_id: brand.lead_agent_id,
    namespace: brand.namespace,
    outreach,
    connectivity,
    ok: true,
  };
}
