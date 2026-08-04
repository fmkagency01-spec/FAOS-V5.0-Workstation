/**
 * August Operational & Revenue Engine — BulletsEye lead generation +
 * FMK Media / Editing Hub content drafting (cron + orchestrate jobs).
 */

import { AI_MODELS } from "@/lib/ai-router";
import { appendCoreMemory } from "@/lib/core-memory";
import { getSeoGeoTargets } from "@/lib/fmk-group-core";
import {
  addB2bLead,
  addRrInquiry,
  loadRrWigsWorkspaceDb,
  saveRrWigsWorkspaceDb,
} from "@/lib/b2b-wig-store";
import { getOpenRouterApiKey, safeOpenRouterCall } from "@/lib/openrouter";
import {
  resolveWritableDbFile,
  safeReadJsonFile,
  safeWriteJson,
} from "@/lib/writable-data-path";

export type LeadGenResult = {
  ok: true;
  engine: "bulletseye_lead_gen";
  generated: number;
  leads: Array<{ id: string; brand: string; company: string; channel: string }>;
  used_llm: boolean;
};

export type ContentDraftResult = {
  ok: true;
  engine: "fmk_media_content_draft";
  drafted: number;
  drafts: Array<{ id: string; brand: string; title: string; pipeline: string }>;
  used_llm: boolean;
};

type DraftStore = {
  table: "fmk_media_content_drafts";
  version: number;
  drafts: Array<{
    id: string;
    brand: string;
    brand_id: string;
    title: string;
    body: string;
    pipeline: string;
    status: "draft" | "queued_editing_hub";
    created_at: string;
    model?: string;
  }>;
};

function draftsPath(): string {
  return resolveWritableDbFile("fmk_media_content_drafts.json", "media_pipeline");
}

function loadDrafts(): DraftStore {
  return (
    safeReadJsonFile<DraftStore>(draftsPath()) || {
      table: "fmk_media_content_drafts",
      version: 1,
      drafts: [],
    }
  );
}

function saveDrafts(db: DraftStore): void {
  safeWriteJson(draftsPath(), db, "media_content_drafts");
}

const LEAD_TEMPLATES = [
  { title: "Procurement Lead", channel: "linkedin" as const },
  { title: "Salon Group Buyer", channel: "google_ads" as const },
  { title: "OEM Wholesale Inquiry", channel: "seo_inbound" as const },
  { title: "Distributor Prospect", channel: "linkedin" as const },
];

/**
 * Background BulletsEye lead generation — creates tracked prospect rows
 * for SEO/GEO targets without inventing sensitive personal data.
 */
export async function runBulletseyeLeadGeneration(opts?: {
  use_llm?: boolean;
  limit?: number;
}): Promise<LeadGenResult> {
  const targets = getSeoGeoTargets().slice(0, opts?.limit ?? 3);
  const leads: LeadGenResult["leads"] = [];
  let usedLlm = false;
  const stamp = new Date().toISOString();
  const day = stamp.slice(0, 10);

  for (let i = 0; i < targets.length; i += 1) {
    const target = targets[i];
    const template = LEAD_TEMPLATES[i % LEAD_TEMPLATES.length];
    const company = `${target.brand_name} Prospect ${day.replace(/-/g, "").slice(4)}-${i + 1}`;

    let notes = `BulletsEye cron lead · query: ${target.query_type} · channel: ${template.channel}`;
    if (opts?.use_llm && getOpenRouterApiKey()) {
      try {
        const llm = await safeOpenRouterCall(
          [
            {
              role: "system",
              content:
                "You write a 2-sentence B2B outreach brief for BulletsEye Agency. No fake emails/phones. Concise.",
            },
            {
              role: "user",
              content: `Brand: ${target.brand_name}. Intent: ${target.query_type}. Role: ${template.title}.`,
            },
          ],
          {
            model: AI_MODELS.geminiPro,
            maxTokens: 160,
            clientKey: "cron-lead-gen",
            intent: "automation",
          }
        );
        notes = llm.reply.slice(0, 800);
        usedLlm = true;
      } catch {
        /* keep deterministic notes */
      }
    }

    if (target.client_type === "external_b2b" || target.brand_id.includes("rr_wigs")) {
      const inquiry = addRrInquiry({
        company,
        contact_email: "",
        message: notes,
        source: `bulletseye_cron:${template.channel}`,
      });
      // Also append a LinkedIn-style tracking row
      const rr = loadRrWigsWorkspaceDb();
      const liId = `li_cron_${Date.now()}_${i}`;
      rr.linkedin_leads = [
        {
          id: liId,
          prospect_name: template.title,
          company,
          title: template.title,
          outreach_status: "queued",
          reply_received: false,
          created_at: stamp,
        },
        ...rr.linkedin_leads,
      ].slice(0, 200);
      saveRrWigsWorkspaceDb(rr);
      leads.push({
        id: inquiry.id,
        brand: target.brand_name,
        company,
        channel: template.channel,
      });
    } else {
      const lead = addB2bLead({
        company,
        contact_name: template.title,
        email: "",
        phone: "",
        country: "BD",
        lead_source: `bulletseye_cron:${template.channel}`,
        pipeline_stage: "new",
        estimated_value_usd: 0,
        assigned_agent: target.brand_id.includes("wig")
          ? "fmk_wig_prosthetic_hair_agent"
          : "bulletseye_ai_seo_agent",
      });
      leads.push({
        id: lead.id,
        brand: target.brand_name,
        company,
        channel: template.channel,
      });
    }

    appendCoreMemory(target.memory_ns || "fmk_bulletseye_agency", {
      kind: "lead_gen",
      content: `Lead generated for ${target.brand_name}: ${company} via ${template.channel}`,
      source: "bulletseye_lead_gen_cron",
      meta: { brand_id: target.brand_id, channel: template.channel },
    });
  }

  appendCoreMemory("fmk_bulletseye_agency", {
    kind: "lead_gen_batch",
    content: `BulletsEye lead-gen cron created ${leads.length} prospects`,
    source: "ops_revenue_engine",
    meta: { count: leads.length, used_llm: usedLlm },
  });

  return {
    ok: true,
    engine: "bulletseye_lead_gen",
    generated: leads.length,
    leads,
    used_llm: usedLlm,
  };
}

/**
 * FMK Media / Editing Hub content drafting — scripts, captions, post copy.
 */
export async function runFmkMediaContentDrafting(opts?: {
  use_llm?: boolean;
  limit?: number;
}): Promise<ContentDraftResult> {
  const targets = getSeoGeoTargets().slice(0, opts?.limit ?? 3);
  const store = loadDrafts();
  const drafts: ContentDraftResult["drafts"] = [];
  let usedLlm = false;
  const stamp = new Date().toISOString();

  for (const target of targets) {
    const title = `${target.brand_name} · August Content Draft · ${stamp.slice(0, 10)}`;
    let body =
      `HOOK: ${target.brand_name} authority content\n` +
      `ANGLE: ${target.query_type}\n` +
      `CTA: Inquire via FAOS / BulletsEye B2B desk\n` +
      `EDITING HUB: Caption + 15s reel cut + thumbnail brief ready for queue.`;
    let model: string | undefined;

    if (opts?.use_llm && getOpenRouterApiKey()) {
      try {
        const llm = await safeOpenRouterCall(
          [
            {
              role: "system",
              content:
                "You are FMK Media / Editing Hub. Draft a short social + reel script " +
                "(hook, 4 beats, CTA, caption). Brand-safe. No hashtag spam.",
            },
            {
              role: "user",
              content: `Brand: ${target.brand_name}. Topic: ${target.query_type}.`,
            },
          ],
          {
            model: AI_MODELS.claude35Sonnet,
            maxTokens: 450,
            clientKey: "cron-content-draft",
            intent: "creative",
          }
        );
        body = llm.reply.slice(0, 4000);
        model = llm.model;
        usedLlm = true;
      } catch {
        /* deterministic draft */
      }
    }

    const id = `draft_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const row = {
      id,
      brand: target.brand_name,
      brand_id: target.brand_id,
      title,
      body,
      pipeline: "fmk_editing_hub",
      status: "queued_editing_hub" as const,
      created_at: stamp,
      model,
    };
    store.drafts.unshift(row);
    drafts.push({
      id,
      brand: target.brand_name,
      title,
      pipeline: "fmk_editing_hub",
    });

    appendCoreMemory("fmk_editing_hub", {
      kind: "content_draft",
      content: `${title}\n\n${body.slice(0, 2000)}`,
      source: "fmk_media_content_draft_cron",
      meta: { brand_id: target.brand_id, draft_id: id },
    });
    appendCoreMemory("fmk_media", {
      kind: "content_draft_handoff",
      content: `Draft queued for Editing Hub: ${title}`,
      source: "ops_revenue_engine",
      meta: { draft_id: id },
    });
  }

  store.drafts = store.drafts.slice(0, 200);
  saveDrafts(store);

  return {
    ok: true,
    engine: "fmk_media_content_draft",
    drafted: drafts.length,
    drafts,
    used_llm: usedLlm,
  };
}
