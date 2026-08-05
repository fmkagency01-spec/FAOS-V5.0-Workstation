import { NextRequest, NextResponse } from "next/server";
import { executeJarvisPlan, planJarvisCommand, type JarvisAction } from "@/lib/jarvis-orchestrator";
import { OpenRouterGuardError, resolveClientKeyFromHeaders } from "@/lib/openrouter-guard";
import { getAllShellAgents } from "@/lib/shell-agents";
import { fetchWorkflow } from "@/lib/workflow-api";
import {
  createInvoiceLocal,
  createInventoryLocal,
  createEmployeeLocal,
} from "@/lib/erp-store";
import { assignWorkflowLocal } from "@/lib/workflow-store";
import { generateImage, generateVideoPlan } from "@/lib/media-generation";
import { isTokenSavingMode } from "@/lib/token-saving";
import {
  summarizeAttachmentsForPrompt,
  type PipelineAttachment,
} from "@/lib/attachment-pipeline";
import { getSessionFromRequest } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/rbac-guards";
import {
  appendChatMessages,
  createChatSession,
  getActiveSessionForUser,
  getChatSession,
} from "@/lib/jarvis-chat-store";
import { ingestToAigorithm } from "@/lib/aigorithm-ingest";
import { runCodeEngineeringBridge } from "@/lib/code-engineering-bridge";
import {
  activateAllAgentTeams,
  hermesOpsBrief,
  hermesReviewCommand,
} from "@/lib/hermes-cofounder";
import { runClientTaskPipeline } from "@/faos_core/pipelines/client-task-pipeline";
import { runClientHuntingPipeline } from "@/faos_core/pipelines/client-hunting-pipeline";
import { FAOS_V6_VERSION } from "@/faos_core/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** JARVIS interactive path — never wait long for a sleeping Render free tier. */
const JARVIS_UPSTREAM_MS = 4000;

async function executeJarvisAction(action: JarvisAction): Promise<{ label: string; result: unknown } | null> {
  switch (action.type) {
    case "create_invoice": {
      const p = action.payload;
      const { data } = await fetchWorkflow<{ invoice: unknown }>("invoices", {
        method: "POST",
        body: JSON.stringify(p),
        timeoutMs: JARVIS_UPSTREAM_MS,
      });
      const invoice = data?.invoice || createInvoiceLocal(p as Parameters<typeof createInvoiceLocal>[0]);
      return { label: `Invoice created: ${(invoice as { invoice_number?: string }).invoice_number}`, result: invoice };
    }
    case "add_inventory": {
      const p = action.payload;
      const { data } = await fetchWorkflow<{ item: unknown }>("inventory", {
        method: "POST",
        body: JSON.stringify(p),
        timeoutMs: JARVIS_UPSTREAM_MS,
      });
      const item = data?.item || createInventoryLocal(p as Parameters<typeof createInventoryLocal>[0]);
      return { label: `Stock item added: ${(item as { sku?: string }).sku}`, result: item };
    }
    case "add_employee": {
      const p = action.payload;
      const { data } = await fetchWorkflow<{ employee: unknown }>("employees", {
        method: "POST",
        body: JSON.stringify(p),
        timeoutMs: JARVIS_UPSTREAM_MS,
      });
      const employee = data?.employee || createEmployeeLocal(p as Parameters<typeof createEmployeeLocal>[0]);
      return { label: `Employee added: ${(employee as { name?: string }).name}`, result: employee };
    }
    case "assign_agents": {
      const { data } = await fetchWorkflow<{ tasks: unknown[]; project?: unknown }>(
        "agent-workflow/assign",
        {
          method: "POST",
          body: JSON.stringify({ ...action.payload, auto_execute: false }),
          timeoutMs: JARVIS_UPSTREAM_MS,
        }
      );
      if (data?.tasks) {
        return {
          label: `Agents queued: ${action.payload.agent_ids.join(", ")}`,
          result: data,
        };
      }
      const local = assignWorkflowLocal({
        command: action.payload.command,
        agent_ids: action.payload.agent_ids,
        auto_execute: false,
      });
      return {
        label: `Agents queued locally: ${action.payload.agent_ids.join(", ")}`,
        result: local,
      };
    }
    case "generate_image": {
      const img = await generateImage(action.payload.prompt);
      return { label: "Image generation complete", result: img };
    }
    case "generate_video_plan": {
      const vid = await generateVideoPlan(action.payload.brief);
      return { label: "Video plan generated", result: vid };
    }
    case "code_engineering": {
      const code = await runCodeEngineeringBridge({
        command: action.payload.command,
        mode: action.payload.mode,
        brand: "FAOS",
      });
      return { label: code.summary, result: code };
    }
    case "activate_fleet": {
      const activation = activateAllAgentTeams(action.payload.reason);
      const brief = hermesOpsBrief();
      return {
        label: `Hermes activated ${activation.activated} agents`,
        result: { activation, brief },
      };
    }
    case "run_pipeline": {
      const pipeline = await runClientTaskPipeline(
        {
          details: action.payload.details,
          brand: action.payload.brand || "BulletsEye",
        },
        { auto_approve: true, brand: action.payload.brand }
      );
      return {
        label: `Pipeline ${pipeline.pipeline_id} · ${pipeline.stage} · QA ${pipeline.qa?.score ?? "—"}`,
        result: pipeline,
      };
    }
    case "client_hunting": {
      const hunt = await runClientHuntingPipeline({
        brand: action.payload.brand,
        brief: action.payload.brief,
        limit: action.payload.limit,
      });
      return {
        label: `Client hunting ${hunt.status} · ${hunt.brand} · ${hunt.prospects_targeted.length} prospects · ${hunt.content_assets.length} assets`,
        result: hunt,
      };
    }
    default:
      return null;
  }
}

export async function GET() {
  const brief = hermesOpsBrief();
  return NextResponse.json({
    ok: true,
    version: FAOS_V6_VERSION,
    name: "JARVIS Orchestrator v6",
    shell_agents: getAllShellAgents().length,
    hermes_cofounder: brief,
    agents: getAllShellAgents().map((a) => ({
      id: a.id,
      name: a.name,
      domain: a.domain,
      icon: a.icon,
    })),
    token_saving_mode: isTokenSavingMode(),
    capabilities: [
      "voice",
      "chat",
      "erp",
      "creative",
      "video",
      "multi-agent",
      "multimodal",
      "tts",
      "hermes_cofounder",
      "code_engineering_bridge",
      "client_pipeline",
      "fleet_activation",
      "chat_history",
    ],
  });
}

export async function POST(request: NextRequest) {
  let body: {
    command?: string;
    voice?: boolean;
    attachments?: PipelineAttachment[];
    tts_requested?: boolean;
    session_id?: string;
  };
  try {
    body = (await request.json()) as {
      command?: string;
      voice?: boolean;
      attachments?: PipelineAttachment[];
      tts_requested?: boolean;
      session_id?: string;
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const summarized = summarizeAttachmentsForPrompt(body.attachments);
  const command = `${body.command?.trim() || ""}${summarized.contextBlock}`.trim();
  if (!command) {
    return NextResponse.json({ error: "command is required" }, { status: 400 });
  }

  const hermes = hermesReviewCommand(command);
  const plan = planJarvisCommand(command);
  // Inject Hermes co-founder oversight into the LLM system context
  plan.system_context = `${plan.system_context}\n\n${hermes.context_block}`;
  const clientKey = resolveClientKeyFromHeaders(request.headers);
  const session = await getSessionFromRequest(request);

  try {
    const result = await executeJarvisPlan(plan, clientKey, executeJarvisAction);

    let chatSessionId: string | undefined;
    // Persist turns for Super Admin (owner/executive) — never store for team/client roles.
    // Never let history I/O fail the live reply (Vercel /tmp + memory fallback).
    if (session && isSuperAdmin(session.role)) {
      try {
        const requested =
          body.session_id && body.session_id !== "ephemeral"
            ? getChatSession(body.session_id)
            : null;
        let chat =
          requested ||
          getActiveSessionForUser(session.username) ||
          createChatSession({
            user_id: session.username,
            username: session.username,
            user_name: session.name,
            source: "jarvis",
          });
        const meta = [
          result.primary_agent ? `${result.primary_agent.icon} ${result.primary_agent.name}` : "",
          plan.route.label,
          result.action_taken,
          "Hermes Co-Founder",
        ]
          .filter(Boolean)
          .join(" · ");
        chat =
          appendChatMessages(chat.id, [
            {
              role: "user",
              text: body.command?.trim() || command,
              meta: body.voice ? "voice" : undefined,
            },
            { role: "jarvis", text: result.reply, meta },
          ]) || chat;
        chatSessionId = chat.id;
      } catch (persistErr) {
        console.warn(
          "JARVIS chat persist skipped:",
          persistErr instanceof Error ? persistErr.message : persistErr
        );
      }

      // Aigorithm: autocorrect + save voice/business commands to core memory (non-blocking)
      void ingestToAigorithm({
        text: body.command?.trim() || command,
        source: body.voice ? "voice" : "jarvis",
        use_llm: false,
        mirror_learning_hub: true,
        tags: ["jarvis", "hermes", plan.route.intent, plan.action.type],
      }).catch((ingestErr) => {
        console.warn(
          "Aigorithm ingest skipped:",
          ingestErr instanceof Error ? ingestErr.message : ingestErr
        );
      });
    }

    return NextResponse.json({
      ok: true,
      version: FAOS_V6_VERSION,
      reply: result.reply,
      model: result.model,
      intent: result.intent,
      voice_mode: Boolean(body.voice),
      tts_requested: Boolean(body.tts_requested),
      attachments_received: summarized.count,
      attachments: summarized.leanAttachments,
      primary_agent: {
        id: result.primary_agent.id,
        name: result.primary_agent.name,
        icon: result.primary_agent.icon,
      },
      agents_dispatched: Array.from(
        new Set([...result.agents_dispatched, "hermes_cofounder_agent"])
      ),
      route_label: plan.route.label,
      action_taken: result.action_taken,
      action_result: result.action_result ?? null,
      hermes: {
        ok: hermes.brief.ok,
        summary: hermes.brief.summary,
        agents_active: hermes.brief.agents_active,
        prefer_code_bridge: hermes.prefer_code_bridge,
        prefer_pipeline: hermes.prefer_pipeline,
      },
      connectivity: result.connectivity || plan.connectivity,
      usage: result.usage ?? null,
      session_id: chatSessionId,
    });
  } catch (err) {
    if (err instanceof OpenRouterGuardError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 429 });
    }
    const message = err instanceof Error ? err.message : "JARVIS execution failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
