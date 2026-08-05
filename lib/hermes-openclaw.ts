/**
 * Hermes / OpenClaw-style 24/7 background task router.
 *
 * OpenClaw is not a third-party dependency — this is FAOS's claw dispatcher:
 * Hermes (automation model) classifies the next ops action, then OpenClaw
 * routes to BulletsEye lead-gen, FMK Media drafting, Aigorithm ingest drain,
 * or the standard harness cycle.
 */

import { AI_MODELS } from "@/lib/ai-router";
import { appendCoreMemory } from "@/lib/core-memory";
import { listLearningHubLocal, ingestLearningHubLocal } from "@/lib/learning-hub-store";
import {
  runBulletseyeLeadGeneration,
  runFmkMediaContentDrafting,
} from "@/lib/ops-revenue-engine";
import { getOpenRouterApiKey, safeOpenRouterCall } from "@/lib/openrouter";
import { runHarnessCycle } from "@/lib/harness-agents";
import {
  activateAllAgentTeams,
  hermesOpsBrief,
} from "@/lib/hermes-cofounder";

export type OpenClawTask =
  | "lead_gen"
  | "content_draft"
  | "ingest_pending"
  | "harness_cycle"
  | "agent_monitor"
  | "idle";

export type HermesOpenClawResult = {
  ok: true;
  engine: "hermes_openclaw";
  decided_task: OpenClawTask;
  reason: string;
  used_hermes: boolean;
  model?: string;
  payload: Record<string, unknown>;
};

function decideDeterministic(): { task: OpenClawTask; reason: string } {
  const pending = listLearningHubLocal(20).filter((i) => i.status === "pending").length;
  const minute = new Date().getUTCMinutes();
  const brief = hermesOpsBrief();

  if (!brief.ok || brief.live.failed > 0) {
    return {
      task: "agent_monitor",
      reason: `Hermes Co-Founder fleet alert (${brief.issues.length || brief.live.failed})`,
    };
  }
  if (pending > 0) {
    return { task: "ingest_pending", reason: `${pending} learning-hub items pending` };
  }
  // Rotate revenue engines + agent monitor across the hour
  if (minute % 30 < 8) {
    return { task: "agent_monitor", reason: "Hermes Co-Founder fleet health window" };
  }
  if (minute % 30 < 14) {
    return { task: "lead_gen", reason: "BulletsEye lead-gen window" };
  }
  if (minute % 30 < 22) {
    return { task: "content_draft", reason: "FMK Media / Editing Hub draft window" };
  }
  return { task: "harness_cycle", reason: "Hermes default → harness Alpha/Beta/Gamma" };
}

async function decideWithHermes(): Promise<{ task: OpenClawTask; reason: string; model?: string; used: boolean }> {
  const base = decideDeterministic();
  if (!getOpenRouterApiKey()) {
    return { ...base, used: false };
  }

  try {
    const pending = listLearningHubLocal(10).filter((i) => i.status === "pending").length;
    const result = await safeOpenRouterCall(
      [
        {
          role: "system",
          content:
            "You are Hermes Co-Founder / OpenClaw for FAOS JARVIS MATRIX. Reply with ONE token only: " +
            "agent_monitor | lead_gen | content_draft | ingest_pending | harness_cycle | idle",
        },
        {
          role: "user",
          content: `UTC minute=${new Date().getUTCMinutes()}; pending_ingest=${pending}; hint=${base.task}`,
        },
      ],
      {
        model: AI_MODELS.hermes,
        maxTokens: 16,
        temperature: 0,
        clientKey: "hermes-openclaw",
        intent: "automation",
      }
    );
    const token = result.reply.trim().toLowerCase().replace(/[^a-z_]/g, "");
    const allowed: OpenClawTask[] = [
      "agent_monitor",
      "lead_gen",
      "content_draft",
      "ingest_pending",
      "harness_cycle",
      "idle",
    ];
    const task = (allowed.includes(token as OpenClawTask) ? token : base.task) as OpenClawTask;
    return {
      task,
      reason: `Hermes decided ${task} (hint was ${base.task})`,
      model: result.model,
      used: true,
    };
  } catch {
    return { ...base, used: false };
  }
}

export async function runHermesOpenClawRouter(opts?: {
  use_llm?: boolean;
  force_task?: OpenClawTask;
}): Promise<HermesOpenClawResult> {
  const decision = opts?.force_task
    ? { task: opts.force_task, reason: `forced:${opts.force_task}`, used: false as boolean, model: undefined }
    : opts?.use_llm
      ? await decideWithHermes()
      : { ...decideDeterministic(), used: false as boolean, model: undefined };

  let payload: Record<string, unknown> = {};

  switch (decision.task) {
    case "agent_monitor": {
      const activation = activateAllAgentTeams("hermes_openclaw_monitor");
      const brief = hermesOpsBrief();
      payload = { activation, brief };
      break;
    }
    case "lead_gen": {
      const out = await runBulletseyeLeadGeneration({ use_llm: Boolean(opts?.use_llm) });
      payload = out as unknown as Record<string, unknown>;
      break;
    }
    case "content_draft": {
      const out = await runFmkMediaContentDrafting({ use_llm: Boolean(opts?.use_llm) });
      payload = out as unknown as Record<string, unknown>;
      break;
    }
    case "ingest_pending": {
      const pending = listLearningHubLocal(20).filter((i) => i.status === "pending");
      let processed = 0;
      for (const item of pending.slice(0, 10)) {
        ingestLearningHubLocal(item.id);
        processed += 1;
      }
      payload = { processed, pending_before: pending.length };
      break;
    }
    case "harness_cycle": {
      const out = await runHarnessCycle();
      payload = { cycle_id: out.cycle_id, steps: out.steps.length };
      break;
    }
    case "idle":
    default:
      payload = { idle: true };
      break;
  }

  appendCoreMemory("fmk_aigorithm_ai_brain", {
    kind: "hermes_openclaw_route",
    content: `OpenClaw routed → ${decision.task}: ${decision.reason}`,
    source: "hermes_openclaw",
    meta: {
      task: decision.task,
      used_hermes: decision.used,
      model: decision.model,
    },
  });

  return {
    ok: true,
    engine: "hermes_openclaw",
    decided_task: decision.task,
    reason: decision.reason,
    used_hermes: decision.used,
    model: decision.model,
    payload,
  };
}
