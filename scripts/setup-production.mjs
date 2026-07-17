#!/usr/bin/env node
/**
 * FAOS v5.3 Production Setup Helper
 * Run: node scripts/setup-production.mjs
 * Copy output into Vercel Dashboard → Settings → Environment Variables
 */
import { randomBytes } from "crypto";

const secret = randomBytes(32).toString("base64url");
const suggestedPassword = `FMK-FAOS-${randomBytes(4).toString("hex").toUpperCase()}`;

console.log(`
╔══════════════════════════════════════════════════════════════╗
║  FAOS v5.3 — Vercel Environment Setup (copy to dashboard)   ║
╚══════════════════════════════════════════════════════════════╝

Required secrets (Production + Preview):

  FAOS_AUTH_SECRET=${secret}

  FAOS_OWNER_PASSWORD=${suggestedPassword}

  OPENROUTER_API_KEY=<your-openrouter-key>

Optional team (JSON, single line):
  FAOS_AUTH_USERS=[{"username":"fahim","password":"${suggestedPassword}","name":"Fahim Mahmud Khan","role":"owner"}]

Public vars (already in vercel.json):
  NEXT_PUBLIC_BACKEND_URL, FAOS_TOKEN_SAVING_MODE, etc.

After adding env vars → Redeploy in Vercel.

Login: username fahim · password (FAOS_OWNER_PASSWORD above)

⚠ Save these values securely — they are not stored in git.
`);
