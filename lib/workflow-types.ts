export type ClientRecord = {
  id: string;
  name: string;
  industry?: string;
  contact_email?: string;
  notes?: string;
  assigned_agent?: string;
  created_at: string;
  updated_at: string;
};

export type ProjectRecord = {
  id: string;
  client_id: string;
  name: string;
  status: "draft" | "active" | "paused" | "completed";
  priority: "low" | "normal" | "high";
  command_brief: string;
  assigned_agents: string[];
  created_at: string;
  updated_at: string;
};

export type AgentTask = {
  id: string;
  project_id: string;
  client_id: string;
  agent_id: string;
  command: string;
  status: "queued" | "running" | "done" | "failed" | "blocked";
  token_saving_mode: boolean;
  result_summary?: string;
  created_at: string;
  updated_at: string;
};

export type AssignWorkflowPayload = {
  client_id?: string;
  project_id?: string;
  command: string;
  agent_ids?: string[];
  priority?: ProjectRecord["priority"];
};
