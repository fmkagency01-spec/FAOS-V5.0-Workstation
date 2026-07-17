import { getOpenRouterApiKey } from "@/lib/openrouter";

export type OpenRouterProbe = {
  configured: boolean;
  status: "valid" | "invalid" | "missing" | "unknown";
  message?: string;
};

/** Lightweight auth check — GET /models avoids token spend. */
export async function probeOpenRouterKey(): Promise<OpenRouterProbe> {
  const key = getOpenRouterApiKey();
  if (!key) {
    return {
      configured: false,
      status: "missing",
      message: "OPENROUTER_API_KEY is not set",
    };
  }

  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    });

    if (res.ok) {
      return { configured: true, status: "valid" };
    }

    let detail = `OpenRouter responded ${res.status}`;
    try {
      const data = (await res.json()) as { error?: { message?: string } };
      if (data?.error?.message) detail = data.error.message;
    } catch {
      /* ignore */
    }

    const invalid =
      res.status === 401 ||
      detail.toLowerCase().includes("user not found") ||
      detail.toLowerCase().includes("invalid");

    return {
      configured: true,
      status: invalid ? "invalid" : "unknown",
      message:
        invalid
          ? "API key expired or invalid — regenerate at openrouter.ai/settings/keys"
          : detail,
    };
  } catch (err) {
    return {
      configured: true,
      status: "unknown",
      message: err instanceof Error ? err.message : "OpenRouter probe failed",
    };
  }
}
