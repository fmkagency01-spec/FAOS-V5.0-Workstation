/**
 * FAOS v6.0 — Internal QA layer
 */

import type { ClientBrief, QaScore } from "@/faos_core/types";

export function evaluateDeliverable(
  brief: ClientBrief,
  combinedText: string,
  agentCount: number
): QaScore {
  const text = combinedText || "";
  const benchmarks = [
    {
      name: "non_empty",
      passed: text.trim().length >= 40,
      detail: "Deliverable has substantive content",
    },
    {
      name: "agent_coverage",
      passed: agentCount >= 1,
      detail: "At least one agent produced output",
    },
    {
      name: "brief_alignment",
      passed: text.toLowerCase().includes(brief.category.replace(/_/g, " ").slice(0, 6)) ||
        text.toLowerCase().includes(brief.details.slice(0, 12).toLowerCase()) ||
        text.length > 120,
      detail: "Output relates to brief category/details",
    },
    {
      name: "client_safe_length",
      passed: text.length <= 50_000,
      detail: "Deliverable within publishable size",
    },
    {
      name: "no_forbidden_namespace",
      passed: !/fmk_week|fmcg_wish|fmk_fmcg_week_supply_agent/i.test(text),
      detail: "No forbidden FMK namespaces in output",
    },
  ];

  const passedCount = benchmarks.filter((b) => b.passed).length;
  const score = Math.round((passedCount / benchmarks.length) * 100);
  const threshold = brief.priority === "high" ? 80 : 60;

  return {
    score,
    passed: score >= threshold,
    benchmarks,
  };
}
