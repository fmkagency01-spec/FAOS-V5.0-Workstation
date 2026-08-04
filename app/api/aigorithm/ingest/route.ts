import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { ingestToAigorithm } from "@/lib/aigorithm-ingest";
import { isSuperAdmin } from "@/lib/rbac-guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Aigorithm Knowledge Ingestion — autocorrect voice/business inputs → core memory.
 * Super Admin / team_lead / manager may push; clients blocked by middleware RBAC.
 */
export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: {
    text?: string;
    source?: "voice" | "business" | "manual" | "jarvis";
    title?: string;
    memory_namespace?: string;
    tags?: string[];
    use_llm?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.text?.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  // Voice → Aigorithm brain is default; brand namespaces allowed for owners
  const ns = body.memory_namespace?.trim();
  if (ns && ns !== "fmk_aigorithm_ai_brain" && !isSuperAdmin(session.role)) {
    return NextResponse.json(
      { error: "Only Super Admin may target non-Aigorithm namespaces" },
      { status: 403 }
    );
  }

  try {
    const result = await ingestToAigorithm({
      text: body.text,
      source: body.source || "manual",
      title: body.title,
      memory_namespace: ns || "fmk_aigorithm_ai_brain",
      tags: body.tags,
      use_llm: body.use_llm,
      mirror_learning_hub: true,
    });
    return NextResponse.json({
      ...result,
      submitted_by: session.username,
      zero_trust: true,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "ingest failed" },
      { status: 400 }
    );
  }
}
