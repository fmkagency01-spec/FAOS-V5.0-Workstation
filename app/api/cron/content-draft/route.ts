import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/cron-auth";
import { runFmkMediaContentDrafting } from "@/lib/ops-revenue-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Vercel Cron — FMK Media / Editing Hub content drafting */
export async function GET(request: NextRequest) {
  const gate = assertCronAuthorized(request);
  if (!gate.ok) {
    return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
  }

  const useLlm = request.nextUrl.searchParams.get("use_llm") === "1";
  try {
    const result = await runFmkMediaContentDrafting({ use_llm: useLlm });
    return NextResponse.json({
      cron: "content-draft",
      zero_trust: true,
      ...result,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "content-draft failed",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
