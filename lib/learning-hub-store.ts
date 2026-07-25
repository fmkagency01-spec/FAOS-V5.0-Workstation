/**
 * Learning Hub — local JSON fallback when Render is asleep.
 * Mirrors backend/router/learning_hub_routing.py
 */

import fs from "fs";
import path from "path";

export type LearningHubItem = {
  id: string;
  title: string;
  kind: "documentation" | "url" | "course" | "note" | "policy";
  url?: string | null;
  content?: string | null;
  memory_namespace: string;
  pillar_hint?: string;
  tags: string[];
  status: "pending" | "ingested";
  submitted_by?: string;
  created_at: string;
  updated_at: string;
  ingest_result?: { memory_entry_id?: string; namespace?: string } | null;
};

type HubDb = {
  table: "learning_hub";
  version: number;
  items: LearningHubItem[];
};

function dataDir(): string {
  const preferred = path.join(process.cwd(), "data", "learning_hub");
  if (fs.existsSync(path.join(process.cwd(), "data"))) return preferred;
  return path.join(process.cwd(), "backend", "data", "learning_hub");
}

function dbPath(): string {
  return path.join(dataDir(), "learning_hub_db.json");
}

function loadDb(): HubDb {
  const file = dbPath();
  if (!fs.existsSync(file)) {
    return { table: "learning_hub", version: 1, items: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as HubDb;
  } catch {
    return { table: "learning_hub", version: 1, items: [] };
  }
}

function saveDb(db: HubDb): void {
  fs.mkdirSync(dataDir(), { recursive: true });
  fs.writeFileSync(dbPath(), JSON.stringify(db, null, 2), "utf-8");
}

function newId(): string {
  return `lh_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const ALLOWED = new Set(["documentation", "url", "course", "note", "policy"]);

export function learningHubStatusLocal() {
  const items = loadDb().items;
  return {
    ok: true as const,
    module: "learning_hub",
    gatekeeper: "fmk_tac_core",
    brain: "fmk_aigorithm_ai_brain",
    total: items.length,
    pending: items.filter((i) => i.status === "pending").length,
    ingested: items.filter((i) => i.status === "ingested").length,
    source: "vercel-local" as const,
  };
}

export function listLearningHubLocal(limit = 50): LearningHubItem[] {
  return loadDb()
    .items.slice()
    .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
    .slice(0, limit);
}

export function pushLearningHubLocal(input: {
  title: string;
  kind?: string;
  url?: string;
  content?: string;
  memory_namespace?: string;
  pillar?: string;
  tags?: string[];
  submitted_by?: string;
  auto_ingest?: boolean;
}): LearningHubItem {
  const title = input.title.trim();
  if (!title) throw new Error("title is required");
  const kind = (input.kind || "documentation").toLowerCase();
  if (!ALLOWED.has(kind)) throw new Error("invalid kind");
  const url = (input.url || "").trim();
  const content = (input.content || "").trim();
  if (kind === "url" && !url) throw new Error("url is required when kind=url");
  if (kind !== "url" && !content && !url) throw new Error("content or url is required");

  const now = new Date().toISOString();
  const item: LearningHubItem = {
    id: newId(),
    title: title.slice(0, 300),
    kind: kind as LearningHubItem["kind"],
    url: url || null,
    content: content || null,
    memory_namespace: (input.memory_namespace || "fmk_aigorithm_ai_brain").trim(),
    pillar_hint: input.pillar || "service",
    tags: (input.tags || []).map((t) => t.trim()).filter(Boolean).slice(0, 20),
    status: "pending",
    submitted_by: input.submitted_by || "admin",
    created_at: now,
    updated_at: now,
    ingest_result: null,
  };

  const db = loadDb();
  db.items.unshift(item);
  saveDb(db);

  if (input.auto_ingest !== false) {
    return ingestLearningHubLocal(item.id);
  }
  return item;
}

export function ingestLearningHubLocal(id: string): LearningHubItem {
  const db = loadDb();
  const row = db.items.find((i) => i.id === id);
  if (!row) throw new Error(`Learning hub item not found: ${id}`);
  row.status = "ingested";
  row.updated_at = new Date().toISOString();
  row.ingest_result = {
    memory_entry_id: `mem_local_${Date.now()}`,
    namespace: row.memory_namespace,
  };
  saveDb(db);
  return row;
}
