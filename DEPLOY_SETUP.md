# FAOS v5.3 Production Launch Checklist

## Auto-configured (in repo — public only)

`vercel.json` holds **non-secret** public env vars only (backend URL, token-saving mode, site URL).  
**Never put** `FAOS_AUTH_SECRET`, `FAOS_OWNER_PASSWORD`, `FAOS_BACKEND_API_KEY`, `OPENROUTER_API_KEY`, or `RESEND_API_KEY` in git / `vercel.json`.

## Required secrets (Vercel dashboard)

| Variable | Purpose |
|----------|---------|
| `FAOS_AUTH_SECRET` | Session cookie HMAC signing |
| `FAOS_OWNER_PASSWORD` | Owner login (`fahim`) |
| `OPENROUTER_API_KEY` | JARVIS / AI gateway |
| `FAOS_BACKEND_API_KEY` | Same value as Render — secures CRUD |

## Required secrets (Render dashboard)

| Variable | Purpose |
|----------|---------|
| `FAOS_BACKEND_API_KEY` | **Must match Vercel** — middleware rejects mismatch with 401 |
| `OPENROUTER_API_KEY` | Optional backend AI |
| `RESEND_API_KEY` | Transactional email (optional) |
| `FAOS_NOTIFY_DEFAULT_TO` | Default recipient(s), comma-separated (optional) |
| `FAOS_NOTIFY_FROM` | From address for Resend/SMTP (optional) |

Optional: `FAOS_REQUIRE_BACKEND_API_KEY=true` on Render to fail closed if the key env is missing.

## Rotate secrets safely (no git)

```bash
# New session secret
openssl rand -base64 32

# New backend API key (use same value on Vercel + Render)
openssl rand -hex 32
```

1. Paste into **Vercel → Settings → Environment Variables** (Production)
2. Paste the **same** `FAOS_BACKEND_API_KEY` into **Render → Environment**
3. **Redeploy** both Vercel and Render
4. Log in again (old cookies invalid after `FAOS_AUTH_SECRET` change)

## Email notifications

Priority: Resend → SMTP → local outbox file (never crashes).

- Set `RESEND_API_KEY` + `FAOS_NOTIFY_DEFAULT_TO` for real mail
- Without them, `/api/notifications` and order hooks still succeed via outbox fallback

## Default owner login

- Username: `fahim`
- Password: value of `FAOS_OWNER_PASSWORD` (dashboard only)

## Live URLs

- Frontend: https://faos-v5-0-workstation.vercel.app
- Backend: https://faos-backend.onrender.com
- Health: https://faos-v5-0-workstation.vercel.app/api/health

## Verify after deploy

`/api/health` should show:

```json
"auth": { "auth_secret_configured": true },
"backend": { "api_key_configured": true },
"jarvis": { "erp_modules": ["invoicing", "inventory", "hr", "orders", "products"] }
```
