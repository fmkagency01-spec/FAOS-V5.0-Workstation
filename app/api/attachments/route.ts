import { NextRequest, NextResponse } from "next/server";
import { ATTACHMENT_LIMITS } from "@/lib/attachments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IncomingAttachment = {
  id?: string;
  name?: string;
  kind?: string;
  mime?: string;
  size?: number;
  remote_url?: string;
  base64?: string;
  truncated?: boolean;
};

/**
 * Validate multimodal attachment payloads before they hit Aigorithm / OpenRouter.
 * Does not persist blobs — returns sanitized metadata for pipeline handoff.
 */
export async function POST(request: NextRequest) {
  let body: { attachments?: IncomingAttachment[] };
  try {
    body = (await request.json()) as { attachments?: IncomingAttachment[] };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const raw = Array.isArray(body.attachments) ? body.attachments : [];
  if (raw.length === 0) {
    return NextResponse.json({ error: "Provide attachments[]." }, { status: 400 });
  }
  if (raw.length > ATTACHMENT_LIMITS.maxFiles) {
    return NextResponse.json(
      { error: `Max ${ATTACHMENT_LIMITS.maxFiles} attachments.` },
      { status: 400 }
    );
  }

  const sanitized = [];
  for (const item of raw) {
    const name = String(item.name || "file").slice(0, 180);
    const mime = String(item.mime || "application/octet-stream").slice(0, 120);
    const kind = String(item.kind || "file").slice(0, 40);
    const size = Number(item.size || 0);
    const remoteUrl =
      typeof item.remote_url === "string" && /^https?:\/\//i.test(item.remote_url)
        ? item.remote_url.slice(0, 2000)
        : undefined;

    if (size > ATTACHMENT_LIMITS.maxBytesPerFile && !remoteUrl) {
      return NextResponse.json(
        { error: `${name} exceeds ${ATTACHMENT_LIMITS.maxBytesPerFile} bytes.` },
        { status: 400 }
      );
    }

    let base64: string | undefined;
    if (typeof item.base64 === "string" && item.base64.length > 0) {
      if (item.base64.length > ATTACHMENT_LIMITS.maxBase64Chars) {
        return NextResponse.json(
          { error: `${name} base64 payload too large.` },
          { status: 400 }
        );
      }
      base64 = item.base64;
    }

    sanitized.push({
      id: String(item.id || `att_${sanitized.length + 1}`),
      name,
      kind,
      mime,
      size,
      remote_url: remoteUrl,
      has_base64: Boolean(base64),
      base64_bytes_est: base64 ? Math.floor((base64.length * 3) / 4) : 0,
      truncated: Boolean(item.truncated),
      // Echo base64 only when present — caller / jarvis pipeline consumes it
      base64,
    });
  }

  return NextResponse.json({
    ok: true,
    pipeline: "aigorithm_multimodal",
    count: sanitized.length,
    attachments: sanitized,
    token_note: "Attachment metadata only — OpenRouter keys never leave server env.",
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/attachments",
    limits: ATTACHMENT_LIMITS,
    accepted: ["image/*", "application/pdf", "audio/*", "https video links"],
  });
}
