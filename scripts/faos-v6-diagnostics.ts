/**
 * FAOS v6.0 — Workstation diagnostics CLI
 * Usage: npx tsx scripts/faos-v6-diagnostics.ts
 */

import { auditAgentDefinitions } from "../faos_core/orchestrator/health";
import { registryStats, listAgents } from "../faos_core/orchestrator/agent-registry";
import { llmConnectorStatus } from "../faos_core/connectors/llm";

function main() {
  const report = auditAgentDefinitions();
  const stats = registryStats();
  const llm = llmConnectorStatus();

  console.log("=== FAOS v6.0 Diagnostics ===");
  console.log(`Registry version: ${stats.version}`);
  console.log(`Orchestrator: ${stats.orchestrator}`);
  console.log(`Agents: ${stats.found}/${stats.expected}`);
  console.log(`Domains: ${stats.domains.join(", ")}`);
  console.log(`LLM: openrouter=${llm.openrouter_configured ? "configured" : "missing_key"}`);
  console.log(`Summary: ${report.summary}`);
  console.log("");

  for (const f of report.findings) {
    const mark = f.ok ? "✓" : "✗";
    const extra = f.ok ? "" : ` [${f.issues.join(", ")}]`;
    console.log(`${mark} ${f.agent_id}${extra}`);
  }

  console.log("");
  console.log(`Roster sample: ${listAgents().slice(0, 5).map((a) => a.id).join(", ")}…`);

  if (!report.ok) {
    process.exitCode = 1;
  }
}

main();
