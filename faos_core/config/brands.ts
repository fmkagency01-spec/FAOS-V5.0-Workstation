/**
 * Multi-brand client hunting configuration (FMK Agency · BulletsEye · FMK WIG).
 */

import brandsDb from "@/data/faos_hunting_brands.json";

export type HuntingBrandId = "fmk_agency" | "bulletseye" | "fmk_wig";

export type HuntingBrand = {
  id: HuntingBrandId;
  display_name: string;
  hub: string;
  lead_agent_id: string;
  namespace: string;
  brand_lock?: string;
  target_audience: string;
  core_services: string[];
  outreach_channels: string[];
  icp_niches: string[];
};

export const HUNTING_BRAND_IDS: HuntingBrandId[] = [
  "fmk_agency",
  "bulletseye",
  "fmk_wig",
];

export function listHuntingBrands(): HuntingBrand[] {
  const root = brandsDb.brands as Record<string, HuntingBrand>;
  return HUNTING_BRAND_IDS.map((id) => root[id]).filter(Boolean);
}

export function getHuntingBrand(id: string): HuntingBrand | null {
  const key = id.trim().toLowerCase().replace(/\s+/g, "_");
  const aliases: Record<string, HuntingBrandId> = {
    fmk_agency: "fmk_agency",
    agency: "fmk_agency",
    fmkagency: "fmk_agency",
    bulletseye: "bulletseye",
    bullets_eye: "bulletseye",
    "bullets-eye": "bulletseye",
    fmk_wig: "fmk_wig",
    fmk_wigs: "fmk_wig",
    wig: "fmk_wig",
    "fmk wig": "fmk_wig",
  };
  const resolved = aliases[key] || (HUNTING_BRAND_IDS.includes(key as HuntingBrandId) ? (key as HuntingBrandId) : null);
  if (!resolved) return null;
  const brand = (brandsDb.brands as Record<string, HuntingBrand>)[resolved];
  return brand || null;
}

/** Infer brand from free text; defaults to bulletseye for agency-style briefs. */
export function identifyHuntingBrand(input: string): HuntingBrand {
  const lower = input.toLowerCase();
  if (/fmk\s*wig|prosthetic|hair system|toupee|salon\s*order/.test(lower)) {
    return getHuntingBrand("fmk_wig")!;
  }
  if (/fmk\s*agency|full[- ]stack|ai agent setup|custom software/.test(lower)) {
    return getHuntingBrand("fmk_agency")!;
  }
  if (/bulletseye|performance marketing|meta ads|google ads|cro|media buying/.test(lower)) {
    return getHuntingBrand("bulletseye")!;
  }
  return getHuntingBrand("bulletseye")!;
}

export function huntingBrandsConfig() {
  return {
    version: brandsDb.version,
    module: brandsDb.module,
    brands: listHuntingBrands(),
  };
}
