/**
 * FAOS v6.0 — CLI controller for diagnostics + E2E pipeline simulation
 *
 * Usage:
 *   npx tsx scripts/faos-v6-cli.ts diagnostics
 *   npx tsx scripts/faos-v6-cli.ts pipeline "SMM brief for BulletsEye Instagram launch"
 *   npx tsx scripts/faos-v6-cli.ts route "Check inventory for FMK WIG"
 */

import { auditAgentDefinitions } from "../faos_core/orchestrator/health";
import { jarvisRoute, jarvisNetworkStatus } from "../faos_core/orchestrator/jarvis-engine";
import { runClientTaskPipeline } from "../faos_core/pipelines/client-task-pipeline";

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const action = (cmd || "diagnostics").toLowerCase();
  const text = rest.join(" ").trim();

  if (action === "status") {
    console.log(JSON.stringify(jarvisNetworkStatus(), null, 2));
    return;
  }

  if (action === "diagnostics") {
    const report = auditAgentDefinitions();
    console.log(JSON.stringify(report, null, 2));
    if (!report.ok) process.exitCode = 1;
    return;
  }

  if (action === "pipeline") {
    if (!text) {
      console.error('Usage: npx tsx scripts/faos-v6-cli.ts pipeline "<brief>"');
      process.exitCode = 1;
      return;
    }
    const result = await runClientTaskPipeline(
      { details: text, brand: "BulletsEye" },
      { auto_approve: true }
    );
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exitCode = 1;
    return;
  }

  if (action === "route") {
    if (!text) {
      console.error('Usage: npx tsx scripts/faos-v6-cli.ts route "<command>"');
      process.exitCode = 1;
      return;
    }
    const result = await jarvisRoute(text, {
      clientKey: "faos-v6-cli",
      mode: "graph",
      auto_approve: true,
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.error("Unknown action. Use: diagnostics | status | pipeline | route");
  process.exitCode = 1;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
