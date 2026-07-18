import { NextResponse } from "next/server";
import {
  joinBackendUrl,
  getFaosBackendBaseUrl,
  getBackendAuthHeaders,
} from "@/lib/backend";
import { getFmkWigContext } from "@/lib/create-pillar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Explicit FMK WIG lock — brand_name FMK WIG / namespace fmk_wig_prosthetic_hair_agent */
export async function GET() {
  const base = getFaosBackendBaseUrl();
  if (base) {
    try {
      const upstream = await fetch(joinBackendUrl("create-pillar/fmk-wig"), {
        cache: "no-store",
        headers: getBackendAuthHeaders(),
      });
      if (upstream.ok) {
        return new NextResponse(await upstream.text(), {
          status: upstream.status,
          headers: {
            "Content-Type":
              upstream.headers.get("Content-Type") || "application/json",
            "X-FAOS-Upstream": "render",
          },
        });
      }
    } catch {
      /* fall through to local lock payload */
    }
  }

  return NextResponse.json({
    ok: true,
    source: "vercel-local",
    ...getFmkWigContext(),
  });
}
