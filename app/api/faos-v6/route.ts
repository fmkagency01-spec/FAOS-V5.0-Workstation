import { NextResponse } from "next/server";
import { withApiRoute, parseJsonBody } from "@/lib/api-handler";
import { auditAgentDefinitions, healthSnapshot } from "@/faos_core/orchestrator/health";
import { jarvisNetworkStatus, jarvisRoute } from "@/faos_core/orchestrator/jarvis-engine";
import { runClientTaskPipeline } from "@/faos_core/pipelines/client-task-pipeline";
import { llmConnectorStatus } from "@/faos_core/connectors/llm";
import { FAOS_V6_VERSION } from "@/faos_core/types";
import type { TaskCategory } from "@/faos_core/types";
import {
  activateAllAgentTeams,
  hermesOpsBrief,
} from "@/lib/hermes-cofounder";
import { runCodeEngineeringBridge } from "@/lib/code-engineering-bridge";
import { opsBusStatus, runJarvisOpsBus } from "@/lib/jarvis-ops-bus";
import { brainStatus } from "@/lib/jarvis-brain";
import { jarvisBrainTopologySummary } from "@/lib/jarvis-brain-hubs";

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
        hermes: hermesOpsBrief(),
        llm: llmConnectorStatus(),
      });
    }

    if (view === "health") {
      const snap = healthSnapshot();
      return NextResponse.json({
        ...snap,
        ok: snap.ok,
        hermes: hermesOpsBrief(),
      });
    }

    if (view === "hermes" || view === "ops") {
      return NextResponse.json({ ...opsBusStatus(), ok: true });
    }

    if (view === "brain" || view === "hubs") {
      return NextResponse.json({
        ok: true,
        version: FAOS_V6_VERSION,
        ...brainStatus(),
        topology: jarvisBrainTopologySummary(),
      });
    }

    return NextResponse.json({
      ...jarvisNetworkStatus(),
      ok: true,
      hermes: hermesOpsBrief(),
      brain: brainStatus(),
      endpoints: {
        GET: "?view=status|health|diagnostics|hermes|ops|brain|hubs",
        POST: "{ action: diagnostics|pipeline|route|activate|code|ops, ... }",
      },
    });
  },
  { rateLimitKey: "/api/faos-v6" }
);

type PostBody = {
  action?: "diagnostics" | "pipeline" | "route" | "activate" | "code" | "ops";
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
        hermes: hermesOpsBrief(),
        llm: llmConnectorStatus(),
      });
    }

    if (action === "activate") {
      const activation = activateAllAgentTeams(
        (body.details || body.input || "api_activate").slice(0, 120)
      );
      return NextResponse.json({
        ok: true,
        version: FAOS_V6_VERSION,
        activation,
        hermes: hermesOpsBrief(),
      });
    }

    if (action === "code") {
      const details = (body.details || body.input || "").trim();
      if (!details) {
        return NextResponse.json(
          { ok: false, error: "details or input required" },
          { status: 400 }
        );
      }
      const code = await runCodeEngineeringBridge({
        command: details,
        brand: body.brand || "FAOS",
        agent_ids: body.agent_ids,
      });
      return NextResponse.json({ ok: code.ok, version: FAOS_V6_VERSION, result: code });
    }

    if (action === "ops") {
      const details = (body.details || body.input || "").trim();
      if (!details) {
        return NextResponse.json(
          { ok: false, error: "details or input required" },
          { status: 400 }
        );
      }
      const ops = await runJarvisOpsBus(details, {
        brand: body.brand,
        auto_approve: body.auto_approve !== false,
        force_activate: false,
      });
      return NextResponse.json({ ok: ops.ok, version: FAOS_V6_VERSION, result: ops });
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
