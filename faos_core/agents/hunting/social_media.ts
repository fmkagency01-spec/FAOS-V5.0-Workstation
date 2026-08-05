import type { HuntingBrand } from "@/faos_core/config/brands";
import type { ContentAsset } from "@/faos_core/agents/hunting/copywriter";

/** Brand awareness content scripts/hooks for BulletsEye & FMK WIG (also usable by Agency). */
export function runSocialMediaAgent(
  brand: HuntingBrand,
  opts?: { brief?: string }
): ContentAsset[] {
  const hooks = [
    {
      id: `social_${brand.id}_reel_1`,
      type: "ad_copy" as const,
      title: `${brand.display_name} · Reel hook`,
      body: `Hook: Stop guessing ${brand.core_services[0]}. ${brand.display_name} shows the 15s proof → CTA.`,
      channel: "Social Media",
      brand: brand.display_name,
    },
    {
      id: `social_${brand.id}_carousel_1`,
      type: "ad_copy" as const,
      title: `${brand.display_name} · Carousel script`,
      body: [
        `Slide 1: Pain for ${brand.target_audience.split(",")[0]}`,
        `Slide 2: ${brand.core_services.join(" · ")}`,
        `Slide 3: CTA via ${brand.outreach_channels[0]}`,
        opts?.brief ? `Brief: ${opts.brief.slice(0, 100)}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      channel: "Social Media",
      brand: brand.display_name,
    },
  ];

  if (brand.id === "fmk_wig") {
    hooks.push({
      id: `social_${brand.id}_meta_lead`,
      type: "ad_copy",
      title: "FMK WIG · Meta Lead Ads script",
      body: "Custom prosthetic hair systems — consult form → salon/wholesale qualifier. Brand lock: FMK WIG only.",
      channel: "Meta Lead Ads Pipeline",
      brand: brand.display_name,
    });
  }

  return hooks;
}
