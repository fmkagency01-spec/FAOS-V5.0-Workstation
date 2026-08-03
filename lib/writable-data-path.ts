/**
 * Writable data paths for FAOS JSON stores.
 *
 * Vercel / Lambda ship the app under /var/task (EROFS). Committed seed files
 * under data/*.json therefore *exist* but cannot be written. Never pick a path
 * solely because existsSync(file) is true — always probe writability, and on
 * serverless prefer /tmp/faos-data exclusively.
 */

import fs from "fs";
import path from "path";

const TMP_ROOT = path.join("/tmp", "faos-data");

export function isServerlessReadonlyFs(): boolean {
  return Boolean(
    process.env.VERCEL ||
      process.env.VERCEL_ENV ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.LAMBDA_TASK_ROOT
  );
}

function canWriteDir(dir: string): boolean {
  try {
    fs.mkdirSync(dir, { recursive: true });
    const probe = path.join(dir, `.faos_write_probe_${process.pid}`);
    fs.writeFileSync(probe, "ok", "utf-8");
    fs.unlinkSync(probe);
    return true;
  } catch {
    return false;
  }
}

/** Process-local cache — avoid re-probing every request on a warm instance. */
let cachedWriteRoot: string | null = null;

/**
 * Directory that is safe to create/overwrite JSON files in.
 * On Vercel this is always under /tmp; locally it prefers ./data.
 */
export function resolveWritableDataDir(subdir?: string): string {
  if (!cachedWriteRoot) {
    const candidates: string[] = [];
    if (isServerlessReadonlyFs()) {
      // Never fall through to /var/task/data — seed files live there read-only.
      candidates.push(TMP_ROOT);
    } else {
      candidates.push(path.join(process.cwd(), "data"));
      candidates.push(path.join(process.cwd(), "backend", "data"));
      candidates.push(TMP_ROOT);
    }

    for (const dir of candidates) {
      if (canWriteDir(dir)) {
        cachedWriteRoot = dir;
        break;
      }
    }
    if (!cachedWriteRoot) cachedWriteRoot = TMP_ROOT;
  }

  if (!subdir) return cachedWriteRoot;

  const full = path.join(cachedWriteRoot, subdir);
  try {
    fs.mkdirSync(full, { recursive: true });
  } catch {
    /* save path will warn if truly unwritable */
  }
  return full;
}

export function resolveWritableDbFile(filename: string, subdir?: string): string {
  return path.join(resolveWritableDataDir(subdir), filename);
}

/** Bundled seed under the deployment (read-only on Vercel). */
export function resolveSeedDataFile(filename: string): string {
  const primary = path.join(process.cwd(), "data", filename);
  if (fs.existsSync(primary)) return primary;
  return path.join(process.cwd(), "backend", "data", filename);
}

export function safeWriteJson(file: string, data: unknown, label = "faos-data"): boolean {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.warn(
      `${label}: disk persist skipped:`,
      err instanceof Error ? err.message : err
    );
    return false;
  }
}

export function safeReadJsonFile<T>(file: string): T | null {
  try {
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
  } catch {
    return null;
  }
}

/** Test helper — clears cached write root between unit simulations. */
export function __resetWritableDataPathCacheForTests(): void {
  cachedWriteRoot = null;
}
