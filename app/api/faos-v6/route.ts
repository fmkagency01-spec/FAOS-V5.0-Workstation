import { NextResponse } from "next/server";
import { withApiRoute, parseJsonBody } from "@/lib/api-handler";
import { auditAgentDefinitions, healthSnapshot } from "@/faos_core/orchestrator/health";
import { jarvisNetworkStatus, jarvisRoute } from "@/faos_core/orchestrator/jarvis-engine";
import { runClientTaskPipeline } from "@/faos_core/pipelines/client-task-pipeline";
import { llmConnectorStatus } from "@/faos_core/connectors/llm";
import { FAOS_V6_VERSION } from "@/faos_core/types";
import type { TaskCategory } from "@/faos_core/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApiRoute(
  async (request) => {
    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view") || "status";

    if (view === "diagnostics") {
      return NextResponse.json({
        ok: true,
        version: FAOS_V6_VERSION,
        diagnostics: auditAgentDefinitions(),
        llm: llmConnectorStatus(),
      });
    }

    if (view === "health") {
      const snap = healthSnapshot();
      return NextResponse.json({ ...snap, ok: snap.ok });
    }

    return NextResponse.json({
      ...jarvisNetworkStatus(),
      ok: true,
      endpoints: {
        GET: "?view=status|health|diagnostics",
        POST: "{ action: diagnostics|pipeline|route, ... }",
      },
    });
  },
  { rateLimitKey: "/api/faos-v6" }
);

type PostBody = {
  action?: "diagnostics" | "pipeline" | "route";
  details?: string;
  title?: string;
  brand?: string;
  category?: TaskCategory;
  agent_ids?: string[];
  mode?: "auto" | "chat" | "pipeline" | "graph";
  auto_approve?: boolean;
  input?: string;
};

export const POST = withApiRoute(
  async (request) => {
    const body = await parseJsonBody<PostBody>(request);
    const action = body.action || "route";

    if (action === "diagnostics") {
      const report = auditAgentDefinitions();
      return NextResponse.json({
        ok: report.ok,
        version: FAOS_V6_VERSION,
        diagnostics: report,
        llm: llmConnectorStatus(),
      });
    }

    if (action === "pipeline") {
      const details = (body.details || body.input || "").trim();
      if (!details) {
        return NextResponse.json(
          { ok: false, error: "details or input required" },
          { status: 400 }
        );
      }
      const result = await runClientTaskPipeline(
        {
          details,
          title: body.title,
          brand: body.brand,
          category: body.category,
          agent_ids: body.agent_ids,
        },
        { auto_approve: body.auto_approve !== false, brand: body.brand }
      );
      return NextResponse.json({ ok: result.ok, version: FAOS_V6_VERSION, result });
    }

    // default: jarvis route
    const input = (body.input || body.details || "").trim();
    if (!input) {
      return NextResponse.json(
        { ok: false, error: "input or details required" },
        { status: 400 }
      );
    }

    const routed = await jarvisRoute(input, {
      clientKey: "faos-v6-api",
      mode: body.mode || "auto",
      agent_ids: body.agent_ids,
      brand: body.brand,
      auto_approve: body.auto_approve !== false,
    });

    return NextResponse.json({ ok: true, version: FAOS_V6_VERSION, result: routed });
  },
  { rateLimitKey: "/api/faos-v6" }
);
