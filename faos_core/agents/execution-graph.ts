/**
 * FAOS v6.0 — Asynchronous multi-agent execution graph
 */

import { runAgentModule, type AgentRunResult, type AgentTaskInput } from "@/faos_core/agents/base-agent";
import {
  getOrchestratorId,
  matchAgents,
  setAgentState,
} from "@/faos_core/orchestrator/agent-registry";
import type { AgentState } from "@/faos_core/types";

export type GraphNode = {
  agent_id: string;
  depends_on: string[];
};

export type ExecutionGraphResult = {
  graph_id: string;
  nodes: GraphNode[];
  results: AgentRunResult[];
  agent_states: AgentState[];
  aggregated: Record<string, unknown>;
  started_at: string;
  finished_at: string;
};

/** Build a simple DAG: primary first, then supporting in parallel */
export function buildExecutionGraph(
  command: string,
  agentIds?: string[]
): GraphNode[] {
  const orch = getOrchestratorId();
  let ids = (agentIds || []).filter((id) => id && id !== orch);

  if (ids.length === 0) {
    ids = matchAgents(command, 3).map((a) => a.id);
  }
  if (ids.length === 0) {
    ids = [orch];
  }

  const [primary, ...rest] = ids;
  const nodes: GraphNode[] = [{ agent_id: primary!, depends_on: [] }];
  for (const id of rest) {
    nodes.push({ agent_id: id, depends_on: [primary!] });
  }
  return nodes;
}

/**
 * Execute graph levels asynchronously.
 * Level 0 (no deps) runs in parallel; then dependents.
 */
export async function executeAgentGraph(
  command: string,
  options?: {
    agent_ids?: string[];
    category?: string;
    brand?: string;
    metadata?: Record<string, unknown>;
    concurrency?: number;
  }
): Promise<ExecutionGraphResult> {
  const started_at = new Date().toISOString();
  const graph_id = `graph_${Date.now().toString(36)}`;
  const nodes = buildExecutionGraph(command, options?.agent_ids);
  const results: AgentRunResult[] = [];
  const completed = new Set<string>();

  const baseInput: Omit<AgentTaskInput, "task_id"> = {
    command,
    category: options?.category,
    brand: options?.brand,
    metadata: options?.metadata,
  };

  // Mark queued
  for (const node of nodes) {
    setAgentState(node.agent_id, {
      status: "queued",
      current_task: graph_id,
      output: null,
    });
  }

  const remaining = [...nodes];
  while (remaining.length > 0) {
    const ready = remaining.filter((n) =>
      n.depends_on.every((d) => completed.has(d))
    );
    if (ready.length === 0) {
      // Cycle / broken deps — run rest without waiting
      const stuck = remaining.splice(0, remaining.length);
      const batch = await Promise.all(
        stuck.map((n) =>
          runAgentModule(n.agent_id, {
            ...baseInput,
            task_id: `${graph_id}:${n.agent_id}`,
          })
        )
      );
      for (const r of batch) {
        results.push(r);
        completed.add(r.state.agent_id);
      }
      break;
    }

    for (const n of ready) {
      const idx = remaining.indexOf(n);
      if (idx >= 0) remaining.splice(idx, 1);
    }

    const batch = await Promise.all(
      ready.map((n) =>
        runAgentModule(n.agent_id, {
          ...baseInput,
          task_id: `${graph_id}:${n.agent_id}`,
        })
      )
    );
    for (const r of batch) {
      results.push(r);
      completed.add(r.state.agent_id);
    }
  }

  const aggregated = {
    graph_id,
    command,
    agents: results.map((r) => r.state.agent_id),
    deliverables: results.map((r) => ({
      agent_id: r.state.agent_id,
      status: r.state.status,
      deliverable: r.deliverable,
      used_fallback: r.used_fallback,
    })),
    combined_text: results.map((r) => r.deliverable).join("\n\n---\n\n"),
  };

  return {
    graph_id,
    nodes,
    results,
    agent_states: results.map((r) => r.state),
    aggregated,
    started_at,
    finished_at: new Date().toISOString(),
  };
}
