/**
 * FAOS v6.0 — Agent registry over shell_agents.json
 */

import agentsData from "@/data/shell_agents.json";
import {
  EXPECTED_SHELL_AGENT_COUNT,
  ORCHESTRATOR_ID,
  type AgentState,
} from "@/faos_core/types";

export type RegisteredAgent = {
  id: string;
  name: string;
  icon: string;
  domain: string;
  keywords: string[];
  model_hint: string;
  description: string;
};

const AGENTS = agentsData.agents as RegisteredAgent[];

/** In-memory live state for all registered agents */
const STATE = new Map<string, AgentState>();

function now(): string {
  return new Date().toISOString();
}

function idleState(agentId: string): AgentState {
  return {
    agent_id: agentId,
    status: "idle",
    current_task: null,
    output: null,
    timestamp: now(),
  };
}

export function getRegistryVersion(): string {
  return String((agentsData as { version?: string }).version || "unknown");
}

export function getOrchestratorId(): string {
  return String((agentsData as { orchestrator?: string }).orchestrator || ORCHESTRATOR_ID);
}

export function listAgents(): RegisteredAgent[] {
  return AGENTS;
}

export function getAgent(id: string): RegisteredAgent | undefined {
  return AGENTS.find((a) => a.id === id);
}

export function specialistAgents(): RegisteredAgent[] {
  const orch = getOrchestratorId();
  return AGENTS.filter((a) => a.id !== orch);
}

export function ensureAgentStates(): AgentState[] {
  for (const agent of AGENTS) {
    if (!STATE.has(agent.id)) {
      STATE.set(agent.id, idleState(agent.id));
    }
  }
  return AGENTS.map((a) => STATE.get(a.id)!);
}

export function getAgentState(agentId: string): AgentState {
  ensureAgentStates();
  return STATE.get(agentId) || idleState(agentId);
}

export function setAgentState(
  agentId: string,
  patch: Partial<Omit<AgentState, "agent_id">>
): AgentState {
  const prev = getAgentState(agentId);
  const next: AgentState = {
    ...prev,
    ...patch,
    agent_id: agentId,
    timestamp: patch.timestamp || now(),
  };
  STATE.set(agentId, next);
  return next;
}

export function resetAgentStates(): AgentState[] {
  STATE.clear();
  return ensureAgentStates();
}

export function matchAgents(input: string, limit = 4): RegisteredAgent[] {
  const lower = input.toLowerCase();
  const orch = getOrchestratorId();
  const scored = AGENTS.map((agent) => {
    let score = 0;
    for (const kw of agent.keywords) {
      if (lower.includes(kw.toLowerCase())) score += 2;
    }
    if (lower.includes(agent.id.replace(/_/g, " "))) score += 1;
    if (agent.domain !== "orchestration" && lower.includes(agent.domain)) score += 1;
    return { agent, score };
  });

  return scored
    .filter((s) => s.score > 0 && s.agent.id !== orch)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.agent);
}

export function registryStats() {
  return {
    version: getRegistryVersion(),
    orchestrator: getOrchestratorId(),
    found: AGENTS.length,
    expected: EXPECTED_SHELL_AGENT_COUNT,
    domains: [...new Set(AGENTS.map((a) => a.domain))],
  };
}
