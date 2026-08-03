/**
 * jarvis_chat_sessions — durable chat history for Admin ↔ JARVIS.
 *
 * Storage: JSON file store shaped like a SQL/NoSQL table (portable to
 * SQLite / PostgreSQL / MongoDB). Schema: data/migrations/003_jarvis_chat_sessions.json
 *
 * Privacy: Super Admin (owner / executive) only — never expose to team/clients.
 *
 * Vercel note: /var/task is read-only — we write under /tmp and keep an
 * in-memory mirror so history never 500s the JARVIS chat path.
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

/** Process-local mirror — survives within a warm serverless instance. */
let memoryDb: ChatDb | null = null;

function isServerlessReadonlyFs(): boolean {
  return Boolean(
    process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.VERCEL_ENV
  );
}

function candidateDirs(): string[] {
  const dirs: string[] = [];
  if (isServerlessReadonlyFs()) {
    dirs.push(path.join("/tmp", "faos-data"));
  }
  dirs.push(path.join(process.cwd(), "data"));
  dirs.push(path.join(process.cwd(), "backend", "data"));
  return dirs;
}

function resolveDbPath(): string {
  for (const dir of candidateDirs()) {
    const file = path.join(dir, "jarvis_chat_sessions.json");
    try {
      if (fs.existsSync(file)) return file;
      fs.mkdirSync(dir, { recursive: true });
      // Probe writability without leaving junk
      const probe = path.join(dir, ".faos_write_probe");
      fs.writeFileSync(probe, "ok", "utf-8");
      fs.unlinkSync(probe);
      return file;
    } catch {
      /* try next */
    }
  }
  return path.join("/tmp", "faos-data", "jarvis_chat_sessions.json");
}

function emptyDb(): ChatDb {
  return { table: "jarvis_chat_sessions", version: 1, sessions: [] };
}

function loadDb(): ChatDb {
  if (memoryDb) return memoryDb;

  const file = resolveDbPath();
  if (!fs.existsSync(file)) {
    // Seed from committed JSON if present (read-only ok)
    try {
      const seedPath = path.join(process.cwd(), "data", "jarvis_chat_sessions.json");
      if (fs.existsSync(seedPath)) {
        const parsed = JSON.parse(fs.readFileSync(seedPath, "utf-8")) as ChatDb;
        memoryDb = {
          table: "jarvis_chat_sessions",
          version: parsed.version || 1,
          sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
        };
        return memoryDb;
      }
    } catch {
      /* ignore */
    }
    memoryDb = emptyDb();
    return memoryDb;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf-8")) as ChatDb;
    memoryDb = {
      table: "jarvis_chat_sessions",
      version: parsed.version || 1,
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
    };
    return memoryDb;
  } catch {
    memoryDb = { ...(seed as ChatDb), sessions: [] };
    return memoryDb;
  }
}

function saveDb(db: ChatDb): void {
  memoryDb = db;
  try {
    const file = resolveDbPath();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(db, null, 2), "utf-8");
  } catch (err) {
    // Never crash chat — memory mirror still serves this warm instance
    console.warn(
      "jarvis_chat_sessions: disk persist skipped:",
      err instanceof Error ? err.message : err
    );
  }
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
