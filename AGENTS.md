# AGENTS.md

## Cursor Cloud specific instructions

This repository is a **Next.js 15 App Router** app for the
"FAOS v5.0 — Central Operating Dashboard".

- UI: `app/page.tsx`, Create Pillar console at `app/dashboard/create-pillar/page.tsx`
- Backend: `app/api/*/route.ts` (deployed with the same Vercel project)
- OpenRouter helper: `lib/openrouter.ts` (server-only)
- Create Pillar: `lib/create-pillar.ts`, namespace `data/fmk_create_pillar_retail_core.json`
- Python FastAPI: `backend/main.py` (Render entry; `/` must return JSON health)
- Python router: `backend/router/create_pillar_routing.py`

**FMK WIG lock:** `fmk_wig_prosthetic_hair_agent` / brand `FMK WIG` only.
Never use `fmk_week`, `fmcg_wish`, or `fmk_fmcg_week_supply_agent`.

Backend URL env (no trailing slash): `NEXT_PUBLIC_BACKEND_URL` or
`NEXT_PUBLIC_FAOS_BACKEND_URL`.

When set, Next `/api/create-pillar` and `/api/agent-trigger` proxy to Render
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

### Secrets policy

- Never hardcode `sk-or-v1-...` in source, HTML, or committed `.env*` files.
- Only `.env.example` (empty values) may be committed.
- Production key must live in **Vercel Environment Variables** as `OPENROUTER_API_KEY`.
- Client code must call `/api/chat` / `/api/health` only — never OpenRouter directly.

### Deploy

- `vercel.json` → `npm ci` + `npm run build`
- CI: `.github/workflows/ci.yml`
- Push/merge to `main` triggers Vercel production deploy
