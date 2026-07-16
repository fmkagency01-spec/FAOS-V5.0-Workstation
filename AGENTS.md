# AGENTS.md

## Cursor Cloud specific instructions

This repository is a **single self-contained static web app**: `index.html`. It is
the "FAOSV 5.0 — Central ERP Workstation" dashboard. There is **no backend, no
build step, no package manager, and no dependencies to install** — all styling
(Tailwind CSS, Google Fonts) is loaded from CDNs at runtime.

### Run it (development)

Serve the folder with any static file server and open the page:

```
python3 -m http.server 8000
# then open http://localhost:8000/index.html
```

There is nothing to build or compile, and there are no automated tests or linters
configured.

### OpenRouter command terminal

The "Command Center" console calls the OpenRouter API directly from the browser
(`https://openrouter.ai/api/v1/chat/completions`). Model routing lives in
`MODEL_ROUTES` in the inline `<script>` in `index.html`:

- Agent automation prompts → `nousresearch/hermes-3-llama-3.1-405b`
- High-end strategy prompts (triggered by `/strategy`, `/plan`, etc.) →
  `anthropic/claude-sonnet-4.5`

Non-obvious gotchas:

- The legacy `anthropic/claude-3.5-sonnet` slug is **retired on OpenRouter**
  (returns `404 No endpoints found`). Use a current Claude Sonnet slug. Verify
  available models via `GET https://openrouter.ai/api/v1/models` before changing.
- The OpenRouter API key is **hardcoded in client-side JS** (`API_KEY` in
  `index.html`). Anything shipped there is publicly visible in the browser; it
  cannot be truly secret without a server-side proxy.
- Testing in the browser: the static server serves live files, but **Chrome
  aggressively caches `index.html`**. After editing, hard-reload or load with a
  cache-busting query string (e.g. `http://localhost:8000/index.html?v=2`) or the
  browser will run the old code.
