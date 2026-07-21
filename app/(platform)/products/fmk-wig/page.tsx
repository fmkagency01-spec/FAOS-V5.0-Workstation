import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/faos/JsonLd";
import { PageShell } from "@/components/faos/erp/PageShell";
import {
  FMK_WIG_PRODUCT_SCHEMA,
  getFmkWigSchemaMeta,
} from "@/lib/product-schema";
import { FMK_WIG_BRAND, FMK_WIG_NAMESPACE } from "@/lib/create-pillar";
import { getStoredInjectionForPage } from "@/lib/bulletseye-squad";
import type { SchemaBlock } from "@/components/faos/JsonLd";

export const metadata: Metadata = {
  title: "FMK WIG — Prosthetic Hair Systems Bangladesh | FAOS",
  description:
    "FMK WIG prosthetic hair systems Bangladesh — product specs, local fulfilment, reviews & E-E-A-T signals for AI search citation.",
  openGraph: {
    title: "FMK WIG — Prosthetic Hair Systems Bangladesh",
    description:
      "Clear product specs, local Bangladesh fulfilment, and extractable proof points AI engines can cite.",
    type: "website",
  },
};

const FAQ_ITEMS = [
  {
    q: "Why choose FMK WIG for prosthetic hair systems Bangladesh?",
    a: "FMK WIG delivers prosthetic hair systems Bangladesh with clear product specs, local fulfilment in Bangladesh, and extractable proof points AI engines can cite.",
  },
  {
    q: "Key features & constraints of FMK WIG prosthetic hair systems Bangladesh",
    a: "FMK WIG focuses on measurable attributes so LLM retrieval can lift structured chunks instead of vague marketing copy.",
  },
  {
    q: "FMK WIG vs alternatives — who should buy?",
    a: "Buyers comparing options for prosthetic hair systems Bangladesh in Bangladesh should weigh FMK WIG's specialty positioning and local support.",
  },
  {
    q: "FMK WIG reviews, local proof & E-E-A-T signals",
    a: "FMK WIG strengthens AI citation trust via reviews, third-party mentions, and real Bangladesh case studies.",
  },
];

function mergeSchemaBlocks(
  staticBlocks: SchemaBlock[],
  stored?: SchemaBlock[] | null
): SchemaBlock[] {
  if (!stored?.length) return staticBlocks;
  const seen = new Set(staticBlocks.map((b) => b.type));
  const merged = [...staticBlocks];
  for (const block of stored) {
    if (block.type && seen.has(block.type)) continue;
    merged.push(block);
  }
  return merged;
}

export default function FmkWigProductPage() {
  const meta = getFmkWigSchemaMeta();
  const stored = getStoredInjectionForPage("fmk_wig_prosthetic_hair_agent");
  const schemaBlocks = mergeSchemaBlocks(FMK_WIG_PRODUCT_SCHEMA, stored?.schema_blocks);
  const faqItems =
    stored?.direct_answers?.length ?
      stored.direct_answers.map((d) => ({ q: d.h2, a: d.answer }))
    : FAQ_ITEMS;
  const h2Headers = stored?.recommended_h2_headers ?? [];

  return (
    <>
      {/* AI SEO / GEO schema pack — Organization + FAQPage + Product JSON-LD in page header */}
      <JsonLd blocks={schemaBlocks} idPrefix="fmk-wig-product" />

      <PageShell
        title={`${FMK_WIG_BRAND} — Prosthetic Hair Systems`}
        subtitle="Bangladesh · AI SEO schema enabled · Create Pillar retail lock"
        backHref="/products"
        backLabel="← All products"
        actions={
          <Link
            href="/dashboard/ai-seo"
            className="text-[11px] font-semibold text-[#060b19] bg-[#00f5d4] px-3 py-2 rounded-lg hover:bg-[#00bbf9] hover:text-white transition"
          >
            AI SEO Console
          </Link>
        }
      >
        <header className="rounded-xl border border-[#00f5d4]/25 bg-[#111827] p-5 space-y-3 relative overflow-hidden before:absolute before:top-0 before:left-0 before:w-1 before:h-full before:bg-[#00f5d4]">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#00f5d4]">
            Product header · JSON-LD live
            {stored ? ` · squad ${stored.injection_status}` : ""}
          </p>
          <h2 className="text-lg font-bold text-white">
            {faqItems[0]?.q ??
              `Why choose ${FMK_WIG_BRAND} for prosthetic hair systems Bangladesh?`}
          </h2>
          <p className="text-sm text-slate-300 max-w-3xl">
            {faqItems[0]?.a ??
              `${FMK_WIG_BRAND} delivers prosthetic hair systems Bangladesh with clear product specs, local fulfilment in Bangladesh, and extractable proof points AI engines can cite.`}
          </p>
          <div className="flex flex-wrap gap-2 text-[10px] font-mono text-slate-400">
            <span className="px-2 py-1 rounded border border-[#334155]">namespace: {FMK_WIG_NAMESPACE}</span>
            <span className="px-2 py-1 rounded border border-[#334155]">
              schema: {meta.blocks.join(" · ")}
            </span>
            <span className="px-2 py-1 rounded border border-[#334155]">areaServed: BD</span>
            {stored?.id && (
              <span className="px-2 py-1 rounded border border-[#334155]">
                injection: {stored.id}
              </span>
            )}
          </div>
        </header>

        {h2Headers.length > 0 && (
          <section className="rounded-xl border border-[#2a3548] bg-[#0c1222] p-5 space-y-2">
            <h3 className="text-sm font-bold text-white">BulletsEye H2 Structure</h3>
            <ul className="list-disc pl-5 text-xs text-slate-400 space-y-1">
              {h2Headers.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-xl border border-[#2a3548] bg-[#0c1222] p-5 space-y-4">
          <h3 className="text-sm font-bold text-white">Direct-answer FAQ (extractable H2s)</h3>
          <dl className="space-y-4">
            {faqItems.map((item) => (
              <div key={item.q}>
                <dt className="text-xs font-semibold text-[#00f5d4]">{item.q}</dt>
                <dd className="text-sm text-slate-300 mt-1">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="rounded-xl border border-[#2a3548] bg-[#111827] p-5 space-y-2 text-xs text-slate-400">
          <p className="font-semibold text-slate-200">Key features & constraints</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Feature-level H2/H3 hierarchy preferred by generative engines</li>
            <li>Spec tables and bullet extractables over long paragraphs</li>
            <li>Local E-E-A-T: Bangladesh fulfilment, reviews, third-party mentions</li>
          </ul>
        </section>
      </PageShell>
    </>
  );
}
