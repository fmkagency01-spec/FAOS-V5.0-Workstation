"""Centralized error handling — uniform JSON, no crashes, no infinite loops."""

from __future__ import annotations

import logging
import uuid
from typing import Any

from fastapi import HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("faos.backend")


def error_payload(
    *,
    status: int,
    error: str,
    code: str,
    path: str,
    request_id: str | None = None,
    details: Any = None,
) -> dict:
    body: dict[str, Any] = {
        "ok": False,
        "error": error,
        "code": code,
        "path": path,
        "status": status,
    }
    if request_id:
        body["request_id"] = request_id
    if details is not None:
        body["details"] = details
    return body


class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("x-request-id") or uuid.uuid4().hex[:16]
        request.state.request_id = request_id
        try:
            response = await call_next(request)
        except Exception as exc:  # noqa: BLE001 — last-resort safety net
            logger.exception("[%s] Uncaught middleware error", request_id)
            return JSONResponse(
                status_code=500,
                content=error_payload(
                    status=500,
                    error="Internal server error",
                    code="INTERNAL",
                    path=request.url.path,
                    request_id=request_id,
                ),
            )
        response.headers["X-Request-Id"] = request_id
        return response


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)
    detail = exc.detail
    if isinstance(detail, dict):
        message = detail.get("error") or detail.get("message") or str(detail)
        code = detail.get("code") or "HTTP_ERROR"
        details = detail.get("details")
    else:
        message = str(detail)
        code = "HTTP_ERROR"
        details = None

    if exc.status_code == 404:
        code = "NOT_FOUND"
    elif exc.status_code == 400:
        code = "VALIDATION"
    elif exc.status_code == 401:
        code = "UNAUTHORIZED"
    elif exc.status_code == 403:
        code = "FORBIDDEN"
    elif exc.status_code == 429:
        code = "RATE_LIMIT"

    return JSONResponse(
        status_code=exc.status_code,
        content=error_payload(
            status=exc.status_code,
            error=message,
            code=code,
            path=request.url.path,
            request_id=request_id,
            details=details,
        ),
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)
    return JSONResponse(
        status_code=422,
        content=error_payload(
            status=422,
            error="Request validation failed",
            code="VALIDATION",
            path=request.url.path,
            request_id=request_id,
            details=exc.errors(),
        ),
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)
    logger.exception("[%s] Unhandled error on %s", request_id, request.url.path)
    return JSONResponse(
        status_code=500,
        content=error_payload(
            status=500,
            error="Internal server error",
            code="INTERNAL",
            path=request.url.path,
            request_id=request_id,
        ),
    )


async def not_found_handler(request: Request, exc: Any) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)
    return JSONResponse(
        status_code=404,
        content=error_payload(
            status=404,
            error="Route not found",
            code="NOT_FOUND",
            path=request.url.path,
            request_id=request_id,
            details={
                "hint": "Use /, /health, /api/v5/orders, /api/v5/products, /api/v5/clients",
            },
        ),
    )


def register_exception_handlers(app: Any) -> None:
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
    app.add_exception_handler(404, not_found_handler)
