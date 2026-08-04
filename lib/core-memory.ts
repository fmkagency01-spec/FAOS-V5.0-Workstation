/**
 * Local core-memory writer (Vercel fallback when Render is asleep).
 * Mirrors backend/services/memory_namespaces.py — redacts secrets, never throws.
 */

import {
  resolveWritableDbFile,
  safeReadJsonFile,
  safeWriteJson,
} from "@/lib/writable-data-path";
import { getMemoryNamespaces } from "@/lib/fmk-group-core";

export type CoreMemoryEntry = {
  id: string;
  kind: string;
  content: string;
  source: string;
  created_at: string;
  meta?: Record<string, unknown>;
};

type MemoryFile = {
  namespace: string;
  version: number;
  entries: CoreMemoryEntry[];
};

const SECRET_PATTERNS = [
  /\bsk-or-v1-[a-zA-Z0-9_-]{8,}\b/gi,
  /\bAIza[0-9A-Za-z\-_]{20,}\b/g,
  /\b(api[_-]?key|secret|token|password|DATABASE_URL)\s*[:=]\s*['"]?[^\s'"]{8,}/gi,
];

export function redactSecrets(text: string): string {
  let out = text;
  for (const pattern of SECRET_PATTERNS) {
    out = out.replace(pattern, "[REDACTED]");
  }
  return out;
}

export function isKnownMemoryNamespace(ns: string): boolean {
  const ids = new Set(getMemoryNamespaces().map((n) => n.id));
  return ids.has(ns);
}

function memoryPath(namespace: string): string {
  return resolveWritableDbFile(`${namespace}.json`, "memory_namespaces");
}

export function appendCoreMemory(
  namespace: string,
  input: {
    kind: string;
    content: string;
    source?: string;
    meta?: Record<string, unknown>;
  }
): CoreMemoryEntry {
  const ns = isKnownMemoryNamespace(namespace)
    ? namespace
    : "fmk_aigorithm_ai_brain";
  const file = memoryPath(ns);
  const existing = safeReadJsonFile<MemoryFile>(file) || {
    namespace: ns,
    version: 1,
    entries: [],
  };
  const entry: CoreMemoryEntry = {
    id: `mem_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    kind: input.kind.slice(0, 80),
    content: redactSecrets(input.content).slice(0, 20000),
    source: (input.source || "faos").slice(0, 120),
    created_at: new Date().toISOString(),
    meta: input.meta,
  };
  existing.namespace = ns;
  existing.version = existing.version || 1;
  existing.entries = [entry, ...(existing.entries || [])].slice(0, 500);
  safeWriteJson(file, existing, `core-memory:${ns}`);
  return entry;
}

export function listCoreMemory(namespace: string, limit = 20): CoreMemoryEntry[] {
  const ns = isKnownMemoryNamespace(namespace)
    ? namespace
    : "fmk_aigorithm_ai_brain";
  const file = memoryPath(ns);
  const existing = safeReadJsonFile<MemoryFile>(file);
  return (existing?.entries || []).slice(0, limit);
}
