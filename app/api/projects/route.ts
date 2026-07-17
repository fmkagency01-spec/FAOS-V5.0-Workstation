import { NextRequest, NextResponse } from "next/server";
import { fetchWorkflow } from "@/lib/workflow-api";
import { createProjectLocal, listProjectsLocal } from "@/lib/workflow-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get("client_id") || undefined;
  const path = clientId ? `projects?client_id=${encodeURIComponent(clientId)}` : "projects";
  const { data } = await fetchWorkflow<{ projects: unknown[] }>(path);
  if (data?.projects) {
    return NextResponse.json({ ok: true, source: "render", projects: data.projects });
  }
  return NextResponse.json({
    ok: true,
    source: "vercel-local",
    projects: listProjectsLocal(clientId),
  });
}

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const { data } = await fetchWorkflow<{ project: unknown }>("projects", {
    method: "POST",
    body: raw,
  });
  if (data?.project) {
    return NextResponse.json({ ok: true, source: "render", project: data.project });
  }
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(raw || "{}") as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const project = createProjectLocal({
    client_id: typeof body.client_id === "string" ? body.client_id : undefined,
    name: typeof body.name === "string" ? body.name : undefined,
    command_brief: typeof body.command_brief === "string" ? body.command_brief : undefined,
    priority: body.priority as "low" | "normal" | "high" | undefined,
    assigned_agents: Array.isArray(body.assigned_agents)
      ? (body.assigned_agents as string[])
      : undefined,
  });
  return NextResponse.json({ ok: true, source: "vercel-local", project });
}
