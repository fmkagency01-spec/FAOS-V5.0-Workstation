import agentsData from "@/data/shell_agents.json";
import type { AiIntent } from "@/lib/ai-router";

export type ShellAgent = {
  id: string;
  name: string;
  icon: string;
  domain: string;
  keywords: string[];
  model_hint: AiIntent | string;
  description: string;
};

export type AgentMatch = ShellAgent & { score: number };

const AGENTS = agentsData.agents as ShellAgent[];

export function getAllShellAgents(): ShellAgent[] {
  return AGENTS;
}

export function getShellAgent(id: string): ShellAgent | undefined {
  return AGENTS.find((a) => a.id === id);
}

export function getOrchestratorId(): string {
  return agentsData.orchestrator;
}

/** Score and rank shell agents for a command — returns top matches */
export function matchShellAgents(command: string, limit = 4): AgentMatch[] {
  const lower = command.toLowerCase();
  const scored = AGENTS.map((agent) => {
    let score = 0;
    for (const kw of agent.keywords) {
      if (lower.includes(kw.toLowerCase())) score += 2;
    }
    if (lower.includes(agent.id.replace(/_/g, " "))) score += 1;
    if (agent.domain !== "orchestration" && lower.includes(agent.domain)) score += 1;
    return { ...agent, score };
  });

  return scored
    .filter((a) => a.score > 0 || a.id === getOrchestratorId())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function primaryAgentForCommand(command: string): ShellAgent {
  const matches = matchShellAgents(command, 1);
  return matches[0] || getShellAgent(getOrchestratorId())!;
}
