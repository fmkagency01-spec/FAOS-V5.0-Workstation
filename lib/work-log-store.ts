/**
 * faos_daily_work_logs — durable day-to-day team + agent work tracking.
 *
 * Storage: JSON file store (portable to SQLite / PostgreSQL).
 * Schema: data/migrations/004_faos_daily_work_log.json
 */

import fs from "fs";
import path from "path";
import seed from "@/data/faos_daily_work_log.json";
import type {
  DailyWorkLog,
  DailyWorkLogCreateInput,
  DailyWorkLogUpdateInput,
  ProjectHealth,
  WorkLogDashboardStats,
} from "@/lib/work-log-types";

type WorkLogDb = {
  table: "faos_daily_work_logs";
  version: number;
  logs: DailyWorkLog[];
};

function dataDir(): string {
  const preferred = path.join(process.cwd(), "data");
  if (fs.existsSync(preferred)) return preferred;
  return path.join(process.cwd(), "backend", "data");
}

function dbPath(): string {
  return path.join(dataDir(), "faos_daily_work_log.json");
}

function loadDb(): WorkLogDb {
  const file = dbPath();
  if (!fs.existsSync(file)) {
    return { table: "faos_daily_work_logs", version: 1, logs: [] };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf-8")) as WorkLogDb;
    return {
      table: "faos_daily_work_logs",
      version: parsed.version || 1,
      logs: Array.isArray(parsed.logs) ? parsed.logs : [],
    };
  } catch {
    return { ...(seed as WorkLogDb), logs: [] };
  }
}

function saveDb(db: WorkLogDb): void {
  fs.mkdirSync(dataDir(), { recursive: true });
  fs.writeFileSync(dbPath(), JSON.stringify(db, null, 2), "utf-8");
}

function newId(): string {
  return `wl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function todayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function normalizeHealth(v: unknown): ProjectHealth {
  if (v === "at_risk" || v === "blocked" || v === "on_track") return v;
  return "on_track";
}

function cleanStrings(items: unknown, max = 20): string[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean)
    .slice(0, max);
}

function cleanInProgress(
  items: unknown
): DailyWorkLog["tasks_in_progress"] {
  if (!Array.isArray(items)) return [];
  return items
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const r = row as { name?: unknown; progress_pct?: unknown };
      const name = typeof r.name === "string" ? r.name.trim() : "";
      if (!name) return null;
      const pct = Number(r.progress_pct);
      return {
        name,
        progress_pct: Number.isFinite(pct)
          ? Math.max(0, Math.min(100, Math.round(pct)))
          : 0,
      };
    })
    .filter((x): x is DailyWorkLog["tasks_in_progress"][number] => x !== null)
    .slice(0, 20);
}

export function listWorkLogsLocal(opts?: {
  date?: string;
  member?: string;
  health?: ProjectHealth;
  limit?: number;
}): DailyWorkLog[] {
  let rows = loadDb().logs.slice();
  if (opts?.date) {
    rows = rows.filter((l) => l.log_date === opts.date);
  }
  if (opts?.member) {
    const q = opts.member.toLowerCase();
    rows = rows.filter(
      (l) =>
        l.member_name.toLowerCase().includes(q) ||
        (l.submitted_by || "").toLowerCase().includes(q)
    );
  }
  if (opts?.health) {
    rows = rows.filter((l) => l.project_health === opts.health);
  }
  rows.sort((a, b) => {
    if (a.log_date !== b.log_date) return a.log_date < b.log_date ? 1 : -1;
    return a.updated_at < b.updated_at ? 1 : -1;
  });
  const limit = opts?.limit ?? 200;
  return rows.slice(0, limit);
}

export function getWorkLogLocal(id: string): DailyWorkLog | null {
  return loadDb().logs.find((l) => l.id === id) || null;
}

export function createWorkLogLocal(
  input: DailyWorkLogCreateInput
): DailyWorkLog {
  const db = loadDb();
  const now = new Date().toISOString();
  const record: DailyWorkLog = {
    id: newId(),
    log_date: (input.log_date || todayIsoDate()).trim().slice(0, 10),
    member_name: input.member_name.trim(),
    member_role: (input.member_role || "").trim() || "Team",
    submitted_by: input.submitted_by?.trim() || undefined,
    tasks_completed: cleanStrings(input.tasks_completed),
    tasks_in_progress: cleanInProgress(input.tasks_in_progress),
    blockers: cleanStrings(input.blockers),
    next_day_plan: cleanStrings(input.next_day_plan),
    project_health: normalizeHealth(input.project_health),
    backend_notes: input.backend_notes?.trim() || undefined,
    agent_activity_ids: cleanStrings(input.agent_activity_ids, 50),
    created_at: now,
    updated_at: now,
  };
  db.logs.unshift(record);
  saveDb(db);
  return record;
}

export function updateWorkLogLocal(
  id: string,
  input: DailyWorkLogUpdateInput
): DailyWorkLog | null {
  const db = loadDb();
  const idx = db.logs.findIndex((l) => l.id === id);
  if (idx < 0) return null;
  const row = db.logs[idx];
  if (!row) return null;

  if (input.log_date !== undefined) {
    row.log_date = input.log_date.trim().slice(0, 10);
  }
  if (input.member_name !== undefined) {
    row.member_name = input.member_name.trim();
  }
  if (input.member_role !== undefined) {
    row.member_role = input.member_role.trim() || "Team";
  }
  if (input.submitted_by !== undefined) {
    row.submitted_by = input.submitted_by.trim() || undefined;
  }
  if (input.tasks_completed !== undefined) {
    row.tasks_completed = cleanStrings(input.tasks_completed);
  }
  if (input.tasks_in_progress !== undefined) {
    row.tasks_in_progress = cleanInProgress(input.tasks_in_progress);
  }
  if (input.blockers !== undefined) {
    row.blockers = cleanStrings(input.blockers);
  }
  if (input.next_day_plan !== undefined) {
    row.next_day_plan = cleanStrings(input.next_day_plan);
  }
  if (input.project_health !== undefined) {
    row.project_health = normalizeHealth(input.project_health);
  }
  if (input.backend_notes !== undefined) {
    row.backend_notes = input.backend_notes.trim() || undefined;
  }
  if (input.agent_activity_ids !== undefined) {
    row.agent_activity_ids = cleanStrings(input.agent_activity_ids, 50);
  }
  row.updated_at = new Date().toISOString();
  db.logs[idx] = row;
  saveDb(db);
  return row;
}

export function deleteWorkLogLocal(id: string): boolean {
  const db = loadDb();
  const before = db.logs.length;
  db.logs = db.logs.filter((l) => l.id !== id);
  if (db.logs.length === before) return false;
  saveDb(db);
  return true;
}

export function workLogStatsLocal(date?: string): WorkLogDashboardStats {
  const day = date || todayIsoDate();
  const today = listWorkLogsLocal({ date: day, limit: 500 });
  const members = new Set(today.map((l) => l.member_name.toLowerCase()));
  let pctSum = 0;
  let pctCount = 0;
  for (const log of today) {
    for (const item of log.tasks_in_progress) {
      pctSum += item.progress_pct;
      pctCount += 1;
    }
  }
  return {
    total_today: today.length,
    on_track: today.filter((l) => l.project_health === "on_track").length,
    at_risk: today.filter((l) => l.project_health === "at_risk").length,
    blocked: today.filter((l) => l.project_health === "blocked").length,
    members_logged_today: members.size,
    avg_in_progress_pct:
      pctCount === 0 ? 0 : Math.round(pctSum / pctCount),
  };
}

export { todayIsoDate };
