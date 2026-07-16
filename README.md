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
- Python FastAPI core: `backend/main.py` (Render) — root `/` returns JSON health
- Python router: `backend/router/create_pillar_routing.py`
- Live Vercel orchestrator / proxy: `lib/create-pillar.ts` + `/api/create-pillar`

**Locked prosthetic hair namespace:**
- brand: `FMK WIG`
- id: `fmk_wig_prosthetic_hair_agent`
- Never alias as "FMK Week", "FMCG Wish", or `fmk_fmcg_week_supply_agent`

Entity memory lanes are isolated (FMK WIG / MK Clothing / MK Kitchen / FMK Shoes never share runtime arrays).

### Render backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
# GET / → {"status":"ONLINE", ...}
# GET /api/v5/create-pillar/fmk-wig → FMK WIG lock payload
```

Set on Vercel (**no trailing slash**):

```
NEXT_PUBLIC_BACKEND_URL=https://faos-backend.onrender.com
```

(`NEXT_PUBLIC_FAOS_BACKEND_URL` is accepted as an alias.)

Render Blueprint is defined at repo-root `render.yaml` for GitHub auto-deploy.
After Render provisions the service, `GET https://<service>.onrender.com/` must return JSON `{ "status": "active", ... }`.

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
