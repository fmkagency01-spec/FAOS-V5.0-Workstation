"""API key gate for Render backend — blocks unauthenticated CRUD abuse.

Requires header on every /api/v5/* route when FAOS_BACKEND_API_KEY is set:
  X-FAOS-Api-Key: <same value as Vercel FAOS_BACKEND_API_KEY>
  or Authorization: Bearer <same value>

If the env key is set and the request does not match → 401 immediately.
"""

from __future__ import annotations

import hmac
import os
from typing import Callable

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

PUBLIC_PATHS = {"/", "/health", "/docs", "/openapi.json", "/redoc"}


def _extract_provided_key(request: Request) -> str:
    header_key = (
        request.headers.get("x-faos-api-key")
        or request.headers.get("x-faos-backend-key")
        or ""
    ).strip()
    if header_key:
        return header_key

    auth = (request.headers.get("authorization") or "").strip()
    if auth.lower().startswith("bearer "):
        return auth[7:].strip()
    return ""


class BackendAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable):
        path = request.url.path.rstrip("/") or "/"
        if path in PUBLIC_PATHS or not path.startswith("/api/v5"):
            return await call_next(request)

        expected = os.getenv("FAOS_BACKEND_API_KEY", "").strip()
        require = os.getenv("FAOS_REQUIRE_BACKEND_API_KEY", "").lower() in {
            "1",
            "true",
            "yes",
        }

        if not expected:
            if require:
                return JSONResponse(
                    status_code=503,
                    content={
                        "ok": False,
                        "error": "FAOS_BACKEND_API_KEY is not configured on Render",
                        "code": "CONFIG",
                    },
                )
            return await call_next(request)

        provided = _extract_provided_key(request)
        if not provided or not hmac.compare_digest(provided, expected):
            return JSONResponse(
                status_code=401,
                content={
                    "ok": False,
                    "error": "Invalid or missing backend API key",
                    "code": "UNAUTHORIZED",
                    "hint": "Send X-FAOS-Api-Key with the same FAOS_BACKEND_API_KEY as Vercel.",
                },
            )
        return await call_next(request)
