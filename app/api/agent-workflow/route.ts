import { NextRequest, NextResponse } from "next/server";
import { chatWithOpenRouter } from "@/lib/openrouter";
import { routeQuery, suggestBrandAgent } from "@/lib/ai-router";
import {
  OpenRouterGuardError,
  resolveClientKeyFromHeaders,
} from "@/lib/openrouter-guard";
import { isTokenSavingMode } from "@/lib/token-saving";
import { fetchWorkflow } from "@/lib/workflow-api";
import { assignWorkflowLocal, listTasksLocal, updateTaskLocal } from "@/lib/workflow-store";
import type { AgentTask, AssignWorkflowPayload } from "@/lib/workflow-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function executeTaskWithAi(task: AgentTask, clientKey: string) {
  const route = routeQuery(task.command, isTokenSavingMode());
  const result = await chatWithOpenRouter(
    [
      {
        role: "user",
        content: `[Agent: ${task.agent_id}] [Task: ${route.taskType}]\n\n${task.command}`,
      },
    ],
    { clientKey, intent: route.intent, model: route.model, maxTokens: route.maxTokens }
  );

  return {
    ...result,
    route,
    deliverable: result.reply,
  };
}

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("project_id") || undefined;
  const path = projectId
    ? `agent-workflow/tasks?project_id=${encodeURIComponent(projectId)}`
    : "agent-workflow/tasks";
  const { data } = await fetchWorkflow<{ tasks: AgentTask[] }>(path);
  if (data?.tasks) {
    return NextResponse.json({ ok: true, source: "render", tasks: data.tasks });
  }
  return NextResponse.json({
    ok: true,
    source: "vercel-local",
    tasks: listTasksLocal(projectId),
    token_saving_mode: true,
  });
}

/** POST — assign workflow (enhanced with task_type + optional auto_execute) */
export async function POST(request: NextRequest) {
  const raw = await request.text();
  let body: AssignWorkflowPayload;
  try {
    body = JSON.parse(raw || "{}") as AssignWorkflowPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.command?.trim()) {
    return NextResponse.json({ error: "command is required" }, { status: 400 });
  }

  const route = routeQuery(body.command.trim(), isTokenSavingMode());
  const enriched = {
    ...body,
    task_type: body.task_type || route.taskType,
    agent_ids: body.agent_ids?.length
      ? body.agent_ids
      : [suggestBrandAgent(body.command)],
  };

  const enrichedRaw = JSON.stringify(enriched);
  const { data } = await fetchWorkflow<{
    project: unknown;
    tasks: AgentTask[];
    token_saving_mode?: boolean;
  }>("agent-workflow/assign", { method: "POST", body: enrichedRaw });

  let tasks: AgentTask[] = [];
  let source = "render";

  if (data?.project && data?.tasks) {
    tasks = data.tasks;
  } else {
    const local = assignWorkflowLocal(enriched);
    tasks = local.tasks.map((t) => ({
      ...t,
      task_type: enriched.task_type,
      selected_model: route.model,
      route_label: route.label,
    }));
    source = "vercel-local";
  }

  const clientKey = resolveClientKeyFromHeaders(request.headers);
  const executed: AgentTask[] = [];

  if (body.auto_execute !== false && tasks.length > 0) {
    for (const task of tasks.slice(0, 2)) {
      try {
        const run = await executeTaskWithAi(task, clientKey);
        const updated: AgentTask = {
          ...task,
          status: "done",
          task_type: enriched.task_type,
          selected_model: run.model,
          route_label: run.route.label,
          result_summary: run.reply.slice(0, 500),
          deliverable: run.deliverable,
          updated_at: new Date().toISOString(),
        };
        executed.push(updated);
        updateTaskLocal(updated);
      } catch (e) {
        executed.push({
          ...task,
          status: e instanceof OpenRouterGuardError ? "blocked" : "failed",
          result_summary: e instanceof Error ? e.message : "Execution failed",
          updated_at: new Date().toISOString(),
        });
      }
    }
  }

  return NextResponse.json({
    ok: true,
    source,
    route: {
      intent: route.intent,
      model: route.model,
      label: route.label,
      task_type: enriched.task_type,
    },
    tasks: executed.length ? executed : tasks,
    token_saving_mode: true,
    message:
      executed.length > 0
        ? `Delivered via ${route.label} — token-saving single-shot.`
        : "Agents queued — run Execute on task queue to deliver.",
  });
}

/** PATCH — execute a queued task by id */
export async function PATCH(request: NextRequest) {
  let body: { task_id?: string };
  try {
    body = (await request.json()) as { task_id?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const taskId = body.task_id?.trim();
  if (!taskId) {
    return NextResponse.json({ error: "task_id is required" }, { status: 400 });
  }

  const allTasks = listTasksLocal();
  const task = allTasks.find((t) => t.id === taskId);
  if (!task) {
    return NextResponse.json({ error: "Task not found in local queue" }, { status: 404 });
  }

  const clientKey = resolveClientKeyFromHeaders(request.headers);
  try {
    const run = await executeTaskWithAi(task, clientKey);
    const updated: AgentTask = {
      ...task,
      status: "done",
      selected_model: run.model,
      route_label: run.route.label,
      task_type: run.route.taskType,
      result_summary: run.reply.slice(0, 500),
      deliverable: run.deliverable,
      updated_at: new Date().toISOString(),
    };
    updateTaskLocal(updated);
    return NextResponse.json({ ok: true, task: updated, usage: run.usage });
  } catch (e) {
    if (e instanceof OpenRouterGuardError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 429 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Execution failed" },
      { status: 502 }
    );
  }
}
