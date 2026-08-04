/**
 * FMK Aigorithm Knowledge Ingestion — auto-correct voice / business inputs
 * and persist into core memory (fmk_aigorithm_ai_brain by default).
 */

import { AI_MODELS } from "@/lib/ai-router";
import { appendCoreMemory } from "@/lib/core-memory";
import { pushLearningHubLocal } from "@/lib/learning-hub-store";
import { getOpenRouterApiKey, safeOpenRouterCall } from "@/lib/openrouter";
import { autoCorrectInput } from "@/lib/text-autocorrect";

export type IngestSource = "voice" | "business" | "manual" | "jarvis" | "cron";

export type AigorithmIngestResult = {
  ok: true;
  corrected: string;
  original: string;
  memory_entry_id: string;
  memory_namespace: string;
  learning_hub_id?: string;
  auto_corrected: boolean;
  used_llm: boolean;
  model?: string;
};

export { autoCorrectInput };

async function llmPolish(text: string): Promise<{ text: string; model?: string; used: boolean }> {
  if (!getOpenRouterApiKey()) return { text, used: false };
  if (text.length < 12) return { text, used: false };

  try {
    const result = await safeOpenRouterCall(
      [
        {
          role: "system",
          content:
            "You correct voice transcripts and business notes for FMK Group FAOS. " +
            "Fix spelling, ASR errors, and grammar. Preserve meaning and language (Bangla or English). " +
            "Return ONLY the corrected text — no quotes, no preamble.",
        },
        { role: "user", content: text.slice(0, 4000) },
      ],
      {
        model: AI_MODELS.geminiFlash,
        maxTokens: 500,
        temperature: 0.1,
        clientKey: "aigorithm-ingest",
        intent: "automation",
      }
    );
    const polished = autoCorrectInput(result.reply);
    return { text: polished || text, model: result.model, used: true };
  } catch {
    return { text, used: false };
  }
}

export async function ingestToAigorithm(input: {
  text: string;
  source?: IngestSource;
  title?: string;
  memory_namespace?: string;
  tags?: string[];
  use_llm?: boolean;
  mirror_learning_hub?: boolean;
}): Promise<AigorithmIngestResult> {
  const original = String(input.text || "").trim();
  if (!original) throw new Error("text is required");

  let corrected = autoCorrectInput(original);
  let usedLlm = false;
  let model: string | undefined;

  if (input.use_llm !== false) {
    const polished = await llmPolish(corrected);
    corrected = polished.text;
    usedLlm = polished.used;
    model = polished.model;
  }

  const ns = (input.memory_namespace || "fmk_aigorithm_ai_brain").trim();
  const source = input.source || "manual";
  const title =
    (input.title || "").trim() ||
    `Ingest · ${source} · ${corrected.slice(0, 48)}${corrected.length > 48 ? "…" : ""}`;

  const mem = appendCoreMemory(ns, {
    kind: source === "voice" ? "voice_command" : "business_input",
    content: corrected,
    source: `aigorithm_ingest:${source}`,
    meta: {
      original_preview: original.slice(0, 240),
      auto_corrected: corrected !== original,
      used_llm: usedLlm,
      model,
      tags: input.tags || [],
    },
  });

  // Mirror into Learning Hub as pending — Hermes/OpenClaw drains + re-ingests
  let learningHubId: string | undefined;
  if (input.mirror_learning_hub !== false) {
    try {
      const item = pushLearningHubLocal({
        title,
        kind: "note",
        content: corrected,
        memory_namespace: ns,
        pillar: "service",
        tags: ["aigorithm", "auto-ingest", source, ...(input.tags || [])],
        submitted_by: `aigorithm:${source}`,
        auto_ingest: false,
      });
      learningHubId = item.id;
    } catch {
      /* memory write already succeeded */
    }
  }

  return {
    ok: true,
    corrected,
    original,
    memory_entry_id: mem.id,
    memory_namespace: ns,
    learning_hub_id: learningHubId,
    auto_corrected: corrected !== original,
    used_llm: usedLlm,
    model,
  };
}
