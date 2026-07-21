import { NextRequest, NextResponse } from "next/server";
import { addRrInquiry } from "@/lib/b2b-wig-store";
import {
  getFaosBackendBaseUrl,
  getBackendAuthHeaders,
  joinBackendUrl,
} from "@/lib/backend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function fetchRender(path: string, init?: RequestInit): Promise<Response | null> {
  const base = getFaosBackendBaseUrl();
  if (!base) return null;
  try {
    return await fetch(joinBackendUrl(path), {
      ...init,
      cache: "no-store",
      headers: getBackendAuthHeaders(init?.headers),
    });
  } catch {
    return null;
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/apps/rr-wigs/inquiry",
    method: "POST",
    tenant: "rr_wigs",
    fields: ["company", "contact_email", "message", "source"],
  });
}

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const upstream = await fetchRender("apps/rr-wigs/inquiry", {
    method: "POST",
    body: raw,
  });
  if (upstream?.ok) {
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") || "application/json",
        "X-FAOS-Upstream": "render",
      },
    });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw || "{}") as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.company || !body.contact_email) {
    return NextResponse.json(
      { error: "company and contact_email required" },
      { status: 400 }
    );
  }

  const inquiry = addRrInquiry({
    company: String(body.company),
    contact_email: String(body.contact_email),
    message: String(body.message || ""),
    source: String(body.source || "website_form"),
  });

  return NextResponse.json({ ok: true, inquiry, source: "vercel-local" }, { status: 201 });
}
