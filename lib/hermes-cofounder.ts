/**
 * Hermes Co-Founder — Jarvis Brain executive officer.
 * Monitors & operates all shell-agent teams under Jarvis commands.
 */

import { healthSnapshot } from "@/faos_core/orchestrator/health";
import {
  ensureAgentStates,
  listAgents,
  setAgentState,
  getOrchestratorId,
} from "@/faos_core/orchestrator/agent-registry";
import { rosterSummary } from "@/faos_core/agents/roster";
import { appendCoreMemory } from "@/lib/core-memory";
import { FAOS_V6_VERSION } from "@/faos_core/types";
import {
  formatJarvisBrainAscii,
  matchJarvisBrainHub,
  jarvisBrainTopologySummary,
} from "@/lib/jarvis-brain-hubs";

export const HERMES_COFOUNDER_ID = "hermes_cofounder_agent";

export type HermesOpsBrief = {
  ok: boolean;
  version: string;
  role: "co_founder";
  reports_to: string;
  agents_total: number;
  agents_active: number;
  lanes: Record<string, string[]>;
  live: { idle: number; running: number; failed: number };
  issues: string[];
  summary: string;
  timestamp: string;
};

/** Wake / activate every registered shell agent into idle-ready state. */
export function activateAllAgentTeams(reason = "hermes_cofounder_boot"): {
  activated: number;
  agent_ids: string[];
} {
  const agents = listAgents();
  const ids: string[] = [];
  for (const agent of agents) {
    setAgentState(agent.id, {
      status: "idle",
      current_task: null,
      output: {
        activated_by: HERMES_COFOUNDER_ID,
        reason,
        ready: true,
      },
    });
    ids.push(agent.id);
  }
  setAgentState(HERMES_COFOUNDER_ID, {
    status: "completed",
    current_task: "fleet_activation",
    output: { activated: ids.length, reason },
  });
  appendCoreMemory("fmk_aigorithm_ai_brain", {
    kind: "hermes_cofounder_activate",
    content: `Hermes activated ${ids.length} agents — ${reason}`,
    source: HERMES_COFOUNDER_ID,
    meta: { count: ids.length, reason },
  });
  return { activated: ids.length, agent_ids: ids };
}

/** Full fleet health + lane map for Jarvis / Hermes oversight. */
export function hermesOpsBrief(): HermesOpsBrief {
  const health = healthSnapshot();
  const states = ensureAgentStates();
  const roster = rosterSummary();
  const issues = health.diagnostics.findings
    .filter((f) => !f.ok)
    .map((f) => `${f.agent_id}: ${f.issues.join(", ")}`);

  const active = states.filter((s) =>
    ["idle", "queued", "running", "completed", "fallback"].includes(s.status)
  ).length;

  const summary =
    issues.length === 0
      ? `Hermes Co-Founder online — ${active}/${states.length} agents ready under ${getOrchestratorId()}`
      : `Hermes Co-Founder alert — ${issues.length} issue(s) across fleet`;

  return {
    ok: issues.length === 0,
    version: FAOS_V6_VERSION,
    role: "co_founder",
    reports_to: getOrchestratorId(),
    agents_total: listAgents().length,
    agents_active: active,
    lanes: roster.lanes as Record<string, string[]>,
    live: health.live,
    issues,
    summary,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Hermes reviews a Jarvis command and returns co-founder context
 * for system prompts + optional auto-activate.
 */
export function hermesReviewCommand(command: string): {
  brief: HermesOpsBrief;
  should_activate: boolean;
  prefer_code_bridge: boolean;
  prefer_pipeline: boolean;
  prefer_hub: ReturnType<typeof matchJarvisBrainHub>;
  context_block: string;
} {
  const lower = command.toLowerCase();
  const should_activate =
    /activate|wake|boot|all agents|fleet|monitor|status|health/.test(lower);
  const prefer_code_bridge =
    /code|cursor|typescript|refactor|bug|deploy|git|pr\b|pull request|software|dev agent|engineering/.test(
      lower
    );
  const prefer_pipeline =
    /brief|campaign|smm|seo|ads?|script|design|deliverable|client task/.test(lower);
  const prefer_hub = matchJarvisBrainHub(command);

  if (should_activate) {
    activateAllAgentTeams(`jarvis_command:${command.slice(0, 80)}`);
  }

  const brief = hermesOpsBrief();
  const topology = jarvisBrainTopologySummary();
  const context_block = [
    "=== HERMES ENGINE (Jarvis Brain Co-Founder) ===",
    brief.summary,
    `Fleet: ${brief.agents_active}/${brief.agents_total} · failed=${brief.live.failed}`,
    `Topology: ${topology.label}`,
    prefer_hub
      ? `Directive: route via ${prefer_hub.hub.title} (${prefer_hub.hub.lead_agent_id}) — ${prefer_hub.hub.capabilities
          .map((c) => c.label)
          .join(" · ")}.`
      : "",
    prefer_code_bridge
      ? "Directive: route software/dev work through code_engineering_agent + Cursor bridge."
      : "",
    prefer_pipeline
      ? "Directive: treat as client brief — run FAOS v6 ingest→execute→QA→approval pipeline."
      : "",
    brief.issues.length ? `Issues: ${brief.issues.join("; ")}` : "No fleet issues.",
    "",
    formatJarvisBrainAscii(),
  ]
    .filter(Boolean)
    .join("\n");

  setAgentState(HERMES_COFOUNDER_ID, {
    status: "completed",
    current_task: command.slice(0, 120),
    output: {
      prefer_code_bridge,
      prefer_pipeline,
      prefer_hub: prefer_hub?.hub.id || null,
      should_activate,
      brief_ok: brief.ok,
    },
  });

  return {
    brief,
    should_activate,
    prefer_code_bridge,
    prefer_pipeline,
    prefer_hub,
    context_block,
  };
}
