#!/usr/bin/env npx tsx
/**
 * Jarvis Client Hunting CLI
 * Usage: npx tsx scripts/run-client-hunting.ts --brand bulletseye [--brief "..."] [--limit 5]
 */

import "./load-env-local";
import { runClientHuntingPipeline } from "@/faos_core/pipelines/client-hunting-pipeline";
import { HUNTING_BRAND_IDS, huntingBrandsConfig } from "@/faos_core/config/brands";

function arg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  return undefined;
}

async function main() {
  if (process.argv.includes("--list")) {
    console.log(JSON.stringify(huntingBrandsConfig(), null, 2));
    return;
  }

  const brand = arg("--brand") || arg("-b");
  const brief = arg("--brief");
  const limitRaw = arg("--limit");
  const limit = limitRaw ? Number(limitRaw) : undefined;

  if (brand && !HUNTING_BRAND_IDS.includes(brand as (typeof HUNTING_BRAND_IDS)[number])) {
    console.error(
      `Unknown brand "${brand}". Use one of: ${HUNTING_BRAND_IDS.join(" | ")}`
    );
    process.exit(2);
  }

  const result = await runClientHuntingPipeline({ brand, brief, limit });
  const delivery = {
    brand: result.brand,
    task_id: result.task_id,
    prospects_targeted: result.prospects_targeted,
    content_assets: result.content_assets,
    action_items: result.action_items,
    status: result.status,
    brand_id: result.brand_id,
    hub: result.hub,
    lead_agent_id: result.lead_agent_id,
    namespace: result.namespace,
    version: result.version,
    ok: result.ok,
    error: result.error,
  };

  console.log(JSON.stringify(delivery, null, 2));
  if (!result.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
