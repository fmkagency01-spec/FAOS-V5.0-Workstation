#!/usr/bin/env python3
"""Render Cron entry — POST /api/v5/orchestrate/tick with backend API key.

Secrets are read only from process environment (never hardcoded).
Sends both X-FAOS-Api-Key and FAOS-Api-Key for Hermes/Render/Vercel sync.
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request


def _truthy(value: str | None) -> bool:
    return (value or "").strip().lower() in {"1", "true", "yes", "on"}


def main() -> int:
    base = (
        os.getenv("FAOS_BACKEND_BASE_URL")
        or os.getenv("RENDER_EXTERNAL_URL")
        or "https://faos-backend.onrender.com"
    ).rstrip("/")
    url = f"{base}/api/v5/orchestrate/tick"
    api_key = os.getenv("FAOS_BACKEND_API_KEY", "").strip()
    require_key = _truthy(os.getenv("FAOS_REQUIRE_BACKEND_API_KEY")) or True

    if not api_key:
        msg = (
            "FAOS_BACKEND_API_KEY missing in cron environment. "
            "Set the same value as Vercel → FAOS_BACKEND_API_KEY."
        )
        if require_key:
            print(msg, file=sys.stderr)
            return 2
        print(f"WARN: {msg} Continuing without auth header.", file=sys.stderr)

    headers = {
        "Content-Type": "application/json",
        "User-Agent": "FAOS-Cron-Orchestrate/6.0",
        "Accept": "application/json",
    }
    if api_key:
        headers["X-FAOS-Api-Key"] = api_key
        headers["FAOS-Api-Key"] = api_key
        headers["Authorization"] = f"Bearer {api_key}"

    payload = {
        "use_llm": False,
        "jobs": [
            "harness_cycle",
            "bulletseye_seo_geo_scan",
            "bulletseye_lead_gen",
            "jarvis_client_hunting",
            "fmk_media_content_draft",
            "hermes_openclaw_router",
            "media_pipeline_drain",
            "tac_sync",
            "learning_hub_ingest_pending",
        ],
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            print(body[:2000])
            return 0 if 200 <= resp.status < 300 else 1
    except urllib.error.HTTPError as exc:
        err_body = exc.read().decode("utf-8", errors="replace")[:500]
        print(f"HTTP {exc.code}: {err_body}", file=sys.stderr)
        if exc.code == 401:
            print(
                "Hint: Render cron FAOS_BACKEND_API_KEY must match the web service key.",
                file=sys.stderr,
            )
        return 1
    except Exception as exc:  # noqa: BLE001
        print(f"Cron tick failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
