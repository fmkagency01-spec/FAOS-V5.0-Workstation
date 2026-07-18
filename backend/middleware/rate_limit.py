"""Simple in-process rate limiter — fail fast, no retry storms."""

from __future__ import annotations

import os
import time
from collections import defaultdict
from typing import Callable, DefaultDict, List

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

_buckets: DefaultDict[str, List[float]] = defaultdict(list)


def _env_int(name: str, fallback: int) -> int:
    raw = os.getenv(name, "").strip()
    if not raw:
        return fallback
    try:
        value = int(raw)
        return value if value > 0 else fallback
    except ValueError:
        return fallback


MAX_PER_MINUTE = _env_int("FAOS_BACKEND_MAX_PER_MINUTE", 120)
WINDOW_SEC = 60


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable):
        if not request.url.path.startswith("/api/v5"):
            return await call_next(request)

        client = request.client.host if request.client else "unknown"
        key = f"{client}:{request.url.path}"
        now = time.time()
        window_start = now - WINDOW_SEC
        hits = [t for t in _buckets[key] if t >= window_start]

        if len(hits) >= MAX_PER_MINUTE:
            return JSONResponse(
                status_code=429,
                content={
                    "ok": False,
                    "error": f"Rate limit exceeded ({MAX_PER_MINUTE}/min)",
                    "code": "RATE_LIMIT",
                },
            )

        hits.append(now)
        _buckets[key] = hits
        return await call_next(request)
