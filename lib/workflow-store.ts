import type {
  AgentTask,
  AssignWorkflowPayload,
  ClientRecord,
  ProjectRecord,
  TaskType,
} from "@/lib/workflow-types";
import { routeQuery, suggestBrandAgent } from "@/lib/ai-router";

/** Vercel-local fallback store when Render is unavailable (resets on cold start) */
const clients = new Map<string, ClientRecord>();
const projects = new Map<string, ProjectRecord>();
const tasks = new Map<string, AgentTask>();

function now() {
  return new Date().toISOString();
}

function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function listClientsLocal(): ClientRecord[] {
  return [...clients.values()].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export function getClientLocal(id: string): ClientRecord | null {
  return clients.get(id) || null;
}

export function updateClientLocal(id: string, input: Partial<ClientRecord>): ClientRecord | null {
  const row = clients.get(id);
  if (!row) return null;
  Object.assign(row, input, { id, updated_at: now() });
  clients.set(id, row);
  return row;
}

export function deleteClientLocal(id: string): boolean {
  return clients.delete(id);
}

export function createClientLocal(input: Partial<ClientRecord>): ClientRecord {
  const ts = now();
  const record: ClientRecord = {
    id: uid("client"),
    name: input.name?.trim() || "Unnamed Client",
    industry: input.industry?.trim(),
    contact_email: input.contact_email?.trim(),
    notes: input.notes?.trim(),
    assigned_agent: input.assigned_agent?.trim() || "fmk_wig_prosthetic_hair_agent",
    created_at: ts,
    updated_at: ts,
  };
  clients.set(record.id, record);
  return record;
}

export function listProjectsLocal(clientId?: string): ProjectRecord[] {
  const all = [...projects.values()];
  return (clientId ? all.filter((p) => p.client_id === clientId) : all).sort(
    (a, b) => b.updated_at.localeCompare(a.updated_at)
  );
}

export function getProjectLocal(id: string): ProjectRecord | null {
  return projects.get(id) || null;
}

export function updateProjectLocal(id: string, input: Partial<ProjectRecord>): ProjectRecord | null {
  const row = projects.get(id);
  if (!row) return null;
  Object.assign(row, input, { id, updated_at: now() });
  projects.set(id, row);
  return row;
}

export function deleteProjectLocal(id: string): boolean {
  return projects.delete(id);
}

export function createProjectLocal(input: Partial<ProjectRecord>): ProjectRecord {
  const ts = now();
  const record: ProjectRecord = {
    id: uid("project"),
    client_id: input.client_id || "",
    name: input.name?.trim() || "New Project",
    status: input.status || "active",
    priority: input.priority || "normal",
    command_brief: input.command_brief?.trim() || "",
    assigned_agents: input.assigned_agents?.length
      ? input.assigned_agents
      : ["fmk_wig_prosthetic_hair_agent"],
    created_at: ts,
    updated_at: ts,
  };
  projects.set(record.id, record);
  return record;
}

export function listTasksLocal(projectId?: string): AgentTask[] {
  const all = [...tasks.values()];
  return (projectId ? all.filter((t) => t.project_id === projectId) : all).sort(
    (a, b) => b.updated_at.localeCompare(a.updated_at)
  );
}

export function updateTaskLocal(task: AgentTask): AgentTask {
  tasks.set(task.id, task);
  return task;
}

export function assignWorkflowLocal(payload: AssignWorkflowPayload): {
  project: ProjectRecord;
  tasks: AgentTask[];
} {
  const route = routeQuery(payload.command, true);
  const taskType: TaskType = payload.task_type || route.taskType;
  let clientId = payload.client_id;
  if (!clientId) {
    const c = createClientLocal({ name: "Auto Client", assigned_agent: payload.agent_ids?.[0] });
    clientId = c.id;
  }

  let project: ProjectRecord;
  if (payload.project_id && projects.has(payload.project_id)) {
    project = { ...projects.get(payload.project_id)! };
    project.command_brief = payload.command;
    project.updated_at = now();
    projects.set(project.id, project);
  } else {
    project = createProjectLocal({
      client_id: clientId,
      name: `Assignment ${new Date().toLocaleDateString()}`,
      command_brief: payload.command,
      priority: payload.priority,
      assigned_agents: payload.agent_ids,
    });
  }

  const agentIds = payload.agent_ids?.length
    ? payload.agent_ids
    : [suggestBrandAgent(payload.command)];

  const createdTasks: AgentTask[] = agentIds.map((agent_id) => {
    const ts = now();
    const task: AgentTask = {
      id: uid("task"),
      project_id: project.id,
      client_id: clientId!,
      agent_id,
      command: payload.command,
      status: "queued",
      token_saving_mode: true,
      task_type: taskType,
      selected_model: route.model,
      route_label: route.label,
      created_at: ts,
      updated_at: ts,
    };
    tasks.set(task.id, task);
    return task;
  });

  return { project, tasks: createdTasks };
}
