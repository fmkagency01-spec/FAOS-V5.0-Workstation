import { NextRequest, NextResponse } from "next/server";
import { fetchWorkflow } from "@/lib/workflow-api";
import { createClientLocal, listClientsLocal } from "@/lib/workflow-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { data, upstream } = await fetchWorkflow<{ clients: unknown[] }>("clients");
  if (data?.clients) {
    return NextResponse.json({ ok: true, source: "render", clients: data.clients });
  }
  return NextResponse.json({
    ok: true,
    source: upstream ? "vercel-local-fallback" : "vercel-local",
    clients: listClientsLocal(),
  });
}

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const { data } = await fetchWorkflow<{ client: unknown }>("clients", {
    method: "POST",
    body: raw,
  });
  if (data?.client) {
    return NextResponse.json({ ok: true, source: "render", client: data.client });
  }
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(raw || "{}") as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const client = createClientLocal({
    name: typeof body.name === "string" ? body.name : undefined,
    industry: typeof body.industry === "string" ? body.industry : undefined,
    contact_email: typeof body.contact_email === "string" ? body.contact_email : undefined,
    notes: typeof body.notes === "string" ? body.notes : undefined,
    assigned_agent: typeof body.assigned_agent === "string" ? body.assigned_agent : undefined,
  });
  return NextResponse.json({ ok: true, source: "vercel-local", client });
}
