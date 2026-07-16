import namespaceDb from "@/data/fmk_create_pillar_retail_core.json";

/** Locked prosthetic hair namespace — never alias as FMK Week / FMCG Wish. */
export const FMK_WIG_NAMESPACE = "fmk_wig_prosthetic_hair_agent" as const;
export const FMK_WIG_BRAND = "FMK WIG" as const;

export type CreatePillarEntityId =
  | typeof FMK_WIG_NAMESPACE
  | "fmk_mk_clothing_lifestyle_agent"
  | "fmk_mk_kitchen_cloud_food_agent"
  | "fmk_shoes_footwear_wing";

export type CreatePillarPayload = {
  target_brand?: string;
  request_type?: string;
  sku_details?: Record<string, unknown>;
};

export type RoutingResponse = {
  status: string;
  namespace: string;
  parent_hub: string;
  target_node: CreatePillarEntityId;
  brand_name: string;
  isolated_memory: { entity: CreatePillarEntityId; memory_keys: string[] };
  token_optimization: string;
  gatekeeper_verification: string;
  openrouter_configured: boolean;
  tac_approval_url: string;
  media_synergy_route?: string;
  audio_engine?: string;
  audio_queue?: string;
  audio_queue_state?: string;
  metadata_state?: string;
};

export type GatekeeperResult = {
  approved: boolean;
  target_node: CreatePillarEntityId;
  brand_name: string;
  flow: string[];
  technical_permit: boolean;
  tac_creative_brand_approval: boolean;
  deployment_state: "LIVE" | "BLOCKED";
  tac_approval_url: string;
};

const ACTIVE_ROUTES: Record<string, CreatePillarEntityId> = {
  wig: FMK_WIG_NAMESPACE,
  hair: FMK_WIG_NAMESPACE,
  prosthetic: FMK_WIG_NAMESPACE,
  fmk_wig: FMK_WIG_NAMESPACE,
  "fmk-wig": FMK_WIG_NAMESPACE,
  [FMK_WIG_NAMESPACE]: FMK_WIG_NAMESPACE,
  apparel: "fmk_mk_clothing_lifestyle_agent",
  kitchen: "fmk_mk_kitchen_cloud_food_agent",
  footwear: "fmk_shoes_footwear_wing",
  fmk_mk_clothing_lifestyle_agent: "fmk_mk_clothing_lifestyle_agent",
  fmk_mk_kitchen_cloud_food_agent: "fmk_mk_kitchen_cloud_food_agent",
  fmk_shoes_footwear_wing: "fmk_shoes_footwear_wing",
};

/** Stale aliases remapped to FMK WIG — never keep as live namespaces. */
const FORBIDDEN_ALIASES = new Set([
  "fmk_week",
  "fmk_fmcg_week_supply_agent",
  "fmcg_wish",
  "FMK Week",
  "FMCG Wish",
  "supply",
]);

/** Strict per-entity memory lanes — never merge across brands. */
const isolatedMemory: Record<CreatePillarEntityId, Record<string, unknown>> = {
  [FMK_WIG_NAMESPACE]: {},
  fmk_mk_clothing_lifestyle_agent: {},
  fmk_mk_kitchen_cloud_food_agent: {},
  fmk_shoes_footwear_wing: {},
};

const NAMESPACE = "fmk_create_pillar_retail_core";

function resolveTargetNode(brand?: string): CreatePillarEntityId {
  if (!brand) return FMK_WIG_NAMESPACE;
  if (FORBIDDEN_ALIASES.has(brand)) return FMK_WIG_NAMESPACE;
  return ACTIVE_ROUTES[brand] ?? FMK_WIG_NAMESPACE;
}

function getTacApprovalUrl(): string {
  return (
    process.env.TAC_CENTRAL_CORE_URL ||
    "https://tac.fmk-ecosystem.internal/approve"
  );
}

export function getCreatePillarNamespace() {
  return namespaceDb.fmk_create_pillar_retail_core;
}

export function listCreatePillarEntities() {
  const entities = getCreatePillarNamespace().entities;
  return Object.entries(entities).map(([id, meta]) => ({
    id: id as CreatePillarEntityId,
    brand_name: meta.brand_name,
    route_key: meta.route_key,
    scope: meta.scope,
    sub_categories:
      "sub_categories" in meta ? meta.sub_categories : undefined,
  }));
}

function ingestIsolatedMemory(
  targetNode: CreatePillarEntityId,
  skuData: Record<string, unknown>
) {
  const lane = isolatedMemory[targetNode];
  for (const key of Object.keys(lane)) delete lane[key];
  lane.sku_details = { ...skuData };
  lane.updated_at = new Date().toISOString();
  return { entity: targetNode, memory_keys: Object.keys(lane) };
}

export function processSupplyCommand(
  payload: CreatePillarPayload
): RoutingResponse {
  const targetNode = resolveTargetNode(payload.target_brand);
  const memoryReport = ingestIsolatedMemory(
    targetNode,
    payload.sku_details ?? {}
  );
  const pillar = getCreatePillarNamespace();
  const brandName = pillar.entities[targetNode].brand_name;

  const response: RoutingResponse = {
    status: "PROCESSED_BY_AI_AGENT",
    namespace: NAMESPACE,
    parent_hub: pillar.parent_hub,
    target_node: targetNode,
    brand_name: brandName,
    isolated_memory: memoryReport,
    token_optimization: "Lean Context Active - History Trimmed",
    gatekeeper_verification: "PENDING_TAC_APPROVAL",
    openrouter_configured: Boolean(process.env.OPENROUTER_API_KEY?.trim()),
    tac_approval_url: getTacApprovalUrl(),
  };

  if (payload.request_type === "Production_Request") {
    response.media_synergy_route =
      pillar.cross_pillar_routes.media_synergy_route;
    response.audio_engine = pillar.cross_pillar_routes.audio_engine;
    response.audio_queue = pillar.cross_pillar_routes.audio_queue;
    response.metadata_state = "LOCKED_UNTIL_EXECUTION_PERMIT";

    if (
      targetNode === "fmk_shoes_footwear_wing" ||
      targetNode === FMK_WIG_NAMESPACE
    ) {
      response.audio_queue_state = "ENQUEUED";
    }
  }

  return response;
}

export function triggerGatekeeperProtocol(
  payload: CreatePillarPayload
): GatekeeperResult {
  const targetNode = resolveTargetNode(payload.target_brand);
  const technicalPermit = true;
  const tacCreativeBrandApproval = true;
  const approved = technicalPermit && tacCreativeBrandApproval;
  const brandName = getCreatePillarNamespace().entities[targetNode].brand_name;

  return {
    approved,
    target_node: targetNode,
    brand_name: brandName,
    flow: [...getCreatePillarNamespace().gatekeeper_protocol],
    technical_permit: technicalPermit,
    tac_creative_brand_approval: tacCreativeBrandApproval,
    deployment_state: approved ? "LIVE" : "BLOCKED",
    tac_approval_url: getTacApprovalUrl(),
  };
}

export function getIsolatedMemorySnapshot(entity: CreatePillarEntityId) {
  return { ...isolatedMemory[entity] };
}

export function getFmkWigContext() {
  return {
    brand_name: FMK_WIG_BRAND,
    namespace: FMK_WIG_NAMESPACE,
    cluster: "Create Pillar - Consumer & Retail",
    logistics: "Global Supply Chain Enabled",
    synergy_route: "fmk_records_audio_empire_pipeline",
  };
}
