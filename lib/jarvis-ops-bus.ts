/**
 * FAOS v6.0 — Ops bus: activate fleet, interconnect Jarvis ↔ Hermes ↔ pipelines
 */

import { executeAgentGraph } from "@/faos_core/agents/execution-graph";
import { jarvisRoute } from "@/faos_core/orchestrator/jarvis-engine";
import { healthSnapshot } from "@/faos_core/orchestrator/health";
import {
  activateAllAgentTeams,
  hermesOpsBrief,
  hermesReviewCommand,
  HERMES_COFOUNDER_ID,
} from "@/lib/hermes-cofounder";
import { runCodeEngineeringBridge } from "@/lib/code-engineering-bridge";
import { runClientTaskPipeline } from "@/faos_core/pipelines/client-task-pipeline";
import { FAOS_V6_VERSION } from "@/faos_core/types";
import {
  buildConnectivityPlan,
  formatConnectivityForReply,
  type ConnectivityPlan,
} from "@/lib/agent-connectivity";

export type OpsBusResult = {
  ok: boolean;
  version: typeof FAOS_V6_VERSION;
  hermes: ReturnType<typeof hermesOpsBrief>;
  activation?: ReturnType<typeof activateAllAgentTeams>;
  path: "activate" | "code_bridge" | "pipeline" | "graph" | "chat";
  result: unknown;
  reply: string;
  connectivity: ConnectivityPlan;
};

/**
 * One-stop Jarvis Brain entry: Hermes reviews → routes to the right workflow.
 */
export async function runJarvisOpsBus(
  command: string,
  options?: {
    clientKey?: string;
    brand?: string;
    session_id?: string;
    auto_approve?: boolean;
    force_activate?: boolean;
  }
): Promise<OpsBusResult> {
  const review = hermesReviewCommand(command);
  let activation: ReturnType<typeof activateAllAgentTeams> | undefined;

  if (options?.force_activate || review.should_activate) {
    activation = activateAllAgentTeams(
      options?.force_activate ? "ops_bus_force" : "ops_bus_auto"
    );
  }

  // Ensure Hermes is always in the supporting set for oversight
  if (review.prefer_code_bridge) {
    const connectivity = buildConnectivityPlan(command, { path: "code_bridge" });
    const code = await runCodeEngineeringBridge({
      command,
      brand: options?.brand || "FAOS",
      session_id: options?.session_id,
    });
    return {
      ok: code.ok,
      version: FAOS_V6_VERSION,
      hermes: review.brief,
      activation,
      path: "code_bridge",
      result: code,
      connectivity,
      reply: [
        code.summary,
        "",
        review.context_block,
        "",
        "Agent deliverables prepared. Cursor bridge " +
          (code.mode === "dry_run"
            ? "is dry-run (set CURSOR_AGENT_WEBHOOK_URL for live dispatch)."
            : `mode=${code.mode}.`),
        formatConnectivityForReply(connectivity),
      ].join("\n"),
    };
  }

  if (review.prefer_pipeline) {
    const connectivity = buildConnectivityPlan(command, { path: "pipeline" });
    const pipeline = await runClientTaskPipeline(
      {
        details: command,
        brand: options?.brand || "BulletsEye",
        agent_ids: undefined,
      },
      { auto_approve: options?.auto_approve !== false, brand: options?.brand }
    );
    return {
      ok: pipeline.ok,
      version: FAOS_V6_VERSION,
      hermes: hermesOpsBrief(),
      activation,
      path: "pipeline",
      result: pipeline,
      connectivity,
      reply: [
        pipeline.approval?.client_facing_output ||
          `Pipeline ${pipeline.pipeline_id} · stage ${pipeline.stage}`,
        formatConnectivityForReply(connectivity),
      ].join("\n"),
    };
  }

  if (/activate|wake|boot|fleet|all agents|monitor|health check/.test(command.toLowerCase())) {
    activation = activation || activateAllAgentTeams("explicit_activate");
    const brief = hermesOpsBrief();
    const health = healthSnapshot();
    const connectivity = buildConnectivityPlan(command, { path: "activate" });
    return {
      ok: brief.ok,
      version: FAOS_V6_VERSION,
      hermes: brief,
      activation,
      path: "activate",
      result: { brief, health },
      connectivity,
      reply: [
        brief.summary,
        `Activated ${activation.activated} agents including ${HERMES_COFOUNDER_ID}.`,
        `Lanes: ${Object.keys(brief.lanes).join(", ")}`,
        brief.issues.length ? `Issues: ${brief.issues.join("; ")}` : "Fleet clear.",
        formatConnectivityForReply(connectivity),
      ].join("\n"),
    };
  }

  // Default: concurrent graph under Hermes oversight, then chat-capable jarvisRoute
  const graph = await executeAgentGraph(command, {
    agent_ids: [HERMES_COFOUNDER_ID],
    brand: options?.brand,
    category: "general",
  });

  const routed = await jarvisRoute(command, {
    clientKey: options?.clientKey || "jarvis-ops-bus",
    mode: "chat",
    brand: options?.brand,
    auto_approve: options?.auto_approve,
  });

  const connectivity = buildConnectivityPlan(command, {
    path: "chat",
    primary_id: routed.primary_agent,
    supporting_ids: routed.supporting_agents,
  });

  return {
    ok: true,
    version: FAOS_V6_VERSION,
    hermes: hermesOpsBrief(),
    activation,
    path: "chat",
    result: { graph, routed },
    connectivity,
    reply: [
      routed.reply || "",
      "",
      `— Hermes oversight: ${review.brief.summary}`,
      routed.supporting_agents?.length
        ? `Dispatched: ${[routed.primary_agent, ...routed.supporting_agents].join(", ")}`
        : "",
      formatConnectivityForReply(connectivity),
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

export function opsBusStatus() {
  const brief = hermesOpsBrief();
  return {
    ...brief,
    version: FAOS_V6_VERSION,
    hermes_cofounder: HERMES_COFOUNDER_ID,
    message: "Jarvis Ops Bus online — Hermes Co-Founder monitoring fleet",
  };
}
