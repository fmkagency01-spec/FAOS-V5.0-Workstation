/**
 * FAOS v6.0 — Jarvis Master Orchestrator (core engine)
 * Routes raw input → categorize → assign agents → track → aggregate
 */

import { executeAgentGraph } from "@/faos_core/agents/execution-graph";
import {
  getAgent,
  getOrchestratorId,
  listAgents,
  matchAgents,
  setAgentState,
} from "@/faos_core/orchestrator/agent-registry";
import { healthSnapshot } from "@/faos_core/orchestrator/health";
import { detectTaskCategory } from "@/faos_core/pipelines/ingestion";
import { runClientTaskPipeline } from "@/faos_core/pipelines/client-task-pipeline";
import { FAOS_V6_VERSION, type AgentState } from "@/faos_core/types";
import {
  executeJarvisPlan,
  planJarvisCommand,
  type JarvisResult,
} from "@/lib/jarvis-orchestrator";

export type JarvisV6RouteResult = {
  version: typeof FAOS_V6_VERSION;
  mode: "chat" | "pipeline" | "graph";
  category: string;
  primary_agent: string;
  supporting_agents: string[];
  agent_states: AgentState[];
  reply?: string;
  pipeline?: Awaited<ReturnType<typeof runClientTaskPipeline>>;
  graph?: Awaited<ReturnType<typeof executeAgentGraph>>;
  jarvis?: JarvisResult;
};

function looksLikeClientBrief(input: string): boolean {
  return /brief|campaign|deliverable|script|design|smm|seo|ads?|client task/i.test(
    input
  );
}

/**
 * Primary Jarvis v6 entry — categorizes and dispatches.
 */
export async function jarvisRoute(
  rawInput: string,
  options?: {
    clientKey?: string;
    mode?: "auto" | "chat" | "pipeline" | "graph";
    agent_ids?: string[];
    brand?: string;
    auto_approve?: boolean;
  }
): Promise<JarvisV6RouteResult> {
  const command = rawInput.trim();
  if (!command) {
    throw new Error("Input is required");
  }

  const category = detectTaskCategory(command);
  const matches = matchAgents(command, 4);
  const orch = getOrchestratorId();
  const primary =
    options?.agent_ids?.[0] ||
    matches[0]?.id ||
    orch;
  const supporting = (options?.agent_ids?.slice(1) || matches.slice(1).map((m) => m.id)).filter(
    (id) => id !== primary
  );

  setAgentState(orch, {
    status: "running",
    current_task: command.slice(0, 120),
    output: { category, primary, supporting },
  });

  const mode =
    options?.mode && options.mode !== "auto"
      ? options.mode
      : looksLikeClientBrief(command)
        ? "pipeline"
        : "chat";

  if (mode === "pipeline") {
    const pipeline = await runClientTaskPipeline(
      {
        details: command,
        category: category as ReturnType<typeof detectTaskCategory>,
        brand: options?.brand,
        agent_ids: options?.agent_ids || [primary, ...supporting],
      },
      { auto_approve: options?.auto_approve, brand: options?.brand }
    );
    setAgentState(orch, {
      status: "completed",
      current_task: pipeline.pipeline_id,
      output: { pipeline_id: pipeline.pipeline_id, stage: pipeline.stage },
    });
    return {
      version: FAOS_V6_VERSION,
      mode: "pipeline",
      category,
      primary_agent: primary,
      supporting_agents: supporting,
      agent_states: pipeline.agent_states,
      pipeline,
      reply: pipeline.approval?.client_facing_output,
    };
  }

  if (mode === "graph") {
    const graph = await executeAgentGraph(command, {
      agent_ids: options?.agent_ids || [primary, ...supporting],
      category,
      brand: options?.brand,
    });
    setAgentState(orch, {
      status: "completed",
      current_task: graph.graph_id,
      output: { graph_id: graph.graph_id },
    });
    return {
      version: FAOS_V6_VERSION,
      mode: "graph",
      category,
      primary_agent: primary,
      supporting_agents: supporting,
      agent_states: graph.agent_states,
      graph,
      reply:
        typeof graph.aggregated.combined_text === "string"
          ? graph.aggregated.combined_text
          : undefined,
    };
  }

  // chat mode — delegate to existing Jarvis orchestrator + track agent states
  const plan = planJarvisCommand(command);
  const jarvis = await executeJarvisPlan(plan, options?.clientKey || "faos-v6");
  for (const id of jarvis.agents_dispatched) {
    setAgentState(id, {
      status: "completed",
      current_task: command.slice(0, 120),
      output: { reply_preview: jarvis.reply.slice(0, 240) },
    });
  }
  setAgentState(orch, {
    status: "completed",
    current_task: null,
    output: { agents_dispatched: jarvis.agents_dispatched },
  });

  return {
    version: FAOS_V6_VERSION,
    mode: "chat",
    category,
    primary_agent: plan.primary_agent.id,
    supporting_agents: plan.supporting_agents.map((a) => a.id),
    agent_states: jarvis.agents_dispatched.map((id) => ({
      agent_id: id,
      status: "completed" as const,
      current_task: command.slice(0, 120),
      output: { name: getAgent(id)?.name },
      timestamp: new Date().toISOString(),
    })),
    jarvis,
    reply: jarvis.reply,
  };
}

export function jarvisNetworkStatus() {
  const health = healthSnapshot();
  return {
    version: FAOS_V6_VERSION,
    orchestrator: getOrchestratorId(),
    agents_total: listAgents().length,
    health,
    message: "Jarvis v6 master orchestrator online",
  };
}
