# AGENTS.md

## Cursor Cloud specific instructions

This repository is a **Next.js 15 App Router** app for the
"FAOS v5.0 — Central Operating Dashboard". UI lives under `app/`.
The previous static HTML dashboard is archived in `legacy/` (not deployed).

### Run it (development)

```bash
npm install
npm run dev
# then open http://localhost:3000
```

Production check:

```bash
npm run build
npm start
```

### Deploy (Vercel)

- Framework: Next.js (`vercel.json`)
- Install: `npm ci`
- Build: `npm run build`
- Pushing to `main` triggers a Vercel production deploy
- GitHub Actions CI (`.github/workflows/ci.yml`) also runs `npm ci` + `npm run build`

Set secrets in the Vercel project (not in git):

- `OPENROUTER_API_KEY` (server-only)
- `NEXT_PUBLIC_API_URL` (optional public backend URL)

### Notes

- Pin dependency versions via `package-lock.json`. Do not use floating `"latest"`.
- Do not re-add Azure / Jekyll / SLSA starter workflows — they do not match this app.
- Do not commit `.env`, `.env.local`, or `.env.production` with real keys.
