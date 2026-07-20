import { withApiRoute } from "@/lib/api-handler";
import { ApiError } from "@/lib/api-errors";
import { jsonOk } from "@/lib/api-response";
import { buildTacSyncStatus, getTacEcosystem } from "@/lib/tac-ecosystem";
import {
  emitIntelligenceEventLocal,
  listIntelligenceLogsLocal,
} from "@/lib/tac-events";
import { fetchWorkflow } from "@/lib/workflow-api";
import { getFaosBackendBaseUrl } from "@/lib/backend";
import { parseJsonWithSchema } from "@/lib/validation/parse";
import { z } from "zod";
import { tacIntelligenceEmitSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const tacActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("sync") }),
  z.object({
    action: z.literal("dispatch"),
    command: z.string().trim().min(1).max(2000),
    pillar_id: z.string().trim().max(40).optional(),
  }),
  z.object({
    action: z.literal("intelligence"),
    event_type: z.string().trim().min(1).max(80).optional(),
    pillar_id: z.string().trim().max(40).optional(),
    payload: z.record(z.string(), z.unknown()).optional(),
    message: z.string().trim().max(2000).optional(),
    actions: z.array(z.string()).max(5).optional(),
  }),
]);

export const GET = withApiRoute(async (request) => {
  const url = new URL(request.url);
  const view = url.searchParams.get("view");

  if (view === "intelligence") {
    const limit = Number(url.searchParams.get("limit") || "50");
    const { data } = await fetchWorkflow<{ logs: unknown[] }>(
      `tac/intelligence?limit=${Math.max(1, Math.min(limit, 200))}`
    );
    if (data?.logs) return jsonOk({ source: "render", logs: data.logs });
    return jsonOk({
      source: "vercel-local",
      logs: listIntelligenceLogsLocal(limit),
    });
  }

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
  const intelligence = listIntelligenceLogsLocal(10);

  return jsonOk({
    source: renderData ? "render" : "vercel-local",
    ...local,
    ecosystem: eco,
    render: renderData,
    intelligence_preview: intelligence,
  });
}, { skipRateLimit: false });

export const POST = withApiRoute(async (request) => {
  const body = await parseJsonWithSchema(request, tacActionSchema);
  const action = body.action;

  if (action === "sync") {
    const { data } = await fetchWorkflow<{ message?: string; synced_at?: string }>(
      "tac/sync",
      { method: "POST", body: "{}" }
    );
    if (data) return jsonOk({ source: "render", ...data });
    return jsonOk({
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
    if (data) return jsonOk({ source: "render", ...data });
    return jsonOk({
      source: "vercel-local",
      message: `TAC queued: ${body.command}`,
      pillar_id: body.pillar_id || "create",
    });
  }

  if (action === "intelligence") {
    const payload = tacIntelligenceEmitSchema.parse({
      event_type: body.event_type,
      pillar_id: body.pillar_id,
      payload: body.payload,
      message: body.message,
      actions: body.actions,
    });
    const { data } = await fetchWorkflow<{ log: unknown }>("tac/intelligence", {
      method: "POST",
      body: JSON.stringify({
        event_type: payload.event_type,
        pillar_id: payload.pillar_id,
        payload: {
          ...(payload.payload || {}),
          message: payload.message,
          actions: payload.actions,
        },
      }),
    });
    if (data?.log) return jsonOk({ source: "render", log: data.log }, 201);

    const log = await emitIntelligenceEventLocal(
      payload.event_type,
      {
        ...(payload.payload || {}),
        message: payload.message,
        actions: payload.actions,
      },
      payload.pillar_id
    );
    return jsonOk({ source: "vercel-local", log }, 201);
  }

  throw ApiError.badRequest("Unknown TAC action.");
});
