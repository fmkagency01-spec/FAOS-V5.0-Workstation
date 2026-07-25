#!/usr/bin/env python3
"""Render Cron entry — POST /api/v5/orchestrate/tick with backend API key.

Secrets are read only from process environment (never hardcoded).
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request


def main() -> int:
    base = (
        os.getenv("FAOS_BACKEND_BASE_URL")
        or os.getenv("RENDER_EXTERNAL_URL")
        or "https://faos-backend.onrender.com"
    ).rstrip("/")
    url = f"{base}/api/v5/orchestrate/tick"
    api_key = os.getenv("FAOS_BACKEND_API_KEY", "").strip()

    headers = {
        "Content-Type": "application/json",
        "User-Agent": "FAOS-Cron-Orchestrate/5.3",
    }
    if api_key:
        headers["X-FAOS-Api-Key"] = api_key

    req = urllib.request.Request(
        url,
        data=json.dumps({"use_llm": False}).encode("utf-8"),
        headers=headers,
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            print(body[:2000])
            return 0 if 200 <= resp.status < 300 else 1
    except urllib.error.HTTPError as exc:
        print(f"HTTP {exc.code}: {exc.read().decode('utf-8', errors='replace')[:500]}", file=sys.stderr)
        return 1
    except Exception as exc:  # noqa: BLE001
        print(f"Cron tick failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
