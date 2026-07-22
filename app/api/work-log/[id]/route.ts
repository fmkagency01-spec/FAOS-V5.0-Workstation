import { withApiRoute } from "@/lib/api-handler";
import { ApiError } from "@/lib/api-errors";
import { jsonOk } from "@/lib/api-response";
import { fetchWorkflow } from "@/lib/workflow-api";
import {
  deleteWorkLogLocal,
  getWorkLogLocal,
  updateWorkLogLocal,
} from "@/lib/work-log-store";
import { parseJsonWithSchema } from "@/lib/validation/parse";
import { workLogUpdateSchema } from "@/lib/validation/schemas";
import type { DailyWorkLog } from "@/lib/work-log-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApiRoute(async (_request, ctx) => {
  const id = ctx.params.id;
  if (!id) throw ApiError.badRequest("Missing work log id");

  const { data } = await fetchWorkflow<{ work_log?: DailyWorkLog; log?: DailyWorkLog }>(
    `work-logs/${encodeURIComponent(id)}`
  );
  const upstream = data?.work_log || data?.log;
  if (upstream) return jsonOk({ source: "render", log: upstream });

  const log = getWorkLogLocal(id);
  if (!log) throw ApiError.notFound("Work log not found");
  return jsonOk({ source: "vercel-local", log });
});

export const PATCH = withApiRoute(async (request, ctx) => {
  const id = ctx.params.id;
  if (!id) throw ApiError.badRequest("Missing work log id");
  const body = await parseJsonWithSchema(request, workLogUpdateSchema);

  const { data } = await fetchWorkflow<{ work_log?: DailyWorkLog; log?: DailyWorkLog }>(
    `work-logs/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify(body) }
  );
  const upstream = data?.work_log || data?.log;
  if (upstream) return jsonOk({ source: "render", log: upstream });

  const log = updateWorkLogLocal(id, body);
  if (!log) throw ApiError.notFound("Work log not found");
  return jsonOk({ source: "vercel-local", log });
});

export const DELETE = withApiRoute(async (_request, ctx) => {
  const id = ctx.params.id;
  if (!id) throw ApiError.badRequest("Missing work log id");

  const { data, upstream } = await fetchWorkflow<{ ok?: boolean; deleted?: string }>(
    `work-logs/${encodeURIComponent(id)}`,
    { method: "DELETE" }
  );
  if (data?.deleted || data?.ok) {
    return jsonOk({ source: "render", deleted: id });
  }

  const ok = deleteWorkLogLocal(id);
  if (!ok && !upstream) throw ApiError.notFound("Work log not found");
  if (!ok) throw ApiError.notFound("Work log not found");
  return jsonOk({ source: "vercel-local", deleted: id });
});
