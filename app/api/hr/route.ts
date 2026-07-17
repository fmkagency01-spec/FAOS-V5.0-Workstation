import { NextRequest, NextResponse } from "next/server";
import { fetchWorkflow } from "@/lib/workflow-api";
import { createEmployeeLocal, listEmployeesLocal } from "@/lib/erp-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { data } = await fetchWorkflow<{ employees: unknown[] }>("employees");
  if (data?.employees) {
    return NextResponse.json({ ok: true, source: "render", employees: data.employees });
  }
  return NextResponse.json({ ok: true, source: "vercel-local", employees: listEmployeesLocal() });
}

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const { data } = await fetchWorkflow<{ employee: unknown }>("employees", {
    method: "POST",
    body: raw,
  });
  if (data?.employee) {
    return NextResponse.json({ ok: true, source: "render", employee: data.employee });
  }
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(raw || "{}") as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const employee = createEmployeeLocal(body as Parameters<typeof createEmployeeLocal>[0]);
  return NextResponse.json({ ok: true, source: "vercel-local", employee });
}
