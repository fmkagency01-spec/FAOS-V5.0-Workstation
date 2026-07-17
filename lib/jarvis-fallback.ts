import type { JarvisPlan } from "@/lib/jarvis-orchestrator";

/** Local replies when OpenRouter is unavailable — keeps JARVIS usable for greetings. */
export function jarvisOfflineReply(plan: JarvisPlan, gatewayError?: string): string | null {
  const q = plan.command.toLowerCase().trim();

  const isGreeting =
    /^(hey|hi|hello|yo|jarvis|good morning|good evening|good afternoon)\b/.test(q) ||
    /are you (there|online|ready|awake)/.test(q) ||
    /can you hear me/.test(q) ||
    q === "test";

  if (isGreeting) {
    const agent = plan.primary_agent;
    return [
      `Yes — JARVIS is online. ${agent.icon} ${agent.name} is standing by with 24 other shell agents.`,
      "Voice and chat are connected. Full AI intelligence will resume once the OpenRouter API key is updated in Vercel.",
      "Try: “create invoice for Acme $500”, “add stock item”, or “TAC status”.",
    ].join("\n\n");
  }

  if (gatewayError) return null;

  return null;
}
