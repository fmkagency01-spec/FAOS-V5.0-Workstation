/**
 * FAOS v6.0 — Approval & delivery gate
 */

import { deliverWebhook } from "@/faos_core/connectors/webhooks";
import type { ClientBrief, QaScore } from "@/faos_core/types";

export type ApprovalPacket = {
  status: "pending" | "approved" | "rejected" | "auto_approved";
  client_facing_output: string;
  ready_for_publish: boolean;
  webhook?: Awaited<ReturnType<typeof deliverWebhook>>;
};

export function formatClientFacingOutput(
  brief: ClientBrief,
  combinedText: string,
  qa: QaScore
): string {
  return [
    `# ${brief.title}`,
    ``,
    `**Brand:** ${brief.brand || "BulletsEye"}`,
    `**Category:** ${brief.category}`,
    `**QA Score:** ${qa.score}/100 (${qa.passed ? "PASS" : "NEEDS REVIEW"})`,
    ``,
    `## Brief`,
    brief.details,
    ``,
    `## Deliverable`,
    combinedText.trim(),
    ``,
    `---`,
    `_Prepared by FAOS v6.0 Approval Gate_`,
  ].join("\n");
}

export async function runApprovalGate(opts: {
  pipeline_id: string;
  brief: ClientBrief;
  combinedText: string;
  qa: QaScore;
  auto_approve?: boolean;
}): Promise<ApprovalPacket> {
  const clientFacing = formatClientFacingOutput(
    opts.brief,
    opts.combinedText,
    opts.qa
  );

  if (!opts.qa.passed) {
    return {
      status: "pending",
      client_facing_output: clientFacing,
      ready_for_publish: false,
    };
  }

  const auto = opts.auto_approve !== false;
  const status = auto ? "auto_approved" : "approved";

  const webhook = await deliverWebhook({
    event: "faos.pipeline.approved",
    pipeline_id: opts.pipeline_id,
    brand: opts.brief.brand,
    body: {
      title: opts.brief.title,
      category: opts.brief.category,
      qa_score: opts.qa.score,
      output: clientFacing,
    },
  });

  return {
    status,
    client_facing_output: clientFacing,
    ready_for_publish: true,
    webhook,
  };
}
