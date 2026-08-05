/**
 * FAOS v6.0 — Agent verification & health checks
 */

import {
  ensureAgentStates,
  getAgent,
  getOrchestratorId,
  listAgents,
  registryStats,
} from "@/faos_core/orchestrator/agent-registry";
import {
  EXPECTED_SHELL_AGENT_COUNT,
  FAOS_V6_VERSION,
  type DiagnosticsFinding,
  type DiagnosticsReport,
} from "@/faos_core/types";

const FORBIDDEN_IDS = [
  "fmk_week",
  "fmcg_wish",
  "fmk_fmcg_week_supply_agent",
] as const;

const REQUIRED_FIELDS = [
  "id",
  "name",
  "icon",
  "domain",
  "keywords",
  "model_hint",
  "description",
] as const;

export function auditAgentDefinitions(): DiagnosticsReport {
  const agents = listAgents();
  const findings: DiagnosticsFinding[] = [];
  const seen = new Set<string>();

  for (const agent of agents) {
    const issues: string[] = [];
    for (const field of REQUIRED_FIELDS) {
      const value = agent[field];
      if (value === undefined || value === null || value === "") {
        issues.push(`missing_${field}`);
      }
    }
    if (!Array.isArray(agent.keywords) || agent.keywords.length === 0) {
      issues.push("empty_keywords");
    }
    if (seen.has(agent.id)) {
      issues.push("duplicate_id");
    }
    seen.add(agent.id);
    if ((FORBIDDEN_IDS as readonly string[]).includes(agent.id)) {
      issues.push("forbidden_namespace");
    }
    findings.push({
      agent_id: agent.id,
      ok: issues.length === 0,
      issues,
      domain: agent.domain,
      name: agent.name,
    });
  }

  const orch = getOrchestratorId();
  if (!getAgent(orch)) {
    findings.push({
      agent_id: orch,
      ok: false,
      issues: ["orchestrator_missing_from_roster"],
    });
  }

  if (agents.length !== EXPECTED_SHELL_AGENT_COUNT) {
    findings.push({
      agent_id: "_roster",
      ok: false,
      issues: [
        `count_mismatch:expected_${EXPECTED_SHELL_AGENT_COUNT}:found_${agents.length}`,
      ],
    });
  }

  ensureAgentStates();
  const failed = findings.filter((f) => !f.ok);
  const stats = registryStats();
  const ok = failed.length === 0;

  return {
    ok,
    version: FAOS_V6_VERSION,
    expected_agents: EXPECTED_SHELL_AGENT_COUNT,
    found_agents: agents.length,
    orchestrator: orch,
    findings,
    summary: ok
      ? `All ${agents.length} agents healthy · registry ${stats.version} · orchestrator ${orch}`
      : `${failed.length} issue(s) across ${agents.length} agents`,
    timestamp: new Date().toISOString(),
  };
}

export function healthSnapshot() {
  const report = auditAgentDefinitions();
  const states = ensureAgentStates();
  return {
    ok: report.ok,
    version: FAOS_V6_VERSION,
    registry: registryStats(),
    diagnostics: report,
    agent_states: states,
    live: {
      idle: states.filter((s) => s.status === "idle").length,
      running: states.filter((s) => s.status === "running").length,
      failed: states.filter((s) => s.status === "failed" || s.status === "fallback").length,
    },
  };
}
