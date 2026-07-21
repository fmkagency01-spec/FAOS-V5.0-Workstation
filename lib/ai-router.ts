/**
 * FAOS Intelligent AI Router — picks the best OpenRouter model per question/task.
 * Single gateway: user never chooses Claude vs GPT vs Gemini manually.
 */

export type AiIntent =
  | "strategy"
  | "code"
  | "creative"
  | "video"
  | "analysis"
  | "bengali"
  | "chat"
  | "automation";

export type AiRoute = {
  intent: AiIntent;
  model: string;
  provider: string;
  label: string;
  maxTokens: number;
  taskType: "general" | "creative" | "video";
  reason: string;
};

/** OpenRouter model slugs — verified family slugs (avoid retired 3.5-sonnet) */
export const AI_MODELS = {
  claudeSonnet: "anthropic/claude-sonnet-4.5",
  gpt4o: "openai/gpt-4o",
  gpt4oMini: "openai/gpt-4o-mini",
  geminiFlash: "google/gemini-2.0-flash-001",
  geminiPro: "google/gemini-2.5-pro-preview",
  hermes: "nousresearch/hermes-3-llama-3.1-405b",
  /** Ultra-low-cost internal / chat paths */
  gemma9b: "google/gemma-2-9b-it",
  llama70b: "meta-llama/llama-3.3-70b-instruct",
} as const;

const STRATEGY = [
  "/strategy",
  "/plan",
  "/analyze",
  "strategy",
  "roadmap",
  "forecast",
  "vision",
  "acquisition",
  "business plan",
  "executive",
  "kpi",
  "okr",
  "seo",
  "geo",
  "ai seo",
  "fan-out",
  "query fan-out",
  "generative engine",
  "citation",
  "eeat",
];

const CODE = [
  "code",
  "debug",
  "typescript",
  "javascript",
  "python",
  "api",
  "function",
  "bug",
  "error",
  "sql",
  "react",
  "next.js",
  "deploy",
  "git",
  "regex",
];

const CREATIVE = [
  "design",
  "graphic",
  "logo",
  "banner",
  "poster",
  "creative",
  "brand",
  "visual",
  "illustration",
  "mockup",
  "thumbnail",
  "social media post",
  "instagram",
  "facebook ad",
  "color palette",
  "typography",
  "photoshop",
  "canva",
  "figma",
];

const VIDEO = [
  "video",
  "edit",
  "reel",
  "youtube",
  "tiktok",
  "capcut",
  "premiere",
  "after effects",
  "motion",
  "subtitle",
  "b-roll",
  "storyboard",
  "script",
  "voiceover",
  "transition",
];

const ANALYSIS = [
  "analyze",
  "analysis",
  "compare",
  "report",
  "data",
  "metrics",
  "spreadsheet",
  "excel",
  "financial",
  "inventory",
  "forecast numbers",
  "summary",
];

const BENGALI_HINTS = [
  "bangla",
  "bengali",
  "বাংলা",
  "করো",
  "করব",
  "জানতে",
  "কিভাবে",
  "কেন",
  "কি",
];

function containsAny(text: string, terms: string[]): boolean {
  const lower = text.toLowerCase();
  return terms.some((t) => lower.includes(t.toLowerCase()));
}

function hasBengaliScript(text: string): boolean {
  return /[\u0980-\u09FF]/.test(text);
}

/** Classify user message into intent — keyword/heuristic (no extra API call) */
export function classifyIntent(query: string): AiIntent {
  const q = query.trim();
  if (!q) return "chat";

  if (containsAny(q, STRATEGY)) return "strategy";
  if (containsAny(q, VIDEO)) return "video";
  if (containsAny(q, CREATIVE)) return "creative";
  if (containsAny(q, CODE)) return "code";
  if (containsAny(q, ANALYSIS)) return "analysis";
  if (hasBengaliScript(q) || containsAny(q, BENGALI_HINTS)) return "bengali";

  if (q.length < 80 && !q.includes("?")) return "chat";
  return "automation";
}

function providerFromModel(model: string): string {
  if (model.startsWith("anthropic/")) return "Claude";
  if (model.startsWith("openai/")) return "GPT";
  if (model.startsWith("google/gemma")) return "Gemma";
  if (model.startsWith("google/")) return "Gemini";
  if (model.startsWith("meta-llama/")) return "Llama";
  if (model.startsWith("nousresearch/")) return "Hermes";
  return "OpenRouter";
}

function intentToTaskType(intent: AiIntent): "general" | "creative" | "video" {
  if (intent === "creative") return "creative";
  if (intent === "video") return "video";
  return "general";
}

/** Map intent → best model + token budget (token-saving aware) */
export function routeQuery(query: string, tokenSaving = true): AiRoute {
  const intent = classifyIntent(query);

  const routes: Record<AiIntent, Omit<AiRoute, "intent" | "taskType">> = {
    strategy: {
      model: AI_MODELS.claudeSonnet,
      provider: "Claude",
      label: "Strategy · Claude Sonnet",
      maxTokens: tokenSaving ? 400 : 900,
      reason: "High-level planning and executive decisions",
    },
    code: {
      model: AI_MODELS.gpt4o,
      provider: "GPT",
      label: "Code · GPT-4o",
      maxTokens: tokenSaving ? 350 : 800,
      reason: "Technical accuracy for code and APIs",
    },
    creative: {
      model: AI_MODELS.claudeSonnet,
      provider: "Claude",
      label: "Creative · Claude Sonnet",
      maxTokens: tokenSaving ? 400 : 900,
      reason: "Rich creative briefs, copy, and design direction",
    },
    video: {
      model: AI_MODELS.geminiFlash,
      provider: "Gemini",
      label: "Video · Gemini Flash",
      maxTokens: tokenSaving ? 400 : 900,
      reason: "Scripts, edit plans, and storyboards",
    },
    analysis: {
      model: AI_MODELS.gpt4oMini,
      provider: "GPT",
      label: "Analysis · GPT-4o Mini",
      maxTokens: tokenSaving ? 320 : 700,
      reason: "Structured reports at lower cost",
    },
    bengali: {
      model: AI_MODELS.geminiFlash,
      provider: "Gemini",
      label: "বাংলা · Gemini Flash",
      maxTokens: tokenSaving ? 350 : 800,
      reason: "Strong multilingual support",
    },
    chat: {
      model: tokenSaving ? AI_MODELS.gemma9b : AI_MODELS.geminiFlash,
      provider: tokenSaving ? "Gemma" : "Gemini",
      label: tokenSaving ? "Quick chat · Gemma 2 9B" : "Quick chat · Gemini Flash",
      maxTokens: tokenSaving ? 220 : 600,
      reason: "Ultra-low-cost internal chat (Gemma) with Gemini fallback off saver",
    },
    automation: {
      model: tokenSaving ? AI_MODELS.llama70b : AI_MODELS.hermes,
      provider: tokenSaving ? "Llama" : "Hermes",
      label: tokenSaving ? "Automation · Llama 3.3 70B" : "Automation · Hermes 405B",
      maxTokens: tokenSaving ? 240 : 700,
      reason: "Token-saver routes internal ops to Llama; full mode uses Hermes",
    },
  };

  const picked = routes[intent];
  return {
    intent,
    taskType: intentToTaskType(intent),
    ...picked,
    provider: providerFromModel(picked.model),
  };
}

/** System prompt per intent — keeps responses focused and token-lean */
export function systemPromptForIntent(intent: AiIntent): string {
  const base =
    "You are FAOS v5.0 — FMK Group's unified AI gateway. Be concise. No repetition. Deliver actionable output.";

  const extras: Record<AiIntent, string> = {
    strategy:
      "Executive strategy mode. Structure: insight → recommendation → next 3 actions.",
    code: "Code mode. Provide working snippets. Note assumptions. No filler.",
    creative:
      "Creative studio mode. Deliver: concept, visual direction, copy, and export-ready prompts for design tools.",
    video:
      "Video production mode. Deliver: hook, script/scenes, edit notes, captions, and delivery checklist.",
    analysis: "Analysis mode. Use bullets, numbers where possible, clear conclusion.",
    bengali: "Respond in Bengali (বাংলা) unless user mixes English. Keep answers practical.",
    chat: "Quick Q&A. Short direct answer first, then one line of context if needed.",
    automation: "FMK operations agent. Route to business action. Token-saving lean output.",
  };

  return `${base}\n${extras[intent]}`;
}

/** Suggest FMK brand agent from command keywords */
export function suggestBrandAgent(command: string): string {
  const q = command.toLowerCase();
  if (/wig|hair|prosthetic|toupee/.test(q)) return "fmk_wig_prosthetic_hair_agent";
  if (/shoe|footwear|sneaker|boot/.test(q)) return "fmk_shoes_footwear_wing";
  if (/kitchen|food|cloud food|recipe/.test(q)) return "fmk_mk_kitchen_cloud_food_agent";
  if (/cloth|apparel|fashion|lifestyle|mk clothing/.test(q))
    return "fmk_mk_clothing_lifestyle_agent";
  return "fmk_wig_prosthetic_hair_agent";
}
