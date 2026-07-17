import { NextRequest, NextResponse } from "next/server";
import { fetchWorkflow } from "@/lib/workflow-api";
import { createInventoryLocal, listInventoryLocal } from "@/lib/erp-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { data } = await fetchWorkflow<{ inventory: unknown[] }>("inventory");
  if (data?.inventory) {
    return NextResponse.json({ ok: true, source: "render", inventory: data.inventory });
  }
  return NextResponse.json({ ok: true, source: "vercel-local", inventory: listInventoryLocal() });
}

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const { data } = await fetchWorkflow<{ item: unknown }>("inventory", {
    method: "POST",
    body: raw,
  });
  if (data?.item) {
    return NextResponse.json({ ok: true, source: "render", item: data.item });
  }
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(raw || "{}") as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const item = createInventoryLocal(body as Parameters<typeof createInventoryLocal>[0]);
  return NextResponse.json({ ok: true, source: "vercel-local", item });
}
