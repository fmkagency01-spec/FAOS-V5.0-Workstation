/**
 * Learning Hub — local JSON fallback when Render is asleep.
 * Mirrors backend/router/learning_hub_routing.py
 * Ingest now writes durable core-memory entries (Aigorithm brain).
 */

import { autoCorrectInput } from "@/lib/text-autocorrect";
import { appendCoreMemory } from "@/lib/core-memory";
import {
  resolveWritableDbFile,
  safeReadJsonFile,
  safeWriteJson,
} from "@/lib/writable-data-path";

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

function dbPath(): string {
  return resolveWritableDbFile("learning_hub_db.json", "learning_hub");
}

function loadDb(): HubDb {
  const parsed = safeReadJsonFile<HubDb>(dbPath());
  if (!parsed) return { table: "learning_hub", version: 1, items: [] };
  return {
    table: "learning_hub",
    version: parsed.version || 1,
    items: Array.isArray(parsed.items) ? parsed.items : [],
  };
}

function saveDb(db: HubDb): void {
  safeWriteJson(dbPath(), db, "learning_hub");
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
  const title = autoCorrectInput(input.title.trim());
  if (!title) throw new Error("title is required");
  const kind = (input.kind || "documentation").toLowerCase();
  if (!ALLOWED.has(kind)) throw new Error("invalid kind");
  const url = (input.url || "").trim();
  const content = autoCorrectInput((input.content || "").trim());
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

  const summaryParts = [`[${row.kind}] ${row.title}`];
  if (row.url) summaryParts.push(`URL: ${row.url}`);
  if (row.content) summaryParts.push(row.content.slice(0, 4000));
  const text = autoCorrectInput(summaryParts.join("\n"));

  const mem = appendCoreMemory(row.memory_namespace || "fmk_aigorithm_ai_brain", {
    kind: `learning_${row.kind}`,
    content: text,
    source: "learning_hub",
    meta: {
      learning_hub_id: row.id,
      tags: row.tags,
      url: row.url,
    },
  });

  row.status = "ingested";
  row.updated_at = new Date().toISOString();
  row.ingest_result = {
    memory_entry_id: mem.id,
    namespace: row.memory_namespace,
  };
  saveDb(db);
  return row;
}
