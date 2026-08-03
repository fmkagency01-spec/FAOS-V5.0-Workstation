/**
 * jarvis_chat_sessions — durable chat history for Admin ↔ JARVIS.
 *
 * Storage: JSON file store shaped like a SQL/NoSQL table (portable to
 * SQLite / PostgreSQL / MongoDB). Schema: data/migrations/003_jarvis_chat_sessions.json
 *
 * Privacy: Super Admin (owner / executive) only — never expose to team/clients.
 *
 * Vercel note: /var/task is read-only. Writes go to /tmp/faos-data only.
 * Committed seed data/jarvis_chat_sessions.json is read-only input, never a
 * write target (existsSync alone must not select it).
 */

import seed from "@/data/jarvis_chat_sessions.json";
import {
  resolveSeedDataFile,
  resolveWritableDbFile,
  safeReadJsonFile,
  safeWriteJson,
} from "@/lib/writable-data-path";

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

const DB_FILE = "jarvis_chat_sessions.json";

/** Process-local mirror — survives within a warm serverless instance. */
let memoryDb: ChatDb | null = null;

function writePath(): string {
  return resolveWritableDbFile(DB_FILE);
}

function emptyDb(): ChatDb {
  return { table: "jarvis_chat_sessions", version: 1, sessions: [] };
}

function normalizeDb(parsed: Partial<ChatDb> | null | undefined): ChatDb {
  return {
    table: "jarvis_chat_sessions",
    version: parsed?.version || 1,
    sessions: Array.isArray(parsed?.sessions) ? parsed.sessions : [],
  };
}

function loadDb(): ChatDb {
  if (memoryDb) return memoryDb;

  // 1) Prefer prior writes under the writable root (/tmp on Vercel)
  const fromWritable = safeReadJsonFile<ChatDb>(writePath());
  if (fromWritable) {
    memoryDb = normalizeDb(fromWritable);
    return memoryDb;
  }

  // 2) Seed from bundled JSON (read-only on Vercel — never write here)
  const fromSeedFile = safeReadJsonFile<ChatDb>(resolveSeedDataFile(DB_FILE));
  if (fromSeedFile) {
    memoryDb = normalizeDb(fromSeedFile);
    return memoryDb;
  }

  memoryDb = normalizeDb(seed as ChatDb);
  return memoryDb;
}

function saveDb(db: ChatDb): void {
  memoryDb = db;
  // Always write under /tmp on serverless — never /var/task/data
  safeWriteJson(writePath(), db, "jarvis_chat_sessions");
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

/** Expose write path for diagnostics / tests (never /var/task on Vercel). */
export function jarvisChatStoreWritePath(): string {
  return writePath();
}
