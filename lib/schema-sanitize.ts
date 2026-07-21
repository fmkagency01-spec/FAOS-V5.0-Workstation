/**
 * Strip sensitive patterns from JSON-LD / content before public injection.
 * Prevents accidental exposure of API keys, tokens, or env secrets in head tags.
 */

const SECRET_PATTERNS = [
  /\bsk-or-v1-[a-zA-Z0-9_-]{8,}\b/gi,
  /\bsk-[a-zA-Z0-9_-]{20,}\b/gi,
  /\bBearer\s+[a-zA-Z0-9._-]{20,}\b/gi,
  /\b(api[_-]?key|secret|token|password|authorization)\s*[:=]\s*["']?[^\s"']{8,}/gi,
  /\bOPENROUTER_API_KEY\b/gi,
  /\bFAOS_BACKEND_API_KEY\b/gi,
  /\bFAOS_AUTH_SECRET\b/gi,
];

export function sanitizePublicText(input: string): string {
  let out = input;
  for (const pattern of SECRET_PATTERNS) {
    out = out.replace(pattern, "[REDACTED]");
  }
  return out;
}

export function sanitizeJsonLd(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return sanitizePublicText(value);
  if (Array.isArray(value)) return value.map(sanitizeJsonLd);
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const clean: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      const lower = key.toLowerCase();
      if (
        lower.includes("api_key") ||
        lower.includes("apikey") ||
        lower.includes("secret") ||
        lower.includes("token") ||
        lower.includes("password") ||
        lower.includes("authorization")
      ) {
        continue;
      }
      clean[key] = sanitizeJsonLd(val);
    }
    return clean;
  }
  return value;
}

export function sanitizeSchemaBlocks<T extends { json_ld: Record<string, unknown> }>(
  blocks: T[]
): T[] {
  return blocks.map((block) => ({
    ...block,
    json_ld: sanitizeJsonLd(block.json_ld) as Record<string, unknown>,
  }));
}

/** Safe JSON string for dangerouslySetInnerHTML — blocks script breakout. */
export function safeJsonLdStringify(payload: Record<string, unknown>): string {
  const sanitized = sanitizeJsonLd(payload) as Record<string, unknown>;
  return JSON.stringify(sanitized).replace(/</g, "\\u003c");
}
