"""FAOS v6.0 — External webhook / delivery connector (Python)."""

from __future__ import annotations

import asyncio
import json
import os
import urllib.error
import urllib.request
from datetime import datetime, timezone
from typing import Any, Dict, Optional


def _post_sync(url: str, payload: Dict[str, Any]) -> int:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=15) as res:  # noqa: S310
        return int(res.status)


async def deliver_webhook(
    payload: Dict[str, Any],
    *,
    url: Optional[str] = None,
    dry_run: Optional[bool] = None,
) -> Dict[str, Any]:
    target = (url or os.getenv("FAOS_WEBHOOK_URL") or "").strip()
    dry = dry_run if dry_run is not None else not bool(target)

    if dry or not target:
        return {
            "ok": True,
            "event": payload.get("event"),
            "pipeline_id": payload.get("pipeline_id"),
            "delivered_at": datetime.now(timezone.utc).isoformat(),
            "mode": "dry_run",
        }

    body = {
        **payload,
        "source": "faos_v6",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    try:
        status = await asyncio.to_thread(_post_sync, target, body)
        ok = 200 <= status < 300
        return {
            "ok": ok,
            "event": payload.get("event"),
            "pipeline_id": payload.get("pipeline_id"),
            "delivered_at": datetime.now(timezone.utc).isoformat(),
            "mode": "http",
            "status_code": status,
            "error": None if ok else f"http_{status}",
        }
    except Exception as exc:  # noqa: BLE001
        return {
            "ok": False,
            "event": payload.get("event"),
            "pipeline_id": payload.get("pipeline_id"),
            "delivered_at": datetime.now(timezone.utc).isoformat(),
            "mode": "http",
            "error": str(exc),
        }
