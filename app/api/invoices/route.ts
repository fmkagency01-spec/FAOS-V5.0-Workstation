import { NextRequest, NextResponse } from "next/server";
import { fetchWorkflow } from "@/lib/workflow-api";
import { createInvoiceLocal, listInvoicesLocal } from "@/lib/erp-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { data } = await fetchWorkflow<{ invoices: unknown[] }>("invoices");
  if (data?.invoices) {
    return NextResponse.json({ ok: true, source: "render", invoices: data.invoices });
  }
  return NextResponse.json({ ok: true, source: "vercel-local", invoices: listInvoicesLocal() });
}

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const { data } = await fetchWorkflow<{ invoice: unknown }>("invoices", {
    method: "POST",
    body: raw,
  });
  if (data?.invoice) {
    return NextResponse.json({ ok: true, source: "render", invoice: data.invoice });
  }
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(raw || "{}") as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const invoice = createInvoiceLocal(body as Parameters<typeof createInvoiceLocal>[0]);
  return NextResponse.json({ ok: true, source: "vercel-local", invoice });
}
