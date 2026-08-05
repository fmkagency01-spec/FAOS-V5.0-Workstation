import type { HuntingBrand } from "@/faos_core/config/brands";
import type { ProspectRow } from "@/faos_core/agents/hunting/prospector";

export type ContentAsset = {
  id: string;
  type: "cold_email" | "ad_copy" | "audit_hook" | "linkedin_dm";
  title: string;
  body: string;
  channel: string;
  brand: string;
};

/** Personalized cold outreach hooks, ads, and audit blurbs (template-safe). */
export function runCopywriter(
  brand: HuntingBrand,
  prospects: ProspectRow[],
  opts?: { brief?: string }
): ContentAsset[] {
  const service = brand.core_services[0] || "growth services";
  const assets: ContentAsset[] = [];

  for (const p of prospects.slice(0, 5)) {
    assets.push({
      id: `asset_email_${p.id}`,
      type: "cold_email",
      title: `${brand.display_name} · cold hook for ${p.niche}`,
      body: [
        `Subject: Quick idea for ${p.persona}`,
        "",
        `We help teams like yours with ${service}.`,
        `Focus niche: ${p.niche}.`,
        opts?.brief ? `Brief signal: ${opts.brief.slice(0, 160)}` : "",
        "",
        `Worth a 12-min audit on ${brand.core_services.slice(0, 2).join(" + ")}?`,
        `— ${brand.display_name}`,
      ]
        .filter(Boolean)
        .join("\n"),
      channel: "Email",
      brand: brand.display_name,
    });

    if (brand.id === "bulletseye" || brand.id === "fmk_agency") {
      assets.push({
        id: `asset_audit_${p.id}`,
        type: "audit_hook",
        title: `${brand.display_name} · ads/audit teaser`,
        body: `Free-lite ${brand.core_services[1] || "funnel"} snapshot for ${p.niche}: 3 leaks → 1 fix this week.`,
        channel: "Ad Audits",
        brand: brand.display_name,
      });
    }

    if (brand.id === "fmk_wig" || brand.id === "bulletseye") {
      assets.push({
        id: `asset_ad_${p.id}`,
        type: "ad_copy",
        title: `${brand.display_name} · Meta/social hook`,
        body: `${brand.display_name}: ${service} for ${p.niche}. CTA → book consult / wholesale inquiry.`,
        channel: p.channel,
        brand: brand.display_name,
      });
    }
  }

  return assets;
}
