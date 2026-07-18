#!/usr/bin/env node
/**
 * FAOS v5.3 Production Setup Helper
 * Run: node scripts/setup-production.mjs
 * Copy output into Vercel + Render dashboards — NEVER commit the printed values.
 */
import { randomBytes } from "crypto";

const secret = randomBytes(32).toString("base64url");
const backendKey = randomBytes(32).toString("hex");
const suggestedPassword = `FMK-FAOS-${randomBytes(4).toString("hex").toUpperCase()}`;

console.log(`
╔══════════════════════════════════════════════════════════════╗
║  FAOS v5.3 — Dashboard env setup (do NOT commit these)       ║
╚══════════════════════════════════════════════════════════════╝

── Vercel (Production) ─────────────────────────────────────────
  FAOS_AUTH_SECRET=${secret}
  FAOS_OWNER_PASSWORD=${suggestedPassword}
  FAOS_BACKEND_API_KEY=${backendKey}
  OPENROUTER_API_KEY=<your-openrouter-key>
  RESEND_API_KEY=<optional>
  FAOS_NOTIFY_DEFAULT_TO=<optional-email>
  FAOS_NOTIFY_FROM=<optional-from@domain>

── Render (same FAOS_BACKEND_API_KEY as Vercel) ────────────────
  FAOS_BACKEND_API_KEY=${backendKey}
  FAOS_REQUIRE_BACKEND_API_KEY=true
  RESEND_API_KEY=<optional>
  FAOS_NOTIFY_DEFAULT_TO=<optional-email>
  FAOS_NOTIFY_FROM=<optional-from@domain>

── Notes ───────────────────────────────────────────────────────
  • vercel.json must NOT contain secrets (public vars only)
  • After rotating FAOS_AUTH_SECRET → users must log in again
  • Without RESEND_API_KEY, notifications fall back to outbox (no crash)
  • Login: username fahim · password = FAOS_OWNER_PASSWORD above

⚠ Save these values in a password manager — they are not stored in git.
`);
