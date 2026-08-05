/**
 * FAOS v6.0 — 35-agent roster with domain lanes for Jarvis routing
 */

import { listAgents, type RegisteredAgent } from "@/faos_core/orchestrator/agent-registry";
import { runAgentModule, type AgentRunResult, type AgentTaskInput } from "@/faos_core/agents/base-agent";
import { ORCHESTRATOR_ID } from "@/faos_core/types";

export type AgentLane =
  | "orchestration"
  | "marketing_strategy"
  | "tech_content"
  | "brand"
  | "sales"
  | "finance"
  | "operations"
  | "people"
  | "seo_geo"
  | "harness"
  | "support";

const LANE_BY_DOMAIN: Record<string, AgentLane> = {
  orchestration: "orchestration",
  brand: "brand",
  sales: "sales",
  finance: "finance",
  operations: "operations",
  hr: "people",
  creative: "tech_content",
  marketing: "marketing_strategy",
  seo: "seo_geo",
  geo: "seo_geo",
  engineering: "tech_content",
  harness: "harness",
  support: "support",
  legal: "support",
  research: "marketing_strategy",
  strategy: "marketing_strategy",
  localization: "tech_content",
};

/** Explicit overrides for agency workflow lanes */
const LANE_OVERRIDES: Record<string, AgentLane> = {
  jarvis_core: "orchestration",
  hermes_cofounder_agent: "orchestration",
  social_media_agent: "marketing_strategy",
  marketing_strategy_agent: "marketing_strategy",
  creative_design_agent: "tech_content",
  video_production_agent: "tech_content",
  bulletseye_ai_seo_agent: "seo_geo",
  fmk_seo_lead_agent: "seo_geo",
  fmk_geo_engine_agent: "seo_geo",
  fmk_schema_backend_agent: "tech_content",
  fmk_website_injector_agent: "tech_content",
  code_engineering_agent: "tech_content",
  harness_alpha_web_engineering: "tech_content",
  harness_beta_marketing_automation: "marketing_strategy",
  executive_strategy_agent: "marketing_strategy",
  research_analytics_agent: "marketing_strategy",
  bengali_localization_agent: "tech_content",
};

export type AgentModule = {
  id: string;
  name: string;
  domain: string;
  lane: AgentLane;
  keywords: string[];
  description: string;
  run: (input: AgentTaskInput) => Promise<AgentRunResult>;
};

function resolveLane(agent: RegisteredAgent): AgentLane {
  return (
    LANE_OVERRIDES[agent.id] ||
    LANE_BY_DOMAIN[agent.domain] ||
    "operations"
  );
}

export function getAgentModules(): AgentModule[] {
  return listAgents().map((agent) => ({
    id: agent.id,
    name: agent.name,
    domain: agent.domain,
    lane: resolveLane(agent),
    keywords: agent.keywords,
    description: agent.description,
    run: (input: AgentTaskInput) => runAgentModule(agent.id, input),
  }));
}

export function getAgentModule(id: string): AgentModule | undefined {
  return getAgentModules().find((m) => m.id === id);
}

export function agentsByLane(lane: AgentLane): AgentModule[] {
  return getAgentModules().filter((m) => m.lane === lane);
}

export function marketingStrategyAgents(): AgentModule[] {
  return agentsByLane("marketing_strategy");
}

export function techContentAgents(): AgentModule[] {
  return agentsByLane("tech_content");
}

export function specialistModuleIds(): string[] {
  return getAgentModules()
    .filter((m) => m.id !== ORCHESTRATOR_ID)
    .map((m) => m.id);
}

export function rosterSummary() {
  const modules = getAgentModules();
  const lanes = [...new Set(modules.map((m) => m.lane))];
  return {
    total: modules.length,
    orchestrator: ORCHESTRATOR_ID,
    lanes: Object.fromEntries(
      lanes.map((lane) => [lane, modules.filter((m) => m.lane === lane).map((m) => m.id)])
    ),
  };
}
