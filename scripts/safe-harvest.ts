#!/usr/bin/env npx tsx
/**
 * Local harvest automation — uses safeOpenRouterCall with process.exit(1) on failure.
 *
 * Usage:
 *   OPENROUTER_API_KEY=your_openrouter_api_key_here npx tsx scripts/safe-harvest.ts "Your prompt here"
 *
 * NEVER wrap this in a while(true) loop. One prompt = one call.
 */

import { safeOpenRouterCall } from "../lib/openrouter";
import { OpenRouterGuardError } from "../lib/openrouter-guard";

async function main() {
  const prompt = process.argv.slice(2).join(" ").trim();
  if (!prompt) {
    console.error("Usage: npx tsx scripts/safe-harvest.ts \"your prompt\"");
    process.exit(1);
  }

  try {
    const response = await safeOpenRouterCall(
      [{ role: "user", content: prompt }],
      { clientKey: "local-harvest-script" }
    );

    console.log(JSON.stringify(response, null, 2));
    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("API Error caught in safety wrapper:", message);

    if (error instanceof OpenRouterGuardError) {
      console.error(`❌ Guard code: ${error.code} — automation must stop.`);
    }

    // এরর খাইলেই লুপ বা প্রসেস পুরোপুরি স্টপ
    process.exit(1);
  }
}

void main();
