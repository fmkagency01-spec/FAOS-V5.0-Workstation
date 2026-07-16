# FAOS v5.0 — Central Operating Dashboard

Next.js dashboard for the FAOS ERP workstation. Deployed on Vercel:

**Live:** https://faos-v5-0-workstation.vercel.app

## Stack

- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Production build

```bash
npm run build
npm start
```

## Environment variables

Copy `.env.example` to `.env.local` and fill in values:

| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Client | Optional backend API base URL |
| `OPENROUTER_API_KEY` | Server / Vercel secrets | OpenRouter key (never commit) |

In Vercel: **Project → Settings → Environment Variables**.

## Redeploy on Vercel

1. Push to `main` (or merge a PR into `main`).
2. Vercel auto-builds with `npm ci` + `npm run build`.
3. Confirm the production URL above after the deploy succeeds.

Manual redeploy from the Vercel dashboard: **Deployments → … → Redeploy**.

## Project layout

```
app/                 # Next.js App Router UI
  layout.tsx
  page.tsx
  globals.css
legacy/              # Previous static HTML dashboard (reference only)
vercel.json          # Vercel framework + install/build commands
```
