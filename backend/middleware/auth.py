"""API key gate for Render backend — blocks unauthenticated CRUD abuse."""

from __future__ import annotations

import os
from typing import Callable

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

PUBLIC_PATHS = {"/", "/health", "/docs", "/openapi.json", "/redoc"}


class BackendAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable):
        path = request.url.path.rstrip("/") or "/"
        if path in PUBLIC_PATHS or not path.startswith("/api/v5"):
            return await call_next(request)

        expected = os.getenv("FAOS_BACKEND_API_KEY", "").strip()
        if not expected:
            return await call_next(request)

        provided = request.headers.get("x-faos-api-key", "").strip()
        if provided != expected:
            return JSONResponse(
                status_code=401,
                content={
                    "ok": False,
                    "error": "Invalid or missing backend API key",
                    "code": "UNAUTHORIZED",
                },
            )
        return await call_next(request)
