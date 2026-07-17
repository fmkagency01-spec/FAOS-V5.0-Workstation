import { NextRequest, NextResponse } from "next/server";
import { fetchWorkflow } from "@/lib/workflow-api";
import { assignWorkflowLocal, listTasksLocal } from "@/lib/workflow-store";
import type { AssignWorkflowPayload } from "@/lib/workflow-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("project_id") || undefined;
  const path = projectId
    ? `agent-workflow/tasks?project_id=${encodeURIComponent(projectId)}`
    : "agent-workflow/tasks";
  const { data } = await fetchWorkflow<{ tasks: unknown[] }>(path);
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

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const { data } = await fetchWorkflow<{
    project: unknown;
    tasks: unknown[];
    token_saving_mode?: boolean;
  }>("agent-workflow/assign", { method: "POST", body: raw });

  if (data?.project && data?.tasks) {
    return NextResponse.json({
      ok: true,
      source: "render",
      project: data.project,
      tasks: data.tasks,
      token_saving_mode: true,
      message: "Agents queued in token-saving mode — no auto-retry loops.",
    });
  }

  let body: AssignWorkflowPayload;
  try {
    body = JSON.parse(raw || "{}") as AssignWorkflowPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.command?.trim()) {
    return NextResponse.json({ error: "command is required" }, { status: 400 });
  }

  const result = assignWorkflowLocal(body);
  return NextResponse.json({
    ok: true,
    source: "vercel-local",
    ...result,
    token_saving_mode: true,
    message: "Agents queued locally — syncs to Render when backend is online.",
  });
}
