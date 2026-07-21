# AGENTS.md

## Cursor Cloud specific instructions

This repository is a **Next.js 15 App Router** app for the
"FAOS v5.0 — Central Operating Dashboard".

- UI: `app/page.tsx`, Create Pillar console at `app/dashboard/create-pillar/page.tsx`
- BulletsEye AI SEO / GEO: `app/dashboard/ai-seo/page.tsx`
- Backend: `app/api/*/route.ts` (deployed with the same Vercel project)
- OpenRouter helper: `lib/openrouter.ts` (server-only)
- Create Pillar: `lib/create-pillar.ts`, namespace `data/fmk_create_pillar_retail_core.json`
- AI SEO / GEO: `lib/ai-seo-geo.ts`, namespace `data/fmk_bulletseye_core_namespace.json`
- Python FastAPI: `backend/main.py` (Render entry; `/` must return JSON health)
- Python router: `backend/router/create_pillar_routing.py`
- Python AI SEO router: `backend/router/ai_seo_routing.py`

**FMK WIG lock:** `fmk_wig_prosthetic_hair_agent` / brand `FMK WIG` only.
Never use `fmk_week`, `fmcg_wish`, or `fmk_fmcg_week_supply_agent`.

**BulletsEye AI SEO lock:** `fmk_bulletseye_core_namespace` · Query Fan-Out GEO engine enabled
for internal shell brands + external B2B clients.

Backend URL env (no trailing slash): `NEXT_PUBLIC_BACKEND_URL` or
`NEXT_PUBLIC_FAOS_BACKEND_URL` — use the v5 API base, e.g.
`https://faos-backend.onrender.com/api/v5`. Host-only URLs are auto-normalized.

When set, Next `/api/create-pillar`, `/api/agent-trigger`, and `/api/ai-seo` proxy to Render
`/api/v5/*`. If Render is asleep/missing (free tier), they fall back to the
local TS orchestrator so the dashboard stays online.

Repo-root `render.yaml` is the GitHub→Render Blueprint (rootDir: `backend`).

### Run it (development)

```bash
cp .env.example .env.local
# set OPENROUTER_API_KEY in .env.local (gitignored)
npm install
npm run dev
```

### Local run notes (verified)

- Two services: the **Next.js dev server** (`npm run dev`, port 3000 — the main
  product, includes all `/api/*` routes) and an **optional Python FastAPI
  backend** (`backend/`).
- The dashboard runs fully standalone: with no Python backend and no
  `OPENROUTER_API_KEY`, everything works in "degraded" mode (health shows
  `openrouter: missing_key`; only live LLM replies via `/api/chat` return 503).
  Create Pillar / agent-trigger fall back to the local TS orchestrator.
- Run the FastAPI backend from a venv (the repo installs it at `backend/.venv`;
  requires the `python3-venv` system package):
  `backend/.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000`.
- To route the Next `/api/create-pillar` + `/api/agent-trigger` proxies to the
  local backend, set `NEXT_PUBLIC_BACKEND_URL=http://localhost:8000` in
  `.env.local`. A successful proxied response carries the
  `x-faos-upstream: render` header; otherwise it silently uses the local
  fallback.

### Secrets policy

- Never hardcode `sk-or-v1-...` in source, HTML, or committed `.env*` files.
- Only `.env.example` (empty values) may be committed.
- Production key must live in **Vercel Environment Variables** as `OPENROUTER_API_KEY`.
- Client code must call `/api/chat` / `/api/health` only — never OpenRouter directly.

### Deploy

- `vercel.json` → `npm ci` + `npm run build`
- CI: `.github/workflows/ci.yml`
- Push/merge to `main` triggers Vercel production deploy
