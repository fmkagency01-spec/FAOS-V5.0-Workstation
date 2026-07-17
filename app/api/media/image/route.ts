import { NextRequest, NextResponse } from "next/server";
import { generateImage } from "@/lib/media-generation";
import { OpenRouterGuardError, resolveClientKeyFromHeaders } from "@/lib/openrouter-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: { prompt?: string };
  try {
    body = (await request.json()) as { prompt?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const prompt = body.prompt?.trim();
  if (!prompt) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  try {
    const clientKey = resolveClientKeyFromHeaders(request.headers);
    const result = await generateImage(prompt, clientKey);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof OpenRouterGuardError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 429 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Image generation failed" },
      { status: 502 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/media/image",
    model: process.env.FAOS_IMAGE_MODEL || "black-forest-labs/flux-1.1-pro",
  });
}
