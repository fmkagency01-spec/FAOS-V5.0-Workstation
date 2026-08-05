/**
 * Code Engineering ↔ Cursor AI Agent bridge.
 * Routes Jarvis software/dev commands through code_engineering_agent /
 * harness_alpha_web_engineering to an optional Cursor Cloud webhook.
 *
 * Without CURSOR_AGENT_WEBHOOK_URL / CURSOR_API_KEY the bridge dry-runs and
 * returns a structured task packet (safe for local workstation).
 */

import { runAgentModule } from "@/faos_core/agents/base-agent";
import { setAgentState } from "@/faos_core/orchestrator/agent-registry";

export const CODE_ENGINEERING_AGENT_ID = "code_engineering_agent";
export const WEB_ENGINEERING_AGENT_ID = "harness_alpha_web_engineering";

export type CodeEngineeringRequest = {
  command: string;
  brand?: string;
  session_id?: string;
  mode?: "plan" | "implement" | "review" | "fix";
  agent_ids?: string[];
};

export type CodeEngineeringResult = {
  ok: boolean;
  mode: "dry_run" | "webhook" | "api";
  agents: string[];
  task_packet: Record<string, unknown>;
  agent_deliverables: Array<{ agent_id: string; status: string; deliverable: string }>;
  cursor?: {
    accepted?: boolean;
    status_code?: number;
    error?: string;
    response?: unknown;
  };
  summary: string;
};

function resolveMode(command: string, explicit?: CodeEngineeringRequest["mode"]) {
  if (explicit) return explicit;
  const lower = command.toLowerCase();
  if (/review|audit|security/.test(lower)) return "review" as const;
  if (/fix|bug|error|crash/.test(lower)) return "fix" as const;
  if (/implement|build|code|create|add|wire/.test(lower)) return "implement" as const;
  return "plan" as const;
}

export async function runCodeEngineeringBridge(
  req: CodeEngineeringRequest
): Promise<CodeEngineeringResult> {
  const mode = resolveMode(req.command, req.mode);
  const agents = Array.from(
    new Set([
      ...(req.agent_ids || []),
      CODE_ENGINEERING_AGENT_ID,
      WEB_ENGINEERING_AGENT_ID,
    ])
  );

  const task_id = `code_${Date.now().toString(36)}`;
  const deliverables: CodeEngineeringResult["agent_deliverables"] = [];

  for (const agentId of agents) {
    const run = await runAgentModule(agentId, {
      task_id: `${task_id}:${agentId}`,
      command: req.command,
      category: "code_engineering",
      brand: req.brand || "FAOS",
      metadata: { mode, bridge: "cursor", session_id: req.session_id },
    });
    deliverables.push({
      agent_id: agentId,
      status: run.state.status,
      deliverable: run.deliverable,
    });
  }

  const task_packet = {
    source: "faos_jarvis_v6",
    bridge: "cursor_ai_agent",
    task_id,
    mode,
    command: req.command,
    brand: req.brand || "FAOS",
    session_id: req.session_id,
    agents,
    constraints: [
      "FMK WIG lock: fmk_wig_prosthetic_hair_agent / FMK WIG only",
      "BulletsEye AI SEO: fmk_bulletseye_core_namespace",
      "Never hardcode OpenRouter keys",
      "Prefer faos_core/ for orchestrator/agent/pipeline changes",
    ],
    deliverables,
    deadline_policy: "submit before deadline; no security regressions; run diagnostics",
  };

  const webhook =
    process.env.CURSOR_AGENT_WEBHOOK_URL?.trim() ||
    process.env.FAOS_CURSOR_WEBHOOK_URL?.trim();
  const apiKey = process.env.CURSOR_API_KEY?.trim();

  let cursor: CodeEngineeringResult["cursor"];
  let bridgeMode: CodeEngineeringResult["mode"] = "dry_run";

  if (webhook) {
    bridgeMode = "webhook";
    try {
      const res = await fetch(webhook, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify(task_packet),
      });
      let response: unknown = null;
      try {
        response = await res.json();
      } catch {
        response = await res.text();
      }
      cursor = {
        accepted: res.ok,
        status_code: res.status,
        response,
        error: res.ok ? undefined : `http_${res.status}`,
      };
    } catch (err) {
      cursor = {
        accepted: false,
        error: err instanceof Error ? err.message : "webhook_failed",
      };
    }
  }

  setAgentState(CODE_ENGINEERING_AGENT_ID, {
    status: cursor?.accepted === false ? "fallback" : "completed",
    current_task: task_id,
    output: { mode, bridgeMode, cursor },
  });

  const summary = cursor?.accepted
    ? `Cursor bridge accepted ${mode} task ${task_id} via ${agents.join(", ")}`
    : webhook
      ? `Cursor bridge attempted ${mode} task ${task_id} (${cursor?.error || "pending"})`
      : `Code engineering dry-run ${mode} task ${task_id} — set CURSOR_AGENT_WEBHOOK_URL to live-dispatch`;

  return {
    ok: true,
    mode: bridgeMode,
    agents,
    task_packet,
    agent_deliverables: deliverables,
    cursor,
    summary,
  };
}
