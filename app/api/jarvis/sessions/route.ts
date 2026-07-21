import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/rbac-guards";
import {
  appendChatMessages,
  createChatSession,
  deleteChatSession,
  getActiveSessionForUser,
  getChatSession,
  listChatSessions,
  setActiveSession,
} from "@/lib/jarvis-chat-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Super Admin only — Mahirul / Executive Alpha can view JARVIS prompt histories.
 * Team members and clients receive 403.
 */
async function requireSuperAdmin(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return { error: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  }
  if (!isSuperAdmin(session.role)) {
    return {
      error: NextResponse.json(
        {
          ok: false,
          error: "Internal JARVIS chat logs are Super Admin only (Mahirul / Executive Alpha).",
          code: "SUPER_ADMIN_ONLY",
        },
        { status: 403 }
      ),
    };
  }
  return { session };
}

export async function GET(request: NextRequest) {
  const gate = await requireSuperAdmin(request);
  if (gate.error) return gate.error;

  const sessionId = request.nextUrl.searchParams.get("id");
  if (sessionId) {
    const session = getChatSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, session, table: "jarvis_chat_sessions" });
  }

  const active = request.nextUrl.searchParams.get("active") === "1";
  if (active) {
    const current =
      getActiveSessionForUser(gate.session.username) ||
      createChatSession({
        user_id: gate.session.username,
        username: gate.session.username,
        user_name: gate.session.name,
        source: "jarvis",
      });
    return NextResponse.json({ ok: true, session: current, table: "jarvis_chat_sessions" });
  }

  return NextResponse.json({
    ok: true,
    table: "jarvis_chat_sessions",
    sessions: listChatSessions(80).map((s) => ({
      id: s.id,
      title: s.title,
      source: s.source,
      is_active: s.is_active,
      username: s.username,
      user_name: s.user_name,
      message_count: s.messages.length,
      created_at: s.created_at,
      updated_at: s.updated_at,
    })),
  });
}

export async function POST(request: NextRequest) {
  const gate = await requireSuperAdmin(request);
  if (gate.error) return gate.error;

  let body: {
    action?: "create" | "append" | "activate" | "delete";
    session_id?: string;
    source?: "jarvis" | "command_bar" | "chat_console" | "operations";
    messages?: Array<{ role: "user" | "assistant" | "system" | "jarvis"; text: string; meta?: string }>;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = body.action || "create";

  if (action === "create") {
    const session = createChatSession({
      user_id: gate.session.username,
      username: gate.session.username,
      user_name: gate.session.name,
      source: body.source || "jarvis",
    });
    return NextResponse.json({ ok: true, session }, { status: 201 });
  }

  if (action === "activate") {
    if (!body.session_id) {
      return NextResponse.json({ error: "session_id required" }, { status: 400 });
    }
    const session = setActiveSession(gate.session.username, body.session_id);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, session });
  }

  if (action === "delete") {
    if (!body.session_id) {
      return NextResponse.json({ error: "session_id required" }, { status: 400 });
    }
    const ok = deleteChatSession(body.session_id);
    if (!ok) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    return NextResponse.json({ ok: true, deleted: body.session_id });
  }

  if (action === "append") {
    if (!body.session_id || !body.messages?.length) {
      return NextResponse.json(
        { error: "session_id and messages required" },
        { status: 400 }
      );
    }
    let session = getChatSession(body.session_id);
    if (!session) {
      session = createChatSession({
        user_id: gate.session.username,
        username: gate.session.username,
        user_name: gate.session.name,
        source: body.source || "jarvis",
      });
    }
    const updated = appendChatMessages(session.id, body.messages);
    return NextResponse.json({ ok: true, session: updated });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
