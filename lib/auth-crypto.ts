/**
 * Universal session crypto — Web Crypto API (works in Node 18+ and Edge middleware).
 *
 * Production MUST set FAOS_AUTH_SECRET in Vercel Environment Variables only
 * (never commit secrets to vercel.json or git).
 */

export type SessionPayload = {
  username: string;
  name: string;
  role: string;
  /** Multi-tenant client scope — e.g. "rr_wigs" for RR Wigs portal */
  tenant_id?: string;
  exp: number;
};

/** Resolve signing secret from env — dashboard/env only, no hardcoded fallback. */
export function getAuthSecretValue(): string {
  return process.env.FAOS_AUTH_SECRET?.trim() || "";
}

export function isAuthSecretConfigured(): boolean {
  return Boolean(process.env.FAOS_AUTH_SECRET?.trim());
}

async function hmacSign(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  const bytes = new Uint8Array(sig);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function encodePayload(payload: SessionPayload): string {
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodePayload(data: string): SessionPayload | null {
  try {
    const padded = data.replace(/-/g, "+").replace(/_/g, "/");
    const pad = padded.length % 4 === 0 ? padded : padded + "=".repeat(4 - (padded.length % 4));
    const json = atob(pad);
    return JSON.parse(json) as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSignedToken(payload: SessionPayload): Promise<string> {
  const secret = getAuthSecretValue();
  if (!secret) {
    throw new Error(
      "FAOS_AUTH_SECRET is not configured. Set it in Vercel Environment Variables and redeploy."
    );
  }
  const data = encodePayload(payload);
  const sig = await hmacSign(data, secret);
  return `${data}.${sig}`;
}

export async function verifySignedToken(
  token: string | undefined | null
): Promise<SessionPayload | null> {
  if (!token) return null;
  const secret = getAuthSecretValue();
  if (!secret) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [data, sig] = parts;

  const expected = await hmacSign(data, secret);
  if (sig !== expected) return null;

  const payload = decodePayload(data);
  if (!payload?.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
  if (!payload.username || !payload.role) return null;
  return payload;
}
