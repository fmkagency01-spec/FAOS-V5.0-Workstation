import { NextRequest, NextResponse } from "next/server";
import { executeJarvisPlan, planJarvisCommand, type JarvisAction } from "@/lib/jarvis-orchestrator";
import { OpenRouterGuardError, resolveClientKeyFromHeaders } from "@/lib/openrouter-guard";
import { getAllShellAgents } from "@/lib/shell-agents";
import { fetchWorkflow } from "@/lib/workflow-api";
import { createInvoiceLocal, createInventoryLocal, createEmployeeLocal } from "@/lib/erp-store";
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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function executeJarvisAction(action: JarvisAction): Promise<{ label: string; result: unknown } | null> {
  switch (action.type) {
    case "create_invoice": {
      const p = action.payload;
      const { data } = await fetchWorkflow<{ invoice: unknown }>("invoices", {
        method: "POST",
        body: JSON.stringify(p),
      });
      const invoice = data?.invoice || createInvoiceLocal(p as Parameters<typeof createInvoiceLocal>[0]);
      return { label: `Invoice created: ${(invoice as { invoice_number?: string }).invoice_number}`, result: invoice };
    }
    case "add_inventory": {
      const p = action.payload;
      const { data } = await fetchWorkflow<{ item: unknown }>("inventory", {
        method: "POST",
        body: JSON.stringify(p),
      });
      const item = data?.item || createInventoryLocal(p as Parameters<typeof createInventoryLocal>[0]);
      return { label: `Stock item added: ${(item as { sku?: string }).sku}`, result: item };
    }
    case "add_employee": {
      const p = action.payload;
      const { data } = await fetchWorkflow<{ employee: unknown }>("employees", {
        method: "POST",
        body: JSON.stringify(p),
      });
      const employee = data?.employee || createEmployeeLocal(p as Parameters<typeof createEmployeeLocal>[0]);
      return { label: `Employee added: ${(employee as { name?: string }).name}`, result: employee };
    }
    case "assign_agents": {
      const { data } = await fetchWorkflow<{ tasks: unknown[] }>("agent-workflow/assign", {
        method: "POST",
        body: JSON.stringify({ ...action.payload, auto_execute: false }),
      });
      return { label: `Agents queued: ${action.payload.agent_ids.join(", ")}`, result: data };
    }
    case "generate_image": {
      const img = await generateImage(action.payload.prompt);
      return { label: "Image generation complete", result: img };
    }
    case "generate_video_plan": {
      const vid = await generateVideoPlan(action.payload.brief);
      return { label: "Video plan generated", result: vid };
    }
    default:
      return null;
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    version: "5.3.0",
    name: "JARVIS Orchestrator",
    shell_agents: getAllShellAgents().length,
    agents: getAllShellAgents().map((a) => ({ id: a.id, name: a.name, domain: a.domain, icon: a.icon })),
    token_saving_mode: isTokenSavingMode(),
    capabilities: ["voice", "chat", "erp", "creative", "video", "multi-agent", "multimodal", "tts"],
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

  const plan = planJarvisCommand(command);
  const clientKey = resolveClientKeyFromHeaders(request.headers);
  const session = await getSessionFromRequest(request);

  try {
    const result = await executeJarvisPlan(plan, clientKey, executeJarvisAction);

    let chatSessionId: string | undefined;
    // Persist turns for Super Admin only — never store for team/client roles.
    if (session && isSuperAdmin(session.role)) {
      let chat =
        (body.session_id ? getChatSession(body.session_id) : null) ||
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
      ]
        .filter(Boolean)
        .join(" · ");
      chat =
        appendChatMessages(chat.id, [
          { role: "user", text: body.command?.trim() || command, meta: body.voice ? "voice" : undefined },
          { role: "jarvis", text: result.reply, meta },
        ]) || chat;
      chatSessionId = chat.id;
    }

    return NextResponse.json({
      ok: true,
      version: "5.3.0",
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
      agents_dispatched: result.agents_dispatched,
      route_label: plan.route.label,
      action_taken: result.action_taken,
      action_result: result.action_result ?? null,
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
