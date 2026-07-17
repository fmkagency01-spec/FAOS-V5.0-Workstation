import { NextRequest, NextResponse } from "next/server";
import { generateVideoPlan } from "@/lib/media-generation";
import { OpenRouterGuardError, resolveClientKeyFromHeaders } from "@/lib/openrouter-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: { brief?: string };
  try {
    body = (await request.json()) as { brief?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const brief = body.brief?.trim();
  if (!brief) {
    return NextResponse.json({ error: "brief is required" }, { status: 400 });
  }

  try {
    const clientKey = resolveClientKeyFromHeaders(request.headers);
    const result = await generateVideoPlan(brief, clientKey);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof OpenRouterGuardError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 429 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Video plan failed" },
      { status: 502 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/media/video",
    delivers: ["hook", "scenes", "edit notes", "captions", "CapCut/FFmpeg checklist"],
  });
}
