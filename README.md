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
| `/api/ai-seo` | GET | BulletsEye AI SEO / GEO module status |
| `/api/ai-seo` | POST | `action=fan-out\|status` Query Fan-Out + schema pack |

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

### BulletsEye AI SEO / GEO

- UI: `/dashboard/ai-seo`
- Namespace DB: `data/fmk_bulletseye_core_namespace.json`
- TS engine: `lib/ai-seo-geo.ts` (OpenRouter + deterministic fallback)
- Python router: `backend/router/ai_seo_routing.py`
- API: `/api/ai-seo` (proxies to Render `/api/v5/ai-seo` when available)

**Query Fan-Out axes:** Direct Intent · Attribute Constraints · Comparative / Latent Need · Trust & E-E-A-T

Internal shell brands (FMK WIG, MK Clothing, FMK Shoes, TakaBachaw.com) and external B2B GEO audits share the same fan-out + JSON-LD schema packer.

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
NEXT_PUBLIC_BACKEND_URL=https://faos-backend.onrender.com/api/v5
```

(`NEXT_PUBLIC_FAOS_BACKEND_URL` is accepted as an alias.)

Render Blueprint is defined at repo-root `render.yaml` for GitHub auto-deploy.
After Render provisions the service, `GET https://<service>.onrender.com/` must return JSON `{ "status": "active", ... }`.

## Local development

```bash
cp .env.local.example .env.local
# put your OpenRouter key in .env.local as OPENROUTER_API_KEY=...

npm install
npm run dev
```

Open http://localhost:3000

## Auth (multi-tenant RBAC)

Signed-session cookies (`FAOS_AUTH_SECRET` + `FAOS_OWNER_PASSWORD` / `FAOS_AUTH_USERS`).
Not NextAuth — `GET/POST /api/auth/[...nextauth]` returns a discovery payload pointing at
`/api/auth/login` and `/api/auth/session`.

| Tier | Roles | Access |
|---|---|---|
| Executive Alpha / CEO | `owner`, `executive` | Full system + TAC gateways |
| Team Leads | `manager`, `team_lead`, department roles | Module-scoped Create / Media / Service |
| External B2B | `client`, `viewer` | Read-only portfolio / status (GET only) |

## PWA

- Manifest: `/manifest.webmanifest`
- Service worker: `/sw.js` (production auto-register)
- Install via browser “Add to Home Screen” / “Install App”


## Production secrets (required)

**Do not commit `.env` or real keys to GitHub.**

Set in **Vercel → Project Settings → Environment Variables** (Production + Preview):

| Name | Value |
|---|---|
| `OPENROUTER_API_KEY` | your OpenRouter secret key |
| `NEXT_PUBLIC_SITE_URL` | `https://faos-v5-0-workstation.vercel.app` |
| `FAOS_AUTH_SECRET` | session HMAC secret |
| `FAOS_OWNER_PASSWORD` | CEO login password |

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
