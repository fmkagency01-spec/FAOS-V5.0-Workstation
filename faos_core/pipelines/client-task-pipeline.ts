/**
 * FAOS v6.0 — End-to-end client task pipeline
 * Ingestion → Execution → QA → Approval
 */

import { executeAgentGraph } from "@/faos_core/agents/execution-graph";
import { runApprovalGate } from "@/faos_core/pipelines/approval";
import { ingestClientBrief, type IngestInput } from "@/faos_core/pipelines/ingestion";
import { evaluateDeliverable } from "@/faos_core/pipelines/qa";
import { FAOS_V6_VERSION, type PipelineResult } from "@/faos_core/types";

export type PipelineOptions = {
  auto_approve?: boolean;
  brand?: string;
};

export async function runClientTaskPipeline(
  input: IngestInput,
  options?: PipelineOptions
): Promise<PipelineResult> {
  const started_at = new Date().toISOString();
  const pipeline_id = `pipe_${Date.now().toString(36)}`;

  try {
    // 1. Ingestion
    const brief = ingestClientBrief({
      ...input,
      brand: input.brand || options?.brand || "BulletsEye",
    });

    // 2. Execution graph
    const graph = await executeAgentGraph(brief.details, {
      agent_ids: brief.agent_ids,
      category: brief.category,
      brand: brief.brand,
      metadata: { ...brief.metadata, brief_id: brief.brief_id, pipeline_id },
    });

    const combined =
      typeof graph.aggregated.combined_text === "string"
        ? graph.aggregated.combined_text
        : JSON.stringify(graph.aggregated);

    // 3. Internal QA
    const qa = evaluateDeliverable(brief, combined, graph.results.length);

    // 4. Approval gate
    const approval = await runApprovalGate({
      pipeline_id,
      brief,
      combinedText: combined,
      qa,
      auto_approve: options?.auto_approve,
    });

    return {
      ok: qa.passed,
      pipeline_id,
      stage: approval.ready_for_publish ? "delivered" : "approval",
      brief,
      assigned_agents: graph.results.map((r) => r.state.agent_id),
      agent_states: graph.agent_states,
      aggregated_output: graph.aggregated,
      qa,
      approval,
      started_at,
      finished_at: new Date().toISOString(),
      version: FAOS_V6_VERSION,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "pipeline_failed";
    return {
      ok: false,
      pipeline_id,
      stage: "failed",
      brief: {
        brief_id: `brief_failed`,
        category: "general",
        title: "Failed brief",
        details: input.details || "",
        brand: input.brand || options?.brand,
      },
      assigned_agents: [],
      agent_states: [],
      aggregated_output: { error: message },
      qa: null,
      approval: null,
      started_at,
      finished_at: new Date().toISOString(),
      version: FAOS_V6_VERSION,
    };
  }
}
