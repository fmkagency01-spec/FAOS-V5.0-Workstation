/**
 * Deterministic voice / business text autocorrect (no network).
 * Shared by Aigorithm ingest + Learning Hub.
 */

import { redactSecrets } from "@/lib/core-memory";

const ASR_FIXES: Array<[RegExp, string]> = [
  [/\bjavis\b/gi, "JARVIS"],
  [/\bjar vies\b/gi, "JARVIS"],
  [/\bbullets?\s*eye\b/gi, "BulletsEye"],
  [/\bfmk\s+week\b/gi, "FMK WIG"],
  [/\bfmcg\s+wish\b/gi, "FMK WIG"],
  [/\baigorithm\b/gi, "Aigorithm"],
  [/\bhermes\s+open\s*claw\b/gi, "Hermes/OpenClaw"],
  [/\s{2,}/g, " "],
];

export function autoCorrectInput(raw: string): string {
  let text = redactSecrets(String(raw || "").trim());
  for (const [pattern, replacement] of ASR_FIXES) {
    text = text.replace(pattern, replacement);
  }
  text = text
    .replace(/\s+([,.!?])/g, "$1")
    .replace(/([.!?])([A-Za-z])/g, "$1 $2")
    .trim();
  return text.slice(0, 20000);
}
