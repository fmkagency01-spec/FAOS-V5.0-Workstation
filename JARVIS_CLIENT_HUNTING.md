# SYSTEM DIRECTIVE: FAOS Jarvis Client Acquisition & Agency Automation System

## Objective

Configure Jarvis (Master Orchestrator) in FAOS v6.0 to execute multi-brand automated workflows for:

1. **FMK Agency** — B2B Full-Stack Digital Marketing & Automation Services
2. **BulletsEye** — Performance Marketing, Media Buying & ROI Lead Generation (`fmk_bulletseye_core_namespace`)
3. **FMK Wig** — E-commerce & High-Ticket B2B/B2C Client Acquisition (`fmk_wig_prosthetic_hair_agent` / brand lock **FMK WIG** only)

Never use `fmk_week`, `fmcg_wish`, or `fmk_fmcg_week_supply_agent`.

---

## Topology (under Hermes Engine)

```
JARVIS BRAIN → Hermes Engine
  ├─ Agency Outreach Hub  → FMK Agency + BulletsEye hunting
  ├─ FMK WIG Hub          → FMK Wig acquisition funnel
  └─ Shell Brands Hub     → Create / Media / Records support assets
```

## Brand config

- Schema: `data/faos_hunting_brands.json`
- Loader: `faos_core/config/brands.ts`

## Hunting agents (pipeline modules)

| Module | Path | Role |
|---|---|---|
| Prospector | `faos_core/agents/hunting/prospector.ts` | ICP / niche prospect matrix |
| Copywriter | `faos_core/agents/hunting/copywriter.ts` | Cold hooks, ad copy, audit blurbs |
| Outreach Manager | `faos_core/agents/hunting/outreach_manager.ts` | Outbound formatting + follow-ups |
| Social Media | `faos_core/agents/hunting/social_media.ts` | Awareness scripts / hooks |

## Pipeline

`Ingest Brief → Identify Brand → Lead/Hook Matrix → Draft Cold Email/Ad Asset → JSON delivery`

- Orchestrator: `faos_core/pipelines/client-hunting-pipeline.ts`
- Next API: `POST /api/faos-v6` with `{ "action": "hunt", "brand": "fmk_agency|bulletseye|fmk_wig" }`
- CLI (TS): `npm run faos:hunt -- --brand bulletseye`
- CLI (Python): `python scripts/run_client_hunting.py --brand fmk_wig`

## Output contract

```json
{
  "brand": "<BRAND_NAME>",
  "task_id": "<ID>",
  "prospects_targeted": [],
  "content_assets": [],
  "action_items": [],
  "status": "COMPLETED"
}
```

## Env / API sync (Hermes + Render)

- Header (canonical): `X-FAOS-Api-Key: <FAOS_BACKEND_API_KEY>`
- Alias accepted: `FAOS-Api-Key`
- Cron: `backend/scripts/cron_orchestrate_tick.py` (fails closed when key required/missing)
- LLM gateway: `OPENROUTER_API_KEY` (preferred). Optional: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` via OpenRouter/providers.
