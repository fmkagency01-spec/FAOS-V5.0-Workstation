/**
 * Browser-side mirror for JARVIS chat — survives refresh when server /tmp
 * is wiped (Vercel multi-instance). Server remains source of truth when available.
 */

export type CachedJarvisMessage = {
  role: "user" | "jarvis" | "system" | "assistant";
  text: string;
  meta?: string;
};

export type CachedJarvisSession = {
  session_id: string;
  updated_at: string;
  messages: CachedJarvisMessage[];
};

const KEY = "faos.jarvis.active_session.v1";
const MAX_MESSAGES = 80;

export function loadJarvisSessionCache(): CachedJarvisSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedJarvisSession;
    if (!parsed?.session_id || !Array.isArray(parsed.messages)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveJarvisSessionCache(input: {
  session_id: string;
  messages: CachedJarvisMessage[];
}): void {
  if (typeof window === "undefined") return;
  try {
    const payload: CachedJarvisSession = {
      session_id: input.session_id,
      updated_at: new Date().toISOString(),
      messages: input.messages.slice(-MAX_MESSAGES),
    };
    localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function clearJarvisSessionCache(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
