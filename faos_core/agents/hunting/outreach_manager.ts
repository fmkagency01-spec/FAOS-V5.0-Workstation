import type { HuntingBrand } from "@/faos_core/config/brands";
import type { ContentAsset } from "@/faos_core/agents/hunting/copywriter";
import type { ProspectRow } from "@/faos_core/agents/hunting/prospector";

export type OutreachActionItem = {
  id: string;
  prospect_id: string;
  channel: string;
  step: "day_0_send" | "day_3_followup" | "day_7_breakup";
  message_preview: string;
  status: "queued";
};

export type OutreachPacket = {
  sequences: OutreachActionItem[];
  formatted_messages: Array<{
    prospect_id: string;
    channel: string;
    subject_or_hook: string;
    body: string;
  }>;
};

/** Format outbound messages and track a simple follow-up sequence. */
export function runOutreachManager(
  brand: HuntingBrand,
  prospects: ProspectRow[],
  assets: ContentAsset[]
): OutreachPacket {
  const emails = assets.filter((a) => a.type === "cold_email");
  const formatted_messages = prospects.slice(0, emails.length || prospects.length).map((p, i) => {
    const asset = emails[i] || assets[i];
    const body = asset?.body || `${brand.display_name} outreach for ${p.niche}`;
    const firstLine = body.split("\n").find((l) => l.trim()) || body;
    return {
      prospect_id: p.id,
      channel: p.channel,
      subject_or_hook: firstLine.replace(/^Subject:\s*/i, "").slice(0, 120),
      body,
    };
  });

  const sequences: OutreachActionItem[] = [];
  for (const msg of formatted_messages) {
    sequences.push(
      {
        id: `seq_${msg.prospect_id}_d0`,
        prospect_id: msg.prospect_id,
        channel: msg.channel,
        step: "day_0_send",
        message_preview: msg.subject_or_hook,
        status: "queued",
      },
      {
        id: `seq_${msg.prospect_id}_d3`,
        prospect_id: msg.prospect_id,
        channel: msg.channel,
        step: "day_3_followup",
        message_preview: `Follow-up: still open to ${brand.core_services[0]}?`,
        status: "queued",
      },
      {
        id: `seq_${msg.prospect_id}_d7`,
        prospect_id: msg.prospect_id,
        channel: msg.channel,
        step: "day_7_breakup",
        message_preview: "Breakup: closing the loop — reply if timing improves.",
        status: "queued",
      }
    );
  }

  return { sequences, formatted_messages };
}
