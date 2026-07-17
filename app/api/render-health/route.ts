import { NextResponse } from "next/server";
import {
  getBackendRootUrl,
  getFaosBackendBaseUrl,
  getBackendDocsUrl,
} from "@/lib/backend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RENDER_WAKE_TIMEOUT_MS = 60000;

/** Runtime proxy to Render GET / — avoids build-time rewrite env gaps. */
export async function GET() {
  const base = getFaosBackendBaseUrl();
  if (!base) {
    return NextResponse.json(
      {
        ok: false,
        error: "NEXT_PUBLIC_BACKEND_URL is not configured",
        hint: "Set https://faos-backend.onrender.com/api/v5 in Vercel env (no trailing slash)",
      },
      { status: 503 }
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RENDER_WAKE_TIMEOUT_MS);

  try {
    const upstream = await fetch(getBackendRootUrl(), {
      cache: "no-store",
      signal: controller.signal,
    });

    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") || "application/json",
        "X-FAOS-Upstream": "render",
        "X-FAOS-Backend-Url": base,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Render unreachable";
    const docsUrl = getBackendDocsUrl();
    return NextResponse.json(
      {
        ok: false,
        error: "Render backend wake-up failed or timed out",
        detail: message,
        backend_url: base,
        docs_url: docsUrl || null,
        hint: "Free-tier Render sleeps after ~15 min idle. Retry in 30–60 seconds.",
      },
      { status: 503 }
    );
  } finally {
    clearTimeout(timer);
  }
}
