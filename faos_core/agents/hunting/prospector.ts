import type { HuntingBrand } from "@/faos_core/config/brands";

export type ProspectRow = {
  id: string;
  niche: string;
  persona: string;
  channel: string;
  intent: string;
  brand: string;
};

/** Collect niche ICP prospects for the selected hunting brand (no fake PII). */
export function runProspector(
  brand: HuntingBrand,
  opts?: { limit?: number; brief?: string }
): ProspectRow[] {
  const limit = Math.max(1, Math.min(opts?.limit ?? 5, 12));
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const channels = brand.outreach_channels;
  const niches = brand.icp_niches.length
    ? brand.icp_niches
    : [brand.target_audience];

  const rows: ProspectRow[] = [];
  for (let i = 0; i < limit; i += 1) {
    const niche = niches[i % niches.length];
    const channel = channels[i % channels.length];
    rows.push({
      id: `prospect_${brand.id}_${day}_${i + 1}`,
      niche,
      persona: `${brand.display_name} ICP #${i + 1}`,
      channel,
      intent:
        opts?.brief?.trim().slice(0, 120) ||
        `Acquire qualified ${brand.display_name} leads via ${channel}`,
      brand: brand.display_name,
    });
  }
  return rows;
}
