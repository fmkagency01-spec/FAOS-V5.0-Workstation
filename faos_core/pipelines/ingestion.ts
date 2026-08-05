/**
 * FAOS v6.0 — Ingestion layer for client briefs
 */

import type { ClientBrief, TaskCategory } from "@/faos_core/types";

const CATEGORY_HINTS: Array<{ category: TaskCategory; patterns: RegExp[] }> = [
  {
    category: "smm",
    patterns: [/social|instagram|facebook|tiktok|hashtag|smm|content calendar/i],
  },
  {
    category: "performance_marketing",
    patterns: [/ads?|media buy|roas|cpc|performance|campaign|google ads|meta ads/i],
  },
  {
    category: "video_scripting",
    patterns: [/video|reel|script|storyboard|youtube|capcut/i],
  },
  {
    category: "design_brief",
    patterns: [/design|banner|logo|creative|visual|brand kit/i],
  },
  {
    category: "seo_geo",
    patterns: [/seo|geo|fan-?out|schema|citation|ai overview|bulletseye/i],
  },
];

export function detectTaskCategory(text: string): TaskCategory {
  for (const hint of CATEGORY_HINTS) {
    if (hint.patterns.some((p) => p.test(text))) return hint.category;
  }
  return "general";
}

export type IngestInput = {
  title?: string;
  details: string;
  brand?: string;
  category?: TaskCategory;
  priority?: ClientBrief["priority"];
  agent_ids?: string[];
  client_facing?: boolean;
  metadata?: Record<string, unknown>;
};

export function ingestClientBrief(input: IngestInput): ClientBrief {
  const details = (input.details || "").trim();
  if (!details) {
    throw new Error("Brief details are required");
  }

  const category = input.category || detectTaskCategory(details);
  const title =
    (input.title || "").trim() ||
    `${category.replace(/_/g, " ")} · ${details.slice(0, 48)}`;

  return {
    brief_id: `brief_${Date.now().toString(36)}`,
    brand: input.brand || "BulletsEye",
    category,
    title,
    details,
    priority: input.priority || "normal",
    agent_ids: input.agent_ids,
    client_facing: input.client_facing ?? true,
    metadata: input.metadata,
  };
}
