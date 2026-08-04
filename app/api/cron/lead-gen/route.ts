import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/cron-auth";
import { runBulletseyeLeadGeneration } from "@/lib/ops-revenue-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Vercel Cron — BulletsEye background lead generation */
export async function GET(request: NextRequest) {
  const gate = assertCronAuthorized(request);
  if (!gate.ok) {
    return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
  }

  const useLlm = request.nextUrl.searchParams.get("use_llm") === "1";
  try {
    const result = await runBulletseyeLeadGeneration({ use_llm: useLlm });
    return NextResponse.json({
      cron: "lead-gen",
      zero_trust: true,
      ...result,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "lead-gen failed",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
