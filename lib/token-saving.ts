import type { ChatMessage } from "@/lib/openrouter";

/** Global token-saving mode — agents never run in wasteful loop mode */
export function isTokenSavingMode(): boolean {
  return process.env.FAOS_TOKEN_SAVING_MODE?.trim().toLowerCase() !== "false";
}

export function getTokenSavingDefaults() {
  const saving = isTokenSavingMode();
  return {
    tokenSavingMode: saving,
    maxTokens: saving
      ? Number(process.env.FAOS_MAX_OUTPUT_TOKENS || 280)
      : Number(process.env.FAOS_MAX_OUTPUT_TOKENS || 700),
    temperature: saving ? 0.25 : 0.4,
    maxContextMessages: saving ? 4 : 12,
    systemPromptLean: saving,
  };
}

/** Trim conversation to lean context — prevents token bubble drain */
export function trimMessagesForTokenSaving(
  messages: ChatMessage[],
  maxMessages = getTokenSavingDefaults().maxContextMessages
): ChatMessage[] {
  if (!isTokenSavingMode() || messages.length <= maxMessages) {
    return messages;
  }
  const system = messages.filter((m) => m.role === "system").slice(0, 1);
  const rest = messages.filter((m) => m.role !== "system");
  const tail = rest.slice(-Math.max(1, maxMessages - system.length));
  return [...system, ...tail];
}

export const TOKEN_SAVING_SYSTEM_HINT =
  "TOKEN-SAVING MODE: Be concise. Max useful output. No repetition. No loops.";
