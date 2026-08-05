/**
 * FAOS v6 — clear Jarvis ↔ Hermes ↔ agent-team connectivity map.
 * Used so part-by-part commands show who routes, who executes, who reviews.
 */

import { matchShellAgents, getShellAgent, getOrchestratorId } from "@/lib/shell-agents";
import { HERMES_COFOUNDER_ID } from "@/lib/hermes-cofounder";
import { agentsByLane, type AgentLane } from "@/faos_core/agents/roster";
import { matchJarvisBrainHub } from "@/lib/jarvis-brain-hubs";

export type ConnectivityHop = {
  step: number;
  role:
    | "command"
    | "orchestrator"
    | "co_founder"
    | "hub"
    | "lane"
    | "executor"
    | "qa"
    | "delivery";
  agent_id: string;
  agent_name: string;
  duty: string;
};

export type ConnectivityPlan = {
  command: string;
  path: "chat" | "pipeline" | "code_bridge" | "activate" | "erp" | "graph" | "hub";
  hub_id?: string;
  hops: ConnectivityHop[];
  lanes_engaged: AgentLane[];
  summary_line: string;
};

function hop(
  step: number,
  role: ConnectivityHop["role"],
  agentId: string,
  duty: string
): ConnectivityHop {
  const agent = getShellAgent(agentId);
  return {
    step,
    role,
    agent_id: agentId,
    agent_name: agent?.name || agentId,
    duty,
  };
}

/** Build an explicit connectivity chain for a Jarvis command. */
export function buildConnectivityPlan(
  command: string,
  options?: {
    path?: ConnectivityPlan["path"];
    primary_id?: string;
    supporting_ids?: string[];
  }
): ConnectivityPlan {
  const lower = command.toLowerCase();
  let path: ConnectivityPlan["path"] = options?.path || "chat";
  if (!options?.path) {
    if (/activate|wake|fleet|monitor|health/.test(lower)) path = "activate";
    else if (/code|cursor|typescript|refactor|bug|deploy|pr\b|engineering/.test(lower))
      path = "code_bridge";
    else if (/brief|campaign|smm|seo|ads?|script|design|deliverable/.test(lower))
      path = "pipeline";
    else if (/invoice|inventory|employee|hire|stock/.test(lower)) path = "erp";
  }

  const hubMatch = matchJarvisBrainHub(command);
  if (!options?.path && hubMatch && hubMatch.score >= 3) {
    path = "hub";
  }

  const matches = matchShellAgents(command, 4).filter((a) => a.id !== getOrchestratorId());
  const primary =
    options?.primary_id ||
    (path === "hub" && hubMatch ? hubMatch.hub.lead_agent_id : undefined) ||
    matches[0]?.id ||
    (path === "code_bridge" ? "code_engineering_agent" : HERMES_COFOUNDER_ID);
  const supporting =
    options?.supporting_ids ||
    (path === "hub" && hubMatch
      ? hubMatch.hub.supporting_agent_ids
          .filter((id) => Boolean(getShellAgent(id)))
          .slice(0, 3)
      : matches.slice(1, 3).map((m) => m.id));

  const hops: ConnectivityHop[] = [
    hop(1, "command", "jarvis_core", "You issue the requirement into Jarvis Brain"),
    hop(2, "orchestrator", getOrchestratorId(), "Jarvis parses intent and assigns teams"),
    hop(3, "co_founder", HERMES_COFOUNDER_ID, "Hermes Engine monitors fleet + deadlines + QA oversight"),
  ];

  let step = 4;
  const lanes = new Set<AgentLane>();

  if (path === "hub" && hubMatch) {
    const hub = hubMatch.hub;
    hops.push(
      hop(
        step++,
        "hub",
        hub.lead_agent_id,
        `${hub.title} hub engaged — ${hub.capabilities.map((c) => c.label).join(" · ")}`
      )
    );
    for (const id of supporting.slice(0, 3)) {
      hops.push(hop(step++, "executor", id, `Supporting ${hub.title} capability`));
    }
    hops.push(
      hop(step++, "qa", HERMES_COFOUNDER_ID, "Hermes Engine verifies hub output before delivery")
    );
    if (hub.id === "fmk_wig_hub") lanes.add("wig_ops");
    if (hub.id === "agency_outreach_hub") lanes.add("agency_outreach");
    if (hub.id === "shell_brands_hub") lanes.add("shell_brands");
  } else if (path === "activate") {
    hops.push(
      hop(step++, "lane", HERMES_COFOUNDER_ID, "Activate all 38 agents into idle-ready state")
    );
    for (const lane of ["marketing_strategy", "tech_content", "brand", "operations"] as AgentLane[]) {
      const ids = agentsByLane(lane).slice(0, 2);
      for (const m of ids) {
        lanes.add(lane);
        hops.push(hop(step++, "executor", m.id, `Ready in ${lane} lane`));
      }
    }
  } else if (path === "pipeline") {
    hops.push(
      hop(step++, "lane", "marketing_strategy_agent", "Strategy lane scopes the brief"),
      hop(step++, "executor", primary, "Primary production agent executes micro-task"),
    );
    for (const id of supporting) {
      hops.push(hop(step++, "executor", id, "Supporting agent concurrent deliverable"));
    }
    hops.push(
      hop(step++, "qa", HERMES_COFOUNDER_ID, "Internal QA against brief + forbidden-namespace lock"),
      hop(step++, "delivery", "executive_strategy_agent", "Approval gate → client-facing packet")
    );
    lanes.add("marketing_strategy");
  } else if (path === "code_bridge") {
    hops.push(
      hop(step++, "executor", "code_engineering_agent", "Software/dev task packet"),
      hop(step++, "executor", "harness_alpha_web_engineering", "Web/engineering harness support"),
      hop(step++, "qa", HERMES_COFOUNDER_ID, "Security + deadline review before Cursor dispatch")
    );
    lanes.add("tech_content");
  } else {
    hops.push(hop(step++, "executor", primary, "Primary specialist handles the command"));
    for (const id of supporting) {
      hops.push(hop(step++, "executor", id, "Supporting specialist"));
    }
    hops.push(
      hop(step++, "qa", HERMES_COFOUNDER_ID, "Co-founder verifies output before reply")
    );
  }

  const summary_line = hops
    .filter((h) => h.role !== "command")
    .map((h) => h.agent_name)
    .slice(0, 6)
    .join(" → ");

  return {
    command,
    path,
    hub_id: path === "hub" && hubMatch ? hubMatch.hub.id : undefined,
    hops,
    lanes_engaged: [...lanes],
    summary_line: `You → ${summary_line}`,
  };
}

export function formatConnectivityForReply(plan: ConnectivityPlan): string {
  const lines = [
    "",
    "—— Connectivity (part-by-part) ——",
    `Path: ${plan.path}`,
    ...plan.hops.map(
      (h) => `${h.step}. [${h.role}] ${h.agent_name} — ${h.duty}`
    ),
    `Chain: ${plan.summary_line}`,
  ];
  return lines.join("\n");
}
