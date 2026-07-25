/**
 * Local autonomous orchestrate tick — Render fallback.
 */

import { runHarnessCycle } from "@/lib/harness-agents";
import { executeSeoGeoSquad } from "@/lib/bulletseye-squad";
import { getSeoGeoTargets, getFmkGroupCore } from "@/lib/fmk-group-core";
import { buildTacSyncStatus } from "@/lib/tac-ecosystem";
import { ingestLearningHubLocal, listLearningHubLocal } from "@/lib/learning-hub-store";

export type OrchestrateTickResult = {
  ok: true;
  tick_id: string;
  started_at: string;
  finished_at: string;
  core_id: string;
  engine: string;
  system: string;
  jobs: string[];
  steps: Array<{
    job: string;
    status: string;
    summary: string;
    payload?: Record<string, unknown>;
  }>;
  source: "vercel-local";
};

const LOOP_STATE = {
  last_tick_at: null as string | null,
  ticks_completed: 0,
  running: false,
  last_tick_id: null as string | null,
};

export function orchestrateStatusLocal() {
  const core = getFmkGroupCore();
  return {
    ok: true as const,
    core_id: core.core_id,
    engine: "JARVIS MATRIX V5.0",
    system: "100% Autonomous",
    autonomous_loop: {
      enabled: true,
      interval_sec: core.autonomous_loop.default_interval_sec,
    },
    runtime: {
      running: LOOP_STATE.running,
      last_tick_at: LOOP_STATE.last_tick_at,
      last_tick_id: LOOP_STATE.last_tick_id,
      ticks_completed: LOOP_STATE.ticks_completed,
    },
    source: "vercel-local" as const,
  };
}

export async function runOrchestrateTickLocal(opts?: {
  jobs?: string[];
  use_llm?: boolean;
}): Promise<OrchestrateTickResult> {
  if (LOOP_STATE.running) {
    return {
      ok: true,
      tick_id: LOOP_STATE.last_tick_id || "tick_skipped",
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
      core_id: "fmk_group_ltd_core",
      engine: "JARVIS MATRIX V5.0",
      system: "100% Autonomous",
      jobs: opts?.jobs || [],
      steps: [
        {
          job: "skip",
          status: "skipped",
          summary: "tick_already_running",
        },
      ],
      source: "vercel-local",
    };
  }

  LOOP_STATE.running = true;
  const started = new Date().toISOString();
  const tickId = `tick_${Date.now().toString(36)}`;
  const core = getFmkGroupCore();
  const jobs =
    opts?.jobs ||
    core.autonomous_loop.jobs || [
      "harness_cycle",
      "bulletseye_seo_geo_scan",
      "media_pipeline_drain",
      "tac_sync",
      "learning_hub_ingest_pending",
    ];
  const steps: OrchestrateTickResult["steps"] = [];

  try {
    if (jobs.includes("harness_cycle")) {
      const harness = await runHarnessCycle();
      steps.push({
        job: "harness_cycle",
        status: "completed",
        summary: `${harness.steps.length} workers executed`,
        payload: { steps: harness.steps },
      });
    }

    if (jobs.includes("bulletseye_seo_geo_scan")) {
      const scans = [];
      for (const target of getSeoGeoTargets()) {
        try {
          const out = await executeSeoGeoSquad({
            brand_name: target.brand_name,
            brand_id: target.brand_id,
            query_type: target.query_type,
            client_type:
              target.client_type === "external_b2b" ? "external_b2b" : "internal",
            auto_inject_flag: false,
            use_llm: Boolean(opts?.use_llm),
          });
          scans.push({
            brand_id: target.brand_id,
            status: "completed",
            execution_id: out.execution_id,
            schema_blocks: out.schema_blocks.length,
          });
        } catch {
          scans.push({ brand_id: target.brand_id, status: "failed" });
        }
      }
      steps.push({
        job: "bulletseye_seo_geo_scan",
        status: "completed",
        summary: `${scans.length} brand scans`,
        payload: { scans },
      });
    }

    if (jobs.includes("media_pipeline_drain")) {
      steps.push({
        job: "media_pipeline_drain",
        status: "completed",
        summary: "Local media queue idle (Render owns durable queue)",
        payload: { processed: 0 },
      });
    }

    if (jobs.includes("tac_sync")) {
      const tac = buildTacSyncStatus(false);
      steps.push({
        job: "tac_sync",
        status: "completed",
        summary: "TAC pillars synced locally",
        payload: { pillars: tac.pillars.length },
      });
    }

    if (jobs.includes("learning_hub_ingest_pending")) {
      const pending = listLearningHubLocal(20).filter((i) => i.status === "pending");
      let processed = 0;
      for (const item of pending.slice(0, 10)) {
        ingestLearningHubLocal(item.id);
        processed += 1;
      }
      steps.push({
        job: "learning_hub_ingest_pending",
        status: "completed",
        summary: `Ingested ${processed} learning items`,
        payload: { processed },
      });
    }

    const finished = new Date().toISOString();
    LOOP_STATE.last_tick_at = finished;
    LOOP_STATE.last_tick_id = tickId;
    LOOP_STATE.ticks_completed += 1;

    return {
      ok: true,
      tick_id: tickId,
      started_at: started,
      finished_at: finished,
      core_id: core.core_id,
      engine: "JARVIS MATRIX V5.0",
      system: "100% Autonomous",
      jobs,
      steps,
      source: "vercel-local",
    };
  } finally {
    LOOP_STATE.running = false;
  }
}
