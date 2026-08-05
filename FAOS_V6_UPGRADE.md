# SYSTEM DIRECTIVE: FAOS v5.3 to v6.0 Enterprise Architecture Upgrade

## Core Objective
Refactor, debug, and optimize the FAOS (Framework Agent Operating System) workspace from v5.3 to v6.0. Ensure all 35 multi-agent modules are fully functional, inter-communicative, and connected to the central Jarvis Orchestrator.

## 1. Multi-Agent Network Architecture (35 Agents)
- **Jarvis Master Orchestrator:** Acts as the primary router. Receives raw client input, categorizes tasks, assigns them to specialized agents, tracks status, and aggregates outputs.
- **Agent Verification & Health Checks:**
  - Audit all existing 35 agent scripts.
  - Implement fallback handling if an agent fails to respond or returns malformed JSON.
  - Standardize Agent State Schema: `{ agent_id, status, current_task, output, timestamp }`.

## 2. Client Task Execution & Approval Pipeline
Build a modular execution framework for agency workflows (BulletsEye & associated brands):
1. **Ingestion Layer:** Accepts raw brief/task details (SMM, Performance Marketing, Video Scripting, Design Brief).
2. **Execution Layer:** Routes task to assigned Agent(s).
3. **Internal QA Layer:** Auto-evaluates generated deliverables against quality benchmarks.
4. **Approval & Delivery Gate:** Prepares formatted client-facing output for review/publishing.

## 3. Code Refactoring Instructions
- Clean up redundant code, eliminate dead loops, and unify API handler calls (Claude / OpenAI / OpenRouter).
- Structure file layout:
  ```
  /faos_core
    ├── /orchestrator (Jarvis core engine)
    ├── /agents (35 sub-agent modules: strategy, marketing, dev, content)
    ├── /pipelines (Client task routing & queue)
    └── /connectors (External API integrations & webhooks)
  ```

## Task Execution Instructions
1. Run a diagnostics check across all agent definitions.
2. Generate modular Python/TypeScript code to connect the 35 agents into an asynchronous execution graph.
3. Build a CLI/Dashboard controller to simulate end-to-end client task processing.

## Architecture Flow (v6.0)

```
[ Client Input / Task Brief ]
              │
              ▼
    ┌──────────────────┐
    │  Jarvis Master   │ ◄── (Task Parser & Orchestrator)
    └─────────┬────────┘
              │
    ┌─────────┴────────────────────────────────┐
    ▼                                          ▼
[ Marketing & Strategy Agents ]    [ Tech & Content Agents ]
  • Media Buyer Agent               • Video Script Agent
  • SEO / CRO Agent                 • Copywriter Agent
  • Brand Strategist                • Web / Dev Agent
    └─────────┬────────────────────────────────┘
              │
              ▼
    ┌──────────────────┐
    │ QA & Review Gate │ ◄── (Auto-validation against client KB)
    └─────────┬────────┘
              │
              ▼
[ Ready Output / Client Delivery / Execution ]
```

## Implementation Map (v6.0)

| Layer | Path | Role |
|-------|------|------|
| Orchestrator | `faos_core/orchestrator/` | Jarvis routing, registry, health |
| Agents | `faos_core/agents/` | 35 modules + async execution graph |
| Pipelines | `faos_core/pipelines/` | Ingest → Execute → QA → Approval |
| Connectors | `faos_core/connectors/` | Unified LLM + webhooks |
| Python mirror | `backend/faos_core/` | Render FastAPI parity |
| API (Next) | `app/api/faos-v6/` | Diagnostics + pipeline controller |
| API (Render) | `/api/v5/faos-v6` | Python parity endpoints |
| Dashboard | `app/(platform)/faos-v6/` | E2E task simulation UI |
| CLI | `scripts/faos-v6-cli.ts` | Workstation diagnostics + simulate |

## Workstation Commands

```bash
# Step 1 — Agents health audit
npm run faos:v6:diagnostics

# Step 2 — Jarvis graph route
npx tsx scripts/faos-v6-cli.ts route "Marketing Campaign for BulletsEye FMK WIG"

# Step 3 — Client service pipeline
npx tsx scripts/faos-v6-cli.ts pipeline "SMM brief for BulletsEye: 5 Instagram posts + CTA for FMK WIG"
```

Dashboard: `/faos-v6` · API: `GET/POST /api/faos-v6`

## Locks (unchanged)
- **FMK WIG:** `fmk_wig_prosthetic_hair_agent` / brand `FMK WIG` only.
- **BulletsEye AI SEO:** `fmk_bulletseye_core_namespace` · Query Fan-Out GEO enabled.
- Never use `fmk_week`, `fmcg_wish`, or `fmk_fmcg_week_supply_agent`.
- Client code never calls OpenRouter directly — use `/api/*` or `faos_core/connectors/llm`.

## Version
- Target: **FAOS v6.0**
- Previous: **FAOS v5.3**
- Agent roster: **36** (35 specialists + `hermes_cofounder_agent`)
- Jarvis Brain Co-Founder: **Hermes** — monitors/operates all agent teams
- Chat history: server JSON + browser cache (`faos.jarvis.active_session.v1`)
- Cursor bridge: `lib/code-engineering-bridge.ts` via `CURSOR_AGENT_WEBHOOK_URL`
