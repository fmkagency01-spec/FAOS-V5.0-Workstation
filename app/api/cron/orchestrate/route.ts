import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/cron-auth";
import { runHermesOpenClawRouter } from "@/lib/hermes-openclaw";
import { runOrchestrateTickLocal } from "@/lib/orchestrate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Vercel Cron — Hermes/OpenClaw 24/7 background task routing.
 * Also kicks a lean orchestrate tick when ?full=1.
 */
export async function GET(request: NextRequest) {
  const gate = assertCronAuthorized(request);
  if (!gate.ok) {
    return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
  }

  const useLlm = request.nextUrl.searchParams.get("use_llm") === "1";
  const full = request.nextUrl.searchParams.get("full") === "1";

  try {
    if (full) {
      const tick = await runOrchestrateTickLocal({
        use_llm: useLlm,
        jobs: [
          "hermes_openclaw_router",
          "bulletseye_lead_gen",
          "fmk_media_content_draft",
          "learning_hub_ingest_pending",
        ],
      });
      return NextResponse.json({
        cron: "orchestrate",
        zero_trust: true,
        mode: "full_tick",
        ...tick,
      });
    }

    const routed = await runHermesOpenClawRouter({ use_llm: useLlm });
    return NextResponse.json({
      cron: "orchestrate",
      zero_trust: true,
      mode: "hermes_openclaw",
      ...routed,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "orchestrate cron failed",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
