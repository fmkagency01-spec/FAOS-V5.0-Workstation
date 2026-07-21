/**
 * jarvis_chat_sessions — durable chat history for Admin ↔ JARVIS.
 *
 * Storage: JSON file store shaped like a SQL/NoSQL table (portable to
 * SQLite / PostgreSQL / MongoDB). Schema: data/migrations/003_jarvis_chat_sessions.json
 *
 * Privacy: Super Admin (owner / executive) only — never expose to team/clients.
 */

import fs from "fs";
import path from "path";
import seed from "@/data/jarvis_chat_sessions.json";

export type ChatMessageRole = "user" | "assistant" | "system" | "jarvis";

export type JarvisChatMessage = {
  id: string;
  role: ChatMessageRole;
  text: string;
  meta?: string;
  created_at: string;
};

export type JarvisChatSession = {
  id: string;
  user_id: string;
  username: string;
  user_name: string;
  source: "jarvis" | "command_bar" | "chat_console" | "operations";
  title: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  messages: JarvisChatMessage[];
};

type ChatDb = {
  table: "jarvis_chat_sessions";
  version: number;
  sessions: JarvisChatSession[];
};

function dataDir(): string {
  const preferred = path.join(process.cwd(), "data");
  if (fs.existsSync(preferred)) return preferred;
  return path.join(process.cwd(), "backend", "data");
}

function dbPath(): string {
  return path.join(dataDir(), "jarvis_chat_sessions.json");
}

function loadDb(): ChatDb {
  const file = dbPath();
  if (!fs.existsSync(file)) {
    return { table: "jarvis_chat_sessions", version: 1, sessions: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as ChatDb;
  } catch {
    return { ...(seed as ChatDb), sessions: [] };
  }
}

function saveDb(db: ChatDb): void {
  fs.mkdirSync(dataDir(), { recursive: true });
  fs.writeFileSync(dbPath(), JSON.stringify(db, null, 2), "utf-8");
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function deriveTitle(messages: JarvisChatMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser?.text) return "New conversation";
  return firstUser.text.slice(0, 72) + (firstUser.text.length > 72 ? "…" : "");
}

export function createChatSession(input: {
  user_id: string;
  username: string;
  user_name: string;
  source?: JarvisChatSession["source"];
}): JarvisChatSession {
  const db = loadDb();
  const now = new Date().toISOString();
  for (const s of db.sessions) {
    if (s.user_id === input.user_id && s.is_active) s.is_active = false;
  }
  const session: JarvisChatSession = {
    id: newId("jcs"),
    user_id: input.user_id,
    username: input.username,
    user_name: input.user_name,
    source: input.source || "jarvis",
    title: "New conversation",
    is_active: true,
    created_at: now,
    updated_at: now,
    messages: [
      {
        id: newId("msg"),
        role: "system",
        text: "JARVIS session started — history auto-saves for Super Admin review.",
        created_at: now,
      },
    ],
  };
  db.sessions.unshift(session);
  saveDb(db);
  return session;
}

export function listChatSessions(limit = 50): JarvisChatSession[] {
  return loadDb()
    .sessions.slice()
    .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
    .slice(0, limit);
}

export function getChatSession(id: string): JarvisChatSession | null {
  return loadDb().sessions.find((s) => s.id === id) ?? null;
}

export function getActiveSessionForUser(userId: string): JarvisChatSession | null {
  const sessions = loadDb().sessions.filter((s) => s.user_id === userId);
  return sessions.find((s) => s.is_active) || sessions[0] || null;
}

export function appendChatMessages(
  sessionId: string,
  messages: Array<{ role: ChatMessageRole; text: string; meta?: string }>
): JarvisChatSession | null {
  const db = loadDb();
  const session = db.sessions.find((s) => s.id === sessionId);
  if (!session) return null;
  const now = new Date().toISOString();
  for (const msg of messages) {
    session.messages.push({
      id: newId("msg"),
      role: msg.role,
      text: msg.text,
      meta: msg.meta,
      created_at: now,
    });
  }
  session.updated_at = now;
  session.title = deriveTitle(session.messages);
  session.is_active = true;
  saveDb(db);
  return session;
}

export function setActiveSession(userId: string, sessionId: string): JarvisChatSession | null {
  const db = loadDb();
  const target = db.sessions.find((s) => s.id === sessionId && s.user_id === userId);
  if (!target) return null;
  for (const s of db.sessions) {
    if (s.user_id === userId) s.is_active = s.id === sessionId;
  }
  saveDb(db);
  return target;
}

export function deleteChatSession(sessionId: string): boolean {
  const db = loadDb();
  const before = db.sessions.length;
  db.sessions = db.sessions.filter((s) => s.id !== sessionId);
  if (db.sessions.length === before) return false;
  saveDb(db);
  return true;
}
