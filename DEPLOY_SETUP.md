# FAOS v5.3 Production Launch Checklist

## Auto-configured (in repo)

- `vercel.json` — public env vars, backend URL, token-saving mode
- `render.yaml` — backend service blueprint
- Middleware — login required for all app routes
- TAC + JARVIS + ERP + 25 shell agents

## One-time Vercel secrets (required for login + AI)

Run locally to generate values:

```bash
node scripts/setup-production.mjs
```

Add to **Vercel → Project → Settings → Environment Variables**:

| Variable | Required |
|----------|----------|
| `FAOS_AUTH_SECRET` | Yes |
| `FAOS_OWNER_PASSWORD` | Yes (owner login) |
| `OPENROUTER_API_KEY` | Yes (JARVIS/AI) |

Optional team JSON: `FAOS_AUTH_USERS` (see `.env.example`)

Then **Redeploy** production.

## Default owner login

- Username: `fahim`
- Password: value of `FAOS_OWNER_PASSWORD`

## Live URLs

- Frontend: https://faos-v5-0-workstation.vercel.app
- Backend: https://faos-backend.onrender.com
- Login: https://faos-v5-0-workstation.vercel.app/login

## TAC Command Center

After login → **TAC Command** (`/tac`) — sync 3 pillars with backend agents.
