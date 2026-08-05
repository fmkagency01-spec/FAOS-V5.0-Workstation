import { routeQuery, type AiIntent } from "@/lib/ai-router";
import { jarvisOfflineReply } from "@/lib/jarvis-fallback";
import { chatWithOpenRouter, type ChatMessage } from "@/lib/openrouter";
import { isOpenRouterAuthError } from "@/lib/openrouter-errors";
import {
  getOrchestratorId,
  getShellAgent,
  matchShellAgents,
  type ShellAgent,
} from "@/lib/shell-agents";
import {
  buildConnectivityPlan,
  formatConnectivityForReply,
  type ConnectivityPlan,
} from "@/lib/agent-connectivity";
import { matchJarvisBrainHub } from "@/lib/jarvis-brain-hubs";

export type JarvisAction =
  | { type: "none" }
  | { type: "create_invoice"; payload: Record<string, unknown> }
  | { type: "add_inventory"; payload: Record<string, unknown> }
  | { type: "add_employee"; payload: Record<string, unknown> }
  | { type: "assign_agents"; payload: { command: string; agent_ids: string[] } }
  | { type: "generate_image"; payload: { prompt: string } }
  | { type: "generate_video_plan"; payload: { brief: string } }
  | {
      type: "code_engineering";
      payload: { command: string; mode?: "plan" | "implement" | "review" | "fix" };
    }
  | { type: "activate_fleet"; payload: { reason: string } }
  | { type: "run_pipeline"; payload: { details: string; brand?: string } }
  | {
      type: "client_hunting";
      payload: { brand?: string; brief: string; limit?: number };
    };

export type JarvisPlan = {
  command: string;
  primary_agent: ShellAgent;
  supporting_agents: ShellAgent[];
  route: ReturnType<typeof routeQuery>;
  action: JarvisAction;
  system_context: string;
  connectivity: ConnectivityPlan;
};

export type JarvisResult = {
  reply: string;
  model: string;
  intent: AiIntent;
  primary_agent: ShellAgent;
  agents_dispatched: string[];
  action_taken?: string;
  action_result?: unknown;
  usage?: { total_tokens?: number };
  connectivity?: ConnectivityPlan;
};

function detectErpAction(command: string): JarvisAction {
  const lower = command.toLowerCase();

  if (/activate|wake (all )?agents|boot fleet|fleet status|agent health|monitor (all )?agents/.test(lower)) {
    return { type: "activate_fleet", payload: { reason: command.slice(0, 120) } };
  }
  if (
    /code|cursor|typescript|refactor|bug|deploy|pull request|\bpr\b|software|dev agent|engineering|fix (the )?build/.test(
      lower
    )
  ) {
    return { type: "code_engineering", payload: { command } };
  }
  if (
    /client hunt|lead scrap|lead gen|prospect|cold email|outreach|acquisition funnel|hunt leads|b2b lead/.test(
      lower
    )
  ) {
    let brand: string | undefined;
    if (/fmk\s*wig|prosthetic|hair system/.test(lower)) brand = "fmk_wig";
    else if (/fmk\s*agency|full[- ]stack/.test(lower)) brand = "fmk_agency";
    else if (/bulletseye|performance marketing|meta ads|google ads/.test(lower))
      brand = "bulletseye";
    return {
      type: "client_hunting",
      payload: { brand, brief: command },
    };
  }
  if (/brief|campaign|smm|deliverable|client task|design brief|video script/.test(lower)) {
    return {
      type: "run_pipeline",
      payload: {
        details: command,
        brand: /fmk wig|bulletseye|rr wig/i.test(command) ? undefined : "BulletsEye",
      },
    };
  }
  if (/invoice|bill|billing|payment due/.test(lower)) {
    return {
      type: "create_invoice",
      payload: { client_name: extractAfter(command, ["for", "to"]) || "Client", amount: extractAmount(command) },
    };
  }
  if (/add stock|inventory|sku|warehouse|reorder/.test(lower)) {
    return {
      type: "add_inventory",
      payload: { name: extractAfter(command, ["add", "stock", "item"]) || "Product", quantity: extractAmount(command) || 0 },
    };
  }
  if (/hire|employee|staff|hr|payroll/.test(lower)) {
    return {
      type: "add_employee",
      payload: { name: extractAfter(command, ["hire", "add employee"]) || "New Employee", role: "Staff" },
    };
  }
  if (/generate image|create image|design logo|make banner|draw/.test(lower)) {
    return { type: "generate_image", payload: { prompt: command } };
  }
  if (/video plan|edit video|reel script|storyboard/.test(lower)) {
    return { type: "generate_video_plan", payload: { brief: command } };
  }

  const matches = matchShellAgents(command, 3).filter((a) => a.id !== getOrchestratorId());
  if (matches.length > 0) {
    return {
      type: "assign_agents",
      payload: { command, agent_ids: matches.map((a) => a.id) },
    };
  }

  return { type: "none" };
}

function extractAfter(text: string, triggers: string[]): string | null {
  const lower = text.toLowerCase();
  for (const t of triggers) {
    const idx = lower.indexOf(t);
    if (idx >= 0) {
      const rest = text.slice(idx + t.length).trim();
      if (rest) return rest.split(/[.,;]/)[0]?.trim() || null;
    }
  }
  return null;
}

function extractAmount(text: string): number | undefined {
  const m = text.match(/\$?\s*([\d,]+(?:\.\d{2})?)/);
  if (m) return parseFloat(m[1].replace(/,/g, ""));
  return undefined;
}

export function planJarvisCommand(command: string): JarvisPlan {
  const trimmed = command.trim();
  const route = routeQuery(trimmed, true);
  const matches = matchShellAgents(trimmed, 4);
  const hermes = getShellAgent("hermes_cofounder_agent");
  const action = detectErpAction(trimmed);
  const hubMatch = matchJarvisBrainHub(trimmed);
  const hubLead =
    hubMatch && hubMatch.score >= 3
      ? getShellAgent(hubMatch.hub.lead_agent_id)
      : null;

  let primary =
    hubLead ||
    matches.find((a) => a.id !== getOrchestratorId()) ||
    getShellAgent(getOrchestratorId())!;

  // Prefer code engineering agent for software/Cursor bridge actions
  if (action.type === "code_engineering") {
    primary = getShellAgent("code_engineering_agent") || primary;
  }
  if (action.type === "activate_fleet" && hermes) {
    primary = hermes;
  }

  const hubSupportIds =
    hubMatch && hubMatch.score >= 3
      ? hubMatch.hub.supporting_agent_ids
          .map((id) => getShellAgent(id))
          .filter((a): a is ShellAgent => Boolean(a && a.id !== primary.id))
      : [];

  const supporting: ShellAgent[] = (
    hubSupportIds.length
      ? hubSupportIds
      : matches.filter((a) => a.id !== primary.id && a.id !== getOrchestratorId())
  ).slice(0, 3);
  // Always include Hermes Co-Founder in the support lane when available
  if (hermes && hermes.id !== primary.id && !supporting.some((a) => a.id === hermes.id)) {
    supporting.unshift(hermes);
    if (supporting.length > 3) supporting.pop();
  }

  const agentList = [primary, ...supporting].map((a) => `${a.icon} ${a.name} (${a.domain})`).join(", ");

  const isRealErp =
    action.type === "create_invoice" ||
    action.type === "add_inventory" ||
    action.type === "add_employee";

  const path =
    action.type === "activate_fleet"
      ? ("activate" as const)
      : action.type === "code_engineering"
        ? ("code_bridge" as const)
        : action.type === "run_pipeline"
          ? ("pipeline" as const)
          : action.type === "client_hunting"
            ? ("hub" as const)
            : hubLead && !isRealErp
              ? ("hub" as const)
              : isRealErp
                ? ("erp" as const)
                : action.type === "none"
                  ? ("chat" as const)
                  : hubLead
                    ? ("hub" as const)
                    : ("chat" as const);

  const connectivity = buildConnectivityPlan(trimmed, {
    path,
    primary_id: primary.id,
    supporting_ids: supporting.map((s) => s.id),
  });

  const system_context = [
    "You are JARVIS — FMK Group FAOS v6.0 executive AI orchestrator (Jarvis Brain).",
    "Hermes Engine (co-founder) monitors and operates all shell-agent teams under your command.",
    "Jarvis Brain topology: FMK WIG Agent · Agency Outreach Agent · Shell Brands Agent Hub.",
    hubMatch && hubMatch.score >= 3
      ? `Active hub: ${hubMatch.hub.title} — ${hubMatch.hub.capabilities.map((c) => c.label).join(" · ")}`
      : "",
    `Primary shell agent: ${primary.name} — ${primary.description}`,
    supporting.length ? `Supporting agents: ${supporting.map((a) => a.name).join(", ")}` : "",
    `Dispatched team: ${agentList}`,
    `Connectivity chain: ${connectivity.summary_line}`,
    "When answering, briefly name which agents will handle each part of a multi-step request.",
    "Coordinate as one unified one-stop workstation. Be concise. Deliver actionable results before deadlines.",
    "Never violate FMK WIG / BulletsEye namespace locks. Never expose API keys or .env contents.",
    "If ERP, pipeline, fleet activation, or Cursor/code bridge action was triggered, confirm what was done.",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    command: trimmed,
    primary_agent: primary,
    supporting_agents: supporting,
    route,
    action,
    system_context,
    connectivity,
  };
}

export async function executeJarvisPlan(
  plan: JarvisPlan,
  clientKey: string,
  executeAction?: (action: JarvisAction) => Promise<{ label: string; result: unknown } | null>
): Promise<JarvisResult> {
  let actionTaken: string | undefined;
  let actionResult: unknown;

  if (executeAction && plan.action.type !== "none") {
    try {
      const outcome = await executeAction(plan.action);
      if (outcome) {
        actionTaken = outcome.label;
        actionResult = outcome.result;
      }
    } catch (actionErr) {
      actionTaken = `Action ${plan.action.type} deferred: ${
        actionErr instanceof Error ? actionErr.message.slice(0, 120) : "failed"
      }`;
    }
  }

  const messages: ChatMessage[] = [
    { role: "system", content: plan.system_context },
    {
      role: "user",
      content: actionTaken
        ? `${plan.command}\n\n[System: ${actionTaken}]`
        : plan.command,
    },
  ];

  try {
    const ai = await chatWithOpenRouter(messages, {
      clientKey,
      model: plan.route.model,
      maxTokens: plan.route.maxTokens,
      intent: plan.route.intent,
    });

    const reply = `${ai.reply}${formatConnectivityForReply(plan.connectivity)}`;
    return {
      reply,
      model: ai.model,
      intent: ai.intent,
      primary_agent: plan.primary_agent,
      agents_dispatched: [
        plan.primary_agent.id,
        ...plan.supporting_agents.map((a) => a.id),
        "hermes_cofounder_agent",
      ],
      action_taken: actionTaken,
      action_result: actionResult,
      usage: ai.usage,
      connectivity: plan.connectivity,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "JARVIS gateway failed";
    const offline = jarvisOfflineReply(plan, message);
    if (offline) {
      return {
        reply: `${offline}${formatConnectivityForReply(plan.connectivity)}`,
        model: "jarvis-offline",
        intent: plan.route.intent,
        primary_agent: plan.primary_agent,
        agents_dispatched: [
          plan.primary_agent.id,
          ...plan.supporting_agents.map((a) => a.id),
          "hermes_cofounder_agent",
        ],
        action_taken: actionTaken,
        action_result: actionResult,
        connectivity: plan.connectivity,
      };
    }
    if (isOpenRouterAuthError(message)) {
      throw new Error(message);
    }
    throw err;
  }
}
