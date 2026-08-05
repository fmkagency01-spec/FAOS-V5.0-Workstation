/**
 * Load repo-root .env.local into process.env for CLI scripts (tsx).
 * Does not override already-set environment variables.
 */
import fs from "fs";
import path from "path";

export function loadEnvLocal(root = process.cwd()): void {
  const file = path.join(root, ".env.local");
  if (!fs.existsSync(file)) return;
  const text = fs.readFileSync(file, "utf-8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    } else if (value.includes(" #")) {
      value = value.split(" #", 1)[0].trim();
    }
    if (!key) continue;
    if (process.env[key] === undefined || process.env[key] === "") {
      process.env[key] = value;
    }
  }
}
