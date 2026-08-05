/**
 * FAOS v6.0 — Core barrel exports
 */

export {
  FAOS_V6_VERSION,
  EXPECTED_SHELL_AGENT_COUNT,
  ORCHESTRATOR_ID,
  HERMES_COFOUNDER_ID,
  type AgentState,
  type AgentStatus,
  type ClientBrief,
  type DiagnosticsReport,
  type PipelineResult,
  type TaskCategory,
} from "@/faos_core/types";

export {
  listAgents,
  getAgent,
  getOrchestratorId,
  matchAgents,
  ensureAgentStates,
  getAgentState,
  setAgentState,
  registryStats,
} from "@/faos_core/orchestrator/agent-registry";

export { auditAgentDefinitions, healthSnapshot } from "@/faos_core/orchestrator/health";
export { jarvisRoute, jarvisNetworkStatus } from "@/faos_core/orchestrator/jarvis-engine";

export { runAgentModule } from "@/faos_core/agents/base-agent";
export {
  buildExecutionGraph,
  executeAgentGraph,
} from "@/faos_core/agents/execution-graph";
export {
  getAgentModules,
  getAgentModule,
  agentsByLane,
  marketingStrategyAgents,
  techContentAgents,
  rosterSummary,
} from "@/faos_core/agents/roster";

export { ingestClientBrief, detectTaskCategory } from "@/faos_core/pipelines/ingestion";
export { evaluateDeliverable } from "@/faos_core/pipelines/qa";
export { runApprovalGate, formatClientFacingOutput } from "@/faos_core/pipelines/approval";
export { runClientTaskPipeline } from "@/faos_core/pipelines/client-task-pipeline";

export { callUnifiedLlm, llmConnectorStatus } from "@/faos_core/connectors/llm";
export { deliverWebhook } from "@/faos_core/connectors/webhooks";
