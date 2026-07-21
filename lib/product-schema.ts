import schemaPack from "@/data/fmk_wig_product_schema.json";
import { FMK_WIG_BRAND, FMK_WIG_NAMESPACE } from "@/lib/create-pillar";
import type { SchemaBlock } from "@/components/faos/JsonLd";

export const FMK_WIG_PRODUCT_SCHEMA = schemaPack as SchemaBlock[];

/** True when a catalog product should emit the FMK WIG AI SEO schema pack. */
export function isFmkWigProduct(product: {
  name?: string;
  brand_agent?: string;
  category?: string;
  description?: string;
}): boolean {
  const agent = (product.brand_agent || "").toLowerCase();
  if (agent === FMK_WIG_NAMESPACE || agent.includes("fmk_wig") || agent.includes("wig")) {
    return true;
  }
  const blob = `${product.name || ""} ${product.category || ""} ${product.description || ""}`.toLowerCase();
  return (
    blob.includes("fmk wig") ||
    blob.includes("prosthetic hair") ||
    /\bwig\b/.test(blob) ||
    blob.includes("toupee") ||
    blob.includes("hair system")
  );
}

export function getFmkWigProductSchema(): SchemaBlock[] {
  return FMK_WIG_PRODUCT_SCHEMA;
}

export function getFmkWigSchemaMeta() {
  return {
    brand: FMK_WIG_BRAND,
    namespace: FMK_WIG_NAMESPACE,
    route: "/products/fmk-wig",
    blocks: FMK_WIG_PRODUCT_SCHEMA.map((b) => b.type),
  };
}
