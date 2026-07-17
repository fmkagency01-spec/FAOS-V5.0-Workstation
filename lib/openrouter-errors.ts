/** Map cryptic OpenRouter HTTP errors to actionable FAOS messages. */
export function formatOpenRouterError(raw: string, status?: number): string {
  const lower = raw.toLowerCase();

  if (lower.includes("user not found")) {
    return (
      "AI gateway key is invalid or expired. Update OPENROUTER_API_KEY in Vercel " +
      "→ Project Settings → Environment Variables, then redeploy."
    );
  }

  if (lower.includes("not configured")) {
    return raw;
  }

  if (status === 401 || status === 403) {
    return `OpenRouter authentication failed (${status}). Check OPENROUTER_API_KEY in Vercel.`;
  }

  if (status === 429) {
    return "OpenRouter rate limit reached. Wait a moment and try again.";
  }

  return raw;
}

export function isOpenRouterAuthError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("user not found") ||
    lower.includes("not configured") ||
    lower.includes("authentication failed")
  );
}
