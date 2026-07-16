import { NextResponse } from "next/server";
import { getFmkWigContext } from "@/lib/create-pillar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Explicit FMK WIG lock — brand_name FMK WIG / namespace fmk_wig_prosthetic_hair_agent */
export async function GET() {
  return NextResponse.json({
    ok: true,
    ...getFmkWigContext(),
  });
}
