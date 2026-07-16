# FAOS v5.0 — Central Operating Dashboard

Next.js dashboard + secure API backend for the FAOS ERP workstation.

**Live:** https://faos-v5-0-workstation.vercel.app

## Stack

- Next.js 15 (App Router) — UI + API routes
- React 19 + TypeScript + Tailwind CSS
- OpenRouter via **server-only** `/api/chat` proxy

## Backend API

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/health` | GET | Health + OpenRouter + Create Pillar mount status |
| `/api/chat` | POST | Secure OpenRouter proxy (`{ "message": "..." }`) |
| `/api/create-pillar` | GET | Create Pillar namespace + entity memory map |
| `/api/create-pillar` | POST | `action=process\|gatekeeper` retail orchestration |

The browser never receives `OPENROUTER_API_KEY`. Only the Next.js server uses it.

### Create Pillar

- UI: `/dashboard/create-pillar`
- Namespace DB: `data/fmk_create_pillar_retail_core.json`
- Python execution module: `backend/router/create_pillar_routing.py`
- Live Vercel orchestrator: `lib/create-pillar.ts` + `/api/create-pillar`

Entity memory lanes are isolated (MK Clothing / MK Kitchen / FMK Shoes never share runtime arrays).

> Note: `https://faos-backend.onrender.com` is **not** used (that host has no server). This app’s backend is the Vercel API routes above.

## Local development

```bash
cp .env.example .env.local
# put your OpenRouter key in .env.local as OPENROUTER_API_KEY=...

npm install
npm run dev
```

Open http://localhost:3000

## Production secrets (required)

**Do not commit `.env` or real keys to GitHub.**

Set in **Vercel → Project Settings → Environment Variables** (Production + Preview):

| Name | Value |
|---|---|
| `OPENROUTER_API_KEY` | your OpenRouter secret key |
| `NEXT_PUBLIC_SITE_URL` | `https://faos-v5-0-workstation.vercel.app` |

Then redeploy.

### Rotate compromised keys

If a key was ever pasted into `index.html` or any public commit, **revoke/rotate it in the OpenRouter dashboard immediately**. Old commits may still contain it until history rewrite + rotation.

## Redeploy

```bash
git push origin main   # or merge the PR
```

Vercel auto-builds with `npm ci` + `npm run build`.

## Project layout

```
app/
  page.tsx            # Dashboard UI
  api/health/route.ts # Health backend
  api/chat/route.ts   # Secure OpenRouter proxy
lib/openrouter.ts     # Server-side gateway helper
.env.example          # Empty placeholders only
```
