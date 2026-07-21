/**
 * Renders one or more JSON-LD blocks for AI SEO / GEO citation crawlers.
 * Place near the product page header so extractable schema is in the document early.
 */
import { safeJsonLdStringify } from "@/lib/schema-sanitize";

export type SchemaBlock = {
  type?: string;
  json_ld: Record<string, unknown>;
};

type JsonLdProps = {
  blocks: SchemaBlock[];
  /** Optional id prefix for multiple script tags */
  idPrefix?: string;
};

export function JsonLd({ blocks, idPrefix = "faos-jsonld" }: JsonLdProps) {
  if (!blocks?.length) return null;

  return (
    <>
      {blocks.map((block, index) => {
        const payload = block.json_ld;
        if (!payload || typeof payload !== "object") return null;
        const key = `${idPrefix}-${block.type || "schema"}-${index}`;
        return (
          <script
            key={key}
            id={key}
            type="application/ld+json"
            // JSON-LD must be raw JSON text for crawlers / AI Overviews.
            dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(payload) }}
          />
        );
      })}
    </>
  );
}
