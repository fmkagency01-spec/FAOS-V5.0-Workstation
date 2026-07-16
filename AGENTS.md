# AGENTS.md

## Cursor Cloud specific instructions

This repository is a **Next.js 15 App Router** app for the
"FAOS v5.0 — Central Operating Dashboard".

- UI: `app/page.tsx`
- Backend: `app/api/*/route.ts` (deployed with the same Vercel project)
- OpenRouter helper: `lib/openrouter.ts` (server-only)

There is **no separate Render backend**. `faos-backend.onrender.com` is dead/missing.

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
