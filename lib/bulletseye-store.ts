import fs from "fs";
import path from "path";
import type { SchemaBlock } from "@/lib/ai-seo-geo";
import { sanitizeSchemaBlocks } from "@/lib/schema-sanitize";
import {
  resolveWritableDataDir,
  safeWriteJson,
} from "@/lib/writable-data-path";

export type StoredInjection = {
  id: string;
  brand_name: string;
  brand_id: string;
  target_url: string;
  client_type: string;
  query_type: string;
  stored_at: string;
  schema_blocks: SchemaBlock[];
  recommended_h2_headers: string[];
  direct_answers: Array<{ h2: string; answer: string }>;
  next_metadata: {
    title: string;
    description: string;
    openGraph?: { title: string; description: string };
  };
  injection_status: "stored" | "pushed" | "offline_fallback";
  internal_route?: string;
};

function storeDir(): string {
  // Vercel: /tmp/faos-data/bulletseye_injections — never /var/task/data
  return resolveWritableDataDir("bulletseye_injections");
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function saveInjectionRecord(record: StoredInjection): string {
  const file = path.join(storeDir(), `${record.id}.json`);
  const safe = {
    ...record,
    schema_blocks: sanitizeSchemaBlocks(record.schema_blocks),
  };
  safeWriteJson(file, safe, "bulletseye_injection");
  return file;
}

export function loadInjectionRecord(id: string): StoredInjection | null {
  const file = path.join(storeDir(), `${id}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as StoredInjection;
  } catch {
    return null;
  }
}

export function loadLatestInjectionForBrand(brandId: string): StoredInjection | null {
  const dir = storeDir();
  if (!fs.existsSync(dir)) return null;
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => path.join(dir, f));
  let latest: StoredInjection | null = null;
  for (const file of files) {
    try {
      const rec = JSON.parse(fs.readFileSync(file, "utf-8")) as StoredInjection;
      if (rec.brand_id === brandId) {
        if (!latest || rec.stored_at > latest.stored_at) latest = rec;
      }
    } catch {
      /* skip corrupt */
    }
  }
  return latest;
}

export function newInjectionId(brandName: string): string {
  return `${slugify(brandName)}-${Date.now()}`;
}

export function listInjectionRecords(limit = 20): StoredInjection[] {
  const dir = storeDir();
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8")) as StoredInjection;
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => (a!.stored_at < b!.stored_at ? 1 : -1))
    .slice(0, limit) as StoredInjection[];
}
