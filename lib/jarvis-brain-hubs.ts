/**
 * JARVIS BRAIN topology — Hermes Engine + 3 primary hubs.
 *
 *   JARVIS BRAIN (FAOS v6.0 + HERMES ENGINE)
 *     ├─ FMK WIG Agent
 *     ├─ Agency Outreach Agent
 *     └─ Shell Brands Agent Hub
 *
 * Heritage label: FAOS v5.3 Jarvis Matrix layout, upgraded under v6.
 */

export const JARVIS_BRAIN_LABEL = "JARVIS BRAIN (FAOS v6.0 + HERMES ENGINE)";
export const JARVIS_BRAIN_HERITAGE = "FAOS v5.3 + HERMES ENGINE";

export type JarvisBrainHubId =
  | "fmk_wig_hub"
  | "agency_outreach_hub"
  | "shell_brands_hub";

export type JarvisBrainCapability = {
  id: string;
  label: string;
  description: string;
};

export type JarvisBrainHub = {
  id: JarvisBrainHubId;
  title: string;
  /** Primary shell-agent that owns this hub */
  lead_agent_id: string;
  brand_lock?: string;
  capabilities: JarvisBrainCapability[];
  supporting_agent_ids: string[];
  namespaces?: string[];
  keywords: string[];
};

export const JARVIS_BRAIN_HUBS: JarvisBrainHub[] = [
  {
    id: "fmk_wig_hub",
    title: "FMK WIG Agent",
    lead_agent_id: "fmk_wig_prosthetic_hair_agent",
    brand_lock: "FMK WIG",
    capabilities: [
      {
        id: "order_management",
        label: "Order Management",
        description: "Salon / B2B orders, fulfillment, catalog sync",
      },
      {
        id: "inbound_lead_qualification",
        label: "Inbound Lead Qualification",
        description: "Qualify inbound buyers and route to TAC gatekeeper",
      },
      {
        id: "ad_performance_monitoring",
        label: "Ad Performance Monitoring",
        description: "Track paid/social performance for FMK WIG funnels",
      },
    ],
    supporting_agent_ids: [
      "fmk_wig_internal_engine",
      "harness_gamma_inventory_sync",
      "sales_pipeline_agent",
      "inventory_supply_agent",
    ],
    namespaces: ["fmk_wig_prosthetic_hair_agent", "fmk_create_pillar_retail_core"],
    keywords: [
      "wig",
      "fmk wig",
      "prosthetic",
      "hair system",
      "salon order",
      "toupee",
      "inbound lead",
      "ad performance",
    ],
  },
  {
    id: "agency_outreach_hub",
    title: "Agency Outreach Agent",
    lead_agent_id: "agency_outreach_agent",
    capabilities: [
      {
        id: "b2b_lead_scraping",
        label: "B2B Lead Scraping",
        description: "Discover and enrich B2B prospects (LinkedIn / web)",
      },
      {
        id: "auto_proposal_outreach",
        label: "Auto-Proposal & Outreach",
        description: "Draft proposals and run sequenced outreach",
      },
      {
        id: "client_communication_sync",
        label: "Client Communication Sync",
        description: "Keep CRM / client threads synced with BulletsEye",
      },
    ],
    supporting_agent_ids: [
      "crm_client_agent",
      "sales_pipeline_agent",
      "harness_beta_marketing_automation",
      "bulletseye_ai_seo_agent",
      "rr_wigs_client_workspace",
    ],
    namespaces: ["fmk_bulletseye_core_namespace"],
    keywords: [
      "outreach",
      "b2b lead",
      "proposal",
      "scrape",
      "linkedin",
      "client communication",
      "agency",
      "bulletseye",
    ],
  },
  {
    id: "shell_brands_hub",
    title: "Shell Brands Agent Hub",
    lead_agent_id: "shell_brands_hub_agent",
    capabilities: [
      {
        id: "create_media_records",
        label: "FMK Create / Media / Records",
        description: "CREATE + MEDIA + RECORDS pillar sync",
      },
      {
        id: "socialistic_editing",
        label: "FMK Socialistic / Editing Hub",
        description: "Social + editing pipelines under Media Empire",
      },
      {
        id: "shoes_clothing_ga",
        label: "Shoes / Clothing / G&A Sync",
        description: "Retail shell brands + G&A operational sync",
      },
    ],
    supporting_agent_ids: [
      "fmk_shoes_footwear_wing",
      "fmk_mk_clothing_lifestyle_agent",
      "fmk_mk_kitchen_cloud_food_agent",
      "social_media_agent",
      "creative_design_agent",
      "video_production_agent",
      "inventory_supply_agent",
    ],
    namespaces: [
      "fmk_create_pillar_retail_core",
      "fmk_media",
      "fmk_records",
      "fmk_editing_hub",
      "fmk_socialistic",
      "fmk_g_and_a",
    ],
    keywords: [
      "shell brand",
      "create pillar",
      "media",
      "records",
      "socialistic",
      "editing hub",
      "shoes",
      "clothing",
      "g&a",
      "mk clothing",
    ],
  },
];

export function listJarvisBrainHubs(): JarvisBrainHub[] {
  return JARVIS_BRAIN_HUBS;
}

export function getJarvisBrainHub(id: JarvisBrainHubId): JarvisBrainHub | undefined {
  return JARVIS_BRAIN_HUBS.find((h) => h.id === id);
}

/** Score hubs against a free-text command; highest score wins. */
export function matchJarvisBrainHub(
  command: string
): { hub: JarvisBrainHub; score: number } | null {
  const lower = command.toLowerCase();
  let best: { hub: JarvisBrainHub; score: number } | null = null;

  for (const hub of JARVIS_BRAIN_HUBS) {
    let score = 0;
    for (const kw of hub.keywords) {
      if (lower.includes(kw.toLowerCase())) score += kw.length > 6 ? 3 : 2;
    }
    for (const cap of hub.capabilities) {
      if (lower.includes(cap.label.toLowerCase())) score += 4;
      if (lower.includes(cap.id.replace(/_/g, " "))) score += 3;
    }
    if (hub.brand_lock && lower.includes(hub.brand_lock.toLowerCase())) score += 5;
    if (score > 0 && (!best || score > best.score)) {
      best = { hub, score };
    }
  }
  return best;
}

export function jarvisBrainTopologySummary() {
  return {
    label: JARVIS_BRAIN_LABEL,
    heritage: JARVIS_BRAIN_HERITAGE,
    engine: "hermes_cofounder_agent",
    orchestrator: "jarvis_core",
    hubs: JARVIS_BRAIN_HUBS.map((h) => ({
      id: h.id,
      title: h.title,
      lead_agent_id: h.lead_agent_id,
      brand_lock: h.brand_lock || null,
      capabilities: h.capabilities.map((c) => c.label),
      supporting_agent_ids: h.supporting_agent_ids,
    })),
  };
}

/** ASCII map matching the product diagram. */
export function formatJarvisBrainAscii(): string {
  return [
    "+-------------------------------------------------+",
    "|      JARVIS BRAIN (FAOS v6.0 + HERMES ENGINE)    |",
    "+-------------------------------------------------+",
    "                         |",
    "    +--------------------+--------------------+",
    "    |                    |                    |",
    "    v                    v                    v",
    "[FMK WIG Agent]   [Agency Outreach Agent]  [Shell Brands Agent Hub]",
    "- Order Management   - B2B Lead Scraping     - FMK Create / Media / Records",
    "- Inbound Lead Qual  - Auto-Proposal         - FMK Socialistic / Editing Hub",
    "- Ad Performance     - Client Comm Sync      - Shoes / Clothing / G&A Sync",
  ].join("\n");
}
