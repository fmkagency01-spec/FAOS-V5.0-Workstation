import { getOpenRouterApiKey, safeOpenRouterCall } from "@/lib/openrouter";
import { isTokenSavingMode } from "@/lib/token-saving";

const OPENROUTER_IMAGES = "https://openrouter.ai/api/v1/images/generations";
const DEFAULT_IMAGE_MODEL =
  process.env.FAOS_IMAGE_MODEL?.trim() || "black-forest-labs/flux-1.1-pro";

export type ImageGenResult = {
  ok: boolean;
  prompt: string;
  enhanced_prompt?: string;
  image_url?: string;
  model: string;
  fallback_text?: string;
  note?: string;
};

/** Enhance prompt via lean AI call, then attempt image generation */
export async function generateImage(
  prompt: string,
  clientKey = "media-image"
): Promise<ImageGenResult> {
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY not configured");
  }

  let enhanced = prompt.trim();
  try {
    const refined = await safeOpenRouterCall(
      [
        {
          role: "system",
          content: "Enhance this image prompt for professional brand graphics. Output ONLY the prompt, max 120 words.",
        },
        { role: "user", content: prompt },
      ],
      { clientKey, maxTokens: isTokenSavingMode() ? 120 : 200 }
    );
    enhanced = refined.reply.trim() || enhanced;
  } catch {
    /* use original prompt */
  }

  try {
    const res = await fetch(OPENROUTER_IMAGES, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer":
          process.env.NEXT_PUBLIC_SITE_URL ||
          "https://faos-v5-0-workstation.vercel.app",
        "X-Title": "FAOS Creative Studio",
      },
      body: JSON.stringify({
        model: DEFAULT_IMAGE_MODEL,
        prompt: enhanced,
        n: 1,
        size: "1024x1024",
      }),
    });

    if (res.ok) {
      const data = (await res.json()) as {
        data?: Array<{ url?: string; b64_json?: string }>;
      };
      const item = data.data?.[0];
      if (item?.url) {
        return {
          ok: true,
          prompt,
          enhanced_prompt: enhanced,
          image_url: item.url,
          model: DEFAULT_IMAGE_MODEL,
        };
      }
      if (item?.b64_json) {
        return {
          ok: true,
          prompt,
          enhanced_prompt: enhanced,
          image_url: `data:image/png;base64,${item.b64_json}`,
          model: DEFAULT_IMAGE_MODEL,
        };
      }
    }
  } catch {
    /* fall through to text deliverable */
  }

  const fallback = await safeOpenRouterCall(
    [
      {
        role: "system",
        content:
          "Image API unavailable. Deliver: (1) final Flux/DALL-E prompt (2) composition notes (3) color palette (4) export checklist.",
      },
      { role: "user", content: enhanced },
    ],
    { clientKey, maxTokens: 400, intent: "creative" }
  );

  return {
    ok: true,
    prompt,
    enhanced_prompt: enhanced,
    model: DEFAULT_IMAGE_MODEL,
    fallback_text: fallback.reply,
    note: "Image API fallback — use enhanced prompt in Flux/Midjourney/DALL-E",
  };
}

export async function generateVideoPlan(
  brief: string,
  clientKey = "media-video"
): Promise<{ plan: string; model: string }> {
  const result = await safeOpenRouterCall(
    [
      {
        role: "system",
        content:
          "Video production deliverable: Hook (3s) · Scene breakdown · Edit notes · Captions · B-roll list · CapCut/FFmpeg steps · Export settings.",
      },
      { role: "user", content: brief },
    ],
    { clientKey, maxTokens: isTokenSavingMode() ? 450 : 900, intent: "video" }
  );
  return { plan: result.reply, model: result.model };
}
