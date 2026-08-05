/**
 * FAOS v6.0 — standardized agent & pipeline types
 */

export type AgentStatus =
  | "idle"
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "fallback"
  | "timeout";

/** Standard Agent State Schema (v6.0) */
export type AgentState = {
  agent_id: string;
  status: AgentStatus;
  current_task: string | null;
  output: Record<string, unknown> | null;
  timestamp: string;
  error?: string;
  latency_ms?: number;
};

export type TaskCategory =
  | "smm"
  | "performance_marketing"
  | "video_scripting"
  | "design_brief"
  | "seo_geo"
  | "general";

export type PipelineStage =
  | "ingestion"
  | "execution"
  | "qa"
  | "approval"
  | "delivered"
  | "failed";

export type ClientBrief = {
  brief_id: string;
  brand?: string;
  category: TaskCategory;
  title: string;
  details: string;
  priority?: "low" | "normal" | "high";
  agent_ids?: string[];
  client_facing?: boolean;
  metadata?: Record<string, unknown>;
};

export type QaScore = {
  score: number;
  passed: boolean;
  benchmarks: Array<{ name: string; passed: boolean; detail: string }>;
};

export type PipelineResult = {
  ok: boolean;
  pipeline_id: string;
  stage: PipelineStage;
  brief: ClientBrief;
  assigned_agents: string[];
  agent_states: AgentState[];
  aggregated_output: Record<string, unknown>;
  qa: QaScore | null;
  approval: {
    status: "pending" | "approved" | "rejected" | "auto_approved";
    client_facing_output: string;
    ready_for_publish: boolean;
  } | null;
  started_at: string;
  finished_at: string;
  version: "6.0.0";
};

export type DiagnosticsFinding = {
  agent_id: string;
  ok: boolean;
  issues: string[];
  domain?: string;
  name?: string;
};

export type DiagnosticsReport = {
  ok: boolean;
  version: string;
  expected_agents: number;
  found_agents: number;
  orchestrator: string;
  findings: DiagnosticsFinding[];
  summary: string;
  timestamp: string;
};

export const FAOS_V6_VERSION = "6.0.0" as const;
export const EXPECTED_SHELL_AGENT_COUNT = 35;
export const ORCHESTRATOR_ID = "jarvis_core";
