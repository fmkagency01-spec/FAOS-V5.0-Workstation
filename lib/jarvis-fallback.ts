import type { JarvisPlan } from "@/lib/jarvis-orchestrator";

/**
 * Local replies when OpenRouter is unavailable.
 * Always returns a useful agent-status reply so the dashboard never goes silent.
 */
export function jarvisOfflineReply(plan: JarvisPlan, gatewayError?: string): string | null {
  const q = plan.command.toLowerCase().trim();
  const agent = plan.primary_agent;
  const support = plan.supporting_agents
    .map((a) => `${a.icon} ${a.name}`)
    .join(", ");

  const isGreeting =
    /^(hey|hi|hello|yo|jarvis|good morning|good evening|good afternoon)\b/.test(q) ||
    /are you (there|online|ready|awake)/.test(q) ||
    /can you hear me/.test(q) ||
    q === "test";

  if (isGreeting) {
    return [
      `Yes — JARVIS is online. ${agent.icon} ${agent.name} is standing by with the full shell-agent fleet.`,
      support ? `Support on deck: ${support}.` : "",
      gatewayError
        ? "Live LLM gateway is recovering — agents still accept commands (ERP / assign / autonomous tick)."
        : "Voice and chat are connected.",
      "Try: “TAC status”, “create invoice for Acme $500”, “run autonomous tick”, or “SEO scan FMK WIG”.",
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  const errHint = gatewayError
    ? `\n\nGateway note: ${gatewayError.slice(0, 220)}`
    : "";

  return [
    `JARVIS routed your command to ${agent.icon} ${agent.name} (${agent.domain}).`,
    support ? `Supporting agents: ${support}.` : "",
    plan.action.type !== "none"
      ? `Queued action: ${plan.action.type.replace(/_/g, " ")}.`
      : "No ERP mutation detected — treating as orchestrator briefing.",
    "Autonomous workers (Harness Alpha/Beta/Gamma + BulletsEye SEO/GEO) continue on the 24/7 Matrix loop even when chat is degraded.",
    "If this was unexpected silence, refresh and retry — model routing auto-falls back to a live OpenRouter endpoint.",
  ]
    .filter(Boolean)
    .join(" ")
    .concat(errHint);
}
