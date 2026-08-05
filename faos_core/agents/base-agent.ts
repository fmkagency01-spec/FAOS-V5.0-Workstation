/**
 * FAOS v6.0 — Base agent executor with JSON fallback
 */

import {
  getAgent,
  setAgentState,
  type RegisteredAgent,
} from "@/faos_core/orchestrator/agent-registry";
import type { AgentState } from "@/faos_core/types";

export type AgentTaskInput = {
  task_id: string;
  command: string;
  category?: string;
  brand?: string;
  metadata?: Record<string, unknown>;
};

export type AgentRunResult = {
  state: AgentState;
  deliverable: string;
  structured: Record<string, unknown>;
  used_fallback: boolean;
};

function safeParseJson(raw: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return { value: parsed as unknown };
  } catch {
    return null;
  }
}

export function buildDeterministicDeliverable(
  agent: RegisteredAgent,
  input: AgentTaskInput
): Record<string, unknown> {
  return {
    agent_id: agent.id,
    agent_name: agent.name,
    domain: agent.domain,
    task_id: input.task_id,
    category: input.category || "general",
    brand: input.brand || "BulletsEye / FMK Group",
    summary: `${agent.name} processed: ${input.command.slice(0, 180)}`,
    deliverable: [
      `# ${agent.name} Output`,
      ``,
      `Domain: ${agent.domain}`,
      `Brief: ${input.command}`,
      ``,
      `## Recommended actions`,
      `1. Confirm scope with client`,
      `2. Produce draft deliverable for QA`,
      `3. Route to approval gate`,
    ].join("\n"),
    model_hint: agent.model_hint,
    status: "completed",
  };
}

/**
 * Run a single agent with timeout + malformed-JSON fallback.
 * LLM enrichment is optional; deterministic path always succeeds.
 */
export async function runAgentModule(
  agentId: string,
  input: AgentTaskInput,
  options?: {
    timeout_ms?: number;
    enrich?: (agent: RegisteredAgent, input: AgentTaskInput) => Promise<string>;
  }
): Promise<AgentRunResult> {
  const agent = getAgent(agentId);
  const started = Date.now();

  if (!agent) {
    const state = setAgentState(agentId, {
      status: "failed",
      current_task: input.task_id,
      output: null,
      error: "agent_not_registered",
      latency_ms: Date.now() - started,
    });
    return {
      state,
      deliverable: `Agent ${agentId} is not registered.`,
      structured: { error: "agent_not_registered" },
      used_fallback: true,
    };
  }

  setAgentState(agentId, {
    status: "running",
    current_task: input.task_id,
    output: null,
    error: undefined,
  });

  const timeoutMs = options?.timeout_ms ?? 12_000;
  let usedFallback = false;
  let structured: Record<string, unknown>;

  try {
    const work = (async () => {
      if (options?.enrich) {
        const raw = await options.enrich(agent, input);
        const parsed = safeParseJson(raw);
        if (!parsed) {
          usedFallback = true;
          const base = buildDeterministicDeliverable(agent, input);
          return {
            ...base,
            llm_raw: raw.slice(0, 4000),
            note: "malformed_json_fallback",
          };
        }
        return {
          ...buildDeterministicDeliverable(agent, input),
          ...parsed,
          llm_enriched: true,
        };
      }
      return buildDeterministicDeliverable(agent, input);
    })();

    structured = await Promise.race([
      work,
      new Promise<Record<string, unknown>>((_, reject) => {
        setTimeout(() => reject(new Error("agent_timeout")), timeoutMs);
      }),
    ]);
  } catch (err) {
    usedFallback = true;
    const message = err instanceof Error ? err.message : "agent_failed";
    structured = {
      ...buildDeterministicDeliverable(agent, input),
      note: message === "agent_timeout" ? "timeout_fallback" : "error_fallback",
      error: message,
    };
  }

  const deliverable =
    typeof structured.deliverable === "string"
      ? structured.deliverable
      : JSON.stringify(structured, null, 2);

  const state = setAgentState(agentId, {
    status: usedFallback ? "fallback" : "completed",
    current_task: input.task_id,
    output: structured,
    error: usedFallback ? String(structured.note || "fallback") : undefined,
    latency_ms: Date.now() - started,
  });

  return { state, deliverable, structured, used_fallback: usedFallback };
}
