/**
 * Summarize multimodal attachments into lean context for Aigorithm prompts.
 * Avoids dumping huge base64 into models — metadata + optional short note only.
 */

export type PipelineAttachment = {
  id?: string;
  name?: string;
  kind?: string;
  mime?: string;
  size?: number;
  remote_url?: string;
  base64?: string;
  truncated?: boolean;
};

export function summarizeAttachmentsForPrompt(
  attachments: PipelineAttachment[] | undefined
): { count: number; contextBlock: string; leanAttachments: Array<Record<string, unknown>> } {
  const list = Array.isArray(attachments) ? attachments.slice(0, 4) : [];
  if (list.length === 0) {
    return { count: 0, contextBlock: "", leanAttachments: [] };
  }

  const lines = list.map((a, i) => {
    const parts = [
      `#${i + 1}`,
      a.kind || "file",
      a.name || "unnamed",
      a.mime || "",
      typeof a.size === "number" ? `${a.size}B` : "",
      a.remote_url ? `url=${a.remote_url}` : "",
      a.base64 ? "binary=attached" : "",
      a.truncated ? "truncated=true" : "",
    ].filter(Boolean);
    return `- ${parts.join(" · ")}`;
  });

  const leanAttachments = list.map((a) => ({
    id: a.id,
    name: a.name,
    kind: a.kind,
    mime: a.mime,
    size: a.size,
    remote_url: a.remote_url,
    has_base64: Boolean(a.base64),
    truncated: Boolean(a.truncated),
  }));

  return {
    count: list.length,
    contextBlock: `\n\n[Attached media for Aigorithm pipeline]\n${lines.join("\n")}`,
    leanAttachments,
  };
}
