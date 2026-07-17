import ecosystem from "@/data/fmk_tac_ecosystem.json";
import { getAllShellAgents, type ShellAgent } from "@/lib/shell-agents";

export type TacPillar = (typeof ecosystem.pillars)[number];
export type TacWorkSection = TacPillar["work_sections"][number];

export function getTacEcosystem() {
  return ecosystem;
}

export function getParentCompany() {
  return ecosystem.parent_company;
}

export function getPillars(): TacPillar[] {
  return ecosystem.pillars;
}

export function getPillarById(id: string): TacPillar | undefined {
  return ecosystem.pillars.find((p) => p.id === id);
}

export function getAgentsForPillar(pillarId: string): ShellAgent[] {
  const pillar = getPillarById(pillarId);
  if (!pillar) return [];
  const all = getAllShellAgents();
  return pillar.agents
    .map((id) => all.find((a) => a.id === id))
    .filter(Boolean) as ShellAgent[];
}

export function getJarvisConfig() {
  return ecosystem.jarvis_orchestrator;
}

export type TacSyncStatus = {
  version: string;
  parent: typeof ecosystem.parent_company;
  pillars: Array<{
    id: string;
    name: string;
    agent_count: number;
    work_sections: number;
    sync: "online" | "degraded" | "offline";
    backend_namespace: string;
  }>;
  jarvis: { agents: number; route: string };
  aigorithm: string;
  gatekeeper: string[];
};

export function buildTacSyncStatus(backendOnline = true): TacSyncStatus {
  return {
    version: ecosystem.version,
    parent: ecosystem.parent_company,
    pillars: ecosystem.pillars.map((p) => ({
      id: p.id,
      name: p.name,
      agent_count: p.agents.length,
      work_sections: p.work_sections.length,
      sync: backendOnline ? "online" : "degraded",
      backend_namespace: p.namespace,
    })),
    jarvis: {
      agents: ecosystem.jarvis_orchestrator.shell_agents_total,
      route: ecosystem.jarvis_orchestrator.route,
    },
    aigorithm: ecosystem.parent_company.aigorithm_engine,
    gatekeeper: ecosystem.parent_company.gatekeeper_protocol,
  };
}
