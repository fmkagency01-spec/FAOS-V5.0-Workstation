/**
 * Client-side attachment helpers for multimodal workstation prompts.
 * Files stay in-browser until submitted; only metadata + optional base64
 * (capped) are sent to server routes — never store secrets in attachments.
 */

export type AttachmentKind = "image" | "pdf" | "audio" | "video_link" | "file";

export type PromptAttachment = {
  id: string;
  name: string;
  kind: AttachmentKind;
  mime: string;
  size: number;
  /** Object URL for local preview thumbnails */
  previewUrl?: string;
  /** Optional remote URL (YouTube, Drive, etc.) */
  remoteUrl?: string;
  /** Base64 payload for small images/PDFs (stripped of data: prefix) */
  base64?: string;
  truncated?: boolean;
};

export const ATTACHMENT_LIMITS = {
  maxFiles: 4,
  maxBytesPerFile: 2 * 1024 * 1024, // 2 MB client encode cap
  maxBase64Chars: 1_800_000,
  allowedMimePrefixes: ["image/", "application/pdf", "audio/"],
} as const;

export function classifyAttachment(mime: string, name: string): AttachmentKind {
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf" || name.toLowerCase().endsWith(".pdf")) return "pdf";
  if (mime.startsWith("audio/")) return "audio";
  return "file";
}

export function isAllowedFile(file: File): boolean {
  if (file.size > ATTACHMENT_LIMITS.maxBytesPerFile) return false;
  return ATTACHMENT_LIMITS.allowedMimePrefixes.some(
    (p) => file.type.startsWith(p) || (p === "application/pdf" && file.type === "application/pdf")
  );
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export async function fileToAttachment(file: File): Promise<PromptAttachment> {
  const kind = classifyAttachment(file.type, file.name);
  const previewUrl = URL.createObjectURL(file);
  let base64: string | undefined;
  let truncated = false;

  if (file.size <= ATTACHMENT_LIMITS.maxBytesPerFile) {
    const dataUrl = await readAsDataUrl(file);
    const comma = dataUrl.indexOf(",");
    const raw = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
    if (raw.length > ATTACHMENT_LIMITS.maxBase64Chars) {
      truncated = true;
    } else {
      base64 = raw;
    }
  } else {
    truncated = true;
  }

  return {
    id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: file.name.slice(0, 180),
    kind,
    mime: file.type || "application/octet-stream",
    size: file.size,
    previewUrl,
    base64,
    truncated,
  };
}

export function videoLinkAttachment(url: string): PromptAttachment | null {
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  return {
    id: `att_link_${Date.now()}`,
    name: trimmed.slice(0, 80),
    kind: "video_link",
    mime: "text/uri-list",
    size: trimmed.length,
    remoteUrl: trimmed,
  };
}

export function revokeAttachmentPreview(att: PromptAttachment): void {
  if (att.previewUrl?.startsWith("blob:")) {
    URL.revokeObjectURL(att.previewUrl);
  }
}

export function attachmentsToApiPayload(atts: PromptAttachment[]) {
  return atts.map((a) => ({
    id: a.id,
    name: a.name,
    kind: a.kind,
    mime: a.mime,
    size: a.size,
    remote_url: a.remoteUrl,
    base64: a.base64,
    truncated: a.truncated,
  }));
}

export type ApiAttachment = ReturnType<typeof attachmentsToApiPayload>[number];
