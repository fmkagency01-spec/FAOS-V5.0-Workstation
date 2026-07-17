import { routeQuery, type AiIntent } from "@/lib/ai-router";
import { chatWithOpenRouter, type ChatMessage } from "@/lib/openrouter";
import {
  getOrchestratorId,
  getShellAgent,
  matchShellAgents,
  type ShellAgent,
} from "@/lib/shell-agents";

export type JarvisAction =
  | { type: "none" }
  | { type: "create_invoice"; payload: Record<string, unknown> }
  | { type: "add_inventory"; payload: Record<string, unknown> }
  | { type: "add_employee"; payload: Record<string, unknown> }
  | { type: "assign_agents"; payload: { command: string; agent_ids: string[] } }
  | { type: "generate_image"; payload: { prompt: string } }
  | { type: "generate_video_plan"; payload: { brief: string } };

export type JarvisPlan = {
  command: string;
  primary_agent: ShellAgent;
  supporting_agents: ShellAgent[];
  route: ReturnType<typeof routeQuery>;
  action: JarvisAction;
  system_context: string;
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
};

function detectErpAction(command: string): JarvisAction {
  const lower = command.toLowerCase();

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
  const primary =
    matches.find((a) => a.id !== getOrchestratorId()) ||
    getShellAgent(getOrchestratorId())!;
  const supporting = matches.filter((a) => a.id !== primary.id && a.id !== getOrchestratorId()).slice(0, 3);
  const action = detectErpAction(trimmed);

  const agentList = [primary, ...supporting].map((a) => `${a.icon} ${a.name} (${a.domain})`).join(", ");

  const system_context = [
    "You are JARVIS — FMK Group FAOS v5.1 executive AI orchestrator.",
    `Primary shell agent: ${primary.name} — ${primary.description}`,
    supporting.length ? `Supporting agents: ${supporting.map((a) => a.name).join(", ")}` : "",
    `Dispatched team: ${agentList}`,
    "Coordinate as one unified assistant. Be concise. Deliver actionable results.",
    "If ERP action was triggered, confirm what was done.",
  ]
    .filter(Boolean)
    .join("\n");

  return { command: trimmed, primary_agent: primary, supporting_agents: supporting, route, action, system_context };
}

export async function executeJarvisPlan(
  plan: JarvisPlan,
  clientKey: string,
  executeAction?: (action: JarvisAction) => Promise<{ label: string; result: unknown } | null>
): Promise<JarvisResult> {
  let actionTaken: string | undefined;
  let actionResult: unknown;

  if (executeAction && plan.action.type !== "none") {
    const outcome = await executeAction(plan.action);
    if (outcome) {
      actionTaken = outcome.label;
      actionResult = outcome.result;
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

  const ai = await chatWithOpenRouter(messages, {
    clientKey,
    model: plan.route.model,
    maxTokens: plan.route.maxTokens,
    intent: plan.route.intent,
  });

  return {
    reply: ai.reply,
    model: ai.model,
    intent: ai.intent,
    primary_agent: plan.primary_agent,
    agents_dispatched: [plan.primary_agent.id, ...plan.supporting_agents.map((a) => a.id)],
    action_taken: actionTaken,
    action_result: actionResult,
    usage: ai.usage,
  };
}
