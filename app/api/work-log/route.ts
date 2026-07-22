import { withApiRoute } from "@/lib/api-handler";
import { jsonOk } from "@/lib/api-response";
import { fetchWorkflow } from "@/lib/workflow-api";
import { getSessionFromRequest } from "@/lib/auth";
import {
  createWorkLogLocal,
  listWorkLogsLocal,
  todayIsoDate,
  workLogStatsLocal,
} from "@/lib/work-log-store";
import { listTasksLocal } from "@/lib/workflow-store";
import { parseJsonWithSchema } from "@/lib/validation/parse";
import { workLogCreateSchema } from "@/lib/validation/schemas";
import type { DailyWorkLog, ProjectHealth } from "@/lib/work-log-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApiRoute(async (request) => {
  const url = new URL(request.url);
  const date = url.searchParams.get("date") || undefined;
  const member = url.searchParams.get("member") || undefined;
  const health = url.searchParams.get("health") as ProjectHealth | null;
  const includeActivity = url.searchParams.get("activity") !== "0";

  const { data, upstream } = await fetchWorkflow<{
    ok?: boolean;
    logs?: DailyWorkLog[];
    stats?: ReturnType<typeof workLogStatsLocal>;
  }>(
    `work-logs${date ? `?date=${encodeURIComponent(date)}` : ""}`
  );

  if (data?.logs) {
    let logs = data.logs;
    if (member) {
      const q = member.toLowerCase();
      logs = logs.filter(
        (l) =>
          l.member_name.toLowerCase().includes(q) ||
          (l.submitted_by || "").toLowerCase().includes(q)
      );
    }
    if (health) {
      logs = logs.filter((l) => l.project_health === health);
    }
    const stats =
      data.stats ||
      workLogStatsLocal(date || todayIsoDate());
    const agent_activity = includeActivity
      ? listTasksLocal().slice(0, 25)
      : undefined;
    return jsonOk({
      source: "render",
      logs,
      stats,
      agent_activity,
      today: date || todayIsoDate(),
    });
  }

  const logs = listWorkLogsLocal({
    date,
    member,
    health: health || undefined,
  });
  const stats = workLogStatsLocal(date || todayIsoDate());
  const agent_activity = includeActivity
    ? listTasksLocal().slice(0, 25)
    : undefined;

  return jsonOk({
    source: upstream ? "vercel-local-fallback" : "vercel-local",
    logs,
    stats,
    agent_activity,
    today: date || todayIsoDate(),
  });
});

export const POST = withApiRoute(async (request) => {
  const body = await parseJsonWithSchema(request, workLogCreateSchema);
  const session = await getSessionFromRequest(request);

  const payload = {
    ...body,
    submitted_by:
      body.submitted_by ||
      session?.username ||
      session?.name ||
      undefined,
    member_name: body.member_name || session?.name || "Team member",
    member_role: body.member_role || session?.role || "Team",
  };

  const { data, upstream, error } = await fetchWorkflow<{
    work_log?: DailyWorkLog;
    log?: DailyWorkLog;
  }>("work-logs", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const upstreamLog = data?.work_log || data?.log;
  if (upstreamLog) {
    return jsonOk({ source: "render", log: upstreamLog }, 201);
  }
  if (upstream && error && !error.includes("404") && !error.includes("Not Found")) {
    // Soft-fallback on asleep/missing routes; only hard-fail unexpected upstream errors
    // when we explicitly cannot create locally — always prefer staying online.
  }

  const log = createWorkLogLocal(payload);
  return jsonOk({ source: "vercel-local", log }, 201);
});
