import { NextRequest, NextResponse } from "next/server";
import { buildTacSyncStatus, getTacEcosystem } from "@/lib/tac-ecosystem";
import { fetchWorkflow } from "@/lib/workflow-api";
import { getFaosBackendBaseUrl } from "@/lib/backend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const base = getFaosBackendBaseUrl();
  let backendOnline = false;
  let renderData: Record<string, unknown> | null = null;

  if (base) {
    const { data } = await fetchWorkflow<Record<string, unknown>>("tac/status");
    if (data) {
      backendOnline = true;
      renderData = data;
    }
  }

  const local = buildTacSyncStatus(backendOnline);
  const eco = getTacEcosystem();

  return NextResponse.json({
    ok: true,
    source: renderData ? "render" : "vercel-local",
    ...local,
    ecosystem: eco,
    render: renderData,
  });
}

export async function POST(request: NextRequest) {
  const raw = await request.text();
  let body: { action?: string; command?: string; pillar_id?: string };
  try {
    body = JSON.parse(raw || "{}") as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = body.action || "sync";

  if (action === "sync") {
    const { data } = await fetchWorkflow<{ message?: string; synced_at?: string }>("tac/sync", {
      method: "POST",
      body: "{}",
    });
    if (data) {
      return NextResponse.json({ ok: true, source: "render", ...data });
    }
    return NextResponse.json({
      ok: true,
      source: "vercel-local",
      message: "TAC pillars synced locally",
      synced_at: new Date().toISOString(),
      pillars: 3,
    });
  }

  if (action === "dispatch") {
    const { data } = await fetchWorkflow<Record<string, unknown>>("tac/dispatch", {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (data) {
      return NextResponse.json({ ok: true, source: "render", ...data });
    }
    if (!body.command?.trim()) {
      return NextResponse.json({ error: "command required" }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      source: "vercel-local",
      message: `TAC queued: ${body.command}`,
      pillar_id: body.pillar_id || "create",
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
